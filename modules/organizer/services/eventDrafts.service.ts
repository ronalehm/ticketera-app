import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, count, DrizzleQueryError, eq, inArray, isNull, like, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { isActiveSaleOrder } from "@/lib/db/activeSales";
import { db } from "@/lib/db/client";
import { escapeLike } from "@/lib/db/escapeLike";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { normalizeText, slugify } from "@/lib/text";
import { roleCan } from "@/modules/auth/permissions";
import { getOrganizerStatus, requireApprovedOrganizer, type SessionUser } from "@/modules/auth/server";
import { categorySlugSchema, formatEventPrice } from "@/modules/events/format";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";
import { enqueueEventNotification, type EventChange, type EventNotificationKind } from "@/modules/notifications/server";
import type {
  EditableEvent,
  EventDraftInput,
  ManualVenueInput,
  OrganizerOption,
  VenueOption,
} from "../types/organizer.types";
import { EventDraftError } from "../utils/eventDraftError";
import { getPublishIssues } from "../utils/publishRequirements";

// CRUD de eventos del panel (spec admin-panel, F5a; edición fuera de borrador, F5b). Autorizar la acción
// (`events:manageOwn`) es tarea de quien llama (`requirePermission`); estos servicios acotan el alcance (dueño o admin)
// y exigen que un organizador esté `approved` en toda mutación (`requireApprovedOrganizer`, que lanza
// `OrganizerNotApprovedError`). Cada mutación va en una transacción: si algo falla, no queda nada a medias.

export type Actor = Pick<SessionUser, "id" | "role">;
export type Database = typeof db;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Queryable = Pick<Database, "select">;
/** Notificación a compradores encolada en la transacción (spec event-change-notifications); `null` si no hubo. */
export type EnqueuedNotification = { id: string; kind: EventNotificationKind } | null;

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
export async function assertActorCanMutate(actor: Actor, tx: Tx): Promise<void> {
  if (!roleCan(actor.role, "events:manageAny")) await requireApprovedOrganizer(actor.id, tx);
}

/** Slug de una zona del recinto manual, único entre `taken` (lo añade): "VIP" → `vip`, `vip-2`…; sin letras, `zona`. */
function uniqueZoneSlug(name: string, taken: Set<string>): string {
  const base = slugify(name) || "zona";
  let slug = base;
  for (let suffix = 2; taken.has(slug); suffix++) slug = `${base}-${suffix}`;
  taken.add(slug);
  return slug;
}

/** Código y restricción de un error de Postgres (directo o envuelto en `DrizzleQueryError`). */
function pgErrorOf(error: unknown): { code?: unknown; constraint?: unknown } {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  return (cause ?? {}) as { code?: unknown; constraint?: unknown };
}

/**
 * Guarda el recinto ingresado a mano (spec organizer-manual-venue, Decisiones 4 y 7) y devuelve su id y `sectionIds`: actualiza el que
 * ya tiene el evento (`currentVenueId`) si sigue `pending_review` y es de `organizerId`; si no (sin recinto, uno
 * `approved` o uno pendiente ajeno, que nunca se editan desde aquí), crea otro `pending_review` de `organizerId`. Al
 * actualizar, las zonas conservan sus ids (`saveManualZones`); un recinto nuevo les da ids nuevos, porque los del
 * formulario pueden ser de las zonas de otro recinto (el pendiente del organizador anterior) y chocarían con su clave
 * primaria. `sectionIds` traduce cada id del formulario al de la zona guardada.
 */
async function saveManualVenue(
  venue: ManualVenueInput,
  organizerId: string,
  createdBy: string,
  currentVenueId: string | null,
  tx: Tx,
): Promise<{ id: string; sectionIds: Map<string, string> }> {
  const fields = { name: venue.name, address: venue.address, city: venue.city };
  const [own] = currentVenueId
    ? await tx
        .update(venues)
        .set(fields)
        .where(
          and(eq(venues.id, currentVenueId), eq(venues.status, "pending_review"), eq(venues.organizerId, organizerId)),
        )
        .returning({ id: venues.id })
    : [];
  const [{ id }] = own
    ? [own]
    : await tx
        .insert(venues)
        .values({ ...fields, status: "pending_review", organizerId, createdBy })
        .returning({ id: venues.id });
  const sectionIds = new Map(venue.sections.map((zone) => [zone.id, own ? zone.id : randomUUID()]));
  await saveManualZones(
    id,
    venue.sections.map((zone) => ({ ...zone, id: sectionIds.get(zone.id)! })),
    tx,
  );
  return { id, sectionIds };
}

