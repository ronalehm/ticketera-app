// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { eventStatusEnum } from "@/lib/db/schema/enums";
import { eventSeats, events } from "@/lib/db/schema/events";
import { organizers } from "@/lib/db/schema/identity";
import { orders } from "@/lib/db/schema/sales";
import { seedUuid } from "@/lib/db/seed/buildSeedData";
import { describeWithDb } from "@/lib/db/testDb";
import { createTestEvent, type TestEventOptions } from "@/lib/db/testFixtures";
import { inRolledBackTransaction, type Tx } from "@/lib/db/testTransaction";
import { EVENTS_MOCK } from "../data/events.mock";
import { managedEventStatusSchema } from "../schemas/managedEvents.schema";
import type { ManagedEvent } from "../types/events.types";
import { listManagedEvents } from "./managedEvents.service";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

const ADMIN = { id: randomUUID(), role: "admin" } as const;
const SUPER_ADMIN = { id: randomUUID(), role: "super_admin" } as const;
const SEED_DRAFT_SLUG = "feria-familiar-de-verano";
const SEED_EVENT_IDS = [...EVENTS_MOCK.map((event) => event.slug), SEED_DRAFT_SLUG].map((slug) => seedUuid(`event:${slug}`));

/** Evento `draft` de prueba (fixture) y el organizador que lo creó. */
async function createEvent(tx: Tx, options: TestEventOptions = {}) {
  const event = await createTestEvent(options);
  const [{ organizerId }] = await tx
    .select({ organizerId: events.organizerId })
    .from(events)
    .where(eq(events.id, event.eventId));
  return { ...event, organizer: { id: organizerId, role: "organizer" } as const };
}

/** Pasa el evento a `published` con los campos que exige `events_draft_complete_check`. */
async function publish(tx: Tx, eventId: string, startsAt = new Date("2027-01-15T01:00:00Z")) {
  await tx
    .update(events)
    .set({
      status: "published",
      description: "Evento de prueba",
      imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
      startsAt,
      doorsOpenAt: startsAt,
    })
    .where(eq(events.id, eventId));
}

/** Orden con comisión del 10 %: `organizer_amount_cents` = 90 % del subtotal. */
async function insertOrder(
  tx: Tx,
  eventId: string,
  status: (typeof orders.$inferInsert)["status"],
  ticketCount: number,
  subtotalCents: number,
) {
  const platformFeeCents = subtotalCents / 10;
  await tx.insert(orders).values({
    code: `TK-TEST-${randomUUID().slice(0, 8)}`,
    eventId,
    status,
    buyerName: "Comprador de prueba",
    buyerEmail: "comprador.prueba@example.com",
    buyerPhone: "+51900000000",
    buyerDocumentType: "dni",
    buyerDocumentNumber: "00000000",
    expiresAt: new Date(),
    ticketCount,
    subtotalCents,
    platformFeeCents,
    organizerAmountCents: subtotalCents - platformFeeCents,
  });
}

const byId = (list: ManagedEvent[], id: string) => list.find((event) => event.id === id);

describe("managedEventStatusSchema", () => {
  it("tiene los mismos estados que el enum event_status de la BD", () => {
    expect(managedEventStatusSchema.options).toEqual(eventStatusEnum.enumValues);
  });
});

