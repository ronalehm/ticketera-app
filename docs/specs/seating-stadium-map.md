# Mapa de estadio curvo y selección de entradas en dos sub-pasos

- Módulo: seating
- Estado: aprobado

## Objetivo
Llevar la pantalla `/eventos/<slug>/entradas` (paso 1 "Entradas" de la compra) al nuevo diseño "Elige tus entradas":
- mapa de estadio curvo, con escenario semicircular y zonas en arco;
- tarjetas de zona debajo del mapa;
- dos sub-pasos internos dentro del paso "Entradas": 1/2 elegir zona, y 2/2 elegir la cantidad o las butacas;
- plano de butacas en arco con la forma del sector, el resto del estadio atenuado y un minimapa.

Para estrenarlo se añade el evento "Festival Vive Latino Lima" (Costa Verde, Lima) con 5 zonas. Solo UI/UX con datos mock (sin backend), español (Perú), PEN.

Es una **continuación de `docs/specs/seating-ticket-selection.md`** (en adelante, "spec base"), que no se edita:
- siguen vigentes sus contratos A (`PurchaseStepper`), B (`getVenueMapBySlug`, `hasVenueMap`, `parseSeatIds`, `resolveSeats`, `getVenueMapForEvent`, ids `<zona>-<FILA>-<n>`), C (paso a `/checkout` con `asientos`) y H (`ZonePricesCard` y `MobileBuyBar` en el detalle);
- siguen vigentes sus decisiones 1–14, salvo lo que esta spec amplía de forma explícita (decisiones 4, 5 y 9).

Diseño de referencia: capturas de "Elige tus entradas" (sub-paso 1: mapa y tarjetas; sub-paso 2: plano de "Tribuna Oriente") y del detalle del evento. De ahí salen la forma, el layout, el flujo y los textos. La identidad visual sigue siendo Mentec (`design-system/ticketera/MASTER.md`): tokens, Creato Display, marca "Mentec Tickets" y los tonos por precio de `zoneTone`. **No** se usan el índigo, el naranja, Poppins, los hex ni el logo "Ticketera" de las capturas.

## Alcance
- Incluye:
  - **Fase 1. Dominio y datos del estadio:**
    - evento "Festival Vive Latino Lima" en el mock, con 5 tipos;
    - límite de tipos por evento de 4 a 5 en el test de invariantes, y ajuste de los tests afectados;
    - utilidades puras de sectores anulares: `d` de `<path>`, límites, punto dentro, solape y puntos sobre un arco;
    - generador de butacas en arco;
    - campos opcionales del layout: luces del escenario, etiqueta en 2 líneas y transformación del plano;
    - navegación ↑/↓ y "mejor asiento" válidos con filas curvas;
    - layout mock del estadio;
    - tests e invariantes nuevos.
  - **Fase 2. Pantalla en dos sub-pasos para todos los eventos con mapa:**
    - tarjeta "Elige tus entradas" con el indicador "Paso n de 2 · …";
    - mapa sin tarjeta propia, con luces y etiquetas en 2 líneas;
    - tarjetas de zona en 2 columnas;
    - panel de cantidad para zonas de pie;
    - plano de butacas integrado como sub-paso 2, con migas "Todas las zonas", contador "n de m butacas" y leyenda con precio;
    - texto nuevo del resumen vacío;
    - se elimina `ZoneList`;
    - hook con `closeZone`.
  - **Fase 3. Plano curvo con minimapa:**
    - fondo del estadio atenuado y contorno del sector en el plano de las zonas en arco;
    - letras de fila en los dos bordes del sector;
    - minimapa con la zona resaltada y el recuadro de la vista actual;
    - utilidad pura de "vista visible".
  - **Fase 4. Precarga de la selección desde la URL** (enmienda; resuelve la pregunta abierta 5 de `checkout-mock-payment.md`):
    - al volver desde "Cambiar entradas" de `/checkout` (`/eventos/<slug>/entradas?<ticketTypeId>=<qty>…&asientos=<ids>`, que construye la Fase 7 de checkout), la pantalla abre con esas cantidades y butacas ya elegidas;
    - se ignora lo que no sea válido (butacas ocupadas o inexistentes, zonas agotadas, valores mal formados);
    - función pura de lectura, estado inicial en el hook, envoltorio cliente con `useSearchParams` y `Suspense` en la página.
- No incluye:
  - Cambios en `PurchaseStepper` (contrato A). La compra sigue teniendo 3 pasos.
  - Sub-pasos en la URL ni en el historial del navegador. "Atrás" del navegador sale de `/entradas`, como hoy.
  - Mapas curvos para los otros 3 eventos con mapa. Conservan sus formas rectangulares (decisión 3).
  - Rotar el plano para que el escenario quede arriba. El sector se dibuja con la orientación que tiene en el estadio, como en el diseño.
  - Cambiar `SeatShape`, los `aria-label` de los asientos, las etiquetas "Fila F · Asiento 12" del resumen, los chips, los avisos ni el contrato C.
  - El formato compacto "Fila L · 9 · Fila M · 8" en "Tu compra" (ver Preguntas abiertas).
  - Un quinto tono por precio (ver Preguntas abiertas).
  - Cambios en el detalle `/eventos/[slug]`, en `ZonePricesCard`/`MobileBuyBar`, en `/checkout` o en otros módulos, salvo `modules/events/data/events.mock.ts` y `modules/events/services/events.service.test.ts` (F1).
  - Reserva real de butacas, backend y persistencia (igual que la spec base).
  - (F4) Reflejar en la URL los cambios hechos en la pantalla, recordar la selección en el navegador o abrir directamente el sub-paso 2 de una zona: la precarga solo inicializa el estado y la pantalla abre en el sub-paso 1.
  - (F4) Cambios en `modules/checkout/**` o en el enlace "Cambiar entradas": son de `checkout-mock-payment.md` (Fase 7).

## Decisiones
1. **La compra sigue en 3 pasos** (aclaración del usuario).
   - El `PurchaseStepper` global queda en "Entradas" (`currentStep={1}`) durante los dos sub-pasos.
   - "Paso 1 de 2 · Elige una zona" y "Paso 2 de 2 · Elige tus butacas" (o "· Elige la cantidad") son un indicador **interno** del paso "Entradas". Va a la derecha de la cabecera de la tarjeta "Elige tus entradas".
   - No es un segundo stepper: es un texto (`<p aria-live="polite">`) que cambia con el sub-paso.
2. **Sub-pasos en la misma ruta, en estado de cliente.**
   - Sub-paso 1: no hay zona abierta (`activeZoneId === null`).
   - Sub-paso 2: hay zona abierta. Muestra el panel de cantidad si la zona es de pie, o el plano si es numerada.
   - Elegir una zona (en el mapa o en su tarjeta) abre directamente el sub-paso 2. "Todas las zonas" vuelve al sub-paso 1.
   - La selección (cantidades y butacas) se conserva al cambiar de sub-paso y de zona.
3. **Un solo layout para todos los mapas** (decisión pedida por el usuario). Los 4 eventos con mapa usan la tarjeta "Elige tus entradas", las tarjetas de zona y los sub-pasos.
   - La forma del mapa sale de los datos: los 3 eventos existentes conservan sus rectángulos, y el festival usa sectores anulares.
   - Las zonas numeradas sin `planTransform` (teatro y stand-up) conservan su plano en cuadrícula, sin fondo de estadio ni minimapa.
   - Motivos: un solo flujo y un solo componente contenedor (DRY), los mismos tests y la misma experiencia en todos los eventos. Tener dos layouts duplicaría `TicketSelection` y sus tests.
4. **Evento nuevo** `festival-vive-latino-lima` (dato de diseño, ver la tabla de datos). Amplía la decisión 4 de la spec base:
   - **Tipos por evento: de 2 a 5** (antes de 2 a 4). Cambia el test de invariantes de `events.service.test.ts`.
   - **Zonas:**
     - Campo VIP S/ 330, de pie, `available`.
     - Campo General S/ 215, de pie, `low-stock`.
     - Tribuna Occidente S/ 180, numerada, `available`.
     - Tribuna Oriente S/ 155, numerada, `available`.
     - Tribuna Norte S/ 120, **de pie**, `available`.
   - El evento es `low-stock`, porque la búsqueda del diseño lo muestra con "Últimas entradas". La invariante exige al menos un tipo `low-stock`.
   - "Campo General" es el tipo `low-stock` porque es la única banda del mapa con alto suficiente (≥ 96 unidades) para la píldora "Últimas entradas" (decisión 10 de la spec base).
   - **Tribuna Norte de pie:**
     - En los estadios peruanos, Norte y Sur suelen ser tribunas populares sin numerar (el mock `clasico-del-pacifico` ya tiene "Popular: Tribuna norte y sur").
     - Además, el arco de Norte es largo (116°) y estrecho (64 unidades). Un plano semejante no cumple las invariantes de la spec base: ≤ 10 butacas por fila, ancho ≤ 400 y butacas ≥ 24 px a 375 px.
     - Ver Preguntas abiertas.
5. **Formas por código:** los `path` del festival los genera `getAnnularSectorPath` a partir de sectores (centro, radios y ángulos) definidos en el mock. No se escriben `d` a mano.
   - Convención de ángulos: grados, 0° = +x y crecientes en sentido horario en pantalla (y hacia abajo), igual que SVG.
   - Todos los sectores del estadio son concéntricos (mismo centro que el escenario).
6. **Plano en arco semejante al sector** (`planTransform`).
   - Cada zona numerada en arco se dibuja en coordenadas de plano = coordenadas del estadio × `scale` + (`x`, `y`). Así el contorno del sector, el fondo del estadio atenuado y el minimapa coinciden con el mapa.
   - Las butacas usan el mismo paso (pitch) que la cuadrícula: 32 unidades, con área de toque de 32×32, así que `SeatShape` no cambia.
   - Se mantienen las invariantes de la spec base: ≤ 12 filas, ≤ 10 butacas por fila y `seatViewBox` de ≤ 400 de ancho. Por eso las tribunas laterales tienen filas **A–J**, no A–M como en la captura: con 13 filas radiales × 32 el plano mide más de 400 de ancho.
7. **Numeración en arco:** las filas van de la más cercana al escenario (radio interior) a la más lejana, y en cada fila las butacas se numeran de 1 a n **en el sentido de ángulo creciente** (horario en pantalla).
   - En Oriente, la butaca 1 queda arriba. En Occidente, abajo.
   - Es determinista y simple. El lector de pantalla anuncia "Fila F, asiento 3" igual que siempre.
8. **Teclado y "mejor asiento" con filas curvas** (ajuste del requisito 18–19 de la spec base, sin cambiar sus resultados en cuadrícula):
   - ↑/↓ van al asiento de la fila anterior o siguiente **más cercano en distancia euclídea** (antes, la `x` más cercana). En cuadrícula todas las butacas de una fila tienen la misma `y`, así que el resultado es idéntico. En arco funciona aunque las filas sean casi verticales (Oriente/Occidente).
   - "Mejor asiento disponible" mide el centrado **por posición en la fila** (índice del centro del bloque frente al índice del centro de la fila), no por `x`. En cuadrícula las butacas están equiespaciadas, así que el resultado es idéntico. En arco el centro de la fila es su ángulo medio.
   - ←/→ siguen siendo butaca anterior o siguiente por número, y "Arriba" significa "fila más cerca del escenario".
