# Recintos curvos en todos los mapas ("Elige tus entradas" como estadio)

- Módulo: seating
- Estado: borrador

## Objetivo
Que el sub-paso 1 de "Elige tus entradas" (`/eventos/<slug>/entradas`) se vea como un estadio en **todos** los eventos con mapa, igual que el de "Festival Vive Latino Lima" (captura objetivo `images/20.png`): escenario semicircular navy con luces, zonas en anillos o sectores concéntricos separados en blanco y etiquetas con nombre y precio. Hoy los otros 3 recintos (`images/19.png`: "La casa de los espejos" con Escenario, Platea y Mezanine como rectángulos) usan rectángulos, y sus zonas numeradas abren un plano en cuadrícula sin fondo ni minimapa.

**Pedido del usuario:** "que la vista de 'Elige tus entradas' sea como un estadio en todos los eventos". Se buscaron librerías y ninguna dibuja el estadio por sí sola. El usuario eligió **mantener el SVG propio y curvar los recintos**, sin cambiar de librería. Por eso es un cambio de **datos mock** (y de sus tests): no cambia ningún componente.

Es una continuación de `docs/specs/seating-stadium-map.md` ("spec del estadio", aprobada), que no se edita. Siguen vigentes sus requisitos 1–31 y sus decisiones, salvo lo que esta spec enmienda de forma explícita:
- la decisión 3 y su "No incluye: mapas curvos para los otros 3 eventos": ahora los 4 recintos son curvos;
- la última viñeta del requisito 8 ("ninguna zona numerada sin `planTransform` cambia"): ya no queda ninguna en los mocks.

Siguen vigentes, además, las invariantes del requisito 7 de `docs/specs/seating-ticket-selection.md` ("spec base"): ≤ 10 butacas por fila, ≤ 12 filas y `seatViewBox` de ≤ 400 de ancho (butacas ≥ 24 px a 375 px).

## Alcance
- Incluye:
  - **Datos compartidos del estadio:** centro común y escenario (sector, `path`, `labelPos` y 7 luces) idénticos a los del festival, usados por los 4 recintos.
  - **Un archivo de datos por recinto**, más un agregador que mantiene `VENUE_LAYOUTS_MOCK` con el mismo orden y contenido para el service. Así cada recinto se puede rehacer en paralelo.
  - **Geometría curva para los 3 recintos** (valores concretos en los requisitos 3–5):
    - arena `noche-de-sintetizadores-lima`: VIP, Preferencial y General de pie en anillos de 112°, y Tribuna Norte numerada al fondo;
    - teatro `la-casa-de-los-espejos`: Platea y Mezanine numeradas, en abanico frente al escenario;
    - comedia `risas-sin-filtro`: Mesa (agotada) y Preferencial numeradas, y General de pie en media luna.
  - Las zonas numeradas de los 3 recintos pasan a plano **en arco** (`generateArcSeatRows`, con `planTransform`). Heredan el fondo del estadio, el lienzo apaisado desde `sm` y el minimapa, que ya implementa `SeatPlan` (requisitos 28–30 de la spec del estadio).
  - **Invariantes del mapa curvo** (requisito 8 de la spec del estadio) generalizadas a los 4 mapas, más tests por recinto con los valores exactos.
  - **Compatibilidad:** se conservan los ids de zona y de `ticketTypeId`, el orden de las zonas, las capacidades de pie, la ocupación por zona y las butacas que usan las órdenes demo (`platea-F-7` y `platea-F-8`).
  - Actualización del diseño de página `design-system/ticketera/pages/ticket-selection.md`.
- No incluye:
  - Cambios en componentes, hooks, utils, schema o service de `seating`: `VenueMapView`, `ZoneCards`, `SeatPlan`, `SeatPlanMinimap`, `generateArcSeatRows`, `getAnnularSectorPath` y `venueLayoutSchema` se usan tal cual.
  - Cambiar de librería o añadir dependencias.
  - Cambios en `modules/events` (nombres, precios, estados, orden de `ticketTypes`), `modules/checkout` o `modules/tickets`: no hace falta (requisito 7).
  - Rehacer el mapa del festival: solo pasa a su propio archivo y usa el escenario compartido, sin cambiar ningún valor.
  - Garantizar 0 solapes de los controles superpuestos con las butacas a 640 px y a 1024 px. Hoy tampoco se cumple en el festival a 1024 px (ver decisión 7 y Preguntas abiertas 2).
  - Quitar el soporte de cuadrícula: queda para mapas sin geometría y para `SeatGridPreview` (decisión 6).
  - Relajar el límite de ≤ 10 butacas por fila o el mínimo de 24 px por butaca (ver Preguntas abiertas 1).

## Decisiones
1. **Solo datos, mismo lenguaje que el festival.** Los 4 recintos comparten:
   - el centro `STADIUM_CENTER = { cx: 300, cy: 54 }`;
   - el escenario del festival: sector 0–90 de −10° a 190°, "ESCENARIO" en (300, 70) y 7 luces `getArcPoints(300, 54, 76, 40, 140, 7)`;
   - zonas como sectores anulares concéntricos (`getAnnularSectorPath`), con 8 unidades de separación radial entre anillos (12 entre el escenario y el primer anillo), como en el festival.

   Un radio de 90 es el mínimo para que "ESCENARIO" (`text-xs`, ~85 px a 375 px) quepa en el escenario: por eso tampoco el de la comedia es más pequeño.
