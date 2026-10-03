# Fundación de datos (F1): Drizzle + Postgres, esquema completo, seed y lectura de eventos desde la BD

- Módulo: data (transversal: `lib/db`, `events`, `seating`)
- Estado: aprobado

## Objetivo
Hoy la app lee todo de mocks en memoria. F1 (`docs/architecture/system-design.md` §13) deja lista la base de datos para las fases siguientes: conexión a PostgreSQL (Neon en local) con Drizzle y `pg`, variables de entorno validadas, el **esquema completo de las 25 tablas** de `docs/architecture/erd.md` con sus migraciones versionadas, un seed idempotente que vuelca los mocks actuales (eventos, recintos con geometría, organizadores y el `super_admin`) y los services de `events` y `seating` leyendo de la BD **sin cambiar sus firmas ni la UI**. Para quien desarrolla: a partir de F1 los datos viven en Postgres y F2–F8 solo añaden lógica sobre ese esquema.

## Alcance
- Incluye:
  - **Fase 1 (conexión y esquema):** dependencias, `lib/env.ts`, `.env.example`, `lib/db/client.ts`, `drizzle.config.ts`, esquema Drizzle de las 25 tablas en `lib/db/schema/*.ts` (enums nativos, CHECKs, índices únicos parciales, GIN trigram, sequence `order_code_seq`), migraciones SQL en `drizzle/` (una personalizada para las extensiones `pg_trgm` y `unaccent`), scripts `db:generate` y `db:migrate`, y la columna `ticket_types.sort_order` documentada en `erd.md` (Decisión 6).
  - **Fase 2 (seed y tests de integración):** `npm run db:seed` idempotente desde los mocks (categorías, usuarios y organizadores, recintos con geometría, secciones, asientos, eventos, `ticket_types`, órdenes de demostración y `event_seats` de los eventos publicados, `super_admin`), util de disponibilidad, infraestructura de tests de integración contra Postgres real (`DATABASE_URL_TEST`) y tests de seed y restricciones.
  - **Fase 3 (lectura desde la BD):** `getEvents`, `getFeaturedEvents`, `getEventBySlug`, `getRelatedEvents` y `getVenueMapBySlug` consultan la BD con la misma firma y el mismo resultado; adaptación de los tests existentes que llaman a esos services.
- No incluye:
  - Clerk, `ensureUser`, roles en la UI, `proxy.ts` (F2). Los usuarios del seed tienen `clerk_id NULL` y nadie puede iniciar sesión con ellos.
  - Stripe, reservas (`reserveSeats`), escritura de órdenes o `tickets`, checkout real (F3). El checkout simulado y `useOrdersStore` siguen igual.
  - Búsqueda `pg_trgm` en la UI, caché del catálogo (`revalidateTag`), `React.cache` para deduplicar consultas (F3). Solo se crean la columna `search_text`, su índice GIN y las extensiones.
  - Migrar `modules/organizer` (sigue leyendo `organizerEvents.mock.ts` + `getEvents()`), `modules/auth`, `modules/tickets` o `modules/checkout` a la BD.
  - Convertir `hasVenueMap` en consulta a la BD (Decisión 9).
  - Cloud SQL, GCP, usuario `migrator` en producción, CI (F8). Dos roles de BD (`app`/`migrator`) en Neon: opcional en local.
  - Cualquier cambio en `app/`, `components/`, los barrels `modules/*/index.ts` o la UI.
  - `relations()` de Drizzle y la Relational Query API: las consultas usan el query builder con `join` (YAGNI).
  - Singleton del `Pool` en `globalThis` para el HMR de `next dev` (Decisión 4).

