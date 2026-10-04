import { buildCheckoutHref, MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";
import type { SeatSelection, SelectionLine, VenueMap, VenueZone } from "../types/seating.types";
import { formatSeatShortLabel, parseSeatId, resolveSeats } from "./seatIds";

/** Parámetro de los asientos en la URL (contrato C). */
const SEATS_PARAM = "asientos";
const QUANTITY_PATTERN = /^\d+$/;

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
  return `${href}&${new URLSearchParams({ [SEATS_PARAM]: selection.seatIds.join(",") })}`;
}

/** Valor de un parámetro que aparece exactamente una vez; `null` si falta o está repetido. */
function getSingleParam(params: Pick<URLSearchParams, "getAll">, name: string): string | null {
  const values = params.getAll(name);
  return values.length === 1 ? values[0] : null;
}

/** Cantidad entera entre 1 y `MAX_TICKETS_PER_ORDER`; `null` si no lo es. */
function parseQuantity(raw: string | null): number | null {
  if (raw === null || !QUANTITY_PATTERN.test(raw)) return null;
  const quantity = Number(raw);
  return quantity >= 1 && quantity <= MAX_TICKETS_PER_ORDER ? quantity : null;
}

/**
 * Inversa de `buildSeatingCheckoutHref` (sin `evento`): `<ticketTypeId>=<qty>` por zona de pie y
 * `asientos=<id>,<id>` para las numeradas. Lo inválido se ignora uno a uno; las zonas se recorren en el
 * orden de `map.zones` y se recorta lo que exceda `MAX_TICKETS_PER_ORDER`.
 */
export function parseSeatingPreselection(map: VenueMap, params: Pick<URLSearchParams, "getAll">): SeatSelection {
  const rawSeatIds = getSingleParam(params, SEATS_PARAM);
  const urlSeatIds = rawSeatIds === null ? [] : [...new Set(rawSeatIds.split(","))];
  const quantities: Record<string, number> = {};
  const seatIds: string[] = [];
  let remaining = MAX_TICKETS_PER_ORDER;

  for (const zone of map.zones) {
    if (zone.status === "sold-out" || remaining === 0) continue;

    if (zone.kind === "numbered") {
      const zoneSeatIds = urlSeatIds
        .filter((id) => parseSeatId(id)?.zoneId === zone.id && resolveSeats(map, [id]) !== null)
        .slice(0, remaining);
      seatIds.push(...zoneSeatIds);
      remaining -= zoneSeatIds.length;
      continue;
    }

    const quantity = parseQuantity(getSingleParam(params, zone.ticketTypeId));
    if (quantity === null) continue;
    quantities[zone.id] = Math.min(quantity, remaining);
    remaining -= quantities[zone.id];
  }

  return { quantities, seatIds };
}

/** "1 entrada" / "3 entradas". */
export function formatTicketCount(count: number): string {
  return `${count} ${count === 1 ? "entrada" : "entradas"}`;
}
