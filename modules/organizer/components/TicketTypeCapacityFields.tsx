"use client";

import type { ComponentProps } from "react";
import { Armchair, PersonStanding } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCount } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import { SeatGridPreview } from "@/modules/seating/preview";

import { SEAT_GRID_LIMITS, ticketTypeKindSchema } from "../schemas/organizer.schema";
import type { TicketTypeKind, TicketTypeRow, TicketTypeRowErrors } from "../types/organizer.types";
import { formatSeatGridSummary, getMinTicketPrice, getSeatGridSize } from "../utils/organizerEventForm";

/** Margen de scroll de los controles: en móvil, la barra de acciones `sticky` no tapa el campo enfocado. */
export const FORM_CONTROL_SCROLL = "scroll-mt-24 scroll-mb-28 lg:scroll-mb-0";

const INPUT_CLASS = cn("h-11", FORM_CONTROL_SCROLL);

type RowField = keyof TicketTypeRowErrors;

/** Id de un control de la fila; el mismo esquema para todos sus campos (y sus `-error`/`-description`). */
export const ticketTypeInputId = (rowId: string, field: RowField | "kind" | "seat-count") =>
  `ticket-type-${rowId}-${field}`;

type TicketTypeInputFieldProps = {
  rowId: string;
  field: RowField;
  label: string;
  value: string;
  /** Ayuda bajo el input (`FieldDescription`), enlazada con `aria-describedby`. */
  description?: string;
  error?: string;
  onValueChange: (value: string) => void;
  onBlur: () => void;
  inputProps: ComponentProps<"input">;
  className?: string;
};

/** Campo editable de una fila: etiqueta visible, ayuda y error con id y su a11y (patrón del formulario). */
export function TicketTypeInputField({
  rowId,
  field,
  label,
  value,
  description,
  error,
  onValueChange,
  onBlur,
  inputProps,
  className,
}: TicketTypeInputFieldProps) {
  const id = ticketTypeInputId(rowId, field);
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...inputProps}
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={
          [description && `${id}-description`, error && `${id}-error`].filter(Boolean).join(" ") || undefined
        }
        className={INPUT_CLASS}
      />
      {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

const KIND_OPTIONS: Record<TicketTypeKind, { title: string; hint: string; icon: LucideIcon }> = {
  general: { title: "General (de pie)", hint: "Sin asiento asignado", icon: PersonStanding },
  numbered: { title: "Numerada", hint: "Filas y asientos numerados", icon: Armchair },
};

const COUNT_INPUT_PROPS = { type: "number", inputMode: "numeric", min: 1, step: 1, placeholder: "0" } as const;

type TicketTypeCapacityFieldsProps = {
  row: TicketTypeRow;
  /** Muestra el grupo "Ubicación": solo en modo "Mixto"; los demás modos fuerzan el tipo (decisión 3). */
  showKind: boolean;
  errors?: TicketTypeRowErrors;
  onChange: (patch: Partial<TicketTypeRow>) => void;
  onBlur: () => void;
};

/** "Ubicación" de un tipo de entrada y lo que depende de ella: la cantidad (general) o filas, asientos y plano (numerada). */
export function TicketTypeCapacityFields({
  row,
  showKind,
  errors = {},
  onChange,
  onBlur,
}: TicketTypeCapacityFieldsProps) {
  const kindLabelId = `${ticketTypeInputId(row.id, "kind")}-label`;
  const seatCountId = ticketTypeInputId(row.id, "seat-count");
  const size = getSeatGridSize(row);

  const inputField = (field: "quantity" | "rows" | "seatsPerRow", label: string, max?: number) => (
    <TicketTypeInputField
      rowId={row.id}
      field={field}
      label={label}
      value={row[field]}
      error={errors[field]}
      onValueChange={(value) => onChange({ [field]: value })}
      onBlur={onBlur}
      inputProps={{ ...COUNT_INPUT_PROPS, max }}
    />
  );

  return (
    <>
      {showKind && (
        <div className="flex flex-col gap-2">
          <span id={kindLabelId} className="text-sm font-medium">
            Ubicación
          </span>
          <RadioGroup
            aria-labelledby={kindLabelId}
            value={row.kind}
            onValueChange={(value: TicketTypeKind) => {
              onChange({ kind: value });
              // Tras un envío, revalida la lista: los errores pasan a ser los del tipo elegido.
              onBlur();
            }}
            className="grid grid-cols-2 gap-3"
          >
            {ticketTypeKindSchema.options.map((kind) => {
              const { title, hint, icon: Icon } = KIND_OPTIONS[kind];
              const id = `${ticketTypeInputId(row.id, "kind")}-${kind}`;
              return (
                <FieldLabel
                  key={kind}
                  htmlFor={id}
                  className="min-h-11 cursor-pointer has-data-checked:border-primary has-data-checked:bg-accent"
                >
                  <Field orientation="horizontal" className="items-start">
                    <RadioGroupItem
                      value={kind}
                      id={id}
                      // Nombre "Numerada" y la línea como descripción (no como parte del nombre).
                      aria-labelledby={`${id}-title`}
                      aria-describedby={`${id}-hint`}
                      className={cn("mt-0.5", FORM_CONTROL_SCROLL)}
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                      <FieldTitle id={`${id}-title`} className="font-semibold">
                        <Icon aria-hidden className="size-4 shrink-0" />
                        {title}
                      </FieldTitle>
                      <span id={`${id}-hint`} className="text-sm text-muted-foreground">
                        {hint}
                      </span>
                    </div>
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
        </div>
      )}

      {row.kind === "general" ? (
        <div className="md:max-w-[calc(50%-0.5rem)]">{inputField("quantity", "Cantidad")}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {inputField("rows", "Filas", SEAT_GRID_LIMITS.maxRows)}
            {inputField("seatsPerRow", "Asientos por fila", SEAT_GRID_LIMITS.maxSeatsPerRow)}
            <Field className="col-span-2 md:col-span-1">
              <FieldLabel htmlFor={seatCountId}>Cantidad</FieldLabel>
              <Input
                id={seatCountId}
                readOnly
                value={size ? formatCount(size.rows * size.seatsPerRow) : ""}
                placeholder="—"
                aria-describedby={`${seatCountId}-description`}
                className={cn(INPUT_CLASS, "bg-muted tabular-nums")}
              />
              <FieldDescription id={`${seatCountId}-description`}>Filas × asientos por fila</FieldDescription>
            </Field>
          </div>

          {size ? (
            <figure className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted p-3 md:p-4">
              <SeatGridPreview rows={size.rows} seatsPerRow={size.seatsPerRow} />
              <figcaption className="text-sm text-muted-foreground">
                {/* Mismo criterio de precio que la vista previa del evento: número finito ≥ 0 o `null`. */}
                {formatSeatGridSummary(size, getMinTicketPrice([row]))}
              </figcaption>
            </figure>
          ) : (
            <p className="text-sm text-muted-foreground">
              Indica las filas (1 a {SEAT_GRID_LIMITS.maxRows}) y los asientos por fila (1 a{" "}
              {SEAT_GRID_LIMITS.maxSeatsPerRow}) para ver el plano.
            </p>
          )}
        </>
      )}
    </>
  );
}
