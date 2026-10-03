import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { getEventBySlug } from "@/modules/events";
import { VENUE_LAYOUTS_MOCK } from "../data/venueMaps.mock";
import { venueLayoutSchema } from "../schemas/seating.schema";
import type { VenueMap, VenueZone } from "../types/seating.types";
import { toVenueLayout } from "../utils/venueLayoutRecords";

/** Libre para vender: disponible, o retenido con la retención vencida. */
const isSeatAvailable = sql<boolean>`(${eventSeats.status} = 'available' OR (${eventSeats.status} = 'held' AND ${eventSeats.heldUntil} < now())) IS TRUE`;

/** Mapa del recinto con cada zona completada con nombre, precio y estado de su tipo de entrada. */
export async function getVenueMapBySlug(slug: string): Promise<VenueMap | null> {
  const [venue] = await db
    .select({ eventId: events.id, mapViewBox: venues.mapViewBox, stage: venues.stage })
    .from(events)
    .innerJoin(venues, eq(venues.id, events.venueId))
    .where(and(eq(events.slug, slug), eq(events.status, "published")));
  if (!venue) return null;

  const [zones, seats] = await Promise.all([
    db
      .select({
        sectionSlug: venueSections.slug,
        ticketTypeSlug: ticketTypes.slug,
        seating: venueSections.seating,
        capacity: venueSections.capacity,
        mapPath: venueSections.mapPath,
        labelX: venueSections.labelX,
        labelY: venueSections.labelY,
        seatViewBox: venueSections.seatViewBox,
      })
      .from(ticketTypes)
      .innerJoin(venueSections, eq(venueSections.id, ticketTypes.sectionId))
      .where(eq(ticketTypes.eventId, venue.eventId))
      .orderBy(venueSections.sortOrder),
    db
      .select({
        sectionSlug: venueSections.slug,
        rowLabel: venueSeats.rowLabel,
        number: venueSeats.number,
        x: venueSeats.x,
        y: venueSeats.y,
        accessible: venueSeats.accessible,
        available: isSeatAvailable,
      })
      .from(eventSeats)
      .innerJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
      .innerJoin(venueSections, eq(venueSections.id, venueSeats.sectionId))
      .where(eq(eventSeats.eventId, venue.eventId))
      .orderBy(sql`length(${venueSeats.rowLabel})`, venueSeats.rowLabel, venueSeats.number),
  ]);

  const rawLayout = toVenueLayout({ eventSlug: slug, ...venue }, zones, seats);
  if (!rawLayout) return null;

  const event = await getEventBySlug(slug);
  if (!event) return null;

  const { zones: layoutZones, ...layout } = venueLayoutSchema.parse(rawLayout);
  return {
    ...layout,
    venue: event.venue,
    zones: layoutZones.map((zone): VenueZone => {
      const ticketType = event.ticketTypes.find((type) => type.id === zone.ticketTypeId);
      if (!ticketType) {
        throw new Error(`La zona ${zone.id} apunta a un tipo de entrada inexistente: ${zone.ticketTypeId}`);
      }
      return { ...zone, name: ticketType.name, price: ticketType.price, status: ticketType.status };
    }),
  };
}

// ponytail: sigue leyendo el mock porque es síncrono (Decisión 9); pasarlo a la BD en F5.
export function hasVenueMap(slug: string): boolean {
  return VENUE_LAYOUTS_MOCK.some((layout) => layout.eventSlug === slug);
}
