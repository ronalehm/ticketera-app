import type { Order } from "@/modules/checkout/orders";
import type { OrdersByTimeframe } from "../types/tickets.types";

const byCreatedAtDesc = (a: Order, b: Order) => Date.parse(b.createdAt) - Date.parse(a.createdAt);
const startsAt = (order: Order) => Date.parse(order.event.startsAt);

/**
 * Próximas (`startsAt >= now`, por fecha ascendente) y pasadas (por fecha descendente);
 * empate por `createdAt` descendente. No muta la entrada.
 */
export function splitOrdersByDate(orders: readonly Order[], now: Date): OrdersByTimeframe {
  const nowTime = now.getTime();
  const upcoming = orders
    .filter((order) => startsAt(order) >= nowTime)
    .sort((a, b) => startsAt(a) - startsAt(b) || byCreatedAtDesc(a, b));
  const past = orders
    .filter((order) => startsAt(order) < nowTime)
    .sort((a, b) => startsAt(b) - startsAt(a) || byCreatedAtDesc(a, b));
  return { upcoming, past };
}

/** 1 → "1 entrada", 3 → "3 entradas". */
export function formatTicketCount(count: number): string {
  return `${count} ${count === 1 ? "entrada" : "entradas"}`;
}

/** Nombres únicos de las zonas, en orden: "General, VIP". */
export function formatOrderZones(items: Order["items"]): string {
  return [...new Set(items.map((item) => item.name))].join(", ");
}

const dateChipFormatter = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short" });

/** "2026-11-14T21:00:00-05:00" → `{ month: "NOV", day: "14" }` (zona America/Lima). */
export function getDateChipParts(iso: string): { month: string; day: string } {
  const parts = dateChipFormatter.formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { month: value("month").replace(/\./g, "").toUpperCase(), day: value("day") };
}
