import Link from "next/link";
import { ArrowRight, ChevronRight, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@/modules/events";
import { formatEventPrice } from "@/modules/events/purchase";

import type { VenueZone, ZoneTone } from "../types/seating.types";
import { buildZoneEntryHref } from "../utils/zoneParam";
import { getZoneTones, ZONE_TONE_CLASSES } from "../utils/zoneTone";

type ZonePricesCardProps = {
  slug: string;
  status: EventStatus;
  priceFrom: number;
  zones: VenueZone[];
};

const CTA_CLASS = cn(
  buttonVariants(),
  "h-11 w-full cursor-pointer gap-2 font-semibold duration-200 hover:bg-primary-strong focus-visible:ring-ring",
);

const ZONE_LINK_CLASS =
  "group -mx-2 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** "Elegir entradas de VIP, S/ 550.00, últimas entradas": contiene el nombre visible de la zona (WCAG 2.5.3). */
function getZoneLinkLabel(zone: VenueZone) {
  const label = `Elegir entradas de ${zone.name}, ${formatEventPrice(zone.price)}`;
  return zone.status === "low-stock" ? `${label}, últimas entradas` : label;
}

/** Muestra de tono, nombre y "Últimas entradas": igual en las filas enlace y en las de texto. */
function ZoneLabel({ zone, tone }: { zone: VenueZone; tone: ZoneTone }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
      <span aria-hidden className={cn("size-3.5 shrink-0 rounded-sm", ZONE_TONE_CLASSES[tone].swatch)} />
      <span className="text-base font-medium">{zone.name}</span>
      {zone.status === "low-stock" && (
        <Badge className="h-6 bg-warning px-2.5 font-bold text-warning-foreground">Últimas entradas</Badge>
      )}
    </div>
  );
}

export function ZonePricesCard({ slug, status, priceFrom, zones }: ZonePricesCardProps) {
  const tones = getZoneTones(zones);
  const eventSoldOut = status === "sold-out";

  return (
    <Card className="gap-5 rounded-2xl ring-border lg:sticky lg:top-24">
      <CardHeader className="gap-3">
        <h2 className="text-xl font-bold tracking-tight">Entradas</h2>
        <p className="flex flex-col gap-0.5">
          <span className="text-sm text-muted-foreground">Entradas desde</span>
          <span className="text-3xl font-bold tracking-tight tabular-nums">{formatEventPrice(priceFrom)}</span>
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <ul aria-label="Zonas" className="flex flex-col divide-y divide-border border-y">
          {zones.map((zone) =>
            zone.status !== "sold-out" && !eventSoldOut ? (
              <li key={zone.id}>
                <Link
                  href={buildZoneEntryHref(slug, zone.id)}
                  aria-label={getZoneLinkLabel(zone)}
                  className={ZONE_LINK_CLASS}
                >
                  <ZoneLabel zone={zone} tone={tones[zone.id]} />
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="text-base font-bold tabular-nums">{formatEventPrice(zone.price)}</span>
                    <ChevronRight
                      className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            ) : (
              <li key={zone.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
                <ZoneLabel zone={zone} tone={tones[zone.id]} />
                {zone.status === "sold-out" ? (
                  <span className="mr-6 shrink-0 text-sm font-bold text-muted-foreground">Agotado</span>
                ) : (
                  <span className="mr-6 shrink-0 text-base font-bold tabular-nums">
                    {formatEventPrice(zone.price)}
                  </span>
                )}
              </li>
            ),
          )}
        </ul>

        {eventSoldOut ? (
          <p className="rounded-lg bg-muted p-3 text-center text-base font-bold">Entradas agotadas</p>
        ) : (
          <Link href={`/eventos/${slug}/entradas`} className={CTA_CLASS}>
            Ver mapa de zonas
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        )}

        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden />
          Pago seguro · Entrada digital con QR
        </p>
      </CardContent>
    </Card>
  );
}
