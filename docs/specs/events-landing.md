# Landing de la ticketera (UI con mock data)

- Módulo: events (+ marketing, components/shared)
- Estado: aprobado

## Objetivo
Construir la UI de la landing pública de la ticketera (venta de entradas a eventos) con datos mock, aplicando la marca Mentec y dejando definidos tema, tipografía y componentes base para que las siguientes páginas se armen rápido. Referencias visuales: Ticketmaster y Joinnus. Fuente de verdad visual: `design-system/ticketera/MASTER.md`.

## Alcance
- Incluye:
  - Tema shadcn con colores Mentec (solo modo claro), fuente Creato Display en todo el proyecto, logo e isotipo de marca.
  - Header y footer reutilizables por todas las páginas.
  - Landing `/` con: hero slider de destacados, barra de búsqueda, categorías, rail de destacados, grilla de próximos eventos filtrable por categoría, banner para organizadores, sección de confianza.
  - Datos mock de eventos validados con zod a través de un service (para cambiarlo luego por la API sin tocar la UI).
  - Imágenes de Unsplash vía `next/image`.
- No incluye:
  - Páginas de detalle de evento, listado `/eventos`, login, checkout (los enlaces apuntan a esas rutas y darán 404 por ahora).
  - Búsqueda funcional: el formulario hace `GET /eventos?q=&ciudad=&fecha=` pero esa ruta no existe aún.
  - Modo oscuro, i18n, backend/API real, TanStack Query (los datos son mock y se leen en Server Components).
  - Newsletter, mapas de asientos, guías/blog.

## Requisitos
1. Toda la UI usa Creato Display (400/500/700/800) cargada con `next/font/local`; no queda ninguna referencia a Geist.
2. Tokens de color según `design-system/ticketera/MASTER.md` §2 en `app/globals.css`; los componentes no usan hex ni colores por defecto de Tailwind.
3. Fondo predominantemente claro; solo footer y overlay del hero usan navy.
4. Componentes de UI provienen de shadcn (`base-nova`) siempre que existan; los propios solo componen shadcn.
5. Carousel = shadcn `carousel` (Embla). Se añade solo `embla-carousel-autoplay` para el hero. No se instala Swiper.
6. Textos en español (Perú); precios en PEN `S/ 120.00`; fechas en `America/Lima`.
7. Accesibilidad según MASTER §11 (contraste, focus visible, autoplay pausable y desactivado con `prefers-reduced-motion`, un solo `<h1>`).
8. Responsive sin scroll horizontal en 375 / 768 / 1024 / 1440.

## Criterios de aceptación
### Fase 1
- [ ] Dado `npm run build`, cuando termina, entonces no hay errores de tipos ni de lint (`npm run lint`).
- [ ] Dado cualquier página, cuando se inspecciona el `body`, entonces la fuente computada es Creato Display.
- [ ] Dado `app/globals.css`, cuando se revisa `:root`, entonces `--primary` es `#0072F6`, `--foreground` `#010817`, `--highlight` `#03D2F4`, `--secondary` `#EFEEEE` y no existe bloque `.dark`.
- [ ] Dado el header en desktop (≥ 1024px), cuando carga, entonces muestra logo Mentec (enlace a `/`), enlaces de categorías y botón "Iniciar sesión".
- [ ] Dado el header en móvil (375px), cuando se pulsa el botón de menú (con `aria-label`), entonces se abre un `Sheet` con los mismos enlaces.
- [ ] Dado el footer, cuando carga, entonces muestra fondo navy, logo en blanco, columnas de enlaces, redes sociales con `aria-label`, enlace "Libro de reclamaciones" y copyright con el año actual.
- [ ] Dado el navegador, cuando carga la página, entonces el favicon es el isotipo Mentec.
### Fase 2
- [ ] Dado `/`, cuando carga, entonces se ven en orden: hero, buscador, categorías, destacados, próximos eventos, banner organizadores, confianza, footer.
- [ ] Dado el hero, cuando pasan 6s sin interacción, entonces avanza al siguiente slide; al pasar el mouse o enfocar, se detiene; con `prefers-reduced-motion: reduce` no avanza solo.
- [ ] Dado el hero, cuando se usan los botones anterior/siguiente o las flechas del teclado, entonces cambia de slide.
- [ ] Dado una tarjeta de evento, cuando se ve, entonces muestra imagen 4:3, fecha corta (`SÁB 15 NOV · 20:00`), título (máx. 2 líneas), lugar y ciudad, "Desde S/ X" y badge de categoría o estado.
- [ ] Dado un evento `sold-out`, cuando se ve su tarjeta, entonces muestra badge "Agotado" y no muestra precio; un evento `low-stock` muestra badge "Últimas entradas".
- [ ] Dado "Próximos eventos", cuando se elige un chip de categoría, entonces la grilla muestra solo eventos de esa categoría; "Todos" muestra todos; si no hay eventos se muestra un mensaje vacío.
- [ ] Dado una tarjeta, cuando se activa, entonces navega a `/eventos/<slug>`.
- [ ] Dado el buscador, cuando se envía, entonces navega a `/eventos?q=...&ciudad=...&fecha=...`.
- [ ] Dado 375px de ancho, cuando se recorre la página, entonces no hay scroll horizontal y los rails se desplazan dentro de su contenedor.
- [ ] Dado `npx vitest run`, entonces pasan los tests del módulo events.

