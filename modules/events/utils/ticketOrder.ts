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

const QUANTITY_PATTERN = /^\d+$/;

export function parsePreselectedQuantities(
  ticketTypes: Pick<TicketType, "id" | "status">[],
  params: Pick<URLSearchParams, "getAll">,
) {
  const quantities: Record<string, number> = {};
  let remaining = MAX_TICKETS_PER_ORDER;
  for (const type of ticketTypes) {
    if (type.status === "sold-out" || remaining === 0) continue;
    const values = params.getAll(type.id);
    if (values.length !== 1 || !QUANTITY_PATTERN.test(values[0])) continue;
    const quantity = Number(values[0]);
    if (quantity < 1 || quantity > MAX_TICKETS_PER_ORDER) continue;
    quantities[type.id] = Math.min(quantity, remaining);
    remaining -= quantities[type.id];
  }
  return quantities;
}
