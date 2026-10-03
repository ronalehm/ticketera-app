import { type EventDetail, getOrderTotal, MAX_TICKETS_PER_ORDER } from "@/modules/events";
import { ticketQuantitySchema } from "../schemas/checkout.schema";
import type { CheckoutOrderResult } from "../types/checkout.types";

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

export function buildCheckoutOrder(
  event: EventDetail,
  quantities: Record<string, number> | null,
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

  const total = getOrderTotal(event.ticketTypes, quantities);
  if (total === 0) return { status: "free", eventSlug };

  const { slug, title, startsAt, venue, city, imageUrl } = event;
  return {
    status: "ok",
    order: {
      event: { slug, title, startsAt, venue, city, imageUrl },
      items: event.ticketTypes
        .filter((type) => quantities[type.id] !== undefined)
        .map((type) => ({ ticketTypeId: type.id, name: type.name, unitPrice: type.price, quantity: quantities[type.id] })),
      quantities,
      ticketCount,
      total,
    },
  };
}
