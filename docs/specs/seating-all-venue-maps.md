# Mapas de recinto para todos los eventos posibles

- Módulo: seating
- Estado: borrador

## Objetivo
**Pedido del usuario:** "En lo posible todos deben tener mapas o zonas como conciertos."

Hoy solo 4 de los 13 eventos publicados tienen mapa del recinto: `noche-de-sintetizadores-lima`, `la-casa-de-los-espejos`, `risas-sin-filtro` y `festival-vive-latino-lima`. En esos, el detalle muestra la tarjeta de precios por zona y la barra móvil, y la compra pasa por `/eventos/<slug>/entradas`: mapa curvo de zonas y, en el sub-paso 2, cantidad o plano de butacas. Los otros 9 usan `TicketSelector` en el detalle (+/− por tipo) y no tienen barra móvil.

Esta spec da un mapa curvo propio, como los 4 actuales, a **7 de esos 9 eventos**. Deja sin mapa, con razones, a los otros 2:
- `el-circo-de-las-estrellas`: tiene una tarifa por edad, que no es un lugar;
- `aventura-en-el-bosque-magico`: tiene una sola entrada libre.

Es sobre todo un cambio de **datos mock**: un archivo por recinto y su test. Ningún componente cambia: el detalle, `/entradas` y el checkout ya se adaptan solos a un evento con mapa. La excepción es `clasico-del-pacifico`: comparte el Estadio Nacional con la arena de conciertos, y la BD guarda un solo `viewBox` y un solo escenario por recinto. Necesita una migración pequeña, que va en sus propias fases (3 y 4, decisión 4).

**Contexto que se mantiene:**
- `docs/specs/seating-stadium-map.md` ("spec del estadio"): requisito 8 (invariantes del mapa curvo), decisión 7 (numeración en arco) e ids `<zona>-<FILA>-<n>`.
- `docs/specs/seating-curved-venues.md` ("spec de recintos curvos"), aprobada y cerrada:
  - decisión 1: centro, escenario y separaciones comunes;
  - decisión 3: plano de ≤ 622 de ancho y ≤ 12 filas, con butacas ≥ 16 px a 375 con el plano entero y ≥ 24 px tras un "Acercar";
  - decisión 5: butacas accesibles en la última fila;
  - decisión 11: BD, seed y volver a sembrar;
  - decisión 12: holgura de las etiquetas.
- Ninguna de las dos specs se edita. Esta las amplía a los recintos nuevos.

**Nota sobre los datos del pedido:** el pedido intercambia los tipos de entrada de dos eventos. Esta spec sigue `modules/events/data/events.mock.ts`:
- `los-ecos-del-sur-arequipa` (conciertos) está **agotado**: General "Galería, sin numerar." y Platea "Butaca numerada en platea.";
- `suenos-de-una-noche-andina` (teatro) está **disponible**: General y Preferencial "Primeras cinco filas.".

## Alcance
- Incluye:
  - **Escenario de deportes:** `PITCH_STAGE` en `modules/seating/data/stadium.mock.ts`. Es el escenario compartido con la etiqueta "CANCHA" (decisión 3).
  - **7 recintos curvos nuevos**, un archivo de datos y un test por recinto en `modules/seating/data/`, registrados en el agregador `venueMaps.mock.ts`. Los valores están en los requisitos 5–11.
  - **Tests guiados por los datos.** Las invariantes de `seating.service.test.ts` y el recuento de butacas de `buildSeedData.test.ts` se calculan a partir de los mocks. Así las fases siguientes no tocan esos tests para cada recinto (requisitos 2 y 3).
  - **Mapa propio por evento en la BD** (Fase 3): columnas `events.map_view_box` y `events.map_stage`, con su migración, el seed y el ERD.
  - **Clásico del Pacífico** (Fase 4):
    - el service lee el mapa propio del evento;
    - el mapa del Clásico;
    - la orden demo `MT-3HX9RB` pasa a una butaca que existe en el mapa nuevo (decisión 6).
  - **Diseño de página:** `design-system/ticketera/pages/ticket-selection.md`, con los barridos, la cancha, los planos y las holguras medidas.
- No incluye:
  - **Mapa para `el-circo-de-las-estrellas` ni para `aventura-en-el-bosque-magico`** (decisión 1). Siguen con `TicketSelector`/`PreselectedTicketSelector`.
  - **Tarifas por zona** ("Niños" y "Adulto" dentro de cada zona). Es otro modelo de catálogo y de checkout, para otra spec si se quiere.
  - **Cambios en `modules/events`:** `events.mock.ts`, nombres, precios, estados y orden de los `ticketTypes`, componentes y tests. Las descripciones de los tipos tampoco cambian.
  - **Cambios en componentes, hooks, utils o schema de `seating`:**
    - `VenueMapView`, `ZoneCards`, `SeatPlan`, `SeatPlanMinimap`, `ZonePricesCard`, `MobileBuyBar`, `TicketSelection`, `generateArcSeatRows`, `getAnnularSectorPath` y `venueLayoutSchema` se usan tal cual;
    - el único código de producción que cambia es `seating.service.ts` (Fase 4) y el seed (Fase 3).
  - **Cambios en `app/`:**
    - el detalle `/eventos/[slug]` ya elige el aside según haya mapa o no;
    - `/eventos/[slug]/entradas` ya prerenderiza todo slug con layout.
  - **Archivos de otras specs en curso:**
    - la enmienda F6 de `seating-stadium-map.md`: `ZonePricesCard`, `?zona=` y "Ver mapa de zonas";
    - `design-alignment-purchase-flow.md`: la ruta `app/(purchase)/eventos/[slug]/entradas/page.tsx`, ya movida.

    Esta spec no los toca. Solo comparte con ellas `pages/ticket-selection.md`: ver "Coordinación" en el plan.
  - **Rehacer los 4 mapas actuales:** no cambian sus valores ni sus tests específicos.
  - **Un script para vaciar la BD de desarrollo:** volver a sembrarla es un paso manual (decisión 7).
  - **Abrir el plano ya acercado en móvil** o cambiar el paso de "Acercar".

## Decisiones

1. **Qué eventos llevan mapa ("en lo posible").**

   | Evento | Mapa | Motivo |
   |---|---|---|
   | `copa-del-norte-trujillo` (deportes) | sí (F1) | Recinto propio (Estadio Mansiche). |
   | `los-ecos-del-sur-arequipa` (conciertos, agotado) | sí (F1) | Cada tipo es un lugar (Galería y Platea). El mapa se ve con todo agotado (decisión 8). |
   | `festival-sol-de-verano` (festivales) | sí (F2) | 3 zonas de pie. |
   | `festival-arena-y-mar-piura` (festivales) | sí (F2) | 2 zonas de pie. |
   | `micro-abierto-arequipa` (stand-up) | sí (F2) | Mesa (numerada) y General. |
   | `suenos-de-una-noche-andina` (teatro) | sí (F2) | "Primeras cinco filas" es un lugar numerado. |
   | `clasico-del-pacifico` (deportes) | sí (F3 + F4) | Necesita un mapa propio por evento en la BD (decisión 4). |
   | `el-circo-de-las-estrellas` (familia) | **no** | Ver abajo. |
   | `aventura-en-el-bosque-magico` (familia) | **no** | Ver abajo. |

   - **Circo, sin mapa:** "Niños" ("De 2 a 12 años") es una **tarifa por edad**, no un lugar. Un niño se sienta junto a su familia en General o en Preferencial.
     - El contrato del mapa exige una zona por tipo de entrada. Lo exigen el invariante "zonas 1:1 con los `ticketTypes`", `toVenueLayout`, que da `null` si algún tipo no tiene geometría, y la URL de checkout `<ticketTypeId>=<qty>`.
     - Hay 3 alternativas, y las 3 se descartan:
       - forzar "Niños" como zona, p. ej. "Graderías infantiles": inventa un lugar que no existe y separa a los niños de sus familias;
       - quitar "Niños" del catálogo: cambia un dato de negocio y el inventario del organizador demo (`ORGANIZER_SALES_MOCK`);
       - modelar tarifas por zona: es otro catálogo y otro checkout.
     - Por eso el circo sigue con `TicketSelector`. No cambian su checkout, sus órdenes ni sus tests (`organizer.service.test.ts`).
   - **Aventura en el bosque mágico, sin mapa:** tiene un solo tipo de entrada, gratis ("Entrada libre"), que solo se reserva. Un mapa de una sola zona añade un paso y no da información. Su checkout es el flujo `free` (`checkout.service.test.ts`, "evento gratuito → free"), que no cambia.
