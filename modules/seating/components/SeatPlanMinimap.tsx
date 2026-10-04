"use client";

import { useCallback, useState } from "react";
import type { RefObject } from "react";
import { useTransformEffect } from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchContextState } from "react-zoom-pan-pinch";

import type { PlanTransform, VenueMap, VenueZone } from "../types/seating.types";
import { getVisiblePlanRect, toVenueRect, type Rect } from "../utils/planViewport";

type SeatPlanMinimapProps = {
  /** `viewBox` del mapa de zonas: el minimapa dibuja el estadio entero. */
  viewBox: VenueMap["viewBox"];
  stage: Pick<VenueMap["stage"], "path">;
  zones: Pick<VenueZone, "id" | "path">[];
  /** Zona abierta en el plano, resaltada en `fill-primary`. */
  activeZoneId: string;
  /** Transformación estadio → plano de la zona abierta. */
  planTransform: PlanTransform;
  /** Ancho y alto del `seatViewBox` de la zona abierta. */
  planWidth: number;
  planHeight: number;
  /** `<svg>` del plano: su alto frente al del lienzo da la franja que el contenido reserva abajo para el zoom. */
  planRef: RefObject<SVGSVGElement | null>;
};

/**
 * Ancho y alto de layout (px) con decimales: ni el zoom ni la animación de entrada del sub-paso los escalan (a diferencia
 * de `getBoundingClientRect`), y no se redondean (a diferencia de `clientWidth`, que desviaba el recuadro hasta ~1 unidad
 * del mapa en planos que encajan casi justo a lo ancho y a lo alto). Sin elemento, 0 × 0.
 */
function getLayoutSize(element: Element | null): { width: number; height: number } {
  if (!element) return { width: 0, height: 0 };
  const style = getComputedStyle(element);
  return { width: parseFloat(style.width) || 0, height: parseFloat(style.height) || 0 };
}

/**
 * Minimapa del plano en arco (requisito 30): el estadio en miniatura con la zona abierta resaltada y un recuadro con la
 * parte del plano que se ve. Decorativo (`aria-hidden`). Va dentro de `TransformWrapper` para leer su transformación.
 */
export function SeatPlanMinimap({
  viewBox,
  stage,
  zones,
  activeZoneId,
  planTransform,
  planWidth,
  planHeight,
  planRef,
}: SeatPlanMinimapProps) {
  // `null` hasta el primer cambio de transformación: se muestra el plano entero.
  const [visiblePlanRect, setVisiblePlanRect] = useState<Rect | null>(null);

  const syncVisibleRect = useCallback(
    ({ instance, state }: ReactZoomPanPinchContextState) => {
      const viewport = getLayoutSize(instance.wrapperComponent);
      // Medidas de layout (sin escalar): el plano ocupa el lienzo menos la franja inferior reservada (`sm:pb-16`).
      const svgHeight = planRef.current ? getLayoutSize(planRef.current).height : viewport.height;
      setVisiblePlanRect(
        getVisiblePlanRect({
          planWidth,
          planHeight,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
          scale: state.scale,
          positionX: state.positionX,
          positionY: state.positionY,
          insetBottom: viewport.height - svgHeight,
        }),
      );
    },
    [planWidth, planHeight, planRef],
  );

  useTransformEffect(syncVisibleRect);

  const viewRect = toVenueRect(visiblePlanRect ?? { x: 0, y: 0, width: planWidth, height: planHeight }, planTransform);

  // `overflow-visible`: el plano entero sobresale un poco del `viewBox` (su margen); el recuadro se dibuja sobre el `p-1`.
  // El ancho depende del lienzo (contenedor `@container` de `SeatPlan`), no de la ventana: 112 px desde 672 px de lienzo.
  return (
    <svg
      viewBox={viewBox}
      aria-hidden
      className="h-auto w-24 overflow-visible rounded-lg bg-background/90 p-1 shadow-sm ring-1 ring-border @2xl:w-28"
    >
      <path d={stage.path} className="fill-brand-navy" />
      {zones.map((zone) => (
        <path key={zone.id} d={zone.path} className={zone.id === activeZoneId ? "fill-primary" : "fill-secondary"} />
      ))}
      <rect
        x={viewRect.x}
        y={viewRect.y}
        width={viewRect.width}
        height={viewRect.height}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        className="fill-none stroke-foreground"
      />
    </svg>
  );
}