## Decisiones tomadas
1. **Dependencias mínimas.** Producción: `drizzle-orm`, `pg`, `server-only`. Desarrollo: `drizzle-kit`, `@types/pg`, `tsx`. Instalar las versiones estables más recientes y seguir la documentación de **esa** versión de Drizzle (orm.drizzle.team): la API de `drizzle()` y la carpeta de migraciones cambiaron entre 0.x y 1.x.
   - `pg` es el único driver (system-design §2), también contra Neon por TCP. `pg` ya está en la lista `serverExternalPackages` por defecto de Next 16 (`next/dist/esm/lib/server-external-packages.jsonc`): no se toca `next.config.ts`.
   - `server-only`: Next lo resuelve internamente, pero Vitest y Node no; instalarlo es lo que recomienda `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.
   - **`tsx` para el seed**, porque las alternativas sin dependencia no funcionan aquí: el seed importa los mocks, que usan imports relativos sin extensión (`../utils/seatRows`) y el alias `@/` (`seating.schema.ts` → `@/modules/events/purchase`). `node --experimental-strip-types` (y el type stripping por defecto de Node 24) no resuelve ni lo uno ni lo otro. `jiti` (transitiva de Tailwind) no lee los `paths` de `tsconfig.json`, y Vitest no ejecuta scripts. `tsx` resuelve ambos y acepta flags de Node (`--env-file-if-exists`).
2. **Variables de entorno.** `lib/env.ts` valida con zod **al importarse** y lanza un `Error` que nombra las variables inválidas o faltantes (`z.prettifyError`). Valida `DATABASE_URL` (obligatoria), `DATABASE_URL_UNPOOLED`, `DATABASE_URL_MIGRATOR` y `DATABASE_URL_TEST` (opcionales) y `SUPER_ADMIN_EMAIL` (opcional para la app, se normaliza a minúsculas; el seed la exige). Un valor vacío (`VAR=`) cuenta como ausente. **No lleva `import "server-only"`**: no contiene secretos (Next no inserta variables sin `NEXT_PUBLIC_` en el bundle de cliente) y así la pueden importar el seed y los tests fuera de Next. `server-only` va en `lib/db/client.ts`, que es lo que nunca debe llegar al cliente.
   - `drizzle.config.ts` **no** importa `lib/env.ts`: drizzle-kit carga la config fuera de Next y `db:generate` no necesita BD. Carga `.env` con `process.loadEnvFile` (Node, solo si el archivo existe) y usa `DATABASE_URL_MIGRATOR ?? DATABASE_URL_UNPOOLED ?? DATABASE_URL`.
   - El seed carga `.env` con el flag `--env-file-if-exists=.env` de Node (vía `tsx`).
   - Ningún agente escribe valores reales: solo `.env.example` con marcadores. **El usuario** crea el proyecto Neon y rellena `.env` (prerrequisito de la Fase 1, T4).
3. **`.env.example` versionado.** `.gitignore` ignora `.env*`; se añade la excepción `!.env.example`.
4. **Cliente.** `lib/db/client.ts`: `import "server-only"`, un `Pool` de `pg` con `connectionString: env.DATABASE_URL` y `max: 5` (system-design §4) y `export const db` de Drizzle. `ponytail:` sin singleton en `globalThis`: con el HMR de `next dev` cada recarga crea un Pool nuevo, y los anteriores cierran sus conexiones ociosas a los 10 s (por defecto de `pg`). Se añade el singleton si Neon rechaza conexiones en desarrollo.
5. **Esquema en `lib/db/schema/`, un archivo por dominio del ERD** (system-design §3: las FK cruzan dominios). Enums en un archivo propio porque varios se comparten entre dominios (`document_type`, `tax_id_type`, `request_status`). Las referencias circulares entre archivos (`event_seats.order_id` → `orders`, `orders.event_id` → `events`) funcionan porque `references(() => …)` es perezoso. Tipos:
   - Timestamps: `timestamp({ withTimezone: true, mode: "date" })`. El modo `string` devuelve `2026-11-15 02:00:00+00`, que no cumple `z.iso.datetime()`. Los mappers convierten con `toISOString()`.
   - `stage` como `jsonb().$type<{ label: string; path: string; labelPos: { x: number; y: number } }>()`.
   - `gen_random_uuid()` es nativo en Postgres 13+ (Neon usa 16/17): **no** se instala `pgcrypto`.
   - Todo lo del ERD es expresable en Drizzle (`pgEnum`, `check`, `uniqueIndex().where()`, `index().using("gin", t.searchText.op("gin_trgm_ops"))`, `pgSequence`, `inet`, `char(3)`, `uuid().array()`) **salvo las extensiones**, que van en una migración personalizada (`drizzle-kit generate --custom`) que **precede** a la del esquema, porque el índice GIN necesita `pg_trgm`.
6. **`ticket_types.sort_order integer NOT NULL DEFAULT 0` (desvío del ERD, se documenta en `erd.md`).** Sin ella no se puede reproducir el orden actual de la UI: en `noche-de-sintetizadores-lima` los tipos de entrada se listan General, Preferencial, VIP, Tribuna Norte (orden del evento), pero las zonas del mapa se listan VIP, Preferencial, General, Norte (orden del recinto, `venue_sections.sort_order`). `ZoneList`, `ZonePricesCard` y `TicketSelector` muestran los arrays en ese orden. Con un solo orden por sección, una de las dos listas cambiaría. Ver Preguntas abiertas 1.
7. **El estado de disponibilidad se calcula, como dice el ERD ("Datos calculados").** `getAvailabilityStatus(available, total)`: `sold-out` si `available === 0`; `low-stock` si `available <= total * 0.2`; si no, `available`. Se aplica a cada tipo de entrada (sus `event_seats`) y al evento (todos sus `event_seats`). Disponible = `status = 'available' OR (status = 'held' AND held_until < now())`. Con los datos sembrados reproduce **todos** los estados actuales de los mocks:
   - Zonas numeradas (ocupación determinista de `generateSeatRows`): norte 61/80 libres (76 %) → `available`; platea 72/94 (77 %) → `available`; mezanine 2/60 (3 %) → `low-stock`; mesa 0/24 → `sold-out`; preferencial de stand-up 9/60 (15 %) → `low-stock`.
   - Eventos: `risas-sin-filtro` queda en `low-stock` (≈10 % libre), `los-ecos-del-sur-arequipa` en `sold-out` y el resto en `available`, aunque tengan algún tipo en `low-stock` (como hoy).
8. **Órdenes de demostración para el inventario ocupado.** El CHECK `(status = 'available') = (order_id IS NULL)` obliga a que todo lugar vendido tenga orden. Por cada evento publicado con lugares ocupados, el seed crea **una** orden `paid` de demostración (`code = 'TK-DEMO-<NNN>'`, `user_id NULL`, comprador "Ventas de demostración" / `demo@example.com`, importes en céntimos con `platform_fee_cents = round(subtotal × commission_bps / 10000)` y `organizer_amount_cents = subtotal − fee`) y marca esos `event_seats` como `sold` con su `order_id`. **No crea `tickets`** (F3). `ponytail:` órdenes `paid` sin entradas: valen como datos locales de demo; en F3 se decide si el seed emite sus `tickets` o si el seed de demo no se ejecuta en producción (Preguntas abiertas 2 y 5). Ocupación sembrada:
   - Zonas numeradas con mapa: asiento `occupied` del mock → `sold`; `accessible` → `venue_seats.accessible = true`.
   - Zonas generales: `available` → 0 vendidos; `low-stock` → se deja libre el 10 % (`ceil(capacity × 0.1)`); `sold-out` → todos vendidos.
   - `ponytail:` un asiento accesible que el mock marca ocupado sale como `occupied` y su `accessible` se siembra `false`. El mock no conserva el dato; el mapa se ve igual.
9. **`hasVenueMap(slug): boolean` sigue síncrono y leyendo `VENUE_LAYOUTS_MOCK`.** Pasarlo a la BD obliga a hacerlo `async`, lo que cambia su firma y tres archivos de `app/` (`generateStaticParams`/`generateMetadata` de `/eventos/[slug]/entradas`, `/eventos/[slug]` y `/checkout`). Fuera de alcance. Como el seed sale del mismo mock, no puede divergir mientras los recintos no se editen. `ponytail:` hacerlo `async` (o derivarlo de `getVenueMapBySlug`) en F5, cuando exista el catálogo de recintos editable.
10. **Mapa en la BD.** Un evento tiene mapa si su recinto tiene `map_view_box` **y** todas las secciones de sus `ticket_types` tienen `map_path`. Así `clasico-del-pacifico`, que comparte el Estadio Nacional con `noche-de-sintetizadores-lima` pero usa otras secciones (popular, oriente…) sin geometría, sigue sin mapa, como hoy.
11. **Mocks → filas (seed):**
    - **Recintos:** uno por `(venue, city)` del evento. `address` sale del evento. `map_view_box`/`stage` salen del layout de cualquier evento de ese recinto (si dos layouts del mismo recinto difieren, el seed lanza un error). `created_by` = `super_admin`.
    - **Secciones:** una por `(recinto, slug)`. `slug` = `zone.id` del layout, o `ticketType.id` si no hay mapa. `name` = nombre del tipo de entrada. `sort_order` = índice de la zona en el layout, o del tipo en el evento si no hay mapa. Con mapa: `seating`/`capacity`/`map_path`/`label_x`/`label_y`/`seat_view_box` del layout. Sin mapa: `general` con `capacity = DEMO_GENERAL_CAPACITY = 200`.
    - **`ticket_types`:** `slug` = `ticketType.id` (hoy `ticketTypeId`), `price_cents = Math.round(price × 100)`, `sort_order` = índice en el evento y `max_per_order = MAX_TICKETS_PER_ORDER` (10, el límite actual de la UI; el default del ERD es 6).
    - **Organizadores:** uno por nombre distinto (`organizer` de `events.mock.ts`), con su usuario: `email = <nombre-en-kebab>@example.com` (dominio reservado; nadie puede verificarlo, así que nunca se vincula a una cuenta real), `first_name` = nombre, `last_name = ""`, `role = organizer`, `clerk_id NULL`. Organizador: `legal_name` = nombre, `tax_id_type = ruc`, `tax_id = "20" + índice con 9 dígitos` (ficticio, único), `commission_bps = 1000`, `payouts_enabled = false`.
    - **Eventos:** los 12 de `events.mock.ts` con `status = published`. `search_text` = `normalizeText(title + " " + venue + " " + city)` (se exporta la función existente de `modules/events/utils/eventFilters.ts`). `created_at` = `2026-10-01T05:00:00Z` + índice en segundos, para conservar el orden actual del listado (Decisión 13).
    - **Borrador de `organizerEvents.mock.ts`:** el de `ORGANIZER_DRAFTS_MOCK` ("Feria Familiar de Verano") se siembra como evento `draft`:
      - `slug` = título en kebab-case; `description = "Borrador sin descripción."`; `doors_open_at = starts_at`; `min_age = 0`.
      - Recinto "Parque Selva Alegre" (Arequipa) con `address = "Por confirmar"`.
      - Un tipo de entrada `general` a `priceFrom` en una sección `general` con `capacity`.
      - Organizador: el del primer evento de `ORGANIZER_SALES_MOCK` (Pulso Producciones).
      - Sin `event_seats`: se generan al publicar.
      - Los `sold`/`capacity` de `ORGANIZER_SALES_MOCK` **no** se siembran: chocan con el inventario real del recinto (p. ej. 8000 frente a 17 580 lugares) y el panel de organizador no lee la BD hasta F5. Ver Preguntas abiertas 3.
    - **Categorías:** las 6 de `EVENT_CATEGORY_LABELS` (`slug`, `name`).
    - **`super_admin`:** `email = SUPER_ADMIN_EMAIL` en minúsculas (será `ronalehm@gmail.com`), `first_name = "Super"`, `last_name = "Admin"`, `role = super_admin`, `clerk_id NULL`. Se vincula en su primer login con correo verificado (F2).
12. **Seed idempotente con ids deterministas.** Cada fila del seed tiene un id `seedUuid(clave)`: UUID v8 (RFC 9562) derivado de `sha256(clave)` con `node:crypto`, p. ej. `seedUuid("event:noche-de-sintetizadores-lima")`. Todo se inserta en **una transacción**, en orden de dependencias y por lotes (≤ 1000 filas, límite de parámetros de Postgres), con `onConflictDoNothing()`. Volver a ejecutarlo no cambia nada ni falla. La única excepción es el `super_admin`: `INSERT … ON CONFLICT (email) DO UPDATE SET role = 'super_admin' RETURNING id` (si ya existía, p. ej. vinculado a Clerk, conserva su `id` y `clerk_id`), y su `id` real se usa como `venues.created_by`. `ponytail:` cambiar un mock no actualiza filas ya sembradas; para eso se recrea la rama `dev` de Neon y se vuelve a migrar y sembrar.
13. **Mismos resultados que con los mocks.**
    - `getEvents` devuelve solo eventos `published`, ordenados por `events.created_at, events.id`: es el orden del mock, del que dependen `HeroCarousel`, `FeaturedEventsRail` y `UpcomingEvents`.
    - Tipos de entrada: por `ticket_types.sort_order`. Zonas del mapa: por `venue_sections.sort_order`. Asientos: por `length(row_label), row_label, number`.
    - Precios: céntimos / 100. Fechas: `Date#toISOString()`, el mismo instante en UTC en vez de `-05:00`. Todos los consumidores usan `Date.parse`/`new Date`, así que se ve igual.
    - `id`: pasa a ser el UUID de la fila. Solo se usa como `key` de React.
    - Los services siguen validando su salida con los schemas zod actuales (`eventSchema`, `eventDetailSchema`, `venueLayoutSchema`).
