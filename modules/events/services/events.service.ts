import { and, count, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers } from "@/lib/db/schema/identity";
import { venues } from "@/lib/db/schema/venues";
import { eventDetailSchema, eventSchema } from "../schemas/events.schema";
import type { EventDetail } from "../types/events.types";
import { toEvent, toEventDetail } from "../utils/eventRecords";

/** Lugar libre: `available`, o `held` con la retención vencida. */
const availableSeats = sql<number>`count(${eventSeats.id}) filter (where ${eventSeats.status} = 'available' or (${eventSeats.status} = 'held' and ${eventSeats.heldUntil} < now()))`.mapWith(Number);

/** Lugares en inventario de cada tipo (sin retirados). Va en el join, no en el `where`, para no perder tipos sin lugares. */
const inventorySeatsJoin = and(eq(eventSeats.ticketTypeId, ticketTypes.id), isNull(eventSeats.retiredAt));

// Incluye los campos del detalle: getEvents los descarta en `toEvent` (12 filas; no compensa otra consulta).
const eventFields = {
  id: events.id,
  slug: events.slug,
  title: events.title,
  category: categories.slug,
  startsAt: events.startsAt,
  venue: venues.name,
  city: venues.city,
  imageUrl: events.imageUrl,
  featured: events.featured,
  priceFromCents: sql<number>`min(${ticketTypes.priceCents})`.mapWith(Number),
  totalSeats: count(eventSeats.id),
  availableSeats,
  description: events.description,
  address: venues.address,
  doorsOpenAt: events.doorsOpenAt,
  minAge: events.minAge,
  organizer: organizers.legalName,
};

/** Eventos publicados con sus conteos de `event_seats`, en el orden del catálogo (Decisión 13). */
function selectPublishedEvents(where?: SQL) {
  return db
    .select(eventFields)
    .from(events)
    .innerJoin(categories, eq(categories.id, events.categoryId))
    .innerJoin(venues, eq(venues.id, events.venueId))
    .innerJoin(organizers, eq(organizers.userId, events.organizerId))
    .innerJoin(ticketTypes, eq(ticketTypes.eventId, events.id))
    .leftJoin(eventSeats, inventorySeatsJoin)
    .where(and(eq(events.status, "published"), where))
    .groupBy(events.id, categories.id, venues.id, organizers.userId)
    .orderBy(events.createdAt, events.id);
}

export async function getEvents() {
  const records = await selectPublishedEvents();
  return eventSchema.array().parse(records.map(toEvent));
}

export async function getFeaturedEvents() {
  const events = await getEvents();
  return events.filter((event) => event.featured);
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const [record] = await selectPublishedEvents(eq(events.slug, slug));
  if (!record) return null;

  const types = await db
    .select({
      slug: ticketTypes.slug,
      name: ticketTypes.name,
      description: ticketTypes.description,
      priceCents: ticketTypes.priceCents,
      totalSeats: count(eventSeats.id),
      availableSeats,
    })
    .from(ticketTypes)
    .leftJoin(eventSeats, inventorySeatsJoin)
    .where(eq(ticketTypes.eventId, record.id))
    .groupBy(ticketTypes.id)
    .orderBy(ticketTypes.sortOrder);

  return eventDetailSchema.parse(toEventDetail(record, types));
}

// Misma categoría primero, luego el resto; cada grupo por fecha.
export async function getRelatedEvents(slug: string, limit = 4) {
  const events = await getEvents();
  const category = events.find((event) => event.slug === slug)?.category;
  return events
    .filter((event) => event.slug !== slug)
    .sort(
      (a, b) =>
        Number(b.category === category) - Number(a.category === category) ||
        Date.parse(a.startsAt) - Date.parse(b.startsAt),
    )
    .slice(0, limit);
}
