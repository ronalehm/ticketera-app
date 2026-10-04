"use client";

import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { flushSync } from "react-dom";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";

import { useSeatSelection } from "../hooks/useSeatSelection";
import type { VenueMap, VenueZone } from "../types/seating.types";
import { resolveSeats } from "../utils/seatIds";
import { parseViewBox } from "../utils/viewBox";
import { getZoneTones } from "../utils/zoneTone";
import { MobilePurchaseBar } from "./MobilePurchaseBar";
import { PurchaseSummary } from "./PurchaseSummary";
import { SeatPlan } from "./SeatPlan";
import { VenueMapView } from "./VenueMapView";
import { ZoneCards } from "./ZoneCards";
import { ZoneQuantityPanel } from "./ZoneQuantityPanel";
import { ZoneStepHeader } from "./ZoneStepHeader";

type TicketSelectionProps = {
  map: VenueMap;
};

const STEP_ENTER_CLASS = "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300";

function getStepLabel(zone: VenueZone | undefined): string {
  if (!zone) return "Paso 1 de 2 · Elige una zona";
  return zone.kind === "numbered" ? "Paso 2 de 2 · Elige tus butacas" : "Paso 2 de 2 · Elige la cantidad";
}

/** Origen de la transición: la etiqueta de la zona, en % del viewBox del mapa (decisión 26). */
function getOriginStyle(zone: VenueZone, width: number, height: number): CSSProperties {
  return { transformOrigin: `${(zone.labelPos.x / width) * 100}% ${(zone.labelPos.y / height) * 100}%` };
}

/**
 * Paso "Entradas" de la compra: una tarjeta "Elige tus entradas" con dos sub-pasos (1: mapa + tarjetas de zona; 2:
 * cantidad de una zona de pie o plano de una numerada), con "Tu compra" sticky en `lg` y la barra inferior en móvil.
 * Orden móvil = orden del DOM; por breakpoint solo se alternan el resumen y la barra (nunca se duplican para lectores).
 */
export function TicketSelection({ map }: TicketSelectionProps) {
  const selection = useSeatSelection(map);
  const titleId = useId();
  const zoneHeadingId = useId();
  const [highlightedZoneId, setHighlightedZoneId] = useState<string | null>(null);
  const [returnZoneId, setReturnZoneId] = useState<string | null>(null);

  const tones = getZoneTones(map.zones);
  const { width, height } = parseViewBox(map.viewBox);
  const activeZone = map.zones.find((zone) => zone.id === selection.activeZoneId);
  const returnZone = map.zones.find((zone) => zone.id === returnZoneId);
  // Las líneas ya cuentan las entradas de pie y las butacas de cada zona.
  const selectedCountByZone = Object.fromEntries(selection.lines.map((line) => [line.zoneId, line.quantity]));
  // La selección del hook solo contiene asientos válidos del mapa, así que `resolveSeats` no devuelve `null`.
  const selectedSeats = resolveSeats(map, selection.seatIds) ?? [];

  /** Abre el sub-paso 2 y lleva el foco al h3 de la zona, ya montado tras el render síncrono. */
  const handleOpenZone = (zoneId: string) => {
    flushSync(() => {
      selection.selectZone(zoneId);
      setHighlightedZoneId(null);
    });
    document.getElementById(zoneHeadingId)?.focus();
  };

  /** Vuelve al sub-paso 1 y lleva el foco a la tarjeta de la zona que se cerró. */
  const handleBack = (zoneId: string) => {
    flushSync(() => {
      selection.closeZone();
      setHighlightedZoneId(null);
      setReturnZoneId(zoneId);
    });
    document.querySelector<HTMLElement>(`[data-zone-id="${zoneId}"]`)?.focus();
  };

  const renderZoneStep = (zone: VenueZone) => {
    const selectedInZone = selectedCountByZone[zone.id] ?? 0;
    // Decisión 11: las que ya tiene la zona + las que aún caben en la compra.
    const seatLimit = selectedInZone + (MAX_TICKETS_PER_ORDER - selection.ticketCount);

    return (
      <>
        <ZoneStepHeader zone={zone} headingId={zoneHeadingId} onBack={() => handleBack(zone.id)}>
          {zone.kind === "numbered" && (
            <p aria-live="polite" className="text-sm font-medium tabular-nums">
              {selectedInZone} de {seatLimit} butacas
            </p>
          )}
        </ZoneStepHeader>

        {zone.kind === "general" ? (
          <ZoneQuantityPanel
            zoneName={zone.name}
            price={zone.price}
            quantity={selectedInZone}
            atLimit={selection.atLimit}
            onChangeQuantity={(delta) => selection.changeQuantity(zone.id, delta)}
          />
        ) : (
          <SeatPlan
            zone={zone}
            venue={map}
            selectedSeatIds={selection.seatIds}
            selectedSeats={selectedSeats}
            notice={selection.notice}
            seatLimit={seatLimit}
            selectedInZone={selectedInZone}
            onToggleSeat={selection.toggleSeat}
            onRemoveSeat={selection.removeSeat}
            onPickBestSeats={selection.pickBestSeats}
            headingId={zoneHeadingId}
          />
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <section aria-labelledby={titleId} className="min-w-0">
          <Card className="gap-5 rounded-2xl ring-border">
            <CardHeader className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id={titleId} className="text-xl font-bold tracking-tight">
                Elige tus entradas
              </h2>
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {getStepLabel(activeZone)}
              </p>
            </CardHeader>

            <CardContent>
              {activeZone ? (
                // La key reinicia la animación de entrada en cada zona.
                <div
                  key={activeZone.id}
                  className={cn(STEP_ENTER_CLASS, "flex flex-col gap-4 motion-safe:zoom-in-95 motion-safe:ease-out")}
                  style={getOriginStyle(activeZone, width, height)}
                >
                  {renderZoneStep(activeZone)}
                </div>
              ) : (
                // Sin animación en el primer render: solo al volver de una zona, "alejándose" desde ella.
                <div
                  key="zones"
                  className={cn("flex flex-col gap-5", returnZone && cn(STEP_ENTER_CLASS, "motion-safe:zoom-in-105"))}
                  style={returnZone && getOriginStyle(returnZone, width, height)}
                >
                  <VenueMapView
                    viewBox={map.viewBox}
                    stage={map.stage}
                    venue={map.venue}
                    zones={map.zones}
                    tones={tones}
                    highlightedZoneId={highlightedZoneId}
                    selectedCountByZone={selectedCountByZone}
                    onOpenZone={handleOpenZone}
                    onHighlightZone={setHighlightedZoneId}
                  />
                  <ZoneCards
                    zones={map.zones}
                    tones={tones}
                    highlightedZoneId={highlightedZoneId}
                    selectedCountByZone={selectedCountByZone}
                    onOpenZone={handleOpenZone}
                    onHighlightZone={setHighlightedZoneId}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <PurchaseSummary
          lines={selection.lines}
          ticketCount={selection.ticketCount}
          total={selection.total}
          checkoutHref={selection.checkoutHref}
          className="hidden self-start lg:sticky lg:top-24 lg:flex"
        />
      </div>

      <MobilePurchaseBar
        lines={selection.lines}
        ticketCount={selection.ticketCount}
        total={selection.total}
        checkoutHref={selection.checkoutHref}
        className="sticky bottom-0 z-30 -mx-4 md:-mx-6 lg:hidden"
      />
    </div>
  );
}
