import type { ReactNode } from "react";
import { ImageIcon } from "lucide-react";

import { EventCoverImage } from "@/components/shared/EventCoverImage";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCount } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import type { ManagedEvent, ManagedEventStatus } from "@/modules/events";
import { formatEventDate } from "@/modules/events/format";

import { MANAGED_EVENT_STATUS_BADGE } from "../data/managedEventStatus";
import { formatRevenue, getSoldPercentage } from "../utils/organizerStats";

type OrganizerEventsTableProps = {
  events: ManagedEvent[];
  /** id del encabezado que nombra la tabla y la lista. */
  labelledBy: string;
  /** Muestra el organizador de cada evento (admin, que ve los de todos). */
  showOrganizer?: boolean;
  /**
   * Acciones de cada fila (listado de Eventos) para la tabla (lg) o la tarjeta (< lg); sin ella no hay columna de acciones.
   * `null` para una fila sin acciones.
   */
  rowActions?: (event: ManagedEvent, layout: "table" | "card") => ReactNode;
};

// Entre lg y xl (1024–1279 px, con el sidebar abierto quedan ~680 px) la tabla se compacta para que el título no se
// quede sin sitio: celdas interiores con px-3, sin miniatura y «Vendidas» sin el sufijo ni ancho fijo.
const CELL_X = "px-6 lg:max-xl:px-3";
// Cabecera en mayúsculas pequeñas, sin fondo; px-6 alinea las columnas con la barra de cabecera de la sección.
const HEADER_TEXT = "h-11 text-xs font-semibold tracking-wider text-muted-foreground uppercase";
// Ancho fijo para dos botones de 44 px (+ gap y px-6), sin wrap; el borde derecho conserva px-6.
const ACTIONS_COLUMN = "w-36 px-6 whitespace-nowrap lg:max-xl:w-auto lg:max-xl:pl-3";

function StatusBadge({ status }: { status: ManagedEventStatus }) {
  const badge = MANAGED_EVENT_STATUS_BADGE[status];
  return <Badge className={cn("h-6 px-2.5 font-semibold", badge.className)}>{badge.label}</Badge>;
}

function EventThumbnail({ imageUrl, className }: { imageUrl: string | null; className?: string }) {
  if (!imageUrl) {
    return (
      <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted", className)}>
        <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
      </div>
    );
  }
  return (
    <EventCoverImage
      src={imageUrl}
      alt=""
      width={48}
      height={48}
      className={cn("size-12 shrink-0 rounded-lg object-cover", className)}
    />
  );
}

type EventMetaProps = Pick<ManagedEvent, "startsAt" | "city" | "organizer"> & { showOrganizer: boolean };

function EventMeta({ startsAt, city, organizer, showOrganizer }: EventMetaProps) {
  return (
    <p className="truncate text-sm text-muted-foreground">
      {startsAt ? formatEventDate(startsAt) : "Fecha por definir"}
      {city && ` · ${city}`}
      {showOrganizer && ` · ${organizer}`}
    </p>
  );
}

function SoldCount({ sold, capacity }: Pick<ManagedEvent, "sold" | "capacity">) {
  return (
    <p className="text-sm whitespace-nowrap tabular-nums">
      <strong className="font-semibold">{formatCount(sold)}</strong>{" "}
      <span className="text-muted-foreground">
        / {formatCount(capacity)}
        {/* En la tabla compacta (lg–xl) la cabecera «Vendidas» ya lo dice. */}
        <span className="lg:max-xl:hidden"> vendidas</span>
      </span>
    </p>
  );
}

function SoldProgress({ title, sold, capacity }: Pick<ManagedEvent, "title" | "sold" | "capacity">) {
  return (
    <Progress
      value={getSoldPercentage(sold, capacity)}
      aria-label={`Entradas vendidas de ${title}`}
      getAriaValueText={() => `${formatCount(sold)} de ${formatCount(capacity)} vendidas`}
    />
  );
}