2. **Zonas de pie o numeradas, y capacidades.** Las capacidades de las zonas de pie son de demostración. El seed crea una fila de `event_seats` por lugar, así que son moderadas: el total nuevo es de unas 14 000 filas, frente a las ~38 000 de hoy.

   | Evento | Zona (`id` = `ticketTypeId`) | Tipo | Motivo |
   |---|---|---|---|
   | Copa del Norte | `popular` | de pie (2000) | Las populares de fondo no se numeran. |
   | | `oriente` | de pie (800) | Tribuna barata (S/ 70) en un estadio pequeño. |
   | | `occidente` | numerada (39) | Tribuna principal y la más cara: se elige butaca. |
   | Ecos del Sur | `general` | de pie (300) | "Galería, sin numerar". |
   | | `platea` | numerada (61, agotada) | "Butaca numerada en platea". |
   | Sol de Verano | `general`, `preferencial`, `vip` | de pie (3000, 1000, 300) | Festival al aire libre. VIP es un lounge, sin butacas. |
   | Arena y Mar | `general`, `vip` | de pie (2000, 400) | Festival de playa. VIP es una zona techada, sin butacas. |
   | Micro abierto | `general` | de pie (300) | Sin descripción de lugar: por cantidad. |
   | | `mesa` | numerada (24) | Mesas para dos: se eligen los asientos. El precio es por persona, así que se puede comprar 1. |
   | Sueños andinos | `general` | de pie (250) | Sin numerar, como la galería de los teatros municipales. |
   | | `preferencial` | numerada (48, filas A–E) | "Primeras cinco filas". |
   | Clásico del Pacífico | `popular` | de pie (3000) | "Tribuna norte y sur", populares de fondo. |
   | | `oriente`, `occidente` | numeradas (34 y 34) | Final en el Estadio Nacional: tribunas laterales numeradas. La orden demo ya tiene una butaca de Occidente. |
   | | `palco` | de pie (120) | Palco techado con catering: se compra por cantidad, sin elegir butaca dentro del palco. |

   - **Orden de las zonas:** el de los `ticketTypes` del evento, como en el festival (requisito 7 de la spec del estadio). Es el orden del aside de precios, de la URL de checkout y del Tab en el mapa.
   - **Los `sectors` de cada recinto** llevan las mismas claves en el mismo orden, más `stage` al principio.
3. **Geometría: el mismo lenguaje que los 4 mapas.**
   - **Lo que comparten todos:**
     - centro `STADIUM_CENTER` (300, 54) y sector del escenario `STAGE_SECTOR`;
     - escenario con `path`, `labelPos` y 7 luces;
     - zonas como sectores anulares concéntricos;
     - separación radial de 12 entre el escenario y la primera banda, y de 8 entre bandas;
     - 4° de separación angular entre sectores vecinos de la misma banda;
     - ancho de `viewBox` de 600, con ≥ 4 de margen;
     - alto del `viewBox` = borde inferior + 8.
   - **Conciertos, teatro, stand-up y festivales:** anillos frente al escenario ("ESCENARIO", `STADIUM_STAGE`). En los festivales, la zona más cara puede ir al fondo si su descripción lo pide: el VIP de Sol de Verano tiene "vista elevada".
   - **Deportes, "herradura":**
     - el sector del escenario es la **cancha**: `PITCH_STAGE`, la misma forma con la etiqueta "CANCHA", y las luces son los reflectores;
     - las tribunas laterales van a los lados (Oriente a la derecha, de 6° a 53–60°; Occidente a la izquierda, de 120–127° a 174°);
     - el fondo va abajo (Popular y, en el Clásico, Palco).

     Las tribunas laterales del festival (40° y 166 de banda) no sirven aquí: a 375 px, la fila del precio con la insignia de selección mide 91 px (190 unidades) y no cabe en su banda. Con 47–54° y radios 102–296 cabe (requisito 5).
   - **Etiquetas con sitio** (decisión 12 de la spec de recintos curvos), en los 5 anchos de Playwright:
     - holgura ≥ 3 px sin selección (píldora "Últimas entradas" incluida desde `md`);
     - holgura ≥ 0.5 px con la insignia de selección "✓ 2".
     - **Cómo se mide la holgura:** como en la decisión 12, con un añadido para los sectores laterales. La distancia de cada esquina y de cada punto medio de cada pieza de la etiqueta al borde visible de su zona incluye los bordes radiales (rectas a `startAngle` y `endAngle`), no solo los arcos. Se descuentan 1.5 unidades por el trazo.
     - Los `labelPos` de los requisitos 5–11 maximizan la menor holgura. Se calcularon con las medidas de `VenueMapView` de esa decisión: nombre, precio, insignia y píldora; los nombres no medidos se estiman a 6.2 px por letra en `text-xs` y 7.2 en `text-sm`.
     - El modelo reproduce las holguras medidas de la arena con ±0.1 px. Los mínimos previstos van en cada requisito.
     - **Ajuste permitido:** si Playwright mide menos, el developer puede mover ese `labelPos` hasta ±8 unidades, sin cambiar sectores, y actualizar su test en la misma tarea. Si no basta, se para y se actualiza esta spec.
   - **Planos de butacas** (`generateArcSeatRows`):
     - ≤ 12 filas y `seatViewBox` de ≤ 622 de ancho;
     - siempre que se pueda, ≤ 400 de ancho y ≤ 10 butacas por fila, para tener ≥ 24 px a 375 con el plano entero. Lo cumplen las tribunas de Copa y del Clásico y la Mesa del micro abierto. Preferencial de Sueños (5 filas, 470) y Platea de Ecos (agotada, 508) usan la excepción de "Acercar".
     - Todos los valores están verificados con el `generateArcSeatRows` real contra todas las invariantes. Son definitivos (salvo el ajuste de `labelPos` de arriba).
   - **Ocupación y accesibles:**
     - el `occupiedRatio` de cada zona numerada reproduce en el seed el estado del mock: `available` con > 20 % libre, `low-stock` con ≤ 20 % y `sold-out` con 0;
     - las accesibles van en la última fila: el extremo si está libre o, si no, la butaca libre más cercana a cada extremo (decisión 5 de la spec de recintos curvos).
4. **Clásico del Pacífico: mapa propio por evento (Fases 3 y 4).**
   - **Problema:**
     - el seed crea un recinto por `(venue, city)`;
     - `venues.map_view_box` y `venues.stage` son del recinto;
     - `buildSeedData` lanza "Dos layouts distintos para el recinto" si dos eventos del mismo recinto traen layouts distintos;
     - el Clásico y `noche-de-sintetizadores-lima` comparten el Estadio Nacional de Lima, y el mapa del fútbol necesita su `viewBox` y su "CANCHA", no el "ESCENARIO" de la arena.
   - **Alternativas descartadas:**
     - forzar la geometría de la arena: un partido con "ESCENARIO" y sin cancha;
     - deducir la etiqueta del escenario de la categoría en el service: lógica de presentación en el service, y el mock y la BD dejarían de coincidir;
     - duplicar el recinto "Estadio Nacional": rompe "un solo Estadio Nacional" y el catálogo de recintos;
     - dejar el Clásico sin mapa: descartada: el usuario eligió migrar (Preguntas abiertas, resuelta).
   - **Solución:** configuración de mapa opcional por evento.
     - `events.map_view_box text NULL` y `events.map_stage jsonb NULL`, con CHECK `events_map_override_check`: las dos `NULL` o las dos con valor.
     - El service usa las del evento si las tiene y, si no, las del recinto. Las secciones siguen siendo del recinto.
     - Popular, Oriente, Occidente y Palco no chocan con las secciones de la arena (vip, preferencial, general, norte).
   - **Seed:**
     - el recinto toma el `viewBox` y el escenario del primer evento con layout, en el orden del mock (la arena es `evt-001`);
     - un evento posterior con layout distinto los guarda en sus columnas propias;
     - la coherencia pasa del layout entero a cada sección: dos layouts que usen la misma sección del mismo recinto deben darle la misma geometría (`map_path`, `label_x/y`, `seating`, `capacity`, `seat_view_box`, `wrap_label`, `plan_transform`); si no, el seed lanza un error;
     - las secciones sin geometría (eventos sin layout) siguen comprobando solo el nombre, como hoy.
   - **Fases:** la migración y el seed son la Fase 3, entregable por sí misma: la BD admite mapas por evento, verificado con layouts sintéticos. El service y el mapa del Clásico son la Fase 4. Juntas superarían los ~15 archivos de una fase.
5. **Herradura de Copa y del Clásico.** Copa tiene Oriente, Popular y Occidente con radios 102–296 (`viewBox` 600 × 358). El Clásico tiene las laterales en 102–296 y el fondo partido en Palco (102–220) y Popular (228–330), con `viewBox` 600 × 392. Palco va junto a la cancha porque es el más caro, igual que el VIP en los conciertos.
   - **Alternativas descartadas para Palco**, todas con etiquetas que no caben a 375:
     - una banda exterior detrás de Occidente: se sale del ancho 600;
     - partir Occidente en sentido radial: queda una banda de 88–98 en diagonal;
     - un sector angular estrecho dentro de Occidente.
   - **"Tribuna norte y sur"** se dibuja como un solo fondo: el mapa es esquemático y la cancha ocupa la otra cabecera.
6. **Orden demo `MT-3HX9RB` (Clásico, "Occidente", butaca `occidente-F-12`).** Cuando el Clásico tenga mapa, `demoOrders.test.ts` ("si el evento tiene mapa, cada asiento existe… con la etiqueta del mapa") exigirá dos cosas:
   - **Que la butaca exista.** Una fila F con ≥ 12 butacas en una tribuna lateral pide `scale` ≥ 2.48 y un plano de más de 622 de ancho. Por eso la butaca pasa a `occidente-F-4`, que existe y está ocupada (la compró la cuenta demo, como `platea-F-7`).
   - **Que la etiqueta sea la del mapa.** `formatSeatLabel` usa el nombre del tipo, que es "Occidente", no "Tribuna Occidente".

   Cambian 3 textos de `demoOrders.ts`: el id, la etiqueta del ítem y el `seatLabel` de la entrada. También cambian 2 aserciones de `TicketCard.test.tsx`, que usa esa orden. El resto de la orden (código, ítem "Occidente", S/ 220, comprador) no cambia, y `MT-9LM2TC` (`platea-F-7`/`F-8`) tampoco.
