"use client";

import type { ComponentProps } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatCount } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

import { EVENT_DRAFT_LIMITS } from "../schemas/organizer.schema";
import type { TicketTypeRow, TicketTypeRowErrors, VenueSectionOption } from "../types/organizer.types";
import { formatTicketCount, getSelectedCapacity } from "../utils/organizerEventForm";
import { FORM_CONTROL_SCROLL, FORM_INPUT_CLASS } from "./formStyles";

type RowField = keyof TicketTypeRowErrors;

/** Id de un control de la fila; el mismo esquema para sus campos (y su `-error`). */
const rowControlId = (sectionId: string, field: RowField | "selected") => `ticket-type-${sectionId}-${field}`;

type RowInputProps = {
  sectionId: string;
  field: RowField;
  label: string;
  value: string;
  error?: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
  onBlur: () => void;
  inputProps: ComponentProps<"input">;
};

/** Campo editable de una fila: etiqueta visible y error con id y su a11y (patrón del formulario). */
function RowInput({ sectionId, field, label, value, error, disabled, onValueChange, onBlur, inputProps }: RowInputProps) {
  const id = rowControlId(sectionId, field);
  return (
    <Field data-invalid={!!error} data-disabled={disabled}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...inputProps}
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={FORM_INPUT_CLASS}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

function capacityLabel({ seating, capacity }: VenueSectionOption): string {
  return seating === "general" ? `${formatCount(capacity)} lugares de pie` : `${formatCount(capacity)} asientos numerados`;
}

type TicketTypesFieldProps = {
  /** Secciones del recinto elegido, en orden; `null` mientras no haya recinto. */
  sections: VenueSectionOption[] | null;
  /** Una fila por sección (mismo orden que `sections`). */
  rows: TicketTypeRow[];
  /** Errores por fila; `null` mientras el formulario no tenga errores en los tipos de entrada. */
  errors: TicketTypeRowErrors[] | null;
  onChange: (rows: TicketTypeRow[]) => void;
  onBlur: () => void;
  /** Evento publicado: las secciones a la venta no cambian (el inventario ya se generó). */
  selectionLocked?: boolean;
};

/**
 * Tipos de entrada por sección del recinto (spec admin-panel, F5a): cada sección se vende o no ("Vender entradas en
 * esta sección") con su nombre (por defecto, el de la sección) y su precio. La capacidad la fija el recinto.
 */
export function TicketTypesField({
  sections,
  rows,
  errors,
  onChange,
  onBlur,
  selectionLocked = false,
}: TicketTypesFieldProps) {
  if (!sections) {
    return <p className="text-sm text-muted-foreground">Elige el recinto para configurar los tipos de entrada.</p>;
  }
  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground">Este recinto aún no tiene secciones configuradas.</p>;
  }

  function updateRow(sectionId: string, patch: Partial<TicketTypeRow>) {
    onChange(rows.map((row) => (row.sectionId === sectionId ? { ...row, ...patch } : row)));
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, index) => {
        const section = sections.find((candidate) => candidate.id === row.sectionId);
        if (!section) return null;
        const rowErrors = errors?.[index] ?? {};
        const headingId = `ticket-type-${row.sectionId}-heading`;
        const selectedId = rowControlId(row.sectionId, "selected");
        return (
          // Grupo con nombre (la sección): los campos de cada fila se distinguen para lectores de pantalla.
          <div
            key={row.sectionId}
            role="group"
            aria-labelledby={headingId}
            className="@container flex min-w-0 flex-col gap-4 rounded-xl p-4 ring-1 ring-border has-data-checked:ring-primary/40"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 id={headingId} className="font-semibold">
                {section.name}
              </h3>
              <p className="text-sm text-muted-foreground tabular-nums">{capacityLabel(section)}</p>
            </div>
            <Field orientation="horizontal" className="min-h-11 items-center">
              <Checkbox
                id={selectedId}
                checked={row.selected}
                disabled={selectionLocked}
                onCheckedChange={(selected) => {
                  updateRow(row.sectionId, { selected });
                  onBlur();
                }}
                className={cn("cursor-pointer", FORM_CONTROL_SCROLL)}
              />
              <FieldLabel htmlFor={selectedId} className={cn("font-normal", !selectionLocked && "cursor-pointer")}>
                Vender entradas en esta sección
              </FieldLabel>
            </Field>
            {/* Por el ancho de la fila, no del viewport: a 1024 px la columna del formulario es estrecha. */}
            <div className="grid gap-4 @md:grid-cols-[minmax(0,1fr)_160px]">
              <RowInput
                sectionId={row.sectionId}
                field="name"
                label="Nombre del tipo de entrada"
                value={row.name}
                error={rowErrors.name}
                disabled={!row.selected}
                onValueChange={(name) => updateRow(row.sectionId, { name })}
                onBlur={onBlur}
                inputProps={{ placeholder: section.name, maxLength: EVENT_DRAFT_LIMITS.ticketTypeName }}
              />
              <RowInput
                sectionId={row.sectionId}
                field="price"
                label="Precio (S/)"
                value={row.price}
                error={rowErrors.price}
                disabled={!row.selected}
                onValueChange={(price) => updateRow(row.sectionId, { price })}
                onBlur={onBlur}
                inputProps={{ type: "number", inputMode: "decimal", min: 0, step: 0.01, placeholder: "0.00" }}
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between border-t pt-4 text-sm">
        <span className="text-muted-foreground">Capacidad a la venta</span>
        <span className="font-semibold tabular-nums">{formatTicketCount(getSelectedCapacity(rows, sections))}</span>
      </div>
    </div>
  );
}
