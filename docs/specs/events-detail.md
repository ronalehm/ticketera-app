# Página de detalle del evento (UI con mock data)

- Módulo: events
- Estado: aprobado

## Objetivo
Que el comprador vea toda la información de un evento y elija sus entradas (zona y cantidad) desde `/eventos/<slug>`, destino de las tarjetas y del hero de la landing. Datos mock, misma marca y design system (`design-system/ticketera/MASTER.md`). Referencias: detalle de evento de Joinnus y Ticketmaster.

## Alcance
- Incluye:
  - Ruta `/eventos/[slug]` generada estáticamente para los 12 eventos mock, con metadata por evento y 404 propio si el slug no existe.
  - Cabecera: breadcrumb, imagen, categoría, título, fecha/hora, lugar y ciudad.
  - Selector de entradas: tipos de entrada (zonas) con precio y estado, cantidad por tipo, total y botón "Continuar con la compra".
  - Secciones "Acerca del evento", "Detalles" (fecha, hora, apertura de puertas, lugar y dirección, edad mínima, organizador) y "Ubicación" con enlace externo a Google Maps.
  - "También te puede interesar": hasta 4 eventos relacionados con `EventCard`.
  - Ampliar el modelo de datos con el detalle (descripción, dirección, tipos de entrada, etc.) validado con zod.
  - Archivo de diseño de página `design-system/ticketera/pages/event-detail.md`.
- No incluye:
  - Checkout, pago, login, carrito persistente, reserva de asientos o mapa de asientos. El botón lleva a `/checkout?...` (ruta inexistente, 404 esperado).
  - Mapa embebido, compartir en redes, favoritos, reseñas.
  - Listado `/eventos`.

## Requisitos
1. `app/eventos/[slug]/page.tsx` es un Server Component: lee `params` (Promise en Next 16), obtiene el detalle con `getEventBySlug`, llama a `notFound()` si no existe, y compone componentes del módulo.
2. `generateStaticParams` devuelve los slugs de todos los eventos; `generateMetadata` usa título y descripción del evento.
3. Cada tipo de entrada tiene nombre, descripción opcional, precio en PEN y estado (`available` | `low-stock` | `sold-out`).
4. Cantidad por tipo entre 0 y `MAX_TICKETS_PER_ORDER` (10) **en total del pedido**; los tipos agotados no permiten seleccionar.
5. El total se calcula en cliente: Σ precio × cantidad. Se muestra "Precio final, sin cargos ocultos" bajo el total (anti-patrón de la categoría: cargos ocultos).
6. Botón "Continuar con la compra": deshabilitado con 0 entradas; con ≥ 1 es un enlace a `/checkout?evento=<slug>&<ticketTypeId>=<qty>...` (solo tipos con qty > 0).
7. Evento `sold-out`: el selector muestra "Entradas agotadas" en lugar de los controles y el botón no aparece.
8. Eventos relacionados: primero los de la misma categoría, luego otros, excluyendo el actual, máximo 4, en orden por fecha.
9. Accesibilidad: un solo `<h1>` (título del evento); controles −/+ con `aria-label` ("Quitar una entrada General", "Añadir una entrada General"); cantidad anunciada con `aria-live="polite"`; total también `aria-live`; foco visible; targets ≥ 44px.
10. Responsive sin scroll horizontal (375 / 768 / 1024 / 1440). Desktop: dos columnas con el selector en columna derecha `sticky`. Móvil: imagen → título → selector → acerca/detalles/ubicación → relacionados.
11. Solo tokens del tema; Creato Display; componentes shadcn cuando existan.

