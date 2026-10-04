# Mapa de estadio curvo y selección de entradas en dos sub-pasos

- Módulo: seating
- Estado: borrador

## Objetivo
Llevar la pantalla `/eventos/<slug>/entradas` (paso 1 "Entradas" de la compra) al nuevo diseño "Elige tus entradas":
- mapa de estadio curvo, con escenario semicircular y zonas en arco;
- tarjetas de zona debajo del mapa;
- dos sub-pasos internos dentro del paso "Entradas": 1/2 elegir zona, y 2/2 elegir la cantidad o las butacas;
- plano de butacas en arco con la forma del sector, el resto del estadio atenuado y un minimapa.

Para estrenarlo se añade el evento "Festival Vive Latino Lima" (Costa Verde, Lima) con 5 zonas. Solo UI/UX con datos mock (sin backend), español (Perú), PEN.

Es una **continuación de `docs/specs/seating-ticket-selection.md`** (en adelante, "spec base"), que no se edita:
- siguen vigentes sus contratos A (stepper de 3 pasos; desde `docs/specs/design-alignment-purchase-flow.md` lo dibuja `components/shared/PurchaseShell.tsx`, que sustituye a `PurchaseStepper`), B (`getVenueMapBySlug`, `hasVenueMap`, `parseSeatIds`, `resolveSeats`, `getVenueMapForEvent`, ids `<zona>-<FILA>-<n>`), C (paso a `/checkout` con `asientos`) y H (`ZonePricesCard` y `MobileBuyBar` en el detalle; la Fase 6 amplía `ZonePricesCard` con un enlace por zona, decisión 31);
- siguen vigentes sus decisiones 1–14, salvo lo que esta spec amplía de forma explícita (decisiones 4, 5 y 9).

Diseño de referencia: capturas de "Elige tus entradas" (sub-paso 1: mapa y tarjetas; sub-paso 2: plano de "Tribuna Oriente") y del detalle del evento. De ahí salen la forma, el layout, el flujo y los textos. La identidad visual sigue siendo Mentec (`design-system/ticketera/MASTER.md`): tokens, Creato Display, marca "Mentec Tickets" y los tonos por precio de `zoneTone`. **No** se usan el índigo, el naranja, Poppins, los hex ni el logo "Ticketera" de las capturas.

**Rediseño (enmienda del 2026-10-03, Fases 2–6).** La Fase 1 ya está implementada y no cambia. Las Fases 2–4 originales no se implementaron y se reescriben aquí:
- **Pedido del usuario (1):** "Vamos a hacer algunos ajustes visuales, en la sección de Elige tu zona / Elige tus asientos o Entradas no termino de entender el UX/UI, rediseña esa sección además mejora la librería de selección de asientos, se ve muy básico, busca referencias en caso no sepas cómo se debe hacer".
- **Pedido del usuario (2):** "elegir entradas debe tener esta vista profesional, guiarse de Joinnus o Ticketmaster". Lo acompaña la captura de Claude Design del sub-paso 1, que es el **objetivo visual explícito** de ese sub-paso:
  - tarjeta blanca "Elige tus entradas" con "Paso 1 de 2 · Elige una zona" a la derecha del título;
  - debajo, el mapa del estadio curvo sobre un gris muy claro: escenario semicircular navy con "ESCENARIO" y un arco de luces; sectores anulares coloreados por precio en una escala de azules (del más oscuro, el más cercano y caro, al más claro), separados por blanco;
  - debajo del mapa, tarjetas de zona en 2 columnas: barra vertical del color de la zona, nombre, subtítulo con icono ("General · sin butaca" o "Numerada"), "c/u" pequeño sobre el precio y un chevron.
- **Pedido del usuario (3), "paso 2 de elegir entradas"**, con la captura `images/15.png`. Es el **objetivo visual explícito del sub-paso 2 de una zona numerada**:
  - título "Elige tus entradas" con "Paso 2 de 2 · Elige tus butacas" a la derecha;
  - migas "‹ Todas las zonas › Tribuna Oriente";
  - fila "**Tribuna Oriente** · S/ 155 c/u" con "2 de 6 butacas" a la derecha;
  - lienzo con el sector delineado en azul sobre un fondo lila claro, los demás sectores en gris claro y el escenario navy con luces, parcialmente visible al costado;
  - filas con su letra en los dos extremos, siguiendo la curva;
  - butacas circulares grandes: lavanda (disponibles), grises con "×" (ocupadas) y oscuras con check blanco (elegidas);
  - minimapa arriba a la izquierda, con el estadio y la zona actual resaltada; controles +, − y pantalla completa abajo a la derecha, ambos superpuestos al lienzo;
  - debajo, la leyenda "● Disponible · S/ 155 ✓ Elegida ● Ocupada" y "2 elegidas" a la derecha.
- El sub-paso 2 de una zona de pie (sin captura) y lo que las capturas no muestran (tooltip, mejores asientos, móvil) siguen los patrones de Ticketmaster y Joinnus con el mismo acabado (ver "Investigación y diagnóstico").
- **Pedido del usuario (4):** "buscar una librería completa para la vista de elegir entradas". Se evalúan las librerías y servicios completos de mapas de butacas en "Librería del plano". La recomendación (decisión 22) es seguir con el SVG propio, mejorado para cumplir las dos capturas, y dejar preparada una integración SaaS opcional, que el usuario decide (Preguntas abiertas 17).
- La escala de azules se traduce a tokens Mentec (decisión 28), no al índigo ni al lavanda literales.
- **Nuevas fases:**
  - Fase 2: escala de tonos.
  - Fase 3: sub-paso 1 con el diseño de la captura, sub-paso 2 funcional y resumen móvil.
  - Fase 4: plano de butacas renovado.
  - Fase 5: plano curvo con contexto y minimapa (la antigua Fase 3).
  - Fase 6: precarga desde la URL (la antigua Fase 4), ampliada con la entrada directa por zona desde el detalle (pedido 5, enmienda del 2026-10-04).

**Enmienda del 2026-10-04 (Fase 6 ampliada y registro de la Fase 5).**
- **Pedido del usuario (5):** "para mejorar la fricción del usuario, desde aquí al seleccionar: VIP, Preferencial, General o Tribuna Norte, deben convertirse en botones para que me lleven a la siguiente pantalla donde se eligen las entradas y se muestren de forma específica la entrada que seleccione, esto elimina un paso para el usuario para que elija las entradas directamente desde esta ventana". "Aquí" es la tarjeta "Entradas" del aside del detalle `/eventos/[slug]` (`ZonePricesCard`). Se resuelve en la Fase 6 (decisiones 31–33): cada zona no agotada del aside enlaza a `/eventos/<slug>/entradas?zona=<zoneId>`, que abre directamente el sub-paso 2 de esa zona.
- **Decisión del usuario (con el pedido 5):** el botón "Elegir entradas →" del aside pasa a llamarse **"Ver mapa de zonas"** (con la flecha): las filas ya eligen zona y el botón abre el mapa del recinto (sub-paso 1) con todas las zonas. El CTA del hero ("Comprar entradas · desde S/ X") y la barra móvil del detalle ("Comprar entradas") no cambian (decisión 31).
- **Fase 5:** se registran en los requisitos 29–31, la decisión 12, los tests y la lista de archivos de F5 T3 las desviaciones implementadas y aprobadas por el reviewer (minimapa superpuesto solo si cabe, ancho y franja según el lienzo con container queries, `insetBottom` y medidas del minimapa).
- **Ruta del paso 1:** `docs/specs/design-alignment-purchase-flow.md` (aprobada, en implementación) mueve la página a `app/(purchase)/eventos/[slug]/entradas/page.tsx` y sustituye `PurchaseStepper` por `components/shared/PurchaseShell.tsx`. La Fase 6 usa esa ruta y depende de que su Fase 1 esté cerrada.

**Enmienda del 2026-10-04 (Fase 7): compra combinada y mapa no interactivo.** Las Fases 1–6 están implementadas y no se rehacen; la Fase 7 cambia lo que se indica en la decisión 41.
- **Pedido del usuario (6)**, sobre el sub-paso 1 de `/eventos/noche-de-sintetizadores-lima/entradas` ("Elige tus entradas · Paso 1 de 2 · Elige una zona", con el mapa arriba y debajo las tarjetas VIP "General · sin butaca" S/ 550.00 "Últimas entradas", Preferencial, General y Tribuna Norte "Numerada · elige tu butaca"): "Aquí debo poder comprar combinados con VIP, General, Preferencial y demás en caso se requiera, y también independiente. Además los cuadrados azules no deben ser botones, solo la parte inferior, ya que genera confusión."
- **Diagnóstico** (código de F3–F6):
  - Combinar ya es posible (abrir una zona, elegir, "Todas las zonas", abrir otra), pero no se percibe. Cada zona de pie obliga a entrar en un sub-paso 2 y salir de él (3 acciones por zona), el indicador dice "Elige **una** zona" y nada sugiere que se puedan sumar zonas.
  - Las formas del mapa (`<path role="button" tabIndex={0}>`, con clic, Enter/Espacio, hover y foco) repiten lo que hacen las tarjetas y no parecen botones. Son "los cuadrados azules" del pedido: con la BD local sin la geometría curva se ven rectangulares (ver la coordinación de la Fase 7).
- **Se resuelve en la Fase 7** (decisiones 34–41, requisitos 40–47):
  - tarjetas de zona con el control en línea: stepper −/+ en las de pie y "Elegir butacas" en las numeradas;
  - "Agregar otra zona" al terminar en el sub-paso 2;
  - "Quitar" por línea en "Tu compra";
  - el mapa pasa a ser una ilustración: no se pulsa ni se enfoca, y solo lo resaltan las tarjetas.

## Investigación y diagnóstico

### Referencias consultadas
**Sin red al redactar.** El proxy bloquea ticketmaster.com, help.ticketmaster.com, seatgeek.com, seats.io, docs.seats.io, joinnus.com y teleticket.com.pe. Solo respondieron el registro de npm y `raw.githubusercontent.com` (README de `@seatsio/seatsio-react`). Por eso, los patrones de abajo salen del conocimiento de esos productos (versiones web y móvil de 2025–2026), **no de una verificación en vivo**. Ver Preguntas abiertas 19.

| Patrón | Quién lo usa | ¿Se adopta? | Por qué |
|---|---|---|---|
| Mapa del recinto como protagonista, con las zonas coloreadas por precio y la lista de zonas como leyenda | Ticketmaster (ISM), SeatGeek, Seats.io (categorías), Eventbrite | Sí (F2–F3) | El color dice "cuánto cuesta" sin leer. Es además la captura del usuario |
| Lista o tarjetas de zona sincronizadas con el mapa: el hover o el foco en una resalta la otra y atenúa el resto | Ticketmaster, SeatGeek | Sí (F3) | Une las dos vistas; hoy son dos bloques independientes |
| Tarjetas de zona con precio, tipo y chevron, y el paso siguiente en la misma pantalla | Joinnus, captura de Claude Design | Sí (F3) | Es el objetivo visual del usuario |
| Panel de cantidad con stepper y subtotal por zona general | Joinnus, Teleticket | Sí (F3) | Para zonas de pie no hay nada que elegir en un plano |
| "Desde S/ X" por sección | Ticketmaster, SeatGeek (secciones con varios precios) | No | Aquí una zona = un precio. "Desde" queda para el evento (MASTER §10) |
| Filtro o slider de precio y orden por precio | Ticketmaster, SeatGeek (cientos de ofertas) | No | Cada evento tiene de 2 a 5 zonas (YAGNI) |
| "Mejores asientos" con cantidad, además de la elección manual | Ticketmaster ("Best available"), AXS, Seats.io | Sí (F4) | El botón actual no deja elegir cuántos |
| Transición animada de la zona a sus butacas | Ticketmaster, Seats.io (zoom a sección) | Sí (F3–F4) | El usuario no pierde el contexto |
| Número de butaca visible al acercar (nivel de detalle) | Seats.io, Ticketmaster | Sí (F4) | Sin número, el plano parece un patrón de puntos |
| Tooltip con fila, butaca y precio al pasar el puntero o enfocar | Ticketmaster, SeatGeek, Seats.io, Eventbrite | Sí (F4) | Hoy no hay ninguna información al pasar el puntero |
| Estados con forma y color: libre con contorno, elegida rellena con check, ocupada como punto gris pequeño, accesible con icono | Seats.io, Ticketmaster | Sí (F4) | Las ocupadas con "×" grande dominan el dibujo |
| Minimapa y controles de zoom junto al plano | Ticketmaster (minimapa al acercar), Seats.io | Sí (F5) | Orientación en las tribunas en arco |
| Bandeja "Tu selección" con chips que se pueden quitar, y total siempre visible | Eventbrite, AXS, Seats.io | Sí (F3–F4) | Ya existen los chips; se acercan al plano y el total no se pierde en móvil |
| Hoja inferior (bottom sheet) en móvil | Ticketmaster móvil, AXS, Eventbrite | Sí, para el resumen (F3) | El mapa y el plano no se tapan mientras se elige (decisión 21) |
| Temporizador de reserva | Ticketmaster, Teleticket, Joinnus | No | No hay reserva real (sin backend); un contador ficticio sería engañoso. Ver Preguntas abiertas 15 |
| Vista desde el asiento, reventa, "deal score" | Ticketmaster, SeatGeek | No | Fuera de alcance |
| Regla de no dejar una butaca suelta | Seats.io | No | Cambiaría la lógica de compra. Ver Preguntas abiertas 16 |

### Diagnóstico de la pantalla actual
Fuentes: capturas `scratchpad/shots/redesign-before-{noche-de-sintetizadores-lima,festival-vive-latino-lima}-{375,1440}[-plan].png` y capturas 1, 4 y 6 del usuario.
1. **Tres tarjetas para un mismo paso** ("Elige tu zona", "Elige tus asientos" y "Entradas"), con tres h2 y dos entradas para la misma acción: el mapa y la lista. El stepper −/+ está al fondo, en la lista; las butacas, en medio; el total, a la derecha. Para ver qué se eligió hay que subir y bajar.
2. **El mapa no informa:**
   - Los textos SVG están en unidades del `viewBox` y crecen con el ancho: a 1440 px miden ~37 px y se salen de su sector ("Tribuna Occidente" pisa "ESCENARIO" y la píldora tapa el precio de Campo General). A 375 px bajan a ~12 px.
   - No hay hover ni resaltado sincronizado con la lista, ni indicación de qué zonas ya tienen entradas.
3. **Salto de contenido:** "Elegir asientos" de la lista abre el plano **encima** de la lista.
4. **El plano parece básico:**
   - todas las butacas son el mismo aro sin número;
   - las ocupadas (35–45 %), con su "×" gruesa, dominan el dibujo;
   - no hay tooltip ni precio al pasar el puntero;
   - en las tribunas en arco, las letras de fila se apilan a la izquierda ("A B C D…") y la barra "ESCENARIO" de arriba contradice la orientación real (el escenario está al costado);
   - no hay minimapa.
5. **"Mejor asiento disponible" no deja elegir cuántos:** elige 1 o reemplaza por tantas como ya había, un comportamiento que no se descubre.
6. **La selección queda lejos:** los chips y los avisos quedan bajo el plano, lejos del total. En móvil, la barra inferior solo muestra el total y no hay forma de revisar lo elegido.
7. **El diseño de las capturas 1 y 6** (Fase 2 original) corrige 1–3 con los sub-pasos y las tarjetas, pero no mejora el plano (4–6) ni el resumen móvil.

### Librería del plano
**Fuentes (2026-10-03).** Se usaron `npm view <paquete> version peerDependencies license time.modified dependencies` (el registro de npm responde) y los README de GitHub servidos por `raw.githubusercontent.com`. Las webs, documentaciones y páginas de precios de los servicios están bloqueadas por el proxy del sandbox, así que precios y accesibilidad de los SaaS se citan del README cuando lo dice, y si no, se marcan "no verificado". El proyecto usa React 19.2.8 y Next 16.3.8.

**Criterios:**
- licencia y coste;
- mantenimiento;
- compatibilidad con React 19.2 / Next 16;
- accesibilidad (teclado y lector);
- modelo mixto (zonas de pie + butacas numeradas);
- **funcionar sin backend** (el alcance es UI con datos mock);
- estilo con tokens Mentec;
- esfuerzo de migración desde lo implementado: F1 con sectores anulares y `generateArcSeatRows`, ids `<zona>-<FILA>-<n>` y el contrato C (`asientos=`).

| Opción | Licencia / coste | Mantenimiento | React 19 / Next 16 | Accesibilidad | Pie + numeradas | Sin backend | Tokens Mentec | Migración | Veredicto |
|---|---|---|---|---|---|---|---|---|---|
| **SVG propio + `react-zoom-pan-pinch` 4.2.0** (instalado) | MIT, gratis | 4.2.0, publicada 2026-09-03 | peer `react: *`; ya funciona en el proyecto | DOM real por butaca: `role="checkbox"`, roving tabindex y `aria-*` ya implementados y testeados | Sí (ya) | Sí | Sí (`fill-*`, `stroke-*`) | Ninguna. Trae lo necesario para las capturas: `zoomToElement` (varios destinos, animado, `maxScale`), `useTransformInit`/`useTransformEffect` (nivel de detalle, minimapa), `fitToView`, pellizco y límites | **Se mantiene y se mejora** (decisión 22) |
| **Seats.io** (`@seatsio/seatsio-react` 15.41.0 + `@seatsio/seatsio-types` 6.28.0) | Wrapper MIT de ~21 kB. El renderer se descarga del CDN regional de Seats.io. SaaS de pago por butaca reservada, con plan gratuito limitado (no verificado: web bloqueada) | Muy activo (2026-10-02) | `react >= 18`; en Next hace falta `"use client"` (README) | Renderer propio; dicen tener modo accesible (no verificado) | Sí (`GeneralAdmissionArea` + butacas, `pricing` por categoría) | **No**: chart, evento y disponibilidad viven en sus servidores (`workspaceKey`, `event`, `region`). No se puede verificar en el sandbox, solo en la máquina del usuario | Parcial: colores por categoría y opciones de estilo propias, no clases CSS | Alta: rehacer los planos en su designer (se descartan los sectores de F1 y `generateArcSeatRows`), mapear categorías ↔ `ticketTypeId` y sus etiquetas ("A-12") ↔ `<zona>-<FILA>-<n>`. Las reservas reales exigen backend | **Candidata para producción con backend**, no para este alcance (Preguntas abiertas 17) |
| **SeatLayer** (`@seatlayer/react` 0.106.0; motor `@seatlayer/core` con `konva` + WebGL `ogl`) | SDK MIT. Servicio: "$0 entry, 100 free confirmed-sold-seat credits per organization each month, then $0.10 down to $0.05 a credit" (README, 2026) | Activo (2026-10-02) pero versión 0.x | `react >= 17` | Canvas/WebGL. El README menciona `setColorblindSafe()`; teclado y lector no documentados | Sí (zonas, `bestAvailable(qty, categoryKey)`) | **No**: "Chart geometry, availability, and holds all come from the SeatLayer API at runtime" (README); `publicKey` + origen registrado | Parcial (`setMapTheme()`) | Alta, igual que Seats.io | Alternativa más barata y joven a Seats.io; misma conclusión |
| seatmap.pro (`@seatmap.pro/renderer` 1.73.7) | Propietaria ("SEE LICENSE IN https://seatmap.pro/terms-of-service"), comercial | Activo (2026-09-21) | Agnóstico, sin peer | Canvas; no documentada | Sí (no verificado) | No: planos desde su plataforma o licencia on-premise (no verificado); incluye `@sentry/browser` | No | Alta | No |
| `@alisaitteke/seatmap-canvas` 2.7.6 (seatmap.io v1) | MIT | **"Canvas v1 is no longer developed"** (README); el producto mantenido es comercial (seatmap.io, WebGL2) | peer **`react ^18`** (no 19) | SVG/D3 sin teclado documentado | Bloques (sí) | Sí (JSON) | Colores por configuración (strings) | Media | No: abandonada y peer incompatible |
| `@mezh-hq/react-seat-toolkit` | — | **404 en npm y en `raw.githubusercontent.com`** (retirada o movida al 2026-10-03) | — | — | — | — | — | — | No disponible |
| `seat-picker` 0.0.13 | MIT | 2025-05, pre-1.0; `fabric` 5 + `zustand` | `react >= 18.2` | Canvas (fabric), sin accesibilidad | Zonas planas | Sí | No | Alta (editor de cuadrículas, sin arcos) | No |
| `seatchart` 0.1.0 · `react-seatmap` 0.1.2 · `react-seat-picker` 2.0.0 | MIT | 2022 / 2022 / peer `react ≤ 16` | No o sin mantenimiento | Básica | Solo cuadrícula | Sí | No | — | No |
| Motores genéricos: `react-konva` 19.3.0, `@pixi/react` 8.0.5 + `pixi.js` 8.22, `deck.gl` 9.4, `fabric` 7.4 | MIT | Activos | `react-konva` **exige `react ^19.3.0`** (incompatible con 19.2.8); pixi `react >= 19` | Canvas/WebGL: sin nodos accesibles; habría que duplicar un árbol accesible aparte | Hay que construirlo | Sí | No (no leen CSS) | Reescribir el selector entero; solo compensa con más de ~10 000 butacas (aquí ≤ 120 por zona) | No |
| `@visx/zoom` 4.0.0 · `d3-zoom` 3.0.0 (solo zoom) | MIT | 2026-06 / 2022 | Sí / sin peer | — | — | Sí | — | Sustituir lo que ya hace `react-zoom-pan-pinch` sin ganancia | No |
| `motion` 14 (animaciones) | MIT | Activo | `react 18/19` | — | — | — | — | MASTER §9: CSS + `tw-animate-css` bastan | No |

**Conclusión:**
- Las únicas librerías "completas" mantenidas y compatibles son **Seats.io** y **SeatLayer**, y las dos son servicios: el plano, la disponibilidad y las reservas viven en sus servidores.
- No encajan en el alcance actual: UI con datos mock, sin backend y sin poder verificarlas en el sandbox. Además, obligarían a rehacer la Fase 1 y a romper el contrato C.
- Las open-source están abandonadas, son incompatibles con React 19.2, son solo de cuadrícula o son canvas sin accesibilidad.
- Por eso se mejora el SVG propio hasta el nivel de las capturas (Fases 3–5).
- La integración SaaS queda como **fase opcional no planificada**, con su diseño en la decisión 29, a la espera de que el usuario acepte un servicio de pago con datos en terceros (Preguntas abiertas 17).

Rendimiento con SVG: ~120 nodos por zona, con los eventos delegados en un solo `<g>` (como hoy). El nivel de detalle se aplica con un atributo en el `<svg>`, sin re-render por fotograma (requisito 23).

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
  - **Fase 2. Escala de tonos por precio** (decisión 28):
    - 5 tonos en una escala de azules Mentec, del navy al azul muy claro, como en la captura del paso 1;
    - clases de texto por tono para las etiquetas HTML del mapa;
    - se ajustan los tests de tonos (también el de la Fase 1 para el festival: Norte pasa a `tier-5`).
    - Se ve también en el aside de precios del detalle (`ZonePricesCard`), que usa las mismas clases. No cambia su código ni su contrato H.
  - **Fase 3. Sub-paso 1 con el diseño de la captura, sub-paso 2 funcional y resumen móvil (todos los eventos con mapa):**
    - una tarjeta "Elige tus entradas" con el indicador "Paso n de 2 · …";
    - sub-paso 1: el mapa (etiquetas HTML de tamaño fijo, luces, nombres en 2 líneas, separación blanca, insignia de entradas elegidas) y debajo las tarjetas de zona en 2 columnas, **sincronizados** por hover y foco;
    - sub-paso 2: migas, cabecera de zona (nombre, precio y contador "n de m butacas") y el panel de cantidad con subtotal (zona de pie) o el plano actual adaptado (zona numerada);
    - transición desde la zona;
    - barra móvil con "Ver resumen" en una hoja inferior (`Sheet`);
    - texto nuevo del resumen vacío;
    - se elimina `ZoneList`;
    - hook con `closeZone` y `selectZone` que ignora las agotadas;
    - utilidad `parseViewBox`.
  - **Fase 4. Plano de butacas renovado (objetivo: captura del paso 2):**
    - butacas disponibles lavanda (azul Mentec claro), elegidas navy con check, ocupadas grises con "×" y accesibles con icono;
    - números visibles al acercar;
    - tooltip con fila, butaca y precio;
    - letras de fila en los dos extremos, también en arco y sin la barra "ESCENARIO" falsa;
    - controles de zoom superpuestos abajo a la derecha (desde `sm`);
    - leyenda "Disponible · S/ X / Elegida / Ocupada" con "n elegidas";
    - "Mejores butacas" con cantidad y zoom animado a las elegidas.
  - **Fase 5. Plano curvo con contexto y minimapa** (la antigua Fase 3, adaptada a la captura del paso 2):
    - sector delineado en azul sobre un fondo lila claro, el resto del estadio en gris, el escenario navy y las luces;
    - lienzo apaisado desde `sm`, con el estadio visible alrededor;
    - minimapa superpuesto arriba a la izquierda desde `sm` **solo si cabe** sin tapar el plano; si no, y en móvil, en la barra sobre el lienzo (enmienda del 2026-10-04);
    - ancho del minimapa y franja de la pastilla de zoom según el ancho del lienzo (container queries);
    - utilidad de "vista visible", con la franja inferior reservada (`insetBottom`).
  - **Fase 6. Precarga de la selección y entrada por zona desde la URL** (la antigua Fase 4, ampliada con el pedido 5; resuelve la pregunta abierta 5 de `checkout-mock-payment.md`):
    - al volver desde "Cambiar entradas" de `/checkout` (`/eventos/<slug>/entradas?<ticketTypeId>=<qty>…&asientos=<ids>`, que construye la Fase 7 de checkout), la pantalla abre con esas cantidades y butacas ya elegidas;
    - **entrada por zona:** en el aside del detalle (`ZonePricesCard`), cada zona no agotada es un enlace a `/eventos/<slug>/entradas?zona=<zoneId>`, con hover, foco, chevron y nombre accesible propio; las agotadas siguen como texto. El botón del aside pasa a "Ver mapa de zonas" y sigue abriendo el sub-paso 1;
    - `?zona=<zoneId>` abre directamente el sub-paso 2 de esa zona (panel de cantidad en 0 o plano de butacas). Una zona inexistente, agotada o mal formada se ignora y se abre el sub-paso 1;
    - se ignora lo que no sea válido (butacas ocupadas o inexistentes, zonas agotadas, valores mal formados);
    - funciones puras de lectura (selección y zona) y de enlace por zona, estado inicial en el hook, envoltorio cliente con `useSearchParams` y `Suspense` en la página (sigue prerenderizada);
    - páginas de diseño `ticket-selection.md` (precarga y entrada por zona) y `event-detail.md` (aside con enlaces por zona).
  - **Fase 7. Compra combinada y mapa no interactivo** (pedido 6; decisiones 34–41):
    - sub-paso 1 "Paso 1 de 2 · Elige tus zonas", con la ayuda "Puedes combinar varias zonas en una misma compra.";
    - tarjetas de zona que **no son botones**: las de pie llevan su stepper −/+ en línea, sin salir del sub-paso 1; las numeradas, un botón "Elegir butacas" / "Cambiar butacas" que abre el plano;
    - en el sub-paso 2, con entradas en la zona, el pie "Agregar otra zona", que vuelve al sub-paso 1;
    - "Tu compra" (aside y hoja móvil) con un botón "Quitar <zona> de tu compra" por línea;
    - el mapa como ilustración (`role="img"`): las formas no son botones ni enlaces ni paradas de Tab, no tienen cursor de enlace ni reaccionan al puntero. Conserva los tonos, las etiquetas, la insignia "✓ n" y el resaltado que llega desde las tarjetas;
    - hook: `changeQuantity` deja de abrir la zona y se añade `clearZone`;
    - el stepper se extrae a `QuantityStepper`, que comparten las tarjetas, `ZoneQuantityPanel` y `BestSeatsPicker`;
    - `?zona=` (F6) se mantiene: una zona de pie sigue abriendo su panel de cantidad, ahora con "Agregar otra zona";
    - página de diseño `ticket-selection.md`.
