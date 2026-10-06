import { z } from "zod";

import { CITIES, PRICE_RANGE_VALUES, SORT_VALUES } from "../data/searchOptions";
import { categorySlugSchema } from "./events.schema";

export const citySchema = z.enum(CITIES);

// string | string[] → valores válidos sin duplicados, en orden de llegada; si no queda ninguno → undefined.
function multiValue<T extends z.ZodType>(item: T) {
  return z
    .unknown()
    .transform((input) => {
      const values = (Array.isArray(input) ? input : [input]).flatMap((value) => {
        const result = item.safeParse(value);
        return result.success ? [result.data] : [];
      });
      const unique = [...new Set(values)];
      return unique.length > 0 ? unique : undefined;
    })
    .optional();
}

// Cada campo inválido cae a undefined (no rompe la página).
export const eventFiltersSchema = z.object({
  q: z.string().trim().min(1).optional().catch(undefined),
  // Slug bien formado aunque no exista en la BD (→ 0 resultados); uno mal formado se descarta.
  categoria: multiValue(categorySlugSchema),
  ciudad: multiValue(citySchema),
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
  fecha: z.iso.date().optional().catch(undefined),
  precio: z.enum(PRICE_RANGE_VALUES).optional().catch(undefined),
  orden: z.enum(SORT_VALUES).optional().catch(undefined),
});

export type EventFilters = z.infer<typeof eventFiltersSchema>;
export type City = z.infer<typeof citySchema>;
