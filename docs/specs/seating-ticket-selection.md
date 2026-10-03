# Selección de entradas con mapa de zonas y asientos (paso 1 de la compra)

- Módulo: seating
- Estado: aprobado

## Objetivo
Que el comprador elija sus entradas sobre el mapa del recinto en `/eventos/<slug>/entradas` (paso 1 de 3 de la compra): zonas de pie por cantidad (Campo, General) y, en zonas numeradas (Tribunas, Platea, Mezanine), asientos individuales sobre un plano con zoom. Al continuar se pasa a `/checkout` con la selección. El detalle del evento enlaza a esta pantalla cuando el evento tiene mapa. Solo UI/UX con datos mock (sin backend ni reserva real), español (Perú), PEN.

Diseño de referencia: pantalla "4 · Selección de entradas" (`Tickets.dc.html` y `TicketsMobile.dc.html` del diseño de Claude Design). De ahí salen la estructura, el layout, el flujo, los textos y los patrones móviles. La identidad visual se mantiene: Mentec, según `design-system/ticketera/MASTER.md`, con tokens, Creato Display y la marca "Mentec Tickets". El índigo, el naranja, Poppins, los hex y "Ticketera" del diseño **no** se usan.

## Alcance
- Incluye:
  - **Fase 1. Dominio `modules/seating`:** schema zod y tipos del mapa (`VenueMap`, zonas `general` | `numbered`, `Seat`), generador de filas de asientos, utilidades de ids y etiquetas de asiento, validación de asientos (`parseSeatIds`, `resolveSeats`) y tonos de color por precio. Incluye también 3 mapas mock asociados a eventos existentes, el service `getVenueMapBySlug`/`hasVenueMap` y ajustes mínimos de `ticketTypes` en el mock de eventos.
  - **Fase 2. Página `/eventos/[slug]/entradas`**, con:
    - `PurchaseStepper` compartido (contrato A).
    - Tira del evento con "Volver al evento".
    - Mapa SVG de zonas sincronizado con la lista de zonas (stepper por zona de pie).
    - Resumen "Tu compra" (sticky en `lg`) y barra inferior móvil con total y "Continuar".
    - Hook de selección.
    - Paso a `/checkout` (contrato C) para zonas de pie.
    - Archivo de diseño `design-system/ticketera/pages/ticket-selection.md`.
  - **Fase 3. Lógica de asientos y checkout con asientos:** "mejor asiento disponible", navegación por teclado entre asientos, acciones de asientos en el hook. `modules/checkout` acepta y valida `asientos` contra el mapa y los muestra en `OrderSummary` (contrato C).
  - **Fase 4. Plano de asientos y detalle:**
    - Plano de asientos con `react-zoom-pan-pinch`, leyenda, chips de asientos elegidos y botón "Mejor asiento disponible".
    - Integración en `/eventos/[slug]` (contrato H): tarjeta de precios por zona + "Elegir entradas" y barra móvil "Desde S/ X · Comprar entradas".
- No incluye:
  - Reserva, bloqueo o liberación real de asientos o cupos. La ocupación es fija y sale del mock: dos compradores pueden elegir el mismo asiento.
  - Backend, API, persistencia de la selección (al recargar se pierde) y temporizador en este paso.
  - Mapas para eventos distintos de los 3 elegidos. Los demás eventos siguen con `TicketSelector` y sin `/entradas` (404).
  - Pasillos, numeración par/impar, filas curvas reales, vistas desde el asiento, minimapa, mapas 3D.
  - Rehacer la UI de `/checkout` ni su flujo de pago. Esta spec solo amplía validación, tipos y `OrderSummary` para asientos. El resto lo cubre la nueva spec de checkout, que reemplaza funcionalmente a `docs/specs/checkout-purchase.md`; esa spec no se edita.
  - Extraer el stepper −/+ a `components/shared`. El de la lista de zonas sigue el visual del diseño (pastilla), que es distinto del de `TicketSelector`, y `TicketSelector` deja de usarse en los eventos con mapa. Se sube a `shared` cuando una tercera pantalla lo necesite.
  - Mostrar la capacidad de las zonas de pie: el dato existe en el modelo, pero no se muestra.

## Decisiones
1. **Mapa híbrido (decisión del usuario):** las zonas `general` (de pie) se compran por cantidad. Las zonas `numbered` abren un plano y se eligen asientos. Solo se dibujan los asientos de la zona elegida.
2. **Librería (decisión del usuario):** SVG generado desde datos como componentes React. Zoom y paneo con `react-zoom-pan-pinch@^4.2.0`, verificado con `npm view`: versión 4.2.0 (`latest`), MIT, peers `react: "*"` y `react-dom: "*"`, compatible con React 19.2.8. Trae `fitToView`/`fitOnInit` y teclado opcional; el teclado de la librería **no** se activa porque las flechas se usan para moverse entre asientos. Solo se usa en Fase 4, dentro de un componente `"use client"`.
3. **Zona ↔ tipo de entrada 1:1:** cada zona tiene un `ticketTypeId` que coincide con un `ticketType.id` del evento, y cada tipo del evento tiene exactamente una zona. Nombre, precio y estado de la zona **no** se guardan en el mock del mapa: el service los toma del evento al construir el `VenueMap`, que así es la única fuente de verdad.
4. **Eventos con mapa** (todos existentes en `modules/events/data/events.mock.ts`). Una restricción: el test de invariantes exige entre 2 y 4 tipos por evento, y no se pueden romper los fixtures de los tests.
   - `noche-de-sintetizadores-lima`: concierto en el Estadio Nacional.
     - Zonas: VIP, Preferencial y General (de pie, sin cambios de id, precio ni estado) y una zona numerada **nueva** "Tribuna Norte" (`norte`, S/ 220, `available`). Queda con 4 tipos y `priceFrom` sigue en 180.
     - En la descripción se cambia "un escenario de 360° diseñado para esta gira" por "un escenario diseñado para esta gira", porque el mapa tiene el escenario en un extremo.
   - `la-casa-de-los-espejos`: teatro en el Gran Teatro Nacional.
     - Los tipos pasan a "Platea" (`platea`, S/ 180, "Butacas numeradas frente al escenario.", `available`) y "Mezanine" (`mezanine`, S/ 120, "Nivel superior con vista completa del escenario.", `low-stock`). Las dos zonas son numeradas.
     - Se eliminan `platea-alta`, `platea-baja` y `palco`, que no se usan en ningún test. `priceFrom` sigue en 120.
   - `risas-sin-filtro`: stand-up en Arena 1. Tipos sin cambios.
     - General: de pie, `low-stock`.
     - Preferencial: numerada, `low-stock`.
     - Mesa: numerada, `sold-out`. Así el mapa muestra "Agotado" y "Últimas entradas".
   - Siguen pasando sin cambios los fixtures `noche-de-sintetizadores-lima` (general/preferencial/vip, `general=2&vip=1` → S/ 910), `los-ecos-del-sur-arequipa`, `risas-sin-filtro` (`mesa=1` → inválido), `aventura-en-el-bosque-magico` y `clasico-del-pacifico`.
5. **Límite:** `MAX_TICKETS_PER_ORDER` (10) **en total** (entradas de pie + asientos), no "6 por zona" como en el diseño. Texto: "Máximo 10 entradas por compra."
6. **Ids de asiento** (contrato B): `<zoneId>-<fila>-<número>`, por ejemplo `norte-F-12`.
   - La fila son 1–2 letras mayúsculas y el número 1–3 dígitos. Se parsea desde la derecha, así que el `zoneId` puede llevar guiones.
   - Etiqueta: "Tribuna Norte · Fila F · Asiento 12". Etiqueta corta: "Fila F · Asiento 12".
7. **Paso a checkout** (contrato C): `/checkout?evento=<slug>&<ticketTypeId>=<qty>…&asientos=<seatId>,<seatId>`.
   - Las cantidades van en el orden de `map.zones` y solo las > 0. `asientos` solo aparece si hay asientos.
   - Para zonas numeradas, la cantidad del tipo es el número de asientos de esa zona.
   - Se construye con `URLSearchParams`, que codifica la coma como `%2C`; `searchParams` la decodifica.
   - `evento` y `asientos` son nombres reservados: ningún `ticketType.id` puede llamarse así.
8. **Precios en cliente sin arrastrar el barrel de `events`:** nueva entrada pública `modules/events/purchase.ts` (SETUP §1, regla 4) que solo reexporta `formatEventPrice`, `MAX_TICKETS_PER_ORDER` y `buildCheckoutHref`. La usan los componentes cliente y los utils de `seating`. El código de servidor de `seating` usa el barrel `@/modules/events` (`getEventBySlug`, `getEvents`, `formatEventDate`, tipos).
9. **Color por precio con tokens:** los tonos se asignan por rango de precio entre las zonas no agotadas (de mayor a menor). El texto siempre acompaña al color.

   | Tono | Forma (SVG) | Texto en el mapa | Muestra en listas |
   |---|---|---|---|
   | `tier-1` (más caro) | `fill-brand-navy` | `fill-background` | `bg-brand-navy` |
   | `tier-2` | `fill-primary-strong` | `fill-primary-foreground` | `bg-primary-strong` |
   | `tier-3` | `fill-highlight` | `fill-highlight-foreground` | `bg-highlight` |
   | `tier-4` (4.º precio o menor) | `fill-accent stroke-primary/40` | `fill-foreground` | `bg-accent ring-1 ring-primary/40` |
   | `sold-out` | `fill-secondary` | `fill-muted-foreground` + "Agotado" | `bg-secondary ring-1 ring-input` |

   Precios iguales comparten tono. Desde el 4.º precio distinto, todos usan `tier-4`.
10. **Tamaños legibles a 375 px:**
    - Mapa de zonas: `viewBox` de ≤ 600 de ancho y textos de ≥ 24 unidades, lo que da ≥ 12 px (MASTER §3) en un SVG de ~311 px de ancho.
    - Plano de asientos: distancia entre asientos (pitch) de 32 unidades, márgenes laterales de 40 y ≤ 10 asientos por fila. El `seatViewBox` queda en ≤ 400 de ancho, así que con el plano entero a la vista cada asiento ocupa ≥ 24 px (WCAG 2.5.8).