## Criterios de aceptación
- [ ] Dado `/eventos/noche-de-sintetizadores-lima`, cuando carga, entonces muestra breadcrumb (Inicio › Conciertos › título), imagen, badge de categoría, h1 con el título, fecha/hora en formato `SÁB 14 NOV · 21:00`, lugar y ciudad.
- [ ] Dado un slug inexistente, cuando se visita, entonces se muestra la página 404 del evento con enlace "Volver al inicio".
- [ ] Dado `npm run build`, entonces las 12 rutas `/eventos/<slug>` se generan estáticamente y el `<title>` de cada una incluye el nombre del evento.
- [ ] Dado el selector, cuando se pulsa "+" en un tipo disponible, entonces la cantidad sube y el total se actualiza; "−" no baja de 0.
- [ ] Dado un pedido con 10 entradas en total, cuando se intenta añadir otra, entonces los "+" quedan deshabilitados y se muestra "Máximo 10 entradas por compra".
- [ ] Dado un tipo de entrada `sold-out`, entonces muestra "Agotado" y sus controles están deshabilitados; un tipo `low-stock` muestra "Últimas entradas".
- [ ] Dado 0 entradas, entonces "Continuar con la compra" está deshabilitado; con 2 "General", es un enlace a `/checkout?evento=<slug>&general=2` (id del tipo).
- [ ] Dado el evento agotado (`los-ecos-del-sur-arequipa`), entonces el selector muestra "Entradas agotadas" y no hay botón de compra.
- [ ] Dado la sección "Ubicación", entonces muestra la dirección y un enlace "Ver en Google Maps" que abre en pestaña nueva (`target="_blank" rel="noopener noreferrer"`).
- [ ] Dado "También te puede interesar", entonces muestra hasta 4 tarjetas, sin el evento actual, priorizando su categoría.
- [ ] Dado 375px de ancho, entonces no hay scroll horizontal y el orden es imagen → título → selector → información → relacionados.
- [ ] Dado `npx vitest run`, entonces pasan los tests nuevos y los existentes.

## Diseño técnico
- Rutas (app/):
  - `app/eventos/[slug]/page.tsx`: `generateStaticParams`, `generateMetadata`, página async. Consultar `node_modules/next/dist/docs/` (params como Promise, `notFound`, metadata).
  - `app/eventos/[slug]/not-found.tsx`: mensaje "No encontramos este evento" + enlace "Volver al inicio".
- Schemas / tipos / datos (`modules/events`):
  ```ts
  // schemas/events.schema.ts (se añade, eventSchema no cambia)
  export const ticketTypeSchema = z.object({
    id: z.string(),            // kebab-case, se usa como clave en la URL de checkout
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().nonnegative(),
    status: eventStatusSchema,
  });
  export const eventDetailSchema = eventSchema.extend({
    description: z.string().min(1),   // 2–3 párrafos separados por "\n\n"
    address: z.string(),
    doorsOpenAt: z.iso.datetime({ offset: true }),
    minAge: z.number().int().nonnegative(),   // 0 = todo público
    organizer: z.string(),
    ticketTypes: ticketTypeSchema.array().min(1),
  });
  ```
  - `types/events.types.ts`: `EventDetail`, `TicketType` vía `z.infer`.
  - `data/events.mock.ts`: los 12 eventos ganan los campos de detalle. Invariantes: `priceFrom` = mínimo de `ticketTypes[].price`; evento `sold-out` ⇒ todos sus tipos `sold-out`; evento `low-stock` ⇒ al menos un tipo `low-stock`; 2–4 tipos por evento (p. ej. General, Preferencial, VIP; en familia/stand-up puede haber "Niños" o "Mesa"); el evento gratuito tiene un único tipo "Entrada libre" a S/ 0.
- Service (`services/events.service.ts`):
  - `getEventBySlug(slug: string): Promise<EventDetail | null>` — busca en el mock y parsea con `eventDetailSchema`.
  - `getRelatedEvents(slug: string, limit = 4): Promise<Event[]>` — regla del requisito 8.
  - `getEvents()` sigue parseando con `eventSchema` (zod descarta los campos extra).
- Utils (`utils/ticketOrder.ts`):
  - `MAX_TICKETS_PER_ORDER = 10`.
  - `getOrderTotal(ticketTypes, quantities: Record<string, number>): number`.
  - `getTicketCount(quantities): number`.
  - `buildCheckoutHref(slug, quantities): string` (omite cantidades 0, usa `URLSearchParams`).
