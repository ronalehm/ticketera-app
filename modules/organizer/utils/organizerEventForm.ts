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
  TicketTypeRow,
  OrganizerOption,
  TicketTypeRowErrors,
  VenueOption,
  VenueSectionOption,
} from "../types/organizer.types";

// Perú no tiene horario de verano: el offset de America/Lima es siempre -05:00.
const LIMA_OFFSET = "-05:00";
const LIMA_OFFSET_MS = -5 * 3_600_000;

/** Formulario vacío de Crear evento: solo el nombre es obligatorio para guardar el borrador. */
export const EMPTY_EVENT_DRAFT: EventDraftFormValues = {
  title: "",
  category: "conciertos",
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
 * Valores del formulario de Editar a partir del evento guardado y los recintos aprobados. Con `organizers` (admin y
 * super_admin), si el dueño ya no está entre los aprobados, el organizador queda vacío para que se elija otro.
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
  };
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
    venueId: values.venueId || null,
    imageUrl: values.imageUrl || null,
    organizerId: requireOrganizer ? values.organizerId || null : null,
    ticketTypes: values.ticketTypes
      .filter((row) => row.selected)
      .map((row, sortOrder) => ({ sectionId: row.sectionId, name: row.name, priceCents: toCents(row.price), sortOrder })),
  };
}

/**
 * Qué bloquea el formulario de Editar: nada en un borrador; en un evento publicado, la estructura o, con ventas, todo
 * salvo título, descripción, portada y edad (mismas reglas que `updateEvent`, que es quien las garantiza). Un evento en
 * revisión, cancelado o finalizado no llega al formulario.
 */
export function getEventFormLock(event?: Pick<EditableEvent, "status" | "hasSales">): EventFormLock | null {
  if (event?.status !== "published") return null;
  return event.hasSales ? "sales" : "structure";
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