- No incluye:
  - Cambios en el stepper de la compra (contrato A). La compra sigue teniendo 3 pasos. `PurchaseStepper` ya no existe: lo sustituye `components/shared/PurchaseShell.tsx` (`design-alignment-purchase-flow.md`), que esta spec tampoco cambia; la página lo compone con `currentStep={1}`.
  - Sub-pasos en la URL ni en el historial del navegador. "Atrás" del navegador sale de `/entradas`, como hoy. `?zona=` (F6) es solo un parámetro de **entrada**: fija el sub-paso inicial y la pantalla no lo escribe ni lo borra (decisión 33).
  - Mapas curvos para los otros 3 eventos con mapa. Conservan sus formas rectangulares (decisión 3).
  - Rotar el plano para que el escenario quede arriba. El sector se dibuja con la orientación que tiene en el estadio, como en el diseño.
  - Cambiar los `aria-label` de los asientos, las etiquetas "Fila F · Asiento 12" del resumen y de los chips, los textos de los avisos existentes ni el contrato C. `SeatShape` sí cambia de aspecto en la Fase 4 (decisión 10).
  - El formato compacto "Fila L · 9 · Fila M · 8" en "Tu compra" (ver Preguntas abiertas).
  - El "6 por zona" de la captura del paso 2 ("2 de 6 butacas"): se mantiene el límite de 10 por compra (decisión 11, Preguntas abiertas 3).
  - Filas A–M en las tribunas laterales, como en la captura del paso 2: siguen siendo A–J (decisión 6, Preguntas abiertas 2).
  - Precios sin decimales ("S/ 330") y el precio en naranja de las capturas: se mantiene `S/ 330.00` en `text-foreground` (MASTER §2 y §10; Preguntas abiertas 12).
  - El arco punteado decorativo exterior de la captura del paso 1: necesitaría un dato nuevo en el layout (Preguntas abiertas 14).
  - Filtros o slider de precio, temporizador de reserva, vista desde el asiento y la regla de no dejar butacas sueltas (ver "Investigación y diagnóstico" y Preguntas abiertas).
  - Dependencias nuevas o librerías/servicios de mapas de butacas (decisión 22). La integración SaaS de la decisión 29 queda **fuera de las Fases 2–6**.
  - Cambios en el detalle `/eventos/[slug]`, en `MobileBuyBar`, en `/checkout` o en otros módulos, salvo `modules/events/data/events.mock.ts` y `modules/events/services/events.service.test.ts` (F1). **Excepción (F6):** `ZonePricesCard` (filas como enlaces por zona y botón "Ver mapa de zonas", decisión 31), su test nuevo y `design-system/ticketera/pages/event-detail.md`. La página del detalle (`app/(site)/eventos/[slug]/page.tsx`), `MobileBuyBar`, `EventDetailHeader` (CTA del hero) y las props de `ZonePricesCard` no cambian.
  - Reserva real de butacas, backend y persistencia (igual que la spec base).
  - (F6) Reflejar en la URL los cambios hechos en la pantalla (abrir o cerrar zonas no toca `zona`, elegir no toca las cantidades) o recordar la selección en el navegador: la precarga y `zona` solo inicializan el estado.
  - (F6) Enlaces por zona en otros sitios (hero, barra móvil del detalle, tarjetas de evento) o en eventos sin mapa: su aside es `TicketSelector`, que no tiene sub-pasos.
  - (F6) Mover el foco o desplazar la página al abrir `/entradas?zona=`: la página carga como cualquier otra (decisión 32).
  - (F6) Cambios en `modules/checkout/**` o en el enlace "Cambiar entradas": son de `checkout-mock-payment.md` (Fase 7).
  - (F7) Cambios en el aside del detalle (`ZonePricesCard`), en `?zona=` (validación, cantidad inicial 0, prerenderizado), en la precarga, en el contrato C, en `/checkout` o en `app/`.
  - (F7) Un botón "Listo" en el sub-paso 2: "Continuar" de "Tu compra" (o de la barra móvil) ya es la acción de terminar (decisión 35).
  - (F7) Cualquier interacción con el mapa: ni tocar una forma para desplazarse a su tarjeta, ni tooltip, ni zoom (decisión 38).
  - (F7) Subir `QuantityStepper` a `components/shared/` y migrar a él el stepper de `TicketSelector` (`modules/events`). Hoy solo lo usa `seating` (decisión 40).
  - (F7) Un límite por zona, otros textos de aviso o un texto vacío de "Tu compra" distinto: siguen los de las Fases 3–6.
  - (F7) Que los mapas se vean curvos en la BD local del usuario: es la Fase 1b de `seating-all-venue-maps.md` (resembrar), no esta spec.

## Decisiones
1. **La compra sigue en 3 pasos** (aclaración del usuario).
   - El stepper global queda en "Entradas" (`currentStep={1}`) durante los dos sub-pasos. Antes lo dibujaba `PurchaseStepper`; desde `design-alignment-purchase-flow.md`, la cabecera de `PurchaseShell`.
   - "Paso 1 de 2 · Elige una zona" y "Paso 2 de 2 · Elige tus butacas" (o "· Elige la cantidad") son un indicador **interno** del paso "Entradas". Va a la derecha de la cabecera de la tarjeta "Elige tus entradas".
   - No es un segundo stepper: es un texto (`<p aria-live="polite">`) que cambia con el sub-paso.
2. **Sub-pasos en la misma ruta, en estado de cliente.**
   - Sub-paso 1: no hay zona abierta (`activeZoneId === null`).
   - Sub-paso 2: hay zona abierta. Muestra el panel de cantidad si la zona es de pie, o el plano si es numerada.
   - Elegir una zona (en el mapa o en su tarjeta) abre directamente el sub-paso 2. "Todas las zonas" vuelve al sub-paso 1.
     - *Enmienda F7 (decisiones 34, 38 y 39):* el mapa ya no abre nada. Solo "Elegir butacas" / "Cambiar butacas" de la tarjeta de una zona numerada abre su sub-paso 2. Las zonas de pie se eligen en su tarjeta, en el sub-paso 1, y su sub-paso 2 solo se abre con `?zona=` (F6). "Agregar otra zona" vuelve al sub-paso 1, igual que "Todas las zonas".
   - La selección (cantidades y butacas) se conserva al cambiar de sub-paso y de zona.
   - **Estado inicial (F6):** sub-paso 1, salvo que la URL traiga una `zona` válida, que abre su sub-paso 2 (decisión 32). Después, el sub-paso sigue siendo estado de cliente: la URL no cambia.
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
10. **Estados de butaca de la captura del paso 2, con tokens Mentec** (rediseño; sustituye a la versión anterior, que mantenía el aro blanco, a partir de la Fase 4):
    - **Disponible:** círculo relleno azul claro `fill-primary/30` con borde `stroke-primary`, el "lavanda" de la captura.
      - No se rellena con el tono de la zona: en zonas `tier-1`/`tier-2` una libre se confundiría con una elegida.
      - El color es el mismo en todas las zonas.
    - **Elegida:** `fill-brand-navy` con check blanco (en la captura, casi negra). Se distingue de la libre por luminosidad y por el check.
    - **Ocupada:** gris `fill-secondary stroke-input` con "×", como hoy y como la captura.
    - **Accesible:** cuadrado redondeado `fill-highlight` con el icono `Accessibility`.
    - Detalle en el requisito 21. La leyenda muestra el precio: "Disponible · S/ 155.00".
11. **Contador "n de m butacas":**
    - n = butacas elegidas en la zona;
    - m = n + (`MAX_TICKETS_PER_ORDER` − entradas totales), es decir, cuántas puede tener esta zona dado el resto de la compra;
    - sin nada elegido: "0 de 10 butacas".
    - Se mantiene el límite de **10 en total** de la spec base (decisión 5). El "de 6" de la captura corresponde a un límite "6 por zona" que no aplica (ver Preguntas abiertas).
12. **Minimapa y zoom superpuestos desde `sm`; en una barra en móvil** (rediseño; sustituye a la versión anterior, que los sacaba siempre del lienzo):
    - **Desde `sm` (≥ 640 px)** van superpuestos al lienzo, como en la captura del paso 2: los controles de zoom abajo a la derecha (F4) y el minimapa arriba a la izquierda (F5), **este solo si cabe** (ver abajo).
      - Con el plano entero a la vista no deben tapar butacas: el contenido transformado reserva su espacio con padding y, en F5, el lienzo apaisado deja margen lateral.
      - Con zoom, el paneo permite sacar las butacas de debajo.
    - **Por debajo de `sm`** el lienzo mide lo mismo que el plano, para mantener ≥ 24 px por butaca. Superpuestos taparían butacas (p. ej. `oriente-J-10`, en la esquina inferior derecha), así que van en una barra justo encima del lienzo: minimapa a la izquierda y zoom a la derecha.
    - *Enmienda F5 (implementada y aprobada por el reviewer; registrada el 2026-10-04):*
      - **Minimapa superpuesto solo si cabe.** Desde `sm`, `SeatPlan` lo superpone solo si el `seatViewBox` encajado en el `<svg>` (`xMidYMid meet`, con `getPlanFit`) empieza a la derecha del minimapa o por debajo de él (`canOverlayMinimap`: margen ≥ 12 px + su ancho o su alto). Si no, el minimapa sigue en la barra sobre el lienzo (como en móvil) y la pastilla de zoom sigue superpuesta. Las butacas y las letras van dentro del `seatViewBox`, así que superpuesto no tapa nada por construcción. Motivo: en los planos apaisados (Norte, Platea, Mezanine, Preferencial) el margen lateral del 16:10 no bastaba y el minimapa tapaba las filas A–C de la esquina superior izquierda.
      - Se decide antes de pintar (`useLayoutEffect`, sin salto al abrir la zona) y en cada cambio de tamaño del lienzo (`ResizeObserver`). El envoltorio del minimapa lleva `data-placement="overlay" | "bar"`. Sin medidas (jsdom), superpuesto.
      - **Tamaños según el lienzo, no la ventana:** el bloque del lienzo es `@container` y el umbral es `@2xl` (42rem = 672 px de lienzo). A 1024 px, con dos columnas, el lienzo mide ~516 px: con `md:` (ventana) el minimapa medía 112 px y tapaba `occidente-J-8`/`J-9`.
      - **Franja de la pastilla de zoom:** en cuadrícula, `sm:pb-16` como en F4; en arco, solo con el lienzo estrecho (`sm:@max-2xl:pb-16`), porque ahí el margen lateral del 16:10 no basta para la pastilla (a 516 px de lienzo tocaba `oriente-J-9`). Con el lienzo ancho, el margen lateral la aloja y no hay franja. El minimapa descuenta la franja de su recuadro (`insetBottom`, requisito 31).
    - Se descarta el `MiniMap` de `react-zoom-pan-pinch`:
      - reproduce el contenido transformado (el plano del sector), no el estadio entero;
      - su marco se estiliza con colores en string, no con tokens.
13. **"Butaca" y "asiento":**
    - los textos nuevos del diseño usan "butaca", en femenino como en las capturas:
      - indicador y tarjetas: "Elige tus butacas", "n de m butacas", "Numerada · elige tu butaca", "General · sin butaca";
      - "Mejores butacas": "¿Cuántas butacas juntas?", "Elegir las mejores butacas" / "Elegir la mejor butaca";
      - leyenda: "Elegida", "Ocupada" y "n elegidas" (sustituyen a "Tu selección" y "Ocupado");
    - los textos y contratos existentes no cambian, porque las etiquetas forman parte del contrato C y de los pedidos guardados: "Fila F · Asiento 12", los `aria-label` de los asientos, los chips con su h3 "Tus asientos" y los avisos ("Elegimos Fila C · Asiento 6.").
14. **Orden de implementación:** esta spec va **después de la Fase 5 de la spec base**.
    - F5 añade `lib/hash.ts` (`hashString`, `mixHash`), `modules/seating/seats.ts`, la ocupación mezclada en `generateSeatRows` y el test de `labelPos` en el centro de los rectángulos.
    - Esta spec reutiliza `mixHash` para la ocupación del arco y adapta ese test.
    - No se fusiona ninguna tarea de F5: F5 es un ajuste cerrado y aprobado, y esta spec toca después los mismos archivos (`seatRows.ts`, `venueMaps.mock.ts`, `seating.service.test.ts`).
