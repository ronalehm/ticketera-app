"use client";

import type { ComponentProps } from "react";

import { DEFAULT_MANAGED_EVENTS_FILTERS, useManagedEvents } from "../hooks/useManagedEvents";
import { getDashboardKpis } from "../utils/organizerStats";
import { OrganizerEventsList } from "./OrganizerEventsList";
import { OrganizerKpis } from "./OrganizerKpis";

/**
 * Vista «Eventos»: KPIs y debajo el listado completo con sus filtros y acciones. Los KPIs usan siempre la query sin
 * filtros (la misma caché que `initialEvents`), así que filtrar el listado no los cambia; las mutaciones invalidan
 * `managedEventsBaseKey` y refrescan ambos.
 */
export function OrganizerDashboard(props: ComponentProps<typeof OrganizerEventsList>) {
  const { userId, initialEvents } = props;
  const { data: events = initialEvents } = useManagedEvents(userId, DEFAULT_MANAGED_EVENTS_FILTERS, initialEvents);

  return (
    <div className="space-y-8 md:space-y-10">
      <OrganizerKpis {...getDashboardKpis(events)} />
      <OrganizerEventsList {...props} />
    </div>
  );
}
