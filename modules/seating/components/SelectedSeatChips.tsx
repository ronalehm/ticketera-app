import { X } from "lucide-react";
import type { MouseEvent } from "react";

import { Button } from "@/components/ui/button";

type SelectedSeatChipsProps = {
  /** Todos los asientos elegidos (de cualquier zona), en orden de selección. */
  seats: { id: string; label: string }[];
  onRemove: (seatId: string) => void;
};

/**
 * "Tus asientos": un chip por asiento con su etiqueta completa y un botón para quitarlo. Al quitar uno, el foco
 * pasa al botón del chip siguiente (o al anterior); si no queda ninguno, lo recoloca quien llama a `onRemove`.
 */
export function SelectedSeatChips({ seats, onRemove }: SelectedSeatChipsProps) {
  const handleRemove = (event: MouseEvent<HTMLButtonElement>, seatId: string) => {
    // Los chips van con `key` por id: el vecino sigue montado tras quitar este, así que se enfoca sin esperar al render.
    const item = event.currentTarget.closest("li");
    const neighbor = (item?.nextElementSibling ?? item?.previousElementSibling)?.querySelector("button");
    onRemove(seatId);
    neighbor?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-bold">Tus asientos</h3>
      {seats.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no elegiste asientos.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {seats.map((seat) => (
            <li
              key={seat.id}
              className="flex min-h-11 max-w-full items-center gap-1 rounded-full bg-secondary pl-4 text-sm font-medium text-secondary-foreground"
            >
              <span className="min-w-0 py-2">{seat.label}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 cursor-pointer rounded-full hover:bg-background"
                aria-label={`Quitar ${seat.label}`}
                onClick={(event) => handleRemove(event, seat.id)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
