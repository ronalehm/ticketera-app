import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import type { EventCategory } from "@/modules/events";
import type { PendingCheckoutResult } from "../types/checkout.types";
import { buildPendingCheckoutOrder } from "../utils/orderViews";

const orderIdSchema = z.uuid();

/** Columnas nullable solo en `draft`: una orden de un evento publicado nunca las trae `null`. */
function required<T>(value: T | null, slug: string): T {
  if (value === null) throw new Error(`Evento incompleto en una orden: ${slug}`);
  return value;
}

/**
 * Orden `pending` vigente de `/checkout?orden=<uuid>` con su pedido leído de la BD. `remainingMs` sale del reloj
 * de la BD. Id inválido, inexistente o en otro estado → `not-found` (`closed` llega en F4); vencida → `expired`.
 */
export async function getPendingCheckout(orderId: unknown, database = db): Promise<PendingCheckoutResult> {
  const id = orderIdSchema.safeParse(orderId);
  if (!id.success) return { status: "not-found" };

  const [row] = await database
    .select({
      status: orders.status,
      subtotalCents: orders.subtotalCents,
      remainingMs: sql<number>`extract(epoch from (${orders.expiresAt} - now())) * 1000`.mapWith(Number),
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
    .where(eq(orders.id, id.data));

  if (!row || (row.status !== "pending" && row.status !== "expired")) return { status: "not-found" };
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

  const event = {
    slug: row.slug,
    title: row.title,
    category: row.category as EventCategory,
    startsAt: required(row.startsAt, row.slug).toISOString(),
    venue: row.venue,
    city: row.city,
    imageUrl: required(row.imageUrl, row.slug),
  };

  return {
    status: "ok",
    orderId: id.data,
    amountCents: row.subtotalCents,
    remainingMs: Math.floor(row.remainingMs),
    order: buildPendingCheckoutOrder(event, seats, row.subtotalCents),
  };
}
