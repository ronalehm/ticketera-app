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
  - Fase 6: precarga desde la URL (la antigua Fase 4, con el mismo alcance).

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
    - minimapa superpuesto arriba a la izquierda (desde `sm`) o en la barra superior (móvil);
    - utilidad de "vista visible".
  - **Fase 6. Precarga de la selección desde la URL** (la antigua Fase 4, mismo alcance; resuelve la pregunta abierta 5 de `checkout-mock-payment.md`):
    - al volver desde "Cambiar entradas" de `/checkout` (`/eventos/<slug>/entradas?<ticketTypeId>=<qty>…&asientos=<ids>`, que construye la Fase 7 de checkout), la pantalla abre con esas cantidades y butacas ya elegidas;
    - se ignora lo que no sea válido (butacas ocupadas o inexistentes, zonas agotadas, valores mal formados);
    - función pura de lectura, estado inicial en el hook, envoltorio cliente con `useSearchParams` y `Suspense` en la página.
- No incluye:
  - Cambios en `PurchaseStepper` (contrato A). La compra sigue teniendo 3 pasos.
  - Sub-pasos en la URL ni en el historial del navegador. "Atrás" del navegador sale de `/entradas`, como hoy.
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
  - Cambios en el detalle `/eventos/[slug]`, en `ZonePricesCard`/`MobileBuyBar`, en `/checkout` o en otros módulos, salvo `modules/events/data/events.mock.ts` y `modules/events/services/events.service.test.ts` (F1).
  - Reserva real de butacas, backend y persistencia (igual que la spec base).
  - (F6) Reflejar en la URL los cambios hechos en la pantalla, recordar la selección en el navegador o abrir directamente el sub-paso 2 de una zona: la precarga solo inicializa el estado y la pantalla abre en el sub-paso 1.
  - (F6) Cambios en `modules/checkout/**` o en el enlace "Cambiar entradas": son de `checkout-mock-payment.md` (Fase 7).

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
    - **Desde `sm` (≥ 640 px)** van superpuestos al lienzo, como en la captura del paso 2: los controles de zoom abajo a la derecha (F4) y el minimapa arriba a la izquierda (F5).
      - Con el plano entero a la vista no deben tapar butacas: el contenido transformado reserva su espacio con padding y, en F5, el lienzo apaisado deja margen lateral.
      - Con zoom, el paneo permite sacar las butacas de debajo.
    - **Por debajo de `sm`** el lienzo mide lo mismo que el plano, para mantener ≥ 24 px por butaca. Superpuestos taparían butacas (p. ej. `oriente-J-10`, en la esquina inferior derecha), así que van en una barra justo encima del lienzo: minimapa a la izquierda y zoom a la derecha.
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
15. **Precarga desde la URL sin perder el prerenderizado (Fase 6; antes Fase 4).** Donde abajo dice "Fase 2", léase la pantalla de la Fase 3 del rediseño. La página vive hoy en `app/(site)/eventos/[slug]/entradas/page.tsx`.
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
18. **Etiquetas del mapa en HTML, con tamaño fijo** (diagnóstico 2).
    - Van en una capa absoluta sobre el SVG, posicionadas en % del `viewBox`.
    - Miden `text-xs` (12 px) por debajo de `md` y `text-sm` (14 px) desde `md`, sin escalar con el ancho.
    - La píldora "Últimas entradas" solo aparece desde `md`: a 375 px no cabe en la banda de Campo General (~47 px de alto). En móvil, el estado sigue en la tarjeta de zona y en el `aria-label`.
19. **Resaltado sincronizado mapa ↔ tarjetas** (hover y foco).
    - En el mapa, la zona se delinea en navy y el resto se atenúa al 40 %. Su tarjeta toma el fondo de hover, y viceversa.
    - Es solo visual: no se anuncia ni cambia el estado. En táctil no hay hover.
    - Las zonas agotadas no se resaltan.
