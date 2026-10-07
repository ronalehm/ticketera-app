// @vitest-environment node
import { randomUUID } from "node:crypto";
import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { eventNotifications } from "@/lib/db/schema/notifications";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { describeWithDb } from "@/lib/db/testDb";
import { TEST_EVENT_SLUG_PREFIX } from "@/lib/db/testFixtures";
import { db, inRolledBackTransaction, type Tx } from "@/lib/db/testTransaction";
import { OrganizerNotApprovedError } from "@/modules/auth/server";
import { getEventBySlug } from "@/modules/events/catalog";
import { enqueueEventNotification } from "@/modules/notifications/server";
import type { EventDraftInput } from "../types/organizer.types";
import { createEvent, updateEvent } from "./eventDrafts.service";
import { approveEvent, cancelEvent, rejectEvent, submitForReview } from "./eventModeration.service";
import {
  createUser,
  createVenue,
  domainError,
  draftInput,
  getVenueWithZones,
  insertOrder,
  manualDraftInput,
  manualVenueInput,
  setupDraft,
} from "./eventTestHelpers";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));
// El outbox real, espiado para comprobar que la cancelación encola `cancelled`.
vi.mock("@/modules/notifications/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/notifications/server")>();
  return { ...actual, enqueueEventNotification: vi.fn(actual.enqueueEventNotification) };
});

/** Lugares del recinto de prueba (`createVenue`): Campo general de 300 y Platea numerada de 2 × 3. */
const GENERAL_SEATS = 300;
const NUMBERED_SEATS = 6;

/** Admin real (`reviewed_by` es una FK a `users`). */
const createAdmin = (tx: Tx) => createUser(tx, undefined, { role: "admin" });

async function setStatus(tx: Tx, eventId: string, status: "pending_review" | "published" | "cancelled") {
  await tx.update(events).set({ status }).where(eq(events.id, eventId));
}

/** Borrador completo enviado a revisión. */
async function setupPending(tx: Tx, overrides: Partial<EventDraftInput> = {}) {
  const setup = await setupDraft(tx, overrides);
  await setStatus(tx, setup.eventId, "pending_review");
  return setup;
}

async function getEvent(tx: Tx, id: string) {
  const [event] = await tx.select().from(events).where(eq(events.id, id));
  return event;
}

/** Lugares del inventario activo del evento: total, generales (sin butaca) y numerados. */
async function countSeats(database: Pick<Tx, "select">, eventId: string) {
  const [row] = await database
    .select({
      total: count(),
      general: sql<number>`count(*) filter (where ${eventSeats.venueSeatId} is null)`.mapWith(Number),
      numbered: sql<number>`count(*) filter (where ${eventSeats.venueSeatId} is not null)`.mapWith(Number),
    })
    .from(eventSeats)
    .where(and(eq(eventSeats.eventId, eventId), isNull(eventSeats.retiredAt)));
  return row;
}

