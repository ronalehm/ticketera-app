import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatEventPrice } from "@/modules/events/purchase";

import { formatTicketCount } from "../utils/selectionSummary";

type MobilePurchaseBarProps = {
  ticketCount: number;
  total: number;
  checkoutHref: string | null;
  className?: string;
};

const CTA_CLASS = cn(
  buttonVariants(),
  "h-11 shrink-0 cursor-pointer gap-2 px-6 font-semibold duration-200 hover:bg-primary-strong focus-visible:ring-ring",
);

export function MobilePurchaseBar({ ticketCount, total, checkoutHref, className }: MobilePurchaseBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg shadow-foreground/5",
        className,
      )}
    >
      <div aria-live="polite" aria-atomic className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">Total · {formatTicketCount(ticketCount)}</span>
        <span className="text-xl font-bold tabular-nums">{formatEventPrice(total)}</span>
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
