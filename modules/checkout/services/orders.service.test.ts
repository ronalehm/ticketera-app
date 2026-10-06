// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { eventSeats, events } from "@/lib/db/schema/events";
import { users } from "@/lib/db/schema/identity";
import { orders, tickets } from "@/lib/db/schema/sales";
import { venueSeats } from "@/lib/db/schema/venues";
import { stripe } from "@/lib/stripe";
import { describeWithDb } from "@/lib/db/testDb";
import { createTestEvent, type TestEvent } from "@/lib/db/testFixtures";
import type { CheckoutOrder, CheckoutOrderItem } from "../types/checkout.types";
import { claimGuestOrders, getOrderConfirmation, getPendingCheckout, getUserPaidOrders } from "./orders.service";
import { reserveCheckoutOrder } from "./reservation.service";

// Nunca hay llamadas reales a Stripe.
vi.mock("@/lib/stripe", () => ({ stripe: { paymentIntents: { retrieve: vi.fn() } } }));
const retrieve = vi.mocked(stripe.paymentIntents.retrieve);

// Lejana, como la de `createTestEvent`: el evento publicado queda al final del catálogo que leen otros tests.
const STARTS_AT = new Date("2099-12-12T01:00:00.000Z");
const IMAGE_URL = "https://example.com/evento.jpg";
const BUYER = {
  buyerName: "Ana Quispe",
  buyerEmail: "ana@example.com",
  buyerPhone: "+51912345678",
  buyerDocumentType: "dni" as const,
  buyerDocumentNumber: "12345678",
};

const general = (quantity: number): CheckoutOrderItem => ({ ticketTypeId: "general", name: "General", unitPrice: 50, quantity });

let testEvent: TestEvent;
const createdUsers: string[] = [];

async function reserve(items: CheckoutOrderItem[]): Promise<string> {
  const order = { event: { slug: testEvent.slug }, items, quantities: {}, ticketCount: 0, total: 0 } as unknown as CheckoutOrder;
  const result = await reserveCheckoutOrder(order, null);
  if (result.status !== "reserved") throw new Error(`Reserva fallida: ${result.status}`);
  return result.orderId;
}

/** Orden de 1 general con comprador, PaymentIntent y los campos indicados (lo que dejan payOrder y el webhook). */
async function orderWith(fields: Partial<typeof orders.$inferInsert>): Promise<string> {
  const orderId = await reserve([general(1)]);
  await db
    .update(orders)
    .set({ ...BUYER, stripePaymentIntentId: `pi_test_${randomUUID()}`, ...fields })
    .where(eq(orders.id, orderId));
  return orderId;
}

/** Orden pagada como la deja el webhook: lugares `sold` y una entrada por lugar (general primero). */
async function paidOrder(items: CheckoutOrderItem[], fields: Partial<typeof orders.$inferInsert>): Promise<string> {
  const orderId = await reserve(items);
  const [order] = await db
    .update(orders)
    .set({ ...BUYER, status: "paid", paidAt: sql`now()`, ...fields })
    .where(eq(orders.id, orderId))
    .returning();
  const seats = await db
    .update(eventSeats)
    .set({ status: "sold", heldUntil: null })
    .where(eq(eventSeats.orderId, orderId))
    .returning({ id: eventSeats.id, venueSeatId: eventSeats.venueSeatId });
  seats.sort((a, b) => Number(a.venueSeatId !== null) - Number(b.venueSeatId !== null));
  await db.insert(tickets).values(
    seats.map((seat, index) => ({
      orderId,
      eventSeatId: seat.id,
      code: `${order.code}-0${index + 1}`,
      holderName: order.buyerName!,
      unitPriceCents: 5000,
      qrToken: randomBytes(16).toString("base64url"),
    })),
  );
  return orderId;
}

/** `qr_token` real de cada entrada de la orden, por código. */
async function qrTokensOf(orderId: string): Promise<Record<string, string>> {
  const rows = await db.select({ code: tickets.code, qrToken: tickets.qrToken }).from(tickets).where(eq(tickets.orderId, orderId));
  return Object.fromEntries(rows.map((row) => [row.code, row.qrToken]));
}

const userIdOf = async (orderId: string) =>
  (await db.select({ userId: orders.userId }).from(orders).where(eq(orders.id, orderId)))[0].userId;

