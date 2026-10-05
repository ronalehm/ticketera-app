import "server-only";

import { and, eq, inArray, type SQL, sql, TransactionRollbackError } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers } from "@/lib/db/schema/identity";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections } from "@/lib/db/schema/venues";
import { parseSeatId } from "@/modules/seating/seats";
import type { CheckoutOrder, ReservationResult } from "../types/checkout.types";
import { computeOrderAmounts, RESERVATION_MINUTES } from "../utils/orderRules";

/** Libre para reservar: disponible, o retenido con la retención vencida. */
const isSeatAvailable = sql`(${eventSeats.status} = 'available' OR (${eventSeats.status} = 'held' AND ${eventSeats.heldUntil} < now()))`;

// `now()` es la hora de inicio de la transacción: la orden y sus asientos reciben el mismo instante.
const expiresAtSql = sql`now() + make_interval(mins => ${RESERVATION_MINUTES})`;

type Line = { ticketTypeId: string; priceCents: number; quantity: number; seatIds?: string[] };

/**
 * Crea la orden `pending` y retiene sus asientos en una transacción. `invalid` si el pedido no cuadra con la BD
 * (evento, tipo, `max_per_order` o asiento inexistente); `unavailable` si falta algún lugar libre (rollback).
 */
export async function reserveCheckoutOrder(
  order: CheckoutOrder,
  userId: string | null,
  database = db,
): Promise<ReservationResult> {
  try {
    return await database.transaction(async (tx): Promise<ReservationResult> => {
      const [event] = await tx
        .select({ id: events.id, commissionBps: organizers.commissionBps })
        .from(events)
        .innerJoin(organizers, eq(organizers.userId, events.organizerId))
        .where(eq(events.slug, order.event.slug));
      if (!event) return { status: "invalid" };

      const types = await tx
        .select({ id: ticketTypes.id, slug: ticketTypes.slug, priceCents: ticketTypes.priceCents, maxPerOrder: ticketTypes.maxPerOrder })
        .from(ticketTypes)
        .where(eq(ticketTypes.eventId, event.id));

      const lines: Line[] = [];
      for (const item of order.items) {
        const type = types.find((candidate) => candidate.slug === item.ticketTypeId);
        if (!type || item.quantity < 1 || item.quantity > type.maxPerOrder) return { status: "invalid" };
        const line: Line = { ticketTypeId: type.id, priceCents: type.priceCents, quantity: item.quantity };
        if (item.seats) {
          const seatIds = await findNumberedSeatIds(tx, event.id, type.id, item.seats.map((seat) => seat.id));
          if (!seatIds || seatIds.length !== item.quantity) return { status: "invalid" };
          line.seatIds = seatIds;
        }
        lines.push(line);
      }
      if (lines.length === 0) return { status: "invalid" };

      const amounts = computeOrderAmounts(lines, event.commissionBps);
      const [{ id: orderId }] = await tx
        .insert(orders)
        .values({
          code: sql`'TK-' || nextval('order_code_seq')`,
          eventId: event.id,
          userId,
          status: "pending",
          expiresAt: expiresAtSql,
          ...amounts,
        })
        .returning({ id: orders.id });

      const hold = { status: "held" as const, orderId, heldUntil: expiresAtSql };
      for (const line of lines) {
        // ponytail: dos reservas numeradas cruzadas pueden chocar en deadlock (Postgres aborta una → error genérico);
        // bloquear con `SELECT … ORDER BY id FOR UPDATE` antes si llega a pasar.
        // Generales: SELECT aparte y no `UPDATE … WHERE id IN (SELECT … LIMIT n FOR UPDATE SKIP LOCKED)`, porque
        // Postgres puede reevaluar esa subconsulta por fila y retener más de `n` lugares.
        const candidates =
          line.seatIds ??
          (
            await tx
              .select({ id: eventSeats.id })
              .from(eventSeats)
              .where(and(eq(eventSeats.ticketTypeId, line.ticketTypeId), isSeatAvailable))
              .orderBy(sql`${eventSeats.venueSeatId} NULLS LAST`, eventSeats.id)
              .limit(line.quantity)
              .for("update", { skipLocked: true })
          ).map((seat) => seat.id);
        const taken = await tx
          .update(eventSeats)
          .set(hold)
          .where(and(inArray(eventSeats.id, candidates), eq(eventSeats.ticketTypeId, line.ticketTypeId), isSeatAvailable))
          .returning({ id: eventSeats.id });
        if (taken.length < line.quantity) tx.rollback();
      }

      return { status: "reserved", orderId };
    });
  } catch (error) {
    if (error instanceof TransactionRollbackError) return { status: "unavailable" };
    throw error;
  }
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** `event_seats.id` de los asientos numerados (`<sección>-<fila>-<número>`) del tipo; `null` si falta alguno. */
async function findNumberedSeatIds(
  tx: Transaction,
  eventId: string,
  ticketTypeId: string,
  ids: string[],
): Promise<string[] | null> {
  const places: SQL[] = [];
  for (const id of ids) {
    const place = parseSeatId(id);
    if (!place) return null;
    places.push(sql`(${place.zoneId}, ${place.row}, ${place.number})`);
  }

  // Ids repetidos devuelven menos filas que ids → `null`.
  const rows = await tx
    .select({ id: eventSeats.id })
    .from(eventSeats)
    .innerJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
    .innerJoin(venueSections, eq(venueSections.id, venueSeats.sectionId))
    .where(
      and(
        eq(eventSeats.eventId, eventId),
        eq(eventSeats.ticketTypeId, ticketTypeId),
        inArray(sql`(${venueSections.slug}, ${venueSeats.rowLabel}, ${venueSeats.number})`, places),
      ),
    );
  return rows.length === ids.length ? rows.map((row) => row.id) : null;
}

/** Vence en el acto una orden `pending` y libera sus asientos `held`. Otro estado o inexistente: no hace nada. */
export async function releaseOrder(orderId: string, database = db): Promise<void> {
  await database.transaction(async (tx) => {
    const released = await tx
      .update(orders)
      .set({ expiresAt: sql`now()` })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
      .returning({ id: orders.id });
    if (released.length === 0) return;
    await tx
      .update(eventSeats)
      .set({ status: "available", orderId: null, heldUntil: null })
      .where(and(eq(eventSeats.orderId, orderId), eq(eventSeats.status, "held")));
  });
}
