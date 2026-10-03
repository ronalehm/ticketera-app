"use client";

import { Maximize, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatEventPrice } from "@/modules/events/purchase";

import type { NumberedVenueZone, Seat } from "../types/seating.types";
import { getSeatAriaLabel } from "../utils/seatIds";
import { getAdjacentSeatId, type SeatNavigationKey } from "../utils/seatNavigation";
import { SEAT_PLAN_MARGIN } from "../utils/seatRows";
import { parseViewBox } from "../utils/viewBox";
import { SeatLegend, SeatShape } from "./SeatLegend";
import { SelectedSeatChips } from "./SelectedSeatChips";

type SeatPlanProps = {
  zone: NumberedVenueZone;
  stageLabel: string;
  /** Ids de todos los asientos elegidos (de cualquier zona). */
  selectedSeatIds: string[];
  /** Todos los asientos elegidos con su etiqueta completa, en orden de selección (chips). */
  selectedSeats: { id: string; label: string }[];
  notice: string | null;
  canPickBest: boolean;
  onToggleSeat: (seatId: string) => void;
  onRemoveSeat: (seatId: string) => void;
  onPickBestSeats: (zoneId: string) => void;
  /** `id` del h3 de la zona en `ZoneStepHeader` (fuera del plano): recibe el foco al quitar el último chip. */
  headingId: string;
};

const NAVIGATION_KEYS: readonly string[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"] satisfies SeatNavigationKey[];
/** Desplazamiento (px) a partir del cual un gesto cuenta como arrastre y no como toque. */
const DRAG_THRESHOLD = 4;

// Geometría del SVG en unidades del `seatViewBox` (≤ 400 de ancho). A 375 px el plano se pinta a ≥ ~0.78 px/unidad:
// el escenario (20) queda en ≥ 15 px y las etiquetas de fila (24) en ≥ 18 px.
const STAGE_TOP = 12;
const STAGE_HEIGHT = 36;
const STAGE_FONT_SIZE = 20;
const ROW_LABEL_FONT_SIZE = 24;
const SEAT_HIT_SIZE = 32;

// La librería inyecta su CSS sin capa (`width/height: fit-content`), que gana a las utilidades de Tailwind: el
// tamaño del lienzo va en línea para que ocupe el contenedor.
const FILL_STYLE = { width: "100%", height: "100%" };

/** 0 con `prefers-reduced-motion: reduce`; `undefined` deja la animación por defecto de la librería. */
function getAnimationTime(): number | undefined {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : undefined;
}

function getClientPoint(event: TouchEvent | globalThis.MouseEvent): { x: number; y: number } | null {
  const point = "touches" in event ? event.touches[0] : event;
  return point ? { x: point.clientX, y: point.clientY } : null;
}

function isNavigationKey(key: string): key is SeatNavigationKey {
  return NAVIGATION_KEYS.includes(key);
}

/** Asiento con `tabIndex=0` (roving tabindex): el último enfocado; si no, el primer elegido, el primer libre o el primero. */
function getTabbableSeatId(seats: Seat[], focusedSeatId: string | null, selected: Set<string>): string | undefined {
  return (
    seats.find((seat) => seat.id === focusedSeatId) ??
    seats.find((seat) => selected.has(seat.id)) ??
    seats.find((seat) => seat.status !== "occupied") ??
    seats[0]
  )?.id;
}

function SeatPlanToolbar({ canPickBest, onPickBest }: { canPickBest: boolean; onPickBest: () => void }) {
  const { zoomIn, zoomOut, fitToView } = useControls();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-11 cursor-pointer"
        aria-label="Acercar"
        onClick={() => zoomIn(undefined, getAnimationTime())}
      >
        <ZoomIn className="size-5" aria-hidden />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="size-11 cursor-pointer"
        aria-label="Alejar"
        onClick={() => zoomOut(undefined, getAnimationTime())}
      >
        <ZoomOut className="size-5" aria-hidden />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="size-11 cursor-pointer"
        aria-label="Ver todo el plano"
        onClick={() => fitToView({ animationTime: getAnimationTime() })}
      >
        <Maximize className="size-5" aria-hidden />
      </Button>
      <Button
        variant="secondary"
        className="h-11 cursor-pointer gap-2 px-4 font-semibold sm:ml-auto"
        disabled={!canPickBest}
        onClick={onPickBest}
      >
        <Sparkles className="size-5" aria-hidden />
        Mejor asiento disponible
      </Button>
    </div>
  );
}

