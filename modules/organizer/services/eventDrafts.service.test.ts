// @vitest-environment node
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { orders } from "@/lib/db/schema/sales";
import { describeWithDb } from "@/lib/db/testDb";
import { db, inRolledBackTransaction, openTransaction, type Tx, waitForLockWait } from "@/lib/db/testTransaction";
import { OrganizerNotApprovedError } from "@/modules/auth/server";
import type { EventDraftInput } from "../types/organizer.types";
import {
  createEvent,
  deleteEvent,
  getEventForEdit,
  listApprovedOrganizers,
  listApprovedVenuesWithSections,
  updateEvent,
} from "./eventDrafts.service";
import {
  type Actor,
  createUser,
  createVenue,
  domainError,
  draftInput,
  insertOrder,
  type OrganizerStatus,
  setupDraft,
} from "./eventTestHelpers";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

const ADMIN: Actor = { id: randomUUID(), role: "admin" };
const SUPER_ADMIN: Actor = { id: randomUUID(), role: "super_admin" };

async function setOrganizerStatus(tx: Tx, userId: string, status: OrganizerStatus) {
  await tx.update(organizers).set({ status }).where(eq(organizers.userId, userId));
}

/** Borrador sin recinto ni tipos de entrada: solo el nombre. */
function titleOnlyInput(title: string): EventDraftInput {
  return {
    title,
    category: "teatro",
    description: null,
    startsAt: null,
    doorsOpenAt: null,
    minAge: 0,
    venueId: null,
    imageUrl: null,
    organizerId: null,
    ticketTypes: [],
  };
}

async function getEvent(tx: Tx, id: string) {
  const [event] = await tx.select().from(events).where(eq(events.id, id));
  return event;
}

async function getTicketTypes(tx: Tx, eventId: string) {
  return tx
    .select({
      sectionId: ticketTypes.sectionId,
      slug: ticketTypes.slug,
      name: ticketTypes.name,
      priceCents: ticketTypes.priceCents,
      sortOrder: ticketTypes.sortOrder,
      maxPerOrder: ticketTypes.maxPerOrder,
    })
    .from(ticketTypes)
    .where(eq(ticketTypes.eventId, eventId))
    .orderBy(asc(ticketTypes.sortOrder));
}

async function getTicketTypeIds(tx: Tx, eventId: string) {
  return tx.select({ id: ticketTypes.id }).from(ticketTypes).where(eq(ticketTypes.eventId, eventId));
}

/** Organizador aprobado confirmado en la BD (fuera de `inRolledBackTransaction`) y la limpieza de él y sus eventos. */
async function createCommittedOrganizer() {
  const owner = await db.transaction((tx) => createUser(tx, "approved"));
  const cleanup = () =>
    db.transaction(async (tx) => {
      await tx.delete(events).where(eq(events.organizerId, owner.id));
      await tx.delete(organizers).where(eq(organizers.userId, owner.id));
      await tx.delete(users).where(eq(users.id, owner.id));
    });
  return { owner, cleanup };
}

