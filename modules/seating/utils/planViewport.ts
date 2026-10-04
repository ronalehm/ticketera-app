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
