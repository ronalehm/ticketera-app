# Huecos del modelo de datos: favoritos, borradores incompletos y recintos de organizador

- Módulo: data (transversal: `lib/db`, `events`)
- Estado: borrador

## Objetivo
El esquema de F1 (`data-foundation.md`) no puede guardar tres cosas que la app ya hace o hará en F2/F5:
1. **Favoritos de un usuario con sesión.** Hoy solo viven en el navegador (`useSavedEventsStore`, clave `mentec-saved`, por `slug`).
2. **Borradores incompletos.** El formulario "Crear evento" guarda un borrador con solo el nombre (y la categoría, que siempre tiene valor), pero `events` exige `starts_at`, `doors_open_at`, `venue_id`, `image_url` y `description`.
3. **Recintos creados por un organizador.** Hoy `venues` es solo un catálogo del admin. El formulario permite escribir un lugar propio con zonas generales (cantidad) y numeradas (filas × asientos), y la BD no tiene cómo marcar ese recinto como pendiente de revisión ni quién es su dueño.

Esta spec cierra esos huecos **solo en el modelo de datos**: esquema Drizzle, migración `0004`, tests de integración y documentación de arquitectura. La UI y los services que los usen llegan en F2 (favoritos) y en F4/F5 (crear evento, catálogo de recintos y moderación).

## Alcance
- Incluye:
  - Tabla nueva `saved_events`.
  - `events`: cinco columnas pasan a `NULL` y un CHECK nuevo que las exige fuera de `draft`.
  - `venues`: enum nuevo `venue_status`, columnas `status` y `organizer_id`, y un CHECK.
  - Migración `drizzle/0004_data_gaps.sql` (generada) aplicada en la rama Neon `dev` **sin reset**.
  - Ajuste mínimo de tipos en los mappers de `events` para que compilen con las columnas nullable.
  - Tests de integración de las restricciones nuevas (rama Neon `test`).
  - `docs/architecture/erd.md` y `docs/architecture/system-design.md`.
- No incluye:
  - Sincronizar favoritos con la BD, ni services o hooks de favoritos (F2, con Clerk). `useSavedEventsStore` no cambia.
  - Persistir el formulario "Crear evento" en la BD, el selector de recinto del catálogo o la creación de un recinto propio en la UI (F5). `useOrganizerStore`, `organizer.schema.ts` y `organizerEventForm.ts` no cambian.
  - El flujo del admin para aprobar recintos o eventos (F4/F5), y la validación "solo se publica con recinto `approved`" en código: aquí solo se documenta.
  - Generar la grilla de `venue_seats` (`x`, `y`) de un recinto propio (F5).
  - Cambios en el seed (`lib/db/seed/*`): sus recintos quedan `approved` por el default y su borrador ya cumple el CHECK (Decisión 7).
  - Cualquier cambio en `app/`, `components/`, `modules/*/index.ts` o la UI.
  - Un valor `rejected` en `venue_status` (Preguntas abiertas 3).

## Decisiones tomadas
1. **`saved_events` en `lib/db/schema/events.ts`.** Es del dominio de eventos (como `event_staff`) y ese archivo ya importa `users`.
   - Columnas: `user_id uuid NOT NULL → users.id`, `event_id uuid NOT NULL → events.id` y `created_at`.
   - PK compuesta `(user_id, event_id)` con `primaryKey({ columns: [t.userId, t.eventId] })` de Drizzle 0.45. Un mismo evento no se guarda dos veces.
   - Sin `updated_at`: la fila solo se inserta o se borra (convención del ERD).
   - Sin `id` propio ni índice extra: la PK ya sirve para "mis favoritos" (`WHERE user_id = $1`). Nadie consulta favoritos por evento.
   - FKs sin `ON DELETE`, como el resto del esquema: los usuarios se anonimizan y los eventos se cancelan, no se borran.
   - Sincronización (F2, solo se documenta): sin sesión siguen en `localStorage` (`mentec-saved`, por `slug`). Al iniciar sesión, los slugs se convierten en `event_id` y se insertan con `ON CONFLICT DO NOTHING`.