9. **Tonos:** se mantienen los 4 tonos de `getZoneTones`. En el festival quedan así:
   - Campo VIP → `tier-1`;
   - Campo General → `tier-2`;
   - Occidente → `tier-3`;
   - Oriente y Norte → `tier-4`.

   Oriente y Norte comparten color, pero sus sectores no se tocan (entre ellos hay 18 unidades de radio) y el texto (nombre y precio) los distingue. Ver Preguntas abiertas.
10. **Butacas disponibles con la forma actual** (`fill-background stroke-primary`), no "rellenas con el tono de la zona" como en la captura.
    - Con `tier-1`/`tier-2` (navy y azul), una butaca libre se confundiría con "Elegida" (`fill-primary` con check).
    - La leyenda muestra el precio: "Disponible · S/ 155.00".
11. **Contador "n de m butacas":**
    - n = butacas elegidas en la zona;
    - m = n + (`MAX_TICKETS_PER_ORDER` − entradas totales), es decir, cuántas puede tener esta zona dado el resto de la compra;
    - sin nada elegido: "0 de 10 butacas".
    - Se mantiene el límite de **10 en total** de la spec base (decisión 5). El "de 6" de la captura corresponde a un límite "6 por zona" que no aplica (ver Preguntas abiertas).
12. **Minimapa y zoom fuera del lienzo:** el diseño los pone superpuestos (minimapa arriba a la izquierda, zoom abajo a la derecha). Aquí van en una barra justo encima del lienzo: el minimapa a la izquierda y "+", "−" y "encajar" a la derecha.
    - Superpuestos tapan butacas. Por ejemplo, en Occidente la esquina superior izquierda es el extremo de la fila exterior. Tampoco se podrían tocar con el plano entero a la vista.
    - Se descarta el `MiniMap` de `react-zoom-pan-pinch`:
      - reproduce el contenido transformado (el plano del sector), no el estadio entero;
      - su marco se estiliza con colores en string, no con tokens.
13. **"Butaca" y "asiento":**
    - los textos nuevos del diseño usan "butaca": "Elige tus butacas", "n de m butacas", "Numerada · elige tu butaca", "General · sin butaca";
    - los textos y contratos existentes no cambian ("Fila F · Asiento 12", `aria-label` de asientos, chips y avisos), porque las etiquetas forman parte del contrato C y de los pedidos guardados.
14. **Orden de implementación:** esta spec va **después de la Fase 5 de la spec base**.
    - F5 añade `lib/hash.ts` (`hashString`, `mixHash`), `modules/seating/seats.ts`, la ocupación mezclada en `generateSeatRows` y el test de `labelPos` en el centro de los rectángulos.
    - Esta spec reutiliza `mixHash` para la ocupación del arco y adapta ese test.
    - No se fusiona ninguna tarea de F5: F5 es un ajuste cerrado y aprobado, y esta spec toca después los mismos archivos (`seatRows.ts`, `venueMaps.mock.ts`, `seating.service.test.ts`).