7. **Base de datos y seed** (decisión 11 de la spec de recintos curvos, que sigue vigente):
   - **Lectura del mapa:** `getVenueMapBySlug` lee de Postgres y el seed copia `VENUE_LAYOUTS_MOCK` con `onConflictDoNothing`. En una BD ya sembrada, las secciones de los eventos que hoy no tienen mapa siguen como `general` de 200, sin `map_path`, y no se actualizan. Hay que **vaciar y volver a sembrar**.
   - **Sin volver a sembrar,** `hasVenueMap`, que lee el mock, da `true` y el CTA del detalle apunta a `/entradas`, pero `getVenueMapBySlug` da `null` y `/entradas` responde 404. Por eso la BD de desarrollo se vuelve a sembrar antes de `npm run build` y de Playwright, y el resumen de cierre de cada fase lo recuerda al usuario.
   - **Verificación en paralelo:** los developers de recinto ejecutan sus tests **sin BD** (`DATABASE_URL_TEST= npx vitest run <rutas>`). Los bloques `describeWithDb` se omiten.
   - **Suite completa con BD** (`npx vitest run` con el `DATABASE_URL_TEST` de `.env`): de uno en uno, nunca dos ejecuciones con BD a la vez, porque `testGlobalSetup` vacía y vuelve a sembrar la BD de test.
   - **BD local autorizada:** solo el Postgres desechable del entorno de pruebas (`127.0.0.1:5433`, bases `ticketera_dev` y `ticketera_test`). El developer de cada tarea de cierre y el reviewer pueden:
     - vaciar las tablas de `public` de `ticketera_dev` (`TRUNCATE … CASCADE`);
     - ejecutar `npm run db:migrate && npm run db:seed`.

     La BD de Neon del usuario no se toca desde la sesión. Si la sesión no usa ese Postgres local, se pregunta al usuario antes de vaciar nada.
   - **Tras el merge de cada fase,** el usuario vuelve a sembrar su BD de desarrollo: vacía la BD o recrea la rama `dev` de Neon, y ejecuta `npm run db:migrate && npm run db:seed`. Desde la Fase 3 hay además una migración nueva (`0005`), que aplica `db:migrate`.
8. **Detalle `/eventos/[slug]` de los 7 eventos.** Con mapa, el aside pasa a ser `ZonePricesCard` y aparece `MobileBuyBar`, sin cambiar código (`page.tsx` decide con `getVenueMapBySlug`).
   - **Ecos del Sur, agotado:**
     - `ZonePricesCard` lista Galería y Platea con "Agotado" y muestra "Entradas agotadas" en lugar del botón;
     - no hay `MobileBuyBar` (`event.status !== "sold-out"`), y el CTA del hero no es enlace;
     - `/eventos/los-ecos-del-sur-arequipa/entradas` existe y muestra el mapa con las dos zonas grises "Agotado", que no se abren.

     Es coherente con "todos con mapa" y no cuesta código.
   - **Tests:** ningún test de `modules/events` supone `TicketSelector` para estos slugs. `TicketSelector.test.tsx` usa fixtures propios, y `EventCard.test.tsx` y `events.service.test.ts` citan los slugs solo para la tarjeta, el orden y los eventos relacionados.
9. **Coordinación con otras specs.** Esta spec no toca `ZonePricesCard`, `MobileBuyBar`, `TicketSelection`, `app/` ni `PurchaseShell`. Los criterios de Playwright del detalle no dependen del texto del botón del aside ("Elegir entradas" o "Ver mapa de zonas"). El único archivo compartido es `design-system/ticketera/pages/ticket-selection.md`, que tocan las tareas de cierre. Ver "Coordinación" en el plan.

## Requisitos

### Base guiada por los datos (Fase 1, T1)
1. **`PITCH_STAGE`** en `modules/seating/data/stadium.mock.ts`:

   ```ts
   /** Escenario de los recintos deportivos: la misma forma y luces, con la etiqueta "CANCHA". */
   export const PITCH_STAGE: z.input<typeof venueLayoutSchema>["stage"] = { ...STADIUM_STAGE, label: "CANCHA" };
   ```

   `STADIUM_CENTER`, `STAGE_SECTOR`, `STADIUM_STAGE` y `MockVenue` no cambian.
2. **`modules/seating/services/seating.service.test.ts`, guiado por los mocks:**
   - **Constantes:**
     - `MAP_SLUGS = VENUE_LAYOUTS_MOCK.map((layout) => layout.eventSlug)`. Sustituye a la lista fija y a `ZOOM_TO_PICK_SLUGS`.
     - `STRICT_PLAN_SLUGS = [STADIUM_SLUG]`. Lleva un comentario: el festival mantiene ≤ 10 butacas por fila y ≤ 400 de ancho; los demás, ≤ 12 filas y ≤ 622, como en la decisión 3 de `seating-curved-venues`, ampliada por esta spec.
     - `NO_MAP_SLUGS = ["el-circo-de-las-estrellas", "aventura-en-el-bosque-magico"]` (decisión 1).
   - **"devuelve null para un evento sin mapa…"** y **"getVenueMapForEvent: devuelve null para un evento sin mapa"** usan `el-circo-de-las-estrellas` en lugar de `clasico-del-pacifico`.
   - **`hasVenueMap`:**
     - "es true para cada evento con layout y false para los que no lo tienen": `true` para cada `MAP_SLUGS`, y `false` para `NO_MAP_SLUGS` y `no-existe`;
     - "coincide con los layouts mock" pasa a "cada layout es de un evento distinto": sin slugs repetidos en `MAP_SLUGS`.
   - **Límite de tamaño** ("tiene ≤ 12 filas por zona…"): ≤ 12 filas y ≤ 622 en todos los mapas, y además ≤ 10 por fila y ≤ 400 en `STRICT_PLAN_SLUGS`. `MAX_ZOOM_TO_PICK_PLAN_WIDTH` se renombra a `MAX_PLAN_WIDTH` (622) y el límite estricto a `MAX_STRICT_PLAN_WIDTH` (400).
   - **"el escenario es el compartido, con sus 7 luces…"** (invariantes con BD): el escenario esperado es `PITCH_STAGE` si la categoría del evento (`getEventBySlug`) es `deportes`, y `STADIUM_STAGE` si no.
   - **"VENUE_SECTORS_MOCK: tiene los 4 mapas mock…"** pasa a "tiene un sector por cada mapa mock, incluido el festival": `CURVED_SLUGS` ordenado es igual a `MAP_SLUGS` ordenado.
   - **El resto no cambia:** los tests específicos de la arena, el teatro, el stand-up y el festival, "reparto de la ocupación" y "tonos".
   - **Con los datos de hoy,** el archivo pasa sin cambios de resultado.
3. **`lib/db/seed/buildSeedData.test.ts`:** el test "siembra 6 categorías, 13 eventos publicados, 1 borrador y 456 asientos de recinto" pasa a "… y un asiento de recinto por butaca de los layouts".
   - Se quita el literal `456` y se mantiene `expect(data.venueSeats).toHaveLength(layoutSeats.length)` con un `layoutSeats.length > 0`.
   - El resto del archivo no cambia en esta fase.
   - Totales esperados (solo como referencia): 556 tras F1, 628 tras F2 y 696 tras F4.

### Recintos (un archivo `<recinto>.mock.ts` + `<recinto>.mock.test.ts` cada uno)
Convenciones, las de la spec de recintos curvos:
- ángulos en grados, con 0° = +x y sentido horario;
- `path = getAnnularSectorPath(sector)`;
- `labelPos` en unidades del mapa;
- `planTransform` y `seatViewBox` los calcula `generateArcSeatRows` (se citan como referencia);
- "375 px": área de toque con el plano entero (lienzo de 311 px) y tras un "Acercar" (×1.5).

Holguras previstas de las etiquetas, en px: "sin selección / con insignia", la menor de los 5 anchos.

4. **Archivos y exports:**

   | Archivo (`modules/seating/data/`) | Export | Evento | Fase |
   |---|---|---|---|
   | `copaDelNorte.mock.ts` | `COPA_DEL_NORTE_VENUE` | `copa-del-norte-trujillo` | 1 |
   | `losEcosDelSur.mock.ts` | `ECOS_DEL_SUR_VENUE` | `los-ecos-del-sur-arequipa` | 1 |
   | `festivalSolDeVerano.mock.ts` | `SOL_DE_VERANO_VENUE` | `festival-sol-de-verano` | 2 |
   | `festivalArenaYMar.mock.ts` | `ARENA_Y_MAR_VENUE` | `festival-arena-y-mar-piura` | 2 |
   | `microAbierto.mock.ts` | `MICRO_ABIERTO_VENUE` | `micro-abierto-arequipa` | 2 |
   | `suenosDeUnaNocheAndina.mock.ts` | `NOCHE_ANDINA_VENUE` | `suenos-de-una-noche-andina` | 2 |
   | `clasicoDelPacifico.mock.ts` | `CLASICO_VENUE` | `clasico-del-pacifico` | 4 |

   - Cada uno es un `MockVenue` con `sectors` (`stage: STAGE_SECTOR` + uno por zona, en el orden de las zonas) y `layout` (`stage: STADIUM_STAGE`, o `PITCH_STAGE` en deportes).
   - Los sectores van en una constante `<RECINTO>_SECTORS`, igual que en `risasSinFiltro.mock.ts`.
   - Agregador (`venueMaps.mock.ts`): `MOCK_VENUES` añade los recintos **al final**, en el orden de esta tabla. Así `VENUE_LAYOUTS_MOCK[0]` sigue siendo la arena.
