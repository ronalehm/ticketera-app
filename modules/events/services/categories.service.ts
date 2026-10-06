import { cache } from "react";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema/events";
import { eventCategorySchema } from "../schemas/events.schema";
import type { EventCategory } from "../types/events.types";

type Queryable = Pick<typeof db, "select">;

// El collation de Neon no ordena como el español (pondría «Ópera» tras la «Z»): se reordena en JS.
const byName = new Intl.Collator("es");

/** Categorías de la BD (fuente de verdad), por nombre en orden alfabético español. Memoizada por petición. */
export const listEventCategories = cache(async (database: Queryable = db): Promise<EventCategory[]> => {
  const rows = await database
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(categories.name);
  return eventCategorySchema
    .array()
    .parse(rows)
    .sort((a, b) => byName.compare(a.name, b.name));
});