- Componentes (`modules/events/components/`):
  - nuevo `EventDetailHeader.tsx` (server): breadcrumb shadcn, imagen `aspect-[16/9]` rounded-2xl con `preload`, badge categoría, h1, fecha/hora (`formatEventDate`), lugar + ciudad (iconos lucide `CalendarDays`, `MapPin`).
  - nuevo `EventDetailInfo.tsx` (server): secciones "Acerca del evento" (párrafos), "Detalles" (lista `dl` con iconos: fecha, hora, apertura de puertas, lugar/dirección, edad mínima "Todo público" o "+18", organizador) y "Ubicación" (dirección + enlace Google Maps `https://www.google.com/maps/search/?api=1&query=<venue, address, city>` codificado).
  - nuevo `TicketSelector.tsx` (`"use client"`): `Card` sticky (`lg:sticky lg:top-24`), título "Entradas", "Desde S/ X", lista de tipos (nombre, descripción, precio, badge de estado, stepper −/cantidad/+ con `Button` size icon), `Separator`, total, nota "Precio final, sin cargos ocultos", CTA primario full-width "Continuar con la compra". Estado `useState<Record<string, number>>`; lógica en `ticketOrder.ts`.
  - nuevo `RelatedEvents.tsx` (server): `SectionHeader` "También te puede interesar" + grilla de `EventCard` (misma grilla que `UpcomingEvents`).
  - existentes: `EventCard`, `SectionHeader`, `Badge`, `Card`, `Button`, `Separator`, `formatEventDate`, `formatEventPrice`, `EVENT_CATEGORY_LABELS`.
  - shadcn (instalar: `npx shadcn@latest add breadcrumb`).
- `modules/events/index.ts`: exporta los 4 componentes nuevos, `getEventBySlug`, `getRelatedEvents`, tipos `EventDetail`, `TicketType`.
- Contrato de API: no aplica (mock). Forma de datos = `eventDetailSchema`.

## Reutilización
- `EventCard`, `SectionHeader`, `formatEventDate`, `formatEventPrice`, `EVENT_CATEGORY_LABELS`, `eventSchema`/`eventStatusSchema`, colores de badge de estado ya usados en `EventCard` (mismo mapping Disponible/Últimas entradas/Agotado: extraer a un util/constante compartida dentro del módulo si se repite por segunda vez).
- shadcn: card, badge, button, separator (instalados), breadcrumb (nuevo).
- `URLSearchParams`, `Intl` nativos.

## Tests
- `modules/events/services/events.service.test.ts` (ampliar): `getEventBySlug` devuelve detalle válido para un slug existente y `null` para uno inexistente; `getRelatedEvents` excluye el actual, prioriza la misma categoría, respeta `limit`, ordena por fecha; invariantes del mock (`priceFrom` = mínimo de precios; sold-out ⇒ todos los tipos sold-out).
- `modules/events/utils/ticketOrder.test.ts`: total con varias cantidades, total 0, conteo, `buildCheckoutHref` omite ceros y codifica.
- `TicketSelector`: test con Testing Library (componente con estado): "+" incrementa y actualiza total, "−" no baja de 0, límite de 10 deshabilita "+", tipo agotado deshabilitado, CTA deshabilitado con 0 y con `href` correcto con cantidades.
- Página y componentes server presentacionales: sin tests.

## Plan de tareas
### Fase 1
- [x] T1 — Datos y lógica: instalar breadcrumb; schema, tipos, mock ampliado, service + tests, util `ticketOrder` + tests · archivos: `components/ui/breadcrumb.tsx`, `modules/events/schemas/events.schema.ts`, `modules/events/types/events.types.ts`, `modules/events/data/events.mock.ts`, `modules/events/services/events.service.ts`, `modules/events/services/events.service.test.ts`, `modules/events/utils/ticketOrder.ts`, `modules/events/utils/ticketOrder.test.ts` · depende de: — · secuencial (base)
- [x] T2 — Cabecera, información y relacionados · archivos: `modules/events/components/EventDetailHeader.tsx`, `modules/events/components/EventDetailInfo.tsx`, `modules/events/components/RelatedEvents.tsx` · depende de: T1 · paralelo con T3
- [x] T3 — Selector de entradas con test · archivos: `modules/events/components/TicketSelector.tsx`, `modules/events/components/TicketSelector.test.tsx` · depende de: T1 · paralelo con T2
- [x] T4 — Ruta, 404, exports y diseño de página · archivos: `app/eventos/[slug]/page.tsx`, `app/eventos/[slug]/not-found.tsx`, `modules/events/index.ts`, `design-system/ticketera/pages/event-detail.md` · depende de: T2, T3 · secuencial

## Preguntas abiertas
1. **Máximo por compra:** por defecto 10 entradas en total. ¿Otro límite?
2. **Cargos por servicio:** por defecto los precios mostrados son finales ("Precio final, sin cargos ocultos"). ¿Habrá comisión que deba mostrarse aparte?
3. **Botón de compra:** por defecto lleva a `/checkout?...` (aún no existe). ¿Debe pedir login antes?
