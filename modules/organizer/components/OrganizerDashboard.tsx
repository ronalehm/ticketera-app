"use client";

import { useId, useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ManagedEvent } from "@/modules/events";

import { DEFAULT_MANAGED_EVENTS_FILTERS, useManagedEvents } from "../hooks/useManagedEvents";
import type { ManagedEventsStatusFilter } from "../types/organizer.types";
import { filterManagedEvents, getDashboardKpis } from "../utils/organizerStats";
import { OrganizerEventsTable } from "./OrganizerEventsTable";
import { OrganizerKpis } from "./OrganizerKpis";

const FILTERS: { value: ManagedEventsStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Borradores" },
];

type OrganizerDashboardProps = {
  /** Id del usuario de la sesión: separa la caché de cada usuario. */
  userId: string;
  /** Todos los eventos que gestiona el usuario (`listManagedEvents` en el servidor). */
  initialEvents: ManagedEvent[];
  /** Muestra el organizador de cada evento (admin, que ve los de todos). */
  showOrganizer?: boolean;
};

export function OrganizerDashboard({ userId, initialEvents, showOrganizer }: OrganizerDashboardProps) {
  const [filter, setFilter] = useState<ManagedEventsStatusFilter>("all");
  const headingId = useId();
  // Resumen pide todos los eventos una vez: los KPIs los resumen todos y el filtro solo afecta a la lista.
  const { data: events = initialEvents } = useManagedEvents(userId, DEFAULT_MANAGED_EVENTS_FILTERS, initialEvents);

  const kpis = getDashboardKpis(events);
  const visible = filterManagedEvents(events, filter);

  return (
    <div className="space-y-8 md:space-y-10">
      <OrganizerKpis {...kpis} />

      {/* Tarjeta con barra de cabecera solo en lg; por debajo, h2, filtro y tarjetas van directamente sobre el bg-muted del panel. */}
      <section
        aria-labelledby={headingId}
        className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:bg-card lg:ring-1 lg:ring-border"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:border-b lg:px-6 lg:py-4">
          <h2 id={headingId} className="text-lg font-bold">
            Mis eventos
          </h2>
          <ToggleGroup
            aria-label="Filtrar eventos por estado"
            value={[filter]}
            // Selección única: Base UI devuelve [] al deseleccionar; en ese caso vuelve a "Todos".
            onValueChange={(value) => setFilter((value[0] as ManagedEventsStatusFilter | undefined) ?? "all")}
            spacing={1}
            // La pista es bg-secondary sobre el bg-muted del panel y bg-muted dentro de la tarjeta blanca (lg).
            className="grid w-full grid-cols-3 rounded-lg bg-secondary p-1 md:flex md:w-fit lg:bg-muted"
          >
            {FILTERS.map(({ value, label }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="h-11 cursor-pointer px-4 text-muted-foreground hover:bg-background/60 aria-pressed:bg-background aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-sm"
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {visible.length > 0 ? (
          <OrganizerEventsTable events={visible} labelledBy={headingId} showOrganizer={showOrganizer} />
        ) : (
          <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border lg:m-6 lg:bg-muted lg:ring-0">
            {filter === "all" ? "Aún no tienes eventos." : "No tienes eventos con este estado."}
          </p>
        )}
      </section>
    </div>
  );
}
