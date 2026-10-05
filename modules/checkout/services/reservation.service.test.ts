// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { afterEach, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { eventSeats } from "@/lib/db/schema/events";
import { orders } from "@/lib/db/schema/sales";
import { describeWithDb } from "@/lib/db/testDb";
import { createTestEvent, type TestEvent, type TestEventOptions } from "@/lib/db/testFixtures";
import type { CheckoutOrder, CheckoutOrderItem } from "../types/checkout.types";
import { releaseOrder, reserveCheckoutOrder } from "./reservation.service";

// reserveCheckoutOrder solo lee `event.slug` y `items`.
function checkoutOrder(slug: string, items: CheckoutOrderItem[]): CheckoutOrder {
  return { event: { slug } as CheckoutOrder["event"], items, quantities: {}, ticketCount: 0, total: 0 };
}

const general = (quantity: number): CheckoutOrderItem => ({ ticketTypeId: "general", name: "General", unitPrice: 50, quantity });

const numbered = (...ids: string[]): CheckoutOrderItem => ({
  ticketTypeId: "numbered",
  name: "Platea",
  unitPrice: 50,
  quantity: ids.length,
  seats: ids.map((id) => ({ id, label: id })),
});

let testEvent: TestEvent | undefined;

async function setup(options: TestEventOptions): Promise<TestEvent> {
  testEvent = await createTestEvent(options);
  return testEvent;
}

afterEach(async () => {
  await testEvent?.cleanup();
  testEvent = undefined;
});

function getSeats(eventId: string) {
  return db
    .select({ status: eventSeats.status, orderId: eventSeats.orderId, heldUntil: eventSeats.heldUntil })
    .from(eventSeats)
    .where(eq(eventSeats.eventId, eventId));
}

function getOrders(eventId: string) {
  return db.select().from(orders).where(eq(orders.eventId, eventId));
}

async function reserve(slug: string, items: CheckoutOrderItem[]): Promise<string> {
  const result = await reserveCheckoutOrder(checkoutOrder(slug, items), null);
  if (result.status !== "reserved") throw new Error(`Reserva fallida: ${result.status}`);
  return result.orderId;
}

