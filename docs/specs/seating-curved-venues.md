# Recintos curvos en todos los mapas ("Elige tus entradas" como estadio)

- Módulo: seating
- Estado: aprobado

## Objetivo
Que el sub-paso 1 de "Elige tus entradas" (`/eventos/<slug>/entradas`) se vea como un estadio en **todos** los eventos con mapa, igual que el de "Festival Vive Latino Lima" (captura objetivo `images/20.png`): escenario semicircular navy con luces, zonas en anillos o sectores concéntricos separados en blanco y etiquetas con nombre y precio. Hoy los otros 3 recintos (`images/19.png`: "La casa de los espejos" con Escenario, Platea y Mezanine como rectángulos) usan rectángulos, y sus zonas numeradas abren un plano en cuadrícula sin fondo ni minimapa.

**Pedido del usuario:** "que la vista de 'Elige tus entradas' sea como un estadio en todos los eventos". Se buscaron librerías y ninguna dibuja el estadio por sí sola. El usuario eligió **mantener el SVG propio y curvar los recintos**, sin cambiar de librería. Por eso es un cambio de **datos mock** (y de sus tests): no cambia ningún componente.

**Respuesta del usuario (2026-10-04):** se mantienen las butacas actuales de cada zona. Acepta que, en móvil y con el plano entero a la vista, las butacas de esos recintos queden por debajo de 24 px y haya que acercar el plano para tocarlas (decisión 3).

Es una continuación de `docs/specs/seating-stadium-map.md` ("spec del estadio", aprobada), que no se edita. Siguen vigentes sus requisitos 1–31 y sus decisiones, salvo lo que esta spec enmienda de forma explícita:
- la decisión 3 y su "No incluye: mapas curvos para los otros 3 eventos": ahora los 4 recintos son curvos;
- el requisito 8, en dos puntos:
  - su última viñeta ("ninguna zona numerada sin `planTransform` cambia"): ya no queda ninguna en los mocks;
  - los límites de tamaño del plano que hereda de la spec base, que se exceptúan para estos 3 recintos (decisión 3).

También sigue vigente la spec base, `docs/specs/seating-ticket-selection.md`: su requisito 7 (≤ 10 butacas por fila, ≤ 12 filas y `seatViewBox` de ≤ 400 de ancho) y su decisión 10 (butacas ≥ 24 px a 375 px con el plano entero), salvo la misma excepción.

**Enmienda (2026-10-04), tras el PR #6 (`docs/specs/data-foundation.md`):** los mapas ya no se leen de los mocks, sino de Postgres, y el seed los copia desde los mocks. Esta enmienda añade la tarea T1b (test del seed independiente de la geometría), la verificación con y sin BD y el paso de volver a sembrar la BD (decisión 11). T1 ya está hecha. El resto de la spec no cambia.

## Alcance
- Incluye:
  - **Datos compartidos del estadio:** centro común y escenario (sector, `path`, `labelPos` y 7 luces) idénticos a los del festival, usados por los 4 recintos.
  - **Un archivo de datos por recinto**, más un agregador que mantiene `VENUE_LAYOUTS_MOCK` con el mismo orden y contenido para el service. Así cada recinto se puede rehacer en paralelo.
  - **Geometría curva para los 3 recintos**, con las mismas butacas por zona que hoy (valores concretos en los requisitos 3–5):
    - arena `noche-de-sintetizadores-lima`: VIP, Preferencial y General de pie en anillos de 112°, y Tribuna Norte numerada al fondo (66°);
    - teatro `la-casa-de-los-espejos`: Platea y Mezanine numeradas, en abanico de 84° frente al escenario;
    - comedia `risas-sin-filtro`: Mesa (agotada) y Preferencial numeradas, y General de pie, las tres en media luna de 98°.
  - Las zonas numeradas de los 3 recintos pasan a plano **en arco** (`generateArcSeatRows`, con `planTransform`). Heredan el fondo del estadio, el lienzo apaisado desde `sm` y el minimapa, que ya implementa `SeatPlan` (requisitos 28–30 de la spec del estadio).
  - **Excepción de tamaño** (decisión 3) para las zonas numeradas de estos 3 recintos:
    - sin el límite de 10 butacas por fila;
    - `seatViewBox` de hasta 622 de ancho, para que un solo "Acercar" deje las butacas en ≥ 24 px a 375 px.
  - **Invariantes del mapa curvo** (requisito 8 de la spec del estadio) generalizadas a los 4 mapas, más tests por recinto con los valores exactos.
  - **Compatibilidad:** se conservan los ids de zona y de `ticketTypeId`, el orden de las zonas, las capacidades de pie, las butacas por zona numerada, la ocupación por zona y las butacas que usan las órdenes demo (`platea-F-7` y `platea-F-8`).
  - Actualización del diseño de página `design-system/ticketera/pages/ticket-selection.md`.
  - **Test del seed independiente de la geometría** (T1b, requisito 11): `lib/db/seed/buildSeedData.test.ts` deriva de los mocks el `mapViewBox` de cada recinto y qué secciones tienen `planTransform`, en lugar de fijarlos. Así T2–T4 no lo tocan (decisión 11).
- No incluye:
  - Cambios en `lib/db`, salvo el test de T1b. `buildSeedData.ts`, `seed.ts`, `testGlobalSetup.ts`, el esquema y las migraciones no cambian: el seed ya copia los mocks.
  - Un script para vaciar la BD de desarrollo. Volver a sembrarla es un paso manual (decisión 11).
  - Cambios en componentes, hooks, utils, schema o service de `seating`. `VenueMapView`, `ZoneCards`, `SeatPlan`, `SeatPlanMinimap`, `generateArcSeatRows`, `getAnnularSectorPath` y `venueLayoutSchema` se usan tal cual.
    - El arreglo de `SeatPlan` que dimensiona la pastilla de zoom y el minimapa según el ancho del lienzo (decisión 7) es de otro trabajo, ya en curso. Esta spec depende de él.
  - Cambiar de librería o añadir dependencias.
  - Cambios en `modules/events` (nombres, precios, estados, orden de `ticketTypes`), `modules/checkout` o `modules/tickets`: no hace falta (requisito 7).
  - Rehacer el mapa del festival: solo pasa a su propio archivo y usa el escenario compartido, sin cambiar ningún valor. Mantiene los límites originales (≤ 10 butacas por fila, ≤ 400 de ancho).
  - Quitar el soporte de cuadrícula: queda para mapas sin geometría y para `SeatGridPreview` (decisión 6).
  - Abrir el plano ya acercado en móvil o cambiar el paso de "Acercar": el usuario acerca con el botón o pellizcando, como hoy.

