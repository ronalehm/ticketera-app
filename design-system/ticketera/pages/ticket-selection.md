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

Sub-paso 2 de una zona numerada, debajo de `ZoneStepHeader` (que pone el nombre, el precio y el contador). No es una `Card` propia ni tiene h2. Cambiar de zona conserva los asientos de las demás.

- **Ayuda** arriba: "Toca una butaca para elegirla. Acerca el plano con los botones o pellizcando." (`text-sm text-muted-foreground`).
- **Barra de herramientas** (`flex flex-wrap gap-2`): "Acercar" (`ZoomIn`), "Alejar" (`ZoomOut`) y "Ver todo el plano" (`Maximize`) como `Button outline size-11` solo con icono y `aria-label`; "Mejor asiento disponible" (`Sparkles`) `Button secondary h-11 font-semibold`, alineado a la derecha desde `sm` (`sm:ml-auto`). Este último se deshabilita al llegar al máximo de entradas si no hay asientos elegidos en la zona.
- **Lienzo:** `rounded-xl bg-muted touch-none overflow-hidden w-full max-h-[70vh]`, con `aspect-ratio` igual al del `seatViewBox` de la zona. Zoom y paneo con `react-zoom-pan-pinch`:
  - abre con el plano entero a la vista (`fitOnInit="contain"`), escala de 1 a 4 y sin salirse de los bordes;
  - pellizco y arrastre en táctil; `touch-action: none` evita el zoom de la página;
  - la rueda sola desplaza la página; con Ctrl/Cmd hace zoom;
  - doble toque desactivado (no hace zoom y elige a la vez);
  - soltar tras arrastrar más de 4 px no elige asiento;
  - con `prefers-reduced-motion: reduce`, los botones de zoom no animan.
- **SVG** (`viewBox` = `seatViewBox`, ≤ 400 de ancho; a 375 px cada asiento mide ≥ 24 px con el plano entero a la vista):
  - escenario arriba: barra `fill-foreground rx-8` con `map.stage.label` en mayúsculas `fill-background font-bold tracking-widest` (`aria-hidden`);
  - etiqueta de fila a la izquierda (`fill-muted-foreground font-bold`, 24 unidades, `aria-hidden`);
  - asientos con pitch de 32 unidades y área de toque transparente de 32×32.
- Bajo el lienzo: leyenda, `<p role="status">` con el aviso del plano y "Tus asientos".

### Estados de asiento (forma y color, no solo color)

| Estado | Forma |
|---|---|
| Disponible | círculo r = 12 `fill-background stroke-primary` (2), hover `fill-accent` |
| Tu selección | círculo `fill-primary` con check `stroke-primary-foreground` |
| Ocupado | círculo `fill-secondary stroke-input` con "×" `stroke-muted-foreground`; `cursor-not-allowed`, no se puede elegir |
| Accesible (silla de ruedas) | cuadrado redondeado 24×24 `fill-highlight`; elegido, `fill-primary` con check |
| Foco (teclado) | anillo `stroke-ring` de 3 unidades alrededor de la forma (círculo r = 15 o cuadrado 30×30), solo con `focus-visible` |

Transición de color de 150 ms. "Mejor asiento disponible" nunca elige asientos accesibles; el usuario sí puede elegirlos a mano.

### Leyenda (`SeatLegend`)

`<ul aria-label="Leyenda del plano">` (`flex flex-wrap gap-x-5 gap-y-2 text-sm`): miniatura de cada forma (`size-6`, SVG `aria-hidden`, misma `SeatShape` que el plano) + texto: "Disponible", "Tu selección", "Ocupado" y "Accesible (silla de ruedas)".

### Avisos del plano (`role="status"`)

- Al llegar al límite: "Máximo 10 entradas por compra".
- "Mejor asiento disponible" con 1 asiento: "Elegimos Fila C · Asiento 6."; con varios: "Elegimos <k> asientos juntos en la fila C.".
- Sin bloque libre: "No quedan asientos disponibles en esta zona." (k = 1) o "No hay <k> asientos juntos disponibles en esta zona.".
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
- Tab recorre el mapa (zonas en el orden de los tipos), luego las tarjetas y luego "Tu compra"; en el sub-paso 2, "Todas las zonas", el stepper o el plano (una sola parada) y los botones.
- Plano: `<svg role="group" aria-label="Plano de asientos de <zona>" aria-describedby>` con ayuda `sr-only` "Usa las flechas para moverte entre asientos y Espacio para elegir o quitar.". Cada asiento es un `<g role="checkbox" aria-checked>` con `aria-label` "Fila F, asiento 12, disponible, S/ 150.00", "Fila F, asiento 12, accesible para silla de ruedas, S/ 150.00" u "Fila F, asiento 12, ocupado" (este con `aria-disabled="true"`). Teclado: ver "Teclado".
- Cantidades, subtotal, contador "n de m butacas" y totales con `aria-live="polite"`; estados siempre con texto ("Últimas entradas", "Agotado"), nunca solo color.
- Targets ≥ 44 px (`min-h-11`/`size-11`/`min-h-18`) en tarjetas, migas, steppers, zoom y el botón de la hoja, salvo los asientos (≥ 24 px con el plano entero a la vista; con zoom crecen); foco visible en todo lo interactivo, iconos `aria-hidden`.
- Animaciones solo con `motion-safe:` (y `animationTime` 0 en el zoom con `prefers-reduced-motion: reduce`).
- Sin scroll horizontal a 375 / 768 / 1024 / 1440.

## Metadata

- Título: `Elige tus entradas: <Título del evento> | Mentec Tickets`.
- Descripción: `Elige tu zona y tus entradas para <Título> en <Lugar>, <Ciudad>.`
- Solo se generan estáticamente los eventos con mapa.