describeWithDb("reservation.service", () => {
  it("dos reservas en paralelo por el último lugar general → una reserved y otra unavailable", async () => {
    const { eventId, slug } = await setup({ general: 1 });

    const results = await Promise.all([
      reserveCheckoutOrder(checkoutOrder(slug, [general(1)]), null),
      reserveCheckoutOrder(checkoutOrder(slug, [general(1)]), null),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(["reserved", "unavailable"]);
    const winnerId = results.flatMap((result) => (result.status === "reserved" ? [result.orderId] : []))[0];
    expect((await getOrders(eventId)).map((order) => order.id)).toEqual([winnerId]);
    expect(await getSeats(eventId)).toEqual([expect.objectContaining({ status: "held", orderId: winnerId })]);
  });

  it("mismo asiento numerado en paralelo → gana una", async () => {
    const { eventId, slug } = await setup({ numbered: { rows: ["A"], seatsPerRow: 2 } });

    const results = await Promise.all([
      reserveCheckoutOrder(checkoutOrder(slug, [numbered("numbered-A-1")]), null),
      reserveCheckoutOrder(checkoutOrder(slug, [numbered("numbered-A-1")]), null),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(["reserved", "unavailable"]);
    expect(await getOrders(eventId)).toHaveLength(1);
    const seats = await getSeats(eventId);
    expect(seats.filter((seat) => seat.status === "held")).toHaveLength(1);
  });

  it("reserva mixta → orden pending con importes, TK-, expires_at y lugares held hasta expires_at", async () => {
    const { eventId, slug } = await setup({ general: 3, numbered: { rows: ["A", "B"], seatsPerRow: 2 }, priceCents: 5000, commissionBps: 1000 });

    const orderId = await reserve(slug, [general(2), numbered("numbered-B-2")]);

    const [order] = await getOrders(eventId);
    expect(order).toMatchObject({
      id: orderId,
      status: "pending",
      userId: null,
      ticketCount: 3,
      subtotalCents: 15000,
      platformFeeCents: 1500,
      organizerAmountCents: 13500,
      buyerName: null,
      buyerEmail: null,
      buyerPhone: null,
      buyerDocumentType: null,
      buyerDocumentNumber: null,
    });
    expect(order.code).toMatch(/^TK-\d+$/);
    // Holgura de 1 min por el desfase entre el reloj local y el de la BD.
    expect(Math.abs(order.expiresAt.getTime() - (Date.now() + 10 * 60_000))).toBeLessThan(60_000);

    const held = (await getSeats(eventId)).filter((seat) => seat.status === "held");
    expect(held).toHaveLength(3);
    for (const seat of held) {
      expect(seat.orderId).toBe(orderId);
      expect(seat.heldUntil?.getTime()).toBe(order.expiresAt.getTime());
    }
  });

  it("lugar held con la retención vencida → lo toma la nueva orden", async () => {
    const { eventId, slug } = await setup({ general: 1 });
    const firstOrderId = await reserve(slug, [general(1)]);
    await db.update(eventSeats).set({ heldUntil: sql`now() - interval '1 minute'` }).where(eq(eventSeats.eventId, eventId));
    await db.update(orders).set({ expiresAt: sql`now() - interval '1 minute'` }).where(eq(orders.id, firstOrderId));

    const secondOrderId = await reserve(slug, [general(1)]);

    const [seat] = await getSeats(eventId);
    expect(secondOrderId).not.toBe(firstOrderId);
    expect(seat).toMatchObject({ status: "held", orderId: secondOrderId });
  });

  it("asiento numerado ya retenido → unavailable sin orden nueva", async () => {
    const { eventId, slug } = await setup({ numbered: { rows: ["A"], seatsPerRow: 2 } });
    await reserve(slug, [numbered("numbered-A-1")]);

    const result = await reserveCheckoutOrder(checkoutOrder(slug, [numbered("numbered-A-1", "numbered-A-2")]), null);

    expect(result).toEqual({ status: "unavailable" });
    expect(await getOrders(eventId)).toHaveLength(1);
    expect((await getSeats(eventId)).filter((seat) => seat.status === "held")).toHaveLength(1);
  });

  it.each([
    ["cantidad mayor que max_per_order", [general(7)]],
    ["asiento numerado inexistente", [numbered("numbered-Z-9")]],
    ["tipo inexistente", [{ ...general(1), ticketTypeId: "vip" }]],
  ])("%s → invalid sin filas nuevas", async (_, items) => {
    const { eventId, slug } = await setup({ general: 8, numbered: { rows: ["A"], seatsPerRow: 2 } });

    expect(await reserveCheckoutOrder(checkoutOrder(slug, items), null)).toEqual({ status: "invalid" });

    expect(await getOrders(eventId)).toHaveLength(0);
    expect((await getSeats(eventId)).every((seat) => seat.status === "available" && seat.orderId === null)).toBe(true);
  });

  it("releaseOrder de una orden pending → lugares available sin order_id y orden vencida", async () => {
    const { eventId, slug } = await setup({ general: 2 });
    const orderId = await reserve(slug, [general(2)]);

    await releaseOrder(orderId);

    expect(await getSeats(eventId)).toEqual([
      { status: "available", orderId: null, heldUntil: null },
      { status: "available", orderId: null, heldUntil: null },
    ]);
    const [order] = await db
      .select({ status: orders.status, expired: sql<boolean>`${orders.expiresAt} <= now()` })
      .from(orders)
      .where(eq(orders.id, orderId));
    expect(order).toEqual({ status: "pending", expired: true });
  });

  it("releaseOrder de una orden paid → no cambia nada", async () => {
    const { eventId, slug } = await setup({ general: 1 });
    const orderId = await reserve(slug, [general(1)]);
    await db
      .update(orders)
      .set({
        status: "paid",
        buyerName: "Ana Pérez",
        buyerEmail: "ana@example.com",
        buyerPhone: "+51987654321",
        buyerDocumentType: "dni",
        buyerDocumentNumber: "12345678",
      })
      .where(eq(orders.id, orderId));
    const [before] = await getOrders(eventId);
    const seatsBefore = await getSeats(eventId);

    await releaseOrder(orderId);

    const [after] = await getOrders(eventId);
    expect(after.expiresAt).toEqual(before.expiresAt);
    expect(after.status).toBe("paid");
    expect(await getSeats(eventId)).toEqual(seatsBefore);
  });
});