## Decisiones
1. **Solo datos, mismo lenguaje que el festival.** Los 4 recintos comparten:
   - el centro `STADIUM_CENTER = { cx: 300, cy: 54 }`;
   - el escenario del festival: sector 0–90 de −10° a 190°, "ESCENARIO" en (300, 70) y 7 luces `getArcPoints(300, 54, 76, 40, 140, 7)`;
   - zonas como sectores anulares concéntricos (`getAnnularSectorPath`), con 8 unidades de separación radial entre anillos (12 entre el escenario y el primer anillo), como en el festival.

   Un radio de 90 es el mínimo para que "ESCENARIO" (`text-xs`, ~85 px a 375 px) quepa en el escenario: por eso tampoco el de la comedia es más pequeño.
2. **Barrido de cada zona.** Con las butacas de hoy, cada zona numerada usa el mayor barrido que cumple a la vez:
   - las butacas exactas de la zona;
   - Platea con fila F de ≥ 8 butacas;
   - un plano de ≤ 622 de ancho (decisión 3);
   - mapa de ≤ 600 de ancho, con ≥ 4 de margen;
   - todas las invariantes del requisito 6.

   | Recinto | Zonas | Barrido |
   |---|---|---|
   | Arena | de pie (VIP, Preferencial, General) | 112° (34°–146°), como el festival |
   | Arena | Tribuna Norte | 66° (57°–123°) |
   | Teatro | Platea y Mezanine | 84° (48°–132°) |
   | Comedia | las tres zonas | 98° (41°–139°) |

   Los ~120° del festival no caben en las numeradas:
   - **Tribuna Norte:** es un anillo exterior, lejos del centro, así que sus filas son largas. Con más barrido, su plano supera los 622 de ancho, o el mapa supera ~600 de alto.
   - **Teatro y comedia:** con más barrido, el anillo exterior se sale del ancho 600 del mapa.
3. **Excepción de tamaño para los 3 recintos, por decisión del usuario.**
   - **Qué conserva:** el usuario prefiere conservar las butacas por zona de hoy antes que el tamaño mínimo con el plano entero.
   - **Qué se exceptúa:** para las zonas numeradas de `noche-de-sintetizadores-lima`, `la-casa-de-los-espejos` y `risas-sin-filtro`, esta spec exceptúa dos límites:
     - el límite de ≤ 10 butacas por fila y de `seatViewBox` de ≤ 400 de ancho, que el requisito 8 de la spec del estadio hereda del requisito 7 de la spec base;
     - el mínimo de 24 px por butaca a 375 px con el plano entero (decisión 10 de la spec base, WCAG 2.5.8).
   - **Cómo se elige en móvil:**
     - Con el plano entero a la vista, a 375 px, las butacas miden ~16–17 px (área de toque de 32 unidades) y sirven para ver el plano.
     - Para elegir, se acerca con el control "Acercar" o pellizcando, que ya existen.
     - "Acercar" sube la escala en 0.5 (`react-zoom-pan-pinch` 4.2.0: de 1 a 1.5), así que tras **un** "Acercar" el área de toque mide 1.5 × 32 × 311 / ancho del plano. Por eso el ancho máximo es 622: así queda en ≥ 24 px.
   - **Qué se mantiene:** ≤ 12 filas por zona.
   - **El festival** no cambia y mantiene los límites originales.
   - **Teclado y lector:** no les afecta. Las butacas siguen siendo `role="checkbox"` con roving tabindex, y el foco acerca el plano si la butaca queda fuera de la vista.
4. **Mismas butacas y mismo `occupiedRatio` por zona** (norte 0.3, platea 0.4, mezanine 0.85, mesa 1, preferencial 0.8).
   - **Filas:** cambia su número y las butacas por fila (el arco tiene filas más cortas cerca del escenario), no el total.

     | Zona | Hoy (cuadrícula) | Con arco |
     |---|---|---|
     | `norte` (arena) | A–H × 10 = 80 | A–F: 10, 12, 13, 14, 15, 16 = 80 |
     | `platea` (teatro) | A–J: 8, 8, 9, 9, 10×6 = 94 | A–H: 7, 8, 10, 11, 12, 14, 15, 17 = 94 |
     | `mezanine` (teatro) | A–F × 10 = 60 | A–D: 13, 14, 16, 17 = 60 |
     | `mesa` (comedia, agotada) | A–C × 8 = 24 | A–C: 6, 8, 10 = 24 |
     | `preferencial` (comedia) | A–F × 10 = 60 | A–D: 12, 14, 16, 18 = 60 |

   - **Estados:** el estado de una butaca generada depende solo de su id, de la proporción y de la lista de accesibles (`getGeneratedSeatStatus`). Así, toda butaca que sigue existiendo conserva su estado, salvo las que pasan a accesibles (decisión 5). En particular:
     - `platea-F-8` sigue `available`;
     - `platea-F-7` sigue `occupied`, como hoy: es la butaca que compró la cuenta demo, para una función ya pasada.
5. **Butacas accesibles nuevas.** Las de hoy (`norte-H-*`, `platea-J-*`, `preferencial-F-*`) desaparecen con sus filas. Se eligen en la última fila: el extremo si está libre o, si no, la butaca libre más cercana a cada extremo.

   | Zona | Accesibles |
   |---|---|
   | `norte` | `norte-F-1`, `norte-F-15` |
   | `platea` | `platea-H-1`, `platea-H-15` |
   | `mezanine` | `mezanine-D-16` (nueva: la invariante del arco exige ≥ 1 accesible) |
   | `preferencial` (comedia) | `preferencial-D-3`, `preferencial-D-12` |
   | `mesa` | ninguna (agotada: todas ocupadas) |

6. **La cuadrícula se queda en el código, no en los mocks.**
   - `SeatPlan` sigue dibujando en cuadrícula, con la barra "ESCENARIO" y sin fondo ni minimapa, toda zona numerada sin `planTransform`. Es el caso de un mapa futuro sin geometría.
   - `SeatGridPreview` (vista previa del organizer) sigue usando `generateSeatRows`.
   - Se mantienen `generateSeatRows` y sus tests, y los tests de `TicketSelection.test.tsx`, que usan fixtures propios en cuadrícula (`MAP`) y en arco (`ARC_MAP`), no los mocks.
   - Los 4 recintos mock pasan a arco.