/**
 * Deja las zonas del recinto `venueId` como las del formulario (generales, con su aforo y su posición como orden),
 * en su sitio: otro evento del organizador puede usar el mismo recinto pendiente (Decisión 3) y sus tipos de entrada
 * referencian estas zonas. Borra solo las quitadas (si otro evento usa alguna, `venue_section_in_use` y no se guarda
 * nada), actualiza las que cambian y crea las nuevas; si nada cambia, no escribe. Una zona que conserva su nombre
 * conserva su slug; una renombrada o nueva recibe uno único.
 */
async function saveManualZones(venueId: string, zones: ManualVenueInput["sections"], tx: Tx): Promise<void> {
  const saved = new Map(
    (
      await tx
        .select({
          id: venueSections.id,
          name: venueSections.name,
          slug: venueSections.slug,
          sortOrder: venueSections.sortOrder,
          capacity: venueSections.capacity,
        })
        .from(venueSections)
        .where(eq(venueSections.venueId, venueId))
    ).map((section) => [section.id, section]),
  );

  const keptIds = new Set(zones.map((zone) => zone.id));
  const removedIds = [...saved.keys()].filter((id) => !keptIds.has(id));
  if (removedIds.length > 0) {
    const [used] = await tx
      .select({ id: ticketTypes.id })
      .from(ticketTypes)
      .where(inArray(ticketTypes.sectionId, removedIds))
      .limit(1);
    if (used) throw new EventDraftError("venue_section_in_use");
    try {
      await tx.delete(venueSections).where(inArray(venueSections.id, removedIds));
    } catch (error) {
      // Otro evento creó a la vez un tipo de entrada en una zona quitada (FK de `ticket_types`).
      if (pgErrorOf(error).code === "23503") throw new EventDraftError("venue_section_in_use");
      throw error;
    }
  }

  const keepsName = (zone: { id: string; name: string }) => saved.get(zone.id)?.name === zone.name;
  const slugs = new Set(zones.filter(keepsName).map((zone) => saved.get(zone.id)!.slug));
  const rows = zones.map((zone, sortOrder) => ({
    ...zone,
    sortOrder,
    slug: keepsName(zone) ? saved.get(zone.id)!.slug : uniqueZoneSlug(zone.name, slugs),
  }));
  const changed = rows.filter((row) => {
    const section = saved.get(row.id);
    return section && (section.name !== row.name || section.capacity !== row.capacity || section.sortOrder !== row.sortOrder);
  });
  // Las renombradas pasan antes por un nombre y slug provisionales (su id): intercambiar dos nombres no choca con los
  // UNIQUE del recinto, que Postgres comprueba fila a fila.
  for (const row of changed.filter((row) => !keepsName(row))) {
    await tx.update(venueSections).set({ name: row.id, slug: row.id }).where(eq(venueSections.id, row.id));
  }
  for (const { id, name, slug, sortOrder, capacity } of changed) {
    await tx.update(venueSections).set({ name, slug, sortOrder, capacity }).where(eq(venueSections.id, id));
  }
  const added = rows.filter((row) => !saved.has(row.id));
  if (added.length > 0) {
    await tx.insert(venueSections).values(added.map((row) => ({ ...row, venueId, seating: "general" as const })));
  }
}

/** Fila de `ticket_types` que escribe el formulario, ya con la sección guardada y su slug. */
type TicketTypeRow = { sectionId: string; slug: string; name: string; priceCents: number; sortOrder: number };

/**
 * Recinto del borrador y sus tipos de entrada listos para guardar; `null` sin recinto. De la lista, tiene que estar
 * `approved` o ser un pendiente del organizador del evento (spec organizer-manual-venue, Decisiones 5 y 8); a mano, se
 * guarda con `saveManualVenue` (`currentVenueId`: el recinto que el evento ya tiene, al editar). Cada tipo de entrada
 * tiene que ser de una sección de ese recinto (y sin recinto no puede haber tipos de entrada); los de un recinto a mano
 * nuevo pasan a sus zonas nuevas (`sectionIds`).
 */