14. **Mappers puros y services delgados.** Las consultas viven en los services. La conversión filas → tipos de dominio vive en utils puros con unit tests (`modules/events/utils/eventRecords.ts`, `modules/seating/utils/venueLayoutRecords.ts`). La lógica de `getFeaturedEvents` y `getRelatedEvents` no cambia: sigue filtrando y ordenando en memoria sobre `getEvents()`.
15. **Excepción documentada a SETUP §1 regla 4/5:** el seed (`lib/db/seed/*`) importa archivos internos de los módulos (`data/*.mock.ts`, `schemas/*.schema.ts`, `utils/eventFilters.ts`, `utils/availability.ts`, `utils/ticketOrder.ts` vía `@/modules/events/purchase`). Es tooling de desarrollo que no se carga en la app, como los tests. No se añaden entradas públicas a los módulos solo para el seed.
16. **Tests de integración contra Postgres real** (system-design §11; PGlite no sirve).
    - **Entorno:** `vitest.config.mts` lee `.env` con `loadEnv` de `vite` (sin mutar el entorno del proceso). Si existe `DATABASE_URL_TEST`, la asigna a `process.env.DATABASE_URL` de los tests. **Si es igual a la `DATABASE_URL` de desarrollo, lanza un error** para no truncar la BD de desarrollo. Si no existe, asigna una URL inerte (`postgres://unused@127.0.0.1:1/unused`): importar los services ya no falla al validar el entorno, y como esos tests se saltan, nunca se conecta.
    - **`server-only`:** se resuelve a `node_modules/server-only/empty.js` mediante un alias de Vitest.
    - **`globalSetup`** (solo con `DATABASE_URL_TEST`): aplica las migraciones con el migrator de `drizzle-orm`, hace `TRUNCATE … CASCADE` de las tablas de `public` y ejecuta el seed una vez con `superAdminEmail: "super.admin@example.com"`.
    - **Tests en paralelo sin interferir:** los tests de lectura solo leen; los de restricciones trabajan dentro de una transacción que se revierte; el de idempotencia vuelve a ejecutar el seed, que no cambia nada; el que crea filas propias las borra al terminar.
    - **Salto:** los bloques que tocan la BD usan `describeWithDb` (`describe.skipIf(!process.env.DATABASE_URL_TEST)`), definido en un solo lugar. Los archivos de integración declaran `// @vitest-environment node`.
17. **El build y el render necesitan la BD.** `/`, `/eventos`, `/eventos/[slug]` y `/eventos/[slug]/entradas` son estáticas (`generateStaticParams`), así que `npm run build` consulta la BD de `.env` (rama `dev`, migrada y sembrada) y los datos quedan congelados hasta el siguiente build. En F1 nada escribe en la BD, así que no hay diferencia visible. La caché con `revalidateTag` y el entorno de CI llegan en F3 y F8 (Preguntas abiertas 6).

## Requisitos

### Comunes
1. No cambia ninguna firma pública ni ningún archivo de `app/`, `components/` o `modules/*/index.ts`. La UI se ve y se comporta igual.
2. Los mocks (`events.mock.ts`, `venueMaps.mock.ts`, `organizerEvents.mock.ts`) siguen existiendo y son la fuente del seed. `organizer.service.ts` y `hasVenueMap` siguen usándolos.
3. Sin `any`. Las filas de la BD se validan con los schemas zod existentes antes de salir del service.
4. Ningún archivo versionado contiene credenciales.

### Fase 1 — Conexión y esquema
5. `package.json`: dependencias de la Decisión 1 y scripts `"db:generate": "drizzle-kit generate"` y `"db:migrate": "drizzle-kit migrate"`.
6. `.env.example` (versionado; **ya existe**, commit `c7f33c1`) debe contener al menos estas variables. Diferencia con lo que sigue: `DATABASE_URL` es la conexión **pooled** de Neon y `DATABASE_URL_UNPOOLED` la directa, que usan drizzle-kit y el seed. Referencia original:
   ```sh
   # Neon, rama dev (conexión directa, sin -pooler), p. ej. postgresql://<user>:<password>@<host>/<db>?sslmode=require
   DATABASE_URL=
   # Opcional en local: usuario con permisos DDL para migraciones (si falta, se usa DATABASE_URL)
   # DATABASE_URL_MIGRATOR=
   # Opcional: Neon, rama test (solo tests de integración; nunca la misma que DATABASE_URL)
   # DATABASE_URL_TEST=
   # Correo del primer super_admin que crea el seed
   SUPER_ADMIN_EMAIL=
   ```
