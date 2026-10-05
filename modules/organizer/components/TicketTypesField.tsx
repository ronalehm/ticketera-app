"use client";

import { useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";

import { TICKET_DESCRIPTION_MAX_LENGTH } from "../schemas/organizer.schema";
import type { SeatingMode, TicketTypeRow, TicketTypeRowErrors } from "../types/organizer.types";
import { createTicketTypeRow, formatTicketCount, getNewRowKind, getTicketCapacity } from "../utils/organizerEventForm";
import {
  FORM_CONTROL_SCROLL,
  TicketTypeCapacityFields,
  TicketTypeInputField,
  ticketTypeInputId,
} from "./TicketTypeCapacityFields";

// Se define junto a los campos de la fila (sin import circular) y se reexporta para el resto del formulario.
export { FORM_CONTROL_SCROLL };

const ROW_GRID_CLASS = "grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]";

type TicketTypesFieldProps = {
  /** Modo de ubicación del evento: sin elegir no hay filas; "Mixto" muestra "Ubicación" en cada fila. */
  mode: SeatingMode | "";
  rows: TicketTypeRow[];
  /** Errores por fila; `null` mientras el formulario no tenga errores en los tipos de entrada. */
  errors: TicketTypeRowErrors[] | null;
  onChange: (rows: TicketTypeRow[]) => void;
  onBlur: () => void;
};

export function TicketTypesField({ mode, rows, errors, onChange, onBlur }: TicketTypesFieldProps) {
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
    const row = createTicketTypeRow(getNewRowKind(mode));
    rowToFocusRef.current = row.id;
    onChange([...rows, row]);
  }

  function removeRow(id: string) {
    addButtonRef.current?.focus();
    onChange(rows.filter((row) => row.id !== id));
  }

  // Sin modo, las filas siguen en el estado pero no se muestran: el modo decide su tipo (decisión 2).
  if (mode === "") {
    return (
      <p className="text-sm text-muted-foreground">
        Elige arriba cómo se ubica el público para configurar los tipos de entrada.
      </p>
    );
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

            <div className={ROW_GRID_CLASS}>
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

            <div className={ROW_GRID_CLASS}>
              <TicketTypeInputField
                rowId={row.id}
                field="description"
                label="Descripción (opcional)"
                value={row.description}
                description="Se muestra bajo el nombre al elegir entradas."
                error={rowErrors.description}
                onValueChange={(description) => updateRow(row.id, { description })}
                onBlur={onBlur}
                inputProps={{
                  placeholder: "Ej. Campo de pie, sin ubicación asignada.",
                  maxLength: TICKET_DESCRIPTION_MAX_LENGTH,
                }}
              />
              <TicketTypeInputField
                rowId={row.id}
                field="maxPerOrder"
                label="Máximo por compra"
                value={row.maxPerOrder}
                description={`Entradas de este tipo en una misma compra (1 a ${MAX_TICKETS_PER_ORDER}).`}
                error={rowErrors.maxPerOrder}
                onValueChange={(maxPerOrder) => updateRow(row.id, { maxPerOrder })}
                onBlur={onBlur}
                inputProps={{ type: "number", inputMode: "numeric", min: 1, max: MAX_TICKETS_PER_ORDER, step: 1 }}
              />
            </div>

            <TicketTypeCapacityFields
              row={row}
              showKind={mode === "mixed"}
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
