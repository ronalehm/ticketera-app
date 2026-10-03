import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Event } from "../types/events.types";
import { EventCard } from "./EventCard";

// Server Component: contador visible, grilla de resultados y estado vacío.
export function EventsResults({ events }: { events: Event[] }) {
  return (
    <div>
      <h2 className="sr-only">Resultados</h2>
      <p className="mb-4 text-sm font-medium text-muted-foreground">
        {events.length === 1 ? "1 evento encontrado" : `${events.length} eventos encontrados`}
      </p>
      {events.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-muted p-8 text-center">
          <p className="text-muted-foreground">No encontramos eventos con esos filtros</p>
          <Link
            href="/eventos"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 cursor-pointer px-6 font-semibold")}
          >
            Limpiar filtros
          </Link>
        </div>
      )}
    </div>
  );
}