15. **Precarga desde la URL sin perder el prerenderizado (Fase 6; antes Fase 4).** Donde abajo dice "Fase 2", léase la pantalla de la Fase 3 del rediseño. La página vive en `app/(purchase)/eventos/[slug]/entradas/page.tsx` (la mueve allí la Fase 1 de `design-alignment-purchase-flow.md`; antes, `app/(site)/…`).
    - `/eventos/[slug]/entradas` se prerenderiza (`generateStaticParams`). Leer `searchParams` en la página la volvería dinámica. `useSearchParams` fuera de un `Suspense` rompe el build (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` § Prerendering). Por eso:
      - `TicketSelection` gana `initialSelection?` e `initialZoneId?` (decisión 32) y no lee la URL;
      - el envoltorio cliente nuevo `PreselectedTicketSelection` lee `useSearchParams()`, lo convierte con `parseSeatingPreselection` y `parseInitialZoneId` y renderiza `TicketSelection`;
      - la página lo envuelve en `<Suspense fallback={<TicketSelection map={map} />}>`. El HTML prerenderizado conserva la pantalla (sin selección) y, al hidratar, se sustituye por la precargada. Sin parámetros, el resultado es idéntico al de la Fase 2.
    - Es el mismo patrón que usa `checkout-mock-payment.md` (decisión 36) para `TicketSelector`.
    - **Formato:** el del contrato C sin `evento`: `<ticketTypeId>=<qty>` por zona y `asientos=<id>,<id>`. `parseSeatingPreselection` es la inversa de `buildSeatingCheckoutHref` y vive en el mismo archivo (`utils/selectionSummary.ts`).
    - **Tolerancia:** lo inválido se ignora uno a uno, sin avisos ni errores. Ejemplos: una butaca ocupada (la ocupación es determinista, pero el enlace puede venir de otro mapa o estar editado a mano), inexistente, repetida o de otra zona; una zona agotada; una cantidad mal formada o repetida. El resto se precarga.
    - **Zonas numeradas:** su cantidad la dan las butacas válidas, no el parámetro `<ticketTypeId>`, que se ignora (como `getZoneQuantity`).
    - **Límite:** nunca más de `MAX_TICKETS_PER_ORDER` (10). Se recorren las zonas en el orden de `map.zones` y se recorta lo que exceda.
    - **Sub-paso inicial:** el 1 (`activeZoneId = null`), salvo que la URL traiga una `zona` válida (decisión 32). "Cambiar entradas" de checkout no la lleva, así que al volver de checkout se abre el sub-paso 1: las tarjetas ya dicen "n entradas elegidas" / "n butacas elegidas" y "Tu compra" muestra las líneas y el total, así que se ve qué se trae y se puede abrir cualquier zona para cambiarlo.
16. **Corrección aritmética (2026-10-03, detectada en F1 T3; sin cambios de diseño).** Se mantiene la fórmula del requisito 4 (filas centradas en la banda, con `holgura/2`). Las butacas por fila de las tribunas laterales que daban el requisito 7 y el criterio de `generateArcSeatRows` (4, 4, 5, 6, **6**, 7, 8, 9, 9, 10; 68 en total) omitían `holgura/2`. Con la fórmula salen 4, 4, 5, 6, **7**, 7, 8, 9, 9, 10 (69 en total): solo cambia la fila E (ρ = 344.75 → 7 butacas). Afecta igual a Oriente y Occidente. El `seatViewBox` (`0 0 399 401`), los ids de ejemplo (`oriente-C-3`, `oriente-C-4`), las accesibles (`*-J-1`, `*-J-10`) y "0 de 8" / "2 de 8 butacas" no cambian.

### Decisiones del rediseño (2026-10-03, Fases 2–6)
17. **Una tarjeta "Elige tus entradas" con sub-pasos, más "Tu compra" aparte** (capturas de los pasos 1 y 2).
    - Se descarta el layout "mapa + panel lateral" de Ticketmaster en escritorio, porque el usuario fijó las capturas como objetivo.
    - De Ticketmaster se toman:
      - la sincronización entre mapa y lista;
      - la bandeja de selección;
      - "Mejores butacas";
      - el zoom y el tooltip.
    - De Joinnus se toman las tarjetas de zona con precio y el panel de cantidad con subtotal.
    - Resuelve los puntos 1 y 3 del diagnóstico:
      - un solo h2;
      - cada acción en un solo sitio (el mapa y la tarjeta de una zona hacen lo mismo y están sincronizados);
      - sin saltos de contenido: el sub-paso 2 sustituye al 1 dentro de la tarjeta.
    - *Enmienda F7 (decisión 38):* "cada acción en un solo sitio" pasa a significar **solo en la tarjeta**. El mapa no tiene acciones.
18. **Etiquetas del mapa en HTML, con tamaño fijo** (diagnóstico 2).
    - Van en una capa absoluta sobre el SVG, posicionadas en % del `viewBox`.
    - Miden `text-xs` (12 px) por debajo de `md` y `text-sm` (14 px) desde `md`, sin escalar con el ancho.
    - La píldora "Últimas entradas" solo aparece desde `md`: a 375 px no cabe en la banda de Campo General (~47 px de alto). En móvil, el estado sigue en la tarjeta de zona y en el `aria-label`.
19. **Resaltado sincronizado mapa ↔ tarjetas** (hover y foco).
    - En el mapa, la zona se delinea en navy y el resto se atenúa al 40 %. Su tarjeta toma el fondo de hover, y viceversa.
    - Es solo visual: no se anuncia ni cambia el estado. En táctil no hay hover.
    - Las zonas agotadas no se resaltan.
    - *Enmienda F7 (decisión 38):* el resaltado va **en un solo sentido, de la tarjeta al mapa**. El puntero o el foco sobre una tarjeta (o sobre un control de la tarjeta) resaltan su zona en el mapa. El mapa no reacciona al puntero ni recibe foco, así que ya no resalta tarjetas.
20. **Foco**, como en la Fase 2 original: al abrir una zona, al h3 de la zona; al volver con "Todas las zonas", a su tarjeta.
    - *Enmienda F7:* "su tarjeta" es el contenedor de la tarjeta (`role="group"`, `tabIndex={-1}`, `[data-zone-id]`), que ya no es un botón (requisito 42). Lo mismo vale al volver con "Agregar otra zona".
21. **Resumen móvil en una hoja inferior**: el `Sheet` ya instalado (`side="bottom"`), abierto desde un botón de la barra inferior.
    - Es modal y solo sirve para revisar el resumen. El mapa y el plano nunca quedan tapados mientras se elige.
    - Se descarta instalar `drawer` (Drawer de Base UI, con gesto de arrastre y snap points): añade un componente y un gesto que no hacen falta para un resumen corto (KISS).
22. **Librería: SVG propio + `react-zoom-pan-pinch`, mejorado**, sin dependencias nuevas (ver "Librería del plano").
    - Es la única opción que funciona sin backend, con accesibilidad real, con tokens y sin rehacer la Fase 1 ni el contrato C.
    - Las librerías completas viables (Seats.io, SeatLayer) son SaaS: quedan para la decisión 29.
23. **Nivel de detalle de las butacas.**
    - El número de butaca solo se ve si el usuario acercó el plano (escala > 1) y el número mide ≥ 12 px (`unidad × escala ≥ 1`). A la vista completa, el plano se ve como la captura del paso 2, sin números.
    - Se aplica con `data-detail` en el `<svg>`, desde `useTransformInit`/`useTransformEffect`, sin re-render.
24. **Tooltip propio**, solo visual (`aria-hidden`): el lector ya anuncia el `aria-label` de la butaca.
    - Hay uno por plano, posicionado sobre la butaca.
    - Se descarta el `Tooltip` de shadcn (Base UI): exigiría un `Tooltip.Root` por butaca (≤ 120), con disparadores SVG dentro de un contenedor transformado, y en táctil se abriría al tocar.
25. **"Mejores butacas" con cantidad** (diagnóstico 5).
    - Stepper "¿Cuántas butacas juntas?" con rango 1…m (m del contador de la decisión 11). Valor inicial: las butacas elegidas en la zona si hay alguna; si no, 2, recortado a m.
    - Botón "Elegir las mejores butacas": sustituye las de la zona por el mejor bloque (`findBestAvailableSeats`, que nunca elige accesibles) y acerca el plano a él.
    - Se empieza en 2 porque es la compra más común en las ticketeras de referencia (Preguntas abiertas 18).
26. **Transiciones** con CSS (`tw-animate-css`) y `react-zoom-pan-pinch`:
    - el sub-paso 2 entra creciendo desde la posición de la zona en el mapa (`fade-in` + `zoom-in-95`, 300 ms, `transform-origin` en su `labelPos`);
    - al volver, el sub-paso 1 entra "alejándose" (`fade-in` + `zoom-in-105`);
    - "Elegir las mejores butacas" acerca el plano a las elegidas con `zoomToElement` (300 ms).
    - Con `prefers-reduced-motion: reduce` no hay animaciones (`motion-safe:` y `animationTime` 0). Sin librería de animación (MASTER §9).
27. **Lienzo apaisado con contexto (Fase 5)**, como la captura del paso 2.
    - Desde `sm`, el lienzo de las zonas en arco es 16:10 y el `<svg>` del plano lleva `overflow-visible`: el fondo del estadio se ve alrededor del sector.
    - En móvil, el lienzo mantiene la proporción del plano, para no bajar de 24 px por butaca.
    - Las zonas en cuadrícula conservan la proporción del plano en todos los anchos.
28. **Escala de 5 tonos por precio** (sustituye a la decisión 9 desde la Fase 2; resuelve Preguntas abiertas 4):

    | Tono | Forma / muestra | Texto encima |
    |---|---|---|
    | `tier-1` (más caro) | `brand-navy` | `text-background` |
    | `tier-2` | `primary-strong` | `text-primary-foreground` |
    | `tier-3` | `primary/65` | `text-foreground` |
    | `tier-4` | `primary/40` | `text-foreground` |
    | `tier-5` | `primary/20` | `text-foreground` |
    | `sold-out` | `secondary` | `text-muted-foreground` |

    - **Por qué:** la captura usa una escala monocroma (más oscuro = más caro y más cerca del escenario), que comunica el orden de precio mejor que mezclar navy, azul, cian y `accent`: el cian actual no dice "más barato que el azul".
    - **Con tokens:** se construye con tokens y opacidad, ya admitidos (MASTER usa `ring-primary/40`), sin hex ni tokens nuevos en `globals.css`.
    - **Contraste** (texto ≥ 4.5:1):
      - navy sobre `tier-3` (~#56A0F6 sobre `muted`): ~7:1;
      - blanco sobre `primary-strong`: 5.6:1;
      - blanco sobre navy: > 15:1.
    - **Asignación:** cada precio distinto tiene su tono hasta el 5.º; desde el 6.º, `tier-5`. En el festival: `campo-vip` → `tier-1`, `campo-general` → `tier-2`, `occidente` → `tier-3`, `oriente` → `tier-4` y `norte` → `tier-5`. Los otros 3 mapas tienen ≤ 4 precios.
    - Las formas con opacidad dejan ver el fondo. Por eso el resaltado del mapa es un trazo **superpuesto**, no un halo detrás (requisito 12).
    - El cian (`highlight`) queda para las luces del escenario y las butacas accesibles.
    - **Aside del detalle:** `ZonePricesCard` usa las mismas clases `swatch` y mostrará la escala, como la captura 4. No cambia su código.
    - **Fase 1:** su criterio de tonos queda como estaba al cerrarla. La Fase 2 actualiza sus tests (`seating.service.test.ts` y `zoneTone.test.ts`).
29. **Integración SaaS opcional (no planificada; Preguntas abiertas 17).** Si el usuario acepta un servicio de pago con datos en terceros, se especificará en una enmienda posterior, con esta forma:
    - **Servicio y dependencia:** Seats.io (`@seatsio/seatsio-react`, el más maduro) o SeatLayer (`@seatlayer/react`, más barato, 0.x).
    - **Configuración:**
      - variables `NEXT_PUBLIC_SEATSIO_WORKSPACE_KEY` y `NEXT_PUBLIC_SEATSIO_REGION`, validadas con zod en `lib/env.ts`;
      - una clave de evento por evento (`seatsioEventKey` opcional en el layout del mapa).
    - **Chart de demostración** en el designer del servicio que replique el festival:
      - categorías = `ticketTypeId` (`campo-vip`…);
      - zonas de pie como áreas de admisión general;
      - tribunas con filas A–J y etiquetas `<FILA>-<n>`.
    - **Adaptador puro** `toSeatSelection(objects)` en `modules/seating/utils/`:
      - áreas → `quantities[zoneId] = numSelected`;
      - butacas → `formatSeatId(zoneId, fila, n)`.

      Así no cambian `useSeatSelection`, "Tu compra", `buildSeatingCheckoutHref` ni el contrato C (`asientos=`).
    - **Elección del renderer:** con clave y evento configurados, el del servicio; si no, el SVG mock actual (fallback).
    - **Fuera de esa enmienda:** reservas temporales (`holdToken`) y temporizador, que exigen backend y ampliar el contrato C.
    - **Verificación:** solo en la máquina del usuario, porque el sandbox bloquea los dominios del servicio. Los tests cubrirían solo el adaptador.

### Enmiendas tras la revisión de la Fase 4 (2026-10-03)
30. **Letras de fila a 13 unidades** (acordado con el usuario tras revisar la F4; enmienda el requisito 25 y se implementa en la F5, tarea T0).
    - **Motivo:** a 24 unidades la letra mide lo mismo que la butaca (24 de diámetro; ~33 px a 1440) y compite con ella. En la referencia del usuario (`images/15.png`) la letra mide alrededor de la mitad del diámetro de la butaca.
    - **Tamaño:** 13 unidades (≈ 0.54 del diámetro), en cuadrícula y en arco. A 1440 mide ~18 px.
    - **Posición sin cambios**, comprobada contra la referencia:
      - **En arco:** `getRowEdgeLabelPoints` sigue a 0.8 pitch (25.6 unidades) del centro de la butaca del extremo. En `images/15.png` el centro de la letra está a ~0.76–0.8 pitch del centro de la butaca. Con 13 unidades, el hueco entre el borde de la butaca y el de la letra pasa de ~5 a ~9 unidades (en la referencia, ~9.6). No cambian `arcSeatRows.ts`, `arcSeatRows.test.ts` ni la invariante del requisito 8 (letras con ≥ 12 de margen dentro del `seatViewBox`), que con una letra más pequeña se cumple con más holgura.
      - **En cuadrícula:** siguen en el centro de los márgenes, `x = SEAT_PLAN_MARGIN.x / 2` (20) y `x = ancho − 20`, en columna alineada. Quedan a 36 unidades del centro de la butaca exterior de la fila más ancha (hueco de ~19 unidades). No cambia el test de `TicketSelection.test.tsx` que comprueba esas `x`.
    - **Excepción a MASTER §3** ("nada por debajo de 12 px"): a 375 px, con el plano entero a la vista (≥ ~0.78 px/unidad), la letra mide ~10 px. Se acepta porque es decorativa (`aria-hidden`): la fila está en el `aria-label` de cada butaca y en el tooltip, y al acercar crece. Ver Preguntas abiertas 21.

### Enmienda de la Fase 6: entrada directa por zona (2026-10-04; pedido 5)
31. **Filas del aside como enlaces por zona** (`ZonePricesCard`, amplía el contrato H sin cambiar sus props).
    - **Enlace, no `<button>`:** la fila navega a otra URL, así que es un `Link` de `next/link` (`<a href>`): funciona sin JavaScript, se abre en otra pestaña y el lector la anuncia como enlace. Un `<button>` con `router.push` obligaría a `"use client"` en una tarjeta que hoy es Server Component.
    - **Destino:** `/eventos/<slug>/entradas?zona=<zoneId>` (`buildZoneEntryHref`, requisito 39). Se usa el `id` de la zona (el del mapa del sub-paso 1 y de `data-zone-id`); hoy coincide con su `ticketTypeId` en los 4 mapas.
    - **Solo zonas que se pueden comprar:** zona no agotada y evento no agotado. Las agotadas siguen siendo texto (sin enlace, sin chevron, sin hover), con "Agotado". Con el evento agotado, ninguna fila es enlace (coherente con "Entradas agotadas" en lugar del botón).
    - **Aspecto:** la misma fila de hoy (muestra de tono, nombre, píldora "Últimas entradas", precio) más un `ChevronRight` a la derecha; fondo de hover `bg-accent/40` (el de `ZoneCards`) y anillo de foco `ring-3 ring-ring/50`; alto ≥ 56 px (`min-h-14`, target ≥ 44 px). El fondo sobresale 8 px a cada lado (`-mx-2 px-2 rounded-lg`) para que el texto no se mueva respecto de hoy.
    - **Nombre accesible:** "Elegir entradas de <nombre>, <precio>" y, si es `low-stock`, ", últimas entradas" (p. ej. "Elegir entradas de VIP, S/ 550.00, últimas entradas"). Contiene el nombre visible de la zona (WCAG 2.5.3).
    - **Botón del aside: "Ver mapa de zonas"** (decisión del usuario), con `ArrowRight`, mismo estilo y mismo destino que hoy (`/eventos/<slug>/entradas`, sub-paso 1). Las filas eligen zona; el botón abre el mapa con todas.
    - **Se mantienen** (propuesto y decidido): el CTA del hero "Comprar entradas · desde S/ X" (`EventDetailHeader`), "Comprar entradas" de la barra móvil (`MobileBuyBar`) y el del carrusel de la landing. Son el CTA principal de compra (llevan al paso 1 del embudo, el mismo para eventos con y sin mapa) y no compiten con las filas: en móvil, el aside con las filas va justo debajo del hero, y la barra sigue siendo el atajo siempre visible. Cambiarlos rompería la coherencia con los eventos sin mapa, donde no hay mapa que ver.
32. **`?zona=<zoneId>` abre directamente el sub-paso 2** (revoca la exclusión anterior de F6, "abrir directamente el sub-paso 2 de una zona").
    - **Lectura:** `parseInitialZoneId` (requisito 39) devuelve el id solo si `zona` aparece **exactamente una vez** y su valor es, tal cual (sin cambiar mayúsculas ni recortar), el `id` de una zona del mapa **no agotada**. Si no (inexistente, agotada, vacía, repetida o con otro formato), `null`: se ignora sin aviso y se abre el sub-paso 1, como la tolerancia de la decisión 15.
    - **Sub-paso 2 inicial:** zona de pie → "Paso 2 de 2 · Elige la cantidad" con `ZoneQuantityPanel`; zona numerada → "Paso 2 de 2 · Elige tus butacas" con el plano en arco (`SeatPlan`). Las migas "Todas las zonas" vuelven al sub-paso 1 como siempre (foco en la tarjeta de la zona y transición de vuelta).
    - **Cantidad inicial de una zona de pie: 0** (decidido). Motivos:
      - nada entra en "Tu compra" sin una acción del usuario: compartir, recargar o volver con "Atrás" a `?zona=vip` no añade entradas;
      - es lo mismo que abrir la zona desde el mapa o su tarjeta (empieza en 0), así que no hay dos comportamientos;
      - con 0, "Continuar" está deshabilitado y el siguiente paso evidente es "+", que está en el panel; el ahorro de clics del pedido 5 (saltar el mapa) se mantiene;
      - con 1, volver a "Todas las zonas" dejaría una entrada no pedida y quien quisiera otra zona tendría que quitarla; además chocaría con el límite de 10 si llega una precarga.
    - **Con precarga a la vez** (`?zona=vip&vip=2&asientos=…`): no compiten. `zona` solo decide el sub-paso inicial; la selección sale solo de `<ticketTypeId>` y `asientos` (decisión 15). Se aplican las dos: abre VIP con cantidad 2 y el resto de la selección en "Tu compra". `zona` nunca añade ni quita entradas; si la zona está en el límite de 10 por otras zonas, abre igual con el estado de límite de siempre.
    - **Foco y desplazamiento:** la página carga como cualquier otra navegación (sin mover el foco al h3 ni hacer scroll; el indicador `aria-live` no anuncia su valor inicial), igual que la precarga (requisito 37). El h3 de la zona y el indicador "Paso 2 de 2 · …" son lo primero de la tarjeta tras la franja del evento.
    - **Prerenderizado:** la página sigue siendo SSG. Con navegación de cliente (el enlace del aside), `useSearchParams` está disponible al montar y se ve directamente el sub-paso 2. En una carga completa (recarga o URL pegada), el HTML prerenderizado es el `fallback` del `Suspense` (sub-paso 1 sin selección) y, al hidratar, se sustituye por el sub-paso 2, que entra con la transición de siempre desde la zona del mapa (`motion-safe:`). Se acepta: es el coste de mantener la ruta estática, igual que la precarga, y sin JavaScript el enlace sigue llevando a una pantalla útil.
33. **`zona` es un nombre reservado de la URL del paso 1** (como `evento` y `asientos` en el contrato C): ningún `ticketType.id` puede llamarse `zona`, porque `parseSeatingPreselection` lee `<ticketTypeId>=<qty>` de la misma URL. Hoy no hay ninguno. La pantalla no escribe ni borra `zona`: tras "Todas las zonas" la URL la conserva, así que recargar vuelve a abrir esa zona (aceptado: es la entrada que eligió el usuario; reflejar el sub-paso en la URL sigue fuera de alcance, Preguntas abiertas 8). "Atrás" del navegador vuelve al detalle.

### Enmienda de la Fase 7: compra combinada y mapa no interactivo (2026-10-04; pedido 6)
34. **La compra combinada se hace en el sub-paso 1**, con el control de cada zona en su tarjeta. Es el patrón de lista de tipos con stepper de Joinnus y Teleticket, más el resumen con varias secciones de Ticketmaster y Eventbrite.
    - **Zonas de pie:** un stepper −/+ en la tarjeta, con la cantidad en medio. Se pueden elegir cantidades de varias zonas sin salir del sub-paso 1 ni cambiar de pantalla.
    - **Zonas numeradas:** un botón "Elegir butacas", o "Cambiar butacas" si la zona ya tiene alguna, que abre su sub-paso 2 (el plano), como hasta ahora.
    - **Que se note que se puede combinar:**
      - el indicador pasa a "Paso 1 de 2 · Elige **tus zonas**" (antes "Elige una zona");
      - encima de las tarjetas va la ayuda "Puedes combinar varias zonas en una misma compra." (solo si hay ≥ 2 zonas no agotadas);
      - cada cantidad aparece al momento en el stepper, en la insignia "✓ n" del mapa y como línea en "Tu compra".
    - **"Independiente":** comprar de una sola zona es igual o más fácil que antes:
      - zona de pie: "+" y "Continuar" (2 acciones; antes 3: abrir la zona, "+" y "Continuar");
      - zona numerada: igual que hoy.
    - **Límite:** sigue en 10 entradas por compra **en total** (decisión 11), con los avisos de siempre:
      - al llegar a 10, el "+" de todas las tarjetas queda deshabilitado pero enfocable (`focusableWhenDisabled`);
      - el pie de las tarjetas dice "Llegaste al máximo de 10 entradas por compra." (`role="status"`, el mismo texto que `ZoneQuantityPanel`);
      - el plano conserva su contador "n de m butacas" y el aviso "Máximo 10 entradas por compra";
      - "Elegir/Cambiar butacas" sigue habilitado en el límite, para ver o cambiar butacas.
    - **Descartadas:**
      - (a) dejar el sub-paso 2 de las zonas de pie y solo añadir un texto: seguirían siendo 3 acciones por zona y combinar seguiría sin verse;
      - (b) casillas para elegir zonas y después un paso de cantidades: añade un paso;
      - (c) todos los planos y paneles a la vez: demasiado largo en móvil y contrario a la decisión 17 (un sub-paso cada vez).
35. **Tras elegir butacas, "Agregar otra zona"; no hay botón "Listo".**
    - En el sub-paso 2 (zona numerada, o zona de pie abierta con `?zona=`), cuando la zona tiene ≥ 1 entrada, debajo del plano o del panel va un pie con "Puedes combinar varias zonas en una misma compra." y el botón "Agregar otra zona" (`outline`, `Plus`).
    - El botón hace lo mismo que "Todas las zonas": vuelve al sub-paso 1, con la transición de vuelta y el foco en la tarjeta de la zona.
    - Sin entradas en la zona no se muestra: para volver están las migas.
    - **Por qué no "Listo":** terminar es "Continuar", que siempre está a la vista (aside sticky en `lg`, barra inferior por debajo). Un "Listo" que volviera al sub-paso 1 haría lo mismo que "Agregar otra zona" con otro nombre. Un segundo "Continuar" duplicaría el CTA dentro de la tarjeta.
36. **"Tu compra" permite quitar una línea.**
    - Cada línea (una por zona, en el orden del mapa, con su importe = subtotal de la zona) lleva un botón `ghost` con `Trash2`, "Quitar <zona> de tu compra". Está en el aside y en la hoja móvil, que comparten `PurchaseSummaryContent`.
    - Quita todas las entradas de esa zona: la cantidad si es de pie, todas sus butacas si es numerada. Lo hace la acción nueva `clearZone` del hook.
    - Las líneas, el total, la nota y "Continuar" no cambian en lo demás. Para quitar **una** butaca siguen los chips "Tus asientos" del plano. Para bajar una cantidad, el "−" de la tarjeta.
    - **Foco tras quitar:** al "Quitar" de la línea siguiente; si no hay, al de la anterior; si no queda ninguna, al texto vacío (`tabIndex={-1}`). Es el patrón de `SelectedSeatChips`.
37. **`changeQuantity` ya no abre la zona.** El requisito 19 de F3 decía "el resto no cambia (incluido que `changeQuantity` activa la zona)". Ahora no toca `activeZoneId`: el stepper de la tarjeta está en el sub-paso 1 y cambiar una cantidad no debe sacar al usuario de él. En el panel de cantidad (`?zona=`) la zona ya está abierta, así que nada cambia allí.
38. **El mapa es una ilustración, no un control** (pedido 6: "los cuadrados azules no deben ser botones, solo la parte inferior").
    - **Formas sin interacción:**
      - sin `role="button"`, `tabIndex`, `aria-label` ni `aria-disabled` por forma;
      - sin manejadores de clic, teclado, puntero ni foco;
      - sin `cursor-pointer` ni estilos de foco;
      - cada forma lleva `data-zone-id` (para tests y Playwright).
    - **Conservan los eventos de puntero por defecto** (no llevan `pointer-events-none`). Así `document.elementFromPoint` sigue devolviendo la forma, como piden los criterios de holgura de etiquetas de `seating-curved-venues.md` y `seating-all-venue-maps.md`. Sin manejadores, el clic no hace nada y el cursor es el de por defecto.
    - **Nombre accesible:** `<svg role="img" aria-label="Mapa de zonas de <recinto>">`, el mismo nombre de antes con otro rol (antes `role="group"`).
      - Se elige `role="img"` y no `aria-hidden` porque el mapa es lo único que dice dónde está cada zona respecto del escenario. El lector oye que hay un mapa del recinto y lo salta.
      - Los hijos de un `role="img"` son presentacionales, así que no se anuncian zonas sueltas: todo lo necesario para comprar (nombre, precio, estado, tipo y selección) está en las tarjetas.
    - **Se mantienen:**
      - tonos y separación blanca;
      - etiquetas HTML (`aria-hidden`) con la insignia "✓ n" y la píldora "Últimas entradas";
      - el resaltado (trazo navy superpuesto y el resto al 40 %), que ahora solo llega desde las tarjetas (decisión 19 enmendada). El puntero sobre una forma no resalta nada.
    - **Zonas agotadas:** gris (tono `sold-out`) con "Agotado" en su etiqueta, sin `aria-disabled` ni `cursor-not-allowed`.
39. **`?zona=` (F6) se mantiene y es la única entrada al panel de cantidad.**
    - Zona de pie → sub-paso 2 con `ZoneQuantityPanel`, la vista "específica" del pedido 5, ahora con el pie "Agregar otra zona" (decisión 35). Zona numerada → plano, como hasta ahora.
    - Dentro de la pantalla, las zonas de pie se eligen en su tarjeta: no hay forma de abrir su panel desde el sub-paso 1.
    - **Descartado:** que `?zona=<de pie>` abra el sub-paso 1 con su tarjeta resaltada. Perdería la vista específica del pedido 5. Obligaría a desplazar la página hasta la tarjeta, que en móvil queda debajo del mapa y fuera de la vista, contra la decisión 32 (la página no mueve el foco ni desplaza). Y dejaría a la vista todo el mapa, el paso que el pedido 5 quería ahorrar.
    - **No cambian:** la validación (`parseInitialZoneId`), la cantidad inicial 0, la combinación con la precarga, el prerenderizado ni la decisión 33.
40. **Stepper compartido `QuantityStepper`** (`modules/seating/components/QuantityStepper.tsx`).
    - El stepper en pastilla aparece ahora una tercera vez (tarjetas, `ZoneQuantityPanel` y `BestSeatsPicker`). "Reutilización" ya preveía abstraerlo en ese momento (DRY a partir de la repetición real).
    - Mismo marcado, clases, `aria-live`, `focusableWhenDisabled` y clases `aria-disabled:*` que hoy: los dos usos actuales no cambian de aspecto ni de comportamiento.
    - Va en el módulo porque solo lo usa `seating`. `TicketSelector` (`modules/events`) tiene un stepper equivalente propio: subirlo a `components/shared/` y migrar ese uso es otro cambio, fuera de alcance (YAGNI en esta fase).
41. **Qué reemplaza la Fase 7** (lo no citado sigue vigente):

    | Fuente | Antes | Desde la Fase 7 |
    |---|---|---|
    | Decisión 2 | Elegir una zona en el mapa o en su tarjeta abre el sub-paso 2 | Solo "Elegir/Cambiar butacas" (numeradas) o `?zona=`. Las de pie se eligen en su tarjeta |
    | Decisión 17 | El mapa y la tarjeta hacen lo mismo | La acción está solo en la tarjeta |
    | Decisión 19 | Resaltado mapa ↔ tarjetas, en los dos sentidos | Solo de la tarjeta al mapa |
    | Decisión 20 | Foco de vuelta a "su tarjeta" (botón) | Al contenedor de la tarjeta (`role="group"`, `tabIndex={-1}`) |
    | Decisión 32 (motivo "es lo mismo que abrir la zona desde el mapa o su tarjeta") | — | El motivo sigue valiendo frente al stepper de la tarjeta (también empieza en 0) |
    | Requisito 10 | `ZoneCards` con `onOpenZone` para todas las zonas | Requisitos 42 y 43 |
    | Requisito 11 | "Abrir una zona: clic, Enter o Espacio sobre su forma o su tarjeta"; resaltado desde el mapa | Requisito 43 |
    | Requisito 12 | `<path role="button" tabIndex={0}>` con `aria-label`, manejadores, `cursor-pointer` y foco; `onOpenZone`/`onHighlightZone`; `<svg role="group">` | Requisito 40 |
    | Requisito 13 | Tarjeta = `<button>` con `aria-label`, chevron y precio a la derecha | Requisito 42 |
    | Requisito 15 | Stepper propio de `ZoneQuantityPanel` | `QuantityStepper` (requisito 41), sin cambios visibles |
    | Requisito 17 | Líneas de "Tu compra" sin acciones | Requisito 45 |
    | Requisito 19 | `changeQuantity` activa la zona | No la activa; además `clearZone` (requisito 44) |
    | Requisito 20 | Targets ≥ 44 en "tarjetas"; foco visible | Requisito 46 |
    | Requisito 26 | Stepper propio de `BestSeatsPicker` | `QuantityStepper`, sin cambios visibles |
    | Requisito 37 | "Las cantidades ya están en las tarjetas ('2 entradas elegidas')" | En las de pie, el valor del stepper. En las numeradas, sigue "2 butacas elegidas" |
    | Criterios de F3 | Hover sobre una forma resalta su tarjeta; foco con Tab en una zona del mapa; abrir "Campo VIP" con clic en el mapa o con su tarjeta; agotada enfocable en el mapa y en la tarjeta; Tab recorre el mapa; lector: "las zonas del mapa se anuncian como botón"; "Paso 1 de 2 · Elige una zona" | Criterios de la Fase 7. Donde F3 abre una zona de pie con su tarjeta, desde F7 se hace con `?zona=` o se usa el stepper de la tarjeta |
    | Criterios de F6 | "La tarjeta 'Campo VIP' dice '2 entradas elegidas'"; "Paso 1 de 2 · Elige una zona" | El stepper de Campo VIP muestra 2; "Paso 1 de 2 · Elige tus zonas". El resto de F6 no cambia |
    | Tests de `TicketSelection.test.tsx` | `mapZone` (`getByRole("button")` dentro del grupo del mapa) y `zoneCard` (botón): clic, Enter, foco y `pointerEnter` en formas; tarjetas como botón | Se reescriben (ver Tests F7) |
    | Test de `useSeatSelection.test.ts` | "changeQuantity activa la zona…" y `activeZoneId` "vip" en el test del límite | `activeZoneId` no cambia |
    | `ticket-selection.md` | Mapa con zonas botón; tarjetas botón; resaltado en los dos sentidos | Requisito 47 |
    | `seating-curved-venues.md` (aprobada, no se edita) | Criterio con `<svg role="group" aria-label="Mapa de zonas de …">`; "Mesa (agotada): se pulsa su forma o su tarjeta y no se abre nada" | Léase `role="img"` con el mismo `aria-label`. Lo de Mesa se sigue cumpliendo: la forma no hace nada y la tarjeta agotada no tiene controles. `elementFromPoint` sigue valiendo (decisión 38) |
    | `seating-all-venue-maps.md` (aprobada, no se edita) | `svg[role="group"]` en el Playwright del requisito 25 (F1b) y en CC1; CC6 "pulsar su forma o su tarjeta no abre nada"; "orden… del Tab en el mapa" | Léase `svg[role="img"]` con el mismo `aria-label`. CC6 se sigue cumpliendo. El orden de las zonas es el de las tarjetas (el mapa no tiene paradas de Tab). `elementFromPoint` sigue valiendo |

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

### Escala de tonos (Fase 2)
9. **`utils/zoneTone.ts` y `types/seating.types.ts`** (decisión 28):
   - `ZoneTone` = `"tier-1" | "tier-2" | "tier-3" | "tier-4" | "tier-5" | "sold-out"`.
   - `getZoneTones` mantiene su firma y su regla: rango entre las zonas no agotadas, de mayor a menor precio, y precios iguales con el mismo tono. Ahora hay 5 tonos; desde el 6.º precio distinto, `tier-5`.
   - `ZONE_TONE_CLASSES[tone]` mantiene las claves `shape` (SVG), `label` y `swatch`. **`label` pasa a llevar la clase SVG y la HTML** (`fill-… text-…`), para que sirva al texto SVG actual y a las etiquetas HTML de la Fase 3 sin una clave más:

     | Tono | `shape` | `label` | `swatch` |
     |---|---|---|---|
     | `tier-1` | `fill-brand-navy` | `fill-background text-background` | `bg-brand-navy` |
     | `tier-2` | `fill-primary-strong` | `fill-primary-foreground text-primary-foreground` | `bg-primary-strong` |
     | `tier-3` | `fill-primary/65` | `fill-foreground text-foreground` | `bg-primary/65` |
     | `tier-4` | `fill-primary/40` | `fill-foreground text-foreground` | `bg-primary/40` |
     | `tier-5` | `fill-primary/20` | `fill-foreground text-foreground` | `bg-primary/20` |
     | `sold-out` | `fill-secondary` | `fill-muted-foreground text-muted-foreground` | `bg-secondary ring-1 ring-input` |

   - **Efecto transitorio hasta la Fase 3:** con las formas translúcidas, el halo navy de "zona activa" de la pantalla actual (dibujado detrás) se ve también por dentro de las zonas `tier-3`–`tier-5`. La Fase 3 lo sustituye por un trazo superpuesto. Se acepta porque la Fase 2 es corta y va justo antes.

### Sub-paso 1 con el diseño de la captura, sub-paso 2 y resumen móvil (Fase 3)
10. **`TicketSelection`** (`"use client"`), estructura (decisión 17):
    - Se mantienen la grilla, el resumen y la barra:
      - grilla `grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8`;
      - columna izquierda `min-w-0`;
      - `PurchaseSummary` a la derecha (`hidden self-start lg:sticky lg:top-24 lg:flex`);
      - debajo, `MobilePurchaseBar` (`sticky bottom-0 z-30 -mx-4 md:-mx-6 lg:hidden`).
    - La columna izquierda es **una sola** `Card rounded-2xl gap-5` (`<section aria-labelledby>`) "Elige tus entradas":
      - **Cabecera** (`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1`):
        - h2 "Elige tus entradas" (`text-xl font-bold tracking-tight`);
        - a la derecha, `<p aria-live="polite" className="text-sm text-muted-foreground">` con "Paso 1 de 2 · Elige una zona", "Paso 2 de 2 · Elige la cantidad" (zona de pie) o "Paso 2 de 2 · Elige tus butacas" (zona numerada).
      - **Sub-paso 1:** `VenueMapView` y debajo `ZoneCards`, en `flex flex-col gap-5`.
      - **Sub-paso 2:** `ZoneStepHeader` y debajo `ZoneQuantityPanel` (de pie) o `SeatPlan` (numerada). El mapa y las tarjetas no están en el DOM.
    - **Estado de UI propio** (no del hook):
      - `highlightedZoneId: string | null`;
      - `returnZoneId: string | null` (la zona que se acaba de cerrar, para la transición de vuelta).
    - **Derivados:**
      - `tones`;
      - `selectedCountByZone`: cantidades de pie + butacas por zona (amplía `countSeatsByZone`);
      - `seatLimit` de la zona abierta: n + (`MAX_TICKETS_PER_ORDER` − entradas totales) (decisión 11);
      - `selectedSeats` (todas las zonas, para los chips).
    - Se elimina `ZoneList.tsx`. Su stepper −/+ pasa a `ZoneQuantityPanel` con el mismo marcado y las mismas clases.
11. **Sub-pasos, foco, resaltado y transición** (decisiones 2, 19, 20 y 26). *Enmienda F7: la apertura de zonas y el resaltado los sustituye el requisito 43. Siguen el foco al h3, la vuelta y la transición.*
    - **Abrir una zona:** clic, Enter o Espacio sobre su forma en el mapa o sobre su tarjeta → `selectZone(id)`. Las agotadas no hacen nada.
    - **Foco al abrir:** pasa al h3 de `ZoneStepHeader` (`flushSync` y luego `focus()`, como hoy).
    - **Volver:** "Todas las zonas" → `closeZone()` y `returnZoneId = id`. El foco pasa a su tarjeta (`[data-zone-id="<id>"]`).
    - La selección se conserva al cambiar de sub-paso y de zona.
    - **Resaltado:**
      - `highlightedZoneId` cambia con `onHighlightZone` del mapa y de las tarjetas;
      - el mapa resalta esa zona y la tarjeta lleva `data-highlighted="true"`;
      - al abrir o cerrar una zona vuelve a `null`;
      - las agotadas no se resaltan.
    - **Transición:**
      - El contenedor del sub-paso 2 lleva `motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300 motion-safe:ease-out` y `style={{ transformOrigin: "<x %> <y %>" }}`, con el `labelPos` de la zona sobre `parseViewBox(map.viewBox)`.
      - Tras volver (`returnZoneId` no nulo), el sub-paso 1 lleva `motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-105 motion-safe:duration-300` con el origen de esa zona.
      - En el primer render no hay animación.
12. **`VenueMapView`** (presentacional; sustituye al requisito 12 de la spec base). Objetivo: el mapa de la captura del paso 1. *Enmienda F7: las props `onOpenZone`/`onHighlightZone`, el rol del `<svg>`, "Zonas" (rol, foco, teclado y eventos), el `cursor-pointer` y el estado de foco los sustituye el requisito 40. Lo visual sigue igual.*
    - **Props:** `viewBox`, `stage`, `venue`, `zones`, `tones`, `highlightedZoneId`, `selectedCountByZone`, `onOpenZone(zoneId)` y `onHighlightZone(zoneId | null)`. Sin `Card`, sin cabecera y sin `activeZoneId`.
    - **Marco:**
      - `div.rounded-xl.bg-muted.p-3.md:p-4` > `div.relative.mx-auto.w-full`;
      - `style={{ aspectRatio: "<w> / <h>", maxWidth: "calc(min(64svh, 600px) * <w> / <h>)" }}` (`parseViewBox`), para que el mapa no pase de ~600 px de alto en pantallas bajas;
      - dentro, el `<svg viewBox className="absolute inset-0 size-full" role="group" aria-label="Mapa de zonas de <venue>">` y la capa de etiquetas.
    - **Zonas:** `<path role="button" tabIndex={0}>`, en el orden de `zones`:
      - `aria-label` de la spec base ("<nombre>, <precio>" o "<nombre>, agotado", más ", asientos numerados" y ", últimas entradas" si aplica) y, si hay selección, ", 2 entradas elegidas" / ", 1 butaca elegida" (mismas formas que las tarjetas);
      - sin `aria-pressed`;
      - **agotadas:** `aria-disabled="true"` y `cursor-not-allowed`. Siguen siendo enfocables (para oír "agotado"), no hacen nada y no se resaltan;
      - Enter y Espacio con `preventDefault`;
      - `onPointerEnter`/`onFocus` → `onHighlightZone(id)`; `onPointerLeave`/`onBlur` → `onHighlightZone(null)`.
    - **Estados visuales:**
      - **reposo:** clase `shape` del tono + `stroke-background stroke-3` (la separación blanca de la captura) + `cursor-pointer`;
      - **resaltada:**
        - un `<path aria-hidden className="pointer-events-none fill-none stroke-brand-navy stroke-4">` con su `d`, dibujado **después** de todas las zonas;
        - el resto de las zonas y sus etiquetas, con `opacity-40` (`transition-opacity duration-200`);
      - **foco:** trazo discontinuo `stroke-ring` (igual que hoy).
    - **Escenario:** forma `fill-brand-navy` y luces (`<circle r={5} className="fill-highlight">` por cada `stage.lights`), en un `<g aria-hidden>`.
    - **Etiquetas en HTML** (decisión 18):
      - Una por zona y otra para el escenario, en una capa `absolute inset-0 pointer-events-none` con `aria-hidden`.
      - Cada una: `absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center leading-[1.15]`, en `left: x/w·100 %` y `top: y/h·100 %` de su `labelPos`.
      - **Escenario:** `stage.label`, `text-xs md:text-sm font-bold uppercase tracking-widest text-background`.
      - **Nombre:** `text-xs md:text-sm font-bold`. Con `wrapLabel`, en 2 líneas partido en el primer espacio; sin él, `whitespace-nowrap`.
      - **Precio** (`formatEventPrice`) o "Agotado": `text-xs md:text-sm font-medium tabular-nums`, en la misma línea que la insignia de selección.
      - **Color:** la clase `label` del tono (su parte `text-*`).
      - **`low-stock`:** píldora "Últimas entradas" `mt-1 hidden md:inline-flex rounded-full bg-warning px-2 py-0.5 text-xs font-bold text-warning-foreground`.
      - **Con selección:** insignia en línea tras el precio, `ml-1 inline-flex h-5 items-center gap-0.5 rounded-full bg-background px-1.5 text-xs font-bold tabular-nums text-foreground ring-1 ring-border`, con `Check` (`size-3`) y el número.
    - Se eliminan `ZoneLabel` (SVG) y sus constantes (`LABEL_FONT_SIZE`, `LABEL_LINE_HEIGHT`, `PILL_*`).
13. **`ZoneCards`** (nuevo, presentacional). Objetivo: las tarjetas de la captura del paso 1. *Enmienda F7: lo sustituye el requisito 42. Se conservan la barra de color, el nombre con su `Badge`, el tipo con icono, "n butacas elegidas" y la regla de las agotadas, sin controles.*
    - **Props:** `zones`, `tones`, `highlightedZoneId`, `selectedCountByZone`, `onOpenZone` y `onHighlightZone`.
    - **Lista:** `<ul aria-label="Zonas" className="grid gap-3 sm:grid-cols-2">`, en el orden de `zones`. Una columna por debajo de `sm`.
    - **Cada tarjeta** es un `<li>` con un `<button type="button" data-zone-id data-highlighted>` a todo el ancho:
      - **estilo:** `flex min-h-18 w-full cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors duration-200 hover:border-primary/40 hover:bg-accent/40 data-[highlighted=true]:border-primary/40 data-[highlighted=true]:bg-accent/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50`;
      - **barra de color** a la izquierda: `w-1.5 self-stretch rounded-full` con la clase `swatch` del tono (`aria-hidden`);
      - **en el centro:**
        - nombre (`text-base font-bold`) y, si es `low-stock`, `Badge` "Últimas entradas" (`h-6 bg-warning font-bold text-warning-foreground`);
        - debajo, el tipo (`text-sm text-muted-foreground`): `Users` + "General · sin butaca" o `Armchair` + "Numerada · elige tu butaca" (iconos `size-4`, `aria-hidden`);
        - si hay selección en la zona (`text-sm font-medium text-primary-strong`): "1 entrada elegida" / "n entradas elegidas" o "1 butaca elegida" / "n butacas elegidas";
      - **a la derecha:**
        - "c/u" (`text-xs text-muted-foreground`) encima del precio (`text-base font-bold tabular-nums text-foreground`). No va en naranja como en la captura: MASTER reserva el color para la acción (Preguntas abiertas 13);
        - `ChevronRight` (`size-5 text-muted-foreground`, `aria-hidden`);
      - **eventos:** `onPointerEnter`/`onFocus` → `onHighlightZone(id)`; `onPointerLeave`/`onBlur` → `onHighlightZone(null)`.
    - **Agotada:**
      - el precio se sustituye por "Agotado" (`font-bold text-muted-foreground`), sin chevron;
      - `aria-disabled="true"` y `cursor-not-allowed`, sin hover ni resaltado;
      - el clic no hace nada, pero sigue enfocable.
    - **`aria-label` del botón:** "<nombre>, <precio> c/u, general sin butaca" o "…, numerada, elige tu butaca". Además:
      - si es `low-stock`, ", últimas entradas";
      - si está agotada, "<nombre>, agotado, …";
      - si hay elegidas, ", 2 entradas elegidas" o ", 2 butacas elegidas".
    - **Pie:** `<p className="text-sm text-muted-foreground">` "Precio final por entrada, sin cargos ocultos. Máximo 10 entradas por compra."
14. **`ZoneStepHeader`** (nuevo, presentacional; reutiliza `components/ui/breadcrumb`). Sustituye a `ZoneStepBreadcrumb`. Objetivo: la cabecera de la captura del paso 2.
    - **Props:** `zone: Pick<VenueZone, "name" | "price" | "status" | "kind">`, `headingId`, `onBack` y `children?` (lo que va a la derecha).
    - **Migas:** `<Breadcrumb aria-label="Ruta de selección">` con:
      - `BreadcrumbLink render={<button type="button" />}`: `ChevronLeft` (`aria-hidden`) + "Todas las zonas", en `inline-flex min-h-11 cursor-pointer items-center gap-1 font-semibold text-primary-strong hover:text-foreground`;
      - `BreadcrumbSeparator`;
      - `BreadcrumbPage` con el nombre de la zona.
    - **Fila** `flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1`:
      - a la izquierda:
        - h3 con el nombre (`text-base md:text-lg font-bold`, `tabIndex={-1}`, `outline-none scroll-mt-24`, `id={headingId}`);
        - `<span className="text-base text-muted-foreground tabular-nums"> · S/ 155.00 c/u</span>`;
        - si es `low-stock`, el `Badge` "Últimas entradas";
      - a la derecha, `children`.
    - **Debajo:** `text-sm text-muted-foreground` con icono: `Users` "General · sin butaca" o `Armchair` "Numerada · elige tu butaca".
15. **`ZoneQuantityPanel`** (nuevo, zona de pie abierta; patrón Joinnus). *Enmienda F7: solo se llega a él con `?zona=` (decisión 39). Su stepper pasa a ser `QuantityStepper` (requisito 41), con el mismo aspecto y los mismos `aria-label`.*
    - **Props:** `zoneName`, `price`, `quantity`, `atLimit` y `onChangeQuantity(delta: 1 | -1)`.
    - **Contenedor:** `flex flex-col gap-4 rounded-xl border p-4`.
    - **Fila** `flex flex-wrap items-center justify-between gap-4`:
      - a la izquierda, "Cantidad" (`text-base font-semibold`, con `id`) sobre "S/ 330.00 c/u" (`text-sm text-muted-foreground tabular-nums`);
      - a la derecha, el stepper en pastilla de `ZoneList`: mismas clases; `aria-label` "Quitar una entrada de <zona>" / "Agregar una entrada de <zona>"; `focusableWhenDisabled`; cantidad con `aria-live="polite"`; dentro de un `role="group"` con `aria-labelledby` al "Cantidad".
    - **Subtotal** (`flex items-baseline justify-between border-t pt-3`): "Subtotal" (`text-sm text-muted-foreground`) e importe precio × cantidad (`text-lg font-bold tabular-nums`, `aria-live="polite"`).
    - **Pie:** `<p role="status" className="text-sm text-muted-foreground">` "Máximo 10 entradas por compra." o "Llegaste al máximo de 10 entradas por compra."
16. **`SeatPlan` como sub-paso 2 (F3)** (zona numerada abierta). Deja de ser una `Card` propia:
    - Sin h2 y sin la línea "<zona> · S/ X c/u": las pone `ZoneStepHeader`.
    - El contador va como `children` de `ZoneStepHeader`: `<p aria-live="polite" className="text-sm font-medium tabular-nums">` "n de m butacas" (decisión 11).
    - Arriba, la ayuda "Toca una butaca para elegirla. Acerca el plano con los botones o pellizcando." (`text-sm text-muted-foreground`).
    - El resto sigue como hoy hasta la Fase 4:
      - barra sobre el lienzo con zoom y "Mejor asiento disponible";
      - lienzo con zoom, gestos, roving tabindex y clic tras arrastre;
      - ayuda `sr-only`, leyenda, aviso `role="status"` y `SelectedSeatChips`.
    - `headingId` pasa a ser el `id` del h3 de `ZoneStepHeader`: al quitar el último chip, el foco va a él. Se elimina el `headingRef` interno.
    - El `viewBox` se lee con `parseViewBox`.
17. **`PurchaseSummary`:**
    - Texto vacío: "Todavía no elegiste entradas. Empieza eligiendo una zona." (texto del diseño). No cambian "Total (0 entradas)" ni "S/ 0.00".
    - El contenido se separa en `PurchaseSummaryContent`, exportado desde el mismo archivo: líneas o vacío, total, "Precio final, sin cargos ocultos" y CTA.
    - `PurchaseSummary` = `aside aria-label="Resumen de la compra"` + `Card` + h2 "Tu compra" + `PurchaseSummaryContent`. Mismas props.
18. **`MobilePurchaseBar` con hoja inferior** (decisión 21):
    - Nueva prop `lines: SelectionLine[]`.
    - **Fila:**
      - bloque del total (`aria-live`, como hoy);
      - `SheetTrigger render={<Button variant="outline" size="icon" className="size-11 cursor-pointer" aria-label="Ver resumen de la compra" />}` con `ChevronUp`;
      - "Continuar" (`px-5`).
      - A 375 px cabe sin scroll horizontal.
    - **Hoja:** `SheetContent side="bottom" className="max-h-[85svh] gap-0 rounded-t-2xl"`:
      - `SheetHeader` con `SheetTitle` "Tu compra" (`text-lg font-bold`);
      - cuerpo `overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]` con `PurchaseSummaryContent`.
      - Base UI lleva el foco a la hoja, Escape la cierra y el foco vuelve al botón.
19. **Hook y utilidades (F3):**
    - `useSeatSelection`:
      - `selectZone(zoneId)` no hace nada si la zona no existe o está `sold-out` (antes activaba cualquiera);
      - nueva acción `closeZone()`: `activeZoneId = null`;
      - el resto no cambia (incluido que `changeQuantity` activa la zona). *Enmienda F7 (decisión 37): `changeQuantity` ya no activa la zona (requisito 44).*
    - `utils/viewBox.ts` (nuevo): `parseViewBox(viewBox: string): { width: number; height: number }`, para el formato `"0 0 W H"` de `viewBoxSchema`. Con otro formato lanza `Error`. Lo usan `VenueMapView`, `TicketSelection` y `SeatPlan`.

### Accesibilidad y responsive (Fases 3–6)
20. Se mantiene el requisito 29 de la spec base, con estos encabezados:
    - un h1 (título del evento);
    - h2 "Elige tus entradas" y "Tu compra" (en móvil, "Tu compra" es el `SheetTitle` de la hoja abierta);
    - h3 de zona en el sub-paso 2 y h3 "Tus asientos" en el plano.
    - Además:
      - el cambio de sub-paso se anuncia por el `aria-live` del indicador;
      - el foco nunca se pierde al cambiar de sub-paso (requisito 11);
      - targets ≥ 44 px en tarjetas, migas, steppers, controles de zoom y el botón de la hoja (las butacas tienen su propia regla: ≥ 24 px con el plano entero a la vista);
      - foco visible en todo lo interactivo;
      - sin scroll horizontal a 375 / 768 / 1024 / 1440;
      - solo tokens, sin emojis;
      - animaciones solo con `motion-safe:` o `animationTime` 0 si `prefers-reduced-motion: reduce`.

### Plano de butacas renovado (Fase 4; objetivo: captura del paso 2)
21. **`SeatShape` y `SeatLegend`** (`components/SeatLegend.tsx`; decisión 10):
    - **`SeatShape({ status, selected, number? })`:**
      - **disponible sin elegir:**
        - `<circle r={12} className="fill-primary/30 stroke-primary stroke-[1.5] transition-colors duration-150 group-hover/seat:fill-primary/50">`;
        - con `number`, encima: `<text fontSize={12} textAnchor="middle" dominantBaseline="central" className="pointer-events-none fill-brand-navy font-bold tabular-nums opacity-0 transition-opacity group-data-[detail=numbers]/plan:opacity-100">` (requisito 23);
      - **elegida** (disponible o accesible):
        - círculo r 12 (o el cuadrado de 24, `rx` 6, si es accesible) `fill-brand-navy`;
        - check `stroke-background stroke-[2.5]` con `motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-150 origin-center [transform-box:fill-box]`;
      - **ocupada:** como hoy, `fill-secondary stroke-input stroke-2` con "×" `stroke-muted-foreground`;
      - **accesible sin elegir:** cuadrado 24 × 24 `rx` 6 `fill-highlight` con `<Accessibility x={-8} y={-8} width={16} height={16} strokeWidth={2.5} className="text-highlight-foreground" aria-hidden />` (lucide).
    - El borde `primary` de las disponibles contrasta ≥ 3:1 con `muted` y `accent` (componente gráfico).
    - `SeatGridPreview` (vista previa de organizer) hereda la nueva forma de "disponible", sin número. No cambia su código.
    - **`SeatLegend({ price, selectedCount, hasAccessible })`:**
      - contenedor `flex flex-wrap items-center justify-between gap-x-6 gap-y-2`;
      - `<ul aria-label="Leyenda del plano" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">` con la miniatura de cada `SeatShape` (`size-6`) y su texto: "Disponible · S/ 155.00", "Elegida", "Ocupada" y, solo si la zona tiene accesibles, "Accesible (silla de ruedas)";
      - a la derecha, `<p aria-live="polite" className="text-sm font-medium tabular-nums">` "1 elegida" / "n elegidas" (butacas elegidas en la zona; con 0, "0 elegidas").
