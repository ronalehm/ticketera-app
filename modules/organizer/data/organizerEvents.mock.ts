import type { z } from "zod";
import type { organizerEventSchema } from "../schemas/organizer.schema";

// Datos de ejemplo del panel: los consume organizer.service.ts, que los une con los eventos y los valida.

/** Ventas de los eventos publicados del organizador; el resto de datos sale del evento con el mismo `slug`. */
export const ORGANIZER_SALES_MOCK: { slug: string; sold: number; capacity: number }[] = [
  { slug: "noche-de-sintetizadores-lima", sold: 7420, capacity: 8000 },
  { slug: "la-casa-de-los-espejos", sold: 312, capacity: 420 },
  { slug: "el-circo-de-las-estrellas", sold: 414, capacity: 1200 },
];

/** Borradores del organizador: no existen en el listado público de eventos. */
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
