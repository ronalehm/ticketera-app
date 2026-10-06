import type { VenueLayout } from "../types/seating.types";

/**
 * El layout mock tal como lo siembra `db:seed`: sin ventas (spec admin-panel, F2), así que las butacas `occupied` del
 * mock quedan `available` en la BD. Para los tests que comparan el mapa de la BD con su mock.
 */
export function toSeededLayout(layout: VenueLayout): VenueLayout {
  return {
    ...layout,
    zones: layout.zones.map((zone) =>
      zone.kind === "numbered"
        ? {
            ...zone,
            rows: zone.rows.map((row) => ({
              ...row,
              seats: row.seats.map((seat) => (seat.status === "occupied" ? { ...seat, status: "available" } : seat)),
            })),
          }
        : zone,
    ),
  };
}
