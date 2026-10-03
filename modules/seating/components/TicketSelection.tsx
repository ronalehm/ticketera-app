"use client";

import { useSeatSelection } from "../hooks/useSeatSelection";
import type { VenueMap } from "../types/seating.types";
import { getZoneTones } from "../utils/zoneTone";
import { MobilePurchaseBar } from "./MobilePurchaseBar";
import { PurchaseSummary } from "./PurchaseSummary";
import { VenueMapView } from "./VenueMapView";
import { ZoneList } from "./ZoneList";

type TicketSelectionProps = {
  map: VenueMap;
};

/**
 * Paso 1 de la compra: mapa de zonas + lista de entradas, con el resumen sticky en `lg` y la barra inferior en móvil.
 * Orden móvil = orden del DOM; por breakpoint solo se alternan el resumen y la barra (nunca se duplican para lectores).
 */
export function TicketSelection({ map }: TicketSelectionProps) {
  const selection = useSeatSelection(map);
  const tones = getZoneTones(map.zones);

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
          <ZoneList
            zones={map.zones}
            tones={tones}
            activeZoneId={selection.activeZoneId}
            quantities={selection.quantities}
            atLimit={selection.atLimit}
            onChangeQuantity={selection.changeQuantity}
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
