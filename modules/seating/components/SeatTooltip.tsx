import { cn } from "@/lib/utils";

type SeatTooltipProps = {
  /** `x`/`y` en px relativos al lienzo (`relative`): centro de la butaca y su borde superior o inferior. */
  tooltip: { title: string; detail: string; x: number; y: number; placement: "top" | "bottom" } | null;
};

/**
 * Tooltip de la butaca bajo el puntero o con el foco (decisión 24). Solo visual: el lector ya anuncia el
 * `aria-label` de la butaca. Uno por plano; lo posiciona y oculta `SeatPlan`.
 */
export function SeatTooltip({ tooltip }: SeatTooltipProps) {
  if (!tooltip) return null;

  const { title, detail, x, y, placement } = tooltip;
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand-navy px-3 py-1.5 text-xs text-background shadow-lg",
        placement === "top" ? "-mt-2 -translate-y-full" : "mt-2",
      )}
      style={{ left: x, top: y }}
    >
      <p className="font-bold">{title}</p>
      <p className="tabular-nums">{detail}</p>
    </div>
  );
}