2. **Borradores incompletos en `events`.**
   - `venue_id`, `description`, `image_url`, `starts_at` y `doors_open_at` pasan a `NULL` (se quita `.notNull()`).
   - CHECK `events_draft_complete_check`: `status = 'draft' OR (venue_id IS NOT NULL AND description IS NOT NULL AND image_url IS NOT NULL AND starts_at IS NOT NULL AND doors_open_at IS NOT NULL)`. `pending_review`, `published`, `cancelled` y `finished` exigen las cinco. Un evento rechazado vuelve a `draft` (system-design §7.11) y puede quedar incompleto otra vez.
   - Que `description` no esté vacía, que `doors_open_at <= starts_at` o que la fecha sea futura lo sigue validando el formulario al publicar. La BD no lo comprueba.
   - El índice `(status, starts_at)` acepta `NULL` sin cambios.
3. **Las demás columnas `NOT NULL` de `events` se quedan como están.** Ninguna impide guardar el borrador del formulario actual (`organizerEventFormSchema`, intent `draft`):

   | Columna | Por qué se queda `NOT NULL` |
   |---|---|
   | `title` | El borrador exige el nombre. |
   | `category_id` | El `Select` de categoría siempre tiene valor. |
   | `min_age` | El `Select` de edad siempre tiene valor (`"0"` por defecto). |
   | `organizer_id` | Lo pone la sesión del organizador (F5). |
   | `slug` | La app lo deriva del título al crear el borrador. Resolver colisiones es tarea de F5. |
   | `search_text` | La app lo calcula como `normalizeText` de título + recinto + ciudad. Sin recinto, sale solo del título. |
   | `featured`, `currency`, `status` | Tienen default. |

   No hay columna `address` en `events`: la dirección es de `venues`.
4. **`ticket_types` y `venue_sections` no cambian.** Sus `NOT NULL` (`section_id`, `name`, `price_cents`, `seating`; el CHECK de `capacity`) siguen igual. Hoy `toOrganizerEvent` ya guarda "solo lo interpretable", y el mismo criterio vale para la BD:
   - un borrador sin recinto no tiene `ticket_types` (la sección debe ser del recinto del evento, regla de la app);
   - de un borrador con recinto solo se guardan las zonas completas;
   - las filas incompletas del formulario no se guardan.

   El mapeo exacto formulario → filas es de F5 (Preguntas abiertas 1).
5. **Recintos mixtos en `venues`.**
   - Enum nuevo `venue_status` (`pending_review`, `approved`), en `lib/db/schema/enums.ts`. Pasan a ser 22 enums.
   - `status venue_status NOT NULL DEFAULT 'approved'`. Al migrar, los recintos que ya existen quedan `approved`.
   - `organizer_id uuid NULL → organizers.user_id`. Es el dueño si lo creó un organizador; `NULL` si es del catálogo del admin. Apunta a `organizers.user_id`, como `events.organizer_id`. `created_by` se mantiene: es quién insertó la fila (el admin o el propio organizador).
   - CHECK `venues_pending_has_owner_check`: `status = 'approved' OR organizer_id IS NOT NULL`. Solo un organizador propone recintos, así que un recinto pendiente siempre tiene dueño. El admin crea los suyos directamente `approved`. Es una línea en la BD en lugar de una regla de la app.
   - Al aprobarlo, el recinto de un organizador pasa a `approved`, entra en el catálogo y conserva su `organizer_id`.
   - Un recinto propio se guarda con lo que ya existe:
     - zonas generales → `venue_sections` `general` con `capacity`;
     - zonas numeradas → `venue_sections` `numbered` + `venue_seats` en grilla (filas × asientos);
     - `map_view_box NULL`: la UI usa la lista de zonas sin mapa (ERD).

     Calcular la grilla es de F5.