7. **0 solapes de controles con butacas desde 640 px, gracias al arreglo de `SeatPlan` en curso.**
   - **El arreglo** (fuera de esta spec): dimensiona la pastilla de zoom y el minimapa según el ancho del lienzo, para que no tapen butacas con el plano entero en ningún ancho ≥ 640 px. Esta spec lo exige en sus criterios y depende de que esté cerrado.
   - **Referencia** con los tamaños de hoy:
     - pastilla de 148 × 52 px y minimapa de 112 px (96 px por debajo de `md`), a 12 px de las esquinas;
     - lienzo 16:10 de 576, 688, 516 y 772 px de ancho a 640, 768, 1024 y 1440;
     - caja de cada butaca = su área de toque de 32 × 32 unidades.

     Holgura mínima entre cajas, en px (zoom / minimapa):

     | Zona | 640 | 768 | 1024 | 1440 |
     |---|---|---|---|---|
     | `norte` | 11.5 / −0.5 | 36.0 / 4.4 | 3.6 / −27.7 | 48.3 / 20.1 |
     | `platea` | −5.8 / 30.6 | 18.8 / 41.4 | −11.9 / 3.1 | 28.9 / 59.1 |
     | `mezanine` | 31.9 / 8.0 | 58.8 / 14.3 | 21.9 / −15.2 | 75.6 / 28.8 |
     | `preferencial` (comedia) | 33.3 / 14.6 | 52.2 / 22.2 | 16.2 / −7.8 | 66.4 / 36.9 |

     Los valores negativos (640 y 1024) son los que resuelve el arreglo. A 375 px los controles van en una barra sobre el lienzo y no se superponen.
   - La verificación final la hace Playwright.
8. **Numeración en arco:** la de la spec del estadio (decisión 7). En los sectores que abren hacia abajo, la butaca 1 de cada fila es la del extremo derecho del mapa (ángulo menor) y la fila A es la más cercana al escenario.
9. **Un archivo por recinto para trabajar en paralelo.**
   - **T1** reparte el mock actual en 5 archivos sin cambiar ningún dato, más un agregador. También deja los tests de invariantes listos para que T2–T4 no los toquen:
     - las invariantes del mapa curvo se aplican a cada recinto que exporta `sectors`, y las del rectángulo a los que no;
     - el límite de tamaño se lee de un único conjunto de slugs exceptuados.
   - **T1b** hace lo mismo con el test del seed (decisión 11).
   - **T2–T4** rehacen cada uno solo su archivo y su test.
   - **T5** cierra: hace obligatorio `sectors`, borra la rama rectangular de los tests y actualiza el diseño de página.
10. **Orden de implementación:**
    - Dentro de la fase: T1, T1b, T2–T4 en paralelo y T5.
    - Va después de cerrar la **Fase 5** de la spec del estadio (fondo, lienzo apaisado y minimapa en `SeatPlan`) y el **arreglo de controles** de la decisión 7.
    - No se ejecuta en la misma sesión que ninguna fase de la spec del estadio. Su Fase 6 T4 toca `ticket-selection.md`, igual que T5.