async function resolveVenue(
  input: EventDraftInput,
  organizerId: string,
  actor: Actor,
  tx: Tx,
  currentVenueId: string | null = null,
): Promise<(EventVenue & { ticketTypes: TicketTypeRow[] }) | null> {
  if (!input.venue) {
    if (input.ticketTypes.length > 0) throw new EventDraftError("venue_required");
    return null;
  }
  const { id, sectionIds } =
    input.venue.kind === "existing"
      ? { id: input.venue.id, sectionIds: undefined }
      : await saveManualVenue(input.venue, organizerId, actor.id, currentVenueId, tx);
  const [venue] = await tx
    .select({ name: venues.name, city: venues.city })
    .from(venues)
    .where(
      and(
        eq(venues.id, id),
        or(eq(venues.status, "approved"), and(eq(venues.status, "pending_review"), eq(venues.organizerId, organizerId))),
      ),
    );
  if (!venue) throw new EventDraftError("venue_not_approved");

  const sections = await tx
    .select({ id: venueSections.id, slug: venueSections.slug })
    .from(venueSections)
    .where(eq(venueSections.venueId, id));
  const saved = new Map(sections.map((section) => [section.id, section]));
  const ticketTypes = input.ticketTypes.map(({ sectionId, name, priceCents, sortOrder }) => {
    const section = saved.get(sectionIds?.get(sectionId) ?? sectionId);
    if (!section) throw new EventDraftError("section_not_in_venue");
    return { sectionId: section.id, slug: section.slug, name, priceCents, sortOrder };
  });
  return { id, ...venue, ticketTypes };
}

/** Id de la categoría del borrador; un slug que no está en `categories` → `invalid_category`. */
async function getCategoryId(category: EventDraftInput["category"], tx: Tx): Promise<string> {
  const [row] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.slug, category));
  if (!row) throw new EventDraftError("invalid_category");
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

type EventVenue = { id: string; name: string; city: string };

/** Columnas de `events` que escribe el formulario. */
function eventColumns(input: EventDraftInput, venue: EventVenue | null) {
  return {
    venueId: venue?.id ?? null,
    title: input.title,
    description: input.description,
    imageUrl: input.imageUrl,
    startsAt: input.startsAt,
    doorsOpenAt: input.doorsOpenAt,
    minAge: input.minAge,
    searchText: buildSearchText(input.title, venue),
  };
}

async function insertTicketTypes(tx: Tx, eventId: string, rows: TicketTypeRow[] = []): Promise<void> {
  if (rows.length === 0) return;
  await tx.insert(ticketTypes).values(
    // Único por evento: un tipo de entrada por sección (UNIQUE(event_id, section_id)) y slugs únicos por recinto. El
    // tope por orden es el mismo que el de la compra y el seed.
    rows.map((row) => ({ ...row, eventId, maxPerOrder: MAX_TICKETS_PER_ORDER })),
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
 * Bloquea (`FOR UPDATE`) el evento `eventId` que `actor` puede gestionar (el suyo o, con `events:manageAny`, cualquiera)
 * y lo devuelve. `not_found` si no existe o es ajeno. Un segundo escritor espera aquí a que termine el primero.
 */
export async function lockManagedEvent(actor: Actor, eventId: string, tx: Tx) {
  const manageAny = roleCan(actor.role, "events:manageAny");
  const [event] = await tx
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      status: events.status,
      organizerId: events.organizerId,
      categoryId: events.categoryId,
      venueId: events.venueId,
      description: events.description,
      imageUrl: events.imageUrl,
      startsAt: events.startsAt,
      doorsOpenAt: events.doorsOpenAt,
      minAge: events.minAge,
    })
    .from(events)
    .where(and(eq(events.id, eventId), manageAny ? undefined : eq(events.organizerId, actor.id)))
    .for("update");
  if (!event) throw new EventDraftError("not_found");
  return event;
}

/** Evento bloqueado por `lockManagedEvent`. */
export type LockedEvent = Awaited<ReturnType<typeof lockManagedEvent>>;

/**
 * ¿Tiene el evento ventas activas (`isActiveSaleOrder`)? Bloquean la cancelación (Decisión 12) y, al cambiar la fecha de
 * un publicado, informan `schedule_changed_at` (spec event-editing, Decisión 2).
 */
export async function hasActiveSales(eventId: string, database: Queryable): Promise<boolean> {
  const [order] = await database
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.eventId, eventId), isActiveSaleOrder))
    .limit(1);
  return order !== undefined;
}

