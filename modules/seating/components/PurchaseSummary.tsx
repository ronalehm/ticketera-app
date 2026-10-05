import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StartCheckoutButton } from "@/modules/checkout/start";
import { formatEventPrice } from "@/modules/events/purchase";

import type { SelectionLine } from "../types/seating.types";
import { formatTicketCount } from "../utils/selectionSummary";

type PurchaseSummaryContentProps = {
  lines: SelectionLine[];
  ticketCount: number;
  total: number;
  checkoutHref: string | null;
};

type PurchaseSummaryProps = PurchaseSummaryContentProps & { className?: string };

const CTA_CLASS = cn(
  buttonVariants(),
  "h-11 w-full cursor-pointer gap-2 font-semibold duration-200 hover:bg-primary-strong focus-visible:ring-ring",
);

/** Contenido de "Tu compra": líneas (o el texto vacío), total y CTA. Lo comparten el aside y la hoja móvil. */
export function PurchaseSummaryContent({ lines, ticketCount, total, checkoutHref }: PurchaseSummaryContentProps) {
  return (
    <div className="flex flex-col gap-5">
      {lines.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-input p-5 text-center text-sm text-muted-foreground">
          Todavía no elegiste entradas. Empieza eligiendo una zona.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li key={line.zoneId} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-3 text-base">
                <span>
                  {line.quantity} × {line.name}
                </span>
                <span className="font-bold tabular-nums">{formatEventPrice(line.amount)}</span>
              </div>
              {line.seatLabels.length > 0 && (
                <p className="text-sm text-muted-foreground">{line.seatLabels.join(", ")}</p>
              )}
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

      <StartCheckoutButton checkoutHref={checkoutHref} className={CTA_CLASS}>
        Continuar
        <ArrowRight className="size-5" aria-hidden />
      </StartCheckoutButton>
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
