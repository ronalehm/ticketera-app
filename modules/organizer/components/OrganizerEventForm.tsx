"use client";

import { useState, useSyncExternalStore } from "react";
import type { ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DatePicker } from "@/components/shared/DatePicker";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/hooks/useZodForm";
import { cn } from "@/lib/utils";
import type { EventCategory } from "@/modules/events";

import { useSaveEventDraft } from "../hooks/useEventDrafts";
import { createEventDraftSchema, EVENT_DRAFT_LIMITS, getTodayInLima } from "../schemas/organizer.schema";
import type {
  EditableEvent,
  EventDraftFormValues,
  EventDraftValues,
  OrganizerOption,
  TicketTypeRow,
  VenueOption,
} from "../types/organizer.types";
import { EVENT_DRAFT_GENERIC_ERROR } from "../utils/eventDraftError";
import { buildEventPreview } from "../utils/eventPreview";
import {
  createTicketTypeRows,
  EMPTY_EVENT_DRAFT,
  formatTicketCount,
  getEventFormLock,
  getMinAgeLabels,
  getTicketTypeErrors,
  hasScheduleChanged,
  toEventDraftFormValues,
} from "../utils/organizerEventForm";
import { CoverImageField } from "./CoverImageField";
import { EventPreviewCard } from "./EventPreviewCard";
import { FORM_CONTROL_SCROLL, FORM_INPUT_CLASS, FORM_SELECT_TRIGGER_CLASS } from "./formStyles";
import { TicketTypesField } from "./TicketTypesField";

type TextField = "title" | "description" | "date" | "time" | "doorsOpen";
type SelectField = "category" | "minAge" | "venueId" | "organizerId";

const PREVIEW_TITLE_ID = "organizer-event-preview-title";
/**
 * Tras guardar, Eventos muestra "Borrador guardado" o, si se editó un evento publicado, "Cambios guardados". Uno en
 * revisión sigue en revisión: vuelve a Eventos sin aviso (ninguno de los dos lo describe).
 */
const SAVED_HREF = "/organizador?guardado=borrador";
const SAVED_CHANGES_HREF = "/organizador?guardado=cambios";
const SAVED_IN_REVIEW_HREF = "/organizador";

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

type OrganizerEventFormProps = {
  /** Id del usuario de la sesión: separa la caché del listado de Eventos de cada usuario. */
  userId: string;
  /** Categorías de la BD (`listEventCategories`). */
  categories: EventCategory[];
  /** Recintos aprobados con sus secciones (`listApprovedVenuesWithSections`). */
  venues: VenueOption[];
  /** Organizadores aprobados (`listApprovedOrganizers`): solo para admin y super_admin, que eligen el dueño. */
  organizers?: OrganizerOption[];
  /** Evento que se edita (`getEventForEdit`); sin él, se crea un borrador nuevo. */
  event?: EditableEvent;
};

/**
 * Crear o editar un evento (spec admin-panel, F5a y F5b): se guarda en la BD (`createEventAction`/`updateEventAction`) y
 * vuelve a Eventos (`/organizador`). En un borrador solo el nombre y la categoría son obligatorios; en un evento publicado
 * se bloquea la estructura (`getEventFormLock`, spec event-editing, Decisión 1) y, si tiene entradas vendidas, cambiar la
 * fecha u hora pide confirmación (Decisión 3). Enviar a revisión se hace desde Eventos.
 */
