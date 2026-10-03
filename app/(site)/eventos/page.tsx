import type { Metadata } from "next";

import {
  CategoryFilter,
  EVENT_CATEGORY_LABELS,
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
  parseEventFilters,
  type EventFilters,
} from "@/modules/events";

function pageTitle({ categoria }: EventFilters): string {
  return categoria?.length === 1 ? EVENT_CATEGORY_LABELS[categoria[0]] : "Explora eventos";
}

export async function generateMetadata({ searchParams }: PageProps<"/eventos">): Promise<Metadata> {
  return { title: `${pageTitle(parseEventFilters(await searchParams))} | Mentec Tickets` };
}

export default async function EventsPage({ searchParams }: PageProps<"/eventos">) {
  const filters = parseEventFilters(await searchParams);
  const allEvents = await getEvents();
  const events = filterEvents(allEvents, filters);
  const facets = getFacetCounts(allEvents, filters);
  const months = getEventMonths(allEvents);

  return (
    <>
      <h1 className="mx-auto max-w-7xl px-4 pt-8 text-3xl font-extrabold tracking-tight md:px-6 md:pt-12 md:text-5xl lg:px-8">
        Explora eventos
      </h1>
      <EventSearchBar months={months} defaultValues={filters} />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-8">
        <EventFiltersSidebar className="hidden lg:block" filters={filters} facets={facets} months={months} />
        <section aria-label="Resultados" className="flex min-w-0 flex-col gap-4 md:gap-6">
          <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
            <EventFiltersSheet
              className="lg:hidden"
              filters={filters}
              facets={facets}
              months={months}
              resultCount={events.length}
            />
            <EventsSort filters={filters} />
          </div>
          <CategoryFilter className="lg:hidden" filters={filters} />
          <EventsResults events={events} chips={getActiveFilterChips(filters)} />
        </section>
      </div>
    </>
  );
}
