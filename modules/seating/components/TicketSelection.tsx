"use client";

import { useId } from "react";
import { flushSync } from "react-dom";

import { useSeatSelection } from "../hooks/useSeatSelection";
import type { VenueMap } from "../types/seating.types";
import { parseSeatId, resolveSeats } from "../utils/seatIds";
import { getZoneTones } from "../utils/zoneTone";
import { MobilePurchaseBar } from "./MobilePurchaseBar";
import { PurchaseSummary } from "./PurchaseSummary";
import { SeatPlan } from "./SeatPlan";
import { VenueMapView } from "./VenueMapView";
import { ZoneList } from "./ZoneList";

type TicketSelectionProps = {
  map: VenueMap;
};

/** Número de asientos elegidos por zona (la zona se toma del id del asiento). */
function countSeatsByZone(seatIds: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const seatId of seatIds) {
    const zoneId = parseSeatId(seatId)?.zoneId;
    if (zoneId) counts[zoneId] = (counts[zoneId] ?? 0) + 1;
  }
  return counts;
}

/**
 * Paso 1 de la compra: mapa de zonas, plano de asientos (zona numerada activa y no agotada) y lista de entradas, con
 * el resumen sticky en `lg` y la barra inferior en móvil.
 * Orden móvil = orden del DOM; por breakpoint solo se alternan el resumen y la barra (nunca se duplican para lectores).
 */
export function TicketSelection({ map }: TicketSelectionProps) {
  const selection = useSeatSelection(map);
  const planHeadingId = useId();
  const tones = getZoneTones(map.zones);

  const activeZone = map.zones.find((zone) => zone.id === selection.activeZoneId);
  const planZone = activeZone?.kind === "numbered" && activeZone.status !== "sold-out" ? activeZone : null;
  const seatCountByZone = countSeatsByZone(selection.seatIds);
  // La selección del hook solo contiene asientos válidos del mapa, así que `resolveSeats` no devuelve `null`.
  const selectedSeats = resolveSeats(map, selection.seatIds) ?? [];

  /** Activa la zona y lleva el foco al h2 del plano, que ya está montado tras el render síncrono. */
  const handleChooseSeats = (zoneId: string) => {
    flushSync(() => selection.selectZone(zoneId));
    document.getElementById(planHeadingId)?.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <VenueMapView
            viewBox={map.viewBox}
            stage={map.stage}
            venue={map.venue}
            zones={map.zones}
            tones={tones}
            activeZoneId={selection.activeZoneId}
            onSelectZone={selection.selectZone}
          />
          {planZone && (
            <SeatPlan
              zone={planZone}
              stageLabel={map.stage.label}
              selectedSeatIds={selection.seatIds}
              selectedSeats={selectedSeats}
              notice={selection.notice}
              canPickBest={!selection.atLimit || (seatCountByZone[planZone.id] ?? 0) > 0}
              onToggleSeat={selection.toggleSeat}
              onRemoveSeat={selection.removeSeat}
              onPickBestSeats={selection.pickBestSeats}
              headingId={planHeadingId}
            />
          )}
          <ZoneList
            zones={map.zones}
            tones={tones}
            activeZoneId={selection.activeZoneId}
            quantities={selection.quantities}
            atLimit={selection.atLimit}
            seatCountByZone={seatCountByZone}
            onChangeQuantity={selection.changeQuantity}
            onChooseSeats={handleChooseSeats}
          />
        </div>

        <PurchaseSummary
          lines={selection.lines}
          ticketCount={selection.ticketCount}
          total={selection.total}
          checkoutHref={selection.checkoutHref}
          className="hidden self-start lg:sticky lg:top-24 lg:flex"
        />
      </div>

      <MobilePurchaseBar
        ticketCount={selection.ticketCount}
        total={selection.total}
        checkoutHref={selection.checkoutHref}
        className="sticky bottom-0 z-30 -mx-4 md:-mx-6 lg:hidden"
      />
    </div>
  );
}