/**
 * Sub-paso 2 de una zona numerada (debajo de `ZoneStepHeader`, que pone el nombre, el precio y el contador): plano de
 * asientos con zoom/paneo (`react-zoom-pan-pinch`), leyenda y chips de asientos
 * elegidos. Los asientos son `role="checkbox"` con roving tabindex (flechas, Home/End; Espacio/Enter alternan) y
 * eventos delegados en un solo `<g>`. Un clic que llega tras arrastrar el plano se ignora.
 */
export function SeatPlan({
  zone,
  stageLabel,
  selectedSeatIds,
  selectedSeats,
  notice,
  canPickBest,
  onToggleSeat,
  onRemoveSeat,
  onPickBestSeats,
  headingId,
}: SeatPlanProps) {
  const helpId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const seatsRef = useRef<SVGGElement>(null);
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(null);

  const seats = zone.rows.flatMap((row) => row.seats);
  const selected = new Set(selectedSeatIds);
  const tabbableSeatId = getTabbableSeatId(seats, focusedSeatId, selected);
  const priceLabel = formatEventPrice(zone.price);
  const { width, height } = parseViewBox(zone.seatViewBox);
  const stageWidth = width - 2 * SEAT_PLAN_MARGIN.x;

  const findSeat = (seatId: string) => seats.find((seat) => seat.id === seatId);

  /** Con zoom, centra el asiento enfocado si queda (en parte) fuera de la vista, manteniendo la escala actual. */
  const keepSeatInView = (element: SVGGElement) => {
    const controls = transformRef.current;
    const viewport = viewportRef.current?.getBoundingClientRect();
    const scale = controls?.instance.state.scale ?? 1;
    if (!controls || !viewport || scale <= 1) return;

    const seat = element.getBoundingClientRect();
    const isVisible =
      seat.left >= viewport.left && seat.right <= viewport.right && seat.top >= viewport.top && seat.bottom <= viewport.bottom;
    if (isVisible) return;

    // `zoomToElement` solo usa `getBoundingClientRect`, que los elementos SVG también tienen.
    void controls.zoomToElement(element as unknown as HTMLElement, { scale, animationTime: getAnimationTime() });
  };

  const handleClick = (event: MouseEvent<SVGGElement>) => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    const seatId = (event.target as Element).closest<SVGGElement>("[data-seat-id]")?.dataset.seatId;
    const seat = seatId ? findSeat(seatId) : undefined;
    if (!seat) return;

    setFocusedSeatId(seat.id);
    if (seat.status !== "occupied") onToggleSeat(seat.id);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const seatId = (event.target as Element).closest<SVGGElement>("[data-seat-id]")?.dataset.seatId;
    const seat = seatId ? findSeat(seatId) : undefined;
    if (!seat) return;

    if (isNavigationKey(event.key)) {
      event.preventDefault();
      const nextId = getAdjacentSeatId(zone, seat.id, event.key);
      const nextElement = seatsRef.current?.querySelector<SVGGElement>(`[data-seat-id="${nextId}"]`);
      setFocusedSeatId(nextId);
      if (!nextElement) return;
      nextElement.focus({ preventScroll: true });
      keepSeatInView(nextElement);
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setFocusedSeatId(seat.id);
      if (seat.status !== "occupied") onToggleSeat(seat.id);
    }
  };

  const handleRemoveChip = (seatId: string) => {
    onRemoveSeat(seatId);
    // Sin chips restantes, el foco vuelve al h3 de la zona (los chips mueven el foco al vecino cuando lo hay).
    if (selectedSeats.length === 1) document.getElementById(headingId)?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Toca una butaca para elegirla. Acerca el plano con los botones o pellizcando.
      </p>

      <TransformWrapper
        key={zone.id}
        ref={transformRef}
        fitOnInit="contain"
        minScale={1}
        maxScale={4}
        limitToBounds
        doubleClick={{ disabled: true }}
        wheel={{ activationKeys: ["Control", "Meta"] }}
        onPanningStart={(_, event) => {
          panStartRef.current = getClientPoint(event);
          draggedRef.current = false;
        }}
        onPanning={(_, event) => {
          const start = panStartRef.current;
          const point = getClientPoint(event);
          if (start && point && Math.hypot(point.x - start.x, point.y - start.y) > DRAG_THRESHOLD) {
            draggedRef.current = true;
          }
        }}
      >
        <SeatPlanToolbar canPickBest={canPickBest} onPickBest={() => onPickBestSeats(zone.id)} />

        <div
          ref={viewportRef}
          className="max-h-[70vh] w-full touch-none overflow-hidden rounded-xl bg-muted"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <TransformComponent wrapperStyle={FILL_STYLE} contentStyle={FILL_STYLE}>
            <svg
              viewBox={zone.seatViewBox}
              role="group"
              aria-label={`Plano de asientos de ${zone.name}`}
              aria-describedby={helpId}
              className="block size-full select-none"
            >
              <g aria-hidden className="pointer-events-none">
                <rect
                  x={SEAT_PLAN_MARGIN.x}
                  y={STAGE_TOP}
                  width={stageWidth}
                  height={STAGE_HEIGHT}
                  rx={8}
                  className="fill-foreground"
                />
                <text
                  x={SEAT_PLAN_MARGIN.x + stageWidth / 2}
                  y={STAGE_TOP + STAGE_HEIGHT / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={STAGE_FONT_SIZE}
                  className="fill-background font-bold tracking-widest uppercase"
                >
                  {stageLabel}
                </text>
                {zone.rows.map((row) => (
                  <text
                    key={row.label}
                    x={SEAT_PLAN_MARGIN.x / 2}
                    y={row.seats[0].y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={ROW_LABEL_FONT_SIZE}
                    className="fill-muted-foreground font-bold"
                  >
                    {row.label}
                  </text>
                ))}
              </g>

              <g ref={seatsRef} onClick={handleClick} onKeyDown={handleKeyDown}>
                {seats.map((seat) => {
                  const isSelected = selected.has(seat.id);
                  const isOccupied = seat.status === "occupied";
                  const isAccessible = seat.status === "accessible";

                  return (
                    <g
                      key={seat.id}
                      role="checkbox"
                      data-seat-id={seat.id}
                      tabIndex={seat.id === tabbableSeatId ? 0 : -1}
                      aria-checked={isSelected}
                      aria-disabled={isOccupied || undefined}
                      aria-label={getSeatAriaLabel(seat, priceLabel)}
                      transform={`translate(${seat.x} ${seat.y})`}
                      className={cn("group/seat outline-none", isOccupied ? "cursor-not-allowed" : "cursor-pointer")}
                    >
                      <rect
                        x={-SEAT_HIT_SIZE / 2}
                        y={-SEAT_HIT_SIZE / 2}
                        width={SEAT_HIT_SIZE}
                        height={SEAT_HIT_SIZE}
                        className="fill-transparent"
                      />
                      <SeatShape status={seat.status} selected={isSelected} />
                      {isAccessible ? (
                        <rect
                          x={-15}
                          y={-15}
                          width={30}
                          height={30}
                          rx={8}
                          className="fill-none stroke-ring stroke-3 opacity-0 group-focus-visible/seat:opacity-100"
                        />
                      ) : (
                        <circle
                          r={15}
                          className="fill-none stroke-ring stroke-3 opacity-0 group-focus-visible/seat:opacity-100"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </TransformComponent>
        </div>
      </TransformWrapper>

      <p id={helpId} className="sr-only">
        Usa las flechas para moverte entre asientos y Espacio para elegir o quitar.
      </p>
      <SeatLegend />
      <p role="status" className="text-sm font-medium">
        {notice}
      </p>
      <SelectedSeatChips seats={selectedSeats} onRemove={handleRemoveChip} />
    </div>
  );
}
