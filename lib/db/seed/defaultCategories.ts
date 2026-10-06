/**
 * Categorías que siembra el seed (spec events-dynamic-landing, Decisión 5). La fuente de verdad es la tabla
 * `categories`: el seed solo inserta las que faltan y no pisa nombres editados. Café, Drinks y Bares llegan también
 * por la migración de datos `drizzle/0009_*.sql` (el seed no corre en Production), con los mismos ids.
 */
export const DEFAULT_EVENT_CATEGORIES = [
  { slug: "conciertos", name: "Conciertos" },
  { slug: "teatro", name: "Teatro" },
  { slug: "deportes", name: "Deportes" },
  { slug: "festivales", name: "Festivales" },
  { slug: "stand-up", name: "Stand-up" },
  { slug: "familia", name: "Familia" },
  { slug: "cafe-shop", name: "Café" },
  { slug: "drink", name: "Drinks" },
  { slug: "bar-shop", name: "Bares" },
] as const;