7. `lib/env.ts` exporta `serverEnvSchema` (para el test) y `env` (parseado de `process.env`), según la Decisión 2.
8. `lib/db/client.ts` según la Decisión 4.
9. `drizzle.config.ts`: `dialect: "postgresql"`, `schema: "./lib/db/schema"`, `out: "./drizzle"`, credenciales según la Decisión 2.
10. Esquema de las 25 tablas exactamente como el diccionario de `erd.md` (columnas, tipos, `NULL`/`NOT NULL`, defaults, FK, `created_at`/`updated_at` según la convención del ERD), más `ticket_types.sort_order` (Decisión 6):
    - 21 enums nativos con los valores de la tabla "Enums".
    - **CHECKs:** `venue_sections` (seating/capacity), `event_seats` (`(status = 'available') = (order_id IS NULL)`), `organizers.commission_bps BETWEEN 0 AND 10000`, `ticket_types.price_cents >= 0`, `refunds.amount_cents > 0`, `orders.platform_fee_cents + organizer_amount_cents = subtotal_cents`, `complaints` (`NOT is_minor OR guardian_name IS NOT NULL`) y `consents` (`user_id IS NOT NULL OR order_id IS NOT NULL`).
    - **Únicos:** los del diccionario, incluidos los compuestos (`venue_sections` ×2, `venue_seats`, `ticket_types` ×2, `event_seats`, `event_staff`, `legal_documents`) y `tickets.event_seat_id`, `tickets.code`, `tickets.qr_token`, `orders.code`, `orders.stripe_payment_intent_id`, `refunds.stripe_refund_id`, `payouts.event_id`, `users.clerk_id`, `users.email`, `organizers.tax_id`, `categories.slug`, `events.slug` y `complaints.number`.
    - **Únicos parciales:** `refunds (order_id) WHERE reason = 'event_cancelled'`, `organizer_applications (user_id) WHERE status = 'pending'`, `organizer_requests (event_id) WHERE status = 'pending'` y `refund_requests (order_id) WHERE status = 'pending'`.
    - **Índices:** `audit_logs (target_type, target_id)`, `events (status, starts_at)`, GIN `events (search_text gin_trgm_ops)`, `event_seats (ticket_type_id, status)`, `orders (user_id)`, `(event_id, status)`, `(buyer_email)`, `check_in_scans (event_id, created_at)`, `consents (user_id, legal_document_id)`, `complaints (status, due_at)` y `privacy_requests (status, due_at)`.
    - Sequence `order_code_seq`.
11. Migraciones en `drizzle/`: primero la personalizada con `CREATE EXTENSION IF NOT EXISTS pg_trgm;` y `CREATE EXTENSION IF NOT EXISTS unaccent;`, después la generada del esquema. Ambas versionadas junto con `drizzle/meta/`.
12. `docs/architecture/erd.md`: fila `sort_order` en `ticket_types` ("Orden de los tipos de entrada en el evento") y la nota de 25 tablas sin cambios.

### Fase 2 — Seed y tests de integración
13. `npm run db:seed` = `tsx --env-file-if-exists=.env lib/db/seed/run.ts`.
    - Sin `SUPER_ADMIN_EMAIL` válida termina con código ≠ 0 y el mensaje "Falta SUPER_ADMIN_EMAIL en .env", sin escribir nada.
    - Al terminar, cierra el pool e imprime "Seed completado".
14. `seed(db, { superAdminEmail })` inserta, en una transacción, todo lo de la Decisión 11 según las Decisiones 8 y 12.
15. `buildSeedData({ superAdminId })` es pura y determinista y devuelve las filas de cada tabla. Antes de transformar, valida los mocks con `eventDetailSchema`, `venueLayoutSchema` y `organizerEventSchema`. Lanza un `Error` descriptivo si:
    - una zona apunta a un `ticketTypeId` que no está en su evento;
    - dos layouts del mismo recinto difieren;
    - dos secciones del mismo recinto comparten `slug` con distinto nombre.
16. `modules/events/utils/availability.ts` exporta `getAvailabilityStatus(available: number, total: number): EventStatus` (Decisión 7) y la constante `LOW_STOCK_RATIO = 0.2`.
17. Infraestructura de integración según la Decisión 16. `npx vitest run` sin `DATABASE_URL_TEST` pasa y reporta como omitidos los tests de integración.

### Fase 3 — Lectura desde la BD
18. `events.service.ts`: `getEvents()` y `getEventBySlug(slug)` consultan la BD (solo `published`) y mantienen su firma y su salida (Decisión 13). `getEventBySlug` devuelve `null` para slugs inexistentes o no publicados. `getFeaturedEvents` y `getRelatedEvents` no cambian.
19. `seating.service.ts`: `getVenueMapBySlug(slug)` arma el layout desde la BD (recinto, secciones de los `ticket_types` del evento, `venue_seats` + estado de su `event_seat`) con `toVenueLayout`, lo valida con `venueLayoutSchema` y lo completa con nombre, precio y estado de `getEventBySlug`, como hoy. Devuelve `null` si el evento no existe, no está publicado o no tiene mapa (Decisión 10). Estado del asiento:
    - `occupied` si su `event_seat` no está disponible;
    - si no, `accessible` si `venue_seats.accessible`;
    - si no, `available`.
20. `hasVenueMap` sin cambios (Decisión 9).

## Criterios de aceptación

### Fase 1 — Conexión y esquema
- [ ] Dado el repo, cuando se revisa `package.json`, entonces `dependencies` incluye `drizzle-orm`, `pg` y `server-only`; `devDependencies` incluye `drizzle-kit`, `@types/pg` y `tsx`; y existen los scripts `db:generate` y `db:migrate`.
- [ ] Dado `.env.example`, cuando se ejecuta `git check-ignore .env.example`, entonces no lo ignora; y el archivo contiene las 4 variables sin valores reales.
- [ ] Dado `serverEnvSchema`, cuando se parsea un entorno sin `DATABASE_URL` (o con `DATABASE_URL=`), entonces falla con un mensaje que nombra `DATABASE_URL`; y con `SUPER_ADMIN_EMAIL=Ronalehm@Gmail.com` devuelve `ronalehm@gmail.com` (`lib/env.test.ts`).
- [ ] Dado `lib/db/client.ts`, cuando se lee, entonces su primera línea es `import "server-only"` y el Pool usa `env.DATABASE_URL` con `max: 5`.
- [ ] Dado el esquema, cuando se ejecuta `npm run db:generate` otra vez, entonces drizzle-kit informa que no hay cambios (esquema y migraciones sincronizados).
- [ ] Dado `drizzle/`, cuando se leen las migraciones, entonces la primera solo crea las extensiones `pg_trgm` y `unaccent`, y la del esquema contiene 25 `CREATE TABLE`, 21 `CREATE TYPE`, `CREATE SEQUENCE "order_code_seq"`, el índice `gin_trgm_ops`, los 4 únicos parciales y los 8 CHECKs del requisito 10.
- [ ] Dada la rama `dev` de Neon vacía y `.env` relleno, cuando se ejecuta `npm run db:migrate` dos veces, entonces la primera crea el esquema y la segunda no aplica nada ni falla.
- [ ] Dado `docs/architecture/erd.md`, cuando se lee `ticket_types`, entonces documenta `sort_order`.
- [ ] Dada la Fase 1 terminada, cuando se ejecutan `npm run lint`, `npx vitest run` y `npm run build`, entonces pasan sin errores y la app sigue leyendo los mocks (los services aún no se tocan).

