import { formatCount } from "@/lib/formatNumber";
import {
  formDateSchema,
  formTimeSchema,
  getTicketTypeRowErrors,
  MIN_AGE_LABELS,
  MIN_AGE_OPTIONS,
} from "../schemas/organizer.schema";
import type {
  EditableEvent,
  EventDraftFormValues,
  EventFormLock,
  EventDraftInput,
  EventDraftValues,
  ManualVenueFormValues,
  ManualVenueInput,
  TicketTypeRow,
  OrganizerOption,
  TicketTypeRowErrors,
  VenueOption,
  VenueSectionOption,
} from "../types/organizer.types";

// Perú no tiene horario de verano: el offset de America/Lima es siempre -05:00.
const LIMA_OFFSET = "-05:00";
const LIMA_OFFSET_MS = -5 * 3_600_000;

/** Formulario vacío de Crear evento: el nombre y la categoría son obligatorios para guardar el borrador. */
export const EMPTY_EVENT_DRAFT: EventDraftFormValues = {
  title: "",
  category: "",
  minAge: "0",
  description: "",
  date: "",
  time: "",
  doorsOpen: "",
  venueId: "",
  organizerId: "",
  imageUrl: "",
  ticketTypes: [],
};

/** "2026-12-05" + "20:00" → "2026-12-05T20:00:00-05:00"; `null` si falta o no es válida la fecha o la hora. */
export function buildStartsAt(date: string, time: string): string | null {
  if (!formDateSchema.safeParse(date).success || !formTimeSchema.safeParse(time).success) return null;
  return `${date}T${time}:00${LIMA_OFFSET}`;
}

