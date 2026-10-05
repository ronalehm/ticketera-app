import { Armchair, ChevronRight, Users } from "lucide-react";
import { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_TICKETS_PER_ORDER, formatEventPrice } from "@/modules/events/purchase";

import type { VenueZone, ZoneTone } from "../types/seating.types";
import { ZONE_TONE_CLASSES } from "../utils/zoneTone";
import { QuantityStepper } from "./QuantityStepper";

type ZoneCardsProps = {
  zones: VenueZone[];
  tones: Record<string, ZoneTone>;
  highlightedZoneId: string | null;
  /** Entradas de pie o butacas elegidas por zona (las zonas sin selección pueden faltar). */
  selectedCountByZone: Record<string, number>;
  /** La compra llegó al máximo de entradas: los "+" quedan deshabilitados. */
  atLimit: boolean;
  /** Cambia la cantidad de una zona de pie. */
  onChangeQuantity: (zoneId: string, delta: 1 | -1) => void;
  /** Abre el plano de una zona numerada. */
  onOpenZone: (zoneId: string) => void;
  onHighlightZone: (zoneId: string | null) => void;
};

type ZoneCardProps = Omit<ZoneCardsProps, "zones" | "tones" | "highlightedZoneId" | "selectedCountByZone"> & {
  zone: VenueZone;
  tone: ZoneTone;
  highlighted: boolean;
  selectedCount: number;
};

/** "1 entrada elegida" / "3 entradas elegidas" (de pie) o "1 butaca elegida" / "3 butacas elegidas" (numerada). */
export function formatSelectedCount(kind: VenueZone["kind"], count: number): string {
  const noun = kind === "numbered" ? "butaca" : "entrada";
  return count === 1 ? `1 ${noun} elegida` : `${count} ${noun}s elegidas`;
}

function ZoneCardAction({
  zone,
  selectedCount,
  atLimit,
  onChangeQuantity,
  onOpenZone,
}: Pick<ZoneCardProps, "zone" | "selectedCount" | "atLimit" | "onChangeQuantity" | "onOpenZone">) {
  if (zone.status === "sold-out") return <span className="font-bold text-muted-foreground">Agotado</span>;

  if (zone.kind === "numbered") {
    const label = selectedCount > 0 ? "Cambiar butacas" : "Elegir butacas";

    return (
      <Button
        variant="outline"
        className="h-11 cursor-pointer gap-1.5 font-semibold text-primary-strong"
        aria-label={`${label} de ${zone.name}`}
        onClick={() => onOpenZone(zone.id)}
      >
        {label}
        <ChevronRight aria-hidden />
      </Button>
    );
  }

  return (
    <QuantityStepper
      aria-label={`Cantidad de ${zone.name}`}
      value={selectedCount}
      decrementLabel={`Quitar una entrada de ${zone.name}`}
      incrementLabel={`Agregar una entrada de ${zone.name}`}
      canDecrement={selectedCount > 0}
      canIncrement={!atLimit}
      onDecrement={() => onChangeQuantity(zone.id, -1)}
      onIncrement={() => onChangeQuantity(zone.id, 1)}
    />
  );
}

/** Tarjeta de zona: no es un botón; el control (stepper o "Elegir butacas") va en línea (decisión 34). */
function ZoneCard({ zone, tone, highlighted, selectedCount, onHighlightZone, ...actionProps }: ZoneCardProps) {
  const nameId = useId();
  const soldOut = zone.status === "sold-out";
  const TypeIcon = zone.kind === "numbered" ? Armchair : Users;

  const highlight = () => {
    if (!soldOut) onHighlightZone(zone.id);
  };

  return (
    // tabIndex={-1}: recibe el foco al volver del sub-paso 2 (decisión 20 enmendada), sin ser parada de Tab.
    <div
      role="group"
      aria-labelledby={nameId}
      tabIndex={-1}
      data-zone-id={zone.id}
      data-highlighted={!soldOut && highlighted}
      className={cn(
        "flex min-h-18 w-full gap-3 rounded-xl border bg-card p-3 outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
        !soldOut && "data-[highlighted=true]:border-primary/40 data-[highlighted=true]:bg-accent/40",
      )}
      onPointerEnter={highlight}
      onPointerLeave={() => onHighlightZone(null)}
      onFocus={highlight}
      onBlur={(event) => {
        // Pasar de "−" a "+" de la misma tarjeta no apaga el resaltado.
        if (!event.currentTarget.contains(event.relatedTarget)) onHighlightZone(null);
      }}
    >
      <span aria-hidden className={cn("w-1.5 self-stretch rounded-full", ZONE_TONE_CLASSES[tone].swatch)} />

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-40 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span id={nameId} className="text-base font-bold">
              {zone.name}
            </span>
            {zone.status === "low-stock" && (
              <Badge className="h-6 bg-warning font-bold text-warning-foreground">Últimas entradas</Badge>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TypeIcon className="size-4 shrink-0" aria-hidden />
            {zone.kind === "numbered" ? "Numerada · elige tu butaca" : "General · sin butaca"}
          </span>
          {!soldOut && (
            <span>
              <span className="text-base font-bold text-foreground tabular-nums">{formatEventPrice(zone.price)}</span>
              <span className="text-sm text-muted-foreground"> c/u</span>
            </span>
          )}
          {zone.kind === "numbered" && selectedCount > 0 && (
            <span className="text-sm font-medium text-primary-strong">
              {formatSelectedCount(zone.kind, selectedCount)}
            </span>
          )}
        </div>

        <div className="ml-auto shrink-0">
          <ZoneCardAction zone={zone} selectedCount={selectedCount} {...actionProps} />
        </div>
      </div>
    </div>
  );
}

export function ZoneCards({ zones, tones, highlightedZoneId, selectedCountByZone, ...cardProps }: ZoneCardsProps) {
  const availableCount = zones.filter((zone) => zone.status !== "sold-out").length;

  return (
    <div className="@container flex flex-col gap-3">
      {availableCount >= 2 && (
        <p className="text-sm text-muted-foreground">Puedes combinar varias zonas en una misma compra.</p>
      )}

      <ul aria-label="Zonas" className="grid gap-3 @xl:grid-cols-2">
        {zones.map((zone) => (
          <li key={zone.id} className="flex">
            <ZoneCard
              zone={zone}
              tone={tones[zone.id]}
              highlighted={zone.id === highlightedZoneId}
              selectedCount={selectedCountByZone[zone.id] ?? 0}
              {...cardProps}
            />
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted-foreground">
        Precio final por entrada, sin cargos ocultos.{" "}
        <span role="status">
          {cardProps.atLimit
            ? `Llegaste al máximo de ${MAX_TICKETS_PER_ORDER} entradas por compra.`
            : `Máximo ${MAX_TICKETS_PER_ORDER} entradas por compra.`}
        </span>
      </p>
    </div>
  );
}
