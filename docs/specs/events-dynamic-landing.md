# Landing dinámica, destacados y categorías desde la BD (incluye Café, Drinks y Bares)

- Módulo: events (también organizer, checkout, lib/db y components/shared)
- Estado: aprobado

## Objetivo
Hoy las categorías viven en tres sitios a la vez: la tabla `categories`, el enum `eventCategorySchema`
(`modules/events/schemas/events.schema.ts`) y `EVENT_CATEGORIES` / `EVENT_CATEGORY_LABELS`
(`modules/events/data/categories.ts`). Para añadir una categoría hay que cambiar TypeScript y volver a desplegar, y una
fila con un slug que no esté en el enum rompe `getEvents()` y `getEventForEdit()`.

En destacados, `getFeaturedEvents()` hace `getEvents().filter(featured)`: no filtra por fecha, ordena por
`createdAt`, no tiene límite y repite la consulta. El Hero no contempla una lista vacía y nadie puede marcar un evento
como destacado.

Esta spec:
- hace de la BD la fuente de verdad de las categorías (sin enum en el código);
- **añade las categorías Café (`cafe-shop`), Drinks (`drink`) y Bares (`bar-shop`)** con una migración de datos
  (sustituye a la spec `event-categories-drinks.md`, que se descarta);
- permite a admin y super_admin destacar eventos;
- hace la landing dinámica (Hero, próximos, grilla de categorías) y fija la regla de «Últimas entradas» al 10 %.

## Alcance
- Incluye (5 fases, una sola aprobación):
  - **F1:** contrato `categorySlugSchema`/`EventCategory`, `listEventCategories`, `categoryName` en el evento público,
    seed con `DEFAULT_EVENT_CATEGORIES`, **migración `0009` con las 3 categorías nuevas** e iconos.
  - **F2:** `/eventos` con categorías dinámicas, `SiteShell` async (footer desde BD, header con enlace «Eventos»),
    checkout con `categoryName`.
  - **F3:** formulario del organizador con categorías de la BD.
  - **F4:** destacar eventos (servicio, acción, `FeaturedToggle` en el panel).
  - **F5:** landing dinámica, `LOW_STOCK_RATIO = 0.1`, limpieza de `categories.ts` y documentación.
- No incluye: CRUD de categorías, orden manual de destacados (`featured_sort_order`), iconos administrables,
  categorías activas/inactivas, programar destacados, analítica del Hero, filtrar eventos pasados en `/eventos`,
  edición ampliada (`event-editing.md`), correos (`event-change-notifications.md`), recinto manual
  (`organizer-manual-venue.md`).

## Decisiones tomadas
1. **BD como fuente de verdad.** `eventCategorySchema` pasa a `z.object({ id: z.uuid(), slug: categorySlugSchema,
   name: z.string().min(1) })`, con `categorySlugSchema = z.string().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)`.
   `eventSchema.category` usa `categorySlugSchema` y se añade `categoryName`.
2. **`listEventCategories(database = db)`** en `modules/events/services/categories.service.ts`: `id, slug, name`,
   `ORDER BY name`, reordenado en JS con `Intl.Collator("es")` (el collation de Neon pondría «Ópera» tras la «Z»),
   envuelto en React `cache()`, exportado por la misma entrada que `getEvents`.
3. **Categorías nuevas (Ronald):** `cafe-shop` «Café» (icono `Coffee`), `drink` «Drinks» (`Martini`), `bar-shop`
   «Bares» (`Beer`). Se insertan con una **migración de datos** `drizzle/0009_*.sql` (`drizzle-kit generate
   --custom`): `INSERT … ON CONFLICT (slug) DO NOTHING`, con los ids deterministas del seed (`seedUuid("category:<slug>")`
   calculados una vez y escritos literal). El seed no corre en Production, por eso va por migración.
   `DEFAULT_EVENT_CATEGORIES` (seed) incluye las 9.
4. **Iconos:** `CATEGORY_ICONS: Record<string, LucideIcon>` con las 9 categorías conocidas y `Tag` como respaldo para
   cualquier categoría nueva.
5. **Seed:** `lib/db/seed/defaultCategories.ts` con `DEFAULT_EVENT_CATEGORIES`; `SEED_OWNED_COLUMNS.categories = []`
   (upsert `ON CONFLICT DO NOTHING`, no pisa nombres editados en BD). `EVENTS_MOCK` añade `categoryName`; un test
   comprueba que cada categoría del mock existe en `DEFAULT_EVENT_CATEGORIES`.