15. **Precarga desde la URL sin perder el prerenderizado (Fase 4).**
    - `/eventos/[slug]/entradas` se prerenderiza (`generateStaticParams`). Leer `searchParams` en la página la volvería dinámica. `useSearchParams` fuera de un `Suspense` rompe el build (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` § Prerendering). Por eso:
      - `TicketSelection` gana `initialSelection?` y no lee la URL;
      - el envoltorio cliente nuevo `PreselectedTicketSelection` lee `useSearchParams()`, lo convierte con `parseSeatingPreselection` y renderiza `TicketSelection`;
      - la página lo envuelve en `<Suspense fallback={<TicketSelection map={map} />}>`. El HTML prerenderizado conserva la pantalla (sin selección) y, al hidratar, se sustituye por la precargada. Sin parámetros, el resultado es idéntico al de la Fase 2.
    - Es el mismo patrón que usa `checkout-mock-payment.md` (decisión 36) para `TicketSelector`.
    - **Formato:** el del contrato C sin `evento`: `<ticketTypeId>=<qty>` por zona y `asientos=<id>,<id>`. `parseSeatingPreselection` es la inversa de `buildSeatingCheckoutHref` y vive en el mismo archivo (`utils/selectionSummary.ts`).
    - **Tolerancia:** lo inválido se ignora uno a uno, sin avisos ni errores. Ejemplos: una butaca ocupada (la ocupación es determinista, pero el enlace puede venir de otro mapa o estar editado a mano), inexistente, repetida o de otra zona; una zona agotada; una cantidad mal formada o repetida. El resto se precarga.
    - **Zonas numeradas:** su cantidad la dan las butacas válidas, no el parámetro `<ticketTypeId>`, que se ignora (como `getZoneQuantity`).
    - **Límite:** nunca más de `MAX_TICKETS_PER_ORDER` (10). Se recorren las zonas en el orden de `map.zones` y se recorta lo que exceda.
    - **Sub-paso inicial:** siempre el 1 (`activeZoneId = null`). Las tarjetas ya dicen "n entradas elegidas" / "n butacas elegidas" y "Tu compra" muestra las líneas y el total, así que se ve qué se trae y se puede abrir cualquier zona para cambiarlo.
16. **Corrección aritmética (2026-10-03, detectada en F1 T3; sin cambios de diseño).** Se mantiene la fórmula del requisito 4 (filas centradas en la banda, con `holgura/2`). Las butacas por fila de las tribunas laterales que daban el requisito 7 y el criterio de `generateArcSeatRows` (4, 4, 5, 6, **6**, 7, 8, 9, 9, 10; 68 en total) omitían `holgura/2`. Con la fórmula salen 4, 4, 5, 6, **7**, 7, 8, 9, 9, 10 (69 en total): solo cambia la fila E (ρ = 344.75 → 7 butacas). Afecta igual a Oriente y Occidente. El `seatViewBox` (`0 0 399 401`), los ids de ejemplo (`oriente-C-3`, `oriente-C-4`), las accesibles (`*-J-1`, `*-J-10`) y "0 de 8" / "2 de 8 butacas" no cambian.

## Requisitos

### Datos del evento (Fase 1)
1. **`EVENTS_MOCK` gana `evt-013`**, que va al final del array:

   | Campo | Valor | Origen |
   |---|---|---|
   | `slug` | `festival-vive-latino-lima` | derivado |
   | `title` | "Festival Vive Latino Lima" | diseño |
   | `category` | `festivales` | diseño |
   | `startsAt` | `2026-10-05T14:00:00-05:00` (lunes 5 de octubre, 14:00; futuro respecto a 2026-10-03) | diseño + año decidido |
   | `doorsOpenAt` | `2026-10-05T12:00:00-05:00` | diseño |
   | `venue` / `city` | "Costa Verde" / "Lima" | diseño |
   | `priceFrom` | 120 | diseño (= mínimo de los tipos) |
   | `status` | `low-stock` | decisión 4 |
   | `featured` | `true` (aparece en el hero y el carrusel de destacados de la landing) | **plausible** |
   | `description` | 1.er párrafo del diseño: "Un día completo de rock y música latina frente al mar, con más de 20 bandas en tres escenarios. Incluye zona de food trucks y áreas de descanso." + "\n\n" + 2.º párrafo: "El ingreso es por el Circuito de Playas de la Costa Verde, a la altura de Magdalena del Mar. Te recomendamos llegar temprano: no se permite el reingreso." | diseño + **plausible** (la invariante exige ≥ 2 párrafos) |
   | `address` | "Circuito de Playas Costa Verde, Magdalena del Mar, Lima" | **plausible** |
   | `minAge` | 0 ("Todo público") | **plausible** |
   | `organizer` | "Ola Sonora Producciones" | **plausible** (ficticio) |
   | `imageUrl` | `image("1492684223066-81342ee5ff30")` (concierto con confeti, host `images.unsplash.com`, ya permitido en `next.config.ts`) | **plausible**: no se pudo verificar por red al redactar; el developer comprueba que carga y, si no, usa otra foto de festival con confeti de Unsplash y lo anota en el resumen de la tarea |
   | `ticketTypes` (en este orden) | `campo-vip` "Campo VIP" S/ 330 `available` "Campo frente al escenario, sin butaca." · `campo-general` "Campo General" S/ 215 `low-stock` "Campo detrás de la zona VIP, sin butaca." · `occidente` "Tribuna Occidente" S/ 180 `available` "Butacas numeradas en la tribuna lateral oeste." · `oriente` "Tribuna Oriente" S/ 155 `available` "Butacas numeradas en la tribuna lateral este." · `norte` "Tribuna Norte" S/ 120 `available` "Tribuna de fondo, sin butaca." | diseño (nombres, precios y orden) + descripciones **plausibles** |

   - Ningún `ticketType.id` es `evento` ni `asientos` (decisión 7 de la spec base).
2. **Tests existentes afectados por el evento nuevo** (revisados en el código actual). Solo cambian estos:
   - `modules/events/services/events.service.test.ts`:
     - invariantes: `toBeLessThanOrEqual(4)` → `toBeLessThanOrEqual(5)`;
     - `getRelatedEvents` "con limit 1 devuelve el de la misma categoría aunque haya otros antes en fecha": hoy usa `festival-arena-y-mar-piura` y espera `festival-sol-de-verano`. Con el festival nuevo (2026-10-05, el más temprano de `festivales`) devolvería `festival-vive-latino-lima` y el test dejaría de probar "aunque haya otros antes en fecha". Pasa a usar `getRelatedEvents("festival-vive-latino-lima", 1)` y a esperar `festival-sol-de-verano` (2027-02-20), que mantiene la intención: hay eventos de otras categorías antes en fecha (noviembre de 2026).
   - `modules/seating/services/seating.service.test.ts` (F1, ver Tests):
     - `MAP_SLUGS` gana el slug nuevo;
     - "es true solo para los 3 eventos con mapa" pasa a 4;
     - el test de `labelPos` en el centro del rectángulo (añadido en la F5 de la spec base) se limita a los 3 mapas rectangulares.
   - **No cambian**, porque usan fixtures propios o valores dinámicos:
     - el resto de `events.service.test.ts`: `getEvents` y destacados se comparan con `EVENTS_MOCK.length` y `filter(featured)`; en los relacionados de `risas-sin-filtro` solo se comprueban el orden por fecha y la categoría;
     - `EventFiltersForm.test.tsx` (facetas y meses fijos en el test);
     - `eventFilters.test.ts` (`makeEvent`);
     - `formatEvent`, `ticketOrder`, `saved.store`, `SaveEventButton`, `ShareEventButton` y `TicketSelector`;
     - `organizer.service.test.ts`: solo publica los slugs de `ORGANIZER_SALES_MOCK`, así que los KPIs no cambian;
     - `modules/tickets/**`: ningún pedido demo es del evento nuevo;
     - `modules/checkout/**`: los slugs de sus fixtures no cambian;
     - `zoneTone.test.ts`: casos sintéticos más `noche` y `risas`.
   - **Efectos visibles sin test:**
     - `/eventos` muestra 13 eventos, "Festivales (3)", "Lima (7)" y un mes nuevo, "Octubre 2026", en el filtro de fecha;
     - la landing muestra 5 destacados.

### Geometría (Fase 1)
3. **`utils/annularSector.ts`** (puro):
   - `type AnnularSector = { cx: number; cy: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number }` (decisión 5).
   - Si no se cumple `0 ≤ innerRadius < outerRadius` y `0 < endAngle − startAngle < 360`, cualquier función lanza `Error`.
   - `polarToCartesian(cx, cy, radius, angle): Point`.
   - `getAnnularSectorPath(sector): string`:
     - con `innerRadius > 0`: `M <exterior inicio> A ro ro 0 <large> 1 <exterior fin> L <interior fin> A ri ri 0 <large> 0 <interior inicio> Z`;
     - con `innerRadius === 0` (porción de disco): `M cx cy L <exterior inicio> A … <exterior fin> Z`;
     - `large` = 1 si el barrido supera 180°;
     - números redondeados a 2 decimales, sin ceros sobrantes (`toFixed(2)` + `Number`).
   - `getAnnularSectorBounds(sector): { minX; minY; maxX; maxY }`: extremos entre las esquinas (o el centro si `innerRadius` es 0) y los puntos del radio exterior en 0°, 90°, 180° y 270° (± 360k) que caen dentro del barrido.
   - `isPointInAnnularSector(point, sector): boolean`: radio en [interior, exterior] y ángulo, normalizado a [inicio, inicio + 360), ≤ fin.
   - `doAnnularSectorsOverlap(a, b): boolean`: solo para sectores concéntricos (con distinto centro lanza `Error`). Hay solape si se cruzan a la vez los intervalos abiertos de radio y de ángulo (módulo 360). Tocarse en un borde no cuenta.
   - `getArcPoints(cx, cy, radius, startAngle, endAngle, count): Point[]`: `count` ≥ 2 puntos equiespaciados, con los dos extremos incluidos.
4. **Generador `generateArcSeatRows(spec)`** (`utils/arcSeatRows.ts`):
   - Entrada: `{ zoneId; sector: AnnularSector; scale: number; rowLabels: string[]; occupiedRatio: number; accessibleSeats?: string[] }`. `sector` va en coordenadas del estadio.
   - Salida: `{ seatViewBox: string; rows: SeatRow[]; planTransform: { scale; x; y } }`.
   - **Constantes:**
     - `SEAT_PITCH` = 32 (reutiliza la de `seatRows.ts`);
     - `ARC_PLAN_MARGIN` = 24;
     - `ARC_EDGE_PADDING` = 8.
   - **Transformación:**
     - `b` = `getAnnularSectorBounds` del sector escalado (centro y radios × `scale`);
     - `planTransform = { scale, x: ARC_PLAN_MARGIN − b.minX, y: ARC_PLAN_MARGIN − b.minY }`;
     - `seatViewBox = "0 0 ⌈b.maxX − b.minX + 2·24⌉ ⌈b.maxY − b.minY + 2·24⌉"`;
     - centro del plano: (`cx·scale + x`, `cy·scale + y`).
   - **Filas:**
     - `banda = scale·(outerRadius − innerRadius)`; si `rowLabels.length · 32 > banda`, lanza `Error`;
     - holgura = `banda − filas·32`;
     - fila i (0 = la más cercana al escenario): `ρᵢ = scale·innerRadius + holgura/2 + 16 + i·32`.
   - **Butacas por fila:** `nᵢ = ⌊(ρᵢ·Δ − 2·8) / 32⌋`, con Δ el barrido en radianes. Si alguna `nᵢ < 2`, lanza `Error` (las letras de fila necesitan 2 butacas para orientarse).
   - **Posición:**
     - paso angular `32/ρᵢ`;
     - butaca j (0..nᵢ−1) en el ángulo `medio + (j − (nᵢ−1)/2)·paso` (centradas en la fila);
     - número `j + 1` (decisión 7);
     - `x`/`y` = centro del plano + `ρᵢ`·(cos, sin), redondeados a 2 decimales;
     - `id = formatSeatId(zoneId, fila, número)`.
   - **Estado:** la misma regla que `generateSeatRows` tras la F5 de la spec base: `occupied` si `mixHash(hashString(id)) / 2³² < occupiedRatio`; si no, `accessible` si figura en `accessibleSeats`; si no, `available`.
     - La regla se extrae a una función exportada de `seatRows.ts`, `getGeneratedSeatStatus(id, occupiedRatio, accessible: ReadonlySet<string>)`, que usan los dos generadores. `generateSeatRows` no cambia su resultado.
     - Un id de `accessibleSeats` inexistente lanza `Error`.
   - `getRowEdgeLabelPoints(row: SeatRow): { start: Point; end: Point }`: puntos para la letra de fila en los dos bordes, a 0.8 pitch más allá de la primera y de la última butaca, en la dirección de la cuerda `(1.ª − 2.ª)` y `(última − penúltima)`. Requiere ≥ 2 butacas.
5. **Schema** (`seating.schema.ts`), solo campos **opcionales**, así que los layouts actuales siguen siendo válidos y no cambia ningún tipo existente:
   - `stage.lights?: Point[]`: luces decorativas del escenario.
   - Zona (base común): `wrapLabel?: boolean`. Si es `true`, el nombre se parte en 2 líneas en el primer espacio ("Tribuna" / "Occidente").
   - Zona numerada: `planTransform?: { scale: number (> 0); x: number; y: number }` (decisión 6).
   - Los tipos se derivan con `z.infer`, sin escribirlos a mano.
6. **Navegación y mejor asiento** (decisión 8):
   - `getAdjacentSeatId`: para ↑/↓, `closestTo(seats, point)` por distancia euclídea; en empate, el primero (número menor). El resto no cambia.
   - `findBestAvailableSeats`: distancia = `|(inicio + (count − 1)/2) − (n − 1)/2|` en índices de la fila. Mismo orden de preferencia y mismo desempate (número menor).

### Layout del estadio (Fase 1)
7. **`VENUE_LAYOUTS_MOCK` gana el layout de `festival-vive-latino-lima`**. Las zonas van en el orden de los tipos, que es el orden del aside de precios, de la URL de checkout y del Tab en el mapa.
   - `viewBox` `"0 0 600 412"` y centro común `STADIUM_CENTER = { cx: 300, cy: 54 }`.
   - Los sectores se exportan desde el mock como `VIVE_LATINO_SECTORS` para los tests de invariantes.
   - Valores de **referencia**, comprobados aproximadamente con un cálculo de cajas de texto. El developer puede ajustar radios, ángulos y `labelPos` (± 12 unidades) si, al verlo a 375 px, un texto toca un borde, siempre que se cumpla el requisito 8:

   | Zona | Tipo | Sector (radios · ángulos) | `labelPos` | Otros |
   |---|---|---|---|---|
   | Escenario "ESCENARIO" | — | 0–90 · −10°…190° | (300, 70) | `lights`: `getArcPoints(300, 54, 76, 40, 140, 7)` |
   | `campo-vip` | general (2000) | 102–172 · 34°…146° | (300, 182) | — |
   | `campo-general` | general (8000) | 180–278 · 34°…146° (banda de 98 ≥ 96: cabe la píldora) | (300, 287) | — |
   | `occidente` | numbered | 102–268 · 150°…190° | (116, 84) | `wrapLabel: true`; `generateArcSeatRows({ scale: 1.95, rowLabels: A–J, occupiedRatio: 0.35, accessibleSeats: ["occidente-J-1", "occidente-J-10"] })` |
   | `oriente` | numbered | 102–268 · −10°…30° | (484, 84) | `wrapLabel: true`; `generateArcSeatRows({ scale: 1.95, rowLabels: A–J, occupiedRatio: 0.45, accessibleSeats: ["oriente-J-1", "oriente-J-10"] })` |
   | `norte` | general (6000) | 286–350 · 33°…147° | (300, 372) | — |

   - Con escala 1.95, filas A–J y barrido de 40°, cada tribuna lateral queda con 4, 4, 5, 6, 7, 7, 8, 9, 9 y 10 butacas por fila (69 en total) y un `seatViewBox` de ~399 × 401 (con los valores de referencia, `0 0 399 401`).
     - Cálculo (requisito 4): banda = 1.95 · 166 = 323.7, holgura = 3.7, `ρᵢ` = 216.75 + i·32 y `nᵢ` = ⌊(ρᵢ·0.6981 − 16)/32⌋. Por ejemplo, fila E: ρ = 344.75 → ⌊7.02⌋ = 7. Vale igual para Oriente y Occidente (mismos radios, escala y barrido).
8. **Invariantes del mapa curvo**, verificadas en `seating.service.test.ts` además de las del requisito 7 de la spec base:
   - el escenario y cada zona están dentro del `viewBox` con ≥ 4 unidades de margen (el halo de la zona activa mide 8);
   - ningún par de sectores (escenario incluido) se solapa;
   - el `labelPos` de cada zona y el del escenario están dentro de su sector;
   - cada `path` es exactamente `getAnnularSectorPath(sector)`;
   - en cada zona numerada en arco:
     - todas las butacas están dentro del sector del plano, con su radio de 12 dentro de la banda;
     - las letras de fila (`getRowEdgeLabelPoints`) quedan dentro del `seatViewBox`, con ≥ 12 unidades de margen;
     - hay ≥ 1 butaca `available` y ≥ 1 `accessible`;
   - ninguna zona numerada sin `planTransform` cambia.

### Pantalla en dos sub-pasos (Fase 2)
9. **`TicketSelection`** (`"use client"`). Mantiene la grilla, el resumen sticky y la barra móvil de la spec base (requisito 11). La columna izquierda pasa a ser **una sola** `Card rounded-2xl` "Elige tus entradas":
   - **Cabecera:** `flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1`, con:
     - h2 "Elige tus entradas" (`text-xl font-bold tracking-tight`);
     - a la derecha, `<p aria-live="polite" className="text-sm text-muted-foreground">` con "Paso 1 de 2 · Elige una zona", "Paso 2 de 2 · Elige tus butacas" (zona numerada) o "Paso 2 de 2 · Elige la cantidad" (zona de pie).
   - **Sub-paso 1:** `VenueMapView` y debajo `ZoneCards`.
   - **Sub-paso 2:** `ZoneQuantityPanel` (zona de pie) o `SeatPlan` (zona numerada). El mapa y las tarjetas no se renderizan.
   - **Foco:**
     - al abrir una zona (desde el mapa o desde una tarjeta), el foco pasa al h3 de la zona del sub-paso 2 (`tabIndex={-1}`, `scroll-mt-24`), con `flushSync` como hoy. Antes, activar una zona en el mapa no movía el foco; ahora el mapa desaparece y el foco se perdería;
     - al volver con "Todas las zonas", el foco pasa a la tarjeta de esa zona (`[data-zone-id]`).
   - Se elimina `ZoneList.tsx`. Su stepper −/+ pasa, con el mismo marcado y las mismas clases, a `ZoneQuantityPanel`.
10. **`VenueMapView`:**
    - Ya no lleva `Card` ni cabecera propias: renderiza el lienzo `rounded-xl bg-muted p-3` con el SVG.
    - Se mantiene todo lo demás del requisito 12 de la spec base (aria, foco, tonos, etiquetas de 26 unidades), con estos cambios:
      - las zonas son `role="button"` **sin** `aria-pressed`, porque en el sub-paso 1 no hay zona activa;
      - activarlas llama a `onOpenZone(zoneId)`;
      - las zonas **agotadas** llevan `aria-disabled="true"`, siguen siendo enfocables (para oír "agotado") y no hacen nada. Cambia el requisito 12 de la spec base: allí "solo resaltaban su fila", y la lista ya no existe;
      - si `stage.lights` existe, se pinta un `<circle r={5} className="fill-highlight">` por luz, dentro del `<g aria-hidden>` del escenario;
      - si la zona tiene `wrapLabel`, el nombre ocupa 2 líneas y el bloque (2 + precio [+ píldora]) se centra en `labelPos` con la misma regla de alto.
    - El halo de "zona activa" desaparece: no hay zona activa visible en el sub-paso 1.
11. **`ZoneCards`** (nuevo, presentacional):
    - **Lista:** `<ul aria-label="Zonas" className="grid gap-3 sm:grid-cols-2">`, en el orden de `zones`. Una columna por debajo de `sm`.
    - **Cada tarjeta** es un `<li>` con un `<button type="button" data-zone-id>` a todo el ancho:
      - estilo `flex min-h-18 w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors duration-200 hover:border-primary/40 hover:bg-accent/40`, más el foco visible `focus-visible:ring-3 focus-visible:ring-ring/50`;
      - barra de color a la izquierda: `w-1.5 self-stretch rounded-full` con la clase `swatch` del tono (`aria-hidden`);
      - en el centro:
        - nombre (`text-base font-bold`) y, si es `low-stock`, `Badge` "Últimas entradas" (`bg-warning text-warning-foreground`);
        - debajo, el tipo (`text-sm text-muted-foreground`): icono `Users` + "General · sin butaca" (de pie) o `Armchair` + "Numerada · elige tu butaca", con iconos `size-4` `aria-hidden`;
        - si hay entradas o butacas elegidas en la zona: "2 entradas elegidas" / "2 butacas elegidas" (`text-sm font-medium text-primary-strong`);
      - a la derecha:
        - "c/u" (`text-xs text-muted-foreground`) encima del precio (`text-base font-bold tabular-nums`);
        - `ChevronRight` (`size-5`, `aria-hidden`).
    - **Agotada:** el precio se sustituye por "Agotado" (`font-bold text-muted-foreground`), sin chevron. Lleva `aria-disabled="true"` y su clic no hace nada (sigue enfocable).
    - **`aria-label` del botón:** "<nombre>, <precio> c/u, general sin butaca" o "…, numerada, elige tu butaca". Además:
      - si es `low-stock`, ", últimas entradas";
      - si está agotada, "<nombre>, agotado, …";
      - si hay elegidas, ", 2 entradas elegidas" o ", 2 butacas elegidas".
12. **Migas `ZoneStepBreadcrumb`** (nuevo, presentacional; reutiliza `components/ui/breadcrumb`):
    - `<Breadcrumb aria-label="Ruta de selección">` con:
      - `BreadcrumbLink render={<button type="button" />}`: icono `ChevronLeft` (`aria-hidden`) + "Todas las zonas", en `inline-flex min-h-11 items-center gap-1 font-semibold text-primary-strong hover:text-foreground`;
      - `BreadcrumbSeparator`;
      - `BreadcrumbPage` con el nombre de la zona.
    - Prop `onBack`.
13. **`ZoneQuantityPanel`** (nuevo, zona de pie abierta):
    - Migas.
    - Línea con el h3 de la zona (`text-lg font-bold`, `tabIndex={-1}`, `outline-none scroll-mt-24`) y " · S/ X c/u" (`text-base font-medium text-muted-foreground tabular-nums`).
    - Debajo, a la izquierda "General · sin butaca" y, si es `low-stock`, el `Badge` "Últimas entradas". A la derecha, el stepper en pastilla de la spec base (requisito 13: mismas clases, `aria-label`, `focusableWhenDisabled` y `aria-live`).
    - Pie `<p role="status">` "Máximo 10 entradas por compra." / "Llegaste al máximo de 10 entradas por compra.".
14. **`SeatPlan` como sub-paso 2** (zona numerada abierta). Deja de ser una `Card` propia y vive dentro de la tarjeta "Elige tus entradas":
    - **Cabecera:**
      - migas;
      - línea `flex flex-wrap items-baseline justify-between`: a la izquierda el h3 de la zona (igual que el requisito 13) + " · S/ X c/u"; a la derecha `<p aria-live="polite" className="text-sm font-medium tabular-nums">` "n de m butacas" (decisión 11);
      - ayuda "Toca una butaca para elegirla. Acerca el plano con los botones o pellizcando." (`text-sm text-muted-foreground`).
      - Sustituye al h2 "Elige tus asientos". El foco al entrar va al h3.
    - **Barra sobre el lienzo** (`flex items-end justify-between gap-2`): a la izquierda, `SeatPlanMinimap` (F3, solo con `planTransform`); a la derecha, "Acercar", "Alejar" y "Ver todo el plano" (`Button outline size-11`, mismos iconos y `aria-label`).
    - **Lienzo:** el mismo de la spec base (zoom, gestos, roving tabindex, clic tras arrastre, `aspect-ratio` del `seatViewBox`). Debe ocupar el ancho del contenido de la tarjeta sin padding propio, para mantener butacas ≥ 24 px a 375 px.
    - **Bajo el lienzo:**
      - `SeatLegend` con "Disponible · S/ X" (prop nueva `price`);
      - "Mejor asiento disponible" (`Button secondary h-11`, `w-full sm:w-auto`);
      - el `<p role="status">` del aviso;
      - `SelectedSeatChips`.
15. **Hook `useSeatSelection`:**
    - `selectZone(zoneId)` no hace nada si la zona no existe o está `sold-out`. Antes activaba cualquier zona.
    - Nueva acción `closeZone()`: `activeZoneId = null`.
    - El resto no cambia (incluido que `changeQuantity` activa la zona).
16. **`PurchaseSummary` vacío:** "Todavía no elegiste entradas. Empieza eligiendo una zona." (texto del diseño). Lo demás no cambia, incluidos "Total (0 entradas)" y "S/ 0.00" con el formato de `formatEventPrice`.

### Plano curvo (Fase 3)
17. **Fondo del estadio en el plano** (solo zonas con `planTransform`):
    - Debajo de las butacas, `<g aria-hidden transform="translate(x y) scale(s)" className="pointer-events-none">` con:
      - escenario `fill-brand-navy` y sus luces `fill-highlight`;
      - las demás zonas `fill-secondary`;
      - la zona abierta `fill-accent stroke-primary/40` (trazo de 2 px con `vector-effect="non-scaling-stroke"`).
    - Sin textos del mapa. No se pinta la barra "ESCENARIO" de la cuadrícula.
    - Letras de fila (`fill-muted-foreground font-bold`, 24 unidades, `aria-hidden`, `text-anchor="middle"`, `dominant-baseline="central"`) en los dos puntos de `getRowEdgeLabelPoints`.
    - Las zonas sin `planTransform` siguen como en la spec base: barra de escenario arriba y letra a la izquierda.
18. **`SeatPlanMinimap`** (nuevo, `"use client"` por estar dentro de `TransformWrapper`):
    - SVG `aria-hidden` con `viewBox` del mapa, `w-24 md:w-28 h-auto rounded-lg bg-muted ring-1 ring-border p-1`.
    - Contenido:
      - escenario `fill-brand-navy`;
      - zonas `fill-secondary`;
      - zona abierta `fill-primary`;
      - recuadro de la vista actual: `fill-none stroke-foreground`, 2 px no escalables.
    - Lee la transformación con `useTransformEffect` (`state.scale`, `positionX`, `positionY`) y el tamaño de `instance.wrapperComponent`, y calcula el recuadro con `getVisiblePlanRect` y `toVenueRect`. Antes del primer efecto, el recuadro es el plano entero.
19. **`utils/planViewport.ts`** (puro):
    - `getVisiblePlanRect({ planWidth, planHeight, viewportWidth, viewportHeight, scale, positionX, positionY }): Rect`:
      - unidad `u = min(viewportWidth/planWidth, viewportHeight/planHeight)` y desplazamiento de centrado `off` = ((vw − pw·u)/2, (vh − ph·u)/2), como el `preserveAspectRatio` por defecto;
      - `x = (−positionX/scale − offX)/u`, `y = (−positionY/scale − offY)/u`, `width = vw/(scale·u)`, `height = vh/(scale·u)`;
      - resultado recortado a [0, pw] × [0, ph].
    - `toVenueRect(rect, planTransform): Rect` = ((x − tx)/s, (y − ty)/s, w/s, h/s).

### Accesibilidad y responsive (todas las fases)
20. Se mantiene el requisito 29 de la spec base, con estos encabezados:
    - un h1 (título del evento);
    - h2 "Elige tus entradas" y "Tu compra";
    - h3 de zona en el sub-paso 2, y h3 "Tus asientos" dentro del plano.
    - Además:
      - el cambio de sub-paso se anuncia por el `aria-live` del indicador;
      - el foco nunca se pierde al cambiar de sub-paso (requisito 9);
      - las tarjetas y las migas tienen targets ≥ 44 px;
      - sin scroll horizontal a 375 / 768 / 1024 / 1440;
      - solo tokens y sin emojis.

### Precarga desde la URL (Fase 4)
21. **`parseSeatingPreselection(map, params)`** en `utils/selectionSummary.ts` (pura; decisión 15):
    - Firma: `(map: VenueMap, params: Pick<URLSearchParams, "getAll">) => SeatSelection`. `ReadonlyURLSearchParams` encaja.
    - `remaining = MAX_TICKETS_PER_ORDER`. Se recorren las zonas de `map.zones` en orden y se omiten las `sold-out`:
      - **de pie:** se toma `params.getAll(zone.ticketTypeId)` solo si hay exactamente un valor `^\d+$` entre 1 y `MAX_TICKETS_PER_ORDER`. Entonces `quantities[zone.id] = min(valor, remaining)`;
      - **numerada:** se toman los ids de `asientos` (solo si el parámetro aparece una vez; se separa por `,`) que cumplen `parseSeatId(id)?.zoneId === zone.id` y `resolveSeats(map, [id]) !== null`, sin repetidos, en el orden de la URL y hasta `remaining`. El parámetro `<ticketTypeId>` de la zona se ignora.
      - En cada paso se descuenta de `remaining` lo tomado.
    - Devuelve `{ quantities, seatIds }`: solo cantidades > 0, y `seatIds` en orden de zonas y, dentro de cada una, en el de la URL. Sin nada válido, `{ quantities: {}, seatIds: [] }`.
    - Ida y vuelta: para toda selección válida `s`, `parseSeatingPreselection(map, params de buildSeatingCheckoutHref(slug, map, s))` devuelve las mismas cantidades y los mismos asientos.
22. **`useSeatSelection(map, initialSelection?: SeatSelection)`:** el estado inicial es `{ selection: initialSelection ?? { quantities: {}, seatIds: [] }, notice: null }` (inicializador de `useState`). `activeZoneId` empieza en `null`. La selección inicial debe venir de `parseSeatingPreselection` (ya validada): el hook no la revalida. El resto de la firma y de las acciones no cambia.
23. **`TicketSelection`** gana `initialSelection?: SeatSelection` y la pasa al hook. Sin la prop, idéntico a la Fase 2.
24. **`components/PreselectedTicketSelection.tsx`** (nuevo, `"use client"`):
    - Props `{ map: VenueMap }`.
    - `const searchParams = useSearchParams()` (de `next/navigation`) y `<TicketSelection map={map} initialSelection={parseSeatingPreselection(map, searchParams)} />`.
    - Sin más lógica. Se exporta en `index.ts`.
25. **`app/eventos/[slug]/entradas/page.tsx`:** `<Suspense fallback={<TicketSelection map={map} />}><PreselectedTicketSelection map={map} /></Suspense>` en lugar de `<TicketSelection map={map} />`. `generateStaticParams`, `generateMetadata`, el stepper y la franja del evento no cambian.
26. **Accesibilidad (F4):** la precarga no mueve el foco ni anuncia nada (el indicador "Paso 1 de 2 · Elige una zona" es el de siempre). Las cantidades ya están en las tarjetas, en "Tu compra" y en la barra móvil desde el primer render de la pantalla.

## Criterios de aceptación

### Fase 1. Dominio y datos del estadio
- [ ] Dado `getEventBySlug("festival-vive-latino-lima")`, entonces:
  - devuelve el evento del requisito 1: "Costa Verde", "Lima", `festivales`, `startsAt` `2026-10-05T14:00:00-05:00`, `doorsOpenAt` 12:00, `priceFrom` 120 y `low-stock`;
  - devuelve 5 tipos en el orden Campo VIP (330), Campo General (215, `low-stock`), Tribuna Occidente (180), Tribuna Oriente (155) y Tribuna Norte (120).
- [ ] Dado `npx vitest run modules/events`, entonces pasa con solo los dos cambios del requisito 2 en `events.service.test.ts` (límite 5 y `getRelatedEvents("festival-vive-latino-lima", 1)` → `festival-sol-de-verano`).
- [ ] Dado `npx vitest run modules/organizer modules/tickets modules/checkout`, entonces pasan sin cambios.
- [ ] Dado `getAnnularSectorPath` con un sector de 90° (radios 10–20, 0°…90°, centro (0, 0)), entonces da exactamente `M20 0 A20 20 0 0 1 0 20 L0 10 A10 10 0 0 0 10 0 Z`. Con radio interior 0 da la porción `M0 0 L20 0 A20 20 0 0 1 0 20 Z`. Con un barrido > 180° el indicador `large` es 1.
- [ ] Dados `getAnnularSectorBounds`, `isPointInAnnularSector`, `doAnnularSectorsOverlap` y `getArcPoints`, entonces cumplen el requisito 3 (casos en Tests), incluido el cruce de 0°/360° (p. ej. −10°…30°) y que lanzan error con sectores inválidos o no concéntricos.
- [ ] Dado `generateArcSeatRows` con el sector de `oriente` de referencia, entonces:
  - devuelve 10 filas A–J con 4, 4, 5, 6, 7, 7, 8, 9, 9 y 10 butacas (69 en total);
  - los números van de 1 a n por ángulo creciente;
  - las filas exteriores tienen ≥ butacas que las interiores;
  - las ids siguen `formatSeatId`;
  - el `seatViewBox` mide ≤ 400 de ancho;
  - el resultado es determinista.
- [ ] Dado `generateArcSeatRows` con más filas de las que caben en la banda, una fila con < 2 butacas o una accesible inexistente, entonces lanza `Error`.
- [ ] Dado `generateSeatRows` tras extraer `getGeneratedSeatStatus`, entonces sus tests (los de F1 y los de la F5 de la spec base) pasan sin cambios.
- [ ] Dado `getAdjacentSeatId` y `findBestAvailableSeats`, entonces:
  - sus tests actuales pasan sin cambios;
  - en una zona en arco, ↓ desde la butaca central de la fila A va a la butaca central de la fila B (la más cercana en distancia);
  - el mejor asiento suelto de una fila libre de 5 es el número 3.
- [ ] Dado el schema, entonces un layout con `lights`, `wrapLabel` y `planTransform` válidos pasa, `planTransform.scale ≤ 0` falla y los layouts actuales siguen pasando.
- [ ] Dado `getVenueMapBySlug("festival-vive-latino-lima")`, entonces:
  - devuelve 5 zonas en el orden de los tipos, con `name`, `price` y `status` del evento;
  - `occidente` y `oriente` son `numbered` con `planTransform`; `campo-vip`, `campo-general` y `norte` son `general`;
  - `hasVenueMap` es `true` para los 4 eventos con mapa.
- [ ] Dados los 4 mapas, entonces cumplen las invariantes de la spec base. El festival cumple además las del requisito 8.
- [ ] Dado `getZoneTones` para el festival, entonces da `campo-vip` → `tier-1`, `campo-general` → `tier-2`, `occidente` → `tier-3` y `oriente`/`norte` → `tier-4`.
- [ ] Dado `/eventos/festival-vive-latino-lima` (detalle), sin cambios en ningún componente, entonces:
  - se ven el título "Festival Vive Latino Lima", la fecha y la hora con el formato actual del detalle, "Costa Verde, Lima", "Acerca del evento" con los 2 párrafos e "Información importante" (apertura 12:00, inicio 14:00, "Todo público");
  - el aside `ZonePricesCard` muestra "Entradas desde S/ 120.00" y las 5 zonas en el orden del requisito 1, con su tono y precio, y "Últimas entradas" en Campo General;
  - "Elegir entradas" lleva a `/eventos/festival-vive-latino-lima/entradas`;
  - a 375 px, la barra inferior dice "Desde S/ 120.00 · Comprar entradas";
  - Guardar y Compartir funcionan como en los demás eventos.
  
  `git diff` no toca `modules/events/components/**` ni `modules/seating/components/**`.
- [ ] Dado `/eventos/festival-vive-latino-lima/entradas` al terminar F1 (todavía con la UI de la spec base), entonces:
  - el mapa muestra el escenario semicircular y las 5 zonas en arco, cada una con su nombre y su precio. Las etiquetas de 2 líneas y las luces llegan en F2;
  - se pueden comprar entradas de pie y butacas de Oriente/Occidente;
  - "Continuar" lleva a `/checkout?evento=festival-vive-latino-lima&…`, que muestra el resumen correcto.
- [ ] Dado `npx vitest run` y `npm run lint`, entonces pasan. `npm run build` genera 4 rutas `/eventos/<slug>/entradas`.

### Fase 2. Pantalla en dos sub-pasos
- [ ] Dado `/eventos/festival-vive-latino-lima/entradas` a 1440 px, cuando carga, entonces:
  - el stepper global marca "Entradas" (`aria-current="step"`);
  - la tarjeta "Elige tus entradas" muestra a la derecha "Paso 1 de 2 · Elige una zona", el mapa curvo con "ESCENARIO", 7 luces y las 5 zonas, "Tribuna" / "Occidente" y "Tribuna" / "Oriente" en 2 líneas, y la píldora "Últimas entradas" en Campo General;
  - debajo, 5 tarjetas en 2 columnas, cada una con barra de color, nombre, "General · sin butaca" o "Numerada · elige tu butaca", "c/u", precio y chevron;
  - "Tu compra" es sticky, con "Todavía no elegiste entradas. Empieza eligiendo una zona.", "Total (0 entradas)", "S/ 0.00" y "Continuar" deshabilitado.
- [ ] Dado el mapa o la tarjeta "Campo VIP", cuando se activa (clic, Enter o Espacio), entonces:
  - el indicador pasa a "Paso 2 de 2 · Elige la cantidad" y el stepper global sigue en "Entradas";
  - se ven las migas "Todas las zonas › Campo VIP", "Campo VIP · S/ 330.00 c/u" y el stepper −/+;
  - el foco está en el h3 "Campo VIP";
  - el mapa y las tarjetas ya no están en el DOM.
- [ ] Dado "Agregar una entrada de Campo VIP" 2 veces, entonces:
  - "Tu compra" muestra "2 × Campo VIP … S/ 660.00" y "Total (2 entradas)";
  - "Continuar" lleva a `/checkout?evento=festival-vive-latino-lima&campo-vip=2`.
- [ ] Dado "Todas las zonas", cuando se pulsa, entonces:
  - vuelve "Paso 1 de 2 · Elige una zona";
  - el foco está en la tarjeta "Campo VIP", cuyo nombre accesible termina en ", 2 entradas elegidas";
  - la selección se conserva.
- [ ] Dado "Tribuna Oriente", cuando se abre, entonces:
  - el indicador dice "Paso 2 de 2 · Elige tus butacas";
  - se ven las migas, "Tribuna Oriente · S/ 155.00 c/u", "0 de 8 butacas" (con las 2 de Campo VIP ya elegidas), los botones de zoom sobre el lienzo, el plano, la leyenda "Disponible · S/ 155.00", "Mejor asiento disponible" y "Tus asientos";
  - el foco está en el h3.
- [ ] Dadas 2 butacas elegidas en Oriente, entonces:
  - el contador dice "2 de 8 butacas";
  - "Tu compra" muestra "2 × Tribuna Oriente … S/ 310.00" con sus etiquetas cortas y el total "S/ 970.00";
  - "Continuar" lleva a `…&campo-vip=2&oriente=2&asientos=oriente-…%2Coriente-…`, y `/checkout` lo acepta.
- [ ] Dada una zona agotada (`/eventos/risas-sin-filtro/entradas`, "Mesa"), entonces:
  - en el mapa y en su tarjeta se anuncia "agotado" con `aria-disabled="true"`;
  - se puede enfocar, pero ni el clic ni Enter abren el sub-paso 2;
  - la tarjeta dice "Agotado" sin chevron.
- [ ] Dados `/eventos/noche-de-sintetizadores-lima/entradas`, `la-casa-de-los-espejos` y `risas-sin-filtro`, entonces:
  - usan el mismo layout de tarjeta, tarjetas de zona y sub-pasos, con sus mapas rectangulares;
  - sus zonas numeradas abren el plano en cuadrícula de siempre (barra "ESCENARIO" arriba, letras a la izquierda), sin minimapa;
  - los enlaces a checkout son los de la spec base (p. ej. `general=2&vip=1` → S/ 910.00).
- [ ] Dado el teclado, entonces:
  - Tab recorre el mapa (zonas en el orden de los tipos), luego las tarjetas y luego "Tu compra";
  - en el sub-paso 2, Tab llega a "Todas las zonas", al stepper o al plano (una sola parada), y a los botones;
  - todo tiene foco visible y nada se activa con Espacio desplazando la página.
- [ ] Dado un lector de pantalla, entonces:
  - las zonas del mapa se anuncian como botón con nombre, precio y estado (p. ej. "Campo General, S/ 215.00, últimas entradas"; "Tribuna Oriente, S/ 155.00, asientos numerados");
  - las tarjetas, con el `aria-label` del requisito 11;
  - el cambio de sub-paso, el contador, las cantidades y los totales se anuncian (`aria-live`).
- [ ] Dado 375 px de ancho, entonces:
  - no hay scroll horizontal;
  - el stepper móvil dice "Paso 1 de 3" / "Elige tus entradas";
  - el mapa ocupa el ancho y sus textos miden ≥ 12 px, y "Tribuna Occidente" y "Tribuna Oriente" quedan dentro de su sector;
  - las tarjetas van en 1 columna;
  - "Tu compra" no se ve y la barra inferior "Total · 0 entradas / S/ 0.00 / Continuar" queda pegada abajo;
  - en el sub-paso 2 de Oriente el plano ocupa el ancho y, con el plano entero a la vista, cada butaca mide ≥ 24 px.
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta la tarjeta "Elige tus entradas" con el indicador de sub-paso, las tarjetas de zona, el panel de cantidad, el plano como sub-paso 2, las migas, el contador, los estados de zona agotada y el foco entre sub-pasos, sin referencias a la lista "Entradas".
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 3. Plano curvo con minimapa
- [ ] Dado el sub-paso 2 de "Tribuna Oriente" a 1440 px, entonces:
  - el plano muestra el contorno del sector (trapecio curvo con borde), las butacas en arco (más butacas en las filas exteriores) y las letras A–J en los dos bordes laterales del sector;
  - detrás se ve el resto del estadio atenuado, con el escenario semicircular navy y sus luces a un lado.
- [ ] Dado el minimapa, entonces:
  - muestra el estadio completo con "Tribuna Oriente" resaltada y un recuadro que, con el plano entero a la vista, rodea todo el sector;
  - al acercar con "Acercar" o pellizcando, el recuadro se reduce y sigue al paneo;
  - es `aria-hidden` y no recibe foco.
- [ ] Dado el plano curvo, entonces:
  - Tab entra en una sola parada;
  - ←/→ recorren la fila por número y ↑/↓ cambian de fila hacia la butaca más cercana;
  - Espacio elige o quita;
  - "Mejor asiento disponible" elige la butaca central de la fila A disponible más cercana al escenario;
  - las butacas ocupadas muestran "×" y no se pueden elegir.
- [ ] Dado 375 px, entonces:
  - el minimapa (≥ 96 px de ancho) y los 3 botones de zoom caben en la barra sobre el lienzo sin scroll horizontal;
  - ninguna butaca queda tapada;
  - pellizcar o arrastrar hace zoom o paneo sin elegir butacas.
- [ ] Dado "Tribuna Occidente", entonces el plano es el espejo del de Oriente: escenario a la derecha y butaca 1 abajo (decisión 7).
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta el plano curvo, el fondo atenuado, el minimapa y la decisión de sacar el minimapa y el zoom del lienzo.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 4. Precarga de la selección desde la URL
- [ ] Dado `/eventos/festival-vive-latino-lima/entradas?campo-vip=2&oriente=2&asientos=<id1>%2C<id2>`, con dos butacas disponibles de Tribuna Oriente, cuando carga, entonces:
  - se ve el sub-paso 1 ("Paso 1 de 2 · Elige una zona");
  - la tarjeta "Campo VIP" dice "2 entradas elegidas" y "Tribuna Oriente", "2 butacas elegidas";
  - "Tu compra" muestra "2 × Campo VIP … S/ 660.00" y "2 × Tribuna Oriente … S/ 310.00", con el total "S/ 970.00". A 375 px, la barra inferior dice "Total · 4 entradas" / "S/ 970.00";
  - "Continuar" lleva a `/checkout?evento=festival-vive-latino-lima&campo-vip=2&oriente=2&asientos=<id1>%2C<id2>`.
- [ ] Dado ese estado, cuando se abre "Tribuna Oriente", entonces las dos butacas aparecen elegidas, el contador dice "2 de 8 butacas" y se pueden quitar o cambiar como cualquier selección.
- [ ] Dado `/checkout?evento=…` con mapa (y asientos) y su "Cambiar entradas" (Fase 7 de `checkout-mock-payment.md`), cuando se vuelve al paso 1 y se pulsa "Continuar" sin cambiar nada, entonces `/checkout` muestra el mismo resumen (ida y vuelta).
- [ ] Dados parámetros inválidos, entonces se ignoran uno a uno, sin avisos, y el resto se precarga:
  - una butaca ocupada, un id inexistente o repetido, o una butaca de una zona de pie;
  - `mesa=2` en `/eventos/risas-sin-filtro/entradas` (zona agotada);
  - `oriente=2` sin `asientos` (zona numerada sin butacas);
  - `campo-vip=abc`, `campo-vip=0`, `campo-vip=11` o `campo-vip` repetido;
  - `asientos` repetido.
- [ ] Dados más de 10 en total (p. ej. `campo-vip=8&campo-general=5`), entonces se precargan 10, recortando en el orden de las zonas (Campo VIP 8, Campo General 2), y se ve el estado de límite de siempre.
- [ ] Dados los mapas rectangulares (p. ej. `/eventos/noche-de-sintetizadores-lima/entradas?general=2&vip=1`), entonces se precargan igual, con total "S/ 910.00".
- [ ] Dado `/eventos/<slug>/entradas` sin parámetros, entonces la pantalla es idéntica a la de la Fase 2, y `npm run build` sigue generando las 4 rutas prerenderizadas (SSG, no dinámicas `ƒ`).
- [ ] Dado el código, entonces `TicketSelection` no lee la URL, `PreselectedTicketSelection` solo conecta `useSearchParams` con `parseSeatingPreselection` y la página no lee `searchParams`.
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta la precarga (de dónde viene, el sub-paso inicial y la tolerancia).
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

## Diseño técnico

### Rutas (`app/`)
Sin cambios en F1–F3. `app/eventos/[slug]/entradas/page.tsx` ya genera los slugs con `hasVenueMap`, así que el festival se añade solo. `app/eventos/[slug]/page.tsx` tampoco cambia.

F4: `app/eventos/[slug]/entradas/page.tsx` envuelve `PreselectedTicketSelection` en `Suspense` (requisito 25). Sigue prerenderizada y no lee `searchParams`.

### Componentes
- shadcn (instalados; no hay nada que instalar): `card`, `button`, `badge` y `breadcrumb` (`Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink` con `render`, `BreadcrumbSeparator` y `BreadcrumbPage`).
  - `npx shadcn@latest search @shadcn -q stepper` no encuentra nada. El indicador de sub-paso es un texto, no un componente.
  - No hay componente de minimapa ni de mapa de recintos.
- Existentes que se modifican (`modules/seating/components/`):
  - `TicketSelection.tsx` (F2): sub-pasos y foco.
  - `VenueMapView.tsx` (F2): props `viewBox`, `stage`, `venue`, `zones`, `tones` y `onOpenZone`. Sin `Card`, sin `activeZoneId` ni `aria-pressed`, con luces y `wrapLabel`.
  - `SeatPlan.tsx`:
    - F2: sin `Card` y con cabecera nueva. `headingId` se mantiene, pero ahora es el `id` del h3 de la zona, que `TicketSelection` enfoca. Se añaden las props `seatLimit` (m del contador), `selectedInZone` (n) y `onBack`.
    - F3: prop `venue: Pick<VenueMap, "viewBox" | "stage" | "zones">` (sustituye a `stageLabel`; `stage.label` sigue sirviendo para la cuadrícula), fondo, letras en arco y minimapa.
  - `SeatLegend.tsx` (F2): prop `price: number` → "Disponible · S/ X". `SeatShape` no cambia.
  - `PurchaseSummary.tsx` (F2): solo el texto del vacío.
- Nuevos en `modules/seating/components/` (solo los usa `seating`):
  - `ZoneCards.tsx` (F2): props `zones`, `tones`, `selectedCountByZone: Record<string, number>` y `onOpenZone`.
  - `ZoneStepBreadcrumb.tsx` (F2): props `zoneName` y `onBack`.
  - `ZoneQuantityPanel.tsx` (F2): props `zone: GeneralVenueZone`, `quantity`, `atLimit`, `headingId`, `onChangeQuantity` y `onBack`.
  - `SeatPlanMinimap.tsx` (F3): props `viewBox`, `stage`, `zones` (solo `id`/`path`), `activeZoneId`, `planTransform`, `planWidth` y `planHeight`.
- Se elimina `ZoneList.tsx` (F2).
- F4:
  - existente, modificado: `TicketSelection.tsx` (prop `initialSelection?`);
  - nuevo `PreselectedTicketSelection.tsx` (`"use client"`; solo `seating`). Separado de `TicketSelection` porque `useSearchParams` obliga a un `Suspense` cuyo `fallback` es el propio `TicketSelection`, que por eso no puede leer la URL. No existe en shadcn.
- No se tocan: `EventPurchaseStrip`, `MobilePurchaseBar`, `SelectedSeatChips`, `ZonePricesCard`, `MobileBuyBar` ni `components/shared/PurchaseStepper.tsx`.

### Schemas, tipos, utils, hooks, datos y service (`modules/seating`)
`schemas/seating.schema.ts` (F1), cambios sobre la versión actual:
```ts
const pointSchema = z.object({ x: z.number(), y: z.number() }); // ya existe
const planTransformSchema = z.object({ scale: z.number().positive(), x: z.number(), y: z.number() });
const zoneLayoutBaseSchema = z.object({
  id: kebabIdSchema, ticketTypeId: kebabIdSchema, path: z.string().min(1), labelPos: pointSchema,
  wrapLabel: z.boolean().optional(),
});
// zona numerada: … seatViewBox, rows, planTransform: planTransformSchema.optional()
// venueLayoutSchema.stage: { label, path, labelPos, lights: pointSchema.array().optional() }
```
`types/seating.types.ts` (F1): se añaden `export type Point = { x: number; y: number }` y `export type PlanTransform = z.infer<typeof planTransformSchema>`. Hay que exportar el schema. `VenueMap`, `VenueZone` y `NumberedVenueZone` heredan los campos opcionales.

Utils (puros):
- `utils/annularSector.ts` (F1): requisito 3.
- `utils/arcSeatRows.ts` (F1): `ARC_PLAN_MARGIN`, `ARC_EDGE_PADDING`, `generateArcSeatRows` y `getRowEdgeLabelPoints` (requisito 4).
- `utils/seatRows.ts` (F1): exporta `getGeneratedSeatStatus` (extraída, sin cambiar resultados).
- `utils/seatNavigation.ts` y `utils/bestSeats.ts` (F1): requisito 6.
- `utils/planViewport.ts` (F3): `type Rect = { x: number; y: number; width: number; height: number }`, `getVisiblePlanRect` y `toVenueRect` (requisito 19).

Hook `hooks/useSeatSelection.ts` (F2): `selectZone` ignora zonas agotadas o inexistentes, y se añade `closeZone(): void`. El resto de la firma no cambia. F4: segundo parámetro opcional `initialSelection?: SeatSelection` (requisito 22).

Utils (F4): `utils/selectionSummary.ts` añade `parseSeatingPreselection(map: VenueMap, params: Pick<URLSearchParams, "getAll">): SeatSelection` (requisito 21). Reutiliza `parseSeatId`, `resolveSeats` y `MAX_TICKETS_PER_ORDER` (de `@/modules/events/purchase`, la entrada de la que el archivo ya importa `buildCheckoutHref`).

Datos `data/venueMaps.mock.ts` (F1): exporta `STADIUM_CENTER` y `VIVE_LATINO_SECTORS: Record<"stage" | "campo-vip" | "campo-general" | "occidente" | "oriente" | "norte", AnnularSector>`, y añade el layout del requisito 7 construido con `getAnnularSectorPath`, `getArcPoints` y `generateArcSeatRows`.

Service: sin cambios de código. `getVenueMapBySlug`, `getVenueMapForEvent` y `hasVenueMap` cubren el evento nuevo con los datos.

`index.ts` y `seats.ts`: sin cambios en F1–F3. F4: `index.ts` exporta `PreselectedTicketSelection`.

### Otros módulos
- `modules/events/data/events.mock.ts` (F1): requisito 1.
- `modules/events/services/events.service.test.ts` (F1): requisito 2.

### Dependencias entre módulos
Sin cambios: `checkout` → `seating` (por `seats.ts`) → `events` (barrel o `purchase.ts`). `seating/utils/seatRows.ts` y `arcSeatRows.ts` → `lib/hash.ts`.

### Contrato de API
No hay API: son datos mock.
- **`VenueMap`** (contrato B), ampliado con campos opcionales y sin cambios de los existentes:
  ```ts
  type Point = { x: number; y: number };
  type PlanTransform = { scale: number; x: number; y: number }; // plano = estadio × scale + (x, y)
  type VenueMap = {
    eventSlug: string; venue: string; viewBox: string;
    stage: { label: string; path: string; labelPos: Point; lights?: Point[] };
    zones: VenueZone[]; // + wrapLabel?: boolean; numbered: + planTransform?: PlanTransform
  };
  ```
- **Contratos A, C y H:** sin cambios. Ejemplo de URL del festival: `/checkout?evento=festival-vive-latino-lima&campo-vip=2&oriente=2&asientos=oriente-C-3%2Coriente-C-4`.
- **Precarga (F4):** entrada `/eventos/<slug>/entradas?<ticketTypeId>=<qty>…&asientos=<id>,<id>` (contrato C sin `evento`; la genera `buildChangeTicketsHref` de checkout, Fase 7).
  ```ts
  // modules/seating/utils/selectionSummary.ts
  export function parseSeatingPreselection(map: VenueMap, params: Pick<URLSearchParams, "getAll">): SeatSelection;
  // modules/seating/hooks/useSeatSelection.ts
  export function useSeatSelection(map: VenueMap, initialSelection?: SeatSelection): /* igual que hoy */;
  // modules/seating/components/TicketSelection.tsx
  type TicketSelectionProps = { map: VenueMap; initialSelection?: SeatSelection };
  // modules/seating/components/PreselectedTicketSelection.tsx
  export function PreselectedTicketSelection(props: { map: VenueMap }): JSX.Element;
  ```

## Reutilización
- `seating`:
  - `getZoneTones`/`ZONE_TONE_CLASSES` (barra de color de las tarjetas: clase `swatch`);
  - `generateSeatRows` (paso de 32 y regla de ocupación);
  - `formatSeatId`, `SeatShape`, `SeatLegend`, `SelectedSeatChips`, `SeatPlan` (zoom, roving tabindex, clic tras arrastre), `useSeatSelection`, `PurchaseSummary` y `MobilePurchaseBar`;
  - el stepper −/+ de `ZoneList`, que se mueve a `ZoneQuantityPanel`.
- `lib/hash.ts` (`hashString`, `mixHash`) de la F5 de la spec base.
- `events`: `formatEventPrice` y `MAX_TICKETS_PER_ORDER` (`purchase.ts`) y el detalle y el aside, sin cambios.
- shadcn instalados: `Card`, `Button`, `Badge` y `Breadcrumb`.
- `react-zoom-pan-pinch@4.2.0` (instalado): `useTransformEffect` para el minimapa. Su `MiniMap` se descarta (decisión 12).
- Iconos `lucide-react`: `Users`, `Armchair`, `ChevronRight`, `ChevronLeft`, y los que ya se usan (`ZoomIn`, `ZoomOut`, `Maximize`, `Sparkles`, `Minus`, `Plus`, `X` y `ArrowRight`).
- F4: `parseSeatId`, `resolveSeats` y `buildSeatingCheckoutHref` (para el test de ida y vuelta), `MAX_TICKETS_PER_ORDER`, `useSearchParams` + `Suspense` (documentación de Next 16). Es el mismo patrón que `PreselectedTicketSelector` de `checkout-mock-payment.md` (Fase 7). Sin dependencias nuevas.

## Tests
- **F1:**
  - `modules/events/services/events.service.test.ts`: los dos cambios del requisito 2. El resto no cambia.
  - `modules/seating/utils/annularSector.test.ts` (nuevo):
    - path exacto de un sector de 90°, de una porción de disco y con `large` = 1 (> 180°);
    - límites:
      - sector que cruza 0° (−10°…30°: `maxX` = cx + exterior);
      - sector que contiene 90° (`maxY` = cy + exterior);
      - porción de disco (incluye el centro);
    - punto dentro, fuera por radio, fuera por ángulo y dentro cruzando 0°;
    - solape:
      - mismo radio y ángulos que se cruzan → `true`;
      - radios disjuntos → `false`;
      - ángulos que solo se tocan → `false`;
      - cruce de 0° → `true`;
      - no concéntricos → error;
    - `getArcPoints`: extremos y equiespaciado;
    - errores con radios o barridos inválidos.
  - `modules/seating/utils/arcSeatRows.test.ts` (nuevo):
    - criterios F1 (filas y butacas por fila con el sector de `oriente`, numeración por ángulo, ids, ancho ≤ 400, determinismo);
    - butacas dentro de la banda del plano;
    - `planTransform` coherente: el centro del plano es `cx·s + x`;
    - ratios 0 y 1;
    - accesibles;
    - los 3 errores del criterio;
    - `getRowEdgeLabelPoints`: a 0.8 pitch por fuera de la 1.ª y de la última butaca.
  - `modules/seating/utils/seatRows.test.ts`: sin cambios (deben seguir pasando tras extraer `getGeneratedSeatStatus`).
  - `modules/seating/schemas/seating.schema.test.ts` (se amplía): layout con `lights`, `wrapLabel` y `planTransform` válido; `scale` 0 o negativa falla. Los casos actuales no cambian.
  - `modules/seating/utils/seatNavigation.test.ts` y `bestSeats.test.ts` (se amplían; los casos actuales no cambian):
    - zona en arco generada con `generateArcSeatRows`: ↑/↓ a la butaca más cercana en distancia (no por `x`), y bloque centrado por índice;
    - fila de 5 libre → número 3.
  - `modules/seating/services/seating.service.test.ts` (se amplía):
    - `MAP_SLUGS` con 4 slugs; `hasVenueMap` para los 4;
    - criterio de `getVenueMapBySlug` del festival;
    - invariantes del requisito 8 a partir de `VIVE_LATINO_SECTORS`;
    - tonos del festival;
    - el test de `labelPos` en el centro del rectángulo (F5 de la spec base) solo para los 3 mapas rectangulares.
- **F2:**
  - `modules/seating/hooks/useSeatSelection.test.ts`:
    - "selectZone activa cualquier zona, incluidas las numeradas y las agotadas" pasa a: activa las numeradas y las de pie, e ignora las agotadas y las inexistentes;
    - nuevo caso `closeZone` (vuelve a `null` y conserva la selección).
  - `modules/seating/components/TicketSelection.test.tsx` (se reescribe la parte de lista y activación; se conservan los casos del plano):
    - el indicador "Paso 1 de 2 · Elige una zona";
    - clic o Enter en una zona del mapa abre el sub-paso 2, cambia el indicador, enfoca el h3 y quita mapa y tarjetas;
    - la tarjeta de una zona de pie abre el panel de cantidad; −/+ actualizan cantidad, total y `href`;
    - "Todas las zonas" vuelve, enfoca la tarjeta y conserva la selección, con "2 entradas elegidas" en su nombre accesible;
    - una zona agotada (mapa y tarjeta) no abre nada y tiene `aria-disabled`;
    - una zona numerada abre el plano con "n de m butacas", que se actualiza al elegir;
    - el límite de 10 con el texto del pie;
    - el resumen vacío con el texto nuevo;
    - se mantienen, adaptados al sub-paso 2, los casos de F4 de la spec base: clic en un asiento, Espacio/Enter, flechas y `tabIndex`, ocupado, "Mejor asiento disponible", quitar un chip y cambiar de zona conservando asientos.
- **F3:**
  - `modules/seating/utils/planViewport.test.ts` (nuevo):
    - escala 1 sin desplazamiento → el plano entero;
    - escala 2 con `position` (−w/2, −h/2) → el cuarto central correcto;
    - viewport más alto que el plano (centrado vertical con `off`);
    - recorte a los límites;
    - `toVenueRect` deshace `planTransform`.
  - `modules/seating/components/TicketSelection.test.tsx` (se amplía; el `vi.mock("react-zoom-pan-pinch")` añade `useTransformEffect: vi.fn()`). Con una zona fixture con `planTransform`:
    - se pinta el minimapa (`svg[aria-hidden]` con el `path` de la zona en `fill-primary`);
    - hay 2 letras por fila;
    - no aparece la barra "ESCENARIO" de cuadrícula;
    - una zona sin `planTransform` no tiene minimapa.
- **F4:**
  - `modules/seating/utils/selectionSummary.test.ts` (se amplía; los casos actuales no cambian). `parseSeatingPreselection` con un mapa fixture (una zona de pie, una numerada y una agotada):
    - cantidad de pie válida → `quantities[zone.id]` (clave = id de zona, parámetro = `ticketTypeId`);
    - butacas válidas, en el orden de la URL;
    - se ignoran: butaca ocupada, inexistente, repetida, de una zona de pie o de la zona agotada; cantidad de la zona agotada; cantidad de una zona numerada sin butacas; valores `abc`, `0`, `11`, `1.5`; parámetros repetidos (cantidad o `asientos`);
    - recorte a 10 en el orden de `map.zones`;
    - sin parámetros → selección vacía;
    - ida y vuelta con `buildSeatingCheckoutHref` (cantidades de pie + butacas) → misma selección.
  - `modules/seating/hooks/useSeatSelection.test.ts` (se amplía):
    - con `initialSelection`: `quantities`, `seatIds`, `ticketCount`, `lines`, `total` y `checkoutHref` reflejan la selección, y `activeZoneId` es `null`;
    - `toggleSeat` sobre una butaca precargada la quita;
    - sin `initialSelection`, igual que hoy.
  - `modules/seating/components/TicketSelection.test.tsx` (se amplía):
    - con `initialSelection`, sub-paso 1 con las tarjetas "…, 2 entradas elegidas" / "…, 2 butacas elegidas" en su nombre accesible, total y `href` de "Continuar";
    - `PreselectedTicketSelection`, con `vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal()), useSearchParams: () => new URLSearchParams("…") }))`, precarga lo mismo.
- **Sin tests:**
  - `VenueMapView`, `ZoneCards`, `ZoneStepBreadcrumb`, `ZoneQuantityPanel`, `SeatLegend`, `SeatPlanMinimap` y `PurchaseSummary`: presentacionales, cubiertos por `TicketSelection.test` donde tienen comportamiento;
  - mocks y tipos;
  - `app/eventos/[slug]/entradas/page.tsx` e `index.ts` (F4).

## Plan de tareas
**Coordinación:**
- Se implementa **después de la Fase 5 de `docs/specs/seating-ticket-selection.md`**, que deja `lib/hash.ts`, `modules/seating/seats.ts`, `getGeneratedSeatStatus` por extraer sobre `mixHash`, y el test de `labelPos` que aquí se adapta (decisión 14).
- No se ejecuta a la vez que ninguna fase de otra spec que toque `modules/seating/**` o `modules/events/data/events.mock.ts`.
- `events-ui-refresh.md` ya declara que este evento lo añade seating y que allí no se toca el mock.
- `checkout-mock-payment.md` cita como ejemplo "L-9 y M-8 de Tribuna Oriente". Con las filas A–J de esta spec (decisión 6), esas butacas no existen. Su criterio admite "cualquier zona numerada existente", así que no la bloquea; ver Preguntas abiertas.
- Los developers en paralelo verifican con `npx vitest run <sus archivos>` y `npx eslint <sus archivos>`; el build lo ejecuta el reviewer al final de cada fase.

### Fase 1. Dominio y datos del estadio (5 tareas, 15 archivos)
- [ ] T1. Evento "Festival Vive Latino Lima" en el mock (requisito 1) y ajustes de `events.service.test.ts` (requisito 2). Verificar `npx vitest run modules/events modules/organizer modules/tickets modules/checkout`.
  - Archivos: `modules/events/data/events.mock.ts`, `modules/events/services/events.service.test.ts`.
  - Depende de: Fase 5 de la spec base.
  - Secuencial (base, archivos de otro módulo).
- [ ] T2. Geometría de sectores anulares y campos opcionales del schema, con tests.
  - Archivos: `modules/seating/utils/annularSector.ts`, `modules/seating/utils/annularSector.test.ts`, `modules/seating/schemas/seating.schema.ts`, `modules/seating/schemas/seating.schema.test.ts`, `modules/seating/types/seating.types.ts`.
  - Depende de: T1 (orden de la fase).
  - Secuencial (base de T3–T5).
- [ ] T3. Generador de butacas en arco y extracción de `getGeneratedSeatStatus`, con test.
  - Archivos: `modules/seating/utils/arcSeatRows.ts`, `modules/seating/utils/arcSeatRows.test.ts`, `modules/seating/utils/seatRows.ts`.
  - Depende de: T2.
  - En paralelo con T4.
- [ ] T4. Navegación ↑/↓ por distancia y "mejor asiento" por índice, con tests ampliados.
  - Archivos: `modules/seating/utils/seatNavigation.ts`, `modules/seating/utils/seatNavigation.test.ts`, `modules/seating/utils/bestSeats.ts`, `modules/seating/utils/bestSeats.test.ts`.
  - Depende de: T2. Sus tests nuevos usan `generateArcSeatRows`, así que el caso en arco se añade cuando T3 termine. Si T4 se ejecuta en paralelo, el developer de T4 deja ese caso para el final y lo ejecuta tras T3.
  - En paralelo con T3.
- [ ] T5. Layout mock del estadio y tests del service (invariantes, tonos, 4 mapas, adaptación del test de rectángulos).
  - Archivos: `modules/seating/data/venueMaps.mock.ts`, `modules/seating/services/seating.service.test.ts`.
  - Depende de: T1, T3 y T4.
  - Secuencial.

### Fase 2. Pantalla en dos sub-pasos (4 tareas, 13 archivos)
- [ ] T1. Hook: `selectZone` ignora zonas agotadas y nueva acción `closeZone`, con test.
  - Archivos: `modules/seating/hooks/useSeatSelection.ts`, `modules/seating/hooks/useSeatSelection.test.ts`.
  - Depende de: Fase 1.
  - En paralelo con T2.
- [ ] T2. Componentes presentacionales del sub-paso 1 y del panel de cantidad, y texto del resumen.
  - Archivos: `modules/seating/components/VenueMapView.tsx`, `modules/seating/components/ZoneCards.tsx`, `modules/seating/components/ZoneStepBreadcrumb.tsx`, `modules/seating/components/ZoneQuantityPanel.tsx`, `modules/seating/components/PurchaseSummary.tsx`.
  - Depende de: Fase 1.
  - En paralelo con T1.
- [ ] T3. `SeatPlan` como sub-paso 2 (sin `Card`, migas, h3, contador, barra de zoom sobre el lienzo) y leyenda con precio.
  - Archivos: `modules/seating/components/SeatPlan.tsx`, `modules/seating/components/SeatLegend.tsx`.
  - Depende de: T2 (`ZoneStepBreadcrumb`).
  - Secuencial tras T2.
- [ ] T4. `TicketSelection` con sub-pasos y foco, test reescrito, eliminar `ZoneList` y actualizar el diseño de página.
  - Archivos: `modules/seating/components/TicketSelection.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `modules/seating/components/ZoneList.tsx` (se elimina), `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T1 y T3.
  - Secuencial.

### Fase 3. Plano curvo con minimapa (3 tareas, 6 archivos)
- [ ] T1. Utilidad de vista visible, con test.
  - Archivos: `modules/seating/utils/planViewport.ts`, `modules/seating/utils/planViewport.test.ts`.
  - Depende de: Fase 2.
  - Secuencial (base de T2).
- [ ] T2. Minimapa.
  - Archivos: `modules/seating/components/SeatPlanMinimap.tsx`.
  - Depende de: T1.
  - Secuencial.
- [ ] T3. Fondo del estadio, contorno del sector, letras en los dos bordes y minimapa en `SeatPlan`; test ampliado; diseño de página.
  - Archivos: `modules/seating/components/SeatPlan.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T2.
  - Secuencial.

### Fase 4. Precarga de la selección desde la URL (4 tareas, 10 archivos)
**Coordinación:**
- Depende de la **Fase 2** (sub-pasos, tarjetas con "n elegidas", hook con `closeZone`). **No depende de la Fase 3**: puede ir antes o después, pero no en la misma sesión, porque las dos tocan `TicketSelection.test.tsx` y `ticket-selection.md`.
- Es independiente de la Fase 7 de `checkout-mock-payment.md`, que genera el enlace: cada una funciona sola. El criterio de ida y vuelta necesita las dos.
- Por qué es una fase nueva y no parte de la F2: la F2 ya tiene 13 archivos y la precarga añade 10.

- [ ] T1. `parseSeatingPreselection` con tests (incluida la ida y vuelta con `buildSeatingCheckoutHref`).
  - Archivos: `modules/seating/utils/selectionSummary.ts`, `modules/seating/utils/selectionSummary.test.ts`.
  - Depende de: Fase 2.
  - En paralelo con T2.
- [ ] T2. `initialSelection` en `useSeatSelection`, con tests.
  - Archivos: `modules/seating/hooks/useSeatSelection.ts`, `modules/seating/hooks/useSeatSelection.test.ts`.
  - Depende de: Fase 2.
  - En paralelo con T1.
- [ ] T3. `initialSelection` en `TicketSelection` y nuevo `PreselectedTicketSelection`, con tests.
  - Archivos: `modules/seating/components/TicketSelection.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `modules/seating/components/PreselectedTicketSelection.tsx`.
  - Depende de: T1 y T2.
  - Secuencial.
- [ ] T4. Barrel, página con `Suspense` y diseño de página (sección "Precarga").
  - Archivos: `modules/seating/index.ts`, `app/eventos/[slug]/entradas/page.tsx`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T3.
  - Secuencial. El reviewer verifica en `npm run build` que las 4 rutas siguen prerenderizadas.

## Preguntas abiertas
1. **Tribuna Norte de pie** (decisión 4). La captura no deja ver su tarjeta. Se decidió "General · sin butaca" por la convención de tribuna popular y porque un plano del arco exterior no cumple los tamaños mínimos de butaca. ¿Se acepta, o debe ser numerada aunque haga falta otro tipo de plano (por tramos, o empezando con zoom)? **Dato nuevo:** la captura del resumen de checkout que compartió el usuario muestra "5 × Tribuna Norte" con "Fila B · 13 · Fila C · 6 · Fila D · 6 · Fila E · 18 · Fila J · 13". Es decir, Norte numerada, con filas hasta la J y al menos 18 butacas por fila. Eso apunta a la segunda opción y choca con el límite de ≤ 10 butacas por fila.
2. **Filas A–J en lugar de A–M** (decisión 6). Con 13 filas, el plano de las tribunas laterales supera 400 de ancho y las butacas bajan de 24 px a 375 px. Consecuencia: el ejemplo "L-9 / M-8 de Tribuna Oriente" de `checkout-mock-payment.md` no existe. ¿Se acepta A–J, o se prefiere relajar la invariante (butacas < 24 px con el plano entero, y se elige con zoom)?
3. **"2 de 6 butacas"** (decisión 11). Se muestra "n de m", con m = lo que cabe en el límite de 10 por compra. ¿O se quiere introducir un límite de 6 por zona (cambiaría la decisión 5 de la spec base, el hook y el checkout)?
4. **Quinto tono** (decisión 9). Oriente (S/ 155) y Norte (S/ 120) comparten `tier-4`. ¿Se añade un `tier-5` (p. ej. `fill-secondary` con borde, que hoy se parece a "Agotado") o se deja así?
5. **Formato compacto en "Tu compra"** ("Fila L · 9 · Fila M · 8", como la captura). `checkout-mock-payment.md` lo define en `modules/checkout/utils/summaryFormat.ts` (`formatCompactSeats`), y `seating` no puede importarlo sin crear un ciclo (`checkout` → `seating`). ¿Se sube esa función a `lib/` en una enmienda posterior y se usa en ambos resúmenes, o "Tu compra" mantiene "Fila L · Asiento 9, …"?
6. **Fecha del evento:** `2026-10-05`, a 2 días de hoy (2026-10-03). Al pasar la fecha, el mock no filtra eventos pasados, así que seguirá listado y comprable. ¿Se prefiere `2027-10-04` (también lunes) para que la demo no caduque?
7. **Datos plausibles** (requisito 1): segundo párrafo de la descripción (la invariante exige 2), dirección, organizador ficticio, edad mínima 0, `featured: true` e imagen de Unsplash sin verificar. ¿Algún valor real que deba usarse?
8. **Sub-pasos y botón "Atrás" del navegador:** el sub-paso no va en la URL, así que "Atrás" sale de `/entradas` aunque se esté en el sub-paso 2. ¿Se quiere reflejarlo en la URL (p. ej. `?zona=oriente`)? Sería otra ampliación.
9. **Butacas disponibles sin el tono de la zona** (decisión 10) y textos "Tu selección" / "Ocupado" de la leyenda en lugar de "Elegida" / "Ocupada" (decisión 13). ¿Se aceptan, para mantener la consistencia con los planos actuales?
10. **Sub-paso al volver con selección (F4):** la pantalla abre siempre en el sub-paso 1 (zonas con "n elegidas" y "Tu compra" completo; decisión 15). ¿O prefieres abrir directamente el sub-paso 2 de la única zona con selección, cuando solo hay una?
11. **Selección precargada que ya no es válida (F4):** las butacas que estén ocupadas o no existan se descartan sin aviso, así que el total puede ser menor que el del pedido. ¿Se quiere un aviso del tipo "Algunas butacas ya no están disponibles", o basta con que se vea en "Tu compra"? (Con los datos mock deterministas no debería pasar al volver desde checkout.)
