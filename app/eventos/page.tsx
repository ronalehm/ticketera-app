import type { Metadata } from "next";

import {
  CategoryFilter,
  EVENT_CATEGORY_LABELS,
  EventSearchBar,
  EventsResults,
  filterEvents,
  getEvents,
  parseEventFilters,
  type EventFilters,
} from "@/modules/events";

function pageTitle({ categoria }: EventFilters): string {
  return categoria ? EVENT_CATEGORY_LABELS[categoria] : "Eventos";
}

export async function generateMetadata({ searchParams }: PageProps<"/eventos">): Promise<Metadata> {
  return { title: `${pageTitle(parseEventFilters(await searchParams))} | Mentec Tickets` };
}

export default async function EventsPage({ searchParams }: PageProps<"/eventos">) {
  const filters = parseEventFilters(await searchParams);
  const events = filterEvents(await getEvents(), filters);

  return (
    <>
      <h1 className="mx-auto max-w-7xl px-4 pt-8 text-3xl font-extrabold tracking-tight md:px-6 md:pt-12 md:text-5xl lg:px-8">
        {pageTitle(filters)}
      </h1>
      <EventSearchBar defaultValues={filters} />
      <section aria-label="Resultados" className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 md:px-6 md:py-16 lg:px-8">
        <CategoryFilter filters={filters} />
        <EventsResults events={events} />
      </section>
    </>
  );
}