6. **Reglas de la app (cruzan tablas; se documentan en el ERD y en system-design, no se implementan aquí):**
   - un evento solo pasa a `published` si su recinto es `approved`;
   - un recinto `pending_review` solo lo ven su dueño (`organizer_id`) y los admins;
   - el catálogo que ve un organizador es `status = 'approved' OR organizer_id = <él>`.
7. **El seed no cambia.**
   - Todos sus recintos quedan `approved` por el default y con `organizer_id NULL`, y cumplen el CHECK de la Decisión 5.
   - Su borrador "Feria Familiar de Verano" tiene las cinco columnas rellenas, así que cumple el CHECK de la Decisión 2.
   - `buildSeedData` sigue compilando: los tipos `$inferInsert` de las columnas que pasan a nullable solo se vuelven más permisivos.
   - `ponytail:` el borrador sembrado sigue con valores de relleno ("Borrador sin descripción.", `doors_open_at = starts_at`). Para que refleje un borrador incompleto real, se cambiaría junto con F5 (Preguntas abiertas 4).
8. **Migración sin reset de `dev`.**
   - `npm run db:generate -- --name=data_gaps` genera `drizzle/0004_data_gaps.sql`. Contenido esperado:
     - `CREATE TYPE venue_status`;
     - 5 `ALTER COLUMN … DROP NOT NULL` en `events`;
     - `ADD COLUMN status … DEFAULT 'approved' NOT NULL` y `ADD COLUMN organizer_id` en `venues`, con su FK;
     - `CREATE TABLE saved_events` con su PK y 2 FKs;
     - los 2 `ADD CONSTRAINT … CHECK`.
   - No se edita a mano. Si drizzle-kit pregunta por renombres, la respuesta es "crear".
   - Se aplica con `npm run db:migrate` en `dev`. Las filas sembradas cumplen los dos CHECKs:
     - en `events`, las cinco columnas venían de `NOT NULL`;
     - en `venues`, `status` toma el default `approved`.

     La migración no falla y no hay que resetear.
   - La rama `test` la aplica sola: `testGlobalSetup` migra antes de truncar y sembrar.
9. **Tipos de los mappers (ajuste mínimo).** Con las columnas nullable, la consulta de `events.service.ts` devuelve `startsAt`, `imageUrl` y `doorsOpenAt` como `Date | null` / `string | null`, y `description` como `string | null`. Eso ya no encaja en `EventRecord`/`EventDetailRecord`, así que `tsc` falla.
   - Se cambian esos cuatro campos de los tipos a nullable.
   - `toEvent` (`startsAt`, `imageUrl`) y `toEventDetail` (`description`, `doorsOpenAt`) lanzan `Error(\`Evento publicado incompleto: ${slug}\`)` si alguno es `null`. Por el CHECK no puede pasar con `status = 'published'`.
   - `events.service.ts` solo se toca si `tsc` lo sigue exigiendo después de cambiar los tipos (no debería: el resultado del `select` ya es asignable).
   - `seating.service.ts` no lee esas columnas: solo hace el join por `venue_id`, y el `innerJoin` sigue igual.

## Requisitos
1. `lib/db/schema/enums.ts`: `export const venueStatusEnum = pgEnum("venue_status", ["pending_review", "approved"])`.
2. `lib/db/schema/venues.ts`, tabla `venues`:
   - `status: venueStatusEnum("status").notNull().default("approved")`;
   - `organizerId: uuid("organizer_id").references(() => organizers.userId)`;
   - el CHECK `venues_pending_has_owner_check` (Decisión 5);
   - importa `organizers` de `./identity`.
3. `lib/db/schema/events.ts`:
   - en `events`, `venueId`, `description`, `imageUrl`, `startsAt` y `doorsOpenAt` sin `.notNull()`, y el CHECK `events_draft_complete_check` (Decisión 2);
   - tabla nueva `savedEvents` (`"saved_events"`) según la Decisión 1.