/** Fecha ("YYYY-MM-DD") y hora ("HH:MM") en Lima de un instante ISO. */
function toLimaDateTime(iso: string): { date: string; time: string } {
  const local = new Date(Date.parse(iso) + LIMA_OFFSET_MS).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/** Precio en soles del formulario ("49.90") → céntimos (4990). Solo para precios ya validados. */
export function toCents(price: string): number {
  return Math.round(Number(price) * 100);
}

/** Céntimos → precio del formulario: 4990 → "49.90". */
export function formatPriceInput(priceCents: number): string {
  return (priceCents / 100).toFixed(2);
}

/**
 * Una fila por sección del recinto, en su orden. Las que ya tienen tipo de entrada (`existing`, al editar) quedan
 * marcadas con su nombre y precio; el resto, sin marcar, con el nombre de la sección como nombre por defecto.
 */
export function createTicketTypeRows(
  sections: VenueSectionOption[],
  existing: EditableEvent["ticketTypes"] = [],
): TicketTypeRow[] {
  return sections.map((section) => {
    const ticketType = existing.find((candidate) => candidate.sectionId === section.id);
    return ticketType
      ? { sectionId: section.id, selected: true, name: ticketType.name, price: formatPriceInput(ticketType.priceCents) }
      : { sectionId: section.id, selected: false, name: section.name, price: "" };
  });
}

/**
 * Filas para otras secciones (las zonas del recinto manual al cambiar, o al alternar el checkbox): conserva las de las
 * secciones que siguen; una sin marcar toma el nombre actual de su sección (sin marcar no se edita); las nuevas, sin
 * marcar, como en `createTicketTypeRows`.
 */
export function syncTicketTypeRows(sections: VenueSectionOption[], rows: TicketTypeRow[]): TicketTypeRow[] {
  return sections.map((section) => {
    const row = rows.find((candidate) => candidate.sectionId === section.id);
    if (!row) return { sectionId: section.id, selected: false, name: section.name, price: "" };
    return row.selected ? row : { ...row, name: section.name };
  });
}

/** Zona nueva del recinto manual, con su uuid del cliente: los tipos de entrada la referencian antes de guardar. */
export function createManualZone(): ManualVenueFormValues["sections"][number] {
  return { id: crypto.randomUUID(), name: "", capacity: "" };
}

/** Bloque manual al marcar el checkbox por primera vez: vacío y con una zona (mínimo 1). */
export function createManualVenue(): ManualVenueFormValues {
  return { enabled: true, name: "", address: "", city: "", sections: [createManualZone()] };
}

/** Zonas del recinto manual como secciones generales de `TicketTypesField`: sin nombre, «Zona n»; aforo no válido, 0. */
export function toManualVenueSections(zones: ManualVenueFormValues["sections"]): VenueSectionOption[] {
  return zones.map((zone, index) => {
    const capacity = zone.capacity.trim();
    return {
      id: zone.id,
      name: zone.name.trim() || `Zona ${index + 1}`,
      seating: "general",
      capacity: /^\d+$/.test(capacity) ? Number(capacity) : 0,
    };
  });
}

/** Bloque manual relleno con un recinto pendiente (al editar su evento): sus zonas conservan sus ids. */
function toManualVenueValues(venue: VenueOption): ManualVenueFormValues {
  return {
    enabled: true,
    name: venue.name,
    address: venue.address,
    city: venue.city,
    sections: venue.sections.map(({ id, name, capacity }) => ({ id, name, capacity: String(capacity) })),
  };
}

/**
 * Edad mínima del formulario para la guardada: la menor de la lista que no rebaje la restricción o, si es mayor que
 * todas (p. ej. 21), la misma.
 */
function toMinAgeOption(minAge: number): EventDraftFormValues["minAge"] {
  return MIN_AGE_OPTIONS.find((age) => Number(age) >= minAge) ?? String(minAge);
}

/** Opciones del Select de edad: las de la lista y, si el borrador conserva una mayor que todas, también esa ("+21"). */
export function getMinAgeLabels(minAge: string): Record<string, string> {
  return Object.hasOwn(MIN_AGE_LABELS, minAge) ? MIN_AGE_LABELS : { ...MIN_AGE_LABELS, [minAge]: `+${minAge}` };
}

/**
 * Valores del formulario de Editar a partir del evento guardado y los recintos de la lista. Con `organizers` (admin y
 * super_admin), si el dueño ya no está entre los aprobados, el organizador queda vacío para que se elija otro. Un recinto
 * aún pendiente (ingresado a mano, spec organizer-manual-venue) abre el bloque manual relleno para poder corregirlo.
 */
export function toEventDraftFormValues(
  event: EditableEvent,
  venues: VenueOption[],
  organizers?: OrganizerOption[],
): EventDraftFormValues {
  const start = event.startsAt ? toLimaDateTime(event.startsAt) : null;
  const venue = venues.find((candidate) => candidate.id === event.venueId);
  const organizerApproved = !organizers || organizers.some((organizer) => organizer.id === event.organizerId);
  return {
    title: event.title,
    category: event.category,
    minAge: toMinAgeOption(event.minAge),
    description: event.description ?? "",
    date: start?.date ?? "",
    time: start?.time ?? "",
    doorsOpen: event.doorsOpenAt ? toLimaDateTime(event.doorsOpenAt).time : "",
    venueId: event.venueId ?? "",
    organizerId: organizerApproved ? event.organizerId : "",
    imageUrl: event.imageUrl ?? "",
    // Un recinto que ya no está aprobado no tiene filas: al guardar, el servicio lo rechaza (nada se pierde en silencio).
    ticketTypes: venue ? createTicketTypeRows(venue.sections, event.ticketTypes) : [],
    ...(venue?.status === "pending_review" && { manualVenue: toManualVenueValues(venue) }),
  };
}

/** Recinto del borrador: el ingresado a mano si su checkbox está marcado; si no, el del Select (o `null`). */
function toVenueInput(values: EventDraftValues): EventDraftInput["venue"] {
  const manual = values.manualVenue;
  if (manual?.enabled) {
    return {
      kind: "manual",
      name: manual.name,
      address: manual.address,
      city: manual.city as ManualVenueInput["city"], // validada por el schema (`getManualVenueErrors`)
      sections: manual.sections.map((zone) => ({ id: zone.id, name: zone.name, capacity: Number(zone.capacity) })),
    };
  }
  return values.venueId ? { kind: "existing", id: values.venueId } : null;
}

/**
 * Borrador listo para el servicio: vacíos → `null`, fechas en Lima, precios en céntimos y solo las filas marcadas, con
 * su posición como orden. `requireOrganizer` (admin, super_admin): el organizador elegido; si no, `null` (el servicio
 * usa al propio organizador).
 */
export function toEventDraftInput(values: EventDraftValues, { requireOrganizer }: { requireOrganizer: boolean }): EventDraftInput {
  const startsAt = buildStartsAt(values.date, values.time);
  const doorsOpenAt = startsAt && values.doorsOpen ? buildStartsAt(values.date, values.doorsOpen) : null;
  return {
    title: values.title,
    category: values.category,
    description: values.description || null,
    startsAt: startsAt ? new Date(startsAt) : null,
    doorsOpenAt: doorsOpenAt ? new Date(doorsOpenAt) : null,
    minAge: Number(values.minAge),
    venue: toVenueInput(values),
    imageUrl: values.imageUrl || null,
    organizerId: requireOrganizer ? values.organizerId || null : null,
    ticketTypes: values.ticketTypes
      .filter((row) => row.selected)
      .map((row, sortOrder) => ({ sectionId: row.sectionId, name: row.name, priceCents: toCents(row.price), sortOrder })),
  };
}

/**
 * Qué bloquea el formulario de Editar (spec event-editing, Decisión 1): nada en un borrador ni en revisión; en un evento
 * publicado, con o sin ventas, la estructura (mismas reglas que `updateEvent`, que es quien las garantiza). Un evento
 * cancelado o finalizado no llega al formulario.
 */
export function getEventFormLock(event?: Pick<EditableEvent, "status">): EventFormLock | null {
  return event?.status === "published" ? "structure" : null;
}

type Schedule = Pick<EventDraftFormValues, "date" | "time" | "doorsOpen">;

/** ¿Cambia la fecha, la hora de inicio o la apertura de puertas respecto de las guardadas? */
export function hasScheduleChanged(saved: Schedule, values: Schedule): boolean {
  return saved.date !== values.date || saved.time !== values.time || saved.doorsOpen !== values.doorsOpen;
}

/** Primer mensaje por campo de cada fila (solo las marcadas para vender), con las mismas reglas que el schema. */
export function getTicketTypeErrors(rows: TicketTypeRow[]): TicketTypeRowErrors[] {
  return rows.map(getTicketTypeRowErrors);
}

/** Menor precio válido de las filas marcadas, en soles; `null` si ninguna tiene uno válido. */
export function getMinTicketPrice(rows: TicketTypeRow[]): number | null {
  const prices = rows.flatMap((row) =>
    row.selected && !getTicketTypeRowErrors(row).price ? [Number(row.price)] : [],
  );
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** Capacidad de las secciones marcadas para vender. */
export function getSelectedCapacity(rows: TicketTypeRow[], sections: VenueSectionOption[]): number {
  return rows.reduce((total, row) => {
    if (!row.selected) return total;
    return total + (sections.find((section) => section.id === row.sectionId)?.capacity ?? 0);
  }, 0);
}

/** 1 → "1 entrada"; 1500 → "1,500 entradas". */
export function formatTicketCount(n: number): string {
  return n === 1 ? "1 entrada" : `${formatCount(n)} entradas`;
}