11. **Barras inferiores móviles con `sticky bottom-0`**, no `fixed`. Van como último hijo del contenedor de la página, así que se quedan pegadas abajo mientras se recorre el contenido y no tapan el footer.
12. **Fases:** los límites de ~15 archivos por fase obligan a separar el dominio (F1) de la UI (F2). La integración en el detalle (contrato H) va en F4, con el plano de asientos, para que el detalle solo enlace a `/entradas` cuando también se puedan comprar las zonas numeradas. En F2 y F3, `/entradas` funciona entrando por la URL, y las zonas numeradas se ven pero aún no se compran.

## Requisitos

### Dominio (Fase 1)
1. **Mapa (`VenueMap`)**:
   - `eventSlug`.
   - `venue`: nombre del recinto, tomado del evento.
   - `viewBox`: `"0 0 W H"`.
   - `stage`: `label` (p. ej. "ESCENARIO"), `path` y `labelPos`.
   - `zones`: entre 1 y n.
2. **Zona**:
   - Campos comunes: `id` (kebab-case), `ticketTypeId`, `path` (atributo `d` en coordenadas del `viewBox`) y `labelPos` (`{ x, y }`, centro del texto).
   - Se completa con `name`, `price` y `status` del tipo de entrada.
   - `kind: "general"` lleva además `capacity` (entero > 0).
   - `kind: "numbered"` lleva además `seatViewBox` y `rows`. Cada fila tiene `label` y `seats`. Cada asiento tiene `id`, `row`, `number`, `x` e `y` (centro, en coordenadas de `seatViewBox`) y `status`: `available` | `occupied` | `accessible` ("accesible para silla de ruedas": seleccionable).
3. **Reglas del layout** (schema con `superRefine`):
   - ids de zona únicos y `ticketTypeId` únicos;
   - en zonas numeradas: etiquetas de fila únicas, `seat.row === row.label`, números únicos por fila y `seat.id === formatSeatId(zone.id, row.label, seat.number)`.
4. **Generador `generateSeatRows(spec)`**:
   - Recibe `rowLabels` (la primera fila es la más cercana al escenario), `seatsPerRow` (un número, o un array con un valor por fila), `occupiedRatio` (0..1) y `accessibleSeats?` (ids).
   - Devuelve `{ seatViewBox, rows }`, con asientos numerados de 1 a n de izquierda a derecha.
   - Las filas más cortas se centran.
   - Ocupación determinista: un hash del id (p. ej. FNV-1a) menor que `occupiedRatio` hace que el asiento quede `occupied`. Si no está ocupado y figura en `accessibleSeats`, queda `accessible`. Si no, `available`.
   - Un id de `accessibleSeats` que no existe lanza `Error` (es un error del mock).
   - Geometría:
     - `SEAT_PITCH = 32`;
     - márgenes `x = 40`, `top = 72` (deja sitio a la barra del escenario) y `bottom = 24`;
     - `seatViewBox = "0 0 (2·40 + maxAsientos·32) (72 + filas·32 + 24)"`;
     - centro del asiento i de una fila de n asientos: `x = 40 + (max − n)·16 + i·32 + 16`, `y = 72 + índiceFila·32 + 16`.
5. **Service**:
   - `getVenueMapBySlug(slug)`:
     - busca el layout mock; si no existe, devuelve `null`;
     - si no existe el evento (`getEventBySlug`), devuelve `null`;
     - valida el layout con `venueLayoutSchema` y le une a cada zona `name`/`price`/`status` del `ticketType` con su `ticketTypeId`, y `venue` del evento;
     - si una zona apunta a un tipo inexistente, lanza `Error`.
   - `hasVenueMap(slug): boolean` es síncrono y mira solo los layouts mock.
6. **Ids y validación** (contrato B):
   - `parseSeatIds(raw: string | string[] | undefined): string[] | null`:
     - `undefined` → `[]`;
     - array (parámetro repetido) → `null`;
     - string → separa por comas y valida con `seatIdsParamSchema` (cada id con el formato de la decisión 6, sin duplicados, de 1 a `MAX_TICKETS_PER_ORDER` ids; el string vacío no es válido) → array, o `null` si es inválido.
   - `resolveSeats(map, seatIds): ResolvedSeat[] | null`:
     - devuelve `{ id, label, zoneId, ticketTypeId }` en el orden recibido;
     - devuelve `null` si algún id no existe en una zona numerada del mapa, si su zona está `sold-out`, si el asiento está `occupied` o si hay duplicados;
     - `[]` → `[]`.
7. **Invariantes del mock**, verificadas en el test del service:
   - las zonas de cada mapa corresponden 1:1 a los `ticketTypes` del evento;
   - zona numerada `sold-out` ⇒ ningún asiento `available`/`accessible`;
   - zona numerada no agotada ⇒ al menos 1 asiento `available`;
   - ≤ 10 asientos por fila y ≤ 12 filas;
   - ancho del `seatViewBox` ≤ 400 y ancho del `viewBox` del mapa ≤ 600.

### Página `/eventos/[slug]/entradas` (Fase 2)
8. **Ruta** (Server Component; `params` es una Promise en Next 16):
   - `generateStaticParams` devuelve solo los slugs con `hasVenueMap`.
   - `generateMetadata`:
     - título "Elige tus entradas: <título> | Mentec Tickets";
     - descripción "Elige tu zona y tus entradas para <título> en <lugar>, <ciudad>.".
   - La página carga el evento y el mapa en paralelo. Si falta cualquiera de los dos, llama a `notFound()`, que usa el `app/eventos/[slug]/not-found.tsx` existente.
   - Compone `PurchaseStepper currentStep={1}`, `EventPurchaseStrip` y `TicketSelection`.
