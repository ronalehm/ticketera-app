import "server-only";

import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema/events";
import { orders } from "@/lib/db/schema/sales";
import { stripe } from "@/lib/stripe";
import type { CheckoutBuyer, PayOrderResult } from "../types/checkout.types";

/**
 * Guarda al comprador en la orden `pending` vigente de un evento publicado y crea su PaymentIntent con el importe de la
 * BD. `idempotencyKey = order.id` con parámetros fijos: reintentar devuelve el mismo PaymentIntent. Una orden de un
 * evento que ya no está publicado (cancelado, finalizado) no se paga: `order-unavailable`.
 */
export async function createOrderPayment(
  orderId: string,
  buyer: CheckoutBuyer,
  sessionUserId: string | null,
  database = db,
): Promise<PayOrderResult> {
  const order = await database.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: orders.id,
        code: orders.code,
        status: orders.status,
        subtotalCents: orders.subtotalCents,
        isExpired: sql<boolean>`${orders.expiresAt} <= now()`,
        eventStatus: events.status,
      })
      .from(orders)
      .innerJoin(events, eq(events.id, orders.eventId))
      .where(eq(orders.id, orderId))
      // Solo la orden: bloquear también el evento serializaría todos los pagos del evento.
      .for("update", { of: orders });
    if (!row || row.status !== "pending" || row.eventStatus !== "published") return "order-unavailable" as const;
    if (row.isExpired) return "order-expired" as const;

    await tx
      .update(orders)
      .set({
        buyerName: `${buyer.firstName} ${buyer.lastName}`,
        buyerEmail: buyer.email.toLowerCase(),
        buyerPhone: `+51${buyer.phone}`,
        buyerDocumentType: buyer.documentType,
        buyerDocumentNumber: buyer.documentNumber,
        userId: sql`COALESCE(${orders.userId}, ${sessionUserId}::uuid)`,
      })
      .where(eq(orders.id, orderId));
    return row;
  });
  if (typeof order === "string") return { ok: false, error: order };

  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create(
      {
        amount: order.subtotalCents,
        currency: "pen",
        // API 2026-09-30 (stripe@23): `payment_method_types` pasó a `allowed_payment_method_types`.
        allowed_payment_method_types: ["card"],
        description: `Mentec Tickets ${order.code}`,
        metadata: { order_id: order.id },
      },
      { idempotencyKey: order.id },
    );
  } catch (error) {
    // Sin datos del comprador en el log.
    const { type, code } = error instanceof Stripe.errors.StripeError ? error : { type: undefined, code: undefined };
    console.error("No se pudo crear el PaymentIntent", { orderId: order.id, type, code });
    return { ok: false, error: "payment-error" };
  }

  await database.update(orders).set({ stripePaymentIntentId: paymentIntent.id }).where(eq(orders.id, order.id));
  // `client_secret` siempre viene en la respuesta de `create` (solo es `null` en listados/objetos expandidos).
  return { ok: true, clientSecret: paymentIntent.client_secret! };
}