2. **Ángulo máximo de una zona numerada.** Ninguna zona numerada puede ser un anillo de ~120° con 6 filas:
   - Las invariantes de la spec base (≤ 10 butacas por fila, plano de ≤ 400 de ancho y paso de 32) limitan el barrido Δ de un sector numerado de k filas a Δ ≈ (n_última − n_primera) / (k − 1) radianes.
   - Con 6 filas (Platea, que debe conservar la fila F con ≥ 8 butacas) sale ≤ ~62°. Con 3 filas, ≤ ~72°. Con 2 filas, ≤ ~90–112°.
   - Además, un plano muy apaisado o con butacas en las esquinas choca con el minimapa (arriba a la izquierda) y con el zoom (abajo a la derecha), que van superpuestos desde `sm`.

   Por eso las zonas de pie usan los 112° del festival (34°–146°), y las numeradas usan el mayor barrido que cumple todo:
   - Platea: 62°, más estrecha;
   - Mezanine: 72°, como un balcón más abierto;
   - Tribuna Norte: 52°, una tribuna de fondo;
   - Mesa y Preferencial de la comedia: 90°;
   - General de la comedia: 120°, la media luna exterior.

   Es el mismo criterio del festival, donde las tribunas numeradas tienen 40°.
3. **Menos butacas por zona numerada** (consecuencia de la decisión 2). Los valores salen de `generateArcSeatRows` y están verificados:

   | Zona | Hoy (cuadrícula) | Con arco |
   |---|---|---|
   | `norte` (arena) | A–H × 10 = 80 | A–C: 8, 9, 10 = 27 |
   | `platea` (teatro) | A–J: 8, 8, 9, 9, 10×6 = 94 | A–F: 5, 6, 7, 8, 9, 10 = 45 |
   | `mezanine` (teatro) | A–F × 10 = 60 | A–C: 7, 9, 10 = 26 |
   | `mesa` (comedia, agotada) | A–C × 8 = 24 | A–C: 7, 9, 10 = 26 |
   | `preferencial` (comedia) | A–F × 10 = 60 | A–B: 8, 10 = 18 |

   Son datos mock: no hay aforo real que respetar. Ver Preguntas abiertas 1.
4. **Mismo `occupiedRatio` por zona** que hoy (norte 0.3, platea 0.4, mezanine 0.85, mesa 1, preferencial 0.8). El estado de una butaca generada depende solo de su id, de la proporción y de la lista de accesibles (`getGeneratedSeatStatus`). Así, toda butaca que sigue existiendo conserva su estado, salvo las que pasan a accesibles (decisión 5). En particular:
   - `platea-F-8` sigue `available`;
   - `platea-F-7` sigue `occupied`, como hoy: es la butaca que compró la cuenta demo, para una función ya pasada.
5. **Butacas accesibles nuevas.** Las de hoy (`norte-H-*`, `platea-J-*`, `preferencial-F-*`) desaparecen con sus filas. Se eligen los extremos de la última fila cuando están libres. Si no lo están, las libres más cercanas al extremo.

   | Zona | Accesibles |
   |---|---|
   | `norte` | `norte-C-1`, `norte-C-10` |
   | `platea` | `platea-F-1`, `platea-F-10` |
   | `mezanine` | `mezanine-C-10` (nueva: la invariante del arco exige ≥ 1 accesible) |
   | `preferencial` (comedia) | `preferencial-B-4`, `preferencial-B-6` (los extremos de A y B están ocupados) |
   | `mesa` | ninguna (agotada: todas ocupadas) |

6. **La cuadrícula se queda en el código, no en los mocks.**
   - `SeatPlan` sigue dibujando en cuadrícula, con la barra "ESCENARIO" y sin fondo ni minimapa, toda zona numerada sin `planTransform`. Es el caso de un mapa futuro sin geometría.
   - `SeatGridPreview` (vista previa del organizer) sigue usando `generateSeatRows`.
   - Se mantienen `generateSeatRows` y sus tests, y los tests de `TicketSelection.test.tsx`, que usan fixtures propios en cuadrícula (`MAP`) y en arco (`ARC_MAP`), no los mocks.
   - Los 4 recintos mock pasan a arco.
7. **Solapes de controles y butacas, comprobados con un modelo.**
   - **Modelo:**
     - lienzo 16:10 de 688 × 430 px a 768 y de 772 × 482.5 px a 1440 (columna izquierda menos el `px-4` de la `Card`);
     - plano encajado con `preserveAspectRatio` por defecto;
     - caja de cada butaca = su área de toque de 32 × 32 unidades;
     - pastilla de zoom de 148 × 52 px a 12 px de la esquina inferior derecha;
     - minimapa de 112 px de ancho (96 px por debajo de `md`) a 12 px de la esquina superior izquierda.
   - **Holgura mínima entre cajas (px):**

     | Zona | 768: zoom / minimapa | 1440: zoom / minimapa |
     |---|---|---|
     | `norte` | 56.0 / 9.0 | 70.6 / 23.9 |
     | `platea` | 9.1 / 52.3 | 18.0 / 70.3 |
     | `mezanine` | 55.2 / 33.8 | 69.8 / 51.1 |
     | `preferencial` (comedia) | 71.3 / 55.6 | 92.5 / 73.3 |

   - **Fuera de los criterios:**
     - a 640 px, `platea` queda a −2.8 px del zoom;
     - a 1024 px (`lg`, la columna se estrecha a 516 px), `platea`, `norte` y también las tribunas actuales del festival se solapan unos px.

     Arreglarlo exige cambiar `SeatPlan` (franja inferior también en arco), no datos (Preguntas abiertas 2).
   - La verificación final la hace Playwright (criterios de la sección "Verificación visual").
