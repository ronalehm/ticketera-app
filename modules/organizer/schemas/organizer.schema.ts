// Se ejecuta en el cliente: sin valores del barrel de events, solo su entrada `format` y tipos (Decisión 17).
import { z } from "zod";
import { normalizeText } from "@/lib/text";
import { CITIES, categorySlugSchema } from "@/modules/events/format";
import type { ManualVenueErrors } from "../types/organizer.types";

// Borradores de ejemplo del seed (`ORGANIZER_DRAFTS_MOCK`): los valida `buildSeedData` antes de sembrarlos.
export const organizerEventSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: categorySlugSchema,
  startsAt: z.iso.datetime({ offset: true }).nullable(), // null: borrador sin fecha/hora
  venue: z.string(),
  city: z.string(),
  imageUrl: z.url().nullable(),
  priceFrom: z.number().nonnegative().nullable(), // null: sin precios válidos
  sold: z.number().int().nonnegative(),
  capacity: z.number().int().nonnegative(),
  status: z.enum(["published", "draft"]),
});

// Query param `guardado` de Eventos (`/organizador`): "borrador" (se guardó un borrador) o
// "cambios" (se editó un evento publicado, F5b). Cualquier otro valor (o un array) se ignora.
export const savedStatusSchema = z.enum(["borrador", "cambios"]).optional().catch(undefined);

/** Límite del motivo de rechazo (`review_note`). */
export const REVIEW_NOTE_MAX_LENGTH = 1000;

/** Motivo de rechazo de un evento en revisión (F5b): obligatorio; lo ve el organizador en su borrador. */
export const reviewNoteSchema = z
  .string("Escribe el motivo del rechazo")
  .trim()
  .min(1, "Escribe el motivo del rechazo")
  .max(REVIEW_NOTE_MAX_LENGTH, `El motivo admite hasta ${REVIEW_NOTE_MAX_LENGTH} caracteres`);

/** Formulario del diálogo "Rechazar": solo el motivo. */
export const rejectEventFormSchema = z.object({ note: reviewNoteSchema });

// Valores de `<input type="date">` ("YYYY-MM-DD", fecha de calendario real) y `<input type="time">` ("HH:MM").
export const formDateSchema = z.iso.date();
export const formTimeSchema = z.iso.time({ precision: -1 });

// Edad mínima (decisión 10): mismo formato que el detalle del evento (`minAge === 0 ? "Todo público" : "+n"`).
export const MIN_AGE_LABELS = { "0": "Todo público", "12": "+12", "14": "+14", "16": "+16", "18": "+18" } as const;
type MinAgeOption = keyof typeof MIN_AGE_LABELS;
export const MIN_AGE_OPTIONS = Object.keys(MIN_AGE_LABELS) as [MinAgeOption, ...MinAgeOption[]];
const MAX_LISTED_MIN_AGE = Number(MIN_AGE_OPTIONS[MIN_AGE_OPTIONS.length - 1]);

/**
 * Edad mínima del formulario: una de la lista o, para conservar la de un evento guardado con una restricción mayor que
 * la última de la lista (p. ej. +21), una edad de dos cifras mayor que ella. Nunca se rebaja una restricción guardada.
 */
const minAgeSchema = z.union([
  z.enum(MIN_AGE_OPTIONS),
  z.string().regex(/^\d{2}$/).refine((age) => Number(age) > MAX_LISTED_MIN_AGE),
]);

// "en-CA" formatea como YYYY-MM-DD, comparable como string con el valor del input date.
const limaDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });

export function getTodayInLima(): string {
  return limaDateFormatter.format(new Date());
}

/** Límites de los textos del borrador: los usan el schema y los `maxLength` de los inputs. */
export const EVENT_DRAFT_LIMITS = {
  title: 100,
  description: 2000,
  imageUrl: 2000,
  ticketTypeName: 100,
  /** Precio máximo de un tipo de entrada, en soles. */
  maxPrice: 100_000,
} as const;

/** Límites del recinto ingresado a mano (spec organizer-manual-venue, Decisiones 1b, 2 y 3). */
export const MANUAL_VENUE_LIMITS = {
  nameMin: 2,
  name: 120,
  addressMin: 10,
  address: 200,
  zones: 10,
  zoneName: 100,
  capacity: 100_000,
} as const;

