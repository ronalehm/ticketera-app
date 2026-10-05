"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/hooks/useZodForm";
import { cn } from "@/lib/utils";
import { CITIES, EVENT_CATEGORY_LABELS } from "@/modules/events/format";

import {
  EVENT_CATEGORY_OPTIONS,
  getTodayInLima,
  MIN_AGE_LABELS,
  MIN_AGE_OPTIONS,
  organizerEventFormSchema,
} from "../schemas/organizer.schema";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { useOrganizerStore } from "../stores/organizer.store";
import type { OrganizerEventFormValues, SeatingMode, TicketTypeRow } from "../types/organizer.types";
import { buildEventPreview } from "../utils/eventPreview";
import {
  applySeatingMode,
  createTicketTypeRow,
  getCoverImageError,
  getTicketTypeErrors,
  toOrganizerEvent,
} from "../utils/organizerEventForm";
import { CoverImageField } from "./CoverImageField";
import { EventPreviewCard } from "./EventPreviewCard";
import { SeatingModeField } from "./SeatingModeField";
import { FORM_CONTROL_SCROLL, TicketTypesField } from "./TicketTypesField";

type TextField = Exclude<
  keyof OrganizerEventFormValues,
  "intent" | "category" | "minAge" | "city" | "seatingMode" | "hasCoverImage" | "ticketTypes"
>;

const INPUT_CLASS = cn("h-11", FORM_CONTROL_SCROLL);

const PREVIEW_TITLE_ID = "organizer-event-preview-title";
const ORGANIZER_DESCRIPTION_ID = "organizer-event-organizer-description";
const SELECT_TRIGGER_CLASS = cn("w-full cursor-pointer data-[size=default]:h-11", FORM_CONTROL_SCROLL);
// La etiqueta de cada ciudad es su propio nombre: la misma lista que el filtro público (decisión 6).
const CITY_ITEMS = CITIES.map((city) => ({ label: city, value: city }));

