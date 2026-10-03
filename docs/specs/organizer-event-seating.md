# Crear evento: asientos por zona y datos del evento público (UI con mock data)

- Módulo: organizer (y una entrada pública nueva en seating)
- Estado: borrador

## Objetivo
Completar el formulario "Crear evento" del panel de organizador (`/organizador/eventos/nuevo`) para que quien organiza pueda registrar un evento con todo lo necesario:
- **Asientos y precio.** Cada tipo de entrada es una zona con su precio. La zona puede ser "General (de pie)", con una cantidad, o "Numerada", con filas y asientos por fila. En las numeradas, la capacidad se calcula sola y se ve una vista previa compacta del plano de asientos.
- **Datos del evento público.** Se piden los que la página de detalle del evento necesita para mostrarse y que el formulario aún no pide: organizador, edad mínima, apertura de puertas y dirección.

Es una **ampliación de `docs/specs/organizer-dashboard.md`** (en adelante, "spec base", aprobada, que no se edita). Se ejecuta **después de su Fase 3**. Siguen vigentes sus decisiones 1–17 y sus requisitos, salvo los cambios que se listan en "Cambios sobre la spec base".

El alcance es solo UI/UX con datos mock: sin backend, en español (Perú) y en PEN. Del diseño de referencia "8 · Crear evento" (`OrgCreate.dc.html`, `OrgCreateMobile.dc.html`) se toman estructura y textos. Ese diseño no incluye asientos ni los datos nuevos, así que esas piezas siguen los patrones del proyecto. La identidad visual es la de Mentec (`design-system/ticketera/MASTER.md`).

## Alcance
- Incluye:
  - **Fase 1. Asientos y precio por zona:**
    - selector "Ubicación" por tipo de entrada: "General (de pie)" o "Numerada";
    - para las numeradas: filas, asientos por fila y la cantidad calculada (solo lectura);
    - límites de 30 filas y 60 asientos por fila, con mensajes en español;
    - vista previa compacta del plano de cada zona numerada;
    - la capacidad total y la del evento guardado cuentan los asientos;
    - en `modules/seating`: un componente de vista previa, una utilidad de letras de fila y una entrada pública nueva, `modules/seating/preview.ts`;
    - actualización de `design-system/ticketera/pages/organizer.md`.
  - **Fase 2. Datos del evento público:**
    - campos "Organizador", "Edad mínima", "Apertura de puertas" y "Dirección", con su validación al publicar;
    - actualización del diseño de página.
- No incluye:
  - Recargo por fila o precio distinto por asiento: el precio es por zona (decisión 1; ver Preguntas abiertas).
  - Filas con números (1, 2, 3…) en lugar de letras (decisión 2; ver Preguntas abiertas). Tampoco filas de distinta longitud, pasillos ni asientos accesibles o bloqueados (decisión 3).
  - Dibujar el mapa del recinto: la posición de cada zona en el plano y el escenario general (`VenueMap`, `path`, `labelPos`).
  - Que los eventos creados aparezcan en `/eventos`, en su detalle o en la compra (decisión 12; análisis en Preguntas abiertas).
  - Guardar en el store los datos nuevos (configuración de asientos, organizador, edad, apertura, dirección). El evento guardado conserva la forma `OrganizerEvent` de la spec base (decisión 9).
  - Descripción por tipo de entrada, hora de fin o duración, límite de cantidad en zonas generales, número máximo de tipos de entrada.
  - Edición de eventos o borradores, ni cambios en `EventPreviewCard`, en el panel `/organizador` o en el store.
  - Layout y navegación del panel: `app/organizador/layout.tsx`, `OrganizerNav` y las páginas de `app/organizador/*` no se tocan. Los moverá la spec en borrador `layout-fullscreen-shells.md`.
  - Cambios en `modules/seating/index.ts`, `seats.ts`, `SeatPlan`, `SeatLegend`, `seatRows.ts` o el mock de mapas, y en `modules/events`.

## Decisiones tomadas
1. **Precio por zona, sin recargo por fila.** "El precio de cada asiento" es el de su zona. Es el modelo de `modules/seating`: `VenueZone.price` es uno por zona, y el plano y el resumen de compra muestran "S/ X c/u". Un recargo por fila obligaría a cambiar ese modelo, el resumen, el checkout y el "Desde S/" de la tarjeta. Queda como pregunta abierta. En las zonas numeradas, el pie de la vista previa dice el precio por asiento ("S/ 120.00 c/u").
2. **Filas siempre con letras: A, B, C… Z, AA, AB…** La A es la fila más cercana al escenario. Los asientos se numeran de 1 a n de izquierda a derecha. Es el formato del comprador:
   - `seatRowLabelSchema` acepta `[A-Z]{1,2}`;
   - los ids de asiento son `<zona>-<FILA>-<n>`;
   - las etiquetas son "Fila F · Asiento 12";
   - `generateSeatRows` numera los asientos así.

   Con 30 filas como máximo, la última es "AD". No hay opción de numerar filas con números (pregunta abierta).
3. **Zona numerada rectangular.** Todas las filas tienen el mismo número de asientos. Filas de distinta longitud (como la platea del mock), pasillos y asientos accesibles quedan fuera (YAGNI): el pedido habla de "los asientos", y el plano rectangular es lo mínimo que lo cubre.
4. **Límites: 1–30 filas y 1–60 asientos por fila** (como máximo 1,800 asientos por zona). Así la vista previa queda legible a 375 px (a 60 asientos por fila, cada uno mide unos 3–4 px) y el SVG tiene como máximo 1,800 asientos por zona. Las 30 filas caben en etiquetas de 2 letras.
   - Los límites se validan **al publicar**. Un borrador sigue validando solo el nombre (decisión 8 de la spec base).
   - La vista previa solo se dibuja si los dos valores son enteros dentro de los límites, también en borrador. Si no, se muestra una pista de texto. Así un valor como 100000 nunca bloquea la página.
   - Los inputs llevan `min`/`max` nativos como ayuda.
5. **La vista previa la dibuja `seating`, no `organizer`.**
   - **Componente:** `SeatGridPreview` (nuevo, en `modules/seating/components/`) usa `generateSeatRows` (mismo paso de 32, mismo centrado) y `SeatShape` (misma forma de asiento "Disponible"). Así, el organizador ve el plano con el mismo aspecto que verá el comprador.
   - **Qué no se reutiliza:**
     - `SeatPlan`: es interactivo (zoom, selección, roving tabindex, chips) y sus props son de compra.
     - `SeatLegend`: muestra estados de compra (ocupado, tu selección, accesible) que aquí no aplican.
   - **Entrada pública `modules/seating/preview.ts`** (SETUP §1 regla 4), que solo reexporta `SeatGridPreview` y `getSeatRowLabels`. No se usa el barrel `@/modules/seating`: arrastraría `TicketSelection` (`react-zoom-pan-pinch`) y services que importan el barrel de `events` al bundle cliente del formulario. Tampoco se usa `seats.ts`: `seating-ticket-selection.md` (F5, decisión 13) lo reserva como entrada de servidor con una lista cerrada de reexportaciones.
   - **Letras de fila:** `getSeatRowLabels` vive en `seating` porque el formato de las filas es de ese dominio.