4. Migración `drizzle/0004_data_gaps.sql` + `drizzle/meta/0004_snapshot.json` + entrada en `drizzle/meta/_journal.json`, generadas por drizzle-kit (Decisión 8). Una segunda ejecución de `npm run db:generate` no detecta cambios.
5. Rama Neon `dev`: `npm run db:migrate` aplica `0004` sin reset y sin errores. Una segunda ejecución no aplica nada.
6. `modules/events/utils/eventRecords.ts` según la Decisión 9. La salida de `getEvents`/`getEventBySlug` no cambia.
7. `docs/architecture/erd.md`:
   - convenciones: **26 tablas**;
   - diagrama:
     - entidad `saved_events`;
     - relaciones `users ||--o{ saved_events`, `events ||--o{ saved_events` y `organizers |o--o{ venues`;
     - `status` y `organizer_id` en `venues`;
   - tabla Enums: `venue_status`;
   - diccionario de `venues`:
     - `status`;
     - `organizer_id`;
     - descripción "catálogo del admin + recintos propios de organizadores";
     - CHECK;
   - diccionario de `events`: las 5 columnas `NULL` con la nota "obligatoria fuera de `draft`" y el CHECK;
   - diccionario: tabla `saved_events` (PK, notas de sincronización de la Decisión 1);
   - "Reglas que garantiza la BD": borrador completo al salir de `draft`, recinto pendiente con dueño y un favorito por usuario y evento;
   - "Reglas que garantiza la app": las tres de la Decisión 6, más "un borrador sin recinto no tiene `ticket_types`".
8. `docs/architecture/system-design.md`:
   - §6, tabla de permisos:
     - fila nueva "Crear recinto propio (queda en revisión; solo lo ve su dueño hasta su aprobación)" para `organizer`;
     - la fila "Gestionar catálogo de recintos" pasa a "Gestionar catálogo de recintos; aprobar recintos de organizadores" (`admin`, `super_admin`);
   - §6 "Reglas de roles": el organizador ve los recintos `approved` y los suyos;
   - §7.11:
     - un borrador solo exige título y categoría, y salir de `draft` exige fecha, apertura de puertas, recinto, imagen y descripción (CHECK);
     - la moderación incluye recintos: `pending_review` → `approved` por un admin;
     - un evento solo se publica con recinto `approved`;
   - §13: F4 dice "moderación de eventos y recintos".
9. No cambia ningún archivo de `app/`, `components/`, `lib/db/seed/`, `modules/*/index.ts` ni de los stores o schemas de `organizer` y `events`.

## Criterios de aceptación
- [ ] Dado el esquema, cuando se ejecuta `npm run db:generate` otra vez tras generar `0004`, entonces drizzle-kit informa que no hay cambios.
- [ ] Dado `drizzle/0004_data_gaps.sql`, cuando se lee, entonces contiene:
  - `CREATE TYPE "public"."venue_status" AS ENUM('pending_review', 'approved')`;
  - `CREATE TABLE "saved_events"` con PK `("user_id","event_id")` y FKs a `users` y `events`;
  - 5 `DROP NOT NULL` en `events` (`venue_id`, `description`, `image_url`, `starts_at`, `doors_open_at`);
  - `"status" "venue_status" DEFAULT 'approved' NOT NULL` y `"organizer_id" uuid` en `venues`, con FK a `organizers.user_id`;
  - los CHECKs `events_draft_complete_check` y `venues_pending_has_owner_check`.
