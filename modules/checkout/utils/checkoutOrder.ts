import { type EventDetail, getOrderTotal, MAX_TICKETS_PER_ORDER } from "@/modules/events";
import { resolveSeats, type VenueMap } from "@/modules/seating/seats";
import { ticketQuantitySchema } from "../schemas/checkout.schema";
import type { CheckoutOrderItem, CheckoutOrderResult } from "../types/checkout.types";

type OrderSeat = NonNullable<CheckoutOrderItem["seats"]>[number];

/** Mapa del evento (o `null` si no tiene) y asientos de `asientos` (`null` si el parámetro es inválido). */
type CheckoutSeating = { map: VenueMap | null; seatIds: string[] | null };

// Params de tipos de entrada (sin `evento`). Cualquier valor inválido o repetido (array) → null.
export function parseTicketQuantities(
  params: Record<string, string | string[] | undefined>,
): Record<string, number> | null {
  const quantities: Record<string, number> = {};
  for (const [id, value] of Object.entries(params)) {
    const parsed = ticketQuantitySchema.safeParse(value);
    if (!parsed.success) return null;
    quantities[id] = parsed.data;
  }
  return Object.keys(quantities).length > 0 ? quantities : null;
}

/**
 * Asientos agrupados por `ticketTypeId`, en el orden recibido. `null` si los asientos no son válidos para el
 * pedido: sin mapa no se admiten asientos y, con mapa, cada zona numerada necesita tantos asientos como entradas.
 */
function getSeatsByTicketType(
  quantities: Record<string, number>,
  { map, seatIds }: CheckoutSeating,
): Map<string, OrderSeat[]> | null {
  if (seatIds === null) return null;
  if (!map) return seatIds.length === 0 ? new Map() : null;

  const resolved = resolveSeats(map, seatIds);
  if (!resolved) return null;

  const seatsByType = new Map<string, OrderSeat[]>();
  for (const { id, label, ticketTypeId } of resolved) {
    seatsByType.set(ticketTypeId, [...(seatsByType.get(ticketTypeId) ?? []), { id, label }]);
  }
  const countsMatch = map.zones.every(
    (zone) =>
      zone.kind !== "numbered" ||
      (seatsByType.get(zone.ticketTypeId)?.length ?? 0) === (quantities[zone.ticketTypeId] ?? 0),
  );
  return countsMatch ? seatsByType : null;
}

export function buildCheckoutOrder(
  event: EventDetail,
  quantities: Record<string, number> | null,
  seating: CheckoutSeating = { map: null, seatIds: [] },
): CheckoutOrderResult {
  const eventSlug = event.slug;
  if (event.status === "sold-out") return { status: "sold-out", eventSlug };
  if (!quantities) return { status: "invalid-tickets", eventSlug };

  const allValid = Object.entries(quantities).every(([id, quantity]) => {
    const type = event.ticketTypes.find((item) => item.id === id);
    return type !== undefined && type.status !== "sold-out" && Number.isInteger(quantity) && quantity >= 1;
  });
  const ticketCount = Object.values(quantities).reduce((count, quantity) => count + quantity, 0);
  if (!allValid || ticketCount < 1 || ticketCount > MAX_TICKETS_PER_ORDER) {
    return { status: "invalid-tickets", eventSlug };
  }

  const seatsByType = getSeatsByTicketType(quantities, seating);
  if (!seatsByType) return { status: "invalid-tickets", eventSlug };

  const total = getOrderTotal(event.ticketTypes, quantities);
  if (total === 0) return { status: "free", eventSlug };

  const { slug, title, category, startsAt, venue, city, imageUrl } = event;
  return {
    status: "ok",
    order: {
      event: { slug, title, category, startsAt, venue, city, imageUrl },
      items: event.ticketTypes
        .filter((type) => quantities[type.id] !== undefined)
        .map((type): CheckoutOrderItem => {
          const item = { ticketTypeId: type.id, name: type.name, unitPrice: type.price, quantity: quantities[type.id] };
          const seats = seatsByType.get(type.id);
          return seats ? { ...item, seats } : item;
        }),
      quantities,
      ticketCount,
      total,
    },
  };
}
