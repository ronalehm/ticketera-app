# Página: listado de eventos `/eventos`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER.
> Spec: `docs/specs/events-ui-refresh.md` (Fase 1). Reemplaza el layout anterior (buscador completo, chips de categoría en todos los anchos y "N eventos encontrados").

## Layout

### Escritorio (`lg+`)

```
Header sticky   (igual que la landing)
Título          h1 "Eventos" o el label de la única categoría activa ("Teatro"); único h1
Buscador        EventSearchBar variant="compact": [ Buscar ______________ ] [Buscar]
┌────────────── 288px ──────────────┬──────────────────────────────────────────────┐
│ ⚙ Filtros                 Limpiar │                     Ordenar por [Fecha|Precio más bajo]
│ ─────────────────────────────────│ 12 eventos   (Teatro ×) (Lima ×) (S/ 100 – S/ 200 ×)
│ Categoría                         │ ┌──────┐ ┌──────┐ ┌──────┐
│ ☐ Conciertos                    2 │ │ Card │ │ Card │ │ Card │   xl: 3 columnas
│ …                                 │ └──────┘ └──────┘ └──────┘   lg: 2 columnas
│ Ciudad    ☐ Lima 6 · …            │
│ Fecha     ◉ Cualquier fecha · meses│
│ Precio desde ◉ Cualquier precio · …│
└───────────────────────────────────┴──────────────────────────────────────────────┘
Footer          (igual que la landing)
```

### Móvil y tablet (`< lg`)

```
Título · Buscador compacto
[⚙ Filtros (3)]                 [Fecha|Precio más bajo]   ← una sola fila a 375 px
(Todas)(Conciertos)(Teatro)…  → pills con scroll horizontal propio
12 eventos  (Lima ×)(Cusco ×)(Hasta S/ 50 ×)
┌─────┬┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐  tarjeta ticket (< sm): imagen 108px + contenido
│ img ┆ SÁB 14 NOV · 21:00     │  con borde izquierdo discontinuo y dos muescas
│     ┆ Título (2 líneas)      │
│ Cat ┆ Lugar, Ciudad          │
│     ┆ Desde S/ 180.00 [Disp.]│
└─────┴┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
```

- Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8` en todos los bloques.
- h1: `text-3xl md:text-5xl font-extrabold tracking-tight`, `pt-8 md:pt-12`.
- Cuerpo: `grid gap-8 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start lg:gap-10`, `py-8 md:py-12`.
- Columna de resultados: `<section aria-label="Resultados">` `flex min-w-0 flex-col gap-4 md:gap-6` (`min-w-0` evita que las pills empujen el ancho).
- Fila Filtros + Orden: `flex flex-wrap items-center justify-between gap-2`; en `lg` solo queda el orden, alineado a la derecha (`lg:justify-end`). A 375 px ocupa ~337 px de los 343 disponibles (anchos de texto medidos con Creato Display); `flex-wrap` es solo red de seguridad.

## Componentes

| Bloque | Componente | Notas |
|---|---|---|
| Buscador | `EventSearchBar variant="compact"` | Label "Buscar", input `q` y botón "Buscar" en una fila (`grid-cols-[minmax(0,1fr)_auto]`). Conserva los demás filtros y el orden con `<input type="hidden">`. La landing usa `variant="full"` sin cambios. |
| Barra lateral | `EventFiltersSidebar` (server) | `<aside aria-labelledby>`, tarjeta `rounded-2xl bg-card p-6 ring-1 ring-border`, `hidden lg:block`. h2 "Filtros" con `SlidersHorizontal`. "Limpiar" solo si hay `categoria`, `ciudad`, `mes`, `fecha` o `precio`; conserva `q` y `orden`. |
| Panel | `EventFiltersForm` (cliente) | `fieldset` + `legend`: "Categoría" (6 casillas), "Ciudad" (5 casillas), "Fecha" ("Cualquier fecha" + meses), "Precio desde" ("Cualquier precio" + 5 rangos). Opción = `<label>` `h-11`; input nativo `size-5 accent-primary cursor-pointer`. Conteo visible `tabular-nums text-muted-foreground` + texto `sr-only` → nombre accesible "Teatro, 2 eventos". |
| Filtros móvil | `EventFiltersSheet` (cliente) | Botón outline `h-11` "Filtros" + contador `rounded-full bg-primary text-primary-foreground` (nº ciudades + mes + precio; nombre accesible "Filtros, n activos"). `Sheet` `side="right"` a pantalla completa: cabecera "Filtros" + cerrar `size-11` "Cerrar filtros"; cuerpo con scroll ("Ciudad", "Fecha", "Precio desde"); pie fijo "Limpiar" (outline, quita `ciudad`/`mes`/`precio`) + "Ver n eventos" (primario, cierra). |
| Pills | `CategoryFilter` | Solo `< lg` (`lg:hidden`). Enlaces de selección única ("Todas" + 6), `aria-current="page"` en la activa, `h-11 rounded-full`, scroll horizontal propio sin barra. |
| Orden | `EventsSort` (server) | `role="group"` "Ordenar por" (etiqueta visible desde `sm`, `sr-only` en móvil). Contenedor `rounded-xl ring-1 ring-border p-1`; enlaces `h-11`; el activo `aria-current="true"` + `bg-primary text-primary-foreground font-semibold`. |
| Contador + chips | `EventsResults` | `<p aria-live="polite" aria-atomic="true">` "n eventos" / "1 evento" (`text-base font-bold`). Chips en `flex-wrap`: categorías → ciudades → mes → fecha → precio. Enlace a la URL sin ese valor, label + `X` (`aria-hidden`), `aria-label="Quitar filtro <label>"`, `h-11 rounded-full bg-accent text-accent-foreground ring-1 ring-primary/30`. Sin chip para `q` ni `orden`. |
| Grilla | `EventsResults` + `EventCard layout="ticket"` | `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`, `gap-4 md:gap-6`. |
| Tarjeta ticket | `EventCard layout="ticket"` | Solo `< sm`: horizontal, imagen 108 px con badge de categoría, contenido con `border-l border-dashed border-border`, dos muescas `aria-hidden` (`bg-background ring-1 ring-border`). Sin "Ver entradas": el enlace del título se estira (`after:absolute after:inset-0`). Desde `sm`, igual que `grid`. |
| Vacío | `EventsResults` | `rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center`: icono `Search` en `size-14 rounded-2xl bg-accent text-primary-strong`, "No encontramos eventos con esos filtros" (`text-xl font-bold`), "Prueba quitando algún filtro o buscando otra ciudad." (`text-muted-foreground`) y botón primario `h-11` "Limpiar filtros" → `/eventos`. |

## Reglas específicas

### URL (fuente de verdad)

- Parámetros opcionales: `q`, `categoria` (multi), `ciudad` (multi), `mes` (`YYYY-MM`), `fecha` (`YYYY-MM-DD`), `precio`, `orden` (`fecha` | `precio`). Los inválidos se ignoran sin error (uno a uno en los multivalor); en los de valor único, si llegan repetidos se toma el primero.
- **Multivalor:** claves repetidas (`?categoria=teatro&categoria=conciertos`), el formato nativo de un GET con casillas. Un valor único (`?categoria=teatro`) sigue funcionando.
- Filtrado: AND entre facetas, OR dentro de `categoria` y de `ciudad`. `mes` compara el mes del evento en zona `America/Lima`; `fecha` = "ese día o después" (viene del buscador de la landing) y se combina con AND.
- Serialización única con `toSearchParamEntries` / `buildEventsHref` (orden de claves del schema, sin vacíos, `orden=fecha` omitido). Todos los enlaces (chips, orden, pills, "Limpiar") y los inputs ocultos la usan.
- Meses del panel derivados de los eventos (zona Lima), ascendentes ("Noviembre 2026"…).
- h1 y metadata: `<Categoría|Eventos> | Mentec Tickets`; la categoría solo si hay **exactamente una**.

### Mejora progresiva

- El panel es un `<form action="/eventos" method="get">` con inputs nativos (no `Checkbox`/`RadioGroup` de Base UI, que necesitan JS).
- Sin JS: botón "Aplicar filtros" dentro de `<noscript>`; los filtros que el formulario no muestra viajan en inputs ocultos. Chips, orden, pills y buscador son enlaces o GET y funcionan igual.
- Con JS: cada cambio navega al momento con `router.push(href, { scroll: false })` + `useOptimistic` (la casilla responde sin esperar y conserva el foco; no se usa `key` para remontar).
- El `Sheet` necesita JS (como el menú del header). Al cambiar solo los searchParams, Next conserva el estado de cliente: el `Sheet` sigue abierto y "Ver n eventos" muestra el recuento real del servidor.

### Conteos facetados

- El número de cada categoría o ciudad = eventos que cumplen **los demás** filtros activos más ese valor (se ignora la propia faceta, así marcar "Teatro" no pone a 0 las otras categorías). Se muestran también las opciones con 0.
- Filtrado y conteos se calculan siempre en el servidor (`filterEvents`, `getFacetCounts`); nunca en cliente.

### Accesibilidad

- Un único h1; h2 "Filtros" en la barra lateral y h2 `sr-only` "Resultados".
- Todo control interactivo mide ≥ 44 px de alto (`h-11`) y tiene foco visible.
- Nada se comunica solo con color: orden activo con `aria-current="true"`, pill activa con `aria-current="page"`, contador del botón con texto `sr-only`.
- Sin scroll horizontal de página a 375 / 768 / 1024 / 1440 (las pills hacen scroll dentro de su `nav`).
- `prefers-reduced-motion`: sin animaciones nuevas salvo las del `Sheet`.