export function OrganizerEventForm({ userId, categories, venues, organizers, event }: OrganizerEventFormProps) {
  const router = useRouter();
  const requireOrganizer = organizers !== undefined;
  const [schema] = useState(() => createEventDraftSchema({ requireOrganizer }));
  const [initialValues] = useState(() => (event ? toEventDraftFormValues(event, venues, organizers) : EMPTY_EVENT_DRAFT));
  // `min` de la fecha solo en cliente: la página se renderiza en el servidor y "hoy" del servidor no hidrataría igual.
  const today = useSyncExternalStore(subscribeToToday, getTodayInLima, () => undefined);
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(schema, initialValues);
  const save = useSaveEventDraft(userId);
  const [serverError, setServerError] = useState<string | null>(null);
  // Guardado: el botón sigue deshabilitado hasta que llega Eventos (un segundo clic crearía otro borrador).
  const [saved, setSaved] = useState(false);
  // Portada subiéndose: guardar ahora enviaría la portada anterior.
  const [uploading, setUploading] = useState(false);
  // Valores validados a la espera de confirmar el cambio de fecha (Decisión 3); `null` con el diálogo cerrado.
  const [pendingSchedule, setPendingSchedule] = useState<EventDraftValues | null>(null);
  const structureLocked = getEventFormLock(event) !== null;
  const published = event?.status === "published";
  const isDraft = !event || event.status === "draft";
  const sold = event?.sold ?? 0;

  const venue = venues.find((candidate) => candidate.id === values.venueId);
  const categoryName = categories.find((category) => category.slug === values.category)?.name;
  const minAgeLabels = getMinAgeLabels(values.minAge);

  // El error del servidor (también `incomplete` o `price_locked_pending`) se muestra en el formulario.
  async function saveValues(data: EventDraftValues) {
    setServerError(null);
    try {
      const result = await save.mutateAsync({ eventId: event?.id, values: data });
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setSaved(true);
      router.push(published ? SAVED_CHANGES_HREF : isDraft ? SAVED_HREF : SAVED_IN_REVIEW_HREF);
    } catch {
      setServerError(EVENT_DRAFT_GENERIC_ERROR);
    }
  }

  const onSubmit = handleSubmit(async (data) => {
    if (published && sold > 0 && hasScheduleChanged(initialValues, data)) {
      setPendingSchedule(data);
      return;
    }
    await saveValues(data);
  });

  async function confirmSchedule() {
    if (pendingSchedule) await saveValues(pendingSchedule);
    setPendingSchedule(null);
    return null;
  }

  // useZodForm agrupa los errores de las filas en `ticketTypes`; los mensajes por campo salen de las mismas reglas.
  const ticketTypeErrors = errors.ticketTypes ? getTicketTypeErrors(values.ticketTypes) : null;

  // Selects y DatePicker: el valor llega ya elegido, así que se revalida en el momento (no hay blur).
  function selectValue<K extends SelectField | "date">(name: K, value: EventDraftFormValues[K] | null) {
    if (value === null) return;
    setValue(name, value);
    handleBlur(name);
  }

  // Otro recinto, otras secciones: las filas empiezan de cero (sin marcar, con el nombre de cada sección).
  function selectVenue(venueId: string | null) {
    if (venueId === null) return;
    const sections = venues.find((candidate) => candidate.id === venueId)?.sections ?? [];
    setValue("venueId", venueId);
    setValue("ticketTypes", createTicketTypeRows(sections));
    handleBlur("venueId");
    handleBlur("ticketTypes");
  }

  function changeTicketTypes(rows: TicketTypeRow[]) {
    setValue("ticketTypes", rows);
  }

  function revalidateTicketTypes() {
    handleBlur("ticketTypes");
    handleBlur("venueId");
  }

  // id y a11y de la ayuda y del error, comunes a todos los controles.
  const fieldProps = (name: TextField | SelectField) => ({
    id: `organizer-event-${name}`,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `organizer-event-${name}-error` : undefined,
  });

  // Campos de texto: además, valor controlado y revalidación al salir.
  const textProps = (name: TextField) => ({
    ...fieldProps(name),
    value: values[name],
    onChange: (changeEvent: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(name, changeEvent.target.value),
    onBlur: () => handleBlur(name),
  });

  const selectTriggerProps = (name: SelectField) => ({ ...fieldProps(name), className: FORM_SELECT_TRIGGER_CLASS });

  const fieldError = (name: TextField | SelectField) => (
    <FieldError id={`organizer-event-${name}-error`}>{errors[name]}</FieldError>
  );

  return (
    // lg: secciones y acciones a la izquierda, vista previa fija a la derecha. Móvil: secciones → vista previa → acciones.
    <form noValidate onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <FormSection title="Información básica">
          <FieldGroup>
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="organizer-event-title">Nombre del evento</FieldLabel>
              <Input
                {...textProps("title")}
                placeholder="Ej. Festival de verano 2026"
                maxLength={EVENT_DRAFT_LIMITS.title}
                className={FORM_INPUT_CLASS}
              />
              {fieldError("title")}
            </Field>

            {/* Por el ancho de la sección: a 1024 px (con sidebar y vista previa) mide ~260 px y van apiladas. */}
            <div className="grid gap-4 @md/field-group:grid-cols-2">
              <Field data-invalid={!!errors.category}>
                <FieldLabel htmlFor="organizer-event-category">Categoría</FieldLabel>
                <Select
                  items={categories.map(({ slug, name }) => ({ value: slug, label: name }))}
                  value={values.category}
                  onValueChange={(value) => selectValue("category", value)}
                >
                  <SelectTrigger {...selectTriggerProps("category")}>
                    <SelectValue placeholder="Elige una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(({ slug, name }) => (
                      <SelectItem key={slug} value={slug} className="min-h-11 cursor-pointer">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError("category")}
              </Field>

              {/* Siempre es una opción válida del Select (la lista o la mayor que conserva el borrador): sin mensaje de error. */}
              <Field>
                <FieldLabel htmlFor="organizer-event-minAge">Edad mínima</FieldLabel>
                <Select items={minAgeLabels} value={values.minAge} onValueChange={(value) => selectValue("minAge", value)}>
                  <SelectTrigger {...selectTriggerProps("minAge")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(minAgeLabels).map(([age, label]) => (
                      <SelectItem key={age} value={age} className="min-h-11 cursor-pointer">
                        {label}
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
                maxLength={EVENT_DRAFT_LIMITS.description}
                placeholder="Cuenta de qué trata el evento, quiénes se presentan y qué incluye la entrada."
                className={FORM_CONTROL_SCROLL}
              />
              {fieldError("description")}
            </Field>

            {organizers && (
              <Field data-invalid={!!errors.organizerId}>
                <FieldLabel htmlFor="organizer-event-organizerId">Organizador</FieldLabel>
                <Select
                  items={organizers.map(({ id, name }) => ({ value: id, label: name }))}
                  disabled={structureLocked}
                  value={values.organizerId}
                  onValueChange={(value) => selectValue("organizerId", value)}
                >
                  <SelectTrigger {...selectTriggerProps("organizerId")}>
                    <SelectValue placeholder="Elige el organizador" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizers.map(({ id, name }) => (
                      <SelectItem key={id} value={id} className="min-h-11 cursor-pointer">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>Dueño del evento: solo organizadores aprobados.</FieldDescription>
                {fieldError("organizerId")}
              </Field>
            )}
          </FieldGroup>
        </FormSection>

        <FormSection title="Fecha y recinto">
          <FieldGroup>
            {/*
              Por el ancho de la sección (no del viewport: en lg la columna del formulario mide ~260 px a 1024 px): bajo
              32rem, Fecha a todo el ancho (el DatePicker necesita ~140 px para «sáb 5 dic 2026») y Hora | Apertura
              debajo; desde 32rem, las tres en una fila.
            */}
            <div className="grid grid-cols-2 gap-4 @lg/field-group:grid-cols-3">
              <Field data-invalid={!!errors.date} className="col-span-2 @lg/field-group:col-span-1">
                <FieldLabel id="organizer-event-date-label" htmlFor="organizer-event-date">
                  Fecha
                </FieldLabel>
                <DatePicker
                  {...fieldProps("date")}
                  aria-labelledby="organizer-event-date-label"
                  value={values.date}
                  onChange={(value) => selectValue("date", value)}
                  min={today}
                  className={FORM_CONTROL_SCROLL}
                />
                {fieldError("date")}
              </Field>
              <Field data-invalid={!!errors.time}>
                <FieldLabel htmlFor="organizer-event-time">Hora de inicio</FieldLabel>
                <Input {...textProps("time")} type="time" className={FORM_INPUT_CLASS} />
                {fieldError("time")}
              </Field>
              <Field data-invalid={!!errors.doorsOpen}>
                <FieldLabel htmlFor="organizer-event-doorsOpen">Apertura de puertas</FieldLabel>
                <Input {...textProps("doorsOpen")} type="time" className={FORM_INPUT_CLASS} />
                {fieldError("doorsOpen")}
              </Field>
            </div>

            <Field data-invalid={!!errors.venueId}>
              <FieldLabel htmlFor="organizer-event-venueId">Recinto</FieldLabel>
              <Select
                items={venues.map(({ id, name, city }) => ({ value: id, label: `${name} · ${city}` }))}
                disabled={structureLocked}
                value={values.venueId}
                onValueChange={selectVenue}
              >
                <SelectTrigger {...selectTriggerProps("venueId")}>
                  <SelectValue placeholder="Elige el recinto" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map(({ id, name, city }) => (
                    <SelectItem key={id} value={id} className="min-h-11 cursor-pointer">
                      {name} · {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Solo recintos aprobados. Sus secciones definen los tipos de entrada.</FieldDescription>
              {fieldError("venueId")}
            </Field>
          </FieldGroup>
        </FormSection>

        <FormSection title="Imagen de portada">
          <CoverImageField
            id="organizer-event-imageUrl"
            eventId={event?.id ?? null}
            value={values.imageUrl}
            onChange={(url) => setValue("imageUrl", url)}
            onBlur={() => handleBlur("imageUrl")}
            error={errors.imageUrl}
            onUploadingChange={setUploading}
          />
        </FormSection>

        <FormSection
          title="Tipos de entrada"
          description="Elige qué secciones del recinto se venden, con qué nombre y a qué precio."
        >
          <TicketTypesField
            sections={venue ? venue.sections : null}
            rows={values.ticketTypes}
            errors={ticketTypeErrors}
            onChange={changeTicketTypes}
            onBlur={revalidateTicketTypes}
            selectionLocked={structureLocked}
          />
        </FormSection>
      </div>

      <aside
        aria-labelledby={PREVIEW_TITLE_ID}
        className="flex flex-col gap-3 self-start lg:sticky lg:top-10 lg:col-start-2 lg:row-span-3 lg:row-start-1"
      >
        <h2 id={PREVIEW_TITLE_ID} className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Vista previa
        </h2>
        <EventPreviewCard {...buildEventPreview(values, venue, categoryName)} />
        <p className="text-sm text-muted-foreground">Así verán tu evento los compradores en el listado.</p>
      </aside>

      {serverError && (
        <Alert variant="destructive" className="lg:col-start-1">
          <CircleAlert aria-hidden />
          <AlertTitle>{serverError}</AlertTitle>
        </Alert>
      )}

      {/* Móvil: barra pegada abajo mientras se ve el formulario, sin tapar el footer (sticky). lg: estática. */}
      <div className="sticky bottom-0 z-10 -mx-4 grid grid-cols-2 gap-3 border-t bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:-mx-6 md:px-6 lg:static lg:col-start-1 lg:mx-0 lg:flex lg:justify-end lg:border-t-0 lg:p-0">
        <Link
          href="/organizador"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 cursor-pointer font-semibold duration-200 md:h-12 lg:px-5",
            FORM_CONTROL_SCROLL,
          )}
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting || saved || uploading}
          className={cn(
            "h-11 cursor-pointer font-semibold duration-200 hover:bg-primary-strong md:h-12 lg:px-5",
            FORM_CONTROL_SCROLL,
          )}
        >
          {isSubmitting && <Spinner aria-hidden className="motion-reduce:animate-none" />}
          {isSubmitting ? "Guardando…" : isDraft ? "Guardar borrador" : "Guardar cambios"}
        </Button>
      </div>

      <ConfirmDialog
        open={pendingSchedule !== null}
        onOpenChange={(open) => !open && setPendingSchedule(null)}
        title="¿Cambiar la fecha del evento?"
        description={`Este evento tiene ${formatTicketCount(sold)} ${sold === 1 ? "vendida" : "vendidas"}. Los compradores verán la nueva fecha.`}
        confirmLabel="Cambiar fecha"
        pendingLabel="Guardando…"
        onConfirm={confirmSchedule}
        genericError={EVENT_DRAFT_GENERIC_ERROR}
      />
    </form>
  );
}