### Fase 2 — Seed y tests de integración
- [ ] Dada la rama `dev` migrada y `SUPER_ADMIN_EMAIL` definida, cuando se ejecuta `npm run db:seed` dos veces, entonces ambas terminan con "Seed completado" y el número de filas de cada tabla es el mismo tras la primera y la segunda (`seed.test.ts`).
- [ ] Dado `.env` sin `SUPER_ADMIN_EMAIL`, cuando se ejecuta `npm run db:seed`, entonces termina con error "Falta SUPER_ADMIN_EMAIL en .env" y no inserta filas.
- [ ] Dado el seed ejecutado, cuando se consulta `users` por el correo del super admin, entonces hay una fila con ese correo en minúsculas, `role = super_admin` y `clerk_id NULL`; y si ya existía con `clerk_id` y rol `customer`, queda `super_admin` con el mismo `id` y `clerk_id` (`seed.test.ts`).
- [ ] Dados los mocks, cuando se ejecuta `buildSeedData`, entonces:
  - hay 6 categorías, 12 eventos `published` y 1 `draft`;
  - hay un solo recinto "Estadio Nacional" con `map_view_box` y 8 secciones;
  - los `venue_seats` coinciden 1:1 con los asientos de los layouts (318);
  - cada `ticket_types.slug` es el `ticketType.id` del mock;
  - el borrador no tiene `event_seats`;
  - todos los lugares `sold` tienen `order_id` de la orden de demo de su evento y los `available` no;
  - en cada orden de demo, `platform_fee_cents + organizer_amount_cents = subtotal_cents`.
- [ ] Dadas las filas de `buildSeedData`, cuando se calcula `getAvailabilityStatus` por tipo de entrada y por evento, entonces coincide con el `status` de cada `ticketType` y de cada evento de `events.mock.ts` (los 12 eventos).
- [ ] Dado `getAvailabilityStatus`, cuando recibe (0, 10), (2, 10), (3, 10) y (0, 0), entonces devuelve `sold-out`, `low-stock`, `available` y `sold-out`.
- [ ] Dada la BD de test sembrada, cuando se inserta un segundo `ticket` con el mismo `event_seat_id`, entonces falla por violación de unicidad (23505); cuando se pone un `event_seat` en `sold` sin `order_id` o en `available` con `order_id`, entonces falla el CHECK (23514); cuando se inserta una `venue_section` `general` sin `capacity` o `numbered` con `capacity`, entonces falla el CHECK (23514) (`constraints.test.ts`).
- [ ] Dado un entorno sin `DATABASE_URL_TEST`, cuando se ejecuta `npx vitest run`, entonces pasa y los tests de integración aparecen como omitidos.
- [ ] Dado `DATABASE_URL_TEST` igual a `DATABASE_URL`, cuando se ejecuta Vitest, entonces falla al cargar la configuración con un mensaje que lo explica.

### Fase 3 — Lectura desde la BD
- [ ] Dada la BD de test sembrada, cuando se llama a `getEvents()`, entonces devuelve los 12 eventos en el orden de `EVENTS_MOCK` y cada uno es igual a `eventSchema.parse(mock)` salvo `id` (UUID) y las fechas, que representan el mismo instante (`events.service.test.ts`).
- [ ] Dado cada slug de `EVENTS_MOCK`, cuando se llama a `getEventBySlug(slug)`, entonces el resultado es igual a `eventDetailSchema.parse(mock)` con las mismas excepciones, incluido el orden de `ticketTypes`. Con `"feria-familiar-de-verano"` (borrador) y `"no-existe"`, devuelve `null`.
- [ ] Dados los tests existentes de `getFeaturedEvents` y `getRelatedEvents`, cuando se ejecutan contra la BD, entonces pasan sin cambiar sus aserciones.
- [ ] Dados los 3 slugs con mapa, cuando se llama a `getVenueMapBySlug`, entonces devuelve el mismo `VenueMap` que con el mock (`viewBox`, `stage`, orden de zonas, filas, asientos con `x`/`y` y estado, nombre, precio y estado de cada zona). Con `clasico-del-pacifico`, `no-existe` y el borrador, devuelve `null` (`seating.service.test.ts`).
- [ ] Dados `checkout.service.test.ts`, `organizer.service.test.ts`, `zoneTone.test.ts` y `demoOrders.test.ts`, cuando se ejecutan con `DATABASE_URL_TEST`, entonces pasan con sus aserciones actuales; y sin `DATABASE_URL_TEST` sus bloques que usan la BD se omiten.
- [ ] Dada la Fase 3, cuando se ejecuta `git diff --stat main`, entonces no hay cambios en `app/`, `components/` ni en `modules/*/index.ts`.
- [ ] Dada la rama `dev` sembrada, cuando se ejecutan `npm run build` y `npm run dev`, entonces `/`, `/eventos`, `/eventos/noche-de-sintetizadores-lima`, `/eventos/noche-de-sintetizadores-lima/entradas` y `/eventos/clasico-del-pacifico` se ven igual que antes (verificación manual del reviewer).
- [ ] Dada la Fase 3 terminada, cuando se ejecutan `npm run lint`, `npx vitest run` (con y sin `DATABASE_URL_TEST`) y `npm run build`, entonces pasan sin errores.

## Diseño técnico

### Rutas (`app/`)
Sin cambios. Las páginas siguen llamando a los mismos services.

### Componentes
Ninguno nuevo ni modificado (sin UI; no aplica shadcn).

### Archivos por capa