/** Precio en soles con hasta 2 decimales ("50", "49.9", "120.00"). */
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

const MESSAGES = {
  title: "Ingresa el nombre del evento",
  category: "Elige una categoría",
  titleTooLong: `El nombre admite hasta ${EVENT_DRAFT_LIMITS.title} caracteres`,
  descriptionTooLong: `La descripción admite hasta ${EVENT_DRAFT_LIMITS.description} caracteres`,
  date: "Elige una fecha válida",
  dateMissing: "Elige la fecha del evento",
  time: "Indica la hora de inicio",
  doorsOpen: "Indica una hora de apertura válida",
  doorsOpenWithoutStart: "Indica primero la fecha y la hora de inicio",
  doorsOpenAfterStart: "La apertura de puertas debe ser a la hora de inicio o antes",
  venue: "Elige un recinto de la lista",
  venueForTickets: "Elige el recinto para vender entradas",
  organizer: "Elige el organizador del evento",
  organizerInvalid: "Elige un organizador de la lista",
  imageUrl: "Ingresa una URL válida que empiece por https://",
  imageUrlTooLong: `La URL admite hasta ${EVENT_DRAFT_LIMITS.imageUrl} caracteres`,
  duplicateSection: "Cada sección del recinto solo puede tener un tipo de entrada",
  ticketTypeName: "Ingresa el nombre del tipo de entrada",
  ticketTypeNameTooLong: `El nombre admite hasta ${EVENT_DRAFT_LIMITS.ticketTypeName} caracteres`,
  price: "Ingresa el precio",
  priceInvalid: "El precio debe ser un número de 0 o más, con hasta 2 decimales",
  priceTooHigh: `El precio no puede superar S/ ${EVENT_DRAFT_LIMITS.maxPrice.toLocaleString("en-US")}`,
  venueName: "Ingresa el nombre del recinto",
  venueNameTooShort: `El nombre del recinto debe tener al menos ${MANUAL_VENUE_LIMITS.nameMin} caracteres`,
  venueNameTooLong: `El nombre del recinto admite hasta ${MANUAL_VENUE_LIMITS.name} caracteres`,
  address: "Ingresa la dirección exacta del recinto",
  addressTooShort: "La dirección es muy corta: indica calle y número, distrito. Ej.: Av. Larco 1150, Miraflores",
  addressTooLong: `La dirección admite hasta ${MANUAL_VENUE_LIMITS.address} caracteres`,
  city: "Elige una ciudad de la lista",
  zonesMissing: "Agrega al menos una zona",
  zonesTooMany: `Puedes agregar hasta ${MANUAL_VENUE_LIMITS.zones} zonas`,
  zonesDuplicate: "Cada zona necesita un nombre distinto",
  zoneName: "Ingresa el nombre de la zona",
  zoneNameTooLong: `El nombre de la zona admite hasta ${MANUAL_VENUE_LIMITS.zoneName} caracteres`,
  capacity: "Ingresa el aforo de la zona",
  capacityInvalid: `El aforo debe ser un número entero de 1 a ${MANUAL_VENUE_LIMITS.capacity.toLocaleString("en-US")}`,
} as const;

/** Portada (Decisión 5): URL absoluta con protocolo `https`. */
export const coverImageUrlSchema = z.url({ protocol: /^https$/, hostname: z.regexes.domain, error: MESSAGES.imageUrl });

/** Fila de tipo de entrada: una por sección del recinto. Solo las marcadas (`selected`) se venden y se validan. */
export const eventDraftTicketTypeSchema = z.object({
  sectionId: z.uuid("Sección no válida"),
  selected: z.boolean(),
  name: z.string().trim(),
  price: z.string().trim(),
});

