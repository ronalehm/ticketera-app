# Listado y búsqueda de eventos `/eventos` (UI con mock data)

- Módulo: events
- Estado: aprobado

## Objetivo
Dar destino real al buscador de la landing, a los enlaces de categorías del header/landing y a "Ver todos": una página `/eventos` que lista los eventos y los filtra por texto, ciudad, fecha, precio y categoría a partir de la URL, para que los resultados se puedan compartir y volver atrás sin perder filtros.

## Alcance
- Incluye:
  - Ruta `/eventos` (Server Component) que lee `searchParams` (`q`, `ciudad`, `fecha`, `precio`, `categoria`), los valida con zod y filtra los eventos en el servidor.
  - Cabecera con título h1 "Eventos" (o "Conciertos", etc. si hay categoría) y número de resultados.
  - Buscador reutilizando `EventSearchBar` precargado con los filtros actuales.
  - Chips de categoría como enlaces que conservan los demás filtros.
  - Grilla de `EventCard`, estado vacío con "Limpiar filtros", y orden por fecha ascendente.
  - Archivo de diseño de página `design-system/ticketera/pages/events-list.md`.
- No incluye:
  - Paginación o scroll infinito (12 eventos mock), ordenamiento configurable, filtros por rango de fechas, mapa, filtros en cliente sin recarga.
  - Detalle del evento (spec aparte: `docs/specs/events-detail.md`).

## Requisitos
1. `app/eventos/page.tsx` lee `searchParams` (Promise en Next 16) y solo compone: parseo y filtrado viven en el módulo.
2. Parámetros inválidos o desconocidos se ignoran (sin error): p. ej. `precio=xyz` equivale a sin filtro de precio.
3. Reglas de filtrado (todas se combinan con AND):
   - `q`: coincide si el texto aparece en título, lugar o ciudad, sin distinguir mayúsculas ni tildes ("peru" encuentra "Perú").
   - `ciudad`: igualdad exacta con una de las ciudades soportadas (Lima, Arequipa, Cusco, Trujillo, Piura).
   - `fecha` (`YYYY-MM-DD`): eventos que ocurren **ese día o después**, comparando en zona `America/Lima`.
   - `precio` sobre `priceFrom`: `gratis` = 0; `0-50` = ≤ 50; `50-100` = > 50 y ≤ 100; `100-200` = > 100 y ≤ 200; `200-mas` = > 200.
   - `categoria`: una de las categorías del schema.
4. Las ciudades y los rangos de precio se definen una sola vez en el módulo y los usan tanto `EventSearchBar` como el filtrado (hoy están dentro de `EventSearchBar`).
5. `EventSearchBar` acepta valores iniciales opcionales y, en `/eventos`, conserva la categoría activa con un `<input type="hidden" name="categoria">`.
6. Chips de categoría: "Todas" + 6 categorías; cada chip es un enlace a `/eventos` con los filtros actuales y la categoría cambiada (o quitada en "Todas"); el activo usa `aria-current="page"` y estilo `bg-primary text-primary-foreground`.
7. Metadata: título "Eventos | Mentec Tickets" (o "Conciertos | Mentec Tickets" con categoría).
8. Accesibilidad: un solo `<h1>`; el contador de resultados es texto visible ("5 eventos encontrados"); chips navegables con teclado y foco visible.
9. Responsive sin scroll horizontal; chips con scroll horizontal propio en móvil; grilla 1/2/3/4 columnas como en la landing.

## Criterios de aceptación
- [ ] Dado `/eventos`, cuando carga, entonces muestra h1 "Eventos", "12 eventos encontrados" y las 12 tarjetas ordenadas por fecha.
- [ ] Dado `/eventos?categoria=teatro`, entonces el h1 es "Teatro", solo hay eventos de teatro, el chip "Teatro" está activo y el `<title>` es "Teatro | Mentec Tickets".
- [ ] Dado `/eventos?q=estadio`, entonces aparecen solo los eventos cuyo título, lugar o ciudad contiene "estadio" (sin importar mayúsculas/tildes).
- [ ] Dado `/eventos?ciudad=Cusco&precio=0-50`, entonces solo aparecen eventos de Cusco con `priceFrom` ≤ 50.
- [ ] Dado `/eventos?fecha=2027-01-01`, entonces no aparece ningún evento anterior al 1 de enero de 2027 (hora de Lima).
- [ ] Dado `/eventos?precio=xyz&ciudad=Tokio`, entonces se ignoran los filtros inválidos y se listan todos los eventos.
- [ ] Dado filtros sin resultados, entonces se muestra "No encontramos eventos con esos filtros" y un enlace "Limpiar filtros" a `/eventos`.
- [ ] Dado el buscador de la landing con "Lima" y "Hasta S/ 50", cuando se envía, entonces `/eventos` muestra los resultados filtrados y el buscador aparece precargado con esos valores.
- [ ] Dado `/eventos?ciudad=Lima&categoria=teatro`, cuando se pulsa el chip "Conciertos", entonces navega a `/eventos?ciudad=Lima&categoria=conciertos`.
- [ ] Dado los enlaces de categorías del header y de "Explora por categoría", y "Ver todos", entonces llevan a esta página con resultados (ya apuntan a `/eventos?...`).
- [ ] Dado `npx vitest run`, entonces pasan los tests nuevos y existentes; `npm run lint` y `npm run build` sin errores.

