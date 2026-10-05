import { Check } from "lucide-react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { formatEventPrice } from "@/modules/events/purchase";

import type { Point, VenueMap, VenueZone, ZoneTone } from "../types/seating.types";
import { parseViewBox } from "../utils/viewBox";
import { ZONE_TONE_CLASSES } from "../utils/zoneTone";

type VenueMapViewProps = Pick<VenueMap, "viewBox" | "stage" | "venue"> & {
  zones: VenueZone[];
  tones: Record<string, ZoneTone>;
  highlightedZoneId: string | null;
  /** Entradas de pie o butacas elegidas por zona (las zonas sin selección pueden faltar). */
  selectedCountByZone: Record<string, number>;
};

/** Radio de las luces del escenario, en unidades del viewBox. */
const STAGE_LIGHT_RADIUS = 5;

/** Posición de una etiqueta HTML en % del viewBox, para que no escale con el ancho (decisión 18). */
function getLabelStyle({ x, y }: Point, width: number, height: number): CSSProperties {
  return { left: `${(x / width) * 100}%`, top: `${(y / height) * 100}%` };
}

const LABEL_CLASS = "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center leading-[1.15]";

function ZoneName({ name, wrap }: { name: string; wrap: boolean }) {
  const splitAt = wrap ? name.indexOf(" ") : -1;
  if (splitAt === -1) return <span className="text-xs font-bold whitespace-nowrap md:text-sm">{name}</span>;

  // El espacio queda al final de la 1.ª línea: no se ve, pero mantiene "Tribuna Occidente" como texto.
  return (
    <span className="flex flex-col text-xs font-bold md:text-sm">
      <span className="whitespace-nowrap">{name.slice(0, splitAt + 1)}</span>
      <span className="whitespace-nowrap">{name.slice(splitAt + 1)}</span>
    </span>
  );
}

export function VenueMapView({
  viewBox,
  stage,
  venue,
  zones,
  tones,
  highlightedZoneId,
  selectedCountByZone,
}: VenueMapViewProps) {
  const { width, height } = parseViewBox(viewBox);
  const highlightedZone = zones.find((zone) => zone.id === highlightedZoneId && zone.status !== "sold-out");
  const isDimmed = (zoneId: string) => highlightedZone !== undefined && zoneId !== highlightedZone.id;

  return (
    <div className="rounded-xl bg-muted p-3 md:p-4">
      <div
        className="relative mx-auto w-full"
        style={{ aspectRatio: `${width} / ${height}`, maxWidth: `calc(min(64svh, 600px) * ${width} / ${height})` }}
      >
        <svg viewBox={viewBox} className="absolute inset-0 size-full" role="img" aria-label={`Mapa de zonas de ${venue}`}>
          <g aria-hidden>
            <path d={stage.path} className="fill-brand-navy" />
            {stage.lights?.map((light) => (
              <circle key={`${light.x}-${light.y}`} cx={light.x} cy={light.y} r={STAGE_LIGHT_RADIUS} className="fill-highlight" />
            ))}
          </g>

          {/* Ilustración: las formas no son controles; la acción y el resaltado llegan desde las tarjetas (decisión 38). */}
          {zones.map((zone) => (
            <path
              key={zone.id}
              d={zone.path}
              data-zone-id={zone.id}
              className={cn(
                "stroke-background stroke-3 transition-opacity duration-200",
                ZONE_TONE_CLASSES[tones[zone.id]].shape,
                isDimmed(zone.id) && "opacity-40",
              )}
            />
          ))}

          {/* Trazo superpuesto (no un halo detrás): las formas translúcidas dejarían verlo por dentro (decisión 28). */}
          {highlightedZone && (
            <path
              d={highlightedZone.path}
              aria-hidden
              className="pointer-events-none fill-none stroke-brand-navy stroke-4"
            />
          )}
        </svg>

        <div aria-hidden className="pointer-events-none absolute inset-0">
          <span
            className={cn(LABEL_CLASS, "text-xs font-bold tracking-widest text-background uppercase md:text-sm")}
            style={getLabelStyle(stage.labelPos, width, height)}
          >
            {stage.label}
          </span>

          {zones.map((zone) => {
            const selectedCount = selectedCountByZone[zone.id] ?? 0;

            return (
              <div
                key={zone.id}
                className={cn(
                  LABEL_CLASS,
                  "transition-opacity duration-200",
                  ZONE_TONE_CLASSES[tones[zone.id]].label,
                  isDimmed(zone.id) && "opacity-40",
                )}
                style={getLabelStyle(zone.labelPos, width, height)}
              >
                <ZoneName name={zone.name} wrap={zone.wrapLabel === true} />
                <span className="flex items-center text-xs font-medium whitespace-nowrap tabular-nums md:text-sm">
                  {zone.status === "sold-out" ? "Agotado" : formatEventPrice(zone.price)}
                  {selectedCount > 0 && (
                    <span className="ml-1 inline-flex h-5 items-center gap-0.5 rounded-full bg-background px-1.5 text-xs font-bold text-foreground tabular-nums ring-1 ring-border">
                      <Check className="size-3" aria-hidden />
                      {selectedCount}
                    </span>
                  )}
                </span>
                {zone.status === "low-stock" && (
                  <span className="mt-1 hidden rounded-full bg-warning px-2 py-0.5 text-xs font-bold whitespace-nowrap text-warning-foreground md:inline-flex">
                    Últimas entradas
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
