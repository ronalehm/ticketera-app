import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

import type { EventFilters } from "../schemas/eventFilters.schema";
import type { EventCategory } from "../types/events.types";
import { buildEventsHref, type FacetCounts, type MonthOption } from "../utils/eventFilters";
import { EventFiltersForm } from "./EventFiltersForm";

type EventFiltersSidebarProps = {
  filters: EventFilters;
  facets: FacetCounts;
  categories: EventCategory[];
  months: MonthOption[];
  className?: string;
};

const TITLE_ID = "event-filters-title";

// Server Component: panel de filtros de escritorio (lg+). "Limpiar" quita las facetas y conserva q y orden.
export function EventFiltersSidebar({ filters, facets, categories, months, className }: EventFiltersSidebarProps) {
  const { q, categoria, ciudad, mes, fecha, precio, orden } = filters;
  const hasFacetFilters = Boolean(categoria || ciudad || mes || fecha || precio);

  return (
    <aside aria-labelledby={TITLE_ID} className={cn("rounded-2xl bg-card p-6 ring-1 ring-border", className)}>
      <div className="flex min-h-11 items-center justify-between gap-4 border-b border-border pb-2">
        <h2 id={TITLE_ID} className="flex items-center gap-2 text-base font-bold">
          <SlidersHorizontal className="size-5" aria-hidden />
          Filtros
        </h2>
        {hasFacetFilters && (
          <Link
            href={buildEventsHref({ q, orden })}
            scroll={false}
            className="inline-flex h-11 cursor-pointer items-center rounded-lg px-2 text-sm font-bold text-primary-strong transition-colors duration-200 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Limpiar
          </Link>
        )}
      </div>
      <EventFiltersForm
        filters={filters}
        facets={facets}
        categories={categories}
        months={months}
        sections={["categoria", "ciudad", "mes", "precio"]}
      />
    </aside>
  );
}