6. **La vista previa es decorativa** (`aria-hidden`) y no tiene elementos enfocables. La información va en texto, en el `<figcaption>` ("Filas A–J · 20 asientos por fila · S/ 120.00 c/u"), que se lee igual con o sin lector de pantalla.
7. **Cambiar la ubicación conserva los valores del otro tipo.** Pasar de "Numerada" a "General" no borra filas y asientos, y al revés tampoco borra la cantidad, así que volver atrás no pierde datos. El schema valida solo los campos del tipo elegido (unión discriminada por `kind`), y la capacidad usa solo esos.
8. **Qué datos del evento público faltan** (comparando `eventDetailSchema` y lo que muestran `EventDetailHeader`/`EventDetailInfo` con el formulario de la spec base):

   | Campo de `eventDetailSchema` | ¿Se añade? | Motivo |
   |---|---|---|
   | `organizer` | Sí, "Organizador" (texto) | El detalle muestra "Organiza: …". No hay perfil de organizador en `auth` del que tomarlo (decisión 1 de la spec base). |
   | `minAge` | Sí, "Edad mínima" (`Select`) | "Información importante" del detalle lo muestra ("Todo público" / "+18"). |
   | `doorsOpenAt` | Sí, "Apertura de puertas" (hora) | El detalle muestra la hora de apertura junto a la de inicio. |
   | `address` | Sí, "Dirección" (texto) | El detalle la muestra en "Lugar" y la usa en "Cómo llegar". |
   | `slug` | No | Se deriva del nombre al publicar en el catálogo (fuera de alcance). |
   | `featured` | No | Lo decide la plataforma, no el organizador. |
   | `status` (evento y tipos) | No | Se derivan de las ventas: al crear, "Disponible". |
   | `ticketTypes[].description` | No | Es opcional en el schema y el detalle se muestra sin ella (YAGNI; ver Preguntas abiertas). |
   | Hora de fin / duración | No | No existe en `eventSchema`. |

   `description`, `startsAt` (fecha + hora), `venue`, `city`, `category`, `imageUrl` y los tipos con precio ya los cubre la spec base.
9. **Los datos nuevos no se guardan en el store**, igual que la descripción en la spec base.
   - `OrganizerEvent`, `organizerEventSchema`, `toOrganizerEvent` (salvo el cálculo de capacidad) y el contrato de localStorage `mentec-organizer-events` no cambian.
   - Guardarlos solo sirve si alguien los lee (edición o publicación en el catálogo), y las dos cosas están fuera de alcance.
   - Lo que sí cambia en el evento guardado es `capacity`, que suma los asientos de las zonas numeradas.
10. **"Edad mínima"** es un `Select` con "Todo público" (0), "+12", "+14", "+16" y "+18". Las etiquetas tienen el mismo formato que el detalle (`minAge === 0 ? "Todo público" : "+n"`). El valor por defecto es "Todo público". La lista de edades es una suposición: se confirma en Preguntas abiertas. La regla del formato se escribe en `organizer` (`MIN_AGE_LABELS`) y no se extrae de `events`: está como ternario dentro de `EventDetailInfo` y cambiarlo tocaría `modules/events`, que tiene specs en curso.
11. **"Apertura de puertas"** es una hora (`input type="time"`) del mismo día que el evento, y debe ser a la hora de inicio o antes. El caso de un inicio pasada la medianoche con apertura el día anterior queda fuera (pregunta abierta).
12. **Publicar en `/eventos` no es viable sin backend** dentro de esta spec. El análisis está en Preguntas abiertas.
13. **Nombres en el código:** `kind: "general" | "numbered"`, como `VenueZoneLayout.kind` de seating, para que una futura integración no tenga que traducir valores. En la UI: "General (de pie)" y "Numerada".

## Cambios sobre la spec base (`organizer-dashboard.md`)
Lo que no se lista aquí sigue igual.

- **Requisito 15, "Tipos de entrada":**
  - **Subtítulo:** pasa a "Cada tipo es una zona con su precio: general (de pie) o numerada (con filas y asientos)."
  - **Disposición:** cada fila (`<fieldset>`) es un bloque en todos los anchos. Su `<legend>` "Tipo n" es **visible también en `lg`** (deja de ser `lg:sr-only`) y las etiquetas de sus campos son visibles en todos los anchos. Desaparece la fila de cabeceras `aria-hidden` que imitaba la tabla en `lg`, porque cada bloque ya no cabe en una sola línea.
  - **Se mantienen:** botón quitar con `aria-label="Quitar tipo de entrada n"` (deshabilitado con una fila), "Agregar tipo de entrada" (foco al nombre de la nueva), foco tras quitar y pie "Capacidad total".
- **Requisito 15, "Fecha y lugar" (F2):** la grilla de Fecha y Hora pasa a `grid-cols-2 md:grid-cols-3` para incluir "Apertura de puertas". "Dirección" se añade bajo Lugar y Ciudad.
- **Requisito 15, "Información básica" (F2):** se añaden "Edad mínima" (junto a Categoría) y "Organizador".
- **Requisito 16, validación:**
  - las reglas por fila dependen de `kind` (requisito 3);
  - al publicar se exigen también organizador, apertura de puertas (≤ hora de inicio) y dirección (requisito 8).
- **Requisito 17:** `capacity = getTicketCapacity(rows)` suma la cantidad de las zonas generales y `filas × asientos` de las numeradas (requisito 4).
- **Valores iniciales:**
  - la fila nueva es `createTicketTypeRow()` = `{ id, name: "", price: "", kind: "general", quantity: "", rows: "", seatsPerRow: "" }`;
  - en F2 se añaden `organizer: ""`, `minAge: "0"`, `doorsOpen: ""` y `address: ""`.

## Requisitos

### Comunes
1. Reglas de la spec base:
   - requisitos comunes 1–4: tokens, Creato Display, `h-11`, foco visible, sin scroll horizontal a 375/768/1024/1440, formatos es-PE;
   - Decisión 17: los archivos cliente de `organizer` no importan valores del barrel `@/modules/events`.
