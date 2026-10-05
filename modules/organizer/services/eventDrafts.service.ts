import "server-only";

import { and, asc, DrizzleQueryError, eq, isNull, like, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { escapeLike } from "@/lib/db/escapeLike";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { normalizeText, slugify } from "@/lib/text";
import { roleCan } from "@/modules/auth/permissions";
import { getOrganizerStatus, requireApprovedOrganizer, type SessionUser } from "@/modules/auth/server";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";
import { EVENT_CATEGORY_OPTIONS } from "../schemas/organizer.schema";
import type {
  EditableEvent,
  EventDraftInput,
  OrganizerOption,
  VenueOption,
} from "../types/organizer.types";
import { EventDraftError, type EventDraftErrorCode } from "../utils/eventDraftError";

// CRUD de borradores del panel (spec admin-panel, F5a). Autorizar la acción (`events:manageOwn`) es tarea de quien
// llama (`requirePermission`); estos servicios acotan el alcance (dueño o admin) y exigen que un organizador esté
// `approved` en toda mutación (`requireApprovedOrganizer`, que lanza `OrganizerNotApprovedError`). Cada mutación va en
// una transacción: si algo falla, no queda nada a medias.

type Actor = Pick<SessionUser, "id" | "role">;
type Database = typeof db;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Queryable = Pick<Database, "select">;

const SLUG_MAX_LENGTH = 80;
/** Slug de un título sin letras ni números ("!!!"). */
const FALLBACK_SLUG = "evento";
/**
 * Clave del advisory lock transaccional (`pg_advisory_xact_lock`) que serializa toda generación de slugs de eventos.
 * Es global y no por slug base: bases distintas compiten por el mismo slug ("Rock" → `rock-2` y "Rock 2" → `rock-2`).
 * Constante arbitraria reservada para este uso; ningún otro advisory lock del proyecto debe reutilizarla.
 */
const EVENT_SLUG_LOCK_KEY = 7_401_202_605;

/**
 * Dueño del evento. Un organizador solo crea y edita como él mismo y tiene que estar aprobado; admin y super_admin
 * eligen obligatoriamente un organizador `approved`.
 */
async function resolveOrganizerId(actor: Actor, requested: string | null, tx: Tx): Promise<string> {
  if (!roleCan(actor.role, "events:manageAny")) {
    await requireApprovedOrganizer(actor.id, tx);
    return actor.id;
  }
  if (!requested) throw new EventDraftError("organizer_required");
  if ((await getOrganizerStatus(requested, tx)) !== "approved") throw new EventDraftError("organizer_not_approved");
  return requested;
}

/** Un organizador no aprobado no muta eventos (admin y super_admin no tienen esa restricción). */
async function assertActorCanMutate(actor: Actor, tx: Tx): Promise<void> {
  if (!roleCan(actor.role, "events:manageAny")) await requireApprovedOrganizer(actor.id, tx);
}

/**
 * Recinto aprobado del borrador y el slug de cada una de sus secciones; `null` sin recinto. Cada tipo de entrada tiene
 * que ser de una sección de ese recinto (y sin recinto no puede haber tipos de entrada).
 */
async function resolveVenue(input: EventDraftInput, tx: Tx) {
  if (!input.venueId) {
    if (input.ticketTypes.length > 0) throw new EventDraftError("venue_required");
    return null;
  }
  const [venue] = await tx
    .select({ name: venues.name, city: venues.city })
    .from(venues)
    .where(and(eq(venues.id, input.venueId), eq(venues.status, "approved")));
  if (!venue) throw new EventDraftError("venue_not_approved");

  const sections = await tx
    .select({ id: venueSections.id, slug: venueSections.slug })
    .from(venueSections)
    .where(eq(venueSections.venueId, input.venueId));
  const sectionSlugs = new Map(sections.map((section) => [section.id, section.slug]));
  if (input.ticketTypes.some((ticketType) => !sectionSlugs.has(ticketType.sectionId))) {
    throw new EventDraftError("section_not_in_venue");
  }
  return { ...venue, sectionSlugs };
}

async function getCategoryId(category: EventDraftInput["category"], tx: Tx): Promise<string> {
  const [row] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.slug, category));
  if (!row) throw new Error(`Falta la categoría "${category}" en la BD`);
  return row.id;
}

