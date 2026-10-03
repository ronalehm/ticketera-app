import { hashString } from "@/lib/hash";
import { cn } from "@/lib/utils";

const QR_SIZE = 21;
const FINDER_SIZE = 7;
/** Esquinas superior izquierda, superior derecha e inferior izquierda de los patrones de posición. */
const FINDER_ORIGINS = [
  [0, 0],
  [0, QR_SIZE - FINDER_SIZE],
  [QR_SIZE - FINDER_SIZE, 0],
] as const;

/** PRNG mulberry32: devuelve una función que genera números en [0, 1). */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/**
 * Patrón de posición o su separador claro. `undefined` si la celda queda fuera de ambos.
 * Patrón 7×7: anillo exterior oscuro, hueco claro y núcleo 3×3 oscuro.
 */
function finderModule(row: number, col: number): boolean | undefined {
  for (const [top, left] of FINDER_ORIGINS) {
    const r = row - top;
    const c = col - left;
    if (r < -1 || r > FINDER_SIZE || c < -1 || c > FINDER_SIZE) continue;
    if (r === -1 || r === FINDER_SIZE || c === -1 || c === FINDER_SIZE) return false;
    const ring = Math.min(r, c, FINDER_SIZE - 1 - r, FINDER_SIZE - 1 - c);
    return ring !== 1;
  }
  return undefined;
}

/** Matriz 21×21 determinista (decorativa, no legible por lectores QR); `true` = módulo oscuro. */
export function getQrModules(value: string): boolean[][] {
  const random = mulberry32(hashString(value));
  return Array.from({ length: QR_SIZE }, (_, row) =>
    Array.from({ length: QR_SIZE }, (_, col) => finderModule(row, col) ?? random() < 0.5),
  );
}

export function TicketQr({ value, className }: { value: string; className?: string }) {
  const path = getQrModules(value)
    .flatMap((cells, row) => cells.flatMap((dark, col) => (dark ? [`M${col} ${row}h1v1h-1z`] : [])))
    .join("");

  return (
    <svg
      viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
      role="img"
      aria-label={`Código QR de la entrada ${value}`}
      shapeRendering="crispEdges"
      className={cn("bg-background text-foreground", className)}
    >
      <path fill="currentColor" d={path} />
    </svg>
  );
}
