import { useId } from "react";

import { MAX_TICKETS_PER_ORDER, formatEventPrice } from "@/modules/events/purchase";

import { QuantityStepper } from "./QuantityStepper";

type ZoneQuantityPanelProps = {
  zoneName: string;
  price: number;
  quantity: number;
  /** La compra llegó al máximo de entradas: "+" queda deshabilitado. */
  atLimit: boolean;
  onChangeQuantity: (delta: 1 | -1) => void;
};

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

        <QuantityStepper
          aria-labelledby={labelId}
          value={quantity}
          decrementLabel={`Quitar una entrada de ${zoneName}`}
          incrementLabel={`Agregar una entrada de ${zoneName}`}
          canDecrement={quantity > 0}
          canIncrement={!atLimit}
          onDecrement={() => onChangeQuantity(-1)}
          onIncrement={() => onChangeQuantity(1)}
        />
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
