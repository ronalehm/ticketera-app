import { formatSeatId, formatSeatLabel } from "@/modules/seating/seats";
import type { CheckoutOrder, CheckoutOrderItem } from "../types/checkout.types";

/** Lugar de un `event_seat`: `null` en zonas generales. */
type SeatPlace = { sectionSlug: string | null; rowLabel: string | null; number: number | null };

/** Asiento retenido por una orden `pending`, ya ordenado por tipo (`sort_order`), fila y número. */
export type PendingSeatRow = SeatPlace & { ticketTypeSlug: string; ticketTypeName: string; priceCents: number };

/** Pedido del checkout desde los asientos de una orden: una línea por tipo, en el orden recibido. */
export function buildPendingCheckoutOrder(
  event: CheckoutOrder["event"],
  seats: PendingSeatRow[],
  subtotalCents: number,
): CheckoutOrder {
  const items: CheckoutOrderItem[] = [];
  for (const seat of seats) {
    let item = items.find((candidate) => candidate.ticketTypeId === seat.ticketTypeSlug);
    if (!item) {
      item = { ticketTypeId: seat.ticketTypeSlug, name: seat.ticketTypeName, unitPrice: seat.priceCents / 100, quantity: 0 };
      items.push(item);
    }
    item.quantity += 1;
    const { sectionSlug, rowLabel, number } = seat;
    if (sectionSlug !== null && rowLabel !== null && number !== null) {
      (item.seats ??= []).push({
        id: formatSeatId(sectionSlug, rowLabel, number),
        label: formatSeatLabel(seat.ticketTypeName, rowLabel, number),
      });
    }
  }

  return {
    event,
    items,
    quantities: Object.fromEntries(items.map((item) => [item.ticketTypeId, item.quantity])),
    ticketCount: seats.length,
    total: subtotalCents / 100,
  };
}
