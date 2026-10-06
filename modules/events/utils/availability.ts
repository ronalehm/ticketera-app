import type { EventStatus } from "../types/events.types";

export const LOW_STOCK_RATIO = 0.1;

/** Estado calculado desde el inventario: agotado sin lugares libres, últimas entradas con ≤ 10 % libre. */
export function getAvailabilityStatus(available: number, total: number): EventStatus {
  if (available === 0) return "sold-out";
  if (available <= total * LOW_STOCK_RATIO) return "low-stock";
  return "available";
}
