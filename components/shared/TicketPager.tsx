"use client";

import type { ComponentProps, KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TicketPagerProps = Omit<ComponentProps<"div">, "children" | "onKeyDown"> & {
  /** Índice (0-based) de la entrada mostrada. */
  index: number;
  /** Número de entradas del pedido (≥ 1). */
  count: number;
  onIndexChange: (index: number) => void;
};

const NAV_BUTTON_CLASS =
  "size-11 cursor-pointer duration-200 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-background";

/**
 * Paginador controlado "Entrada n de N" con flechas. Apilado bajo 16rem de contenedor (`@3xs`) y en fila desde ahí,
 * para que el texto nunca se corte. ArrowLeft/ArrowRight cambian de entrada con el foco en cualquiera de las flechas.
 */
export function TicketPager({ index, count, onIndexChange, className, ...props }: TicketPagerProps) {
  const isFirst = index === 0;
  const isLast = index === count - 1;

  // Sin mirar `defaultPrevented`: Base UI lo marca en botones `disabled` + `focusableWhenDisabled`.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" && !isFirst) {
      event.preventDefault();
      onIndexChange(index - 1);
    } else if (event.key === "ArrowRight" && !isLast) {
      event.preventDefault();
      onIndexChange(index + 1);
    }
  }

  return (
    <div
      role="group"
      aria-label="Entradas del pedido"
      onKeyDown={handleKeyDown}
      className={cn("@container w-full", className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 @3xs:flex-row @3xs:justify-between @3xs:gap-3">
        <p aria-live="polite" aria-atomic="true" className="text-lg font-bold whitespace-nowrap tabular-nums">
          {`Entrada ${index + 1} de ${count}`}
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Entrada anterior"
            disabled={isFirst}
            focusableWhenDisabled
            onClick={() => onIndexChange(index - 1)}
            className={NAV_BUTTON_CLASS}
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Entrada siguiente"
            disabled={isLast}
            focusableWhenDisabled
            onClick={() => onIndexChange(index + 1)}
            className={NAV_BUTTON_CLASS}
          >
            <ChevronRight aria-hidden className="size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
