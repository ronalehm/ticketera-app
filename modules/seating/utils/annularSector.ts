import type { Point } from "../types/seating.types";

/**
 * Sector de corona circular. Ángulos en grados: 0° = +x y crecientes en sentido horario en pantalla
 * (y hacia abajo), igual que SVG. El barrido va de `startAngle` a `endAngle`.
 */
export type AnnularSector = {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
};

export type SectorBounds = { minX: number; minY: number; maxX: number; maxY: number };

/** Tolerancia para que los puntos calculados sobre un borde (con error de coma flotante) cuenten como dentro. */
const EPSILON = 1e-9;

function assertValidSector(sector: AnnularSector): void {
  const { innerRadius, outerRadius, startAngle, endAngle } = sector;
  const sweep = endAngle - startAngle;
  if (!(innerRadius >= 0 && innerRadius < outerRadius)) {
    throw new Error(`Radios de sector inválidos: ${innerRadius}–${outerRadius}`);
  }
  if (!(sweep > 0 && sweep < 360)) {
    throw new Error(`Barrido de sector inválido: ${startAngle}°…${endAngle}°`);
  }
}

function mod360(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function toRadians(angle: number): number {
  return (angle * Math.PI) / 180;
}

/** Redondea a 2 decimales sin ceros sobrantes (`-0` se escribe `0`). */
function formatNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

function formatPoint({ x, y }: Point): string {
  return `${formatNumber(x)} ${formatNumber(y)}`;
}

export function polarToCartesian(cx: number, cy: number, radius: number, angle: number): Point {
  const radians = toRadians(angle);
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

/** `d` de un `<path>` con el sector; con `innerRadius` 0 dibuja la porción de disco desde el centro. */
export function getAnnularSectorPath(sector: AnnularSector): string {
  assertValidSector(sector);
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = sector;
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerArc = `A${formatNumber(outerRadius)} ${formatNumber(outerRadius)} 0 ${largeArc} 1 ${formatPoint(outerEnd)}`;

  if (innerRadius === 0) {
    return `M${formatPoint({ x: cx, y: cy })} L${formatPoint(outerStart)} ${outerArc} Z`;
  }

  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerArc = `A${formatNumber(innerRadius)} ${formatNumber(innerRadius)} 0 ${largeArc} 0 ${formatPoint(innerStart)}`;
  return `M${formatPoint(outerStart)} ${outerArc} L${formatPoint(innerEnd)} ${innerArc} Z`;
}

/** Puntos exactos del radio en 0°, 90°, 180° y 270° (`quarter` = ángulo / 90, ± 4k). */
function cardinalPoint(cx: number, cy: number, radius: number, quarter: number): Point {
  const offsets: [number, number][] = [
    [radius, 0],
    [0, radius],
    [-radius, 0],
    [0, -radius],
  ];
  const [dx, dy] = offsets[((quarter % 4) + 4) % 4];
  return { x: cx + dx, y: cy + dy };
}

/** Caja que contiene el sector: esquinas (o el centro) y los extremos del arco exterior dentro del barrido. */
export function getAnnularSectorBounds(sector: AnnularSector): SectorBounds {
  assertValidSector(sector);
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = sector;
  const points: Point[] = [
    polarToCartesian(cx, cy, outerRadius, startAngle),
    polarToCartesian(cx, cy, outerRadius, endAngle),
  ];
  if (innerRadius === 0) {
    points.push({ x: cx, y: cy });
  } else {
    points.push(
      polarToCartesian(cx, cy, innerRadius, startAngle),
      polarToCartesian(cx, cy, innerRadius, endAngle),
    );
  }
  for (let quarter = Math.ceil(startAngle / 90); quarter * 90 <= endAngle; quarter++) {
    points.push(cardinalPoint(cx, cy, outerRadius, quarter));
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/** Bordes incluidos. El centro de una porción de disco (`innerRadius` 0) cuenta como dentro. */
export function isPointInAnnularSector(point: Point, sector: AnnularSector): boolean {
  assertValidSector(sector);
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = sector;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const radius = Math.hypot(dx, dy);
  if (radius < innerRadius - EPSILON || radius > outerRadius + EPSILON) return false;
  if (radius === 0) return true;

  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const normalized = startAngle + mod360(angle - startAngle);
  return normalized <= endAngle + EPSILON || normalized >= startAngle + 360 - EPSILON;
}

/**
 * Solape de dos sectores concéntricos: se cruzan a la vez los intervalos abiertos de radio y de ángulo
 * (módulo 360). Tocarse en un borde no cuenta. Lanza `Error` si los centros son distintos.
 */
export function doAnnularSectorsOverlap(a: AnnularSector, b: AnnularSector): boolean {
  assertValidSector(a);
  assertValidSector(b);
  if (a.cx !== b.cx || a.cy !== b.cy) {
    throw new Error("Solo se comparan sectores concéntricos");
  }
  const radiiOverlap = a.innerRadius < b.outerRadius && b.innerRadius < a.outerRadius;
  if (!radiiOverlap) return false;

  // Con `a` en [0, sweepA], `b` empieza en `offset` y ocupa [offset, offset + sweepB].
  const sweepA = a.endAngle - a.startAngle;
  const sweepB = b.endAngle - b.startAngle;
  const offset = mod360(b.startAngle - a.startAngle);
  return offset < sweepA || offset + sweepB > 360;
}

/** `count` (≥ 2) puntos equiespaciados sobre el arco, con los dos extremos incluidos. */
export function getArcPoints(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  count: number,
): Point[] {
  if (!Number.isInteger(count) || count < 2) {
    throw new Error(`getArcPoints necesita al menos 2 puntos: ${count}`);
  }
  const step = (endAngle - startAngle) / (count - 1);
  return Array.from({ length: count }, (_, index) => polarToCartesian(cx, cy, radius, startAngle + index * step));
}
