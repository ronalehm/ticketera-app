# Página: selección de entradas `/eventos/[slug]/entradas`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Specs: `docs/specs/seating-ticket-selection.md` y `docs/specs/seating-stadium-map.md` (rediseño en dos sub-pasos).

Paso 1 de 3 de la compra. Solo existe para los eventos con mapa del recinto (`hasVenueMap`); el resto da el 404 del evento ("No encontramos este evento").

## Layout

```
Header sticky     (igual que la landing)
Stepper           franja border-b: ① Entradas — ② Datos y pago — ③ Confirmación · "Compra segura"
                  (móvil: "Paso 1 de 3" + "Elige tus entradas" + barra de progreso al 33 %)
← Volver al evento
[mini] h1 Título del evento
       SÁB 14 NOV · 21:00 · Estadio Nacional, Lima
┌───────────────────────────────────────────┬──────────────┐
│ Elige tus entradas   Paso 1 de 2 · Elige  │ Tu compra    │  columna derecha 380px,
│                                una zona   │ (sticky)     │  sticky lg:top-24
│ ┌───────────────────────────────────────┐ │              │
│ │ mapa: escenario + zonas, etiquetas    │ │              │  sub-paso 1
│ │ HTML (nombre, precio, ✓ n)            │ │              │
│ └───────────────────────────────────────┘ │              │
│ [▌Campo VIP        c/u  ›] [▌Campo Gen. ›]│              │
│ [▌T. Occidente     c/u  ›] [▌T. Oriente ›]│              │
│ Precio final por entrada… Máximo 10…      │              │
└───────────────────────────────────────────┴──────────────┘

Sub-paso 2 (sustituye al mapa y las tarjetas dentro de la misma tarjeta):
│ Elige tus entradas  Paso 2 de 2 · Elige tus butacas │
│ ‹ Todas las zonas › Tribuna Oriente                 │
│ Tribuna Oriente · S/ 155.00 c/u      0 de 8 butacas │   (de pie: sin contador)
│ (icono) Numerada · elige tu butaca                  │
│ [plano de butacas]  ó  [panel Cantidad − n + / Subtotal] │

Barra inferior (< lg)  Total · 0 entradas / S/ 0.00   [⌃ Ver resumen] [Continuar →]
Footer            (igual que la landing)
```

