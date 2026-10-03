import Link from "next/link";

import { cn } from "@/lib/utils";

import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "../data/categories";
import type { EventFilters } from "../schemas/eventFilters.schema";
import { buildEventsHref } from "../utils/eventFilters";

const CHIPS = [
  { category: undefined, label: "Todas" },
  ...EVENT_CATEGORIES.map((category) => ({ category, label: EVENT_CATEGORY_LABELS[category] })),
];

// Server Component: chips-enlace que cambian solo la categoría y conservan los demás filtros.
export function CategoryFilter({ filters }: { filters: EventFilters }) {
  return (
    <nav
      aria-label="Filtrar por categoría"
      className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex w-max gap-2">
        {CHIPS.map(({ category, label }) => {
          const active = filters.categoria === category;
          return (
            <li key={label}>
              <Link
                href={buildEventsHref({ ...filters, categoria: category })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 cursor-pointer items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "bg-primary font-semibold text-primary-foreground" : "bg-muted hover:bg-accent",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
