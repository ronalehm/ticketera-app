import { getEventBySlug } from "@/modules/events";
import { VENUE_LAYOUTS_MOCK } from "../data/venueMaps.mock";
import { venueLayoutSchema } from "../schemas/seating.schema";
import type { VenueMap, VenueZone } from "../types/seating.types";

// Mock por ahora: se reemplazará por la llamada a la API sin cambiar la firma.

/** Mapa del recinto con cada zona completada con nombre, precio y estado de su tipo de entrada. */
export async function getVenueMapBySlug(slug: string): Promise<VenueMap | null> {
  const rawLayout = VENUE_LAYOUTS_MOCK.find((layout) => layout.eventSlug === slug);
  if (!rawLayout) return null;

  const event = await getEventBySlug(slug);
  if (!event) return null;

  const { zones, ...layout } = venueLayoutSchema.parse(rawLayout);
  return {
    ...layout,
    venue: event.venue,
    zones: zones.map((zone): VenueZone => {
      const ticketType = event.ticketTypes.find((type) => type.id === zone.ticketTypeId);
      if (!ticketType) {
        throw new Error(`La zona ${zone.id} apunta a un tipo de entrada inexistente: ${zone.ticketTypeId}`);
      }
      return { ...zone, name: ticketType.name, price: ticketType.price, status: ticketType.status };
    }),
  };
}

export function hasVenueMap(slug: string): boolean {
  return VENUE_LAYOUTS_MOCK.some((layout) => layout.eventSlug === slug);
}