describeWithDb("orders.service", () => {
  beforeAll(async () => {
    testEvent = await createTestEvent({ general: 40, numbered: { rows: ["A", "B"], seatsPerRow: 2 }, priceCents: 5000, status: "published" });
    // Fecha e imagen propias para comprobar que la confirmación y "Mis entradas" las leen del evento.
    await db
      .update(events)
      .set({ startsAt: STARTS_AT, doorsOpenAt: STARTS_AT, imageUrl: IMAGE_URL })
      .where(eq(events.id, testEvent.eventId));
  });

  afterAll(async () => {
    await testEvent?.cleanup();
    // Después del evento: sus órdenes apuntan a estos usuarios.
    if (createdUsers.length > 0) await db.delete(users).where(inArray(users.id, createdUsers));
  });

  beforeEach(() => {
    retrieve.mockReset();
  });

  it.each([
    ["no UUID", "abc"],
    ["repetido", [randomUUID(), randomUUID()]],
    ["ausente", undefined],
    ["UUID inexistente", randomUUID()],
  ])("%s → not-found", async (_, orderId) => {
    expect(await getPendingCheckout(orderId)).toEqual({ status: "not-found" });
  });

  it("orden vencida → expired con eventSlug", async () => {
    const orderId = await reserve([general(1)]);
    await db.update(orders).set({ expiresAt: sql`now() - interval '1 second'` }).where(eq(orders.id, orderId));

    expect(await getPendingCheckout(orderId)).toEqual({ status: "expired", eventSlug: testEvent.slug });
  });

  it("orden con estado expired → expired con eventSlug", async () => {
    const orderId = await orderWith({ status: "expired" });

    expect(await getPendingCheckout(orderId)).toEqual({ status: "expired", eventSlug: testEvent.slug });
  });

  it.each(["paid", "refunded", "partially_refunded"] as const)("orden %s → closed", async (status) => {
    const orderId = await orderWith({ status, paidAt: new Date() });

    expect(await getPendingCheckout(orderId)).toEqual({ status: "closed", orderId });
  });

  it("orden vigente → ok con líneas en el orden de sort_order, asientos, total, amountCents y remainingMs", async () => {
    const orderId = await reserve([
      general(2),
      {
        ticketTypeId: "numbered",
        name: "Platea",
        unitPrice: 50,
        quantity: 2,
        seats: [
          { id: "numbered-B-2", label: "" },
          { id: "numbered-A-1", label: "" },
        ],
      },
    ]);

    const result = await getPendingCheckout(orderId);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.orderId).toBe(orderId);
    expect(result.amountCents).toBe(20000);
    expect(result.remainingMs).toBeGreaterThan(0);
    expect(result.remainingMs).toBeLessThanOrEqual(600_000);
    expect(result.order).toEqual({
      event: {
        slug: testEvent.slug,
        title: expect.stringMatching(/^Evento de prueba /),
        category: expect.any(String),
        categoryName: expect.any(String),
        startsAt: STARTS_AT.toISOString(),
        venue: expect.stringMatching(/^Recinto /),
        city: "Lima",
        imageUrl: IMAGE_URL,
      },
      items: [
        { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 2 },
        {
          ticketTypeId: "numbered",
          name: "Platea",
          unitPrice: 50,
          quantity: 2,
          seats: [
            { id: "numbered-A-1", label: "Platea · Fila A · Asiento 1" },
            { id: "numbered-B-2", label: "Platea · Fila B · Asiento 2" },
          ],
        },
      ],
      quantities: { general: 2, numbered: 2 },
      ticketCount: 4,
      total: 200,
    });
  });

  describe("getOrderConfirmation", () => {
    it.each([
      ["no UUID", "abc"],
      ["UUID inexistente", randomUUID()],
    ])("%s → not-found", async (_, orderId) => {
      expect(await getOrderConfirmation(orderId)).toEqual({ status: "not-found" });
    });

    it("orden paid → vista Order con sus entradas en orden de código, sin consultar Stripe", async () => {
      const orderId = await reserve([
        general(1),
        { ticketTypeId: "numbered", name: "Platea", unitPrice: 50, quantity: 1, seats: [{ id: "numbered-B-1", label: "" }] },
      ]);
      const [order] = await db
        .update(orders)
        .set({ ...BUYER, status: "paid", paidAt: sql`now()` })
        .where(eq(orders.id, orderId))
        .returning();
      // General primero (sin asiento), como emite el webhook.
      const seats = await db
        .select({ id: eventSeats.id })
        .from(eventSeats)
        .leftJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
        .where(eq(eventSeats.orderId, orderId))
        .orderBy(sql`${venueSeats.number} nulls first`);
      await db.update(eventSeats).set({ status: "sold", heldUntil: null }).where(eq(eventSeats.orderId, orderId));
      await db.insert(tickets).values(
        seats.map((seat, index) => ({
          orderId,
          eventSeatId: seat.id,
          code: `${order.code}-0${index + 1}`,
          holderName: BUYER.buyerName,
          unitPriceCents: 5000,
          qrToken: randomBytes(16).toString("base64url"),
        })),
      );

      const qr = await qrTokensOf(orderId);
      expect(new Set(Object.values(qr)).size).toBe(2);

      expect(await getOrderConfirmation(orderId)).toEqual({
        status: "paid",
        order: {
          code: order.code,
          createdAt: order.paidAt!.toISOString(),
          event: expect.objectContaining({ slug: testEvent.slug, startsAt: STARTS_AT.toISOString(), imageUrl: IMAGE_URL }),
          items: [
            { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 1 },
            {
              ticketTypeId: "numbered",
              name: "Platea",
              unitPrice: 50,
              quantity: 1,
              seats: [{ id: "numbered-B-1", label: "Platea · Fila B · Asiento 1" }],
            },
          ],
          ticketCount: 2,
          total: 100,
          buyer: { name: BUYER.buyerName, email: BUYER.buyerEmail },
          tickets: [
            { code: `${order.code}-01`, ticketTypeName: "General", holderName: BUYER.buyerName, qrToken: qr[`${order.code}-01`] },
            {
              code: `${order.code}-02`,
              ticketTypeName: "Platea",
              seatLabel: "Platea · Fila B · Asiento 1",
              holderName: BUYER.buyerName,
              qrToken: qr[`${order.code}-02`],
            },
          ],
        },
      });
      expect(retrieve).not.toHaveBeenCalled();
    });

    it("orden refunded → refunded con eventSlug, sin consultar Stripe", async () => {
      const orderId = await orderWith({ status: "refunded" });

      expect(await getOrderConfirmation(orderId)).toEqual({ status: "refunded", eventSlug: testEvent.slug });
      expect(retrieve).not.toHaveBeenCalled();
    });

    it("orden con estado expired → expired, sin consultar Stripe", async () => {
      const orderId = await orderWith({ status: "expired" });

      expect(await getOrderConfirmation(orderId)).toEqual({ status: "expired", eventSlug: testEvent.slug });
      expect(retrieve).not.toHaveBeenCalled();
    });

    it("pending con PaymentIntent succeeded → processing", async () => {
      const orderId = await orderWith({});
      retrieve.mockResolvedValue({ status: "succeeded" } as never);

      expect(await getOrderConfirmation(orderId)).toEqual({ status: "processing" });
      const [{ stripePaymentIntentId }] = await db.select().from(orders).where(eq(orders.id, orderId));
      expect(retrieve).toHaveBeenCalledWith(stripePaymentIntentId);
    });

    it("pending vigente con requires_payment_method → payment-failed con orderId", async () => {
      const orderId = await orderWith({});
      retrieve.mockResolvedValue({ status: "requires_payment_method" } as never);

      expect(await getOrderConfirmation(orderId)).toEqual({ status: "payment-failed", orderId });
    });

    it("pending vencida con requires_payment_method → expired", async () => {
      const orderId = await orderWith({ expiresAt: new Date(Date.now() - 60_000) });
      retrieve.mockResolvedValue({ status: "requires_payment_method" } as never);

      expect(await getOrderConfirmation(orderId)).toEqual({ status: "expired", eventSlug: testEvent.slug });
    });

    it("pending sin PaymentIntent → payment-failed sin consultar Stripe", async () => {
      const orderId = await reserve([general(1)]);

      expect(await getOrderConfirmation(orderId)).toEqual({ status: "payment-failed", orderId });
      expect(retrieve).not.toHaveBeenCalled();
    });

    it("pending con Stripe fallando → payment-failed", async () => {
      const orderId = await orderWith({});
      retrieve.mockRejectedValue(new Error("red"));
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(await getOrderConfirmation(orderId)).toEqual({ status: "payment-failed", orderId });
      consoleError.mockRestore();
    });
  });

  describe("getUserPaidOrders y claimGuestOrders", () => {
    async function createUser(): Promise<string> {
      const suffix = randomUUID().slice(0, 8);
      const [{ id }] = await db
        .insert(users)
        .values({ email: `cliente.${suffix}@example.com`, firstName: "Cliente", lastName: suffix })
        .returning({ id: users.id });
      createdUsers.push(id);
      return id;
    }

    it("devuelve solo las órdenes paid con entradas del usuario, de la más reciente a la más antigua", async () => {
      const userId = await createUser();
      const otherUserId = await createUser();
      const older = await paidOrder([general(1)], { userId, paidAt: new Date("2026-10-01T10:00:00.000Z") });
      const newer = await paidOrder(
        [general(1), { ticketTypeId: "numbered", name: "Platea", unitPrice: 50, quantity: 1, seats: [{ id: "numbered-A-2", label: "" }] }],
        { userId, paidAt: new Date("2026-10-02T10:00:00.000Z") },
      );
      await orderWith({ userId }); // pending
      await orderWith({ userId, status: "refunded" });
      await orderWith({ userId, status: "paid", paidAt: new Date() }); // demo: paid sin entradas
      await paidOrder([general(1)], { userId: otherUserId });

      const result = await getUserPaidOrders(userId);

      const codes = await db.select({ id: orders.id, code: orders.code }).from(orders).where(inArray(orders.id, [newer, older]));
      const codeOf = (id: string) => codes.find((row) => row.id === id)!.code;
      expect(result.map((order) => order.code)).toEqual([codeOf(newer), codeOf(older)]);
      const qr = await qrTokensOf(newer);
      expect(new Set(Object.values(qr)).size).toBe(2);
      expect(result[0]).toEqual({
        code: codeOf(newer),
        createdAt: "2026-10-02T10:00:00.000Z",
        event: expect.objectContaining({ slug: testEvent.slug, startsAt: STARTS_AT.toISOString(), imageUrl: IMAGE_URL }),
        items: [
          { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 1 },
          {
            ticketTypeId: "numbered",
            name: "Platea",
            unitPrice: 50,
            quantity: 1,
            seats: [{ id: "numbered-A-2", label: "Platea · Fila A · Asiento 2" }],
          },
        ],
        ticketCount: 2,
        total: 100,
        buyer: { name: BUYER.buyerName, email: BUYER.buyerEmail },
        tickets: [
          { code: `${codeOf(newer)}-01`, ticketTypeName: "General", holderName: BUYER.buyerName, qrToken: qr[`${codeOf(newer)}-01`] },
          {
            code: `${codeOf(newer)}-02`,
            ticketTypeName: "Platea",
            seatLabel: "Platea · Fila A · Asiento 2",
            holderName: BUYER.buyerName,
            qrToken: qr[`${codeOf(newer)}-02`],
          },
        ],
      });
      expect(result[1].tickets).toEqual([expect.objectContaining({ qrToken: Object.values(await qrTokensOf(older))[0] })]);
    });

    it("usuario sin órdenes → []", async () => {
      expect(await getUserPaidOrders(await createUser())).toEqual([]);
    });

    it("vincula las órdenes de invitado de su correo (sin distinguir mayúsculas), sin tocar otras; idempotente", async () => {
      const userId = await createUser();
      const otherUserId = await createUser();
      const suffix = randomUUID().slice(0, 8);
      const email = `invitado.${suffix}@example.com`;
      const guestEmail = `Invitado.${suffix}@Example.com`;
      const guest = await paidOrder([general(1)], { buyerEmail: guestEmail });
      const otherEmail = await paidOrder([general(1)], { buyerEmail: `otro.${email}` });
      const owned = await paidOrder([general(1)], { buyerEmail: email, userId: otherUserId });

      await claimGuestOrders(userId, email);

      expect(await userIdOf(guest)).toBe(userId);
      expect(await userIdOf(otherEmail)).toBeNull();
      expect(await userIdOf(owned)).toBe(otherUserId);
      expect((await getUserPaidOrders(userId)).map((order) => order.buyer.email)).toEqual([guestEmail]);

      await claimGuestOrders(userId, email);

      expect(await userIdOf(guest)).toBe(userId);
      expect(await userIdOf(otherEmail)).toBeNull();
      expect(await userIdOf(owned)).toBe(otherUserId);
      expect(await getUserPaidOrders(userId)).toHaveLength(1);
    });

    it("una pending de invitado con ese correo no se vincula", async () => {
      const userId = await createUser();
      const email = `pendiente.${randomUUID().slice(0, 8)}@example.com`;
      const pending = await orderWith({ buyerEmail: email });

      await claimGuestOrders(userId, email);

      expect(await userIdOf(pending)).toBeNull();
    });
  });
});