const INITIAL_VALUES: Omit<OrganizerEventFormValues, "ticketTypes"> = {
  intent: "publish",
  name: "",
  category: "conciertos",
  minAge: "0",
  description: "",
  organizer: "",
  date: "",
  time: "",
  doorsOpen: "",
  venue: "",
  city: "",
  address: "",
  seatingMode: "",
  hasCoverImage: false,
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
  // La portada solo vive en este formulario: una URL local compartida con la vista previa, nunca va al store (Decisión 7).
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverError, setCoverError] = useState<string>();
  // Último archivo elegido: si se elige otro mientras se valida el anterior, solo cuenta el último.
  const pendingCoverRef = useRef<File | null>(null);
  const coverUrl = useObjectUrl(coverFile);

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

  // Un archivo no válido muestra el error y conserva la imagen anterior.
  async function selectCover(file: File) {
    pendingCoverRef.current = file;
    const error = await getCoverImageError(file);
    if (pendingCoverRef.current !== file) return;
    setCoverError(error ?? undefined);
    if (error) return;
    setCoverFile(file);
    setValue("hasCoverImage", true);
    handleBlur("hasCoverImage");
  }

  function removeCover() {
    pendingCoverRef.current = null;
    setCoverError(undefined);
    setCoverFile(null);
    setValue("hasCoverImage", false);
    handleBlur("hasCoverImage");
  }

  // Las filas toman el tipo del modo elegido; el modo y la lista se revalidan juntos (regla de "Mixto").
  function selectSeatingMode(mode: SeatingMode) {
    setValue("seatingMode", mode);
    setValue("ticketTypes", applySeatingMode(values.ticketTypes, mode));
    revalidateTicketTypes();
  }

  function changeTicketTypes(rows: TicketTypeRow[]) {
    setValue("ticketTypes", rows);
    revalidateTicketTypes();
  }

  function revalidateTicketTypes() {
    handleBlur("ticketTypes");
    handleBlur("seatingMode");
  }

  // Props comunes de los campos de texto: id, valor controlado, revalidación al salir y a11y de la ayuda y del error.
  const textProps = (name: TextField, descriptionId?: string) => ({
    id: `organizer-event-${name}`,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(name, event.target.value),
    onBlur: () => handleBlur(name),
    "aria-invalid": !!errors[name],
    "aria-describedby":
      [descriptionId, errors[name] && `organizer-event-${name}-error`].filter(Boolean).join(" ") || undefined,
  });

  const fieldError = (name: TextField | "city") => (
    <FieldError id={`organizer-event-${name}-error`}>{errors[name]}</FieldError>
  );

  return (
    // lg: secciones y acciones a la izquierda, vista previa fija a la derecha. Móvil: secciones → vista previa → acciones.
    <form noValidate onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <FormSection title="Información básica">
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="organizer-event-name">Nombre del evento</FieldLabel>
              <Input {...textProps("name")} placeholder="Ej. Festival de verano 2026" maxLength={100} className={INPUT_CLASS} />
              {fieldError("name")}
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
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
                  <SelectTrigger id="organizer-event-category" className={SELECT_TRIGGER_CLASS}>
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

              {/* Siempre es una opción válida del Select: no necesita mensaje de error (requisito 8). */}
              <Field>
                <FieldLabel htmlFor="organizer-event-minAge">Edad mínima</FieldLabel>
                <Select
                  items={MIN_AGE_LABELS}
                  value={values.minAge}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValue("minAge", value);
                    handleBlur("minAge");
                  }}
                >
                  <SelectTrigger id="organizer-event-minAge" className={SELECT_TRIGGER_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MIN_AGE_OPTIONS.map((age) => (
                      <SelectItem key={age} value={age} className="min-h-11 cursor-pointer">
                        {MIN_AGE_LABELS[age]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

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

            <Field data-invalid={!!errors.organizer}>
              <FieldLabel htmlFor="organizer-event-organizer">Organizador</FieldLabel>
              <Input
                {...textProps("organizer", ORGANIZER_DESCRIPTION_ID)}
                placeholder="Ej. Pulso Producciones"
                maxLength={100}
                className={INPUT_CLASS}
              />
              <FieldDescription id={ORGANIZER_DESCRIPTION_ID}>
                Aparece en la página del evento como «Organiza: …».
              </FieldDescription>
              {fieldError("organizer")}
            </Field>
          </FieldGroup>
        </FormSection>

        <FormSection title="Fecha y lugar">
          <FieldGroup>
            {/* Móvil: Fecha | Hora de inicio y, en la segunda línea, Apertura de puertas en la primera columna. */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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
              <Field data-invalid={!!errors.doorsOpen}>
                <FieldLabel htmlFor="organizer-event-doorsOpen">Apertura de puertas</FieldLabel>
                <Input {...textProps("doorsOpen")} type="time" className={INPUT_CLASS} />
                {fieldError("doorsOpen")}
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
                <Select
                  items={CITY_ITEMS}
                  value={values.city}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValue("city", value);
                    handleBlur("city");
                  }}
                >
                  <SelectTrigger
                    id="organizer-event-city"
                    aria-invalid={!!errors.city}
                    aria-describedby={errors.city ? "organizer-event-city-error" : undefined}
                    className={SELECT_TRIGGER_CLASS}
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
                {fieldError("city")}
              </Field>
            </div>

            <Field data-invalid={!!errors.address}>
              <FieldLabel htmlFor="organizer-event-address">Dirección</FieldLabel>
              <Input
                {...textProps("address")}
                placeholder="Ej. Av. José Díaz s/n, Cercado de Lima"
                maxLength={150}
                className={INPUT_CLASS}
              />
              {fieldError("address")}
            </Field>
          </FieldGroup>
        </FormSection>

        <FormSection title="Imagen de portada">
          {/* El error del archivo tiene prioridad sobre el de portada obligatoria. */}
          <CoverImageField
            previewUrl={coverUrl}
            error={coverError ?? errors.hasCoverImage}
            onSelect={selectCover}
            onRemove={removeCover}
          />
        </FormSection>

        <FormSection
          title="Mapa de asientos"
          description="Define si quien compra elegirá su asiento en un plano. De esto depende cómo configuras los tipos de entrada."
        >
          <SeatingModeField value={values.seatingMode} error={errors.seatingMode} onChange={selectSeatingMode} />
        </FormSection>

        <FormSection
          title="Tipos de entrada"
          description="Cada tipo de entrada es una zona con su precio y su capacidad."
        >
          <TicketTypesField
            mode={values.seatingMode}
            rows={values.ticketTypes}
            errors={ticketTypeErrors}
            onChange={changeTicketTypes}
            onBlur={revalidateTicketTypes}
          />
        </FormSection>
      </div>

      <aside
        aria-labelledby={PREVIEW_TITLE_ID}
        className="flex flex-col gap-3 self-start lg:sticky lg:top-10 lg:col-start-2 lg:row-span-2 lg:row-start-1"
      >
        <h2 id={PREVIEW_TITLE_ID} className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Vista previa
        </h2>
        <EventPreviewCard {...buildEventPreview(values, coverUrl)} />
        <p className="text-sm text-muted-foreground">Así verán tu evento los compradores en el listado.</p>
      </aside>

      {/* Móvil: barra pegada abajo mientras se ve el formulario, sin tapar el footer (sticky, Decisión 12). lg: estática. */}
      <div className="sticky bottom-0 z-10 -mx-4 grid grid-cols-2 gap-3 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:-mx-6 md:px-6 lg:static lg:col-start-1 lg:mx-0 lg:flex lg:justify-end lg:border-t-0 lg:p-0">
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