20. **Foco**, como en la Fase 2 original: al abrir una zona, al h3 de la zona; al volver con "Todas las zonas", a su tarjeta.
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
11. **Sub-pasos, foco, resaltado y transición** (decisiones 2, 19, 20 y 26):
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
12. **`VenueMapView`** (presentacional; sustituye al requisito 12 de la spec base). Objetivo: el mapa de la captura del paso 1.
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
13. **`ZoneCards`** (nuevo, presentacional). Objetivo: las tarjetas de la captura del paso 1.
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
15. **`ZoneQuantityPanel`** (nuevo, zona de pie abierta; patrón Joinnus):
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
      - el resto no cambia (incluido que `changeQuantity` activa la zona).
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
    - **Minimapa:**
      - desde `sm`, superpuesto con `sm:absolute sm:left-3 sm:top-3 sm:z-10`;
      - por debajo de `sm`, a la izquierda de la barra sobre el lienzo;
      - con el plano entero a la vista no tapa butacas (margen lateral del 16:10; se comprueba a 768 y 1440).
    - Las zonas en cuadrícula no cambian: sin fondo ni minimapa, con la proporción del plano.
30. **`SeatPlanMinimap`** (nuevo, `"use client"` por estar dentro de `TransformWrapper`):
    - SVG `aria-hidden` con el `viewBox` del mapa, en `h-auto w-24 rounded-lg bg-background/90 p-1 shadow-sm ring-1 ring-border md:w-28`.
    - **Contenido:**
      - escenario `fill-brand-navy`;
      - zonas `fill-secondary`;
      - zona abierta `fill-primary`;
      - recuadro de la vista actual: `fill-none stroke-foreground`, 2 px no escalables.
    - Lee la transformación con `useTransformEffect` (`state.scale`, `positionX`, `positionY`) y el tamaño de `instance.wrapperComponent`, y calcula el recuadro con `getVisiblePlanRect` y `toVenueRect`. Antes del primer efecto, el recuadro es el plano entero.
31. **`utils/planViewport.ts`** (se amplía; puro):
    - `getVisiblePlanRect({ planWidth, planHeight, viewportWidth, viewportHeight, scale, positionX, positionY }): Rect`:
      - usa `getPlanFit` (`u` y `off`);
      - `x = (−positionX/scale − offX)/u`, `y = (−positionY/scale − offY)/u`, `width = vw/(scale·u)`, `height = vh/(scale·u)`;
      - resultado recortado a [0, pw] × [0, ph].
    - `toVenueRect(rect, planTransform): Rect` = ((x − tx)/s, (y − ty)/s, w/s, h/s).

### Precarga desde la URL (Fase 6; antigua Fase 4)
32. **`parseSeatingPreselection(map, params)`** en `utils/selectionSummary.ts` (pura; decisión 15):
    - Firma: `(map: VenueMap, params: Pick<URLSearchParams, "getAll">) => SeatSelection`. `ReadonlyURLSearchParams` encaja.
    - `remaining = MAX_TICKETS_PER_ORDER`. Se recorren las zonas de `map.zones` en orden y se omiten las `sold-out`:
      - **de pie:** se toma `params.getAll(zone.ticketTypeId)` solo si hay exactamente un valor `^\d+$` entre 1 y `MAX_TICKETS_PER_ORDER`. Entonces `quantities[zone.id] = min(valor, remaining)`;
      - **numerada:** se toman los ids de `asientos` (solo si el parámetro aparece una vez; se separa por `,`) que cumplen `parseSeatId(id)?.zoneId === zone.id` y `resolveSeats(map, [id]) !== null`, sin repetidos, en el orden de la URL y hasta `remaining`. El parámetro `<ticketTypeId>` de la zona se ignora.
      - En cada paso se descuenta de `remaining` lo tomado.
    - Devuelve `{ quantities, seatIds }`: solo cantidades > 0, y `seatIds` en orden de zonas y, dentro de cada una, en el de la URL. Sin nada válido, `{ quantities: {}, seatIds: [] }`.
    - Ida y vuelta: para toda selección válida `s`, `parseSeatingPreselection(map, params de buildSeatingCheckoutHref(slug, map, s))` devuelve las mismas cantidades y los mismos asientos.
33. **`useSeatSelection(map, initialSelection?: SeatSelection)`:** el estado inicial es `{ selection: initialSelection ?? { quantities: {}, seatIds: [] }, notice: null }` (inicializador de `useState`). `activeZoneId` empieza en `null`. La selección inicial debe venir de `parseSeatingPreselection` (ya validada): el hook no la revalida. El resto de la firma y de las acciones no cambia.
34. **`TicketSelection`** gana `initialSelection?: SeatSelection` y la pasa al hook. Sin la prop, idéntico a la pantalla de las Fases 3–5.
35. **`components/PreselectedTicketSelection.tsx`** (nuevo, `"use client"`):
    - Props `{ map: VenueMap }`.
    - `const searchParams = useSearchParams()` (de `next/navigation`) y `<TicketSelection map={map} initialSelection={parseSeatingPreselection(map, searchParams)} />`.
    - Sin más lógica. Se exporta en `index.ts`.