6. **Filtros `/eventos`:** `categoria` = `multiValue(categorySlugSchema)`; slug válido inexistente → 0 resultados; mal
   formado → se descarta. `getFacetCounts(events, filters, categories)` → `Record<string, number>` con 0 por categoría;
   `getActiveFilterChips(filters, categories)` usa el `name` (o el slug si no existe). `pageTitle` cae a «Explora
   eventos» si la categoría no existe.
7. **Shell:** `SiteShell` pasa a server component async que lee `listEventCategories()` y se las pasa a `SiteFooter`
   (lista todas). El nav desktop de `SiteHeader` sustituye los 6 enlaces de categoría por un único «Eventos».
8. **Formulario del organizador:** sin `EVENT_CATEGORY_OPTIONS`; `category` = `categorySlugSchema` («Elige una
   categoría»); `OrganizerEventForm` recibe `categories`; `EMPTY_EVENT_DRAFT.category = ""`; `getCategoryId` lanza
   `EventDraftError("invalid_category", "Categoría no válida")`; `getEventForEdit` valida con `categorySlugSchema`; las
   páginas `nuevo` y `editar` cargan `listEventCategories()` en el `Promise.all` de los recintos.
9. **Checkout:** `orders.service` selecciona `categories.name`, quita el cast `as EventCategory` y expone
   `categoryName`.
10. **Destacar (backend):** `setEventFeatured(actor, eventId, featured)` en
    `modules/organizer/services/eventFeatured.service.ts` (exige `roleCan(role, "events:manageAny")`; `UPDATE …
    RETURNING slug` sin restringir estado; sin fila → `not_found`). Acción `setEventFeaturedAction(id, featured)` en
    `actions/eventFeatured.actions.ts`, patrón de `eventModeration.actions.ts`: `requirePermission("events:manageAny")`,
    zod `{ id: uuid, featured: boolean }`, `revalidatePath("/")`.