/**
 * Slug único a partir del título: el slug del título o, si está ocupado, con el primer sufijo libre (`-2`, `-3`…).
 * `excludeEventId` (al editar) no cuenta su propio slug. El lock global (`EVENT_SLUG_LOCK_KEY`, liberado al terminar la
 * transacción) serializa las altas y ediciones simultáneas, que si no podrían elegir el mismo slug.
 */
async function generateUniqueSlug(title: string, tx: Tx, excludeEventId?: string): Promise<string> {
  const base = slugify(title).slice(0, SLUG_MAX_LENGTH).replace(/-$/, "") || FALLBACK_SLUG;
  await tx.execute(sql`select pg_advisory_xact_lock(${EVENT_SLUG_LOCK_KEY}::bigint)`);

  const rows = await tx
    .select({ slug: events.slug })
    .from(events)
    .where(
      and(
        or(eq(events.slug, base), like(events.slug, `${escapeLike(base)}-%`)),
        excludeEventId ? ne(events.id, excludeEventId) : undefined,
      ),
    );
  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Texto de búsqueda de `listManagedEvents` y del catálogo: título, recinto y ciudad normalizados (como el seed). */
function buildSearchText(title: string, venue: { name: string; city: string } | null): string {
  return normalizeText([title, venue?.name, venue?.city].filter(Boolean).join(" "));
}

/** Columnas de `events` que escribe el formulario. */
function eventColumns(input: EventDraftInput, venue: { name: string; city: string } | null) {
  return {
    venueId: input.venueId,
    title: input.title,
    description: input.description,
    imageUrl: input.imageUrl,
    startsAt: input.startsAt,
    doorsOpenAt: input.doorsOpenAt,
    minAge: input.minAge,
    searchText: buildSearchText(input.title, venue),
  };
}

async function insertTicketTypes(
  tx: Tx,
  eventId: string,
  input: EventDraftInput,
  sectionSlugs: Map<string, string> | undefined,
): Promise<void> {
  if (input.ticketTypes.length === 0 || !sectionSlugs) return;
  await tx.insert(ticketTypes).values(
    input.ticketTypes.map((ticketType) => ({
      eventId,
      sectionId: ticketType.sectionId,
      // Único por evento: un tipo de entrada por sección (UNIQUE(event_id, section_id)) y slugs únicos por recinto.
      slug: sectionSlugs.get(ticketType.sectionId) ?? ticketType.sectionId,
      name: ticketType.name,
      priceCents: ticketType.priceCents,
      maxPerOrder: MAX_TICKETS_PER_ORDER, // mismo tope que la compra y el seed
      sortOrder: ticketType.sortOrder,
    })),
  );
}

/** El evento tiene órdenes o inventario (`event_seats`): ya no se puede reemplazar sus tipos de entrada ni borrarlo. */
async function hasActivity(eventId: string, tx: Tx): Promise<boolean> {
  const [order] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.eventId, eventId)).limit(1);
  if (order) return true;
  const [seat] = await tx.select({ id: eventSeats.id }).from(eventSeats).where(eq(eventSeats.eventId, eventId)).limit(1);
  return seat !== undefined;
}

/**
 * Bloquea (`FOR UPDATE`) el borrador `eventId` que `actor` puede gestionar: el suyo o, con `events:manageAny`, cualquiera.
 * `not_found` si no existe o es ajeno; `notDraft` si ya no es `draft`; `has_activity` si tiene órdenes o inventario.
 */