8. **Numeración en arco:** la de la spec del estadio (decisión 7). En los sectores que abren hacia abajo, la butaca 1 de cada fila es la del extremo derecho del mapa (ángulo menor) y la fila A es la más cercana al escenario.
9. **Un archivo por recinto para trabajar en paralelo.**
   - **T1** reparte el mock actual en 5 archivos sin cambiar ningún dato, más un agregador.
   - **T2–T4** rehacen cada uno solo su archivo y su test.
   - **Tests de invariantes** (`seating.service.test.ts`): aplican las del mapa curvo a cada recinto que exporta `sectors` y las del rectángulo a los que no. Así, cuando una tarea convierte su recinto, este pasa solo de un grupo al otro, sin tocar archivos compartidos.
   - **T5** cierra: hace obligatorio `sectors`, borra la rama rectangular de los tests y actualiza el diseño de página.
10. **Orden de implementación:**
    - Va después de cerrar la **Fase 5** de la spec del estadio (fondo, lienzo apaisado y minimapa en `SeatPlan`; hoy en revisión). Los criterios visuales de esta spec dependen de ese comportamiento.
    - No se ejecuta en la misma sesión que ninguna fase de la spec del estadio. Su Fase 6 T4 toca `ticket-selection.md`, igual que T5.

## Requisitos

### Datos compartidos y organización (T1)
1. **`modules/seating/data/stadium.mock.ts`** (nuevo):
   - `STADIUM_CENTER = { cx: 300, cy: 54 }`.
   - `STAGE_SECTOR: AnnularSector = { ...STADIUM_CENTER, innerRadius: 0, outerRadius: 90, startAngle: -10, endAngle: 190 }`.
   - `STADIUM_STAGE` (el `stage` del layout):
     - `label`: "ESCENARIO";
     - `path`: `getAnnularSectorPath(STAGE_SECTOR)`;
     - `labelPos`: `{ x: 300, y: 70 }`;
     - `lights`: `getArcPoints(300, 54, 76, 40, 140, 7)`.

     Es exactamente lo que hoy escribe el festival.
   - `type MockVenue = { layout: z.input<typeof venueLayoutSchema>; sectors?: Record<string, AnnularSector> }`. `sectors` lleva `stage` y un sector por id de zona. Es opcional solo hasta T5 (requisito 9).
2. **Un archivo por recinto** en `modules/seating/data/`, cada uno con un `MockVenue`:

   | Archivo | Export | Contenido en T1 |
   |---|---|---|
   | `festivalViveLatino.mock.ts` | `VIVE_LATINO_SECTORS` (los sectores de hoy, con `stage: STAGE_SECTOR`) y `VIVE_LATINO_VENUE` | el layout de hoy, con `stage: STADIUM_STAGE` |
   | `nocheDeSintetizadores.mock.ts` | `SINTETIZADORES_VENUE` | el layout rectangular de hoy, tal cual, sin `sectors` |
   | `laCasaDeLosEspejos.mock.ts` | `ESPEJOS_VENUE` | ídem |
   | `risasSinFiltro.mock.ts` | `RISAS_VENUE` | ídem |

   - `venueMaps.mock.ts` pasa a ser el agregador:
     - `MOCK_VENUES = [SINTETIZADORES_VENUE, ESPEJOS_VENUE, RISAS_VENUE, VIVE_LATINO_VENUE]`, en el orden de hoy (los tests usan `VENUE_LAYOUTS_MOCK[0]` = arena);
     - `export const VENUE_LAYOUTS_MOCK = MOCK_VENUES.map((venue) => venue.layout)`, un array mutable como hoy (los tests lo mutan y lo restauran);
     - `export const VENUE_SECTORS_MOCK: Record<string, Record<string, AnnularSector>>`, por `eventSlug`, solo con los recintos que tienen `sectors`.
     - Deja de exportar `STADIUM_CENTER` y `VIVE_LATINO_SECTORS`: los tests los importan de sus archivos nuevos.
   - **Sin cambio de datos en T1:** `VENUE_LAYOUTS_MOCK` serializado con `JSON.stringify` es idéntico antes y después. El developer lo comprueba con un volcado previo en su scratchpad.
   - `seating.service.ts` no cambia: sigue importando `VENUE_LAYOUTS_MOCK` del agregador.

### Geometría de los recintos (T2–T4)
Convenciones:
- ángulos en grados, 0° = +x y en sentido horario (decisión 5 de la spec del estadio);
- todo `path` = `getAnnularSectorPath(sector)`;
- `stage: STADIUM_STAGE` y `sectors.stage = STAGE_SECTOR`;
- `labelPos` en el eje (x = 300), a mitad de la banda;
- el orden de las zonas, los ids, los `ticketTypeId` y las capacidades de pie no cambian;
- `planTransform` y `seatViewBox` los calcula `generateArcSeatRows`. Abajo van como referencia (los tests comprueban `seatViewBox`, `scale` y las butacas por fila).

Los valores son definitivos: están verificados contra todas las invariantes. Si la verificación visual exigiera cambiarlos, primero se actualiza esta spec.

