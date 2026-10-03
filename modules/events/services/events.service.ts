import { EVENTS_MOCK } from "../data/events.mock";
import { eventDetailSchema, eventSchema } from "../schemas/events.schema";
import type { EventDetail } from "../types/events.types";

// Mock por ahora: se reemplazará por la llamada a la API sin cambiar la firma.
export async function getEvents() {
  return eventSchema.array().parse(EVENTS_MOCK);
}

export async function getFeaturedEvents() {
  const events = await getEvents();
  return events.filter((event) => event.featured);
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const event = EVENTS_MOCK.find((item) => item.slug === slug);
  return event ? eventDetailSchema.parse(event) : null;
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
