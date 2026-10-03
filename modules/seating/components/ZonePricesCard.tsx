import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@/modules/events";
import { formatEventPrice } from "@/modules/events/purchase";

import type { VenueZone } from "../types/seating.types";
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

export function ZonePricesCard({ slug, status, priceFrom, zones }: ZonePricesCardProps) {
  const tones = getZoneTones(zones);

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
        <ul className="flex flex-col divide-y divide-border border-y">
          {zones.map((zone) => (
            <li key={zone.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                <span
                  aria-hidden
                  className={cn("size-3.5 shrink-0 rounded-sm", ZONE_TONE_CLASSES[tones[zone.id]].swatch)}
                />
                <span className="text-base font-medium">{zone.name}</span>
                {zone.status === "low-stock" && (
                  <Badge className="h-6 bg-warning px-2.5 font-bold text-warning-foreground">Últimas entradas</Badge>
                )}
              </div>
              {zone.status === "sold-out" ? (
                <span className="shrink-0 text-sm font-bold text-muted-foreground">Agotado</span>
              ) : (
                <span className="shrink-0 text-base font-bold tabular-nums">{formatEventPrice(zone.price)}</span>
              )}
            </li>
          ))}
        </ul>

        {status === "sold-out" ? (
          <p className="rounded-lg bg-muted p-3 text-center text-base font-bold">Entradas agotadas</p>
        ) : (
          <Link href={`/eventos/${slug}/entradas`} className={CTA_CLASS}>
            Elegir entradas
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