3. **Arena `noche-de-sintetizadores-lima`** (T2), `viewBox` `"0 0 600 540"`:

   | Zona | Tipo | Sector (radios · ángulos) | `labelPos` | Plano |
   |---|---|---|---|---|
   | `vip` | general (1500) | 102–182 · 34°…146° | (300, 196) | — |
   | `preferencial` | general (4000) | 190–262 · 34°…146° | (300, 280) | — |
   | `general` | general (12000) | 270–350 · 34°…146° | (300, 364) | — |
   | `norte` | numbered | 358–478 · 64°…116° | (300, 472) | `generateArcSeatRows({ scale: 0.825, rowLabels: ["A","B","C"], occupiedRatio: 0.3, accessibleSeats: ["norte-C-1","norte-C-10"] })` → 8, 9, 10 butacas; `seatViewBox` `"0 0 394 177"`; `planTransform` ≈ { 0.825, −50.63, −286.01 } |

   - VIP es `low-stock`: su banda de 80 aloja la píldora "Últimas entradas" desde `md` (~56 unidades).
   - El margen mínimo con el `viewBox` es 8 (Norte abajo) y 9.8 (General a los lados).
4. **Teatro `la-casa-de-los-espejos`** (T3), `viewBox` `"0 0 600 432"`:

   | Zona | Tipo | Sector | `labelPos` | Plano |
   |---|---|---|---|---|
   | `platea` | numbered | 102–239 · 59°…121° | (300, 225) | `generateArcSeatRows({ scale: 1.425, rowLabels: A–F, occupiedRatio: 0.4, accessibleSeats: ["platea-F-1","platea-F-10"] })` → 5, 6, 7, 8, 9, 10 butacas; `"0 0 399 264"`; ≈ { 1.425, −228.09, −177.54 } |
   | `mezanine` | numbered | 248–373 · 54°…126° | (300, 364) | `generateArcSeatRows({ scale: 0.8, rowLabels: A–C, occupiedRatio: 0.85, accessibleSeats: ["mezanine-C-10"] })` → 7, 9, 10 butacas; `"0 0 399 186"`; ≈ { 0.8, −40.6, −179.71 } |

   - Platea conserva la fila F con 10 butacas: `platea-F-7` y `platea-F-8` existen.
   - Ninguna fila de Platea supera el 70 % de ocupadas. El máximo es B, con 4 de 6.
   - Mezanine (`low-stock`) queda con 3 disponibles (`mezanine-A-3`, `mezanine-B-9` y `mezanine-C-4`) y 1 accesible.
5. **Comedia `risas-sin-filtro`** (T4), `viewBox` `"0 0 600 400"`:

   | Zona | Tipo | Sector | `labelPos` | Plano |
   |---|---|---|---|---|
   | `mesa` | numbered, agotada | 102–171 · 45°…135° | (300, 191) | `generateArcSeatRows({ scale: 1.45, rowLabels: A–C, occupiedRatio: 1 })` → 7, 9, 10 butacas, todas ocupadas; `"0 0 399 192"`; ≈ { 1.45, −235.67, −158.88 } |
   | `preferencial` | numbered | 180–252 · 45°…135° | (300, 270) | `generateArcSeatRows({ scale: 0.95, rowLabels: ["A","B"], occupiedRatio: 0.8, accessibleSeats: ["preferencial-B-4","preferencial-B-6"] })` → 8, 10 butacas; `"0 0 387 167"`; ≈ { 0.95, −91.72, −148.22 } |
   | `general` | general (600) | 260–340 · 30°…150° | (300, 354) | — |

   - General es la media luna exterior. Su margen lateral con el `viewBox` es 5.6.
   - Preferencial (`low-stock`) queda con 3 disponibles (`preferencial-A-5`, `-A-7` y `-B-5`) y 2 accesibles.
6. **Invariantes del mapa curvo** (requisito 8 de la spec del estadio), para cada recinto de `VENUE_SECTORS_MOCK`:
   - Los sectores son concéntricos con `STADIUM_CENTER`, y `sectors.stage` es `STAGE_SECTOR`.
   - El `stage` del layout es `STADIUM_STAGE`: mismo `path`, `labelPos` y 7 luces dentro del sector del escenario.
   - Hay un sector por zona, y cada `path` es exactamente `getAnnularSectorPath` de su sector.
   - El escenario y cada zona quedan dentro del `viewBox`, con ≥ 4 unidades de margen.
   - Ningún par de sectores se solapa, escenario incluido.
   - El `labelPos` del escenario y el de cada zona caen dentro de su sector.
   - Toda zona numerada tiene `planTransform`. En cada una:
     - todas las butacas caen dentro del sector del plano, con su radio de 12 dentro de la banda;
     - las letras de fila (`getRowEdgeLabelPoints`) quedan dentro del `seatViewBox`, con ≥ 12 de margen;
     - si no está agotada, tiene ≥ 1 butaca `available` y ≥ 1 `accessible`.
   - Siguen las invariantes generales de hoy para los 4 mapas:
     - zonas 1:1 con los `ticketTypes`;
     - una zona agotada no tiene butacas elegibles;
     - ≤ 10 butacas por fila, ≤ 12 filas y `seatViewBox` de ≤ 400 de ancho.

