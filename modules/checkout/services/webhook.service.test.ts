// @vitest-environment node
import { randomUUID } from "node:crypto";
import { asc, eq, inArray, sql } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { eventSeats } from "@/lib/db/schema/events";
import { orders, stripeEvents, tickets } from "@/lib/db/schema/sales";
import { venueSeats } from "@/lib/db/schema/venues";
import { stripe } from "@/lib/stripe";
import { describeWithDb } from "@/lib/db/testDb";
import { createTestEvent, type TestEvent } from "@/lib/db/testFixtures";
import type { CheckoutOrder, CheckoutOrderItem } from "../types/checkout.types";
import { reserveCheckoutOrder } from "./reservation.service";
import { handleStripeWebhook } from "./webhook.service";

// Firma real (webhooks del SDK); solo `refunds.create` es falso. Nunca hay llamadas de red.
vi.mock("@/lib/stripe", async () => {
  const { default: Stripe } = await import("stripe");
  return { stripe: { webhooks: new Stripe("sk_test_unused").webhooks, refunds: { create: vi.fn() } } };
});

const SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const BUYER_NAME = "Ana Quispe";

const general = (quantity: number): CheckoutOrderItem => ({ ticketTypeId: "general", name: "General", unitPrice: 50, quantity });
const numbered = (...ids: string[]): CheckoutOrderItem => ({
  ticketTypeId: "numbered",
  name: "Platea",
  unitPrice: 50,
  quantity: ids.length,
  seats: ids.map((id) => ({ id, label: id })),
});

let testEvent: TestEvent;
const eventIds: string[] = [];

async function reserve(items: CheckoutOrderItem[]): Promise<string> {
  const order = { event: { slug: testEvent.slug }, items, quantities: {}, ticketCount: 0, total: 0 } as unknown as CheckoutOrder;
  const result = await reserveCheckoutOrder(order, null);
  if (result.status !== "reserved") throw new Error(`Reserva fallida: ${result.status}`);
  return result.orderId;
}

/** Orden lista para cobrar: comprador guardado y PaymentIntent asociado (lo que deja createOrderPayment). */
async function reservePaying(items: CheckoutOrderItem[]) {
  const orderId = await reserve(items);
  const paymentIntentId = `pi_test_${randomUUID()}`;
  const [order] = await db
    .update(orders)
    .set({
      buyerName: BUYER_NAME,
      buyerEmail: "ana@example.com",
      buyerPhone: "+51912345678",
      buyerDocumentType: "dni",
      buyerDocumentNumber: "12345678",
      stripePaymentIntentId: paymentIntentId,
    })
    .where(eq(orders.id, orderId))
    .returning();
  return order;
}

type PaymentIntentFields = { id: string; amount: number; currency?: string; metadata?: Record<string, string> };

function signedEvent(paymentIntent: PaymentIntentFields, type = "payment_intent.succeeded", id = `evt_test_${randomUUID()}`) {
  eventIds.push(id);
  const object = { object: "payment_intent", currency: "pen", metadata: {}, ...paymentIntent };
  const payload = JSON.stringify({ id, object: "event", type, data: { object } });
  return { id, payload, signature: stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) };
}

function succeededFor(order: { id: string; stripePaymentIntentId: string | null; subtotalCents: number }) {
  return signedEvent({ id: order.stripePaymentIntentId!, amount: order.subtotalCents, metadata: { order_id: order.id } });
}

const send = (event: { payload: string; signature: string | null }) => handleStripeWebhook(event.payload, event.signature);

async function readOrder(orderId: string) {
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
  return row;
}

function readTickets(orderId: string) {
  return db
    .select({
      code: tickets.code,
      holderName: tickets.holderName,
      unitPriceCents: tickets.unitPriceCents,
      qrToken: tickets.qrToken,
      status: tickets.status,
      seatNumber: venueSeats.number,
    })
    .from(tickets)
    .innerJoin(eventSeats, eq(eventSeats.id, tickets.eventSeatId))
    .leftJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
    .where(eq(tickets.orderId, orderId))
    .orderBy(asc(tickets.code));
}

function readSeats(orderId: string) {
  return db.select({ status: eventSeats.status, heldUntil: eventSeats.heldUntil }).from(eventSeats).where(eq(eventSeats.orderId, orderId));
}

async function isEventRecorded(id: string): Promise<boolean> {
  return (await db.select().from(stripeEvents).where(eq(stripeEvents.id, id))).length === 1;
}