36. **`app/(site)/eventos/[slug]/entradas/page.tsx`:** `<Suspense fallback={<TicketSelection map={map} />}><PreselectedTicketSelection map={map} /></Suspense>` en lugar de `<TicketSelection map={map} />`. No cambian `generateStaticParams`, `generateMetadata`, el stepper ni la franja del evento.
37. **Accesibilidad (F6):**
    - La precarga no mueve el foco ni anuncia nada: el indicador "Paso 1 de 2 · Elige una zona" es el de siempre.
    - Desde el primer render, las cantidades ya están en las tarjetas ("2 entradas elegidas"), en las insignias del mapa, en "Tu compra" y en la barra móvil.

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
  - está superpuesto arriba a la izquierda y muestra el estadio completo con Tribuna Oriente resaltada;
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
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta el fondo del estadio, el lienzo apaisado, el minimapa superpuesto desde `sm` (en la barra en móvil) y las letras de fila a 13 unidades.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 6. Precarga de la selección desde la URL
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
- [ ] Dados los mapas rectangulares (p. ej. `/eventos/noche-de-sintetizadores-lima/entradas?general=2&vip=1`), entonces se precargan igual, con total "S/ 910.00".
- [ ] Dado `/eventos/<slug>/entradas` sin parámetros, entonces la pantalla es idéntica a la de las Fases 3–5, y `npm run build` sigue generando las 4 rutas prerenderizadas (SSG, no dinámicas `ƒ`).
- [ ] Dado el código, entonces `TicketSelection` no lee la URL, `PreselectedTicketSelection` solo conecta `useSearchParams` con `parseSeatingPreselection` y la página no lee `searchParams`.
- [ ] Dado `design-system/ticketera/pages/ticket-selection.md`, entonces documenta la precarga (de dónde viene, el sub-paso inicial y la tolerancia).
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

## Diseño técnico

### Rutas (`app/`)
Sin cambios en F1–F5. La página vive hoy en `app/(site)/eventos/[slug]/entradas/page.tsx` y ya genera los slugs con `hasVenueMap`. `app/(site)/eventos/[slug]/page.tsx` tampoco cambia.

F6: `app/(site)/eventos/[slug]/entradas/page.tsx` envuelve `PreselectedTicketSelection` en `Suspense` (requisito 36). Sigue prerenderizada y no lee `searchParams`.

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
    - F6: `initialSelection?`.
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
  - `SeatPlanMinimap.tsx` (F5): props `viewBox`, `stage`, `zones` (solo `id`/`path`), `activeZoneId`, `planTransform`, `planWidth` y `planHeight`.
  - `PreselectedTicketSelection.tsx` (F6; `"use client"`). Va separado de `TicketSelection` porque `useSearchParams` obliga a un `Suspense` cuyo `fallback` es el propio `TicketSelection`, que por eso no puede leer la URL.
- **Se elimina** `ZoneList.tsx` (F3).
- **No se tocan:** `EventPurchaseStrip`, `SelectedSeatChips`, `SeatGridPreview` (hereda la forma de F4), `ZonePricesCard` (hereda los tonos de F2), `MobileBuyBar` ni `components/shared/PurchaseStepper.tsx`.

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
  - F5: `type Rect = { x: number; y: number; width: number; height: number }`, `getVisiblePlanRect` (sobre `getPlanFit`) y `toVenueRect` (requisito 31).

Hook `hooks/useSeatSelection.ts`:
- F3: `selectZone` ignora las zonas agotadas o inexistentes, y se añade `closeZone(): void`.
- F4: `pickBestSeats(zoneId: string, count: number): string[] | null` (requisito 26).
- F6: segundo parámetro opcional `initialSelection?: SeatSelection` (requisito 33).
- El resto de la firma no cambia.

Utils (F6): `utils/selectionSummary.ts` añade `parseSeatingPreselection(map: VenueMap, params: Pick<URLSearchParams, "getAll">): SeatSelection` (requisito 32). Reutiliza `parseSeatId`, `resolveSeats` y `MAX_TICKETS_PER_ORDER` (de `@/modules/events/purchase`, la entrada de la que el archivo ya importa `buildCheckoutHref`).