2. `organizer` importa de `seating` **solo** por `@/modules/seating/preview` (`SeatGridPreview`, `getSeatRowLabels`). Nunca usa el barrel `@/modules/seating` ni archivos internos de seating. `modules/seating/preview.ts` solo reexporta (sin lógica). `modules/seating/index.ts` no cambia.

### Fase 1. Asientos y precio por zona
3. **Modelo de fila y validación** (`ticketTypeFormSchema`, unión discriminada por `kind`; mensajes exactos). Comunes a los dos tipos: `name` y `price`, con las reglas y mensajes de la spec base.

   **`kind: "general"`:** `quantity` con las reglas de la spec base ("Ingresa la cantidad" / "La cantidad debe ser un número entero mayor o igual a 1"). `rows` y `seatsPerRow` se ignoran.

   **`kind: "numbered"`:** `quantity` se ignora, y se validan filas y asientos:

   | Campo | Vacío (con trim) | No es un entero entre los límites |
   |---|---|---|
   | `rows` | "Ingresa el número de filas" | "Las filas deben ser un número entero entre 1 y 30" |
   | `seatsPerRow` | "Ingresa los asientos por fila" | "Los asientos por fila deben ser un número entero entre 1 y 60" |

   Cada campo da un solo mensaje: el de vacío corta (`abort`), como en la spec base. Los límites se definen una sola vez: `SEAT_GRID_LIMITS = { maxRows: 30, maxSeatsPerRow: 60 }`, en `organizer.schema.ts`. Los usan el schema, las utils, los textos de la pista y los atributos `max` de los inputs.
4. **Utils de capacidad** (`utils/organizerEventForm.ts`):
   - `getSeatGridSize(row): { rows: number; seatsPerRow: number } | null`:
     - devuelve los dos valores si `kind === "numbered"` y ambos son enteros dentro de los límites;
     - devuelve `null` en otro caso (vacío, decimal, fuera de rango o `kind === "general"`).
   - `getRowCapacity(row): number | null`:
     - en una zona general, la cantidad si es un entero ≥ 1;
     - en una numerada, `rows × seatsPerRow` si `getSeatGridSize` no es `null`;
     - si no, `null`.
   - `getTicketCapacity(rows)`: la suma de `getRowCapacity` de cada fila; las filas `null` no cuentan. La firma no cambia. `toOrganizerEvent` la usa como hasta ahora.
   - `formatSeatGridSummary(size, price: number | null): string` es el texto del `figcaption`. Las letras salen de `getSeatRowLabels`:
     - `{10, 20}` con 120 → "Filas A–J · 20 asientos por fila · S/ 120.00 c/u";
     - `{1, 1}` sin precio → "Fila A · 1 asiento por fila";
     - con precio 0 → "… · Entrada libre";
     - `{30, 60}` → "Filas A–AD · 60 asientos por fila".

     El precio llega ya interpretado: el componente lo calcula con la misma regla que `getMinTicketPrice` (número finito ≥ 0) o pasa `null`.
5. **UI de cada tipo de entrada** (`TicketTypesField` + `TicketTypeCapacityFields`). Bloque `<fieldset>` con `rounded-xl ring-1 ring-border p-4 flex flex-col gap-4` y, en orden de DOM:
   1. **Cabecera:** `<legend>` "Tipo n" (`text-sm font-semibold`) a la izquierda y botón `Trash2` a la derecha (sin cambios de comportamiento).
   2. **"Nombre" y "Precio (S/)":** mismos inputs, placeholders y atributos que en la spec base. Grilla `md:grid-cols-[minmax(0,1fr)_160px] gap-4`; en móvil, uno debajo del otro.
   3. **"Ubicación":** `RadioGroup` de shadcn con `aria-labelledby` hacia el texto visible "Ubicación" (`text-sm font-medium`). Usa el patrón de tarjetas de elección de `PaymentMethodFields`: cada opción es un `FieldLabel` con `htmlFor`, que contiene un `Field orientation="horizontal"` con `RadioGroupItem`, icono y `FieldTitle`, más una línea `text-sm text-muted-foreground`. Estado elegido: `has-data-checked:border-primary has-data-checked:bg-accent`. Grilla `grid-cols-2 gap-3`, tarjetas `min-h-11` y `cursor-pointer`. Las opciones:
      - "General (de pie)", icono `PersonStanding`, línea "Sin asiento asignado";
      - "Numerada", icono `Armchair`, línea "Filas y asientos numerados".

      Por defecto, "General (de pie)". Las flechas cambian la opción (comportamiento nativo de Base UI). Los ids son únicos por fila. Tras el primer intento de envío, cambiar la opción revalida (`onBlur` de la lista), como el `Select` de la spec base.
   4. **Campos de capacidad:**
      - **General:** "Cantidad", igual que en la spec base (`type="number" inputMode="numeric" min=1 step=1`, placeholder "0"), en media columna desde `md` (`md:max-w-[calc(50%-0.5rem)]` o grilla equivalente).
      - **Numerada:** grilla `grid-cols-2 md:grid-cols-3 gap-4` con:
        - "Filas" (`type="number" inputMode="numeric" min=1 max=30 step=1`, placeholder "0");
        - "Asientos por fila" (`min=1 max=60`, resto igual);
        - "Cantidad" (`col-span-2 md:col-span-1`): `Input` con `readOnly`, `bg-muted` y `tabular-nums`. Su valor es `formatCount(rows × seatsPerRow)` ("1,800") si `getSeatGridSize` no es `null`; si no, vacío con placeholder "—". `aria-describedby` apunta a la descripción "Filas × asientos por fila" (`FieldDescription`).

        Los errores usan el patrón de la spec base: `aria-invalid`, `aria-describedby` hacia `FieldError` con id, y ids del mismo esquema que el resto de campos de la fila. Los controles llevan `scroll-mb-28 lg:scroll-mb-0 scroll-mt-24`.
   5. **Solo en las numeradas, vista previa del plano:** un `<figure>` `rounded-lg bg-muted p-3 md:p-4 flex flex-col gap-2`:
      - si `getSeatGridSize(row)` no es `null`: `<SeatGridPreview rows seatsPerRow />` y `<figcaption className="text-sm text-muted-foreground">` con `formatSeatGridSummary(size, price)`;
      - si es `null`: solo `<p className="text-sm text-muted-foreground">` "Indica las filas (1 a 30) y los asientos por fila (1 a 60) para ver el plano." (sin `figure`).
