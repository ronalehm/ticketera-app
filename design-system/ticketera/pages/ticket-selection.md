# Página: selección de entradas `/eventos/[slug]/entradas`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Specs: `docs/specs/seating-ticket-selection.md`, `docs/specs/seating-stadium-map.md` (rediseño en dos sub-pasos), `docs/specs/design-alignment-purchase-flow.md` (Fase 1: pantalla de compra) y `docs/specs/seating-all-venue-maps.md` (mapas para todos los eventos posibles).

Paso 1 de 3 de la compra. Solo existe para los eventos con mapa del recinto (`hasVenueMap`); el resto da el 404 del evento ("No encontramos este evento"), que se muestra con el header y el footer del sitio (`app/(purchase)/eventos/[slug]/not-found.tsx` con `SiteShell`): quien llega a un evento inexistente no está comprando.

## Layout

```
Cabecera de compra  PurchaseShell currentStep={1}, flecha "Volver al evento":
                    logo · ① Entradas — ② Datos y pago — ③ Confirmación · "Compra segura"
                    (< lg: [←] "Paso 1 de 3" / "Elige tus entradas" · candado + barra al 33 %)
Fondo bg-muted
← Volver al evento
[mini] h1 Título del evento
       SÁB 14 NOV · 21:00 · Estadio Nacional, Lima
┌───────────────────────────────────────────┬──────────────┐
│ Elige tus entradas   Paso 1 de 2 · Elige  │ Tu compra    │  columna derecha 380px,
│                                tus zonas  │ (sticky)     │  sticky lg:top-24
│ ┌───────────────────────────────────────┐ │ 2 × VIP  🗑  │
│ │ mapa (ilustración, role="img"):       │ │ 3 × Gen. 🗑  │  sub-paso 1
│ │ escenario + zonas, etiquetas HTML     │ │ Total …      │
│ │ (nombre, precio, ✓ n)                 │ │ [Continuar]  │
│ └───────────────────────────────────────┘ │              │
│ Puedes combinar varias zonas en una misma compra.        │  (con ≥ 2 zonas no agotadas)
│ [▌Campo VIP  S/ 330 c/u  [− 2 +]] [▌Campo Gen. [− 0 +]]  │  de pie: stepper en la tarjeta
│ [▌T. Occidente  [Elegir butacas ›]] [▌T. Oriente [Cambiar butacas ›]] │  numerada: abre el sub-paso 2
│ Precio final por entrada… Máximo 10…      │              │
└───────────────────────────────────────────┴──────────────┘

Sub-paso 2 (sustituye al mapa y las tarjetas dentro de la misma tarjeta; solo numeradas o `?zona=`):
│ Elige tus entradas  Paso 2 de 2 · Elige tus butacas │
│ ‹ Todas las zonas › Tribuna Oriente                 │
│ Tribuna Oriente · S/ 155.00 c/u      0 de 8 butacas │   (de pie: sin contador)
│ (icono) Numerada · elige tu butaca                  │
│ [plano de butacas]  ó  [panel Cantidad − n + / Subtotal] │
│ ─────────────────────────────────────────────────── │   (solo con ≥ 1 entrada en la zona)
│ Puedes combinar varias zonas…   [+ Agregar otra zona] │

Barra inferior (< lg)  Total · 0 entradas / S/ 0.00   [⌃ Ver resumen] [Continuar →]
(sin footer)
```

