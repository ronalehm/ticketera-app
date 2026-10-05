import type { ManagedEvent } from "@/modules/events";

/** Solo para tests: evento del panel publicado, sin ventas, con `overrides`. */
export function makeManagedEvent(id: string, overrides: Partial<ManagedEvent> = {}): ManagedEvent {
  return {
    id,
    slug: `evento-${id}`,
    title: `Evento ${id}`,
    status: "published",
    startsAt: "2026-11-14T02:00:00.000Z",
    venue: "Estadio Nacional",
    city: "Lima",
    imageUrl: null,
    organizer: `Productora ${id}`,
    sold: 0,
    revenueCents: 0,
    capacity: 100,
    ...overrides,
  };
}