6. **`SeatGridPreview`** (`modules/seating/components/SeatGridPreview.tsx`, sin `"use client"`, sin estado). Props: `{ rows: number; seatsPerRow: number; className?: string }`.
   - **Asientos:** genera los asientos con `generateSeatRows({ zoneId: "preview", rowLabels: getSeatRowLabels(rows), seatsPerRow, occupiedRatio: 0 })`, de modo que todos quedan disponibles. Pinta un `SeatShape status="available" selected={false}` por asiento, en `translate(x y)`.
   - **Encuadre:** el `viewBox` se recorta a los asientos (sin los márgenes del plano de compra): `` `${SEAT_PLAN_MARGIN.x} ${SEAT_PLAN_MARGIN.top} ${seatsPerRow * SEAT_PITCH} ${rows * SEAT_PITCH}` ``.
   - **Tamaño:** el `<svg>` lleva `block h-auto w-full max-h-64` y `style={{ maxWidth: seatsPerRow * SEAT_PITCH }}`. Nunca se agranda por encima de 1 unidad = 1 px (un asiento mide como máximo 24 px), se reduce para caber en el contenedor y queda centrado (`mx-auto`).
   - **Escenario:** encima del SVG va una barra HTML "Escenario" (`rounded-md bg-foreground py-1 text-center text-xs font-bold uppercase tracking-widest text-background`) con ancho `max(ancho del plano, 160 px)`, sin superar el contenedor y centrada. Va en HTML y no dentro del SVG para que su texto nunca baje de 12 px.
   - **Accesibilidad:** el componente completo (barra + SVG) es `aria-hidden` (decisión 6).
7. **`getSeatRowLabels(count: number): string[]`** (`modules/seating/utils/rowLabels.ts`):
   - devuelve `count` etiquetas en orden "A"…"Z", "AA"…"AZ", "BA"… hasta "ZZ" (máximo 702);
   - lanza `RangeError` si `count` no es un entero entre 0 y 702;
   - cada etiqueta cumple `seatRowLabelSchema`.

### Fase 2. Datos del evento público
8. **Campos nuevos** (`OrganizerEventForm`; mensajes exactos; se validan solo con `intent: "publish"`, salvo que se indique otra cosa):
   - **"Información básica":**
     - debajo de "Nombre del evento", una grilla `md:grid-cols-2 gap-4` con "Categoría" (sin cambios) y **"Edad mínima"**: `Select` con `items={MIN_AGE_LABELS}` y opciones `MIN_AGE_OPTIONS` (`"0"`, `"12"`, `"14"`, `"16"`, `"18"`, con las etiquetas "Todo público", "+12", "+14", "+16", "+18"). Por defecto, "Todo público". El schema la valida siempre como enum, pero nunca falla desde la UI;
     - después de "Descripción", **"Organizador"**: `Input`, placeholder "Ej. Pulso Producciones", `maxLength={100}`, con `FieldDescription` "Aparece en la página del evento como «Organiza: …»." Vacío (con trim): "Indica el nombre del organizador".
   - **"Fecha y lugar":**
     - grilla `grid-cols-2 md:grid-cols-3 gap-4` con "Fecha", "Hora de inicio" y **"Apertura de puertas"** (`Input type="time"`). En móvil, Apertura queda en la segunda línea, en la primera columna.
       - Vacía o con un formato que no es `HH:MM`: "Indica la hora de apertura de puertas".
       - Si es válida y posterior a la hora de inicio válida: "La apertura de puertas debe ser a la hora de inicio o antes". La misma hora es válida.
     - "Lugar" y "Ciudad", sin cambios;
     - debajo, **"Dirección"** a todo el ancho: `Input`, placeholder "Ej. Av. José Díaz s/n, Cercado de Lima", `maxLength={150}`. Vacía (con trim): "Indica la dirección del lugar".
   - Todos con el patrón de campos de la spec base (`Field` con `data-invalid`, `aria-invalid`, `aria-describedby`, `handleBlur`, clases `scroll-mb-*`).
9. Los cuatro valores nuevos **no** se pasan a `toOrganizerEvent` ni al store (decisión 9). El borrador sigue exigiendo solo el nombre.

## Criterios de aceptación

### Fase 1. Asientos y precio por zona
- [ ] Dado `/organizador/eventos/nuevo` a 1440 px, entonces "Tipos de entrada" tiene el subtítulo "Cada tipo es una zona con su precio: general (de pie) o numerada (con filas y asientos).". "Tipo 1" es un `<fieldset>` con su `<legend>` visible, las etiquetas visibles "Nombre", "Precio (S/)" y "Cantidad", y el grupo de radio "Ubicación" con "General (de pie)" marcado. No hay fila de cabeceras `aria-hidden`.
- [ ] Dado "Tipo 1", cuando se elige "Numerada" (con clic, o con Tab hasta el grupo y flecha derecha), entonces la opción queda marcada (`aria-checked="true"`, borde `border-primary`, fondo `bg-accent`) y aparecen "Filas", "Asientos por fila" y "Cantidad". "Cantidad" es de solo lectura y está vacía, con "—". También aparece el texto "Indica las filas (1 a 30) y los asientos por fila (1 a 60) para ver el plano.".
- [ ] Dada una zona numerada con precio 120, cuando se escribe Filas 10 y Asientos por fila 20, entonces:
  - "Cantidad" muestra "200";
  - aparece la vista previa con la barra "Escenario" y 200 asientos dibujados con la forma "Disponible" del plano de compra;
  - el pie dice "Filas A–J · 20 asientos por fila · S/ 120.00 c/u";
  - "Capacidad total" incluye esos 200.
- [ ] Dada una zona numerada con 30 filas y 60 asientos por fila, entonces el pie dice "Filas A–AD · 60 asientos por fila" y la vista previa cabe en el bloque sin scroll horizontal, tanto a 1440 px como a 375 px.
- [ ] Dada una zona numerada, cuando se publica, entonces el error aparece en ese input concreto, con `aria-invalid="true"` y `aria-describedby` hacia el mensaje:
  - con Filas "31", "0" o "2.5": "Las filas deben ser un número entero entre 1 y 30";
  - con Asientos por fila "61": "Los asientos por fila deben ser un número entero entre 1 y 60";
  - con los dos campos vacíos: "Ingresa el número de filas" e "Ingresa los asientos por fila".

  Mientras el valor está fuera de rango, la vista previa se sustituye por el texto de ayuda y la zona no suma a "Capacidad total". Al corregir el valor y salir del campo, el error desaparece.
