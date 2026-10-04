import type { PlanTransform, Point, SeatRow } from "../types/seating.types";
import { type AnnularSector, getAnnularSectorBounds } from "./annularSector";
import { formatSeatId } from "./seatIds";
import { getGeneratedSeatStatus, SEAT_PITCH } from "./seatRows";

/** Margen entre la caja del sector y el borde del `seatViewBox`, en unidades del plano. */
export const ARC_PLAN_MARGIN = 24;

/** Holgura mínima entre las butacas de los extremos y los bordes radiales del sector, en unidades del plano. */
export const ARC_EDGE_PADDING = 8;

/** Distancia de la letra de fila a la butaca del extremo, en pitches. */
const ROW_EDGE_LABEL_OFFSET = 0.8 * SEAT_PITCH;

type ArcSeatRowsSpec = {
  zoneId: string;
  /** Sector de la zona en coordenadas del estadio. */
  sector: AnnularSector;
  /** Escala del estadio al plano (`planTransform.scale`). */
  scale: number;
  /** La primera fila es la más cercana al escenario (radio interior). */
  rowLabels: string[];
  /** 0..1: proporción aproximada de butacas ocupadas. */
  occupiedRatio: number;
  accessibleSeats?: string[];
};

function round2(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Genera las filas de una zona numerada en arco, semejante a su sector del estadio: plano = estadio × `scale`
 * + (`x`, `y`). Las filas son arcos concéntricos a 1 pitch de distancia, centrados en la banda; en cada fila las
 * butacas se centran en el ángulo medio y se numeran de 1 a n por ángulo creciente. La ocupación es la misma
 * regla determinista de `generateSeatRows`. Lanza `Error` si las filas no caben en la banda, si alguna fila
 * queda con menos de 2 butacas o si un id de `accessibleSeats` no existe.
 */
export function generateArcSeatRows({
  zoneId,
  sector,
  scale,
  rowLabels,
  occupiedRatio,
  accessibleSeats = [],
}: ArcSeatRowsSpec): { seatViewBox: string; rows: SeatRow[]; planTransform: PlanTransform } {
  const bounds = getAnnularSectorBounds({
    ...sector,
    cx: sector.cx * scale,
    cy: sector.cy * scale,
    innerRadius: sector.innerRadius * scale,
    outerRadius: sector.outerRadius * scale,
  });
  const planTransform = { scale, x: ARC_PLAN_MARGIN - bounds.minX, y: ARC_PLAN_MARGIN - bounds.minY };
  const width = Math.ceil(bounds.maxX - bounds.minX + 2 * ARC_PLAN_MARGIN);
  const height = Math.ceil(bounds.maxY - bounds.minY + 2 * ARC_PLAN_MARGIN);
  const centerX = sector.cx * scale + planTransform.x;
  const centerY = sector.cy * scale + planTransform.y;

  const band = scale * (sector.outerRadius - sector.innerRadius);
  if (rowLabels.length * SEAT_PITCH > band) {
    throw new Error(`Las ${rowLabels.length} filas no caben en la banda de ${band} de la zona ${zoneId}`);
  }
  const slack = band - rowLabels.length * SEAT_PITCH;
  const sweep = ((sector.endAngle - sector.startAngle) * Math.PI) / 180;
  const midAngle = ((sector.startAngle + sector.endAngle) / 2) * (Math.PI / 180);

  const accessible = new Set(accessibleSeats);
  const generatedIds = new Set<string>();

  const rows: SeatRow[] = rowLabels.map((label, rowIndex) => {
    const radius = scale * sector.innerRadius + slack / 2 + SEAT_PITCH / 2 + rowIndex * SEAT_PITCH;
    const count = Math.floor((radius * sweep - 2 * ARC_EDGE_PADDING) / SEAT_PITCH);
    if (count < 2) {
      throw new Error(`La fila ${label} de la zona ${zoneId} tiene menos de 2 butacas`);
    }
    const step = SEAT_PITCH / radius;

    const seats = Array.from({ length: count }, (_, seatIndex) => {
      const number = seatIndex + 1;
      const id = formatSeatId(zoneId, label, number);
      generatedIds.add(id);
      const angle = midAngle + (seatIndex - (count - 1) / 2) * step;

      return {
        id,
        row: label,
        number,
        x: round2(centerX + radius * Math.cos(angle)),
        y: round2(centerY + radius * Math.sin(angle)),
        status: getGeneratedSeatStatus(id, occupiedRatio, accessible),
      };
    });

    return { label, seats };
  });

  for (const id of accessible) {
    if (!generatedIds.has(id)) throw new Error(`Asiento accesible inexistente en la zona ${zoneId}: ${id}`);
  }

  return { seatViewBox: `0 0 ${width} ${height}`, rows, planTransform };
}

function offsetAlong(from: Point, toward: Point): Point {
  const dx = from.x - toward.x;
  const dy = from.y - toward.y;
  const length = Math.hypot(dx, dy);
  return { x: from.x + (dx / length) * ROW_EDGE_LABEL_OFFSET, y: from.y + (dy / length) * ROW_EDGE_LABEL_OFFSET };
}

/**
 * Puntos para la letra de fila en los dos bordes: a 0.8 pitch más allá de la primera y de la última butaca,
 * en la dirección de la cuerda (1.ª − 2.ª) y (última − penúltima). Lanza `Error` con menos de 2 butacas.
 */
export function getRowEdgeLabelPoints(row: SeatRow): { start: Point; end: Point } {
  const { seats } = row;
  if (seats.length < 2) {
    throw new Error(`La fila ${row.label} necesita al menos 2 butacas para orientar sus letras`);
  }
  return {
    start: offsetAlong(seats[0], seats[1]),
    end: offsetAlong(seats[seats.length - 1], seats[seats.length - 2]),
  };
}
