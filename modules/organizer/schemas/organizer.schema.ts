// Se ejecuta en el cliente: sin valores del barrel de events, solo su entrada `format` y tipos (Decisión 17).
import { z } from "zod";
import type { EventCategory } from "@/modules/events";
import { EVENT_CATEGORY_LABELS } from "@/modules/events/format";

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

// Reglas de una fila de tipo de entrada al publicar. `abort` deja un único mensaje por campo vacío.
export const ticketTypeFormSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Ingresa el nombre del tipo de entrada"),
  price: z
    .string()
    .trim()
    .min(1, { error: "Ingresa el precio", abort: true })
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, "El precio debe ser 0 o mayor"),
  quantity: z
    .string()
    .trim()
    .min(1, { error: "Ingresa la cantidad", abort: true })
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, "La cantidad debe ser un número entero mayor o igual a 1"),
});

// "en-CA" formatea como YYYY-MM-DD, comparable como string con el valor del input date.
const limaDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });

export function getTodayInLima(): string {
  return limaDateFormatter.format(new Date());
}

const REQUIRED_ON_PUBLISH = {
  description: "Agrega una descripción del evento",
  venue: "Indica el lugar del evento",
  city: "Indica la ciudad",
} as const;

// Un solo schema para borrador y publicación (Decisión 8): el borrador solo exige el nombre.
// El superRefine se ejecuta aunque falle el nombre (los checks de zod 4 no abortan), así que se ven todos los errores a la vez.
export const organizerEventFormSchema = z
  .object({
    intent: z.enum(["draft", "publish"]),
    name: z.string().trim().min(1, "Ingresa el nombre del evento"),
    category: z.enum(EVENT_CATEGORY_OPTIONS),
    description: z.string(),
    date: z.string(), // "YYYY-MM-DD" o ""
    time: z.string(), // "HH:MM" o ""
    venue: z.string(),
    city: z.string(),
    ticketTypes: z.array(z.object({ id: z.string(), name: z.string(), price: z.string(), quantity: z.string() })).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.intent === "draft") return;

    for (const [field, message] of Object.entries(REQUIRED_ON_PUBLISH)) {
      if (data[field as keyof typeof REQUIRED_ON_PUBLISH].trim() === "") ctx.addIssue({ code: "custom", path: [field], message });
    }

    if (data.date === "") {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Elige la fecha del evento" });
    } else if (!formDateSchema.safeParse(data.date).success) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Elige una fecha válida" });
    } else if (data.date < getTodayInLima()) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "La fecha no puede ser anterior a hoy" });
    }

    if (!formTimeSchema.safeParse(data.time).success) {
      ctx.addIssue({ code: "custom", path: ["time"], message: "Indica la hora de inicio" });
    }

    data.ticketTypes.forEach((row, index) => {
      const result = ticketTypeFormSchema.safeParse(row);
      if (result.success) return;
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: "custom", path: ["ticketTypes", index, ...issue.path], message: issue.message });
      }
    });
  });