### Compatibilidad
7. **Lo que no cambia y lo que se comprobó:**
   - **Mismos datos de zona:** ids de zona, `ticketTypeId`, orden, `kind`, capacidades de pie, `occupiedRatio` y, desde el evento, nombre, precio y estado. Por tanto, también los tonos de `getZoneTones` y los tests que los fijan (`zoneTone.test.ts` y "tonos con los mapas reales").
   - **Órdenes demo** (`modules/tickets/data/demoOrders.ts`):
     - la única con butacas de un evento con mapa es `MT-9LM2TC`, con `platea-F-7` y `platea-F-8`, y las dos se mantienen con la etiqueta "Platea · Fila F · Asiento 7/8": `demoOrders.test.ts` pasa sin cambios;
     - `MT-3HX9RB` (`occidente-F-12`) es de `clasico-del-pacifico`, que no tiene mapa.
     - No se modifica ningún archivo de `modules/tickets`.
   - **Checkout:**
     - `checkout.service.test.ts` toma butacas `available` y `occupied` de Norte del mapa real de forma dinámica: Norte conserva 17 disponibles y 8 ocupadas;
     - los demás tests de checkout (`checkoutOrder`, `summaryFormat`, `CheckoutForm`) usan ids de fixtures (`platea-B-3`, `tribuna-oriente-L-9`…), no del mapa.
     - No se modifica ningún archivo de `modules/checkout`.
   - **Otros tests de seating** (`useSeatSelection`, `seatIds`, `seatNavigation`, `bestSeats`, `selectionSummary`, `arcSeatRows`, `seating.schema` y `TicketSelection`): usan fixtures propios y no cambian.
   - **`events.service.test.ts`:** no cita butacas ni formas, y no cambia.
   - **Tests de `seating.service.test.ts` que siguen valiendo con los datos nuevos:**
     - "ninguna fila de norte/platea supera el 70 %": máximos 40 % y 67 %;
     - "norte/platea/preferencial conservan ≥ 1 accesible";
     - "Tribuna Norte: el mejor asiento está en la fila A y no en un extremo": `norte-A-5` de 8.
   - **Ids que dejan de existir** (filas o números fuera del plano nuevo, p. ej. `platea-J-1` o `norte-H-10`): un enlace antiguo con ellos se trata como hoy cualquier butaca inexistente:
     - el checkout responde `invalid-tickets` ("No pudimos preparar tu compra");
     - la precarga de la Fase 6 de la spec del estadio los ignora.

     Ninguna orden demo ni test usa estos ids.
8. **Cuadrícula** (decisión 6): sin cambios de código. Tras T5 ningún mock la usa, y sigue cubierta por los tests de `seatRows`, `SeatGridPreview`/organizer y `TicketSelection.test.tsx` (fixture `MAP`).

### Cierre (T5)
9. **Tipos y tests sin rama rectangular:**
   - `MockVenue.sectors` pasa a obligatorio y `VENUE_SECTORS_MOCK` se construye sin filtrar.
   - En `seating.service.test.ts` se borran el grupo "invariantes del mapa rectangular", `RECT_PATH`, `rectCenter` y `RECT_MAP_SLUGS`.
10. **Diseño de página** (`design-system/ticketera/pages/ticket-selection.md`):
    - "Plano de butacas": "En arco" pasa a ser "las zonas numeradas de los 4 mapas mock". "En cuadrícula" queda para las zonas sin `planTransform` (mapas sin geometría; hoy ninguno en el mock) y para la vista previa del organizer.
    - "Mapa de zonas": los mapas comparten el centro y el escenario semicircular con 7 luces; las zonas son sectores concéntricos; las numeradas tienen un barrido menor (decisión 2).
    - Se sustituyen las holguras medidas (zoom y minimapa) por las que mida Playwright en esta spec (la menor por ancho, con la butaca), y se anota que a 640 y 1024 px no están garantizadas.

## Criterios de aceptación
Todos son de la Fase 1.

### Datos (unit tests)
- [ ] Dado T1, cuando se compara `JSON.stringify(VENUE_LAYOUTS_MOCK)` antes y después, entonces es idéntico, y `npx vitest run modules/seating modules/checkout modules/tickets` pasa sin cambiar ningún test fuera de `seating.service.test.ts`.
- [ ] Dado `VENUE_SECTORS_MOCK` tras T5, entonces tiene los 4 slugs con mapa y cada uno cumple todas las invariantes del requisito 6.
- [ ] Dado `getVenueMapBySlug("noche-de-sintetizadores-lima")`, entonces:
  - `viewBox` es `"0 0 600 540"` y los sectores, los `labelPos` y las capacidades son los del requisito 3;
  - las zonas siguen siendo `vip`, `preferencial`, `general` (de pie) y `norte` (numerada);
  - Norte tiene las filas A–C con 8, 9 y 10 butacas, `seatViewBox` `"0 0 394 177"` y `planTransform.scale` 0.825;
  - sus accesibles son exactamente `norte-C-1` y `norte-C-10`;
  - `resolveSeats(map, ["norte-A-1"])` da la etiqueta "Tribuna Norte · Fila A · Asiento 1".
- [ ] Dado `getVenueMapBySlug("la-casa-de-los-espejos")`, entonces:
  - `viewBox` es `"0 0 600 432"`;
  - Platea tiene A–F con 5, 6, 7, 8, 9 y 10 butacas, `"0 0 399 264"` y escala 1.425;
  - Mezanine tiene A–C con 7, 9 y 10 butacas, `"0 0 399 186"` y escala 0.8;
  - las accesibles son exactamente `platea-F-1`, `platea-F-10` y `mezanine-C-10`;
  - `resolveSeats(map, ["platea-F-8"])` da "Platea · Fila F · Asiento 8";
  - `platea-F-7` existe y está `occupied` (como hoy), así que `resolveSeats(map, ["platea-F-7"])` es `null`;
  - `resolveSeats(map, ["mezanine-A-3"])` resuelve.