5. **Copa del Norte** (`copa-del-norte-trujillo`, Estadio Mansiche): `viewBox` `"0 0 600 358"`, `stage: PITCH_STAGE`.

   | Zona | Tipo | Sector (radios · ángulos) | `labelPos` |
   |---|---|---|---|
   | `popular` | general (2000) | 102–296 · 64°…116° | (300, 283) |
   | `oriente` | general (800) | 102–296 · 6°…60° | (470, 135) |
   | `occidente` | numbered | 102–296 · 120°…174° | (130, 135) |

   - **Plano de `occidente`:** `generateArcSeatRows({ scale: 1.3, rowLabels: A–F, occupiedRatio: 0.4, accessibleSeats: ["occidente-F-3", "occidente-F-5"] })`.
     - Filas: 4, 5, 6, 7, 8 y 9 butacas (39).
     - `seatViewBox` `"0 0 365 368"`; `planTransform` ≈ { 1.3, 16.69, −60.06 }.
     - Ocupación: 20 disponibles, 2 accesibles y 17 ocupadas (`available`, 56 % libre). Ninguna fila supera el 66.7 % de ocupadas.
     - `occidente-A-2` está disponible.
     - Área de toque a 375 px: 27.3 px con el plano entero y 40.9 px tras un "Acercar". Cumple ≤ 400 y ≤ 10 por fila.
   - Margen mínimo con el `viewBox`: 5.6 (las laterales a 6° y 174°).
   - Holguras previstas: Popular 12.5 / 5.5, Oriente 11.1 / 1.8, Occidente 8.6 / 1.8 (todas a 375).
6. **Los Ecos del Sur** (`los-ecos-del-sur-arequipa`, Teatro Municipal de Arequipa, agotado): `viewBox` `"0 0 600 414"`, `stage: STADIUM_STAGE`.

   | Zona | Tipo | Sector | `labelPos` |
   |---|---|---|---|
   | `general` (Galería) | general (300), agotada | 258–352 · 45°…135° | (300, 357) |
   | `platea` | numbered, agotada | 102–250 · 45°…135° | (300, 226) |

   - **Plano de `platea`:** `generateArcSeatRows({ scale: 1.3, rowLabels: A–F, occupiedRatio: 1 })`, sin accesibles (agotada, como la Mesa de la comedia).
     - Filas: 6, 8, 9, 11, 13 y 14 butacas (61), todas `occupied`.
     - `seatViewBox` `"0 0 508 280"`; `planTransform` ≈ { 1.3, −136.19, −139.96 }.
     - No se abre.
   - Seed: evento `sold-out` y los dos tipos `sold-out`.
   - Holguras previstas: General 4.5, Platea 16.8 (a 375; sin insignia, porque no se puede elegir).
7. **Festival Sol de Verano** (`festival-sol-de-verano`, Explanada Costa 21): `viewBox` `"0 0 600 518"`, `stage: STADIUM_STAGE`.

   | Zona | Tipo | Sector | `labelPos` |
   |---|---|---|---|
   | `general` | general (3000) | 226–336 · 40°…140° | (300, 329) |
   | `preferencial` | general (1000), `low-stock` | 102–218 · 40°…140° | (300, 204) |
   | `vip` | general (300) | 344–456 · 56°…124° | (300, 450) |

   - Preferencial ("cercana a ambos escenarios") es la banda junto al escenario.
   - VIP ("lounge… vista elevada") es la plataforma del fondo, más corta (68°).
   - Holguras previstas: General 6.7 / 3.7, Preferencial 5.5 (a 1024, con la píldora) / 2.9 (a 375), VIP 8.2 / 5.1.
8. **Arena y Mar Fest** (`festival-arena-y-mar-piura`, Playa Colán): `viewBox` `"0 0 600 398"`, `stage: STADIUM_STAGE`.

   | Zona | Tipo | Sector | `labelPos` |
   |---|---|---|---|
   | `general` | general (2000) | 226–336 · 40°…140° | (300, 329) |
   | `vip` | general (400) | 102–218 · 40°…140° | (300, 203) |

   - VIP ("techada frente al escenario") es la banda delantera.
   - Holguras previstas: General 6.7 / 3.7, VIP 5.8 / 3.4.
9. **Micro abierto** (`micro-abierto-arequipa`, Centro Cultural Peruano Norteamericano): `viewBox` `"0 0 600 390"`, `stage: STADIUM_STAGE`.

   | Zona | Tipo | Sector | `labelPos` |
   |---|---|---|---|
   | `general` | general (300) | 222–328 · 40°…140° | (300, 323) |
   | `mesa` | numbered | 102–214 · 40°…140° | (300, 201) |

   - **Plano de `mesa`:** `generateArcSeatRows({ scale: 1.04, rowLabels: A–C, occupiedRatio: 0.5, accessibleSeats: ["mesa-C-2", "mesa-C-9"] })`.
     - Filas: 6, 8 y 10 butacas (24, pares: mesas para dos).
     - `seatViewBox` `"0 0 389 203"`; `planTransform` ≈ { 1.04, −117.51, −100.35 }.
     - Ocupación: 7 disponibles, 2 accesibles y 15 ocupadas (`available`, 37.5 % libre).
     - `mesa-A-2` está disponible.
     - Área de toque a 375 px: 25.6 / 38.4 px. Cumple ≤ 400 y ≤ 10 por fila.
   - Holguras previstas: General 5.8 / 2.6, Mesa 4.8 / 2.3.
10. **Sueños de una noche andina** (`suenos-de-una-noche-andina`, Teatro Municipal de Cusco): `viewBox` `"0 0 600 402"`, `stage: STADIUM_STAGE`.

    | Zona | Tipo | Sector | `labelPos` |
    |---|---|---|---|
    | `general` | general (250) | 240–340 · 45°…135° | (300, 338) |
    | `preferencial` | numbered | 102–232 · 45°…135° | (300, 211) |

    - **Plano de `preferencial`:** `generateArcSeatRows({ scale: 1.285, rowLabels: A–E, occupiedRatio: 0.3, accessibleSeats: ["preferencial-E-1", "preferencial-E-13"] })`.
      - Filas: 6, 8, 10, 11 y 13 butacas (48): las "primeras cinco filas".
      - `seatViewBox` `"0 0 470 254"`; `planTransform` ≈ { 1.285, −150.70, −138.07 }.
      - Ocupación: 30 disponibles, 2 accesibles y 16 ocupadas. Ninguna fila supera el 50 % de ocupadas.
      - `preferencial-A-5` está disponible.
      - Área de toque a 375 px: 21.2 px con el plano entero y 31.8 px tras un "Acercar". Es la excepción de "Acercar".
    - Holguras previstas: General 4.3 / 1.5, Preferencial 9.6 / 6.6.
11. **Clásico del Pacífico** (`clasico-del-pacifico`, Estadio Nacional; Fase 4): `viewBox` `"0 0 600 392"`, `stage: PITCH_STAGE`. Los dos van en `events.map_view_box`/`map_stage` (decisión 4).

    | Zona | Tipo | Sector | `labelPos` |
    |---|---|---|---|
    | `popular` | general (3000) | 228–330 · 57°…123° | (300, 327) |
    | `oriente` | numbered | 102–296 · 6°…53° | (478, 122) |
    | `occidente` | numbered, `low-stock` | 102–296 · 127°…174° | (122, 122) |
    | `palco` | general (120) | 102–220 · 57°…123° | (300, 211) |

    - **Plano de `oriente`:** `generateArcSeatRows({ scale: 1.3, rowLabels: A–F, occupiedRatio: 0.4, accessibleSeats: ["oriente-F-1", "oriente-F-8"] })`.
      - Filas: 4, 4, 5, 6, 7 y 8 butacas (34).
      - `seatViewBox` `"0 0 351 342"`; `planTransform` ≈ { 1.3, −445.80, −60.06 }.
      - Ocupación: 23 disponibles, 2 accesibles y 9 ocupadas.
      - `oriente-A-1` está disponible.
    - **Plano de `occidente`:** `generateArcSeatRows({ scale: 1.3, rowLabels: A–F, occupiedRatio: 0.86, accessibleSeats: ["occidente-F-5"] })`.
      - Filas: 4, 4, 5, 6, 7 y 8 butacas (34).
      - `seatViewBox` `"0 0 351 342"`; `planTransform` ≈ { 1.3, 16.69, −60.06 }.
      - Ocupación: 5 disponibles (`A-3`, `B-4`, `C-1`, `D-5` y `E-5`), 1 accesible (`F-5`) y 28 ocupadas: 17.6 % libre, `low-stock` como el mock.
      - `occidente-F-4` existe y está `occupied` (orden demo, decisión 6).
    - Área de toque a 375 px de los dos planos: 28.4 / 42.5 px. Cumplen ≤ 400 y ≤ 10 por fila.
    - Holguras previstas: Popular 4.8 / 1.7, Oriente 4.6 / 0.5, Occidente 3.1 (a 1024, con la píldora) / 0.5, Palco 9.5 / 0.9.
