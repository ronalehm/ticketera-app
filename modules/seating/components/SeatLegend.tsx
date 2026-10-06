import { Accessibility } from "lucide-react";
import { formatEventPrice } from "@/modules/events/purchase";
import type { SeatStatus } from "../types/seating.types";

type SeatShapeProps = {
  status: SeatStatus;
  selected: boolean;
  /** Número de la butaca disponible sin elegir; solo se ve con el plano en `data-detail="numbers"`. */
  number?: number;
};

type SeatLegendProps = {
  price: number;
  selectedCount: number;
  hasAccessible: boolean;
};

// Coordenadas locales centradas en (0, 0), en unidades del `seatViewBox` (pitch de 32).
const SEAT_RADIUS = 12;
const ACCESSIBLE_SIZE = 24;
const ICON_SIZE = 16;
const SHAPE_CLASS = "transition-colors duration-150";

function CheckMark() {
  return (
    <path
      d="M-5 0.5 L-1.5 4 L5.5 -3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="fill-none stroke-background stroke-[2.5] origin-center [transform-box:fill-box] motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-150"
    />
  );
}

function AccessibleSquare({ className }: { className: string }) {
  return (
    <rect
      x={-ACCESSIBLE_SIZE / 2}
      y={-ACCESSIBLE_SIZE / 2}
      width={ACCESSIBLE_SIZE}
      height={ACCESSIBLE_SIZE}
      rx={6}
      className={`${className} ${SHAPE_CLASS}`}
    />
  );
}

/**
 * Forma de una butaca (forma y color, no solo color; decisión 10): disponible (azul claro con borde), elegida
 * (navy + check), ocupada (gris + ×) y accesible (cuadrado cian con silla de ruedas). La comparten el plano y
 * la leyenda; el hover solo actúa dentro de un `group/seat` y el número dentro de un `group/plan` con
 * `data-detail="numbers"`.
 */
export function SeatShape({ status, selected, number }: SeatShapeProps) {
  if (status === "occupied") {
    return (
      <>
        <circle r={SEAT_RADIUS} className="fill-secondary stroke-input stroke-2" />
        <path d="M-5 -5 L5 5 M5 -5 L-5 5" strokeLinecap="round" className="fill-none stroke-muted-foreground stroke-2" />
      </>
    );
  }

  if (selected) {
    return (
      <>
        {status === "accessible" ? (
          <AccessibleSquare className="fill-brand-navy" />
        ) : (
          <circle r={SEAT_RADIUS} className={`fill-brand-navy ${SHAPE_CLASS}`} />
        )}
        <CheckMark />
      </>
    );
  }

  if (status === "accessible") {
    return (
      <>
        <AccessibleSquare className="fill-highlight" />
        <Accessibility
          x={-ICON_SIZE / 2}
          y={-ICON_SIZE / 2}
          width={ICON_SIZE}
          height={ICON_SIZE}
          strokeWidth={2.5}
          className="text-highlight-foreground"
          aria-hidden
        />
      </>
    );
  }

  return (
    <>
      <circle
        r={SEAT_RADIUS}
        className={`fill-primary/30 stroke-primary stroke-[1.5] group-hover/seat:fill-primary/50 ${SHAPE_CLASS}`}
      />
      {number !== undefined && (
        <text
          fontSize={12}
          textAnchor="middle"
          dominantBaseline="central"
          className="pointer-events-none fill-brand-navy font-bold tabular-nums opacity-0 transition-opacity group-data-[detail=numbers]/plan:opacity-100"
        >
          {number}
        </text>
      )}
    </>
  );
}

function LegendItem({ label, ...shape }: SeatShapeProps & { label: string }) {
  return (
    <li className="flex items-center gap-2">
      <svg viewBox="-16 -16 32 32" aria-hidden className="size-6 shrink-0">
        <SeatShape {...shape} />
      </svg>
      {label}
    </li>
  );
}

/** Leyenda del plano con el precio de la zona y, a la derecha, cuántas butacas hay elegidas en ella. */
export function SeatLegend({ price, selectedCount, hasAccessible }: SeatLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <ul aria-label="Leyenda del plano" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <LegendItem label={`Disponible · ${formatEventPrice(price)}`} status="available" selected={false} />
        <LegendItem label="Elegida" status="available" selected />
        <LegendItem label="Ocupada" status="occupied" selected={false} />
        {hasAccessible && <LegendItem label="Accesible (silla de ruedas)" status="accessible" selected={false} />}
      </ul>
      <p aria-live="polite" className="text-sm font-medium tabular-nums">
        {selectedCount === 1 ? "1 elegida" : `${selectedCount} elegidas`}
      </p>
    </div>
  );
}
