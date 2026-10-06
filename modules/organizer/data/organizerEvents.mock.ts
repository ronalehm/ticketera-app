import type { z } from "zod";
import type { organizerEventSchema } from "../schemas/organizer.schema";

// Solo lo lee el seed (`lib/db/seed/buildSeedData.ts`), que lo siembra como evento `draft`. El panel lee los eventos y
// sus ventas de la BD (`listManagedEvents`, spec admin-panel F3).

/** Borradores de ejemplo: no existen en el listado público de eventos. */
export const ORGANIZER_DRAFTS_MOCK: z.input<typeof organizerEventSchema>[] = [
  {
    id: "org-draft-001",
    title: "Feria Familiar de Verano",
    category: "familia",
    startsAt: "2026-12-01T11:00:00-05:00",
    venue: "Parque Selva Alegre",
    city: "Arequipa",
    imageUrl: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1600&q=80",
    priceFrom: 40,
    sold: 0,
    capacity: 1500,
    status: "draft",
  },
];
