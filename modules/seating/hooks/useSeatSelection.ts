"use client";

import { useState } from "react";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";
import type { NumberedVenueZone, SeatSelection, VenueMap } from "../types/seating.types";
import { findBestAvailableSeats } from "../utils/bestSeats";
import { formatSeatShortLabel, parseSeatId, resolveSeats } from "../utils/seatIds";
import {
  buildSeatingCheckoutHref,
  getSelectionLines,
  getSelectionTicketCount,
} from "../utils/selectionSummary";

type SelectionState = { selection: SeatSelection; notice: string | null };

const INITIAL_STATE: SelectionState = { selection: { quantities: {}, seatIds: [] }, notice: null };
const LIMIT_NOTICE = `Máximo ${MAX_TICKETS_PER_ORDER} entradas por compra`;

function isAtLimit(selection: SeatSelection): boolean {
  return getSelectionTicketCount(selection) >= MAX_TICKETS_PER_ORDER;
}

/** Nueva selección: el aviso se limpia solo si la selección cambia de verdad. */
function withSelection(state: SelectionState, selection: SeatSelection): SelectionState {
  return selection === state.selection ? state : { selection, notice: null };
}

function withSeatIds(state: SelectionState, seatIds: string[]): SelectionState {
  return withSelection(state, { ...state.selection, seatIds });
}

/** "Elegimos Fila C · Asiento 6." o "Elegimos 2 asientos juntos en la fila C.". */
function getPickedNotice(zone: NumberedVenueZone, seatIds: string[]): string {
  const [first] = zone.rows.flatMap((row) => row.seats).filter((seat) => seatIds.includes(seat.id));
  return seatIds.length === 1
    ? `Elegimos ${formatSeatShortLabel(first.row, first.number)}.`
    : `Elegimos ${seatIds.length} asientos juntos en la fila ${first.row}.`;
}

function getNoBlockNotice(count: number): string {
  return count === 1
    ? "No quedan asientos disponibles en esta zona."
    : `No hay ${count} asientos juntos disponibles en esta zona.`;
}

/** Estado de la selección de entradas sobre el mapa: zona activa, cantidades de pie, asientos y aviso. */
export function useSeatSelection(map: VenueMap) {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [{ selection, notice }, setState] = useState<SelectionState>(INITIAL_STATE);

  const ticketCount = getSelectionTicketCount(selection);
  const atLimit = ticketCount >= MAX_TICKETS_PER_ORDER;
  const lines = getSelectionLines(map, selection);

  function selectZone(zoneId: string) {
    setActiveZoneId(zoneId);
  }

  /** Solo zonas de pie no agotadas; "+" no hace nada en el límite y "−" no baja de 0. */
  function changeQuantity(zoneId: string, delta: 1 | -1) {
    const zone = map.zones.find((candidate) => candidate.id === zoneId);
    if (!zone || zone.kind !== "general" || zone.status === "sold-out") return;
    if (delta > 0 && atLimit) return;

    setActiveZoneId(zoneId);
    setState((current) => {
      const quantity = current.selection.quantities[zoneId] ?? 0;
      const next = Math.max(0, quantity + delta);
      if (next === quantity || (delta > 0 && isAtLimit(current.selection))) return current;
      return withSelection(current, {
        ...current.selection,
        quantities: { ...current.selection.quantities, [zoneId]: next },
      });
    });
  }

  /** Quita el asiento si estaba; si no, lo añade cuando es elegible (en el límite solo avisa). */
  function toggleSeat(seatId: string) {
    setState((current) => {
      const { seatIds } = current.selection;
      if (seatIds.includes(seatId)) return withSeatIds(current, seatIds.filter((id) => id !== seatId));
      // `resolveSeats` descarta asientos inexistentes, ocupados o de zonas agotadas.
      if (!resolveSeats(map, [seatId])) return current;
      if (isAtLimit(current.selection)) return { ...current, notice: LIMIT_NOTICE };
      return withSeatIds(current, [...seatIds, seatId]);
    });
  }

  function removeSeat(seatId: string) {
    setState((current) => {
      const { seatIds } = current.selection;
      return seatIds.includes(seatId) ? withSeatIds(current, seatIds.filter((id) => id !== seatId)) : current;
    });
  }

  /** Reemplaza los asientos de la zona por el mejor bloque de tantos como ya había (o 1 si no había). */
  function pickBestSeats(zoneId: string) {
    const zone = map.zones.find((candidate) => candidate.id === zoneId);
    if (!zone || zone.kind !== "numbered") return;

    setState((current) => {
      const { seatIds } = current.selection;
      const zoneSeatIds = seatIds.filter((id) => parseSeatId(id)?.zoneId === zoneId);
      // Con 0 elegidos se añade 1 asiento: hace falta hueco bajo el límite.
      if (zoneSeatIds.length === 0 && isAtLimit(current.selection)) return { ...current, notice: LIMIT_NOTICE };

      const count = Math.max(zoneSeatIds.length, 1);
      const best = zone.status === "sold-out" ? null : findBestAvailableSeats(zone, count);
      if (!best) return { ...current, notice: getNoBlockNotice(count) };

      const otherSeatIds = seatIds.filter((id) => !zoneSeatIds.includes(id));
      return {
        selection: { ...current.selection, seatIds: [...otherSeatIds, ...best] },
        notice: getPickedNotice(zone, best),
      };
    });
  }

  return {
    activeZoneId,
    quantities: selection.quantities,
    seatIds: selection.seatIds,
    ticketCount,
    atLimit,
    lines,
    total: lines.reduce((total, line) => total + line.amount, 0),
    checkoutHref: buildSeatingCheckoutHref(map.eventSlug, map, selection),
    notice,
    selectZone,
    changeQuantity,
    toggleSeat,
    removeSeat,
    pickBestSeats,
  };
}
