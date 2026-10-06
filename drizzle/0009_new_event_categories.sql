-- Migración de datos (spec events-dynamic-landing, Decisión 3): categorías Café, Drinks y Bares.
-- Ids = seedUuid("category:<slug>") de lib/db/seed/buildSeedData.ts, los mismos que siembra el seed.
-- Idempotente: no toca una categoría que ya exista con ese slug.
INSERT INTO "categories" ("id", "slug", "name") VALUES
  ('6d25931b-cdf8-839c-8cbc-59f2c33f2d87', 'cafe-shop', 'Café'),
  ('acd70930-8ff9-8098-95ee-82c047b40aec', 'drink', 'Drinks'),
  ('e0f5105f-eb6e-85a0-943e-5f5ccfbfa63a', 'bar-shop', 'Bares')
ON CONFLICT ("slug") DO NOTHING;
