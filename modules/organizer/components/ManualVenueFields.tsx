"use client";

import type { ComponentProps, ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CITIES } from "@/modules/events/format";

import { MANUAL_VENUE_LIMITS } from "../schemas/organizer.schema";
import type { ManualVenueErrors, ManualVenueFormValues } from "../types/organizer.types";
import { createManualZone } from "../utils/organizerEventForm";
import { FORM_CONTROL_SCROLL, FORM_INPUT_CLASS, FORM_SELECT_TRIGGER_CLASS } from "./formStyles";

const ID_PREFIX = "organizer-event-manualVenue";
const ADDRESS_HELP_ID = `${ID_PREFIX}-address-help`;
const SECTIONS_ERROR_ID = `${ID_PREFIX}-sections-error`;

type TextInputProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  /** Ids extra de `aria-describedby` (la ayuda), antes del error. */
  describedBy?: string;
  onValueChange: (value: string) => void;
  onBlur: () => void;
  inputProps?: ComponentProps<"input">;
  children?: ReactNode;
};

/** Campo de texto con etiqueta visible, ayuda opcional y error con id y su a11y (patrón del formulario). */
function TextInput({ id, label, value, error, describedBy, onValueChange, onBlur, inputProps, children }: TextInputProps) {
  const describedByIds = [describedBy, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...inputProps}
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={describedByIds}
        className={FORM_INPUT_CLASS}
      />
      {children}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

type ManualVenueFieldsProps = {
  value: ManualVenueFormValues;
  /** Mensajes por campo (`getManualVenueErrors`); `null` mientras el formulario no tenga errores en el bloque. */
  errors: ManualVenueErrors | null;
  onChange: (value: ManualVenueFormValues) => void;
  onBlur: () => void;
};

/**
 * Recinto que no está en la lista (spec organizer-manual-venue, Decisiones 1b, 2 y 3): nombre, dirección exacta, ciudad
 * y zonas generales (mínimo 1, máximo 10) con nombre y aforo. Se guarda `pending_review` y se aprueba con el evento.
 */
export function ManualVenueFields({ value, errors, onChange, onBlur }: ManualVenueFieldsProps) {
  const zones = value.sections;
  const set = (patch: Partial<ManualVenueFormValues>) => onChange({ ...value, ...patch });
  const setZone = (id: string, patch: Partial<(typeof zones)[number]>) =>
    set({ sections: zones.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)) });

  return (
    <FieldSet className="rounded-xl p-4 ring-1 ring-border">
      <FieldLegend>Datos del recinto</FieldLegend>
      <FieldDescription className="-mt-3">
        Queda en revisión: el administrador lo aprueba junto con el evento.
      </FieldDescription>

      <TextInput
        id={`${ID_PREFIX}-name`}
        label="Nombre del recinto"
        value={value.name}
        error={errors?.name}
        onValueChange={(name) => set({ name })}
        onBlur={onBlur}
        inputProps={{ placeholder: "Ej.: Café La Esquina", maxLength: MANUAL_VENUE_LIMITS.name }}
      />

      <TextInput
        id={`${ID_PREFIX}-address`}
        label="Dirección exacta"
        value={value.address}
        error={errors?.address}
        describedBy={ADDRESS_HELP_ID}
        onValueChange={(address) => set({ address })}
        onBlur={onBlur}
        inputProps={{ maxLength: MANUAL_VENUE_LIMITS.address, autoComplete: "street-address" }}
      >
        <FieldDescription id={ADDRESS_HELP_ID}>Calle y número, distrito. Ej.: Av. Larco 1150, Miraflores</FieldDescription>
      </TextInput>

      <Field data-invalid={!!errors?.city}>
        <FieldLabel htmlFor={`${ID_PREFIX}-city`}>Ciudad</FieldLabel>
        <Select
          items={CITIES.map((city) => ({ value: city, label: city }))}
          value={value.city || null}
          onValueChange={(city) => {
            if (city === null) return;
            set({ city });
            onBlur();
          }}
        >
          <SelectTrigger
            id={`${ID_PREFIX}-city`}
            aria-invalid={!!errors?.city}
            aria-describedby={errors?.city ? `${ID_PREFIX}-city-error` : undefined}
            className={FORM_SELECT_TRIGGER_CLASS}
          >
            <SelectValue placeholder="Elige la ciudad" />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((city) => (
              <SelectItem key={city} value={city} className="min-h-11 cursor-pointer">
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id={`${ID_PREFIX}-city-error`}>{errors?.city}</FieldError>
      </Field>

      <FieldSet aria-describedby={errors?.sections ? SECTIONS_ERROR_ID : undefined} className="gap-3">
        <FieldLegend variant="label">Zonas</FieldLegend>
        <FieldDescription className="-mt-2">
          Sin asientos numerados: cada zona con su aforo. Los tipos de entrada se definen sobre ellas.
        </FieldDescription>
        {zones.map((zone, index) => {
          const zoneLabel = `Zona ${index + 1}`;
          const rowErrors = errors?.sectionRows[index] ?? {};
          return (
            // Grupo con nombre: los campos de cada zona se distinguen para lectores de pantalla.
            <div
              key={zone.id}
              role="group"
              aria-label={zoneLabel}
              className="@container grid gap-3 rounded-lg bg-muted/50 p-3"
            >
              <div className="grid gap-3 @md:grid-cols-[minmax(0,1fr)_140px_auto] @md:items-start">
                <TextInput
                  id={`${ID_PREFIX}-zone-${zone.id}-name`}
                  label="Nombre de la zona"
                  value={zone.name}
                  error={rowErrors.name}
                  onValueChange={(name) => setZone(zone.id, { name })}
                  onBlur={onBlur}
                  inputProps={{ placeholder: "Ej.: General", maxLength: MANUAL_VENUE_LIMITS.zoneName }}
                />
                <TextInput
                  id={`${ID_PREFIX}-zone-${zone.id}-capacity`}
                  label="Aforo"
                  value={zone.capacity}
                  error={rowErrors.capacity}
                  onValueChange={(capacity) => setZone(zone.id, { capacity })}
                  onBlur={onBlur}
                  inputProps={{
                    type: "number",
                    inputMode: "numeric",
                    min: 1,
                    max: MANUAL_VENUE_LIMITS.capacity,
                    step: 1,
                    placeholder: "Ej.: 200",
                  }}
                />
                {/* Alineado con los inputs (bajo la etiqueta) cuando van en fila. */}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={zones.length <= 1}
                  aria-label={`Quitar ${zoneLabel.toLowerCase()}`}
                  onClick={() => {
                    set({ sections: zones.filter((candidate) => candidate.id !== zone.id) });
                    onBlur();
                  }}
                  className={cn("size-11 cursor-pointer justify-self-end @md:mt-7", FORM_CONTROL_SCROLL)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </div>
          );
        })}
        <FieldError id={SECTIONS_ERROR_ID}>{errors?.sections}</FieldError>
        <Button
          type="button"
          variant="outline"
          disabled={zones.length >= MANUAL_VENUE_LIMITS.zones}
          onClick={() => set({ sections: [...zones, createManualZone()] })}
          className={cn("h-11 cursor-pointer self-start font-semibold duration-200", FORM_CONTROL_SCROLL)}
        >
          <Plus aria-hidden />
          Agregar zona
        </Button>
        {zones.length >= MANUAL_VENUE_LIMITS.zones && (
          <FieldDescription>Máximo {MANUAL_VENUE_LIMITS.zones} zonas.</FieldDescription>
        )}
      </FieldSet>
    </FieldSet>
  );
}
