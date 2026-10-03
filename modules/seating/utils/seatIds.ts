import { SEAT_ID_PATTERN, seatIdsParamSchema } from "../schemas/seating.schema";
import type { ResolvedSeat, Seat, VenueMap } from "../types/seating.types";

export { formatSeatId, SEAT_ID_PATTERN } from "../schemas/seating.schema";

/** `platea-baja-AA-101` → `{ zoneId: "platea-baja", row: "AA", number: 101 }`; `null` si no tiene el formato. */
export function parseSeatId(id: string): { zoneId: string; row: string; number: number } | null {
  const match = SEAT_ID_PATTERN.exec(id);
  if (!match) return null;
  const [, zoneId, row, number] = match;
  return { zoneId, row, number: Number(number) };
}

/** "Fila F · Asiento 12". */
export function formatSeatShortLabel(row: string, number: number): string {
  return `Fila ${row} · Asiento ${number}`;
}

/** "Tribuna Norte · Fila F · Asiento 12". */
export function formatSeatLabel(zoneName: string, row: string, number: number): string {
  return `${zoneName} · ${formatSeatShortLabel(row, number)}`;
}

const SEAT_STATUS_LABELS = {
  available: "disponible",
  accessible: "accesible para silla de ruedas",
  occupied: "ocupado",
} as const satisfies Record<Seat["status"], string>;

/** "Fila F, asiento 12, disponible, S/ 150.00"; los ocupados no llevan precio. */
export function getSeatAriaLabel(seat: Pick<Seat, "row" | "number" | "status">, priceLabel: string): string {
  const base = `Fila ${seat.row}, asiento ${seat.number}, ${SEAT_STATUS_LABELS[seat.status]}`;
  return seat.status === "occupied" ? base : `${base}, ${priceLabel}`;
}

/** Valor de `asientos` en la URL: ausente → `[]`; repetido o inválido → `null`. */
export function parseSeatIds(raw: string | string[] | undefined): string[] | null {
  if (raw === undefined) return [];
  if (Array.isArray(raw)) return null;
  const result = seatIdsParamSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * Resuelve ids de asiento contra el mapa, en el orden recibido. `null` si algún id no es de una zona
 * numerada del mapa, su zona está agotada, el asiento está ocupado o hay duplicados.
 */
export function resolveSeats(map: VenueMap, seatIds: string[]): ResolvedSeat[] | null {
  if (new Set(seatIds).size !== seatIds.length) return null;

  const resolved: ResolvedSeat[] = [];
  for (const id of seatIds) {
    const parsed = parseSeatId(id);
    const zone = parsed && map.zones.find((candidate) => candidate.id === parsed.zoneId);
    if (!parsed || !zone || zone.kind !== "numbered" || zone.status === "sold-out") return null;

    const seat = zone.rows.find((row) => row.label === parsed.row)?.seats.find((candidate) => candidate.id === id);
    if (!seat || seat.status === "occupied") return null;

    resolved.push({
      id,
      label: formatSeatLabel(zone.name, seat.row, seat.number),
      zoneId: zone.id,
      ticketTypeId: zone.ticketTypeId,
    });
  }
  return resolved;
}