12. **Invariantes de cada recinto nuevo:** las del requisito 6 de la spec de recintos curvos, que ya prueba `seating.service.test.ts` sobre todo `VENUE_SECTORS_MOCK` tras el requisito 2:
    - sectores concéntricos y escenario compartido (`STADIUM_STAGE` o `PITCH_STAGE`);
    - `path` exacto, márgenes ≥ 4, sin solapes y `labelPos` dentro de su sector;
    - toda zona numerada tiene `planTransform`, butacas dentro de la banda y letras de fila con ≥ 12 de margen;
    - si la zona no está agotada, tiene ≥ 1 disponible y ≥ 1 accesible;
    - límites de tamaño;
    - zonas 1:1 con los `ticketTypes`;
    - una zona agotada no tiene butacas elegibles.

    El seed debe reproducir el estado del mock de cada evento y de cada tipo ("los estados calculados coinciden…", `buildSeedData.test.ts`). Los valores de arriba lo cumplen.

### Mapa propio por evento en la BD (Fase 3)
13. **Esquema:**
    - `lib/db/schema/venues.ts` exporta `type MapStage = { label: string; path: string; labelPos: { x: number; y: number }; lights?: { x: number; y: number }[] }`, y `venues.stage` lo usa en `$type<MapStage>()`. Mismo tipo que hoy, sin duplicarlo.
    - `lib/db/schema/events.ts` gana:
      - `mapViewBox: text("map_view_box")`;
      - `mapStage: jsonb("map_stage").$type<MapStage>()`, con el comentario "Configuración del mapa propia del evento (p. ej. fútbol en un estadio cuyo mapa es de concierto); `NULL` = la del recinto";
      - `check("events_map_override_check", sql\`(${t.mapViewBox} IS NULL) = (${t.mapStage} IS NULL)\`)`.
    - **Migración** `drizzle/0005_event_map_override.sql`, generada con `npm run db:generate -- --name event_map_override`, junto con `drizzle/meta/0005_snapshot.json` y `_journal.json`. Solo añade las 2 columnas nulas y el CHECK: los datos existentes no cambian.
    - **`lib/db/constraints.test.ts`** (con BD), en el grupo de los CHECK de `events`:
      - un evento con solo `map_view_box` (o solo `map_stage`) incumple `events_map_override_check` (23514);
      - con los dos, se acepta.
    - **`docs/architecture/erd.md`:** las 2 columnas y el CHECK en la tabla `events`, con una nota. Un recinto puede alojar eventos con mapas distintos (concierto y fútbol). La geometría de las secciones es del recinto, y el `viewBox` y el escenario pueden ser del evento.
14. **Seed** (`lib/db/seed/buildSeedData.ts`):
    - Se elimina la comprobación del layout entero por recinto (`venueGeometries` y el error "Dos layouts distintos para el recinto").
    - **`venueId(...)`:**
      - el recinto toma `mapViewBox`/`stage` del primer layout que lo usa, como hoy;
      - el evento recibe `mapViewBox`/`mapStage` = los de su layout si son distintos de los del recinto (`isDeepStrictEqual` en `stage`), y `null` si son iguales o no tiene layout.
    - **`sectionId(...)`:** si la sección ya existe y **las dos** filas tienen `mapPath`, compara `mapPath`, `labelX`, `labelY`, `seating`, `capacity`, `seatViewBox`, `wrapLabel` y `planTransform`. Si difieren, lanza `Sección "<slug>" con geometría distinta en <venueKey>`. La comprobación del nombre no cambia.
    - El resto del seed (asientos, inventario, estados, órdenes demo) no cambia.
15. **`lib/db/seed/buildSeedData.test.ts`** (sin BD), con layouts sintéticos. Usan `aventura-en-el-bosque-magico`, que nunca tendrá layout, para que los tests sigan valiendo tras la Fase 4. Se mutan `EVENTS_MOCK` y `VENUE_LAYOUTS_MOCK`, y el `afterEach` existente los restaura.
    - **Nuevo, "un evento cuyo layout difiere del de su recinto guarda su viewBox y su escenario; el recinto conserva los del primero":**
      - aventura pasa al Estadio Nacional de Lima, con un layout de `viewBox` `"0 0 600 300"`, `stage` `PITCH_STAGE` y una zona general `entrada-libre` de capacidad 50 (cualquier sector válido);
      - el recinto conserva el `viewBox` y el escenario de `noche-de-sintetizadores-lima`;
      - el evento aventura tiene `mapViewBox: "0 0 600 300"` y `mapStage: PITCH_STAGE`;
      - el evento de la arena tiene los dos `null`.
    - **Sustituye a "lanza si dos layouts del mismo recinto difieren":** "lanza si una sección del mismo recinto tiene geometría distinta en dos layouts". Es el mismo escenario, con una zona `id: "vip"` (tipo renombrado a "VIP") y otro `path`. Se espera `/geometría distinta/`.
    - **"lanza si dos secciones del mismo recinto comparten slug con distinto nombre":** usa aventura en el Estadio Nacional, sin layout, con un tipo `{ id: "vip", name: "Otro VIP" }`, en lugar del Clásico.
    - **"cada recinto con layout guarda el viewBox y el escenario de su layout"** pasa a "cada evento con layout tiene el viewBox y el escenario de su layout, propios o de su recinto": `event.mapViewBox ?? venue.mapViewBox` y `event.mapStage ?? venue.stage`.
    - **Nuevo, "ningún evento del mock tiene mapa propio salvo los que comparten recinto con otro layout":** hoy ninguno. El test se escribe guiado por los datos: tras la Fase 4 será solo `clasico-del-pacifico`.
    - "un solo Estadio Nacional con geometría y 8 secciones en su orden" no cambia en esta fase.

### Clásico del Pacífico (Fase 4)
16. **Service** (`modules/seating/services/seating.service.ts`, `loadLayout`): selecciona también `events.mapViewBox` y `events.mapStage`. Construye el `VenueRecord` con los del evento si `events.mapViewBox` no es `null` (el CHECK garantiza que van juntos) y, si no, con los del recinto. `toVenueLayout`, `toVenueMap`, las firmas, `hasVenueMap` y `getVenueMapForEvent` no cambian.
17. **Datos y tests de otros módulos:**
    - `modules/tickets/data/demoOrders.ts` (`MT-3HX9RB`): `seats: [{ id: "occidente-F-4", label: "Occidente · Fila F · Asiento 4" }]` y `seatLabel: "Occidente · Fila F · Asiento 4"` (decisión 6).
    - `modules/tickets/components/TicketCard.test.tsx`: las 2 aserciones de "Tribuna Occidente · Fila F · Asiento 12" pasan a "Occidente · Fila F · Asiento 4".
    - `modules/checkout/services/checkout.service.test.ts`: "asientos en un evento sin mapa → invalid-tickets" pasa a usar `{ evento: "el-circo-de-las-estrellas", general: "1", asientos: "general-A-1" }`.
18. **Cierre de la Fase 4:**
    - **`seating.service.test.ts`:**
      - nuevo (con BD), "usa el viewBox y el escenario propios del evento si los tiene": `clasico-del-pacifico` da `"0 0 600 392"` y "CANCHA", y `noche-de-sintetizadores-lima` da `"0 0 600 640"` y "ESCENARIO". Los dos son "Estadio Nacional";
      - nuevo (con BD), "todo evento publicado tiene mapa salvo los excluidos": los slugs de `getEvents()` menos `NO_MAP_SLUGS`, ordenados, son `MAP_SLUGS` ordenado.
    - **`buildSeedData.test.ts`:** "un solo Estadio Nacional con geometría y 8 secciones en su orden" pasa a lo siguiente.
      - El recinto tiene el `viewBox` y el escenario de la arena.
      - Sus 8 secciones tienen `mapPath`:
        - `vip`, `preferencial` y `general` (`general`), y `norte` (`numbered`), con `sortOrder` 0–3;
        - `popular` (`general`), `oriente` y `occidente` (`numbered`), y `palco` (`general`), con `sortOrder` 0–3.
      - Ninguna tiene la capacidad de demostración.
      - El evento del Clásico tiene `mapViewBox: "0 0 600 392"` y `mapStage` igual a `PITCH_STAGE`.

### Diseño de página
19. **`design-system/ticketera/pages/ticket-selection.md`**, en cada cierre de fase con sus recintos:
    - **"Mapa de zonas":**
      - "Recintos en estadio (los 4 mapas mock)" pasa a "(todos los mapas mock)";
      - se añade una fila por recinto nuevo a la tabla de barridos;
      - se añade una viñeta "Deportes (herradura)": la cancha es el sector del escenario con "CANCHA" y reflectores, las tribunas laterales van a los lados y el fondo abajo (decisiones 3 y 5).
    - **"Etiquetas en HTML":** las holguras mínimas medidas por Playwright de cada recinto nuevo (sin selección / con insignia; la píldora de Preferencial de Sol de Verano y de Occidente del Clásico desde `md`).
    - **"Plano de asientos":**
      - "En arco… las zonas numeradas de los 4 mapas mock" pasa a "de todos los mapas mock";
      - en "Planos grandes" se añaden Preferencial de Sueños (21.2 / 31.8 px) y Platea de Ecos (agotada, no se abre);
      - las holguras de la pastilla de zoom y del minimapa incluyen las zonas nuevas.
    - **Línea 5** ("Solo existe para los eventos con mapa…"): sin cambios.

## Criterios de aceptación
Se agrupan por fase. Los de Playwright los ejecuta el developer de la tarea de cierre y los repite el reviewer. Entorno de Playwright:
- `npm run build && npm run start`, con la BD de desarrollo vaciada, migrada y vuelta a sembrar (decisión 7);
- Chromium de `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`) o `npx -y playwright install chromium`;
- anchos 375 × 812, 640 × 900, 768 × 1024, 1024 × 768 y 1440 × 900;
- antes de medir, el mapa se desplaza a la vista (`scrollIntoView`).

