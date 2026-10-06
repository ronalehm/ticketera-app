import { z } from "zod";

/** Slug de categoría (`categories.slug`): kebab-case en minúsculas. La lista de categorías vive en la BD. */
export const categorySlugSchema = z
  .string()
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const eventCategorySchema = z.object({ id: z.uuid(), slug: categorySlugSchema, name: z.string().min(1) });
export const eventStatusSchema = z.enum(["available", "low-stock", "sold-out"]);
export const eventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string().min(1),
  category: categorySlugSchema,
  categoryName: z.string(),
  startsAt: z.iso.datetime({ offset: true }),
  venue: z.string(),
  city: z.string(),
  imageUrl: z.url(),
  priceFrom: z.number().nonnegative(),
  status: eventStatusSchema,
  featured: z.boolean(),
});

export const ticketTypeSchema = z.object({
  id: z.string(), // kebab-case, se usa como clave en la URL de checkout
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  status: eventStatusSchema,
});
export const eventDetailSchema = eventSchema.extend({
  description: z.string().min(1), // 2–3 párrafos separados por "\n\n"
  address: z.string(),
  doorsOpenAt: z.iso.datetime({ offset: true }),
  minAge: z.number().int().nonnegative(), // 0 = todo público
  organizer: z.string(),
  /** Último cambio de fecha u hora con ventas (`events.schedule_changed_at`); ausente si nunca cambió. */
  scheduleChangedAt: z.iso.datetime({ offset: true }).optional(),
  ticketTypes: ticketTypeSchema.array().min(1),
});
