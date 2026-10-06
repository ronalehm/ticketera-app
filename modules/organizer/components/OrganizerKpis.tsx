import { CalendarDays, ChartColumn, Ticket, type LucideIcon } from "lucide-react";

import { formatCount } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

import type { DashboardKpis } from "../types/organizer.types";
import { formatRevenue } from "../utils/organizerStats";

type Kpi = { label: string; value: string; icon: LucideIcon; className?: string };

// Un solo orden en el DOM para todos los breakpoints (Decisión 14); en móvil, Ingresos ocupa la fila completa.
// Ingresos = ventas brutas MVP (órdenes `paid`, spec admin-panel Decisión 10).
export function OrganizerKpis({ revenueCents, ticketsSold, publishedCount }: DashboardKpis) {
  const kpis: Kpi[] = [
    { label: "Ingresos", value: formatRevenue(revenueCents), icon: ChartColumn, className: "col-span-2 lg:col-span-1" },
    { label: "Entradas vendidas", value: formatCount(ticketsSold), icon: Ticket },
    { label: "Eventos publicados", value: formatCount(publishedCount), icon: CalendarDays },
  ];

  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {kpis.map(({ label, value, icon: Icon, className }) => (
        <div key={label} className={cn("min-w-0 rounded-2xl bg-card p-5 ring-1 ring-border md:p-6", className)}>
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </dt>
          {/* lg:text-2xl: con tres columnas junto a la nav, "S/ 1,387,530.00" no cabe en text-3xl a 1024 px. */}
          <dd className="mt-2 text-2xl font-bold break-words tabular-nums md:text-3xl lg:text-2xl xl:text-3xl">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
