"use client";

import { useSearchParams } from "next/navigation";

import type { VenueMap } from "../types/seating.types";
import { parseSeatingPreselection } from "../utils/selectionSummary";
import { parseInitialZoneId } from "../utils/zoneParam";
import { TicketSelection } from "./TicketSelection";

/**
 * `TicketSelection` con la selección y la zona inicial leídas de la URL. Va dentro de un `Suspense` cuyo `fallback`
 * es el propio `TicketSelection` sin precarga, para que la ruta siga prerenderizada (decisión 15).
 */
export function PreselectedTicketSelection({ map }: { map: VenueMap }) {
  const searchParams = useSearchParams();
  return (
    <TicketSelection
      map={map}
      initialSelection={parseSeatingPreselection(map, searchParams)}
      initialZoneId={parseInitialZoneId(map.zones, searchParams)}
    />
  );
}
