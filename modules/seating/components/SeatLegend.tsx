import type { SeatStatus } from "../types/seating.types";

type SeatShapeProps = {
  status: SeatStatus;
  selected: boolean;
};

// Coordenadas locales centradas en (0, 0), en unidades del `seatViewBox` (pitch de 32).
const SEAT_RADIUS = 12;
const ACCESSIBLE_SIZE = 24;
const SHAPE_CLASS = "transition-colors duration-150";

function CheckMark() {
  return (
    <path
      d="M-5 0.5 L-1.5 4 L5.5 -3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="fill-none stroke-primary-foreground stroke-[2.5]"
    />
  );
}

/**
 * Forma de un asiento (forma y color, no solo color): círculo disponible, elegido (relleno + check) u ocupado
 * (gris + ×), y cuadrado redondeado para el accesible. La comparten el plano y la leyenda; el hover solo actúa
 * dentro de un `group/seat`.
 */
export function SeatShape({ status, selected }: SeatShapeProps) {
  if (status === "accessible") {
    return (
      <>
        <rect
          x={-ACCESSIBLE_SIZE / 2}
          y={-ACCESSIBLE_SIZE / 2}
          width={ACCESSIBLE_SIZE}
          height={ACCESSIBLE_SIZE}
          rx={6}
          className={selected ? `fill-primary ${SHAPE_CLASS}` : `fill-highlight ${SHAPE_CLASS}`}
        />
        {selected && <CheckMark />}
      </>
    );
  }

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
        <circle r={SEAT_RADIUS} className={`fill-primary ${SHAPE_CLASS}`} />
        <CheckMark />
      </>
    );
  }

  return (
    <circle
      r={SEAT_RADIUS}
      className={`fill-background stroke-primary stroke-2 group-hover/seat:fill-accent ${SHAPE_CLASS}`}
    />
  );
}

const LEGEND_ITEMS = [
  { label: "Disponible", status: "available", selected: false },
  { label: "Tu selección", status: "available", selected: true },
  { label: "Ocupado", status: "occupied", selected: false },
  { label: "Accesible (silla de ruedas)", status: "accessible", selected: false },
] as const satisfies readonly (SeatShapeProps & { label: string })[];

export function SeatLegend() {
  return (
    <ul aria-label="Leyenda del plano" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {LEGEND_ITEMS.map(({ label, status, selected }) => (
        <li key={label} className="flex items-center gap-2">
          <svg viewBox="-16 -16 32 32" aria-hidden className="size-6 shrink-0">
            <SeatShape status={status} selected={selected} />
          </svg>
          {label}
        </li>
      ))}
    </ul>
  );
}