11. **Destacar (UI):** `featured` en `ManagedEvent`/`listManagedEvents`; hook `useSetEventFeatured` que invalida
    `managedEventsBaseKey`; `FeaturedToggle` (botón `aria-pressed`, estrella, «Destacar» / «Quitar destacado»). En la
    tabla entra como `DropdownMenuItem` del menú «Más acciones» (ya existe desde #29); en las tarjetas como botón con
    texto; en `[id]/editar`, en la cabecera para admin en cualquier estado. Feedback con el `Alert` de aviso de
    `OrganizerEventsList` o un `aria-live` en editar (no hay toasts). Visible solo para `events:manageAny` con
    `canMutate`; `hasEventRowActions` se ajusta para que el admin tenga acciones en todos los estados.
12. **Consultas públicas:** `selectPublishedEvents({ where, orderBy, limit })`.
    `getFeaturedEvents({ now })`: `featured AND status='published' AND starts_at >= now`, `starts_at ASC`,
    `FEATURED_EVENTS_LIMIT = 5`. `getUpcomingEvents({ now })`: `starts_at >= now`, `starts_at ASC` (solo landing;
    `/eventos` no cambia). Usan el índice `events_status_starts_at_idx`.
13. **Landing:** `Promise.all([listEventCategories(), getUpcomingEvents(), getFeaturedEvents()])`.
    `HeroCarousel` mantiene siempre h1 y subtítulo; 0 eventos → sin `Carousel`; 1 → sin flechas, puntos, autoplay ni
    loop; 2–5 → como hoy (autoplay respetando `prefers-reduced-motion`); badge con `categoryName`.
    `FeaturedEventsRail` → `null` si está vacío. `CategoryGrid({ categories })` enlaza a `/eventos?categoria=<slug>`.
    `UpcomingEvents({ events, categories })`: chips «Todos» + categorías de BD.
14. **Disponibilidad:** `LOW_STOCK_RATIO = 0.1` (`utils/availability.ts`): «Últimas entradas» con ≤ 10 %,
    «Disponible» con más, «Agotado» con 0.
15. **Compilación entre fases:** en F1 `EVENT_CATEGORY_LABELS` se retipa a `Record<string, string>` para que los
    consumidores aún no migrados compilen; se elimina en F5 junto con `modules/events/data/categories.ts` y sus
    re-exports (`index.ts`, `format.ts`), tras confirmar con grep que no quedan usos.

## Autorización
- Destacar: solo `admin` y `super_admin` (`events:manageAny`). Un organizador no ve la acción y la acción lo redirige.
- El resto no cambia: crear/editar según `events:manageOwn`; el selector de organizador solo lista organizadores
  registrados y aprobados.

## Impacto en la base de datos
- **Esquema:** sin cambios. `categories(id, slug UNIQUE, name, …)`, `events.category_id NOT NULL → categories.id`
  (`ON DELETE no action`) y `events.featured boolean NOT NULL DEFAULT false` ya existen.
- **Datos:** migración `0009` con 3 `INSERT` idempotentes en `categories`.
- **Escrituras nuevas:** solo `UPDATE events SET featured, updated_at` desde `setEventFeatured`. No hay triggers.
- **Validación manual:** `SELECT slug, name FROM categories` en dev, `test` y Production para comprobar que todos los
  slugs cumplen `categorySlugSchema` antes del merge.

## Criterios de aceptación
### F1
- [ ] `listEventCategories` devuelve las 9 categorías en orden alfabético español.
- [ ] `npm run db:migrate` inserta Café, Drinks y Bares con los ids deterministas; repetirla no hace nada; `db:seed`
  sobre una BD migrada no falla.
- [ ] Tarjeta, detalle, Hero y related muestran `categoryName`.
### F2
- [ ] `/eventos?categoria=cafe-shop` filtra; `?categoria=inexistente` → 0 resultados sin error; los facets cuentan
  todas las categorías de BD.
- [ ] El footer lista todas las categorías; el header muestra un único enlace «Eventos».
- [ ] La confirmación de compra muestra el nombre de la categoría.
### F3
- [ ] El Select de Crear/Editar lista las categorías de BD (incluidas las 3 nuevas) y guardar con cualquiera funciona;
  un slug inexistente → «Categoría no válida».
### F4
- [ ] Admin y super_admin destacan y quitan destacado desde el listado (menú «Más acciones» en tabla, botón en
  tarjetas) y desde editar; un organizador no ve la acción y la acción lo rechaza; un draft puede quedar destacado.
### F5
- [ ] El Hero muestra como máximo 5 destacados publicados futuros, por fecha; un draft o un evento pasado no aparecen;
  con 0 no hay carrusel ni sección; con 1 no hay flechas ni puntos.
- [ ] `INSERT INTO categories (slug, name) VALUES ('tecnologia', 'Tecnología')` aparece en grilla (icono `Tag`),
  filtros, chips, footer y formulario sin cambiar código.
- [ ] Disponibilidad: 10/100 «Últimas entradas», 11/100 «Disponible», 0 «Agotado».
- [ ] `modules/events/data/categories.ts` ya no existe.
- [ ] Cada fase: `npx vitest run`, `npm run lint` y `npm run build` pasan.

## Diseño técnico
Ver Decisiones 1–15. Archivos principales: `modules/events/schemas/events.schema.ts`, `types/events.types.ts`,
`services/categories.service.ts` (nuevo), `services/events.service.ts`, `utils/eventRecords.ts`,
`utils/eventFilters.ts`, `utils/availability.ts`, componentes de `/eventos` y landing, `components/shared/SiteShell.tsx`,
`SiteHeader.tsx`, `SiteFooter.tsx`, `modules/checkout/services/orders.service.ts`, `modules/organizer/*` (schema,
form, servicios de borradores y destacados), `lib/db/seed/*`, `drizzle/0009_*.sql`.

## Reutilización
`EventCoverImage`, `requirePermission`, `roleCan`, `events:manageAny`, `EventDraftError`, `invalidInput`,
`toEventActionFailure`, `managedEventsBaseKey`, `revalidatePath`, el `Alert` de `OrganizerEventsList`, el
`DropdownMenu` de `EventRowActions`, `Carousel`, `ToggleGroup`, `seedUuid`, `EVENTS_MOCK`.

## Tests
- Servicios con BD de test (`describeWithDb`, transacción): `listEventCategories` (orden con tildes), `getFeaturedEvents`
  (draft destacado, publicado pasado, > 5, orden), `getUpcomingEvents`, `setEventFeatured` (admin, super_admin,
  organizer rechazado, draft, `not_found`), `getCategoryId` → `invalid_category`, migración `0009`.
- Unitarios: `categorySlugSchema`, `eventFilters` con categorías dinámicas, `availability` (10/11/0 %), seed
  (`DEFAULT_EVENT_CATEGORIES`, mock coherente).
- Componentes: `HeroCarousel` (0/1/N), `FeaturedEventsRail` vacío, `CategoryGrid` con respaldo `Tag`,
  `UpcomingEvents`, `CategoryFilter`/`EventFiltersForm`, `FeaturedToggle`, `OrganizerEventForm` con categorías de BD.

## Entrega: flujo de promoción y sincronización
1. Rama `claude/events-dynamic-landing` desde `origin/main` actualizado.
2. Validación local. 3. `npx vitest run` + `npm run lint` + `npm run build` por fase.
4. **Migración de datos `0009`:** primero dev (`npm run db:migrate`), luego Neon `test`.
5. Publicar `preview/events-dynamic-landing` = `origin/main` + solo esta feature (commit vacío de disparo solo ahí).
6. Validación manual de Ronald en el Preview (lista de la sección Verificación). 7. Sin merge sin su aprobación.
8. Antes de Production: declarar el cambio de BD (3 `INSERT` en `categories`, sin esquema); branch de backup de Neon
   `production`; aplicar `0009` en Production; verificar 10 migraciones, 9 categorías y que todos los slugs cumplen el
   patrón. Sin variables nuevas.
9. Merge tras Preview aprobado y migración aplicada. 10. Production Ready.
11. Smoke test: landing con Hero/categorías, `/eventos?categoria=cafe-shop` 200, destacar un evento como admin.
12. Borrar ramas temporales y sincronizar `preview/qa` con `origin/main`.

Sincronización: Preview = `origin/main` + esta feature; Neon `test` ≥ migraciones de `production`; nunca Neon
`production` como BD de Preview; hotfixes a los previews activos.

**Orden con otras specs:** esta va primero. `event-editing.md` y `organizer-manual-venue.md` tocan
`OrganizerEventForm` y `eventDrafts.service.ts`, y numeran sus migraciones después de `0009`.

## Plan de tareas
### F1 — Contrato, servicio, seed, categorías nuevas y `categoryName`
- [x] T1. `categorySlugSchema`, `EventCategory`, `listEventCategories` (+ tests).
- [x] T2. `categoryName` en el evento público, mapper y `EventCard`, `HeroCarousel` (badge), `EventDetailHeader`,
  `RelatedEvents`.
- [x] T3. `DEFAULT_EVENT_CATEGORIES` (9), migración `0009`, `EVENTS_MOCK`, iconos (`CATEGORY_ICONS` + `Tag`) y tests
  del seed y la migración.
### F2 — `/eventos`, shell y checkout
- [x] T4. Schema de filtros y `eventFilters.ts` dinámicos (+ tests).
- [x] T5. `CategoryFilter`, `EventFiltersForm`, `EventFiltersSidebar`, `EventFiltersSheet`, página/metadata de
  `/eventos`.
- [x] T6. `SiteShell` async, footer desde BD, header con «Eventos».
- [x] T7. Checkout con `categoryName`.
### F3 — Formulario del organizador
- [x] T8. Schema, `organizerEventForm`, `eventPreview`, `OrganizerEventForm` con `categories`.
- [x] T9. `getCategoryId` → `invalid_category`, `getEventForEdit`, páginas `nuevo`/`editar` (+ tests).
### F4 — Destacados
- [x] T10. `setEventFeatured`, `setEventFeaturedAction` (+ tests).
- [x] T11. `featured` en `ManagedEvent`, `useSetEventFeatured`, `FeaturedToggle` (+ test), listado y editar.
### F5 — Landing, 10 % y limpieza
- [x] T12. `selectPublishedEvents`, `getFeaturedEvents`, `getUpcomingEvents` (+ tests).
- [x] T13. `HeroCarousel` 0/1/N, `FeaturedEventsRail`, `app/(site)/page.tsx`.
- [x] T14. `CategoryGrid` dinámico y `UpcomingEvents` con chips de BD.
- [x] T15. `LOW_STOCK_RATIO`, documentación (`design-system/ticketera/pages/{landing,events-list,organizer}.md`) y
  borrado de `categories.ts`.

## Verificación
Por fase: `npx vitest run modules/events modules/organizer modules/checkout lib/db/seed`, `npm run lint`,
`npm run build`. Manual (dev): las 9 categorías en grilla, filtros, chips, footer y formulario; `INSERT` de
`tecnologia` aparece sin cambiar código; `/eventos?categoria=inexistente` → 0 sin error; destacar como admin y
super_admin; Hero ≤ 5 por fecha, sin drafts ni pasados; 0 destacados → sin sección, 1 → sin flechas; disponibilidad
10/11/0 %; los enlaces `/eventos/<slug>` siguen funcionando.

## Preguntas abiertas
(ninguna)
