import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatEventPrice } from "@/modules/events/purchase";

type MobileBuyBarProps = {
  slug: string;
  priceFrom: number;
};

const CTA_CLASS = cn(
  buttonVariants(),
  "h-11 shrink-0 cursor-pointer gap-2 px-6 font-semibold duration-200 hover:bg-primary-strong focus-visible:ring-ring",
);

/** Barra inferior del detalle en móvil. La página no la renderiza si el evento está agotado (contrato H). */
export function MobileBuyBar({ slug, priceFrom }: MobileBuyBarProps) {
  return (
    <div className="sticky bottom-0 z-30 flex items-center justify-between gap-4 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg shadow-foreground/5 lg:hidden">
      <p className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">Desde</span>
        <span className="text-xl font-bold tabular-nums">{formatEventPrice(priceFrom)}</span>
      </p>
      <Link href={`/eventos/${slug}/entradas`} className={CTA_CLASS}>
        Comprar entradas
        <ArrowRight className="size-5" aria-hidden />
      </Link>
    </div>
  );
}
