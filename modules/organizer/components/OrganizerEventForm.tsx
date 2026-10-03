"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/hooks/useZodForm";
import { cn } from "@/lib/utils";
import { EVENT_CATEGORY_LABELS } from "@/modules/events/format";

import { EVENT_CATEGORY_OPTIONS, getTodayInLima, organizerEventFormSchema } from "../schemas/organizer.schema";
import { useOrganizerStore } from "../stores/organizer.store";
import type { OrganizerEventFormValues } from "../types/organizer.types";
import { createTicketTypeRow, getTicketTypeErrors, toOrganizerEvent } from "../utils/organizerEventForm";
import { FORM_CONTROL_SCROLL, TicketTypesField } from "./TicketTypesField";

type TextField = Exclude<keyof OrganizerEventFormValues, "intent" | "category" | "ticketTypes">;

const INPUT_CLASS = cn("h-11", FORM_CONTROL_SCROLL);

const INITIAL_VALUES: Omit<OrganizerEventFormValues, "ticketTypes"> = {
  intent: "publish",
  name: "",
  category: "conciertos",
  description: "",
  date: "",
  time: "",
  venue: "",
  city: "",
};

// La fecha de hoy no cambia mientras se ve el formulario: no hay nada a lo que suscribirse.
const subscribeToToday = () => () => {};

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    // overflow-clip (no overflow-hidden): recorta igual sin crear un contenedor de scroll que anule scroll-mb-28.
    <Card className="rounded-2xl overflow-clip md:[--card-spacing:--spacing(6)]">
      <CardHeader>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function OrganizerEventForm() {
  const router = useRouter();
  const addEvent = useOrganizerStore((state) => state.addEvent);
  // La primera fila usa useId: su id va en los `id` de los inputs y debe coincidir entre SSR e hidratación.
  const firstRowId = useId();
  // `min` de la fecha solo en cliente: la página se prerenderiza y "hoy" del build quedaría congelado (y no hidrataría).
  const today = useSyncExternalStore(subscribeToToday, getTodayInLima, () => undefined);
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(organizerEventFormSchema, {
    ...INITIAL_VALUES,
    ticketTypes: [{ ...createTicketTypeRow(), id: firstRowId }],
  });

  // Sin rehidratar, el primer addEvent sobrescribiría los eventos guardados en localStorage.
  useEffect(() => {
    useOrganizerStore.persist.rehydrate();
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    addEvent(toOrganizerEvent(data, `org-${crypto.randomUUID()}`));
    router.push(`/organizador?guardado=${data.intent === "publish" ? "publicado" : "borrador"}`);
  });

  // useZodForm agrupa los errores de las filas en `ticketTypes`; los mensajes por campo salen del mismo schema (Decisión 9).
  const ticketTypeErrors = errors.ticketTypes ? getTicketTypeErrors(values.ticketTypes) : null;

  // Props comunes de los campos de texto: id, valor controlado, revalidación al salir y a11y del error.
  const textProps = (name: TextField) => ({
    id: `organizer-event-${name}`,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(name, event.target.value),
    onBlur: () => handleBlur(name),
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `organizer-event-${name}-error` : undefined,
  });

  const fieldError = (name: TextField) => (
    <FieldError id={`organizer-event-${name}-error`}>{errors[name]}</FieldError>
  );

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormSection title="Información básica">
        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="organizer-event-name">Nombre del evento</FieldLabel>
            <Input {...textProps("name")} placeholder="Ej. Festival de verano 2026" maxLength={100} className={INPUT_CLASS} />
            {fieldError("name")}
          </Field>

          <Field>
            <FieldLabel htmlFor="organizer-event-category">Categoría</FieldLabel>
            <Select
              items={EVENT_CATEGORY_LABELS}
              value={values.category}
              onValueChange={(value) => {
                if (!value) return;
                setValue("category", value);
                handleBlur("category");
              }}
            >
              <SelectTrigger
                id="organizer-event-category"
                className={cn("w-full cursor-pointer data-[size=default]:h-11", FORM_CONTROL_SCROLL)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORY_OPTIONS.map((category) => (
                  <SelectItem key={category} value={category} className="min-h-11 cursor-pointer">
                    {EVENT_CATEGORY_LABELS[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="organizer-event-description">Descripción</FieldLabel>
            <Textarea
              {...textProps("description")}
              rows={4}
              maxLength={2000}
              placeholder="Cuenta de qué trata el evento, quiénes se presentan y qué incluye la entrada."
              className={FORM_CONTROL_SCROLL}
            />
            {fieldError("description")}
          </Field>
        </FieldGroup>
      </FormSection>

      <FormSection title="Fecha y lugar">
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.date}>
              <FieldLabel htmlFor="organizer-event-date">Fecha</FieldLabel>
              <Input {...textProps("date")} type="date" min={today} className={INPUT_CLASS} />
              {fieldError("date")}
            </Field>
            <Field data-invalid={!!errors.time}>
              <FieldLabel htmlFor="organizer-event-time">Hora de inicio</FieldLabel>
              <Input {...textProps("time")} type="time" className={INPUT_CLASS} />
              {fieldError("time")}
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2 md:gap-4">
            <Field data-invalid={!!errors.venue}>
              <FieldLabel htmlFor="organizer-event-venue">Lugar</FieldLabel>
              <Input {...textProps("venue")} placeholder="Ej. Estadio Nacional" maxLength={100} className={INPUT_CLASS} />
              {fieldError("venue")}
            </Field>
            <Field data-invalid={!!errors.city}>
              <FieldLabel htmlFor="organizer-event-city">Ciudad</FieldLabel>
              <Input {...textProps("city")} placeholder="Ej. Lima" maxLength={100} className={INPUT_CLASS} />
              {fieldError("city")}
            </Field>
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Tipos de entrada" description="Cada tipo tiene su precio y su cantidad disponible.">
        <TicketTypesField
          rows={values.ticketTypes}
          errors={ticketTypeErrors}
          onChange={(rows) => setValue("ticketTypes", rows)}
          onBlur={() => handleBlur("ticketTypes")}
        />
      </FormSection>

      {/* Móvil: barra pegada abajo mientras se ve el formulario, sin tapar el footer (sticky, Decisión 12). lg: estática. */}
      <div className="sticky bottom-0 z-10 -mx-4 grid grid-cols-2 gap-3 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:-mx-6 md:px-6 lg:static lg:mx-0 lg:flex lg:justify-end lg:border-t-0 lg:p-0">
        {/* Primer botón de envío: Enter en un campo guarda como borrador, la opción que no publica (Decisión 8). */}
        <Button
          type="submit"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => setValue("intent", "draft")}
          className="h-11 cursor-pointer font-semibold duration-200 md:h-12 lg:px-5"
        >
          Guardar borrador
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          onClick={() => setValue("intent", "publish")}
          className="h-11 cursor-pointer font-semibold duration-200 hover:bg-primary-strong md:h-12 lg:px-5"
        >
          Publicar <span className="max-lg:sr-only">evento</span>
        </Button>
      </div>
    </form>
  );
}
