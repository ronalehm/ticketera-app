// Se ejecuta en el cliente: sin valores del barrel de events, solo su entrada `format` y tipos (Decisión 17).
import { z } from "zod";
import type { EventCategory } from "@/modules/events";
import { EVENT_CATEGORY_LABELS } from "@/modules/events/format";

// Record<EventCategory, string> garantiza por tipo que estén todas las claves; el test lo compara con EVENT_CATEGORIES.
export const EVENT_CATEGORY_OPTIONS = Object.keys(EVENT_CATEGORY_LABELS) as [EventCategory, ...EventCategory[]];

// Borradores de ejemplo del seed (`ORGANIZER_DRAFTS_MOCK`): los valida `buildSeedData` antes de sembrarlos.
export const organizerEventSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: z.enum(EVENT_CATEGORY_OPTIONS),
  startsAt: z.iso.datetime({ offset: true }).nullable(), // null: borrador sin fecha/hora
  venue: z.string(),
  city: z.string(),
  imageUrl: z.url().nullable(),
  priceFrom: z.number().nonnegative().nullable(), // null: sin precios válidos
  sold: z.number().int().nonnegative(),
  capacity: z.number().int().nonnegative(),
  status: z.enum(["published", "draft"]),
});

// Query param `guardado` de Mis eventos (F5a: solo se guardan borradores). Cualquier otro valor (o un array) se ignora.
export const savedStatusSchema = z.enum(["borrador"]).optional().catch(undefined);

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

/** Precio en soles con hasta 2 decimales ("50", "49.9", "120.00"). */
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

const MESSAGES = {
  title: "Ingresa el nombre del evento",
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

const eventDraftShape = {
  title: z.string().trim().min(1, MESSAGES.title).max(EVENT_DRAFT_LIMITS.title, MESSAGES.titleTooLong),
  category: z.enum(EVENT_CATEGORY_OPTIONS),
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
};

/**
 * Borrador de evento (spec admin-panel, F5a): valida el formulario y la entrada de `createEventAction`/`updateEventAction`.
 * Solo el nombre es obligatorio; el resto puede faltar, pero lo que se indique tiene que ser válido (una fecha sin hora,
 * una portada `http` o una sección marcada sin precio no se guardan). `requireOrganizer` (admin y super_admin) exige
 * elegir el organizador dueño. Las comprobaciones de la BD (recinto aprobado, secciones del recinto, organizador
 * aprobado) las hace el servicio. La salida se convierte con `toEventDraftInput`.
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

    const sectionIds = data.ticketTypes.map((row) => row.sectionId);
    if (new Set(sectionIds).size !== sectionIds.length) issue(["ticketTypes"], MESSAGES.duplicateSection);
    if (data.venueId === "" && data.ticketTypes.some((row) => row.selected)) issue(["venueId"], MESSAGES.venueForTickets);
    data.ticketTypes.forEach((row, index) => {
      for (const [field, message] of Object.entries(getTicketTypeRowErrors(row))) {
        issue(["ticketTypes", index, field], message);
      }
    });
  });
}