**Criterios comunes (CC):** cada fase los aplica a sus eventos.
- [ ] **CC1. Sub-paso 1 (`/eventos/<slug>/entradas`):**
  - el `<svg role="group" aria-label="Mapa de zonas de <recinto>">` tiene una forma por zona, en el orden de los tipos, cuyo `d` contiene arcos (`A`) y ningún `H`/`V`;
  - el escenario es la forma navy con 7 luces y la etiqueta "CANCHA" (deportes) o "ESCENARIO" (resto).
- [ ] **CC2. Etiquetas dentro de su zona:**
  - en cada ancho, `document.elementFromPoint` en las 4 esquinas de cada pieza de la etiqueta (nombre, precio o "Agotado", y la píldora desde `md`), a 1 px hacia dentro, devuelve la forma de su propia zona;
  - la holgura de la decisión 3 es ≥ 3 px;
  - ninguna caja de etiqueta se cruza con otra ni con la del escenario.
- [ ] **CC3. Con selección:** se eligen 2 entradas (o 2 butacas) en cada zona no agotada y se vuelve a "Todas las zonas". Entonces la insignia "✓ 2" se ve tras el precio y la holgura, insignia incluida, es ≥ 0.5 px en cada ancho.
- [ ] **CC4. Sin scroll horizontal** (`document.documentElement.scrollWidth ≤ window.innerWidth`) en el sub-paso 1 y en cada sub-paso 2.
- [ ] **CC5. Plano de cada zona numerada no agotada:**
  - se abre desde su tarjeta como plano en arco: fondo del estadio (`g[aria-hidden][transform]`), sin barra de escenario y con minimapa (`svg[aria-hidden][viewBox="<viewBox del mapa>"]`);
  - en 640, 768, 1024 y 1440, sin zoom, ninguna caja de `[data-seat-id]` se cruza con la del grupo "Zoom del plano" ni con la del minimapa;
  - a 375, con el plano entero, cada `[data-seat-id]` mide lo previsto en su requisito (≥ 24 px en las que cumplen ≤ 400 y ≥ 16 px en Preferencial de Sueños), y ≥ 24 px tras pulsar "Acercar" una vez;
  - tocar una butaca disponible la añade a "Tu compra".
- [ ] **CC6. Zonas agotadas:** pulsar su forma o su tarjeta no abre nada.
- [ ] **CC7. Detalle `/eventos/<slug>`:**
  - el aside es `ZonePricesCard`: h2 "Entradas" y una fila por zona en el orden del mapa, sin los botones "Añadir una entrada…" de `TicketSelector`;
  - a 375 se ve `MobileBuyBar` ("Comprar entradas", enlace a `/eventos/<slug>/entradas`), salvo en un evento agotado;
  - el CTA del hero enlaza a `/eventos/<slug>/entradas`, salvo en un evento agotado.
- [ ] **CC8. Capturas** de cada mapa nuevo a 375 y 1440, y de cada plano nuevo a 375 y 1440.

### Fase 1. Base, Copa del Norte y Los Ecos del Sur
- [ ] Dado T1, cuando se ejecuta `npx vitest run modules/seating lib/db/seed` sin BD y con BD, entonces pasa sin ningún mapa nuevo. Además:
  - `seating.service.test.ts` cumple el requisito 2: no contiene `ZOOM_TO_PICK_SLUGS`, ni la lista fija de 4 slugs, ni `clasico-del-pacifico`;
  - `buildSeedData.test.ts` no contiene `456`.
- [ ] Dado `COPA_DEL_NORTE_VENUE`, entonces `copaDelNorte.mock.test.ts` comprueba sin BD el requisito 5:
  - `viewBox`, `PITCH_STAGE`, orden, ids, `ticketTypeId`, tipos y capacidades;
  - los sectores exactos y los `labelPos`;
  - Occidente: filas, butacas por fila (39), `seatViewBox`, escala, accesibles exactas, 20/2/17 y `occidente-A-2` disponible.

  Con BD comprueba:
  - `getVenueMapBySlug` coincide con el layout más los datos del evento;
  - `resolveSeats(map, ["occidente-A-2"])` da "Occidente · Fila A · Asiento 2".
- [ ] Dado `ECOS_DEL_SUR_VENUE`, entonces `losEcosDelSur.mock.test.ts` comprueba sin BD el requisito 6:
  - Platea con 61 butacas (6, 8, 9, 11, 13 y 14), todas `occupied` y sin accesibles;
  - General de pie (300).

  Con BD comprueba:
  - el mapa coincide;
  - las dos zonas están `sold-out`.
- [ ] Dado `npx vitest run` sin BD y con BD (una sola ejecución con BD a la vez), entonces pasa entero. Siguen pasando sin cambios `checkout.service.test.ts` ("evento agotado → sold-out" con Ecos) y `demoOrders.test.ts`.
- [ ] Dada la BD de desarrollo vaciada y vuelta a sembrar, cuando se ejecutan `npm run lint` y `npm run build`, entonces pasan sin errores. Las rutas `/eventos/copa-del-norte-trujillo/entradas` y `/eventos/los-ecos-del-sur-arequipa/entradas` quedan prerenderizadas.
- [ ] Playwright, con CC1–CC8 en los 2 eventos:
  - `/checkout?evento=copa-del-norte-trujillo&occidente=1&asientos=occidente-A-2` muestra el formulario de pago con "Occidente · Fila A · Asiento 2";
  - `/checkout?evento=copa-del-norte-trujillo&popular=2&oriente=1` muestra el formulario de pago;
  - `/checkout?evento=los-ecos-del-sur-arequipa&platea=1&asientos=platea-A-1` muestra el estado de evento agotado, no el formulario;
  - el detalle de Ecos muestra "Entradas agotadas" en el aside, Galería y Platea con "Agotado", y no tiene `MobileBuyBar`.
- [ ] Dados `/eventos/el-circo-de-las-estrellas` y `/eventos/aventura-en-el-bosque-magico`, entonces siguen con `TicketSelector` ("Añadir una entrada <tipo>"), y sus `/entradas` dan el 404 "No encontramos este evento".
- [ ] Dado el cierre de la fase, entonces:
  - `ticket-selection.md` incluye Copa y Ecos (requisito 19);
  - el resumen al usuario indica que, tras el merge, debe vaciar y volver a sembrar su BD de desarrollo (`npm run db:migrate && npm run db:seed`). Sin ese paso, el CTA de esos eventos lleva a un 404 (decisión 7).

### Fase 2. Sol de Verano, Arena y Mar, Micro abierto y Sueños andinos
- [ ] Dados los 4 recintos, entonces cada `<recinto>.mock.test.ts` comprueba sin BD su requisito (7, 8, 9 o 10):
  - `viewBox`, `STADIUM_STAGE`, orden, ids, tipos y capacidades;
  - sectores y `labelPos` exactos;
  - en las numeradas: filas, butacas por fila, `seatViewBox`, escala, accesibles exactas, recuentos y la butaca de ejemplo disponible (`mesa-A-2`, `preferencial-A-5`).

  Con BD, cada uno comprueba:
  - el mapa coincide;
  - `resolveSeats` da "Mesa · Fila A · Asiento 2" y "Preferencial · Fila A · Asiento 5".
- [ ] Dado T1–T4, entonces ninguno toca `seating.service.test.ts`, `buildSeedData.test.ts` ni `venueMaps.mock.ts`, y los dos tests siguen pasando tras el cierre.
- [ ] Dado `npx vitest run` sin BD y con BD (de uno en uno), entonces pasa entero.
- [ ] Dada la BD vaciada y vuelta a sembrar, entonces `npm run lint` y `npm run build` pasan, y las 4 rutas `/entradas` nuevas quedan prerenderizadas.
- [ ] Playwright, con CC1–CC8 en los 4 eventos, y además:
  - desde `md`, la píldora "Últimas entradas" de Preferencial (Sol de Verano) se ve entera dentro de su banda, a ≥ 3 px (previsto 5.5 a 1024);
  - `/checkout?evento=micro-abierto-arequipa&mesa=1&asientos=mesa-A-2` y `/checkout?evento=suenos-de-una-noche-andina&preferencial=1&asientos=preferencial-A-5` muestran el formulario con su butaca;
  - `/checkout?evento=festival-sol-de-verano&general=1&preferencial=1&vip=1` y `/checkout?evento=festival-arena-y-mar-piura&general=2&vip=1` muestran el formulario.
- [ ] Dado el cierre, entonces:
  - `ticket-selection.md` incluye los 4 recintos;
  - el resumen al usuario recuerda volver a sembrar la BD.

### Fase 3. Mapa propio por evento en la BD
- [ ] Dada la migración `0005`, cuando se aplica a `ticketera_dev` con `npm run db:migrate`, entonces:
  - `events` tiene `map_view_box text NULL`, `map_stage jsonb NULL` y `events_map_override_check`;
  - no cambia ningún dato existente.
