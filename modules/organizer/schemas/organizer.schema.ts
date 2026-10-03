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