- [ ] Dado `getVenueMapBySlug("risas-sin-filtro")`, entonces:
  - `viewBox` es `"0 0 600 400"`;
  - Mesa tiene A–C con 7, 9 y 10 butacas, todas `occupied`, `"0 0 399 192"` y escala 1.45;
  - Preferencial tiene A–B con 8 y 10 butacas, `"0 0 387 167"` y escala 0.95, y sus accesibles son exactamente `preferencial-B-4` y `preferencial-B-6`;
  - General es de pie (600), con sector 260–340 · 30°…150°;
  - `resolveSeats(map, ["preferencial-A-5"])` resuelve.
- [ ] Dado el festival, entonces su layout y sus tests específicos ("devuelve el estadio…", filas 4, 4, 5, 6, 7, 7, 8, 9, 9, 10, `"0 0 399 401"`, 7 luces, `wrapLabel` en las tribunas) no cambian.
- [ ] Dado el pedido demo `MT-9LM2TC`, entonces `demoOrders.test.ts` pasa sin cambios.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan sin errores, y las 4 rutas `/eventos/<slug>/entradas` siguen prerenderizadas.

### Verificación visual (Playwright, reviewer)
Se usa un script en el scratchpad del reviewer, con el Chromium de `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`) o `npx -y playwright install chromium`, contra `npm run build && npm run start`. Se recorren los 4 eventos con mapa a 375 × 812, 768 × 1024 y 1440 × 900.
- [ ] Dado el sub-paso 1 de cada evento, entonces el mapa es curvo como `images/20.png`:
  - el `<svg role="group" aria-label="Mapa de zonas de …">` tiene una forma por zona cuyo `d` contiene arcos (`A`) y ningún rectángulo (`H`/`V`);
  - el escenario es la forma navy semicircular con 7 luces;
  - cada etiqueta (nombre y precio, o "Agotado") queda dentro de su zona: `document.elementFromPoint` en el centro de la etiqueta devuelve la forma de su propia zona (la capa de etiquetas es `pointer-events-none`), y su caja no se cruza con la de otra etiqueta ni con "ESCENARIO";
  - a 768 y 1440 se ven las píldoras "Últimas entradas" de VIP, Mezanine, Preferencial y General (comedia).

  Se adjuntan capturas de los 4 mapas a 375 y 1440.
- [ ] Dado cada evento y ancho, entonces no hay scroll horizontal: `document.documentElement.scrollWidth ≤ window.innerWidth`, en el sub-paso 1 y en cada sub-paso 2.
- [ ] Dada cada zona numerada no agotada (`norte`, `platea`, `mezanine`, `preferencial` de la comedia, y `occidente` y `oriente` del festival), cuando se abre desde su tarjeta, entonces el sub-paso 2 es el plano en arco:
  - dentro del `<svg aria-label="Plano de asientos de <zona>">` está el fondo del estadio (`g[aria-hidden][transform]`, con la zona abierta resaltada);
  - no hay barra "ESCENARIO";
  - está el minimapa (`svg[aria-hidden][viewBox="<viewBox del mapa>"]`).

  Se adjuntan capturas a 375 y 1440.
- [ ] Dado ese plano a 768 y 1440, con el plano entero a la vista (sin zoom), entonces la caja de ningún `[data-seat-id]` se cruza con la del grupo "Zoom del plano" ni con la del minimapa. Se anota la holgura mínima por zona y ancho para el requisito 10.
- [ ] Dado ese plano a 375, entonces cada `[data-seat-id]` mide ≥ 24 px de ancho con el plano entero a la vista.
- [ ] Dada Mesa (agotada), cuando se pulsa su forma o su tarjeta, entonces no se abre nada (como hoy).
- [ ] Dadas estas URLs, entonces cada una muestra el formulario de pago con la butaca en el resumen, y no "No pudimos preparar tu compra":
  - `/checkout?evento=la-casa-de-los-espejos&platea=1&asientos=platea-F-8` (butaca de la orden demo);
  - `/checkout?evento=noche-de-sintetizadores-lima&norte=1&asientos=norte-A-1`;
  - `/checkout?evento=la-casa-de-los-espejos&mezanine=1&asientos=mezanine-A-3`;
  - `/checkout?evento=risas-sin-filtro&preferencial=1&asientos=preferencial-A-5`.
- [ ] Dada `/checkout?evento=la-casa-de-los-espejos&platea=2&asientos=platea-F-7,platea-F-8`, entonces muestra "No pudimos preparar tu compra", igual que hoy: `platea-F-7` está ocupada (decisión 4).

## Diseño técnico
- **Rutas (`app/`):** sin cambios.
- **Componentes:** ninguno nuevo ni modificado. Se usan los existentes:
  - `modules/seating/components/VenueMapView.tsx`: dibuja cualquier `path` (los arcos ya funcionan con el festival);
  - `ZoneCards.tsx`;
  - `SeatPlan.tsx`: el arco frente a la cuadrícula lo decide `zone.planTransform`;
  - `SeatPlanMinimap.tsx`;
  - `SeatGridPreview.tsx`.

  No se instala nada de shadcn.