- **Pantalla de compra:** la página vive en `app/(purchase)` y compone ``<PurchaseShell currentStep={1} back={{ href: `/eventos/${slug}`, label: "Volver al evento" }}>``, sin el header ni el footer del sitio, sobre fondo `bg-muted`. La cabecera de compra (logo, stepper y "Compra segura" en `lg`; por debajo de `lg`, la flecha "Volver al evento" de 44 px, "Paso 1 de 3" sobre "Elige tus entradas", el candado y la barra al 33 %) se describe en `checkout.md` ("Pantalla de compra"). Las tarjetas son `Card` (`bg-card`) y la barra móvil, `bg-background`: quedan blancas sobre el gris.
- El stepper marca "Entradas" durante los dos sub-pasos: "Paso n de 2" es un indicador **interno** del paso, no un segundo stepper.
- El enlace "← Volver al evento" de `EventPurchaseStrip` sigue en el contenido en todos los anchos; por debajo de `lg` la cabecera añade su flecha al mismo destino.
- Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pb-12`, `flex flex-col gap-6`. Sin padding inferior por debajo de `lg`: la barra móvil es el último elemento y llega al final de la página.
- Grilla `lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8`. Columna izquierda (`<section aria-labelledby>`, `min-w-0`): **una sola** `Card rounded-2xl gap-5` "Elige tus entradas". Columna derecha: "Tu compra", `hidden lg:flex lg:sticky lg:top-24 self-start`.
- Barra inferior móvil `sticky bottom-0 z-30 lg:hidden`, a ancho completo (`-mx-4 md:-mx-6`), con `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`. Es `sticky`, no `fixed`: se queda pegada abajo al desplazarse y llega al final de la página.
- **Orden móvil = orden del DOM.** Por breakpoint solo se alternan el resumen (`lg+`) y la barra (`< lg`); `display:none` saca al oculto del árbol de accesibilidad, así que nunca hay duplicados para los lectores.
- h1 único: título del evento (`text-2xl md:text-3xl font-bold tracking-tight`), junto a una miniatura decorativa `size-13 md:size-16 rounded-xl` (`alt=""`).
- Tarjetas ("Elige tus entradas", "Tu compra"): `Card rounded-2xl ring-border`, h2 `text-xl font-bold tracking-tight`.

## Tarjeta "Elige tus entradas" y sub-pasos

- **Cabecera** `flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1`: h2 "Elige tus entradas" y, a la derecha, `<p aria-live="polite" class="text-sm text-muted-foreground">` con el sub-paso:
  - "Paso 1 de 2 · Elige tus zonas" (sin zona abierta; también en los mapas sin zonas numeradas comprables, por coherencia);
  - "Paso 2 de 2 · Elige la cantidad" (zona de pie abierta, solo con `?zona=`);
  - "Paso 2 de 2 · Elige tus butacas" (zona numerada abierta).
- **Sub-paso 1** (`flex flex-col gap-5`): mapa y, debajo, tarjetas de zona. Aquí se hace la **compra combinada**: las cantidades de pie se eligen con el stepper de cada tarjeta, sin salir del sub-paso 1, y cada cambio se ve al momento en el stepper, en la insignia "✓ n" del mapa y como línea en "Tu compra".
- **Sub-paso 2** (`flex flex-col gap-4`): cabecera de zona y, debajo, el plano de butacas (numerada) o el panel de cantidad (de pie, solo con `?zona=`). Si la zona tiene ≥ 1 entrada, al final va el pie "Agregar otra zona" (ver abajo). El mapa y las tarjetas no están en el DOM.
- Los sub-pasos viven en estado de cliente, en la misma ruta: no cambian la URL ni el historial ("Atrás" del navegador sale de `/entradas`). La selección (cantidades y butacas) se conserva al cambiar de sub-paso y de zona. La URL solo **inicializa** la pantalla (ver "Precarga y entrada por zona desde la URL"): la precarga fija la selección inicial y `?zona=` el sub-paso inicial; la pantalla nunca los escribe ni los borra.
- **Abrir una zona:** solo con el botón "Elegir butacas" / "Cambiar butacas" de la tarjeta de una zona numerada, o al llegar con `?zona=` (ver "Entrada por zona"). El mapa no abre nada (es una ilustración) y las zonas de pie no tienen sub-paso 2 desde la pantalla: se eligen en su tarjeta. Las agotadas no tienen controles.
- **Compra independiente:** una sola zona de pie son 2 acciones ("+" y "Continuar"); una numerada, como siempre ("Elegir butacas", butacas y "Continuar").
- **Pie "Agregar otra zona"** (sub-paso 2, solo si la zona tiene ≥ 1 entrada): `<div class="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">` con "Puedes combinar varias zonas en una misma compra." (`text-sm text-muted-foreground`) y `Button variant="outline" class="h-11 cursor-pointer gap-2 font-semibold"` con `Plus` (`aria-hidden`) y "Agregar otra zona". Hace lo mismo que "Todas las zonas" (vuelta al sub-paso 1 con su transición y el foco en la tarjeta). Sin entradas en la zona no aparece: para volver están las migas. No hay botón "Listo": terminar es "Continuar", siempre a la vista.

### Foco entre sub-pasos

- Al abrir una zona, el foco pasa al h3 de la zona (render síncrono con `flushSync` y luego `focus()`).
- "Todas las zonas" y "Agregar otra zona" vuelven al sub-paso 1 y el foco pasa al **contenedor de la tarjeta** de la zona que se cerró (`[role="group"][data-zone-id]`, `tabIndex={-1}`: recibe el foco sin ser parada de Tab; las formas del mapa también llevan `data-zone-id`, pero no son enfocables). Como cualquier foco en una tarjeta, la resalta y muestra el anillo de foco.
- Al quitar el último chip del plano, el foco vuelve al h3 de la zona.
- El foco nunca se pierde al cambiar de sub-paso, y el cambio se anuncia por el `aria-live` del indicador.
- Al cargar la página (con o sin precarga, con o sin `?zona=`) el foco no se mueve ni se anuncia nada: la página carga como cualquier otra navegación.

### Transición

- El sub-paso 2 entra creciendo desde la zona: `motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 motion-safe:ease-out`, con `transform-origin` en el `labelPos` de la zona (en % del `viewBox` del mapa).
- Al volver, el sub-paso 1 entra "alejándose" desde la zona cerrada: `motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-105 motion-safe:duration-300`, con el mismo origen.
- En el primer render del sub-paso 1 no hay animación. El sub-paso 2 entra siempre con su transición, también cuando es el primer render por `?zona=` (ver "Entrada por zona"). Con `prefers-reduced-motion: reduce` no hay ninguna (`motion-safe:`). Sin librería de animación (`tw-animate-css`).

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
- **Recintos en estadio (todos los mapas mock):** comparten el centro (300, 54) y el escenario semicircular (sector de radio 90, de −10° a 190°, "ESCENARIO" en (300, 70) y 7 luces). Las zonas son sectores anulares concéntricos, con 8 unidades de separación entre anillos (12 entre el escenario y el primero). Barrido por recinto:

  | Recinto | Zonas | Barrido |
  |---|---|---|
  | Festival (Costa Verde) | Campo VIP y Campo General (de pie) · Tribuna Norte · Tribunas Occidente y Oriente (numeradas) | 112° (34°–146°) · 114° (33°–147°) · 40° a cada lado (150°–190° y −10°–30°) |
  | Arena (Estadio Nacional) | VIP, Preferencial y General de pie | 88° (46°–134°) |
  | Arena | Tribuna Norte (numerada) | 40° (70°–110°) |
  | Teatro (Gran Teatro Nacional) | Platea y Mezanine (numeradas) | 84° (48°–132°) |
  | Comedia (Arena 1) | Mesa y Preferencial (numeradas) y General de pie | 98° (41°–139°) |
  | Copa del Norte (Estadio Mansiche, herradura) | Popular y Oriente de pie · Occidente (numerada), las tres en la banda 102–296 | Popular 52° (64°–116°) · Oriente 54° (6°–60°) · Occidente 54° (120°–174°) |
  | Los Ecos del Sur (Teatro Municipal de Arequipa, agotado) | Platea (numerada, 102–250) y General, la galería, de pie (258–352); las dos agotadas, en gris | 90° (45°–135°) |
  | Sol de Verano (Explanada Costa 21) | Preferencial (102–218, junto al escenario) y General (226–336), de pie · VIP de pie al fondo (344–456: lounge con "vista elevada") | 100° (40°–140°) · VIP 68° (56°–124°) |
  | Arena y Mar (Playa Colán) | VIP (102–218, techada frente al escenario) y General (226–336), de pie | 100° (40°–140°) |
  | Micro abierto (Centro Cultural Peruano Norteamericano) | Mesa (numerada, mesas para dos, 102–214) y General de pie (222–328) | 100° (40°–140°) |
  | Sueños de una noche andina (Teatro Municipal de Cusco) | Preferencial (numerada, "primeras cinco filas", 102–232) y General de pie (240–340) | 90° (45°–135°) |

- **Deportes (herradura):** la cancha es el sector del escenario (`PITCH_STAGE`: la misma forma y las mismas 7 luces, que hacen de reflectores, con la etiqueta "CANCHA"). Las tribunas laterales van a los lados (Oriente a la derecha, Occidente a la izquierda) y el fondo abajo (Popular), las tres en la misma banda de radios, con 4° entre vecinas. Las laterales del festival (40°, banda de 166) no sirven: a 375 px la fila del precio con la insignia no cabe en su banda; con 54° y radios 102–296 cabe.

- **Ilustración, no control:** `<svg role="img" aria-label="Mapa de zonas de <recinto>">`. Dice dónde está cada zona respecto del escenario; la acción (cantidad o "Elegir butacas"), el resaltado y todo lo que se anuncia de cada zona están en las tarjetas.
- **Escenario:** forma `fill-brand-navy` y, si el layout las trae, luces `<circle r=5 class="fill-highlight">`, en un `<g aria-hidden>`.
- **Zonas:** `<path data-zone-id>` con la clase `shape` del tono + `stroke-background stroke-3 transition-opacity duration-200` (separación blanca entre sectores). Sin `role`, `tabIndex`, `aria-*`, manejadores de clic, teclado, puntero o foco, `cursor-pointer` ni estilos de foco: un clic no hace nada y el cursor es el de por defecto. Conservan los eventos de puntero por defecto (sin `pointer-events-none`), así que `document.elementFromPoint` sigue devolviendo la forma; `data-zone-id` sirve a tests y Playwright.
- **Etiquetas en HTML** (`aria-hidden`, `pointer-events-none`), posicionadas en % del `viewBox` sobre su `labelPos` y centradas (`-translate-x-1/2 -translate-y-1/2`). Tamaño **fijo**, no escalan con el ancho: `text-xs` (12 px) por debajo de `md` y `text-sm` (14 px) desde `md`.
  - Escenario: `stage.label`, `font-bold uppercase tracking-widest text-background`.
  - Nombre `font-bold`; con `wrapLabel`, en 2 líneas partido en el primer espacio ("Tribuna" / "Oriente"); si no, `whitespace-nowrap`.
  - Precio (`S/ 330.00`) o "Agotado", `font-medium tabular-nums`, color de la clase `label` del tono.
  - `low-stock`: píldora "Últimas entradas" `rounded-full bg-warning text-warning-foreground`, **solo desde `md`** (a 375 px no cabe; el estado sigue en la tarjeta y en el `aria-label`).
  - Con selección: insignia tras el precio `h-5 rounded-full bg-background ring-1 ring-border text-xs font-bold` con `Check` y el número de entradas o butacas elegidas.
  - **Sitio para las etiquetas en la arena** (`viewBox` 600 × 640): las bandas de pie miden 94–112 unidades (VIP 102–214, Preferencial 222–320, General 328–422) para que nombre y precio, y desde `md` la píldora de VIP, queden a ≥ 3 px del borde visible de su banda (radio ± 1.5 por el trazo blanco), y la insignia de selección a ≥ 0.5 px. Las etiquetas no se encogen: caben por geometría. Holgura mínima medida (Playwright, la menor de VIP, Preferencial y General; "sin selección / con la insignia ✓ 2"): 3.4 px (Preferencial y General) / 1.1 px (VIP y Preferencial) a 375, 20.4 / 18.4 px a 640, 11.6 / 11.6 px a 768, 3.7 / 3.7 px a 1024 (VIP, por la píldora: el mapa mide 461 px, limitado por su columna) y 9.8 / 9.8 px a 1440 (VIP). La píldora de VIP queda entera dentro de su banda: 18.3 px a 768, 6.4 px a 1024 y 15.7 px a 1440.
  - **Sitio para las etiquetas en los demás recintos:** la holgura se mide igual, añadiendo en los sectores laterales los bordes radiales (rectas a `startAngle` y `endAngle`, menos 1.5 unidades por el trazo), desde las 4 esquinas y los 4 puntos medios de cada pieza (nombre, precio con su insignia y píldora). Holgura mínima medida (Playwright; "sin selección / con la insignia ✓ 2"; la menor de los 5 anchos, a 375 salvo donde se indica):

    | Recinto | Zona | Holgura (px) | Borde que la limita |
    |---|---|---|---|
    | Copa del Norte | Popular | 13.2 / 6.6 | exterior (precio) |
    | | Oriente | 11.3 / 4.9 | radial de 6° (nombre) / interior (precio con insignia) |
    | | Occidente | 8.4 / 3.8 | interior (nombre / precio con insignia) |
    | Los Ecos del Sur | General | 4.8 (agotada, sin insignia) | interior (nombre) |
    | | Platea | 16.8 (agotada, sin insignia) | interior (nombre) |
    | Sol de Verano | General | 6.7 / 3.8 | interior (nombre) / exterior (precio con insignia) |
    | | Preferencial | 5.5 (a 1024, con la píldora) / 3.0 | interior (nombre) / exterior (precio con insignia) |
    | | VIP | 8.1 / 5.1 | interior (nombre) / exterior (precio con insignia) |
    | Arena y Mar | General | 6.7 / 4.1 | interior (nombre) / exterior (precio con insignia) |
    | | VIP | 5.8 / 3.4 | interior (nombre) / exterior (precio con insignia) |
    | Micro abierto | General | 5.8 / 3.7 | interior (nombre) / exterior (precio con insignia) |
    | | Mesa | 4.8 / 2.8 | interior (nombre) |
    | Sueños de una noche andina | General | 4.3 / 2.3 | interior (nombre) |
    | | Preferencial | 9.6 / 7.2 | interior (nombre) / exterior (precio con insignia) |

    De 640 a 1440 todas superan los 14 px (la menor, General de Sueños a 1024: 14.3), salvo Preferencial de Sol de Verano a 1024 (5.5 px: el mapa mide 484 px, limitado por su columna, y el nombre sube por la píldora). Copa del Norte y Los Ecos del Sur no tienen "Últimas entradas". La píldora de Preferencial (`low-stock`) de Sol de Verano queda entera dentro de su banda desde `md`: 33.4 px a 768, 12.4 px a 1024 y 34.7 px a 1440 (borde exterior).

### Resaltado desde las tarjetas

- Solo de la tarjeta al mapa (estado compartido en `TicketSelection`): el puntero sobre una tarjeta o el foco en ella o en sus controles resaltan su zona. El puntero sobre una forma del mapa no resalta nada.
- Pasar el foco de "−" a "+" de la misma tarjeta no lo apaga (`onBlur` solo lo quita si el foco sale de la tarjeta).
- **En el mapa:** un trazo `stroke-brand-navy stroke-4 fill-none` superpuesto (dibujado después de todas las zonas, `pointer-events-none`; no un halo detrás, porque los tonos translúcidos lo dejarían ver por dentro) y el resto de zonas y etiquetas a `opacity-40` (`transition-opacity duration-200`).
- **En la tarjeta:** `data-highlighted="true"`, con el mismo fondo y borde que el hover (`bg-accent/40 border-primary/40`).
- Es solo visual: no se anuncia ni cambia la selección. Al abrir o cerrar una zona se limpia (y al volver, el foco en la tarjeta la resalta de nuevo). Las agotadas no se resaltan. En táctil no hay hover.

### Estados de zona

| Estado | Mapa | Tarjeta |
|---|---|---|
| Disponible | color del tono, cursor por defecto (sin `cursor-pointer`) | barra del tono, precio con "c/u" y el control: stepper (de pie) o "Elegir butacas" (numerada) |
| Últimas entradas (`low-stock`) | píldora "Últimas entradas" (desde `md`) | `Badge` "Últimas entradas" `h-6 bg-warning text-warning-foreground` |
| Agotada (`sold-out`) | gris (`sold-out`) con "Agotado"; sin `aria-disabled` ni `cursor-not-allowed`; un clic no hace nada | "Agotado" `font-bold text-muted-foreground`, sin precio ni controles (Tab la salta); no se resalta |
| Con selección | insignia ✓ n en la etiqueta | de pie: el valor del stepper; numerada: "n butacas elegidas" `text-sm font-medium text-primary-strong` y el botón pasa a "Cambiar butacas" |
| Resaltada (hover/foco de la tarjeta) | trazo navy encima, resto al 40 % | `data-highlighted`: fondo `accent/40`, borde `primary/40` |
| Foco | el mapa no recibe foco | la tarjeta, al volver del sub-paso 2: `ring-3 ring-ring/50`; sus controles, el anillo de `Button` |

## Tarjetas de zona (`ZoneCards`)

- Contenedor `@container flex flex-col gap-3`:
  - **ayuda** (solo con ≥ 2 zonas no agotadas): "Puedes combinar varias zonas en una misma compra." (`text-sm text-muted-foreground`);
  - **lista** `<ul aria-label="Zonas" class="grid gap-3 @xl:grid-cols-2">`, en el orden del mapa: 2 columnas cuando la lista mide ≥ 576 px (a 768 y 1440) y 1 por debajo (375, 640 y 1024, donde el aside deja la columna estrecha);
  - **pie** `text-sm text-muted-foreground`: "Precio final por entrada, sin cargos ocultos." y un `<span role="status">` con "Máximo 10 entradas por compra." o, en el límite, "Llegaste al máximo de 10 entradas por compra." (el mismo texto que el panel de cantidad).
- **Cada tarjeta** es un `<li class="flex">` con un `<div role="group" aria-labelledby={nombre} tabIndex={-1} data-zone-id data-highlighted>`. **No es un botón.**
  - Clases: `flex min-h-18 w-full gap-3 rounded-xl border bg-card p-3 outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50`; si no está agotada, `data-[highlighted=true]:border-primary/40 data-[highlighted=true]:bg-accent/40`. Sin `cursor-pointer` ni `hover:` propio: el fondo llega por `data-highlighted` (puntero o foco).
  - Izquierda: barra de color del tono.
  - Cuerpo `flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2` con dos bloques:
    - **Información** (`flex min-w-40 flex-1 flex-col gap-0.5`): nombre `text-base font-bold` (+ `Badge` "Últimas entradas"); `Users` "General · sin butaca" o `Armchair` "Numerada · elige tu butaca" (`text-sm text-muted-foreground`, icono `size-4`); si no está agotada, el precio `text-base font-bold tabular-nums text-foreground` (no en color de marca) + " c/u" (`text-sm text-muted-foreground`); en las numeradas con butacas, "1 butaca elegida" / "n butacas elegidas" (`text-sm font-medium text-primary-strong`).
    - **Acción** (`ml-auto shrink-0`):
      - de pie: `QuantityStepper` "Cantidad de <zona>" con "Quitar una entrada de <zona>" / "Agregar una entrada de <zona>"; "−" deshabilitado en 0 y "+" en el límite (deshabilitados pero enfocables);
      - numerada: `Button variant="outline" class="h-11 cursor-pointer gap-1.5 font-semibold text-primary-strong"` "Elegir butacas" o, con butacas, "Cambiar butacas", con `ChevronRight` (`aria-hidden`) y `aria-label` "Elegir butacas de <zona>" / "Cambiar butacas de <zona>". Sigue habilitado en el límite (para ver o cambiar butacas);
      - agotada: "Agotado" (`font-bold text-muted-foreground`), sin control ni precio.
    - Si la información (mín. 160 px) y la acción no caben en una línea, la acción pasa debajo, alineada a la derecha, sin scroll horizontal.
  - **Resaltado:** `onPointerEnter`/`onFocus` → resalta; `onPointerLeave` → lo quita; `onBlur` lo quita solo si el foco sale de la tarjeta. Las agotadas no resaltan.
- La tarjeta se nombra por su nombre visible (sin `aria-label` propio) y el resto se lee como contenido.

## Cabecera de zona (`ZoneStepHeader`, sub-paso 2)

- Migas `<Breadcrumb aria-label="Ruta de selección">`: botón `ChevronLeft` "Todas las zonas" (`inline-flex min-h-11 font-semibold text-primary-strong hover:text-foreground`) › nombre de la zona (`BreadcrumbPage`).
- Fila `flex flex-wrap items-baseline justify-between`: h3 con el nombre (`text-base md:text-lg font-bold`, `tabIndex={-1}`, `outline-none scroll-mt-24`; recibe el foco al abrir la zona) + " · S/ 155.00 c/u" (`text-muted-foreground tabular-nums`) + `Badge` "Últimas entradas" si aplica; a la derecha, en zonas numeradas, el contador.
- **Contador** (`<p aria-live="polite" class="text-sm font-medium tabular-nums">`): "n de m butacas", con n = butacas elegidas en la zona y m = n + (10 − entradas totales de la compra). Sin nada elegido: "0 de 10 butacas"; con 2 entradas en otra zona: "0 de 8 butacas".
- Debajo: `Users` "General · sin butaca" o `Armchair` "Numerada · elige tu butaca".

## Panel de cantidad (`ZoneQuantityPanel`, zona de pie)

- Contenedor `flex flex-col gap-4 rounded-xl border p-4`.
- Solo se ve al llegar con `?zona=<zona de pie>` (desde el aside del detalle): dentro de la pantalla, las zonas de pie se eligen en su tarjeta.
- Fila: "Cantidad" (`text-base font-semibold`) sobre "S/ 330.00 c/u"; a la derecha, el `QuantityStepper` (pastilla `rounded-xl border p-0.5`, `role="group"` etiquetado por "Cantidad"): "−" `secondary` y "+" primario, ambos `Button size-11` con `aria-label` "Quitar/Agregar una entrada de <zona>", y la cantidad en medio (`tabular-nums`, `aria-live="polite"`). Es el mismo componente que el stepper de las tarjetas y el de "Mejores butacas".
- "−" deshabilitado en 0 y "+" al llegar a 10 entradas en total (`focusableWhenDisabled` + `aria-disabled:*`, como `TicketSelector`: no pierden el foco).
- Subtotal (`border-t pt-3`): "Subtotal" e importe precio × cantidad (`text-lg font-bold tabular-nums`, `aria-live="polite"`).
- Pie `<p role="status">`: "Máximo 10 entradas por compra." o, en el límite, "Llegaste al máximo de 10 entradas por compra.".
- Debajo del panel, con ≥ 1 entrada, el pie "Agregar otra zona" del sub-paso 2.

## Plano de asientos (`SeatPlan`)

Sub-paso 2 de una zona numerada, debajo de `ZoneStepHeader` (que pone el nombre, el precio y el contador). No es una `Card` propia ni tiene h2. Cambiar de zona conserva los asientos de las demás. Objetivo visual: la captura del paso 2 ("Tribuna Oriente"), con tokens Mentec.

Dos variantes según la zona (los datos lo deciden):

- **En arco** (con `planTransform`; las zonas numeradas de todos los mapas mock): fondo del estadio, lienzo apaisado desde `sm` y minimapa.
- **En cuadrícula** (sin `planTransform`; mapas sin geometría, hoy ninguno en el mock, y la vista previa del organizer, `SeatGridPreview`): barra "ESCENARIO", sin fondo ni minimapa y con la proporción del plano en todos los anchos.

**Planos grandes: se elige tras "Acercar" en móvil** (arena, teatro y comedia: `norte`, `platea`, `mezanine` y `preferencial`; y Preferencial de Sueños de una noche andina). Conservan sus butacas por zona, así que su `seatViewBox` mide hasta 622 de ancho (≤ 12 filas, sin límite de butacas por fila). A 375 px, con el plano entero a la vista, las butacas miden ~16–18 px (sirven para ver el plano; Norte, 17.6 px); tras un "Acercar" (×1.5) miden ≥ 24 px (medido: 26.5 Norte, 25.0 Platea, 24.5 Mezanine, 24.8 Preferencial). La ayuda "Toca una butaca para elegirla. Acerca el plano con los botones o pellizcando." ya lo indica. El festival mantiene los límites de la spec base (≤ 10 butacas por fila, ≤ 400 de ancho, ≥ 24 px con el plano entero), y también los cumple Occidente de Copa del Norte (6 filas de 4 a 9 butacas, `seatViewBox` 365 × 368: medido 27.3 px con el plano entero y 40.9 px tras un "Acercar"). También los cumple Mesa de Micro abierto (3 filas de 6, 8 y 10 butacas, mesas para dos, `seatViewBox` 389 × 203: medido 25.6 px con el plano entero y 38.4 px tras un "Acercar"). Preferencial de Sueños de una noche andina ("primeras cinco filas": 5 filas de 6 a 13 butacas, 48, `seatViewBox` 470 × 254) es un plano grande: medido 21.2 px con el plano entero y 31.8 px tras un "Acercar". Platea de Los Ecos del Sur (61 butacas, `seatViewBox` 508 × 280) sería un plano grande, pero está agotada y no se abre.

### Estructura (de arriba abajo)

```
Toca una butaca para elegirla. Acerca el plano…            (ayuda)
[minimapa]                              [ + | − | ⤢ ]      (< sm: barra sobre el lienzo; minimapa solo en arco
                                                            y, desde sm, aquí si no cabe superpuesto)
