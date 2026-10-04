"use client";

import { useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { cn } from "@/lib/utils";

import type { TicketTypeRow, TicketTypeRowErrors } from "../types/organizer.types";
import { createTicketTypeRow, formatTicketCount, getTicketCapacity } from "../utils/organizerEventForm";
import {
  FORM_CONTROL_SCROLL,
  TicketTypeCapacityFields,
  TicketTypeInputField,
  ticketTypeInputId,
} from "./TicketTypeCapacityFields";

// Se define junto a los campos de la fila (sin import circular) y se reexporta para el resto del formulario.
export { FORM_CONTROL_SCROLL };

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
    document.getElementById(ticketTypeInputId(rowToFocusRef.current, "name"))?.focus();
    rowToFocusRef.current = null;
  }, [rows]);

  function updateRow(id: string, patch: Partial<TicketTypeRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
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
      {rows.map((row, index) => {
        const number = index + 1;
        const rowErrors = errors?.[index] ?? {};
        return (
          // `min-w-0`: un <fieldset> tiene `min-inline-size: min-content` y se ensancharía hasta el plano.
          <FieldSet key={row.id} className="relative min-w-0 gap-4 rounded-xl p-4 ring-1 ring-border">
            {/* Absoluto: un <legend> en flujo se dibuja sobre el borde del fieldset e ignora su padding. */}
            <FieldLegend variant="label" className="absolute top-4 left-4 mb-0 flex h-11 items-center font-semibold">
              Tipo {number}
            </FieldLegend>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Quitar tipo de entrada ${number}`}
              disabled={rows.length === 1}
              onClick={() => removeRow(row.id)}
              className={cn(
                "size-11 cursor-pointer self-end text-muted-foreground hover:text-destructive",
                FORM_CONTROL_SCROLL,
              )}
            >
              <Trash2 aria-hidden className="size-5" />
            </Button>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
              <TicketTypeInputField
                rowId={row.id}
                field="name"
                label="Nombre"
                value={row.name}
                error={rowErrors.name}
                onValueChange={(name) => updateRow(row.id, { name })}
                onBlur={onBlur}
                inputProps={{ placeholder: "Ej. General", maxLength: 100 }}
              />
              <TicketTypeInputField
                rowId={row.id}
                field="price"
                label="Precio (S/)"
                value={row.price}
                error={rowErrors.price}
                onValueChange={(price) => updateRow(row.id, { price })}
                onBlur={onBlur}
                inputProps={{ type: "number", inputMode: "decimal", min: 0, step: 0.01, placeholder: "0" }}
              />
            </div>

            <TicketTypeCapacityFields
              row={row}
              errors={rowErrors}
              onChange={(patch) => updateRow(row.id, patch)}
              onBlur={onBlur}
            />
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