async function lockDraft(actor: Actor, eventId: string, tx: Tx, notDraft: EventDraftErrorCode) {
  const manageAny = roleCan(actor.role, "events:manageAny");
  const [event] = await tx
    .select({ id: events.id, title: events.title, slug: events.slug, status: events.status })
    .from(events)
    .where(and(eq(events.id, eventId), manageAny ? undefined : eq(events.organizerId, actor.id)))
    .for("update");
  if (!event) throw new EventDraftError("not_found");
  if (event.status !== "draft") throw new EventDraftError(notDraft);
  if (await hasActivity(eventId, tx)) throw new EventDraftError("has_activity");
  return event;
}

/**
 * Ejecuta `run` en una transacción y traduce un slug repetido (UNIQUE `events_slug_unique`, 23505) a `slug_taken`: solo
 * pasa si otro escritor fuera de `generateUniqueSlug` (seed, SQL manual) inserta el mismo slug a la vez.
 */
async function inTransaction<T>(database: Database, run: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await database.transaction(run);
  } catch (error) {
    const cause = error instanceof DrizzleQueryError ? error.cause : error;
    const { code, constraint } = (cause ?? {}) as { code?: unknown; constraint?: unknown };
    if (code === "23505" && constraint === "events_slug_unique") throw new EventDraftError("slug_taken");
    throw error;
  }
}

/** Crea un borrador (`status = draft`) con slug único y sus tipos de entrada por sección del recinto. */
export async function createEvent(actor: Actor, input: EventDraftInput, database: Database = db): Promise<{ id: string }> {
  return inTransaction(database, async (tx) => {
    const organizerId = await resolveOrganizerId(actor, input.organizerId, tx);
    const venue = await resolveVenue(input, tx);
    const [{ id }] = await tx
      .insert(events)
      .values({
        ...eventColumns(input, venue),
        slug: await generateUniqueSlug(input.title, tx),
        organizerId,
        categoryId: await getCategoryId(input.category, tx),
        status: "draft",
      })
      .returning({ id: events.id });
    await insertTicketTypes(tx, id, input, venue?.sectionSlugs);
    return { id };
  });
}

/**
 * Edita un borrador: solo `draft` (F5b ampliará a los cambios permitidos tras publicar). Reemplaza sus tipos de entrada
 * (delete + insert): un borrador no tiene órdenes ni inventario (`lockDraft` lo comprueba), así que nada los referencia.
 * Si cambia el slug del título, se regenera (un borrador aún no tiene URL pública).
 */
export async function updateEvent(
  actor: Actor,
  eventId: string,
  input: EventDraftInput,
  database: Database = db,
): Promise<void> {
  await inTransaction(database, async (tx) => {
    const organizerId = await resolveOrganizerId(actor, input.organizerId, tx);
    const current = await lockDraft(actor, eventId, tx, "edit_not_draft");
    const venue = await resolveVenue(input, tx);
    const slug =
      slugify(input.title) === slugify(current.title) ? current.slug : await generateUniqueSlug(input.title, tx, eventId);

    await tx
      .update(events)
      .set({ ...eventColumns(input, venue), slug, organizerId, categoryId: await getCategoryId(input.category, tx) })
      .where(eq(events.id, eventId));
    await tx.delete(ticketTypes).where(eq(ticketTypes.eventId, eventId));
    await insertTicketTypes(tx, eventId, input, venue?.sectionSlugs);
  });
}

/** Elimina un borrador sin órdenes ni inventario, con sus tipos de entrada. */
export async function deleteEvent(actor: Actor, eventId: string, database: Database = db): Promise<void> {
  await database.transaction(async (tx) => {
    await assertActorCanMutate(actor, tx);
    await lockDraft(actor, eventId, tx, "delete_not_draft");
    await tx.delete(ticketTypes).where(eq(ticketTypes.eventId, eventId));
    await tx.delete(events).where(eq(events.id, eventId));
  });
}

