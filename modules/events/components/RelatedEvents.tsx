import { SectionHeader } from "@/components/shared/SectionHeader";

import type { Event } from "../types/events.types";
import { EventCard } from "./EventCard";

export function RelatedEvents({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
      <SectionHeader title="También te puede interesar" />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {events.map((event) => (
          <li key={event.id}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </section>
  );
}
