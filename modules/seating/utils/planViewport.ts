import type { PlanTransform } from "../types/seating.types";

export type SeatDetailLevel = "overview" | "numbers";

type PlanFitInput = { planWidth: number; planHeight: number; viewportWidth: number; viewportHeight: number };

/**
 * Cómo encaja el plano (unidades del `viewBox`) en el viewport (px), igual que el `preserveAspectRatio`
 * por defecto (`xMidYMid meet`): `unit` son los px por unidad y `offset` el margen centrado. Con alguna
 * medida ≤ 0, todo 0.
 */
export function getPlanFit({ planWidth, planHeight, viewportWidth, viewportHeight }: PlanFitInput): {
  unit: number;
  offsetX: number;
  offsetY: number;
} {
  if (planWidth <= 0 || planHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { unit: 0, offsetX: 0, offsetY: 0 };
  }
  const unit = Math.min(viewportWidth / planWidth, viewportHeight / planHeight);
  return {
    unit,
    offsetX: (viewportWidth - planWidth * unit) / 2,
    offsetY: (viewportHeight - planHeight * unit) / 2,
  };
}

/** `"numbers"` si el plano está acercado (escala > 1) y el número de 12 unidades mide ≥ 12 px. */
export function getSeatDetailLevel(unit: number, scale: number): SeatDetailLevel {
  return scale > 1 && unit * scale >= 1 ? "numbers" : "overview";
}

export type Rect = { x: number; y: number; width: number; height: number };

type VisiblePlanRectInput = PlanFitInput & { scale: number; positionX: number; positionY: number };

/**
 * Parte del plano (unidades del `viewBox`) que se ve en el viewport con la transformación de
 * `react-zoom-pan-pinch` (`translate(positionX, positionY) scale(scale)`), recortada a [0, pw] × [0, ph].
 * Sin medidas (alguna ≤ 0) o con escala ≤ 0, el plano entero.
 */
export function getVisiblePlanRect({
  planWidth,
  planHeight,
  viewportWidth,
  viewportHeight,
  scale,
  positionX,
  positionY,
}: VisiblePlanRectInput): Rect {
  const { unit, offsetX, offsetY } = getPlanFit({ planWidth, planHeight, viewportWidth, viewportHeight });
  if (unit <= 0 || scale <= 0) {
    return { x: 0, y: 0, width: Math.max(planWidth, 0), height: Math.max(planHeight, 0) };
  }
  const x = (-positionX / scale - offsetX) / unit;
  const y = (-positionY / scale - offsetY) / unit;
  const [left, right] = clampSpan(x, x + viewportWidth / (scale * unit), planWidth);
  const [top, bottom] = clampSpan(y, y + viewportHeight / (scale * unit), planHeight);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Pasa un rectángulo del plano a coordenadas del estadio deshaciendo `planTransform` (plano = estadio · s + t). */
export function toVenueRect(rect: Rect, { scale, x, y }: PlanTransform): Rect {
  return {
    x: (rect.x - x) / scale,
    y: (rect.y - y) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

function clampSpan(start: number, end: number, max: number): [number, number] {
  const clamp = (value: number) => Math.min(Math.max(value, 0), max);
  return [clamp(start), clamp(end)];
}
