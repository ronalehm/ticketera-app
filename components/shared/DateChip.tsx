import type * as React from "react";
import { cn } from "@/lib/utils";

type DateChipProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Mes abreviado en mayúsculas ("NOV"). */
  month: string;
  /** Día de dos dígitos ("14"). */
  day: string;
  /** Marcador sin fecha ("MES" / "--"): texto atenuado. */
  placeholder?: boolean;
};

/** Chip de fecha MES/día de las tarjetas. Decorativo (`aria-hidden`); la posición la pone quien lo usa por `className`. */
export function DateChip({ month, day, placeholder = false, className, ...props }: DateChipProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex w-14 flex-col items-center rounded-xl bg-background px-2.5 py-1.5 leading-none ring-1 ring-border/60",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "text-xs font-bold tracking-wider",
          placeholder ? "text-muted-foreground" : "text-primary-strong",
        )}
      >
        {month}
      </span>
      <span
        className={cn(
          "mt-0.5 text-2xl font-extrabold tabular-nums",
          placeholder ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {day}
      </span>
    </span>
  );
}
