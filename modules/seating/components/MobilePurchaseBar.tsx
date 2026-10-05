import { ArrowRight, ChevronUp, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { StartCheckoutButton } from "@/modules/checkout/start";
import { formatEventPrice } from "@/modules/events/purchase";

import type { SelectionLine } from "../types/seating.types";
import { formatTicketCount } from "../utils/selectionSummary";
import { PurchaseSummaryContent } from "./PurchaseSummary";

type MobilePurchaseBarProps = {
  lines: SelectionLine[];
  ticketCount: number;
  total: number;
  checkoutHref: string | null;
  className?: string;
};

const CTA_CLASS = cn(
  buttonVariants(),
  "h-11 shrink-0 cursor-pointer gap-2 px-5 font-semibold duration-200 hover:bg-primary-strong focus-visible:ring-ring",
);

/** Barra inferior (< lg): total, "Ver resumen de la compra" (hoja inferior "Tu compra") y "Continuar". */
export function MobilePurchaseBar({ lines, ticketCount, total, checkoutHref, className }: MobilePurchaseBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg shadow-foreground/5",
        className,
      )}
    >
      <div aria-live="polite" aria-atomic className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted-foreground">Total · {formatTicketCount(ticketCount)}</span>
        <span className="text-xl font-bold tabular-nums">{formatEventPrice(total)}</span>
      </div>

      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="size-11 cursor-pointer"
              aria-label="Ver resumen de la compra"
            />
          }
        >
          <ChevronUp className="size-5" aria-hidden />
        </SheetTrigger>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[85svh] gap-0 rounded-t-2xl">
          <SheetHeader className="flex-row items-center justify-between gap-4 py-2 pr-2">
            <SheetTitle className="text-lg font-bold">Tu compra</SheetTitle>
            <SheetClose
              aria-label="Cerrar"
              render={<Button variant="ghost" className="size-11 cursor-pointer duration-200" />}
            >
              <X className="size-5" aria-hidden />
            </SheetClose>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <PurchaseSummaryContent
              lines={lines}
              ticketCount={ticketCount}
              total={total}
              checkoutHref={checkoutHref}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* w-min: el ancho lo fija el botón (nowrap) y un error largo se parte debajo sin comprimir el total. */}
      <div className="w-min shrink-0">
        <StartCheckoutButton checkoutHref={checkoutHref} className={CTA_CLASS}>
          Continuar
          <ArrowRight className="size-5" aria-hidden />
        </StartCheckoutButton>
      </div>
    </div>
  );
}