- Stepper (`components/shared/PurchaseStepper`) fuera del contenedor, a ancho completo, con su propio `max-w-7xl`. Marca "Entradas" durante los dos sub-pasos: "Paso n de 2" es un indicador **interno** del paso, no un segundo stepper.
- Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pb-12`, `flex flex-col gap-6`. Sin padding inferior por debajo de `lg`: la barra móvil es el último elemento y llega al footer.
- Grilla `lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8`. Columna izquierda (`<section aria-labelledby>`, `min-w-0`): **una sola** `Card rounded-2xl gap-5` "Elige tus entradas". Columna derecha: "Tu compra", `hidden lg:flex lg:sticky lg:top-24 self-start`.
- Barra inferior móvil `sticky bottom-0 z-30 lg:hidden`, a ancho completo (`-mx-4 md:-mx-6`), con `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`. Es `sticky`, no `fixed`: se queda pegada abajo al desplazarse y no tapa el footer al final.
- **Orden móvil = orden del DOM.** Por breakpoint solo se alternan el resumen (`lg+`) y la barra (`< lg`); `display:none` saca al oculto del árbol de accesibilidad, así que nunca hay duplicados para los lectores.
- h1 único: título del evento (`text-2xl md:text-3xl font-bold tracking-tight`), junto a una miniatura decorativa `size-13 md:size-16 rounded-xl` (`alt=""`).
- Tarjetas ("Elige tus entradas", "Tu compra"): `Card rounded-2xl ring-border`, h2 `text-xl font-bold tracking-tight`.

## Tarjeta "Elige tus entradas" y sub-pasos

- **Cabecera** `flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1`: h2 "Elige tus entradas" y, a la derecha, `<p aria-live="polite" class="text-sm text-muted-foreground">` con el sub-paso:
  - "Paso 1 de 2 · Elige una zona" (sin zona abierta);
  - "Paso 2 de 2 · Elige la cantidad" (zona de pie abierta);
  - "Paso 2 de 2 · Elige tus butacas" (zona numerada abierta).
- **Sub-paso 1** (`flex flex-col gap-5`): mapa y, debajo, tarjetas de zona.
- **Sub-paso 2** (`flex flex-col gap-4`): cabecera de zona y, debajo, el panel de cantidad (de pie) o el plano de butacas (numerada). El mapa y las tarjetas no están en el DOM.
- Los sub-pasos viven en estado de cliente, en la misma ruta: no cambian la URL ni el historial ("Atrás" del navegador sale de `/entradas`). La selección (cantidades y butacas) se conserva al cambiar de sub-paso y de zona.
- **Abrir una zona:** clic, Enter o Espacio sobre su forma en el mapa o sobre su tarjeta. Las agotadas no abren nada.

### Foco entre sub-pasos

- Al abrir una zona, el foco pasa al h3 de la zona (render síncrono con `flushSync` y luego `focus()`).
- "Todas las zonas" vuelve al sub-paso 1 y el foco pasa a la tarjeta de la zona que se cerró (`[data-zone-id]`); como cualquier foco en una tarjeta, la resalta.
- Al quitar el último chip del plano, el foco vuelve al h3 de la zona.
- El foco nunca se pierde al cambiar de sub-paso, y el cambio se anuncia por el `aria-live` del indicador.

### Transición

- El sub-paso 2 entra creciendo desde la zona: `motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 motion-safe:ease-out`, con `transform-origin` en el `labelPos` de la zona (en % del `viewBox` del mapa).
- Al volver, el sub-paso 1 entra "alejándose" desde la zona cerrada: `motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-105 motion-safe:duration-300`, con el mismo origen.
- En el primer render no hay animación. Con `prefers-reduced-motion: reduce` no hay ninguna (`motion-safe:`). Sin librería de animación (`tw-animate-css`).

## Tonos por precio (mapa y tarjetas)

Se asignan por rango de precio entre las zonas **no agotadas**, de mayor a menor (`getZoneTones`). Precios iguales comparten tono; desde el 5.º precio distinto todos usan `tier-5`. Es una escala monocroma de azules Mentec (más oscuro = más caro), hecha con tokens y opacidad, sin hex ni tokens nuevos. El texto siempre acompaña al color (nombre y precio o "Agotado").

| Tono | Forma (SVG) | Etiqueta en el mapa | Barra en tarjetas |
|---|---|---|---|
| `tier-1` (más caro) | `fill-brand-navy` | `fill-background text-background` | `bg-brand-navy` |
| `tier-2` | `fill-primary-strong` | `fill-primary-foreground text-primary-foreground` | `bg-primary-strong` |
| `tier-3` | `fill-primary/65` | `fill-foreground text-foreground` | `bg-primary/65` |
| `tier-4` | `fill-primary/40` | `fill-foreground text-foreground` | `bg-primary/40` |
| `tier-5` | `fill-primary/20` | `fill-foreground text-foreground` | `bg-primary/20` |
| `sold-out` | `fill-secondary` | `fill-muted-foreground text-muted-foreground` + "Agotado" | `bg-secondary ring-1 ring-input` |

La columna "Etiqueta en el mapa" lleva la clase SVG (`fill-`) y la HTML (`text-`); las etiquetas HTML usan la `text-*`. Contraste del texto ≥ 4.5:1 (navy sobre `tier-3` ~7:1; blanco sobre `primary-strong` 5.6:1). El cian (`highlight`) ya no es un tono de zona: queda para las luces del escenario y las butacas accesibles.

Barra de color de las tarjetas de zona: `w-1.5 self-stretch rounded-full`, `aria-hidden`. El aside de precios del detalle (`ZonePricesCard`) usa la misma clase `swatch`.

## Mapa de zonas (`VenueMapView`)

- **Marco:** `rounded-xl bg-muted p-3 md:p-4` > contenedor `relative mx-auto w-full` con `aspect-ratio` del `viewBox` y `max-width: calc(min(64svh, 600px) * w / h)` (el mapa no pasa de ~600 px de alto en pantallas bajas). Dentro, el `<svg>` (`absolute inset-0 size-full`) y una capa de etiquetas HTML.
- **Escenario:** forma `fill-brand-navy` y, si el layout las trae, luces `<circle r=5 class="fill-highlight">`, en un `<g aria-hidden>`.
- **Zonas:** forma con la clase `shape` del tono + `stroke-background stroke-3` (separación blanca entre sectores).
- **Etiquetas en HTML** (`aria-hidden`, `pointer-events-none`), posicionadas en % del `viewBox` sobre su `labelPos` y centradas (`-translate-x-1/2 -translate-y-1/2`). Tamaño **fijo**, no escalan con el ancho: `text-xs` (12 px) por debajo de `md` y `text-sm` (14 px) desde `md`.
  - Escenario: `stage.label`, `font-bold uppercase tracking-widest text-background`.
  - Nombre `font-bold`; con `wrapLabel`, en 2 líneas partido en el primer espacio ("Tribuna" / "Oriente"); si no, `whitespace-nowrap`.
  - Precio (`S/ 330.00`) o "Agotado", `font-medium tabular-nums`, color de la clase `label` del tono.
  - `low-stock`: píldora "Últimas entradas" `rounded-full bg-warning text-warning-foreground`, **solo desde `md`** (a 375 px no cabe; el estado sigue en la tarjeta y en el `aria-label`).
  - Con selección: insignia tras el precio `h-5 rounded-full bg-background ring-1 ring-border text-xs font-bold` con `Check` y el número de entradas o butacas elegidas.

### Resaltado sincronizado mapa ↔ tarjetas

- Hover o foco en una zona del mapa **o** en su tarjeta resaltan las dos (estado compartido en `TicketSelection`).
- **En el mapa:** un trazo `stroke-brand-navy stroke-4 fill-none` superpuesto (dibujado después de todas las zonas, `pointer-events-none`; no un halo detrás, porque los tonos translúcidos lo dejarían ver por dentro) y el resto de zonas y etiquetas a `opacity-40` (`transition-opacity duration-200`).
- **En la tarjeta:** `data-highlighted="true"`, con el mismo fondo y borde que el hover (`bg-accent/40 border-primary/40`).
- Es solo visual: no se anuncia ni cambia la selección. Al abrir o cerrar una zona se limpia. Las agotadas no se resaltan. En táctil no hay hover.

### Estados de zona

| Estado | Mapa | Tarjeta |
|---|---|---|
| Disponible | color del tono, `cursor-pointer` | barra del tono, precio con "c/u" y chevron |
| Últimas entradas (`low-stock`) | píldora "Últimas entradas" (desde `md`) | `Badge` "Últimas entradas" `h-6 bg-warning text-warning-foreground` |
| Agotada (`sold-out`) | gris (`sold-out`) con "Agotado"; `aria-disabled`, `cursor-not-allowed`; enfocable, no abre nada ni se resalta | "Agotado" `font-bold text-muted-foreground` sin precio ni chevron; `aria-disabled`, sin hover; enfocable, no abre nada |
| Con selección | insignia ✓ n en la etiqueta | "n entradas elegidas" / "n butacas elegidas" `text-sm font-medium text-primary-strong` |
| Resaltada (hover/foco de su pareja) | trazo navy encima, resto al 40 % | `data-highlighted`: fondo `accent/40`, borde `primary/40` |
| Foco (teclado) | trazo `stroke-ring` de 4 unidades discontinuo (`[stroke-dasharray:8_6]`), `outline-none` | `ring-3 ring-ring/50` |

## Tarjetas de zona (`ZoneCards`)

- `<ul aria-label="Zonas" class="grid gap-3 sm:grid-cols-2">`, en el orden del mapa (una columna por debajo de `sm`).
- Cada tarjeta es un `<button type="button" data-zone-id data-highlighted>` a todo el ancho: `flex min-h-18 items-center gap-3 rounded-xl border bg-card p-3`, hover `border-primary/40 bg-accent/40` (200 ms).
  - Izquierda: barra de color del tono.
  - Centro: nombre `text-base font-bold` (+ `Badge` "Últimas entradas"); debajo, `Users` "General · sin butaca" o `Armchair` "Numerada · elige tu butaca" (`text-sm text-muted-foreground`, icono `size-4`); y, si hay selección, "n entradas elegidas" / "n butacas elegidas".
  - Derecha: "c/u" (`text-xs text-muted-foreground`) sobre el precio (`text-base font-bold tabular-nums text-foreground`, no en color de marca) y `ChevronRight`.
- `aria-label`: "<nombre>, <precio> c/u, general sin butaca" o "…, numerada, elige tu butaca"; más ", últimas entradas" y ", 2 entradas elegidas" / ", 2 butacas elegidas" si aplica; agotada: "<nombre>, agotado, …".
- Pie: "Precio final por entrada, sin cargos ocultos. Máximo 10 entradas por compra." (`text-sm text-muted-foreground`).

## Cabecera de zona (`ZoneStepHeader`, sub-paso 2)

- Migas `<Breadcrumb aria-label="Ruta de selección">`: botón `ChevronLeft` "Todas las zonas" (`inline-flex min-h-11 font-semibold text-primary-strong hover:text-foreground`) › nombre de la zona (`BreadcrumbPage`).
- Fila `flex flex-wrap items-baseline justify-between`: h3 con el nombre (`text-base md:text-lg font-bold`, `tabIndex={-1}`, `outline-none scroll-mt-24`; recibe el foco al abrir la zona) + " · S/ 155.00 c/u" (`text-muted-foreground tabular-nums`) + `Badge` "Últimas entradas" si aplica; a la derecha, en zonas numeradas, el contador.
- **Contador** (`<p aria-live="polite" class="text-sm font-medium tabular-nums">`): "n de m butacas", con n = butacas elegidas en la zona y m = n + (10 − entradas totales de la compra). Sin nada elegido: "0 de 10 butacas"; con 2 entradas en otra zona: "0 de 8 butacas".
- Debajo: `Users` "General · sin butaca" o `Armchair` "Numerada · elige tu butaca".

## Panel de cantidad (`ZoneQuantityPanel`, zona de pie)

- Contenedor `flex flex-col gap-4 rounded-xl border p-4`.
- Fila: "Cantidad" (`text-base font-semibold`) sobre "S/ 330.00 c/u"; a la derecha, stepper en pastilla (`rounded-xl border p-0.5`) dentro de un `role="group"` etiquetado por "Cantidad": "−" `secondary` y "+" primario, ambos `Button size-11` con `aria-label` "Quitar/Agregar una entrada de <zona>", y la cantidad en medio (`tabular-nums`, `aria-live="polite"`).
- "−" deshabilitado en 0 y "+" al llegar a 10 entradas en total (`focusableWhenDisabled` + `aria-disabled:*`, como `TicketSelector`: no pierden el foco).
- Subtotal (`border-t pt-3`): "Subtotal" e importe precio × cantidad (`text-lg font-bold tabular-nums`, `aria-live="polite"`).
- Pie `<p role="status">`: "Máximo 10 entradas por compra." o, en el límite, "Llegaste al máximo de 10 entradas por compra.".

## Plano de asientos (`SeatPlan`)

Sub-paso 2 de una zona numerada, debajo de `ZoneStepHeader` (que pone el nombre, el precio y el contador). No es una `Card` propia ni tiene h2. Cambiar de zona conserva los asientos de las demás. Objetivo visual: la captura del paso 2 ("Tribuna Oriente"), con tokens Mentec.

### Estructura (de arriba abajo)

```
Toca una butaca para elegirla. Acerca el plano…            (ayuda)
                                        [ + | − | ⤢ ]      (< sm: barra sobre el lienzo, a la derecha)
