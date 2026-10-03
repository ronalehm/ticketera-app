import { Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MAX_TICKETS_PER_ORDER, formatEventPrice } from "@/modules/events/purchase";

import type { VenueZone, ZoneTone } from "../types/seating.types";
import { ZONE_TONE_CLASSES } from "../utils/zoneTone";

type ZoneListProps = {
  zones: VenueZone[];
  tones: Record<string, ZoneTone>;
  activeZoneId: string | null;
  quantities: Record<string, number>;
  atLimit: boolean;
  onChangeQuantity: (zoneId: string, delta: 1 | -1) => void;
};

// Como en TicketSelector: focusableWhenDisabled no pone `disabled`, así que se neutralizan a mano el hover y el
// desplazamiento al pulsar del Button.
const STEPPER_BUTTON_CLASS =
  "size-11 cursor-pointer aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:not-aria-[haspopup]:translate-y-0";

export function ZoneList({ zones, tones, activeZoneId, quantities, atLimit, onChangeQuantity }: ZoneListProps) {
  return (
    <Card className="gap-2 rounded-2xl ring-border">
      <CardHeader>
        <h2 className="text-xl font-bold tracking-tight">Entradas</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="-mx-3 flex flex-col divide-y divide-border">
          {zones.map((zone) => {
            const quantity = quantities[zone.id] ?? 0;

            return (
              <li
                key={zone.id}
                className={cn(
                  "flex min-h-18 items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-200",
                  zone.id === activeZoneId && "bg-accent",
                )}
              >
                <span aria-hidden className={cn("size-3.5 shrink-0 rounded-sm", ZONE_TONE_CLASSES[tones[zone.id]].swatch)} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-base font-bold">{zone.name}</p>
                    {zone.status === "low-stock" && (
                      <Badge className="h-6 px-2.5 font-bold bg-warning text-warning-foreground">Últimas entradas</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground tabular-nums">{formatEventPrice(zone.price)} c/u</p>
                </div>

                {zone.status === "sold-out" ? (
                  <span className="flex h-11 shrink-0 items-center rounded-lg bg-muted px-4 text-sm font-bold text-muted-foreground">
                    Agotado
                  </span>
                ) : zone.kind === "general" ? (
                  <div className="flex shrink-0 items-center gap-1 rounded-xl border p-0.5">
                    <Button
                      variant="secondary"
                      size="icon"
                      className={cn(STEPPER_BUTTON_CLASS, "aria-disabled:hover:bg-secondary")}
                      aria-label={`Quitar una entrada de ${zone.name}`}
                      disabled={quantity === 0}
                      focusableWhenDisabled
                      onClick={() => onChangeQuantity(zone.id, -1)}
                    >
                      <Minus className="size-5" aria-hidden />
                    </Button>
                    <span aria-live="polite" className="w-8 text-center text-base font-bold tabular-nums">
                      {quantity}
                    </span>
                    <Button
                      size="icon"
                      className={cn(STEPPER_BUTTON_CLASS, "hover:bg-primary-strong aria-disabled:hover:bg-primary")}
                      aria-label={`Agregar una entrada de ${zone.name}`}
                      disabled={atLimit}
                      focusableWhenDisabled
                      onClick={() => onChangeQuantity(zone.id, 1)}
                    >
                      <Plus className="size-5" aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <p className="max-w-36 shrink-0 text-right text-sm text-muted-foreground">
                    Elección de asientos próximamente
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <p role="status" className="border-t pt-3 text-sm text-muted-foreground">
          {atLimit
            ? `Llegaste al máximo de ${MAX_TICKETS_PER_ORDER} entradas por compra.`
            : `Máximo ${MAX_TICKETS_PER_ORDER} entradas por compra.`}
        </p>
      </CardContent>
    </Card>
  );
}
