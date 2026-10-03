import Link from "next/link";
import { Search, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Event } from "../types/events.types";
import type { FilterChip } from "../utils/eventFilters";
import { EventCard } from "./EventCard";

// Enlaces que quitan un filtro activo (su href es la URL sin ese valor).
function ActiveFilterChips({ chips }: { chips: FilterChip[] }) {
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Filtros activos" className="flex flex-wrap gap-2">
      {chips.map(({ id, label, href }) => (
        <li key={id}>
          <Link
            href={href}
            aria-label={`Quitar filtro ${label}`}
            className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full bg-accent pr-3 pl-4 text-sm font-medium text-accent-foreground ring-1 ring-primary/30 transition-colors duration-200 outline-none hover:ring-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {label}
            <X className="size-4" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyResults() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary-strong">
        <Search className="size-6" aria-hidden />
      </span>
      <p className="text-xl font-bold">No encontramos eventos con esos filtros</p>
      <p className="max-w-md text-muted-foreground">Prueba quitando algún filtro o buscando otra ciudad.</p>
      <Link
        href="/eventos"
        className={cn(buttonVariants(), "mt-2 h-11 cursor-pointer px-6 font-semibold hover:bg-primary-strong")}
      >
        Limpiar filtros
      </Link>
    </div>
  );
}

// Server Component: contador + chips de filtros activos, grilla (ticket en móvil) y estado vacío.
export function EventsResults({ events, chips }: { events: Event[]; chips: FilterChip[] }) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <h2 className="sr-only">Resultados</h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p aria-live="polite" aria-atomic="true" className="text-base font-bold">
          {events.length === 1 ? "1 evento" : `${events.length} eventos`}
        </p>
        <ActiveFilterChips chips={chips} />
      </div>
      {events.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} layout="ticket" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyResults />
      )}
    </div>
  );
}
