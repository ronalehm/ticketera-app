import { EVENTS_MOCK } from "../data/events.mock";
import { eventSchema } from "../schemas/events.schema";

// Mock por ahora: se reemplazará por la llamada a la API sin cambiar la firma.
export async function getEvents() {
  return eventSchema.array().parse(EVENTS_MOCK);
}

export async function getFeaturedEvents() {
  const events = await getEvents();
  return events.filter((event) => event.featured);
}
