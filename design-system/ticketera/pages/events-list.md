# Página: listado de eventos `/eventos`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER.
> Spec: `docs/specs/events-ui-refresh.md` (Fases 1 y 4). Reemplaza el layout anterior (buscador completo, chips de categoría en todos los anchos y "N eventos encontrados"). La Fase 4 fija el h1 "Explora eventos", unifica el buscador píldora con la landing y rediseña `EventCard`.

## Layout

### Escritorio (`lg+`)

```
Header sticky   (igual que la landing)
Título          h1 "Explora eventos" (fijo, con o sin filtros); único h1
Buscador        EventSearchBar (píldora): [Qué quieres ver ________ │ Fecha ▾ │ Precio ▾  (⌕ Buscar)]
┌────────────── 288px ──────────────┬──────────────────────────────────────────────┐
│ ⚙ Filtros                 Limpiar │                     Ordenar por [Fecha|Precio más bajo]
│ ─────────────────────────────────│ 12 eventos   (Teatro ×) (Lima ×) (S/ 100 – S/ 200 ×)
│ Categoría                         │ ┌──────┐ ┌──────┐ ┌──────┐
│ ☐ Conciertos                    2 │ │ Card │ │ Card │ │ Card │   xl: 3 columnas
│ …                                 │ └──────┘ └──────┘ └──────┘   lg: 2 columnas
│                                   │   (anatomía de la tarjeta: ver "Tarjeta de evento")
│ Ciudad    ☐ Lima 6 · …            │
│ Fecha     ◉ Cualquier fecha · meses│
│ Precio desde ◉ Cualquier precio · …│
└───────────────────────────────────┴──────────────────────────────────────────────┘
Footer          (igual que la landing)
```

### Móvil y tablet (`< lg`)

```
Título "Explora eventos"
┌ Qué quieres ver ────────────┐  buscador píldora: segmentos apilados (56 px)
│ Artista, evento o ciudad    │  con divisores horizontales
├ Fecha ──────────────────────┤
│ Cualquier fecha           ▾ │
├ Precio ─────────────────────┤
│ Cualquier precio          ▾ │
│ [        ⌕ Buscar         ] │  botón a todo el ancho
└─────────────────────────────┘
[⚙ Filtros (3)]                 [Fecha|Precio más bajo]   ← una sola fila a 375 px
(Todas)(Conciertos)(Teatro)…  → pills con scroll horizontal propio
12 eventos  (Lima ×)(Cusco ×)(Hasta S/ 50 ×)
┌─────┬┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐  tarjeta ticket (< sm): imagen 108px con chip de
│┌───┐┆ CONCIERTOS             │  fecha + cuerpo con borde izquierdo discontinuo
││NOV│┆ Título (2 líneas)      │  y dos muescas (arriba y abajo)
││14 │┆ ◎ Lugar · Ciudad       │
│└───┘┆ ▣ sáb 14 nov           │
│ img ┆ Desde                  │
│     ┆ S/ 180.00  [Agotado]   │  badge solo "Últimas entradas"/"Agotado"
└─────┴┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
```

- Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8` en todos los bloques.
- h1: "Explora eventos" siempre (también con una sola categoría filtrada: la categoría ya se ve en la casilla, el chip y la pill). `text-3xl md:text-5xl font-extrabold tracking-tight`, `pt-8 md:pt-12`.
- Cuerpo: `grid gap-8 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start lg:gap-10`, `py-8 md:py-12`.
- Columna de resultados: `<section aria-label="Resultados">` `flex min-w-0 flex-col gap-4 md:gap-6` (`min-w-0` evita que las pills empujen el ancho).
- Fila Filtros + Orden: `flex flex-wrap items-center justify-between gap-2`; en `lg` solo queda el orden, alineado a la derecha (`lg:justify-end`). A 375 px ocupa ~337 px de los 343 disponibles (anchos de texto medidos con Creato Display); `flex-wrap` es solo red de seguridad.

## Componentes

| Bloque | Componente | Notas |
|---|---|---|
| Buscador | `EventSearchBar months={months} defaultValues={filters}` (server) | Barra píldora única, la misma que la landing (ver "Buscador píldora"). Conserva los filtros que no muestra (`categoria`, `ciudad`, `fecha`, `orden`) con `<input type="hidden">`. |
| Barra lateral | `EventFiltersSidebar` (server) | `<aside aria-labelledby>`, tarjeta `rounded-2xl bg-card p-6 ring-1 ring-border`, `hidden lg:block`. h2 "Filtros" con `SlidersHorizontal`. "Limpiar" solo si hay `categoria`, `ciudad`, `mes`, `fecha` o `precio`; conserva `q` y `orden`. |
| Panel | `EventFiltersForm` (cliente) | `fieldset` + `legend`: "Categoría" (6 casillas), "Ciudad" (5 casillas), "Fecha" ("Cualquier fecha" + meses), "Precio desde" ("Cualquier precio" + 5 rangos). Opción = `<label>` `h-11`; input nativo `size-5 accent-primary cursor-pointer`. Conteo visible `tabular-nums text-muted-foreground` + texto `sr-only` → nombre accesible "Teatro, 2 eventos". |
| Filtros móvil | `EventFiltersSheet` (cliente) | Botón outline `h-11` "Filtros" + contador `rounded-full bg-primary text-primary-foreground` (nº ciudades + mes + precio; nombre accesible "Filtros, n activos"). `Sheet` `side="right"` a pantalla completa: cabecera "Filtros" + cerrar `size-11` "Cerrar filtros"; cuerpo con scroll ("Ciudad", "Fecha", "Precio desde"); pie fijo "Limpiar" (outline, quita `ciudad`/`mes`/`precio`) + "Ver n eventos" (primario, cierra). |
| Pills | `CategoryFilter` | Solo `< lg` (`lg:hidden`). Enlaces de selección única ("Todas" + 6), `aria-current="page"` en la activa, `h-11 rounded-full`, scroll horizontal propio sin barra. |
| Orden | `EventsSort` (server) | `role="group"` "Ordenar por" (etiqueta visible desde `sm`, `sr-only` en móvil). Contenedor `rounded-xl ring-1 ring-border p-1`; enlaces `h-11`; el activo `aria-current="true"` + `bg-primary text-primary-foreground font-semibold`. |
| Contador + chips | `EventsResults` | `<p aria-live="polite" aria-atomic="true">` "n eventos" / "1 evento" (`text-base font-bold`). Chips en `flex-wrap`: categorías → ciudades → mes → fecha → precio. Enlace a la URL sin ese valor, label + `X` (`aria-hidden`), `aria-label="Quitar filtro <label>"`, `h-11 rounded-full bg-accent text-accent-foreground ring-1 ring-primary/30`. Sin chip para `q` ni `orden`. |
| Grilla | `EventsResults` + `EventCard layout="ticket"` | `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`, `gap-4 md:gap-6`. |
| Tarjeta | `EventCard layout="ticket"` | `< sm` horizontal tipo entrada; desde `sm` idéntica a `grid`. Ver "Tarjeta de evento". |
| Vacío | `EventsResults` | `rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center`: icono `Search` en `size-14 rounded-2xl bg-accent text-primary-strong`, "No encontramos eventos con esos filtros" (`text-xl font-bold`), "Prueba quitando algún filtro o buscando otra ciudad." (`text-muted-foreground`) y botón primario `h-11` "Limpiar filtros" → `/eventos`. |

## Buscador píldora (`EventSearchBar`)

Server Component, el mismo en `/eventos` y en la landing (sin prop `variant`). Props: `{ months: MonthOption[]; defaultValues?: EventFilters; className?: string }`. `/eventos` pasa los `months` que ya calcula (los de la barra lateral) y `defaultValues={filters}`; la landing pasa `getEventMonths(events)` y nada más.

```
md+   ┌──────────────────────────────────────────────────────────────────────────┐
      │ Qué quieres ver            │ Fecha            │ Precio           │ (⌕ Buscar) │
      │ Artista, evento o ciudad   │ Cualquier fecha ▾│ Cualquier precio▾│             │
      └──────────────────────────────────────────────────────────────────────────┘
        1fr                          11rem (lg 13rem)  11rem (lg 13rem)   auto
