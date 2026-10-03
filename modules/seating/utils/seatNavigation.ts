import type { NumberedVenueZone, Point, Seat } from "../types/seating.types";

export type SeatNavigationKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";

/** Cuadrado de la distancia euclídea entre un asiento y `point` (basta para comparar). */
function squaredDistance(seat: Seat, point: Point): number {
  return (seat.x - point.x) ** 2 + (seat.y - point.y) ** 2;
}

/** Asiento de `seats` más cercano a `point`; en empate, el de número menor (el primero). */
function closestTo(seats: Seat[], point: Point): Seat {
  return seats.reduce((closest, seat) =>
    squaredDistance(seat, point) < squaredDistance(closest, point) ? seat : closest,
  );
}

/**
 * Id del asiento al que se mueve el foco desde `seatId` con `key`. Incluye los asientos ocupados
 * (se pueden enfocar, no elegir). En los bordes de la fila o del plano devuelve el mismo asiento,
 * igual que si `seatId` no pertenece a la zona.
 * - Izquierda/derecha: asiento anterior o siguiente de la fila.
 * - Arriba/abajo: asiento de la fila anterior o siguiente más cercano en distancia euclídea (vale
 *   también para filas en arco, aunque sean casi verticales).
 * - Home/End: primer o último asiento de la fila.
 */
export function getAdjacentSeatId(zone: NumberedVenueZone, seatId: string, key: SeatNavigationKey): string {
  const rowIndex = zone.rows.findIndex((row) => row.seats.some((seat) => seat.id === seatId));
  if (rowIndex === -1) return seatId;

  const { seats } = zone.rows[rowIndex];
  const seatIndex = seats.findIndex((seat) => seat.id === seatId);

  switch (key) {
    case "ArrowLeft":
      return seats[Math.max(seatIndex - 1, 0)].id;
    case "ArrowRight":
      return seats[Math.min(seatIndex + 1, seats.length - 1)].id;
    case "Home":
      return seats[0].id;
    case "End":
      return seats[seats.length - 1].id;
    case "ArrowUp":
    case "ArrowDown": {
      const targetRow = zone.rows[rowIndex + (key === "ArrowUp" ? -1 : 1)];
      return targetRow ? closestTo(targetRow.seats, seats[seatIndex]).id : seatId;
    }
  }
}