- [ ] Dada la rama `dev` sembrada (sin reset), cuando se ejecuta `npm run db:migrate` dos veces, entonces la primera aplica `0004` sin error y la segunda no aplica nada.
- [ ] Después, `SELECT count(*) FROM venues WHERE status <> 'approved' OR organizer_id IS NOT NULL` devuelve 0.
- [ ] Dada la BD de test, cuando se inserta un evento `draft` con solo título, categoría, organizador, slug, `min_age` y `search_text` (sin fecha, apertura, recinto, imagen ni descripción), entonces se inserta sin error (`constraints.test.ts`, transacción revertida).
- [ ] Dada la BD de test, cuando se inserta ese mismo evento con `status = 'published'`, o se actualiza un evento publicado del seed con `starts_at = NULL`, entonces falla el CHECK (23514).
- [ ] Dada la BD de test, cuando se inserta dos veces el mismo `(user_id, event_id)` en `saved_events`, entonces la segunda falla por clave duplicada (23505). La primera, sola, se inserta sin error.
- [ ] Dada la BD de test, cuando se inserta un recinto sin indicar `status`, entonces queda `approved`; y todos los recintos del seed son `approved`.
- [ ] Dada la BD de test, cuando se inserta un recinto `pending_review` sin `organizer_id`, entonces falla el CHECK (23514). Con un `organizer_id` del seed, se inserta sin error.
- [ ] Dado `toEvent` con `startsAt: null` o `imageUrl: null`, o `toEventDetail` con `description: null` o `doorsOpenAt: null`, cuando se llama, entonces lanza un `Error` que nombra el slug (`eventRecords.test.ts`). Los casos existentes de ese archivo siguen pasando sin cambios.
- [ ] Dados `getEvents`, `getEventBySlug` y `getVenueMapBySlug`, cuando se ejecutan sus tests de equivalencia contra la BD de test migrada con `0004`, entonces pasan sin cambiar ninguna aserción.
- [ ] Dados `docs/architecture/erd.md` y `docs/architecture/system-design.md`, cuando se leen, entonces cumplen los requisitos 7 y 8: 26 tablas, 22 enums, `saved_events` documentada y reglas de recintos y borradores en §6 y §7.11.
- [ ] Dado el cambio completo, cuando se ejecuta `git diff --stat main`, entonces solo aparecen los archivos del plan de tareas (y esta spec).
- [ ] Dado el cambio completo, cuando se ejecutan `npm run lint`, `npx tsc --noEmit`, `npx vitest run` con `DATABASE_URL_TEST` y `npm run build`, entonces pasan sin errores.
- [ ] Los 1346 tests existentes siguen verdes, más los nuevos.

## Diseño técnico

### Rutas (`app/`)
Sin cambios.

### Componentes
Ninguno (sin UI; no aplica shadcn).

### Archivos por capa

| Archivo | Estado | Contenido |
|---|---|---|
| `lib/db/schema/enums.ts` | modificar | `venueStatusEnum` (R1). |
| `lib/db/schema/venues.ts` | modificar | `venues.status`, `venues.organizerId`, CHECK `venues_pending_has_owner_check` (R2). |
| `lib/db/schema/events.ts` | modificar | 5 columnas nullable + CHECK `events_draft_complete_check`; tabla `savedEvents` (R3). |
| `drizzle/0004_data_gaps.sql`, `drizzle/meta/0004_snapshot.json`, `drizzle/meta/_journal.json` | generados | `npm run db:generate -- --name=data_gaps` (R4). |
| `lib/db/constraints.test.ts` | modificar | Casos nuevos de integración (ver Tests). Reutiliza `errorCode` y `describeWithDb`. |
| `modules/events/utils/eventRecords.ts` | modificar | Campos nullable + guardas (Decisión 9). |
| `modules/events/utils/eventRecords.test.ts` | modificar | Casos de las guardas. |
| `modules/events/services/events.service.ts` | modificar solo si `tsc` lo exige | Sin cambios de lógica ni de consultas. |
| `docs/architecture/erd.md` | modificar | R7. |
| `docs/architecture/system-design.md` | modificar | R8. |

