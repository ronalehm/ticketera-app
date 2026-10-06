import Link from "next/link";

import { cn } from "@/lib/utils";

import type { EventFilters } from "../schemas/eventFilters.schema";
import type { EventCategory } from "../types/events.types";
import { buildEventsHref } from "../utils/eventFilters";

// Server Component: pills-enlace de selección única; cada una deja solo esa categoría y conserva los demás filtros.
export function CategoryFilter({
  className,
  filters,
  categories,
}: {
  className?: string;
  filters: EventFilters;
  categories: EventCategory[];
}) {
  const selected = filters.categoria?.length === 1 ? filters.categoria[0] : undefined;
  const chips = [
    { category: undefined, label: "Todas" },
    ...categories.map(({ slug, name }) => ({ category: slug, label: name })),
  ];
  return (
    <nav
      aria-label="Filtrar por categoría"
      className={cn(
        "-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <ul className="flex w-max gap-2">
        {chips.map(({ category, label }) => {
          // "Todas" solo está activa sin categorías; una pill, si es la única seleccionada.
          const active = category ? selected === category : !filters.categoria;
          return (
            <li key={label}>
              <Link
                href={buildEventsHref({ ...filters, categoria: category ? [category] : undefined })}
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
