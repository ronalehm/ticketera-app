import { Armchair, ChevronRight, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MAX_TICKETS_PER_ORDER, formatEventPrice } from "@/modules/events/purchase";

import type { VenueZone, ZoneTone } from "../types/seating.types";
import { ZONE_TONE_CLASSES } from "../utils/zoneTone";

type ZoneCardsProps = {
  zones: VenueZone[];
  tones: Record<string, ZoneTone>;
  highlightedZoneId: string | null;
  /** Entradas de pie o butacas elegidas por zona (las zonas sin selección pueden faltar). */
  selectedCountByZone: Record<string, number>;
  onOpenZone: (zoneId: string) => void;
  onHighlightZone: (zoneId: string | null) => void;
};

/** "1 entrada elegida" / "3 entradas elegidas" (de pie) o "1 butaca elegida" / "3 butacas elegidas" (numerada). */
export function formatSelectedCount(kind: VenueZone["kind"], count: number): string {
  const noun = kind === "numbered" ? "butaca" : "entrada";
  return count === 1 ? `1 ${noun} elegida` : `${count} ${noun}s elegidas`;
}

function getZoneCardAriaLabel(zone: VenueZone, selectedCount: number): string {
  const parts = [
    zone.name,
    zone.status === "sold-out" ? "agotado" : `${formatEventPrice(zone.price)} c/u`,
    zone.kind === "numbered" ? "numerada, elige tu butaca" : "general sin butaca",
  ];
  if (zone.status === "low-stock") parts.push("últimas entradas");
  if (selectedCount > 0) parts.push(formatSelectedCount(zone.kind, selectedCount));
  return parts.join(", ");
}

export function ZoneCards({
  zones,
  tones,
  highlightedZoneId,
  selectedCountByZone,
  onOpenZone,
  onHighlightZone,
}: ZoneCardsProps) {
  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="Zonas" className="grid gap-3 sm:grid-cols-2">
        {zones.map((zone) => {
          const soldOut = zone.status === "sold-out";
          const selectedCount = selectedCountByZone[zone.id] ?? 0;
          const TypeIcon = zone.kind === "numbered" ? Armchair : Users;

          return (
            <li key={zone.id} className="flex">
              <button
                type="button"
                data-zone-id={zone.id}
                data-highlighted={!soldOut && zone.id === highlightedZoneId}
                aria-label={getZoneCardAriaLabel(zone, selectedCount)}
                aria-disabled={soldOut || undefined}
                className={cn(
                  "flex min-h-18 w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  soldOut
                    ? "cursor-not-allowed"
                    : "cursor-pointer hover:border-primary/40 hover:bg-accent/40 data-[highlighted=true]:border-primary/40 data-[highlighted=true]:bg-accent/40",
                )}
                onClick={() => {
                  if (!soldOut) onOpenZone(zone.id);
                }}
                onPointerEnter={() => {
                  if (!soldOut) onHighlightZone(zone.id);
                }}
                onPointerLeave={() => onHighlightZone(null)}
                onFocus={() => {
                  if (!soldOut) onHighlightZone(zone.id);
                }}
                onBlur={() => onHighlightZone(null)}
              >
                <span aria-hidden className={cn("w-1.5 self-stretch rounded-full", ZONE_TONE_CLASSES[tones[zone.id]].swatch)} />

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-base font-bold">{zone.name}</span>
                    {zone.status === "low-stock" && (
                      <Badge className="h-6 bg-warning font-bold text-warning-foreground">Últimas entradas</Badge>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <TypeIcon className="size-4 shrink-0" aria-hidden />
                    {zone.kind === "numbered" ? "Numerada · elige tu butaca" : "General · sin butaca"}
                  </span>
                  {selectedCount > 0 && (
                    <span className="text-sm font-medium text-primary-strong tabular-nums">
                      {formatSelectedCount(zone.kind, selectedCount)}
                    </span>
                  )}
                </span>

                {soldOut ? (
                  <span className="shrink-0 font-bold text-muted-foreground">Agotado</span>
                ) : (
                  <>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="text-xs text-muted-foreground">c/u</span>
                      <span className="text-base font-bold text-foreground tabular-nums">
                        {formatEventPrice(zone.price)}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-sm text-muted-foreground">
        Precio final por entrada, sin cargos ocultos. Máximo {MAX_TICKETS_PER_ORDER} entradas por compra.
      </p>
    </div>
  );
}
