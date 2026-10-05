// Se ejecuta en el cliente: sin valores del barrel de events, solo sus entradas `format` y `purchase` y tipos (Decisión 17).
import { z } from "zod";
import type { EventCategory } from "@/modules/events";
import { CITIES, EVENT_CATEGORY_LABELS } from "@/modules/events/format";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";

// Record<EventCategory, string> garantiza por tipo que estén todas las claves; el test lo compara con EVENT_CATEGORIES.
export const EVENT_CATEGORY_OPTIONS = Object.keys(EVENT_CATEGORY_LABELS) as [EventCategory, ...EventCategory[]];

export const organizerEventStatusSchema = z.enum(["published", "draft"]);

export const organizerEventSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: z.enum(EVENT_CATEGORY_OPTIONS),
  startsAt: z.iso.datetime({ offset: true }).nullable(), // null: borrador sin fecha/hora
  venue: z.string(),
  city: z.string(),
  imageUrl: z.url().nullable(), // null: evento creado (imagen no persistida)
  priceFrom: z.number().nonnegative().nullable(), // null: sin precios válidos
  sold: z.number().int().nonnegative(),
  capacity: z.number().int().nonnegative(),
  status: organizerEventStatusSchema,
});

// Query param `guardado` de /organizador: cualquier otro valor (o un array) se ignora.
export const savedStatusSchema = z.enum(["publicado", "borrador"]).optional().catch(undefined);

// Valores de `<input type="date">` ("YYYY-MM-DD", fecha de calendario real) y `<input type="time">` ("HH:MM").
export const formDateSchema = z.iso.date();
export const formTimeSchema = z.iso.time({ precision: -1 });

// Límites de una zona numerada (decisión 4): los usan el schema, las utils, los textos de ayuda y los `max` de los inputs.
export const SEAT_GRID_LIMITS = { maxRows: 30, maxSeatsPerRow: 60 } as const;

// Mismos valores que `VenueZoneLayout.kind` de seating (decisión 13).
export const ticketTypeKindSchema = z.enum(["general", "numbered"]);

// Modo de ubicación del evento: los valores de `kind` más "mixed" (sin asientos, con mapa o mixto).
export const seatingModeSchema = z.enum(["general", "numbered", "mixed"]);

export const TICKET_DESCRIPTION_MAX_LENGTH = 150;

// Reglas de la portada: las usan la validación del archivo (`getCoverImageError`) y los textos de ayuda.
export const COVER_IMAGE_RULES = { maxBytes: 5 * 1024 * 1024, minWidth: 1200, minHeight: 675 } as const;

/** Texto no vacío (con trim) que es un entero entre 1 y `max`. `abort` deja un único mensaje por campo vacío. */
function intInRange(empty: string, invalid: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, { error: empty, abort: true })
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= max, invalid);
}

const ticketTypeBase = {
  id: z.string(),
  name: z.string().trim().min(1, "Ingresa el nombre del tipo de entrada"),
  price: z
    .string()
    .trim()
    .min(1, { error: "Ingresa el precio", abort: true })
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, "El precio debe ser 0 o mayor"),
  description: z
    .string()
    .trim()
    .max(
      TICKET_DESCRIPTION_MAX_LENGTH,
      `La descripción debe tener como máximo ${TICKET_DESCRIPTION_MAX_LENGTH} caracteres`,
    ),
  // Mismo tope que la compra (MAX_TICKETS_PER_ORDER), para no contradecir lo que ve quien compra.
  maxPerOrder: intInRange(
    "Ingresa el máximo por compra",
    `El máximo por compra debe ser un número entero entre 1 y ${MAX_TICKETS_PER_ORDER}`,
    MAX_TICKETS_PER_ORDER,
  ),
};

// Reglas de una fila de tipo de entrada al publicar. Solo se validan los campos del tipo elegido (decisión 7):
// una zona general ignora `rows`/`seatsPerRow` y una numerada ignora `quantity`.
export const ticketTypeFormSchema = z.discriminatedUnion("kind", [
  z.object({
    ...ticketTypeBase,
    kind: z.literal("general"),
    quantity: z
      .string()
      .trim()
      .min(1, { error: "Ingresa la cantidad", abort: true })
      .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, "La cantidad debe ser un número entero mayor o igual a 1"),
    rows: z.string(),
    seatsPerRow: z.string(),
  }),
  z.object({
    ...ticketTypeBase,
    kind: z.literal("numbered"),
    quantity: z.string(),
    rows: intInRange(
      "Ingresa el número de filas",
      `Las filas deben ser un número entero entre 1 y ${SEAT_GRID_LIMITS.maxRows}`,
      SEAT_GRID_LIMITS.maxRows,
    ),
    seatsPerRow: intInRange(
      "Ingresa los asientos por fila",
      `Los asientos por fila deben ser un número entero entre 1 y ${SEAT_GRID_LIMITS.maxSeatsPerRow}`,
      SEAT_GRID_LIMITS.maxSeatsPerRow,
    ),
  }),
]);