/**
 * Ejecuta `run` en una transacción y traduce un slug repetido (UNIQUE `events_slug_unique`, 23505) a `slug_taken`: solo
 * pasa si otro escritor fuera de `generateUniqueSlug` (seed, SQL manual) inserta el mismo slug a la vez.
 */
async function inTransaction<T>(database: Database, run: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await database.transaction(run);
  } catch (error) {
    const { code, constraint } = pgErrorOf(error);
    if (code === "23505" && constraint === "events_slug_unique") throw new EventDraftError("slug_taken");
    throw error;
  }
}

/**
 * Crea un borrador (`status = draft`) con slug único y sus tipos de entrada por sección del recinto; con un recinto
 * ingresado a mano, también ese recinto (`pending_review`) y sus zonas.
 */
export async function createEvent(actor: Actor, input: EventDraftInput, database: Database = db): Promise<{ id: string }> {
  return inTransaction(database, async (tx) => {
    const organizerId = await resolveOrganizerId(actor, input.organizerId, tx);
    const venue = await resolveVenue(input, organizerId, actor, tx);
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
    await insertTicketTypes(tx, id, venue?.ticketTypes);
    return { id };
  });
}

/**
 * Edita un evento según su estado (spec event-editing, Decisión 1) y devuelve su estado, su slug (la acción invalida
 * las páginas públicas de un evento publicado) y la notificación a compradores encolada, si la hubo (solo publicados):
 * - `draft`: edición libre (también la del recinto ingresado a mano, spec organizer-manual-venue, Decisión 7).
 * - `pending_review`: como un borrador (aún no tiene inventario), pero sigue cumpliendo los requisitos para enviarlo a
 *   revisión (`incomplete`) y sigue en revisión: el admin aprueba la versión guardada.
 * - `published`: `updatePublishedEvent` (sin cambiar recinto, secciones ni organizador; tampoco a un recinto a mano:
 *   el suyo ya está `approved`). Su slug no cambia.
 * - `cancelled` y `finished`: `edit_locked`.
 */
export async function updateEvent(
  actor: Actor,
  eventId: string,
  input: EventDraftInput,
  database: Database = db,
  now: Date = new Date(),
): Promise<{ status: "draft" | "pending_review" | "published"; slug: string; notification: EnqueuedNotification }> {
  return inTransaction(database, async (tx) => {
    await assertActorCanMutate(actor, tx);
    const current = await lockManagedEvent(actor, eventId, tx);
    if (current.status === "draft") {
      return { status: "draft" as const, slug: (await updateDraftEvent(actor, current, input, tx)).slug, notification: null };
    }
    if (current.status === "pending_review") {
      // Antes de escribir, lo que exige `events_draft_complete_check`; después, con los tipos guardados, todo (también
      // que cada sección tenga lugares).
      const issues = getPublishIssues(
        { ...input, hasVenue: input.venue !== null, ticketTypeCount: input.ticketTypes.length },
        now,
      );
      if (issues.length > 0) throw new EventDraftError("incomplete", issues);
      const { slug, venueId } = await updateDraftEvent(actor, current, input, tx);
      await assertPublishable({ ...input, id: current.id, venueId }, tx, now);
      return { status: "pending_review" as const, slug, notification: null };
    }
    if (current.status === "published") {
      const notification = await updatePublishedEvent(actor, current, input, tx, now);
      return { status: "published" as const, slug: current.slug, notification };
    }
    throw new EventDraftError("edit_locked");
  });
}

/**
 * Requisitos para enviar a revisión y publicar (spec admin-panel, F5b, requisito 4): campos del CHECK, al menos un tipo
 * de entrada, cada uno con algún lugar que vender (su sección tiene capacidad) y fecha futura. Lee los tipos de entrada
 * guardados del evento.
 */
export async function assertPublishable(
  event: Pick<LockedEvent, "id" | "venueId" | "description" | "imageUrl" | "startsAt" | "doorsOpenAt">,
  tx: Tx,
  now: Date,
): Promise<void> {
  const [{ ticketTypeCount, emptyTicketTypeCount }] = await tx
    .select({
      ticketTypeCount: count(),
      emptyTicketTypeCount: sql<number>`count(*) filter (where coalesce(${sectionCapacity}, 0) = 0)`.mapWith(Number),
    })
    .from(ticketTypes)
    .innerJoin(venueSections, eq(venueSections.id, ticketTypes.sectionId))
    .where(eq(ticketTypes.eventId, event.id));
  const issues = getPublishIssues({ ...event, hasVenue: event.venueId !== null, ticketTypeCount, emptyTicketTypeCount }, now);
  if (issues.length > 0) throw new EventDraftError("incomplete", issues);
}