22. **Controles de zoom** (decisión 12):
    - Grupo `role="group" aria-label="Zoom del plano"` en pastilla `inline-flex gap-1 rounded-xl bg-background p-1 shadow-sm ring-1 ring-border`.
    - Tres `Button variant="ghost" size="icon" className="size-11 cursor-pointer"`: `Plus` "Acercar", `Minus` "Alejar" y `Maximize` "Ver todo el plano" (`aria-label`), con el mismo comportamiento de hoy.
    - **Por debajo de `sm`:** en la barra sobre el lienzo, a la derecha (`flex items-end justify-between gap-2`).
    - **Desde `sm`:** superpuesto dentro del lienzo (`relative`), con `sm:absolute sm:bottom-3 sm:right-3 sm:z-10`.
      - El contenido transformado reserva espacio abajo (p. ej. `sm:pb-16`): con el plano entero a la vista ninguna butaca queda bajo los controles.
      - El developer lo comprueba con capturas a 768 y 1440 en las 6 zonas numeradas de los 4 mapas.
    - "Mejor asiento disponible" sale de la barra (requisito 26).
23. **Nivel de detalle: números al acercar** (decisión 23):
    - `utils/planViewport.ts` (nuevo, puro):
      - `getPlanFit({ planWidth, planHeight, viewportWidth, viewportHeight }): { unit: number; offsetX: number; offsetY: number }`:
        - `unit = min(vw/pw, vh/ph)` y `offset = ((vw − pw·unit)/2, (vh − ph·unit)/2)`, como el `preserveAspectRatio` por defecto;
        - con alguna medida ≤ 0, todo 0;
      - `getSeatDetailLevel(unit, scale): "overview" | "numbers"`: `"numbers"` si `scale > 1` y `unit·scale ≥ 1` (el número de 12 unidades mide ≥ 12 px); si no, `"overview"`.
    - `SeatPlan`:
      - el `<svg>` lleva `className="group/plan …"`;
      - un componente interno sin salida visual (dentro de `TransformWrapper`) usa `useTransformInit` y `useTransformEffect`. Con `getPlanFit` (tamaño CSS del `<svg>`, `clientWidth`/`clientHeight`) y `state.scale` calcula el nivel, y solo si cambia escribe `svg.dataset.detail`. No es una prop de React: no hay re-render ni desajuste de hidratación, y sin atributo cuenta como `"overview"`.
    - Las butacas disponibles sin elegir reciben `number={seat.number}`.
24. **`SeatTooltip`** (nuevo, presentacional; decisión 24):
    - **Props:** `tooltip: { title: string; detail: string; x: number; y: number; placement: "top" | "bottom" } | null`.
    - **Aspecto:**
      - `aria-hidden`;
      - `pointer-events-none absolute z-20 rounded-lg bg-brand-navy px-3 py-1.5 text-xs text-background shadow-lg`;
      - `-translate-x-1/2`, más `-translate-y-full -mt-2` (arriba) o `mt-2` (abajo);
      - título `font-bold` y detalle `tabular-nums`.
    - **`SeatPlan` lo muestra:**
      - con el puntero sobre una butaca (`pointerover` delegado en el `<g>` de butacas) si `event.pointerType !== "touch"`;
      - al enfocar una butaca (`focus` delegado).
    - **Posición:**
      - relativa al lienzo (`relative`), a partir del `getBoundingClientRect` de la butaca;
      - `x` = centro de la butaca, recortado a [64, ancho − 64];
      - `y` = borde superior (`top`). Si queda a menos de 48 px del borde del lienzo, borde inferior (`bottom`).
    - **Se oculta** al salir el puntero de las butacas, con `blur` y al empezar paneo, zoom o pellizco (`onPanningStart`, `onZoomStart`, `onPinchStart`).
    - **Textos:**
      - título "Fila F · Asiento 12" (`formatSeatShortLabel`);
      - detalle:
        - disponible: "S/ 155.00";
        - elegida: "Elegida · S/ 155.00";
        - accesible: "Accesible · S/ 155.00";
        - ocupada: "Ocupada".
25. **Letras de fila:**
    - **En cuadrícula** (sin `planTransform`): letra en los dos márgenes (`x = SEAT_PLAN_MARGIN.x / 2` y `x = ancho − SEAT_PLAN_MARGIN.x / 2`, `y` de la fila). La barra "ESCENARIO" sigue arriba.
    - **En arco** (con `planTransform`):
      - sin barra "ESCENARIO", que contradecía la orientación (diagnóstico 4);
      - letra en `getRowEdgeLabelPoints(row).start` y `.end`;
      - la invariante de la Fase 1 garantiza que quedan dentro del `seatViewBox` con ≥ 12 de margen.
    - **Estilo:** `fill-muted-foreground font-bold`, **13 unidades** (`ROW_LABEL_FONT_SIZE = 13` en `SeatPlan.tsx`; ≈ la mitad del diámetro de la butaca, como `images/15.png`), `text-anchor="middle"`, `dominant-baseline="central"`, `aria-hidden`.
      - *Enmienda F5 (decisión 30):* antes, 24 unidades (la F4 se implementó así). Las posiciones de arriba no cambian: 0.8 pitch en arco (`getRowEdgeLabelPoints`) y `x = 20` / `ancho − 20` en cuadrícula.
26. **"Mejores butacas" con cantidad** (decisión 25):
    - **Hook `pickBestSeats(zoneId: string, count: number): string[] | null`** (cambia la firma):
      - calcula con la selección actual (el cierre del render, porque es un manejador de clic), aplica el estado y devuelve los ids elegidos o `null`;
      - con `count` que no sea un entero ≥ 1, o una zona inexistente o de pie: `null`, sin cambios;
      - zona agotada o sin bloque libre de `count` (`findBestAvailableSeats`): aviso "No quedan asientos disponibles en esta zona." (count 1) o "No hay <count> asientos juntos disponibles en esta zona." y `null`;
      - si (entradas totales − butacas de la zona + `count`) > `MAX_TICKETS_PER_ORDER`: aviso "Máximo 10 entradas por compra" y `null`;
      - si no: sustituye las butacas de la zona por el bloque (las demás zonas no cambian), pone el aviso de siempre ("Elegimos Fila C · Asiento 6." / "Elegimos 2 asientos juntos en la fila C.") y devuelve el bloque.
    - **`BestSeatsPicker`** (nuevo, presentacional):
      - **Props:** `seatLimit`, `selectedInZone` y `onPick(count)`.
      - **Estado local `count`:** inicial `selectedInZone > 0 ? selectedInZone : 2`; se muestra recortado a [1, máx(1, `seatLimit`)].
      - **Layout:** `flex flex-col gap-3 rounded-xl bg-muted p-3 sm:flex-row sm:items-center sm:justify-between`.
      - **A la izquierda:**
        - "¿Cuántas butacas juntas?" (`text-sm font-semibold`, `id`);
        - stepper en pastilla con las clases de `ZoneQuantityPanel` (`role="group"` + `aria-labelledby`; "Quitar una butaca" / "Agregar una butaca"; valor con `aria-live="polite"`; "−" deshabilitado en 1 y "+" en `seatLimit`; `focusableWhenDisabled`).
      - **A la derecha:** `Button variant="outline" className="h-11 cursor-pointer gap-2 font-semibold text-primary-strong"` con `Sparkles`: "Elegir las mejores butacas" o, con `count` 1, "Elegir la mejor butaca".
      - **Con `seatLimit` 0:** el stepper y el botón quedan deshabilitados (`focusableWhenDisabled`).
    - **`SeatPlan`:**
      - prop `onPickBestSeats(zoneId, count) => string[] | null`;
      - si devuelve ids: oculta el tooltip y llama a `zoomToElement(<elementos de esas butacas>, { maxScale: 2, animationTime: getAnimationTime() })`;
      - se quita la prop `canPickBest` (la sustituye `seatLimit`).
27. **Estructura de `SeatPlan` en la Fase 4** (de arriba abajo):
    1. ayuda (`text-sm text-muted-foreground`);
    2. por debajo de `sm`, la barra sobre el lienzo con el zoom a la derecha;
    3. lienzo `relative w-full max-h-[70vh] touch-none overflow-hidden rounded-xl bg-muted ring-1 ring-border`, con el `aspect-ratio` del `seatViewBox` (hasta F5). Dentro: el `TransformComponent`, el `SeatTooltip` y, desde `sm`, el grupo de zoom superpuesto;
    4. `SeatLegend` (precio, elegidas en la zona y si hay accesibles);
    5. bandeja `flex flex-col gap-4 border-t pt-4`: `BestSeatsPicker`, `<p role="status">` del aviso y `SelectedSeatChips` (todas las zonas, como hoy).
    - **Props finales:** `zone`, `stageLabel`, `selectedSeatIds`, `selectedSeats`, `notice`, `seatLimit`, `selectedInZone`, `onToggleSeat`, `onRemoveSeat`, `onPickBestSeats` y `headingId`.
    - Se mantienen sin cambios: el roving tabindex, el teclado, el clic tras arrastre, la rueda con Ctrl/Cmd, el doble toque desactivado y los `aria-*` de las butacas.

### Plano curvo con contexto y minimapa (Fase 5; antigua Fase 3)
28. **Fondo del estadio en el plano** (solo zonas con `planTransform`; captura del paso 2):
    - Debajo de las butacas, `<g aria-hidden transform="translate(x y) scale(s)" className="pointer-events-none">` con:
      - el escenario `fill-brand-navy` y sus luces `fill-highlight`;
      - las demás zonas `fill-secondary`, con borde `stroke-background` de 2 px;
      - la zona abierta `fill-accent stroke-primary`, de 2 px (el "lila con borde azul" de la captura).
    - Los trazos llevan `vector-effect="non-scaling-stroke"`.
    - Sin textos del mapa.
29. **Lienzo apaisado y minimapa** (decisiones 12 y 27; solo zonas con `planTransform`):
    - **Desde `sm`:**
      - el lienzo es `sm:aspect-[16/10]` (en vez del `aspect-ratio` del plano);
      - el `<svg>` del plano lleva `overflow-visible`, así que el fondo del estadio se ve alrededor del sector, recortado por el lienzo;
      - `fitOnInit="contain"` centra el plano.
    - **Contenedor del lienzo:** el bloque que agrupa la barra y el lienzo (miden lo mismo de ancho) lleva `@container`. El ancho del minimapa y la franja de la pastilla de zoom en arco dependen del **ancho del lienzo** (umbral `@2xl`, 672 px), no del de la ventana (decisión 12, enmienda F5).
    - **Franja inferior del contenido transformado** (para la pastilla de zoom superpuesta): en cuadrícula `sm:pb-16` (F4); en arco `sm:@max-2xl:pb-16`, solo con el lienzo estrecho.
    - **Minimapa** (envuelto en `<div className="pointer-events-none flex" data-placement="overlay" | "bar">`):
      - desde `sm`, **superpuesto solo si cabe** (`data-placement="overlay"`, con `sm:absolute sm:left-3 sm:top-3 sm:z-10`). Cabe si `canOverlayMinimap(svg, minimap, planWidth, planHeight)` (función interna de `SeatPlan.tsx`): con `getPlanFit` sobre el tamaño del `<svg>`, `offsetX ≥ 12 + ancho del minimapa` u `offsetY ≥ 12 + alto del minimapa`. Sin medidas (jsdom), cabe;
      - si no cabe (`data-placement="bar"`), en la barra sobre el lienzo, que deja de ser `sm:contents`; la pastilla de zoom sigue superpuesta abajo a la derecha. Mover el minimapa no cambia el tamaño del lienzo (sin bucle);
      - se recalcula antes de pintar (`useLayoutEffect`, al abrir la zona) y en cada cambio de tamaño del lienzo (`ResizeObserver`);
      - por debajo de `sm`, a la izquierda de la barra sobre el lienzo;
      - con el plano entero a la vista no tapa butacas ni letras: superpuesto, por construcción; en la barra, queda fuera del lienzo (se comprueba a 768 y 1440).
      - Resultado con los datos actuales: Oriente y Occidente (planos casi cuadrados) lo llevan superpuesto en todos los anchos desde `sm`; los planos apaisados, en la barra.
    - Las zonas en cuadrícula no cambian: sin fondo ni minimapa, con la proporción del plano.
30. **`SeatPlanMinimap`** (nuevo, `"use client"` por estar dentro de `TransformWrapper`):
    - SVG `aria-hidden` con el `viewBox` del mapa, en `h-auto w-24 overflow-visible rounded-lg bg-background/90 p-1 shadow-sm ring-1 ring-border @2xl:w-28` (96 px con el lienzo estrecho, 112 px con el ancho; antes `md:w-28`, que medía 112 px sobre un lienzo de 516 px a 1024 y tapaba butacas).
    - **Contenido:**
      - escenario `fill-brand-navy`;
      - zonas `fill-secondary`;
      - zona abierta `fill-primary`;
      - recuadro de la vista actual: `fill-none stroke-foreground`, 2 px no escalables.
    - Lee la transformación con `useTransformEffect` (`state.scale`, `positionX`, `positionY`), el tamaño de `instance.wrapperComponent` (el lienzo) y el alto del `<svg>` del plano, que recibe por la prop `planRef: RefObject<SVGSVGElement | null>`. Con ellos calcula el recuadro con `getVisiblePlanRect({ …, insetBottom: alto del lienzo − alto del <svg> })` y `toVenueRect`. Antes del primer efecto, el recuadro es el plano entero.
    - **Medidas** con decimales del estilo calculado (`getComputedStyle(…).width/height`), no con `clientWidth`/`clientHeight` (redondeo a px enteros: desviaba el recuadro hasta ~1 unidad del mapa) ni con `getBoundingClientRect` (incluye el zoom y la animación de entrada).
31. **`utils/planViewport.ts`** (se amplía; puro):
    - `getVisiblePlanRect({ planWidth, planHeight, viewportWidth, viewportHeight, scale, positionX, positionY, insetBottom? }): Rect`:
      - usa `getPlanFit` (`u` y `off`) sobre el viewport **menos `insetBottom`** (la franja inferior que el contenido reserva con padding; por defecto 0, los negativos cuentan como 0);
      - `x = (−positionX/scale − offX)/u`, `y = (−positionY/scale − offY)/u`, `width = vw/(scale·u)`, `height = vh/(scale·u)` (con el `vh` entero del lienzo);
      - resultado recortado a [0, pw] × [0, ph];
      - sin medidas (alguna ≤ 0) o con escala ≤ 0, el plano entero.
    - `toVenueRect(rect, planTransform): Rect` = ((x − tx)/s, (y − ty)/s, w/s, h/s).

### Precarga y entrada por zona desde la URL (Fase 6; antigua Fase 4, ampliada)
32. **`parseSeatingPreselection(map, params)`** en `utils/selectionSummary.ts` (pura; decisión 15):
    - Firma: `(map: VenueMap, params: Pick<URLSearchParams, "getAll">) => SeatSelection`. `ReadonlyURLSearchParams` encaja.
    - `remaining = MAX_TICKETS_PER_ORDER`. Se recorren las zonas de `map.zones` en orden y se omiten las `sold-out`:
      - **de pie:** se toma `params.getAll(zone.ticketTypeId)` solo si hay exactamente un valor `^\d+$` entre 1 y `MAX_TICKETS_PER_ORDER`. Entonces `quantities[zone.id] = min(valor, remaining)`;
      - **numerada:** se toman los ids de `asientos` (solo si el parámetro aparece una vez; se separa por `,`) que cumplen `parseSeatId(id)?.zoneId === zone.id` y `resolveSeats(map, [id]) !== null`, sin repetidos, en el orden de la URL y hasta `remaining`. El parámetro `<ticketTypeId>` de la zona se ignora.
      - En cada paso se descuenta de `remaining` lo tomado.
    - Devuelve `{ quantities, seatIds }`: solo cantidades > 0, y `seatIds` en orden de zonas y, dentro de cada una, en el de la URL. Sin nada válido, `{ quantities: {}, seatIds: [] }`.
    - Ida y vuelta: para toda selección válida `s`, `parseSeatingPreselection(map, params de buildSeatingCheckoutHref(slug, map, s))` devuelve las mismas cantidades y los mismos asientos.
33. **`useSeatSelection(map, initial?: { selection?: SeatSelection; zoneId?: string | null })`:**
    - estado inicial `{ selection: initial?.selection ?? { quantities: {}, seatIds: [] }, notice: null }` y `activeZoneId` = `initial?.zoneId ?? null` (inicializadores de `useState`);
    - la selección debe venir de `parseSeatingPreselection` y la zona de `parseInitialZoneId` (ya validadas): el hook no las revalida;
    - el resto de la firma y de las acciones no cambia. Sin `initial`, idéntico a hoy.
34. **`TicketSelection`** gana `initialSelection?: SeatSelection` e `initialZoneId?: string | null`, y los pasa al hook (`{ selection: initialSelection, zoneId: initialZoneId }`). Sin las props, idéntico a la pantalla de las Fases 3–5.
    - Con `initialZoneId`, el primer render ya es el sub-paso 2 de esa zona (indicador, `ZoneStepHeader` y panel o plano), sin mover el foco (decisión 32). `returnZoneId` empieza en `null`, como siempre.
    - Una zona de pie abierta así empieza con la cantidad que traiga la precarga, o 0 (decisión 32).
35. **`components/PreselectedTicketSelection.tsx`** (nuevo, `"use client"`):
    - Props `{ map: VenueMap }`.
    - `const searchParams = useSearchParams()` (de `next/navigation`) y `<TicketSelection map={map} initialSelection={parseSeatingPreselection(map, searchParams)} initialZoneId={parseInitialZoneId(map.zones, searchParams)} />`.
    - Sin más lógica. Se exporta en `index.ts`. Mismo patrón que `PreselectedTicketSelector` de `modules/events` (ya implementado).
36. **`app/(purchase)/eventos/[slug]/entradas/page.tsx`** (ruta tras la Fase 1 de `design-alignment-purchase-flow.md`): `<Suspense fallback={<TicketSelection map={map} />}><PreselectedTicketSelection map={map} /></Suspense>` en lugar de `<TicketSelection map={map} />`, dentro del mismo `PurchaseShell`. No cambian `generateStaticParams`, `generateMetadata`, `PurchaseShell` (`currentStep={1}`, "Volver al evento") ni la franja del evento. La página no lee `searchParams`.
37. **Accesibilidad (F6):**
    - La precarga y `zona` no mueven el foco ni anuncian nada: el indicador muestra desde el primer render "Paso 1 de 2 · Elige una zona" o, con `zona`, "Paso 2 de 2 · Elige la cantidad" / "· Elige tus butacas".
    - Desde el primer render, las cantidades ya están en las tarjetas ("2 entradas elegidas"), en las insignias del mapa, en "Tu compra" y en la barra móvil.
    - En el aside del detalle: cada zona comprable es un enlace con nombre accesible propio, foco visible y target ≥ 44 px; las agotadas no son enfocables (son texto) y se leen "<nombre> Agotado" en la lista. Orden de Tab: las filas (en el orden del mapa) y luego "Ver mapa de zonas".
38. **`ZonePricesCard` con enlaces por zona** (decisión 31; sigue siendo Server Component, mismas props `{ slug, status, priceFrom, zones }`):
    - `<ul aria-label="Zonas" className="flex flex-col divide-y divide-border border-y">`, una fila por zona en el orden del mapa.
    - **Zona comprable** (`zone.status !== "sold-out"` y `status !== "sold-out"`): `<li>` con un `Link href={buildZoneEntryHref(slug, zone.id)} aria-label=…`:
      - clases: `group -mx-2 flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50`;
      - a la izquierda, lo de hoy: muestra de tono (`aria-hidden`), nombre (`text-base font-medium`) y `Badge` "Últimas entradas" si es `low-stock`;
      - a la derecha, `<span className="flex shrink-0 items-center gap-1">` con el precio (`text-base font-bold tabular-nums`) y `ChevronRight` (`size-5 text-muted-foreground transition-colors group-hover:text-foreground`, `aria-hidden`);
      - `aria-label`: "Elegir entradas de <nombre>, <precio>" + ", últimas entradas" si es `low-stock`.
    - **Zona no comprable:** `<li>` como hoy (`flex min-h-14 items-center justify-between gap-3 py-2`), sin enlace, con "Agotado" (`text-sm font-bold text-muted-foreground`) o, si el evento está agotado y la zona no, su precio; el texto de la derecha lleva `mr-6` para alinearse con los precios de las filas con chevron.
    - **Botón:** el enlace primario de hoy (mismas clases y destino `/eventos/<slug>/entradas`) con el texto **"Ver mapa de zonas"** + `ArrowRight`. Con el evento agotado, "Entradas agotadas" como hoy.
    - Sin cambios: cabecera "Entradas" / "Entradas desde" / `priceFrom` y la nota "Pago seguro · Entrada digital con QR".
