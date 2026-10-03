import Link from "next/link";

import { cn } from "@/lib/utils";

import { SORT_OPTIONS } from "../data/searchOptions";
import type { EventFilters } from "../schemas/eventFilters.schema";
import { buildEventsHref } from "../utils/eventFilters";

const LABEL_ID = "events-sort-label";

// Server Component: enlaces de orden que conservan todos los filtros (sin `orden` equivale a "fecha").
export function EventsSort({ className, filters }: { className?: string; filters: EventFilters }) {
  const current = filters.orden ?? "fecha";
  return (
    <div role="group" aria-labelledby={LABEL_ID} className={cn("flex items-center gap-2.5", className)}>
      <span id={LABEL_ID} className="sr-only text-sm text-muted-foreground sm:not-sr-only">
        Ordenar por
      </span>
      <div className="flex gap-1 rounded-xl p-1 ring-1 ring-border">
        {SORT_OPTIONS.map(({ value, label }) => {
          const active = current === value;
          return (
            <Link
              key={value}
              href={buildEventsHref({ ...filters, orden: value })}
              aria-current={active ? "true" : undefined}
              className={cn(
                "inline-flex h-11 cursor-pointer items-center rounded-lg px-3 text-sm whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-4",
                active ? "bg-primary font-semibold text-primary-foreground" : "font-medium hover:bg-accent",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
