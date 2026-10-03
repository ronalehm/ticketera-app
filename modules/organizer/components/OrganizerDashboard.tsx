"use client";

import { useEffect, useId, useState } from "react";
import { CircleCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { useOrganizerStore } from "../stores/organizer.store";
import type { OrganizerEvent, OrganizerEventFilter, SavedStatus } from "../types/organizer.types";
import { filterOrganizerEvents, getDashboardKpis } from "../utils/organizerStats";
import { OrganizerEventsTable } from "./OrganizerEventsTable";
import { OrganizerKpis } from "./OrganizerKpis";

const FILTERS: { value: OrganizerEventFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Borradores" },
];

const SAVED_MESSAGES: Record<NonNullable<SavedStatus>, { title: string; description: string }> = {
  publicado: {
    title: "Evento publicado",
    description: "Ya aparece en Mis eventos con el estado Publicado.",
  },
  borrador: {
    title: "Borrador guardado",
    description: "Lo encontrarás en Mis eventos con el estado Borrador.",
  },
};

type OrganizerDashboardProps = {
  initialEvents: OrganizerEvent[];
  saved?: SavedStatus;
};

export function OrganizerDashboard({ initialEvents, saved }: OrganizerDashboardProps) {
  const [filter, setFilter] = useState<OrganizerEventFilter>("all");
  const headingId = useId();
  const storeEvents = useOrganizerStore((state) => state.events);

  // skipHydration: el servidor y el primer render del cliente parten de [] y los eventos guardados llegan tras montar.
  useEffect(() => {
    useOrganizerStore.persist.rehydrate();
  }, []);

  // Los creados (más recientes primero) van antes que los del mock.
  const events = [...storeEvents, ...initialEvents];
  // Los KPIs resumen todos los eventos; el filtro solo afecta a la lista.
  const kpis = getDashboardKpis(events);
  const visible = filterOrganizerEvents(events, filter);
  const savedMessage = saved ? SAVED_MESSAGES[saved] : null;

  return (
    <div className="space-y-8 md:space-y-10">
      {savedMessage && (
        <Alert className="px-4 py-3">
          <CircleCheck aria-hidden />
          <AlertTitle className="font-bold">{savedMessage.title}</AlertTitle>
          <AlertDescription>{savedMessage.description}</AlertDescription>
        </Alert>
      )}

      <OrganizerKpis {...kpis} />

      <section aria-labelledby={headingId} className="rounded-2xl bg-card p-4 ring-1 ring-border md:p-6">
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