### Esquema (forma esperada, Drizzle 0.45)
```ts
// lib/db/schema/enums.ts
export const venueStatusEnum = pgEnum("venue_status", ["pending_review", "approved"]);

// lib/db/schema/venues.ts — dentro de venues (pasa a tener tercer argumento con el CHECK)
status: venueStatusEnum("status").notNull().default("approved"),
organizerId: uuid("organizer_id").references(() => organizers.userId),
// (t) => [check("venues_pending_has_owner_check", sql`${t.status} = 'approved' OR ${t.organizerId} IS NOT NULL`)]

// lib/db/schema/events.ts — events
venueId: uuid("venue_id").references(() => venues.id),
description: text("description"),
imageUrl: text("image_url"),
startsAt: timestamptz("starts_at"),
doorsOpenAt: timestamptz("doors_open_at"),
// check("events_draft_complete_check", sql`${t.status} = 'draft' OR (${t.venueId} IS NOT NULL AND ${t.description} IS NOT NULL AND ${t.imageUrl} IS NOT NULL AND ${t.startsAt} IS NOT NULL AND ${t.doorsOpenAt} IS NOT NULL)`)

export const savedEvents = pgTable(
  "saved_events",
  {
    userId: uuid("user_id").notNull().references(() => users.id),
    eventId: uuid("event_id").notNull().references(() => events.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.eventId] })],
);
```

`identity.ts` no importa `venues.ts`, así que la referencia `venues → organizers` no crea un ciclo nuevo. Y si lo creara, `references(() => …)` es perezoso (data-foundation, Decisión 5).

### Mappers
```ts
// modules/events/utils/eventRecords.ts
export type EventRecord = { /* … */ startsAt: Date | null; imageUrl: string | null; /* … */ };
export type EventDetailRecord = EventRecord & { description: string | null; doorsOpenAt: Date | null; /* … */ };
// toEvent / toEventDetail: si falta un campo obligatorio de un evento publicado →
//   throw new Error(`Evento publicado incompleto: ${record.slug}`)
```

### Contrato de API
Ninguno nuevo. Las firmas públicas de `events` y `seating` no cambian.

## Reutilización
- La convención de `lib/db/schema/enums.ts` (`createdAt`, `timestamptz`, `pgEnum`) y el estilo de CHECKs con nombre de `venues.ts` y `events.ts`.
- `errorCode(run)` y `describeWithDb` de `lib/db/constraints.test.ts` / `lib/db/testDb.ts`, para los casos nuevos (transacción revertida).
- `testGlobalSetup` ya migra, trunca todas las tablas de `public` (incluida la nueva) y siembra. No se toca.
- Scripts `db:generate`/`db:migrate` existentes. No hay dependencias nuevas.

## Tests

**Unitarios (sin BD)**, en `modules/events/utils/eventRecords.test.ts`:
- `toEvent` lanza con `startsAt: null` y con `imageUrl: null`, y el mensaje incluye el slug.
- `toEventDetail` lanza con `description: null` y con `doorsOpenAt: null`.
- Los casos existentes no cambian.

**Integración (Postgres, rama `test`)**, en `lib/db/constraints.test.ts`, cada caso en una transacción revertida con `errorCode`. Los ids se toman del seed (categoría, organizador, un evento publicado, un usuario).
- **Borrador:** insertar un `draft` sin `starts_at`, `doors_open_at`, `venue_id`, `image_url` ni `description` → sin error (`errorCode` devuelve `undefined`).
- **Evento incompleto fuera de borrador:** el mismo evento con `status: "published"` → 23514. `UPDATE` de un evento publicado del seed a `starts_at = NULL` → 23514.
- **`saved_events`:** insertar `(usuario, evento)` dos veces en la misma transacción → 23505.
- **`venues.status`:** insertar un recinto sin `status` con `.returning({ status })` → `approved`. Esto necesita un helper que devuelva el valor, o un `db.transaction` con `tx.rollback()` en línea. Además, `select` de los recintos sembrados → todos `approved` y con `organizer_id` `NULL`.
- **Recinto pendiente:** `pending_review` sin `organizer_id` → 23514; con el `organizer_id` de un organizador del seed → sin error.