11. **Base de datos y seed (PR #6, `docs/specs/data-foundation.md`).**
    - **Contexto:**
      - `getVenueMapBySlug` lee de Postgres. `lib/db/seed/buildSeedData.ts` siembra recintos, secciones y butacas desde `VENUE_LAYOUTS_MOCK`: los layouts nuevos llegan a la BD sin tocar el seed.
      - Los tests que leen el mapa (`seating.service.test.ts`, `checkout.service.test.ts`, `demoOrders.test.ts`, y la parte con BD de los tests por recinto) usan `describeWithDb`: sin `DATABASE_URL_TEST` se omiten.
      - Con `DATABASE_URL_TEST`, `lib/db/testGlobalSetup.ts` vacía y vuelve a sembrar la BD de test en cada `vitest run`. Dos ejecuciones simultáneas chocan.
      - El seed usa `onConflictDoNothing`. En una BD ya sembrada no actualiza las secciones (`mapPath`, `planTransform`, `seatViewBox`) ni las butacas existentes, y no borra las que desaparecen (p. ej. `norte-H-*`). Por eso, para ver los recintos curvos, hay que **vaciar la BD** y volver a sembrarla.
    - **Por qué T1b:** `buildSeedData.test.ts` fija datos que T2–T4 cambian. Espera `mapViewBox: "0 0 600 560"` para el Estadio Nacional, y T2 lo pasa a `"0 0 600 580"`. También espera que solo `occidente` y `oriente` tengan `planTransform` y que ninguna sección fuera de la Costa Verde tenga `planTransform` ni `wrapLabel`. Si cada tarea lo arreglara, T2–T4 tocarían el mismo archivo y no podrían ir en paralelo. T1b lo hace independiente de la geometría antes de T2–T4 (requisito 11). Está en `lib/` (archivo compartido), así que va en secuencia. El total de 456 butacas de recinto se mantiene, porque cada zona conserva sus butacas (decisión 4).
    - **Verificación:**
      - **T2–T4, en paralelo:** ejecutan sus tests **sin BD**, con `DATABASE_URL_TEST= npx vitest run <rutas>`. La variable vacía anula la de `.env`, y los bloques con BD se omiten.
      - **Suite completa con BD, de uno en uno:** al terminar su tarea, cada developer ejecuta `npx vitest run` con `DATABASE_URL_TEST`, por turnos. El orquestador nunca lanza dos ejecuciones con BD a la vez. El reviewer la repite al final.
      - **Antes de `npm run build` o de Playwright:** se vuelve a sembrar la BD de desarrollo (`DATABASE_URL`), porque el build prerenderiza las rutas `/eventos/<slug>/entradas` desde ella. Se vacían sus tablas de `public` (`TRUNCATE … CASCADE`, como hace `testGlobalSetup` con la de test) o se recrea la rama `dev` de Neon, y después `npm run db:migrate && npm run db:seed`.
    - **BD de la sesión de implementación (autorizado por el usuario, 2026-10-04):** en la sesión que implementa esta spec, `DATABASE_URL` y `DATABASE_URL_TEST` apuntan a un Postgres 16 local del entorno de pruebas (`127.0.0.1:5433`, bases `ticketera_dev` y `ticketera_test`), desechable y ajeno a la BD de Neon del usuario. El developer de T5 y el reviewer pueden vaciar y volver a sembrar `ticketera_dev` sin preguntar. La BD de Neon del usuario no se toca desde la sesión.
    - **Tras el merge:** el usuario vuelve a sembrar la BD de desarrollo de su máquina de la misma forma (vaciar o recrear la rama `dev` de Neon y `npm run db:migrate && npm run db:seed`). Si no lo hace, verá los mapas rectangulares de antes. Vaciarla borra también los datos creados a mano en esa BD (órdenes, eventos de prueba).

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
- "375 px": área de toque de una butaca con el plano entero (lienzo de 311 px) y tras un "Acercar" (×1.5).

Los valores son definitivos: están verificados con el `generateArcSeatRows` real contra todas las invariantes. Si la verificación visual exigiera cambiarlos, primero se actualiza esta spec.

3. **Arena `noche-de-sintetizadores-lima`** (T2), `viewBox` `"0 0 600 580"`:

   | Zona | Tipo | Sector (radios · ángulos) | `labelPos` |
   |---|---|---|---|
   | `vip` | general (1500) | 102–166 · 34°…146° | (300, 188) |
   | `preferencial` | general (4000) | 174–236 · 34°…146° | (300, 259) |
   | `general` | general (12000) | 244–306 · 34°…146° | (300, 329) |
   | `norte` | numbered | 314–518 · 57°…123° | (300, 470) |

   - **Plano de `norte`:** `generateArcSeatRows({ scale: 0.96, rowLabels: A–F, occupiedRatio: 0.3, accessibleSeats: ["norte-F-1","norte-F-15"] })`.
     - Filas: 10, 12, 13, 14, 15 y 16 butacas (80).
     - `seatViewBox` `"0 0 590 293"`; `planTransform` ≈ { 0.96, 6.84, −280.65 }.
     - Área de toque a 375 px: 16.9 px con el plano entero y 25.3 px tras un "Acercar".
   - VIP es `low-stock`: su banda de 64 aloja la píldora "Últimas entradas" desde `md` (~53 unidades a 768 px).
   - Las bandas de 62–64 alojan nombre y precio a 375 px (~58 unidades).
   - El margen mínimo con el `viewBox` es 8 (Norte abajo).
   - Norte tiene 53 butacas disponibles, 25 ocupadas y 2 accesibles. Ninguna fila supera el 38 % de ocupadas.
4. **Teatro `la-casa-de-los-espejos`** (T3), `viewBox` `"0 0 600 484"`:

   | Zona | Tipo | Sector | `labelPos` |
   |---|---|---|---|
   | `platea` | numbered | 102–281 · 48°…132° | (300, 245) |
   | `mezanine` | numbered | 289–422 · 48°…132° | (300, 409) |

   - **Plano de `platea`:** `generateArcSeatRows({ scale: 1.455, rowLabels: A–H, occupiedRatio: 0.4, accessibleSeats: ["platea-H-1","platea-H-15"] })`.
     - Filas: 7, 8, 10, 11, 12, 14, 15 y 17 butacas (94).
     - `seatViewBox` `"0 0 596 347"`; `planTransform` ≈ { 1.455, −138.92, −164.86 }.
     - Área de toque a 375 px: 16.7 px con el plano entero y 25.0 px tras un "Acercar".
   - **Plano de `mezanine`:** `generateArcSeatRows({ scale: 0.995, rowLabels: A–D, occupiedRatio: 0.85, accessibleSeats: ["mezanine-D-16"] })`.
     - Filas: 13, 14, 16 y 17 butacas (60).
     - `seatViewBox` `"0 0 610 255"`; `planTransform` ≈ { 0.995, 6.46, −243.43 }.
     - Área de toque a 375 px: 16.3 px con el plano entero y 24.5 px tras un "Acercar".
   - Platea conserva la fila F con 14 butacas: `platea-F-7` y `platea-F-8` existen.
   - Ninguna fila de Platea supera el 50 % de ocupadas.
   - Mezanine (`low-stock`) queda con 9 disponibles (entre ellas `mezanine-A-3`) y 1 accesible.
   - El margen mínimo con el `viewBox` es 8.
5. **Comedia `risas-sin-filtro`** (T4), `viewBox` `"0 0 600 450"`:

   | Zona | Tipo | Sector | `labelPos` |
   |---|---|---|---|
   | `mesa` | numbered, agotada | 102–186 · 41°…139° | (300, 198) |
   | `preferencial` | numbered | 194–304 · 41°…139° | (300, 303) |
   | `general` | general (600) | 312–390 · 41°…139° | (300, 405) |

   - **Plano de `mesa`:** `generateArcSeatRows({ scale: 1.195, rowLabels: A–C, occupiedRatio: 1 })`.
     - Filas: 6, 8 y 10 butacas (24), todas ocupadas.
     - `seatViewBox` `"0 0 384 191"`; `planTransform` ≈ { 1.195, −166.75, −120.5 }.
     - Cumple los límites originales. Al estar agotada, no se abre.
   - **Plano de `preferencial`:** `generateArcSeatRows({ scale: 1.205, rowLabels: A–D, occupiedRatio: 0.8, accessibleSeats: ["preferencial-D-3","preferencial-D-12"] })`.
     - Filas: 12, 14, 16 y 18 butacas (60).
     - `seatViewBox` `"0 0 601 261"`; `planTransform` ≈ { 1.205, −61.03, −194.44 }.
     - Área de toque a 375 px: 16.6 px con el plano entero y 24.8 px tras un "Acercar".
   - General es la media luna exterior. Su margen lateral con el `viewBox` es 5.7.
   - Preferencial (`low-stock`) queda con 14 disponibles (entre ellas `preferencial-A-5`) y 2 accesibles.
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
   - **Tamaño del plano, por mapa:**
     - en los 3 recintos de la decisión 3 (`ZOOM_TO_PICK_SLUGS` en el test): ≤ 12 filas y `seatViewBox` de ≤ 622 de ancho (`MAX_ZOOM_TO_PICK_PLAN_WIDTH`). Garantiza ≥ 24 px tras un "Acercar" a 375 px;
     - en el resto (festival): el límite de hoy, ≤ 10 butacas por fila, ≤ 12 filas y ≤ 400 de ancho.
   - Siguen las invariantes generales de hoy para los 4 mapas:
     - `viewBox` del mapa de ≤ 600 de ancho;
     - zonas 1:1 con los `ticketTypes`;
     - una zona agotada no tiene butacas elegibles.

### Compatibilidad
7. **Lo que no cambia y lo que se comprobó:**
   - **Mismos datos de zona:** ids de zona, `ticketTypeId`, orden, `kind`, capacidades de pie, butacas por zona numerada, `occupiedRatio` y, desde el evento, nombre, precio y estado. Por tanto, también los tonos de `getZoneTones` y los tests que los fijan (`zoneTone.test.ts` y "tonos con los mapas reales").
   - **Órdenes demo** (`modules/tickets/data/demoOrders.ts`):
     - la única con butacas de un evento con mapa es `MT-9LM2TC`, con `platea-F-7` y `platea-F-8`, y las dos se mantienen con la etiqueta "Platea · Fila F · Asiento 7/8": `demoOrders.test.ts` pasa sin cambios;
     - `MT-3HX9RB` (`occidente-F-12`) es de `clasico-del-pacifico`, que no tiene mapa.
     - No se modifica ningún archivo de `modules/tickets`.
   - **Checkout:**
     - `checkout.service.test.ts` toma butacas `available` y `occupied` de Norte del mapa real de forma dinámica: Norte conserva 53 disponibles y 25 ocupadas;
     - los demás tests de checkout (`checkoutOrder`, `summaryFormat`, `CheckoutForm`) usan ids de fixtures (`platea-B-3`, `tribuna-oriente-L-9`…), no del mapa.
     - No se modifica ningún archivo de `modules/checkout`.
   - **Otros tests de seating** (`useSeatSelection`, `seatIds`, `seatNavigation`, `bestSeats`, `selectionSummary`, `arcSeatRows`, `seating.schema` y `TicketSelection`): usan fixtures propios y no cambian.
   - **`events.service.test.ts`:** no cita butacas ni formas, y no cambia.
   - **Seed** (`lib/db/seed`): `buildSeedData.ts` no cambia. Su test solo cambia en T1b (requisito 11). Siguen valiendo, entre otros:
     - las 456 butacas de recinto;
     - las 8 secciones del Estadio Nacional, en su orden;
     - los estados por evento y por tipo de entrada.

     `venueLayoutRecords.test.ts` recorre `VENUE_LAYOUTS_MOCK` sin fijar valores, y no cambia.
   - **Tests de `seating.service.test.ts` que siguen valiendo con los datos nuevos:**
     - "ninguna fila de norte/platea supera el 70 %": máximos 38 % y 50 %;
     - "norte/platea/preferencial conservan ≥ 1 accesible";
     - "Tribuna Norte: el mejor asiento está en la fila A y no en un extremo": `norte-A-5` de 10.
   - **Ids que dejan de existir** (filas o números fuera del plano nuevo, p. ej. `platea-J-1`, `mezanine-F-1` o `norte-H-10`): un enlace antiguo con ellos se trata como hoy cualquier butaca inexistente:
     - el checkout responde `invalid-tickets` ("No pudimos preparar tu compra");
     - la precarga de la Fase 6 de la spec del estadio los ignora.

     Ninguna orden demo ni test usa estos ids.
8. **Cuadrícula** (decisión 6): sin cambios de código. Tras T5 ningún mock la usa, y sigue cubierta por los tests de `seatRows`, `SeatGridPreview`/organizer y `TicketSelection.test.tsx` (fixture `MAP`).

### Cierre (T5)
9. **Tipos y tests sin rama rectangular:**
   - `MockVenue.sectors` pasa a obligatorio y `VENUE_SECTORS_MOCK` se construye sin filtrar.
   - En `seating.service.test.ts` se borran el grupo "invariantes del mapa rectangular", `RECT_PATH`, `rectCenter` y `RECT_MAP_SLUGS`.
10. **Diseño de página** (`design-system/ticketera/pages/ticket-selection.md`):
    - **"Plano de butacas":**
      - "En arco" pasa a ser "las zonas numeradas de los 4 mapas mock". "En cuadrícula" queda para las zonas sin `planTransform` (mapas sin geometría; hoy ninguno en el mock) y para la vista previa del organizer.
      - Se anota la excepción de la decisión 3: en arena, teatro y comedia, a 375 px con el plano entero las butacas miden ~16–17 px y se eligen tras "Acercar" (≥ 24 px). La ayuda "Toca una butaca para elegirla. Acerca el plano con los botones o pellizcando." ya lo indica.
    - **"Mapa de zonas":** los mapas comparten el centro y el escenario semicircular con 7 luces; las zonas son sectores concéntricos, con los barridos de la decisión 2.
    - **Holguras:** se sustituyen las holguras medidas (zoom y minimapa) por las que mida Playwright en esta spec (la menor por ancho, con la butaca).

### Test del seed (T1b)
11. **`lib/db/seed/buildSeedData.test.ts` sin geometría fija** (decisión 11). Solo cambia este archivo, y sigue sin BD:
    - **"un solo Estadio Nacional con geometría y 8 secciones en su orden":** el `mapViewBox` esperado es el `viewBox` del layout de `noche-de-sintetizadores-lima` en `VENUE_LAYOUTS_MOCK`, no el literal `"0 0 600 560"`. Lo demás se mantiene: ciudad, `createdBy`, "ESCENARIO", las 8 secciones con su orden y `seating`, y qué secciones tienen `mapPath` y capacidad demo.
    - **Nuevo test, "cada recinto con layout guarda el viewBox y el escenario de su layout":** para cada layout de `VENUE_LAYOUTS_MOCK`, el recinto de su evento (`eventBySlug(layout.eventSlug).venueId`) tiene `mapViewBox` igual a `layout.viewBox` y `stage` igual a `layout.stage`.
    - **El test de la Costa Verde:**
      - conserva el escenario igual al del layout, con sus 7 luces;
      - la comparación de `wrapLabel` y `planTransform` de cada zona con su sección pasa a aplicarse a todos los layouts, no solo al del festival;
      - la lista fija `["occidente", "oriente"]` y la aserción "ninguna sección fuera de la Costa Verde tiene `wrapLabel` ni `planTransform`" se sustituyen por aserciones derivadas de los datos.

      Puede partirse en dos tests: uno del escenario de la Costa Verde y otro de `wrapLabel` y `planTransform` en todos los recintos.
    - **Las aserciones derivadas:**
      - **Cada zona y su sección:** para cada layout y cada zona, la sección del recinto de su evento con `slug === zone.id` tiene `wrapLabel` igual a `zone.wrapLabel ?? false`, y `planTransform` igual al de la zona (o `null`).
      - **Secciones sin zona:** las que no corresponden a ninguna zona de ningún layout (p. ej. `popular` o `palco` del Estadio Nacional, o las de los recintos sin mapa) no tienen `wrapLabel` ni `planTransform`.
      - **Qué secciones tienen `planTransform`:** son exactamente las zonas numeradas de los recintos de `VENUE_SECTORS_MOCK`. Se comparan como conjunto de pares (id del recinto, slug).
      - Con los datos de T1, eso es `occidente` y `oriente` de la Costa Verde.
      - Tras cada tarea de T2–T4, se añaden las numeradas de su recinto, sin tocar el test.
    - El resto del archivo no cambia, incluido "siembra 6 categorías, 13 eventos publicados, 1 borrador y 456 asientos de recinto".
    - El test no contiene literales de `viewBox` ni listas de slugs de secciones con `planTransform`.

## Criterios de aceptación
Todos son de la Fase 1.

### Datos (unit tests)
- [ ] Dado T1, cuando se compara `JSON.stringify(VENUE_LAYOUTS_MOCK)` antes y después, entonces es idéntico, y `npx vitest run modules/seating modules/checkout modules/tickets` pasa sin cambiar ningún test fuera de `seating.service.test.ts`.
- [ ] Dado T1b, entonces:
  - `DATABASE_URL_TEST= npx vitest run lib/db/seed/buildSeedData.test.ts` pasa con los datos de T1;
  - el test no contiene `"0 0 600 560"` ni la lista `["occidente", "oriente"]`, y cumple el requisito 11;
  - mantiene la aserción de 456 butacas de recinto.
- [ ] Dados T2, T3 y T4, entonces ninguno modifica `lib/db/seed/buildSeedData.test.ts`, y ese test sigue pasando tras cada tarea y al final.
- [ ] Dado `VENUE_SECTORS_MOCK` tras T5, entonces:
  - tiene los 4 slugs con mapa y cada uno cumple todas las invariantes del requisito 6;
  - las zonas numeradas de arena, teatro y comedia tienen `seatViewBox` de ≤ 622 de ancho y ≤ 12 filas;
  - las del festival siguen con ≤ 10 butacas por fila y ≤ 400 de ancho.
- [ ] Dado `getVenueMapBySlug("noche-de-sintetizadores-lima")`, entonces:
  - `viewBox` es `"0 0 600 580"` y los sectores, los `labelPos` y las capacidades son los del requisito 3;
  - las zonas siguen siendo `vip`, `preferencial`, `general` (de pie) y `norte` (numerada);
  - Norte tiene las filas A–F con 10, 12, 13, 14, 15 y 16 butacas (80), `seatViewBox` `"0 0 590 293"` y `planTransform.scale` 0.96;
  - sus accesibles son exactamente `norte-F-1` y `norte-F-15`;
  - `resolveSeats(map, ["norte-A-1"])` da la etiqueta "Tribuna Norte · Fila A · Asiento 1".
- [ ] Dado `getVenueMapBySlug("la-casa-de-los-espejos")`, entonces:
  - `viewBox` es `"0 0 600 484"`;
  - Platea tiene A–H con 7, 8, 10, 11, 12, 14, 15 y 17 butacas (94), `"0 0 596 347"` y escala 1.455;
  - Mezanine tiene A–D con 13, 14, 16 y 17 butacas (60), `"0 0 610 255"` y escala 0.995;
  - las accesibles son exactamente `platea-H-1`, `platea-H-15` y `mezanine-D-16`;
  - `resolveSeats(map, ["platea-F-8"])` da "Platea · Fila F · Asiento 8";
  - `platea-F-7` existe y está `occupied` (como hoy), así que `resolveSeats(map, ["platea-F-7"])` es `null`;
  - `resolveSeats(map, ["mezanine-A-3"])` resuelve.
- [ ] Dado `getVenueMapBySlug("risas-sin-filtro")`, entonces:
  - `viewBox` es `"0 0 600 450"`;
  - Mesa tiene A–C con 6, 8 y 10 butacas (24), todas `occupied`, `"0 0 384 191"` y escala 1.195;
  - Preferencial tiene A–D con 12, 14, 16 y 18 butacas (60), `"0 0 601 261"` y escala 1.205, y sus accesibles son exactamente `preferencial-D-3` y `preferencial-D-12`;
  - General es de pie (600), con sector 312–390 · 41°…139°;
  - `resolveSeats(map, ["preferencial-A-5"])` resuelve.
- [ ] Dado el festival, entonces su layout y sus tests específicos ("devuelve el estadio…", filas 4, 4, 5, 6, 7, 7, 8, 9, 9, 10, `"0 0 399 401"`, 7 luces, `wrapLabel` en las tribunas) no cambian.
- [ ] Dado el pedido demo `MT-9LM2TC`, entonces `demoOrders.test.ts` pasa sin cambios.
- [ ] Dado `npx vitest run` sin BD (`DATABASE_URL_TEST=`) y con BD (`DATABASE_URL_TEST` de `.env`, una sola ejecución a la vez), entonces pasa en los dos casos. Con BD no se omite ningún bloque `describeWithDb`.
- [ ] Dada la BD de desarrollo vaciada y vuelta a sembrar (decisión 11), cuando se ejecutan `npm run lint` y `npm run build`, entonces pasan sin errores. Las 4 rutas `/eventos/<slug>/entradas` siguen prerenderizadas y muestran los mapas curvos.
- [ ] Dado el cierre de la fase, entonces el resumen final al usuario indica que, tras el merge, debe volver a sembrar la BD de desarrollo de su máquina: vaciarla o recrear la rama `dev` de Neon, y ejecutar `npm run db:migrate && npm run db:seed`. Sin ese paso seguirá viendo los mapas rectangulares (decisión 11).

### Verificación visual (Playwright, reviewer)
Se usa un script en el scratchpad del reviewer, con el Chromium de `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`) o `npx -y playwright install chromium`, contra `npm run build && npm run start`, con la BD de desarrollo ya vuelta a sembrar (decisión 11). Se recorren los 4 eventos con mapa a 375 × 812, 640 × 900, 768 × 1024, 1024 × 768 y 1440 × 900.
- [ ] Dado el sub-paso 1 de cada evento, entonces el mapa es curvo como `images/20.png`:
  - el `<svg role="group" aria-label="Mapa de zonas de …">` tiene una forma por zona cuyo `d` contiene arcos (`A`) y ningún rectángulo (`H`/`V`);
  - el escenario es la forma navy semicircular con 7 luces;
  - cada etiqueta (nombre y precio, o "Agotado") queda dentro de su zona: `document.elementFromPoint` en el centro de la etiqueta devuelve la forma de su propia zona (la capa de etiquetas es `pointer-events-none`), y su caja no se cruza con la de otra etiqueta ni con "ESCENARIO";
  - desde `md` se ven las píldoras "Últimas entradas" de VIP, Mezanine, Preferencial y General (comedia).

  Se adjuntan capturas de los 4 mapas a 375 y 1440.
