import { z } from "zod";

export const eventCategorySchema = z.enum(["conciertos", "teatro", "deportes", "festivales", "stand-up", "familia"]);
export const eventStatusSchema = z.enum(["available", "low-stock", "sold-out"]);
export const eventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string().min(1),
  category: eventCategorySchema,
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
  ticketTypes: ticketTypeSchema.array().min(1),
});
