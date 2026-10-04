import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import type { EventDetail } from "@/modules/events";
import { getEventBySlug } from "@/modules/events/catalog";
import { VENUE_LAYOUTS_MOCK } from "../data/venueMaps.mock";
import { venueLayoutSchema } from "../schemas/seating.schema";
import type { VenueMap, VenueZone } from "../types/seating.types";
import { toVenueLayout } from "../utils/venueLayoutRecords";

/** Libre para vender: disponible, o retenido con la retención vencida. */
const isSeatAvailable = sql<boolean>`(${eventSeats.status} = 'available' OR (${eventSeats.status} = 'held' AND ${eventSeats.heldUntil} < now())) IS TRUE`;

function findLayout(slug: string) {
  return VENUE_LAYOUTS_MOCK.find((layout) => layout.eventSlug === slug);
}

type RawLayout = NonNullable<ReturnType<typeof toVenueLayout>>;

/** Layout del recinto de un evento publicado, sin validar; `null` si no existe o no tiene geometría. */
async function loadLayout(slug: string): Promise<RawLayout | null> {
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

  return toVenueLayout({ eventSlug: slug, ...venue }, zones, seats);
}

/** Valida el layout y completa cada zona con nombre, precio y estado de su tipo de entrada. */
function toVenueMap(rawLayout: RawLayout, event: Pick<EventDetail, "venue" | "ticketTypes">): VenueMap {
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

/** Mapa del recinto con cada zona completada con nombre, precio y estado de su tipo de entrada. */
export async function getVenueMapBySlug(slug: string): Promise<VenueMap | null> {
  const rawLayout = await loadLayout(slug);
  if (!rawLayout) return null;

  const event = await getEventBySlug(slug);
  if (!event) return null;

  return toVenueMap(rawLayout, event);
}

/** Igual que `getVenueMapBySlug`, a partir de un evento ya cargado (no lo vuelve a cargar). */
export async function getVenueMapForEvent(
  event: Pick<EventDetail, "slug" | "venue" | "ticketTypes">,
): Promise<VenueMap | null> {
  const rawLayout = await loadLayout(event.slug);
  return rawLayout && toVenueMap(rawLayout, event);
}

// ponytail: sigue leyendo el mock porque es síncrono (Decisión 9); pasarlo a la BD en F5.
export function hasVenueMap(slug: string): boolean {
  return findLayout(slug) !== undefined;
}
