"use client";

import { useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { TicketTypeRow, TicketTypeRowErrors } from "../types/organizer.types";
import { createTicketTypeRow, formatTicketCount, getTicketCapacity } from "../utils/organizerEventForm";

/** Margen de scroll de los controles: en móvil, la barra de acciones `sticky` no tapa el campo enfocado. */
export const FORM_CONTROL_SCROLL = "scroll-mt-24 scroll-mb-28 lg:scroll-mb-0";

const ROW_GRID = "lg:grid-cols-[minmax(0,1fr)_150px_150px_44px]";

type RowField = keyof TicketTypeRowErrors;

const ROW_FIELDS: { field: RowField; label: string; inputProps: ComponentProps<"input"> }[] = [
  { field: "name", label: "Nombre", inputProps: { placeholder: "Ej. General", maxLength: 100 } },
  {
    field: "price",
    label: "Precio (S/)",
    inputProps: { type: "number", inputMode: "decimal", min: 0, step: 0.01, placeholder: "0" },
  },
  {
    field: "quantity",
    label: "Cantidad",
    inputProps: { type: "number", inputMode: "numeric", min: 1, step: 1, placeholder: "0" },
  },
];

const inputId = (rowId: string, field: RowField) => `ticket-type-${rowId}-${field}`;

type TicketTypesFieldProps = {
  rows: TicketTypeRow[];
  /** Errores por fila; `null` mientras el formulario no tenga errores en los tipos de entrada. */
  errors: TicketTypeRowErrors[] | null;
  onChange: (rows: TicketTypeRow[]) => void;
  onBlur: () => void;
};

export function TicketTypesField({ rows, errors, onChange, onBlur }: TicketTypesFieldProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Fila recién agregada: su campo "Nombre" recibe el foco cuando ya está en el DOM.
  const rowToFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!rowToFocusRef.current) return;
    document.getElementById(inputId(rowToFocusRef.current, "name"))?.focus();
    rowToFocusRef.current = null;
  }, [rows]);

  function updateRow(id: string, field: RowField, value: string) {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    const row = createTicketTypeRow();
    rowToFocusRef.current = row.id;
    onChange([...rows, row]);
  }

  function removeRow(id: string) {
    addButtonRef.current?.focus();
    onChange(rows.filter((row) => row.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div aria-hidden className={cn("hidden gap-3 text-sm font-medium text-muted-foreground lg:grid", ROW_GRID)}>
        <span>Nombre</span>
        <span>Precio (S/)</span>
        <span>Cantidad</span>
        <span />
      </div>

      {rows.map((row, index) => {
        const number = index + 1;
        const rowErrors = errors?.[index] ?? {};
        return (
          <FieldSet key={row.id} className="gap-2 border-b pb-4 last-of-type:border-b-0 lg:gap-0 lg:border-b-0 lg:pb-0">
            <FieldLegend variant="label" className="mb-0 font-semibold lg:sr-only">
              Tipo {number}
            </FieldLegend>
            <div className={cn("grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-3", ROW_GRID)}>
              {ROW_FIELDS.map(({ field, label, inputProps }) => {
                const id = inputId(row.id, field);
                const error = rowErrors[field];
                return (
                  <Field key={field} data-invalid={!!error} className={cn(field === "name" && "col-span-3 lg:col-span-1")}>
                    <FieldLabel htmlFor={id} className="lg:sr-only">
                      {label}
                    </FieldLabel>
                    <Input
                      {...inputProps}
                      id={id}
                      value={row[field]}
                      onChange={(event) => updateRow(row.id, field, event.target.value)}
                      onBlur={onBlur}
                      aria-invalid={!!error}
                      aria-describedby={error ? `${id}-error` : undefined}
                      className={cn("h-11", FORM_CONTROL_SCROLL)}
                    />
                    <FieldError id={`${id}-error`}>{error}</FieldError>
                  </Field>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar tipo de entrada ${number}`}
                disabled={rows.length === 1}
                onClick={() => removeRow(row.id)}
                // En móvil se alinea con los inputs (bajo su etiqueta visible); en lg las etiquetas son sr-only.
                className={cn(
                  "mt-7 size-11 cursor-pointer text-muted-foreground hover:text-destructive lg:mt-0",
                  FORM_CONTROL_SCROLL,
                )}
              >
                <Trash2 aria-hidden className="size-5" />
              </Button>
            </div>
          </FieldSet>
        );
      })}

      <Button
        ref={addButtonRef}
        type="button"
        variant="outline"
        onClick={addRow}
        className={cn(
          "h-11 w-full cursor-pointer border-dashed border-primary/40 font-semibold text-primary-strong duration-200 sm:w-fit",
          FORM_CONTROL_SCROLL,
        )}
      >
        <Plus aria-hidden className="size-5" />
        Agregar tipo de entrada
      </Button>

      <div className="flex items-center justify-between border-t pt-4 text-sm">
        <span className="text-muted-foreground">Capacidad total</span>
        <span className="font-semibold tabular-nums">{formatTicketCount(getTicketCapacity(rows))}</span>
      </div>
    </div>
  );
}
