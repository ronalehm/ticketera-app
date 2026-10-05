import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { orders, tickets } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { stripe } from "@/lib/stripe";
import type { EventCategory } from "@/modules/events";
import type { CheckoutOrder, OrderConfirmationResult, PendingCheckoutResult } from "../types/checkout.types";
import { getConfirmationState } from "../utils/orderRules";
import { buildOrderView, buildPendingCheckoutOrder } from "../utils/orderViews";

const orderIdSchema = z.uuid();

/** Columnas nullable solo en `draft`: una orden de un evento publicado nunca las trae `null`. */
function required<T>(value: T | null, slug: string): T {
  if (value === null) throw new Error(`Evento incompleto en una orden: ${slug}`);
  return value;
}

/**
 * Orden con su evento. Los asientos de una orden real nunca están retirados (`retired_at`: el seed solo retira
 * lugares sin retener y sin pedido real), así que aquí no se filtran.
 */
async function selectOrderWithEvent(database: typeof db, orderId: string) {
  const [row] = await database
    .select({
      status: orders.status,
      code: orders.code,
      subtotalCents: orders.subtotalCents,
      remainingMs: sql<number>`extract(epoch from (${orders.expiresAt} - now())) * 1000`.mapWith(Number),
      paidAt: orders.paidAt,
      buyerName: orders.buyerName,
      buyerEmail: orders.buyerEmail,
      stripePaymentIntentId: orders.stripePaymentIntentId,
      slug: events.slug,
      title: events.title,
      category: categories.slug,
      startsAt: events.startsAt,
      venue: venues.name,
      city: venues.city,
      imageUrl: events.imageUrl,
    })
    .from(orders)
    .innerJoin(events, eq(events.id, orders.eventId))
    .innerJoin(categories, eq(categories.id, events.categoryId))
    .innerJoin(venues, eq(venues.id, events.venueId))
    .where(eq(orders.id, orderId));
  return row;
}

type OrderWithEvent = NonNullable<Awaited<ReturnType<typeof selectOrderWithEvent>>>;

function toEventView(row: OrderWithEvent): CheckoutOrder["event"] {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category as EventCategory,
    startsAt: required(row.startsAt, row.slug).toISOString(),
    venue: row.venue,
    city: row.city,
    imageUrl: required(row.imageUrl, row.slug),
  };
}

/**
 * Orden `pending` vigente de `/checkout?orden=<uuid>` con su pedido leído de la BD. `remainingMs` sale del reloj
 * de la BD. Id inválido o inexistente → `not-found`; vencida o `expired` → `expired`; pagada o reembolsada → `closed`.
 */
export async function getPendingCheckout(orderId: unknown, database = db): Promise<PendingCheckoutResult> {
  const id = orderIdSchema.safeParse(orderId);
  if (!id.success) return { status: "not-found" };

  const row = await selectOrderWithEvent(database, id.data);
  if (!row) return { status: "not-found" };
  if (row.status !== "pending" && row.status !== "expired") return { status: "closed", orderId: id.data };
  if (row.status === "expired" || row.remainingMs <= 0) return { status: "expired", eventSlug: row.slug };

  const seats = await database
    .select({
      sectionSlug: venueSections.slug,
      rowLabel: venueSeats.rowLabel,
      number: venueSeats.number,
      ticketTypeSlug: ticketTypes.slug,
      ticketTypeName: ticketTypes.name,
      priceCents: ticketTypes.priceCents,
    })
    .from(eventSeats)
    .innerJoin(ticketTypes, eq(ticketTypes.id, eventSeats.ticketTypeId))
    .leftJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
    .leftJoin(venueSections, eq(venueSections.id, venueSeats.sectionId))
    .where(eq(eventSeats.orderId, id.data))
    .orderBy(ticketTypes.sortOrder, sql`length(${venueSeats.rowLabel})`, venueSeats.rowLabel, venueSeats.number, eventSeats.id);

  return {
    status: "ok",
    orderId: id.data,
    amountCents: row.subtotalCents,
    remainingMs: Math.floor(row.remainingMs),
    order: buildPendingCheckoutOrder(toEventView(row), seats, row.subtotalCents),
  };
}

/** Estado del PaymentIntent en Stripe; sin id o si Stripe falla, `null` (cuenta como pago no completado). */
async function retrievePaymentIntentStatus(paymentIntentId: string | null) {
  if (!paymentIntentId) return null;
  try {
    return (await stripe.paymentIntents.retrieve(paymentIntentId)).status;
  } catch (error) {
    console.error("No se pudo consultar el PaymentIntent", { paymentIntentId, error: error instanceof Error ? error.name : typeof error });
    return null;
  }
}

/**
 * Confirmación de `/checkout/confirmacion?orden=<uuid>`: el estado sale de la BD y, si la orden sigue `pending`,
 * del PaymentIntent (el webhook puede no haber llegado). `paid` trae la vista `Order` con sus entradas.
 */
export async function getOrderConfirmation(orderId: unknown, database = db): Promise<OrderConfirmationResult> {
  const id = orderIdSchema.safeParse(orderId);
  if (!id.success) return { status: "not-found" };

  const row = await selectOrderWithEvent(database, id.data);
  if (!row) return { status: "not-found" };

  const paymentIntentStatus = row.status === "pending" ? await retrievePaymentIntentStatus(row.stripePaymentIntentId) : null;
  const state = getConfirmationState({ status: row.status, isExpired: row.remainingMs <= 0 }, paymentIntentStatus);

  if (state === "refunded" || state === "expired") return { status: state, eventSlug: row.slug };
  if (state === "payment-failed") return { status: state, orderId: id.data };
  if (state !== "paid") return { status: "processing" };

  const ticketRows = await database
    .select({
      code: tickets.code,
      holderName: tickets.holderName,
      unitPriceCents: tickets.unitPriceCents,
      sectionSlug: venueSections.slug,
      rowLabel: venueSeats.rowLabel,
      number: venueSeats.number,
      ticketTypeSlug: ticketTypes.slug,
      ticketTypeName: ticketTypes.name,
    })
    .from(tickets)
    .innerJoin(eventSeats, eq(eventSeats.id, tickets.eventSeatId))
    .innerJoin(ticketTypes, eq(ticketTypes.id, eventSeats.ticketTypeId))
    .leftJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
    .leftJoin(venueSections, eq(venueSections.id, venueSeats.sectionId))
    .where(eq(tickets.orderId, id.data))
    .orderBy(sql`length(${tickets.code})`, tickets.code);

  const order = {
    code: row.code,
    // `paid` siempre tiene `paid_at` (webhook) y comprador (`orders_buyer_required_check`).
    paidAt: row.paidAt!,
    buyerName: row.buyerName!,
    buyerEmail: row.buyerEmail!,
    subtotalCents: row.subtotalCents,
  };
  return { status: "paid", order: buildOrderView(order, toEventView(row), ticketRows) };
}