- [ ] Dado cada evento y ancho, entonces no hay scroll horizontal: `document.documentElement.scrollWidth ≤ window.innerWidth`, en el sub-paso 1 y en cada sub-paso 2.
- [ ] Dada cada zona numerada no agotada (`norte`, `platea`, `mezanine`, `preferencial` de la comedia, y `occidente` y `oriente` del festival), cuando se abre desde su tarjeta, entonces el sub-paso 2 es el plano en arco:
  - dentro del `<svg aria-label="Plano de asientos de <zona>">` está el fondo del estadio (`g[aria-hidden][transform]`, con la zona abierta resaltada);
  - no hay barra "ESCENARIO";
  - está el minimapa (`svg[aria-hidden][viewBox="<viewBox del mapa>"]`).

  Se adjuntan capturas a 375 y 1440.
- [ ] Dado ese plano en **todos los anchos ≥ 640** (640, 768, 1024 y 1440), con el plano entero a la vista (sin zoom), entonces la caja de ningún `[data-seat-id]` se cruza con la del grupo "Zoom del plano" ni con la del minimapa. Depende del arreglo de la decisión 7. Se anota la holgura mínima por zona y ancho para el requisito 10.
- [ ] Dado ese plano a 375, entonces:
  - con el plano entero, cada `[data-seat-id]` mide ≥ 24 px de ancho en las zonas del festival y ≥ 16 px en las de arena, teatro y comedia (decisión 3);
  - tras pulsar "Acercar" una vez y esperar la animación, cada `[data-seat-id]` mide ≥ 24 px en todas las zonas;
  - se puede elegir una butaca disponible tocándola, y "Tu compra" (la barra móvil) la cuenta.