39. **`utils/zoneParam.ts`** (nuevo, puro; decisiones 32 y 33):
    - `buildZoneEntryHref(slug: string, zoneId: string): string` → `/eventos/<slug>/entradas?${new URLSearchParams({ zona: zoneId })}`.
    - `parseInitialZoneId(zones: Pick<VenueZone, "id" | "status">[], params: Pick<URLSearchParams, "getAll">): string | null` → el valor de `zona` si `params.getAll("zona")` tiene exactamente un valor igual al `id` de una zona no `sold-out`; si no, `null`.
    - El nombre `zona` es una constante interna del archivo (`const ZONE_PARAM = "zona"`), no se exporta.
    - Ida y vuelta: para toda zona comprable `z`, `parseInitialZoneId(zones, new URL(buildZoneEntryHref(slug, z.id), base).searchParams) === z.id`.

### Compra combinada y mapa no interactivo (Fase 7)
40. **`VenueMapView` como ilustración** (decisión 38; sustituye las partes interactivas del requisito 12):
    - **Props:** `viewBox`, `stage`, `venue`, `zones`, `tones`, `highlightedZoneId` y `selectedCountByZone`. Se quitan `onOpenZone` y `onHighlightZone`.
    - **`<svg>`:** `<svg viewBox className="absolute inset-0 size-full" role="img" aria-label="Mapa de zonas de <venue>">`.
    - **Cada zona:** `<path d={zone.path} data-zone-id={zone.id}>` con las clases `stroke-background stroke-3 transition-opacity duration-200`, la clase `shape` del tono y `opacity-40` si está atenuada.
      - Sin `role`, `tabIndex`, `aria-*`, `onClick`, `onKeyDown`, `onPointerEnter/Leave` ni `onFocus/onBlur`.
      - Sin `cursor-pointer`/`cursor-not-allowed`, sin `outline-none` y sin las clases `focus-visible:*`.
      - Sin `pointer-events-none` (decisión 38).
    - **Se eliminan:** `getZoneAriaLabel`, `handleKeyDown` y `highlight`. `VenueMapView` deja de importar `formatSelectedCount`.
    - **Sin cambios:** marco, escenario y luces, trazo de resaltado superpuesto (zona en `highlightedZoneId` no agotada), atenuación al 40 % de formas y etiquetas, y capa de etiquetas HTML con la insignia "✓ n" y la píldora.
41. **`QuantityStepper`** (nuevo, presentacional; decisión 40):
    - **Props:**
      ```ts
      type QuantityStepperProps = Omit<ComponentProps<"div">, "children" | "role"> & {
        value: number;
        decrementLabel: string;
        incrementLabel: string;
        canDecrement: boolean;
        canIncrement: boolean;
        onDecrement: () => void;
        onIncrement: () => void;
      };
      ```
      El resto (`aria-label`, `aria-labelledby`, `className`…) se reenvía al grupo, y `className` se une con `cn()`.
    - **Marcado:** el de `ZoneQuantityPanel` hoy.
      - `<div role="group" className="flex shrink-0 items-center gap-1 rounded-xl border p-0.5">`.
      - "−": `Button variant="secondary" size="icon"` con `aria-label={decrementLabel}`, `disabled={!canDecrement}`, `focusableWhenDisabled` y `Minus`.
      - Valor: `<span aria-live="polite" className="w-8 text-center text-base font-bold tabular-nums">`.
      - "+": `Button size="icon"` primario, con `aria-label={incrementLabel}`, `disabled={!canIncrement}`, `focusableWhenDisabled` y `Plus`.
      - Las mismas clases `size-11 cursor-pointer` y `aria-disabled:*` de hoy (las de `ZoneQuantityPanel` y `BestSeatsPicker` son las mismas).
    - **`ZoneQuantityPanel`:**
      - `aria-labelledby` al "Cantidad";
      - "Quitar una entrada de <zona>" / "Agregar una entrada de <zona>";
      - `canDecrement = quantity > 0` y `canIncrement = !atLimit`.
      - Sin cambios visibles ni de props.
    - **`BestSeatsPicker`:**
      - `aria-labelledby` a "¿Cuántas butacas juntas?";
      - "Quitar una butaca" / "Agregar una butaca";
      - `canDecrement = !disabled && shownCount > 1` y `canIncrement = !disabled && shownCount < seatLimit`.
      - Sin cambios visibles ni de props.
42. **`ZoneCards` con el control en línea** (decisiones 34 y 38; sustituye al requisito 13):
    - **Props:** `zones`, `tones`, `highlightedZoneId`, `selectedCountByZone`, `atLimit`, `onChangeQuantity(zoneId, delta: 1 | -1)`, `onOpenZone(zoneId)` (solo lo llaman las numeradas) y `onHighlightZone(zoneId | null)`.
    - **Contenedor:** `@container flex flex-col gap-3`, con:
      - **ayuda** (solo si hay ≥ 2 zonas no agotadas): `<p className="text-sm text-muted-foreground">Puedes combinar varias zonas en una misma compra.</p>`;
      - **lista** `<ul aria-label="Zonas" className="grid gap-3 @xl:grid-cols-2">`, en el orden de `zones`. Hay 2 columnas cuando la lista mide ≥ 576 px (a 768 y 1440 px) y 1 columna por debajo (375, 640 y 1024 px: a 1024, el aside deja la columna estrecha). Sustituye a `sm:grid-cols-2`;
      - **pie:** `<p className="text-sm text-muted-foreground">Precio final por entrada, sin cargos ocultos. <span role="status">…</span></p>`. El `span` dice "Máximo 10 entradas por compra." o, con `atLimit`, "Llegaste al máximo de 10 entradas por compra.".
    - **Cada tarjeta:** un `<li className="flex">` que contiene un `<div role="group" aria-labelledby={nameId} tabIndex={-1} data-zone-id={zone.id} data-highlighted={…}>`. **No es un botón.**
      - **Clases:** `flex min-h-18 w-full gap-3 rounded-xl border bg-card p-3 outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50`. Si no está agotada, además `data-[highlighted=true]:border-primary/40 data-[highlighted=true]:bg-accent/40`. Sin `cursor-pointer` y sin `hover:` propio: el fondo llega por `data-highlighted`, que ponen el puntero y el foco.
      - **Barra de color** a la izquierda, como hoy.
      - **Cuerpo** `flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2`, con dos bloques:
        - **Información** (`flex min-w-40 flex-1 flex-col gap-0.5`):
          - nombre `<span id={nameId} className="text-base font-bold">` y, si es `low-stock`, el `Badge` "Últimas entradas" de hoy;
          - el tipo con su icono, como hoy;
          - si no está agotada, el precio: `<span className="text-base font-bold tabular-nums text-foreground">S/ 550.00</span>` y `<span className="text-sm text-muted-foreground"> c/u</span>`;
          - en las numeradas con butacas, "1 butaca elegida" / "n butacas elegidas" (`text-sm font-medium text-primary-strong`, `formatSelectedCount`).
        - **Acción** (`ml-auto shrink-0`):
          - **de pie, no agotada:** `QuantityStepper` con `aria-label="Cantidad de <zona>"`, `value` = cantidad de la zona, "Quitar una entrada de <zona>" / "Agregar una entrada de <zona>", `canDecrement = cantidad > 0`, `canIncrement = !atLimit` y `onChangeQuantity(zone.id, ±1)`;
          - **numerada, no agotada:** `Button variant="outline" className="h-11 cursor-pointer gap-1.5 font-semibold text-primary-strong"`:
            - texto "Elegir butacas" o, con ≥ 1 butaca en la zona, "Cambiar butacas", más `ChevronRight` (`aria-hidden`);
            - `aria-label` "Elegir butacas de <zona>" / "Cambiar butacas de <zona>";
            - llama a `onOpenZone(zone.id)`;
          - **agotada:** "Agotado" (`font-bold text-muted-foreground`), sin control y sin precio.
        - Si la información (mín. 160 px) y la acción no caben en una línea, la acción pasa debajo, alineada a la derecha, sin scroll horizontal.
      - **Resaltado** (decisión 19 enmendada):
        - `onPointerEnter` → `onHighlightZone(id)` y `onPointerLeave` → `onHighlightZone(null)`;
        - `onFocus` (llega desde sus controles o desde la propia tarjeta) → `onHighlightZone(id)`;
        - `onBlur` → `onHighlightZone(null)` solo si el foco sale de la tarjeta (`!event.currentTarget.contains(event.relatedTarget)`), así que pasar de "−" a "+" no lo apaga;
        - las agotadas no resaltan.
      - Se eliminan el `aria-label` de la tarjeta (`getZoneCardAriaLabel`), el `<button>` envolvente, el "c/u" sobre el precio a la derecha y el chevron de las zonas de pie. La tarjeta se nombra por su nombre visible y el resto se lee como contenido.
43. **`TicketSelection`** (amplía los requisitos 10, 11 y 34):
    - **Indicador:**
      - sin zona abierta, "Paso 1 de 2 · Elige tus zonas";
      - "Paso 2 de 2 · Elige la cantidad" (de pie, solo con `?zona=`);
      - "Paso 2 de 2 · Elige tus butacas" (numerada).
    - **Sub-paso 1:**
      - `VenueMapView` sin `onOpenZone` ni `onHighlightZone`;
      - `ZoneCards` con `atLimit={selection.atLimit}`, `onChangeQuantity={selection.changeQuantity}`, `onOpenZone={handleOpenZone}` y `onHighlightZone={setHighlightedZoneId}`.
    - **`handleOpenZone`** (lo llama solo el botón de las numeradas) y **`handleBack`** no cambian:
      - abrir: `flushSync` y foco al h3;
      - volver: `closeZone`, `returnZoneId` y foco en `[data-zone-id="<id>"]`, que ahora es el contenedor de la tarjeta (`tabIndex={-1}`) y, al recibir el foco, se resalta.
    - **Sub-paso 2:** tras `ZoneQuantityPanel` o `SeatPlan`, si `selectedInZone > 0`, va el pie de la decisión 35:
      - contenedor `<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">`;
      - texto `<p className="text-sm text-muted-foreground">Puedes combinar varias zonas en una misma compra.</p>`;
      - botón `Button variant="outline" className="h-11 cursor-pointer gap-2 font-semibold"` con `Plus` (`aria-hidden`) y "Agregar otra zona", que llama a `handleBack(zone.id)`.
    - **Resumen:** `PurchaseSummary` y `MobilePurchaseBar` reciben `onRemoveLine={selection.clearZone}`.
    - **Sin cambios:** transiciones (el sub-paso 2 solo se abre en numeradas o con `?zona=`), `initialSelection`/`initialZoneId`, el contador "n de m butacas" y las props de `SeatPlan`.
44. **`useSeatSelection`** (decisiones 36 y 37):
    - `changeQuantity(zoneId, delta)` ya no llama a `setActiveZoneId`. El resto de su regla no cambia: solo zonas de pie no agotadas, sin bajar de 0 y "+" sin efecto en el límite.
    - Nueva acción `clearZone(zoneId: string): void`:
      - quita la cantidad de la zona (borra su clave de `quantities`) y sus butacas (`parseSeatId(id)?.zoneId === zoneId`), y conserva el orden del resto;
      - si cambia algo, el aviso pasa a `null` (`withSelection`);
      - si la zona no tenía entradas o no existe, el estado no cambia (misma referencia);
      - no toca `activeZoneId`.
45. **`PurchaseSummaryContent`, `PurchaseSummary` y `MobilePurchaseBar` con "Quitar"** (decisión 36; amplía los requisitos 17 y 18):
    - **Prop nueva obligatoria** `onRemoveLine: (zoneId: string) => void` en `PurchaseSummaryContent`. `PurchaseSummary` la reenvía y `MobilePurchaseBar` la pasa a la hoja.
    - **Cada línea** (`<li>`):
      - fila `flex items-start justify-between gap-2`;
      - a la izquierda, "n × <zona>" y, debajo, sus etiquetas de butacas, como hoy;
      - a la derecha, `flex shrink-0 items-center gap-1`: el importe (`font-bold tabular-nums`) y `Button variant="ghost" size="icon" className="-my-2 size-11 cursor-pointer text-muted-foreground hover:text-foreground"` con `Trash2` (`size-4`, `aria-hidden`) y `aria-label` "Quitar <zona> de tu compra".
    - **Al pulsar "Quitar":**
      - antes de quitar, toma el botón "Quitar" de la línea siguiente (o, si no hay, de la anterior);
      - `flushSync(() => onRemoveLine(zoneId))`;
      - foco a ese botón. Si no queda ninguna línea, al texto vacío, que gana `tabIndex={-1}` y `outline-none`.
      - En la hoja móvil funciona igual, dentro de su portal.
    - **Sin cambios:** texto vacío, total, nota y CTA.
46. **Accesibilidad y responsive** (F7; sustituye en lo que choca a los requisitos 20 y 37):
    - **Orden de Tab en el sub-paso 1:**
      - ninguna parada en el mapa;
      - por tarjeta, en el orden del mapa: "−" y "+" (de pie) o "Elegir/Cambiar butacas" (numerada); ninguna en las agotadas;
      - después, los "Quitar" y "Continuar" de "Tu compra" (`lg`), o "Ver resumen de la compra" y "Continuar" de la barra móvil.
    - **Lector de pantalla:**
      - el mapa es una imagen, "Mapa de zonas de <recinto>";
      - cada tarjeta es un grupo con el nombre de la zona;
      - el stepper es el grupo "Cantidad de <zona>", con su valor en `aria-live`;
      - el pie de límite es `role="status"`;
      - el indicador anuncia los cambios de sub-paso, como hoy.
    - **Targets ≥ 44 px:** steppers, "Elegir/Cambiar butacas", "Agregar otra zona" y "Quitar". Foco visible en todos y en la tarjeta que recibe el foco al volver.
    - **Sin scroll horizontal** a 375, 768, 1024 y 1440 px, también con la acción de la tarjeta debajo de la información y con la hoja abierta.
47. **`design-system/ticketera/pages/ticket-selection.md`** (F7). Se actualizan:
    - "Layout": diagrama del sub-paso 1 con stepper / "Elegir butacas" y el pie "Agregar otra zona" en el sub-paso 2;
    - "Tarjeta 'Elige tus entradas' y sub-pasos": indicador "Elige tus zonas" y cómo se abre una zona (solo numeradas o `?zona=`);
    - "Foco entre sub-pasos": la vuelta al contenedor de la tarjeta, también con "Agregar otra zona";
    - "Mapa de zonas": ilustración con `role="img"`, formas sin interacción y con `data-zone-id`;
    - "Resaltado": solo de la tarjeta al mapa;
    - "Estados de zona": sin `cursor-pointer`, foco ni `aria-disabled` en el mapa; la agotada sin controles en la tarjeta;
    - "Tarjetas de zona": requisito 42;
    - "Panel de cantidad": solo con `?zona=`, `QuantityStepper` y pie;
    - "Entrada por zona": el pie "Agregar otra zona";
    - "Resumen 'Tu compra'": "Quitar" por línea y foco;
    - "Accesibilidad": el mapa como imagen y el orden de Tab nuevo.

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
  - "Elegir entradas" lleva a `/eventos/festival-vive-latino-lima/entradas` (desde F6 el botón se llama "Ver mapa de zonas", con el mismo destino);
  - a 375 px, la barra inferior dice "Desde S/ 120.00 · Comprar entradas";
  - Guardar y Compartir funcionan como en los demás eventos.
  
  `git diff` no toca `modules/events/components/**` ni `modules/seating/components/**`.
- [ ] Dado `/eventos/festival-vive-latino-lima/entradas` al terminar F1 (todavía con la UI de la spec base), entonces:
  - el mapa muestra el escenario semicircular y las 5 zonas en arco, cada una con su nombre y su precio. Las etiquetas de 2 líneas y las luces llegan en F2;
  - se pueden comprar entradas de pie y butacas de Oriente/Occidente;
  - "Continuar" lleva a `/checkout?evento=festival-vive-latino-lima&…`, que muestra el resumen correcto.
- [ ] Dado `npx vitest run` y `npm run lint`, entonces pasan. `npm run build` genera 4 rutas `/eventos/<slug>/entradas`.

### Fase 2. Escala de tonos por precio
- [ ] Dado `getZoneTones` del festival, entonces da `campo-vip` → `tier-1`, `campo-general` → `tier-2`, `occidente` → `tier-3`, `oriente` → `tier-4` y `norte` → `tier-5`.
- [ ] Dados los otros 3 mapas (≤ 4 precios distintos), entonces sus tonos no cambian respecto de hoy (p. ej. en `noche-de-sintetizadores-lima`: VIP `tier-1`, Preferencial `tier-2`, Tribuna Norte `tier-3` y General `tier-4`).
- [ ] Dados 6 precios distintos (caso sintético), entonces el 5.º y el 6.º son `tier-5`. Además, precios iguales comparten tono y las agotadas son `sold-out`.
- [ ] Dado `ZONE_TONE_CLASSES`, entonces:
  - cada tono tiene `shape` con `fill-`, `label` con `fill-` y `text-`, y `swatch` con `bg-`;
  - todas son tokens del tema (sin hex ni colores por defecto de Tailwind).
- [ ] Dado `/eventos/festival-vive-latino-lima` a 1440 px, entonces el aside "Entradas desde S/ 120.00" muestra 5 muestras distintas, del navy (Campo VIP) al azul muy claro (Tribuna Norte), sin cambios de código en `ZonePricesCard`.
- [ ] Dado `/eventos/festival-vive-latino-lima/entradas` (pantalla actual), entonces el mapa usa la escala y sus textos se leen (contraste ≥ 4.5:1 según la decisión 28).
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces la tabla "Tonos por precio" tiene los 5 tonos y la columna de texto.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 3. Sub-paso 1 con el diseño de la captura, sub-paso 2 y resumen móvil
*Enmienda F7:* los criterios de esta fase sobre el mapa interactivo (hover o foco en una forma, abrir con clic, Enter o Espacio en el mapa, agotada enfocable en el mapa, Tab por el mapa, zonas anunciadas como botón), sobre la tarjeta como botón y sobre "Paso 1 de 2 · Elige una zona" los sustituyen los de la Fase 7 (decisión 41). Para abrir el panel de una zona de pie, desde F7 se usa `?zona=`.
- [ ] Dado `/eventos/festival-vive-latino-lima/entradas` a 1440 px, cuando carga, entonces se ve la captura del paso 1 con tokens Mentec:
  - el stepper global marca "Entradas" (`aria-current="step"`);
  - una tarjeta "Elige tus entradas" con "Paso 1 de 2 · Elige una zona" a la derecha;
  - el mapa curvo con el escenario navy, "ESCENARIO" y 7 luces, y las 5 zonas en la escala de azules con separación blanca;
  - cada etiqueta (nombre y precio) mide 14 px (`getComputedStyle`), queda dentro de su sector y no se pisa con otra. "Tribuna" / "Occidente" y "Tribuna" / "Oriente" van en 2 líneas, y Campo General lleva la píldora "Últimas entradas";
  - debajo, 5 tarjetas en 2 columnas, cada una con barra de color, nombre, icono y "General · sin butaca" o "Numerada · elige tu butaca", "c/u", precio y chevron;
  - a la derecha, "Tu compra" es sticky, con "Todavía no elegiste entradas. Empieza eligiendo una zona.", "Total (0 entradas)", "S/ 0.00" y "Continuar" deshabilitado.
- [ ] Dado el puntero sobre la tarjeta "Tribuna Oriente", entonces:
  - en el mapa, Oriente tiene un trazo navy encima y las otras 4 zonas (con sus etiquetas) quedan al 40 % de opacidad;
  - al salir el puntero, todo vuelve a la normalidad.
- [ ] Dado el puntero sobre "Campo VIP" en el mapa, entonces su tarjeta lleva `data-highlighted="true"` y el fondo de hover.
- [ ] Dado el foco con Tab en una zona o en una tarjeta, entonces se resalta igual que con el puntero.
- [ ] Dado "Campo VIP" (clic en el mapa, o Enter o Espacio en su tarjeta), cuando se activa, entonces:
  - el indicador pasa a "Paso 2 de 2 · Elige la cantidad" y el stepper global sigue en "Entradas";
  - se ven las migas "Todas las zonas › Campo VIP", el h3 "Campo VIP" con " · S/ 330.00 c/u" y "General · sin butaca";
  - se ve el panel "Cantidad" con −/+ y "Subtotal S/ 0.00";
  - el foco está en el h3;
  - el mapa y las tarjetas ya no están en el DOM;
  - el panel entra creciendo desde la zona, y sin animación con `prefers-reduced-motion: reduce`.
- [ ] Dado "Agregar una entrada de Campo VIP" 2 veces, entonces:
  - la cantidad es 2 y el subtotal "S/ 660.00";
  - "Tu compra" muestra "2 × Campo VIP … S/ 660.00" y "Total (2 entradas)";
  - "Continuar" lleva a `/checkout?evento=festival-vive-latino-lima&campo-vip=2`.
- [ ] Dado "Todas las zonas", cuando se pulsa, entonces:
  - vuelve "Paso 1 de 2 · Elige una zona" y el foco está en la tarjeta "Campo VIP", cuyo nombre accesible termina en ", 2 entradas elegidas";
  - la tarjeta dice "2 entradas elegidas" y la etiqueta de Campo VIP en el mapa lleva la insignia con check y "2";
  - la selección se conserva.
- [ ] Dado "Tribuna Oriente", cuando se abre, entonces:
  - el indicador dice "Paso 2 de 2 · Elige tus butacas";
  - se ven las migas, "Tribuna Oriente · S/ 155.00 c/u" y, a la derecha, "0 de 8 butacas" (con las 2 de Campo VIP ya elegidas);
  - se ven el plano (todavía con el aspecto de hoy), sus controles, la leyenda y "Tus asientos";
  - el foco está en el h3.
- [ ] Dadas 2 butacas elegidas en Oriente, entonces:
  - el contador dice "2 de 8 butacas";
  - "Tu compra" muestra "2 × Tribuna Oriente … S/ 310.00" con sus etiquetas cortas y el total "S/ 970.00";
  - "Continuar" lleva a `…&campo-vip=2&oriente=2&asientos=oriente-…%2Coriente-…`, y `/checkout` lo acepta.
- [ ] Dado el último chip quitado, entonces el foco pasa al h3 de la zona.
- [ ] Dada una zona agotada (`/eventos/risas-sin-filtro/entradas`, "Mesa"), entonces:
  - en el mapa y en su tarjeta se anuncia "agotado", con `aria-disabled="true"`;
  - se puede enfocar, pero ni el clic ni Enter abren el sub-paso 2, y no se resalta;
  - la tarjeta dice "Agotado", sin chevron.
- [ ] Dados `/eventos/noche-de-sintetizadores-lima/entradas`, `la-casa-de-los-espejos` y `risas-sin-filtro`, entonces:
  - usan la misma tarjeta, las mismas tarjetas de zona, el mismo resaltado y los mismos sub-pasos, con sus mapas rectangulares y las etiquetas HTML dentro de cada rectángulo;
  - sus zonas numeradas abren el plano en cuadrícula;
  - los enlaces a checkout son los de la spec base (p. ej. `general=2&vip=1` → S/ 910.00).
- [ ] Dado el teclado, entonces:
  - Tab recorre el mapa (zonas en el orden de los tipos), luego las tarjetas y luego "Tu compra";
  - en el sub-paso 2, Tab llega a "Todas las zonas", al stepper o al plano (una sola parada) y a los botones;
  - todo tiene foco visible, y Espacio nunca desplaza la página.
- [ ] Dado un lector de pantalla, entonces:
  - las zonas del mapa se anuncian como botón con nombre, precio y estado (p. ej. "Campo General, S/ 215.00, últimas entradas"; "Tribuna Oriente, S/ 155.00, asientos numerados");
  - las tarjetas, con el `aria-label` del requisito 13;
  - se anuncian (`aria-live`) el cambio de sub-paso, el contador, las cantidades, el subtotal y los totales.
- [ ] Dado 375 px de ancho, entonces:
  - no hay scroll horizontal;
  - el stepper móvil dice "Paso 1 de 3" / "Elige tus entradas";
  - el mapa ocupa el ancho y sus etiquetas miden 12 px, dentro de su sector (también en Tribuna Norte), sin la píldora;
  - las tarjetas van en 1 columna;
  - "Tu compra" no se ve. La barra inferior "Total · 0 entradas / S/ 0.00", con "Ver resumen de la compra" y "Continuar", queda pegada abajo;
  - en el sub-paso 2 de Oriente, el plano ocupa el ancho y, con el plano entero a la vista, cada butaca mide ≥ 24 px.
- [ ] Dado "Ver resumen de la compra" a 375 px, cuando se pulsa, entonces:
  - se abre una hoja inferior titulada "Tu compra", con las líneas (o el texto vacío), el total y "Continuar";
  - Escape o "Cerrar" la cierran y el foco vuelve al botón.
- [ ] Dado el código, entonces:
  - no existe `ZoneList.tsx`;
  - `VenueMapView` no tiene textos SVG de zona;
  - no hay hex ni colores por defecto de Tailwind.
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta, sin referencias a la lista "Entradas":
  - la tarjeta con el indicador;
  - el mapa con etiquetas HTML y el resaltado sincronizado;
  - las tarjetas de zona;
  - la cabecera de zona con migas y contador;
  - el panel de cantidad con subtotal;
  - el foco entre sub-pasos, la transición y la hoja "Tu compra" en móvil.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 4. Plano de butacas renovado
- [ ] Dado el sub-paso 2 de "Tribuna Oriente" a 1440 px, entonces se ve la captura del paso 2 con tokens Mentec:
  - butacas disponibles en azul claro con borde azul, ocupadas grises con "×" y al menos una butaca accesible (cuadrado cian con el icono de silla de ruedas) en la fila J de Oriente, coherente con la invariante del requisito 8 (la ocupación tiene prioridad sobre `accessibleSeats`: con la semilla actual `oriente-J-10` sale ocupada);
  - con el plano entero a la vista, sin números;
  - las letras A–J en los dos extremos de cada fila, siguiendo la curva, y sin barra "ESCENARIO";
  - los controles +, − y "Ver todo el plano" en una pastilla abajo a la derecha, dentro del lienzo, sin tapar ninguna butaca;
  - debajo, la leyenda "Disponible · S/ 155.00 / Elegida / Ocupada / Accesible (silla de ruedas)" y "0 elegidas" a la derecha.
- [ ] Dado un clic en una butaca disponible, entonces:
  - pasa a navy con check (animado salvo con movimiento reducido);
  - la leyenda dice "1 elegida" y el contador "1 de 10 butacas" (sin otras entradas);
  - otro clic la quita.
- [ ] Dado "Acercar" a 1440 px, entonces cada butaca disponible muestra su número (12 unidades, ≥ 12 px); con "Ver todo el plano" se ocultan.
- [ ] Dado "Acercar" a 375 px, entonces los números solo aparecen cuando miden ≥ 12 px.
- [ ] Dado el puntero (ratón) sobre una butaca, entonces:
  - aparece sobre ella un tooltip navy con "Fila C · Asiento 4" y "S/ 155.00" (debajo, si está cerca del borde superior);
  - sobre una ocupada dice "Ocupada" y sobre una elegida "Elegida · S/ 155.00";
  - desaparece al salir o al arrastrar.
- [ ] Dadas las flechas del teclado, entonces el tooltip sigue a la butaca enfocada.
- [ ] Dado un toque en táctil, entonces no aparece el tooltip.
- [ ] Dado "¿Cuántas butacas juntas?" sin butacas en la zona, entonces:
  - vale 2;
  - "Elegir las mejores butacas" elige 2 contiguas de la fila más cercana al escenario con bloque libre, lo más centradas posible (`findBestAvailableSeats`), sin accesibles;
  - el aviso dice "Elegimos 2 asientos juntos en la fila <X>.";
  - el plano se acerca a ellas (300 ms; al instante con movimiento reducido) y los chips se actualizan.
- [ ] Dado el stepper en 1, entonces el botón dice "Elegir la mejor butaca". El stepper no baja de 1 ni pasa de m (el del contador).
- [ ] Dadas 2 elegidas y la cantidad en 3, entonces "Elegir las mejores butacas" las sustituye por un bloque de 3; las de otras zonas no cambian.
- [ ] Dado un bloque imposible (fixture: fila de 3 butacas libres y cantidad 4), entonces el aviso dice "No hay 4 asientos juntos disponibles en esta zona." y nada cambia.
- [ ] Dadas 10 entradas en otras zonas, entonces el stepper y el botón están deshabilitados y enfocables.
- [ ] Dado un plano en cuadrícula (`noche-de-sintetizadores-lima`, "Tribuna Norte"), entonces:
  - tiene la letra a los dos lados de cada fila y la barra "ESCENARIO" arriba;
  - los mismos estados, el tooltip y "Mejores butacas".
- [ ] Dado 375 px, entonces:
  - los controles de zoom van en la barra sobre el lienzo, a la derecha, y no tapan butacas;
  - cada butaca mide ≥ 24 px con el plano entero a la vista;
  - "¿Cuántas butacas juntas?" se apila sobre el botón;
  - no hay scroll horizontal.
- [ ] Dado el teclado y un lector de pantalla, entonces:
  - se mantiene todo lo de la spec base: una parada de Tab, flechas, Home/End, Espacio/Enter, ocupadas enfocables pero no elegibles, y los `aria-label` "Fila F, asiento 12, disponible, S/ 155.00";
  - el grupo "Zoom del plano" y sus 3 botones tienen nombre accesible;
  - "n elegidas" y el valor del stepper se anuncian.
