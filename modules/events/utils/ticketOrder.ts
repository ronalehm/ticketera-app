import type { TicketType } from "../types/events.types";

export const MAX_TICKETS_PER_ORDER = 10;

export function getOrderTotal(ticketTypes: Pick<TicketType, "id" | "price">[], quantities: Record<string, number>) {
  return ticketTypes.reduce((total, type) => total + type.price * (quantities[type.id] ?? 0), 0);
}

export function getTicketCount(quantities: Record<string, number>) {
  return Object.values(quantities).reduce((count, quantity) => count + quantity, 0);
}

export function buildCheckoutHref(slug: string, quantities: Record<string, number>) {
  const params = new URLSearchParams({ evento: slug });
  for (const [id, quantity] of Object.entries(quantities)) {
    if (quantity > 0) params.append(id, String(quantity));
  }
  return `/checkout?${params}`;
}