- [ ] Dado `lib/db/constraints.test.ts` con BD, entonces los dos casos del requisito 13 pasan.
- [ ] Dado `DATABASE_URL_TEST= npx vitest run lib/db/seed/buildSeedData.test.ts`, entonces pasan los tests del requisito 15. El archivo no contiene "Dos layouts distintos" y usa `aventura-en-el-bosque-magico` en los tests sintéticos.
- [ ] Dado el seed real, entonces ningún evento tiene `mapViewBox` (todavía no hay mapas por evento) y `getVenueMapBySlug` da lo mismo que antes en todos los mapas: `seating.service.test.ts` pasa sin cambios.
- [ ] Dado `npx vitest run` sin BD y con BD, y la BD de desarrollo migrada y vuelta a sembrar, entonces `npm run lint` y `npm run build` pasan.
- [ ] Dado `docs/architecture/erd.md`, entonces documenta las columnas, el CHECK y la nota del requisito 13.
- [ ] Dado el cierre, entonces el resumen al usuario indica que, tras el merge, debe ejecutar `npm run db:migrate` en su BD de Neon (migración `0005`, aditiva) y volver a sembrarla.

### Fase 4. Clásico del Pacífico
- [ ] Dado `CLASICO_VENUE`, entonces `clasicoDelPacifico.mock.test.ts` comprueba sin BD el requisito 11:
  - `viewBox`, `PITCH_STAGE`, orden, ids, tipos y capacidades;
  - sectores y `labelPos`;
  - Oriente y Occidente: filas, `seatViewBox`, escala, accesibles exactas, recuentos, `oriente-A-1` y `occidente-A-3` disponibles, y `occidente-F-4` ocupada.

  Con BD comprueba:
  - `map.venue` es "Estadio Nacional", `map.viewBox` es `"0 0 600 392"` y `map.stage.label` es "CANCHA";
  - el mapa coincide con el layout;
  - `resolveSeats` da "Oriente · Fila A · Asiento 1";
  - `resolveSeats(map, ["occidente-F-4"])` es `null` (ocupada).
- [ ] Dado `seating.service.test.ts`, entonces pasan los dos tests nuevos del requisito 18, en particular "todo evento publicado tiene mapa salvo `el-circo-de-las-estrellas` y `aventura-en-el-bosque-magico`".
- [ ] Dado `demoOrders.test.ts` con BD, entonces "si el evento tiene mapa, cada asiento existe…" valida `MT-3HX9RB` con `occidente-F-4` y la etiqueta "Occidente · Fila F · Asiento 4". `TicketCard.test.tsx` pasa con esa etiqueta. `MT-9LM2TC` no cambia.
- [ ] Dado `checkout.service.test.ts`, entonces "asientos en un evento sin mapa" usa el circo y pasa.
- [ ] Dado `buildSeedData.test.ts`, entonces el test del Estadio Nacional cumple el requisito 18 y los del requisito 15 siguen pasando.
- [ ] Dado `npx vitest run` sin BD y con BD, y la BD de desarrollo migrada y vuelta a sembrar, entonces `npm run lint` y `npm run build` pasan. `/eventos/clasico-del-pacifico/entradas` queda prerenderizada.
- [ ] Playwright, con CC1–CC8 en el Clásico, y además:
  - desde `md`, la píldora "Últimas entradas" de Occidente se ve entera dentro de su zona, a ≥ 3 px (previsto 3.1 a 1024);
  - `/eventos/noche-de-sintetizadores-lima/entradas` sigue mostrando "ESCENARIO" y sus 4 zonas, sin cambios;
  - `/checkout?evento=clasico-del-pacifico&oriente=1&asientos=oriente-A-1`, `…&occidente=1&asientos=occidente-A-3` y `…&popular=2&palco=1` muestran el formulario de pago;
  - `/checkout?evento=clasico-del-pacifico&occidente=1&asientos=occidente-F-4` muestra "No pudimos preparar tu compra" (butaca ocupada).
- [ ] Dado `/mis-entradas` con la cuenta demo, entonces la entrada de `MT-3HX9RB` muestra "Occidente · Fila F · Asiento 4".
- [ ] Dado el cierre, entonces:
  - `ticket-selection.md` incluye el Clásico;
  - el resumen al usuario recuerda migrar y volver a sembrar su BD de Neon.

## Diseño técnico
- **Rutas (`app/`):** sin cambios. Ya se adaptan solas:
  - `app/(site)/eventos/[slug]/page.tsx`: aside y barra según `getVenueMapBySlug`;
  - `app/(purchase)/eventos/[slug]/entradas/page.tsx`: `generateStaticParams` con `hasVenueMap`;
  - `app/(purchase)/checkout/page.tsx`: "Volver a entradas" según `hasVenueMap`.
- **Componentes:** ninguno nuevo ni modificado. No se instala nada de shadcn.
  - Se usan, existentes: `VenueMapView`, `ZoneCards`, `SeatPlan`, `SeatPlanMinimap` y `ZonePricesCard` de `modules/seating/components/`, y `MobileBuyBar` (ídem).
  - Siguen en los eventos sin mapa, existentes: `TicketSelector` y `PreselectedTicketSelector` (`modules/events/components/`).
- **Datos** (`modules/seating/data/`):
  - `stadium.mock.ts`: añade `PITCH_STAGE`;
  - 7 archivos nuevos de recinto con su test (requisito 4). No existen porque cada recinto es propio de su evento;
  - `venueMaps.mock.ts`: los añade al final de `MOCK_VENUES`.
- **Service:** `modules/seating/services/seating.service.ts` (Fase 4, requisito 16). Utils, hooks, schema y tipos de `seating` no cambian.
- **BD** (Fase 3):
  - `lib/db/schema/venues.ts` (tipo `MapStage`) y `lib/db/schema/events.ts` (columnas y CHECK);
  - `drizzle/0005_event_map_override.sql` y `drizzle/meta/*`;
  - `lib/db/seed/buildSeedData.ts`;
  - `docs/architecture/erd.md`.
- **Contrato:** sin API HTTP.
  - `VenueLayout`, `VenueMap`, `getVenueMapBySlug`, `resolveSeats`, los ids `<zona>-<FILA>-<n>`, `asientos=` y `?zona=` no cambian.
  - Contrato interno nuevo:

  ```ts
  // modules/seating/data/stadium.mock.ts
  export const PITCH_STAGE: z.input<typeof venueLayoutSchema>["stage"] = { ...STADIUM_STAGE, label: "CANCHA" };

  // lib/db/schema/venues.ts
  export type MapStage = { label: string; path: string; labelPos: { x: number; y: number }; lights?: { x: number; y: number }[] };

  // lib/db/schema/events.ts (dentro de pgTable("events", …))
  mapViewBox: text("map_view_box"),            // NULL = el del recinto
  mapStage: jsonb("map_stage").$type<MapStage>(), // NULL = el del recinto
  // check("events_map_override_check", sql`(${t.mapViewBox} IS NULL) = (${t.mapStage} IS NULL)`)
  ```

  ```sql
  -- drizzle/0005_event_map_override.sql (generada por drizzle-kit)
  ALTER TABLE "events" ADD COLUMN "map_view_box" text;
  ALTER TABLE "events" ADD COLUMN "map_stage" jsonb;
  ALTER TABLE "events" ADD CONSTRAINT "events_map_override_check" CHECK (("events"."map_view_box" IS NULL) = ("events"."map_stage" IS NULL));
  ```
- **Otros módulos** (Fase 4, solo datos demo y tests):
  - `modules/tickets/data/demoOrders.ts`;
  - `modules/tickets/components/TicketCard.test.tsx`;
  - `modules/checkout/services/checkout.service.test.ts`.

## Reutilización
- **Geometría:** `getAnnularSectorPath`, `getArcPoints` y `AnnularSector` (`utils/annularSector.ts`), y `generateArcSeatRows` y `getRowEdgeLabelPoints` (`utils/arcSeatRows.ts`).
- **Datos compartidos:** `STADIUM_CENTER`, `STAGE_SECTOR`, `STADIUM_STAGE` y `MockVenue` (`data/stadium.mock.ts`).
- **Patrón de un archivo por recinto con su test,** con partes sin BD y con BD: `risasSinFiltro.mock.ts` y `risasSinFiltro.mock.test.ts` son la plantilla.
- **Invariantes del mapa curvo** de `seating.service.test.ts`. Tras el requisito 2 se aplican solas a cada recinto registrado.
- **Ocupación determinista** (`getGeneratedSeatStatus`) y estados del seed (`getAvailabilityStatus`): el `occupiedRatio` de cada zona reproduce el estado del mock.
- **Seed existente** (`buildSeedData`): copia los layouts nuevos sin cambios hasta la Fase 3.
- **Detalle, `/entradas` y checkout:** ya funcionan con cualquier evento con mapa (contrato H, precarga, `?zona=`).
- Nada nuevo de shadcn ni dependencias.

## Tests
Los datos mock no son una unidad con lógica propia, pero sus invariantes se prueban porque de ellas dependen el plano, el seed, el checkout y las órdenes demo, como en las specs del estadio y de recintos curvos. El seed y el service sí tienen lógica nueva y llevan tests.

- **`modules/seating/services/seating.service.test.ts`:**
  - F1 T1: requisito 2, guiado por los datos;
  - F4: los 2 tests del requisito 18.
- **Un test por recinto** (`<recinto>.mock.test.ts`, 7 nuevos), con la estructura de `risasSinFiltro.mock.test.ts`:
  - **sin BD**, sobre `venueLayoutSchema.parse(<X>_VENUE.layout)` y `<X>_VENUE.sectors`: `viewBox` y escenario; ids, `ticketTypeId`, `kind` y capacidades en orden; sectores exactos; `labelPos`; por zona numerada, filas y butacas por fila, total, `seatViewBox`, `planTransform.scale`, accesibles exactas, recuentos de estado y la butaca de ejemplo;
  - **con BD** (`describeWithDb`): `getVenueMapBySlug` coincide con el layout más los datos del evento, y `resolveSeats` da la etiqueta de la butaca de ejemplo. Ecos comprueba en su lugar que las dos zonas están `sold-out`. El Clásico comprueba además su `viewBox`, "CANCHA" y que `occidente-F-4` es `null`.