/**
 * Borrador (o en revisión). Reemplaza sus tipos de entrada (delete + insert): sin órdenes ni inventario
 * (`has_activity`), nada los referencia. Si cambia el slug del título, se regenera (aún no tiene URL pública). Devuelve
 * el slug y el recinto con que queda.
 */
async function updateDraftEvent(
  actor: Actor,
  current: LockedEvent,
  input: EventDraftInput,
  tx: Tx,
): Promise<{ slug: string; venueId: string | null }> {
  const organizerId = await resolveOrganizerId(actor, input.organizerId, tx);
  if (await hasActivity(current.id, tx)) throw new EventDraftError("has_activity");
  // Antes de guardar el recinto: estos tipos referencian las zonas de uno ingresado a mano, y las quitadas se borran.
  await tx.delete(ticketTypes).where(eq(ticketTypes.eventId, current.id));
  const venue = await resolveVenue(input, organizerId, actor, tx, current.venueId);
  const slug =
    slugify(input.title) === slugify(current.title) ? current.slug : await generateUniqueSlug(input.title, tx, current.id);

  await tx
    .update(events)
    .set({
      ...eventColumns(input, venue),
      slug,
      organizerId,
      categoryId: await getCategoryId(input.category, tx),
    })
    .where(eq(events.id, current.id));
  await insertTicketTypes(tx, current.id, venue?.ticketTypes);
  return { slug, venueId: venue?.id ?? null };
}

const sameInstant = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

/**
 * Evento publicado (ya tiene inventario y URL pública), con o sin ventas (spec event-editing, Decisión 1):
 * - nunca cambian el recinto, las secciones a la venta ni el organizador (`structure_locked`): el inventario generado al
 *   aprobar depende de ellos; tampoco el slug;
 * - sí cambian textos, portada, edad, categoría, fecha/hora y nombre y precio de cada tipo de entrada. Un precio nuevo
 *   solo afecta a ventas nuevas: no toca órdenes ni entradas ya creadas; no cambia mientras el tipo tenga reservas
 *   `pending` vigentes (`price_locked_pending`, enmienda 1); su nombre sí;
 * - con ventas activas (`hasActiveSales`), un cambio de inicio o apertura de puertas informa `schedule_changed_at`
 *   (aviso «Fecha actualizada» a los compradores, Decisión 2);
 * - sigue cumpliendo los requisitos para publicar (`incomplete`); la fecha tiene que ser futura solo si cambia;
 * - encola en la misma transacción el correo a los compradores (spec event-change-notifications, Decisión 3) con todos
 *   los cambios visibles: `schedule` (sale ya) si cambia el inicio o la apertura de puertas, aunque cambien también
 *   otros campos (van en ese mismo correo); si no, `update` (se agrupa 10 minutos). Sin compradores no encola nada.
 */
