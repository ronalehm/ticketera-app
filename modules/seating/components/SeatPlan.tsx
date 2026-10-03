"use client";

import { Maximize, Minus, Plus } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, MouseEvent, PointerEvent, RefObject } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
  useTransformInit,
} from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchContentRef, ReactZoomPanPinchContextState } from "react-zoom-pan-pinch";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatEventPrice } from "@/modules/events/purchase";

import type { NumberedVenueZone, Seat } from "../types/seating.types";
import { getRowEdgeLabelPoints } from "../utils/arcSeatRows";
import { formatSeatShortLabel, getSeatAriaLabel } from "../utils/seatIds";
import { getAdjacentSeatId, type SeatNavigationKey } from "../utils/seatNavigation";
import { getPlanFit, getSeatDetailLevel } from "../utils/planViewport";
import { SEAT_PLAN_MARGIN } from "../utils/seatRows";
import { parseViewBox } from "../utils/viewBox";
import { BestSeatsPicker } from "./BestSeatsPicker";
import { SeatLegend, SeatShape } from "./SeatLegend";
import { SeatTooltip } from "./SeatTooltip";
import { SelectedSeatChips } from "./SelectedSeatChips";

type SeatPlanProps = {
  zone: NumberedVenueZone;
  stageLabel: string;
  /** Ids de todos los asientos elegidos (de cualquier zona). */
  selectedSeatIds: string[];
  /** Todos los asientos elegidos con su etiqueta completa, en orden de selección (chips). */
  selectedSeats: { id: string; label: string }[];
  notice: string | null;
  /** Butacas que puede tener la zona dado el resto de la compra (la "m" de "n de m butacas"; decisión 11). */
  seatLimit: number;
  /** Butacas elegidas en esta zona. */
  selectedInZone: number;
  onToggleSeat: (seatId: string) => void;
  onRemoveSeat: (seatId: string) => void;
  /** Sustituye las butacas de la zona por el mejor bloque de `count`; devuelve sus ids o `null` si no se pudo. */
  onPickBestSeats: (zoneId: string, count: number) => string[] | null;
  /** `id` del h3 de la zona en `ZoneStepHeader` (fuera del plano): recibe el foco al quitar el último chip. */
  headingId: string;
};

/** Posición del tooltip (px relativos al lienzo) y butaca a la que apunta; los textos salen del estado actual. */
type TooltipAnchor = { seatId: string; x: number; y: number; placement: "top" | "bottom" };

const NAVIGATION_KEYS: readonly string[] = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"] satisfies SeatNavigationKey[];
/** Desplazamiento (px) a partir del cual un gesto cuenta como arrastre y no como toque. */
const DRAG_THRESHOLD = 4;
/** Duración (ms) del zoom a las butacas elegidas por "Mejores butacas" (decisión 26). */
const PICK_ZOOM_TIME = 300;
/** Escala máxima al acercar el plano a las butacas elegidas por "Mejores butacas". */
const PICK_ZOOM_MAX_SCALE = 2;
/** Margen (px) del centro del tooltip a los lados del lienzo, para que no se corte. */
const TOOLTIP_EDGE = 64;
/** Por debajo de esta distancia (px) al borde superior del lienzo, el tooltip va debajo de la butaca. */
const TOOLTIP_MIN_TOP = 48;

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

/** 0 con `prefers-reduced-motion: reduce`; si no, `time` (`undefined` deja la animación por defecto de la librería). */
function getAnimationTime(time?: number): number | undefined {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : time;
}

function getClientPoint(event: TouchEvent | globalThis.MouseEvent): { x: number; y: number } | null {
  const point = "touches" in event ? event.touches[0] : event;
  return point ? { x: point.clientX, y: point.clientY } : null;
}

function isNavigationKey(key: string): key is SeatNavigationKey {
  return NAVIGATION_KEYS.includes(key);
}

