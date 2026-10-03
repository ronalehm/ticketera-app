import type { KeyboardEvent } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEventPrice } from "@/modules/events/purchase";

import type { VenueMap, VenueZone, ZoneTone } from "../types/seating.types";
import { ZONE_TONE_CLASSES } from "../utils/zoneTone";

type VenueMapViewProps = Pick<VenueMap, "viewBox" | "stage" | "venue"> & {
  zones: VenueZone[];
  tones: Record<string, ZoneTone>;
  activeZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
};

// Geometría de las etiquetas en unidades del viewBox (decisión 10). A 375 px el SVG de 600 unidades se pinta a
// ~287 px (0.48 px/unidad), así que 26 → ~12.4 px (≥ 12 px). El bloque de 3 líneas mide 2·30 + 2 + 32 = 94
// unidades y cabe en las zonas "Últimas entradas" más bajas de los mocks (104).
const LABEL_FONT_SIZE = 26;
const LABEL_LINE_HEIGHT = 30;
const PILL_WIDTH = 264;
const PILL_HEIGHT = 32;

function getZoneAriaLabel(zone: VenueZone): string {
  const parts = [zone.name, zone.status === "sold-out" ? "agotado" : formatEventPrice(zone.price)];
  if (zone.kind === "numbered") parts.push("asientos numerados");
  if (zone.status === "low-stock") parts.push("últimas entradas");
  return parts.join(", ");
}

function ZoneLabel({ zone, className }: { zone: VenueZone; className: string }) {
  const { x, y } = zone.labelPos;
  const lowStock = zone.status === "low-stock";
  // Bloque de 2 líneas (nombre, precio) o 3 con la píldora, centrado verticalmente en labelPos.
  const top = y - (lowStock ? 2 * LABEL_LINE_HEIGHT + PILL_HEIGHT + 2 : 2 * LABEL_LINE_HEIGHT) / 2;
  const pillTop = top + 2 * LABEL_LINE_HEIGHT + 2;

  return (
    <g aria-hidden className="pointer-events-none" textAnchor="middle" fontSize={LABEL_FONT_SIZE}>
      <text x={x} dominantBaseline="central" y={top + LABEL_LINE_HEIGHT / 2} className={cn("font-bold", className)}>
        {zone.name}
      </text>
      <text x={x} dominantBaseline="central" y={top + LABEL_LINE_HEIGHT * 1.5} className={cn("font-medium", className)}>
        {zone.status === "sold-out" ? "Agotado" : formatEventPrice(zone.price)}
      </text>
      {lowStock && (
        <>
          <rect
            x={x - PILL_WIDTH / 2}
            y={pillTop}
            width={PILL_WIDTH}
            height={PILL_HEIGHT}
            rx={PILL_HEIGHT / 2}
            className="fill-warning"
          />
          <text x={x} dominantBaseline="central" y={pillTop + PILL_HEIGHT / 2} className="fill-warning-foreground font-bold">
            Últimas entradas
          </text>
        </>
      )}
    </g>
  );
}

export function VenueMapView({ viewBox, stage, venue, zones, tones, activeZoneId, onSelectZone }: VenueMapViewProps) {
  const handleKeyDown = (event: KeyboardEvent<SVGPathElement>, zoneId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelectZone(zoneId);
  };

  return (
    <Card className="gap-4 rounded-2xl ring-border">
      <CardHeader className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-bold tracking-tight">Elige tu zona</h2>
        <p className="text-sm text-muted-foreground">Toca una zona del mapa</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl bg-muted p-3">
          <svg viewBox={viewBox} className="h-auto w-full" role="group" aria-label={`Mapa de zonas de ${venue}`}>
            <g aria-hidden>
              <path d={stage.path} className="fill-foreground" />
              <text
                x={stage.labelPos.x}
                y={stage.labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={LABEL_FONT_SIZE}
                className="fill-background font-bold tracking-widest uppercase"
              >
                {stage.label}
              </text>
            </g>

            {zones.map((zone) => {
              const tone = ZONE_TONE_CLASSES[tones[zone.id]];
              const isActive = zone.id === activeZoneId;

              return (
                <g key={zone.id}>
                  {isActive && (
                    <path d={zone.path} aria-hidden className="pointer-events-none fill-none stroke-brand-navy stroke-8" />
                  )}
                  <path
                    d={zone.path}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    aria-label={getZoneAriaLabel(zone)}
                    className={cn(
                      "cursor-pointer outline-none transition-[fill,stroke,opacity] duration-200 hover:opacity-85",
                      tone.shape,
                      isActive && "stroke-background stroke-3",
                      "focus-visible:stroke-ring focus-visible:stroke-4 focus-visible:[stroke-dasharray:8_6]",
                    )}
                    onClick={() => onSelectZone(zone.id)}
                    onKeyDown={(event) => handleKeyDown(event, zone.id)}
                  />
                  <ZoneLabel zone={zone} className={tone.label} />
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
