import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { EVENT_CATEGORY_LABELS } from "../data/categories";
import type { Event, EventCategory } from "../types/events.types";
import { buildEventsHref } from "../utils/eventFilters";
import { EventCard } from "./EventCard";

// < sm: fila con scroll-snap que sangra hasta el borde del contenedor (`-mx-4 px-4`); desde sm, grilla.
export function RelatedEvents({ events, category }: { events: Event[]; category: EventCategory }) {
  if (events.length === 0) return null;

  return (
    <section className="bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
        <SectionHeader
          title="También te puede interesar"
          action={
            <Link
              href={buildEventsHref({ categoria: [category] })}
              className={cn(
                buttonVariants({ variant: "link" }),
                "h-11 cursor-pointer gap-1.5 px-0 text-base font-semibold text-primary-strong",
              )}
            >
              Ver más en {EVENT_CATEGORY_LABELS[category]}
              <ArrowRight aria-hidden />
            </Link>
          }
        />
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:py-0 md:gap-6 lg:grid-cols-3 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {events.map((event) => (
            <li key={event.id} className="w-64 shrink-0 snap-start sm:w-auto">
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
