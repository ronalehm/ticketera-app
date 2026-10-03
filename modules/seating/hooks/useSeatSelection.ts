"use client";

import { useState } from "react";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";
import type { SeatSelection, VenueMap } from "../types/seating.types";
import {
  buildSeatingCheckoutHref,
  getSelectionLines,
  getSelectionTicketCount,
  getSelectionTotal,
} from "../utils/selectionSummary";

const EMPTY_SELECTION: SeatSelection = { quantities: {}, seatIds: [] };

/** Estado de la selección de entradas sobre el mapa: zona activa, cantidades de pie y asientos. */
export function useSeatSelection(map: VenueMap) {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [selection, setSelection] = useState<SeatSelection>(EMPTY_SELECTION);

  const ticketCount = getSelectionTicketCount(selection);
  const atLimit = ticketCount >= MAX_TICKETS_PER_ORDER;

  function selectZone(zoneId: string) {
    setActiveZoneId(zoneId);
  }

  /** Solo zonas de pie no agotadas; "+" no hace nada en el límite y "−" no baja de 0. */
  function changeQuantity(zoneId: string, delta: 1 | -1) {
    const zone = map.zones.find((candidate) => candidate.id === zoneId);
    if (!zone || zone.kind !== "general" || zone.status === "sold-out") return;
    if (delta > 0 && atLimit) return;

    setActiveZoneId(zoneId);
    setSelection((current) => ({
      ...current,
      quantities: { ...current.quantities, [zoneId]: Math.max(0, (current.quantities[zoneId] ?? 0) + delta) },
    }));
  }

  return {
    activeZoneId,
    quantities: selection.quantities,
    seatIds: selection.seatIds,
    ticketCount,
    atLimit,
    lines: getSelectionLines(map, selection),
    total: getSelectionTotal(map, selection),
    checkoutHref: buildSeatingCheckoutHref(map.eventSlug, map, selection),
    selectZone,
    changeQuantity,
  };
}