/** Mensajes de una fila marcada para vender, por campo. Vacío si es válida (o si no está marcada). */
export function getTicketTypeRowErrors(row: z.input<typeof eventDraftTicketTypeSchema>): { name?: string; price?: string } {
  if (!row.selected) return {};
  const name = row.name.trim();
  const price = row.price.trim();
  const errors: { name?: string; price?: string } = {};
  if (!name) errors.name = MESSAGES.ticketTypeName;
  else if (name.length > EVENT_DRAFT_LIMITS.ticketTypeName) errors.name = MESSAGES.ticketTypeNameTooLong;
  if (!price) errors.price = MESSAGES.price;
  else if (!PRICE_PATTERN.test(price)) errors.price = MESSAGES.priceInvalid;
  else if (Number(price) > EVENT_DRAFT_LIMITS.maxPrice) errors.price = MESSAGES.priceTooHigh;
  return errors;
}

/**
 * Bloque «Mi recinto no está en la lista» (spec organizer-manual-venue, Decisión 3). Solo con `enabled` (el checkbox)
 * se valida y se guarda; desmarcado, sus valores se conservan en el formulario pero se ignoran. Cada zona lleva su `id`
 * (uuid nuevo del cliente o el de una zona ya guardada): los tipos de entrada la referencian como a una sección.
 */
export const manualVenueFormSchema = z.object({
  enabled: z.boolean(),
  name: z.string().trim(),
  address: z.string().trim(),
  city: z.string(),
  sections: z.array(z.object({ id: z.uuid("Zona no válida"), name: z.string().trim(), capacity: z.string().trim() })),
});

/** Mensajes del bloque manual por campo y por zona. Sin mensajes (`sectionRows` vacías) si es válido o no está activo. */
export function getManualVenueErrors(venue: z.input<typeof manualVenueFormSchema>): ManualVenueErrors {
  if (!venue.enabled) return { sectionRows: [] };
  const errors: ManualVenueErrors = { sectionRows: [] };
  const name = venue.name.trim();
  const address = venue.address.trim();
  if (!name) errors.name = MESSAGES.venueName;
  else if (name.length < MANUAL_VENUE_LIMITS.nameMin) errors.name = MESSAGES.venueNameTooShort;
  else if (name.length > MANUAL_VENUE_LIMITS.name) errors.name = MESSAGES.venueNameTooLong;
  if (!address) errors.address = MESSAGES.address;
  else if (address.length < MANUAL_VENUE_LIMITS.addressMin) errors.address = MESSAGES.addressTooShort;
  else if (address.length > MANUAL_VENUE_LIMITS.address) errors.address = MESSAGES.addressTooLong;
  if (!(CITIES as readonly string[]).includes(venue.city)) errors.city = MESSAGES.city;

  // Nombres repetidos sin distinguir mayúsculas ni tildes: la BD exige nombres (y slugs) únicos por recinto.
  const zoneNames = venue.sections.map((zone) => normalizeText(zone.name.trim())).filter(Boolean);
  if (venue.sections.length === 0) errors.sections = MESSAGES.zonesMissing;
  else if (venue.sections.length > MANUAL_VENUE_LIMITS.zones) errors.sections = MESSAGES.zonesTooMany;
  else if (new Set(zoneNames).size !== zoneNames.length) errors.sections = MESSAGES.zonesDuplicate;
  errors.sectionRows = venue.sections.map((zone) => {
    const rowErrors: { name?: string; capacity?: string } = {};
    const zoneName = zone.name.trim();
    const capacity = zone.capacity.trim();
    if (!zoneName) rowErrors.name = MESSAGES.zoneName;
    else if (zoneName.length > MANUAL_VENUE_LIMITS.zoneName) rowErrors.name = MESSAGES.zoneNameTooLong;
    if (!capacity) rowErrors.capacity = MESSAGES.capacity;
    else if (!/^\d+$/.test(capacity) || Number(capacity) < 1 || Number(capacity) > MANUAL_VENUE_LIMITS.capacity) {
      rowErrors.capacity = MESSAGES.capacityInvalid;
    }
    return rowErrors;
  });
  return errors;
}