┌──────────────────────────────────────────────────┐
│ [minimapa]     A  B  C  D …                       │      lienzo (relative): plano + tooltip
│ ▓▓▓▓      A ○ ○ ✕ ○ ●✓ ○ …     (letras en los     │      (≥ sm: minimapa arriba a la izquierda si cabe, solo en arco;
│ ▓▓ escenario  B ○ ✕ ○ ○ ○ …      dos extremos)    │       fondo del estadio alrededor del sector, solo en arco)
│                                   [ + | − | ⤢ ]   │      (≥ sm: pastilla abajo a la derecha)
└──────────────────────────────────────────────────┘
○ Disponible · S/ 155.00  ● Elegida  ✕ Ocupada  ▣ Accesible        2 elegidas
──────────────────────────────────────────────────────
┌ ¿Cuántas butacas juntas? [− 2 +]      [✦ Elegir las mejores butacas] ┐   (bg-muted)
Elegimos 2 asientos juntos en la fila C.                     (role="status")
Tus asientos  [Tribuna Oriente · Fila C · Asiento 4 ×] …
```

1. **Ayuda:** "Toca una butaca para elegirla. Acerca el plano con los botones o pellizcando." (`text-sm text-muted-foreground`).
2. **Barra sobre el lienzo** (`flex items-end justify-between gap-2`): minimapa a la izquierda (solo en arco) y pastilla de zoom a la derecha. Desde `sm` pasa a `sm:contents` y los dos se superponen al lienzo, salvo cuando el minimapa no cabe superpuesto (ver "Minimapa"): entonces la barra se queda, solo con el minimapa, y la pastilla se superpone igual.
3. **Lienzo:** `relative w-full max-h-[70vh] touch-none overflow-hidden rounded-xl bg-muted ring-1 ring-border`. Dentro: el plano con zoom y paneo, el tooltip y, desde `sm`, el minimapa (en arco) y la pastilla de zoom superpuestos.
   - **Proporción:** la del `seatViewBox` de la zona (`aspect-(--plan-aspect)`, con la variable en línea). En arco, desde `sm`, apaisado `sm:aspect-[16/10]`: el plano queda centrado (`fitOnInit="contain"`) y el margen lateral aloja el zoom (con el lienzo estrecho, además, una franja inferior; ver "Controles de zoom") y, cuando hay sitio, el minimapa (ver "Minimapa"). Va por variable CSS porque un `aspect-ratio` en línea ganaría a la variante `sm:`.
   - **Contenedor `@container`:** el bloque del lienzo (la barra y el lienzo, que miden lo mismo de ancho) es un contenedor de Tailwind. El minimapa y la franja del zoom en arco dependen del **ancho del lienzo** (umbral `@2xl`, 42rem = 672 px), no del de la ventana: a 1024 px, con dos columnas, el lienzo mide 516 px aunque la ventana sea ancha.
   - **Por debajo de `sm`** el lienzo mantiene la proporción del plano en las dos variantes, para no bajar de 24 px por butaca (en los planos grandes, tras un "Acercar"; ver arriba).
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
- **Desde `sm`:** la barra pasa a `sm:contents` y la pastilla se superpone al lienzo abajo a la derecha (`sm:absolute sm:bottom-3 sm:right-3 sm:z-10`), como en la captura. Con el plano entero a la vista no debe tapar ninguna butaca:
  - **en cuadrícula**, el contenido transformado reserva 64 px abajo (`pb-16` desde `sm`);
  - **en arco**, según el ancho del lienzo:
    - **lienzo estrecho (< 672 px**, p. ej. 576 a 640 de ventana o 516 a 1024): la misma franja de 64 px abajo (`sm:@max-2xl:pb-16`). El margen lateral del 16:10 no basta para la pastilla (a 516 px de lienzo la tocaba en `oriente-J-9`), y con la franja el plano queda siempre por encima de ella;
    - **lienzo ancho (≥ 672 px):** sin franja; el margen lateral del 16:10 aloja la pastilla.
    - El minimapa descuenta la franja de su recuadro (alto del lienzo − alto del `<svg>`, en `getVisiblePlanRect({ insetBottom })`).
    - Holgura mínima medida entre la pastilla y la caja de la butaca más cercana (área de toque de 32 × 32), con el plano entero a la vista, en las 6 zonas numeradas de los 4 mapas: 25.5 px a 375 (`norte-A-1`; la pastilla va en la barra), 41.2 px a 640 (`platea-H-5`), 18.8 px a 768 (`platea-H-4`), 31.7 px a 1024 (`norte-F-5`) y 29.2 px a 1440 (`platea-H-4`). Con las letras de fila: 25.7 px a 375 (Platea), 51.4 px a 640, 38.7 px a 768, 40.2 px a 1024 (Oriente) y 58.2 px a 1440. Sin solapes en ningún ancho.
    - Occidente de Copa del Norte (medido en los 5 anchos de Playwright): 49.1 px a 375 (`occidente-A-4`; en la barra), 106.4 px a 640, 123.2 px a 768, 81.3 px a 1024 y 159.3 px a 1440; con las letras, ≥ 35.6 px. Sin solapes.
    - Mesa de Micro abierto (ídem): 46.9 px a 375 (`mesa-A-1`; en la barra), 69.1 px a 640, 64.2 px a 768, 54.6 px a 1024 y 86.6 px a 1440; con las letras, ≥ 44.2 px. Sin solapes.
    - Preferencial de Sueños de una noche andina (ídem): 37.9 px a 375 (`preferencial-A-1`; en la barra), 51.8 px a 640, 38.0 px a 768 (`preferencial-E-4`), 40.0 px a 1024 y 61.7 px a 1440; con las letras, ≥ 36.5 px. Sin solapes.
    - Coste: con la franja, el plano entero a la vista es más pequeño (butaca de 15.5 px a 1024 y 17.7 px a 640, frente a 19.3 y 21.5 sin ella); se acerca con el zoom.
  - Con zoom, el paneo saca las butacas de debajo.
- Es el mismo elemento en los dos anchos (no se duplica para lectores) y va **antes del plano en el orden de Tab**, en ambos anchos.

### Plano (SVG)

- `<svg class="group/plan block size-full select-none">` con `viewBox` = `seatViewBox` (≤ 400 de ancho en el festival; ≤ 622 en los planos grandes). A 375 px el pitch de 32 unidades (área de toque transparente de 32 × 32) mide ≥ 24 px con el plano entero a la vista en el festival, y tras un "Acercar" en los planos grandes.
- **En cuadrícula** (zona sin `planTransform`): escenario arriba, barra `fill-foreground rx-8` con `map.stage.label` en mayúsculas `fill-background font-bold tracking-widest`.
- **En arco** (con `planTransform`: las zonas numeradas de todos los mapas mock): **sin** barra "ESCENARIO" (contradecía la orientación del sector); el `<svg>` lleva `overflow-visible`, así que el fondo del estadio se ve alrededor del sector, recortado por el lienzo.
- **Letras de fila en los dos extremos** de cada fila, `fill-muted-foreground font-bold`, 13 unidades (`ROW_LABEL_FONT_SIZE`; ≈ la mitad del diámetro de la butaca, con el plano entero a la vista ~16 px en arco con el lienzo ancho (lienzo 16:10; ~8–11 px con el lienzo estrecho y su franja) y 18–22 px en cuadrícula a 1440, y ~10 px a 375: excepción decorativa a MASTER §3, porque la fila va en el `aria-label` y en el tooltip y la letra crece al acercar), `text-anchor="middle"`, `dominant-baseline="central"`, en un `<g aria-hidden>`:
  - en cuadrícula, en los dos márgenes (`x = 20` y `x = ancho − 20`, a la altura de la fila);
  - en arco, siguiendo la curva: en `getRowEdgeLabelPoints(row).start` y `.end` (a 0.8 pitch por fuera de la primera y la última butaca).

### Fondo del estadio (solo en arco)

El estadio entero dibujado debajo de las butacas, en coordenadas del plano, como en la captura del paso 2:

- `<g aria-hidden class="pointer-events-none" transform="translate(x y) scale(s)">` con el `planTransform` de la zona (plano = estadio × s + (x, y)): coincide con el mapa del sub-paso 1 y con el minimapa. Es el primer hijo del `<svg>`, antes de las letras y de las butacas.
- **Escenario:** `fill-brand-navy`, con sus luces `fill-highlight` (r = 5 unidades del mapa, como en `VenueMapView`).
- **Demás zonas:** `fill-secondary stroke-background`, 2 px (separación blanca).
- **Zona abierta:** `fill-accent stroke-primary`, 2 px (el "lila con borde azul" de la captura), dibujada la última para que su borde quede encima.
- Los trazos llevan `vector-effect="non-scaling-stroke"`: miden 2 px a cualquier zoom.
- Sin textos del mapa. Al no recibir eventos, el teclado, el tooltip, "Mejores butacas" y el paneo funcionan igual sobre él.

### Minimapa (`SeatPlanMinimap`, solo en arco)

- SVG `aria-hidden` (sin foco) con el `viewBox` del mapa: `h-auto w-24 @2xl:w-28 rounded-lg bg-background/90 p-1 shadow-sm ring-1 ring-border`. Escenario `fill-brand-navy`, zonas `fill-secondary` y la zona abierta `fill-primary`.
- **Recuadro de la vista:** `fill-none stroke-foreground`, 2 px no escalables. Con el plano entero a la vista rodea todo el sector; al acercar o pellizcar se reduce y sigue al paneo (lee la transformación con `useTransformEffect`, el tamaño del lienzo y el alto del `<svg>`, para descontar la franja inferior cuando la hay). Esas medidas se leen con decimales del estilo calculado (`getComputedStyle`), no con `clientWidth`/`clientHeight`: el redondeo a píxeles enteros desviaba el recuadro hasta 1.2 unidades del mapa tras Acercar en los planos que encajan casi justo a lo ancho y a lo alto (Norte a 375, Platea a 1024). Medido frente a las esquinas del lienzo pasadas al plano, en las 6 zonas numeradas abribles, a 375 y de 640 a 1440 px (cada 20 px, y cada 4 px de 1000 a 1100): diferencia ≤ 0.001 unidades del mapa con el plano entero, tras Acercar y tras panear.
- **Posición:** envuelto en `<div class="pointer-events-none flex">` con `data-placement` (`overlay` o `bar`).
  - **Ancho según el lienzo** (`@2xl:w-28`, contenedor del lienzo): 96 px con el lienzo estrecho (< 672 px, también a 375 en la barra) y 112 px con el ancho. Con `md:w-28` (ventana) medía 112 px a 1024 sobre un lienzo de 516 y tapaba `occidente-J-8` y `occidente-J-9`.
  - **Desde `sm`, superpuesto arriba a la izquierda solo si cabe** (`data-placement="overlay"`, con `sm:absolute sm:top-3 sm:left-3 sm:z-10`): cabe si el `seatViewBox` encajado en el `<svg>` (como `xMidYMid meet`, con `getPlanFit`) empieza a la derecha del minimapa (margen izquierdo ≥ 12 px + su ancho) o por debajo de él (margen superior ≥ 12 px + su alto). Las butacas y las letras van dentro del `seatViewBox`, así que superpuesto no tapa nada **por construcción**, sea cual sea el plano o el ancho.
    - **Si no cabe** (`data-placement="bar"`), sigue en la barra sobre el lienzo, como por debajo de `sm`, y la pastilla de zoom sigue superpuesta abajo a la derecha. Mover el minimapa no cambia el tamaño del lienzo.
    - `SeatPlan` lo decide antes de pintar (`useLayoutEffect`, sin salto al abrir la zona) y en cada cambio de tamaño del lienzo (`ResizeObserver`), que también cambia el ancho del minimapa y la franja inferior. Sin medidas (jsdom), superpuesto.
    - **Por qué:** el margen lateral del 16:10 no basta en los planos apaisados. Con el minimapa siempre superpuesto, tapaba la esquina superior izquierda de Norte, Mezanine y Preferencial (filas A–C): butacas hasta −23.9 px (`norte-C-13`) y letras hasta −26.9 px a 1024; a 640, −10.8 / −13.7 px; también las letras de Norte de 740 a 800 y de 1180 a 1220 px (medido con la geometría anterior de la arena, Norte de 66°).
    - **Resultado:** el festival (Oriente y Occidente, planos casi cuadrados) lo lleva superpuesto en todos los anchos, igual que antes; Norte, Platea, Mezanine y Preferencial, en la barra desde `sm` (su plano llega a la esquina, aunque en Platea las butacas no la tocaran).
    - Holgura mínima medida con el plano entero a la vista, de 640 a 1440 px (cada 20 px, y cada 4 px de 1000 a 1100), frente a la caja de la butaca más cercana (área de toque de 32 × 32) y a la de las letras de fila: superpuesto, 30.7 px (`occidente-J-9` a 1180) y 46.1 px con letras; en la barra queda fuera del lienzo (≥ 40.6 px, `norte-A-12` a 1024, y 41.8 px con letras). Sin solapes en ningún ancho. La pastilla no cambia (mínimo 16.9 px, `platea-H-4` a 1180). Con la Tribuna Norte de 40°, su minimapa (más alto, por el `viewBox` 600 × 640) mide 96 × 102 px y 112 × 119 px, y va en la barra en todos los anchos desde `sm`.
    - Occidente de Copa del Norte (plano casi cuadrado, como el festival): superpuesto desde `sm` en los 5 anchos de Playwright, con el minimapa de 96 × 61 px (lienzo estrecho) o 112 × 70 px (ancho); holgura mínima 63 px frente a las butacas (`occidente-F-9` a 1024) y 67.2 px frente a las letras. A 375, en la barra (56.3 px). Sin solapes.
    - Mesa de Micro abierto y Preferencial de Sueños de una noche andina (planos apaisados): en la barra en los 5 anchos de Playwright, con el minimapa de 96 × 65 / 112 × 76 px (Mesa) y 96 × 67 / 112 × 78 px (Preferencial). Holgura mínima de 640 a 1440 frente a las butacas: 83.7 px (`mesa-A-6` a 1024) y 83.2 px (`preferencial-B-8` a 1024); frente a las letras, 72.4 y 74.4 px. A 375: 46.9 y 37.9 px. Sin solapes.
  - Por debajo de `sm`, a la izquierda de la barra sobre el lienzo, frente a la pastilla de zoom (96 × 68 px a 375).
  - `pointer-events-none`: es decorativo, así que con zoom no bloquea el paneo ni las butacas que quedan debajo.

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
- **Izquierda:** "¿Cuántas butacas juntas?" (`text-sm font-semibold`) y el `QuantityStepper` (`role="group"` etiquetado por la pregunta): "−" `secondary` "Quitar una butaca", el valor (`tabular-nums`, `aria-live="polite"`) y "+" primario "Agregar una butaca", ambos `size-11`.
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

## Precarga y entrada por zona desde la URL

Spec: `docs/specs/seating-stadium-map.md`, Fase 6 (decisiones 15 y 31–33, requisitos 32–39). La URL del paso 1 admite dos tipos de parámetros de **entrada**, que se pueden combinar y solo inicializan el estado: abrir o cerrar zonas, o elegir, no los escribe ni los borra.

| Parámetro | Ejemplo | Efecto |
|---|---|---|
| `<ticketTypeId>=<n>` y `asientos=<id>,<id>` (contrato C sin `evento`) | `?campo-vip=2&oriente=2&asientos=oriente-C-3%2Coriente-C-4` | selección inicial (precarga) |
| `zona=<zoneId>` | `?zona=vip` | sub-paso inicial (el 2 de esa zona) |

`zona`, `asientos` y `evento` son nombres reservados de la URL del paso 1: ningún tipo de entrada puede llamarse así.

### Prerenderizado (`Suspense`)

- La ruta sigue prerenderizada (SSG con `generateStaticParams`, ● en el build) y la página **no lee `searchParams`**: leerlos la volvería dinámica.
- La página compone, dentro del mismo `PurchaseShell` y tras `EventPurchaseStrip`:

  ```tsx
  <Suspense fallback={<TicketSelection map={map} />}>
    <PreselectedTicketSelection map={map} />
  </Suspense>
  ```

- `PreselectedTicketSelection` (cliente) lee `useSearchParams()`, lo convierte con `parseSeatingPreselection` (selección) y `parseInitialZoneId` (zona) y renderiza `TicketSelection` con `initialSelection` e `initialZoneId`. `TicketSelection` no lee la URL.
- El HTML prerenderizado es el `fallback`: la pantalla sin selección en el sub-paso 1. En una carga completa, al hidratar se sustituye por la versión con la URL aplicada. Con navegación de cliente (p. ej. desde el aside del detalle), la URL ya está disponible al montar y se ve directamente el resultado. Sin JavaScript, cualquier enlace lleva a una pantalla útil (el sub-paso 1).
- Sin parámetros, la pantalla es idéntica a la de antes de la Fase 6.

### Precarga

- **De dónde viene:** de "Cambiar entradas" (y "Volver a entradas") de `/checkout` (`buildChangeTicketsHref`, ver `checkout.md`): `/eventos/<slug>/entradas?<ticketTypeId>=<n>…&asientos=<id>,<id>`. `parseSeatingPreselection` es la inversa de `buildSeatingCheckoutHref` ("Continuar"): ir a checkout, volver y continuar sin cambios da el mismo pedido.
- **Sub-paso inicial: el 1** (salvo que también venga `zona`). Desde el primer render, las cantidades se ven en las tarjetas (el stepper de las de pie en 2; "2 butacas elegidas" y "Cambiar butacas" en las numeradas), en las insignias del mapa, en "Tu compra" y en la barra móvil ("Total · 4 entradas"), y "Continuar" ya enlaza a checkout. Al abrir una zona numerada, sus butacas aparecen elegidas y se pueden quitar o cambiar como cualquier selección.
- **Zonas de pie:** `<ticketTypeId>=<n>` con un solo valor entero de 1 a 10.
- **Zonas numeradas:** su cantidad la dan las butacas válidas de `asientos` (un solo parámetro, ids separados por `,`), en el orden de la URL; su `<ticketTypeId>=<n>` se ignora.
- **Tolerancia:** lo inválido se ignora uno a uno, **sin avisos ni errores**, y el resto se precarga: butacas ocupadas, inexistentes, repetidas o de otra zona; zonas agotadas; cantidades mal formadas (`abc`, `0`, `11`) o repetidas; `asientos` repetido.
- **Límite:** nunca más de 10 entradas. Se recorren las zonas en el orden del mapa y se recorta lo que exceda (p. ej. `campo-vip=8&campo-general=5` → Campo VIP 8 y Campo General 2), con el estado de límite de siempre.

### Entrada por zona (`?zona=`)

- **De dónde viene:** de las filas de la tarjeta "Entradas" del aside del detalle (`ZonePricesCard`, ver `event-detail.md`): cada zona comprable enlaza a `/eventos/<slug>/entradas?zona=<zoneId>` (`buildZoneEntryHref`). El botón "Ver mapa de zonas" del aside, el CTA del hero y la barra móvil del detalle llevan a `/entradas` sin `zona` (sub-paso 1).
- **Efecto:** abre directamente el **sub-paso 2** de esa zona, desde el primer render:
  - zona de pie: "Paso 2 de 2 · Elige la cantidad", migas "Todas las zonas › <zona>", h3 con " · S/ X c/u" y `ZoneQuantityPanel`;
  - zona numerada: "Paso 2 de 2 · Elige tus butacas", la cabecera con "0 de 10 butacas" y el plano en arco (fondo del estadio, minimapa y controles).
  - El mapa y las tarjetas no están en el DOM. El stepper global sigue en "Entradas".
- **Validación** (`parseInitialZoneId`): se usa solo si `zona` aparece **exactamente una vez** y su valor es, tal cual (sin cambiar mayúsculas ni recortar), el `id` de una zona del mapa **no agotada**. Si no (inexistente, agotada, vacía, en mayúsculas o repetida, p. ej. `?zona=xx`, `?zona=VIP`, `?zona=`, `?zona=vip&zona=general`), se ignora sin aviso y se abre el sub-paso 1.
- **Cantidad inicial de una zona de pie: 0**, como el stepper de su tarjeta: "Subtotal S/ 0.00", "Tu compra" vacío y "Continuar" deshabilitado. `zona` nunca añade ni quita entradas: compartir, recargar o volver con "Atrás" a `?zona=vip` no mete nada en la compra.
- **Con precarga a la vez** (`?zona=vip&vip=2`, `?zona=norte&norte=1&asientos=<id>`): no compiten. `zona` decide el sub-paso inicial y la selección sale solo de `<ticketTypeId>` y `asientos`: abre el panel de VIP con cantidad 2 (o el plano de Norte con esa butaca elegida y "1 de 10 butacas") y "Tu compra" muestra el resto. Si las demás zonas ya llenan el límite de 10, la zona abre igual con el estado de límite.
- **Foco y desplazamiento:** no se mueven (no se enfoca el h3 ni se hace scroll) y el indicador `aria-live` no anuncia su valor inicial. El h3 de la zona y "Paso 2 de 2 · …" son lo primero de la tarjeta tras la franja del evento.
- **Transición:** el sub-paso 2 entra con la de siempre (crece desde la zona, `motion-safe:`). En una recarga o URL pegada, el `fallback` muestra primero el sub-paso 1 sin selección y, al hidratar, lo sustituye el sub-paso 2 con esa transición, sin errores de hidratación. Es el coste aceptado de mantener la ruta estática.
- **Pie "Agregar otra zona":** con ≥ 1 entrada en la zona (p. ej. tras un "+" en el panel), debajo del panel o del plano aparece el pie "Agregar otra zona" para combinar. Al pulsarlo vuelve al sub-paso 1 con el foco en la tarjeta de la zona y su stepper (o "n butacas elegidas") con la cantidad elegida; desde ahí se suman otras zonas.
- **"Todas las zonas"** vuelve al sub-paso 1 como siempre (foco en la tarjeta de la zona y transición de vuelta). La URL conserva `zona`: recargar vuelve a abrir esa zona (aceptado). "Atrás" del navegador vuelve al detalle.
- Se descartó que `?zona=<de pie>` abriera el sub-paso 1 con su tarjeta resaltada: perdería la vista específica y, en móvil, obligaría a desplazar la página hasta la tarjeta.

## Resumen "Tu compra" y barra móvil

- Vacío: caja `border-2 border-dashed border-input rounded-xl p-5` "Todavía no elegiste entradas. Empieza eligiendo una zona.".
- Líneas (una por zona, en el orden del mapa; fila `flex items-start justify-between gap-2`) "`<n>` × `<zona>`" y, a la derecha (`flex shrink-0 items-center gap-1`), el importe `tabular-nums font-bold` y el botón **"Quitar"**: `Button variant="ghost" size="icon" class="-my-2 size-11 cursor-pointer text-muted-foreground hover:text-foreground"` con `Trash2` (`size-4`, `aria-hidden`) y `aria-label` "Quitar <zona> de tu compra". En zonas numeradas, debajo, las etiquetas cortas de sus asientos ("Fila F · Asiento 12, …", `text-sm text-muted-foreground`) y la cantidad es el número de asientos; separador `border-t-2 border-dashed`; "Total (n entradas)" con importe `text-2xl font-bold tabular-nums` (`aria-live="polite"`) y siempre "Precio final, sin cargos ocultos".
- CTA "Continuar" + `ArrowRight`: primario `h-11 font-semibold hover:bg-primary-strong`. Con 0 entradas es `<button disabled>`; con ≥ 1 es un enlace a `/checkout?evento=<slug>&<tipo>=<n>…`, más `&asientos=<id>,<id>…` si hay asientos (cada zona numerada lleva como `<n>` su número de asientos).
- **"Quitar"** quita todas las entradas de la zona (la cantidad de pie o todas sus butacas, también con su plano abierto). Para quitar **una** butaca están los chips "Tus asientos"; para bajar una cantidad, el "−" de la tarjeta. **Foco tras quitar:** al "Quitar" de la línea siguiente; si no hay, al de la anterior; si no queda ninguna, al texto vacío (`tabIndex={-1}`, `outline-none`). Igual en la hoja móvil.
- El contenido (líneas o vacío, total, nota y CTA) es `PurchaseSummaryContent`, compartido por el aside (`lg+`) y la hoja móvil.
- **Barra móvil** (`< lg`): bloque `aria-live="polite"` con "Total · n entradas" (`text-xs text-muted-foreground`) e importe `text-xl font-bold tabular-nums`; botón `outline size-11` con `ChevronUp` (`aria-label="Ver resumen de la compra"`); y "Continuar" (`h-11 px-5`). Cabe a 375 px sin scroll horizontal.
- **Hoja "Tu compra"** (`Sheet`, `side="bottom"`, `max-h-[85svh] rounded-t-2xl`): `SheetTitle` "Tu compra" (`text-lg font-bold`), botón "Cerrar" `size-11` y el cuerpo con `PurchaseSummaryContent` (`overflow-y-auto`, padding con `safe-area-inset-bottom`). Es modal y solo sirve para revisar: el mapa y el plano nunca quedan tapados mientras se elige. Base UI lleva el foco a la hoja; Escape o "Cerrar" la cierran y el foco vuelve al botón.

## Accesibilidad

- Un solo `<h1>` (título del evento); h2 "Elige tus entradas" y "Tu compra" (en móvil, "Tu compra" es el `SheetTitle` de la hoja abierta); h3 de la zona en el sub-paso 2 y h3 "Tus asientos" en el plano.
- Cabecera de compra: un único `banner`. Stepper `<ol aria-label="Pasos de la compra">` siempre en el DOM (`sr-only` por debajo de `lg`), paso actual con `aria-current="step"`; el bloque móvil "Paso 1 de 3" es `aria-hidden`. El primer Tab enfoca "Volver al evento" por debajo de `lg` y el logo en `lg`.
- Indicador de sub-paso con `aria-live="polite"`: el cambio de sub-paso se anuncia. Su valor inicial ("Paso 1 de 2 · Elige tus zonas" o, con `?zona=`, "Paso 2 de 2 · Elige la cantidad" / "· Elige tus butacas") no se anuncia: la precarga y `zona` no mueven el foco ni anuncian nada.
- Mapa: una imagen, `<svg role="img" aria-label="Mapa de zonas de <recinto>">`. Sus hijos son presentacionales: no se anuncian zonas sueltas ni tiene paradas de Tab (se elige `role="img"` y no `aria-hidden` porque es lo único que dice dónde está cada zona respecto del escenario).
- Tarjetas: cada una es un grupo con el nombre de la zona; el stepper es el grupo "Cantidad de <zona>", con su valor en `aria-live`; el pie de límite es `role="status"`.
- **Orden de Tab en el sub-paso 1:** tras la cabecera y "Volver al evento", ninguna parada en el mapa; por tarjeta, en el orden del mapa, "−" y "+" (de pie) o "Elegir/Cambiar butacas" (numerada), ninguna en las agotadas; después, los "Quitar" y "Continuar" de "Tu compra" (`lg`), o "Ver resumen de la compra" y "Continuar" de la barra móvil. En el sub-paso 2: "Todas las zonas" y el stepper de cantidad (de pie), o "Todas las zonas", el grupo "Zoom del plano" (3 botones), el plano (una sola parada), "Mejores butacas" (stepper y botón) y los chips (numerada); al final, "Agregar otra zona" si la zona tiene entradas.
- Plano: `<svg role="group" aria-label="Plano de asientos de <zona>" aria-describedby>` con ayuda `sr-only` "Usa las flechas para moverte entre asientos y Espacio para elegir o quitar.". Cada asiento es un `<g role="checkbox" aria-checked>` con `aria-label` "Fila F, asiento 12, disponible, S/ 150.00", "Fila F, asiento 12, accesible para silla de ruedas, S/ 150.00" u "Fila F, asiento 12, ocupado" (este con `aria-disabled="true"`). Teclado: ver "Teclado".
- Cantidades, subtotal, contador "n de m butacas", "n elegidas" de la leyenda, valor de "¿Cuántas butacas juntas?" y totales con `aria-live="polite"`; el tooltip de butaca es `aria-hidden` (el lector anuncia el `aria-label`); estados siempre con texto ("Últimas entradas", "Agotado"), nunca solo color.
- Targets ≥ 44 px (`min-h-11`/`size-11`/`h-11`) en steppers, "Elegir/Cambiar butacas", "Agregar otra zona", "Quitar", migas, zoom y el botón de la hoja, salvo los asientos (≥ 24 px con el plano entero a la vista en el festival y tras un "Acercar" en los planos grandes; con zoom crecen); foco visible en todo lo interactivo y en la tarjeta que recibe el foco al volver, iconos `aria-hidden`.
- Animaciones solo con `motion-safe:` (y `animationTime` 0 en el zoom con `prefers-reduced-motion: reduce`).
- Sin scroll horizontal a 375 / 768 / 1024 / 1440, también con la acción de la tarjeta debajo de la información y con la hoja abierta.

## Metadata

- Título: `Elige tus entradas: <Título del evento> | Mentec Tickets`.
- Descripción: `Elige tu zona y tus entradas para <Título> en <Lugar>, <Ciudad>.`
- Solo se generan estáticamente los eventos con mapa. La ruta sigue siendo SSG con la precarga y `?zona=` (se leen en cliente, dentro de `Suspense`).
