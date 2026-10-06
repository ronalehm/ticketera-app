import type { ManagedEvent } from "@/modules/events";
import { formatEventPrice } from "@/modules/events/format";

import type { DashboardKpis } from "../types/organizer.types";

/** Suma ingresos y vendidas (ya calculados en la BD con órdenes `paid`) y cuenta los publicados. */
export function getDashboardKpis(events: ManagedEvent[]): DashboardKpis {
  return events.reduce<DashboardKpis>(
    (kpis, event) => ({
      revenueCents: kpis.revenueCents + event.revenueCents,
      ticketsSold: kpis.ticketsSold + event.sold,
      publishedCount: kpis.publishedCount + (event.status === "published" ? 1 : 0),
    }),
    { revenueCents: 0, ticketsSold: 0, publishedCount: 0 },
  );
}

/** Porcentaje entero de 0 a 100; con capacidad 0 devuelve 0. */
export function getSoldPercentage(sold: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((sold / capacity) * 100));
}

/** Céntimos → "S/ 1,234.50". */
export function formatRevenue(cents: number): string {
  return formatEventPrice(cents / 100);
}
