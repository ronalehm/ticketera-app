import { formatSeatId, formatSeatLabel } from "@/modules/seating/seats";
import type { CheckoutOrder, CheckoutOrderItem, Order } from "../types/checkout.types";

/** Lugar de un `event_seat`: `null` en zonas generales. */
type SeatPlace = { sectionSlug: string | null; rowLabel: string | null; number: number | null };

/** Asiento retenido por una orden `pending`, ya ordenado por tipo (`sort_order`), fila y número. */
export type PendingSeatRow = SeatPlace & { ticketTypeSlug: string; ticketTypeName: string; priceCents: number };

/** Entrada emitida de una orden `paid`, ya ordenada por código. */
export type OrderTicketRow = SeatPlace & {
  code: string;
  ticketTypeSlug: string;
  ticketTypeName: string;
  unitPriceCents: number;
  holderName: string;
};

/** Asiento numerado → `{ id, label }`; `null` en zonas generales. */
function toSeat(place: SeatPlace, ticketTypeName: string): { id: string; label: string } | null {
  const { sectionSlug, rowLabel, number } = place;
  if (sectionSlug === null || rowLabel === null || number === null) return null;
  return { id: formatSeatId(sectionSlug, rowLabel, number), label: formatSeatLabel(ticketTypeName, rowLabel, number) };
}

/** Una línea por tipo, en el orden recibido, con sus asientos numerados. */
function groupItems(rows: PendingSeatRow[]): CheckoutOrderItem[] {
  const items: CheckoutOrderItem[] = [];
  for (const row of rows) {
    let item = items.find((candidate) => candidate.ticketTypeId === row.ticketTypeSlug);
    if (!item) {
      item = { ticketTypeId: row.ticketTypeSlug, name: row.ticketTypeName, unitPrice: row.priceCents / 100, quantity: 0 };
      items.push(item);
    }
    item.quantity += 1;
    const seat = toSeat(row, row.ticketTypeName);
    if (seat) (item.seats ??= []).push(seat);
  }
  return items;
}

/** Pedido del checkout desde los asientos de una orden: una línea por tipo, en el orden recibido. */
export function buildPendingCheckoutOrder(
  event: CheckoutOrder["event"],
  seats: PendingSeatRow[],
  subtotalCents: number,
): CheckoutOrder {
  const items = groupItems(seats);

  return {
    event,
    items,
    quantities: Object.fromEntries(items.map((item) => [item.ticketTypeId, item.quantity])),
    ticketCount: seats.length,
    total: subtotalCents / 100,
  };
}

/** Vista `Order` (contrato E) de una orden pagada y sus entradas, para la confirmación, "Mis entradas" y el PDF. */
export function buildOrderView(
  order: { code: string; paidAt: Date; buyerName: string; buyerEmail: string; subtotalCents: number },
  event: CheckoutOrder["event"],
  tickets: OrderTicketRow[],
): Order {
  return {
    code: order.code,
    createdAt: order.paidAt.toISOString(),
    ownerEmail: order.buyerEmail, // F7 lo quita
    event,
    items: groupItems(tickets.map((ticket) => ({ ...ticket, priceCents: ticket.unitPriceCents }))),
    ticketCount: tickets.length,
    total: order.subtotalCents / 100,
    paymentMethod: "card", // F7 lo quita; Stripe solo cobra con tarjeta (decisión 1)
    buyer: { name: order.buyerName, email: order.buyerEmail },
    tickets: tickets.map((ticket) => {
      const seatLabel = toSeat(ticket, ticket.ticketTypeName)?.label;
      return {
        code: ticket.code,
        ticketTypeName: ticket.ticketTypeName,
        ...(seatLabel !== undefined && { seatLabel }),
        holderName: ticket.holderName,
      };
    }),
  };
}
