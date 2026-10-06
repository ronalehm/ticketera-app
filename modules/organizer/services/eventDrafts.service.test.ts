// @vitest-environment node
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { eventNotifications } from "@/lib/db/schema/notifications";
import { orders, tickets } from "@/lib/db/schema/sales";
import { venueSections, venues } from "@/lib/db/schema/venues";
import { describeWithDb } from "@/lib/db/testDb";
import { db, inRolledBackTransaction, openTransaction, type Tx, waitForLockWait } from "@/lib/db/testTransaction";
import { OrganizerNotApprovedError } from "@/modules/auth/server";
import { enqueueEventNotification } from "@/modules/notifications/server";
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
  getVenueWithZones,
  insertOrder,
  manualDraftInput,
  manualVenueInput,
  type OrganizerStatus,
  setupDraft,
} from "./eventTestHelpers";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));
// El outbox real, espiado para simular un fallo del encolado.
vi.mock("@/modules/notifications/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/notifications/server")>();
  return { ...actual, enqueueEventNotification: vi.fn(actual.enqueueEventNotification) };
});

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
    venue: null,
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

    it("rechaza un recinto pendiente ajeno o inexistente; uno pendiente propio sí se elige de la lista", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const other = await createUser(tx, "approved");
        const pending = await createVenue(tx, other.id, "pending_review");
        await expect(createEvent(owner, draftInput(pending))).rejects.toEqual(domainError("venue_not_approved"));
        const { id } = await createEvent(other, draftInput(pending));
        expect(await getEvent(tx, id)).toMatchObject({ venueId: pending.id, organizerId: other.id });
        const missing = { ...pending, id: randomUUID() };
        await expect(createEvent(owner, draftInput(missing, { ticketTypes: [] }))).rejects.toEqual(
          domainError("venue_not_approved"),
        );
      }));

    it("rechaza tipos de entrada sin recinto", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const venue = await createVenue(tx, owner.id);
        await expect(createEvent(owner, draftInput(venue, { venue: null }))).rejects.toEqual(
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
        expect(result).toEqual({ status: "draft", slug: `nuevo-titulo-${suffix}`, notification: null });

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

    it("en revisión: el dueño y un admin editan como en borrador (también tipos de entrada) y sigue en revisión", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "pending_review");
        const onlyPlatea = [{ sectionId: venue.plateaId, name: "Platea", priceCents: 9000, sortOrder: 0 }];
        expect(
          await updateEvent(owner, eventId, draftInput(venue, { description: "Corregida", ticketTypes: onlyPlatea })),
        ).toEqual({ status: "pending_review", slug: expect.any(String), notification: null });
        expect(await getTicketTypes(tx, eventId)).toEqual([
          { sectionId: venue.plateaId, slug: "platea", name: "Platea", priceCents: 9000, sortOrder: 0, maxPerOrder: 10 },
        ]);

        const other = await createUser(tx, "approved");
        await updateEvent(ADMIN, eventId, draftInput(venue, { organizerId: other.id, minAge: 0 }));
        expect(await getEvent(tx, eventId)).toMatchObject({
          status: "pending_review",
          description: "Tres escenarios.",
          minAge: 0,
          organizerId: other.id,
          scheduleChangedAt: null,
        });
      }));

    it("en revisión: si falta un requisito para revisión no guarda nada y dice qué falta", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "pending_review");
        await expect(
          updateEvent(owner, eventId, draftInput(venue, { title: "No se guarda", imageUrl: null, ticketTypes: [] })),
        ).rejects.toEqual(expect.objectContaining({ code: "incomplete", issues: ["image", "ticketTypes"] }));
        const past = new Date("2026-01-01T01:00:00Z");
        await expect(
          updateEvent(owner, eventId, draftInput(venue, { startsAt: past, doorsOpenAt: past })),
        ).rejects.toEqual(expect.objectContaining({ code: "incomplete", issues: ["startsAtPast"] }));
        // Una sección numerada sin butacas: se detecta con los tipos ya escritos y se revierte todo.
        const [empty] = await tx
          .insert(venueSections)
          .values({ venueId: venue.id, slug: "palco", name: "Palco", sortOrder: 2, seating: "numbered" })
          .returning({ id: venueSections.id });
        const withEmpty = [{ sectionId: empty.id, name: "Palco", priceCents: 1000, sortOrder: 0 }];
        await expect(
          updateEvent(owner, eventId, draftInput(venue, { title: "No se guarda", ticketTypes: withEmpty })),
        ).rejects.toEqual(expect.objectContaining({ code: "incomplete", issues: ["emptyTicketTypes"] }));
        expect(await getEvent(tx, eventId)).toMatchObject({ status: "pending_review", title: "Festival de prueba" });
        expect(await getTicketTypes(tx, eventId)).toHaveLength(2);
      }));

    it("en revisión: un organizador ajeno no lo edita", () =>
      inRolledBackTransaction(async (tx) => {
        const { venue, eventId } = await setupEvent(tx, "pending_review");
        const intruder = await createUser(tx, "approved");
        await expect(updateEvent(intruder, eventId, draftInput(venue))).rejects.toEqual(domainError("not_found"));
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
        expect(result).toEqual({ status: "published", slug, notification: null });
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

    it.each(activeSales)(
      "publicado con %s: cambian categoría, fecha, nombre y precio; informa schedule_changed_at",
      (_label, status, expiresAt) =>
        inRolledBackTransaction(async (tx) => {
          const { owner, venue, eventId } = await setupEvent(tx, "published");
          await insertOrder(tx, eventId, status, expiresAt);
          const now = new Date("2026-10-06T15:00:00Z");
          const startsAt = new Date("2027-03-01T01:00:00Z");
          const ticketTypes = draftInput(venue).ticketTypes.map((type) => ({
            ...type,
            name: `${type.name} 2`,
            priceCents: type.priceCents + 100,
          }));
          const input = draftInput(venue, { category: "teatro", startsAt, ticketTypes });
          expect(await updateEvent(owner, eventId, input, db, now)).toEqual({
            status: "published",
            slug: expect.any(String),
            // Una reserva `pending` no es comprador: no se avisa (spec event-change-notifications).
            notification: status === "pending" ? null : { id: expect.any(String), kind: "schedule" },
          });

          const [teatro] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.slug, "teatro"));
          expect(await getEvent(tx, eventId)).toMatchObject({ categoryId: teatro.id, startsAt, scheduleChangedAt: now });
          expect((await getTicketTypes(tx, eventId)).map(({ name, priceCents }) => ({ name, priceCents }))).toEqual([
            { name: "General 2", priceCents: 5100 },
            { name: "Platea VIP 2", priceCents: 12100 },
          ]);
        }),
    );

    it.each(activeSales)("publicado con %s: sigue bloqueada la estructura", (_label, status, expiresAt) =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "published");
        await insertOrder(tx, eventId, status, expiresAt);
        const onlyCampo = draftInput(venue, {
          ticketTypes: [{ sectionId: venue.campoId, name: "General", priceCents: 5000, sortOrder: 0 }],
        });
        await expect(updateEvent(owner, eventId, onlyCampo)).rejects.toEqual(domainError("structure_locked"));
        const other = await createVenue(tx, owner.id);
        await expect(updateEvent(owner, eventId, draftInput(other))).rejects.toEqual(domainError("structure_locked"));
      }));

    it("schedule_changed_at: con ventas, también al cambiar solo la apertura de puertas", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupEvent(tx, "published");
        await insertOrder(tx, eventId, "paid", new Date(Date.now() - 60_000));
        const now = new Date("2026-10-06T15:00:00Z");
        await updateEvent(owner, eventId, draftInput(venue, { doorsOpenAt: new Date("2027-01-16T00:00:00Z") }), db, now);
        expect((await getEvent(tx, eventId)).scheduleChangedAt).toEqual(now);
      }));

    it("schedule_changed_at: no se informa sin cambio de fecha (aunque haya ventas) ni sin ventas activas", () =>
      inRolledBackTransaction(async (tx) => {
        const withSales = await setupEvent(tx, "published");
        await insertOrder(tx, withSales.eventId, "paid", new Date(Date.now() - 60_000));
        const ticketTypes = draftInput(withSales.venue).ticketTypes.map((type) => ({ ...type, priceCents: 7000 }));
        await updateEvent(withSales.owner, withSales.eventId, draftInput(withSales.venue, { title: "Otro", ticketTypes }));
        expect((await getEvent(tx, withSales.eventId)).scheduleChangedAt).toBeNull();

        const withoutSales = await setupEvent(tx, "published");
        await insertOrder(tx, withoutSales.eventId, "pending", new Date(Date.now() - 60_000)); // vencida: no es venta
        const startsAt = new Date("2027-03-01T01:00:00Z");
        await updateEvent(withoutSales.owner, withoutSales.eventId, draftInput(withoutSales.venue, { startsAt }));
        expect(await getEvent(tx, withoutSales.eventId)).toMatchObject({ startsAt, scheduleChangedAt: null });
      }));

    describe("notificaciones a compradores (spec event-change-notifications, Decisión 3)", () => {
      async function notificationsOf(tx: Tx, eventId: string) {
        return tx
          .select({
            id: eventNotifications.id,
            kind: eventNotifications.kind,
            changes: eventNotifications.changes,
            createdBy: eventNotifications.createdBy,
          })
          .from(eventNotifications)
          .where(eq(eventNotifications.eventId, eventId))
          .orderBy(asc(eventNotifications.createdAt));
      }

      /** Publicado con un comprador (orden `paid`). */
      async function setupWithBuyer(tx: Tx) {
        const setup = await setupEvent(tx, "published");
        await insertOrder(tx, setup.eventId, "paid", new Date(Date.now() - 60_000));
        return setup;
      }

      it("cambiar la fecha encola `schedule` en la misma transacción, con todos los cambios y su autor", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, venue, eventId } = await setupWithBuyer(tx);
          const startsAt = new Date("2027-03-01T01:00:00Z");
          const result = await updateEvent(owner, eventId, draftInput(venue, { title: "Festival 2", startsAt }));

          const notifications = await notificationsOf(tx, eventId);
          expect(notifications).toEqual([
            {
              id: expect.any(String),
              kind: "schedule",
              createdBy: owner.id,
              changes: [
                { field: "title", before: "Festival de prueba", after: "Festival 2" },
                { field: "startsAt", before: "2027-01-16T01:00:00.000Z", after: "2027-03-01T01:00:00.000Z" },
              ],
            },
          ]);
          expect(result.notification).toEqual({ id: notifications[0].id, kind: "schedule" });
        }));

      it("cambios menores se fusionan en una sola `update` (primer antes, último después) con etiquetas legibles", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, venue, eventId } = await setupWithBuyer(tx);
          const first = await updateEvent(owner, eventId, draftInput(venue, { title: "Festival 2" }));
          const [general, platea] = draftInput(venue).ticketTypes;
          const second = await updateEvent(
            owner,
            eventId,
            draftInput(venue, {
              title: "Festival 3",
              category: "teatro",
              minAge: 0,
              ticketTypes: [{ ...general, name: "Campo", priceCents: 7000 }, platea],
            }),
          );

          const names = new Map(
            (await tx.select({ slug: categories.slug, name: categories.name }).from(categories)).map((c) => [c.slug, c.name]),
          );
          const notifications = await notificationsOf(tx, eventId);
          expect(notifications).toEqual([
            {
              id: first.notification?.id,
              kind: "update",
              createdBy: owner.id,
              changes: [
                { field: "title", before: "Festival de prueba", after: "Festival 3" },
                { field: "category", before: names.get("festivales"), after: names.get("teatro") },
                { field: "minAge", before: 18, after: 0 },
                { field: "Entrada «General»: nombre", before: "General", after: "Campo" },
                { field: "Entrada «General»: precio", before: "S/ 50.00", after: "S/ 70.00" },
              ],
            },
          ]);
          expect(second.notification).toEqual({ id: first.notification?.id, kind: "update" });
        }));

      it("sin compradores (o con una reserva pending) no encola nada", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, venue, eventId } = await setupEvent(tx, "published");
          await insertOrder(tx, eventId, "pending", new Date(Date.now() + 10 * 60_000));
          const startsAt = new Date("2027-03-01T01:00:00Z");
          const result = await updateEvent(owner, eventId, draftInput(venue, { title: "Otro", startsAt }));
          expect(result.notification).toBeNull();
          expect(await notificationsOf(tx, eventId)).toEqual([]);
        }));

      it("si el guardado falla no queda notificación; si falla el encolado, el evento no se guarda", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, venue, eventId } = await setupWithBuyer(tx);
          const past = new Date("2026-01-01T01:00:00Z");
          await expect(
            updateEvent(owner, eventId, draftInput(venue, { startsAt: past, doorsOpenAt: past })),
          ).rejects.toEqual(expect.objectContaining({ code: "incomplete" }));
          expect(await notificationsOf(tx, eventId)).toEqual([]);

          vi.mocked(enqueueEventNotification).mockRejectedValueOnce(new Error("outbox caído"));
          const startsAt = new Date("2027-03-01T01:00:00Z");
          await expect(updateEvent(owner, eventId, draftInput(venue, { title: "No se guarda", startsAt }))).rejects.toThrow(
            "outbox caído",
          );
          expect(await getEvent(tx, eventId)).toMatchObject({ title: "Festival de prueba", scheduleChangedAt: null });
          expect(await notificationsOf(tx, eventId)).toEqual([]);
        }));
    });

    /** Publicado con un asiento de Campo vendido (orden paid, con su entrada) y uno de Platea reservado (pending vigente). */
    async function setupWithSoldAndHeldSeats(tx: Tx) {
      const setup = await setupEvent(tx, "published");
      const { eventId, venue } = setup;
      const typeId = async (sectionId: string) =>
        (
          await tx
            .select({ id: ticketTypes.id })
            .from(ticketTypes)
            .where(and(eq(ticketTypes.eventId, eventId), eq(ticketTypes.sectionId, sectionId)))
        )[0].id;
      const [soldSeat, heldSeat] = await tx
        .insert(eventSeats)
        .values([
          { eventId, ticketTypeId: await typeId(venue.campoId) },
          { eventId, ticketTypeId: await typeId(venue.plateaId) },
        ])
        .returning({ id: eventSeats.id });
      const order = (status: "paid" | "pending") => ({
        code: `TK-TEST-${randomUUID().slice(0, 8)}`,
        eventId,
        status,
        expiresAt: new Date(Date.now() + 10 * 60_000),
        buyerName: "Comprador de prueba",
        buyerEmail: "comprador.prueba@example.com",
        buyerPhone: "+51900000000",
        buyerDocumentType: "dni" as const,
        buyerDocumentNumber: "00000000",
        ticketCount: 1,
        subtotalCents: 5000,
        platformFeeCents: 500,
        organizerAmountCents: 4500,
      });
      const [paid, pending] = await tx
        .insert(orders)
        .values([order("paid"), order("pending")])
        .returning({ id: orders.id });
      await tx.update(eventSeats).set({ status: "sold", orderId: paid.id }).where(eq(eventSeats.id, soldSeat.id));
      await tx
        .update(eventSeats)
        .set({ status: "held", orderId: pending.id, heldUntil: new Date(Date.now() + 10 * 60_000) })
        .where(eq(eventSeats.id, heldSeat.id));
      await tx.insert(tickets).values({
        orderId: paid.id,
        eventSeatId: soldSeat.id,
        code: `TK-TEST-${randomUUID().slice(0, 8)}-01`,
        holderName: "Comprador de prueba",
        unitPriceCents: 5000,
        qrToken: randomUUID(),
      });
      return { ...setup, paidOrderId: paid.id, pendingOrderId: pending.id };
    }

    it("un precio nuevo no toca las órdenes, las entradas pagadas ni las reservas pending vigentes", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId, paidOrderId } = await setupWithSoldAndHeldSeats(tx);
        const snapshot = async () => ({
          orders: await tx
            .select({ id: orders.id, status: orders.status, subtotalCents: orders.subtotalCents, expiresAt: orders.expiresAt })
            .from(orders)
            .where(eq(orders.eventId, eventId))
            .orderBy(orders.id),
          tickets: await tx
            .select({ unitPriceCents: tickets.unitPriceCents })
            .from(tickets)
            .where(eq(tickets.orderId, paidOrderId)),
          seats: await tx
            .select({ id: eventSeats.id, status: eventSeats.status, orderId: eventSeats.orderId, heldUntil: eventSeats.heldUntil })
            .from(eventSeats)
            .where(eq(eventSeats.eventId, eventId))
            .orderBy(eventSeats.id),
        });
        const before = await snapshot();

        // Solo cambia Campo (con una entrada pagada); Platea, con una reserva en curso, conserva su precio.
        const newPrices = draftInput(venue).ticketTypes.map((type) =>
          type.sectionId === venue.campoId ? { ...type, priceCents: 9900 } : type,
        );
        await updateEvent(owner, eventId, draftInput(venue, { ticketTypes: newPrices }));

        expect(await snapshot()).toEqual(before);
        expect(before.tickets).toEqual([{ unitPriceCents: 5000 }]);
        expect(before.orders.map((row) => row.subtotalCents)).toEqual([5000, 5000]);
        // Las ventas nuevas leen el precio de `ticket_types`.
        expect((await getTicketTypes(tx, eventId)).map((type) => type.priceCents)).toEqual([9900, 12000]);
      }));

    it("precio de un tipo con una reserva pending vigente: price_locked_pending y no guarda nada; el nombre sí cambia", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupWithSoldAndHeldSeats(tx);
        const plateaPrice = draftInput(venue).ticketTypes.map((type) =>
          type.sectionId === venue.plateaId ? { ...type, priceCents: 13000 } : type,
        );
        await expect(
          updateEvent(owner, eventId, draftInput(venue, { title: "No se guarda", ticketTypes: plateaPrice })),
        ).rejects.toEqual(domainError("price_locked_pending"));
        expect((await getEvent(tx, eventId)).title).toBe("Festival de prueba");
        expect((await getTicketTypes(tx, eventId)).map((type) => type.priceCents)).toEqual([5000, 12000]);

        const plateaName = draftInput(venue).ticketTypes.map((type) =>
          type.sectionId === venue.plateaId ? { ...type, name: "Platea Preferencial" } : type,
        );
        await updateEvent(owner, eventId, draftInput(venue, { ticketTypes: plateaName }));
        expect((await getTicketTypes(tx, eventId)).map(({ name, priceCents }) => ({ name, priceCents }))).toEqual([
          { name: "General", priceCents: 5000 },
          { name: "Platea Preferencial", priceCents: 12000 },
        ]);
      }));

    it("precio de un tipo cuya reserva pending ya venció: se guarda", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId, pendingOrderId } = await setupWithSoldAndHeldSeats(tx);
        await tx.update(orders).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(orders.id, pendingOrderId));
        const plateaPrice = draftInput(venue).ticketTypes.map((type) =>
          type.sectionId === venue.plateaId ? { ...type, priceCents: 13000 } : type,
        );
        await updateEvent(owner, eventId, draftInput(venue, { ticketTypes: plateaPrice }));
        expect((await getTicketTypes(tx, eventId)).map((type) => type.priceCents)).toEqual([5000, 13000]);
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

    it("una orden pending vencida o reembolsada no es venta activa: el precio cambia igual", () =>
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

  describe("recinto ingresado a mano (spec organizer-manual-venue)", () => {
    /** Organizador con un borrador cuyo recinto ingresó a mano; `status` lo pasa a ese estado. */
    async function setupManual(tx: Tx, status?: "pending_review" | "published") {
      const owner = await createUser(tx, "approved");
      const venue = manualVenueInput();
      const { id: eventId } = await createEvent(owner, manualDraftInput(venue));
      if (status) await tx.update(events).set({ status }).where(eq(events.id, eventId));
      const { venueId } = await getEvent(tx, eventId);
      return { owner, venue, eventId, venueId: venueId! };
    }

    /** Recintos pendientes de un organizador. */
    async function countPendingVenues(tx: Tx, organizerId: string) {
      const [{ total }] = await tx
        .select({ total: count() })
        .from(venues)
        .where(and(eq(venues.organizerId, organizerId), eq(venues.status, "pending_review")));
      return total;
    }

    it("crea el evento y un recinto pending_review del organizador con sus zonas generales y tipos de entrada", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId, venueId } = await setupManual(tx);

        expect(await getEvent(tx, eventId)).toMatchObject({
          status: "draft",
          venueId,
          searchText: "festival de prueba cafe la esquina lima",
        });
        const saved = await getVenueWithZones(tx, venueId);
        expect(saved).toEqual({
          name: "Café La Esquina",
          address: "Av. Larco 1150, Miraflores",
          city: "Lima",
          status: "pending_review",
          organizerId: owner.id,
          createdBy: owner.id,
          zones: [
            { id: expect.any(String), slug: "general", name: "General", sortOrder: 0, seating: "general", capacity: 200 },
            { id: expect.any(String), slug: "vip", name: "VIP", sortOrder: 1, seating: "general", capacity: 50 },
          ],
        });
        const [general, vip] = saved.zones;
        expect((await getTicketTypes(tx, eventId)).map(({ sectionId, slug }) => ({ sectionId, slug }))).toEqual([
          { sectionId: general.id, slug: "general" },
          { sectionId: vip.id, slug: "vip" },
        ]);
      }));

    it("un admin lo crea a nombre del organizador elegido: el recinto es del organizador y lo creó el admin", () =>
      inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, undefined, { role: "admin" });
        const owner = await createUser(tx, "approved");
        const { id } = await createEvent(admin, manualDraftInput(undefined, { organizerId: owner.id }));
        const { venueId } = await getEvent(tx, id);
        expect(await getVenueWithZones(tx, venueId!)).toMatchObject({ organizerId: owner.id, createdBy: admin.id });
      }));

    it("zonas cuyos nombres dan el mismo slug (o ninguno) reciben slugs únicos", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const sections = ["VIP", "Vip!", "¡¡¡"].map((name) => ({ id: randomUUID(), name, capacity: 10 }));
        const { id } = await createEvent(owner, manualDraftInput(manualVenueInput({ sections })));
        const { venueId } = await getEvent(tx, id);
        expect((await getVenueWithZones(tx, venueId!)).zones.map((zone) => zone.slug)).toEqual(["vip", "vip-2", "zona"]);
      }));

    it("si algo falla no queda ni el evento ni el recinto", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const other = await createVenue(tx, owner.id);
        const input = manualDraftInput(undefined, {
          ticketTypes: [{ sectionId: other.campoId, name: "General", priceCents: 5000, sortOrder: 0 }],
        });
        await expect(createEvent(owner, input)).rejects.toEqual(domainError("section_not_in_venue"));
        expect(await countPendingVenues(tx, owner.id)).toBe(0);

        const pending = await createUser(tx, "pending");
        await expect(createEvent(pending, manualDraftInput())).rejects.toBeInstanceOf(OrganizerNotApprovedError);
        expect(await countPendingVenues(tx, pending.id)).toBe(0);
      }));

    it.each(["draft", "pending_review"] as const)(
      "en %s corrige el mismo recinto y reemplaza sus zonas (los tipos de entrada siguen a las zonas)",
      (status) =>
        inRolledBackTransaction(async (tx) => {
          const { owner, venue, eventId, venueId } = await setupManual(tx, status === "draft" ? undefined : status);
          const [general] = venue.sections;
          const terraza = { id: randomUUID(), name: "Terraza", capacity: 30 };
          const corrected = manualVenueInput({
            name: "Café La Esquina 2",
            address: "Av. Larco 1160, Miraflores",
            city: "Arequipa",
            sections: [{ ...general, capacity: 120 }, terraza],
          });
          expect(await updateEvent(owner, eventId, manualDraftInput(corrected))).toMatchObject({ status });

          expect(await getEvent(tx, eventId)).toMatchObject({ venueId, status });
          expect(await getVenueWithZones(tx, venueId)).toMatchObject({
            name: "Café La Esquina 2",
            address: "Av. Larco 1160, Miraflores",
            city: "Arequipa",
            status: "pending_review",
            zones: [
              { id: general.id, slug: "general", capacity: 120 },
              { id: terraza.id, slug: "terraza", capacity: 30 },
            ],
          });
          expect((await getTicketTypes(tx, eventId)).map((type) => type.sectionId)).toEqual([general.id, terraza.id]);
          expect(await countPendingVenues(tx, owner.id)).toBe(1);
        }),
    );

    describe("dos eventos del organizador comparten el recinto pendiente (Decisiones 3 y 7)", () => {
      /**
       * Evento A con el recinto a mano y evento B que lo elige de la lista; B vende en `bZones` (por nombre; por defecto,
       * todas). `form` es lo que reenvía el formulario de cualquiera de los dos (bloque manual con las zonas guardadas).
       */
      async function setupShared(tx: Tx, bZones?: string[]) {
        const { owner, eventId, venueId } = await setupManual(tx);
        const { zones } = await getVenueWithZones(tx, venueId);
        const form = manualVenueInput({ sections: zones.map(({ id, name, capacity }) => ({ id, name, capacity: capacity ?? 0 })) });
        const sold = form.sections.filter((zone) => !bZones || bZones.includes(zone.name));
        const { id: otherId } = await createEvent(
          owner,
          manualDraftInput({ ...form, sections: sold }, { venue: { kind: "existing", id: venueId }, title: "Segundo" }),
        );
        return { owner, eventId, otherId, venueId, form };
      }

      it("editar el título de cualquiera de los dos guarda y no cambia las zonas", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, eventId, otherId, venueId, form } = await setupShared(tx);
          const before = await getVenueWithZones(tx, venueId);
          await updateEvent(owner, eventId, manualDraftInput(form, { title: "Primero renombrado" }));
          await updateEvent(owner, otherId, manualDraftInput(form, { title: "Segundo renombrado" }));
          expect((await getEvent(tx, eventId)).title).toBe("Primero renombrado");
          expect((await getEvent(tx, otherId)).title).toBe("Segundo renombrado");
          expect(await getVenueWithZones(tx, venueId)).toEqual(before);
          expect((await getEvent(tx, otherId)).venueId).toBe(venueId);
        }));

      it("renombrar zonas (también intercambiar sus nombres) las cambia en su sitio para los dos eventos", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, eventId, otherId, venueId, form } = await setupShared(tx);
          const [general, vip] = form.sections;
          const renamed = { ...form, sections: [{ ...general, name: "Palco" }, vip] };
          await updateEvent(owner, eventId, manualDraftInput(renamed));
          expect((await getVenueWithZones(tx, venueId)).zones).toMatchObject([
            { id: general.id, name: "Palco", slug: "palco" },
            { id: vip.id, name: "VIP", slug: "vip" },
          ]);

          const swapped = { ...form, sections: [{ ...general, name: "VIP" }, { ...vip, name: "Palco" }] };
          await updateEvent(owner, otherId, manualDraftInput(swapped, { title: "Segundo" }));
          expect((await getVenueWithZones(tx, venueId)).zones).toMatchObject([
            { id: general.id, name: "VIP", slug: "vip" },
            { id: vip.id, name: "Palco", slug: "palco" },
          ]);
          // Los tipos de entrada del otro evento siguen en las mismas zonas.
          expect((await getTicketTypes(tx, eventId)).map((type) => type.sectionId)).toEqual([general.id, vip.id]);
        }));

      it("añadir una zona la crea sin tocar las demás", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, eventId, otherId, venueId, form } = await setupShared(tx);
          const terraza = { id: randomUUID(), name: "Terraza", capacity: 30 };
          await updateEvent(owner, eventId, manualDraftInput({ ...form, sections: [...form.sections, terraza] }));
          expect((await getVenueWithZones(tx, venueId)).zones).toMatchObject([
            { id: form.sections[0].id, slug: "general" },
            { id: form.sections[1].id, slug: "vip" },
            { id: terraza.id, slug: "terraza", capacity: 30, sortOrder: 2 },
          ]);
          expect(await getTicketTypes(tx, otherId)).toHaveLength(2);
        }));

      it("quitar una zona que usa el otro evento da venue_section_in_use y no guarda nada", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, eventId, venueId, form } = await setupShared(tx);
          const before = await getVenueWithZones(tx, venueId);
          const withoutVip = { ...form, name: "Otro nombre", sections: [form.sections[0]] };
          await expect(
            updateEvent(owner, eventId, manualDraftInput(withoutVip, { title: "No se guarda" })),
          ).rejects.toEqual(domainError("venue_section_in_use"));
          expect(await getVenueWithZones(tx, venueId)).toEqual(before);
          expect((await getEvent(tx, eventId)).title).toBe("Festival de prueba");
          expect(await getTicketTypes(tx, eventId)).toHaveLength(2);
        }));

      it("quitar una zona que no usa ningún otro evento la borra", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, eventId, otherId, venueId, form } = await setupShared(tx, ["General"]);
          await updateEvent(owner, eventId, manualDraftInput({ ...form, sections: [form.sections[0]] }));
          expect((await getVenueWithZones(tx, venueId)).zones).toMatchObject([{ id: form.sections[0].id, slug: "general" }]);
          expect((await getTicketTypes(tx, otherId)).map((type) => type.sectionId)).toEqual([form.sections[0].id]);
        }));
    });

    it("con un recinto aprobado, pasar a uno a mano crea otro pendiente y no toca el aprobado", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupDraft(tx);
        await updateEvent(owner, eventId, manualDraftInput());
        const { venueId } = await getEvent(tx, eventId);
        expect(venueId).not.toBe(venue.id);
        expect(await getVenueWithZones(tx, venueId!)).toMatchObject({ status: "pending_review", organizerId: owner.id });
        expect(await getVenueWithZones(tx, venue.id)).toMatchObject({ name: venue.name, status: "approved" });
      }));

    it.each(["draft", "pending_review"] as const)(
      "en %s, si el admin cambia el organizador, el recinto pendiente ajeno no se edita: se crea otro del nuevo con zonas nuevas",
      (status) =>
        inRolledBackTransaction(async (tx) => {
          const { owner, eventId, venueId } = await setupManual(tx, status === "draft" ? undefined : status);
          const before = await getVenueWithZones(tx, venueId);
          const newOwner = await createUser(tx, "approved");
          const admin = await createUser(tx, undefined, { role: "admin" });
          // El formulario reenvía las zonas que cargó, con los ids del recinto anterior.
          const renamed = manualVenueInput({
            name: "Otro nombre",
            sections: before.zones.map(({ id, name, capacity }) => ({ id, name, capacity: capacity ?? 0 })),
          });
          expect(
            await updateEvent(admin, eventId, manualDraftInput(renamed, { organizerId: newOwner.id })),
          ).toMatchObject({ status });

          const event = await getEvent(tx, eventId);
          expect(event).toMatchObject({ organizerId: newOwner.id, status });
          expect(event.venueId).not.toBe(venueId);
          const created = await getVenueWithZones(tx, event.venueId!);
          expect(created).toMatchObject({ name: "Otro nombre", status: "pending_review", organizerId: newOwner.id });
          expect(created.zones.map(({ slug, capacity }) => ({ slug, capacity }))).toEqual(
            before.zones.map(({ slug, capacity }) => ({ slug, capacity })),
          );
          const oldIds = before.zones.map((zone) => zone.id);
          expect(created.zones.every((zone) => !oldIds.includes(zone.id))).toBe(true);
          expect((await getTicketTypes(tx, eventId)).map((type) => type.sectionId)).toEqual(
            created.zones.map((zone) => zone.id),
          );
          expect(await getVenueWithZones(tx, venueId)).toEqual(before);
          expect(await countPendingVenues(tx, owner.id)).toBe(1);
        }),
    );

    it("publicado (recinto ya aprobado): uno a mano da structure_locked y el recinto no cambia", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId, venueId } = await setupManual(tx, "published");
        await tx.update(venues).set({ status: "approved" }).where(eq(venues.id, venueId));
        await expect(updateEvent(owner, eventId, manualDraftInput(manualVenueInput({ name: "Cambio" })))).rejects.toEqual(
          domainError("structure_locked"),
        );
        expect(await getVenueWithZones(tx, venueId)).toMatchObject({ name: "Café La Esquina", status: "approved" });
        // De la lista, el mismo recinto y las mismas zonas (las guardadas): se guarda.
        const { zones } = await getVenueWithZones(tx, venueId);
        const saved = manualVenueInput({ sections: zones.map(({ id, name, capacity }) => ({ id, name, capacity: capacity ?? 0 })) });
        const sameStructure = manualDraftInput(saved, { venue: { kind: "existing", id: venueId }, title: "Nuevo título" });
        expect(await updateEvent(owner, eventId, sameStructure)).toMatchObject({ status: "published" });
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
          sold: 0,
        };
        expect(await getEventForEdit(owner, eventId)).toEqual(expected);
        expect(await getEventForEdit(ADMIN, eventId)).toEqual(expected);
        expect(await getEventForEdit(await createUser(tx, "approved"), eventId)).toBeNull();
      }));

    it("incluye la nota del último rechazo, si tiene ventas vigentes y las entradas vendidas (solo paid)", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx);
        await tx.update(events).set({ reviewNote: "Falta la portada" }).where(eq(events.id, eventId));
        await insertOrder(tx, eventId, "pending", new Date(Date.now() + 10 * 60_000));
        expect(await getEventForEdit(owner, eventId)).toMatchObject({
          reviewNote: "Falta la portada",
          hasSales: true,
          sold: 0,
        });
        await insertOrder(tx, eventId, "paid", new Date(Date.now() - 60_000));
        await insertOrder(tx, eventId, "paid", new Date(Date.now() - 60_000));
        await insertOrder(tx, eventId, "refunded", new Date(Date.now() - 60_000));
        expect(await getEventForEdit(owner, eventId)).toMatchObject({ sold: 2 });
      }));

    it("un id que no es uuid o un cliente dan null", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupDraft(tx);
        expect(await getEventForEdit(ADMIN, "no-es-un-uuid")).toBeNull();
        expect(await getEventForEdit({ id: randomUUID(), role: "customer" }, eventId)).toBeNull();
      }));
  });

  describe("migración 0010 (spec event-editing, Decisión 2)", () => {
    it("events.schedule_changed_at existe, es timestamptz y admite NULL", async () => {
      const { rows } = await db.execute<{ data_type: string; is_nullable: string }>(
        sql`select data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'events' and column_name = 'schedule_changed_at'`,
      );
      expect(rows).toEqual([{ data_type: "timestamp with time zone", is_nullable: "YES" }]);
    });
  });

  describe("lecturas del formulario", () => {
    it("listApprovedVenuesWithSections: aprobados con su dirección, secciones en orden y su capacidad", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const venue = await createVenue(tx, owner.id);

        const list = await listApprovedVenuesWithSections(owner);
        expect(list.find((candidate) => candidate.id === venue.id)).toEqual({
          id: venue.id,
          name: venue.name,
          address: "Av. Prueba 123",
          city: "Lima",
          lat: null,
          lng: null,
          placeId: null,
          status: "approved",
          organizerId: null,
          sections: [
            { id: venue.campoId, name: "Campo", seating: "general", capacity: 300 },
            { id: venue.plateaId, name: "Platea", seating: "numbered", capacity: 6 },
          ],
        });
      }));

    it("listApprovedVenuesWithSections: un pendiente solo lo ven su organizador y los admins", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const other = await createUser(tx, "approved");
        const pending = await createVenue(tx, owner.id, "pending_review");
        const ids = async (viewer: Actor) => (await listApprovedVenuesWithSections(viewer)).map((venue) => venue.id);

        expect((await listApprovedVenuesWithSections(owner)).find((venue) => venue.id === pending.id)).toMatchObject({
          status: "pending_review",
          organizerId: owner.id,
        });
        expect(await ids(other)).not.toContain(pending.id);
        expect(await ids(ADMIN)).toContain(pending.id);
        expect(await ids(SUPER_ADMIN)).toContain(pending.id);
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
