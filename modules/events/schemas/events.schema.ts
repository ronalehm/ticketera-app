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