- [ ] Dada una zona con cantidad 100 en "General (de pie)", cuando se cambia a "Numerada" y luego otra vez a "General (de pie)", entonces la cantidad sigue siendo 100. Mientras es "Numerada", publicar no muestra errores de "Cantidad" en esa zona.
- [ ] Dado un formulario completo con dos zonas, "General" S/ 50 × 100 (general) y "Platea" S/ 120 numerada de 10 × 20, cuando se pulsa "Publicar evento", entonces se navega a `/organizador?guardado=publicado`. El evento aparece primero con "0 / 300 vendidas" y la vista previa de la tarjeta mostraba "Desde S/ 50.00".
- [ ] Dado un borrador con solo el nombre y una zona numerada con Filas "500", cuando se pulsa "Guardar borrador", entonces se guarda sin errores y con capacidad 0. La página no dibuja ningún plano para esa zona: muestra el texto de ayuda.
- [ ] Dada la vista previa del plano, entonces no tiene elementos enfocables, el plano y la barra "Escenario" están ocultos al árbol de accesibilidad (`aria-hidden`) y el `<figcaption>` es texto legible.
- [ ] Dado el formulario a 375 px, entonces:
  - cada tipo de entrada es un bloque con "Tipo n" visible;
  - "Nombre" y "Precio (S/)" van uno debajo del otro;
  - las dos tarjetas de "Ubicación" comparten fila, con altura ≥ 44 px;
  - "Filas" y "Asientos por fila" comparten fila y "Cantidad" va debajo, a todo el ancho;
  - no hay scroll horizontal de página;
  - la barra de acciones `sticky` no tapa el campo enfocado.
- [ ] Dado el formulario recorrido solo con teclado, entonces se alcanzan y se operan el grupo "Ubicación" (Tab entra en la opción marcada y las flechas cambian la selección), Filas, Asientos por fila, quitar y agregar, con el foco visible. "Cantidad" de solo lectura se puede enfocar y su nombre accesible es "Cantidad".
- [ ] Dado el código, entonces:
  - `modules/seating/utils/rowLabels.test.ts`, `modules/organizer/schemas/organizer.schema.test.ts`, `modules/organizer/utils/organizerEventForm.test.ts` y `modules/organizer/components/OrganizerEventForm.test.tsx` pasan;
  - `grep -rn "@/modules/seating" modules/organizer` solo encuentra `@/modules/seating/preview`;
  - `modules/seating/preview.ts` solo contiene reexportaciones;
  - `modules/seating/index.ts` no ha cambiado.
- [ ] Dado `design-system/ticketera/pages/organizer.md`, entonces la sección "Crear evento" describe el bloque por tipo de entrada, las tarjetas "Ubicación", los campos de la zona numerada, la vista previa del plano y los límites.

### Fase 2. Datos del evento público
- [ ] Dado el formulario a 1440 px, entonces:
  - "Información básica" muestra "Categoría" y "Edad mínima" en dos columnas. "Edad mínima" vale "Todo público" y sus opciones son "Todo público", "+12", "+14", "+16" y "+18";
  - "Organizador" va después de "Descripción", con su texto de ayuda;
  - "Fecha y lugar" muestra "Fecha", "Hora de inicio" y "Apertura de puertas" en tres columnas, después "Lugar" y "Ciudad", y debajo "Dirección".
- [ ] Dado el formulario vacío, cuando se pulsa "Publicar evento", entonces, además de los errores de la spec base y de la Fase 1, aparecen "Indica el nombre del organizador", "Indica la hora de apertura de puertas" e "Indica la dirección del lugar". El foco va a "Nombre del evento".
- [ ] Dadas "Hora de inicio" 20:00 y "Apertura de puertas" 21:00, cuando se publica, entonces "Apertura de puertas" muestra "La apertura de puertas debe ser a la hora de inicio o antes". Con 20:00 y 20:00, o con 18:00, no hay error.
- [ ] Dado solo el nombre, cuando se pulsa "Guardar borrador", entonces se guarda igual que en la spec base, sin errores de los campos nuevos.
- [ ] Dado un formulario completo con los campos nuevos, cuando se publica, entonces el evento guardado en `mentec-organizer-events` tiene exactamente las claves de `OrganizerEvent` (sin `organizer`, `minAge`, `doorsOpen` ni `address`).
- [ ] Dado el formulario a 375 px, entonces "Fecha" y "Hora de inicio" comparten fila, "Apertura de puertas" va en la siguiente, y "Categoría" y "Edad mínima" van una debajo de la otra. No hay scroll horizontal. El `Select` de edad se opera con teclado.
- [ ] Dado el código, entonces `organizer.schema.test.ts` y `OrganizerEventForm.test.tsx` pasan con los casos de la Fase 2, y `pages/organizer.md` describe los campos nuevos.

## Diseño técnico

### Rutas (`app/`)
Sin cambios. `app/organizador/eventos/nuevo/page.tsx` ya compone `<OrganizerEventForm />` (spec base). Layout y navegación no se tocan (Alcance).

### Componentes
| Componente | Tipo | Ubicación | Fase |
|---|---|---|---|
| `RadioGroup`, `RadioGroupItem` | shadcn (instalado) | `components/ui/radio-group.tsx` | 1 |
| `Field`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldError`, `Input`, `Select*`, `Button` | shadcn (instalado) | `components/ui/` | 1–2 |
| `SeatShape` | existente (`modules/seating/components/SeatLegend.tsx`), solo se importa desde dentro de seating | — | 1 |
| `SeatGridPreview` | nuevo, presentacional, sin `"use client"`. Props `{ rows; seatsPerRow; className? }` | `modules/seating/components/SeatGridPreview.tsx`: dibuja asientos con el aspecto del plano de compra, que es de seating (decisión 5). No existe nada parecido (`SeatPlan` es interactivo y de compra) | 1 |
| `TicketTypeCapacityFields` | nuevo, cliente. Props `{ row: TicketTypeRow; index: number; errors?: TicketTypeRowErrors; onChange(patch: Partial<TicketTypeRow>): void; onBlur(): void }`. Contiene "Ubicación", los campos de capacidad y la vista previa | `modules/organizer/components/TicketTypeCapacityFields.tsx`: separa del bloque la parte que depende de `kind`, para que `TicketTypesField` no crezca (S de SOLID) | 1 |
| `TicketTypesField` | existente (spec base F2), se modifica: disposición en bloque, legend visible, sin cabeceras `lg` y compone `TicketTypeCapacityFields` | `modules/organizer/components/TicketTypesField.tsx` | 1 |
| `OrganizerEventForm` | existente (spec base F2–F3), se modifica: en F1 solo si hace falta para revalidar al cambiar `kind`; en F2, campos nuevos | `modules/organizer/components/OrganizerEventForm.tsx` | 1–2 |

shadcn: `npx shadcn@latest search @shadcn -q radio` confirma `radio-group` (ya instalado). No hay dropzone, input numérico ni "choice card" en el registro: se usa el patrón de `PaymentMethodFields`.

### Schemas, tipos y utils
```ts
// modules/organizer/schemas/organizer.schema.ts (amplía el de la spec base; esquema orientativo)
export const SEAT_GRID_LIMITS = { maxRows: 30, maxSeatsPerRow: 60 } as const;
export const ticketTypeKindSchema = z.enum(["general", "numbered"]);