describeWithDb("handleStripeWebhook", () => {
  beforeAll(async () => {
    testEvent = await createTestEvent({ general: 20, numbered: { rows: ["A", "B", "C"], seatsPerRow: 3 }, priceCents: 5000 });
  });

  afterAll(async () => {
    if (eventIds.length > 0) await db.delete(stripeEvents).where(inArray(stripeEvents.id, eventIds));
    await testEvent?.cleanup();
  });

  beforeEach(() => {
    vi.mocked(stripe.refunds.create).mockReset();
  });

  it("orden que conserva sus asientos → paid, lugares sold y una entrada por asiento en orden", async () => {
    const order = await reservePaying([general(1), numbered("numbered-A-2", "numbered-A-1")]);

    expect(await send(succeededFor(order))).toEqual({ status: 200 });

    expect(await readOrder(order.id)).toMatchObject({ status: "paid", paidAt: expect.any(Date) });
    expect(await readSeats(order.id)).toEqual(Array(3).fill({ status: "sold", heldUntil: null }));
    const issued = await readTickets(order.id);
    // Orden: tipo (General, luego Platea), fila y número.
    expect(issued.map(({ code, seatNumber }) => [code, seatNumber])).toEqual([
      [`${order.code}-01`, null],
      [`${order.code}-02`, 1],
      [`${order.code}-03`, 2],
    ]);
    for (const ticket of issued) {
      expect(ticket).toMatchObject({ holderName: BUYER_NAME, unitPriceCents: 5000, status: "valid" });
      expect(ticket.qrToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
    }
    expect(new Set(issued.map((ticket) => ticket.qrToken)).size).toBe(3);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it("mismo evento dos veces en serie → una sola emisión, ambas 200", async () => {
    const order = await reservePaying([general(2)]);
    const event = succeededFor(order);

    expect(await send(event)).toEqual({ status: 200 });
    expect(await send(event)).toEqual({ status: 200 });

    expect(await readTickets(order.id)).toHaveLength(2);
  });

  it("mismo evento dos veces en paralelo → una sola emisión, ambas 200", async () => {
    const order = await reservePaying([general(2)]);
    const event = succeededFor(order);

    expect(await Promise.all([send(event), send(event)])).toEqual([{ status: 200 }, { status: 200 }]);

    expect(await readTickets(order.id)).toHaveLength(2);
    expect((await readOrder(order.id)).status).toBe("paid");
  });

  it("orden ya pagada y otro evento del mismo PaymentIntent → 200 sin cambios", async () => {
    const order = await reservePaying([general(1)]);
    await send(succeededFor(order));
    const [before] = await readTickets(order.id);

    expect(await send(succeededFor(order))).toEqual({ status: 200 });

    expect(await readTickets(order.id)).toEqual([before]);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it("reserva vencida con un lugar tomado por otra orden → reembolso, refunded, sin entradas y lugares liberados", async () => {
    const order = await reservePaying([numbered("numbered-B-1", "numbered-B-2")]);
    await db.update(orders).set({ expiresAt: sql`now() - interval '1 second'` }).where(eq(orders.id, order.id));
    await db.update(eventSeats).set({ heldUntil: sql`now() - interval '1 second'` }).where(eq(eventSeats.orderId, order.id));
    const otherOrderId = await reserve([numbered("numbered-B-1")]);

    expect(await send(succeededFor(order))).toEqual({ status: 200 });

    expect(stripe.refunds.create).toHaveBeenCalledExactlyOnceWith(
      { payment_intent: order.stripePaymentIntentId },
      { idempotencyKey: `refund-${order.id}` },
    );
    expect((await readOrder(order.id)).status).toBe("refunded");
    expect(await readTickets(order.id)).toEqual([]);
    expect(await readSeats(order.id)).toEqual([]);
    const seats = await db
      .select({ number: venueSeats.number, status: eventSeats.status, orderId: eventSeats.orderId })
      .from(eventSeats)
      .innerJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
      .where(sql`${venueSeats.rowLabel} = 'B' AND ${eventSeats.eventId} = ${testEvent.eventId}`)
      .orderBy(venueSeats.number);
    expect(seats.slice(0, 2)).toEqual([
      { number: 1, status: "held", orderId: otherOrderId },
      { number: 2, status: "available", orderId: null },
    ]);
  });

  it("orden con estado expired → reembolso aunque conserve sus asientos", async () => {
    const order = await reservePaying([general(1)]);
    await db.update(orders).set({ status: "expired" }).where(eq(orders.id, order.id));

    expect(await send(succeededFor(order))).toEqual({ status: 200 });

    expect(stripe.refunds.create).toHaveBeenCalledOnce();
    expect((await readOrder(order.id)).status).toBe("refunded");
    expect(await readSeats(order.id)).toEqual([]);
  });

  it("reembolso que Stripe ya hizo (charge_already_refunded) → refunded y lugares liberados", async () => {
    const order = await reservePaying([general(1)]);
    await db.update(orders).set({ status: "expired" }).where(eq(orders.id, order.id));
    vi.mocked(stripe.refunds.create).mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", code: "charge_already_refunded", message: "ya reembolsado" }),
    );

    expect(await send(succeededFor(order))).toEqual({ status: 200 });

    expect(stripe.refunds.create).toHaveBeenCalledOnce();
    expect((await readOrder(order.id)).status).toBe("refunded");
    expect(await readSeats(order.id)).toEqual([]);
  });

  it("error de constructEvent que no es de firma → log solo con el name y relanza", async () => {
    const payload = "no es JSON";
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(handleStripeWebhook(payload, signature)).rejects.toThrow(SyntaxError);

    expect(consoleError).toHaveBeenCalledExactlyOnceWith(expect.any(String), { error: "SyntaxError" });
    consoleError.mockRestore();
  });

  it("error a mitad (reembolso que falla) → lanza, rollback total y el reintento lo procesa", async () => {
    const order = await reservePaying([numbered("numbered-C-1", "numbered-C-2")]);
    await db.update(orders).set({ status: "expired" }).where(eq(orders.id, order.id));
    const event = succeededFor(order);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(stripe.refunds.create).mockRejectedValueOnce(new Error("red caída"));

    await expect(send(event)).rejects.toThrow("red caída");

    expect(await isEventRecorded(event.id)).toBe(false);
    expect((await readOrder(order.id)).status).toBe("expired");
    expect(await readSeats(order.id)).toEqual(Array(2).fill({ status: "held", heldUntil: expect.any(Date) }));
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/Quispe|ana@example|912345678/);
    consoleError.mockRestore();

    expect(await send(event)).toEqual({ status: 200 });
    expect(stripe.refunds.create).toHaveBeenCalledTimes(2);
    expect(vi.mocked(stripe.refunds.create).mock.calls[1]).toEqual(vi.mocked(stripe.refunds.create).mock.calls[0]);
    expect((await readOrder(order.id)).status).toBe("refunded");
  });

  it("firma ausente, inválida o de otro secreto → 400 sin registrar el evento", async () => {
    const order = await reservePaying([general(1)]);
    const event = succeededFor(order);
    const foreign = stripe.webhooks.generateTestHeaderString({ payload: event.payload, secret: "whsec_other" });

    expect(await send({ ...event, signature: null })).toEqual({ status: 400 });
    expect(await send({ ...event, signature: "t=1,v1=bad" })).toEqual({ status: 400 });
    expect(await send({ ...event, signature: foreign })).toEqual({ status: 400 });
    expect(await send({ payload: `${event.payload} `, signature: event.signature })).toEqual({ status: 400 });

    expect(await isEventRecorded(event.id)).toBe(false);
    expect((await readOrder(order.id)).status).toBe("pending");
  });

  it("otro tipo de evento → 200 sin cambios", async () => {
    const order = await reservePaying([general(1)]);
    const event = signedEvent(
      { id: order.stripePaymentIntentId!, amount: order.subtotalCents, metadata: { order_id: order.id } },
      "payment_intent.payment_failed",
    );

    expect(await send(event)).toEqual({ status: 200 });

    expect(await isEventRecorded(event.id)).toBe(false);
    expect((await readOrder(order.id)).status).toBe("pending");
  });

  it("sin order_id, order_id no UUID, orden inexistente, PaymentIntent o importe/moneda distintos → 200 sin cambios, evento registrado y log solo con ids", async () => {
    const order = await reservePaying([general(1)]);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const mismatches = [
      signedEvent({ id: order.stripePaymentIntentId!, amount: order.subtotalCents }),
      signedEvent({ id: order.stripePaymentIntentId!, amount: order.subtotalCents, metadata: { order_id: "abc" } }),
      signedEvent({ id: order.stripePaymentIntentId!, amount: order.subtotalCents, metadata: { order_id: randomUUID() } }),
      signedEvent({ id: "pi_test_otro", amount: order.subtotalCents, metadata: { order_id: order.id } }),
      signedEvent({ id: order.stripePaymentIntentId!, amount: order.subtotalCents - 1, metadata: { order_id: order.id } }),
      signedEvent({ id: order.stripePaymentIntentId!, amount: order.subtotalCents, currency: "usd", metadata: { order_id: order.id } }),
    ];

    for (const event of mismatches) {
      expect(await send(event)).toEqual({ status: 200 });
      expect(await isEventRecorded(event.id)).toBe(true);
    }

    expect(consoleError).toHaveBeenCalledTimes(mismatches.length);
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), {
      eventId: mismatches[4].id,
      paymentIntentId: order.stripePaymentIntentId,
      orderId: order.id,
    });
    consoleError.mockRestore();
    expect((await readOrder(order.id)).status).toBe("pending");
    expect(await readTickets(order.id)).toEqual([]);
    expect(await readSeats(order.id)).toEqual([{ status: "held", heldUntil: expect.any(Date) }]);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  }, 20_000); // 6 eventos en serie contra la BD remota.
});