async function updatePublishedEvent(
  actor: Actor,
  current: LockedEvent,
  input: EventDraftInput,
  tx: Tx,
  now: Date,
): Promise<EnqueuedNotification> {
  const currentTypes = await tx
    .select({
      id: ticketTypes.id,
      sectionId: ticketTypes.sectionId,
      name: ticketTypes.name,
      priceCents: ticketTypes.priceCents,
    })
    .from(ticketTypes)
    .where(eq(ticketTypes.eventId, current.id));
  const currentSections = new Map(currentTypes.map((type) => [type.sectionId, type]));
  const organizerChanged = roleCan(actor.role, "events:manageAny") && input.organizerId !== current.organizerId;
  const sectionsChanged =
    input.ticketTypes.length !== currentTypes.length ||
    input.ticketTypes.some((type) => !currentSections.has(type.sectionId));
  const venueChanged = input.venue?.kind !== "existing" || input.venue.id !== current.venueId;
  if (organizerChanged || venueChanged || sectionsChanged) {
    throw new EventDraftError("structure_locked");
  }

  const categoryId = await getCategoryId(input.category, tx);
  const startsAtChanged = !sameInstant(input.startsAt, current.startsAt);
  const issues = getPublishIssues(
    { ...input, hasVenue: input.venue !== null, ticketTypeCount: input.ticketTypes.length },
    now,
    { checkFutureDate: startsAtChanged },
  );
  if (issues.length > 0) throw new EventDraftError("incomplete", issues);

  // Enmienda 1: el webhook cobra el precio actual del tipo al confirmar un pago; con reservas en curso no cambia.
  const repricedTypeIds = input.ticketTypes.flatMap((type) => {
    const saved = currentSections.get(type.sectionId);
    return saved && saved.priceCents !== type.priceCents ? [saved.id] : [];
  });
  if (await hasPendingReservations(repricedTypeIds, tx)) throw new EventDraftError("price_locked_pending");

  const scheduleChanged = startsAtChanged || !sameInstant(input.doorsOpenAt, current.doorsOpenAt);
  const notifyBuyers = scheduleChanged && (await hasActiveSales(current.id, tx));
  // El mismo recinto de antes (`venueChanged`); un publicado siempre tiene uno (`events_draft_complete_check`).
  const [venue] = current.venueId
    ? await tx
        .select({ id: venues.id, name: venues.name, city: venues.city })
        .from(venues)
        .where(eq(venues.id, current.venueId))
    : [];
  await tx
    .update(events)
    .set({
      ...eventColumns(input, venue ?? null),
      categoryId,
      ...(notifyBuyers && { scheduleChangedAt: now }),
    })
    .where(eq(events.id, current.id));
  for (const type of input.ticketTypes) {
    await tx
      .update(ticketTypes)
      .set({ name: type.name, priceCents: type.priceCents })
      .where(and(eq(ticketTypes.eventId, current.id), eq(ticketTypes.sectionId, type.sectionId)));
  }

  const changes = await describeChanges(current, input, categoryId, currentSections, tx);
  const kind = scheduleChanged ? "schedule" : "update";
  const id = await enqueueEventNotification(tx, { eventId: current.id, kind, changes, actorId: actor.id });
  return id ? { id, kind } : null;
}

/**
 * Cambios visibles para los compradores (antes → ahora), con valores legibles: fechas en ISO (el correo las muestra en
 * hora de Lima), la categoría por su nombre y cada tipo de entrada por su nombre anterior, con el precio en soles.
 */
async function describeChanges(
  current: LockedEvent,
  input: EventDraftInput,
  categoryId: string,
  currentTypes: Map<string, { name: string; priceCents: number }>,
  tx: Tx,
): Promise<EventChange[]> {
  const changes: EventChange[] = [];
  const add = (field: string, before: EventChange["before"], after: EventChange["after"]) => {
    if (before !== after) changes.push({ field, before, after });
  };
  const iso = (date: Date | null) => date?.toISOString() ?? null;
  const price = (cents: number) => formatEventPrice(cents / 100);

  add("title", current.title, input.title);
  add("description", current.description, input.description);
  add("imageUrl", current.imageUrl, input.imageUrl);
  if (categoryId !== current.categoryId) {
    const names = new Map(
      (
        await tx
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(inArray(categories.id, [current.categoryId, categoryId]))
      ).map((category) => [category.id, category.name]),
    );
    add("category", names.get(current.categoryId) ?? null, names.get(categoryId) ?? null);
  }
  add("minAge", current.minAge, input.minAge);
  add("startsAt", iso(current.startsAt), iso(input.startsAt));
  add("doorsOpenAt", iso(current.doorsOpenAt), iso(input.doorsOpenAt));
  for (const type of input.ticketTypes) {
    // `structure_locked` ya garantizó que cada tipo del formulario es uno de los guardados.
    const saved = currentTypes.get(type.sectionId)!;
    add(`Entrada «${saved.name}»: nombre`, saved.name, type.name);
    add(`Entrada «${saved.name}»: precio`, price(saved.priceCents), price(type.priceCents));
  }
  return changes;
}

/**
 * ¿Algún asiento de estos tipos de entrada está en una reserva en curso? Orden `pending` vigente: `isActiveSaleOrder`
 * restringida a `pending` (spec event-editing, enmienda 1).
 */