const ticketTypeBase = { id: z.string(), name: /* regla actual */, price: /* regla actual */ };
const intInRange = (empty: string, invalid: string, max: number) =>
  z.string().trim().min(1, { error: empty, abort: true })
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= max, invalid);

export const ticketTypeFormSchema = z.discriminatedUnion("kind", [
  z.object({ ...ticketTypeBase, kind: z.literal("general"), quantity: /* regla actual */, rows: z.string(), seatsPerRow: z.string() }),
  z.object({
    ...ticketTypeBase, kind: z.literal("numbered"), quantity: z.string(),
    rows: intInRange("Ingresa el número de filas", "Las filas deben ser un número entero entre 1 y 30", SEAT_GRID_LIMITS.maxRows),
    seatsPerRow: intInRange("Ingresa los asientos por fila", "Los asientos por fila deben ser un número entero entre 1 y 60", SEAT_GRID_LIMITS.maxSeatsPerRow),
  }),
]);

// Fila "cruda" del formulario (sin reglas), dentro de organizerEventFormSchema.ticketTypes:
// z.object({ id, name, price, kind: ticketTypeKindSchema, quantity, rows, seatsPerRow }) con todo string salvo kind.

// Fase 2
export const MIN_AGE_LABELS = { "0": "Todo público", "12": "+12", "14": "+14", "16": "+16", "18": "+18" } as const;
export const MIN_AGE_OPTIONS = Object.keys(MIN_AGE_LABELS) as [keyof typeof MIN_AGE_LABELS, ...(keyof typeof MIN_AGE_LABELS)[]];
// organizerEventFormSchema: + organizer: z.string(), minAge: z.enum(MIN_AGE_OPTIONS), doorsOpen: z.string(), address: z.string()
// superRefine (solo publish): organizer y address requeridos (REQUIRED_ON_PUBLISH); doorsOpen con formTimeSchema;
//   si doorsOpen y time son válidos y doorsOpen > time → "La apertura de puertas debe ser a la hora de inicio o antes".
```
El developer puede ajustar la implementación, pero no los mensajes, las reglas, los límites ni los nombres exportados.

```ts
// modules/organizer/types/organizer.types.ts
export type TicketTypeKind = z.infer<typeof ticketTypeKindSchema>;
// TicketTypeRow (derivado de OrganizerEventFormValues) gana kind, rows y seatsPerRow automáticamente.
export type TicketTypeRowErrors = Partial<Record<"name" | "price" | "quantity" | "rows" | "seatsPerRow", string>>;
export type SeatGridSize = { rows: number; seatsPerRow: number };
```

| Unidad | Archivo | Firma / comportamiento | Fase |
|---|---|---|---|
| Letras de fila | `modules/seating/utils/rowLabels.ts` | `getSeatRowLabels(count): string[]` (requisito 7) | 1 |
| Entrada pública | `modules/seating/preview.ts` | Solo `export { SeatGridPreview } from "./components/SeatGridPreview"; export { getSeatRowLabels } from "./utils/rowLabels";`, con un comentario que explica por qué existe (decisión 5) | 1 |
| Form utils | `modules/organizer/utils/organizerEventForm.ts` | Cambia `createTicketTypeRow` (`kind: "general"`, `rows: ""`, `seatsPerRow: ""`) y `getTicketCapacity` (usa `getRowCapacity`). Nuevas: `getSeatGridSize`, `getRowCapacity` y `formatSeatGridSummary` (requisito 4; importa `getSeatRowLabels` de `@/modules/seating/preview` y `formatEventPrice` de `@/modules/events/format`). `getTicketTypeErrors` y `toOrganizerEvent` mantienen su firma | 1 |

`formatCount` (de `utils/organizerStats.ts`) da formato a la "Cantidad" calculada.

### Imports entre módulos
| Archivo (se ejecuta en) | Importa |
|---|---|
| `organizer/utils/organizerEventForm.ts` (cliente) | `getSeatRowLabels` de `@/modules/seating/preview`; `formatEventPrice` de `@/modules/events/format` |
| `organizer/components/TicketTypeCapacityFields.tsx` (cliente) | `SeatGridPreview` de `@/modules/seating/preview` |
| `seating/components/SeatGridPreview.tsx` | Internos de seating: `../utils/seatRows` (`generateSeatRows`, `SEAT_PITCH`, `SEAT_PLAN_MARGIN`), `../utils/rowLabels` y `./SeatLegend` (`SeatShape`) |

`seatRows.ts` solo depende de utils de seating y, tras la F5 de seating, de `@/lib/hash`. Ninguno de ellos arrastra componentes cliente ni el barrel de `events`.

### Contrato de API
No hay API HTTP. Contratos internos:
- Fila del formulario: `TicketTypeRow = { id: string; name: string; price: string; kind: "general" | "numbered"; quantity: string; rows: string; seatsPerRow: string }`.
- `SeatGridPreview` props `{ rows: number; seatsPerRow: number; className?: string }`, con `rows` entre 1 y 702, aunque `organizer` solo lo usa hasta 30.
- `getSeatRowLabels(count: number): string[]`.
- Valores nuevos del formulario (F2): `organizer: string; minAge: "0" | "12" | "14" | "16" | "18"; doorsOpen: string /* "HH:MM" o "" */; address: string`.
- Sin cambios: `OrganizerEvent`, `toOrganizerEvent(values, id): OrganizerEvent` y localStorage `mentec-organizer-events`.

### Diseño de página
Se actualiza `design-system/ticketera/pages/organizer.md`, **solo la sección "Crear evento"** (layout y reglas). Su encabezado y la sección del layout común no se tocan, porque los modifica `layout-fullscreen-shells.md`.
- **F1:**
  - esquema del bloque por tipo de entrada: legend + quitar, Nombre | Precio, tarjetas "Ubicación", campos general o numerada, `figure` con el plano;
  - tarjetas de elección;
  - "Cantidad" de solo lectura;
  - vista previa del plano: barra "Escenario" en HTML, asientos con la forma "Disponible" de seating, `aria-hidden` + `figcaption`, `max-h-64`, sin agrandar por encima de 1 px por unidad;
  - límites 30 × 60;
  - precio por zona.
- **F2:** campos nuevos y su disposición a 375 y 1440.

## Reutilización
- **Seating:**
  - `generateSeatRows`, `SEAT_PITCH`, `SEAT_PLAN_MARGIN` (`utils/seatRows.ts`) y `SeatShape` (`components/SeatLegend.tsx`). Los usa el componente nuevo de seating, sin modificarlos;
  - `seatRowLabelSchema`, en el test de `getSeatRowLabels`;
  - el valor `kind: "general" | "numbered"` de `VenueZoneLayout`.
- **Organizer** (spec base):
  - `useZodForm` (sin cambios), `TicketTypesField`, `OrganizerEventForm`;
  - `getTicketCapacity`, `getMinTicketPrice`, `getTicketTypeErrors`, `toOrganizerEvent`, `formatTicketCount`;
  - `formatCount`, `formTimeSchema`, `REQUIRED_ON_PUBLISH`.
- **Events:** `formatEventPrice` y `EVENT_CATEGORY_LABELS` de `@/modules/events/format`.
- **Patrones:**
  - `PaymentMethodFields` (`RadioGroup` con tarjetas de elección y `has-data-checked`);
  - `RegisterForm` y la spec base (campos con `Field`, `Select` con `items`);
  - `EventDetailInfo` (formato "Todo público" / "+18").
- **shadcn instalados:** `radio-group`, `field`, `input`, `select`, `button`. No hay que instalar nada.

## Tests
Junto al archivo probado (`npx vitest run modules/seating/utils/rowLabels.test.ts modules/organizer`).
- **`modules/seating/utils/rowLabels.test.ts`** (F1):
  - 0 → `[]`;
  - 3 → `["A", "B", "C"]`;
  - 26 → el último es "Z";
  - 27 → el último es "AA";
  - 30 → el último es "AD";
  - 52 → "AZ"; 53 → "BA"; 702 → "ZZ";
  - todas las etiquetas de 702 son distintas y cumplen `seatRowLabelSchema`;
  - 703, −1 y 1.5 lanzan `RangeError`.
- **`modules/organizer/schemas/organizer.schema.test.ts`** (amplía los tests de la spec base):
  - **F1:**
    - una fila general válida pasa aunque `rows`/`seatsPerRow` sean basura;
    - una fila numerada válida (10, 20) pasa aunque `quantity` esté vacía;
    - numerada con `rows` "", "0", "31" y "2.5", y con `seatsPerRow` "61", da cada uno su mensaje exacto, uno por campo;
    - en `organizerEventFormSchema` con `publish`, el path del error es `["ticketTypes", i, "rows"]`;
    - con `draft`, una numerada con filas "500" no da errores.
  - **F2:**
    - con `publish` vacío aparecen `organizer`, `doorsOpen` y `address` con sus mensajes;
    - `doorsOpen` "21:00" con `time` "20:00" da el error de orden; "20:00"/"20:00" es válido;
    - `doorsOpen` "25:00" da "Indica la hora de apertura de puertas";
    - con `draft`, sin errores de los campos nuevos;
    - `minAge` "21" se rechaza;
    - `MIN_AGE_OPTIONS` es igual a `["0", "12", "14", "16", "18"]`.
- **`modules/organizer/utils/organizerEventForm.test.ts`** (F1; ajusta los casos de la spec base a la fila con `kind`):
  - `createTicketTypeRow` → `kind: "general"`, `rows: ""` y `seatsPerRow: ""`;
  - `getSeatGridSize`:
    - (10, 20) → `{ rows: 10, seatsPerRow: 20 }`;
    - (30, 60) es válido;
    - (31, 20), (10, 61), ("", 20), ("2.5", 20) y una fila general → `null`;
  - `getRowCapacity`: general 100 → 100; numerada 10×20 → 200; inválida → `null`;
  - `getTicketCapacity`: general 100 + numerada 10×20 + numerada inválida = 300; una numerada con `quantity` "999" no suma esa cantidad;
  - `formatSeatGridSummary`: los 4 ejemplos del requisito 4;
  - `getTicketTypeErrors`: mensajes por campo de una fila numerada;
  - `toOrganizerEvent` con zonas mixtas: `capacity` 300, `priceFrom` correcto y pasa `organizerEventSchema`.
- **`modules/organizer/components/OrganizerEventForm.test.tsx`**:
  - **F1:**
    - elegir "Numerada" muestra Filas, Asientos por fila y la ayuda;
    - con 10 × 20, la Cantidad vale "200", el `figure` contiene un `svg` con 200 `circle` y el pie es "Filas A–J · 20 asientos por fila";
    - "Capacidad total" pasa a mostrar las entradas sumadas;
    - publicar con zonas mixtas válidas guarda `capacity: 300`;
    - con Filas "31", publicar marca ese input con el mensaje y no navega;
    - volver a "General" conserva la cantidad.
  - **F2:**
    - publicar vacío muestra los 3 mensajes nuevos;
    - el error de apertura posterior al inicio aparece en "Apertura de puertas";
    - el evento guardado no tiene claves nuevas.
- **Ajustes de tests existentes:** si `utils/eventPreview.test.ts` (spec base F3) construye a mano valores del formulario o filas y deja de compilar con los campos nuevos, se ajusta en la tarea que cambia el tipo (F1 T2, F2 T1). Solo se añaden los campos que faltan, sin cambiar sus aserciones.
- **Sin test** (SETUP §3):
  - `SeatGridPreview` y `TicketTypeCapacityFields`: son presentacionales, y su comportamiento lo cubre `OrganizerEventForm.test.tsx`;
  - `modules/seating/preview.ts`: solo reexporta.

## Plan de tareas
Coordinación:
- **Prerrequisito:** la Fase 3 de `organizer-dashboard.md` debe estar cerrada (todas sus casillas marcadas). Esta spec modifica `organizer.schema.ts`, `organizerEventForm.ts`, `TicketTypesField.tsx`, `OrganizerEventForm.tsx` y sus tests tal como los deje esa fase. Si no está cerrada, se detiene y se avisa.
- **Seating en curso:** `seating-ticket-selection.md` F5 y `seating-stadium-map.md` modifican `seatRows.ts`, `SeatLegend.tsx` y `SeatPlan.tsx`. Aquí **no se modifican**: solo se importan `generateSeatRows`, `SEAT_PITCH`, `SEAT_PLAN_MARGIN` y `SeatShape`, que esas specs mantienen sin cambiar su contrato. Esta spec no crea ni toca `modules/seating/seats.ts`.
- **`layout-fullscreen-shells.md`** (borrador en paralelo): esta spec no toca `app/organizador/*` ni `OrganizerNav`. En `pages/organizer.md` solo se edita la sección "Crear evento". Si esa spec ya cambió el archivo, se parte de su versión.
- Nadie hace commits ni ejecuta `npm run build` en paralelo: el build lo corre el reviewer al cerrar cada fase.

### Fase 1. Asientos y precio por zona (15 archivos)
- [ ] T1. Utilidad de letras de fila con test, componente `SeatGridPreview` y entrada pública `modules/seating/preview.ts`.
  - Archivos: `modules/seating/utils/rowLabels.ts`, `modules/seating/utils/rowLabels.test.ts`, `modules/seating/components/SeatGridPreview.tsx`, `modules/seating/preview.ts`.
  - Depende de: la Fase 3 de organizer-dashboard (orden global).
  - Secuencial (base: entrada pública nueva de seating).
- [ ] T2. Schema de la fila con `kind` y límites, tipos, y las utils `getSeatGridSize`, `getRowCapacity` y `formatSeatGridSummary`, con `getTicketCapacity` y `createTicketTypeRow` ajustados. Con tests.
  - Archivos: `modules/organizer/schemas/organizer.schema.ts`, `modules/organizer/schemas/organizer.schema.test.ts`, `modules/organizer/types/organizer.types.ts`, `modules/organizer/utils/organizerEventForm.ts`, `modules/organizer/utils/organizerEventForm.test.ts`, `modules/organizer/utils/eventPreview.test.ts` (este último solo si deja de compilar).
  - Depende de: T1 (`getSeatRowLabels`).
  - Secuencial.
- [ ] T3. Bloque por tipo de entrada con "Ubicación", campos de zona numerada y vista previa del plano. Con test.
  - Archivos: `modules/organizer/components/TicketTypesField.tsx`, `modules/organizer/components/TicketTypeCapacityFields.tsx`, `modules/organizer/components/OrganizerEventForm.tsx` (solo si hace falta para la revalidación al cambiar `kind`), `modules/organizer/components/OrganizerEventForm.test.tsx`.
  - Depende de: T1, T2.
  - Paralelo con T4.
- [ ] T4. Diseño de página: sección "Crear evento" con el bloque por zona, la vista previa del plano y los límites.
  - Archivos: `design-system/ticketera/pages/organizer.md`.
  - Depende de: — (documentación; sigue esta spec).
  - Paralelo con T2 y T3.

### Fase 2. Datos del evento público (5 archivos)
- [ ] T1. Schema con `organizer`, `minAge` (`MIN_AGE_LABELS`/`MIN_AGE_OPTIONS`), `doorsOpen` y `address`, y sus reglas al publicar. Con tests.
  - Archivos: `modules/organizer/schemas/organizer.schema.ts`, `modules/organizer/schemas/organizer.schema.test.ts`, `modules/organizer/utils/eventPreview.test.ts` (solo si deja de compilar).
  - Depende de: Fase 1.
  - Secuencial.
- [ ] T2. Campos nuevos en el formulario (disposición del requisito 8) y valores iniciales. Con test.
  - Archivos: `modules/organizer/components/OrganizerEventForm.tsx`, `modules/organizer/components/OrganizerEventForm.test.tsx`.
  - Depende de: T1.
  - Paralelo con T3.
- [ ] T3. Diseño de página: campos nuevos en la sección "Crear evento".
  - Archivos: `design-system/ticketera/pages/organizer.md`.
  - Depende de: Fase 1.
  - Paralelo con T1 y T2.

## Preguntas abiertas
1. **Recargo por fila:** ¿hace falta que algunas filas de una zona numerada (p. ej. las primeras) cuesten más? Hoy el precio es por zona (decisión 1). Un recargo cambiaría el modelo de seating (`VenueZone.price`), el plano ("S/ X c/u"), el resumen de compra, el checkout y el "Desde S/" de las tarjetas. Si se pide, la alternativa más simple es crear dos zonas numeradas ("Platea preferente" filas A–C y "Platea" filas D–J), pero hoy las letras de cada zona empiezan siempre en A.
2. **Filas con números:** ¿se quiere poder numerar filas con números (1, 2, 3…)? El formato de seating (`[A-Z]{1,2}`, ids `<zona>-<FILA>-<n>`) solo admite letras. Cambiarlo afectaría a seating y checkout.
3. **Zonas numeradas más complejas:** ¿hacen falta filas de distinta longitud, pasillos, asientos accesibles o bloqueados, o numeración par/impar? Con el plano rectangular ya hay un punto de partida, y `generateSeatRows` admite filas de distinta longitud y asientos accesibles.
4. **Límites:** ¿son adecuados 30 filas × 60 asientos (1,800 por zona)? ¿Hace falta un máximo de cantidad en zonas generales o de número de tipos de entrada?
5. **Edad mínima:** ¿la lista "Todo público, +12, +14, +16, +18" es correcta? El catálogo actual solo usa 0 y 18.
6. **Apertura de puertas:** ¿puede ser el día anterior a la hora de inicio, en eventos que empiezan pasada la medianoche? Hoy se exige el mismo día y una hora menor o igual.
7. **Organizador:** ¿debe salir del perfil de la cuenta, en lugar de escribirse en cada evento? Hoy `auth` no tiene rol ni perfil de organizador (decisión 1 de la spec base).
8. **Descripción por tipo de entrada:** el schema del evento la admite (opcional) y el selector de entradas la muestra ("Campo de pie, sin ubicación asignada."). ¿Se pide en el formulario?
9. **Publicar en `/eventos`, el detalle y la compra (análisis de viabilidad):** hoy no es viable sin backend, y se recomienda esperar a una API real o a una spec dedicada.
   - **Dónde viven los datos:**
     - el catálogo (`/eventos`, landing), el detalle `/eventos/[slug]` (con `generateStaticParams`) y la compra (`/eventos/[slug]/entradas`, `resolveCheckoutOrder`) se resuelven **en el servidor** con el mock de `events` y `seating`;
     - los eventos creados viven en el `localStorage` **del cliente**.
   - **Qué haría falta para mostrarlos:**
     - **Persistir el evento completo:** descripción, datos de la Fase 2, zonas y asientos. Hoy el store solo guarda `OrganizerEvent` (decisión 9).
     - **Catálogo:** una isla cliente en `/eventos` que mezcle esos eventos con los del servidor. Los filtros, facetas y conteos del servidor dejarían de cuadrar.
     - **Detalle y compra:** una ruta de detalle y de compra renderizada en el cliente.
     - **Checkout:** que resuelva los pedidos en el cliente, porque hoy valida contra el servidor.
     - **Mapa:** generar un `VenueMap` automático (polígonos y posiciones de las zonas) a partir de las zonas creadas.
   - **Coste:** toca `events`, `seating` y `checkout`, que tienen specs en curso (`events-ui-refresh`, `seating-stadium-map`), y serían al menos 2 fases propias.
   - **Alternativa barata si interesa:** una "vista previa de la página del evento" dentro del panel. Necesitaría que `events` exponga sus componentes de detalle en una entrada sin el barrel.

   ¿Se aborda en una spec aparte?
