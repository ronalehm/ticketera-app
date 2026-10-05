import { CalendarDays, ImageIcon, MapPin } from "lucide-react";

import { DateChip } from "@/components/shared/DateChip";
import { EventCoverImage } from "@/components/shared/EventCoverImage";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEventPrice } from "@/modules/events/format";

import type { EventPreview } from "../types/organizer.types";

const PLACEHOLDER_CLASS = "text-muted-foreground";
const PRICE_TEXT_CLASS = "text-xl font-extrabold max-lg:text-base";

function PreviewPrice({ priceFrom }: Pick<EventPreview, "priceFrom">) {
  if (priceFrom === 0) return <p className={PRICE_TEXT_CLASS}>Entrada libre</p>;
  return (
    <p>
      <span className="block text-xs font-medium text-muted-foreground">Desde</span>{" "}
      <span
        className={cn(PRICE_TEXT_CLASS, "block tracking-tight tabular-nums", priceFrom === null && PLACEHOLDER_CLASS)}
      >
        {priceFrom === null ? "S/ —" : formatEventPrice(priceFrom)}
      </span>
    </p>
  );
}

/** Muesca del talón, del color del fondo del panel (`bg-muted`); el `overflow-hidden` de `Card` la recorta. */
function Notch({ className }: { className: string }) {
  return <span aria-hidden className={cn("absolute size-5 rounded-full bg-muted ring-1 ring-border", className)} />;
}

/**
 * Anatomía de `EventCard` (MASTER §7) sin enlaces ni botones reales: vertical en `lg`;
 * por debajo, la tarjeta horizontal tipo entrada (variante `ticket`).
 */
export function EventPreviewCard({ title, categoryLabel, dateLabel, dateChip, place, priceFrom, imageUrl }: EventPreview) {
  return (
    <Card className="gap-0 overflow-hidden rounded-2xl py-0 ring-1 ring-border max-lg:min-h-32 max-lg:flex-row">
      <div className="relative h-44 shrink-0 max-lg:h-auto max-lg:w-27">
        {imageUrl ? (
          // Decorativa: la misma imagen ya está descrita en "Imagen de portada".
          <EventCoverImage src={imageUrl} alt="" fill sizes="(min-width: 1024px) 340px, 108px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <ImageIcon aria-hidden className="size-8 text-muted-foreground" />
          </div>
        )}
        <DateChip
          month={dateChip?.month ?? "MES"}
          day={dateChip?.day ?? "--"}
          placeholder={!dateChip}
          className="absolute top-3 left-3 max-lg:top-2 max-lg:left-2"
        />
        <Notch className="-top-2.5 -right-2.5 lg:hidden" />
        <Notch className="-right-2.5 -bottom-2.5 lg:hidden" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col max-lg:border-l max-lg:border-dashed max-lg:border-border">
        <CardContent className="flex flex-1 flex-col gap-1.5 p-4 max-lg:gap-1 max-lg:px-3.5 max-lg:pt-3 max-lg:pb-2">
          <p className="text-xs font-bold tracking-wider text-primary-strong uppercase">{categoryLabel}</p>
          <h3 className={cn("line-clamp-2 text-base leading-snug font-bold md:text-lg", !title && PLACEHOLDER_CLASS)}>
            {title ?? "Nombre del evento"}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{place ?? "Lugar · Ciudad"}</span>
          </p>
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            <span>{dateLabel ?? "Fecha por definir"}</span>
          </p>
        </CardContent>

        {/* Talón: `span` decorativo (no un `div aria-hidden`, que el formulario reserva al plano de asientos). */}
        <span aria-hidden className="relative mt-auto block border-t border-dashed border-border max-lg:hidden">
          <Notch className="top-0 -left-2.5 -translate-y-1/2" />
          <Notch className="top-0 -right-2.5 -translate-y-1/2" />
        </span>

        <div className="flex flex-wrap items-end justify-between gap-3 p-4 max-lg:flex-nowrap max-lg:items-center max-lg:px-3.5 max-lg:pt-0 max-lg:pb-3">
          <PreviewPrice priceFrom={priceFrom} />
          <span
            aria-hidden
            className={cn(
              buttonVariants({ variant: "outline" }),
              "pointer-events-none h-11 rounded-xl px-4 font-semibold text-primary-strong max-lg:hidden",
            )}
          >
            Ver entradas
          </span>
        </div>
      </div>
    </Card>
  );
}
