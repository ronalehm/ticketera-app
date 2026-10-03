import { eventFiltersSchema, type EventFilters } from "../schemas/eventFilters.schema";
import type { Event } from "../types/events.types";

type PriceRange = NonNullable<EventFilters["precio"]>;

const PRICE_MATCHERS: Record<PriceRange, (price: number) => boolean> = {
  gratis: (price) => price === 0,
  "0-50": (price) => price <= 50,
  "50-100": (price) => price > 50 && price <= 100,
  "100-200": (price) => price > 100 && price <= 200,
  "200-mas": (price) => price > 200,
};

// "en-CA" formatea como YYYY-MM-DD, comparable como string con `fecha`.
const limaDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });

function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function parseEventFilters(searchParams: Record<string, string | string[] | undefined>): EventFilters {
  const firstValues = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  return eventFiltersSchema.parse(firstValues);
}

export function filterEvents(events: Event[], { q, ciudad, fecha, precio, categoria }: EventFilters): Event[] {
  const query = q && normalizeText(q);
  return events
    .filter(
      (event) =>
        (!query || [event.title, event.venue, event.city].some((field) => normalizeText(field).includes(query))) &&
        (!ciudad || event.city === ciudad) &&
        (!fecha || limaDateFormatter.format(new Date(event.startsAt)) >= fecha) &&
        (!precio || PRICE_MATCHERS[precio](event.priceFrom)) &&
        (!categoria || event.category === categoria),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function buildEventsHref(filters: EventFilters): string {
  const params = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  const query = params.toString();
  return query ? `/eventos?${query}` : "/eventos";
}
