// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/identity";
import { orders } from "@/lib/db/schema/sales";
import { stripe } from "@/lib/stripe";
import { describeWithDb } from "@/lib/db/testDb";
import { createTestEvent, type TestEvent } from "@/lib/db/testFixtures";
import type { CheckoutBuyer, CheckoutOrder } from "../types/checkout.types";
import { createOrderPayment } from "./orderPayment.service";
import { reserveCheckoutOrder } from "./reservation.service";

vi.mock("@/lib/stripe", () => ({ stripe: { paymentIntents: { create: vi.fn() } } }));

const BUYER: CheckoutBuyer = {
  firstName: "Ana",
  lastName: "Quispe",
  email: "Ana.Quispe@Correo.PE",
  phone: "912345678",
  documentType: "dni",
  documentNumber: "12345678",
  acceptTerms: true,
};

let testEvent: TestEvent;
let sessionUserId: string;

async function reserve(quantity: number): Promise<string> {
  const items = [{ ticketTypeId: "general", name: "General", unitPrice: 50, quantity }];
  const order = { event: { slug: testEvent.slug }, items, quantities: {}, ticketCount: 0, total: 0 } as unknown as CheckoutOrder;
  const result = await reserveCheckoutOrder(order, null);
  if (result.status !== "reserved") throw new Error(`Reserva fallida: ${result.status}`);
  return result.orderId;
}

async function readOrder(orderId: string) {
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
  return row;
}

describeWithDb("createOrderPayment", () => {
  beforeAll(async () => {
    testEvent = await createTestEvent({ general: 10, priceCents: 5000 });
    const suffix = randomUUID().slice(0, 8);
    [{ id: sessionUserId }] = await db
      .insert(users)
      .values({ email: `buyer.${suffix}@example.com`, firstName: "Ana", lastName: suffix })
      .returning({ id: users.id });
  });

  afterAll(async () => {
    await testEvent?.cleanup();
    if (sessionUserId) await db.delete(users).where(eq(users.id, sessionUserId));
  });

  beforeEach(() => {
    vi.mocked(stripe.paymentIntents.create).mockReset();
  });

  it("orden vigente → guarda al comprador, crea el PaymentIntent con el importe de la BD y devuelve el clientSecret", async () => {
    const orderId = await reserve(2);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({ id: "pi_test_1", client_secret: "pi_test_1_secret" } as never);

    expect(await createOrderPayment(orderId, BUYER, sessionUserId)).toEqual({ ok: true, clientSecret: "pi_test_1_secret" });

    const order = await readOrder(orderId);
    expect(stripe.paymentIntents.create).toHaveBeenCalledExactlyOnceWith(
      {
        amount: 10000,
        currency: "pen",
        allowed_payment_method_types: ["card"],
        description: `Mentec Tickets ${order.code}`,
        metadata: { order_id: orderId },
      },
      { idempotencyKey: orderId },
    );
    expect(order).toMatchObject({
      status: "pending",
      buyerName: "Ana Quispe",
      buyerEmail: "ana.quispe@correo.pe",
      buyerPhone: "+51912345678",
      buyerDocumentType: "dni",
      buyerDocumentNumber: "12345678",
      userId: sessionUserId,
      stripePaymentIntentId: "pi_test_1",
    });
  });

  it("segundo intento → misma idempotencyKey e iguales parámetros; conserva el user_id ya asignado", async () => {
    const orderId = await reserve(1);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({ id: "pi_test_2", client_secret: "pi_test_2_secret" } as never);

    await createOrderPayment(orderId, BUYER, sessionUserId);
    const second = await createOrderPayment(orderId, { ...BUYER, firstName: "Luisa" }, null);

    expect(second).toEqual({ ok: true, clientSecret: "pi_test_2_secret" });
    const [first, retry] = vi.mocked(stripe.paymentIntents.create).mock.calls;
    expect(retry).toEqual(first);
    expect(retry[1]).toEqual({ idempotencyKey: orderId });
    expect(await readOrder(orderId)).toMatchObject({ buyerName: "Luisa Quispe", userId: sessionUserId });
  });

  it("invitado → user_id queda nulo", async () => {
    const orderId = await reserve(1);
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue({ id: "pi_test_3", client_secret: "pi_test_3_secret" } as never);

    await createOrderPayment(orderId, BUYER, null);

    expect((await readOrder(orderId)).userId).toBeNull();
  });

  it("orden vencida → order-expired sin Stripe ni comprador", async () => {
    const orderId = await reserve(1);
    await db.update(orders).set({ expiresAt: sql`now() - interval '1 second'` }).where(eq(orders.id, orderId));

    expect(await createOrderPayment(orderId, BUYER, null)).toEqual({ ok: false, error: "order-expired" });
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect((await readOrder(orderId)).buyerEmail).toBeNull();
  });

  it("orden pagada o inexistente → order-unavailable sin Stripe", async () => {
    const orderId = await reserve(1);
    await db
      .update(orders)
      .set({
        status: "paid",
        paidAt: sql`now()`,
        buyerName: "Otra Persona",
        buyerEmail: "otra@example.com",
        buyerPhone: "+51987654321",
        buyerDocumentType: "dni",
        buyerDocumentNumber: "87654321",
      })
      .where(eq(orders.id, orderId));

    expect(await createOrderPayment(orderId, BUYER, null)).toEqual({ ok: false, error: "order-unavailable" });
    expect(await createOrderPayment(randomUUID(), BUYER, null)).toEqual({ ok: false, error: "order-unavailable" });
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect((await readOrder(orderId)).buyerEmail).toBe("otra@example.com");
  });

  it("Stripe lanza → payment-error, log con type/code sin datos del comprador", async () => {
    const orderId = await reserve(1);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(stripe.paymentIntents.create).mockRejectedValue(
      new Stripe.errors.StripeAPIError({ type: "api_error", code: "resource_missing", message: "boom" }),
    );

    expect(await createOrderPayment(orderId, BUYER, null)).toEqual({ ok: false, error: "payment-error" });
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), { orderId, type: "StripeAPIError", code: "resource_missing" });
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/correo|Quispe|912345678/i);
    expect((await readOrder(orderId)).stripePaymentIntentId).toBeNull();
    consoleError.mockRestore();
  });
});