- [ ] Dada Mesa (agotada), cuando se pulsa su forma o su tarjeta, entonces no se abre nada (como hoy).
- [ ] Dadas estas URLs, entonces cada una muestra el formulario de pago con la butaca en el resumen, y no "No pudimos preparar tu compra":
  - `/checkout?evento=la-casa-de-los-espejos&platea=1&asientos=platea-F-8` (butaca de la orden demo);
  - `/checkout?evento=noche-de-sintetizadores-lima&norte=1&asientos=norte-A-1`;
  - `/checkout?evento=la-casa-de-los-espejos&mezanine=1&asientos=mezanine-A-3`;
  - `/checkout?evento=risas-sin-filtro&preferencial=1&asientos=preferencial-A-5`.
- [ ] Dada `/checkout?evento=la-casa-de-los-espejos&platea=2&asientos=platea-F-7,platea-F-8`, entonces muestra "No pudimos preparar tu compra", igual que hoy: `platea-F-7` está ocupada (decisión 4).

## Diseño técnico
- **Rutas (`app/`):** sin cambios.
- **Componentes:** ninguno nuevo ni modificado por esta spec. Se usan los existentes:
  - `modules/seating/components/VenueMapView.tsx`: dibuja cualquier `path` (los arcos ya funcionan con el festival);
  - `ZoneCards.tsx`;
  - `SeatPlan.tsx`: el arco frente a la cuadrícula lo decide `zone.planTransform`; "Acercar" ya existe;
  - `SeatPlanMinimap.tsx`;
  - `SeatGridPreview.tsx`.

  El tamaño de la pastilla y del minimapa según el lienzo es del arreglo de la decisión 7. No se instala nada de shadcn.
