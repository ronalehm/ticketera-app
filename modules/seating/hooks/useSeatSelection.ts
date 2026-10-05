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

/**
 * Estado con el que abre la pantalla. Ya validado: la selección viene de `parseSeatingPreselection`
 * y la zona de `parseInitialZoneId`, así que el hook no los revalida.
 */
type InitialSeatSelection = { selection?: SeatSelection; zoneId?: string | null };

const EMPTY_SELECTION: SeatSelection = { quantities: {}, seatIds: [] };
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

/**
 * Estado de la selección de entradas sobre el mapa: zona activa, cantidades de pie, asientos y aviso.
 * Sin `initial`, empieza sin zona abierta ni entradas.
 */
export function useSeatSelection(map: VenueMap, initial?: InitialSeatSelection) {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(() => initial?.zoneId ?? null);
  const [{ selection, notice }, setState] = useState<SelectionState>(() => ({
    selection: initial?.selection ?? EMPTY_SELECTION,
    notice: null,
  }));

  const ticketCount = getSelectionTicketCount(selection);
  const atLimit = ticketCount >= MAX_TICKETS_PER_ORDER;
  const lines = getSelectionLines(map, selection);

  /** Abre la zona; no hace nada si no existe o está agotada. */
  function selectZone(zoneId: string) {
    const zone = map.zones.find((candidate) => candidate.id === zoneId);
    if (!zone || zone.status === "sold-out") return;
    setActiveZoneId(zoneId);
  }

  /** Vuelve a la lista de zonas sin tocar la selección. */
  function closeZone() {
    setActiveZoneId(null);
  }

  /**
   * Solo zonas de pie no agotadas; "+" no hace nada en el límite y "−" no baja de 0. No cambia la
   * zona activa: el stepper de la tarjeta está en el sub-paso 1 y no debe sacar al usuario de él.
   */
  function changeQuantity(zoneId: string, delta: 1 | -1) {
    const zone = map.zones.find((candidate) => candidate.id === zoneId);
    if (!zone || zone.kind !== "general" || zone.status === "sold-out") return;
    if (delta > 0 && atLimit) return;

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

  /**
   * Quita todas las entradas de la zona: su cantidad (borra la clave) y sus butacas, conservando el
   * orden del resto. Sin entradas en la zona (o si no existe) no cambia el estado. No toca la zona activa.
   */
  function clearZone(zoneId: string) {
    setState((current) => {
      const { quantities, seatIds } = current.selection;
      const keptSeatIds = seatIds.filter((id) => parseSeatId(id)?.zoneId !== zoneId);
      if (!quantities[zoneId] && keptSeatIds.length === seatIds.length) return current;
      return withSelection(current, {
        quantities: Object.fromEntries(Object.entries(quantities).filter(([id]) => id !== zoneId)),
        seatIds: keptSeatIds,
      });
    });
  }

  /**
   * Sustituye las butacas de la zona por el mejor bloque de `count` y lo devuelve. Calcula con la
   * selección del render (se llama desde un manejador de clic). Devuelve `null` sin cambios si
   * `count` no es un entero ≥ 1 o la zona no es numerada, y `null` con aviso si no hay bloque libre
   * o se pasaría del límite de entradas.
   */
  function pickBestSeats(zoneId: string, count: number): string[] | null {
    const zone = map.zones.find((candidate) => candidate.id === zoneId);
    if (!Number.isInteger(count) || count < 1 || !zone || zone.kind !== "numbered") return null;

    const showNotice = (message: string) => setState((current) => ({ ...current, notice: message }));

    const best = zone.status === "sold-out" ? null : findBestAvailableSeats(zone, count);
    if (!best) {
      showNotice(getNoBlockNotice(count));
      return null;
    }

    const otherSeatIds = selection.seatIds.filter((id) => parseSeatId(id)?.zoneId !== zoneId);
    const zoneSeatCount = selection.seatIds.length - otherSeatIds.length;
    if (ticketCount - zoneSeatCount + count > MAX_TICKETS_PER_ORDER) {
      showNotice(LIMIT_NOTICE);
      return null;
    }

    setState({
      selection: { ...selection, seatIds: [...otherSeatIds, ...best] },
      notice: getPickedNotice(zone, best),
    });
    return best;
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
    closeZone,
    changeQuantity,
    toggleSeat,
    removeSeat,
    pickBestSeats,
    clearZone,
  };
}
