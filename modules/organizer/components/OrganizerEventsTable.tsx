import Image from "next/image";
import { ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatEventDate, formatEventPrice } from "@/modules/events/format";

import type { OrganizerEvent, OrganizerEventStatus } from "../types/organizer.types";
import { formatCount, getEventRevenue, getSoldPercentage } from "../utils/organizerStats";

type OrganizerEventsTableProps = {
  events: OrganizerEvent[];
  /** id del encabezado que nombra la tabla y la lista. */
  labelledBy: string;
};

// Patrón de EVENT_STATUS_BADGE: el estado siempre lleva texto, nunca solo color.
const ORGANIZER_STATUS_BADGE: Record<OrganizerEventStatus, { label: string; className: string }> = {
  published: { label: "Publicado", className: "bg-accent text-accent-foreground" },
  draft: { label: "Borrador", className: "bg-secondary text-secondary-foreground" },
};

function StatusBadge({ status }: { status: OrganizerEventStatus }) {
  const badge = ORGANIZER_STATUS_BADGE[status];
  return <Badge className={cn("h-6 px-2.5 font-semibold", badge.className)}>{badge.label}</Badge>;
}

function EventThumbnail({ imageUrl }: { imageUrl: string | null }) {
  if (!imageUrl) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
        <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
      </div>
    );
  }
  return (
    <Image src={imageUrl} alt="" width={48} height={48} sizes="48px" className="size-12 shrink-0 rounded-lg object-cover" />
  );
}

function EventMeta({ startsAt, city }: Pick<OrganizerEvent, "startsAt" | "city">) {
  return (
    <p className="truncate text-sm text-muted-foreground">
      {startsAt ? formatEventDate(startsAt) : "Fecha por definir"}
      {city && ` · ${city}`}
    </p>
  );
}

function SoldCount({ sold, capacity }: Pick<OrganizerEvent, "sold" | "capacity">) {
  return (
    <p className="text-sm whitespace-nowrap tabular-nums">
      <strong className="font-semibold">{formatCount(sold)}</strong>{" "}
      <span className="text-muted-foreground">/ {formatCount(capacity)} vendidas</span>
    </p>
  );
}

function SoldProgress({ title, sold, capacity }: Pick<OrganizerEvent, "title" | "sold" | "capacity">) {
  return (
    <Progress
      value={getSoldPercentage(sold, capacity)}
      aria-label={`Entradas vendidas de ${title}`}
      getAriaValueText={() => `${formatCount(sold)} de ${formatCount(capacity)} vendidas`}
    />
  );
}

function Revenue({ event }: { event: OrganizerEvent }) {
  if (event.status === "draft") {
    return (
      <>
        <span aria-hidden>—</span>
        <span className="sr-only">Sin ingresos</span>
      </>
    );
  }
  return <>{formatEventPrice(getEventRevenue(event))}</>;
}

// Tabla en lg y tarjetas por debajo; la versión oculta usa display:none, así que no se duplica en el árbol de accesibilidad.
export function OrganizerEventsTable({ events, labelledBy }: OrganizerEventsTableProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl ring-1 ring-border lg:block">
        <Table aria-labelledby={labelledBy}>
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-11 px-4 text-muted-foreground">Evento</TableHead>
              <TableHead className="h-11 px-4 text-muted-foreground">Estado</TableHead>
              <TableHead className="h-11 px-4 text-muted-foreground">Vendidas</TableHead>
              <TableHead className="h-11 px-4 text-right text-muted-foreground">Ingresos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                {/* w-full + max-w-0: la columna ocupa el espacio libre y el título se trunca en vez de ensanchar la tabla. */}
                <TableHead scope="row" className="h-auto w-full max-w-0 px-4 py-3 font-normal">
                  <div className="flex min-w-0 items-center gap-3">
                    <EventThumbnail imageUrl={event.imageUrl} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{event.title}</p>
                      <EventMeta startsAt={event.startsAt} city={event.city} />
                    </div>
                  </div>
                </TableHead>
                <TableCell className="px-4 py-3">
                  <StatusBadge status={event.status} />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="w-48 space-y-2">
                    <SoldCount sold={event.sold} capacity={event.capacity} />
                    <SoldProgress title={event.title} sold={event.sold} capacity={event.capacity} />
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-right font-semibold tabular-nums">
                  <Revenue event={event} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul aria-labelledby={labelledBy} className="space-y-3 lg:hidden">
        {events.map((event) => (
          <li key={event.id} className="space-y-3 rounded-2xl p-4 ring-1 ring-border">
            <div className="flex items-start gap-3">
              <EventThumbnail imageUrl={event.imageUrl} />
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 leading-snug font-bold">{event.title}</h3>
                <EventMeta startsAt={event.startsAt} city={event.city} />
              </div>
              <StatusBadge status={event.status} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <SoldCount sold={event.sold} capacity={event.capacity} />
              <p className="text-sm font-semibold whitespace-nowrap tabular-nums">
                <Revenue event={event} />
              </p>
            </div>
            <SoldProgress title={event.title} sold={event.sold} capacity={event.capacity} />
          </li>
        ))}
      </ul>
    </>
  );
}
