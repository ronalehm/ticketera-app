import type { DashboardKpis, OrganizerEvent, OrganizerEventFilter } from "../types/organizer.types";

const countFormatter = new Intl.NumberFormat("es-PE");

// Aproximación de maqueta (Decisión 10): ingresos = vendidas × precio desde. Un borrador no ha vendido nada.
export function getEventRevenue(event: OrganizerEvent): number {
  if (event.status === "draft") return 0;
  return event.sold * (event.priceFrom ?? 0);
}

export function getDashboardKpis(events: OrganizerEvent[]): DashboardKpis {
  return events.reduce<DashboardKpis>(
    (kpis, event) => ({
      revenue: kpis.revenue + getEventRevenue(event),
      ticketsSold: kpis.ticketsSold + event.sold,
      publishedCount: kpis.publishedCount + (event.status === "published" ? 1 : 0),
    }),
    { revenue: 0, ticketsSold: 0, publishedCount: 0 },
  );
}

/** Porcentaje entero de 0 a 100; con capacidad 0 devuelve 0. */
export function getSoldPercentage(sold: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((sold / capacity) * 100));
}

export function filterOrganizerEvents(events: OrganizerEvent[], filter: OrganizerEventFilter): OrganizerEvent[] {
  if (filter === "all") return events;
  return events.filter((event) => event.status === filter);
}

export function formatCount(n: number): string {
  return countFormatter.format(n);
}
