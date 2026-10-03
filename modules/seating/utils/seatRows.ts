import { hashString, mixHash } from "@/lib/hash";
import type { SeatRow, SeatStatus } from "../types/seating.types";
import { formatSeatId } from "./seatIds";

/** Distancia entre centros de asientos contiguos (horizontal y vertical), en unidades del `seatViewBox`. */
export const SEAT_PITCH = 32;

/** Márgenes del plano: `top` deja sitio a la barra del escenario. */
export const SEAT_PLAN_MARGIN = { x: 40, top: 72, bottom: 24 } as const;

type SeatRowsSpec = {
  zoneId: string;
  /** La primera fila es la más cercana al escenario. */
  rowLabels: string[];
  /** Un número para todas las filas, o un valor por fila. */
  seatsPerRow: number | number[];
  /** 0..1: proporción aproximada de asientos ocupados. */
  occupiedRatio: number;
  accessibleSeats?: string[];
};

/** Hash mezclado del id normalizado a [0, 1): reparte la ocupación sin agruparla por filas. */
function hashToUnit(value: string): number {
  return mixHash(hashString(value)) / 2 ** 32;
}

/**
 * Genera las filas de una zona numerada con asientos numerados de 1 a n de izquierda a derecha,
 * las filas cortas centradas y una ocupación determinista (hash mezclado del id). Lanza `Error` si un id de
 * `accessibleSeats` no existe o si `seatsPerRow` no tiene un valor por fila.
 */
export function generateSeatRows({
  zoneId,
  rowLabels,
  seatsPerRow,
  occupiedRatio,
  accessibleSeats = [],
}: SeatRowsSpec): { seatViewBox: string; rows: SeatRow[] } {
  const counts = Array.isArray(seatsPerRow) ? seatsPerRow : rowLabels.map(() => seatsPerRow);
  if (counts.length !== rowLabels.length) {
    throw new Error(`seatsPerRow debe tener ${rowLabels.length} valores en la zona ${zoneId}`);
  }

  const maxSeats = Math.max(...counts);
  const accessible = new Set(accessibleSeats);
  const generatedIds = new Set<string>();

  const rows: SeatRow[] = rowLabels.map((label, rowIndex) => {
    const count = counts[rowIndex];
    const offsetX = SEAT_PLAN_MARGIN.x + ((maxSeats - count) * SEAT_PITCH) / 2;
    const y = SEAT_PLAN_MARGIN.top + rowIndex * SEAT_PITCH + SEAT_PITCH / 2;

    const seats = Array.from({ length: count }, (_, seatIndex) => {
      const number = seatIndex + 1;
      const id = formatSeatId(zoneId, label, number);
      generatedIds.add(id);

      let status: SeatStatus = "available";
      if (hashToUnit(id) < occupiedRatio) status = "occupied";
      else if (accessible.has(id)) status = "accessible";

      return { id, row: label, number, x: offsetX + seatIndex * SEAT_PITCH + SEAT_PITCH / 2, y, status };
    });

    return { label, seats };
  });

  for (const id of accessible) {
    if (!generatedIds.has(id)) throw new Error(`Asiento accesible inexistente en la zona ${zoneId}: ${id}`);
  }

  const width = 2 * SEAT_PLAN_MARGIN.x + maxSeats * SEAT_PITCH;
  const height = SEAT_PLAN_MARGIN.top + rowLabels.length * SEAT_PITCH + SEAT_PLAN_MARGIN.bottom;
  return { seatViewBox: `0 0 ${width} ${height}`, rows };
}
