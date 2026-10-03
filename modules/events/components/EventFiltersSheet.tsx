"use client";

import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import type { EventFilters } from "../schemas/eventFilters.schema";
import { buildEventsHref, type FacetCounts, type MonthOption } from "../utils/eventFilters";
import { EventFiltersForm } from "./EventFiltersForm";

type EventFiltersSheetProps = {
  filters: EventFilters;
  facets: FacetCounts;
  months: MonthOption[];
  resultCount: number;
  className?: string;
};

// Filtros en móvil y tablet (< lg). Categoría va en las pills, así que aquí no se muestra.
// Al aplicar un filtro solo cambian los searchParams y Next conserva el estado del Sheet (sigue abierto).
export function EventFiltersSheet({ filters, facets, months, resultCount, className }: EventFiltersSheetProps) {
  const activeCount = (filters.ciudad?.length ?? 0) + (filters.mes ? 1 : 0) + (filters.precio ? 1 : 0);
  const clearHref = buildEventsHref({ ...filters, ciudad: undefined, mes: undefined, precio: undefined });

  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-11 cursor-pointer gap-2 px-4 font-semibold duration-200",
          className,
        )}
      >
        <SlidersHorizontal className="size-5" aria-hidden />
        {/* El sr-only va dentro del mismo span: como ítem flex aparte, Chromium añade un espacio antes de la coma. */}
        <span>
          Filtros
          {activeCount > 0 && (
            <span className="sr-only">
              , {activeCount} {activeCount === 1 ? "activo" : "activos"}
            </span>
          )}
        </span>
        {activeCount > 0 && (
          <span
            aria-hidden
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground tabular-nums"
          >
            {activeCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 data-[side=right]:w-full data-[side=right]:border-l-0 data-[side=right]:sm:max-w-none"
      >
        <SheetHeader className="h-16 shrink-0 flex-row items-center justify-between gap-4 border-b border-border py-0 pr-2 pl-4">
          <SheetTitle className="text-lg font-bold">Filtros</SheetTitle>
          <SheetClose
            aria-label="Cerrar filtros"
            render={<Button variant="ghost" className="size-11 cursor-pointer duration-200" />}
          >
            <X className="size-5" aria-hidden />
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <EventFiltersForm filters={filters} facets={facets} months={months} sections={["ciudad", "mes", "precio"]} />
        </div>

        <SheetFooter className="mt-0 shrink-0 flex-row gap-3 border-t border-border">
          <Link
            href={clearHref}
            scroll={false}
            className={cn(buttonVariants({ variant: "outline" }), "h-11 cursor-pointer px-4 font-semibold duration-200")}
          >
            Limpiar
          </Link>
          <SheetClose
            render={
              <Button className="h-11 flex-1 cursor-pointer font-semibold duration-200 hover:bg-primary-strong" />
            }
          >
            Ver {resultCount} {resultCount === 1 ? "evento" : "eventos"}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
