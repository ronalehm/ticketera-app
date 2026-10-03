import { buildCheckoutHref } from "@/modules/events/purchase";
import type { SeatSelection, SelectionLine, VenueMap, VenueZone } from "../types/seating.types";
import { formatSeatShortLabel, parseSeatId } from "./seatIds";

/** Asientos elegidos de una zona, en el orden de selección (la zona se toma del id). */
function getZoneSeatIds(zoneId: string, seatIds: string[]): string[] {
  return seatIds.filter((id) => parseSeatId(id)?.zoneId === zoneId);
}

/** Entradas de una zona: cantidad si es de pie, número de asientos elegidos si es numerada. */
function getZoneQuantity(zone: VenueZone, selection: SeatSelection): number {
  return zone.kind === "numbered"
    ? getZoneSeatIds(zone.id, selection.seatIds).length
    : (selection.quantities[zone.id] ?? 0);
}

/** Una línea por zona con entradas, en el orden de `map.zones`; las numeradas llevan las etiquetas cortas. */
export function getSelectionLines(map: VenueMap, selection: SeatSelection): SelectionLine[] {
  return map.zones.flatMap((zone) => {
    const quantity = getZoneQuantity(zone, selection);
    if (quantity <= 0) return [];

    const seatLabels =
      zone.kind === "numbered"
        ? getZoneSeatIds(zone.id, selection.seatIds).flatMap((id) => {
            const parsed = parseSeatId(id);
            return parsed ? [formatSeatShortLabel(parsed.row, parsed.number)] : [];
          })
        : [];

    return [{ zoneId: zone.id, name: zone.name, quantity, amount: zone.price * quantity, seatLabels }];
  });
}

/** Entradas de pie + asientos. */
export function getSelectionTicketCount(selection: SeatSelection): number {
  const standing = Object.values(selection.quantities).reduce((count, quantity) => count + quantity, 0);
  return standing + selection.seatIds.length;
}

export function getSelectionTotal(map: VenueMap, selection: SeatSelection): number {
  return getSelectionLines(map, selection).reduce((total, line) => total + line.amount, 0);
}

/** `ticketTypeId → cantidad`, en el orden de `map.zones` y solo con cantidades > 0. */
export function toCheckoutQuantities(map: VenueMap, selection: SeatSelection): Record<string, number> {
  const quantities: Record<string, number> = {};
  for (const zone of map.zones) {
    const quantity = getZoneQuantity(zone, selection);
    if (quantity > 0) quantities[zone.ticketTypeId] = quantity;
  }
  return quantities;
}

/** `/checkout?evento=<slug>&<ticketTypeId>=<qty>…&asientos=<id>,<id>` (contrato C); `null` con 0 entradas. */
export function buildSeatingCheckoutHref(slug: string, map: VenueMap, selection: SeatSelection): string | null {
  if (getSelectionTicketCount(selection) === 0) return null;

  const href = buildCheckoutHref(slug, toCheckoutQuantities(map, selection));
  if (selection.seatIds.length === 0) return href;
  return `${href}&${new URLSearchParams({ asientos: selection.seatIds.join(",") })}`;
}

/** "1 entrada" / "3 entradas". */
export function formatTicketCount(count: number): string {
  return `${count} ${count === 1 ? "entrada" : "entradas"}`;
}