describeWithDb("eventDrafts.service", () => {
  describe("createEvent", () => {
    it("un organizador aprobado crea un borrador suyo con slug, texto de búsqueda y tipos de entrada por sección", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const venue = await createVenue(tx, owner.id);
        // El organizador indicado se ignora: el dueño es quien crea.
        const { id } = await createEvent(owner, draftInput(venue, { title: "Año Nuevo en Lima", organizerId: randomUUID() }));

        const event = await getEvent(tx, id);
        expect(event).toMatchObject({
          status: "draft",
          organizerId: owner.id,
          venueId: venue.id,
          slug: "ano-nuevo-en-lima",
          title: "Año Nuevo en Lima",
          searchText: `ano nuevo en lima ${venue.name.toLowerCase()} lima`,
          minAge: 18,
        });
        expect(await getTicketTypes(tx, id)).toEqual([
          { sectionId: venue.campoId, slug: "campo", name: "General", priceCents: 5000, sortOrder: 0, maxPerOrder: 10 },
          { sectionId: venue.plateaId, slug: "platea", name: "Platea VIP", priceCents: 12000, sortOrder: 1, maxPerOrder: 10 },
        ]);
      }));

    it("guarda un borrador incompleto: solo el nombre", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const { id } = await createEvent(owner, titleOnlyInput("Solo nombre"));
        expect(await getEvent(tx, id)).toMatchObject({ status: "draft", venueId: null, startsAt: null, searchText: "solo nombre" });
        expect(await getTicketTypes(tx, id)).toEqual([]);
      }));

    it("guarda con una categoría nueva de la BD (cafe-shop)", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const { id } = await createEvent(owner, { ...titleOnlyInput("Cata de café"), category: "cafe-shop" });
        const [cafe] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.slug, "cafe-shop"));
        expect((await getEvent(tx, id)).categoryId).toBe(cafe.id);
      }));

    it("una categoría que no está en la BD da invalid_category («Categoría no válida») sin crear nada", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const input = { ...titleOnlyInput("Sin categoría"), category: "inexistente" };
        await expect(createEvent(owner, input)).rejects.toEqual(domainError("invalid_category"));
        expect(await tx.select().from(events).where(eq(events.title, "Sin categoría"))).toEqual([]);
      }));

    it("un admin sin organizador no puede crear", () =>
      inRolledBackTransaction(async (tx) => {
        const venue = await createVenue(tx, (await createUser(tx)).id);
        await expect(createEvent(ADMIN, draftInput(venue))).rejects.toEqual(domainError("organizer_required"));
      }));

    it.each(["pending", "suspended"] as const)("un admin no puede asignar un organizador %s", (status) =>
      inRolledBackTransaction(async (tx) => {
        const organizer = await createUser(tx, status);
        const venue = await createVenue(tx, organizer.id);
        await expect(createEvent(ADMIN, draftInput(venue, { organizerId: organizer.id }))).rejects.toEqual(
          domainError("organizer_not_approved"),
        );
      }));

    it("un admin no puede asignar a un usuario que no es organizador", () =>
      inRolledBackTransaction(async (tx) => {
        const customer = await createUser(tx);
        const venue = await createVenue(tx, customer.id);
        await expect(createEvent(SUPER_ADMIN, draftInput(venue, { organizerId: customer.id }))).rejects.toEqual(
          domainError("organizer_not_approved"),
        );
      }));

    it("un admin crea el borrador a nombre del organizador aprobado elegido", () =>
      inRolledBackTransaction(async (tx) => {
        const organizer = await createUser(tx, "approved");
        const venue = await createVenue(tx, organizer.id);
        const { id } = await createEvent(ADMIN, draftInput(venue, { organizerId: organizer.id }));
        expect((await getEvent(tx, id)).organizerId).toBe(organizer.id);
      }));

    it.each(["pending", "suspended", null] as const)("un organizador %s no puede crear", (status) =>
      inRolledBackTransaction(async (tx) => {
        const actor = status ? await createUser(tx, status) : { ...(await createUser(tx)), role: "organizer" as const };
        const venue = await createVenue(tx, actor.id);
        await expect(createEvent(actor, draftInput(venue))).rejects.toBeInstanceOf(OrganizerNotApprovedError);
      }));

    it("rechaza una sección de otro recinto sin crear nada", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const venue = await createVenue(tx, owner.id);
        const other = await createVenue(tx, owner.id);
        const input = draftInput(venue, {
          title: "Sección ajena",
          ticketTypes: [{ sectionId: other.campoId, name: "General", priceCents: 5000, sortOrder: 0 }],
        });
        await expect(createEvent(owner, input)).rejects.toEqual(domainError("section_not_in_venue"));
        expect(await tx.select().from(events).where(eq(events.title, "Sección ajena"))).toEqual([]);
      }));

    it("rechaza un recinto no aprobado o inexistente", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const pending = await createVenue(tx, owner.id, "pending_review");
        await expect(createEvent(owner, draftInput(pending))).rejects.toEqual(domainError("venue_not_approved"));
        const missing = { ...pending, id: randomUUID() };
        await expect(createEvent(owner, draftInput(missing, { ticketTypes: [] }))).rejects.toEqual(
          domainError("venue_not_approved"),
        );
      }));

    it("rechaza tipos de entrada sin recinto", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const venue = await createVenue(tx, owner.id);
        await expect(createEvent(owner, draftInput(venue, { venueId: null }))).rejects.toEqual(
          domainError("venue_required"),
        );
      }));

    it("con un título repetido el slug lleva el primer sufijo libre", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const venue = await createVenue(tx, owner.id);
        const title = `Gira ${randomUUID().slice(0, 8)}`;
        const slugs = [];
        for (let i = 0; i < 3; i++) {
          const { id } = await createEvent(owner, draftInput(venue, { title }));
          slugs.push((await getEvent(tx, id)).slug);
        }
        const base = title.toLowerCase().replace(" ", "-");
        expect(slugs).toEqual([base, `${base}-2`, `${base}-3`]);
      }));

    it("títulos de bases distintas que compiten por el mismo slug se serializan (\"Rock\" → rock-2 y \"Rock 2\")", async () => {
      const { owner, cleanup } = await createCommittedOrganizer();
      const title = `Rock ${randomUUID().slice(0, 8)}`;
      const base = title.toLowerCase().replace(" ", "-");
      // A ocupa `<base>` y `<base>-2` sin confirmar; B ("<título> 2") quiere `<base>-2` y debe esperar a A.
      const first = await openTransaction(async (tx) => {
        await createEvent(owner, titleOnlyInput(title), tx as unknown as typeof db);
        await createEvent(owner, titleOnlyInput(title), tx as unknown as typeof db);
      });
      const second = createEvent(owner, titleOnlyInput(`${title} 2`));
      try {
        await waitForLockWait("pg_advisory_xact_lock");
        await first.commit();
        const { id } = await second;

        const slugs = await db.select({ slug: events.slug }).from(events).where(eq(events.organizerId, owner.id));
        expect(slugs.map((row) => row.slug).sort()).toEqual([base, `${base}-2`, `${base}-2-2`]);
        expect((await db.select({ slug: events.slug }).from(events).where(eq(events.id, id)))[0].slug).toBe(`${base}-2-2`);
      } finally {
        // Si algo falla, A se confirma igual y B termina antes de limpiar: si no, la limpieza esperaría sus locks.
        await first.commit();
        await second.catch(() => undefined);
        await cleanup();
      }
    });

    it("un slug repetido por otro escritor a la vez (UNIQUE events_slug_unique) da slug_taken", async () => {
      const { owner, cleanup } = await createCommittedOrganizer();
      const title = `Choque ${randomUUID().slice(0, 8)}`;
      const slug = title.toLowerCase().replace(" ", "-");
      // Un INSERT directo (sin pasar por el lock de slugs) ocupa el slug sin confirmar: createEvent no lo ve.
      const writer = await openTransaction(async (tx) => {
        const [{ id: categoryId }] = await tx.select({ id: categories.id }).from(categories).limit(1);
        await tx
          .insert(events)
          .values({ slug, organizerId: owner.id, categoryId, title, minAge: 0, status: "draft", searchText: slug });
      });
      const outcome = createEvent(owner, titleOnlyInput(title)).catch((error: unknown) => error);
      try {
        await waitForLockWait('insert into "events"');
        await writer.commit();
        expect(await outcome).toEqual(domainError("slug_taken"));
      } finally {
        await writer.commit();
        await outcome;
        await cleanup();
      }
    });

    it("un título sin letras ni números da el slug \"evento\" (o el primero libre)", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const { id } = await createEvent(owner, draftInput(await createVenue(tx, owner.id), { title: "¡¡¡!!!" }));
        expect((await getEvent(tx, id)).slug).toMatch(/^evento(-\d+)?$/);
      }));
  });

  describe("updateEvent", () => {
    it("el dueño edita: cambia los datos, reemplaza los tipos de entrada y regenera el slug si cambia el título", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupDraft(tx);
        const suffix = randomUUID().slice(0, 8);
        const title = `Nuevo título ${suffix}`;
        const result = await updateEvent(
          owner,
          eventId,
          draftInput(venue, {
            title,
            minAge: 0,
            imageUrl: null,
            ticketTypes: [{ sectionId: venue.plateaId, name: "Platea", priceCents: 9000, sortOrder: 0 }],
          }),
        );
        expect(result).toEqual({ status: "draft", slug: `nuevo-titulo-${suffix}` });

        expect(await getEvent(tx, eventId)).toMatchObject({
          title,
          slug: `nuevo-titulo-${suffix}`,
          minAge: 0,
          imageUrl: null,
          status: "draft",
          organizerId: owner.id,
        });
        expect(await getTicketTypes(tx, eventId)).toEqual([
          { sectionId: venue.plateaId, slug: "platea", name: "Platea", priceCents: 9000, sortOrder: 0, maxPerOrder: 10 },
        ]);
      }));

    it("con el mismo título conserva el slug", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupDraft(tx);
        const { slug } = await getEvent(tx, eventId);
        await updateEvent(owner, eventId, draftInput(venue, { description: "Otra descripción" }));
        expect((await getEvent(tx, eventId)).slug).toBe(slug);
      }));

    it("un organizador no edita eventos ajenos (como si no existieran)", () =>
      inRolledBackTransaction(async (tx) => {
        const { venue, eventId } = await setupDraft(tx);
        const intruder = await createUser(tx, "approved");
        await expect(updateEvent(intruder, eventId, draftInput(venue))).rejects.toEqual(domainError("not_found"));
      }));

    it("un admin edita cualquier borrador y puede cambiar su organizador", () =>
      inRolledBackTransaction(async (tx) => {
        const { venue, eventId } = await setupDraft(tx);
        const other = await createUser(tx, "approved");
        await updateEvent(ADMIN, eventId, draftInput(venue, { organizerId: other.id }));
        expect((await getEvent(tx, eventId)).organizerId).toBe(other.id);
      }));

    it.each(["pending", "suspended"] as const)("un organizador %s no puede editar su borrador", (status) =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupDraft(tx);
        await setOrganizerStatus(tx, owner.id, status);
        await expect(updateEvent(owner, eventId, draftInput(venue))).rejects.toBeInstanceOf(OrganizerNotApprovedError);
      }));

    it("rechaza una sección de otro recinto y no cambia nada", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupDraft(tx);
        const other = await createVenue(tx, owner.id);
        const input = draftInput(venue, {
          title: "No se guarda",
          ticketTypes: [{ sectionId: other.plateaId, name: "Platea", priceCents: 1, sortOrder: 0 }],
        });
        await expect(updateEvent(owner, eventId, input)).rejects.toEqual(domainError("section_not_in_venue"));
        expect((await getEvent(tx, eventId)).title).toBe("Festival de prueba");
        expect(await getTicketTypes(tx, eventId)).toHaveLength(2);
      }));
  });

  describe("updateEvent fuera de borrador (F5b, Decisión 11)", () => {
    /** Borrador completo pasado a `status` (cumple `events_draft_complete_check`). */
    async function setupEvent(tx: Tx, status: "pending_review" | "published" | "cancelled" | "finished") {
      const setup = await setupDraft(tx);
      await tx.update(events).set({ status }).where(eq(events.id, setup.eventId));
      return setup;
    }

    it("un evento en revisión no se edita (ni el dueño ni un admin): sigue en revisión, sin cambios", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "pending_review");
        const locked = expect.objectContaining({ code: "edit_locked", status: "pending_review" });
        await expect(updateEvent(owner, eventId, draftInput(venue, { description: "Corregida" }))).rejects.toEqual(locked);
        await expect(
          updateEvent(ADMIN, eventId, draftInput(venue, { organizerId: owner.id, minAge: 0 })),
        ).rejects.toEqual(locked);
        expect(await getEvent(tx, eventId)).toMatchObject({
          status: "pending_review",
          description: "Tres escenarios.",
          minAge: 18,
        });
      }));

    it.each(["cancelled", "finished"] as const)("un evento %s no se edita", (status) =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, status);
        await expect(updateEvent(owner, eventId, draftInput(venue))).rejects.toEqual(domainError("edit_locked"));
        await expect(updateEvent(ADMIN, eventId, draftInput(venue, { organizerId: owner.id }))).rejects.toEqual(
          domainError("edit_locked"),
        );
      }));

    it("publicado sin ventas: cambia textos, categoría, fecha, nombre y precio; conserva slug, estado y orden", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "published");
        const { slug } = await getEvent(tx, eventId);
        const startsAt = new Date("2027-02-20T01:00:00Z");
        const result = await updateEvent(
          owner,
          eventId,
          draftInput(venue, {
            title: "Título nuevo",
            category: "conciertos",
            startsAt,
            doorsOpenAt: startsAt,
            ticketTypes: [
              { sectionId: venue.campoId, name: "Campo", priceCents: 6000, sortOrder: 0 },
              { sectionId: venue.plateaId, name: "Platea VIP", priceCents: 15000, sortOrder: 1 },
            ],
          }),
        );

        // El slug (su URL pública) no cambia aunque cambie el título: la acción invalida esas páginas.
        expect(result).toEqual({ status: "published", slug });
        expect(await getEvent(tx, eventId)).toMatchObject({ status: "published", slug, title: "Título nuevo", startsAt });
        expect(await getTicketTypes(tx, eventId)).toEqual([
          { sectionId: venue.campoId, slug: "campo", name: "Campo", priceCents: 6000, sortOrder: 0, maxPerOrder: 10 },
          { sectionId: venue.plateaId, slug: "platea", name: "Platea VIP", priceCents: 15000, sortOrder: 1, maxPerOrder: 10 },
        ]);
      }));

    it("publicado: nunca cambian el recinto, las secciones a la venta ni el organizador", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "published");
        const other = await createVenue(tx, owner.id);
        await expect(updateEvent(owner, eventId, draftInput(other))).rejects.toEqual(domainError("structure_locked"));
        const onlyCampo = draftInput(venue, {
          ticketTypes: [{ sectionId: venue.campoId, name: "General", priceCents: 5000, sortOrder: 0 }],
        });
        await expect(updateEvent(owner, eventId, onlyCampo)).rejects.toEqual(domainError("structure_locked"));
        const newOwner = await createUser(tx, "approved");
        await expect(updateEvent(ADMIN, eventId, draftInput(venue, { organizerId: newOwner.id }))).rejects.toEqual(
          domainError("structure_locked"),
        );
        expect(await getEvent(tx, eventId)).toMatchObject({ venueId: venue.id, organizerId: owner.id });
      }));

    const activeSales = [
      ["una orden paid", "paid", new Date(Date.now() - 60_000)],
      ["una orden partially_refunded", "partially_refunded", new Date(Date.now() - 60_000)],
      ["una orden pending vigente", "pending", new Date(Date.now() + 10 * 60_000)],
    ] as const;

    it.each(activeSales)("publicado con %s: bloquea precio, fecha, nombre y categoría", (_label, status, expiresAt) =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "published");
        await insertOrder(tx, eventId, status, expiresAt);
        const sensitive: Partial<EventDraftInput>[] = [
          { ticketTypes: draftInput(venue).ticketTypes.map((type) => ({ ...type, priceCents: type.priceCents + 100 })) },
          { ticketTypes: draftInput(venue).ticketTypes.map((type) => ({ ...type, name: `${type.name} 2` })) },
          { startsAt: new Date("2027-03-01T01:00:00Z") },
          { doorsOpenAt: new Date("2027-01-16T00:00:00Z") },
          { category: "teatro" },
        ];
        for (const overrides of sensitive) {
          await expect(updateEvent(owner, eventId, draftInput(venue, overrides))).rejects.toEqual(
            domainError("sensitive_locked"),
          );
        }
        expect(await getTicketTypes(tx, eventId)).toEqual(
          expect.arrayContaining([expect.objectContaining({ name: "General", priceCents: 5000 })]),
        );
      }));

    it.each(activeSales)("publicado con %s: sí cambian título, descripción, portada y edad", (_label, status, expiresAt) =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "published");
        await insertOrder(tx, eventId, status, expiresAt);
        const changes = {
          title: "Nuevo nombre",
          description: "Nueva descripción",
          imageUrl: "https://cdn.example.com/portada.jpg",
          minAge: 0,
        };
        await updateEvent(owner, eventId, draftInput(venue, changes));
        expect(await getEvent(tx, eventId)).toMatchObject({ ...changes, status: "published" });
      }));

    it("una orden pending vencida o reembolsada no bloquea los cambios sensibles", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "published");
        await insertOrder(tx, eventId, "pending", new Date(Date.now() - 60_000));
        await insertOrder(tx, eventId, "refunded", new Date(Date.now() - 60_000));
        const ticketTypes = draftInput(venue).ticketTypes.map((type) => ({ ...type, priceCents: 9900 }));
        await updateEvent(owner, eventId, draftInput(venue, { ticketTypes }));
        expect((await getTicketTypes(tx, eventId)).map((type) => type.priceCents)).toEqual([9900, 9900]);
      }));

    it("publicado: sigue exigiendo los requisitos para publicar y una fecha nueva futura", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "published");
        await expect(
          updateEvent(owner, eventId, draftInput(venue, { description: null, imageUrl: null })),
        ).rejects.toEqual(expect.objectContaining({ code: "incomplete", issues: ["description", "image"] }));
        const past = new Date("2026-01-01T01:00:00Z");
        await expect(
          updateEvent(owner, eventId, draftInput(venue, { startsAt: past, doorsOpenAt: past })),
        ).rejects.toEqual(expect.objectContaining({ code: "incomplete", issues: ["startsAtPast"] }));
      }));

    it("publicado ya empezado: se puede editar el título sin tocar la fecha", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "published");
        const past = new Date("2026-01-01T01:00:00Z");
        await tx.update(events).set({ startsAt: past, doorsOpenAt: past }).where(eq(events.id, eventId));
        await updateEvent(owner, eventId, draftInput(venue, { title: "Edición 2026", startsAt: past, doorsOpenAt: past }));
        expect((await getEvent(tx, eventId)).title).toBe("Edición 2026");
      }));
  });

  describe("deleteEvent", () => {
    it("el dueño borra su borrador y sus tipos de entrada", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx);
        await deleteEvent(owner, eventId);
        expect(await getEvent(tx, eventId)).toBeUndefined();
        expect(await getTicketTypes(tx, eventId)).toEqual([]);
      }));

    it("un organizador no borra eventos ajenos; un admin sí", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupDraft(tx);
        const intruder = await createUser(tx, "approved");
        await expect(deleteEvent(intruder, eventId)).rejects.toEqual(domainError("not_found"));
        await deleteEvent(SUPER_ADMIN, eventId);
        expect(await getEvent(tx, eventId)).toBeUndefined();
      }));

    it.each(["pending", "suspended"] as const)("un organizador %s no puede borrar su borrador", (status) =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx);
        await setOrganizerStatus(tx, owner.id, status);
        await expect(deleteEvent(owner, eventId)).rejects.toBeInstanceOf(OrganizerNotApprovedError);
        expect(await getEvent(tx, eventId)).toBeDefined();
      }));

    it.each(["pending_review", "published", "cancelled"] as const)("no borra un evento %s", (status) =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx);
        await tx.update(events).set({ status }).where(eq(events.id, eventId));
        await expect(deleteEvent(owner, eventId)).rejects.toEqual(domainError("delete_not_draft"));
        await expect(deleteEvent(ADMIN, eventId)).rejects.toEqual(domainError("delete_not_draft"));
        expect(await getEvent(tx, eventId)).toBeDefined();
      }));

    it("no borra ni edita un borrador con inventario", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupDraft(tx);
        const [{ id: ticketTypeId }] = await getTicketTypeIds(tx, eventId);
        await tx.insert(eventSeats).values({ eventId, ticketTypeId });
        await expect(deleteEvent(owner, eventId)).rejects.toEqual(domainError("has_activity"));
        await expect(updateEvent(owner, eventId, draftInput(venue))).rejects.toEqual(domainError("has_activity"));
      }));

    it("no borra ni edita un borrador con una orden (sin inventario)", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupDraft(tx);
        await tx.insert(orders).values({
          code: `TK-TEST-${randomUUID().slice(0, 8)}`,
          eventId,
          status: "pending",
          expiresAt: new Date(),
          ticketCount: 1,
          subtotalCents: 0,
          platformFeeCents: 0,
          organizerAmountCents: 0,
        });
        await expect(deleteEvent(owner, eventId)).rejects.toEqual(domainError("has_activity"));
        await expect(updateEvent(owner, eventId, draftInput(venue))).rejects.toEqual(domainError("has_activity"));
        expect(await getEvent(tx, eventId)).toBeDefined();
      }));

    it("un id inexistente da not_found", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        await expect(deleteEvent(owner, randomUUID())).rejects.toEqual(domainError("not_found"));
      }));
  });

  describe("getEventForEdit", () => {
    it("el dueño y el admin lo leen con sus tipos de entrada; otro organizador no", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupDraft(tx);
        const expected = {
          id: eventId,
          status: "draft",
          organizerId: owner.id,
          title: "Festival de prueba",
          category: "festivales",
          description: "Tres escenarios.",
          startsAt: "2027-01-16T01:00:00.000Z",
          doorsOpenAt: "2027-01-15T23:00:00.000Z",
          minAge: 18,
          venueId: venue.id,
          imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
          ticketTypes: [
            { sectionId: venue.campoId, name: "General", priceCents: 5000 },
            { sectionId: venue.plateaId, name: "Platea VIP", priceCents: 12000 },
          ],
          reviewNote: null,
          featured: false,
          hasSales: false,
        };
        expect(await getEventForEdit(owner, eventId)).toEqual(expected);
        expect(await getEventForEdit(ADMIN, eventId)).toEqual(expected);
        expect(await getEventForEdit(await createUser(tx, "approved"), eventId)).toBeNull();
      }));

    it("incluye la nota del último rechazo y si tiene ventas vigentes", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx);
        await tx.update(events).set({ reviewNote: "Falta la portada" }).where(eq(events.id, eventId));
        await insertOrder(tx, eventId, "pending", new Date(Date.now() + 10 * 60_000));
        expect(await getEventForEdit(owner, eventId)).toMatchObject({ reviewNote: "Falta la portada", hasSales: true });
      }));

    it("un id que no es uuid o un cliente dan null", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupDraft(tx);
        expect(await getEventForEdit(ADMIN, "no-es-un-uuid")).toBeNull();
        expect(await getEventForEdit({ id: randomUUID(), role: "customer" }, eventId)).toBeNull();
      }));
  });

  describe("lecturas del formulario", () => {
    it("listApprovedVenuesWithSections: solo aprobados, secciones en orden y su capacidad", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const venue = await createVenue(tx, owner.id);
        const pending = await createVenue(tx, owner.id, "pending_review");

        const list = await listApprovedVenuesWithSections();
        expect(list.find((candidate) => candidate.id === venue.id)).toEqual({
          id: venue.id,
          name: venue.name,
          city: "Lima",
          sections: [
            { id: venue.campoId, name: "Campo", seating: "general", capacity: 300 },
            { id: venue.plateaId, name: "Platea", seating: "numbered", capacity: 6 },
          ],
        });
        expect(list.some((candidate) => candidate.id === pending.id)).toBe(false);
      }));

    it("listApprovedOrganizers: solo aprobados sin anonimizar, con su razón social", () =>
      inRolledBackTransaction(async (tx) => {
        const approved = await createUser(tx, "approved");
        const pending = await createUser(tx, "pending");
        const suspended = await createUser(tx, "suspended");
        const anonymized = await createUser(tx, "approved", { anonymizedAt: new Date() });

        const list = await listApprovedOrganizers();
        const ids = list.map((organizer) => organizer.id);
        expect(ids).toContain(approved.id);
        expect(ids).not.toContain(pending.id);
        expect(ids).not.toContain(suspended.id);
        expect(ids).not.toContain(anonymized.id);
        expect(list.find((organizer) => organizer.id === approved.id)?.name).toMatch(/^Productora .+ S\.A\.C\.$/);
      }));
  });
});
