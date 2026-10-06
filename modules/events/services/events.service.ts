import { and, count, eq, gte, isNull, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
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
  categoryName: categories.name,
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

/** Lo destacado en la portada de la landing (Hero y rail): como máximo 5 (Decisión 12). */
export const FEATURED_EVENTS_LIMIT = 5;

type PublishedEventsQuery = { where?: SQL; orderBy?: (AnyPgColumn | SQL)[]; limit?: number };

/** Eventos publicados con sus conteos de `event_seats`; por defecto en el orden del catálogo (Decisión 13). */
function selectPublishedEvents({ where, orderBy = [events.createdAt, events.id], limit }: PublishedEventsQuery = {}) {
  const query = db
    .select(eventFields)
    .from(events)
    .innerJoin(categories, eq(categories.id, events.categoryId))
    .innerJoin(venues, eq(venues.id, events.venueId))
    .innerJoin(organizers, eq(organizers.userId, events.organizerId))
    .innerJoin(ticketTypes, eq(ticketTypes.eventId, events.id))
    .leftJoin(eventSeats, inventorySeatsJoin)
    .where(and(eq(events.status, "published"), where))
    .groupBy(events.id, categories.id, venues.id, organizers.userId)
    .orderBy(...orderBy)
    .$dynamic();
  return limit === undefined ? query : query.limit(limit);
}

const byStartsAt = [events.startsAt, events.id];

export async function getEvents() {
  const records = await selectPublishedEvents();
  return eventSchema.array().parse(records.map(toEvent));
}

/** Destacados publicados que aún no empiezan, por fecha, hasta `FEATURED_EVENTS_LIMIT` (Hero y rail de la landing). */
export async function getFeaturedEvents({ now = new Date() }: { now?: Date } = {}) {
  const records = await selectPublishedEvents({
    where: and(eq(events.featured, true), gte(events.startsAt, now)),
    orderBy: byStartsAt,
    limit: FEATURED_EVENTS_LIMIT,
  });
  return eventSchema.array().parse(records.map(toEvent));
}

/** Publicados que aún no empiezan, por fecha (solo la landing; `/eventos` sigue con `getEvents`). */
export async function getUpcomingEvents({ now = new Date() }: { now?: Date } = {}) {
  const records = await selectPublishedEvents({ where: gte(events.startsAt, now), orderBy: byStartsAt });
  return eventSchema.array().parse(records.map(toEvent));
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const [record] = await selectPublishedEvents({ where: eq(events.slug, slug) });
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
