"use client";

import { Armchair, Layers, PersonStanding } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Field, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

import { seatingModeSchema } from "../schemas/organizer.schema";
import type { SeatingMode } from "../types/organizer.types";
import { FORM_CONTROL_SCROLL } from "./TicketTypesField";

const FIELD_ID = "organizer-event-seatingMode";
const LABEL_ID = `${FIELD_ID}-label`;
const ERROR_ID = `${FIELD_ID}-error`;

// Cada opción explica qué verá quien compra, para que se lea antes de elegir (decisión 5).
const MODE_OPTIONS: Record<SeatingMode, { title: string; hint: string; icon: LucideIcon }> = {
  general: {
    title: "Sin asientos numerados",
    hint: "Todas las zonas son generales (de pie). Quien compra elige cuántas entradas quiere.",
    icon: PersonStanding,
  },
  numbered: {
    title: "Con mapa de asientos",
    hint: "Todas las zonas tienen filas y asientos. Quien compra elige su asiento en el plano.",
    icon: Armchair,
  },
  mixed: {
    title: "Mixto",
    hint: "Zonas de pie y zonas numeradas, como campo y tribunas. Quien compra elige asiento solo en las numeradas.",
    icon: Layers,
  },
};

type SeatingModeFieldProps = {
  /** `""` mientras no se elige: sin valor por defecto (decisión 2). */
  value: SeatingMode | "";
  error?: string;
  onChange: (mode: SeatingMode) => void;
};

/** "¿Cómo se ubica el público?": tres tarjetas de elección con el patrón de "Ubicación". */
export function SeatingModeField({ value, error, onChange }: SeatingModeFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <span id={LABEL_ID} className="text-sm font-medium">
        ¿Cómo se ubica el público?
      </span>
      <RadioGroup
        aria-labelledby={LABEL_ID}
        aria-invalid={!!error}
        aria-describedby={error ? ERROR_ID : undefined}
        // Enfocable por código: useZodForm enfoca el grupo si es el primer campo inválido.
        tabIndex={-1}
        value={value}
        onValueChange={onChange}
        className={cn(
          "grid gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:grid-cols-3",
          FORM_CONTROL_SCROLL,
        )}
      >
        {seatingModeSchema.options.map((mode) => {
          const { title, hint, icon: Icon } = MODE_OPTIONS[mode];
          const id = `${FIELD_ID}-${mode}`;
          return (
            <FieldLabel
              key={mode}
              htmlFor={id}
              className="min-h-11 cursor-pointer has-data-checked:border-primary has-data-checked:bg-accent"
            >
              <Field orientation="horizontal" className="items-start">
                <RadioGroupItem
                  value={mode}
                  id={id}
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
      <FieldError id={ERROR_ID}>{error}</FieldError>
    </div>
  );
}