async function hasPendingReservations(ticketTypeIds: string[], tx: Tx): Promise<boolean> {
  if (ticketTypeIds.length === 0) return false;
  const [seat] = await tx
    .select({ id: eventSeats.id })
    .from(eventSeats)
    .innerJoin(orders, eq(orders.id, eventSeats.orderId))
    .where(and(inArray(eventSeats.ticketTypeId, ticketTypeIds), eq(orders.status, "pending"), isActiveSaleOrder))
    .limit(1);
  return seat !== undefined;
}

/** Elimina un borrador sin órdenes ni inventario, con sus tipos de entrada. */
export async function deleteEvent(actor: Actor, eventId: string, database: Database = db): Promise<void> {
  await database.transaction(async (tx) => {
    await assertActorCanMutate(actor, tx);
    const event = await lockManagedEvent(actor, eventId, tx);
    if (event.status !== "draft") throw new EventDraftError("delete_not_draft");
    if (await hasActivity(eventId, tx)) throw new EventDraftError("has_activity");
    await tx.delete(ticketTypes).where(eq(ticketTypes.eventId, eventId));
    await tx.delete(events).where(eq(events.id, eventId));
  });
}

/**
 * Evento para precargar Editar si `actor` lo gestiona (el suyo o, con `events:manageAny`, cualquiera), en cualquier
 * estado (la página decide qué se puede editar), con la nota del último rechazo, si tiene ventas activas y cuántas
 * entradas vendió (el formulario pide confirmación al cambiar la fecha). `null` si no existe, es ajeno o el id no es un
 * uuid.
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
      reviewNote: events.reviewNote,
      featured: events.featured,
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
    category: categorySlugSchema.parse(event.category),
    startsAt: event.startsAt?.toISOString() ?? null,
    doorsOpenAt: event.doorsOpenAt?.toISOString() ?? null,
    ticketTypes: eventTicketTypes,
    hasSales: await hasActiveSales(eventId, database),
    sold: await countSoldTickets(eventId, database),
  };
}

/** Entradas vendidas: suma de `ticket_count` de las órdenes `paid` (como `sold` de `listManagedEvents`). */
async function countSoldTickets(eventId: string, database: Queryable): Promise<number> {
  const [{ sold }] = await database
    .select({ sold: sql<number>`coalesce(sum(${orders.ticketCount}), 0)`.mapWith(Number) })
    .from(orders)
    .where(and(eq(orders.eventId, eventId), eq(orders.status, "paid")));
  return sold;
}

/** Capacidad de una sección: lugares si es general; sus `venue_seats` si es numerada (como `listManagedEvents`). */
export const sectionCapacity = sql<number>`case when ${venueSections.seating} = 'general' then ${venueSections.capacity} else (select count(*) from ${venueSeats} where ${venueSeats.sectionId} = ${venueSections.id}) end`;

/**
 * Recintos del Select del formulario (por ciudad y nombre) con su dirección y sus secciones en orden (spec
 * organizer-manual-venue, Decisiones 3b y 5): los `approved` y los `pending_review` de `viewer`; con
 * `events:manageAny` (admin y super_admin), los pendientes de todos, y el formulario muestra solo los del organizador
 * elegido (`organizerId`).
 */
export async function listApprovedVenuesWithSections(viewer: Actor, database: Queryable = db): Promise<VenueOption[]> {
  const visiblePending = roleCan(viewer.role, "events:manageAny")
    ? eq(venues.status, "pending_review")
    : and(eq(venues.status, "pending_review"), eq(venues.organizerId, viewer.id));
  const rows = await database
    .select({
      venueId: venues.id,
      venueName: venues.name,
      address: venues.address,
      city: venues.city,
      lat: venues.lat,
      lng: venues.lng,
      placeId: venues.placeId,
      status: venues.status,
      organizerId: venues.organizerId,
      sectionId: venueSections.id,
      sectionName: venueSections.name,
      seating: venueSections.seating,
      capacity: sectionCapacity,
    })
    .from(venues)
    .leftJoin(venueSections, eq(venueSections.venueId, venues.id))
    .where(or(eq(venues.status, "approved"), visiblePending))
    .orderBy(venues.city, venues.name, venues.id, venueSections.sortOrder, venueSections.name);

  const byId = new Map<string, VenueOption>();
  for (const row of rows) {
    let venue = byId.get(row.venueId);
    if (!venue) {
      const { venueId: id, venueName: name, address, city, lat, lng, placeId, status, organizerId } = row;
      venue = { id, name, address, city, lat, lng, placeId, status, organizerId, sections: [] };
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
