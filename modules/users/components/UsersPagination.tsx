"use client";

import { useId } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatCount } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

import { USERS_PAGE_SIZES } from "../schemas/users.schema";
import type { UsersPageSize } from "../types/users.types";
import { getPageWindow } from "../utils/pageWindow";

type UsersPaginationProps = {
  page: number;
  pageSize: UsersPageSize;
  /** Usuarios que cumplen los filtros (todas las páginas). */
  total: number;
  /** Filas de la página actual. */
  shown: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: UsersPageSize) => void;
};

const PAGE_BUTTON = "size-11 cursor-pointer tabular-nums";

/** Pie del listado: "Mostrando a–b de N", filas por página y paginación de hasta 5 números con anterior/siguiente. */
export function UsersPagination({ page, pageSize, total, shown, onPageChange, onPageSizeChange }: UsersPaginationProps) {
  const pageSizeId = useId();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = first + shown - 1;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
          Mostrando {formatCount(first)}–{formatCount(last)} de {formatCount(total)}
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor={pageSizeId} className="text-sm font-medium">
            Filas
          </Label>
          <NativeSelect
            id={pageSizeId}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as UsersPageSize)}
            className="*:data-[slot=native-select]:h-11 *:data-[slot=native-select]:cursor-pointer *:data-[slot=native-select]:bg-background *:data-[slot=native-select]:pl-3"
          >
            {USERS_PAGE_SIZES.map((size) => (
              <NativeSelectOption key={size} value={size}>
                {size}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <nav aria-label="Paginación de usuarios">
        <ul className="flex flex-wrap items-center gap-1">
          <li>
            <Button
              variant="ghost"
              size="icon"
              className={PAGE_BUTTON}
              aria-label="Página anterior"
              disabled={page <= 1}
              focusableWhenDisabled
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>
          </li>
          {getPageWindow(page, pageCount).map((number) => {
            const current = number === page;
            return (
              <li key={number}>
                <Button
                  variant="ghost"
                  size="icon"
                  // Activo: patrón del panel (`bg-accent font-semibold text-accent-foreground`).
                  className={cn(
                    PAGE_BUTTON,
                    current && "bg-accent font-semibold text-accent-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  aria-label={`Página ${number}`}
                  aria-current={current ? "page" : undefined}
                  onClick={() => onPageChange(number)}
                >
                  {number}
                </Button>
              </li>
            );
          })}
          <li>
            <Button
              variant="ghost"
              size="icon"
              className={PAGE_BUTTON}
              aria-label="Página siguiente"
              disabled={page >= pageCount}
              focusableWhenDisabled
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-5" aria-hidden />
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