9. **`PurchaseStepper`** (contrato A; `components/shared`, Server Component, props `{ currentStep: 1 | 2 | 3 }`):
   - **Barra:** franja `border-b bg-background` bajo el header global, con contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8`.
   - **`<ol aria-label="Pasos de la compra">` siempre en el DOM:**
     - Exactamente 3 `<li>`: "Entradas", "Datos y pago" y "Confirmación". Los separadores son `<span aria-hidden>` dentro del `<li>`, no `<li>` propios.
     - El paso actual lleva `aria-current="step"`, círculo `bg-primary text-primary-foreground` con su número y texto en semibold.
     - Los pasos anteriores llevan círculo `bg-primary` con el icono `Check` (`aria-hidden`), `<span className="sr-only">(completado)</span>` y conector `bg-primary`.
     - Los pasos siguientes llevan círculo con borde `border-input`, texto `text-muted-foreground` y conector `bg-input`.
     - En `md+` el `<ol>` es visible; por debajo de `md` es `sr-only`.
   - **"Compra segura":** a la derecha en `md+`, con icono `Lock` (`aria-hidden`).
   - **Bloque móvil (`md:hidden`, `aria-hidden="true"`, porque el `<ol>` sr-only ya lo anuncia):**
     - "Paso n de 3" (`text-xs text-muted-foreground`);
     - título del paso (`text-base font-bold`): 1 "Elige tus entradas", 2 "Datos y pago", 3 "Confirmación";
     - icono `Lock`;
     - debajo, barra de progreso `h-1 bg-secondary` con relleno `bg-primary` al 33 %, 67 % o 100 %.
10. **Tira del evento (`EventPurchaseStrip`)**, servidor y presentacional:
    - Enlace "Volver al evento" a `/eventos/<slug>`: `ArrowLeft` `aria-hidden`, `inline-flex h-11`, `text-sm font-medium text-muted-foreground hover:text-foreground` y foco visible.
    - Miniatura `next/image` de `size-13 md:size-16`, `rounded-xl`, `sizes="64px"` y `alt=""` (decorativa: el título está al lado).
    - **h1 único** con el título del evento (`text-2xl md:text-3xl font-bold tracking-tight`).
    - Línea `<time>` con `formatEventDate` + " · " + "Lugar, Ciudad" (`text-sm md:text-base text-muted-foreground`).
11. **Layout de `TicketSelection`** (`"use client"`):
    - Grilla `lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8`.
    - Columna izquierda (`min-w-0`): mapa ("Elige tu zona") → en Fase 4, plano de asientos si la zona activa es numerada y no está agotada → lista ("Entradas").
    - Columna derecha: `PurchaseSummary`, `hidden lg:flex lg:sticky lg:top-24 self-start`.
    - Al final: `MobilePurchaseBar`, `sticky bottom-0 z-30 lg:hidden`, a ancho completo (`-mx-4 md:-mx-6`).
    - Orden móvil = orden del DOM. Por breakpoint solo se alternan el resumen y la barra (`display:none` los saca del árbol de accesibilidad: no hay duplicados para los lectores).
12. **Mapa de zonas (`VenueMapView`)**, dentro de una `Card` `rounded-2xl`:
    - **Cabecera y lienzo:**
      - h2 "Elige tu zona" y, a la derecha, "Toca una zona del mapa" (`text-sm text-muted-foreground`).
      - Lienzo `rounded-xl bg-muted p-3`.
      - `<svg viewBox={map.viewBox} className="h-auto w-full" role="group" aria-label="Mapa de zonas de <venue>">`.
      - Escenario: forma `fill-foreground` con texto `fill-background` en mayúsculas, `aria-hidden`.
    - **Cada zona** es un `<path>` con:
      - `role="button"`, `tabIndex={0}`, `aria-pressed` (zona activa) y clases del tono (decisión 9);
      - `aria-label`: "<nombre>, <precio>" o "<nombre>, agotado", más ", asientos numerados" si es numerada y ", últimas entradas" si es `low-stock`;
      - `cursor-pointer` y transición de 200 ms;
      - activación con clic, Enter o Espacio (Espacio con `preventDefault`).
    - **Estados visuales:**
      - Zona activa: halo exterior (copia del `path` detrás, `fill-none stroke-brand-navy`, 8 unidades) y trazo interior `stroke-background` de 3 unidades.
      - Foco: `focus-visible` con trazo `stroke-ring` de 4 unidades discontinuo (`[stroke-dasharray:8_6]`) y `outline-none`.
    - **Etiqueta de cada zona** (`<text>` `aria-hidden`, `pointer-events-none`, `text-anchor="middle"`, ≥ 24 unidades, centrada en `labelPos`):
      - línea 1: nombre (bold);
      - línea 2: precio (`formatEventPrice`) o "Agotado";
      - si es `low-stock`, línea 3: píldora `fill-warning` con "Últimas entradas" (`fill-warning-foreground`).
    - Las zonas agotadas también se pueden activar (como en el diseño): solo resaltan su fila de la lista.
13. **Lista de zonas (`ZoneList`)**, dentro de una `Card` `rounded-2xl`:
    - **Encabezado:** h2 "Entradas".
    - **Una fila (`li`, `min-h-18`) por zona en el orden de `map.zones`:**
      - Muestra de color del tono (`size-3.5 rounded-sm`, `aria-hidden`).
      - Nombre (bold) y, si es `low-stock`, `Badge` "Últimas entradas" (`bg-warning text-warning-foreground`).
      - Debajo, "<precio> c/u" (`text-sm text-muted-foreground`).
      - Fila de la zona activa: `bg-accent rounded-xl`.
    - **Parte derecha de la fila, según la zona:**
      - Agotada: etiqueta "Agotado" (`h-11 rounded-lg bg-muted px-4 font-bold text-muted-foreground`), sin controles.
      - De pie: stepper en pastilla (`rounded-xl border p-0.5`), con "−" (`Minus`) y "+" (`Plus`) como `Button` `size-11` y `aria-label` "Quitar una entrada de <nombre>" / "Agregar una entrada de <nombre>".
        - Entre los dos botones, la cantidad con `aria-live="polite"` y `tabular-nums`.
        - "−" se deshabilita en 0 y "+" al llegar al límite. Se usa `focusableWhenDisabled` y las clases `aria-disabled:*`, como en `TicketSelector`.
        - Pulsar el stepper también activa la zona.
      - Numerada (Fase 2): texto `text-sm text-muted-foreground` "Elección de asientos próximamente". En Fase 4 lo reemplaza el requisito 27.
    - **Pie:** `<p role="status">` con "Máximo 10 entradas por compra." o, al llegar a 10, "Llegaste al máximo de 10 entradas por compra.".
14. **Resumen "Tu compra" (`PurchaseSummary`)**: `<aside aria-label="Resumen de la compra">`, `Card` `rounded-2xl`.
    - h2 "Tu compra".
    - Sin entradas: caja `border-2 border-dashed border-input rounded-xl p-5 text-center text-sm text-muted-foreground` con "Todavía no elegiste entradas. Toca una zona o usa los botones +.".
    - Con entradas, una línea por zona:
      - "<cantidad> × <nombre>" y el importe a la derecha (`tabular-nums font-bold`);
      - en zonas numeradas, debajo, las etiquetas cortas de los asientos separadas por coma (`text-sm text-muted-foreground`).
    - Separador discontinuo (`border-t-2 border-dashed`).
    - Total: "Total" + "(<n entradas>)" en `text-muted-foreground`, e importe `text-2xl font-bold tabular-nums` con `aria-live="polite"`.
    - "Precio final, sin cargos ocultos" (`text-sm text-muted-foreground`).
    - CTA "Continuar" + `ArrowRight` (`aria-hidden`):
      - estilo primario `h-11 w-full font-semibold hover:bg-primary-strong`;
      - con 0 entradas, `<button disabled>`;
      - con ≥ 1, `Link` a `checkoutHref`.
15. **Barra móvil (`MobilePurchaseBar`)**:
    - `border-t bg-background shadow-lg shadow-foreground/5`, `px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]`.
    - A la izquierda, un bloque con `aria-live="polite"`: "Total · <n entradas>" (`text-xs text-muted-foreground`) y el importe (`text-xl font-bold tabular-nums`).
    - A la derecha, "Continuar" + `ArrowRight` (primario, `h-11 px-6`), deshabilitado con 0 entradas.
    - "<n entradas>" = "1 entrada" o "N entradas" (`formatTicketCount`).
16. **Selección (`useSeatSelection(map)`)**:
    - **Estado:** `activeZoneId` (inicial `null`), `quantities` (zoneId → cantidad, solo zonas de pie) y `seatIds` (inicial `[]`).
    - **Derivados:** `ticketCount`, `atLimit` (`ticketCount >= MAX_TICKETS_PER_ORDER`), `lines`, `total` y `checkoutHref` (`null` con 0 entradas).
    - **Acciones de Fase 2:**
      - `selectZone(zoneId)`.
      - `changeQuantity(zoneId, ±1)`:
        - activa la zona;
        - no hace nada en zonas numeradas o agotadas;
        - "+" no hace nada en el límite;
        - "−" no baja de 0.
17. **Utils de selección** (`selectionSummary.ts`, puros):
    - `getSelectionLines(map, selection)`: en el orden de `map.zones` y solo zonas con cantidad > 0. Las zonas numeradas cuentan sus asientos (zona tomada del id) y llevan `seatLabels` cortas en el orden de selección.
    - `getSelectionTicketCount(selection)`.
    - `getSelectionTotal(map, selection)`.
    - `toCheckoutQuantities(map, selection)`: `ticketTypeId → cantidad`.
    - `buildSeatingCheckoutHref(slug, map, selection)`: reutiliza `buildCheckoutHref` y añade `asientos` si hay; devuelve `null` con 0 entradas.
    - `formatTicketCount(n)`.

### Asientos y checkout (Fase 3)
18. **`findBestAvailableSeats(zone, count): string[] | null`**:
    - Busca bloques de `count` asientos consecutivos de una misma fila, todos `available`. No usa `accessible` ni `occupied`.
    - Orden de preferencia:
      1. la fila más cercana al escenario (orden de `rows`);
      2. el centro del bloque más cerca del centro de la fila;
      3. el primer número menor.
    - Devuelve `null` si no hay ningún bloque.
19. **Navegación `getAdjacentSeatId(zone, seatId, key)`**, con `key` ∈ `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Home` y `End`:
    - izquierda/derecha: asiento anterior o siguiente de la fila (en los extremos, el mismo);
    - arriba/abajo: asiento de la fila anterior o siguiente con la `x` más cercana (en la primera o última fila, el mismo);
    - Home/End: primero o último asiento de la fila.
    - Incluye los asientos ocupados: se pueden enfocar, pero no elegir.
20. **Acciones de asientos en el hook** (Fase 3):
    - **`toggleSeat(seatId)`:**
      - quita el asiento si ya estaba;
      - si no estaba, lo añade cuando está `available` o `accessible`, su zona no está agotada y no se llegó al límite;
      - en el límite no añade nada y pone `notice` = "Máximo 10 entradas por compra";
      - si es `occupied`, no hace nada.
    - **`removeSeat(seatId)`.**
    - **`pickBestSeats(zoneId)`:**
      - `k` = asientos ya elegidos en la zona, o 1 si no hay ninguno (con 0 elegidos hace falta hueco para 1 más);
      - busca con `findBestAvailableSeats` y **reemplaza** la selección de esa zona;
      - `notice` si hay 1: "Elegimos Fila C · Asiento 6.";
      - `notice` si hay más: "Elegimos <k> asientos juntos en la fila C.";
      - si no hay bloque, no cambia la selección y `notice` = "No hay <k> asientos juntos disponibles en esta zona." (con k = 1: "No quedan asientos disponibles en esta zona.").
    - **`notice: string | null`:** se limpia con la siguiente acción que sí cambia la selección.
21. **Checkout con asientos** (contrato C, `modules/checkout`):
    - **Tipos y parámetros:**
      - `CheckoutOrderItem` gana `seats?: { id: string; label: string }[]`.
      - `getCheckoutOrder` separa `asientos` del resto de parámetros y lo parsea con `parseSeatIds`.
      - `resolveCheckoutOrder(slug, quantities, seatIds: string[] | null = [])` carga el evento y `getVenueMapBySlug(slug)`.
      - `buildCheckoutOrder(event, quantities, seating = { map: null, seatIds: [] })`.
    - **Reglas, tras las actuales y antes del cálculo del total** (cualquier fallo → `invalid-tickets`):
      1. `seatIds === null`: inválido.
      2. Sin mapa, `seatIds` debe estar vacío.
      3. Con mapa:
         - `resolveSeats` no puede devolver `null`;
         - en cada zona numerada, el número de asientos de esa zona debe ser igual a `quantities[zone.ticketTypeId] ?? 0`.
         - Así, una zona numerada con cantidad y sin asientos es inválida, y viceversa.
    - **Resultado:** las líneas de tipos numerados llevan `seats` (`{ id, label }` en el orden de `asientos`); las de pie, no.
    - Las llamadas actuales con 2 argumentos siguen funcionando igual.
22. **`OrderSummary`:** bajo "<cantidad> × <precio>" de una línea con `seats`, va una lista `<ul aria-label="Asientos de <nombre>">` con cada `label` completa (`text-sm text-muted-foreground`).

### Plano de asientos y detalle (Fase 4)
23. **Plano (`SeatPlan`, `"use client"`)**: `Card` `rounded-2xl` bajo el mapa, visible si la zona activa es numerada y no está agotada.
    - **Cabecera:**
      - h2 "Elige tus asientos" con `id` y `tabIndex={-1}`, para recibir el foco desde la lista;
      - "<zona> · <precio> c/u";
      - texto "Toca un asiento para elegirlo. Acerca el plano con los botones o pellizcando." (`text-sm text-muted-foreground`).
    - **Barra de herramientas:**
      - `Button` `outline` `size-11` con `aria-label` e icono: "Acercar" (`ZoomIn`), "Alejar" (`ZoomOut`) y "Ver todo el plano" (`Maximize`);
      - `Button` `secondary` `h-11` "Mejor asiento disponible" (`Sparkles`), deshabilitado en el límite si no hay asientos de la zona elegidos.
    - **Contenedor del plano:**
      - `TransformWrapper`/`TransformComponent` de `react-zoom-pan-pinch`;
      - `fitOnInit` (`"contain"`), `minScale 1`, `maxScale 4`, `limitToBounds`;
      - `doubleClick.disabled: true` (un doble toque no debe hacer zoom y elegir a la vez);
      - `wheel.activationKeys: ["Control", "Meta"]` (la rueda sola desplaza la página);
      - `keyboard` sin activar;
      - con `prefers-reduced-motion: reduce`, los botones de zoom usan `animationTime 0`;
      - wrapper `w-full touch-none rounded-xl bg-muted max-h-[70vh]` con `style={{ aspectRatio: "<ancho> / <alto>" }}` del `seatViewBox`.
    - **SVG:**
      - `<svg viewBox={zone.seatViewBox} role="group" aria-label="Plano de asientos de <zona>" aria-describedby=<id de la ayuda sr-only>`;
      - ayuda sr-only: "Usa las flechas para moverte entre asientos y Espacio para elegir o quitar.";
      - arriba, barra del escenario con `map.stage.label` (`aria-hidden`);
      - a la izquierda de cada fila, la etiqueta de fila (`aria-hidden`, ≥ 24 unidades).
    - **Asientos:** cada uno es un `<g role="checkbox" data-seat-id tabIndex aria-checked aria-disabled? aria-label>` con un rectángulo de toque transparente de 32×32 y su forma.
      - `aria-label` según estado:
        - disponible: "Fila F, asiento 12, disponible, S/ 150.00";
        - accesible: "Fila F, asiento 12, accesible para silla de ruedas, S/ 150.00";
        - ocupado: "Fila F, asiento 12, ocupado", con `aria-disabled="true"`.
      - La selección se comunica con `aria-checked`.
    - **Formas** (forma y color, no solo color):
      - disponible: círculo r = 12, `fill-background stroke-primary`, hover `fill-accent`;
      - elegido: círculo `fill-primary` con un check `stroke-primary-foreground`;
      - ocupado: círculo `fill-secondary stroke-input` con una "×" `stroke-muted-foreground`;
      - accesible: cuadrado redondeado de 24×24 `fill-highlight`; elegido, `fill-primary` con check;
      - foco: anillo `stroke-ring` de 3 unidades alrededor (`focus-visible`).
    - **Eventos delegados:** un solo `onClick` y un solo `onKeyDown` en el `<g>` contenedor de los asientos, que buscan `closest("[data-seat-id]")`.
    - **Clic tras arrastre:**
      - `onPanningStart` guarda la posición;
      - `onPanning` marca "arrastró" si la posición cambia más de 4 px;
      - el clic siguiente se ignora y limpia la marca.
    - **Roving tabindex:**
      - un solo asiento con `tabIndex=0`: el último enfocado; si no hay, el primer elegido de la zona, el primer disponible o el primero;
      - el resto, `-1`;
      - las flechas, Home y End mueven el foco con `getAdjacentSeatId`;
      - Espacio y Enter alternan (con `preventDefault`);
      - el foco se mueve con `focus({ preventScroll: true })`; si el plano tiene zoom y el asiento queda fuera de la vista, se centra con `zoomToElement(el, escalaActual)`.
    - `<p role="status">` con el `notice` del hook.
24. **Leyenda (`SeatLegend`)**: `<ul aria-label="Leyenda del plano">` con la forma en miniatura (SVG `aria-hidden`) y el texto: "Disponible", "Tu selección", "Ocupado" y "Accesible (silla de ruedas)".
25. **Chips (`SelectedSeatChips`)**:
    - h3 "Tus asientos" y, si no hay ninguno, "Aún no elegiste asientos.".
    - `<ul>` con todos los asientos elegidos (de cualquier zona), en orden de selección.
    - Cada chip (`rounded-full bg-secondary`, `min-h-11`) lleva la etiqueta completa y un botón `X` (`size-11`, `aria-label="Quitar <etiqueta completa>"`).
    - Al quitar un chip, el foco pasa al botón del chip siguiente (o al anterior); si no queda ninguno, al h2 del plano.
    - Va dentro de `SeatPlan`, debajo del plano.
26. **Sincronía:**
    - Activar una zona numerada en el mapa muestra su plano y no mueve el foco.
    - Cambiar de zona conserva los asientos de las otras zonas.
    - El resumen y la barra móvil incluyen los asientos (la cantidad es el número de asientos).
27. **Zona numerada en la lista** (Fase 4): sustituye el texto provisional por un `Button` `outline` `h-11` "Elegir asientos" con `aria-label="Elegir asientos en <zona>"`.
    - Al pulsarlo se activa la zona y el foco pasa al h2 del plano.
    - Si hay asientos elegidos en la zona, bajo el precio aparece "<n> asiento elegido" / "<n> asientos elegidos".
28. **Detalle `/eventos/[slug]`** (contrato H): si `getVenueMapBySlug(slug)` devuelve un mapa, en lugar de `TicketSelector` se muestra `ZonePricesCard`, en la misma celda (`lg:sticky lg:top-24`). Sin mapa, todo sigue igual.
    - **`ZonePricesCard`** (servidor):
      - `Card` `rounded-2xl` con h2 "Entradas";
      - "Entradas desde" (`text-sm text-muted-foreground`) + "S/ X" (`text-3xl font-bold tabular-nums`, `priceFrom`);
      - lista `divide-y` de zonas: muestra de tono, nombre, `Badge` "Últimas entradas" si es `low-stock`, y a la derecha el precio o "Agotado" (`text-muted-foreground font-bold`);
      - CTA primario `h-11 w-full` "Elegir entradas" + `ArrowRight`, que lleva a `/eventos/<slug>/entradas`;
      - nota con `Lock` (`aria-hidden`): "Pago seguro · Entrada digital con QR";
      - si el evento está `sold-out`: "Entradas agotadas" en lugar del CTA.
    - **`MobileBuyBar`** (servidor): último hijo de la página, `sticky bottom-0 z-30 lg:hidden`, mismo estilo que `MobilePurchaseBar`.
      - "Desde" (`text-xs text-muted-foreground`) + precio (`text-xl font-bold`), y enlace "Comprar entradas" + `ArrowRight` (primario `h-11`) a `/eventos/<slug>/entradas`.
      - No se renderiza si el evento está `sold-out`.
29. **Accesibilidad y responsive** (todas las fases):
    - un `<h1>` por página;
    - foco visible en todo lo interactivo;
    - targets ≥ 44 px, salvo los asientos (≥ 24 px, decisión 10);
    - iconos `aria-hidden`;
    - estado con texto, no solo con color;
    - totales con `aria-live="polite"`;
    - sin scroll horizontal a 375 / 768 / 1024 / 1440;
    - solo tokens, Creato Display y sin emojis.

## Criterios de aceptación

### Fase 1. Dominio y mapas mock
- [ ] Dado `getVenueMapBySlug("noche-de-sintetizadores-lima")`, entonces:
  - devuelve un mapa con `venue` "Estadio Nacional", escenario "ESCENARIO" y 4 zonas: `vip`, `preferencial` y `general` (`kind: "general"`) y `norte` (`kind: "numbered"`);
  - cada zona tiene `name`, `price` y `status` iguales a los de su `ticketType`.
- [ ] Dado `getVenueMapBySlug` para `la-casa-de-los-espejos` y `risas-sin-filtro`, entonces devuelven sus mapas, con zonas numeradas `platea`/`mezanine` y `preferencial`/`mesa`, respectivamente.
- [ ] Dado `getVenueMapBySlug("clasico-del-pacifico")` o un slug inexistente, entonces devuelve `null`; `hasVenueMap` devuelve `true` solo para los 3 eventos con mapa.
- [ ] Dado el mock de eventos ajustado, entonces:
  - `noche-de-sintetizadores-lima` tiene 4 tipos (con "Tribuna Norte", S/ 220) y `priceFrom` 180;
  - `la-casa-de-los-espejos` tiene "Platea" (S/ 180) y "Mezanine" (S/ 120, `low-stock`);
  - `npx vitest run modules/events modules/checkout` pasa sin cambios en esos tests.
- [ ] Dado `formatSeatId("norte", "F", 12)`, entonces da `norte-F-12`.
- [ ] Dado `parseSeatId("platea-baja-AA-101")`, entonces da `{ zoneId: "platea-baja", row: "AA", number: 101 }`.
- [ ] Dada la etiqueta del asiento `norte-F-12`, entonces es "Tribuna Norte · Fila F · Asiento 12".
- [ ] Dado `parseSeatIds`, entonces:
  - `undefined` → `[]`;
  - `"norte-A-1,norte-A-2"` → los 2 ids;
  - `""`, ids repetidos, formato inválido, más de 10 ids o un array → `null`.
- [ ] Dado `resolveSeats`, entonces:
  - con asientos disponibles devuelve sus etiquetas en orden;
  - con un asiento ocupado, inexistente, de una zona agotada o repetido devuelve `null`.
- [ ] Dado `generateSeatRows` con las mismas entradas, entonces el resultado es idéntico (determinista).
- [ ] Dado `generateSeatRows` con `occupiedRatio` 0, entonces no hay ocupados; con 1, todos los asientos están ocupados.
- [ ] Dado `generateSeatRows`, entonces las filas cortas quedan centradas y el `seatViewBox` sigue la fórmula del requisito 4.
- [ ] Dados los 3 mapas, entonces cumplen las invariantes del requisito 7.
- [ ] Dado `getZoneTones` para `noche-de-sintetizadores-lima`, entonces VIP → `tier-1`, Preferencial → `tier-2`, Tribuna Norte → `tier-3` y General → `tier-4`.
- [ ] Dado `getZoneTones` para `risas-sin-filtro`, entonces Mesa → `sold-out`.
- [ ] Dado `npx vitest run`, entonces pasan los tests nuevos y los existentes; `npm run lint` sin errores.

### Fase 2. Página de selección (zonas de pie)
- [ ] Dado `/eventos/noche-de-sintetizadores-lima/entradas`, cuando carga, entonces:
  - el `<title>` es "Elige tus entradas: Noche de Sintetizadores: Gira Neón 2026 | Mentec Tickets";
  - se ve el stepper con "Entradas" como paso actual (`aria-current="step"`);
  - se ven el enlace "Volver al evento", un único h1 con el título, la fecha `SÁB 14 NOV · 21:00` y "Estadio Nacional, Lima";
  - se ven el mapa "Elige tu zona" con escenario y 4 zonas, la lista "Entradas" y, en `lg`, "Tu compra" con "Todavía no elegiste entradas. Toca una zona o usa los botones +." y "Continuar" deshabilitado.
- [ ] Dado `npm run build`, entonces se generan estáticamente solo las 3 rutas `/eventos/<slug>/entradas` con mapa.
- [ ] Dado `/eventos/clasico-del-pacifico/entradas` (sin mapa) o un slug inexistente, entonces se ve "No encontramos este evento".
- [ ] Dado el mapa, cuando se hace clic en "Preferencial", entonces:
  - su `path` pasa a `aria-pressed="true"` (los demás a `"false"`) y muestra el halo de seleccionada;
  - la fila "Preferencial" de la lista se resalta.
- [ ] Dado el teclado, cuando se recorre con Tab, entonces cada zona recibe foco visible (trazo discontinuo) y Enter o Espacio la activan sin desplazar la página.
- [ ] Dado "Agregar una entrada de General" pulsado 2 veces, entonces:
  - la cantidad muestra 2 y "General" queda activa;
  - "Tu compra" muestra "2 × General … S/ 360.00", "Total (2 entradas)", "S/ 360.00" y "Precio final, sin cargos ocultos";
  - "Continuar" es un enlace a `/checkout?evento=noche-de-sintetizadores-lima&general=2`, y al seguirlo `/checkout` muestra el resumen correcto.
- [ ] Dado "Quitar una entrada de General" con 0, entonces está deshabilitado y la cantidad no baja de 0.
- [ ] Dadas 10 entradas en total, entonces todos los "+" quedan deshabilitados y el pie dice "Llegaste al máximo de 10 entradas por compra.".
- [ ] Dado `/eventos/risas-sin-filtro/entradas`, entonces:
  - "Mesa" se ve gris en el mapa con "Agotado" y en la lista con "Agotado", sin stepper;
  - "General" y "Preferencial" muestran "Últimas entradas" en el mapa (píldora) y en la lista (`Badge`).
- [ ] Dada una zona numerada ("Tribuna Norte") en Fase 2, entonces se puede activar en el mapa, y la lista muestra su precio y "Elección de asientos próximamente", sin stepper.
- [ ] Dado un lector de pantalla, entonces:
  - las zonas se anuncian como botón conmutable con nombre, precio y estado (p. ej. "VIP, S/ 550.00, últimas entradas");
  - los cambios de cantidad y de total se anuncian (`aria-live`);
  - el `<ol>` del stepper se lee en todos los tamaños.
- [ ] Dado 375 px de ancho, entonces:
  - no hay scroll horizontal;
  - el stepper muestra "Paso 1 de 3", "Elige tus entradas" y la barra de progreso al 33 %;
  - el mapa ocupa el ancho y sus textos miden ≥ 12 px;
  - "Tu compra" no se ve;
  - la barra inferior "Total · 0 entradas / S/ 0.00 / Continuar" queda pegada abajo al desplazarse y no tapa el footer al final de la página.
- [ ] Dado 1024 px o más, entonces "Tu compra" es sticky bajo el header y la barra inferior no se ve.
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta el layout, los tonos por precio, los estados de zona y las reglas de accesibilidad de la página.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 3. Lógica de asientos y checkout con asientos
- [ ] Dado `findBestAvailableSeats` con un fixture, entonces:
  - elige el bloque contiguo `available` de la fila más cercana y más centrado;
  - ignora los asientos accesibles y ocupados;
  - devuelve `null` si no hay bloque.
- [ ] Dado `getAdjacentSeatId`, entonces las flechas, Home y End se mueven según el requisito 19 y se quedan en el mismo asiento en los bordes.
- [ ] Dado el hook, cuando se alterna un asiento disponible, entonces entra y sale de `seatIds`; un asiento ocupado no cambia nada; en el límite no se añade y `notice` es "Máximo 10 entradas por compra".
- [ ] Dado `pickBestSeats` con 2 asientos de la zona ya elegidos, entonces se reemplazan por el mejor bloque de 2 y `notice` es "Elegimos 2 asientos juntos en la fila X.".
- [ ] Dado `pickBestSeats` sin bloque posible, entonces la selección no cambia y aparece el aviso del requisito 20.
- [ ] Dados 2 asientos disponibles de "Tribuna Norte" (p. ej. los que devuelve `findBestAvailableSeats(zonaNorte, 2)`), cuando se abre `/checkout?evento=noche-de-sintetizadores-lima&norte=2&asientos=<id1>,<id2>`, entonces el resumen muestra "Tribuna Norte", "2 × S/ 220.00", las etiquetas "Tribuna Norte · Fila … · Asiento …" de ambos asientos y el total S/ 440.00.
- [ ] Dado `norte=2` sin `asientos`, un asiento ocupado, un `asientos` con 1 solo asiento para `norte=2`, `asientos` vacío o repetido, o asientos en un evento sin mapa, entonces se ve "No pudimos preparar tu compra".
- [ ] Dado `general=2&vip=1` en `noche-de-sintetizadores-lima` (sin asientos), entonces sigue siendo válido con total S/ 910.00.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan; los tests de checkout existentes pasan sin cambios.

### Fase 4. Plano de asientos e integración en el detalle
- [ ] Dado `package.json`, entonces incluye `react-zoom-pan-pinch` `^4.2.0`.
- [ ] Dado `/eventos/noche-de-sintetizadores-lima/entradas`, cuando se activa "Tribuna Norte", entonces aparecen bajo el mapa:
  - "Elige tus asientos" con "Tribuna Norte · S/ 220.00 c/u", los botones "Acercar", "Alejar" y "Ver todo el plano", y "Mejor asiento disponible";
  - el plano entero a la vista, con el escenario arriba y las filas A–H rotuladas;
  - la leyenda y "Tus asientos" con "Aún no elegiste asientos.".
- [ ] Dado un asiento disponible, cuando se hace clic, entonces:
  - pasa a `aria-checked="true"` con la forma de "Tu selección";
  - aparece el chip "Tribuna Norte · Fila … · Asiento …";
  - "Tu compra" muestra "1 × Tribuna Norte", la etiqueta corta y S/ 220.00;
  - "Continuar" lleva a `/checkout?evento=…&norte=1&asientos=norte-…`.
- [ ] Dado un asiento ocupado, cuando se hace clic o se pulsa Espacio sobre él, entonces no cambia nada y su `aria-label` termina en "ocupado".
- [ ] Dado el plano con foco, cuando se usan las flechas, entonces:
  - el foco se mueve entre asientos con foco visible y solo hay una parada de Tab en el plano;
  - Espacio o Enter eligen o quitan el asiento sin desplazar la página.
- [ ] Dado "Mejor asiento disponible" sin asientos elegidos, entonces se elige 1 asiento de la fila más cercana y más centrado y se anuncia "Elegimos Fila … · Asiento ….".
- [ ] Dado el botón "Quitar …" de un chip, cuando se pulsa, entonces el asiento se deselecciona en el plano y en el resumen, y el foco pasa al chip siguiente (o al h2 si no queda ninguno).
- [ ] Dado "Elegir asientos en Platea" en `/eventos/la-casa-de-los-espejos/entradas`, cuando se pulsa, entonces la zona se activa y el foco pasa al h2 "Elige tus asientos".
- [ ] Dado el mapa, cuando se eligen asientos en "Platea" y en "Mezanine" y se cambia de zona, entonces se conservan los asientos de ambas zonas.
- [ ] Dado lo anterior, entonces el enlace a checkout lleva `platea=<n>&mezanine=<m>&asientos=…` y `/checkout` lo acepta.
- [ ] Dado el plano en móvil (375 px), cuando se pellizca o se arrastra, entonces:
  - hace zoom o paneo sin hacer zoom en la página (`touch-action: none`);
  - soltar tras un arrastre no elige ningún asiento;
  - con el plano entero a la vista, cada asiento mide ≥ 24 px;
  - no hay scroll horizontal.
- [ ] Dados "Acercar", "Alejar" y "Ver todo el plano" (≥ 44 px), cuando se pulsan, entonces el plano hace zoom y se encaja; con `prefers-reduced-motion`, sin animación.
- [ ] Dado `/eventos/noche-de-sintetizadores-lima`, entonces el aside muestra, en lugar de `TicketSelector`:
  - "Entradas desde S/ 180.00" y la lista de las 4 zonas con su tono y precio ("Últimas entradas" en VIP);
  - "Elegir entradas", que lleva a `/eventos/noche-de-sintetizadores-lima/entradas`;
  - "Pago seguro · Entrada digital con QR".
- [ ] Dado `/eventos/noche-de-sintetizadores-lima` a 375 px, entonces hay una barra inferior pegada "Desde S/ 180.00 · Comprar entradas" que lleva a `/entradas`.
- [ ] Dado `/eventos/clasico-del-pacifico` (sin mapa), entonces se ve `TicketSelector` como antes y no hay barra inferior.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

## Diseño técnico

### Rutas (`app/`)
Consultar `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md` (params de segmentos superiores) y `file-conventions/not-found.md`.
- `app/eventos/[slug]/entradas/page.tsx` (F2): `generateStaticParams` (eventos con `hasVenueMap`), `generateMetadata` y la página async. Sin `dynamicParams = false`: un slug desconocido llega a `notFound()` y usa el 404 del evento.
- `app/eventos/[slug]/page.tsx` (F4): `Promise.all([getEventBySlug, getRelatedEvents, getVenueMapBySlug])`.
  - Con mapa: `ZonePricesCard` en la celda del selector y `MobileBuyBar` como último elemento del fragmento (después de `RelatedEvents`).
  - Sin mapa: `TicketSelector` sin cambios.

### Componentes
- shadcn (instalados, no hay nada que instalar): `card`, `button`/`buttonVariants`, `badge`, `separator`.
  - Durante la redacción, `npx shadcn@latest search` falló por red (403 del proxy). Según el catálogo conocido de shadcn, no hay stepper de pasos, chips ni plano/zoom.
  - `progress` existe pero no hace falta: la barra móvil del stepper es decorativa (`aria-hidden`, un `div`).
- nuevo `components/shared/PurchaseStepper.tsx` (F2, servidor, presentacional; contrato A). Va a `shared` porque lo usan `seating` (paso 1) y `checkout` (pasos 2 y 3).
- Nuevos en `modules/seating/components/` (los usa solo `seating`):
  - `EventPurchaseStrip.tsx` (F2, servidor): props `slug`, `title`, `imageUrl`, `startsAt`, `venue`, `city`.
  - `TicketSelection.tsx` (F2, `"use client"`): props `eventSlug: string` y `map: VenueMap`. Usa `useSeatSelection` y compone el resto. En F4 añade `SeatPlan` y el foco al h2 del plano.
  - `VenueMapView.tsx` (F2; cliente por estar bajo `TicketSelection`): props `viewBox`, `stage`, `venue`, `zones`, `tones`, `activeZoneId` y `onSelectZone`.
  - `ZoneList.tsx` (F2; F4 añade `seatCountByZone` y `onChooseSeats`): props `zones`, `tones`, `activeZoneId`, `quantities`, `atLimit` y `onChangeQuantity`.
  - `PurchaseSummary.tsx` (F2): props `lines`, `ticketCount`, `total`, `checkoutHref` y `className`.
  - `MobilePurchaseBar.tsx` (F2): props `ticketCount`, `total`, `checkoutHref` y `className`.
  - `SeatPlan.tsx` (F4, `"use client"`): props `zone: NumberedVenueZone`, `stageLabel`, `selectedSeatIds`, `selectedSeats: { id; label }[]`, `notice`, `canPickBest`, `onToggleSeat`, `onRemoveSeat`, `onPickBestSeats` y `headingId`. Contiene `TransformWrapper` y la barra de herramientas (con `useControls` dentro del wrapper).
  - `SeatLegend.tsx` (F4, presentacional).
  - `SelectedSeatChips.tsx` (F4): props `seats: { id; label }[]` y `onRemove(id)`.
  - `ZonePricesCard.tsx` (F4, servidor): props `slug`, `status`, `priceFrom` y `zones`.
  - `MobileBuyBar.tsx` (F4, servidor): props `slug` y `priceFrom`.
- Existentes que se modifican: `modules/checkout/components/OrderSummary.tsx` (F3, asientos por línea) y `app/eventos/[slug]/page.tsx` (F4).

### Schemas, tipos, utils, hooks y service (`modules/seating`)

`schemas/seating.schema.ts` (F1):
```ts
export const seatRowLabelSchema = z.string().regex(/^[A-Z]{1,2}$/);
export const seatStatusSchema = z.enum(["available", "occupied", "accessible"]);
export const seatSchema = z.object({
  id: z.string(), row: seatRowLabelSchema, number: z.number().int().min(1).max(999),
  x: z.number(), y: z.number(), status: seatStatusSchema,
});
export const seatRowSchema = z.object({ label: seatRowLabelSchema, seats: seatSchema.array().min(1) });
const pointSchema = z.object({ x: z.number(), y: z.number() });
const viewBoxSchema = z.string().regex(/^0 0 \d+ \d+$/);
const kebabIdSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const zoneLayoutBaseSchema = z.object({
  id: kebabIdSchema, ticketTypeId: kebabIdSchema, path: z.string().min(1), labelPos: pointSchema,
});
export const venueZoneLayoutSchema = z.discriminatedUnion("kind", [
  zoneLayoutBaseSchema.extend({ kind: z.literal("general"), capacity: z.number().int().positive() }),
  zoneLayoutBaseSchema.extend({ kind: z.literal("numbered"), seatViewBox: viewBoxSchema, rows: seatRowSchema.array().min(1) }),
]);
export const venueLayoutSchema = z.object({
  eventSlug: z.string().min(1),
  viewBox: viewBoxSchema,
  stage: z.object({ label: z.string().min(1), path: z.string().min(1), labelPos: pointSchema }),
  zones: venueZoneLayoutSchema.array().min(1),
}).superRefine(/* requisito 3 */);
export const seatIdSchema = z.string().regex(SEAT_ID_PATTERN); // /^([a-z0-9]+(?:-[a-z0-9]+)*)-([A-Z]{1,2})-(\d{1,3})$/
export const seatIdsParamSchema = z.string().transform((value) => value.split(","))
  .pipe(seatIdSchema.array().min(1).max(MAX_TICKETS_PER_ORDER)) // MAX desde "@/modules/events/purchase"
  .refine((ids) => new Set(ids).size === ids.length);