**Sin cambios de aserciones:** el resto del suite, en especial `seed.test.ts` (idempotencia y conteos), `buildSeedData.test.ts`, `events.service.test.ts` y `seating.service.test.ts`.

## Plan de tareas

### Fase 1 — Modelo de datos (≈ 12 archivos, una sesión)
- [ ] T1 — Esquema (enum, `venues`, `events`, `saved_events`) y migración `0004` generada. Aplicarla en la rama Neon `dev` (`npm run db:migrate` dos veces, sin reset). Comprobar que un segundo `db:generate` no detecta cambios y que `SELECT count(*) FROM venues WHERE status <> 'approved'` = 0 · archivos: `lib/db/schema/enums.ts`, `lib/db/schema/venues.ts`, `lib/db/schema/events.ts`, `drizzle/0004_data_gaps.sql`, `drizzle/meta/0004_snapshot.json`, `drizzle/meta/_journal.json` · depende de: — · secuencial (base: `lib/`)
- [ ] T2 — Mappers de `events` con columnas nullable y sus guardas, con unit tests. `npx tsc --noEmit` sin errores · archivos: `modules/events/utils/eventRecords.ts`, `modules/events/utils/eventRecords.test.ts` (y `modules/events/services/events.service.ts` solo si `tsc` lo exige) · depende de: T1 · paralelo con T3 y T4
- [ ] T3 — Tests de integración de las restricciones nuevas contra la rama `test` · archivos: `lib/db/constraints.test.ts` · depende de: T1 · paralelo con T2 y T4
- [ ] T4 — Documentación de arquitectura (ERD y system-design) · archivos: `docs/architecture/erd.md`, `docs/architecture/system-design.md` · depende de: T1 (nombres finales de constraints) · paralelo con T2 y T3

Cierre (reviewer): `npm run lint`, `npx tsc --noEmit`, `npx vitest run` con `DATABASE_URL_TEST` (1346 + nuevos) y `npm run build` contra `dev` migrada.

## Preguntas abiertas
1. **Datos parciales del formulario que no caben en las tablas.** Por defecto (Decisión 4), un borrador guarda solo lo que es una fila válida.
   - Sin recinto completo (nombre, ciudad y dirección), `venue_id` queda `NULL` y se pierde el texto escrito del lugar.
   - Las zonas incompletas (sin precio, sin cantidad) no se guardan.
   - Esto coincide con lo que hace hoy `toOrganizerEvent` ("un borrador guarda solo lo interpretable") y supone que en F5 el formulario elegirá un recinto del catálogo o creará uno propio completo.

   ¿Se acepta, o el borrador debe conservar el formulario tal cual se escribió? Esa alternativa necesitaría, p. ej., una columna `jsonb` de borrador en `events`.
2. **Moderación conjunta evento + recinto.** La regla documentada es solo "un evento se publica únicamente con recinto `approved`". Por defecto, el organizador puede enviar a revisión un evento con recinto propio `pending_review`, y el admin aprueba primero el recinto y luego el evento (F4/F5). ¿Se prefiere bloquear el envío a revisión hasta que el recinto esté aprobado?
3. **Rechazo de un recinto.** `venue_status` solo tiene `pending_review` y `approved`, como pidió el diseño. Por defecto, un recinto rechazado sigue `pending_review` y el organizador lo corrige o elige otro. ¿Hace falta `rejected` (con motivo, como `events.review_note`)? Añadirlo después es un `ALTER TYPE … ADD VALUE`.
4. **Borrador del seed.** Sigue con descripción y apertura de puertas de relleno (Decisión 7). ¿Se cambia a un borrador realmente incompleto (`NULL`) en F5, o se deja?
5. **Favoritos al anonimizar.** Por defecto, en F2 "Eliminar mi cuenta" borra las filas de `saved_events` del usuario (no son datos contables). ¿De acuerdo?
6. **Número de tablas.** El pedido habla de 27 tablas. Con este diseño son 26: las 25 de F1 más `saved_events`. ¿Falta alguna tabla, o el 27 era un error?
