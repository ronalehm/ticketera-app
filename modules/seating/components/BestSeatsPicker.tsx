"use client";

import { useId, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { QuantityStepper } from "./QuantityStepper";

type BestSeatsPickerProps = {
  /** Butacas que puede tener la zona dado el resto de la compra (la "m" de "n de m butacas"). */
  seatLimit: number;
  /** Butacas ya elegidas en la zona: valor inicial del stepper si hay alguna. */
  selectedInZone: number;
  onPick: (count: number) => void;
};

/** Cantidad inicial sin butacas elegidas en la zona: la compra más común (decisión 25). */
const DEFAULT_COUNT = 2;

// Como en QuantityStepper: focusableWhenDisabled no pone `disabled`, así que se neutralizan a mano el cursor, la
// opacidad y el desplazamiento al pulsar del Button.
const ARIA_DISABLED_CLASS =
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:not-aria-[haspopup]:translate-y-0";

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

        <QuantityStepper
          aria-labelledby={labelId}
          value={shownCount}
          decrementLabel="Quitar una butaca"
          incrementLabel="Agregar una butaca"
          canDecrement={!disabled && shownCount > 1}
          canIncrement={!disabled && shownCount < seatLimit}
          onDecrement={() => setCount(shownCount - 1)}
          onIncrement={() => setCount(shownCount + 1)}
        />
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
