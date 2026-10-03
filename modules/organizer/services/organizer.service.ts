// Solo servidor: es el único archivo de organizer que importa valores del barrel de events (Decisión 17).
import { getEvents } from "@/modules/events";
import { ORGANIZER_DRAFTS_MOCK, ORGANIZER_SALES_MOCK } from "../data/organizerEvents.mock";
import { organizerEventSchema } from "../schemas/organizer.schema";
import type { OrganizerEvent } from "../types/organizer.types";

// Mock por ahora: se reemplazará por la llamada a la API sin cambiar la firma.

/** Publicados en el orden de las ventas mock (se omiten los slugs sin evento) y, después, los borradores. */
export async function getOrganizerEvents(): Promise<OrganizerEvent[]> {
  const events = await getEvents();
  const published = ORGANIZER_SALES_MOCK.flatMap(({ slug, sold, capacity }) => {
    const event = events.find((item) => item.slug === slug);
    if (!event) return [];
    const { id, title, category, startsAt, venue, city, imageUrl, priceFrom } = event;
    return [{ id, title, category, startsAt, venue, city, imageUrl, priceFrom, sold, capacity, status: "published" }];
  });
  return organizerEventSchema.array().parse([...published, ...ORGANIZER_DRAFTS_MOCK]);
}