## Diseño técnico
- Rutas (app/):
  - `app/eventos/page.tsx`: `generateMetadata({ searchParams })` y página async: `parseEventFilters(await searchParams)` → `getEvents()` → `filterEvents(...)` → componentes. Consultar `node_modules/next/dist/docs/` (searchParams como Promise, rendering dinámico).
- Datos (`modules/events/data/searchOptions.ts`, nuevo):
  - `CITIES = ["Lima", "Arequipa", "Cusco", "Trujillo", "Piura"] as const`.
  - `PRICE_RANGES` = `[{ value: "gratis", label: "Gratis" }, { value: "0-50", label: "Hasta S/ 50" }, { value: "50-100", label: "S/ 50 – S/ 100" }, { value: "100-200", label: "S/ 100 – S/ 200" }, { value: "200-mas", label: "Más de S/ 200" }] as const` (mismos valores que hoy en `EventSearchBar`).
- Schema (`modules/events/schemas/eventFilters.schema.ts`, nuevo):
  ```ts
  // Cada campo inválido cae a undefined (no rompe la página).
  export const eventFiltersSchema = z.object({
    q: z.string().trim().min(1).optional().catch(undefined),
    ciudad: z.enum(CITIES).optional().catch(undefined),
    fecha: z.iso.date().optional().catch(undefined),
    precio: z.enum(PRICE_RANGE_VALUES).optional().catch(undefined),
    categoria: eventCategorySchema.optional().catch(undefined),
  });
  export type EventFilters = z.infer<typeof eventFiltersSchema>;
  ```
  (Si un param llega como array, se toma el primero.)
- Utils (`modules/events/utils/eventFilters.ts`, nuevo):
  - `parseEventFilters(searchParams: Record<string, string | string[] | undefined>): EventFilters`.
  - `filterEvents(events: Event[], filters: EventFilters): Event[]` — reglas del requisito 3, resultado ordenado por `startsAt` ascendente.
  - `buildEventsHref(filters: EventFilters): string` — `/eventos` + `URLSearchParams` sin vacíos.
- Componentes (`modules/events/components/`):
  - existente `EventSearchBar.tsx` (modificar): usa `CITIES`/`PRICE_RANGES` de `searchOptions.ts`; nueva prop opcional `defaultValues?: EventFilters` que precarga q/ciudad/fecha/precio y añade el hidden `categoria` si existe.
  - nuevo `CategoryFilter.tsx` (server): chips-enlace "Todas" + categorías usando `buildEventsHref`.
  - nuevo `EventsResults.tsx` (server): contador, grilla de `EventCard`, estado vacío con "Limpiar filtros".
  - existentes: `EventCard`, `EVENT_CATEGORY_LABELS`, `getEvents`, `buttonVariants`.
- `modules/events/index.ts`: exporta `CategoryFilter`, `EventsResults`, `parseEventFilters`, `filterEvents`, tipo `EventFilters`. **Archivo compartido con `events-detail`: se edita en tareas secuenciales, nunca en paralelo.**
- Contrato de API: no aplica (mock). Cuando exista API, `filterEvents` se reemplaza por query params al backend con el mismo `EventFilters`.

## Reutilización
- `EventSearchBar` (se extiende, no se duplica), `EventCard`, `getEvents`, `eventCategorySchema`, `EVENT_CATEGORY_LABELS`, `SectionHeader` si encaja, `buttonVariants`, `cn`.
- Normalización de texto con `String.prototype.normalize("NFD")` nativo; fechas con `Intl.DateTimeFormat` (zona Lima) como en `formatEvent.ts`.
- Sin dependencias nuevas.

## Tests
- `modules/events/utils/eventFilters.test.ts`:
  - `parseEventFilters`: valores válidos; inválidos → `undefined`; arrays → primer valor; vacíos → `undefined`.
  - `filterEvents`: cada filtro por separado (q con tildes/mayúsculas sobre título, lugar y ciudad; ciudad; fecha "ese día o después" en zona Lima, incluido un evento a las 22:00 Lima que en UTC es el día siguiente; cada rango de precio incluido límites 50/100/200 y gratis; categoría), combinación AND y orden por fecha.
  - `buildEventsHref`: omite vacíos, codifica valores, sin filtros → `/eventos`.
- Componentes server presentacionales y página: sin tests.

## Plan de tareas
### Fase 1
- [x] T1 — Opciones de búsqueda, schema de filtros y utils con tests · archivos: `modules/events/data/searchOptions.ts`, `modules/events/schemas/eventFilters.schema.ts`, `modules/events/utils/eventFilters.ts`, `modules/events/utils/eventFilters.test.ts` · depende de: — · secuencial (base) — paralelo con T1 de `events-detail` (archivos disjuntos)
- [x] T2 — Buscador precargable, chips y resultados · archivos: `modules/events/components/EventSearchBar.tsx`, `modules/events/components/CategoryFilter.tsx`, `modules/events/components/EventsResults.tsx` · depende de: T1 · paralelo (disjunto con T2/T3 de `events-detail`)
- [x] T3 — Ruta `/eventos`, exports y diseño de página · archivos: `app/eventos/page.tsx`, `modules/events/index.ts`, `design-system/ticketera/pages/events-list.md` · depende de: T2 · secuencial (comparte `index.ts` con T4 de `events-detail`: ejecutar una después de la otra)

## Preguntas abiertas
1. **Filtro de fecha:** por defecto "ese día o después". ¿Prefieres "solo ese día"?
2. **Sin paginación:** con 12 eventos mock no hace falta. ¿Paginamos cuando haya API (p. ej. 12 por página)?