- **Datos** (`modules/seating/data/`):
  - `stadium.mock.ts`: nuevo; centro, escenario y tipo `MockVenue` compartidos por los 4 recintos. No existe hoy porque el escenario solo lo usaba el festival.
  - `festivalViveLatino.mock.ts`, `nocheDeSintetizadores.mock.ts`, `laCasaDeLosEspejos.mock.ts` y `risasSinFiltro.mock.ts`: nuevos, uno por recinto (decisión 9).
  - `venueMaps.mock.ts`: pasa a ser el agregador.
- **Utils, schema, service y hooks:** sin cambios. El schema no limita butacas por fila ni el ancho del plano: esos límites son invariantes de los tests. Se reutilizan:
  - `getAnnularSectorPath`, `getArcPoints` y `AnnularSector` (`utils/annularSector.ts`);
  - `generateArcSeatRows` (`utils/arcSeatRows.ts`);
  - `venueLayoutSchema` (`schemas/seating.schema.ts`);
  - `getVenueMapBySlug` (`services/seating.service.ts`).
- **Seed y BD** (`lib/db`): sin cambios de código ni migraciones. Solo cambia el test `lib/db/seed/buildSeedData.test.ts` (T1b, requisito 11). Los datos nuevos llegan a la BD al volver a sembrarla (decisión 11).
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
- **Zoom existente** ("Acercar", pellizco y centrado del foco): es la forma de elegir en móvil en los planos grandes (decisión 3).
- **Ocupación determinista** con `getGeneratedSeatStatus` (`utils/seatRows.ts`): mantener el `occupiedRatio` conserva el estado de las butacas que siguen existiendo (decisión 4).
- `resolveSeats` (`utils/seatIds.ts`) para comprobar en los tests que las butacas de ejemplo resuelven con su etiqueta.
- Nada nuevo de shadcn ni dependencias.

## Tests
Según `docs/SETUP.md` §3, los datos mock no son una unidad con lógica propia. Aun así, sus invariantes se prueban porque de ellas dependen el plano, el checkout y las órdenes demo (como en la spec del estadio). No hay componentes, hooks ni utils nuevos que exijan tests.

- **`modules/seating/services/seating.service.test.ts`:**
  - **T1:**
    - Importa `STADIUM_CENTER`/`STAGE_SECTOR`/`STADIUM_STAGE` de `stadium.mock.ts`, `VIVE_LATINO_SECTORS` de `festivalViveLatino.mock.ts` y `VENUE_SECTORS_MOCK` del agregador.
    - **Límite de tamaño.** El test "tiene ≤ 10 asientos por fila, ≤ 12 filas y anchos de viewBox dentro del límite" pasa a depender del mapa:
      - `ZOOM_TO_PICK_SLUGS = ["noche-de-sintetizadores-lima", "la-casa-de-los-espejos", "risas-sin-filtro"]`, con un comentario que cite la decisión 3: ≤ 12 filas y ancho ≤ `MAX_ZOOM_TO_PICK_PLAN_WIDTH` (622, para ≥ 24 px tras un "Acercar" a 375 px);
      - el resto: ≤ 10 por fila, ≤ 12 filas y ≤ 400.
      - Con los datos rectangulares de T1, los dos casos se cumplen.
    - **Invariantes del mapa curvo.** El grupo "invariantes del mapa curvo festival-vive-latino-lima" pasa a `describe.each(CURVED_SLUGS)`, con `CURVED_SLUGS = Object.keys(VENUE_SECTORS_MOCK)`. Cubre el resto del requisito 6:
      - "todos los sectores son concéntricos" y "el escenario es el compartido";
      - "cada path es el de su sector": las claves de `sectors` (sin `stage`) coinciden con los ids de zona, en orden;
      - márgenes, solapes y `labelPos`;
      - por cada zona numerada: `planTransform`, butacas en la banda, letras de fila y, si no está agotada, disponibles y accesibles.
    - El grupo "invariantes del mapa rectangular" pasa a recorrer `MAP_SLUGS` filtrados a los que **no** están en `VENUE_SECTORS_MOCK`.
    - Se borra el test "%s: el texto del escenario está centrado en su forma", con sus valores (300, 38) y (300, 40). Lo cubren "labelPos en el centro del rectángulo" (rectangulares) y "el escenario es el compartido" (curvos).
    - Los tests específicos del festival, los de `getVenueMapBySlug`/`hasVenueMap`, "reparto de la ocupación" y "tonos" no cambian.
  - **T5:** se borran el grupo rectangular, `RECT_PATH`, `rectCenter` y `RECT_MAP_SLUGS` (requisito 9).
- **`lib/db/seed/buildSeedData.test.ts`** (T1b): los casos del requisito 11.
- **Tests por recinto (T2–T4), en dos partes**, para que se puedan verificar sin BD en paralelo (decisión 11):
  - **Sin BD** (`describe`), sobre `<X>_VENUE.layout` validado con `venueLayoutSchema.parse`: `viewBox`, sectores, `labelPos`, filas, butacas por fila, `seatViewBox`, escala, accesibles exactas y estado de las butacas citadas (p. ej. `platea-F-7` `occupied`, `platea-F-8` `available`).
  - **Con BD** (`describeWithDb`), con `getVenueMapBySlug`: el mapa coincide con el layout del mock, y `resolveSeats` da las etiquetas o el `null` esperados (necesita los nombres de zona del evento).

  Los casos de cada recinto son:
