import Image from "next/image";
import { ImageIcon, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEventPrice } from "@/modules/events/format";

import type { EventPreview } from "../types/organizer.types";

const PLACEHOLDER_CLASS = "text-muted-foreground";

function PreviewPrice({ priceFrom }: Pick<EventPreview, "priceFrom">) {
  if (priceFrom === null) return <span className={PLACEHOLDER_CLASS}>Desde S/ —</span>;
  if (priceFrom === 0) return <span className="font-bold">Entrada libre</span>;
  return (
    <>
      Desde <span className="font-bold">{formatEventPrice(priceFrom)}</span>
    </>
  );
}

/** Anatomía de EventCard (MASTER §7) sin enlaces ni botones: horizontal en móvil, vertical en `lg`. */
export function EventPreviewCard({ title, categoryLabel, dateLabel, place, priceFrom, imageUrl }: EventPreview) {
  return (
    <Card className="gap-0 rounded-2xl py-0 ring-border max-lg:flex-row">
      <div className="relative w-28 shrink-0 overflow-hidden bg-muted lg:aspect-[4/3] lg:w-full">
        {imageUrl ? (
          // Decorativa: la misma imagen ya está descrita en "Imagen de portada".
          <Image src={imageUrl} alt="" fill unoptimized sizes="(min-width: 1024px) 340px, 112px" className="object-cover" />
        ) : (
          <div className="flex h-full min-h-28 items-center justify-center">
            <ImageIcon aria-hidden className="size-8 text-muted-foreground" />
          </div>
        )}
        <Badge variant="secondary" className="absolute top-2 left-2 h-6 px-2.5 font-bold lg:top-3 lg:left-3">
          {categoryLabel}
        </Badge>
      </div>
      <CardContent className="flex min-w-0 flex-1 flex-col gap-1.5 p-4 max-lg:px-3.5 max-lg:py-3">
        <p className={cn("text-xs font-bold tracking-wider uppercase", dateLabel ? "text-primary-strong" : PLACEHOLDER_CLASS)}>
          {dateLabel ?? "Fecha por definir"}
        </p>
        <h3 className={cn("line-clamp-2 text-base leading-snug font-bold md:text-lg", !title && PLACEHOLDER_CLASS)}>
          {title ?? "Nombre del evento"}
        </h3>
        <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{place ?? "Lugar, Ciudad"}</span>
        </p>
        <div className="mt-auto flex flex-col gap-3 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              <PreviewPrice priceFrom={priceFrom} />
            </p>
            <Badge className="h-6 px-2.5 font-bold bg-accent text-accent-foreground">Disponible</Badge>
          </div>
          <span
            aria-hidden
            className={cn(
              buttonVariants({ variant: "outline" }),
              "pointer-events-none h-11 w-full font-semibold text-primary-strong",
            )}
          >
            Ver entradas
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
