"use client";

import { useId, useState } from "react";
import { Minus, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BestSeatsPickerProps = {
  /** Butacas que puede tener la zona dado el resto de la compra (la "m" de "n de m butacas"). */
  seatLimit: number;
  /** Butacas ya elegidas en la zona: valor inicial del stepper si hay alguna. */
  selectedInZone: number;
  onPick: (count: number) => void;
};

/** Cantidad inicial sin butacas elegidas en la zona: la compra más común (decisión 25). */
const DEFAULT_COUNT = 2;

// Como en ZoneQuantityPanel: focusableWhenDisabled no pone `disabled`, así que se neutralizan a mano el cursor, la
// opacidad y el desplazamiento al pulsar del Button.
const ARIA_DISABLED_CLASS =
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:not-aria-[haspopup]:translate-y-0";
const STEPPER_BUTTON_CLASS = cn("size-11 cursor-pointer", ARIA_DISABLED_CLASS);

/** "Mejores butacas" del plano: cuántas butacas juntas y el botón que elige el mejor bloque de la zona. */
export function BestSeatsPicker({ seatLimit, selectedInZone, onPick }: BestSeatsPickerProps) {
  const labelId = useId();
  const [count, setCount] = useState(selectedInZone > 0 ? selectedInZone : DEFAULT_COUNT);

  const maxCount = Math.max(1, seatLimit);
  const shownCount = Math.min(Math.max(count, 1), maxCount);
  const disabled = seatLimit <= 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-3 sm:justify-start">
        <p id={labelId} className="text-sm font-semibold">
          ¿Cuántas butacas juntas?
        </p>

        <div role="group" aria-labelledby={labelId} className="flex shrink-0 items-center gap-1 rounded-xl border p-0.5">
          <Button
            variant="secondary"
            size="icon"
            className={cn(STEPPER_BUTTON_CLASS, "aria-disabled:hover:bg-secondary")}
            aria-label="Quitar una butaca"
            disabled={disabled || shownCount <= 1}
            focusableWhenDisabled
            onClick={() => setCount(shownCount - 1)}
          >
            <Minus className="size-5" aria-hidden />
          </Button>
          <span aria-live="polite" className="w-8 text-center text-base font-bold tabular-nums">
            {shownCount}
          </span>
          <Button
            size="icon"
            className={cn(STEPPER_BUTTON_CLASS, "hover:bg-primary-strong aria-disabled:hover:bg-primary")}
            aria-label="Agregar una butaca"
            disabled={disabled || shownCount >= seatLimit}
            focusableWhenDisabled
            onClick={() => setCount(shownCount + 1)}
          >
            <Plus className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      <Button
        variant="outline"
        className={cn(
          "h-11 cursor-pointer gap-2 font-semibold text-primary-strong",
          ARIA_DISABLED_CLASS,
          "aria-disabled:hover:bg-background aria-disabled:hover:text-primary-strong dark:aria-disabled:hover:bg-input/30",
        )}
        disabled={disabled}
        focusableWhenDisabled
        onClick={() => onPick(shownCount)}
      >
        <Sparkles className="size-5" aria-hidden />
        {shownCount === 1 ? "Elegir la mejor butaca" : "Elegir las mejores butacas"}
      </Button>
    </div>
  );
}
