"use client";

import { useId, useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { OrganizerEvent, OrganizerEventFilter } from "../types/organizer.types";
import { filterOrganizerEvents, getDashboardKpis } from "../utils/organizerStats";
import { OrganizerEventsTable } from "./OrganizerEventsTable";
import { OrganizerKpis } from "./OrganizerKpis";

const FILTERS: { value: OrganizerEventFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Borradores" },
];

export function OrganizerDashboard({ initialEvents }: { initialEvents: OrganizerEvent[] }) {
  const [filter, setFilter] = useState<OrganizerEventFilter>("all");
  const headingId = useId();
  // Los KPIs resumen todos los eventos; el filtro solo afecta a la lista.
  const kpis = getDashboardKpis(initialEvents);
  const visible = filterOrganizerEvents(initialEvents, filter);

  return (
    <div className="space-y-8 md:space-y-10">
      <OrganizerKpis {...kpis} />

      <section aria-labelledby={headingId}>
        <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
          <h2 id={headingId} className="text-2xl font-bold tracking-tight md:text-3xl">
            Mis eventos
          </h2>
          <ToggleGroup
            aria-label="Filtrar eventos por estado"
            value={[filter]}
            // Selección única: Base UI devuelve [] al deseleccionar; en ese caso vuelve a "Todos".
            onValueChange={(value) => setFilter((value[0] as OrganizerEventFilter | undefined) ?? "all")}
            spacing={1}
            className="grid w-full grid-cols-3 rounded-lg bg-muted p-1 md:flex md:w-fit"
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
          <OrganizerEventsTable events={visible} labelledBy={headingId} />
        ) : (
          <p className="rounded-2xl bg-muted p-8 text-center text-muted-foreground">No tienes eventos con este estado.</p>
        )}
      </section>
    </div>
  );
}