function Revenue({ status, revenueCents }: Pick<ManagedEvent, "status" | "revenueCents">) {
  // Un borrador no está a la venta.
  if (status === "draft") {
    return (
      <>
        <span aria-hidden>—</span>
        <span className="sr-only">Sin ingresos</span>
      </>
    );
  }
  return <>{formatRevenue(revenueCents)}</>;
}

// Tabla en lg y tarjetas por debajo; la versión oculta usa display:none, así que no se duplica en el árbol de accesibilidad.
export function OrganizerEventsTable({ events, labelledBy, showOrganizer = false, rowActions }: OrganizerEventsTableProps) {
  return (
    <>
      {/* Tabla a sangre dentro de la tarjeta de la sección: sin anillo ni radio propios. */}
      <div className="hidden lg:block">
        <Table aria-labelledby={labelledBy}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(HEADER_TEXT, "px-6 lg:max-xl:pr-3")}>Evento</TableHead>
              <TableHead className={cn(HEADER_TEXT, CELL_X)}>Estado</TableHead>
              <TableHead className={cn(HEADER_TEXT, CELL_X)}>Vendidas</TableHead>
              <TableHead className={cn(HEADER_TEXT, CELL_X, "text-right")}>Ingresos</TableHead>
              {rowActions && <TableHead className={cn(HEADER_TEXT, ACTIONS_COLUMN, "text-right")}>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                {/* w-full + max-w-0: la columna ocupa el espacio libre y el título se trunca en vez de ensanchar la tabla. */}
                <TableHead scope="row" className="h-auto w-full max-w-0 px-6 py-3.5 font-normal lg:max-xl:pr-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <EventThumbnail imageUrl={event.imageUrl} className="lg:max-xl:hidden" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{event.title}</p>
                      <EventMeta
                        startsAt={event.startsAt}
                        city={event.city}
                        organizer={event.organizer}
                        showOrganizer={showOrganizer}
                      />
                    </div>
                  </div>
                </TableHead>
                <TableCell className={cn(CELL_X, "py-3.5")}>
                  <StatusBadge status={event.status} />
                </TableCell>
                <TableCell className={cn(CELL_X, "py-3.5")}>
                  <div className="space-y-2 xl:w-48">
                    <SoldCount sold={event.sold} capacity={event.capacity} />
                    <SoldProgress title={event.title} sold={event.sold} capacity={event.capacity} />
                  </div>
                </TableCell>
                <TableCell className={cn(CELL_X, "py-3.5 text-right font-semibold tabular-nums")}>
                  <Revenue status={event.status} revenueCents={event.revenueCents} />
                </TableCell>
                {rowActions && (
                  <TableCell className={cn("py-3.5", ACTIONS_COLUMN)}>
                    {/* Acciones compactas ([Editar] y [•••]) en una sola línea. */}
                    <div className="flex items-center justify-end gap-2">{rowActions(event, "table")}</div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul aria-labelledby={labelledBy} className="space-y-3 lg:hidden">
        {events.map((event) => {
          const actions = rowActions?.(event, "card");
          return (
            <li key={event.id} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex items-start gap-3">
                <EventThumbnail imageUrl={event.imageUrl} />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 leading-snug font-bold">{event.title}</h3>
                  <EventMeta
                    startsAt={event.startsAt}
                    city={event.city}
                    organizer={event.organizer}
                    showOrganizer={showOrganizer}
                  />
                </div>
                <StatusBadge status={event.status} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <SoldCount sold={event.sold} capacity={event.capacity} />
                <p className="text-sm font-semibold whitespace-nowrap tabular-nums">
                  <Revenue status={event.status} revenueCents={event.revenueCents} />
                </p>
              </div>
              <SoldProgress title={event.title} sold={event.sold} capacity={event.capacity} />
              {actions && <div className="flex flex-wrap gap-2 border-t pt-3 *:flex-1">{actions}</div>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