| Archivo | Estado | Contenido |
|---|---|---|
| `package.json`, `package-lock.json` | modificar | Deps (D1) y scripts `db:generate`, `db:migrate` (F1) y `db:seed` (F2). |
| `.env.example` | ya existe (`c7f33c1`) | Verificar el requisito 6; no reescribirlo. |
| `lib/env.ts` | nuevo | `serverEnvSchema`, `env` (D2). |
| `lib/env.test.ts` | nuevo | Unit tests de `serverEnvSchema`. |
| `lib/db/client.ts` | nuevo | `import "server-only"`; `Pool` + `db` (D4). |
| `drizzle.config.ts` | nuevo | Config de drizzle-kit (D2). |
| `lib/db/schema/enums.ts` | nuevo | Los 21 `pgEnum`. |
| `lib/db/schema/identity.ts` | nuevo | `users`, `organizers`, `audit_logs`. |
| `lib/db/schema/venues.ts` | nuevo | `venues`, `venue_sections`, `venue_seats`. |
| `lib/db/schema/events.ts` | nuevo | `categories`, `events`, `ticket_types`, `event_seats`, `event_staff`. |
| `lib/db/schema/sales.ts` | nuevo | `orderCodeSeq`, `orders`, `tickets`, `refunds`, `stripe_events`, `check_in_scans`, `payouts`. |
| `lib/db/schema/legal.ts` | nuevo | `legal_documents`, `consents`, `complaints`, `complaint_counters`. |
| `lib/db/schema/requests.ts` | nuevo | `organizer_applications`, `organizer_requests`, `refund_requests`, `privacy_requests`. |
| `drizzle/0000_extensions.sql`, `drizzle/0001_<nombre>.sql`, `drizzle/meta/*` | generados | `drizzle-kit generate --custom --name=extensions` (se edita el SQL a mano) y luego `drizzle-kit generate`. |
| `docs/architecture/erd.md` | modificar | `ticket_types.sort_order` (D6). |
| `modules/events/utils/eventFilters.ts` | modificar | `export` de `normalizeText` (sin cambiar su lógica). |
| `modules/events/utils/availability.ts` | nuevo | `getAvailabilityStatus`, `LOW_STOCK_RATIO` (D7). |
| `modules/events/utils/availability.test.ts` | nuevo | Unit tests. |
| `lib/db/seed/buildSeedData.ts` | nuevo | `seedUuid`, `DEMO_GENERAL_CAPACITY`, `buildSeedData` (puro, D8, D11, D12). |
| `lib/db/seed/buildSeedData.test.ts` | nuevo | Unit tests. |
| `lib/db/seed/seed.ts` | nuevo | `seed(db, { superAdminEmail })`: upsert del super admin + inserts por lotes en una transacción. No importa `client.ts`. |
| `lib/db/seed/run.ts` | nuevo | CLI: valida `env.SUPER_ADMIN_EMAIL`, crea su propio `Pool`/`drizzle` con `env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL` (conexión directa: transacción larga), llama a `seed`, cierra el pool. |
| `vitest.config.mts` | modificar | `loadEnv`, mapeo `DATABASE_URL_TEST` → `DATABASE_URL` con guarda, URL inerte, alias `server-only`, `test.globalSetup` (D16). Conserva `resolve.tsconfigPaths` y `environment: "jsdom"`. |
| `lib/db/testDb.ts` | nuevo | `describeWithDb`. |
| `lib/db/testGlobalSetup.ts` | nuevo | Migrar + `TRUNCATE` + `seed` en la BD de test (solo con `DATABASE_URL_TEST`). |
| `lib/db/seed/seed.test.ts` | nuevo | Integración: idempotencia y super admin. |
| `lib/db/constraints.test.ts` | nuevo | Integración: restricciones clave. |
| `modules/events/utils/eventRecords.ts` | nuevo | Tipos `EventRecord`, `EventDetailRecord`, `TicketTypeRecord`; `toEvent`, `toEventDetail`. |
| `modules/events/utils/eventRecords.test.ts` | nuevo | Unit tests. |
| `modules/events/services/events.service.ts` | modificar | Consultas Drizzle + mappers + zod. |
| `modules/events/services/events.service.test.ts` | modificar | Integración (equivalencia) + invariantes del mock (se conservan). |
| `modules/seating/utils/venueLayoutRecords.ts` | nuevo | Tipos `VenueRecord`, `ZoneRecord`, `SeatRecord`; `toVenueLayout`. |
| `modules/seating/utils/venueLayoutRecords.test.ts` | nuevo | Unit tests. |
| `modules/seating/services/seating.service.ts` | modificar | `getVenueMapBySlug` desde la BD; `hasVenueMap` igual. |
| `modules/seating/services/seating.service.test.ts` | modificar | Integración; los tests que mutaban el mock pasan a `venueLayoutRecords.test.ts`. |
| `modules/checkout/services/checkout.service.test.ts`, `modules/organizer/services/organizer.service.test.ts`, `modules/seating/utils/zoneTone.test.ts`, `modules/tickets/data/demoOrders.test.ts` | modificar | `describeWithDb` en los bloques que llaman a services de BD y `// @vitest-environment node`. Sin cambiar aserciones. |

### Consultas (Fase 3)
- **`getEvents`:** `events` ⋈ `categories` ⋈ `venues` ⋈ `ticket_types` ⟕ `event_seats`, `WHERE events.status = 'published'`, `GROUP BY` evento, con `min(price_cents)`, `count(event_seats.id)` y `count(*) FILTER (WHERE <disponible>)`. `ORDER BY events.created_at, events.id`.
- **`getEventBySlug`:** la misma fila del evento (más `description`, `address`, `doors_open_at`, `min_age`, `organizers.legal_name`) y una segunda consulta de sus `ticket_types` con conteos por tipo, `ORDER BY ticket_types.sort_order`.
- **`getVenueMapBySlug`:** recinto del evento publicado; zonas = `ticket_types` ⋈ `venue_sections` del evento (`ORDER BY venue_sections.sort_order`); asientos = `venue_seats` ⋈ `event_seats` (`event_id` del evento) de las secciones numeradas, con `available` calculado y orden de la Decisión 13.
- "Disponible" (definido una vez en cada service o como fragmento `sql` compartido dentro del módulo): `status = 'available' OR (status = 'held' AND held_until < now())`.

### Contratos

Las firmas públicas no cambian:
```ts
getEvents(): Promise<Event[]>
getFeaturedEvents(): Promise<Event[]>
getEventBySlug(slug: string): Promise<EventDetail | null>
getRelatedEvents(slug: string, limit?: number): Promise<Event[]>
getVenueMapBySlug(slug: string): Promise<VenueMap | null>
hasVenueMap(slug: string): boolean
```

Entorno (`lib/env.ts`):
```ts
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

export const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_URL_UNPOOLED: optional(z.url()),
  DATABASE_URL_MIGRATOR: optional(z.url()),
  DATABASE_URL_TEST: optional(z.url()),
  SUPER_ADMIN_EMAIL: optional(z.email().transform((email) => email.toLowerCase())),
});
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export const env: ServerEnv; // parse de process.env; lanza Error con z.prettifyError si falla
```

Mappers (puros; la salida la valida el service con zod):
```ts
// modules/events/utils/eventRecords.ts
export type EventRecord = {
  id: string; slug: string; title: string; category: string; startsAt: Date;
  venue: string; city: string; imageUrl: string; featured: boolean;
  priceFromCents: number; totalSeats: number; availableSeats: number;
};
export type EventDetailRecord = EventRecord & {
  description: string; address: string; doorsOpenAt: Date; minAge: number; organizer: string;
};
export type TicketTypeRecord = {
  slug: string; name: string; description: string | null; priceCents: number;
  totalSeats: number; availableSeats: number;
};
export function toEvent(record: EventRecord): z.input<typeof eventSchema>;
export function toEventDetail(record: EventDetailRecord, ticketTypes: TicketTypeRecord[]): z.input<typeof eventDetailSchema>;
// description null → se omite; price = cents / 100; status = getAvailabilityStatus(available, total)

// modules/seating/utils/venueLayoutRecords.ts
export type VenueRecord = { eventSlug: string; mapViewBox: string | null; stage: { label: string; path: string; labelPos: { x: number; y: number } } | null };
export type ZoneRecord = {
  sectionSlug: string; ticketTypeSlug: string; seating: "general" | "numbered"; capacity: number | null;
  mapPath: string | null; labelX: number | null; labelY: number | null; seatViewBox: string | null;
};
export type SeatRecord = { sectionSlug: string; rowLabel: string; number: number; x: number; y: number; accessible: boolean; available: boolean };
/** null si el recinto no tiene geometría o alguna zona no tiene map_path (Decisión 10). */
export function toVenueLayout(venue: VenueRecord, zones: ZoneRecord[], seats: SeatRecord[]): z.input<typeof venueLayoutSchema> | null;
```

Seed:
```ts
// lib/db/seed/buildSeedData.ts
export const DEMO_GENERAL_CAPACITY = 200;
export function seedUuid(key: string): string; // UUID v8 desde sha256(key)
export type SeedData = {
  users: (typeof users.$inferInsert)[];               // organizadores (el super admin lo inserta seed())
  organizers: (typeof organizers.$inferInsert)[];
  categories: (typeof categories.$inferInsert)[];
  venues: (typeof venues.$inferInsert)[];
  venueSections: (typeof venueSections.$inferInsert)[];
  venueSeats: (typeof venueSeats.$inferInsert)[];
  events: (typeof events.$inferInsert)[];
  ticketTypes: (typeof ticketTypes.$inferInsert)[];
  orders: (typeof orders.$inferInsert)[];
  eventSeats: (typeof eventSeats.$inferInsert)[];
};
export function buildSeedData(options: { superAdminId: string }): SeedData;

// lib/db/seed/seed.ts
export async function seed(db: NodePgDatabase, options: { superAdminEmail: string }): Promise<void>;
```