```

`types/seating.types.ts` (F1):
```ts
export type SeatStatus = z.infer<typeof seatStatusSchema>;
export type Seat = z.infer<typeof seatSchema>;
export type SeatRow = z.infer<typeof seatRowSchema>;
export type VenueLayout = z.infer<typeof venueLayoutSchema>;
export type VenueZoneLayout = z.infer<typeof venueZoneLayoutSchema>;
export type VenueZone = VenueZoneLayout & { name: string; price: number; status: EventStatus }; // import type de "@/modules/events"
export type GeneralVenueZone = Extract<VenueZone, { kind: "general" }>;
export type NumberedVenueZone = Extract<VenueZone, { kind: "numbered" }>;
export type VenueMap = Omit<VenueLayout, "zones"> & { venue: string; zones: VenueZone[] };
export type ResolvedSeat = { id: string; label: string; zoneId: string; ticketTypeId: string };
export type SeatSelection = { quantities: Record<string, number>; seatIds: string[] };
export type SelectionLine = { zoneId: string; name: string; quantity: number; amount: number; seatLabels: string[] };
export type ZoneTone = "tier-1" | "tier-2" | "tier-3" | "tier-4" | "sold-out";
```

Utils (puros, sin React):
- `utils/seatIds.ts` (F1):
  - `SEAT_ID_PATTERN`;
  - `formatSeatId(zoneId, row, number)` y `parseSeatId(id): { zoneId; row; number } | null`;
  - `formatSeatShortLabel(row, number)` → "Fila F · Asiento 12";
  - `formatSeatLabel(zoneName, row, number)` → "Tribuna Norte · Fila F · Asiento 12";
  - `getSeatAriaLabel(seat, priceLabel)` (requisito 23);
  - `parseSeatIds` y `resolveSeats` (requisito 6).
- `utils/seatRows.ts` (F1): `SEAT_PITCH`, `SEAT_PLAN_MARGIN` y `generateSeatRows(spec: { zoneId: string; rowLabels: string[]; seatsPerRow: number | number[]; occupiedRatio: number; accessibleSeats?: string[] }): { seatViewBox: string; rows: SeatRow[] }`.
- `utils/zoneTone.ts` (F1): `getZoneTones(zones: Pick<VenueZone, "id" | "price" | "status">[]): Record<string, ZoneTone>` y `ZONE_TONE_CLASSES: Record<ZoneTone, { shape: string; label: string; swatch: string }>` (decisión 9).
- `utils/selectionSummary.ts` (F2): requisito 17.
- `utils/bestSeats.ts` (F3): `findBestAvailableSeats(zone: NumberedVenueZone, count: number): string[] | null`.
- `utils/seatNavigation.ts` (F3): `getAdjacentSeatId(zone: NumberedVenueZone, seatId: string, key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End"): string`.

Hook `hooks/useSeatSelection.ts` (`"use client"`, F2 y F3):
```ts
export function useSeatSelection(map: VenueMap): {
  activeZoneId: string | null;
  quantities: Record<string, number>;
  seatIds: string[];
  ticketCount: number;
  atLimit: boolean;
  lines: SelectionLine[];
  total: number;
  checkoutHref: string | null;
  notice: string | null;                                   // F3
  selectZone(zoneId: string): void;
  changeQuantity(zoneId: string, delta: 1 | -1): void;
  toggleSeat(seatId: string): void;                       // F3
  removeSeat(seatId: string): void;                       // F3
  pickBestSeats(zoneId: string): void;                    // F3
};
```
`map.eventSlug` sirve para el href.

Datos `data/venueMaps.mock.ts` (F1): `VENUE_LAYOUTS_MOCK: z.input<typeof venueLayoutSchema>[]`, con las zonas numeradas generadas con `generateSeatRows` (no se escriben asientos a mano).
- Las coordenadas son de referencia: el developer puede redondear esquinas o curvar formas, siempre que se mantengan los requisitos 7 y 10 y que las etiquetas queden dentro de su zona sin solaparse.
- Las zonas `low-stock` miden ≥ 96 unidades de alto, para que quepa la píldora.

| Evento | `viewBox` | Escenario | Zonas (`id` · tipo · forma de referencia · `labelPos`) |
|---|---|---|---|
| `noche-de-sintetizadores-lima` | `0 0 600 560` | "ESCENARIO" `M200 16 H400 V60 H200 Z` (300, 46) | `vip` · general (1500) · `M150 76 H450 V180 H150 Z` (300, 128) · `preferencial` · general (4000) · `M90 196 H510 V296 H90 Z` (300, 246) · `general` · general (12000) · `M20 312 H580 V444 H20 Z` (300, 378) · `norte` · numbered · `M20 460 H580 V544 H20 Z` (300, 502): filas A–H, 10 por fila, `occupiedRatio` 0.3, accesibles `norte-H-1`, `norte-H-10` |
| `la-casa-de-los-espejos` | `0 0 600 520` | "ESCENARIO" `M150 16 H450 V64 H150 Z` (300, 50) | `platea` · numbered · `M60 90 H540 V300 H60 Z` (300, 195): filas A–J, `[8,8,9,9,10,10,10,10,10,10]`, 0.4, accesibles `platea-J-1`, `platea-J-10` · `mezanine` · numbered · `M40 330 H560 V490 H40 Z` (300, 410): filas A–F, 10, 0.85 |
| `risas-sin-filtro` | `0 0 600 520` | "ESCENARIO" `M200 16 H400 V64 H200 Z` (300, 50) | `mesa` · numbered · `M120 84 H480 V170 H120 Z` (300, 127): filas A–C, 8, 1 (agotada) · `preferencial` · numbered · `M60 186 H540 V326 H60 Z` (300, 256): filas A–F, 10, 0.8, accesibles `preferencial-F-1`, `preferencial-F-10` · `general` · general (600) · `M20 342 H580 V500 H20 Z` (300, 421) |

Service `services/seating.service.ts` (F1), servidor y mock por ahora, con la misma firma que tendrá la API:
- `getVenueMapBySlug(slug: string): Promise<VenueMap | null>` (requisito 5);
- `hasVenueMap(slug: string): boolean`.

`index.ts`:
- F1: `getVenueMapBySlug`, `hasVenueMap`, `parseSeatIds`, `resolveSeats`, `formatSeatLabel` y los tipos `VenueMap`, `VenueZone`, `NumberedVenueZone`, `Seat`, `SeatStatus`, `ResolvedSeat`.
- F2 añade `TicketSelection` y `EventPurchaseStrip`.
- F4 añade `ZonePricesCard` y `MobileBuyBar`.

### Otros módulos
- `modules/events/purchase.ts` (F1, entrada pública que solo reexporta): `formatEventPrice` (`./utils/formatEvent`) y `MAX_TICKETS_PER_ORDER` y `buildCheckoutHref` (`./utils/ticketOrder`).
- `modules/events/data/events.mock.ts` (F1): decisión 4.
- `modules/checkout` (F3):
  - `types/checkout.types.ts`: `seats?` en `CheckoutOrderItem`.
  - `utils/checkoutOrder.ts`: `buildCheckoutOrder(event, quantities, seating: { map: VenueMap | null; seatIds: string[] | null } = { map: null, seatIds: [] })`, con las reglas del requisito 21; usa `resolveSeats` de `@/modules/seating`.
  - `services/checkout.service.ts`: separa `asientos`, usa `parseSeatIds` y `getVenueMapBySlug`, y amplía la firma de `resolveCheckoutOrder` (requisito 21).
  - `components/OrderSummary.tsx`: requisito 22.
  - `schemas/checkout.schema.ts`: sin cambios (`asientos` lo valida `seatIdsParamSchema` de `seating`).

### Dependencias entre módulos
`checkout` → `seating` → `events` (solo barrel o entrada pública). `events` no importa `seating`: la integración en el detalle la compone `app/`.

### Contrato de API
No hay API: son datos mock.
- **Forma de los datos:** `VenueMap` (tipos de arriba).
- **Funciones públicas** (contrato B):
  - `getVenueMapBySlug(slug): Promise<VenueMap | null>`;
  - `hasVenueMap(slug): boolean`;
  - `parseSeatIds(raw: string | string[] | undefined): string[] | null`;
  - `resolveSeats(map: VenueMap, seatIds: string[]): ResolvedSeat[] | null`.
- **Paso a checkout** (contrato C):
  ```
  GET /checkout?evento=<slug>&<ticketTypeId>=<entero ≥ 1>…[&asientos=<seatId>(%2C<seatId>)*]
  ```
  Para cada zona numerada, `<ticketTypeId>` = número de asientos de esa zona en `asientos`.
  ```ts
  type CheckoutOrderItem = { ticketTypeId: string; name: string; unitPrice: number; quantity: number; seats?: { id: string; label: string }[] };
  ```
- **`PurchaseStepper`** (contrato A): `{ currentStep: 1 | 2 | 3 }`.
- **Detalle** (contrato H): `ZonePricesCard` `{ slug: string; status: EventStatus; priceFrom: number; zones: VenueZone[] }` y `MobileBuyBar` `{ slug: string; priceFrom: number }`.

## Reutilización
- `events`:
  - `getEventBySlug`, `getEvents`, `formatEventDate` y tipos (barrel, en servidor);
  - `formatEventPrice`, `MAX_TICKETS_PER_ORDER` y `buildCheckoutHref` (entrada nueva `purchase.ts`, en cliente);
  - patrón de stepper accesible de `TicketSelector` (`focusableWhenDisabled`, clases `aria-disabled:*`, `aria-live`) y de su CTA deshabilitado;
  - clases de estado `bg-warning text-warning-foreground` de `EVENT_STATUS_BADGE`;
  - grilla y sticky de `/eventos/[slug]`;
  - `not-found.tsx` del evento.
- `checkout`: `getCheckoutOrder`/`buildCheckoutOrder` (se amplían, no se duplican) y `OrderSummary`.
- shadcn instalados: `Card`, `Button`, `Badge`, `Separator`.
- Iconos `lucide-react`: `ArrowLeft`, `ArrowRight`, `Lock`, `Check`, `Minus`, `Plus`, `X`, `ZoomIn`, `ZoomOut`, `Maximize`, `Sparkles`.
- Nativos: SVG, `URLSearchParams`, `Intl` (vía `formatEventPrice`), `matchMedia("(prefers-reduced-motion: reduce)")`.
- Dependencia nueva (F4): `react-zoom-pan-pinch@^4.2.0` (decisión 2).

## Tests
- `modules/seating/schemas/seating.schema.test.ts` (F1):
  - un layout mínimo válido pasa;
  - fallan:
    - zona duplicada;
    - `ticketTypeId` duplicado;
    - `seat.id` que no coincide con `formatSeatId`;
    - `seat.row` distinto de `row.label`;
    - filas o números repetidos;
    - `viewBox` inválido;
    - zona numerada sin `rows`;
    - zona general sin `capacity`;
  - `seatIdsParamSchema`: acepta 1 y 10 ids; rechaza 11, vacío, duplicados y mal formados.
- `modules/seating/utils/seatIds.test.ts` (F1):
  - `formatSeatId`/`parseSeatId`: ida y vuelta, zona con guiones y fila de 2 letras; inválidos → `null`;
  - etiquetas completa y corta;
  - `getSeatAriaLabel` para los 3 estados;
  - `parseSeatIds`: casos del criterio F1;
  - `resolveSeats` con un `VenueMap` fixture: ok en orden, inexistente, ocupado, zona agotada, asiento de zona general, duplicado y `[]`.
- `modules/seating/utils/seatRows.test.ts` (F1):
  - número de filas y asientos;
  - ids y numeración 1..n;
  - centrado de filas cortas;
  - fórmula del `seatViewBox`;
  - determinismo;
  - `occupiedRatio` 0 y 1;
  - accesibles aplicados solo si no están ocupados;
  - accesible inexistente lanza error;
  - con 0.3 sobre 100 asientos, entre 15 y 45 ocupados.
- `modules/seating/utils/zoneTone.test.ts` (F1):
  - orden por precio, empates, más de 4 precios y `sold-out`;
  - todos los tonos tienen clases.
- `modules/seating/services/seating.service.test.ts` (F1, con los mocks reales):
  - los criterios F1 de `getVenueMapBySlug`/`hasVenueMap`;
  - invariantes del requisito 7 para los 3 mapas.
- `modules/seating/utils/selectionSummary.test.ts` (F2):
  - líneas en orden de zonas;
  - asientos agrupados por zona con etiqueta corta;
  - conteo y total;
  - `toCheckoutQuantities` (zona → `ticketTypeId`);
  - href sin asientos, con asientos (`asientos=…%2C…`) y `null` con 0 entradas;
  - omite cantidades 0;
  - `formatTicketCount(1)` → "1 entrada" y `(3)` → "3 entradas".
- `modules/seating/hooks/useSeatSelection.test.ts` (`renderHook`):
  - F2:
    - estado inicial;
    - `selectZone`;
    - `changeQuantity` activa la zona, sube y baja sin pasar de 0;
    - no hace nada en zonas numeradas o agotadas;
    - límite de 10 sumando zonas;
    - `total`, `lines` y `checkoutHref`.
  - F3 amplía con:
    - `toggleSeat` (añade, quita, ocupado, límite + `notice`);
    - `removeSeat`;
    - `pickBestSeats` (1 asiento, reemplazo de k, sin bloque + `notice`);
    - el límite cuenta asientos + entradas de pie;
    - href con `asientos`.
- `modules/seating/components/TicketSelection.test.tsx` (con un `VenueMap` fixture):
  - Se usa `within`/`getAllBy` porque en jsdom se renderizan el resumen y la barra.
  - F2:
    - clic en una zona del mapa → `aria-pressed` y la fila se resalta;
    - Enter en una zona la activa;
    - "Agregar una entrada de …" actualiza la cantidad, el total y el `href` de "Continuar";
    - CTA deshabilitado con 0;
    - límite de 10 con el texto del pie;
    - zona agotada con "Agotado" y sin stepper;
    - zona numerada con "Elección de asientos próximamente".
  - F4, con `vi.mock("react-zoom-pan-pinch")`: `TransformWrapper` renderiza `children` (función o nodo), `TransformComponent` pasa `children` y `useControls` devuelve funciones falsas.
    - "Elegir asientos" muestra el plano y enfoca su h2;
    - clic en un asiento → `aria-checked`, chip y resumen;
    - Espacio alterna;
    - ArrowRight mueve el foco y el `tabIndex` 0;
    - un asiento ocupado no cambia nada;
    - "Mejor asiento disponible" elige 1 asiento y anuncia el aviso;
    - quitar un chip deselecciona y mueve el foco;
    - el `href` incluye `asientos`.
- `modules/seating/utils/bestSeats.test.ts` (F3):
  - fila más cercana, bloque centrado, empate al número menor;
  - ignora accesibles y ocupados;
  - `count` mayor que cualquier bloque → `null`;
  - zona sin disponibles → `null`.
- `modules/seating/utils/seatNavigation.test.ts` (F3):
  - las 6 teclas;
  - bordes de fila y de plano;
  - arriba/abajo con filas de distinta longitud (la `x` más cercana).
- `modules/checkout/utils/checkoutOrder.test.ts` (F3):
  - Los tests existentes no cambian.
  - Se añade un `VenueMap` fixture (una zona de pie y una numerada):
    - pedido con asientos válido → `seats` con etiquetas en la línea numerada y sin `seats` en la de pie;
    - zona numerada sin asientos, número de asientos distinto de la cantidad, asiento ocupado, asiento de otra zona o inexistente, `seatIds` `null`, o asientos sin mapa → `invalid-tickets`;
    - la regla de evento `sold-out` sigue yendo primero.
- `modules/checkout/services/checkout.service.test.ts` (F3):
  - Los tests existentes no cambian.
  - Se añade:
    - `noche-de-sintetizadores-lima&norte=2&asientos=<2 disponibles obtenidos del mapa real>` → `ok` con total 440 y etiquetas;
    - `norte=2` sin `asientos` → `invalid-tickets`;
    - `asientos` como array o vacío → `invalid-tickets`;
    - `resolveCheckoutOrder` con `seatIds` por defecto sigue igual.
- Sin tests:
  - páginas de `app/`;
  - `PurchaseStepper`: presentacional sin estado ni eventos;
  - `EventPurchaseStrip`, `VenueMapView`, `ZoneList`, `PurchaseSummary`, `MobilePurchaseBar`, `SeatLegend`, `ZonePricesCard`, `MobileBuyBar` y `OrderSummary`: presentacionales, cubiertos por `TicketSelection.test` donde tienen comportamiento;
  - `SeatPlan` y `SelectedSeatChips`: cubiertos en `TicketSelection.test` (F4);
  - mocks, tipos, `index.ts` y `purchase.ts`.

## Plan de tareas
Coordinación con las otras specs de la ronda (orden: seating → checkout → tickets → organizer → events-ui-refresh):
- Esta spec se implementa **completa (F1–F4)** antes de empezar la nueva spec de checkout. Esa spec reutiliza `PurchaseStepper` (contrato A), `CheckoutOrderItem.seats` y las reglas de `asientos` (contrato C), y modifica después los mismos archivos de `modules/checkout` que toca F3.
- Nota para la spec de checkout: la acción "Volver a elegir entradas" debería apuntar a `/eventos/<slug>/entradas` cuando `hasVenueMap(slug)`.
- `app/eventos/[slug]/page.tsx` (F4) y `modules/events/data/events.mock.ts` (F1) solo los tocan después las specs posteriores. events-ui-refresh **no** rehace el aside del detalle (contrato H).
- No ejecutar dos `npm install` a la vez (F4 T1).
- Los developers en paralelo verifican con `npx vitest run <sus archivos>` y `npx eslint <sus archivos>`; el build lo ejecuta el reviewer.

### Fase 1. Dominio `seating` y mapas mock
- [x] T1. Ajustar `ticketTypes` del mock de eventos (decisión 4) y crear la entrada pública `purchase.ts`; verificar que `npx vitest run modules/events modules/checkout` pasa.
  - Archivos: `modules/events/data/events.mock.ts`, `modules/events/purchase.ts`.
  - Depende de: nada.
  - Secuencial (base, archivos de otro módulo).
- [x] T2. Schema, tipos y utilidades de ids, etiquetas y validación de asientos, con tests.
  - Archivos: `modules/seating/schemas/seating.schema.ts`, `modules/seating/schemas/seating.schema.test.ts`, `modules/seating/types/seating.types.ts`, `modules/seating/utils/seatIds.ts`, `modules/seating/utils/seatIds.test.ts`.
  - Depende de: T1.
  - Secuencial.
- [x] T3. Generador de filas con test.
  - Archivos: `modules/seating/utils/seatRows.ts`, `modules/seating/utils/seatRows.test.ts`.
  - Depende de: T2.
  - En paralelo con T4.
- [x] T4. Tonos por precio con test.
  - Archivos: `modules/seating/utils/zoneTone.ts`, `modules/seating/utils/zoneTone.test.ts`.
  - Depende de: T2.
  - En paralelo con T3.
- [x] T5. Mapas mock, service con test (incluye las invariantes) y barrel.
  - Archivos: `modules/seating/data/venueMaps.mock.ts`, `modules/seating/services/seating.service.ts`, `modules/seating/services/seating.service.test.ts`, `modules/seating/index.ts`.
  - Depende de: T1, T3, T4.
  - Secuencial.

### Fase 2. Página `/eventos/[slug]/entradas` (zonas de pie)
- [ ] T1. `PurchaseStepper` compartido (contrato A).
  - Archivos: `components/shared/PurchaseStepper.tsx`.
  - Depende de: Fase 1.
  - Secuencial (base, `components/shared`).
- [ ] T2. Lógica de selección: `selectionSummary` y `useSeatSelection` (acciones de F2), con tests.
  - Archivos: `modules/seating/utils/selectionSummary.ts`, `modules/seating/utils/selectionSummary.test.ts`, `modules/seating/hooks/useSeatSelection.ts`, `modules/seating/hooks/useSeatSelection.test.ts`.
  - Depende de: T1.
  - En paralelo con T3.
- [ ] T3. Componentes presentacionales de la página.
  - Archivos: `modules/seating/components/EventPurchaseStrip.tsx`, `modules/seating/components/VenueMapView.tsx`, `modules/seating/components/ZoneList.tsx`, `modules/seating/components/PurchaseSummary.tsx`, `modules/seating/components/MobilePurchaseBar.tsx`.
  - Depende de: T1 (los tipos están en F1).
  - En paralelo con T2.
- [ ] T4. Contenedor con test, ruta, barrel y diseño de página.
  - Archivos: `modules/seating/components/TicketSelection.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `app/eventos/[slug]/entradas/page.tsx`, `modules/seating/index.ts`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T2, T3.
  - Secuencial.

### Fase 3. Lógica de asientos y checkout con asientos
- [ ] T1. "Mejor asiento disponible" y navegación entre asientos, con tests.
  - Archivos: `modules/seating/utils/bestSeats.ts`, `modules/seating/utils/bestSeats.test.ts`, `modules/seating/utils/seatNavigation.ts`, `modules/seating/utils/seatNavigation.test.ts`.
  - Depende de: Fase 2.
  - En paralelo con T3.
- [ ] T2. Acciones de asientos en `useSeatSelection` (`toggleSeat`, `removeSeat`, `pickBestSeats`, `notice`), con test ampliado.
  - Archivos: `modules/seating/hooks/useSeatSelection.ts`, `modules/seating/hooks/useSeatSelection.test.ts`.
  - Depende de: T1.
  - En paralelo con T3.
- [ ] T3. Checkout acepta y valida `asientos` (contrato C) y los muestra en `OrderSummary`, con tests.
  - Archivos: `modules/checkout/types/checkout.types.ts`, `modules/checkout/utils/checkoutOrder.ts`, `modules/checkout/utils/checkoutOrder.test.ts`, `modules/checkout/services/checkout.service.ts`, `modules/checkout/services/checkout.service.test.ts`, `modules/checkout/components/OrderSummary.tsx`.
  - Depende de: Fase 1.
  - En paralelo con T1 y T2.

### Fase 4. Plano de asientos e integración en el detalle
- [ ] T1. Instalar `react-zoom-pan-pinch` con `npm install react-zoom-pan-pinch@^4.2.0`.
  - Archivos: `package.json`, `package-lock.json`.
  - Depende de: Fase 3.
  - Secuencial (base).
- [ ] T2. Plano de asientos, leyenda y chips.
  - Archivos: `modules/seating/components/SeatPlan.tsx`, `modules/seating/components/SeatLegend.tsx`, `modules/seating/components/SelectedSeatChips.tsx`.
  - Depende de: T1.
  - En paralelo con T3.
- [ ] T3. Tarjeta de precios por zona y barra móvil del detalle (contrato H).
  - Archivos: `modules/seating/components/ZonePricesCard.tsx`, `modules/seating/components/MobileBuyBar.tsx`.
  - Depende de: T1.
  - En paralelo con T2.
- [ ] T4. Integrar el plano en `TicketSelection` y el botón "Elegir asientos" en `ZoneList`, con test ampliado.
  - Archivos: `modules/seating/components/TicketSelection.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `modules/seating/components/ZoneList.tsx`.
  - Depende de: T2.
  - Secuencial.
- [ ] T5. Detalle con mapa, barrel y documentación de diseño.
  - `ticket-selection.md`: añadir el plano de asientos, la leyenda y el teclado.
  - `event-detail.md`: añadir el aside con mapa y la barra móvil.
  - Archivos: `app/eventos/[slug]/page.tsx`, `modules/seating/index.ts`, `design-system/ticketera/pages/ticket-selection.md`, `design-system/ticketera/pages/event-detail.md`.
  - Depende de: T3, T4.
  - Secuencial.

## Preguntas abiertas
1. **Cambios en el mock de eventos** (decisión 4). El test de invariantes limita los tipos a 4 por evento, así que el concierto en el estadio solo gana "Tribuna Norte" (S/ 220), no también Oriente y Occidente como en el diseño. "La casa de los espejos" pasa a Platea/Mezanine y pierde "Palco". ¿Se aceptan, o se prefiere subir el límite del test (sería otro cambio)?
2. **Límite por compra:** se mantiene 10 en total (pedido actual) en lugar de "6 por zona" del diseño. ¿Correcto?
3. **"Mejor asiento disponible":** elige tantos asientos juntos como ya haya elegidos en la zona (o 1 si no hay ninguno) y los reemplaza. ¿Se prefiere un selector de cantidad ("¿Cuántos asientos?") antes de buscar?
4. **Asientos accesibles:** cualquiera puede elegirlos, pero "Mejor asiento disponible" los excluye. ¿Hace falta un aviso o una confirmación al elegirlos?
5. **Evento sin mapa en `/entradas`:** muestra el 404 del evento ("No encontramos este evento"). ¿Se prefiere redirigir a `/eventos/<slug>`?
6. **Fases 2 y 3:** las zonas numeradas se ven en `/entradas`, pero dicen "Elección de asientos próximamente" hasta la Fase 4, y el detalle no enlaza a `/entradas` hasta la Fase 4. ¿Es aceptable este estado intermedio, o se prefiere ocultar las zonas numeradas hasta entonces?
7. **Capacidad de las zonas de pie:** se guarda en el modelo, pero no se muestra ni limita la compra. ¿Debe verse ("Aforo: 12 000") o limitar la cantidad?