┌──────────────────────────────────────────────────┐
│        A  B  C  D …                               │      lienzo (relative): plano + tooltip
│     A ○ ○ ✕ ○ ●✓ ○ …            (letras en los    │
│     B ○ ✕ ○ ○ ○ ○ …               dos extremos)   │
│                                   [ + | − | ⤢ ]   │      (≥ sm: pastilla abajo a la derecha)
└──────────────────────────────────────────────────┘
○ Disponible · S/ 155.00  ● Elegida  ✕ Ocupada  ▣ Accesible        2 elegidas
──────────────────────────────────────────────────────
┌ ¿Cuántas butacas juntas? [− 2 +]      [✦ Elegir las mejores butacas] ┐   (bg-muted)
Elegimos 2 asientos juntos en la fila C.                     (role="status")
Tus asientos  [Tribuna Oriente · Fila C · Asiento 4 ×] …
```

1. **Ayuda:** "Toca una butaca para elegirla. Acerca el plano con los botones o pellizcando." (`text-sm text-muted-foreground`).
2. **Pastilla de zoom** (ver "Controles de zoom"): por debajo de `sm`, en una barra justo encima del lienzo.
3. **Lienzo:** `relative w-full max-h-[70vh] touch-none overflow-hidden rounded-xl bg-muted ring-1 ring-border`, con el `aspect-ratio` del `seatViewBox` de la zona. Dentro: el plano con zoom y paneo, el tooltip y, desde `sm`, la pastilla de zoom superpuesta.
4. **Leyenda** (`SeatLegend`) con el precio y "n elegidas".
5. **Bandeja** `flex flex-col gap-4 border-t pt-4`: "Mejores butacas" (`BestSeatsPicker`), `<p role="status">` con el aviso del plano y "Tus asientos" (todas las zonas).

### Zoom y paneo (`react-zoom-pan-pinch`)

- Abre con el plano entero a la vista (`fitOnInit="contain"`), escala de 1 a 4 y sin salirse de los bordes.
- Pellizco y arrastre en táctil; `touch-action: none` evita el zoom de la página.
- La rueda sola desplaza la página; con Ctrl/Cmd hace zoom.
- Doble toque desactivado (no hace zoom y elige a la vez).
- Soltar tras arrastrar más de 4 px no elige asiento.
- Con `prefers-reduced-motion: reduce`, el zoom no anima (`animationTime` 0).

### Controles de zoom

- **Una sola pastilla** `role="group" aria-label="Zoom del plano"`: `inline-flex gap-1 rounded-xl bg-background p-1 shadow-sm ring-1 ring-border`, con tres `Button variant="ghost" size="icon" class="size-11 cursor-pointer"`: `Plus` "Acercar", `Minus` "Alejar" y `Maximize` "Ver todo el plano" (`aria-label`; iconos `size-5 aria-hidden`).
- **Por debajo de `sm`:** en la barra sobre el lienzo (`flex items-end justify-between gap-2`), alineada a la derecha. A 375 px, superpuesta taparía butacas (p. ej. `oriente-J-10`, en la esquina inferior derecha).
- **Desde `sm`:** la barra pasa a `sm:contents` y la pastilla se superpone al lienzo abajo a la derecha (`sm:absolute sm:bottom-3 sm:right-3 sm:z-10`), como en la captura. Con el plano entero a la vista no debe tapar ninguna butaca: el contenido transformado reserva 64 px abajo (`pb-16` desde `sm`). Con zoom, el paneo saca las butacas de debajo.
- Es el mismo elemento en los dos anchos (no se duplica para lectores) y va **antes del plano en el orden de Tab**, en ambos anchos.

### Plano (SVG)

- `<svg class="group/plan block size-full select-none">` con `viewBox` = `seatViewBox` (≤ 400 de ancho). A 375 px el pitch de 32 unidades (área de toque transparente de 32 × 32) mide ≥ 24 px con el plano entero a la vista.
- **En cuadrícula** (zona sin `planTransform`): escenario arriba, barra `fill-foreground rx-8` con `map.stage.label` en mayúsculas `fill-background font-bold tracking-widest`.
- **En arco** (con `planTransform`, p. ej. las tribunas del festival): **sin** barra "ESCENARIO" (contradecía la orientación del sector). El fondo del estadio y el minimapa llegan en la Fase 5.
- **Letras de fila en los dos extremos** de cada fila, `fill-muted-foreground font-bold`, 13 unidades (`ROW_LABEL_FONT_SIZE`; ≈ la mitad del diámetro de la butaca, ~18 px a 1440 y ~10 px a 375 con el plano entero a la vista: excepción decorativa a MASTER §3, porque la fila va en el `aria-label` y en el tooltip y la letra crece al acercar), `text-anchor="middle"`, `dominant-baseline="central"`, en un `<g aria-hidden>`:
  - en cuadrícula, en los dos márgenes (`x = 20` y `x = ancho − 20`, a la altura de la fila);
  - en arco, siguiendo la curva: en `getRowEdgeLabelPoints(row).start` y `.end` (a 0.8 pitch por fuera de la primera y la última butaca).

### Estados de butaca (forma y color, no solo color)

| Estado | Forma |
|---|---|
| Disponible | círculo r = 12 `fill-primary/30 stroke-primary stroke-[1.5]` (el "lavanda" de la captura, igual en todas las zonas), hover `fill-primary/50` |
| Elegida | círculo r = 12 (o el cuadrado de la accesible) `fill-brand-navy` con check `stroke-background stroke-[2.5]`; el check entra con `motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-150` |
| Ocupada | círculo `fill-secondary stroke-input stroke-2` con "×" `stroke-muted-foreground`; `cursor-not-allowed`, no se puede elegir |
| Accesible (silla de ruedas) | cuadrado 24 × 24 `rx` 6 `fill-highlight` con el icono `Accessibility` (lucide, 16 × 16, `text-highlight-foreground`) |
| Foco (teclado) | anillo `stroke-ring` de 3 unidades alrededor de la forma (círculo r = 15 o cuadrado 30 × 30), solo con `focus-visible` |

- Transición de color de 150 ms. El borde `primary` de las disponibles contrasta ≥ 3:1 con `muted` y `accent`.
- La forma (`SeatShape`) es la misma en el plano, la leyenda y la vista previa del organizer (`SeatGridPreview`).

### Números al acercar (nivel de detalle)

- Cada butaca **disponible sin elegir** lleva su número: `<text>` de 12 unidades `fill-brand-navy font-bold tabular-nums`, centrado, `pointer-events-none`, dentro del `<g aria-hidden>` de la butaca (el lector ya anuncia el `aria-label`). Las elegidas, ocupadas y accesibles no llevan número.
- Está oculto (`opacity-0`) y solo se ve con `data-detail="numbers"` en el `<svg>` (`group-data-[detail=numbers]/plan:opacity-100`, con `transition-opacity`).
- `data-detail` lo escribe un componente sin salida visual con `useTransformInit`/`useTransformEffect`, sin re-render: `"numbers"` si la escala es > 1 **y** el número mide ≥ 12 px (`unidad × escala ≥ 1`, con `getPlanFit` y `getSeatDetailLevel`); si no, `"overview"`. Sin atributo cuenta como `"overview"`.
- Con el plano entero a la vista se ve como la captura, sin números. A 375 px aparecen al primer "Acercar" (≈ 16 px); a 768 y 1440, ya muy por encima de 12 px. "Ver todo el plano" los oculta.

### Tooltip (`SeatTooltip`)

- Uno por plano, solo visual (`aria-hidden`): `pointer-events-none absolute z-20 rounded-lg bg-brand-navy px-3 py-1.5 text-xs text-background shadow-lg whitespace-nowrap`, centrado sobre la butaca (`-translate-x-1/2`) y encima (`-translate-y-full -mt-2`); si la butaca queda a menos de 48 px del borde superior del lienzo, debajo (`mt-2`). El centro se recorta a 64 px de los lados del lienzo para que no se corte.
- **Texto:** título `font-bold` "Fila C · Asiento 4" y detalle `tabular-nums`: "S/ 155.00" (disponible), "Elegida · S/ 155.00", "Accesible · S/ 155.00" u "Ocupada".
- **Aparece** con el puntero de ratón o lápiz sobre una butaca (`pointerover` delegado; en táctil no) y al enfocar una butaca con el teclado (sigue a las flechas). Tras un clic de ratón vuelve a mostrarse con el estado nuevo ("Elegida · …").
- **Se oculta** al salir el puntero de las butacas, con `blur` y al empezar paneo, zoom o pellizco.
- Se descarta el `Tooltip` de shadcn (Base UI): exigiría un `Tooltip.Root` por butaca dentro de un contenedor transformado, y en táctil se abriría al tocar.

### Leyenda (`SeatLegend`)

- Contenedor `flex flex-wrap items-center justify-between gap-x-6 gap-y-2`.
- `<ul aria-label="Leyenda del plano" class="flex flex-wrap gap-x-5 gap-y-2 text-sm">`: miniatura de cada forma (`size-6`, SVG `aria-hidden`, misma `SeatShape` que el plano) + texto: "Disponible · S/ 155.00", "Elegida", "Ocupada" y, solo si la zona tiene butacas accesibles, "Accesible (silla de ruedas)".
- A la derecha, `<p aria-live="polite" class="text-sm font-medium tabular-nums">` con las butacas elegidas **en la zona**: "0 elegidas", "1 elegida", "n elegidas".

### "Mejores butacas" (`BestSeatsPicker`)

- Caja `flex flex-col gap-3 rounded-xl bg-muted p-3 sm:flex-row sm:items-center sm:justify-between`: por debajo de `sm`, la pregunta y el stepper arriba y el botón debajo, a todo el ancho.
- **Izquierda:** "¿Cuántas butacas juntas?" (`text-sm font-semibold`) y un stepper en pastilla con las clases de `ZoneQuantityPanel` (`role="group"` etiquetado por la pregunta): "−" `secondary` "Quitar una butaca", el valor (`tabular-nums`, `aria-live="polite"`) y "+" primario "Agregar una butaca", ambos `size-11`.
- **Rango** 1…m, con m la del contador "n de m butacas" (las que caben en la compra). "−" se deshabilita en 1 y "+" en m.
- **Valor inicial:** las butacas ya elegidas en la zona si hay alguna; si no, 2 (la compra más común), recortado a m. Se reinicia al abrir otra zona.
- **Derecha:** `Button variant="outline" class="h-11 cursor-pointer gap-2 font-semibold text-primary-strong"` con `Sparkles`: "Elegir las mejores butacas" o, con 1, "Elegir la mejor butaca".
- **Al pulsar:** sustituye las butacas de la zona por el mejor bloque de esa cantidad (fila más cercana al escenario con bloque libre, lo más centrado posible; nunca butacas accesibles). Las de otras zonas no cambian. Oculta el tooltip y acerca el plano al bloque con `zoomToElement` (escala máx. 2, 300 ms; al instante con movimiento reducido), así que los números ya se ven.
- **Con m = 0** (10 entradas en otras zonas): el stepper y el botón quedan deshabilitados pero enfocables (`focusableWhenDisabled` + `aria-disabled:*`).

### Avisos del plano (`role="status"`)

- Al llegar al límite: "Máximo 10 entradas por compra".
- "Mejores butacas" con 1: "Elegimos Fila C · Asiento 6."; con varias: "Elegimos <k> asientos juntos en la fila C.".
- Sin bloque libre: "No quedan asientos disponibles en esta zona." (k = 1) o "No hay <k> asientos juntos disponibles en esta zona.". La selección no cambia.
- El aviso se limpia con la siguiente acción que cambia la selección.

### "Tus asientos" (`SelectedSeatChips`)

- h3 "Tus asientos" (`text-base font-bold`); vacío: "Aún no elegiste asientos." (`text-sm text-muted-foreground`).
- Un chip por asiento elegido, de cualquier zona y en orden de selección: `rounded-full bg-secondary min-h-11 pl-4 text-sm font-medium`, con la etiqueta completa ("Tribuna Norte · Fila F · Asiento 12") y un `Button ghost size-11 rounded-full` con `X` y `aria-label="Quitar <etiqueta completa>"`.
- Al quitar un chip, el foco pasa al botón del chip siguiente (o al anterior); si no queda ninguno, al h3 de la zona.

### Teclado

| Tecla | Acción |
|---|---|
| Tab | entra y sale del plano en **una sola parada** (roving tabindex): el último asiento enfocado; si no hay, el primer elegido de la zona, el primer disponible o el primero |
| ← / → | asiento anterior / siguiente de la fila (en los extremos se queda) |
| ↑ / ↓ | asiento de la fila anterior / siguiente más cercano en distancia (en cuadrícula, la misma posición horizontal; también en filas en arco) |
| Home / End | primer / último asiento de la fila |
| Espacio / Enter | elige o quita el asiento enfocado, sin desplazar la página (`preventDefault`); sobre un ocupado no hace nada |

- Los asientos ocupados se pueden enfocar (para oír su estado), pero no elegir.
- El foco se mueve con `preventScroll`; si el plano tiene zoom y el asiento queda fuera de la vista, se centra manteniendo la escala.
- Zoom solo con los botones (el teclado del plano no hace zoom).

## Resumen "Tu compra" y barra móvil

- Vacío: caja `border-2 border-dashed border-input rounded-xl p-5` "Todavía no elegiste entradas. Empieza eligiendo una zona.".
- Líneas "`<n>` × `<zona>`" con importe `tabular-nums font-bold`; en zonas numeradas, debajo, las etiquetas cortas de sus asientos ("Fila F · Asiento 12, …", `text-sm text-muted-foreground`) y la cantidad es el número de asientos; separador `border-t-2 border-dashed`; "Total (n entradas)" con importe `text-2xl font-bold tabular-nums` (`aria-live="polite"`) y siempre "Precio final, sin cargos ocultos".
- CTA "Continuar" + `ArrowRight`: primario `h-11 font-semibold hover:bg-primary-strong`. Con 0 entradas es `<button disabled>`; con ≥ 1 es un enlace a `/checkout?evento=<slug>&<tipo>=<n>…`, más `&asientos=<id>,<id>…` si hay asientos (cada zona numerada lleva como `<n>` su número de asientos).
- El contenido (líneas o vacío, total, nota y CTA) es `PurchaseSummaryContent`, compartido por el aside (`lg+`) y la hoja móvil.
- **Barra móvil** (`< lg`): bloque `aria-live="polite"` con "Total · n entradas" (`text-xs text-muted-foreground`) e importe `text-xl font-bold tabular-nums`; botón `outline size-11` con `ChevronUp` (`aria-label="Ver resumen de la compra"`); y "Continuar" (`h-11 px-5`). Cabe a 375 px sin scroll horizontal.
- **Hoja "Tu compra"** (`Sheet`, `side="bottom"`, `max-h-[85svh] rounded-t-2xl`): `SheetTitle` "Tu compra" (`text-lg font-bold`), botón "Cerrar" `size-11` y el cuerpo con `PurchaseSummaryContent` (`overflow-y-auto`, padding con `safe-area-inset-bottom`). Es modal y solo sirve para revisar: el mapa y el plano nunca quedan tapados mientras se elige. Base UI lleva el foco a la hoja; Escape o "Cerrar" la cierran y el foco vuelve al botón.

## Accesibilidad

- Un solo `<h1>` (título del evento); h2 "Elige tus entradas" y "Tu compra" (en móvil, "Tu compra" es el `SheetTitle` de la hoja abierta); h3 de la zona en el sub-paso 2 y h3 "Tus asientos" en el plano.
- Stepper: `<ol aria-label="Pasos de la compra">` siempre en el DOM (`sr-only` por debajo de `md`), paso actual con `aria-current="step"`; el bloque móvil visual es `aria-hidden`.
- Indicador de sub-paso con `aria-live="polite"`: el cambio de sub-paso se anuncia.
- Mapa: `<svg role="group" aria-label="Mapa de zonas de <recinto>">`; cada zona es un `<path role="button" tabIndex={0}>` (sin `aria-pressed`) con `aria-label` "<nombre>, <precio>" o "<nombre>, agotado", más ", asientos numerados", ", últimas entradas" y ", 2 entradas elegidas" / ", 1 butaca elegida" cuando aplica. Se abre con clic, Enter o Espacio (con `preventDefault`, no desplaza la página). Las agotadas llevan `aria-disabled="true"`.
- Tab recorre el mapa (zonas en el orden de los tipos), luego las tarjetas y luego "Tu compra". En el sub-paso 2: "Todas las zonas" y el stepper de cantidad (de pie), o "Todas las zonas", el grupo "Zoom del plano" (3 botones), el plano (una sola parada), "Mejores butacas" (stepper y botón) y los chips (numerada).
- Plano: `<svg role="group" aria-label="Plano de asientos de <zona>" aria-describedby>` con ayuda `sr-only` "Usa las flechas para moverte entre asientos y Espacio para elegir o quitar.". Cada asiento es un `<g role="checkbox" aria-checked>` con `aria-label` "Fila F, asiento 12, disponible, S/ 150.00", "Fila F, asiento 12, accesible para silla de ruedas, S/ 150.00" u "Fila F, asiento 12, ocupado" (este con `aria-disabled="true"`). Teclado: ver "Teclado".
- Cantidades, subtotal, contador "n de m butacas", "n elegidas" de la leyenda, valor de "¿Cuántas butacas juntas?" y totales con `aria-live="polite"`; el tooltip de butaca es `aria-hidden` (el lector anuncia el `aria-label`); estados siempre con texto ("Últimas entradas", "Agotado"), nunca solo color.
- Targets ≥ 44 px (`min-h-11`/`size-11`/`min-h-18`) en tarjetas, migas, steppers, zoom y el botón de la hoja, salvo los asientos (≥ 24 px con el plano entero a la vista; con zoom crecen); foco visible en todo lo interactivo, iconos `aria-hidden`.
- Animaciones solo con `motion-safe:` (y `animationTime` 0 en el zoom con `prefers-reduced-motion: reduce`).
- Sin scroll horizontal a 375 / 768 / 1024 / 1440.

## Metadata

- Título: `Elige tus entradas: <Título del evento> | Mentec Tickets`.
- Descripción: `Elige tu zona y tus entradas para <Título> en <Lugar>, <Ciudad>.`
- Solo se generan estáticamente los eventos con mapa.
