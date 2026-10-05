import type { ComponentProps } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuantityStepperProps = Omit<ComponentProps<"div">, "children" | "role"> & {
  value: number;
  decrementLabel: string;
  incrementLabel: string;
  canDecrement: boolean;
  canIncrement: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
};

// focusableWhenDisabled no pone `disabled`, así que se neutralizan a mano el cursor, la opacidad, el hover y el
// desplazamiento al pulsar del Button.
const BUTTON_CLASS =
  "size-11 cursor-pointer aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:not-aria-[haspopup]:translate-y-0";

/** Stepper −/+ en pastilla con el valor en medio. Los botones deshabilitados siguen siendo enfocables. */
export function QuantityStepper({
  value,
  decrementLabel,
  incrementLabel,
  canDecrement,
  canIncrement,
  onDecrement,
  onIncrement,
  className,
  ...props
}: QuantityStepperProps) {
  return (
    <div role="group" className={cn("flex shrink-0 items-center gap-1 rounded-xl border p-0.5", className)} {...props}>
      <Button
        variant="secondary"
        size="icon"
        className={cn(BUTTON_CLASS, "aria-disabled:hover:bg-secondary")}
        aria-label={decrementLabel}
        disabled={!canDecrement}
        focusableWhenDisabled
        onClick={() => onDecrement()}
      >
        <Minus className="size-5" aria-hidden />
      </Button>
      <span aria-live="polite" className="w-8 text-center text-base font-bold tabular-nums">
        {value}
      </span>
      <Button
        size="icon"
        className={cn(BUTTON_CLASS, "hover:bg-primary-strong aria-disabled:hover:bg-primary")}
        aria-label={incrementLabel}
        disabled={!canIncrement}
        focusableWhenDisabled
        onClick={() => onIncrement()}
      >
        <Plus className="size-5" aria-hidden />
      </Button>
    </div>
  );
}
