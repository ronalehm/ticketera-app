import type { Metadata } from "next";

import {
  CategoryFilter,
  EventFiltersSheet,
  EventFiltersSidebar,
  EventSearchBar,
  EventsResults,
  EventsSort,
  filterEvents,
  getActiveFilterChips,
  getEventMonths,
  getEvents,
  getFacetCounts,
  listEventCategories,
  parseEventFilters,
  type EventCategory,
  type EventFilters,
} from "@/modules/events";

// Una sola categoría existente → su nombre; si no existe en la BD, el título genérico.
function pageTitle({ categoria }: EventFilters, categories: EventCategory[]): string {
  const category = categoria?.length === 1 ? categories.find(({ slug }) => slug === categoria[0]) : undefined;
  return category?.name ?? "Explora eventos";
}

export async function generateMetadata({ searchParams }: PageProps<"/eventos">): Promise<Metadata> {
  const [params, categories] = await Promise.all([searchParams, listEventCategories()]);
  return { title: `${pageTitle(parseEventFilters(params), categories)} | Mentec Tickets` };
}

export default async function EventsPage({ searchParams }: PageProps<"/eventos">) {
  const filters = parseEventFilters(await searchParams);
  const [allEvents, categories] = await Promise.all([getEvents(), listEventCategories()]);
  const events = filterEvents(allEvents, filters);
  const facets = getFacetCounts(allEvents, filters, categories);
  const months = getEventMonths(allEvents);

  return (
    <>
      <h1 className="mx-auto max-w-7xl px-4 pt-8 text-3xl font-extrabold tracking-tight md:px-6 md:pt-12 md:text-5xl lg:px-8">
        Explora eventos
      </h1>
      <EventSearchBar months={months} defaultValues={filters} />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-8">
        <EventFiltersSidebar
          className="hidden lg:block"
          filters={filters}
          facets={facets}
          categories={categories}
          months={months}
        />
        <section aria-label="Resultados" className="flex min-w-0 flex-col gap-4 md:gap-6">
          <div className="flex flex-wrap items-center justify-between gap-2 lg:hidden">
            <EventFiltersSheet
              className="lg:hidden"
              filters={filters}
              facets={facets}
              categories={categories}
              months={months}
              resultCount={events.length}
            />
            <EventsSort filters={filters} />
          </div>
          <CategoryFilter className="lg:hidden" filters={filters} categories={categories} />
          <EventsResults
            events={events}
            chips={getActiveFilterChips(filters, categories)}
            sort={<EventsSort className="hidden shrink-0 lg:flex" filters={filters} />}
          />
        </section>
      </div>
    </>
  );
}
