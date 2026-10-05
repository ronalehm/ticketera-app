import "server-only";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { eventSeats, ticketTypes } from "@/lib/db/schema/events";
import { orders, stripeEvents, tickets } from "@/lib/db/schema/sales";
import { venueSeats } from "@/lib/db/schema/venues";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

const orderIdSchema = z.uuid();

/**
 * Webhook de Stripe. Firma ausente o inválida → 400; otro tipo de evento → 200 sin cambios.
 * `payment_intent.succeeded` se procesa en una transacción junto con su registro en `stripe_events`
 * (idempotencia): emite las entradas si la orden conserva todos sus asientos o la reembolsa al 100 %.
 * Lanza en errores inesperados (rollback, también del registro del evento → 500 y Stripe reintenta).
 */
export async function handleStripeWebhook(
  payload: string,
  signature: string | null,
  database = db,
): Promise<{ status: 200 | 400 }> {
  if (!signature) return { status: 400 };
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) return { status: 400 };
    // Solo `name`: el `message` puede citar el payload.
    console.error("Webhook de Stripe ilegible", { error: error instanceof Error ? error.name : typeof error });
    throw error;
  }
  if (event.type !== "payment_intent.succeeded") return { status: 200 };

  const paymentIntent = event.data.object;
  const metadataOrderId = paymentIntent.metadata?.order_id;
  const ids = { eventId: event.id, paymentIntentId: paymentIntent.id, orderId: metadataOrderId };

  try {
    await database.transaction(async (tx) => {
      // Si otro proceso ya registró el evento, este INSERT espera a su commit y no inserta.
      const inserted = await tx
        .insert(stripeEvents)
        .values({ id: event.id, type: event.type, processedAt: sql`now()` })
        .onConflictDoNothing()
        .returning({ id: stripeEvents.id });
      if (inserted.length === 0) return;

      const orderId = orderIdSchema.safeParse(metadataOrderId);
      const [order] = orderId.success
        ? await tx.select().from(orders).where(eq(orders.id, orderId.data)).for("update")
        : [];
      if (
        !order ||
        order.stripePaymentIntentId !== paymentIntent.id ||
        order.subtotalCents !== paymentIntent.amount ||
        order.currency.toLowerCase() !== paymentIntent.currency
      ) {
        console.error("Webhook de Stripe sin orden que coincida", ids);
        return;
      }
      if (order.status !== "pending" && order.status !== "expired") return;

      const seats = await tx
        .select({ id: eventSeats.id, unitPriceCents: ticketTypes.priceCents })
        .from(eventSeats)
        .innerJoin(ticketTypes, eq(ticketTypes.id, eventSeats.ticketTypeId))
        .leftJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
        .where(and(eq(eventSeats.orderId, order.id), eq(eventSeats.status, "held")))
        .orderBy(
          ticketTypes.sortOrder,
          sql`length(${venueSeats.rowLabel})`,
          venueSeats.rowLabel,
          venueSeats.number,
          eventSeats.id,
        )
        // `OF event_seats`: Postgres no bloquea el lado nullable de un LEFT JOIN.
        .for("update", { of: eventSeats });

      // Una orden `expired` nunca se emite, aunque conserve sus asientos (decisión 18 / requisito 10).
      if (order.status === "pending" && seats.length === order.ticketCount) {
        await tx
          .update(eventSeats)
          .set({ status: "sold", heldUntil: null })
          .where(inArray(eventSeats.id, seats.map((seat) => seat.id)));
        await tx.insert(tickets).values(
          seats.map((seat, index) => ({
            orderId: order.id,
            eventSeatId: seat.id,
            code: `${order.code}-${String(index + 1).padStart(2, "0")}`,
            // createOrderPayment guarda al comprador antes de crear el PaymentIntent.
            holderName: order.buyerName!,
            unitPriceCents: seat.unitPriceCents,
            qrToken: randomBytes(16).toString("base64url"),
          })),
        );
        await tx.update(orders).set({ status: "paid", paidAt: sql`now()` }).where(eq(orders.id, order.id));
        return;
      }

      await tx
        .update(eventSeats)
        .set({ status: "available", orderId: null, heldUntil: null })
        .where(and(eq(eventSeats.orderId, order.id), eq(eventSeats.status, "held")));
      // ponytail: la llamada a Stripe mantiene el lock de la orden (~1 s), solo si perdió asientos; mover a un job si molesta.
      // Antes del commit: si algo falla después, el reintento repite la misma clave y Stripe no duplica el reembolso.
      try {
        await stripe.refunds.create({ payment_intent: paymentIntent.id }, { idempotencyKey: `refund-${order.id}` });
      } catch (error) {
        // Reintento pasadas las 24 h de la clave de idempotencia: el reembolso ya está hecho.
        if (!(error instanceof Stripe.errors.StripeError && error.code === "charge_already_refunded")) throw error;
      }
      await tx.update(orders).set({ status: "refunded" }).where(eq(orders.id, order.id));
    });
  } catch (error) {
    // Sin `message`: el de Drizzle incluye los parámetros de la consulta (datos del comprador).
    const code = (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code;
    console.error("Webhook de Stripe fallido", { ...ids, error: error instanceof Error ? error.name : typeof error, code });
    throw error;
  }
  return { status: 200 };
}