- **Datos** (`modules/seating/data/`):
  - `stadium.mock.ts`: nuevo; centro, escenario y tipo `MockVenue` compartidos por los 4 recintos. No existe hoy porque el escenario solo lo usaba el festival.
  - `festivalViveLatino.mock.ts`, `nocheDeSintetizadores.mock.ts`, `laCasaDeLosEspejos.mock.ts` y `risasSinFiltro.mock.ts`: nuevos, uno por recinto (decisión 9).
  - `venueMaps.mock.ts`: pasa a ser el agregador.
- **Utils, schema, service y hooks:** sin cambios. Se reutilizan:
  - `getAnnularSectorPath`, `getArcPoints` y `AnnularSector` (`utils/annularSector.ts`);
  - `generateArcSeatRows` (`utils/arcSeatRows.ts`);
  - `venueLayoutSchema` (`schemas/seating.schema.ts`);
  - `getVenueMapBySlug` (`services/seating.service.ts`).
- **Contrato** (interno del mock; sin API):

  ```ts
  // modules/seating/data/stadium.mock.ts
  import type { z } from "zod";
  import type { venueLayoutSchema } from "../schemas/seating.schema";
  import type { AnnularSector } from "../utils/annularSector";

  export type MockVenue = {
    layout: z.input<typeof venueLayoutSchema>;
    /** `stage` + un sector por id de zona, en coordenadas del mapa. Obligatorio desde T5. */
    sectors?: Record<string, AnnularSector>;
  };
  ```

  `VenueLayout`, `VenueMap`, el contrato B (`getVenueMapBySlug`, `resolveSeats`, ids `<zona>-<FILA>-<n>`) y el C (`asientos=`) no cambian.
- **Diseño:** `design-system/ticketera/pages/ticket-selection.md` (requisito 10). MASTER no cambia.

## Reutilización
- **Del festival (spec del estadio, Fase 1):**
  - geometría de sectores (`annularSector.ts`) y generador de butacas en arco (`arcSeatRows.ts`);
  - escenario con luces y convención de ángulos;
  - patrón de invariantes de `seating.service.test.ts`.
- **De la Fase 5 de la spec del estadio:** fondo del estadio, lienzo 16:10 y minimapa en `SeatPlan`. Se activan solos con `planTransform`.
- **Ocupación determinista** con `getGeneratedSeatStatus` (`utils/seatRows.ts`): mantener el `occupiedRatio` conserva el estado de las butacas que siguen existiendo (decisión 4).
- `resolveSeats` (`utils/seatIds.ts`) para comprobar en los tests que las butacas de ejemplo resuelven con su etiqueta.
- Nada nuevo de shadcn ni dependencias.

## Tests
Según `docs/SETUP.md` §3, los datos mock no son una unidad con lógica propia. Aun así, sus invariantes se prueban porque de ellas dependen el plano, el checkout y las órdenes demo (como en la spec del estadio). No hay componentes, hooks ni utils nuevos que exijan tests.

- **`modules/seating/services/seating.service.test.ts`:**
  - **T1:**
    - Importa `STADIUM_CENTER`/`STAGE_SECTOR`/`STADIUM_STAGE` de `stadium.mock.ts`, `VIVE_LATINO_SECTORS` de `festivalViveLatino.mock.ts` y `VENUE_SECTORS_MOCK` del agregador.
    - El grupo "invariantes del mapa curvo festival-vive-latino-lima" pasa a `describe.each(CURVED_SLUGS)`, con `CURVED_SLUGS = Object.keys(VENUE_SECTORS_MOCK)`. Cubre todas las invariantes del requisito 6:
      - "todos los sectores son concéntricos" y "el escenario es el compartido";
      - "cada path es el de su sector": las claves de `sectors` (sin `stage`) coinciden con los ids de zona, en orden;
      - márgenes, solapes y `labelPos`;
      - por cada zona numerada: `planTransform`, butacas en la banda, letras de fila y, si no está agotada, disponibles y accesibles.
    - El grupo "invariantes del mapa rectangular" pasa a recorrer `MAP_SLUGS` filtrados a los que **no** están en `VENUE_SECTORS_MOCK`.
    - Se borra el test "%s: el texto del escenario está centrado en su forma", con sus valores (300, 38) y (300, 40). Lo cubren "labelPos en el centro del rectángulo" (rectangulares) y "el escenario es el compartido" (curvos).
    - Los tests específicos del festival, los de `getVenueMapBySlug`/`hasVenueMap`, "reparto de la ocupación" y "tonos" no cambian.
  - **T5:** se borran el grupo rectangular, `RECT_PATH`, `rectCenter` y `RECT_MAP_SLUGS` (requisito 9).
- **`modules/seating/data/nocheDeSintetizadores.mock.test.ts`** (nuevo, T2), con `getVenueMapBySlug`:
  - `viewBox`;
  - los sectores exactos de `SINTETIZADORES_VENUE.sectors` (requisito 3) y los `labelPos`;
  - Norte: filas, butacas por fila, `seatViewBox`, `planTransform.scale` y accesibles exactas;
  - `resolveSeats` de `norte-A-1` con su etiqueta.
- **`modules/seating/data/laCasaDeLosEspejos.mock.test.ts`** (nuevo, T3):
  - `viewBox`, sectores y `labelPos`;
  - Platea y Mezanine: filas, butacas por fila, `seatViewBox`, escala y accesibles exactas;
  - `platea-F-7` existe y está ocupada; `platea-F-8` resuelve con "Platea · Fila F · Asiento 8"; `mezanine-A-3` resuelve.