Datos `data/venueMaps.mock.ts` (F1): exporta `STADIUM_CENTER` y `VIVE_LATINO_SECTORS: Record<"stage" | "campo-vip" | "campo-general" | "occidente" | "oriente" | "norte", AnnularSector>`, y añade el layout del requisito 7 construido con `getAnnularSectorPath`, `getArcPoints` y `generateArcSeatRows`.

Service: sin cambios de código. `getVenueMapBySlug`, `getVenueMapForEvent` y `hasVenueMap` cubren el evento nuevo con los datos.

`index.ts` y `seats.ts`: sin cambios en F1–F5. F6: `index.ts` exporta `PreselectedTicketSelection`.

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
- **Precarga (F6):** entrada `/eventos/<slug>/entradas?<ticketTypeId>=<qty>…&asientos=<id>,<id>` (contrato C sin `evento`; la genera `buildChangeTicketsHref` de checkout, Fase 7).
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
- F6: `parseSeatId`, `resolveSeats` y `buildSeatingCheckoutHref` (para el test de ida y vuelta), `MAX_TICKETS_PER_ORDER`, `useSearchParams` + `Suspense` (documentación de Next 16). Es el mismo patrón que `PreselectedTicketSelector` de `checkout-mock-payment.md` (Fase 7). Sin dependencias nuevas.

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
    - `toVenueRect` deshace `planTransform`.
  - `modules/seating/components/TicketSelection.test.tsx` (se amplía). Con una zona fixture con `planTransform`:
    - se pinta el minimapa (`svg[aria-hidden]` con el `path` de la zona en `fill-primary`);
    - el fondo tiene la zona abierta en `fill-accent`;
    - hay 2 letras por fila en los puntos de `getRowEdgeLabelPoints`;
    - no aparece la barra "ESCENARIO" de cuadrícula;
    - una zona sin `planTransform` no tiene minimapa ni fondo.
- **F6:**
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
- **Sin tests propios:**
  - `VenueMapView`, `ZoneCards`, `ZoneStepHeader`, `ZoneQuantityPanel`, `SeatLegend`, `SeatTooltip`, `BestSeatsPicker`, `SeatPlanMinimap`, `PurchaseSummary` y `MobilePurchaseBar`: son de `modules/seating/components/` (no de `components/shared/`) y se cubren con `TicketSelection.test` donde tienen comportamiento;
  - el nivel de detalle y el zoom animado dependen del layout y no se prueban en jsdom (la librería está mockeada): se cubren la función pura (`getSeatDetailLevel`) y las capturas a 375 y 1440 del reviewer;
  - mocks y tipos;
  - `app/(site)/eventos/[slug]/entradas/page.tsx` e `index.ts` (F6).

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
- **Orden:** F2 → F3 → F4 → F5, una fase por sesión. F6 depende solo de F3 (tarjetas con "n elegidas", insignias del mapa y hook con `closeZone`). Puede ir antes o después de F4/F5, pero nunca en la misma sesión que otra fase que toque `TicketSelection.test.tsx`, `useSeatSelection.ts` o `ticket-selection.md`.
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

### Fase 5. Plano curvo con contexto y minimapa (4 tareas, 6 archivos; T0 y T3 comparten 2)
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
  - Depende de: T0 (comparte `SeatPlan.tsx` y `ticket-selection.md`) y T2.
  - Secuencial.

### Fase 6. Precarga de la selección desde la URL (4 tareas, 10 archivos)
**Coordinación:**
- Antigua Fase 4, con el mismo alcance.
- Depende de la **Fase 3**. No depende de F4 ni de F5, pero no va en su misma sesión (ver la coordinación del rediseño).

- [ ] T1. `parseSeatingPreselection` con tests (incluida la ida y vuelta con `buildSeatingCheckoutHref`).
  - Archivos: `modules/seating/utils/selectionSummary.ts`, `modules/seating/utils/selectionSummary.test.ts`.
  - Depende de: Fase 3.
  - En paralelo con T2.
- [ ] T2. `initialSelection` en `useSeatSelection`, con tests.
  - Archivos: `modules/seating/hooks/useSeatSelection.ts`, `modules/seating/hooks/useSeatSelection.test.ts`.
  - Depende de: Fase 3.
  - En paralelo con T1.