function getSeatElement(target: EventTarget | null): SVGGElement | null {
  return target instanceof Element ? target.closest<SVGGElement>("[data-seat-id]") : null;
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

/** Segunda línea del tooltip (requisito 24): "Ocupada", "Elegida · S/ X", "Accesible · S/ X" o el precio. */
function getTooltipDetail(seat: Seat, selected: boolean, priceLabel: string): string {
  if (seat.status === "occupied") return "Ocupada";
  if (selected) return `Elegida · ${priceLabel}`;
  if (seat.status === "accessible") return `Accesible · ${priceLabel}`;
  return priceLabel;
}

/**
 * Sin salida visual: escribe `data-detail` en el `<svg>` del plano según la escala (requisito 23). Va fuera del
 * estado de React para no re-renderizar en cada paso del zoom.
 */
function SeatDetailLevelSync({
  svgRef,
  planWidth,
  planHeight,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  planWidth: number;
  planHeight: number;
}) {
  const applyDetailLevel = useCallback(
    ({ state }: ReactZoomPanPinchContextState) => {
      const svg = svgRef.current;
      if (!svg) return;
      const { unit } = getPlanFit({
        planWidth,
        planHeight,
        viewportWidth: svg.clientWidth,
        viewportHeight: svg.clientHeight,
      });
      const level = getSeatDetailLevel(unit, state.scale);
      if (svg.dataset.detail !== level) svg.dataset.detail = level;
    },
    [svgRef, planWidth, planHeight],
  );

  useTransformInit(applyDetailLevel);
  useTransformEffect(applyDetailLevel);
  return null;
}

/**
 * Pastilla de zoom (requisito 22). Por debajo de `sm` va en la barra sobre el lienzo; desde `sm`, superpuesta abajo a
 * la derecha del lienzo (su contenedor posicionado mide lo mismo que el lienzo).
 */
function SeatPlanZoomControls() {
  const { zoomIn, zoomOut, fitToView } = useControls();

  return (
    <div
      role="group"
      aria-label="Zoom del plano"
      className="ml-auto inline-flex gap-1 rounded-xl bg-background p-1 shadow-sm ring-1 ring-border sm:absolute sm:right-3 sm:bottom-3 sm:z-10 sm:ml-0"
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-11 cursor-pointer"
        aria-label="Acercar"
        onClick={() => zoomIn(undefined, getAnimationTime())}
      >
        <Plus className="size-5" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 cursor-pointer"
        aria-label="Alejar"
        onClick={() => zoomOut(undefined, getAnimationTime())}
      >
        <Minus className="size-5" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 cursor-pointer"
        aria-label="Ver todo el plano"
        onClick={() => fitToView({ animationTime: getAnimationTime() })}
      >
        <Maximize className="size-5" aria-hidden />
      </Button>
    </div>
  );
}

/** `BestSeatsPicker` que, si se eligió un bloque, acerca el plano a él (decisión 26). */
function SeatPlanBestSeats({
  seatLimit,
  selectedInZone,
  pickBestSeats,
}: {
  seatLimit: number;
  selectedInZone: number;
  /** Elige el bloque y devuelve sus elementos en el plano (vacío si no se pudo). */
  pickBestSeats: (count: number) => SVGGElement[];
}) {
  const { zoomToElement } = useControls();

  const handlePick = (count: number) => {
    const elements = pickBestSeats(count);
    if (elements.length === 0) return;
    // `zoomToElement` solo usa `getBoundingClientRect`, que los elementos SVG también tienen.
    void zoomToElement(elements as unknown as HTMLElement[], {
      maxScale: PICK_ZOOM_MAX_SCALE,
      animationTime: getAnimationTime(PICK_ZOOM_TIME),
    });
  };

  return <BestSeatsPicker seatLimit={seatLimit} selectedInZone={selectedInZone} onPick={handlePick} />;
}

/**
 * Sub-paso 2 de una zona numerada (debajo de `ZoneStepHeader`, que pone el nombre, el precio y el contador): plano de
 * butacas con zoom/paneo (`react-zoom-pan-pinch`), números al acercar, tooltip, leyenda y bandeja con "Mejores
 * butacas", el aviso y los chips. Las butacas son `role="checkbox"` con roving tabindex (flechas, Home/End;
 * Espacio/Enter alternan) y eventos delegados en un solo `<g>`. Un clic que llega tras arrastrar el plano se ignora.
 */
export function SeatPlan({
  zone,
  stageLabel,
  selectedSeatIds,
  selectedSeats,
  notice,
  seatLimit,
  selectedInZone,
  onToggleSeat,
  onRemoveSeat,
  onPickBestSeats,
  headingId,
}: SeatPlanProps) {
  const helpId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const seatsRef = useRef<SVGGElement>(null);
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  /** Tipo del último puntero que pulsó una butaca: con "touch" no se muestra el tooltip al enfocar ni al tocar. */
  const pointerTypeRef = useRef<string | null>(null);
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<TooltipAnchor | null>(null);

  const seats = zone.rows.flatMap((row) => row.seats);
  const selected = new Set(selectedSeatIds);
  const tabbableSeatId = getTabbableSeatId(seats, focusedSeatId, selected);
  const priceLabel = formatEventPrice(zone.price);
  const hasAccessible = seats.some((seat) => seat.status === "accessible");
  const { width, height } = parseViewBox(zone.seatViewBox);
  const stageWidth = width - 2 * SEAT_PLAN_MARGIN.x;
  const isArc = zone.planTransform !== undefined;

  const findSeat = (seatId: string) => seats.find((seat) => seat.id === seatId);

  const tooltipSeat = tooltipAnchor ? findSeat(tooltipAnchor.seatId) : undefined;
  const tooltip =
    tooltipAnchor && tooltipSeat
      ? {
          title: formatSeatShortLabel(tooltipSeat.row, tooltipSeat.number),
          detail: getTooltipDetail(tooltipSeat, selected.has(tooltipSeat.id), priceLabel),
          x: tooltipAnchor.x,
          y: tooltipAnchor.y,
          placement: tooltipAnchor.placement,
        }
      : null;

  const hideTooltip = () => setTooltipAnchor(null);

  /** Coloca el tooltip sobre la butaca (o debajo, cerca del borde superior), relativo al lienzo. */
  const showTooltip = (element: SVGGElement) => {
    const canvas = viewportRef.current?.getBoundingClientRect();
    const seatId = element.dataset.seatId;
    if (!canvas || !seatId) return;

    const seat = element.getBoundingClientRect();
    const x = Math.max(TOOLTIP_EDGE, Math.min(seat.left + seat.width / 2 - canvas.left, canvas.width - TOOLTIP_EDGE));
    const top = seat.top - canvas.top;
    const placement = top < TOOLTIP_MIN_TOP ? "bottom" : "top";
    setTooltipAnchor({ seatId, x, y: placement === "top" ? top : seat.bottom - canvas.top, placement });
  };

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

    // `zoomToElement` solo usa `getBoundingClientRect`, que los elementos SVG también tienen. El zoom oculta el
    // tooltip (`onZoomStart`): al terminar vuelve a la butaca si sigue enfocada.
    void controls
      .zoomToElement(element as unknown as HTMLElement, { scale, animationTime: getAnimationTime() })
      .then(() => {
        if (document.activeElement === element) showTooltip(element);
      });
  };

  const handleClick = (event: MouseEvent<SVGGElement>) => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    const element = getSeatElement(event.target);
    const seat = element?.dataset.seatId ? findSeat(element.dataset.seatId) : undefined;
    if (!element || !seat) return;

    setFocusedSeatId(seat.id);
    if (seat.status !== "occupied") onToggleSeat(seat.id);
    // Al pulsar se ocultó (`onPanningStart`); con ratón vuelve con el estado nuevo.
    if (pointerTypeRef.current !== "touch") showTooltip(element);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    pointerTypeRef.current = null;
    const seatId = getSeatElement(event.target)?.dataset.seatId;
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

  const handlePointerOver = (event: PointerEvent<SVGGElement>) => {
    if (event.pointerType === "touch") return;
    const element = getSeatElement(event.target);
    if (element && element.dataset.seatId !== tooltipAnchor?.seatId) showTooltip(element);
  };

  const handlePointerOut = (event: PointerEvent<SVGGElement>) => {
    if (!getSeatElement(event.relatedTarget)) hideTooltip();
  };

  const handleFocus = (event: FocusEvent<SVGGElement>) => {
    const element = getSeatElement(event.target);
    if (element && pointerTypeRef.current !== "touch") showTooltip(element);
  };

  const handleRemoveChip = (seatId: string) => {
    onRemoveSeat(seatId);
    // Sin chips restantes, el foco vuelve al h3 de la zona (los chips mueven el foco al vecino cuando lo hay).
    if (selectedSeats.length === 1) document.getElementById(headingId)?.focus();
  };

  const pickBestSeats = (count: number): SVGGElement[] => {
    const seatIds = onPickBestSeats(zone.id, count);
    if (!seatIds) return [];
    hideTooltip();
    return seatIds.flatMap((seatId) => seatsRef.current?.querySelector<SVGGElement>(`[data-seat-id="${seatId}"]`) ?? []);
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
          hideTooltip();
        }}
        onPanning={(_, event) => {
          const start = panStartRef.current;
          const point = getClientPoint(event);
          if (!draggedRef.current && start && point && Math.hypot(point.x - start.x, point.y - start.y) > DRAG_THRESHOLD) {
            draggedRef.current = true;
            // Al pulsar una butaca, el foco puede haber vuelto a mostrar el tooltip: el arrastre lo quita.
            hideTooltip();
          }
        }}
        onZoomStart={hideTooltip}
        onPinchStart={hideTooltip}
      >
        <SeatDetailLevelSync svgRef={svgRef} planWidth={width} planHeight={height} />

        {/* Contenedor del lienzo: desde `sm` la barra es `contents` y el zoom se posiciona sobre el lienzo. */}
        <div className="relative flex flex-col gap-2">
          <div className="flex items-end justify-between gap-2 sm:contents">
            <SeatPlanZoomControls />
          </div>

          <div
            ref={viewportRef}
            className="relative max-h-[70vh] w-full touch-none overflow-hidden rounded-xl bg-muted ring-1 ring-border"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <TransformComponent wrapperStyle={FILL_STYLE} contentStyle={FILL_STYLE}>
              {/* Desde `sm`, franja inferior libre para la pastilla de zoom superpuesta (requisito 27). Va en este
                  contenedor y no en `contentClass`: el CSS sin capa de la librería (`padding: 0`) gana a la utilidad. */}
              <div className="size-full sm:pb-16">
                <svg
                  ref={svgRef}
                  viewBox={zone.seatViewBox}
                  role="group"
                  aria-label={`Plano de asientos de ${zone.name}`}
                  aria-describedby={helpId}
                  className="group/plan block size-full select-none"
                >
                  <g aria-hidden className="pointer-events-none">
                    {!isArc && (
                      <>
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
                      </>
                    )}
                    {zone.rows.flatMap((row) => {
                      const { start, end } = isArc
                        ? getRowEdgeLabelPoints(row)
                        : {
                            start: { x: SEAT_PLAN_MARGIN.x / 2, y: row.seats[0].y },
                            end: { x: width - SEAT_PLAN_MARGIN.x / 2, y: row.seats[0].y },
                          };
                      return [start, end].map((point, index) => (
                        <text
                          key={`${row.label}-${index}`}
                          x={point.x}
                          y={point.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={ROW_LABEL_FONT_SIZE}
                          className="fill-muted-foreground font-bold"
                        >
                          {row.label}
                        </text>
                      ));
                    })}
                  </g>

                  <g
                    ref={seatsRef}
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                    onPointerDown={(event) => {
                      pointerTypeRef.current = event.pointerType;
                    }}
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                    onFocus={handleFocus}
                    onBlur={hideTooltip}
                  >
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
                          <g aria-hidden>
                            <SeatShape status={seat.status} selected={isSelected} number={seat.number} />
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
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            </TransformComponent>

            <SeatTooltip tooltip={tooltip} />
          </div>
        </div>

        <p id={helpId} className="sr-only">
          Usa las flechas para moverte entre asientos y Espacio para elegir o quitar.
        </p>
        <SeatLegend price={zone.price} selectedCount={selectedInZone} hasAccessible={hasAccessible} />

        <div className="flex flex-col gap-4 border-t pt-4">
          <SeatPlanBestSeats
            key={zone.id}
            seatLimit={seatLimit}
            selectedInZone={selectedInZone}
            pickBestSeats={pickBestSeats}
          />
          <p role="status" className="text-sm font-medium">
            {notice}
          </p>
          <SelectedSeatChips seats={selectedSeats} onRemove={handleRemoveChip} />
        </div>
      </TransformWrapper>
    </div>
  );
}