Scripts:
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:seed": "tsx --env-file-if-exists=.env lib/db/seed/run.ts"
```

### Prerrequisito del usuario (cumplido el 2026-10-03, commit `c7f33c1`)
1. Proyecto Neon `still-unit-14193214` enlazado (`.neon`, ignorado por git) con `neon.ts`, skills y MCP.
2. Ramas `dev` (activa) y `test` creadas, sin expiración.
3. `.env` (ignorado por git) ya tiene `DATABASE_URL` (rama `dev`, **pooled**), `DATABASE_URL_UNPOOLED` (rama `dev`, directa), `NEON_BRANCH`, `DATABASE_URL_TEST` (rama `test`, directa) y `SUPER_ADMIN_EMAIL`. Las escribe `neon checkout` / `neon env pull`; si existiera un `.env.local`, Next.js le daría prioridad.
4. `.env.example` y la excepción `!.env.example` en `.gitignore` ya están versionados (incluyen también las variables de Clerk y Stripe para F2/F3). T1 solo verifica que contengan las variables de F1.

Ningún agente escribe ni lee esos valores.

## Reutilización
- **Schemas zod existentes** como validación de salida y de los mocks en el seed: `eventSchema`, `eventDetailSchema` (`modules/events/schemas/events.schema.ts`), `venueLayoutSchema` (`modules/seating/schemas/seating.schema.ts`) y `organizerEventSchema`.
- **Mocks como fuente del seed:** `EVENTS_MOCK`, `VENUE_LAYOUTS_MOCK` (ya trae la geometría y la ocupación determinista de `generateSeatRows`) y `ORGANIZER_DRAFTS_MOCK`/`ORGANIZER_SALES_MOCK`.
- **Utilidades existentes:**
  - `normalizeText` de `modules/events/utils/eventFilters.ts` para `search_text` y los slugs/correos de organizador;
  - `EVENT_CATEGORY_LABELS` para las categorías;
  - `MAX_TICKETS_PER_ORDER` (`@/modules/events/purchase`) para `max_per_order`;
  - `EventStatus` como tipo de retorno de `getAvailabilityStatus`.
- **Lógica de los services:** `getFeaturedEvents` y `getRelatedEvents`, y en `getVenueMapBySlug` la fusión con los tipos de entrada, sin cambios.
- **Tests existentes como prueba de equivalencia:** sus aserciones se mantienen y ahora corren contra la BD sembrada.
- **Ya instalado:** zod v4 (`z.url`, `z.email`, `z.prettifyError`), `vite` (`loadEnv`, dependencia de Vitest) y `node:crypto` (`seedUuid`).
- **Nuevo:** solo las 6 dependencias de la Decisión 1. Ninguna para cargar `.env` (se usan `process.loadEnvFile` y `--env-file-if-exists` de Node, y `loadEnv` de Vite).

## Tests

**Unitarios (sin BD):**
- `lib/env.test.ts` (como `lib/env.ts` valida al importarse, el test define `DATABASE_URL` con `vi.stubEnv` antes de `await import("./env")` y prueba los casos con `serverEnvSchema.safeParse`):
  - falta `DATABASE_URL` → error que la nombra;
  - `DATABASE_URL=""` → igual;
  - URL inválida → error;
  - opcionales vacías → `undefined`;
  - `SUPER_ADMIN_EMAIL` se normaliza a minúsculas;
  - correo inválido → error.
- `modules/events/utils/availability.test.ts`: (0,10) `sold-out`; (2,10) `low-stock` (límite exacto del 20 %); (3,10) `available`; (0,0) `sold-out`.
- `lib/db/seed/buildSeedData.test.ts`:
  - `seedUuid`: determinista, formato UUID válido (versión 8), claves distintas → ids distintos;
  - conteos: 6 categorías, 13 eventos (12 `published`, 1 `draft`), 318 `venue_seats`;
  - recintos: Estadio Nacional único con 8 secciones y geometría; secciones sin mapa `general` con `DEMO_GENERAL_CAPACITY`; `sort_order` de secciones y de `ticket_types`;
  - inventario: `event_seats` por evento publicado (numeradas = asientos; generales = `capacity`); vendidos según la Decisión 8; borrador sin `event_seats`;
  - estados derivados con `getAvailabilityStatus` = estados del mock, para los 12 eventos y todos sus tipos;
  - órdenes de demo: una por evento con vendidos, CHECK de importes, `order_id` coherente con `status`;
  - organizadores: únicos por nombre, `tax_id` únicos de 11 dígitos, usuarios `organizer` con `@example.com` y sin `clerk_id`;
  - `search_text` de `noche-de-sintetizadores-lima` = `"noche de sintetizadores: gira neon 2026 estadio nacional lima"`;
  - `created_at` creciente en el orden del mock;
  - errores: zona con `ticketTypeId` inexistente y dos layouts distintos para el mismo recinto (mocks modificados en el test y restaurados).
- `modules/events/utils/eventRecords.test.ts`:
  - céntimos → soles (`18000` → `180`), `Date` → ISO válido para `z.iso.datetime({ offset: true })`;
  - `priceFrom` desde `priceFromCents`; `status` desde los conteos;
  - `description: null` omitida; orden de `ticketTypes` respetado;
  - la salida pasa `eventDetailSchema`; una categoría desconocida hace fallar `eventSchema.parse` (el service lanza).
- `modules/seating/utils/venueLayoutRecords.test.ts`:
  - `null` sin `mapViewBox` o con una zona sin `mapPath`;
  - zonas generales con `capacity` y numeradas con filas agrupadas en orden y asientos `occupied`/`accessible`/`available` según `available` y `accessible`;
  - la salida pasa `venueLayoutSchema`; un `seatViewBox` inválido hace fallar `venueLayoutSchema.parse` (sustituye a los tests que mutaban `VENUE_LAYOUTS_MOCK`).

**Integración (Postgres real, `describeWithDb`, `// @vitest-environment node`):**
- `lib/db/seed/seed.test.ts`:
  - volver a ejecutar `seed` no falla y deja los mismos conteos por tabla (iguales a las longitudes de `buildSeedData`);
  - super admin con correo en minúsculas, `super_admin` y `clerk_id NULL`;
  - un usuario previo `customer` con `clerk_id` se promueve conservando `id` y `clerk_id` (el test borra lo que crea).
- `lib/db/constraints.test.ts` (cada caso en una transacción revertida): `UNIQUE tickets.event_seat_id` (23505), CHECK de `event_seats` en ambos sentidos (23514), CHECK de `venue_sections` en ambos sentidos (23514).
- `modules/events/services/events.service.test.ts`:
  - equivalencia con los mocks de `getEvents` (orden incluido) y de `getEventBySlug` para los 12 slugs (sin `id`, fechas por `Date.parse`);
  - `null` para el borrador y `no-existe`;
  - se conservan los tests de `getFeaturedEvents` y `getRelatedEvents` y el bloque "invariantes del mock" (este sin BD);
  - se elimina "falla si el mock tiene un evento inválido": lo cubre `eventRecords.test.ts`.
