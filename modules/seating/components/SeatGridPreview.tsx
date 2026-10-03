import { cn } from "@/lib/utils";
import { getSeatRowLabels } from "../utils/rowLabels";
import { generateSeatRows, SEAT_PITCH, SEAT_PLAN_MARGIN } from "../utils/seatRows";
import { SeatShape } from "./SeatLegend";

type SeatGridPreviewProps = {
  /** Entre 1 y 702. */
  rows: number;
  seatsPerRow: number;
  className?: string;
};

/** Ancho mínimo de la barra "Escenario", en px. */
const STAGE_MIN_WIDTH = 160;

/**
 * Vista previa decorativa (`aria-hidden`, sin elementos enfocables) de una zona numerada rectangular, con la
 * forma "Disponible" del plano de compra. Nunca se agranda por encima de 1 unidad = 1 px; la información en
 * texto la pone quien la usa (p. ej. un `figcaption`).
 */
export function SeatGridPreview({ rows, seatsPerRow, className }: SeatGridPreviewProps) {
  const { rows: seatRows } = generateSeatRows({
    zoneId: "preview",
    rowLabels: getSeatRowLabels(rows),
    seatsPerRow,
    occupiedRatio: 0,
  });
  const gridWidth = seatsPerRow * SEAT_PITCH;
  const viewBox = `${SEAT_PLAN_MARGIN.x} ${SEAT_PLAN_MARGIN.top} ${gridWidth} ${rows * SEAT_PITCH}`;

  return (
    <div aria-hidden className={cn("flex flex-col gap-2", className)}>
      <div
        className="mx-auto max-w-full rounded-md bg-foreground py-1 text-center text-xs font-bold uppercase tracking-widest text-background"
        style={{ width: Math.max(gridWidth, STAGE_MIN_WIDTH) }}
      >
        Escenario
      </div>
      <svg viewBox={viewBox} className="mx-auto block h-auto max-h-64 w-full" style={{ maxWidth: gridWidth }}>
        {seatRows.flatMap(({ seats }) =>
          seats.map((seat) => (
            <g key={seat.id} transform={`translate(${seat.x} ${seat.y})`}>
              <SeatShape status="available" selected={false} />
            </g>
          )),
        )}
      </svg>
    </div>
  );
}