## Diseño técnico
- Rutas (app/):
  - `app/layout.tsx`: `lang="es"`, fuente local, metadata (título "Mentec Tickets — Entradas para conciertos, teatro y más"), `SiteHeader` + `children` + `SiteFooter`.
  - `app/page.tsx`: compone secciones de `@/modules/events` y `@/modules/marketing`. Server Component.
  - `app/icon.svg`: isotipo Mentec (convención de favicon de Next).
- Fuente: `app/fonts/CreatoDisplay-{Regular,Medium,Bold,ExtraBold}.woff2` (convertidas de los `.otf` instalados con fonttools; si la conversión falla, se usan los `.otf`). Variable `--font-sans`; `--font-heading` apunta a ella.
- Assets: `public/brand/mentec-logo.svg` y `public/brand/mentec-logo-white.svg`, extraídos como vectores de `brand/Manual_Mentec.pdf` (pág. 5 y versión blanca pág. 7/8).
- `next.config.ts`: `images.remotePatterns` para `https://images.unsplash.com/**`.
- Componentes:
  - shadcn (instalado): `button`.
  - shadcn (instalar: `npx shadcn@latest add card badge input select carousel sheet toggle-group separator`).
  - Dependencia nueva: `embla-carousel-autoplay` (hero con autoplay pausable).
  - nuevo `components/shared/BrandLogo.tsx` — logo con variante `default | white`; lo usan header y footer (y futuras páginas).
  - nuevo `components/shared/SectionHeader.tsx` — título H2 + descripción opcional + acción opcional (enlace "Ver todos"); se repite en todas las secciones.
  - nuevo `components/shared/SiteHeader.tsx` — sticky, logo, búsqueda compacta (md+), enlaces de categorías, "Iniciar sesión"; `Sheet` en móvil. `"use client"` solo si el `Sheet` lo exige (aislado en un subcomponente `MobileNav` dentro del mismo archivo).
  - nuevo `components/shared/SiteFooter.tsx` — navy, logo blanco, columnas, redes (lucide), `Separator`, Libro de reclamaciones.
  - nuevo `modules/events/components/EventCard.tsx` — `Card` + `Badge` + `next/image`, enlace envolvente.
  - nuevo `modules/events/components/HeroCarousel.tsx` (`"use client"`) — `Carousel` + autoplay; overlay navy, título, fecha, lugar, CTA "Comprar entradas".
  - nuevo `modules/events/components/EventSearchBar.tsx` — `<form action="/eventos">` con `Input` + `Select` (ciudad) + `Input type="date"` + `Button`. `"use client"` solo si `Select` lo exige.
  - nuevo `modules/events/components/CategoryGrid.tsx` — tiles con icono lucide por categoría, enlazan a `/eventos?categoria=<slug>`.
  - nuevo `modules/events/components/FeaturedEventsRail.tsx` (`"use client"`) — `Carousel` de `EventCard`.
  - nuevo `modules/events/components/UpcomingEvents.tsx` (`"use client"`) — `ToggleGroup` de categorías + grilla de `EventCard` filtrada en cliente.
  - nuevo `modules/marketing/components/OrganizerBanner.tsx` — degradado de marca + CTA "Vende tus entradas con nosotros".
  - nuevo `modules/marketing/components/TrustHighlights.tsx` — 3 columnas (compra segura, entrada digital QR, soporte).