- **`lib/db/seed/buildSeedData.test.ts`:**
  - F1 T1: el recuento derivado (requisito 3);
  - F3: los layouts sintéticos (requisito 15): mapa propio por evento, geometría distinta por sección y nombres distintos;
  - F4: el Estadio Nacional (requisito 18).
- **`lib/db/constraints.test.ts`** (F3): `events_map_override_check` (requisito 13).
- **`modules/tickets`** (F4): `demoOrders.test.ts` no cambia; valida la butaca nueva con BD. `TicketCard.test.tsx` cambia 2 aserciones (requisito 17).
- **`modules/checkout/services/checkout.service.test.ts`** (F4): el caso "sin mapa" pasa al circo.
- **Sin cambios:** `TicketSelection.test.tsx`, `useSeatSelection.test.ts`, `seatIds.test.ts`, `seatNavigation.test.ts`, `bestSeats.test.ts`, `selectionSummary.test.ts`, `arcSeatRows.test.ts`, `annularSector.test.ts`, `seating.schema.test.ts`, `zoneTone.test.ts`, `venueLayoutRecords.test.ts`, los tests de `modules/events` (`TicketSelector`, `EventCard`, `events.service`), `organizer.service.test.ts` y el resto de `modules/checkout` y `modules/tickets`.
- **Verificación final de cada fase** (reviewer):
  - `npx vitest run` sin BD y con BD (una sola ejecución con BD a la vez);
  - BD de desarrollo migrada y vuelta a sembrar;
  - `npm run lint` y `npm run build`;
  - el script de Playwright de la fase.

## Plan de tareas
**Coordinación:**
- **Orden de las fases:** F1 → F2 → F3 → F4, una por sesión. El usuario confirmó la migración, así que F3 y F4 se ejecutan (Preguntas abiertas, resuelta).
- **`design-system/ticketera/pages/ticket-selection.md`:** lo tocan las tareas de cierre (F1 T4, F2 T5 y F4 T3). No se ejecutan en la misma sesión que otra tarea que edite ese archivo, como la enmienda F6 de `seating-stadium-map.md` o `design-alignment-purchase-flow.md`. Esta spec no toca `ZonePricesCard`, `MobileBuyBar`, `TicketSelection` ni `app/`, aunque esas specs sigan en curso.
- **Developers en paralelo** (tareas de recinto):
  - solo tocan sus 2 archivos;
  - verifican sin BD: `DATABASE_URL_TEST= npx vitest run modules/seating/data/<recinto>.mock.test.ts modules/seating` y `npx eslint <sus archivos>`;
  - no ejecutan `build` ni tocan el agregador.
- **Tarea de cierre de cada fase** (developer):
  1. registra los recintos en el agregador;
  2. ejecuta `npx vitest run` sin BD y después con BD (una sola ejecución con BD a la vez);
  3. vacía y vuelve a sembrar `ticketera_dev` (con `npm run db:migrate` desde F3);
  4. ejecuta `npm run lint`, `npm run build` y `npm run start`;
  5. ejecuta el script de Playwright y anota las holguras en `ticket-selection.md`.

  El reviewer lo repite.
- **BD local** (decisión 7): solo `127.0.0.1:5433` (`ticketera_dev`/`ticketera_test`). Nunca la de Neon del usuario.

### Fase 1. Base, Copa del Norte y Los Ecos del Sur (4 tareas, 9 archivos)
- [ ] T1. Base guiada por los datos: `PITCH_STAGE`, `seating.service.test.ts` sin listas fijas y `buildSeedData.test.ts` sin el literal 456 (requisitos 1–3).
  - Archivos: `modules/seating/data/stadium.mock.ts`, `modules/seating/services/seating.service.test.ts`, `lib/db/seed/buildSeedData.test.ts`.
  - Depende de: —.
  - Secuencial (base: test compartido y `lib/`).
  - Verificar `npx vitest run modules/seating lib/db/seed`, sin BD y con BD.
- [ ] T2. Copa del Norte en herradura (requisito 5), con su test.
  - Archivos: `modules/seating/data/copaDelNorte.mock.ts` (nuevo), `modules/seating/data/copaDelNorte.mock.test.ts` (nuevo).
  - Depende de: T1. En paralelo con T3.
- [ ] T3. Los Ecos del Sur, agotado (requisito 6), con su test.
  - Archivos: `modules/seating/data/losEcosDelSur.mock.ts` (nuevo), `modules/seating/data/losEcosDelSur.mock.test.ts` (nuevo).
  - Depende de: T1. En paralelo con T2.
- [ ] T4. Cierre: registro en el agregador, verificación con BD, build, Playwright de la Fase 1 y diseño de página (requisito 19).
  - Archivos: `modules/seating/data/venueMaps.mock.ts`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T2 y T3. Secuencial.

### Fase 2. Sol de Verano, Arena y Mar, Micro abierto y Sueños andinos (5 tareas, 10 archivos)
- [ ] T1. Sol de Verano (requisito 7), con su test.
  - Archivos: `modules/seating/data/festivalSolDeVerano.mock.ts` (nuevo), `modules/seating/data/festivalSolDeVerano.mock.test.ts` (nuevo).
  - Depende de: Fase 1. En paralelo con T2–T4.
- [ ] T2. Arena y Mar (requisito 8), con su test.
  - Archivos: `modules/seating/data/festivalArenaYMar.mock.ts` (nuevo), `modules/seating/data/festivalArenaYMar.mock.test.ts` (nuevo).
  - Depende de: Fase 1. En paralelo.
- [ ] T3. Micro abierto (requisito 9), con su test.
  - Archivos: `modules/seating/data/microAbierto.mock.ts` (nuevo), `modules/seating/data/microAbierto.mock.test.ts` (nuevo).
  - Depende de: Fase 1. En paralelo.
- [ ] T4. Sueños de una noche andina (requisito 10), con su test.
  - Archivos: `modules/seating/data/suenosDeUnaNocheAndina.mock.ts` (nuevo), `modules/seating/data/suenosDeUnaNocheAndina.mock.test.ts` (nuevo).
  - Depende de: Fase 1. En paralelo.
- [ ] T5. Cierre: agregador, verificación con BD, build, Playwright de la Fase 2 y diseño de página.
  - Archivos: `modules/seating/data/venueMaps.mock.ts`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T1–T4. Secuencial.

### Fase 3. Mapa propio por evento en la BD (2 tareas, 9 archivos)
Entregable por sí misma: la BD y el seed admiten mapas por evento, verificado con layouts sintéticos. No cambia nada visible.
- [ ] T1. Esquema, migración `0005`, test de la restricción y ERD (requisito 13).
  - Archivos: `lib/db/schema/venues.ts`, `lib/db/schema/events.ts`, `drizzle/0005_event_map_override.sql` (generado), `drizzle/meta/0005_snapshot.json` (generado), `drizzle/meta/_journal.json`, `lib/db/constraints.test.ts`, `docs/architecture/erd.md`.
  - Depende de: Fase 2. Secuencial (`lib/`).
  - Aplicar la migración solo a la BD local (`npm run db:migrate` sobre `ticketera_dev`; la de test la migra `testGlobalSetup`).
- [ ] T2. Seed con mapa propio por evento y coherencia por sección, con sus tests (requisitos 14 y 15).
  - Archivos: `lib/db/seed/buildSeedData.ts`, `lib/db/seed/buildSeedData.test.ts`.
  - Depende de: T1. Secuencial.
  - Al terminar: suite completa con BD, BD de desarrollo vaciada, migrada y vuelta a sembrar, `npm run lint` y `npm run build`.

### Fase 4. Clásico del Pacífico (3 tareas, 10 archivos)
- [ ] T1. Clásico en herradura con Palco y Popular al fondo (requisito 11), con su test.
  - Archivos: `modules/seating/data/clasicoDelPacifico.mock.ts` (nuevo), `modules/seating/data/clasicoDelPacifico.mock.test.ts` (nuevo).
  - Depende de: Fase 3. En paralelo con T2.
- [ ] T2. Orden demo y tests de otros módulos (requisito 17, decisión 6).
  - Archivos: `modules/tickets/data/demoOrders.ts`, `modules/tickets/components/TicketCard.test.tsx`, `modules/checkout/services/checkout.service.test.ts`.
  - Depende de: Fase 3. En paralelo con T1.
  - Verificar sin BD `modules/tickets modules/checkout`.
- [ ] T3. Cierre:
  - service con mapa propio por evento (requisito 16);
  - registro en el agregador;
  - tests de cierre (requisito 18);
  - verificación con BD, build y Playwright de la Fase 4;
  - diseño de página.
  - Archivos: `modules/seating/services/seating.service.ts`, `modules/seating/data/venueMaps.mock.ts`, `modules/seating/services/seating.service.test.ts`, `lib/db/seed/buildSeedData.test.ts`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T1 y T2. Secuencial.

## Preguntas abiertas
Ninguna.

- ~~**¿Se hace la migración del Clásico del Pacífico (Fases 3 y 4)?**~~ **Resuelta (respuesta del usuario, 2026-10-04): sí, con migración.** Se mantienen las Fases 3 y 4 y la migración aditiva `0005` (dos columnas nulas en `events` y un CHECK). El cierre recuerda aplicarla en Neon con `npm run db:migrate` y volver a sembrar.
