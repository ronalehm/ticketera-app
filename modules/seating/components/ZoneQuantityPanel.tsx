import { useId } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_TICKETS_PER_ORDER, formatEventPrice } from "@/modules/events/purchase";

type ZoneQuantityPanelProps = {
  zoneName: string;
  price: number;
  quantity: number;
  /** La compra llegó al máximo de entradas: "+" queda deshabilitado. */
  atLimit: boolean;
  onChangeQuantity: (delta: 1 | -1) => void;
};

// Como en TicketSelector: focusableWhenDisabled no pone `disabled`, así que se neutralizan a mano el hover y el
// desplazamiento al pulsar del Button.
const STEPPER_BUTTON_CLASS =
  "size-11 cursor-pointer aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:not-aria-[haspopup]:translate-y-0";

/** Sub-paso 2 de una zona de pie: cantidad con stepper y subtotal. */
export function ZoneQuantityPanel({ zoneName, price, quantity, atLimit, onChangeQuantity }: ZoneQuantityPanelProps) {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p id={labelId} className="text-base font-semibold">
            Cantidad
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">{formatEventPrice(price)} c/u</p>
        </div>

        <div role="group" aria-labelledby={labelId} className="flex shrink-0 items-center gap-1 rounded-xl border p-0.5">
          <Button
            variant="secondary"
            size="icon"
            className={cn(STEPPER_BUTTON_CLASS, "aria-disabled:hover:bg-secondary")}
            aria-label={`Quitar una entrada de ${zoneName}`}
            disabled={quantity === 0}
            focusableWhenDisabled
            onClick={() => onChangeQuantity(-1)}
          >
            <Minus className="size-5" aria-hidden />
          </Button>
          <span aria-live="polite" className="w-8 text-center text-base font-bold tabular-nums">
            {quantity}
          </span>
          <Button
            size="icon"
            className={cn(STEPPER_BUTTON_CLASS, "hover:bg-primary-strong aria-disabled:hover:bg-primary")}
            aria-label={`Agregar una entrada de ${zoneName}`}
            disabled={atLimit}
            focusableWhenDisabled
            onClick={() => onChangeQuantity(1)}
          >
            <Plus className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span aria-live="polite" className="text-lg font-bold tabular-nums">
          {formatEventPrice(price * quantity)}
        </span>
      </div>

      <p role="status" className="text-sm text-muted-foreground">
        {atLimit
          ? `Llegaste al máximo de ${MAX_TICKETS_PER_ORDER} entradas por compra.`
          : `Máximo ${MAX_TICKETS_PER_ORDER} entradas por compra.`}
      </p>
    </div>
  );
}
