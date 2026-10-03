import type { NumberedVenueZone, Seat } from "../types/seating.types";

/**
 * Busca `count` asientos `available` consecutivos de una misma fila (ignora `accessible` y
 * `occupied`). Prefiere la fila más cercana al escenario (orden de `rows`), después el bloque cuyo
 * centro está más cerca del centro de la fila y, en empate, el de número inicial menor.
 * El centrado se mide por posición en la fila (índices), no por coordenadas, así que vale igual
 * para filas rectas y en arco.
 * Devuelve los ids del bloque, o `null` si no hay ninguno.
 */
export function findBestAvailableSeats(zone: NumberedVenueZone, count: number): string[] | null {
  if (count < 1) return null;

  for (const row of zone.rows) {
    const rowCenter = (row.seats.length - 1) / 2;
    let best: { seats: Seat[]; distance: number } | null = null;

    for (let start = 0; start + count <= row.seats.length; start++) {
      const block = row.seats.slice(start, start + count);
      if (!block.every((seat) => seat.status === "available")) continue;

      const distance = Math.abs(start + (count - 1) / 2 - rowCenter);
      // Se recorre por número creciente: con `<` estricto, el empate se queda con el número menor.
      if (!best || distance < best.distance) best = { seats: block, distance };
    }

    if (best) return best.seats.map((seat) => seat.id);
  }

  return null;
}