describeWithDb("eventModeration.service", () => {
  describe("submitForReview", () => {
    it("el dueño envía su borrador completo a revisión; repetirlo no hace nada", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx);
        await submitForReview(owner, eventId);
        expect((await getEvent(tx, eventId)).status).toBe("pending_review");
        await submitForReview(owner, eventId);
        expect((await getEvent(tx, eventId)).status).toBe("pending_review");
      }));

    it("un admin envía a revisión el borrador de cualquier organizador", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupDraft(tx);
        await submitForReview(await createAdmin(tx), eventId);
        expect((await getEvent(tx, eventId)).status).toBe("pending_review");
      }));

    it("con datos incompletos falla y dice qué falta", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx, {
          description: null,
          imageUrl: null,
          doorsOpenAt: null,
          ticketTypes: [],
        });
        await expect(submitForReview(owner, eventId)).rejects.toEqual(
          expect.objectContaining({ code: "incomplete", issues: ["description", "image", "doorsOpenAt", "ticketTypes"] }),
        );
        expect((await getEvent(tx, eventId)).status).toBe("draft");
      }));

    it("un tipo de entrada de una sección numerada sin butacas no tiene lugares: falla y lo dice", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupDraft(tx);
        await tx.delete(venueSeats).where(eq(venueSeats.sectionId, venue.plateaId));
        await expect(submitForReview(owner, eventId)).rejects.toEqual(
          expect.objectContaining({ code: "incomplete", issues: ["emptyTicketTypes"] }),
        );
        expect((await getEvent(tx, eventId)).status).toBe("draft");
      }));

    it("con la fecha de inicio pasada falla", () =>
      inRolledBackTransaction(async (tx) => {
        const past = new Date("2026-01-01T01:00:00Z");
        const { owner, eventId } = await setupDraft(tx, { startsAt: past, doorsOpenAt: past });
        await expect(submitForReview(owner, eventId)).rejects.toEqual(
          expect.objectContaining({ code: "incomplete", issues: ["startsAtPast"] }),
        );
      }));

    it("otro organizador no lo ve; uno pendiente no puede mutar", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupDraft(tx);
        await expect(submitForReview(await createUser(tx, "approved"), eventId)).rejects.toEqual(domainError("not_found"));

        const { owner, eventId: ownEvent } = await setupDraft(tx);
        await tx.update(organizers).set({ status: "pending" }).where(eq(organizers.userId, owner.id));
        await expect(submitForReview(owner, ownEvent)).rejects.toBeInstanceOf(OrganizerNotApprovedError);
      }));

    it.each(["published", "cancelled"] as const)("un evento %s no se envía a revisión", (status) =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx);
        await setStatus(tx, eventId, status);
        await expect(submitForReview(owner, eventId)).rejects.toEqual(domainError("submit_not_draft"));
      }));
  });

  describe("approveEvent", () => {
    it("publica, genera todo el inventario (numerado y general) y registra quién lo revisó", () =>
      inRolledBackTransaction(async (tx) => {
        const admin = await createAdmin(tx);
        const { eventId, venue } = await setupPending(tx);
        await tx.update(events).set({ reviewNote: "Nota anterior" }).where(eq(events.id, eventId));

        const { slug } = await getEvent(tx, eventId);
        // El slug, para que la acción invalide sus páginas públicas.
        expect(await approveEvent(admin, eventId)).toEqual({ status: "published", slug });

        const event = await getEvent(tx, eventId);
        expect(event).toMatchObject({ status: "published", reviewedBy: admin.id, reviewNote: null });
        expect(event.reviewedAt).toBeInstanceOf(Date);
        expect(await countSeats(tx, eventId)).toEqual({
          total: GENERAL_SEATS + NUMBERED_SEATS,
          general: GENERAL_SEATS,
          numbered: NUMBERED_SEATS,
        });
        // Cada lugar va enlazado al tipo de entrada de su sección, como espera el checkout.
        const numbered = await tx
          .select({ sectionId: venueSeats.sectionId, ticketSectionId: ticketTypes.sectionId, status: eventSeats.status })
          .from(eventSeats)
          .innerJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
          .innerJoin(ticketTypes, eq(ticketTypes.id, eventSeats.ticketTypeId))
          .where(eq(eventSeats.eventId, eventId));
        expect(numbered).toHaveLength(NUMBERED_SEATS);
        for (const seat of numbered) {
          expect(seat).toEqual({ sectionId: venue.plateaId, ticketSectionId: venue.plateaId, status: "available" });
        }
      }));

    it("tras aprobar, el catálogo lo muestra con todos sus lugares disponibles para comprar", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupPending(tx);
        await approveEvent(await createAdmin(tx), eventId);

        const detail = await getEventBySlug((await getEvent(tx, eventId)).slug);
        expect(detail?.status).toBe("available");
        expect(detail?.ticketTypes.map((type) => [type.name, type.status])).toEqual([
          ["General", "available"],
          ["Platea VIP", "available"],
        ]);
      }));

    it("un organizador no aprueba", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupPending(tx);
        await expect(approveEvent(owner, eventId)).rejects.toEqual(domainError("not_moderator"));
        expect((await getEvent(tx, eventId)).status).toBe("pending_review");
      }));

    it("si no está en revisión no hace nada y devuelve su estado", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupDraft(tx);
        const { slug } = await getEvent(tx, eventId);
        expect(await approveEvent(await createAdmin(tx), eventId)).toEqual({ status: "draft", slug });
        expect(await countSeats(tx, eventId)).toMatchObject({ total: 0 });
      }));

    it("revalida los requisitos para publicar: con la fecha pasada falla sin generar nada", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupPending(tx);
        const past = new Date("2026-01-01T01:00:00Z");
        await tx.update(events).set({ startsAt: past, doorsOpenAt: past }).where(eq(events.id, eventId));
        await expect(approveEvent(await createAdmin(tx), eventId)).rejects.toEqual(
          expect.objectContaining({ code: "incomplete", issues: ["startsAtPast"] }),
        );
        expect((await getEvent(tx, eventId)).status).toBe("pending_review");
        expect(await countSeats(tx, eventId)).toMatchObject({ total: 0 });
      }));

    it.each([
      ["el organizador ya no está aprobado", "owner_not_approved"],
      ["el recinto es un pendiente de otro organizador", "event_venue_not_approved"],
    ] as const)("si %s falla con un mensaje claro y no publica ni genera nada", (_label, code) =>
      inRolledBackTransaction(async (tx) => {
        const { owner, venue, eventId } = await setupPending(tx);
        if (code === "owner_not_approved") {
          await tx.update(organizers).set({ status: "suspended" }).where(eq(organizers.userId, owner.id));
        } else {
          const stranger = await createUser(tx, "approved");
          await tx
            .update(venues)
            .set({ status: "pending_review", organizerId: stranger.id })
            .where(eq(venues.id, venue.id));
        }
        await expect(approveEvent(await createAdmin(tx), eventId)).rejects.toEqual(domainError(code));
        expect((await getEvent(tx, eventId)).status).toBe("pending_review");
        expect(await countSeats(tx, eventId)).toMatchObject({ total: 0 });
      }));

    describe("recinto ingresado a mano (spec organizer-manual-venue, Decisión 6)", () => {
      /** Evento en revisión con un recinto a mano (General 200, VIP 50), corregido en borrador a General 120. */
      async function setupManualPending(tx: Tx) {
        const owner = await createUser(tx, "approved");
        const venue = manualVenueInput();
        const { id: eventId } = await createEvent(owner, manualDraftInput(venue));
        const corrected = { ...venue, sections: [{ ...venue.sections[0], capacity: 120 }, venue.sections[1]] };
        await updateEvent(owner, eventId, manualDraftInput(corrected));
        await setStatus(tx, eventId, "pending_review");
        const { venueId } = await getEvent(tx, eventId);
        return { owner, venue: corrected, eventId, venueId: venueId! };
      }

      it("aprobar el evento aprueba su recinto pendiente y genera el inventario con las zonas vigentes", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, eventId, venueId } = await setupManualPending(tx);
          expect(await approveEvent(await createAdmin(tx), eventId)).toMatchObject({ status: "published" });
          expect((await getEvent(tx, eventId)).status).toBe("published");
          expect(await getVenueWithZones(tx, venueId)).toMatchObject({ status: "approved", organizerId: owner.id });
          expect(await countSeats(tx, eventId)).toEqual({ total: 170, general: 170, numbered: 0 });
        }));

      it("si la aprobación falla, el recinto sigue pendiente", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, eventId, venueId } = await setupManualPending(tx);
          await tx.update(organizers).set({ status: "suspended" }).where(eq(organizers.userId, owner.id));
          await expect(approveEvent(await createAdmin(tx), eventId)).rejects.toEqual(domainError("owner_not_approved"));
          expect(await getVenueWithZones(tx, venueId)).toMatchObject({ status: "pending_review" });
        }));

      it("rechazar no toca el recinto: sigue pendiente y el organizador lo corrige", () =>
        inRolledBackTransaction(async (tx) => {
          const { owner, venue, eventId, venueId } = await setupManualPending(tx);
          await rejectEvent(await createAdmin(tx), eventId, "La dirección no ubica el local");
          expect(await getVenueWithZones(tx, venueId)).toMatchObject({ status: "pending_review" });

          await updateEvent(owner, eventId, manualDraftInput({ ...venue, address: "Calle Berlín 245, Miraflores" }));
          expect(await getEvent(tx, eventId)).toMatchObject({ status: "draft", venueId });
          expect(await getVenueWithZones(tx, venueId)).toMatchObject({
            address: "Calle Berlín 245, Miraflores",
            status: "pending_review",
          });
        }));
    });

    it("con inventario activo previo falla y no genera más", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupPending(tx);
        const [{ id: ticketTypeId }] = await tx
          .select({ id: ticketTypes.id })
          .from(ticketTypes)
          .where(eq(ticketTypes.eventId, eventId));
        await tx.insert(eventSeats).values({ eventId, ticketTypeId });
        await expect(approveEvent(await createAdmin(tx), eventId)).rejects.toEqual(domainError("inventory_exists"));
        expect(await countSeats(tx, eventId)).toMatchObject({ total: 1 });
        expect((await getEvent(tx, eventId)).status).toBe("pending_review");
      }));

    it("dos aprobaciones concurrentes dejan el mismo inventario, incluidos los generales", async () => {
      // Datos confirmados: cada aprobación va en su propia conexión y la segunda espera el lock de la primera.
      const setup = await db.transaction(async (tx) => {
        const admin = await createAdmin(tx);
        const owner = await createUser(tx, "approved");
        const venue = await createVenue(tx, owner.id);
        // Con el prefijo de los eventos de prueba: mientras está publicado, los tests del catálogo lo ignoran.
        const title = `Test checkout aprobación ${randomUUID().slice(0, 8)}`;
        const { id: eventId } = await createEvent(owner, draftInput(venue, { title }), tx as unknown as typeof db);
        await setStatus(tx, eventId, "pending_review");
        return { admin, owner, venue, eventId };
      });
      try {
        const results = await Promise.all([
          approveEvent(setup.admin, setup.eventId),
          approveEvent(setup.admin, setup.eventId),
        ]);
        const { slug } = await getEvent(db as unknown as Tx, setup.eventId);
        expect(slug.startsWith(TEST_EVENT_SLUG_PREFIX)).toBe(true);
        expect(results).toEqual([
          { status: "published", slug },
          { status: "published", slug },
        ]);
        expect(await countSeats(db, setup.eventId)).toEqual({
          total: GENERAL_SEATS + NUMBERED_SEATS,
          general: GENERAL_SEATS,
          numbered: NUMBERED_SEATS,
        });
      } finally {
        await db.transaction(async (tx) => {
          await tx.delete(eventSeats).where(eq(eventSeats.eventId, setup.eventId));
          await tx.delete(ticketTypes).where(eq(ticketTypes.eventId, setup.eventId));
          await tx.delete(events).where(eq(events.id, setup.eventId));
          const sectionIds = tx
            .select({ id: venueSections.id })
            .from(venueSections)
            .where(eq(venueSections.venueId, setup.venue.id));
          await tx.delete(venueSeats).where(inArray(venueSeats.sectionId, sectionIds));
          await tx.delete(venueSections).where(eq(venueSections.venueId, setup.venue.id));
          await tx.delete(venues).where(eq(venues.id, setup.venue.id));
          await tx.delete(organizers).where(eq(organizers.userId, setup.owner.id));
          await tx.delete(users).where(inArray(users.id, [setup.owner.id, setup.admin.id]));
        });
      }
    });
  });

  describe("rejectEvent", () => {
    it("vuelve a borrador con la nota (sin espacios sobrantes) y quién lo revisó", () =>
      inRolledBackTransaction(async (tx) => {
        const admin = await createAdmin(tx);
        const { owner, eventId } = await setupPending(tx);
        await rejectEvent(admin, eventId, "  Falta el aforo real.  ");
        expect(await getEvent(tx, eventId)).toMatchObject({
          status: "draft",
          reviewNote: "Falta el aforo real.",
          reviewedBy: admin.id,
        });
        // El organizador lo corrige y lo vuelve a enviar.
        await submitForReview(owner, eventId);
        expect((await getEvent(tx, eventId)).status).toBe("pending_review");
      }));

    it("sin nota falla", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupPending(tx);
        await expect(rejectEvent(await createAdmin(tx), eventId, "   ")).rejects.toEqual(domainError("review_note_required"));
      }));

    it("un organizador no rechaza; un evento que no está en revisión tampoco", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupPending(tx);
        await expect(rejectEvent(owner, eventId, "No")).rejects.toEqual(domainError("not_moderator"));
        await setStatus(tx, eventId, "published");
        await expect(rejectEvent(await createAdmin(tx), eventId, "No")).rejects.toEqual(domainError("not_pending_review"));
      }));
  });

  describe("cancelEvent", () => {
    it("cancela un publicado sin ventas; cancelled es terminal", () =>
      inRolledBackTransaction(async (tx) => {
        const admin = await createAdmin(tx);
        const { owner, venue, eventId } = await setupPending(tx);
        await approveEvent(admin, eventId);
        const { slug } = await getEvent(tx, eventId);
        // El slug, para que la acción invalide sus páginas públicas.
        expect(await cancelEvent(admin, eventId)).toEqual({ slug, notification: null });

        const event = await getEvent(tx, eventId);
        expect(event.status).toBe("cancelled");
        expect(event.cancelledAt).toBeInstanceOf(Date);
        // Repetirlo no hace nada; ninguna transición sale de cancelled.
        expect(await cancelEvent(admin, eventId)).toEqual({ slug, notification: null });
        expect(await approveEvent(admin, eventId)).toEqual({ status: "cancelled", slug });
        await expect(submitForReview(owner, eventId)).rejects.toEqual(domainError("submit_not_draft"));
        await expect(rejectEvent(admin, eventId, "No")).rejects.toEqual(domainError("not_pending_review"));
        await expect(updateEvent(owner, eventId, draftInput(venue))).rejects.toEqual(domainError("edit_locked"));
        expect((await getEvent(tx, eventId)).status).toBe("cancelled");
      }));

    it.each([
      ["una orden paid", "paid", -60_000],
      ["una orden partially_refunded", "partially_refunded", -60_000],
      ["una orden pending vigente", "pending", 10 * 60_000],
    ] as const)("con %s está bloqueado (Cancelación con reembolsos: Próximamente)", (_label, status, offsetMs) =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupPending(tx);
        await setStatus(tx, eventId, "published");
        await insertOrder(tx, eventId, status, new Date(Date.now() + offsetMs));
        await expect(cancelEvent(await createAdmin(tx), eventId)).rejects.toEqual(domainError("has_sales"));
        expect((await getEvent(tx, eventId)).status).toBe("published");
      }));

    it("encola `cancelled` en la misma transacción (sin compradores no queda fila); si el encolado falla, no cancela", () =>
      inRolledBackTransaction(async (tx) => {
        const admin = await createAdmin(tx);
        const { eventId } = await setupPending(tx);
        await setStatus(tx, eventId, "published");
        vi.mocked(enqueueEventNotification).mockClear();

        vi.mocked(enqueueEventNotification).mockRejectedValueOnce(new Error("outbox caído"));
        await expect(cancelEvent(admin, eventId)).rejects.toThrow("outbox caído");
        expect((await getEvent(tx, eventId)).status).toBe("published");

        expect(await cancelEvent(admin, eventId)).toEqual({ slug: expect.any(String), notification: null });
        expect(enqueueEventNotification).toHaveBeenLastCalledWith(expect.anything(), {
          eventId,
          kind: "cancelled",
          changes: [{ field: "status", before: "published", after: "cancelled" }],
          actorId: admin.id,
        });
        expect(await tx.select().from(eventNotifications).where(eq(eventNotifications.eventId, eventId))).toEqual([]);
      }));

    it("una orden pending vencida no bloquea", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupPending(tx);
        await setStatus(tx, eventId, "published");
        await insertOrder(tx, eventId, "pending", new Date(Date.now() - 60_000));
        await cancelEvent(await createAdmin(tx), eventId);
        expect((await getEvent(tx, eventId)).status).toBe("cancelled");
      }));

    it("solo un admin cancela, y solo eventos publicados", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupPending(tx);
        await expect(cancelEvent(owner, eventId)).rejects.toEqual(domainError("not_moderator"));
        await expect(cancelEvent(await createAdmin(tx), eventId)).rejects.toEqual(domainError("cancel_not_published"));
      }));
  });

  it("un id ajeno o inexistente da not_found", () =>
    inRolledBackTransaction(async () => {
      const admin = { id: randomUUID(), role: "admin" as const };
      await expect(cancelEvent(admin, randomUUID())).rejects.toEqual(domainError("not_found"));
    }));
});
