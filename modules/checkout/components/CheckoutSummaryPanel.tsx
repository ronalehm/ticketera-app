"use client";

import { useId, useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTicketCount } from "../utils/summaryFormat";

type CheckoutSummaryPanelProps = {
  title: string;
  imageUrl: string;
  ticketCount: number;
  totalLabel: string;
  children: ReactNode;
  className?: string;
};

// Un único resumen: plegable en móvil, siempre desplegado (y sticky desde fuera) en lg.
export function CheckoutSummaryPanel({
  title,
  imageUrl,
  ticketCount,
  totalLabel,
  children,
  className,
}: CheckoutSummaryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <aside aria-label="Resumen de la compra" className={cn("flex flex-col gap-4", className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-border outline-none transition-colors duration-200 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <Image src={imageUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-lg object-cover" />
        <span className="flex min-w-0 grow flex-col">
          <span className="sr-only">Resumen del pedido:</span>
          <span className="line-clamp-1 text-base font-semibold">{title}</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatTicketCount(ticketCount)} · {totalLabel}
          </span>
        </span>
        <ChevronDown
          className={cn("size-5 shrink-0 motion-safe:transition-transform motion-safe:duration-200", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <div id={contentId} className={cn(!isOpen && "hidden", "lg:block")}>
        {children}
      </div>
    </aside>
  );
}