- [ ] Dado el formulario de organizer, entonces `SeatGridPreview` muestra la nueva forma de "disponible" y `npx vitest run modules/organizer` pasa.
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta:
  - los estados v2 y la leyenda;
  - los números al acercar;
  - el tooltip;
  - las letras en los dos extremos;
  - los controles superpuestos desde `sm`;
  - "Mejores butacas" con cantidad.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 5. Plano curvo con contexto y minimapa
- [ ] Dado el sub-paso 2 de "Tribuna Oriente" a 1440 px, entonces:
  - el lienzo es apaisado (16:10);
  - el sector se ve en lila claro (`accent`) con borde azul y las butacas encima;
  - alrededor, recortado por el lienzo, se ven las demás zonas en gris con separación blanca y el escenario navy con sus luces a un lado.
- [ ] Dado el minimapa, entonces:
  - en Tribuna Oriente, está superpuesto arriba a la izquierda (`data-placement="overlay"`) y muestra el estadio completo con Tribuna Oriente resaltada; en un plano que no lo deja caber sin tapar el plano entero, va en la barra sobre el lienzo (`data-placement="bar"`) y se recoloca al cambiar el tamaño de la ventana (enmienda F5);
  - mide 96 px de ancho con el lienzo estrecho (< 672 px) y 112 px con el ancho, sea cual sea la ventana;
  - con el plano entero a la vista, el recuadro rodea todo el sector;
  - al acercar o pellizcar, el recuadro se reduce y sigue al paneo;
  - es `aria-hidden` y no recibe foco.
- [ ] Dado el plano entero a la vista, entonces ninguna butaca queda bajo el minimapa ni bajo los controles a 768 y 1440 px.
- [ ] Dado "Tribuna Occidente", entonces el plano es el espejo del de Oriente: el escenario a la derecha y la butaca 1 abajo (decisión 7).
- [ ] Dado 375 px, entonces:
  - el lienzo tiene la proporción del plano;
  - el minimapa (≥ 96 px de ancho) y los controles de zoom caben en la barra sobre el lienzo, sin scroll horizontal y sin tapar butacas;
  - cada butaca mide ≥ 24 px;
  - pellizcar o arrastrar hace zoom o paneo sin elegir butacas.
- [ ] Dados los planos en cuadrícula, entonces no tienen fondo ni minimapa y conservan su proporción.
- [ ] Dado el plano curvo, entonces el teclado, el tooltip y "Mejores butacas" funcionan igual sobre el fondo (`pointer-events-none`).
- [ ] Dado el sub-paso 2 de "Tribuna Oriente" y el de "Tribuna Norte" de `noche-de-sintetizadores-lima` (cuadrícula), cuando se inspeccionan las letras de fila, entonces (T0, decisión 30):
  - cada `<text>` de letra tiene `font-size="13"` y conserva `fill-muted-foreground font-bold`, `text-anchor="middle"`, `dominant-baseline="central"` y su `<g aria-hidden>`;
  - sus posiciones no cambian: en arco, los puntos de `getRowEdgeLabelPoints` (0.8 pitch); en cuadrícula, `x = 20` y `x = ancho − 20`;
  - en la captura a 1440, la letra mide alrededor de la mitad del diámetro de la butaca (como `images/15.png`) y no toca ninguna butaca;
  - `git diff` de T0 no toca `arcSeatRows.ts`, `arcSeatRows.test.ts` ni `seating.service.test.ts`.
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta el fondo del estadio, el lienzo apaisado, el contenedor `@container`, el minimapa superpuesto desde `sm` solo si cabe (en la barra si no, y en móvil), la franja de la pastilla en arco con el lienzo estrecho y las letras de fila a 13 unidades.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 6. Precarga de la selección y entrada por zona desde la URL
*Enmienda F7:* desde la Fase 7, "Paso 1 de 2 · Elige una zona" se lee "Paso 1 de 2 · Elige tus zonas", y "la tarjeta dice 'n entradas elegidas'" se lee "el stepper de la tarjeta muestra n" en las zonas de pie. Lo demás no cambia.

**Precarga** (decisión 15):
- [ ] Dado `/eventos/festival-vive-latino-lima/entradas?campo-vip=2&oriente=2&asientos=<id1>%2C<id2>`, con dos butacas disponibles de Tribuna Oriente, cuando carga, entonces:
  - se ve el sub-paso 1 ("Paso 1 de 2 · Elige una zona");
  - la tarjeta "Campo VIP" dice "2 entradas elegidas" y "Tribuna Oriente", "2 butacas elegidas", y el mapa lleva las insignias "2";
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
- [ ] Dados los otros mapas (p. ej. `/eventos/noche-de-sintetizadores-lima/entradas?general=2&vip=1`), entonces se precargan igual, con total "S/ 910.00".
- [ ] Dado `/eventos/<slug>/entradas` sin parámetros, entonces la pantalla es idéntica a la de las Fases 3–5, y `npm run build` sigue generando las 4 rutas prerenderizadas: en la salida del build, `/eventos/[slug]/entradas` aparece como SSG (●, con sus 4 rutas), no como dinámica (`ƒ`).

**Entrada por zona desde el detalle** (decisiones 31–33). Los criterios con navegador se comprueban con Playwright a **375 y 1440 px** contra `npm run start` (con la BD de desarrollo sembrada, como deja `seating-curved-venues.md`).
- [ ] Dado `/eventos/noche-de-sintetizadores-lima` (aside "Entradas"), entonces:
  - las filas VIP, Preferencial, General y Tribuna Norte son enlaces (`a`) con `href` `/eventos/noche-de-sintetizadores-lima/entradas?zona=vip`, `…?zona=preferencial`, `…?zona=general` y `…?zona=norte`;
  - sus nombres accesibles son "Elegir entradas de VIP, S/ 550.00, últimas entradas", "Elegir entradas de Preferencial, S/ 320.00", "Elegir entradas de General, S/ 180.00" y "Elegir entradas de Tribuna Norte, S/ 220.00";
  - cada fila mide ≥ 44 px de alto (56 px), lleva el chevron a la derecha del precio, cambia de fondo con el puntero encima y muestra el anillo de foco al llegar con Tab;
  - el texto, las muestras de tono y los precios quedan en la misma posición horizontal que antes del cambio (± 1 px);
  - el botón dice "Ver mapa de zonas", con la flecha, y lleva a `/eventos/noche-de-sintetizadores-lima/entradas` (sub-paso 1: "Paso 1 de 2 · Elige una zona", mapa y tarjetas);
  - el CTA del hero ("Comprar entradas · desde S/ 180.00") y, a 375, la barra inferior ("Desde S/ 180.00 · Comprar entradas") no cambian.
- [ ] Dado un clic en VIP, Preferencial o General del aside, entonces la URL pasa a `…/entradas?zona=<id>` y se ve directamente:
  - el stepper global en "Entradas" y el indicador "Paso 2 de 2 · Elige la cantidad";
  - las migas "Todas las zonas › <zona>", el h3 de la zona con " · S/ X c/u" y el panel "Cantidad" en **0**, con "Subtotal S/ 0.00";
  - "Tu compra" vacío (en 375, la barra "Total · 0 entradas") y "Continuar" deshabilitado;
  - el mapa y las tarjetas no están en el DOM; el foco no se mueve.
- [ ] Dado un clic en Tribuna Norte del aside, entonces se ve "Paso 2 de 2 · Elige tus butacas", la cabecera "Tribuna Norte · S/ 220.00 c/u" con "0 de 10 butacas" y el plano en arco con su fondo, minimapa y controles.
- [ ] Dado `/eventos/festival-vive-latino-lima`, entonces sus 5 filas enlazan a `…?zona=campo-vip`, `campo-general`, `occidente`, `oriente` y `norte`, y cada una abre el sub-paso 2 correcto (cantidad en las de pie, plano en Occidente y Oriente).
- [ ] Dado `/eventos/risas-sin-filtro`, entonces la fila "Mesa" muestra "Agotado", no es un enlace (no hay `a` en esa fila ni chevron), no recibe foco con Tab y un clic sobre ella no cambia la URL; "General" y "Preferencial" sí son enlaces.
- [ ] Dadas `/eventos/risas-sin-filtro/entradas?zona=mesa` (zona agotada), `/eventos/noche-de-sintetizadores-lima/entradas?zona=xx` (inexistente), `?zona=VIP` (mayúsculas), `?zona=` (vacía) y `?zona=vip&zona=general` (repetida), entonces se abre el sub-paso 1 ("Paso 1 de 2 · Elige una zona"), sin avisos.
- [ ] Dado el sub-paso 2 abierto desde el aside, cuando se pulsa "Todas las zonas", entonces vuelve el sub-paso 1, el foco está en la tarjeta de esa zona y la URL no cambia. "Atrás" del navegador vuelve al detalle.
- [ ] Dado `?zona=vip&vip=2`, entonces se abre el panel de VIP con cantidad 2, "Tu compra" muestra "2 × VIP" y "Continuar" lleva a `/checkout?evento=noche-de-sintetizadores-lima&vip=2`. Dado `?zona=norte&norte=1&asientos=<id disponible de norte>`, entonces se abre el plano de Tribuna Norte con esa butaca elegida y "1 de 10 butacas".
- [ ] Dada una carga completa (recarga) de `/eventos/noche-de-sintetizadores-lima/entradas?zona=norte`, entonces, tras hidratar, se ve el sub-paso 2 de Tribuna Norte, sin errores de hidratación en la consola.
- [ ] Dado el sub-paso 2 abierto desde el aside, cuando se eligen entradas y se pulsa "Continuar", entonces `/checkout` muestra el resumen correcto: con VIP + 2, "2 × VIP" y el total de 2 × S/ 550.00; con una butaca de Tribuna Norte, su etiqueta "Tribuna Norte · Fila … · Asiento …" y S/ 220.00.
- [ ] Dado el teclado en el detalle, entonces Tab recorre las filas comprables en el orden del mapa y luego "Ver mapa de zonas", y Enter en una fila navega como el clic.
- [ ] Dado el código, entonces:
  - `TicketSelection` no lee la URL; `PreselectedTicketSelection` solo conecta `useSearchParams` con `parseSeatingPreselection` y `parseInitialZoneId`; la página no lee `searchParams`;
  - `ZonePricesCard` sigue sin `"use client"` y construye los enlaces con `buildZoneEntryHref`;
  - `git diff` no toca `app/(site)/eventos/[slug]/page.tsx`, `MobileBuyBar.tsx`, `modules/events/**`, `modules/checkout/**` ni `components/shared/**`.
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta la precarga (de dónde viene, el sub-paso inicial y la tolerancia) y la entrada por zona (`?zona=`, validación, cantidad inicial 0, prioridad con la precarga y el `fallback` al recargar).
- [ ] Dado `design-system/ticketera/pages/event-detail.md`, entonces "Aside con mapa" documenta las filas como enlaces (destino, hover, foco, chevron, nombre accesible, agotadas como texto) y el botón "Ver mapa de zonas", y el diagrama ASCII lo refleja.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 7. Compra combinada y mapa no interactivo
Los criterios con navegador se comprueban con Playwright a **375, 768 y 1440 px** contra `npm run start`, con la BD de desarrollo sembrada como deja `seating-curved-venues.md` (mapas curvos). Los ids de butaca se toman del DOM (`data-seat-id` de una butaca `available`), no se fijan en el criterio.

**Mapa no interactivo** (`noche-de-sintetizadores-lima`, y lo mismo en `festival-vive-latino-lima` y `la-casa-de-los-espejos`):
- [ ] Dado el sub-paso 1, entonces:
  - el mapa es `svg[role="img"][aria-label="Mapa de zonas de <recinto>"]` y ningún elemento dentro tiene `role`, `tabindex`, `aria-label` ni `aria-disabled`;
  - cada forma tiene `data-zone-id` y su `cursor` calculado no es `pointer`.
- [ ] Dado un clic en el centro de la etiqueta de cada zona (VIP, Preferencial, General y Tribuna Norte), sobre la forma, entonces no cambian la URL, el indicador ("Paso 1 de 2 · Elige tus zonas"), "Tu compra" ni ningún stepper, y no se abre ningún sub-paso 2.
- [ ] Dado el puntero sobre una forma del mapa, entonces ninguna tarjeta tiene `data-highlighted="true"` y no aparece el trazo navy.
- [ ] Dado Tab desde "Volver al evento" hasta "Continuar", entonces ningún elemento enfocado está dentro del `<svg>` del mapa (`document.activeElement.closest("svg[role=img]")` es `null` en cada paso) y la primera parada dentro de la tarjeta "Elige tus entradas" es el primer control de la primera tarjeta de zona ("Quitar una entrada de VIP").
- [ ] Dado el puntero sobre la tarjeta "General", o el foco en su "+", entonces la forma de General lleva el trazo navy encima y las otras 3 zonas y sus etiquetas quedan al 40 %. Al pasar el foco de "−" a "+" de la misma tarjeta, el resaltado sigue. Al salir, desaparece.

**Compra combinada** (`noche-de-sintetizadores-lima`, en los 3 anchos):
- [ ] Dado el sub-paso 1, entonces:
  - el indicador dice "Paso 1 de 2 · Elige tus zonas";
  - encima de las tarjetas se lee "Puedes combinar varias zonas en una misma compra.";
  - VIP, Preferencial y General tienen el grupo "Cantidad de <zona>" en 0, con "−" deshabilitado;
  - Tribuna Norte tiene el botón "Elegir butacas de Tribuna Norte";
  - ningún `button` ni enlace contiene a la vez el nombre y el precio de una zona: las tarjetas no son botones;
  - las tarjetas van en 2 columnas a 768 y 1440 y en 1 a 375.
- [ ] Dados 2 "+" en VIP y 3 en General, entonces:
  - el indicador sigue en "Paso 1 de 2 · Elige tus zonas";
  - los steppers muestran 2 y 3, y el mapa lleva las insignias "✓ 2" y "✓ 3";
  - "Tu compra" (a 1440; la hoja "Ver resumen de la compra" a 375 y 768) muestra "2 × VIP … S/ 1,100.00" y "3 × General … S/ 540.00".
- [ ] Dado "Elegir butacas de Tribuna Norte" con esas 5 entradas, entonces:
  - se abre "Paso 2 de 2 · Elige tus butacas" con "0 de 5 butacas" y el foco en el h3;
  - aún no se ve "Agregar otra zona";
  - tras elegir 2 butacas disponibles, el contador dice "2 de 5 butacas" y aparece el pie "Puedes combinar varias zonas en una misma compra." con "Agregar otra zona".
- [ ] Dado "Agregar otra zona", entonces:
  - vuelve "Paso 1 de 2 · Elige tus zonas";
  - el foco está en la tarjeta de Tribuna Norte (resaltada), que dice "2 butacas elegidas" y cuyo botón pasa a "Cambiar butacas";
  - VIP y General siguen en 2 y 3;
  - el mapa lleva "✓ 2", "✓ 3" y "✓ 2".
- [ ] Dado ese estado, entonces:
  - "Tu compra" tiene **3 líneas** en el orden del mapa: "2 × VIP … S/ 1,100.00", "3 × General … S/ 540.00" y "2 × Tribuna Norte … S/ 440.00", esta con sus 2 etiquetas "Fila … · Asiento …";
  - el total es "Total (7 entradas)" y "S/ 2,080.00" (a 375 y 768, la barra dice "Total · 7 entradas" y "S/ 2,080.00");
  - "Continuar" lleva a `/checkout?evento=noche-de-sintetizadores-lima&vip=2&general=3&norte=2&asientos=<id1>%2C<id2>`;
  - `/checkout` muestra las 3 zonas con sus cantidades, las 2 butacas y el total S/ 2,080.00.
- [ ] Dado "Quitar General de tu compra" en ese estado, entonces:
  - quedan 2 líneas y el total "S/ 1,540.00";
  - el stepper de General vuelve a 0 y su insignia desaparece del mapa;
  - el foco pasa a "Quitar Tribuna Norte de tu compra".
- [ ] Dado "Quitar Tribuna Norte de tu compra", entonces su tarjeta ya no dice "2 butacas elegidas", su botón vuelve a "Elegir butacas" y, al abrirla, ninguna butaca está elegida ("0 de 8 butacas").
- [ ] Dado que se quita la última línea, entonces "Tu compra" muestra "Todavía no elegiste entradas. Empieza eligiendo una zona.", el foco está en ese texto y "Continuar" queda deshabilitado. A 375, lo mismo dentro de la hoja.

**Compra independiente** (`noche-de-sintetizadores-lima`, en los 3 anchos):
- [ ] Dado un solo "+" en General, sin abrir ninguna zona, entonces:
  - el indicador sigue en el sub-paso 1;
  - "Tu compra" muestra "1 × General … S/ 180.00" y "Total (1 entrada)";
  - "Continuar" lleva a `/checkout?evento=noche-de-sintetizadores-lima&general=1`, que muestra 1 × General y S/ 180.00.
- [ ] Dadas solo butacas de Tribuna Norte ("Elegir butacas", 2 butacas y "Continuar"), entonces el enlace es `…&norte=2&asientos=<id1>%2C<id2>`, como antes de la Fase 7.

**Límite de 10 combinado** (`noche-de-sintetizadores-lima`):
- [ ] Dados 4 "+" en VIP y 4 en General, y 2 butacas de Tribuna Norte (el contador pasa de "0 de 2" a "2 de 2 butacas"), entonces:
  - una tercera butaca no se elige y aparece el aviso "Máximo 10 entradas por compra";
  - tras "Agregar otra zona", los "+" de VIP, Preferencial y General tienen `aria-disabled="true"` y siguen siendo enfocables;
  - el pie dice "Llegaste al máximo de 10 entradas por compra.";
  - "Cambiar butacas de Tribuna Norte" sigue habilitado.
- [ ] Dado "Quitar VIP de tu compra" en ese estado, entonces los "+" se habilitan y el pie vuelve a "Máximo 10 entradas por compra.".

**Móvil** (`noche-de-sintetizadores-lima` a 375 px):
- [ ] Dados el sub-paso 1 (con steppers y botón), el sub-paso 2 de Tribuna Norte con el pie "Agregar otra zona" y la hoja "Tu compra" abierta con 3 líneas y sus "Quitar", entonces no hay scroll horizontal (`document.documentElement.scrollWidth ≤ clientWidth`), cada control mide ≥ 44 × 44 px y ningún control de una tarjeta se sale de ella.

**Entrada por zona (F6) con la Fase 7:**
- [ ] Dado el enlace "VIP" del aside de `/eventos/noche-de-sintetizadores-lima` (`?zona=vip`), entonces:
  - se abre "Paso 2 de 2 · Elige la cantidad" con el panel en 0 y sin "Agregar otra zona";
  - tras un "+", aparece el pie con "Agregar otra zona";
  - al pulsarlo, vuelve el sub-paso 1 con el foco en la tarjeta VIP y su stepper en 1;
  - un "+" en General añade una segunda línea a "Tu compra".
- [ ] Dadas `?zona=xx`, `?zona=VIP` o `?zona=mesa` (`risas-sin-filtro`), entonces se abre "Paso 1 de 2 · Elige tus zonas" (F6 sin cambios en lo demás).

**`festival-vive-latino-lima`** (3 anchos):
- [ ] Dado el sub-paso 1, entonces:
  - Campo VIP, Campo General y Tribuna Norte (de pie) tienen stepper;
  - Tribuna Occidente y Tribuna Oriente tienen "Elegir butacas";
  - el mapa curvo no es interactivo (como en noche: clic en la forma de Tribuna Oriente sin efecto y ninguna parada de Tab en el mapa).
- [ ] Dados 1 Campo VIP y 2 Campo General (steppers), 2 butacas de Oriente y "Agregar otra zona", y 1 butaca de Occidente y "Agregar otra zona", entonces:
  - "Tu compra" tiene 4 líneas en el orden del mapa: Campo VIP S/ 330.00, Campo General S/ 430.00, Tribuna Occidente S/ 180.00 y Tribuna Oriente S/ 310.00;
  - el total es "Total (6 entradas)" y "S/ 1,250.00";
  - "Continuar" lleva a `/checkout?evento=festival-vive-latino-lima&campo-vip=1&campo-general=2&occidente=1&oriente=2&asientos=…` con las 3 butacas, y `/checkout` lo acepta con el mismo total.

**`la-casa-de-los-espejos`** (solo numeradas; 3 anchos):
- [ ] Dado el sub-paso 1, entonces:
  - no hay ningún stepper;
  - Platea y Mezanine tienen "Elegir butacas" (Mezanine con "Últimas entradas");
  - se ve la ayuda "Puedes combinar varias zonas en una misma compra.";
  - el mapa no es interactivo.
- [ ] Dadas 2 butacas de Platea, "Agregar otra zona", "Elegir butacas de Mezanine" y 1 butaca, entonces:
  - "Tu compra" muestra "2 × Platea … S/ 360.00" y "1 × Mezanine … S/ 120.00", con el total "S/ 480.00";
  - "Continuar" lleva a `…&platea=2&mezanine=1&asientos=…`;
  - "Quitar Platea de tu compra" deja solo Mezanine (S/ 120.00).

**Zona agotada** (`risas-sin-filtro`):
- [ ] Dada la tarjeta "Mesa", entonces muestra "Agotado", no tiene ningún control (Tab la salta y no recibe foco) y no se resalta. Su forma en el mapa es gris con "Agotado" y un clic sobre ella no hace nada.

**Código y verificación:**
- [ ] Dado el código, entonces:
  - `VenueMapView.tsx` no contiene `role="button"`, `tabIndex`, `onClick`, `onKeyDown`, `onPointerEnter`, `onFocus` ni `cursor-pointer`;
  - `ZoneCards.tsx` no envuelve la tarjeta en un `<button>`;
  - `ZoneCards`, `ZoneQuantityPanel` y `BestSeatsPicker` usan `QuantityStepper`, y el marcado del stepper (los dos `Button` y el valor) solo está en `QuantityStepper.tsx`;
  - no hay hex ni colores por defecto de Tailwind;
  - `git diff` de la fase solo toca los 12 archivos del plan.
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta lo del requisito 47 y no quedan referencias a zonas del mapa como botón, a abrir una zona desde el mapa ni al resaltado desde el mapa.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan, y `/eventos/[slug]/entradas` sigue SSG (●).

## Diseño técnico

### Rutas (`app/`)
Sin cambios en F1–F5. La página genera los slugs con `hasVenueMap`. La Fase 1 de `design-alignment-purchase-flow.md` la mueve de `app/(site)/eventos/[slug]/entradas/page.tsx` a `app/(purchase)/eventos/[slug]/entradas/page.tsx` (misma URL) y la envuelve en `PurchaseShell`. `app/(site)/eventos/[slug]/page.tsx` (detalle) no cambia en ninguna fase.

F6: `app/(purchase)/eventos/[slug]/entradas/page.tsx` envuelve `PreselectedTicketSelection` en `Suspense` (requisito 36). Sigue prerenderizada (SSG) y no lee `searchParams`. URL de entrada nueva, sin ruta nueva: `/eventos/<slug>/entradas?zona=<zoneId>`.

F7: sin cambios en `app/` ni en las URLs (ni `?zona=` ni la precarga ni el contrato C).

### Componentes
- **shadcn instalados** (no hay nada que instalar):
  - `card`, `button` y `badge`;
  - `breadcrumb` (`Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink` con `render`, `BreadcrumbSeparator`, `BreadcrumbPage`);
  - `sheet` (`Sheet`, `SheetTrigger`, `SheetContent side="bottom"`, `SheetHeader`, `SheetTitle`).
- **Buscados en shadcn y descartados:**
  - `npx shadcn@latest search @shadcn -q stepper` no encuentra nada: el indicador de sub-paso es un texto.
  - `drawer` existe (Base UI Drawer), pero no se instala (decisión 21).
  - `tooltip` y `hover-card` existen, pero no sirven para las butacas (decisión 24).
  - No hay componente de minimapa, de mapa de recintos ni de plano de butacas.
- **Existentes que se modifican** (`modules/seating/components/`):
  - `TicketSelection.tsx`:
    - F3: tarjeta única, sub-pasos, foco, resaltado, transición, `ZoneStepHeader` con contador y `lines` para la barra;
    - F4: `seatLimit`, `selectedInZone` y `onPickBestSeats` para `SeatPlan`;
    - F6: `initialSelection?` e `initialZoneId?`.
  - `ZonePricesCard.tsx` (F6; existente, Server Component): filas como enlaces por zona y botón "Ver mapa de zonas" (requisito 38). Reutiliza `Link`, `Badge`, `buttonVariants`, `Card` y las clases de hover y foco de `ZoneCards`. Se busca en shadcn: `item` existe, pero no se instala (una fila con `Link` y las clases de hoy basta; añadir un componente para 4–5 filas no aporta, KISS).
  - `VenueMapView.tsx` (F3): requisito 12.
  - `SeatPlan.tsx`:
    - F3: sin `Card` ni h2, ayuda arriba, `headingId` del h3 externo y `parseViewBox` (requisito 16);
    - F4: estados v2, nivel de detalle, tooltip, letras en los dos extremos, zoom superpuesto desde `sm`, leyenda nueva y bandeja con `BestSeatsPicker` (requisitos 21–27);
    - F5: letras de fila a 13 unidades (`ROW_LABEL_FONT_SIZE`; requisito 25 enmendado, decisión 30); prop `venue: Pick<VenueMap, "viewBox" | "stage" | "zones">` (sustituye a `stageLabel`; `stage.label` sigue sirviendo para la cuadrícula), fondo, lienzo apaisado y minimapa.
  - `SeatLegend.tsx` (F4): `SeatShape` v2 (`number?`) y `SeatLegend({ price, selectedCount, hasAccessible })`.
  - `PurchaseSummary.tsx` (F3): texto vacío y `PurchaseSummaryContent` exportado.
  - `MobilePurchaseBar.tsx` (F3): prop `lines` y hoja inferior.
- **Nuevos en `modules/seating/components/`** (solo los usa `seating`; ninguno existe en shadcn ni en `components/shared`):
  - `ZoneCards.tsx` (F3): requisito 13.
  - `ZoneStepHeader.tsx` (F3): requisito 14. Lo comparten los dos sub-pasos 2.
  - `ZoneQuantityPanel.tsx` (F3): requisito 15.
  - `SeatTooltip.tsx` (F4): requisito 24.
  - `BestSeatsPicker.tsx` (F4): requisito 26.
  - `SeatPlanMinimap.tsx` (F5): props `viewBox`, `stage`, `zones` (solo `id`/`path`), `activeZoneId`, `planTransform`, `planWidth`, `planHeight` y `planRef` (el `<svg>` del plano, para el `insetBottom`; enmienda F5).
  - `PreselectedTicketSelection.tsx` (F6; `"use client"`). Va separado de `TicketSelection` porque `useSearchParams` obliga a un `Suspense` cuyo `fallback` es el propio `TicketSelection`, que por eso no puede leer la URL.
- **Se elimina** `ZoneList.tsx` (F3).
- **Fase 7** (`modules/seating/components/`):
  - **shadcn (instalado):** `button` (`variant="outline"` para "Elegir/Cambiar butacas" y "Agregar otra zona"; `ghost` para "Quitar"). No hay nada que instalar.
  - **Buscado en shadcn y descartado:** no tiene un componente de stepper ni un input numérico con −/+. `npx shadcn@latest search @shadcn -q stepper`, `-q number` y `-q quantity` no encuentran nada; existen `input`, `input-group`, `input-otp` y `button-group`. `button-group` no aporta: el stepper ya es una pastilla con dos `Button` y el valor, y un `ButtonGroup` cambiaría su aspecto y su marcado probado.
  - **Nuevo:** `QuantityStepper.tsx` (requisito 41). No existe en `components/ui` ni en `components/shared`. Su equivalente de `modules/events/components/TicketSelector.tsx` es interno de otro módulo (decisión 40).
  - **Existentes que se modifican:**
    - `VenueMapView.tsx`: ilustración (requisito 40);
    - `ZoneCards.tsx`: control en línea (requisito 42);
    - `ZoneQuantityPanel.tsx` y `BestSeatsPicker.tsx`: usan `QuantityStepper` (requisito 41);
    - `PurchaseSummary.tsx` y `MobilePurchaseBar.tsx`: "Quitar" (requisito 45);
    - `TicketSelection.tsx`: indicador, props, pie "Agregar otra zona" y `onRemoveLine` (requisito 43).
  - **No se tocan:** `SeatPlan.tsx`, `ZoneStepHeader.tsx`, `PreselectedTicketSelection.tsx`, `ZonePricesCard.tsx`, `SeatLegend.tsx`, `SelectedSeatChips.tsx`, `SeatPlanMinimap.tsx` ni `index.ts`. `QuantityStepper` no se exporta.
- **No se tocan:** `EventPurchaseStrip`, `SelectedSeatChips`, `SeatGridPreview` (hereda la forma de F4), `ZonePricesCard` en F1–F5 (hereda los tonos de F2; cambia en F6), `MobileBuyBar` ni `components/shared/PurchaseShell.tsx` (sustituye a `PurchaseStepper`, que ya no existe; es de `design-alignment-purchase-flow.md`).

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
- `utils/zoneTone.ts` (F2): 5 tonos y `label` con clase SVG + HTML (requisito 9). `types/seating.types.ts` (F2): `ZoneTone` gana `"tier-5"`.
- `utils/viewBox.ts` (F3, nuevo): `parseViewBox` (requisito 19).
- `utils/planViewport.ts`:
  - F4 (nuevo): `getPlanFit` y `getSeatDetailLevel` (requisito 23);
  - F5: `type Rect = { x: number; y: number; width: number; height: number }`, `getVisiblePlanRect` (sobre `getPlanFit`, con `insetBottom?`) y `toVenueRect` (requisito 31).