- **`modules/seating/data/risasSinFiltro.mock.test.ts`** (nuevo, T4):
  - `viewBox`, sectores y `labelPos`;
  - Mesa con todas sus butacas ocupadas y sin accesibles;
  - Preferencial: filas, butacas, `seatViewBox`, escala y accesibles exactas;
  - `preferencial-A-5` resuelve;
  - General de pie con su capacidad.
- **Sin cambios** (requisito 7): `TicketSelection.test.tsx`, `useSeatSelection.test.ts`, `seatIds.test.ts`, `seatNavigation.test.ts`, `bestSeats.test.ts`, `selectionSummary.test.ts`, `arcSeatRows.test.ts`, `seating.schema.test.ts`, `zoneTone.test.ts`, `events.service.test.ts`, `checkout.service.test.ts` (y el resto de `modules/checkout`) y `demoOrders.test.ts`.
- **Verificación final** del reviewer:
  - `npx vitest run`, `npm run lint` y `npm run build`;
  - el script Playwright de "Verificación visual".

## Plan de tareas
**Coordinación:**
- Empieza cuando esté cerrada la Fase 5 de `docs/specs/seating-stadium-map.md`. No se ejecuta en la misma sesión que ninguna de sus fases (decisión 10).
- Los developers en paralelo verifican con `npx vitest run modules/seating` y `npx eslint <sus archivos>`, y no ejecutan `build`.
- El reviewer ejecuta al final la verificación completa y el script de Playwright.

### Fase 1. Recintos curvos (5 tareas, 11 archivos)
- [ ] T1. Datos compartidos del estadio y reparto del mock en un archivo por recinto, sin cambio de datos; invariantes de `seating.service.test.ts` guiadas por los datos (requisitos 1, 2 y 6; tests de T1).
  - Archivos: `modules/seating/data/stadium.mock.ts` (nuevo), `modules/seating/data/festivalViveLatino.mock.ts` (nuevo), `modules/seating/data/nocheDeSintetizadores.mock.ts` (nuevo, layout rectangular de hoy), `modules/seating/data/laCasaDeLosEspejos.mock.ts` (nuevo, ídem), `modules/seating/data/risasSinFiltro.mock.ts` (nuevo, ídem), `modules/seating/data/venueMaps.mock.ts`, `modules/seating/services/seating.service.test.ts`.
  - Depende de: —.
  - Secuencial (base: toca el agregador y el test compartido).
  - Verificar `npx vitest run modules/seating modules/checkout modules/tickets` y el `JSON.stringify` idéntico.
- [ ] T2. Arena curva (requisito 3), con su test.
  - Archivos: `modules/seating/data/nocheDeSintetizadores.mock.ts`, `modules/seating/data/nocheDeSintetizadores.mock.test.ts` (nuevo).
  - Depende de: T1.
  - En paralelo con T3 y T4.
- [ ] T3. Teatro curvo (requisito 4), con su test.
  - Archivos: `modules/seating/data/laCasaDeLosEspejos.mock.ts`, `modules/seating/data/laCasaDeLosEspejos.mock.test.ts` (nuevo).
  - Depende de: T1.
  - En paralelo con T2 y T4. Verificar también `npx vitest run modules/tickets` (órdenes demo).
- [ ] T4. Comedia curva (requisito 5), con su test.
  - Archivos: `modules/seating/data/risasSinFiltro.mock.ts`, `modules/seating/data/risasSinFiltro.mock.test.ts` (nuevo).
  - Depende de: T1.
  - En paralelo con T2 y T3.
- [ ] T5. Cierre: `sectors` obligatorio, tests sin rama rectangular y diseño de página (requisitos 9 y 10). Las holguras medidas del requisito 10 las aporta la verificación Playwright: el developer la ejecuta con el script del criterio, y el reviewer la repite.
  - Archivos: `modules/seating/data/stadium.mock.ts`, `modules/seating/data/venueMaps.mock.ts`, `modules/seating/services/seating.service.test.ts`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T2, T3 y T4.
  - Secuencial.

## Preguntas abiertas
1. **Menos butacas por zona numerada** (decisiones 2 y 3). Para que los planos curvos cumplan ≤ 10 butacas por fila, ≤ 400 de ancho (butacas ≥ 24 px a 375 px) y no choquen con el minimapa ni con el zoom, se reducen las butacas:
   - Platea: 94 → 45;
   - Mezanine: 60 → 26;
   - Tribuna Norte: 80 → 27;
   - Preferencial de la comedia: 60 → 18.

   ¿Se acepta? La alternativa es relajar el límite de 10 butacas por fila (filas más largas, butacas de < 24 px con el plano entero a la vista, que se eligen acercando el plano). Afectaría a la spec base (decisión 10, WCAG 2.5.8) y a las tribunas del festival.
2. **Solapes a 640 y 1024 px** (decisión 7). Con el plano entero a la vista, el zoom o el minimapa tocan alguna butaca:
   - a 640, Platea (−2.8 px);
   - a 1024, Platea, Norte y también las tribunas actuales del festival.

   No se puede arreglar solo con datos. ¿Se quiere una enmienda que reserve la franja inferior también en arco (`SeatPlan` y el cálculo del recuadro del minimapa) para garantizarlo en todos los anchos desde `sm`?