```

| Parte | Clases / comportamiento |
|---|---|
| Contenedor | `<section aria-label="Buscar eventos">` con `mx-auto max-w-7xl px-4 md:px-6 lg:px-8`; `<form action="/eventos" method="get" role="search">`. |
| Píldora | `rounded-2xl bg-card ring-1 ring-border shadow-lg shadow-foreground/5 p-2`. |
| Segmento | Bloque `relative rounded-xl hover:bg-accent/60`. `<label htmlFor>` absoluto `top-2 left-4 pointer-events-none text-xs font-bold text-foreground`. El control ocupa todo el segmento: `h-14` (56 px), `rounded-xl`, sin borde ni sombra, `pt-5 px-4`, foco `focus-visible:ring-2 focus-visible:ring-ring`. |
| "Qué quieres ver" | `Input type="search" name="q"`, placeholder "Artista, evento o ciudad". Sin icono (la lupa va en el botón). Busca en título, lugar y ciudad. |
| "Fecha" | `NativeSelect name="mes"`: "Cualquier fecha" (`value=""`) + los meses con eventos ("Noviembre 2026"…), los mismos que la barra lateral. `className` va al wrapper; el `<select>` se estiliza con `*:data-[slot=native-select]:…`. |
| "Precio" | `NativeSelect name="precio"`: "Cualquier precio" (`value=""`) + los 5 rangos de `PRICE_RANGES`. |
| Botón | `Button type="submit"` "Buscar" con `Search` (`aria-hidden`), `h-12 rounded-xl px-6 font-semibold hover:bg-primary-strong`. |
| `< md` | Segmentos apilados a todo el ancho con `divide-y divide-border`; botón `mt-2 w-full` debajo. |
| `md+` | Una fila `grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,11rem)_auto] items-center` (`lg`: selects a `13rem`); divisores verticales `md:divide-x` solo entre los tres segmentos, no junto al botón; botón a la derecha dentro de la píldora. |

- **Orden del DOM y de la query:** `q`, `mes`, `precio`, los ocultos y el botón. Ej.: desde `/eventos?categoria=deportes&orden=precio` → `/eventos?q=nacional&mes=2026-11&precio=50-100&categoria=deportes&orden=precio`.
- **`<select>` nativo** (no el `Select` de Base UI): funciona sin JS, abre el selector nativo en móvil y se maneja con flechas.
- `fecha` y `ciudad` siguen admitidos en la URL (barra lateral, chips, enlaces antiguos), pero el buscador ya no los genera: la ciudad se busca escribiendo en "Qué quieres ver".

### Sincronización buscador ↔ panel

- La URL es la única fuente de verdad, sin estado duplicado. El buscador usa campos no controlados (`defaultValue`) y su `<form>` lleva `key = buildEventsHref(defaultValues ?? {})`.
- Cuando la barra lateral, el `Sheet`, una pill o un chip cambian la URL, el buscador se vuelve a montar con los valores nuevos (marcar "Enero 2027" en el panel → "Fecha" muestra "Enero 2027").
- Al enviar el buscador, el panel recibe los filtros nuevos por props y `useOptimistic` los refleja (elegir "Cualquier fecha" → el radio "Cualquier fecha" queda marcado y desaparece el chip del mes).
- Coste aceptado: si el usuario escribió en "Qué quieres ver" sin enviar y luego cambia otro filtro, el texto vuelve al `q` de la URL. El `key` no roba el foco: el foco está en el control del panel que cambió.

## Tarjeta de evento (`EventCard`)

Anatomía común a `/eventos`, la landing (Destacados, Próximos) y los relacionados del detalle. Patrones de chip de fecha y talón con muescas tomados de `pages/my-tickets.md`.

```
grid (y ticket desde sm)
┌──────────────────────────────┐
│┌───┐                [Agotado]│  imagen h-44 (176 px), object-cover
││NOV│                         │  chip de fecha (aria-hidden) arriba a la izquierda
││14 │                         │  estado arriba a la derecha, solo si informa
│└───┘                         │
├──────────────────────────────┤
│ CONCIERTOS                   │  overline de categoría, text-primary-strong
│ Nombre del evento (2 líneas) │  h3 con enlace al detalle
│ ◎ Estadio Nacional · Lima    │  MapPin, text-sm muted
│ ▣ sáb 14 nov                 │  CalendarDays + <time dateTime>
◖┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄◗  talón discontinuo con dos muescas (color de surface)
│ Desde                        │
│ S/ 180.00     [Ver entradas] │  precio grande + CTA outline (o "Agotado" deshabilitado)
└──────────────────────────────┘
```

| Parte | Clases / comportamiento |
|---|---|
| Contenedor | `Card` `h-full rounded-2xl ring-1 ring-border`, columna; sin sombra en reposo, hover `shadow-lg shadow-foreground/5`. |
| Imagen | `relative h-44` con `next/image fill object-cover`; enlace al detalle `tabIndex={-1}` `aria-hidden`; zoom `motion-safe:group-hover:scale-105` (300 ms). |
| Chip de fecha | `aria-hidden`, `absolute top-3 left-3 rounded-xl bg-background px-2.5 py-1.5 text-center leading-none ring-1 ring-border/60`. Mes `text-xs font-bold tracking-wider text-primary-strong` ("NOV"), día `text-2xl font-extrabold tabular-nums` ("14"). |
| Estado | `Badge` `absolute top-3 right-3 h-6 rounded-full px-2.5 font-bold`: "Últimas entradas" `bg-warning text-warning-foreground`, "Agotado" `bg-brand-navy text-primary-foreground`. "Disponible" no se muestra. |
| Cuerpo | `flex flex-1 flex-col gap-1.5 p-4`: overline `text-xs font-bold tracking-wider uppercase text-primary-strong`; h3 `text-base md:text-lg leading-snug font-bold line-clamp-2`; metadatos `mt-1 text-sm font-medium text-muted-foreground` con iconos `size-4` (`aria-hidden`), lugar con `truncate`. La hora no se muestra (está en el detalle). |
| Talón | `aria-hidden`, `relative mt-auto border-t border-dashed border-border` + muescas `absolute top-0 size-5 -translate-y-1/2 rounded-full ring-1 ring-border` en `-left-2.5` y `-right-2.5`, `bg-background` o `bg-muted` según `surface`; el `overflow-hidden` de `Card` las recorta a media luna. |
| Pie | `flex flex-wrap items-end justify-between gap-3 p-4`. Precio: "Desde" (`text-xs font-medium text-muted-foreground`) + `text-xl font-extrabold tracking-tight tabular-nums` en `text-foreground`; gratis: solo "Entrada libre"; agotado: precio `text-muted-foreground line-through`. CTA: "Ver entradas" outline `h-11 rounded-xl px-4 font-semibold text-primary-strong hover:bg-accent` (nombre "Ver entradas de <título>"); agotado: `<button disabled>` "Agotado" `bg-muted text-muted-foreground` (nombre "Agotado: <título>", no enfocable). |
| `surface` | `"background"` por defecto; `RelatedEvents` (sobre `bg-muted`) pasa `"muted"` para que no se vean círculos blancos. |

**Variante `ticket` (`< sm`, solo `/eventos`):**

- Fila: imagen `w-27` (108 px) con el chip en `top-2 left-2`; cuerpo con `border-l border-dashed border-border` y muescas arriba y abajo en la unión (color de `surface`).
- Cuerpo: overline, título `line-clamp-2`, lugar y fecha. Pie en una fila: "Desde" + precio `text-base font-extrabold` (o "Entrada libre") y, a la derecha, el badge de estado (solo "Últimas entradas"/"Agotado").
- Se ocultan (`max-sm:hidden`) el badge de la imagen, el talón horizontal y el CTA; el enlace del título se estira sobre la tarjeta (`max-sm:after:absolute max-sm:after:inset-0`). Cada dato está una sola vez en el árbol de accesibilidad (el badge del pie es `hidden max-sm:inline-flex`).
- Desde `sm` es idéntica a `grid`.

## Reglas específicas

### URL (fuente de verdad)

- Parámetros opcionales: `q`, `categoria` (multi), `ciudad` (multi), `mes` (`YYYY-MM`), `fecha` (`YYYY-MM-DD`), `precio`, `orden` (`fecha` | `precio`). Los inválidos se ignoran sin error (uno a uno en los multivalor); en los de valor único, si llegan repetidos se toma el primero.
- **Multivalor:** claves repetidas (`?categoria=teatro&categoria=conciertos`), el formato nativo de un GET con casillas. Un valor único (`?categoria=teatro`) sigue funcionando.
- Filtrado: AND entre facetas, OR dentro de `categoria` y de `ciudad`. `mes` compara el mes del evento en zona `America/Lima`; `fecha` = "ese día o después" (de enlaces antiguos; ningún buscador lo genera ya) y se combina con AND.
- Serialización única con `toSearchParamEntries` / `buildEventsHref` (orden de claves del schema, sin vacíos, `orden=fecha` omitido). Todos los enlaces (chips, orden, pills, "Limpiar") y los inputs ocultos la usan.
- Meses del panel derivados de los eventos (zona Lima), ascendentes ("Noviembre 2026"…).
- h1 fijo "Explora eventos". `<title>` (`generateMetadata`): "<Categoría> | Mentec Tickets" si hay **exactamente una** categoría; si no, "Explora eventos | Mentec Tickets".

### Mejora progresiva

- El panel es un `<form action="/eventos" method="get">` con inputs nativos (no `Checkbox`/`RadioGroup` de Base UI, que necesitan JS).
- Sin JS: botón "Aplicar filtros" dentro de `<noscript>`; los filtros que el formulario no muestra viajan en inputs ocultos. Chips, orden, pills y buscador son enlaces o GET y funcionan igual (los vacíos `q=`, `mes=`, `precio=` del buscador se ignoran al parsear).
- Con JS: cada cambio navega al momento con `router.push(href, { scroll: false })` + `useOptimistic` (la casilla responde sin esperar y conserva el foco; no se usa `key` para remontar).
- El `Sheet` necesita JS (como el menú del header). Al cambiar solo los searchParams, Next conserva el estado de cliente: el `Sheet` sigue abierto y "Ver n eventos" muestra el recuento real del servidor.

### Conteos facetados

- El número de cada categoría o ciudad = eventos que cumplen **los demás** filtros activos más ese valor (se ignora la propia faceta, así marcar "Teatro" no pone a 0 las otras categorías). Se muestran también las opciones con 0.
- Filtrado y conteos se calculan siempre en el servidor (`filterEvents`, `getFacetCounts`); nunca en cliente.

### Accesibilidad

- Un único h1 ("Explora eventos"); h2 "Filtros" en la barra lateral y h2 `sr-only` "Resultados".
- Buscador: Tab "Qué quieres ver" → "Fecha" → "Precio" → "Buscar"; segmentos de 56 px y botón de 48 px. Tarjeta: se alcanzan el título y "Ver entradas" (44 px), no la imagen; el chip de fecha es decorativo y la fecha está en texto; el estado siempre con texto.
- Todo control interactivo mide ≥ 44 px de alto (`h-11`) y tiene foco visible.
- Nada se comunica solo con color: orden activo con `aria-current="true"`, pill activa con `aria-current="page"`, contador del botón con texto `sr-only`.
- Sin scroll horizontal de página a 375 / 768 / 1024 / 1440 (las pills hacen scroll dentro de su `nav`; el pie de la tarjeta hace `flex-wrap` si el CTA no cabe, p. ej. en el carrusel de relacionados con `w-64`).
- `prefers-reduced-motion`: sin animaciones nuevas salvo las del `Sheet`.