- `utils/zoneParam.ts` (F6, nuevo): `buildZoneEntryHref` y `parseInitialZoneId` (requisito 39). Archivo propio y no `selectionSummary.ts`: no tiene que ver con la selección ni con el contrato C, y lo usan el aside del detalle y la pantalla de entradas.

Hook `hooks/useSeatSelection.ts`:
- F3: `selectZone` ignora las zonas agotadas o inexistentes, y se añade `closeZone(): void`.
- F4: `pickBestSeats(zoneId: string, count: number): string[] | null` (requisito 26).
- F6: segundo parámetro opcional `initial?: { selection?: SeatSelection; zoneId?: string | null }` (requisito 33).
- F7: `changeQuantity` ya no activa la zona y se añade `clearZone(zoneId: string): void` (requisito 44).
- El resto de la firma no cambia.

Utils (F6): `utils/selectionSummary.ts` añade `parseSeatingPreselection(map: VenueMap, params: Pick<URLSearchParams, "getAll">): SeatSelection` (requisito 32). Reutiliza `parseSeatId`, `resolveSeats` y `MAX_TICKETS_PER_ORDER` (de `@/modules/events/purchase`, la entrada de la que el archivo ya importa `buildCheckoutHref`).

Datos `data/venueMaps.mock.ts` (F1): exporta `STADIUM_CENTER` y `VIVE_LATINO_SECTORS: Record<"stage" | "campo-vip" | "campo-general" | "occidente" | "oriente" | "norte", AnnularSector>`, y añade el layout del requisito 7 construido con `getAnnularSectorPath`, `getArcPoints` y `generateArcSeatRows`.

Service: sin cambios de código. `getVenueMapBySlug`, `getVenueMapForEvent` y `hasVenueMap` cubren el evento nuevo con los datos.

`index.ts` y `seats.ts`: sin cambios en F1–F5. F6: `index.ts` exporta `PreselectedTicketSelection` (`ZonePricesCard` ya se exporta; `buildZoneEntryHref` no se exporta, porque solo lo usa el módulo).

`app/globals.css`, `package.json` y `components/ui/`: sin cambios en ninguna fase (decisión 22: sin dependencias nuevas; los tonos usan tokens existentes con opacidad).

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
- **Tonos (F2):** `type ZoneTone = "tier-1" | "tier-2" | "tier-3" | "tier-4" | "tier-5" | "sold-out"`. `ZONE_TONE_CLASSES` mantiene sus claves `shape`, `label` y `swatch`.
- **Interfaces de componente y hook (F3–F4):**
  ```ts
  // modules/seating/utils/viewBox.ts (F3)
  export function parseViewBox(viewBox: string): { width: number; height: number };
  // modules/seating/hooks/useSeatSelection.ts
  closeZone(): void;                                                  // F3
  pickBestSeats(zoneId: string, count: number): string[] | null;      // F4 (antes: (zoneId) => void)
  // modules/seating/utils/planViewport.ts (F4; F5 añade getVisiblePlanRect y toVenueRect)
  export function getPlanFit(input: { planWidth: number; planHeight: number; viewportWidth: number; viewportHeight: number }): { unit: number; offsetX: number; offsetY: number };
  export function getSeatDetailLevel(unit: number, scale: number): "overview" | "numbers";
  // modules/seating/components/*.tsx
  type VenueMapViewProps = Pick<VenueMap, "viewBox" | "stage" | "venue"> & {
    zones: VenueZone[]; tones: Record<string, ZoneTone>; highlightedZoneId: string | null;
    selectedCountByZone: Record<string, number>; onOpenZone: (zoneId: string) => void; onHighlightZone: (zoneId: string | null) => void;
  };
  type ZoneCardsProps = Omit<VenueMapViewProps, "viewBox" | "stage" | "venue">;
  type ZoneStepHeaderProps = { zone: Pick<VenueZone, "name" | "price" | "status" | "kind">; headingId: string; onBack: () => void; children?: ReactNode };
  type ZoneQuantityPanelProps = { zoneName: string; price: number; quantity: number; atLimit: boolean; onChangeQuantity: (delta: 1 | -1) => void };
  type MobilePurchaseBarProps = { lines: SelectionLine[]; ticketCount: number; total: number; checkoutHref: string | null; className?: string };
  type SeatShapeProps = { status: SeatStatus; selected: boolean; number?: number };                     // F4
  type SeatLegendProps = { price: number; selectedCount: number; hasAccessible: boolean };              // F4
  type SeatTooltipProps = { tooltip: { title: string; detail: string; x: number; y: number; placement: "top" | "bottom" } | null }; // F4
  type BestSeatsPickerProps = { seatLimit: number; selectedInZone: number; onPick: (count: number) => void };                      // F4
  ```
- **Precarga y entrada por zona (F6):** entrada `/eventos/<slug>/entradas?[zona=<zoneId>][&<ticketTypeId>=<qty>…][&asientos=<id>,<id>]`.
  - `<ticketTypeId>` y `asientos`: contrato C sin `evento`; los genera `buildChangeTicketsHref` de checkout (Fase 7, ya implementada).
  - `zona`: el `id` de una zona del mapa; lo genera `buildZoneEntryHref` desde el aside del detalle. Nombre reservado (decisión 33). Los tres son independientes (decisión 32).
  - **Contrato H ampliado:** `ZonePricesCard` mantiene sus props; cada zona comprable enlaza a `buildZoneEntryHref(slug, zone.id)` y el botón ("Ver mapa de zonas") sigue enlazando a `/eventos/<slug>/entradas`.
  ```ts
  // modules/seating/utils/selectionSummary.ts
  export function parseSeatingPreselection(map: VenueMap, params: Pick<URLSearchParams, "getAll">): SeatSelection;
  // modules/seating/utils/zoneParam.ts
  export function buildZoneEntryHref(slug: string, zoneId: string): string; // "/eventos/<slug>/entradas?zona=<zoneId>"
  export function parseInitialZoneId(zones: Pick<VenueZone, "id" | "status">[], params: Pick<URLSearchParams, "getAll">): string | null;
  // modules/seating/hooks/useSeatSelection.ts
  export function useSeatSelection(map: VenueMap, initial?: { selection?: SeatSelection; zoneId?: string | null }): /* igual que hoy */;
  // modules/seating/components/TicketSelection.tsx
  type TicketSelectionProps = { map: VenueMap; initialSelection?: SeatSelection; initialZoneId?: string | null };
  // modules/seating/components/PreselectedTicketSelection.tsx
  export function PreselectedTicketSelection(props: { map: VenueMap }): JSX.Element;
  // modules/seating/components/ZonePricesCard.tsx (props sin cambios)
  type ZonePricesCardProps = { slug: string; status: EventStatus; priceFrom: number; zones: VenueZone[] };
  ```
- **Compra combinada (F7):** sin cambios en URLs ni en el contrato C. Interfaces que cambian:
  ```ts
  // modules/seating/hooks/useSeatSelection.ts
  changeQuantity(zoneId: string, delta: 1 | -1): void; // ya no cambia activeZoneId
  clearZone(zoneId: string): void;                    // nuevo: quita cantidad y butacas de la zona
  // modules/seating/components/QuantityStepper.tsx (nuevo)
  type QuantityStepperProps = Omit<ComponentProps<"div">, "children" | "role"> & {
    value: number; decrementLabel: string; incrementLabel: string;
    canDecrement: boolean; canIncrement: boolean; onDecrement: () => void; onIncrement: () => void;
  };
  // modules/seating/components/VenueMapView.tsx (sin onOpenZone ni onHighlightZone)
  type VenueMapViewProps = Pick<VenueMap, "viewBox" | "stage" | "venue"> & {
    zones: VenueZone[]; tones: Record<string, ZoneTone>; highlightedZoneId: string | null; selectedCountByZone: Record<string, number>;
  };
  // modules/seating/components/ZoneCards.tsx
  type ZoneCardsProps = {
    zones: VenueZone[]; tones: Record<string, ZoneTone>; highlightedZoneId: string | null; selectedCountByZone: Record<string, number>;
    atLimit: boolean; onChangeQuantity: (zoneId: string, delta: 1 | -1) => void;
    onOpenZone: (zoneId: string) => void; onHighlightZone: (zoneId: string | null) => void;
  };
  // modules/seating/components/PurchaseSummary.tsx y MobilePurchaseBar.tsx
  type PurchaseSummaryContentProps = { lines: SelectionLine[]; ticketCount: number; total: number; checkoutHref: string | null; onRemoveLine: (zoneId: string) => void };
  type MobilePurchaseBarProps = PurchaseSummaryContentProps & { className?: string };
  ```

## Reutilización
- `seating`:
  - `getZoneTones`/`ZONE_TONE_CLASSES` (mapa, tarjetas y aside);
  - `generateSeatRows` (paso de 32 y regla de ocupación);
  - `getRowEdgeLabelPoints` (F1) para las letras en arco;
  - `findBestAvailableSeats` (F1) para "Mejores butacas";
  - `formatSeatId`, `formatSeatShortLabel` (título del tooltip) y `getSeatAriaLabel` (sin cambios);
  - `SeatShape` y `SeatLegend` (se amplían), `SelectedSeatChips` (sin cambios), `SeatPlan` (zoom, roving tabindex, clic tras arrastre, teclado);
  - `useSeatSelection`, `PurchaseSummary` y `MobilePurchaseBar`;
  - el stepper −/+ de `ZoneList`, que se mueve a `ZoneQuantityPanel` y se repite en `BestSeatsPicker` con las mismas clases. Se abstrae si aparece una tercera vez (DRY a partir de la segunda repetición real: aquí son dos contextos con textos distintos).
- `lib/hash.ts` (`hashString`, `mixHash`) de la F5 de la spec base.
- `events`: `formatEventPrice` y `MAX_TICKETS_PER_ORDER` (`purchase.ts`), y el detalle y el aside, sin cambios de código.
- shadcn instalados: `Card`, `Button`, `Badge`, `Breadcrumb` y `Sheet`.
- `react-zoom-pan-pinch@4.2.0` (instalado), decisión 22:
  - `useControls` (zoom);
  - `zoomToElement` con varios destinos y `maxScale` ("Mejores butacas");
  - `useTransformInit`/`useTransformEffect` (nivel de detalle y minimapa);
  - `onPanningStart`/`onZoomStart`/`onPinchStart` (ocultar el tooltip).
  - Su `MiniMap` se descarta (decisión 12).
- `tw-animate-css` (instalado): `animate-in`, `fade-in` y `zoom-in-*` para las transiciones (decisión 26).
- Iconos `lucide-react`:
  - nuevos: `Users`, `Armchair`, `ChevronRight`, `ChevronLeft`, `ChevronUp`, `Check` y `Accessibility`;
  - ya usados: `Maximize`, `Sparkles`, `Minus`, `Plus`, `X` y `ArrowRight`;
  - `ZoomIn`/`ZoomOut` se sustituyen por `Plus`/`Minus`, como en la captura.
- F6: `parseSeatId`, `resolveSeats` y `buildSeatingCheckoutHref` (para el test de ida y vuelta), `MAX_TICKETS_PER_ORDER`, `useSearchParams` + `Suspense` (documentación de Next 16). Es el mismo patrón que `PreselectedTicketSelector` de `modules/events` (ya implementado por la Fase 7 de `checkout-mock-payment.md`). Sin dependencias nuevas.
- F7:
  - el stepper de `ZoneQuantityPanel`/`BestSeatsPicker`, que se extrae a `QuantityStepper` (tercera repetición, decisión 40);
  - `formatSelectedCount` (tarjeta numerada);
  - el trazo de resaltado y la insignia de `VenueMapView`;
  - `handleOpenZone`/`handleBack`, la transición y el foco de `TicketSelection`;
  - `parseSeatId` (en `clearZone`);
  - el patrón de foco de `SelectedSeatChips` (para "Quitar");
  - `flushSync`;
  - `Button` de shadcn;
  - iconos `Plus`, `ChevronRight` y `Trash2` (nuevo) de `lucide-react`;
  - container queries de Tailwind v4 (`@container`, `@xl:`), ya usadas en `SeatPlan` (F5).
  - Sin dependencias nuevas.
- F6 (entrada por zona): `ZonePricesCard` (se amplía), `Link` de `next/link`, `ChevronRight` (ya usado en `ZoneCards`), las clases de hover y foco de `ZoneCards` (`hover:bg-accent/40`, `ring-3 ring-ring/50`), `selectZone`/`closeZone` y el sub-paso 2 existentes (no hay pantalla nueva: solo cambia el estado inicial). shadcn `item` existe pero no se instala (requisito 38).

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
  - `modules/seating/utils/zoneTone.test.ts` (se amplía):
    - 5 precios distintos → `tier-1`…`tier-5`;
    - 6 precios → el 6.º es `tier-5`;
    - precios iguales comparten tono;
    - las agotadas son `sold-out` y no cuentan para el rango;
    - cada entrada de `ZONE_TONE_CLASSES` tiene `shape` con `fill-`, `label` con `fill-` y `text-`, y `swatch` con `bg-`;
    - sigue el test de "solo tokens".
  - `modules/seating/services/seating.service.test.ts`: los tonos del festival pasan a `oriente` → `tier-4` y `norte` → `tier-5` (decisión 28). El resto no cambia.
- **F3:**
  - `modules/seating/utils/viewBox.test.ts` (nuevo):
    - `"0 0 600 412"` → `{ width: 600, height: 412 }`;
    - formatos inválidos (`"0 0 600"`, `"10 0 600 412"`, texto) → `Error`.
  - `modules/seating/hooks/useSeatSelection.test.ts`:
    - "selectZone activa cualquier zona, incluidas las numeradas y las agotadas" pasa a: activa las numeradas y las de pie, e ignora las agotadas y las inexistentes;
    - nuevo caso `closeZone` (vuelve a `null` y conserva la selección).
  - `modules/seating/components/TicketSelection.test.tsx` (se reescribe la parte de lista y activación; se conservan los casos del plano):
    - el indicador "Paso 1 de 2 · Elige una zona";
    - la etiqueta HTML de cada zona (nombre y precio) y la insignia con el número de elegidas;
    - **resaltado:** `pointerEnter`/`focus` en una tarjeta → la zona del mapa tiene el trazo superpuesto y las demás `opacity-40`; `pointerEnter` en el mapa → `data-highlighted="true"` en su tarjeta; `pointerLeave`/`blur` lo quitan; las agotadas no se resaltan;
    - clic o Enter en una zona del mapa abre el sub-paso 2, cambia el indicador, enfoca el h3 y quita el mapa y las tarjetas;
    - la tarjeta de una zona de pie abre el panel de cantidad: −/+ actualizan la cantidad, el subtotal, el total y el `href`;
    - "Todas las zonas" vuelve, enfoca la tarjeta y conserva la selección, con "2 entradas elegidas" en su nombre accesible;
    - una zona agotada (mapa y tarjeta) no abre nada y tiene `aria-disabled`;
    - una zona numerada abre el plano con "n de m butacas", que se actualiza al elegir; al quitar el último chip, el foco va al h3;
    - el límite de 10 con el texto del pie;
    - el resumen vacío con el texto nuevo;
    - "Ver resumen de la compra" abre el diálogo "Tu compra" con las líneas y el total;
    - se mantienen, adaptados al sub-paso 2, los casos de F4 de la spec base: clic en un asiento, Espacio/Enter, flechas y `tabIndex`, ocupado, "Mejor asiento disponible", quitar un chip y cambiar de zona conservando asientos.
- **F4:**
  - `modules/seating/utils/planViewport.test.ts` (nuevo):
    - `getPlanFit`: plano y viewport de igual proporción (`offset` 0), viewport más ancho (`offsetX` > 0), más alto (`offsetY` > 0) y medidas ≤ 0 → todo 0;
    - `getSeatDetailLevel`: escala 1 con `unit` 2 → `"overview"`; escala 1.5 con `unit` 0.8 → `"numbers"` (1.2 ≥ 1); escala 1.2 con `unit` 0.8 → `"overview"` (0.96 < 1).
  - `modules/seating/hooks/useSeatSelection.test.ts` (se reescriben los casos de `pickBestSeats`):
    - `count` 1 y 2 → el bloque esperado, que se devuelve, con su aviso;
    - sustituye las butacas de la zona y respeta las de otras zonas;
    - sin bloque → `null` y el aviso "No hay <n> asientos juntos…" (o "No quedan…" con 1);
    - por encima del límite → `null` y "Máximo 10 entradas por compra";
    - `count` 0 o no entero, zona de pie o inexistente → `null` sin cambios;
    - nunca elige accesibles.
  - `modules/seating/components/TicketSelection.test.tsx` (se amplía; el `vi.mock("react-zoom-pan-pinch")` añade `useTransformInit: vi.fn()`, `useTransformEffect: vi.fn()` y `zoomToElement` en los controles):
    - las disponibles llevan su número (`text` `aria-hidden`), las ocupadas no, y las accesibles tienen el icono;
    - la leyenda "Disponible · S/ X", "Elegida", "Ocupada" y "n elegidas" se actualiza al elegir; "Accesible (silla de ruedas)" solo aparece con butacas accesibles;
    - **tooltip:** `pointerOver` en una butaca → "Fila A · Asiento 2" + precio; en una ocupada → "Ocupada"; con `pointerType: "touch"` no aparece; `focus` por teclado lo muestra;
    - **`BestSeatsPicker`:**
      - empieza en 2 y elige el bloque esperado;
      - con 1, el texto del botón cambia;
      - en el límite, deshabilitado;
      - sin bloque, el aviso;
    - el grupo "Zoom del plano" con sus 3 botones;
    - 2 letras por fila en cuadrícula.
- **F5:**
  - **T0 (letras a 13 unidades, decisión 30):** sin tests nuevos ni modificados. Es una constante de un componente presentacional (`docs/SETUP.md`, "No requieren unit tests"). Siguen pasando sin cambios los tests de `getRowEdgeLabelPoints` (`arcSeatRows.test.ts`), la invariante de margen ≥ 12 (`seating.service.test.ts`) y el de las `x` en cuadrícula (`TicketSelection.test.tsx`).
  - `modules/seating/utils/planViewport.test.ts` (se amplía):
    - escala 1 sin desplazamiento → el plano entero;
    - escala 2 con `position` (−w/2, −h/2) → el cuarto central correcto;
    - viewport más alto que el plano (centrado vertical con `offset`);
    - recorte a los límites;
    - `toVenueRect` deshace `planTransform`;
    - *(enmienda F5)* con `insetBottom`: sin zoom, el plano encaja sobre la franja y se ve entero; con zoom, la franja se descuenta de la escala y del margen.
  - `modules/seating/components/TicketSelection.test.tsx` (se amplía). Con una zona fixture con `planTransform`:
    - se pinta el minimapa (`svg[aria-hidden]` con el `path` de la zona en `fill-primary`);
    - el fondo tiene la zona abierta en `fill-accent`;
    - hay 2 letras por fila en los puntos de `getRowEdgeLabelPoints`;
    - no aparece la barra "ESCENARIO" de cuadrícula;
    - una zona sin `planTransform` no tiene minimapa ni fondo;
    - *(enmienda F5)* con medidas simuladas del `<svg>` y del minimapa: si el plano entero llega a la esquina del minimapa, `data-placement="bar"` (fuera del lienzo, sin `sm:absolute` y la barra sin `sm:contents`); con margen lateral o superior suficiente, `"overlay"`; y se recoloca al redimensionar (`ResizeObserver`).
- **F6:**
  - `modules/seating/utils/selectionSummary.test.ts` (se amplía; los casos actuales no cambian). `parseSeatingPreselection` con un mapa fixture (una zona de pie, una numerada y una agotada):
    - cantidad de pie válida → `quantities[zone.id]` (clave = id de zona, parámetro = `ticketTypeId`);
    - butacas válidas, en el orden de la URL;
    - se ignoran: butaca ocupada, inexistente, repetida, de una zona de pie o de la zona agotada; cantidad de la zona agotada; cantidad de una zona numerada sin butacas; valores `abc`, `0`, `11`, `1.5`; parámetros repetidos (cantidad o `asientos`);
    - recorte a 10 en el orden de `map.zones`;
    - sin parámetros → selección vacía;
    - ida y vuelta con `buildSeatingCheckoutHref` (cantidades de pie + butacas) → misma selección.
  - `modules/seating/utils/zoneParam.test.ts` (nuevo). Con zonas fixture (una de pie, una numerada y una agotada):
    - `buildZoneEntryHref("noche-de-sintetizadores-lima", "vip")` → `/eventos/noche-de-sintetizadores-lima/entradas?zona=vip`;
    - `parseInitialZoneId`: zona de pie y zona numerada válidas → su id;
    - → `null`: sin `zona`, zona agotada, inexistente, en mayúsculas (`VIP`), vacía, con espacios y repetida (`zona=a&zona=a` y `zona=a&zona=b`);
    - ignora el resto de parámetros (`zona=vip&vip=2&asientos=…` → `vip`);
    - ida y vuelta: para cada zona comprable, `parseInitialZoneId(zonas, new URL(buildZoneEntryHref(slug, id), "http://localhost").searchParams)` devuelve su id.
  - `modules/seating/hooks/useSeatSelection.test.ts` (se amplía):
    - con `initial.selection`: `quantities`, `seatIds`, `ticketCount`, `lines`, `total` y `checkoutHref` reflejan la selección, y `activeZoneId` es `null`;
    - con `initial.zoneId`: `activeZoneId` empieza en esa zona y la selección está vacía; `closeZone` vuelve a `null`;
    - con los dos: zona abierta y selección precargada;
    - `toggleSeat` sobre una butaca precargada la quita;
    - sin `initial`, igual que hoy.
  - `modules/seating/components/TicketSelection.test.tsx` (se amplía):
    - con `initialSelection`, sub-paso 1 con las tarjetas "…, 2 entradas elegidas" / "…, 2 butacas elegidas" en su nombre accesible, total y `href` de "Continuar";
    - con `initialZoneId` de una zona de pie: indicador "Paso 2 de 2 · Elige la cantidad", h3 de la zona, cantidad 0, "Subtotal S/ 0.00", sin mapa ni tarjetas en el DOM y el foco sin mover (`document.activeElement` es `body`); "+" suma 1; "Todas las zonas" vuelve al sub-paso 1 y enfoca su tarjeta;
    - con `initialZoneId` de una zona numerada: "Paso 2 de 2 · Elige tus butacas", "0 de 10 butacas" y el plano;
    - con `initialZoneId` e `initialSelection` de la misma zona de pie: cantidad 2 y su subtotal;
    - `PreselectedTicketSelection`, con `vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal()), useSearchParams: () => new URLSearchParams("…") }))`: precarga lo mismo; con `zona=<de pie>` abre su panel; con `zona=<agotada>` o `zona=xx`, el sub-paso 1.
  - `modules/seating/components/ZonePricesCard.test.tsx` (nuevo; pedido explícito, aunque el componente es de un módulo: tiene lógica de qué filas enlazan). Render síncrono (no es `async`) con zonas fixture (de pie `available`, de pie `low-stock`, numerada y agotada):
    - una fila enlace por zona comprable, con `href` `/eventos/<slug>/entradas?zona=<id>`, en el orden de las zonas;
    - nombres accesibles "Elegir entradas de <nombre>, <precio>" y ", últimas entradas" en la `low-stock`;
    - la agotada: sin enlace, con "Agotado";
    - el botón "Ver mapa de zonas" con `href` `/eventos/<slug>/entradas`; ningún enlace se llama exactamente "Elegir entradas";
    - con `status="sold-out"`: ningún enlace de zona, sin "Ver mapa de zonas" y con "Entradas agotadas".
- **F7:**
  - `modules/seating/hooks/useSeatSelection.test.ts` (se adapta y se amplía):
    - "changeQuantity activa la zona, sube y baja sin pasar de 0" pasa a "changeQuantity no cambia la zona activa…": con `activeZoneId` `null` sigue `null`, y con "norte" abierta sigue "norte". El resto del caso no cambia;
    - en "limita a 10 entradas…", `activeZoneId` pasa de "vip" a `null`;
    - `clearZone`:
      - de una zona de pie con cantidad: borra su clave y actualizan `lines`, `ticketCount`, `total` y `checkoutHref`;
      - de una numerada: quita solo sus butacas y conserva las de otra zona, en orden;
      - de la última zona con entradas: `checkoutHref` `null`;
      - limpia el aviso cuando cambia algo;
      - una zona sin entradas o inexistente no cambia el estado (`result.current.quantities`/`seatIds` con la misma referencia y el aviso se conserva);
      - no cambia `activeZoneId`.
  - `modules/seating/components/TicketSelection.test.tsx` (se reescriben los casos del sub-paso 1, del resaltado, de la zona de pie, de la agotada y los de F6 que usan el mapa o las tarjetas como botón; los casos del plano se conservan):
    - **Ayudantes:**
      - `mapImage()` = `queryByRole("img", { name: "Mapa de zonas de Recinto de prueba" })`;
      - `mapShape(id)` = su `path[data-zone-id="<id>"]`;
      - `zoneCard(name)` = `within(list "Zonas").getByRole("group", { name })`;
      - `stepper(name)` = el grupo "Cantidad de <zona>";
      - `openNorte()` pulsa "Elegir butacas de Tribuna Norte" (o "Cambiar butacas…");
      - `removeLine(name)` = el botón "Quitar <zona> de tu compra" del aside.
    - **Sub-paso 1:**
      - indicador "Paso 1 de 2 · Elige tus zonas";
      - la ayuda "Puedes combinar varias zonas…" (y que no aparece con una sola zona comprable, con un mapa fixture);
      - el mapa es `role="img"` y ningún descendiente tiene `role`, `tabindex` ni `aria-label`;
      - las formas no tienen `cursor-pointer`;
      - VIP y General tienen el stepper en 0, Norte "Elegir butacas de Tribuna Norte" y Mesa "Agotado" sin botones dentro de su tarjeta;
      - no hay ningún `button` cuyo nombre empiece por el nombre de una zona seguido de ",".
    - **Mapa sin efecto:** `click`, `keyDown` (Enter y Espacio) y `pointerEnter` sobre `mapShape("vip")` no cambian el indicador, no añaden el trazo y no ponen `data-highlighted` en ninguna tarjeta.
    - **Resaltado desde la tarjeta:**
      - `pointerEnter`/`pointerLeave` en la tarjeta General;
      - `focus` en su "+": trazo y `opacity-40` en las demás;
      - pasar el foco de "−" a "+" (`blur` con `relatedTarget` dentro de la tarjeta) lo mantiene, y el `blur` hacia fuera lo quita;
      - Mesa no se resalta.
    - **Stepper en línea:**
      - "+" ×2 en VIP: valor 2, el indicador sigue en el sub-paso 1, insignia "2" en la etiqueta del mapa, "2 × VIP" en el resumen y `href` `…&vip=2`;
      - "−" lo baja a 1;
      - combinado con 3 en General y 2 butacas de Norte (`norte-A-1` y `norte-B-1`): 3 líneas en el orden del mapa y `href` `/checkout?evento=evento-prueba&vip=2&general=3&norte=2&asientos=norte-A-1%2Cnorte-B-1`.
    - **Límite:**
      - 10 entre VIP y General: todos los "+" con `aria-disabled="true"`, y el `status` dice "Llegaste al máximo de 10 entradas por compra.";
      - "Elegir butacas de Tribuna Norte" sigue habilitado y abre "0 de 0 butacas".
    - **Numerada:**
      - el botón abre el plano, con el foco en el h3, el indicador y el contador;
      - sin butacas no hay "Agregar otra zona";
      - tras elegir una butaca aparece; al pulsarlo vuelve el sub-paso 1 y el foco está en `zoneCard("Tribuna Norte")`, con `data-highlighted="true"`, "1 butaca elegida" y el botón "Cambiar butacas de Tribuna Norte".
    - **"Quitar" en "Tu compra":**
      - quitar VIP deja su stepper en 0, borra su línea y lleva el foco al "Quitar" de la línea siguiente;
      - quitar la última lleva el foco al texto vacío;
      - quitar Tribuna Norte con su plano abierto desmarca sus butacas y el contador pasa a "0 de …";
      - en la hoja móvil ("Ver resumen de la compra") también están los "Quitar".
    - **Agotada:** la tarjeta Mesa no tiene controles y su forma no reacciona.
    - **F6 adaptados:**
      - con `initialSelection`, el stepper de VIP en 2 y la tarjeta Norte con "2 butacas elegidas";
      - con `initialZoneId="vip"`: panel en 0 y sin "Agregar otra zona"; "+" lo muestra; al pulsarlo, vuelve al sub-paso 1 con el foco en `zoneCard("VIP")` y su stepper en 1;
      - `PreselectedTicketSelection` con `zona=mesa`/`zona=xx`: `mapImage()` y la lista presentes.
    - **Se conservan sin cambios:** los casos de `ZoneQuantityPanel` (con `initialZoneId`) y de `BestSeatsPicker` ("Quitar/Agregar una butaca", límites y deshabilitados), que prueban que la extracción a `QuantityStepper` no cambia el comportamiento.
  - **Sin tests propios:** `QuantityStepper`, `VenueMapView`, `ZoneCards`, `PurchaseSummary` y `MobilePurchaseBar` son componentes del módulo (no de `components/shared/`) y se cubren con `TicketSelection.test.tsx`, como en F3–F6. La navegación real, el checkout, los 3 anchos y la ausencia de scroll horizontal se cubren con el Playwright del reviewer (criterios de F7).
