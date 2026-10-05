import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { flushSync } from "react-dom";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEventPrice } from "@/modules/events/purchase";

import type { SelectionLine } from "../types/seating.types";
import { formatTicketCount } from "../utils/selectionSummary";

export type PurchaseSummaryContentProps = {
  lines: SelectionLine[];
  ticketCount: number;
  total: number;
  checkoutHref: string | null;
  /** Quita todas las entradas de la zona (la cantidad o todas sus butacas). */
  onRemoveLine: (zoneId: string) => void;
};

type PurchaseSummaryProps = PurchaseSummaryContentProps & { className?: string };

const CTA_CLASS = cn(
  buttonVariants(),
  "h-11 w-full cursor-pointer gap-2 font-semibold duration-200 hover:bg-primary-strong focus-visible:ring-ring",
);

/**
 * Contenido de "Tu compra": líneas con "Quitar" (o el texto vacío), total y CTA. Lo comparten el aside y la hoja
 * móvil. Al quitar una línea, el foco pasa al "Quitar" de la siguiente (o de la anterior); si no queda ninguna, al
 * texto vacío.
 */
export function PurchaseSummaryContent({
  lines,
  ticketCount,
  total,
  checkoutHref,
  onRemoveLine,
}: PurchaseSummaryContentProps) {
  const emptyRef = useRef<HTMLParagraphElement>(null);

  const handleRemove = (event: MouseEvent<HTMLButtonElement>, zoneId: string) => {
    // Las líneas van con `key` por zona: la vecina sigue montada tras quitar esta.
    const item = event.currentTarget.closest("li");
    const neighbor = (item?.nextElementSibling ?? item?.previousElementSibling)?.querySelector("button");
    flushSync(() => onRemoveLine(zoneId));
    (neighbor ?? emptyRef.current)?.focus();
  };

  return (
    <div className="flex flex-col gap-5">
      {lines.length === 0 ? (
        <p
          ref={emptyRef}
          tabIndex={-1}
          className="rounded-xl border-2 border-dashed border-input p-5 text-center text-sm text-muted-foreground outline-none"
        >
          Todavía no elegiste entradas. Empieza eligiendo una zona.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li key={line.zoneId} className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-base">
                  {line.quantity} × {line.name}
                </span>
                {line.seatLabels.length > 0 && (
                  <p className="text-sm text-muted-foreground">{line.seatLabels.join(", ")}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-base font-bold tabular-nums">{formatEventPrice(line.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-my-2 size-11 cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label={`Quitar ${line.name} de tu compra`}
                  onClick={(event) => handleRemove(event, line.zoneId)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1 border-t-2 border-dashed pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-base font-bold">
            Total <span className="font-normal text-muted-foreground">({formatTicketCount(ticketCount)})</span>
          </span>
          <span aria-live="polite" className="text-2xl font-bold tabular-nums">
            {formatEventPrice(total)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Precio final, sin cargos ocultos</p>
      </div>

      {checkoutHref === null ? (
        <button type="button" disabled className={CTA_CLASS}>
          Continuar
          <ArrowRight className="size-5" aria-hidden />
        </button>
      ) : (
        <Link href={checkoutHref} className={CTA_CLASS}>
          Continuar
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function PurchaseSummary({ className, ...content }: PurchaseSummaryProps) {
  return (
    <aside aria-label="Resumen de la compra" className={className}>
      <Card className="w-full gap-5 rounded-2xl ring-border">
        <CardHeader>
          <h2 className="text-xl font-bold tracking-tight">Tu compra</h2>
        </CardHeader>
        <CardContent>
          <PurchaseSummaryContent {...content} />
        </CardContent>
      </Card>
    </aside>
  );
}