describeWithDb("listManagedEvents (Postgres)", () => {
  it("un organizador solo ve sus eventos", async () => {
    await inRolledBackTransaction(async (tx) => {
      const mine = await createEvent(tx, { general: 5 });
      const other = await createEvent(tx, { general: 5 });

      expect((await listManagedEvents(mine.organizer)).map((event) => event.id)).toEqual([mine.eventId]);
      expect((await listManagedEvents(other.organizer)).map((event) => event.id)).toEqual([other.eventId]);
    });
  });

  it.each([ADMIN, SUPER_ADMIN])("$role ve todos: los del seed y los de cualquier organizador", async (actor) => {
    await inRolledBackTransaction(async (tx) => {
      const first = await createEvent(tx, { general: 5 });
      const second = await createEvent(tx, { general: 5 });

      const ids = (await listManagedEvents(actor)).map((event) => event.id);
      expect(ids).toEqual(expect.arrayContaining([...SEED_EVENT_IDS, first.eventId, second.eventId]));
    });
  });

  it("un customer no gestiona eventos: devuelve []", async () => {
    expect(await listManagedEvents({ id: randomUUID(), role: "customer" })).toEqual([]);
  });

  it("vendidas e ingresos cuentan solo órdenes paid (bruto para el admin, parte del organizador para él)", async () => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createEvent(tx, { general: 20 });
      await publish(tx, event.eventId);
      await insertOrder(tx, event.eventId, "paid", 3, 15_000);
      await insertOrder(tx, event.eventId, "paid", 2, 10_000);
      await insertOrder(tx, event.eventId, "refunded", 4, 20_000);
      await insertOrder(tx, event.eventId, "partially_refunded", 1, 5_000);
      await insertOrder(tx, event.eventId, "pending", 6, 30_000);
      await insertOrder(tx, event.eventId, "expired", 2, 10_000);

      expect(byId(await listManagedEvents(event.organizer), event.eventId)).toMatchObject({
        sold: 5,
        revenueCents: 22_500,
      });
      expect(byId(await listManagedEvents(ADMIN), event.eventId)).toMatchObject({ sold: 5, revenueCents: 25_000 });
    });
  });

  it("sin órdenes: 0 vendidas y 0 de ingresos", async () => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createEvent(tx, { general: 5 });
      expect(byId(await listManagedEvents(event.organizer), event.eventId)).toMatchObject({ sold: 0, revenueCents: 0 });
    });
  });

  it("fuera de draft, la capacidad es el inventario sin retirados", async () => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createEvent(tx, { general: 10, numbered: { rows: ["A"], seatsPerRow: 4 } });
      await publish(tx, event.eventId);
      const [retired] = await tx
        .select({ id: eventSeats.id })
        .from(eventSeats)
        .where(eq(eventSeats.eventId, event.eventId))
        .limit(1);
      await tx.update(eventSeats).set({ retiredAt: new Date() }).where(eq(eventSeats.id, retired.id));

      expect(byId(await listManagedEvents(event.organizer), event.eventId)?.capacity).toBe(13);
    });
  });

  it("un draft muestra la capacidad configurada en sus secciones (general + asientos numerados), no su inventario", async () => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createEvent(tx, { general: 10, numbered: { rows: ["A", "B"], seatsPerRow: 5 } });
      // Un borrador no tiene inventario: aunque se retire todo, la capacidad sale de las secciones.
      await tx.update(eventSeats).set({ retiredAt: new Date() }).where(eq(eventSeats.eventId, event.eventId));

      expect(byId(await listManagedEvents(event.organizer), event.eventId)).toMatchObject({
        status: "draft",
        capacity: 20,
      });
    });
  });

  it("el borrador del seed (sin event_seats) toma la capacidad de su sección general", async () => {
    const draft = byId(await listManagedEvents(ADMIN, { status: "draft" }), seedUuid(`event:${SEED_DRAFT_SLUG}`));
    expect(draft).toMatchObject({ title: "Feria Familiar de Verano", status: "draft", capacity: 1500, sold: 0 });
  });

  it("devuelve los datos del evento y la razón social del organizador", async () => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createEvent(tx, { general: 5 });
      await publish(tx, event.eventId, new Date("2027-02-01T01:00:00Z"));
      const [row] = await tx.select().from(events).where(eq(events.id, event.eventId));
      const [organizer] = await tx.select().from(organizers).where(eq(organizers.userId, event.organizer.id));

      expect(byId(await listManagedEvents(ADMIN), event.eventId)).toEqual({
        id: event.eventId,
        slug: event.slug,
        title: row.title,
        status: "published",
        startsAt: "2027-02-01T01:00:00.000Z",
        venue: expect.stringMatching(/^Recinto /),
        city: "Lima",
        imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
        organizer: organizer.legalName,
        sold: 0,
        revenueCents: 0,
        capacity: 5,
      });
    });
  });

  it("sin razón social (organizador pendiente), el organizador es su nombre", async () => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createEvent(tx, { general: 5 });
      await tx
        .update(organizers)
        .set({ status: "pending", legalName: null, taxIdType: null, taxId: null })
        .where(eq(organizers.userId, event.organizer.id));

      const suffix = event.slug.replace("test-checkout-", "");
      expect(byId(await listManagedEvents(ADMIN), event.eventId)?.organizer).toBe(`Prueba ${suffix}`);
    });
  });

  it("filtra por estado", async () => {
    await inRolledBackTransaction(async (tx) => {
      const draft = await createEvent(tx, { general: 5 });
      const published = await createEvent(tx, { general: 5 });
      await publish(tx, published.eventId);
      const cancelled = await createEvent(tx, { general: 5 });
      await publish(tx, cancelled.eventId);
      await tx.update(events).set({ status: "cancelled" }).where(eq(events.id, cancelled.eventId));

      const drafts = await listManagedEvents(ADMIN, { status: "draft" });
      expect(drafts.every((event) => event.status === "draft")).toBe(true);
      expect(drafts.map((event) => event.id)).toContain(draft.eventId);
      expect(drafts.map((event) => event.id)).not.toContain(published.eventId);

      const publishedList = await listManagedEvents(ADMIN, { status: "published" });
      expect(publishedList.every((event) => event.status === "published")).toBe(true);
      expect(publishedList.map((event) => event.id)).toContain(published.eventId);

      expect((await listManagedEvents(cancelled.organizer, { status: "cancelled" })).map((event) => event.id)).toEqual([
        cancelled.eventId,
      ]);
      expect(await listManagedEvents(cancelled.organizer, { status: "published" })).toEqual([]);
      expect(await listManagedEvents(draft.organizer, { status: "all" })).toHaveLength(1);
    });
  });

  it("busca por título sin distinguir mayúsculas, y por título, recinto o ciudad sin tildes", async () => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createEvent(tx, { general: 5 });
      const suffix = event.slug.replace("test-checkout-", "");

      expect((await listManagedEvents(ADMIN, { q: `EVENTO DE PRUEBA ${suffix}` })).map((item) => item.id)).toEqual([
        event.eventId,
      ]);
      // `search_text` del seed: "noche de sintetizadores: gira neon 2026 estadio nacional lima".
      expect((await listManagedEvents(ADMIN, { q: "  Gira Neón " })).map((item) => item.slug)).toEqual([
        "noche-de-sintetizadores-lima",
      ]);
      expect(await listManagedEvents(ADMIN, { q: "no-existe-ningún-evento" })).toEqual([]);
    });
  });

  it("escapa los comodines de LIKE en la búsqueda", async () => {
    expect(await listManagedEvents(ADMIN, { q: "%" })).toEqual([]);
    expect(await listManagedEvents(ADMIN, { q: "_" })).toEqual([]);
  });

  it("combina estado y búsqueda dentro del alcance del organizador", async () => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createEvent(tx, { general: 5 });
      const suffix = event.slug.replace("test-checkout-", "");

      expect(await listManagedEvents(event.organizer, { status: "draft", q: suffix })).toHaveLength(1);
      expect(await listManagedEvents(event.organizer, { status: "published", q: suffix })).toEqual([]);
      // Otro organizador no lo encuentra aunque busque su título.
      const other = await createEvent(tx, { general: 5 });
      expect((await listManagedEvents(other.organizer, { q: suffix })).map((item) => item.id)).toEqual([]);
    });
  });

  it("ordena por fecha de inicio ascendente, con los borradores sin fecha al final", async () => {
    await inRolledBackTransaction(async (tx) => {
      const undated = await createEvent(tx, { general: 5 });
      const late = await createEvent(tx, { general: 5 });
      const early = await createEvent(tx, { general: 5 });
      await publish(tx, late.eventId, new Date("2099-01-01T01:00:00Z"));
      await publish(tx, early.eventId, new Date("2026-10-02T01:00:00Z"));

      const list = await listManagedEvents(ADMIN);
      const dates = list.flatMap((event) => (event.startsAt ? [Date.parse(event.startsAt)] : []));
      expect(dates).toEqual([...dates].sort((a, b) => a - b));
      const firstUndated = list.findIndex((event) => event.startsAt === null);
      expect(list.slice(firstUndated).every((event) => event.startsAt === null)).toBe(true);

      const ids = list.map((event) => event.id);
      expect(ids.indexOf(early.eventId)).toBeLessThan(ids.indexOf(late.eventId));
      expect(ids.indexOf(late.eventId)).toBeLessThan(ids.indexOf(undated.eventId));
      expect(ids.indexOf(undated.eventId)).toBeGreaterThanOrEqual(firstUndated);
    });
  });

  it("acepta una conexión explícita (database)", async () => {
    await inRolledBackTransaction(async (tx) => {
      const event = await createEvent(tx, { general: 5 });
      const list = await listManagedEvents(event.organizer, {}, tx);
      expect(list.map((item) => item.id)).toEqual([event.eventId]);
    });
  });
});