/**
 * Evento para precargar Editar si `actor` lo gestiona (el suyo o, con `events:manageAny`, cualquiera), en cualquier
 * estado (la página decide qué hacer si no es `draft`). `null` si no existe, es ajeno o el id no es un uuid.
 */
export async function getEventForEdit(
  actor: Actor,
  eventId: string,
  database: Queryable = db,
): Promise<EditableEvent | null> {
  if (!roleCan(actor.role, "events:manageOwn") || !z.uuid().safeParse(eventId).success) return null;
  const manageAny = roleCan(actor.role, "events:manageAny");

  const [event] = await database
    .select({
      id: events.id,
      status: events.status,
      organizerId: events.organizerId,
      title: events.title,
      category: categories.slug,
      description: events.description,
      startsAt: events.startsAt,
      doorsOpenAt: events.doorsOpenAt,
      minAge: events.minAge,
      venueId: events.venueId,
      imageUrl: events.imageUrl,
    })
    .from(events)
    .innerJoin(categories, eq(categories.id, events.categoryId))
    .where(and(eq(events.id, eventId), manageAny ? undefined : eq(events.organizerId, actor.id)));
  if (!event) return null;

  const eventTicketTypes = await database
    .select({ sectionId: ticketTypes.sectionId, name: ticketTypes.name, priceCents: ticketTypes.priceCents })
    .from(ticketTypes)
    .where(eq(ticketTypes.eventId, eventId))
    .orderBy(asc(ticketTypes.sortOrder), asc(ticketTypes.name));

  return {
    ...event,
    category: z.enum(EVENT_CATEGORY_OPTIONS).parse(event.category),
    startsAt: event.startsAt?.toISOString() ?? null,
    doorsOpenAt: event.doorsOpenAt?.toISOString() ?? null,
    ticketTypes: eventTicketTypes,
  };
}

/** Capacidad de una sección: lugares si es general; sus `venue_seats` si es numerada (como `listManagedEvents`). */
const sectionCapacity = sql<number>`case when ${venueSections.seating} = 'general' then ${venueSections.capacity} else (select count(*) from ${venueSeats} where ${venueSeats.sectionId} = ${venueSections.id}) end`;

/** Recintos `approved` (por ciudad y nombre) con sus secciones en orden, para el Select del formulario. */
export async function listApprovedVenuesWithSections(database: Queryable = db): Promise<VenueOption[]> {
  const rows = await database
    .select({
      venueId: venues.id,
      venueName: venues.name,
      city: venues.city,
      sectionId: venueSections.id,
      sectionName: venueSections.name,
      seating: venueSections.seating,
      capacity: sectionCapacity,
    })
    .from(venues)
    .leftJoin(venueSections, eq(venueSections.venueId, venues.id))
    .where(eq(venues.status, "approved"))
    .orderBy(venues.city, venues.name, venues.id, venueSections.sortOrder, venueSections.name);

  const byId = new Map<string, VenueOption>();
  for (const row of rows) {
    let venue = byId.get(row.venueId);
    if (!venue) {
      venue = { id: row.venueId, name: row.venueName, city: row.city, sections: [] };
      byId.set(row.venueId, venue);
    }
    if (row.sectionId && row.sectionName && row.seating) {
      venue.sections.push({ id: row.sectionId, name: row.sectionName, seating: row.seating, capacity: Number(row.capacity ?? 0) });
    }
  }
  return [...byId.values()];
}

/** Organizadores `approved` (sin anonimizar), por nombre: razón social o, sin ella, nombre y apellido. */
export async function listApprovedOrganizers(database: Queryable = db): Promise<OrganizerOption[]> {
  const name = sql<string>`coalesce(${organizers.legalName}, trim(${users.firstName} || ' ' || ${users.lastName}))`;
  return database
    .select({ id: users.id, name })
    .from(organizers)
    .innerJoin(users, eq(users.id, organizers.userId))
    .where(and(eq(organizers.status, "approved"), isNull(users.anonymizedAt)))
    .orderBy(name, users.id);
}