const eventDraftShape = {
  title: z.string().trim().min(1, MESSAGES.title).max(EVENT_DRAFT_LIMITS.title, MESSAGES.titleTooLong),
  // Slug de `categories` (la lista viene de la BD); que exista lo comprueba el servicio (`invalid_category`).
  category: z.string().refine((slug) => categorySlugSchema.safeParse(slug).success, MESSAGES.category),
  minAge: minAgeSchema,
  description: z.string().trim().max(EVENT_DRAFT_LIMITS.description, MESSAGES.descriptionTooLong),
  date: z.string().trim(), // "YYYY-MM-DD" o ""
  time: z.string().trim(), // "HH:MM" o ""
  doorsOpen: z.string().trim(), // "HH:MM" o ""; mismo día que el evento
  venueId: z.union([z.literal(""), z.uuid(MESSAGES.venue)]),
  // Solo cuenta para admin y super_admin (lo eligen en un Select); para un organizador se ignora: el dueño es él.
  organizerId: z.string().trim(),
  imageUrl: z.string().trim().max(EVENT_DRAFT_LIMITS.imageUrl, MESSAGES.imageUrlTooLong),
  ticketTypes: z.array(eventDraftTicketTypeSchema),
  // Opcional: sin él (o desmarcado) el recinto es el del Select (`venueId`).
  manualVenue: manualVenueFormSchema.optional(),
};

/**
 * Borrador de evento (spec admin-panel, F5a): valida el formulario y la entrada de `createEventAction`/`updateEventAction`.
 * Solo el nombre y la categoría son obligatorios; el resto puede faltar, pero lo que se indique tiene que ser válido (una fecha sin hora,
 * una portada `http` o una sección marcada sin precio no se guardan). `requireOrganizer` (admin y super_admin) exige
 * elegir el organizador dueño. Con `manualVenue.enabled`, el recinto es el ingresado a mano y `venueId` se ignora. Las
 * comprobaciones de la BD (recinto aprobado o propio, secciones del recinto, organizador aprobado) las hace el servicio. La salida se convierte con `toEventDraftInput`.
 */
export function createEventDraftSchema({ requireOrganizer }: { requireOrganizer: boolean }) {
  return z.object(eventDraftShape).superRefine((data, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

    const isDateValid = data.date !== "" && formDateSchema.safeParse(data.date).success;
    const isTimeValid = data.time !== "" && formTimeSchema.safeParse(data.time).success;
    if (data.date !== "" && !isDateValid) issue(["date"], MESSAGES.date);
    if (data.date === "" && data.time !== "") issue(["date"], MESSAGES.dateMissing);
    if ((data.date !== "" || data.time !== "") && !isTimeValid) issue(["time"], MESSAGES.time);

    if (data.doorsOpen !== "") {
      // "HH:MM" se compara como string. La misma hora que el inicio es válida.
      if (!formTimeSchema.safeParse(data.doorsOpen).success) issue(["doorsOpen"], MESSAGES.doorsOpen);
      else if (!isDateValid || !isTimeValid) issue(["doorsOpen"], MESSAGES.doorsOpenWithoutStart);
      else if (data.doorsOpen > data.time) issue(["doorsOpen"], MESSAGES.doorsOpenAfterStart);
    }

    if (data.imageUrl !== "" && !coverImageUrlSchema.safeParse(data.imageUrl).success) {
      issue(["imageUrl"], MESSAGES.imageUrl);
    }

    if (requireOrganizer) {
      if (data.organizerId === "") issue(["organizerId"], MESSAGES.organizer);
      else if (!z.uuid().safeParse(data.organizerId).success) issue(["organizerId"], MESSAGES.organizerInvalid);
    }

    const manual = data.manualVenue?.enabled === true;
    if (data.manualVenue) {
      const { sectionRows, ...venueErrors } = getManualVenueErrors(data.manualVenue);
      for (const [field, message] of Object.entries(venueErrors)) issue(["manualVenue", field], message);
      sectionRows.forEach((rowErrors, index) => {
        for (const [field, message] of Object.entries(rowErrors)) issue(["manualVenue", "sections", index, field], message);
      });
    }

    const sectionIds = data.ticketTypes.map((row) => row.sectionId);
    if (new Set(sectionIds).size !== sectionIds.length) issue(["ticketTypes"], MESSAGES.duplicateSection);
    if (!manual && data.venueId === "" && data.ticketTypes.some((row) => row.selected)) {
      issue(["venueId"], MESSAGES.venueForTickets);
    }
    data.ticketTypes.forEach((row, index) => {
      for (const [field, message] of Object.entries(getTicketTypeRowErrors(row))) {
        issue(["ticketTypes", index, field], message);
      }
    });
  });
}