- `modules/seating/services/seating.service.test.ts`:
  - equivalencia de `getVenueMapBySlug` con el mapa que construía el service mock para los 3 slugs (`venueLayoutSchema.parse` del layout del mock + tipos del evento);
  - `null` para `clasico-del-pacifico`, `no-existe` y el borrador;
  - se conservan los tests de `hasVenueMap`, invariantes y tonos;
  - se eliminan los tres que mutaban `VENUE_LAYOUTS_MOCK` (sus casos pasan a `venueLayoutRecords.test.ts`).
- `checkout.service.test.ts`, `organizer.service.test.ts`, `zoneTone.test.ts` y `demoOrders.test.ts`: solo `describeWithDb` en los bloques que llaman a `getEvents`, `getEventBySlug` o `getVenueMapBySlug`, y `// @vitest-environment node`.

## Plan de tareas

### Fase 1 — Conexión y esquema (16 archivos, incluido `package-lock.json`, + migraciones generadas)
- [x] T1 — Dependencias y scripts `db:generate`/`db:migrate`; verificar que `.env.example` (ya versionado) contiene las variables de F1 · archivos: `package.json`, `package-lock.json` · depende de: — · secuencial (base)
- [x] T2 — Entorno, cliente y config de drizzle-kit, con test del entorno · archivos: `lib/env.ts`, `lib/env.test.ts`, `lib/db/client.ts`, `drizzle.config.ts` · depende de: T1 · secuencial (`lib/`)
- [x] T3 — Esquema completo de las 25 tablas, con enums, CHECKs, índices, sequence y `ticket_types.sort_order`; actualizar el ERD · archivos: `lib/db/schema/enums.ts`, `lib/db/schema/identity.ts`, `lib/db/schema/venues.ts`, `lib/db/schema/events.ts`, `lib/db/schema/sales.ts`, `lib/db/schema/legal.ts`, `lib/db/schema/requests.ts`, `docs/architecture/erd.md` · depende de: T1 · paralelo con T2 (archivos disjuntos; ninguno importa al otro)
- [x] T4 — Migración personalizada de extensiones + migración generada del esquema; aplicar en la rama `dev` y comprobar que una segunda generación y una segunda migración no cambian nada · archivos: `drizzle/0000_extensions.sql`, `drizzle/0001_<nombre>.sql`, `drizzle/meta/*` (generados) · depende de: T2, T3 y el **prerrequisito del usuario** (Neon + `.env`) · secuencial

### Fase 2 — Seed y tests de integración (13 archivos)
- [ ] T1 — Exportar `normalizeText`, util de disponibilidad con tests y script `db:seed` · archivos: `modules/events/utils/eventFilters.ts`, `modules/events/utils/availability.ts`, `modules/events/utils/availability.test.ts`, `package.json` · depende de: Fase 1 · secuencial (base)
- [ ] T2 — `buildSeedData` y `seedUuid`, con unit tests (incluida la equivalencia de estados) · archivos: `lib/db/seed/buildSeedData.ts`, `lib/db/seed/buildSeedData.test.ts` · depende de: T1 · secuencial
- [ ] T3 — `seed()` transaccional e idempotente y CLI `run.ts`; ejecutar `npm run db:seed` dos veces en `dev` · archivos: `lib/db/seed/seed.ts`, `lib/db/seed/run.ts` · depende de: T2 · secuencial
- [ ] T4 — Infraestructura de integración (config de Vitest, `describeWithDb`, `globalSetup`) y tests de seed y restricciones · archivos: `vitest.config.mts`, `lib/db/testDb.ts`, `lib/db/testGlobalSetup.ts`, `lib/db/seed/seed.test.ts`, `lib/db/constraints.test.ts` · depende de: T3 · secuencial

### Fase 3 — `events` y `seating` leen de la BD (12 archivos)
- [ ] T1 — Mappers de eventos con unit tests · archivos: `modules/events/utils/eventRecords.ts`, `modules/events/utils/eventRecords.test.ts` · depende de: Fase 2 · paralelo con T2
- [ ] T2 — Mapper del layout con unit tests · archivos: `modules/seating/utils/venueLayoutRecords.ts`, `modules/seating/utils/venueLayoutRecords.test.ts` · depende de: Fase 2 · paralelo con T1
- [ ] T3 — `events.service` desde la BD y su test de equivalencia · archivos: `modules/events/services/events.service.ts`, `modules/events/services/events.service.test.ts` · depende de: T1 · paralelo con T4
- [ ] T4 — `seating.service` (`getVenueMapBySlug`) desde la BD y su test de equivalencia · archivos: `modules/seating/services/seating.service.ts`, `modules/seating/services/seating.service.test.ts` · depende de: T2 · paralelo con T3 (usa `getEventBySlug` por su firma pública, que no cambia)
- [ ] T5 — Marcar con `describeWithDb` y entorno `node` los tests de otros módulos que llaman a estos services · archivos: `modules/checkout/services/checkout.service.test.ts`, `modules/organizer/services/organizer.service.test.ts`, `modules/seating/utils/zoneTone.test.ts`, `modules/tickets/data/demoOrders.test.ts` · depende de: T3, T4 · secuencial (cierre; el reviewer ejecuta el build y la verificación manual)

## Preguntas abiertas
1. **`ticket_types.sort_order` (Decisión 6):** es una columna que no está en el ERD aprobado. Sin ella, la lista de tipos de entrada de `noche-de-sintetizadores-lima` y `risas-sin-filtro` cambiaría de orden. Por defecto se añade. La alternativa es ordenar los tipos por el orden de su sección y aceptar ese cambio visual.
2. **Órdenes de demostración (Decisión 8):** reproducir "Agotado"/"Últimas entradas" exige lugares vendidos y, por el CHECK, órdenes. Por defecto: una orden `paid` de demo por evento, sin `tickets`. La alternativa es no sembrar ventas, con lo que todo se vería "Disponible" (cambia la UI y los tests de `sold-out`/`low-stock`).
3. **Datos de `organizerEvents.mock.ts`:** por defecto se siembra el borrador "Feria Familiar de Verano" como evento `draft` de "Pulso Producciones", con descripción y dirección de relleno, y no se siembran los `sold`/`capacity` de `ORGANIZER_SALES_MOCK`. ¿A qué organizador debe pertenecer el borrador, o se prefiere no sembrarlo hasta F5?
4. **Valores de demo inventados:** `commission_bps = 1000` (10 %), `DEMO_GENERAL_CAPACITY = 200` para las zonas sin mapa, RUC ficticios `20000000001…` y `max_per_order = 10` (el límite actual de la UI; el ERD dice 6 por defecto). ¿Algún valor real que usar?
5. **Seed en producción:** `db:seed` mezcla datos base (categorías, `super_admin`) y datos de demo (eventos, organizadores, órdenes ficticias). Por defecto es solo para local/test. En F8 se decide si se separa un seed base para producción.
6. **Build con BD (Decisión 17):** desde la Fase 3, `npm run build` necesita una BD migrada y sembrada. Cuando se configure CI (F8), ¿se le da una rama de Neon para CI, o se hacen dinámicas esas páginas junto con la caché de F3?
7. **`hasVenueMap` sigue leyendo el mock (Decisión 9).** ¿Se acepta hasta F5, o se prefiere hacerlo `async` ya en F1, lo que cambia su firma y toca 3 archivos de `app/`?