- Schemas / tipos / datos / service:
  - `modules/events/schemas/events.schema.ts`:
    ```ts
    export const eventCategorySchema = z.enum(["conciertos", "teatro", "deportes", "festivales", "stand-up", "familia"]);
    export const eventStatusSchema = z.enum(["available", "low-stock", "sold-out"]);
    export const eventSchema = z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string().min(1),
      category: eventCategorySchema,
      startsAt: z.iso.datetime({ offset: true }),
      venue: z.string(),
      city: z.string(),
      imageUrl: z.url(),
      priceFrom: z.number().nonnegative(),
      status: eventStatusSchema,
      featured: z.boolean(),
    });
    ```
  - `modules/events/types/events.types.ts`: `Event`, `EventCategory`, `EventStatus` vía `z.infer`.
  - `modules/events/data/events.mock.ts`: ~12 eventos (al menos 2 por categoría, 4 `featured`, 1 `sold-out`, 1 `low-stock`) en ciudades de Perú, imágenes Unsplash verificadas (HTTP 200).
  - `modules/events/data/categories.ts`: `EVENT_CATEGORY_LABELS: Record<EventCategory, string>`.
  - `modules/events/services/events.service.ts`: `getEvents()` y `getFeaturedEvents()` (async, parsean el mock con `eventSchema.array()`; se reemplazarán por llamadas a la API).
  - `modules/events/utils/formatEvent.ts`: `formatEventDate(iso)` → `"SÁB 15 NOV · 20:00"`, `formatEventPrice(n)` → `"S/ 120.00"`.
  - `modules/events/index.ts`: exporta los componentes de sección, `EventCard` y los tipos.
  - `modules/marketing/index.ts`.
- Contrato de API: no aplica (mock). La forma de datos es `eventSchema`.

## Reutilización
- `components/ui/button.tsx` (instalado), `cn()` de `@/lib/utils`, `lucide-react` (instalado).
- shadcn: card, badge, input, select, carousel, sheet, toggle-group, separator.
- `Intl.NumberFormat` / `Intl.DateTimeFormat` nativos para formatos (sin librerías de fechas).
- `next/image`, `next/font/local`, `app/icon.svg` (convenciones nativas de Next).
- Nada existente en `modules/` ni `components/shared/` (proyecto nuevo).

## Tests
- `modules/events/utils/formatEvent.test.ts`: fecha en zona `America/Lima` (incluido un ISO en UTC que cambia de día), mayúsculas sin punto (`SÁB 15 NOV`), hora 24h; precio con 2 decimales y prefijo `S/`, precio 0.
- `modules/events/services/events.service.test.ts`: `getEvents()` devuelve todos los eventos válidos según el schema; `getFeaturedEvents()` devuelve solo `featured`; un mock inválido hace fallar el parseo.
- `components/shared/SiteHeader`: sin test (presentacional + `Sheet` de shadcn).
- Componentes de sección: presentacionales, sin tests. El filtro de `UpcomingEvents` es una línea (`filter`) y se verifica en revisión manual.

## Plan de tareas
### Fase 1 — Fundaciones (tema, fuente, marca, layout)
- [x] T1 — Instalar componentes shadcn y `embla-carousel-autoplay` · archivos: `components/ui/{card,badge,input,select,carousel,sheet,toggle-group,separator}.tsx`, `package.json`, `package-lock.json` · depende de: — · secuencial (base)
- [x] T2 — Tema Mentec, fuente Creato Display, assets de marca y config de imágenes · archivos: `app/globals.css`, `app/layout.tsx`, `app/fonts/*.woff2` (4), `app/icon.svg`, `public/brand/mentec-logo.svg`, `public/brand/mentec-logo-white.svg`, `next.config.ts`, `CLAUDE.md` (una línea apuntando a `design-system/ticketera/MASTER.md`) · depende de: — · secuencial (base)
- [x] T3 — Shared: logo, header, footer, section header; montarlos en el layout · archivos: `components/shared/{BrandLogo,SectionHeader,SiteHeader,SiteFooter}.tsx`, `app/layout.tsx` · depende de: T1, T2 · secuencial

### Fase 2 — Landing con mock data
- [x] T4 — Dominio events: schema, tipos, mock, categorías, service, utils y tests · archivos: `modules/events/schemas/events.schema.ts`, `modules/events/types/events.types.ts`, `modules/events/data/{events.mock,categories}.ts`, `modules/events/services/events.service.ts`, `modules/events/services/events.service.test.ts`, `modules/events/utils/formatEvent.ts`, `modules/events/utils/formatEvent.test.ts` · depende de: Fase 1 · secuencial (base de fase)
- [x] T5 — Componentes de eventos · archivos: `modules/events/components/{EventCard,HeroCarousel,EventSearchBar,CategoryGrid,FeaturedEventsRail,UpcomingEvents}.tsx`, `modules/events/index.ts` · depende de: T4 · paralelo con T6
- [x] T6 — Secciones de marketing · archivos: `modules/marketing/components/{OrganizerBanner,TrustHighlights}.tsx`, `modules/marketing/index.ts` · depende de: Fase 1 · paralelo con T5
- [x] T7 — Componer la landing · archivos: `app/page.tsx` · depende de: T5, T6 · secuencial

## Decisiones (preguntas resueltas por el usuario)
1. **Nombre:** "Mentec Tickets", con el logo Mentec.
2. **Ciudades del buscador:** Lima, Arequipa, Cusco, Trujillo, Piura.
3. **Moneda:** soles (PEN).