- **`modules/seating/data/nocheDeSintetizadores.mock.test.ts`** (nuevo, T2):
  - `viewBox`;
  - los sectores exactos de `SINTETIZADORES_VENUE.sectors` (requisito 3) y los `labelPos`;
  - Norte: filas, butacas por fila (total 80), `seatViewBox`, `planTransform.scale` y accesibles exactas;
  - `resolveSeats` de `norte-A-1` con su etiqueta.
- **`modules/seating/data/laCasaDeLosEspejos.mock.test.ts`** (nuevo, T3):
  - `viewBox`, sectores y `labelPos`;
  - Platea (94) y Mezanine (60): filas, butacas por fila, `seatViewBox`, escala y accesibles exactas;
  - `platea-F-7` existe y está ocupada; `platea-F-8` resuelve con "Platea · Fila F · Asiento 8"; `mezanine-A-3` resuelve.
- **`modules/seating/data/risasSinFiltro.mock.test.ts`** (nuevo, T4):
  - `viewBox`, sectores y `labelPos`;
  - Mesa (24) con todas sus butacas ocupadas y sin accesibles;
  - Preferencial (60): filas, butacas, `seatViewBox`, escala y accesibles exactas;
  - `preferencial-A-5` resuelve;
  - General de pie con su capacidad.
- **Sin cambios** (requisito 7): `venueLayoutRecords.test.ts`, `TicketSelection.test.tsx`, `useSeatSelection.test.ts`, `seatIds.test.ts`, `seatNavigation.test.ts`, `bestSeats.test.ts`, `selectionSummary.test.ts`, `arcSeatRows.test.ts`, `seating.schema.test.ts`, `zoneTone.test.ts`, `events.service.test.ts`, `checkout.service.test.ts` (y el resto de `modules/checkout`) y `demoOrders.test.ts`.
- **Verificación final** del reviewer:
  - `npx vitest run` sin BD y con BD (una sola ejecución con BD a la vez);
  - BD de desarrollo vuelta a sembrar, y después `npm run lint` y `npm run build`;
  - el script Playwright de "Verificación visual".

## Plan de tareas
**Coordinación:**
- Empieza cuando estén cerrados la Fase 5 de `docs/specs/seating-stadium-map.md` y el arreglo de `SeatPlan` de la decisión 7. No se ejecuta en la misma sesión que ninguna fase de la spec del estadio (decisión 10).
- **Developers de T2–T4, en paralelo:**
  - verifican sin BD: `DATABASE_URL_TEST= npx vitest run modules/seating lib/db/seed` y `npx eslint <sus archivos>`;
  - no ejecutan `build`.
- **Suite completa con BD (`npx vitest run`), de uno en uno:** cada developer de T2–T4 la ejecuta al terminar, por turnos (decisión 11). El orquestador no lanza dos a la vez.
- **Reviewer, al final:**
  - vuelve a sembrar la BD de desarrollo;
  - ejecuta la verificación completa y el script de Playwright.

### Fase 1. Recintos curvos (6 tareas, 12 archivos; T1 ya hecha: quedan 5 tareas sobre 11 archivos)
- [x] T1. Datos compartidos del estadio y reparto del mock en un archivo por recinto, sin cambio de datos; invariantes de `seating.service.test.ts` guiadas por los datos, con el límite de tamaño por mapa (requisitos 1, 2 y 6; tests de T1).
  - Archivos: `modules/seating/data/stadium.mock.ts` (nuevo), `modules/seating/data/festivalViveLatino.mock.ts` (nuevo), `modules/seating/data/nocheDeSintetizadores.mock.ts` (nuevo, layout rectangular de hoy), `modules/seating/data/laCasaDeLosEspejos.mock.ts` (nuevo, ídem), `modules/seating/data/risasSinFiltro.mock.ts` (nuevo, ídem), `modules/seating/data/venueMaps.mock.ts`, `modules/seating/services/seating.service.test.ts`.
  - Depende de: —.
  - Secuencial (base: toca el agregador y el test compartido).
  - Verificar `npx vitest run modules/seating modules/checkout modules/tickets` y el `JSON.stringify` idéntico.
- [ ] T1b. Test del seed independiente de la geometría (requisito 11, decisión 11).
  - Archivos: `lib/db/seed/buildSeedData.test.ts`.
  - Depende de: T1.
  - Secuencial (archivo compartido de `lib/`; va antes de T2–T4).
  - Verificar `DATABASE_URL_TEST= npx vitest run lib/db/seed/buildSeedData.test.ts` y `npx eslint lib/db/seed/buildSeedData.test.ts`.
- [ ] T2. Arena curva (requisito 3), con su test.
  - Archivos: `modules/seating/data/nocheDeSintetizadores.mock.ts`, `modules/seating/data/nocheDeSintetizadores.mock.test.ts` (nuevo).
  - Depende de: T1b.
  - En paralelo con T3 y T4, sin BD.
  - En la ejecución con BD, por turnos, comprobar también `modules/checkout` (Norte del mapa real).
- [ ] T3. Teatro curvo (requisito 4), con su test.
  - Archivos: `modules/seating/data/laCasaDeLosEspejos.mock.ts`, `modules/seating/data/laCasaDeLosEspejos.mock.test.ts` (nuevo).
  - Depende de: T1b.
  - En paralelo con T2 y T4, sin BD.
  - En la ejecución con BD, por turnos, comprobar también `modules/tickets` (órdenes demo).
- [ ] T4. Comedia curva (requisito 5), con su test.
  - Archivos: `modules/seating/data/risasSinFiltro.mock.ts`, `modules/seating/data/risasSinFiltro.mock.test.ts` (nuevo).
  - Depende de: T1b.
  - En paralelo con T2 y T3, sin BD.
- [ ] T5. Cierre: `sectors` obligatorio, tests sin rama rectangular y diseño de página (requisitos 9 y 10). Las holguras medidas del requisito 10 las aporta la verificación Playwright: el developer la ejecuta con el script del criterio, y el reviewer la repite. Antes del build y de Playwright, el developer vuelve a sembrar la BD de desarrollo (decisión 11).
  - Archivos: `modules/seating/data/stadium.mock.ts`, `modules/seating/data/venueMaps.mock.ts`, `modules/seating/services/seating.service.test.ts`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T2, T3 y T4.
  - Secuencial.

## Preguntas abiertas
Ninguna. La única (vaciar la BD de desarrollo durante la sesión) la resolvió el usuario: ver la decisión 11.
