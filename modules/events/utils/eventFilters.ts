import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "../data/categories";
import { CITIES, PRICE_RANGES } from "../data/searchOptions";
import { eventFiltersSchema, type City, type EventFilters } from "../schemas/eventFilters.schema";
import type { Event, EventCategory } from "../types/events.types";

type PriceRange = NonNullable<EventFilters["precio"]>;
type MultiValueKey = "categoria" | "ciudad";
type MultiValue<K extends MultiValueKey> = NonNullable<EventFilters[K]>[number];

export type FacetCounts = { categoria: Record<EventCategory, number>; ciudad: Record<City, number> };
export type MonthOption = { value: string; label: string };
export type FilterChip = { id: string; label: string; href: string };

const MULTI_VALUE_KEYS: readonly string[] = ["categoria", "ciudad"] satisfies MultiValueKey[];

const PRICE_MATCHERS: Record<PriceRange, (price: number) => boolean> = {
  gratis: (price) => price === 0,
  "0-50": (price) => price <= 50,
  "50-100": (price) => price > 50 && price <= 100,
  "100-200": (price) => price > 100 && price <= 200,
  "200-mas": (price) => price > 200,
};

// "en-CA" formatea como YYYY-MM-DD, comparable como string con `fecha` (y sus 7 primeros caracteres con `mes`).
const limaDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });
const monthNameFormatter = new Intl.DateTimeFormat("es-PE", { month: "long", timeZone: "UTC" });
const chipDateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const limaDate = (event: Event): string => limaDateFormatter.format(new Date(event.startsAt));
const limaMonth = (event: Event): string => limaDate(event).slice(0, 7);

function matchesFilters(event: Event, { q, categoria, ciudad, mes, fecha, precio }: EventFilters): boolean {
  const query = q && normalizeText(q);
  return (
    (!query || [event.title, event.venue, event.city].some((field) => normalizeText(field).includes(query))) &&
    (!categoria || categoria.includes(event.category)) &&
    (!ciudad || ciudad.some((city) => city === event.city)) &&
    (!mes || limaMonth(event) === mes) &&
    (!fecha || limaDate(event) >= fecha) &&
    (!precio || PRICE_MATCHERS[precio](event.priceFrom))
  );
}

const byDate = (a: Event, b: Event): number => Date.parse(a.startsAt) - Date.parse(b.startsAt);
const byPrice = (a: Event, b: Event): number => a.priceFrom - b.priceFrom || byDate(a, b);

export function parseEventFilters(searchParams: Record<string, string | string[] | undefined>): EventFilters {
  const values = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) && !MULTI_VALUE_KEYS.includes(key) ? value[0] : value,
    ]),
  );
  return eventFiltersSchema.parse(values);
}

/** Filtra (AND entre facetas, OR dentro de categoria/ciudad) y ordena según `orden`, sin mutar la entrada. */
export function filterEvents(events: Event[], filters: EventFilters): Event[] {
  return events
    .filter((event) => matchesFilters(event, filters))
    .sort(filters.orden === "precio" ? byPrice : byDate);
}

/** Entradas de query en el orden de las claves; repite las multivalor y omite vacíos y `orden=fecha`. */
export function toSearchParamEntries(filters: EventFilters): [string, string][] {
  return Object.entries(filters).flatMap(([key, value]) => {
    if (key === "orden" && value === "fecha") return [];
    const values = Array.isArray(value) ? value : [value];
    return values.filter((item): item is string => Boolean(item)).map((item): [string, string] => [key, item]);
  });
}

export function buildEventsHref(filters: EventFilters): string {
  const query = new URLSearchParams(toSearchParamEntries(filters)).toString();
  return query ? `/eventos?${query}` : "/eventos";
}

/** Añade o quita `value` de la faceta multivalor; si queda vacía → undefined. */
export function toggleFilterValue<K extends MultiValueKey>(
  filters: EventFilters,
  key: K,
  value: MultiValue<K>,
): EventFilters {
  const current: readonly MultiValue<K>[] = filters[key] ?? [];
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  return { ...filters, [key]: next.length > 0 ? next : undefined };
}

function countBy<K extends string>(keys: readonly K[], values: string[]): Record<K, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const value of values) {
    if (Object.hasOwn(counts, value)) counts[value as K] += 1;
  }
  return counts;
}

/** Conteos por valor con los demás filtros activos, ignorando la propia faceta (incluye ceros). */
export function getFacetCounts(events: Event[], filters: EventFilters): FacetCounts {
  const matching = (others: EventFilters) => events.filter((event) => matchesFilters(event, others));
  return {
    categoria: countBy(
      EVENT_CATEGORIES,
      matching({ ...filters, categoria: undefined }).map((event) => event.category),
    ),
    ciudad: countBy(
      CITIES,
      matching({ ...filters, ciudad: undefined }).map((event) => event.city),
    ),
  };
}

/** "2026-11" → "Noviembre 2026". */
export function formatMonthLabel(month: string): string {
  const name = monthNameFormatter.format(new Date(`${month}-01T00:00:00Z`));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${month.slice(0, 4)}`;
}

/** Meses únicos (zona America/Lima) con eventos, en orden ascendente. */
export function getEventMonths(events: Event[]): MonthOption[] {
  return [...new Set(events.map(limaMonth))].sort().map((value) => ({ value, label: formatMonthLabel(value) }));
}

/** Un chip por valor activo (categorías, ciudades, mes, fecha, precio); su href es la URL sin ese valor. */
export function getActiveFilterChips(filters: EventFilters): FilterChip[] {
  const { categoria = [], ciudad = [], mes, fecha, precio } = filters;
  const chips: FilterChip[] = [
    ...categoria.map((category) => ({
      id: `categoria-${category}`,
      label: EVENT_CATEGORY_LABELS[category],
      href: buildEventsHref(toggleFilterValue(filters, "categoria", category)),
    })),
    ...ciudad.map((city) => ({
      id: `ciudad-${city}`,
      label: city,
      href: buildEventsHref(toggleFilterValue(filters, "ciudad", city)),
    })),
  ];
  if (mes) chips.push({ id: "mes", label: formatMonthLabel(mes), href: buildEventsHref({ ...filters, mes: undefined }) });
  if (fecha) {
    chips.push({
      id: "fecha",
      label: `Desde el ${chipDateFormatter.format(new Date(`${fecha}T00:00:00Z`))}`,
      href: buildEventsHref({ ...filters, fecha: undefined }),
    });
  }
  if (precio) {
    const range = PRICE_RANGES.find((option) => option.value === precio);
    chips.push({
      id: "precio",
      label: range?.label ?? precio,
      href: buildEventsHref({ ...filters, precio: undefined }),
    });
  }
  return chips;
}