- **Sin tests propios:**
  - `VenueMapView`, `ZoneCards`, `ZoneStepHeader`, `ZoneQuantityPanel`, `SeatLegend`, `SeatTooltip`, `BestSeatsPicker`, `SeatPlanMinimap`, `PurchaseSummary` y `MobilePurchaseBar`: son de `modules/seating/components/` (no de `components/shared/`) y se cubren con `TicketSelection.test` donde tienen comportamiento;
  - el nivel de detalle y el zoom animado dependen del layout y no se prueban en jsdom (la librería está mockeada): se cubren la función pura (`getSeatDetailLevel`) y las capturas a 375 y 1440 del reviewer;
  - mocks y tipos;
  - `app/(purchase)/eventos/[slug]/entradas/page.tsx` e `index.ts` (F6). La navegación real desde el aside, el prerenderizado y la hidratación con `?zona=` se cubren con el Playwright del reviewer (criterios de F6).

## Plan de tareas
**Coordinación:**
- Se implementa **después de la Fase 5 de `docs/specs/seating-ticket-selection.md`**, que deja `lib/hash.ts`, `modules/seating/seats.ts`, `getGeneratedSeatStatus` por extraer sobre `mixHash`, y el test de `labelPos` que aquí se adapta (decisión 14).
- No se ejecuta a la vez que ninguna fase de otra spec que toque `modules/seating/**` o `modules/events/data/events.mock.ts`.
- `events-ui-refresh.md` ya declara que este evento lo añade seating y que allí no se toca el mock.
- `checkout-mock-payment.md` cita como ejemplo "L-9 y M-8 de Tribuna Oriente". Con las filas A–J de esta spec (decisión 6), esas butacas no existen. Su criterio admite "cualquier zona numerada existente", así que no la bloquea; ver Preguntas abiertas.
- Los developers en paralelo verifican con `npx vitest run <sus archivos>` y `npx eslint <sus archivos>`; el build lo ejecuta el reviewer al final de cada fase.

### Fase 1. Dominio y datos del estadio (5 tareas, 15 archivos)
- [x] T1. Evento "Festival Vive Latino Lima" en el mock (requisito 1) y ajustes de `events.service.test.ts` (requisito 2). Verificar `npx vitest run modules/events modules/organizer modules/tickets modules/checkout`.
  - Archivos: `modules/events/data/events.mock.ts`, `modules/events/services/events.service.test.ts`.
  - Depende de: Fase 5 de la spec base.
  - Secuencial (base, archivos de otro módulo).
- [x] T2. Geometría de sectores anulares y campos opcionales del schema, con tests.
  - Archivos: `modules/seating/utils/annularSector.ts`, `modules/seating/utils/annularSector.test.ts`, `modules/seating/schemas/seating.schema.ts`, `modules/seating/schemas/seating.schema.test.ts`, `modules/seating/types/seating.types.ts`.
  - Depende de: T1 (orden de la fase).
  - Secuencial (base de T3–T5).
- [x] T3. Generador de butacas en arco y extracción de `getGeneratedSeatStatus`, con test.
  - Archivos: `modules/seating/utils/arcSeatRows.ts`, `modules/seating/utils/arcSeatRows.test.ts`, `modules/seating/utils/seatRows.ts`.
  - Depende de: T2.
  - En paralelo con T4.
- [x] T4. Navegación ↑/↓ por distancia y "mejor asiento" por índice, con tests ampliados.
  - Archivos: `modules/seating/utils/seatNavigation.ts`, `modules/seating/utils/seatNavigation.test.ts`, `modules/seating/utils/bestSeats.ts`, `modules/seating/utils/bestSeats.test.ts`.
  - Depende de: T2. Sus tests nuevos usan `generateArcSeatRows`, así que el caso en arco se añade cuando T3 termine. Si T4 se ejecuta en paralelo, el developer de T4 deja ese caso para el final y lo ejecuta tras T3.
  - En paralelo con T3.
- [x] T5. Layout mock del estadio y tests del service (invariantes, tonos, 4 mapas, adaptación del test de rectángulos).
  - Archivos: `modules/seating/data/venueMaps.mock.ts`, `modules/seating/services/seating.service.test.ts`.
  - Depende de: T1, T3 y T4.
  - Secuencial.

**Coordinación del rediseño (Fases 2–6):**
- **Orden:** F2 → F3 → F4 → F5 (hechas), una fase por sesión. F6 depende de F3 (tarjetas con "n elegidas", insignias del mapa y hook con `closeZone`) y, por la enmienda del 2026-10-04, de que esté **cerrada la Fase 1 de `design-alignment-purchase-flow.md`** (sus T4 y T5: la página en `app/(purchase)/…` y `ticket-selection.md`, que F6 también toca). Nunca va en la misma sesión que otra fase que toque `TicketSelection.test.tsx`, `useSeatSelection.ts`, `ticket-selection.md`, `event-detail.md` o la página `/entradas`.
- **Sin dependencias nuevas:** ninguna fase toca `package.json`, `app/layout.tsx`, `app/providers.tsx`, `app/globals.css`, `lib/`, `components/ui/` ni `components/shared/`. Lo único compartido son el hook y `TicketSelection.test.tsx`, que van en tareas secuenciales.
- **Verificación visual del reviewer:** capturas a 375 y 1440 de `/eventos/festival-vive-latino-lima/entradas` y `/eventos/noche-de-sintetizadores-lima/entradas` (sub-paso 1, sub-paso 2 de pie y sub-paso 2 numerado), comparadas con las capturas del usuario (paso 1: la que describe el pedido 2; paso 2: `images/15.png`).
- **F6 y checkout:** F6 es independiente de la Fase 7 de `checkout-mock-payment.md`, que genera el enlace. El criterio de ida y vuelta necesita las dos.

### Fase 2. Escala de tonos por precio (2 tareas, 5 archivos)
- [x] T1. 5 tonos en `getZoneTones` y `ZONE_TONE_CLASSES` (`label` con clase SVG + HTML), con tests (requisito 9).
  - Archivos: `modules/seating/utils/zoneTone.ts`, `modules/seating/utils/zoneTone.test.ts`, `modules/seating/types/seating.types.ts`.
  - Depende de: Fase 1.
  - Secuencial (base).
- [x] T2. Tonos del festival en el test del service y tabla "Tonos por precio" del diseño de página.
  - Archivos: `modules/seating/services/seating.service.test.ts`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T1.
  - Secuencial.

### Fase 3. Sub-paso 1 con el diseño de la captura, sub-paso 2 y resumen móvil (5 tareas, 15 archivos)
- [x] T1. `parseViewBox` con test; hook con `closeZone` y `selectZone` que ignora las agotadas, con test (requisito 19).
  - Archivos: `modules/seating/utils/viewBox.ts`, `modules/seating/utils/viewBox.test.ts`, `modules/seating/hooks/useSeatSelection.ts`, `modules/seating/hooks/useSeatSelection.test.ts`.
  - Depende de: Fase 2.
  - Secuencial (base).
- [x] T2. Mapa con etiquetas HTML, luces, separación, resaltado e insignias, y tarjetas de zona (requisitos 12 y 13).
  - Archivos: `modules/seating/components/VenueMapView.tsx`, `modules/seating/components/ZoneCards.tsx`.
  - Depende de: T1.
  - En paralelo con T3 y T4.
- [x] T3. Cabecera de zona, panel de cantidad con subtotal, `PurchaseSummaryContent` y barra móvil con hoja inferior (requisitos 14, 15, 17 y 18).
  - Archivos: `modules/seating/components/ZoneStepHeader.tsx`, `modules/seating/components/ZoneQuantityPanel.tsx`, `modules/seating/components/PurchaseSummary.tsx`, `modules/seating/components/MobilePurchaseBar.tsx`.
  - Depende de: T1 (orden de la fase).
  - En paralelo con T2 y T4.
- [x] T4. `SeatPlan` como sub-paso 2: sin `Card` ni h2, ayuda arriba, `headingId` externo y `parseViewBox` (requisito 16).
  - Archivos: `modules/seating/components/SeatPlan.tsx`.
  - Depende de: T1.
  - En paralelo con T2 y T3.
- [x] T5. `TicketSelection` con la tarjeta única, sub-pasos, foco, resaltado y transición; test reescrito; eliminar `ZoneList`; diseño de página (requisitos 10 y 11).
  - Archivos: `modules/seating/components/TicketSelection.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `modules/seating/components/ZoneList.tsx` (se elimina), `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T2, T3 y T4.
  - Secuencial.

### Fase 4. Plano de butacas renovado (5 tareas, 11 archivos)
- [x] T1. `pickBestSeats(zoneId, count)` que devuelve el bloque, con tests (requisito 26).
  - Archivos: `modules/seating/hooks/useSeatSelection.ts`, `modules/seating/hooks/useSeatSelection.test.ts`.
  - Depende de: Fase 3.
  - En paralelo con T2 y T3.
- [x] T2. `getPlanFit` y `getSeatDetailLevel` con test; `SeatShape` v2 y `SeatLegend` nueva; `SeatTooltip` (requisitos 21, 23 y 24).
  - Archivos: `modules/seating/utils/planViewport.ts`, `modules/seating/utils/planViewport.test.ts`, `modules/seating/components/SeatLegend.tsx`, `modules/seating/components/SeatTooltip.tsx`.
  - Depende de: Fase 3.
  - En paralelo con T1 y T3.
- [x] T3. `BestSeatsPicker` (requisito 26).
  - Archivos: `modules/seating/components/BestSeatsPicker.tsx`.
  - Depende de: Fase 3.
  - En paralelo con T1 y T2.
- [x] T4. `SeatPlan`: nivel de detalle, tooltip, letras en los dos extremos, zoom superpuesto desde `sm`, leyenda, bandeja con "Mejores butacas" y zoom a las elegidas (requisitos 22, 25, 26 y 27).
  - Archivos: `modules/seating/components/SeatPlan.tsx`.
  - Depende de: T1, T2 y T3.
  - Secuencial.
- [x] T5. `TicketSelection` (`seatLimit`, `selectedInZone`, `onPickBestSeats`), test ampliado y diseño de página.
  - Archivos: `modules/seating/components/TicketSelection.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T4.
  - Secuencial. El reviewer comprueba con capturas a 768 y 1440 que los controles superpuestos no tapan butacas.

### Fase 5. Plano curvo con contexto y minimapa (4 tareas, 6 archivos; T3 comparte archivos con T0, T1 y T2)
- [x] T0. Letras de fila a 13 unidades (requisito 25 enmendado, decisión 30): `ROW_LABEL_FONT_SIZE = 13` y el comentario de geometría de `SeatPlan.tsx` (13 unidades ≈ 10 px a 375 px); sección "Plano (SVG)" del diseño de página (24 → 13 unidades).
  - Archivos: `modules/seating/components/SeatPlan.tsx`, `design-system/ticketera/pages/ticket-selection.md`.
  - No se modifican (posiciones sin cambios, decisión 30): `modules/seating/utils/arcSeatRows.ts`, `modules/seating/utils/arcSeatRows.test.ts` (el desplazamiento de 0.8 pitch se mantiene) ni `modules/seating/components/TicketSelection.test.tsx` (ningún test depende del tamaño de letra).
  - Depende de: Fase 4.
  - En paralelo con T1 (archivos disjuntos). Verificar `npx vitest run modules/seating` y `npx eslint modules/seating/components/SeatPlan.tsx`.
- [x] T1. `getVisiblePlanRect` y `toVenueRect`, con test (requisito 31).
  - Archivos: `modules/seating/utils/planViewport.ts`, `modules/seating/utils/planViewport.test.ts`.
  - Depende de: Fase 4.
  - Secuencial respecto a T2 (es su base); en paralelo con T0.
- [x] T2. Minimapa (requisito 30).
  - Archivos: `modules/seating/components/SeatPlanMinimap.tsx`.
  - Depende de: T1.
  - Secuencial.
- [x] T3. Fondo del estadio, lienzo apaisado desde `sm` y minimapa superpuesto o en la barra en `SeatPlan`; test ampliado; diseño de página (requisitos 28 y 29).
  - Archivos: `modules/seating/components/SeatPlan.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `design-system/ticketera/pages/ticket-selection.md`.
  - *Enmienda (registrada el 2026-10-04; implementada y aprobada por el reviewer):* en los ciclos de revisión de T3 se tocaron además `modules/seating/components/SeatPlanMinimap.tsx` (prop `planRef`, medidas con `getComputedStyle`, `@2xl:w-28`; requisito 30), `modules/seating/utils/planViewport.ts` y `modules/seating/utils/planViewport.test.ts` (`insetBottom` en `getVisiblePlanRect`; requisito 31). En `SeatPlan.tsx`: `@container`, `canOverlayMinimap` con `useLayoutEffect` + `ResizeObserver`, `data-placement` y la franja `sm:@max-2xl:pb-16` en arco (requisito 29, decisión 12).
  - Depende de: T0 (comparte `SeatPlan.tsx` y `ticket-selection.md`) y T2.
  - Secuencial.

### Fase 6. Precarga de la selección y entrada por zona desde la URL (5 tareas, 15 archivos)
**Coordinación:**
- Antigua Fase 4, ampliada con el pedido 5 (entrada por zona desde el aside del detalle).
- Depende de la **Fase 3** y de que esté **cerrada la Fase 1 de `design-alignment-purchase-flow.md`** (T4 mueve la página a `app/(purchase)/…`; T5 elimina `PurchaseStepper` y reescribe `ticket-selection.md`). No va en la misma sesión que ninguna otra fase que toque esos archivos.
- **Paralelismo:** T1 ∥ T2 (base); después T3 ∥ T4; T5 al final (puede solaparse con T3, sus archivos son disjuntos). Ninguna tarea toca `package.json`, `lib/`, `components/ui/` ni `components/shared/`. El único archivo compartido del módulo, `index.ts`, va en T5, secuencial, porque exporta un componente que crea T4 (exportarlo antes rompería la compilación de las tareas en paralelo).
- Los developers verifican con `npx vitest run <sus archivos>` y `npx eslint <sus archivos>`. El reviewer ejecuta al final `npx vitest run`, `npm run lint`, `npm run build` (comprueba ● en `/eventos/[slug]/entradas`) y el Playwright de los criterios de F6 a 375 y 1440 contra `npm run start`.

- [x] T1. Lectura y enlaces de la URL (puras), con tests: `parseSeatingPreselection` (requisito 32, ida y vuelta con `buildSeatingCheckoutHref`) y `buildZoneEntryHref` + `parseInitialZoneId` (requisito 39, ida y vuelta).
  - Archivos: `modules/seating/utils/selectionSummary.ts`, `modules/seating/utils/selectionSummary.test.ts`, `modules/seating/utils/zoneParam.ts` (nuevo), `modules/seating/utils/zoneParam.test.ts` (nuevo).
  - Depende de: Fase 3 y Fase 1 de `design-alignment-purchase-flow.md` cerrada.
  - Secuencial respecto a T3–T5 (es su base); en paralelo con T2.
- [x] T2. Estado inicial en `useSeatSelection` (`initial.selection` e `initial.zoneId`), con tests (requisito 33).
  - Archivos: `modules/seating/hooks/useSeatSelection.ts`, `modules/seating/hooks/useSeatSelection.test.ts`.
  - Depende de: Fase 3.
  - En paralelo con T1.
- [x] T3. `ZonePricesCard` con filas enlace por zona y botón "Ver mapa de zonas", con su test nuevo; "Aside con mapa" de la página de diseño del detalle (requisito 38, decisión 31).
  - Archivos: `modules/seating/components/ZonePricesCard.tsx`, `modules/seating/components/ZonePricesCard.test.tsx` (nuevo), `design-system/ticketera/pages/event-detail.md`.
  - Depende de: T1 (`buildZoneEntryHref`).
  - En paralelo con T4 y T5.
- [x] T4. `TicketSelection` con `initialSelection` e `initialZoneId`, y `PreselectedTicketSelection` nuevo, con tests (requisitos 34 y 35).
  - Archivos: `modules/seating/components/TicketSelection.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `modules/seating/components/PreselectedTicketSelection.tsx` (nuevo).
  - Depende de: T1 y T2.
  - En paralelo con T3.
- [x] T5. Barrel, página con `Suspense` y página de diseño de la selección (secciones "Precarga" y "Entrada por zona") (requisitos 36 y 37).
  - Archivos: `modules/seating/index.ts`, `app/(purchase)/eventos/[slug]/entradas/page.tsx`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T4.
  - Secuencial (archivo compartido `index.ts`); puede coincidir con T3 (archivos disjuntos). El reviewer verifica en `npm run build` que las 4 rutas siguen prerenderizadas (●).

### Fase 7. Compra combinada y mapa no interactivo (5 tareas, 12 archivos)
**Coordinación:**
- **Depende de la Fase 6** (cerrada). No va en la misma sesión que otra fase que toque `modules/seating/components/**`, `useSeatSelection.ts` o `design-system/ticketera/pages/ticket-selection.md`.
- **`seating-all-venue-maps.md` (Fase 1b en curso):**
  - toca `modules/seating/services/*`, `modules/events/services/*` y `lib/db/**`, sin solape de archivos con esta fase;
  - el único archivo compartido es `ticket-selection.md`, que allí editan las tareas de cierre (F1 T4, F2 T5 y F4 T3). La T5 de esta fase no coincide en la misma sesión con ninguna de ellas;
  - sus criterios de Playwright que usan `svg[role="group"]` o el Tab en el mapa se leen como indica la decisión 41 (`svg[role="img"]`, mismo `aria-label`). `elementFromPoint` sobre las formas sigue funcionando.
- **Mapas rectangulares en la máquina del usuario:** si su BD local no tiene la geometría curva, verá los mapas rectangulares de antes ("los cuadrados azules"). Lo arregla resembrar según la Fase 1b de `seating-all-venue-maps.md`, no esta fase, que es igual con cualquier geometría. El Playwright del reviewer usa la BD de desarrollo sembrada (mapas curvos).
- **Sin archivos compartidos globales:** ninguna tarea toca `package.json`, `app/`, `lib/`, `components/ui/`, `components/shared/` ni `modules/seating/index.ts`.
- **Paralelismo:** T1, T2 y T4 en paralelo (archivos disjuntos); T3 tras T2 (usa `QuantityStepper`) y en paralelo con T1 y T4; T5 al final, secuencial.
  - Mientras no termine T5, `TicketSelection.tsx` no compila con las props nuevas de T3 y T4 y `TicketSelection.test.tsx` falla: es lo esperado. Los developers de T1–T4 verifican solo con `npx vitest run <sus tests>` (T1) y `npx eslint <sus archivos>`.
  - T5 y el reviewer ejecutan `npx vitest run`, `npm run lint` y `npm run build`, y el reviewer, el Playwright de F7 a 375, 768 y 1440 contra `npm run start`.

- [ ] T1. Hook: `changeQuantity` sin activar la zona y `clearZone`, con tests (requisito 44, decisiones 36 y 37).
  - Archivos: `modules/seating/hooks/useSeatSelection.ts`, `modules/seating/hooks/useSeatSelection.test.ts`.
  - Depende de: Fase 6.
  - En paralelo con T2 y T4. Verificar `npx vitest run modules/seating/hooks`.
- [ ] T2. `QuantityStepper` y su uso en `ZoneQuantityPanel` y `BestSeatsPicker`, sin cambios visibles (requisito 41, decisión 40).
  - Archivos: `modules/seating/components/QuantityStepper.tsx` (nuevo), `modules/seating/components/ZoneQuantityPanel.tsx`, `modules/seating/components/BestSeatsPicker.tsx`.
  - Depende de: Fase 6.
  - En paralelo con T1 y T4. Es la base de T3.
- [ ] T3. Mapa como ilustración y tarjetas con el control en línea (requisitos 40 y 42, decisiones 34 y 38).
  - Archivos: `modules/seating/components/VenueMapView.tsx`, `modules/seating/components/ZoneCards.tsx`.
  - Depende de: T2.
  - En paralelo con T1 y T4.
- [ ] T4. "Quitar" por línea en "Tu compra" y en la hoja móvil, con el foco (requisito 45, decisión 36).
  - Archivos: `modules/seating/components/PurchaseSummary.tsx`, `modules/seating/components/MobilePurchaseBar.tsx`.
  - Depende de: Fase 6.
  - En paralelo con T1, T2 y T3.
- [ ] T5. `TicketSelection` (indicador, props nuevas, pie "Agregar otra zona" y `onRemoveLine`), test reescrito y página de diseño (requisitos 43, 46 y 47).
  - Archivos: `modules/seating/components/TicketSelection.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T1, T2, T3 y T4.
  - Secuencial. Verificar `npx vitest run`, `npm run lint` y `npm run build`.

## Preguntas abiertas
1. **Tribuna Norte de pie** (decisión 4). La captura no deja ver su tarjeta. Se decidió "General · sin butaca" por la convención de tribuna popular y porque un plano del arco exterior no cumple los tamaños mínimos de butaca. ¿Se acepta, o debe ser numerada aunque haga falta otro tipo de plano (por tramos, o empezando con zoom)? **Dato nuevo:** la captura del resumen de checkout que compartió el usuario muestra "5 × Tribuna Norte" con "Fila B · 13 · Fila C · 6 · Fila D · 6 · Fila E · 18 · Fila J · 13". Es decir, Norte numerada, con filas hasta la J y al menos 18 butacas por fila. Eso apunta a la segunda opción y choca con el límite de ≤ 10 butacas por fila.
2. **Filas A–J en lugar de A–M** (decisión 6). Con 13 filas, el plano de las tribunas laterales supera 400 de ancho y las butacas bajan de 24 px a 375 px. Consecuencia: el ejemplo "L-9 / M-8 de Tribuna Oriente" de `checkout-mock-payment.md` no existe. ¿Se acepta A–J, o se prefiere relajar la invariante (butacas < 24 px con el plano entero, y se elige con zoom)?
3. **"2 de 6 butacas"** (decisión 11). Se muestra "n de m", con m = lo que cabe en el límite de 10 por compra. ¿O se quiere introducir un límite de 6 por zona (cambiaría la decisión 5 de la spec base, el hook y el checkout)?
4. ~~**Quinto tono** (decisión 9).~~ **Resuelta por la decisión 28:** la escala de 5 azules de la captura del paso 1 da a Oriente `tier-4` y a Norte `tier-5`.
5. **Formato compacto en "Tu compra"** ("Fila L · 9 · Fila M · 8", como la captura). `checkout-mock-payment.md` lo define en `modules/checkout/utils/summaryFormat.ts` (`formatCompactSeats`), y `seating` no puede importarlo sin crear un ciclo (`checkout` → `seating`). ¿Se sube esa función a `lib/` en una enmienda posterior y se usa en ambos resúmenes, o "Tu compra" mantiene "Fila L · Asiento 9, …"?
6. **Fecha del evento:** `2026-10-05`, a 2 días de hoy (2026-10-03). Al pasar la fecha, el mock no filtra eventos pasados, así que seguirá listado y comprable. ¿Se prefiere `2027-10-04` (también lunes) para que la demo no caduque?
7. **Datos plausibles** (requisito 1): segundo párrafo de la descripción (la invariante exige 2), dirección, organizador ficticio, edad mínima 0, `featured: true` e imagen de Unsplash sin verificar. ¿Algún valor real que deba usarse?
8. **Sub-pasos y botón "Atrás" del navegador:** el sub-paso no va en la URL, así que "Atrás" sale de `/entradas` aunque se esté en el sub-paso 2. Desde la enmienda de F6, `?zona=<id>` existe como parámetro de **entrada** (decisiones 32 y 33), pero la pantalla no lo actualiza al abrir o cerrar zonas. ¿Se quiere que lo haga (cada zona abierta como entrada del historial, con "Atrás" volviendo al sub-paso 1)? Sería otra ampliación.
9. **Colores de las butacas** (decisión 10). Ya se adoptan "Elegida" / "Ocupada" y el lavanda de la captura del paso 2, traducido a `primary/30` con borde `primary`, igual en todas las zonas. Las elegidas van en navy (en la captura, casi negras). ¿Se acepta navy, o se prefiere el negro literal (no es un token de UI en MASTER)?
10. **Sub-paso al volver con selección desde checkout (F6):** sin `zona`, la pantalla abre en el sub-paso 1 (zonas con "n elegidas" y "Tu compra" completo; decisión 15). ¿O prefieres abrir directamente el sub-paso 2 de la única zona con selección, cuando solo hay una?
11. **Selección precargada que ya no es válida (F6):** las butacas que estén ocupadas o no existan se descartan sin aviso, así que el total puede ser menor que el del pedido. ¿Se quiere un aviso del tipo "Algunas butacas ya no están disponibles", o basta con que se vea en "Tu compra"? (Con los datos mock deterministas no debería pasar al volver desde checkout.)
12. **Precios sin decimales** ("S/ 330" en las capturas). MASTER §10 fija `S/ 330.00` (`formatEventPrice`) en toda la app, también en "Tu compra" y en checkout. ¿Se mantiene, o se cambia el formato global a "S/ 330" cuando no hay céntimos? Sería una enmienda de MASTER y de `formatEventPrice`, fuera de esta spec.
13. **Precio en naranja** en las tarjetas de zona de la captura. MASTER reserva el color de marca para la acción y pone los precios en `text-foreground`, y la paleta Mentec no tiene naranja (`--warning` es "Últimas entradas"). Se usa `text-foreground`. ¿Se quiere el precio en `text-primary-strong`?
14. **Arco punteado decorativo** alrededor del estadio (captura del paso 1). Necesita un dato que el layout no tiene (radio y ángulos del arco), así que sería un campo opcional nuevo en el schema y en el mock de la Fase 1. ¿Se añade en una enmienda posterior o se omite?
15. **Temporizador de reserva** ("Tus entradas están reservadas por 10:00", como Ticketmaster, Teleticket o Joinnus). Sin backend no hay reserva real: un contador ficticio sería engañoso. ¿Se omite hasta tener reservas (decisión 29), o se quiere un aviso informativo sin cuenta atrás?
16. **Butaca suelta:** las ticketeras de referencia (Seats.io) impiden dejar una butaca libre aislada entre dos ocupadas o elegidas. ¿Se quiere esa regla? Cambiaría `toggleSeat` y los avisos.
17. **¿Servicio de pago con datos en terceros?** La recomendación es seguir con el SVG propio mejorado (decisión 22). Si se quiere una librería completa con reservas reales, las opciones viables son Seats.io (madura, pago por butaca reservada, plan gratuito limitado según su web, no verificado) o SeatLayer (0.x; 100 créditos gratis al mes y luego US$ 0.10–0.05 por butaca vendida, según su README). Las dos guardan los planos, la disponibilidad y las reservas en sus servidores y exigen backend para confirmar. ¿Aceptas un servicio así? Si es que sí, ¿cuál? Se especificaría como enmienda (decisión 29), verificable solo en tu máquina (el sandbox bloquea sus dominios).
18. **Cantidad inicial de "Mejores butacas":** 2 (decisión 25). ¿O 1?
19. **Referencias sin verificar en vivo:** el proxy bloqueó Ticketmaster, SeatGeek, Seats.io, Joinnus y Teleticket, así que los patrones salen del conocimiento de esos productos (ver "Investigación y diagnóstico"). Si tienes capturas del paso de butacas de Joinnus o Ticketmaster que quieras imitar en algo concreto (p. ej. la bandeja de selección o el tooltip), compártelas.
20. **Luces del escenario:** en las capturas son amarillas. Se usan en cian Mentec (`highlight`), porque el amarillo cercano (`warning`) significa "Últimas entradas". ¿Se acepta?
21. **Letras de fila por debajo de 12 px en móvil** (decisión 30). A 13 unidades, con el plano entero a la vista a 375 px, la letra mide ~10 px, por debajo del mínimo de MASTER §3 ("nada por debajo de 12px"). Se acepta como excepción por ser decorativa (`aria-hidden`; la fila está en el `aria-label` y en el tooltip). ¿Se acepta, o se prefiere un tamaño mayor solo por debajo de `sm` (p. ej. 16 unidades ≈ 12.5 px), a costa de que en móvil la letra compita algo más con la butaca?
22. **`?zona=` de una zona de pie (F7, decisión 39).** Desde el aside del detalle, "VIP" sigue abriendo el panel de cantidad de VIP (vista específica, pedido 5), ahora con "Agregar otra zona" para combinar. La alternativa es abrir el sub-paso 1 con la tarjeta de VIP resaltada: un solo lugar para elegir cantidades, pero en móvil la tarjeta queda debajo del mapa y habría que desplazar la página hasta ella. ¿Se mantiene el panel?
23. **"Paso 1 de 2" sin zonas numeradas comprables (F7).** En mapas donde todas las zonas comprables son de pie (p. ej. `risas-sin-filtro`, con Mesa agotada), la compra termina en el sub-paso 1 y el "Paso 2 de 2" solo existe con `?zona=`. ¿Se deja "Paso 1 de 2 · Elige tus zonas" en todos los mapas (decidido, por coherencia), o en esos mapas se muestra solo "Elige tus zonas"?