- [ ] T3. `initialSelection` en `TicketSelection` y nuevo `PreselectedTicketSelection`, con tests.
  - Archivos: `modules/seating/components/TicketSelection.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `modules/seating/components/PreselectedTicketSelection.tsx`.
  - Depende de: T1 y T2.
  - Secuencial.
- [ ] T4. Barrel, página con `Suspense` y diseño de página (sección "Precarga").
  - Archivos: `modules/seating/index.ts`, `app/(site)/eventos/[slug]/entradas/page.tsx`, `design-system/ticketera/pages/ticket-selection.md`.
  - Depende de: T3.
  - Secuencial. El reviewer verifica en `npm run build` que las 4 rutas siguen prerenderizadas.

## Preguntas abiertas
1. **Tribuna Norte de pie** (decisión 4). La captura no deja ver su tarjeta. Se decidió "General · sin butaca" por la convención de tribuna popular y porque un plano del arco exterior no cumple los tamaños mínimos de butaca. ¿Se acepta, o debe ser numerada aunque haga falta otro tipo de plano (por tramos, o empezando con zoom)? **Dato nuevo:** la captura del resumen de checkout que compartió el usuario muestra "5 × Tribuna Norte" con "Fila B · 13 · Fila C · 6 · Fila D · 6 · Fila E · 18 · Fila J · 13". Es decir, Norte numerada, con filas hasta la J y al menos 18 butacas por fila. Eso apunta a la segunda opción y choca con el límite de ≤ 10 butacas por fila.
2. **Filas A–J en lugar de A–M** (decisión 6). Con 13 filas, el plano de las tribunas laterales supera 400 de ancho y las butacas bajan de 24 px a 375 px. Consecuencia: el ejemplo "L-9 / M-8 de Tribuna Oriente" de `checkout-mock-payment.md` no existe. ¿Se acepta A–J, o se prefiere relajar la invariante (butacas < 24 px con el plano entero, y se elige con zoom)?
3. **"2 de 6 butacas"** (decisión 11). Se muestra "n de m", con m = lo que cabe en el límite de 10 por compra. ¿O se quiere introducir un límite de 6 por zona (cambiaría la decisión 5 de la spec base, el hook y el checkout)?
4. ~~**Quinto tono** (decisión 9).~~ **Resuelta por la decisión 28:** la escala de 5 azules de la captura del paso 1 da a Oriente `tier-4` y a Norte `tier-5`.
5. **Formato compacto en "Tu compra"** ("Fila L · 9 · Fila M · 8", como la captura). `checkout-mock-payment.md` lo define en `modules/checkout/utils/summaryFormat.ts` (`formatCompactSeats`), y `seating` no puede importarlo sin crear un ciclo (`checkout` → `seating`). ¿Se sube esa función a `lib/` en una enmienda posterior y se usa en ambos resúmenes, o "Tu compra" mantiene "Fila L · Asiento 9, …"?
6. **Fecha del evento:** `2026-10-05`, a 2 días de hoy (2026-10-03). Al pasar la fecha, el mock no filtra eventos pasados, así que seguirá listado y comprable. ¿Se prefiere `2027-10-04` (también lunes) para que la demo no caduque?
7. **Datos plausibles** (requisito 1): segundo párrafo de la descripción (la invariante exige 2), dirección, organizador ficticio, edad mínima 0, `featured: true` e imagen de Unsplash sin verificar. ¿Algún valor real que deba usarse?
8. **Sub-pasos y botón "Atrás" del navegador:** el sub-paso no va en la URL, así que "Atrás" sale de `/entradas` aunque se esté en el sub-paso 2. ¿Se quiere reflejarlo en la URL (p. ej. `?zona=oriente`)? Sería otra ampliación.
9. **Colores de las butacas** (decisión 10). Ya se adoptan "Elegida" / "Ocupada" y el lavanda de la captura del paso 2, traducido a `primary/30` con borde `primary`, igual en todas las zonas. Las elegidas van en navy (en la captura, casi negras). ¿Se acepta navy, o se prefiere el negro literal (no es un token de UI en MASTER)?
10. **Sub-paso al volver con selección (F6):** la pantalla abre siempre en el sub-paso 1 (zonas con "n elegidas" y "Tu compra" completo; decisión 15). ¿O prefieres abrir directamente el sub-paso 2 de la única zona con selección, cuando solo hay una?
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
