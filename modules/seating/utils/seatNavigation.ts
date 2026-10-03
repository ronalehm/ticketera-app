import type { NumberedVenueZone, Seat } from "../types/seating.types";

export type SeatNavigationKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";

/** Asiento de `seats` con la `x` más cercana; en empate, el de número menor (el primero). */
function closestByX(seats: Seat[], x: number): Seat {
  return seats.reduce((closest, seat) => (Math.abs(seat.x - x) < Math.abs(closest.x - x) ? seat : closest));
}

/**
 * Id del asiento al que se mueve el foco desde `seatId` con `key`. Incluye los asientos ocupados
 * (se pueden enfocar, no elegir). En los bordes de la fila o del plano devuelve el mismo asiento,
 * igual que si `seatId` no pertenece a la zona.
 * - Izquierda/derecha: asiento anterior o siguiente de la fila.
 * - Arriba/abajo: asiento de la fila anterior o siguiente con la `x` más cercana.
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
      return targetRow ? closestByX(targetRow.seats, seats[seatIndex].x).id : seatId;
    }
  }
}