// Edad mínima (decisión 10): mismo formato que el detalle del evento (`minAge === 0 ? "Todo público" : "+n"`).
export const MIN_AGE_LABELS = { "0": "Todo público", "12": "+12", "14": "+14", "16": "+16", "18": "+18" } as const;
type MinAgeOption = keyof typeof MIN_AGE_LABELS;
export const MIN_AGE_OPTIONS = Object.keys(MIN_AGE_LABELS) as [MinAgeOption, ...MinAgeOption[]];

// "en-CA" formatea como YYYY-MM-DD, comparable como string con el valor del input date.
const limaDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });

export function getTodayInLima(): string {
  return limaDateFormatter.format(new Date());
}

const REQUIRED_ON_PUBLISH = {
  description: "Agrega una descripción del evento",
  organizer: "Indica el nombre del organizador",
  venue: "Indica el lugar del evento",
  address: "Indica la dirección del lugar",
} as const;

// Un solo schema para borrador y publicación (Decisión 8): el borrador solo exige el nombre.
// El superRefine se ejecuta aunque falle el nombre (los checks de zod 4 no abortan), así que se ven todos los errores a la vez.
export const organizerEventFormSchema = z
  .object({
    intent: z.enum(["draft", "publish"]),
    name: z.string().trim().min(1, "Ingresa el nombre del evento"),
    category: z.enum(EVENT_CATEGORY_OPTIONS),
    minAge: z.enum(MIN_AGE_OPTIONS), // se valida también en borrador; desde el Select nunca falla
    description: z.string(),
    organizer: z.string(),
    date: z.string(), // "YYYY-MM-DD" o ""
    time: z.string(), // "HH:MM" o ""
    doorsOpen: z.string(), // "HH:MM" o ""; mismo día que el evento (decisión 11)
    venue: z.string(),
    city: z.string(), // "" o un valor de CITIES (Select)
    address: z.string(),
    seatingMode: z.union([z.literal(""), seatingModeSchema]), // "": aún sin elegir (sin valor por defecto)
    // La portada (File) vive fuera del estado del formulario; esto solo indica si hay una válida.
    hasCoverImage: z.boolean(),
    // Fila "cruda" del formulario: sus reglas (ticketTypeFormSchema) solo se aplican al publicar.
    ticketTypes: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          price: z.string(),
          description: z.string(),
          maxPerOrder: z.string(),
          kind: ticketTypeKindSchema,
          quantity: z.string(),
          rows: z.string(),
          seatsPerRow: z.string(),
        }),
      )
      .min(1),
  })
  .superRefine((data, ctx) => {
    if (data.intent === "draft") return;

    for (const [field, message] of Object.entries(REQUIRED_ON_PUBLISH)) {
      if (data[field as keyof typeof REQUIRED_ON_PUBLISH].trim() === "") ctx.addIssue({ code: "custom", path: [field], message });
    }

    // Solo las ciudades del filtro público, para que el evento publicado sea filtrable (decisión 6).
    if (!(CITIES as readonly string[]).includes(data.city)) {
      ctx.addIssue({ code: "custom", path: ["city"], message: "Elige la ciudad" });
    }

    if (!data.hasCoverImage) {
      ctx.addIssue({ code: "custom", path: ["hasCoverImage"], message: "Sube la imagen de portada" });
    }

    if (data.seatingMode === "") {
      ctx.addIssue({ code: "custom", path: ["seatingMode"], message: "Elige cómo se ubica el público" });
    } else if (
      data.seatingMode === "mixed" &&
      !(data.ticketTypes.some((row) => row.kind === "general") && data.ticketTypes.some((row) => row.kind === "numbered"))
    ) {
      // El error va en el selector de modo, que recibe el foco y dice cómo corregirlo (decisión 4).
      ctx.addIssue({
        code: "custom",
        path: ["seatingMode"],
        message: "Un evento mixto necesita al menos una zona general (de pie) y una numerada",
      });
    }

    if (data.date === "") {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Elige la fecha del evento" });
    } else if (!formDateSchema.safeParse(data.date).success) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Elige una fecha válida" });
    } else if (data.date < getTodayInLima()) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "La fecha no puede ser anterior a hoy" });
    }

    const isTimeValid = formTimeSchema.safeParse(data.time).success;
    if (!isTimeValid) {
      ctx.addIssue({ code: "custom", path: ["time"], message: "Indica la hora de inicio" });
    }

    // "HH:MM" se compara como string. La misma hora que el inicio es válida.
    if (!formTimeSchema.safeParse(data.doorsOpen).success) {
      ctx.addIssue({ code: "custom", path: ["doorsOpen"], message: "Indica la hora de apertura de puertas" });
    } else if (isTimeValid && data.doorsOpen > data.time) {
      ctx.addIssue({
        code: "custom",
        path: ["doorsOpen"],
        message: "La apertura de puertas debe ser a la hora de inicio o antes",
      });
    }

    data.ticketTypes.forEach((row, index) => {
      const result = ticketTypeFormSchema.safeParse(row);
      if (result.success) return;
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: "custom", path: ["ticketTypes", index, ...issue.path], message: issue.message });
      }
    });
  });
