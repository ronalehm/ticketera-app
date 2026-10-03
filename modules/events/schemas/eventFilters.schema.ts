import { z } from "zod";

import { CITIES, PRICE_RANGE_VALUES } from "../data/searchOptions";
import { eventCategorySchema } from "./events.schema";

// Cada campo inválido cae a undefined (no rompe la página).
export const eventFiltersSchema = z.object({
  q: z.string().trim().min(1).optional().catch(undefined),
  ciudad: z.enum(CITIES).optional().catch(undefined),
  fecha: z.iso.date().optional().catch(undefined),
  precio: z.enum(PRICE_RANGE_VALUES).optional().catch(undefined),
  categoria: eventCategorySchema.optional().catch(undefined),
});

export type EventFilters = z.infer<typeof eventFiltersSchema>;
