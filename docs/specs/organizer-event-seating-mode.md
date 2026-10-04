# Crear evento: modo de ubicación, datos completos de la landing y publicación real

- Módulo: organizer (con cambios acotados en events, seating y lib)
- Estado: aprobado

## Objetivo
Pedidos del usuario:
- "Cuando registren su evento los organizadores, deben elegir si requiere un mapa de asientos o no para que esté claro, y debe tener toda la información necesaria."
- "Cada evento debe tener su portada como si fuera su propia landing page, pero dentro de nuestra app Ticketera."

Hoy el formulario `/organizador/eventos/nuevo`:
- **No pide una decisión a nivel de evento.** Solo existe el radio "Ubicación" de cada tipo de entrada, que empieza en "General", y nada explica qué verá quien compra.
- **Deja datos sueltos o incompletos:**
  - la ciudad es texto libre, pero el filtro público solo conoce 5 (`citySchema`);
  - la portada no es obligatoria, pero la BD (`events_draft_complete_check`) y `eventSchema.imageUrl` la exigen;
  - no pide el máximo de entradas por compra (`ticket_types.max_per_order`) ni la descripción por tipo de entrada, que el selector de entradas muestra.
- **Los eventos creados no llegan al sitio:** se guardan solo en `localStorage`.

Esta spec resuelve las tres cosas en 5 fases:
- **Fases 1 y 2, solo UI:** se pueden implementar ya.
  - F1: modo de ubicación, ciudad, portada, máximo por compra y descripción por tipo.
  - F2: vista previa de la página completa del evento.
- **Fases 3 a 5, con BD:** el recinto, el guardado y la publicación real en `/eventos` y `/eventos/[slug]`. Tienen prerrequisitos de infraestructura (ver "Prerrequisitos").

Amplía `docs/specs/organizer-event-seating.md` (aprobada, cerrada; en adelante "spec previa") y `docs/specs/organizer-dashboard.md` ("spec base"). Ninguna de las dos se edita. Siguen vigentes sus decisiones, salvo las que se cambian aquí de forma explícita.

## Alcance
- Incluye:
  - **Fase 1. Modo de ubicación y datos obligatorios (UI y validación, sin BD):**
    - selector obligatorio al publicar "¿Cómo se ubica el público?": sin asientos numerados, con mapa de asientos o mixto. Condiciona los tipos de entrada;
    - "Ciudad" como `Select` con las 5 ciudades del sitio;
    - portada obligatoria al publicar, con guía (formato, peso, tamaño) y vista previa de los recortes;
    - "Máximo por compra" y "Descripción (opcional)" en cada tipo de entrada;
    - tests y `design-system/ticketera/pages/organizer.md`.
  - **Fase 2. La página del evento como landing (UI, sin BD):**
    - guía de párrafos en "Descripción";
    - vista previa de la página de detalle completa, con los componentes reales de `events`.
  - **Fase 3. Recinto del catálogo o recinto nuevo:**
    - el organizador elige un recinto aprobado de la BD (solo lectura) o propone uno;
    - con recinto del catálogo, los tipos de entrada salen de sus zonas.
  - **Fase 4. Guardar en la BD:**
    - portada en Cloud Storage, slug único;
    - el evento, el recinto propuesto, sus zonas y asientos, y los tipos de entrada.
  - **Fase 5. Publicar en el sitio:**
    - el evento con recinto del catálogo queda `published`: aparece en `/eventos`, en `/eventos/[slug]` y en la compra, con mapa o lista según el modo;
    - el panel `/organizador` lee los eventos de la BD.
- No incluye:
  - **Editar o reabrir eventos y borradores guardados.** No existe ruta de edición. Un borrador guardado en BD (F4) se ve en el panel, pero no se reabre. Va en una spec aparte, con las reglas de edición de system-design §7.11.
  - **El flujo del admin para aprobar recintos o eventos** (moderación, F4 de `system-design.md` §13). Un evento con recinto propuesto queda "En revisión" hasta que exista ese flujo (decisión 16).
  - **Identidad real del organizador** (Clerk, F2 de system-design). Es un prerrequisito de F4, no se implementa aquí (Preguntas abiertas 1).
  - **Aplicar el máximo por tipo en la compra.** La compra sigue con el tope global `MAX_TICKETS_PER_ORDER = 10`. Hacer cumplir `max_per_order` por zona corresponde a la compra real (F3 de system-design §13, "Límites anti-abuso").
  - **Cambiar el default 6 de `ticket_types.max_per_order` en la BD.** Desde aquí siempre se escribe el valor elegido, y el seed ya escribe 10. Ver decisión 7.
  - **Ciudades fuera de `CITIES`.** Añadir una ciudad es editar esa constante, y entonces el filtro público también la ofrece.
  - **Editor visual de mapas** (fuera de alcance en system-design §14). El mapa de un recinto propuesto se genera solo, en rectángulos (decisión 17).
  - **Tope de entradas por tipo según su capacidad** (p. ej. máximo 10 con capacidad 5), recargo por fila y filas con números (preguntas de la spec previa).
  - **Cambios en `EventPreviewCard`** (decisión 10), en `modules/checkout`, `app/(purchase)/checkout` y `modules/seating/data/**`. Esta última carpeta la toca `seating-all-venue-maps.md`.

## Prerrequisitos
- **Fases 1 y 2:** ninguno. Parten del código actual. `organizer-event-seating.md` está cerrada.
- **Fase 3:** BD con el seed (`npm run db:migrate` y seed).
- **Fase 4:**
  - **P1, identidad del organizador en el servidor:** una función `requireOrganizer(): Promise<{ userId: string }>` que las Server Actions puedan usar. Si no existe cuando empiece la fase, se detiene y se consulta (Preguntas abiertas 1).
  - **P2, bucket de Cloud Storage para portadas:** `GCS_BUCKET` y credenciales ADC (system-design §5 y §8).
- **Fase 5:** Fase 4 cerrada.

## Decisiones tomadas
1. **Tres modos de ubicación, guardados en el formulario como `seatingMode`:**
   - `"general"`: "Sin asientos numerados";
   - `"numbered"`: "Con mapa de asientos";
   - `"mixed"`: "Mixto".

   Se incluye "Mixto" porque la mayoría de eventos del sitio lo son (campo de pie + tribunas o plateas numeradas, como `noche-de-sintetizadores`). Los valores reutilizan los de `kind` (`general`/`numbered`, como `seating_type` en la BD), más `mixed`.
2. **Sin valor por defecto.** El pedido es que el organizador *elija* para que quede claro: un valor por defecto permitiría publicar sin decidir.
   - Mientras no se elige, la sección "Tipos de entrada" muestra solo una indicación, sin filas.
   - Al publicar es obligatorio. En borrador no (la spec base y la previa solo exigen el nombre en borrador).
3. **El modo condiciona las filas, cambiando su `kind`** (`applySeatingMode`):
   - "Sin asientos" pone todas en `general` y oculta el radio "Ubicación" de cada fila;
   - "Con mapa" pone todas en `numbered` y oculta el radio;
   - "Mixto" deja cada fila como estaba y muestra el radio.

   Los valores del otro tipo se conservan (decisión 7 de la spec previa), así que volver atrás no pierde cantidades, filas ni asientos. Se cambia el `kind` en lugar de derivarlo en cada lectura: así schema, capacidad y vista previa siguen leyendo `row.kind` sin cambios (KISS). La fila nueva nace `numbered` en modo "Con mapa" y `general` en los demás.
4. **"Mixto" exige al menos una zona de cada tipo al publicar.** Si no, el modo elegido no describiría el evento. El error se muestra en el selector de modo, y no en la lista: el selector es lo que recibe el foco y el mensaje dice cómo corregirlo. La lista se revalida contra el modo cada vez que cambia.
5. **Qué ve quien compra: se explica en cada opción**, en una línea de texto, para que se lea antes de elegir:
   - con mapa del recinto, las zonas numeradas se eligen asiento por asiento en el plano (`/eventos/[slug]/entradas`) y las generales por cantidad;
   - sin mapa, se elige la cantidad de cada tipo (`TicketSelector`).
6. **Ciudad = `Select` con `CITIES`** (`modules/events/data/searchOptions.ts`), la misma lista que el filtro público, para que un evento publicado sea filtrable.
   - `CITIES` se reexporta desde `modules/events/format.ts`, la entrada cliente de `events`. El barrel arrastraría services con BD al bundle cliente (Decisión 17 de la spec base).
   - Es solo una línea en una entrada que únicamente reexporta (SETUP §1, regla 4).
7. **"Máximo por compra" por tipo de entrada:**
   - entero de 1 a `MAX_TICKETS_PER_ORDER` (10), por defecto 10;
   - se importa de `@/modules/events/purchase`, la entrada cliente que ya usan checkout y seating.

   La BD tiene `max_per_order DEFAULT 6`, pero el seed escribe 10 y la compra aplica 10 en total. Aquí se adopta 10 para no contradecir lo que ve quien compra, y desde F4 se escribe siempre el valor explícito, así que el default no se usa.
8. **Descripción por tipo de entrada, opcional y de 150 caracteres como máximo.** `TicketSelector` la muestra bajo el nombre (`ticketTypeSchema.description`) y `ticket_types.description` existe. Es un `Input`, no un `Textarea`: es una línea ("Campo de pie, sin ubicación asignada.").
9. **La portada es obligatoria al publicar y se valida al elegirla:**
   - JPG o PNG (como hoy), hasta 5 MB y al menos 1200 × 675 px. El tamaño se lee con `createImageBitmap`;
   - se recomienda 1920 × 1080 (16:9).

   Se recorta así: hero del detalle 16:9 en móvil y ~4:3 en `lg`, tarjeta del listado ~2:1, carrusel de inicio 21:8 en `lg` y 4:5 en móvil. Por eso la guía pide dejar lo importante en el centro (en los casos extremos, el 45 % central del ancho y el 68 % central del alto), y la vista previa muestra los 5 recortes.

   En el formulario, la obligatoriedad es un valor booleano `hasCoverImage`: el archivo sigue fuera del store (Decisión 7 de la spec base) y `useZodForm` ve y enfoca el error como los demás.
10. **`EventPreviewCard` no cambia.** Replica `EventCard` del listado, que no muestra el modo de ubicación ni la descripción por tipo. Añadirlos enseñaría algo que el comprador no verá. Lo completa la vista previa de la página completa (F2).
11. **El store no cambia en F1 y F2** (decisión 9 de la spec previa). El modo, el máximo por compra y la descripción por tipo no se guardan en `mentec-organizer-events`, porque nadie los lee hasta F4, cuando van a la BD. La ciudad se guarda como hoy, ahora siempre como un valor de `CITIES`.
12. **"Ingreso: Entrada digital con QR" sigue fijo** en `EventDetailInfo`. Es una regla de la plataforma (todas las entradas son QR, system-design §7) y no algo que decida el organizador. Con eso, todo lo demás que muestra la página de detalle ya lo pide el formulario tras F1. Inventario:

    | Dato en `/eventos/[slug]` | Componente | Campo del formulario |
    |---|---|---|
    | Portada (hero) | `EventDetailHeader` | "Imagen de portada" (obligatoria, F1) |
    | Categoría (badge y migas) | `EventDetailHeader` | "Categoría" |
    | Título | `EventDetailHeader` | "Nombre del evento" |
    | Fecha y hora | `EventDetailHeader` / `EventDetailInfo` | "Fecha", "Hora de inicio" |
    | Lugar, ciudad | `EventDetailHeader` | "Lugar", "Ciudad" (`Select`, F1). Recinto en F3 |
    | "Desde S/" y CTA | `EventDetailHeader` | Precio mínimo de los tipos |
    | "Acerca del evento" (párrafos) | `EventDetailInfo` | "Descripción" (guía de párrafos en F2) |
    | "Organiza: …" | `EventDetailInfo` | "Organizador" |
    | Apertura de puertas, inicio, edad mínima | `EventDetailInfo` | "Apertura de puertas", "Hora de inicio", "Edad mínima" |
    | Ingreso | `EventDetailInfo` | Fijo (esta decisión) |
    | "Lugar": mapa, dirección, "Cómo llegar" | `EventDetailInfo` | "Lugar", "Dirección", "Ciudad" |
    | Zonas y precios (nombre, descripción, precio) | `TicketSelector` / `ZonePricesCard` | Tipos de entrada (+ descripción, F1) |
    | Mapa de asientos o lista | `/entradas` / `TicketSelector` | Modo de ubicación (F1) + recinto (F3–F5) |
    | Eventos relacionados, estado (agotado) | `RelatedEvents`, ventas | No los decide el organizador |
13. **Vista previa de la página completa (F2): en un `Dialog` a pantalla completa con los componentes reales** `EventDetailHeader`, `EventDetailInfo` y `TicketSelector`, sin duplicarlos.
    - Hacen falta dos cambios de infraestructura, sin cambiar componentes:
      - **`lib/env.ts`:** al importarse evalúa las variables de servidor y fallaría en el navegador. `EventDetailInfo` solo necesita `publicEnv`, que pasa a `lib/publicEnv.ts`;
      - **entrada `modules/events/detail.ts`:** solo reexporta esos tres componentes y el tipo `EventDetail`.
    - El contenido va dentro de un contenedor `inert`: enlaces, "Guardar", "Compartir" y el selector no navegan ni escriben en stores. Un texto visible fuera del `inert` lo explica.
    - La portada local (`blob:`) funciona con `next/image`, que desactiva la optimización para `blob:` (`get-img-props.js`).
    - Tabs no: ocultarían el formulario y perderían el scroll.
14. **En la vista previa, el aside de compra es siempre `TicketSelector`.** `ZonePricesCard` necesita un `VenueZone` con geometría, que el formulario no tiene. En los modos con mapa, una nota indica que "Comprar entradas" llevará al plano para elegir asiento.
15. **Recinto (F3):**
    - **del catálogo:** recintos `approved` de la BD, filtrados por la ciudad elegida;
    - **nuevo (propuesto):** nombre, dirección y ciudad, como hoy.

    Con un recinto del catálogo, las zonas son las suyas (`venue_sections`). El organizador marca cuáles vende y, para cada una, pone nombre comercial, precio, máximo por compra y descripción. El tipo de zona y la capacidad no se editan, porque los fija el recinto. El modo de ubicación se valida contra esas zonas con la regla de las decisiones 3–4:
    - "Sin asientos": todas `general`;
    - "Con mapa": todas `numbered`;
    - "Mixto": de ambos tipos.

    En los modos con mapa solo se ofrecen recintos con geometría (`map_view_box` no nulo). Si no, el evento se vendería sin plano.
16. **Publicar (F5):**
    - **Con recinto del catálogo:** el evento pasa a `published` y aparece en el sitio. Es lo que pide el usuario. Desvía de system-design §7.11 (moderación previa) mientras no exista la moderación (F4 de system-design). Se confirma en Preguntas abiertas 2.
    - **Con recinto propuesto:** el recinto nace `pending_review` y el evento queda `pending_review` ("En revisión"), porque un evento solo se publica con un recinto `approved` (data-gaps, decisión 6).
17. **El mapa de un recinto propuesto se genera solo (F4):**
    - `map_view_box`, escenario arriba y un rectángulo (`map_path`) por zona, apiladas en el orden de los tipos de entrada;
    - en las numeradas, `venue_seats` en grilla con `generateSeatRows` (filas A…, asientos 1…n, mismo paso que la vista previa).

    Así, cuando se apruebe, el recinto ya tiene mapa sin un editor (system-design §14).
18. **Slug:** `slugify(título)` (se extrae de `lib/db/seed/buildSeedData.ts` a `lib/slug.ts`; DRY). Si ya existe, se añade `-2`, `-3`… Se genera al guardar por primera vez y no cambia.
19. **Escritura con Server Actions** (system-design §3: "Server Components y Server Actions para todo lo interno"), en `modules/organizer/actions/organizer.actions.ts`. Es una subcarpeta nueva del módulo, que SETUP no lista pero que la arquitectura exige. Validan de nuevo con `organizerEventFormSchema` en el servidor y con `requireOrganizer()`.

## Requisitos

### Comunes
1. Reglas de la spec base y de la previa:
   - tokens, `h-11`, foco visible, sin scroll horizontal a 375/768/1024/1440;
   - es-PE y PEN;
   - los archivos cliente de `organizer` no importan valores del barrel `@/modules/events` (solo `@/modules/events/format`, `@/modules/events/purchase` y, desde F2, `@/modules/events/detail`);
   - de `seating` solo se importa `@/modules/seating/preview`.
2. El borrador sigue exigiendo solo el nombre. Todas las reglas nuevas se aplican solo al publicar (`intent: "publish"`).

### Fase 1. Modo de ubicación y datos obligatorios
3. **Selector de modo** (`SeatingModeField`), en una sección nueva entre "Imagen de portada" y "Tipos de entrada":
   - `FormSection` titulada "Mapa de asientos", con la descripción "Define si quien compra elegirá su asiento en un plano. De esto depende cómo configuras los tipos de entrada.";
   - texto visible "¿Cómo se ubica el público?" (`text-sm font-medium`), al que apunta el `aria-labelledby` del `RadioGroup`;
   - las tres opciones usan el patrón de tarjeta de elección de "Ubicación" (`FieldLabel` > `Field orientation="horizontal"` > `RadioGroupItem` + icono + `FieldTitle` + línea `text-sm text-muted-foreground` enlazada con `aria-describedby`):

   | Valor | Título | Icono | Línea |
   |---|---|---|---|
   | `general` | "Sin asientos numerados" | `PersonStanding` | "Todas las zonas son generales (de pie). Quien compra elige cuántas entradas quiere." |
   | `numbered` | "Con mapa de asientos" | `Armchair` | "Todas las zonas tienen filas y asientos. Quien compra elige su asiento en el plano." |
   | `mixed` | "Mixto" | `Layers` | "Zonas de pie y zonas numeradas, como campo y tribunas. Quien compra elige asiento solo en las numeradas." |

   - **Disposición:** `grid gap-3 md:grid-cols-3`; en móvil, una tarjeta debajo de otra. Tarjetas `min-h-11 cursor-pointer`; la elegida, con `has-data-checked:border-primary has-data-checked:bg-accent`.
   - **Estado inicial:** ninguna opción marcada.
   - **Al elegir:** `setValue("seatingMode", mode)`, `setValue("ticketTypes", applySeatingMode(rows, mode))` y revalidación de `seatingMode` y `ticketTypes` (`handleBlur`).
   - **Errores:** `aria-invalid` en el `RadioGroup` y `aria-describedby` hacia `FieldError` con id `organizer-event-seatingMode-error`. Mensajes:
     - sin modo: "Elige cómo se ubica el público";
     - "Mixto" sin una zona de cada tipo: "Un evento mixto necesita al menos una zona general (de pie) y una numerada".
4. **"Tipos de entrada" según el modo:**
   - **subtítulo:** pasa a "Cada tipo de entrada es una zona con su precio y su capacidad.";
   - **sin modo:** el contenido de la sección es solo `<p className="text-sm text-muted-foreground">` "Elige arriba cómo se ubica el público para configurar los tipos de entrada." No hay filas, ni "Agregar", ni "Capacidad total". Las filas siguen en el estado;
   - **`general` o `numbered`:** no se renderiza el grupo "Ubicación" de cada fila; se ven los campos del tipo forzado (los de la spec previa);
   - **`mixed`:** el grupo "Ubicación" se ve como en la spec previa;
   - **"Agregar tipo de entrada":** crea `createTicketTypeRow(getNewRowKind(mode))`;
   - **revalidación:** cambiar una fila, agregarla o quitarla revalida `ticketTypes` y `seatingMode`.
5. **Campos nuevos en cada fila** (`TicketTypesField`), tras "Nombre | Precio (S/)", en una grilla con las mismas columnas (`md:grid-cols-[minmax(0,1fr)_160px] gap-4`; en móvil, uno debajo del otro):
   - **"Descripción (opcional)":**
     - `Input`, placeholder "Ej. Campo de pie, sin ubicación asignada.", `maxLength={150}`;
     - `FieldDescription` "Se muestra bajo el nombre al elegir entradas.";
     - error al publicar si supera 150 caracteres (con trim): "La descripción debe tener como máximo 150 caracteres".
   - **"Máximo por compra":**
     - `Input type="number" inputMode="numeric" min=1 max=10 step=1`, valor inicial `"10"`;
     - `FieldDescription` "Entradas de este tipo en una misma compra (1 a 10).";
     - errores al publicar:
       - vacío: "Ingresa el máximo por compra";
       - no es un entero entre 1 y 10: "El máximo por compra debe ser un número entero entre 1 y 10".

   Usan el patrón `TicketTypeInputField` (ids `ticket-type-<id>-description` / `-maxPerOrder`, `aria-invalid`, `aria-describedby` hacia la ayuda y el error). El orden en el DOM es: Nombre | Precio → Descripción | Máximo por compra → Ubicación (solo mixto) → capacidad → plano.
6. **"Ciudad" como `Select`:**
   - `items` = `CITIES` (la etiqueta es el propio nombre), con `SelectValue placeholder="Elige la ciudad"` y valor inicial `""`, sin opción marcada;
   - `SelectTrigger id="organizer-event-city"` (la etiqueta "Ciudad" sigue asociada), `aria-invalid` y `aria-describedby` hacia el error;
   - al publicar, con valor vacío o fuera de `CITIES`: "Elige la ciudad" (sustituye a "Indica la ciudad");
   - tras el primer intento, cambiar el valor revalida, como "Categoría".
7. **Portada** (`CoverImageField` + `OrganizerEventForm`):
   - **Texto de ayuda de la zona de subida:** "JPG o PNG, hasta 5 MB. Recomendado: 1920 × 1080 px (16:9); mínimo 1200 × 675 px.".
   - **Guía bajo el campo**, siempre visible (`text-sm text-muted-foreground`): "Es la imagen principal de la página de tu evento. Deja lo importante (rostros, texto, logo) en el centro: cada pantalla la recorta de forma distinta.".
   - **Al elegir o soltar un archivo**, `getCoverImageError(file)` da el primer error que aplique, en este orden (si hay error, se conserva la imagen anterior):
     1. tipo: "Sube una imagen en formato JPG o PNG.";
     2. peso > 5 MB: "La imagen pesa más de 5 MB. Sube una más liviana.";
     3. no se puede leer: "No se pudo leer la imagen. Prueba con otro archivo.";
     4. menor que 1200 × 675: "La imagen debe medir al menos 1200 × 675 px.".
   - **Valor `hasCoverImage`:** pasa a `true` al aceptar una imagen y a `false` al quitarla. Al publicar sin portada: "Sube la imagen de portada", en el mismo `FieldError` del campo. El error de archivo tiene prioridad sobre el de obligatoriedad. El `input` lleva `aria-invalid`, así que recibe el foco si es el primer error.
   - **Con imagen, `CoverCropPreview` bajo la vista previa actual:**
     - título "Así se recorta tu portada" (`h3 text-sm font-semibold`);
     - grilla `grid grid-cols-2 gap-3 md:grid-cols-3` de `figure`. Cada uno lleva la imagen (`next/image` `fill` `unoptimized` `object-cover`, `alt=""`) en un marco `relative overflow-hidden rounded-lg bg-muted` con su `aspect-*`, y un `figcaption` `text-xs text-muted-foreground`:
       - "Página del evento · móvil" (`aspect-[16/9]`);
       - "Página del evento · escritorio" (`aspect-[4/3]`);
       - "Listado de eventos" (`aspect-[2/1]`);
       - "Inicio · escritorio" (`aspect-[21/8]`, `col-span-2`);
       - "Inicio · móvil" (`aspect-[4/5]`);
     - debajo, la nota "Los recortes de «Inicio» solo se usan si Mentec destaca tu evento en la portada.".
8. **Schema** (`organizer.schema.ts`; mensajes exactos de los requisitos 3–7):
   - `seatingModeSchema = z.enum(["general", "numbered", "mixed"])`;
   - en `organizerEventFormSchema`: `seatingMode: z.union([z.literal(""), seatingModeSchema])` y `hasCoverImage: z.boolean()`;
   - la fila cruda gana `description: z.string()` y `maxPerOrder: z.string()`;
   - en `ticketTypeBase` (las dos ramas de `ticketTypeFormSchema`), las reglas de `description` (trim, máximo `TICKET_DESCRIPTION_MAX_LENGTH = 150`) y `maxPerOrder` (`intInRange` con `MAX_TICKETS_PER_ORDER`);
   - el `superRefine` (solo al publicar) añade: `seatingMode` vacío, la regla de "Mixto" (decisión 4), `city` fuera de `CITIES` y `hasCoverImage === false`. La lista de obligatorios ya no incluye `city`, que pasa a su regla propia.
   - `COVER_IMAGE_RULES = { maxBytes: 5 * 1024 * 1024, minWidth: 1200, minHeight: 675 }` vive en el schema o en las utils y lo usan las utils y los textos.
9. **Utils** (`organizerEventForm.ts`):
   - `createTicketTypeRow(kind: TicketTypeKind = "general")`: `{ id, name: "", price: "", description: "", maxPerOrder: "10", kind, quantity: "", rows: "", seatsPerRow: "" }`;
   - `getNewRowKind(mode: SeatingMode | ""): TicketTypeKind`: `"numbered"` solo si `mode === "numbered"`;
   - `applySeatingMode(rows, mode)`: decisión 3. Devuelve filas nuevas y conserva los demás campos;
   - `getCoverImageError(file: File): Promise<string | null>`: requisito 7. Usa `createImageBitmap` y cierra el bitmap. Sustituye a `isAcceptedCoverImage`, que se elimina con su test;
   - `getTicketTypeErrors` devuelve también `description` y `maxPerOrder`. `TicketTypeRowErrors` incluye esas dos claves;
   - `toOrganizerEvent` no cambia (decisión 11).

### Fase 2. La página del evento como landing
10. **"Descripción" del evento:** `FieldDescription` "Se muestra en «Acerca del evento». Separa los párrafos con una línea en blanco." (el detalle parte por `\n\n`).
11. **Botón "Ver página del evento"** (`variant="outline"`, `h-11`, icono `Eye`), en el `aside` de la vista previa, bajo el texto de la tarjeta. Abre un `Dialog` de shadcn a pantalla completa en todos los anchos (`max-w-none h-dvh` o equivalente, con scroll interno), titulado "Vista previa de la página". Contenido:
    - **un texto fuera de la zona inerte:** "Así verá tu evento quien entre a su página. Los botones no funcionan en la vista previa.";
    - **si faltan datos:** la lista "Para ver la página completa, completa:" con los que falten, en este orden: Nombre del evento, Imagen de portada, Fecha, Hora de inicio, Apertura de puertas, Lugar, Ciudad, Dirección, Descripción, Organizador, Un tipo de entrada con nombre y precio. Un dato cuenta como presente si es válido para la regla de publicación de su campo;
    - **si no falta ninguno:** dentro de un `<div inert>`, la misma composición que `app/(site)/eventos/[slug]/page.tsx`: `EventDetailHeader` (`purchaseHref="#"`), `TicketSelector` y `EventDetailInfo`, con las mismas clases de grilla. En los modos `numbered`/`mixed`, encima del selector va la nota "En el sitio, «Comprar entradas» llevará al plano para elegir asiento.". No se incluyen eventos relacionados ni la barra móvil.

    El `Dialog` se cierra con su botón, con Esc o con el overlay, y el foco vuelve a "Ver página del evento".
12. **`buildEventDetailPreview(values, coverUrl)`** (`utils/eventDetailPreview.ts`) devuelve `{ event: EventDetail } | { missing: string[] }`:
    - `slug: "vista-previa"`, `status: "available"`, `featured: false`;
    - `startsAt` y `doorsOpenAt` con `buildStartsAt`;
    - `priceFrom` con `getMinTicketPrice`;
    - `ticketTypes`: las filas con nombre y precio válidos, con `id` `tipo-<n>`, su descripción (si no está vacía) y `status: "available"`;
    - `minAge` numérico, `description` tal cual (con trim).
13. **Infraestructura:**
    - `lib/publicEnv.ts` exporta `publicEnvSchema` y `publicEnv` (el código se mueve sin cambios desde `lib/env.ts`, que deja de exportarlos);
    - `EventDetailInfo` importa de `@/lib/publicEnv`;
    - `modules/events/detail.ts` solo reexporta `EventDetailHeader`, `EventDetailInfo`, `TicketSelector` y el tipo `EventDetail`, con un comentario que explica por qué existe.

### Fase 3. Recinto del catálogo o recinto nuevo
14. **Datos del catálogo:**
    - `getVenueCatalog(): Promise<VenueOption[]>` en `modules/seating/services/seating.service.ts`, exportada por el barrel de seating (servidor). Devuelve los recintos `approved` con `{ id, name, city, address, hasMap: mapViewBox !== null, sections: { id, name, seating, capacity: number /* general: capacity; numbered: nº de venue_seats */ }[] }`, en orden de `sortOrder`;
    - `app/organizador/eventos/nuevo/page.tsx` la llama y pasa `venues` a `<OrganizerEventForm venues={…} />`.
15. **En "Fecha y lugar",** después de "Ciudad", un `RadioGroup` "Recinto" con dos opciones:
    - **"Recinto del catálogo":** muestra un `Select` "Recinto" con los recintos de la ciudad elegida; en los modos `numbered`/`mixed`, solo los que tienen `hasMap`. "Dirección" se rellena y queda de solo lectura;
    - **"Recinto nuevo":** muestra "Lugar" y "Dirección" como hoy, con la nota "Mentec revisará el recinto antes de publicar el evento.".

    Sin ciudad, el `Select` está deshabilitado con el placeholder "Elige primero la ciudad". Sin recintos que ofrecer, la opción "Recinto del catálogo" está deshabilitada, con el texto "No hay recintos del catálogo para esta ciudad y modo.". Al publicar:
    - sin opción: "Elige si el recinto es del catálogo o nuevo";
    - catálogo sin recinto: "Elige el recinto".
16. **Con un recinto del catálogo, "Tipos de entrada" lista sus zonas** (`CatalogZonesField`):
    - cada zona es un `<fieldset>` con un `Checkbox` "Vender esta zona", su tipo ("General (de pie)" o "Numerada") y su capacidad en texto, más los campos Nombre (por defecto, el nombre de la zona), Precio, Descripción y Máximo por compra, con las reglas de F1;
    - sin "Agregar" ni "Quitar";
    - el modo se valida contra las zonas marcadas (decisión 15): "Las zonas elegidas no coinciden con «<modo>»". Sin zonas marcadas: "Elige al menos una zona para vender";
    - la fila guarda `sectionId`.

    Con "Recinto nuevo", "Tipos de entrada" es el de F1.
17. **Schema:** `venueSource: z.union([z.literal(""), z.enum(["catalog", "new"])])`, `venueId: z.string()` y en la fila `sectionId: z.string()` (`""` en los recintos nuevos). Las reglas por fila de F1 se aplican a las zonas marcadas.

### Fase 4. Guardar en la BD
18. **Portada:** `lib/storage.ts` (`server-only`, `@google-cloud/storage`) exporta `uploadCoverImage(file: File): Promise<string>`:
    - sube a `GCS_BUCKET` con la clave `covers/<uuid>.<ext>` y devuelve la URL pública `https://storage.googleapis.com/<bucket>/<key>`;
    - repite en el servidor la validación de tipo y peso;
    - `next.config.ts` añade ese host a `images.remotePatterns`;
    - `lib/env.ts` añade `GCS_BUCKET` (opcional; sin ella, la acción devuelve el error "No se pudo guardar la portada. Inténtalo más tarde.").
19. **Slug:** `lib/slug.ts`: `slugify(text)` (movido desde el seed, que pasa a importarlo) y `withUniqueSuffix(base, taken: Set<string>)`. Ver decisión 18.
20. **Server Action `saveOrganizerEvent(formData)`** (`modules/organizer/actions/organizer.actions.ts`, `"use server"`):
    1. `requireOrganizer()`;
    2. parsea los valores (JSON en `values`) con `organizerEventFormSchema` y la portada (`cover`);
    3. sube la portada;
    4. en una transacción, inserta:
       - `events`: `slug`, `organizerId`, `categoryId` por slug, `title`, `description`, `imageUrl`, `startsAt`, `doorsOpenAt`, `minAge`, `searchText` = `normalizeText(título + recinto + ciudad)`, `status: "draft"`;
       - con recinto nuevo: `venues` `pending_review` con `organizerId`, sus `venue_sections` (generales con `capacity`, numeradas sin ella) y los `venue_seats` en grilla con la geometría de la decisión 17;
       - `ticket_types` con `sectionId`, `slug` = `slugify(nombre)` único en el evento, `priceCents`, `maxPerOrder` explícito, `description` o `null` y `sortOrder`.
    5. devuelve `{ ok: true, id, slug }` o `{ ok: false, message }`.

    Un borrador sin recinto guarda el evento sin `ticket_types` (data-gaps, decisión 4).
21. **Mapeo formulario → filas** en `utils/organizerEventRecords.ts`, función pura con test. Geometría del recinto nuevo en `modules/seating/utils/gridVenueLayout.ts` (`buildGridVenueLayout(zones)` → `{ mapViewBox, stage, sections: { mapPath, labelX, labelY, seats? }[] }`), con test. Seating la exporta en una entrada de servidor existente (`modules/seating/seats.ts`) o en el barrel, sin tocar `data/**`.
22. **El formulario envía con la acción:**
    - `useZodForm` valida primero en el cliente;
    - mientras se guarda, los botones quedan deshabilitados y el primario dice "Guardando…";
    - un error de la acción se muestra en un `Alert` destructivo sobre la barra de acciones;
    - con éxito, navega a `/organizador?guardado=…` como hoy.

    `useOrganizerStore` deja de escribirse.

### Fase 5. Publicar en el sitio
23. **Publicar** (`intent: "publish"`) en la misma acción y transacción:
    - **con recinto del catálogo:** `status: "published"`;
    - **con recinto nuevo:** `status: "pending_review"` (decisión 16);
    - crea `event_seats`: uno por `venue_seat` de cada zona numerada y `capacity` filas sin `venueSeatId` por zona general (como el seed);
    - tras guardar, `revalidatePath("/")`, `revalidatePath("/eventos")` y `revalidatePath(\`/eventos/${slug}\`)`.

    El banner del panel, con `guardado=revision`, dice "Tu evento está en revisión: se publicará cuando Mentec apruebe el recinto." (`savedStatusSchema` gana `"revision"`).
24. **`hasVenueMap(slug)` lee la BD:** pasa a `async` y es `true` si el recinto del evento publicado tiene `map_view_box`. `app/(site)/eventos/[slug]/page.tsx` la espera. Un evento publicado con recinto con mapa muestra `ZonePricesCard` y `/entradas`; sin mapa, `TicketSelector`.
25. **Panel `/organizador` desde la BD:**
    - `getOrganizerEvents()` lee los eventos del organizador (`requireOrganizer()`): `sold` = `event_seats` vendidos, `capacity` = total;
    - `status`: `published`, `draft` o `pending_review` → `organizerEventStatusSchema` gana `"review"`, con el badge "En revisión" (`bg-warning text-warning-foreground`);
    - se eliminan `useOrganizerStore`, su test, la rehidratación y la mezcla con `localStorage`, junto con `ORGANIZER_SALES_MOCK`/`ORGANIZER_DRAFTS_MOCK` si ya nadie los usa (el seed los usa: se quedan si siguen en uso).

## Criterios de aceptación
Se verifican con Playwright a 375 y 1440 px en `/organizador/eventos/nuevo` (sin sesión en F1–F3), además de con los tests.

### Fase 1
- [ ] Dado el formulario a 1440 px, entonces:
  - entre "Imagen de portada" y "Tipos de entrada" está la sección "Mapa de asientos", con "¿Cómo se ubica el público?" y tres tarjetas en una fila ("Sin asientos numerados", "Con mapa de asientos", "Mixto"), cada una con su línea explicativa y ninguna marcada;
  - "Tipos de entrada" solo muestra "Elige arriba cómo se ubica el público para configurar los tipos de entrada.".
- [ ] Dado el formulario a 375 px, entonces las tres tarjetas van una debajo de otra, cada una con altura ≥ 44 px, y no hay scroll horizontal.
- [ ] Dado "Sin asientos numerados" elegido, entonces "Tipo 1" no tiene el grupo "Ubicación" y muestra "Cantidad". "Agregar tipo de entrada" crea "Tipo 2" también con "Cantidad".
- [ ] Dado "Con mapa de asientos" elegido, entonces las filas no tienen "Ubicación" y muestran "Filas", "Asientos por fila", "Cantidad" de solo lectura y la ayuda del plano. Una fila nueva es numerada.
- [ ] Dado "Mixto" elegido, entonces cada fila muestra "Ubicación" con sus dos tarjetas.
- [ ] Dada una fila general con Cantidad 100, cuando se elige "Con mapa de asientos" y después "Sin asientos numerados", entonces la Cantidad sigue en 100.
- [ ] Dado "Mixto" con dos filas generales válidas y el resto del formulario válido, cuando se pulsa "Publicar evento", entonces:
  - el selector muestra "Un evento mixto necesita al menos una zona general (de pie) y una numerada", con `aria-invalid="true"`, y recibe el foco;
  - no se navega;
  - al cambiar una fila a "Numerada" con 10 × 20, el error desaparece y se puede publicar.
- [ ] Dado el formulario vacío, cuando se pulsa "Publicar evento", entonces, además de los errores de las specs anteriores, aparecen "Elige cómo se ubica el público", "Elige la ciudad" y "Sube la imagen de portada", y el foco va a "Nombre del evento".
- [ ] Dado solo el nombre, cuando se pulsa "Guardar borrador", entonces se guarda sin errores de modo, ciudad, portada, máximo por compra ni descripción.
- [ ] Dado "Ciudad", entonces es un desplegable con el placeholder "Elige la ciudad" y exactamente Lima, Arequipa, Cusco, Trujillo y Piura. Se opera con teclado y la ciudad elegida aparece en la tarjeta de vista previa ("Estadio Nacional · Lima").
- [ ] Dada "Imagen de portada", entonces la zona de subida dice "JPG o PNG, hasta 5 MB. Recomendado: 1920 × 1080 px (16:9); mínimo 1200 × 675 px." y debajo está la guía del centro. Al subir:
  - un GIF da "Sube una imagen en formato JPG o PNG.";
  - un JPG de 6 MB da "La imagen pesa más de 5 MB. Sube una más liviana.";
  - un PNG de 800 × 600 da "La imagen debe medir al menos 1200 × 675 px.";

  y en los tres casos se conserva la imagen anterior.
- [ ] Dada una portada válida de 1920 × 1080, entonces aparece "Así se recorta tu portada" con 5 recortes y sus pies ("Página del evento · móvil", "Página del evento · escritorio", "Listado de eventos", "Inicio · escritorio", "Inicio · móvil"), sin scroll horizontal a 375 ni a 1440. Al quitar la imagen y publicar, aparece "Sube la imagen de portada".
- [ ] Dado un tipo de entrada, entonces tras "Nombre | Precio (S/)" están "Descripción (opcional)" y "Máximo por compra" (valor 10, con su ayuda). Con Máximo "0", "11" o "2.5", publicar da "El máximo por compra debe ser un número entero entre 1 y 10" en ese input. Vacío da "Ingresa el máximo por compra".
- [ ] Dado un formulario completo y válido (modo, ciudad, portada y tipos con máximo y descripción), cuando se publica, entonces se navega a `/organizador?guardado=publicado` y el evento guardado en `mentec-organizer-events` tiene exactamente las claves de `OrganizerEvent`, con `city` "Lima".
- [ ] Dado el formulario recorrido solo con teclado, entonces se alcanzan y operan el selector de modo (las flechas cambian la opción), "Ciudad", la portada y los campos nuevos de cada fila, con el foco visible. La barra sticky no tapa el campo enfocado a 375 px.
- [ ] Dado el código, entonces:
  - `organizer.schema.test.ts`, `organizerEventForm.test.ts` y `OrganizerEventForm.test.tsx` pasan;
  - `grep -rn "@/modules/events\"" modules/organizer` solo encuentra `organizer.service.ts`;
  - `modules/events/format.ts` solo reexporta;
  - `EventPreviewCard.tsx` no cambia;
  - `pages/organizer.md` describe el selector de modo, la ciudad, la guía y los recortes de la portada y los campos nuevos de la fila.

### Fase 2
- [ ] Dado "Descripción", entonces su ayuda dice "Se muestra en «Acerca del evento». Separa los párrafos con una línea en blanco.".
- [ ] Dado el formulario vacío, cuando se pulsa "Ver página del evento", entonces se abre "Vista previa de la página" con la lista de datos que faltan, en el orden del requisito 11. Esc la cierra y el foco vuelve al botón.
- [ ] Dado un formulario completo con portada, dos párrafos, "Mixto" y dos tipos (uno con descripción), cuando se abre la vista previa a 1440 y a 375, entonces se ve la misma composición que `/eventos/[slug]`: hero con portada, título, fecha, hora y lugar; selector de entradas con los dos tipos, la descripción y "Desde S/"; la nota del plano; "Acerca del evento" con 2 párrafos y "Organiza: …"; "Información importante" con apertura, inicio, edad mínima e "Ingreso: Entrada digital con QR"; y "Lugar" con la dirección.
- [ ] Dada la vista previa abierta, cuando se pulsa "Comprar entradas", "Guardar" o un "+" del selector, entonces no pasa nada (no hay navegación ni cambios en `localStorage`). Solo el botón de cerrar es operable.
- [ ] Dado el código, entonces:
  - `EventDetailHeader`, `EventDetailInfo` y `TicketSelector` no se duplican en `organizer`;
  - `lib/env.ts` ya no exporta `publicEnv`;
  - `modules/events/detail.ts` solo reexporta;
  - `eventDetailPreview.test.ts`, `lib/env.test.ts` y `OrganizerEventForm.test.tsx` pasan;
  - `npm run build` pasa (prueba de que el bundle cliente no evalúa variables de servidor).

### Fase 3
- [ ] Dada la ciudad "Lima" y "Recinto del catálogo", entonces el `Select` "Recinto" lista solo los recintos `approved` de Lima del seed. Con "Con mapa de asientos", solo los que tienen mapa. Al elegir uno, "Dirección" se rellena y es de solo lectura.
- [ ] Dado un recinto del catálogo, entonces "Tipos de entrada" lista sus zonas con "Vender esta zona", tipo y capacidad. Sin "Agregar" ni "Quitar".
- [ ] Dado "Sin asientos numerados" y una zona numerada marcada, cuando se publica, entonces aparece "Las zonas elegidas no coinciden con «Sin asientos numerados»". Sin zonas marcadas: "Elige al menos una zona para vender".
- [ ] Dado "Recinto nuevo", entonces se ven "Lugar", "Dirección", la nota de revisión y los tipos de entrada de F1.
- [ ] Dado el código, entonces `seating.service.test.ts` cubre `getVenueCatalog` con la BD de test, y los tests de schema, utils y formulario pasan.

### Fase 4
- [ ] Dado un borrador con recinto del catálogo, cuando se guarda, entonces existe en `events` con `status = 'draft'`, slug único, `image_url` del bucket y un `ticket_types` por zona marcada con su `max_per_order` y su `description`.
- [ ] Dado un borrador con recinto nuevo y una zona numerada de 10 × 20, cuando se guarda, entonces existen el `venue` `pending_review` con `organizer_id` y `map_view_box`, sus `venue_sections` y 200 `venue_seats` (filas A–J).
- [ ] Dado un título que ya existe, cuando se guarda, entonces el slug termina en `-2`.
- [ ] Dado un fallo de subida, entonces el formulario muestra "No se pudo guardar la portada. Inténtalo más tarde." y no navega.
- [ ] Dado el código, entonces los tests de `lib/slug`, `organizerEventRecords`, `gridVenueLayout`, `lib/storage` (con el SDK mockeado) y del service de escritura (BD de test) pasan.

### Fase 5
- [ ] Dado un evento publicado con recinto del catálogo con mapa y modo "Mixto", entonces aparece en `/eventos` (filtrable por su ciudad), su página `/eventos/<slug>` muestra la portada, los datos y `ZonePricesCard`, y `/eventos/<slug>/entradas` muestra el plano con asientos elegibles en las zonas numeradas.
- [ ] Dado un evento publicado con modo "Sin asientos numerados" en un recinto sin mapa, entonces su página muestra `TicketSelector` con las descripciones de los tipos.
- [ ] Dado un evento con recinto nuevo, cuando se publica, entonces se navega a `/organizador?guardado=revision`, el panel lo muestra "En revisión" y no aparece en `/eventos`.
- [ ] Dado el panel, entonces lista los eventos del organizador desde la BD con vendidas / capacidad reales, y `mentec-organizer-events` ya no se escribe.
- [ ] Dado el código, entonces `npm run build`, `npm run lint` y `npx vitest run` pasan.

## Diseño técnico

### Rutas (`app/`)
- F1–F2: sin cambios.
- F3: `app/organizador/eventos/nuevo/page.tsx` carga `getVenueCatalog()` y la pasa al formulario.
- F5: `app/(site)/eventos/[slug]/page.tsx` hace `await hasVenueMap(slug)`. `app/organizador/page.tsx` ya compone `OrganizerDashboard`, que pasa a recibir los eventos de la BD.

### Componentes
| Componente | Tipo | Ubicación / motivo | Fase |
|---|---|---|---|
| `RadioGroup`, `Field*`, `Input`, `Select*`, `Button`, `Card` | shadcn (instalado) | `components/ui/` | 1–3 |
| `Dialog` | shadcn (instalado) | `components/ui/dialog.tsx` | 2 |
| `Checkbox`, `Alert` | shadcn (instalado) | `components/ui/` | 3–4 |
| `aspect-ratio` | shadcn, **no se instala** | La utilidad `aspect-[x/y]` de Tailwind basta (KISS) | 1 |
| `SeatingModeField` | nuevo, cliente | `modules/organizer/components/SeatingModeField.tsx`: un solo dominio. No existe: "Ubicación" es por fila | 1 |
| `TicketTypesField` | existente, se modifica | Modo, descripción, máximo y estado sin modo | 1 |
| `TicketTypeCapacityFields` | existente, se modifica | Prop `showKind: boolean` para ocultar "Ubicación" | 1 |
| `CoverImageField` | existente, se modifica | Textos de ayuda y guía | 1 |
| `CoverCropPreview` | nuevo, presentacional | `modules/organizer/components/CoverCropPreview.tsx`. No existe nada parecido | 1 |
| `OrganizerEventForm` | existente, se modifica | Sección de modo, `Select` de ciudad, portada obligatoria, botón y `Dialog` (F2), recinto (F3), acción (F4) | 1–4 |
| `EventDetailPreviewDialog` | nuevo, cliente | `modules/organizer/components/EventDetailPreviewDialog.tsx`. Compone los componentes reales de `@/modules/events/detail` | 2 |
| `EventDetailHeader`, `EventDetailInfo`, `TicketSelector` | existentes, no cambian | `modules/events/components/` | 2 |
| `VenueField`, `CatalogZonesField` | nuevos, cliente | `modules/organizer/components/`: selector de recinto y zonas del catálogo | 3 |
| `EventPreviewCard` | existente, **no cambia** | Decisión 10 | — |

### Schemas, tipos y utils (F1)
```ts
// modules/organizer/schemas/organizer.schema.ts (orientativo)
import { CITIES } from "@/modules/events/format";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";

export const seatingModeSchema = z.enum(["general", "numbered", "mixed"]);
export const TICKET_DESCRIPTION_MAX_LENGTH = 150;
export const COVER_IMAGE_RULES = { maxBytes: 5 * 1024 * 1024, minWidth: 1200, minHeight: 675 } as const;

const ticketTypeBase = {
  id, name, price, // reglas actuales
  description: z.string().trim().max(TICKET_DESCRIPTION_MAX_LENGTH, "La descripción debe tener como máximo 150 caracteres"),
  maxPerOrder: intInRange(
    "Ingresa el máximo por compra",
    `El máximo por compra debe ser un número entero entre 1 y ${MAX_TICKETS_PER_ORDER}`,
    MAX_TICKETS_PER_ORDER,
  ),
};
// organizerEventFormSchema: + seatingMode: z.union([z.literal(""), seatingModeSchema]), hasCoverImage: z.boolean()
//   fila cruda: + description: z.string(), maxPerOrder: z.string()
// superRefine (publish): seatingMode "" → "Elige cómo se ubica el público";
//   mixed sin ambos kinds → "Un evento mixto necesita al menos una zona general (de pie) y una numerada";
//   city ∉ CITIES → "Elige la ciudad"; !hasCoverImage → "Sube la imagen de portada" (path ["hasCoverImage"]).
```

```ts
// modules/organizer/types/organizer.types.ts
export type SeatingMode = z.infer<typeof seatingModeSchema>;
export type TicketTypeRowErrors = Partial<Record<
  "name" | "price" | "description" | "maxPerOrder" | "quantity" | "rows" | "seatsPerRow", string>>;
```

- En `OrganizerEventForm`, `TextField` excluye además `seatingMode`, `hasCoverImage` y `city` (que pasa a ser `Select`).
- `selectCover` pasa a ser `async`: espera `getCoverImageError`; si no hay error, `setCoverFile`, `setValue("hasCoverImage", true)` y `handleBlur("hasCoverImage")`.
- `removeCover` pone `hasCoverImage` en `false`.
- El error que se muestra es `coverError ?? errors.hasCoverImage`.

### Imports entre módulos
| Archivo (entorno) | Importa | Fase |
|---|---|---|
| `organizer/schemas/organizer.schema.ts` (cliente) | `CITIES`, `EVENT_CATEGORY_LABELS` de `@/modules/events/format`; `MAX_TICKETS_PER_ORDER` de `@/modules/events/purchase` | 1 |
| `organizer/components/EventDetailPreviewDialog.tsx` (cliente) | `EventDetailHeader`, `EventDetailInfo`, `TicketSelector`, `EventDetail` de `@/modules/events/detail` | 2 |
| `app/organizador/eventos/nuevo/page.tsx` (servidor) | `getVenueCatalog` de `@/modules/seating` | 3 |
| `organizer/actions/organizer.actions.ts` (servidor) | `lib/db`, `lib/storage`, `lib/slug`, generador de grilla de seating | 4–5 |

### Contrato de API
F1 y F2 no tienen API HTTP. Contratos internos:
- `TicketTypeRow = { id; name; price; description; maxPerOrder; kind: "general" | "numbered"; quantity; rows; seatsPerRow }` (todo `string` salvo `kind`; F3 añade `sectionId`).
- Valores nuevos del formulario:
  - `seatingMode: "" | "general" | "numbered" | "mixed"`;
  - `hasCoverImage: boolean`;
  - `city: "" | (typeof CITIES)[number]`, guardado como `string`.
- `getCoverImageError(file: File): Promise<string | null>`; `applySeatingMode(rows, mode): TicketTypeRow[]`; `getNewRowKind(mode): TicketTypeKind`.
- F2: `buildEventDetailPreview(values, coverUrl: string | null): { event: EventDetail } | { missing: string[] }`.
- F3:
  ```ts
  type VenueOption = {
    id: string; name: string; city: string; address: string; hasMap: boolean;
    sections: { id: string; name: string; seating: "general" | "numbered"; capacity: number }[];
  };
  ```
- F4–F5, Server Action:
  ```ts
  saveOrganizerEvent(formData: FormData /* values: JSON de OrganizerEventFormValues; cover: File | null */):
    Promise<{ ok: true; id: string; slug: string; status: "draft" | "published" | "pending_review" } | { ok: false; message: string }>
  ```
- Sin cambios en F1–F2: `OrganizerEvent`, `toOrganizerEvent` y `localStorage` `mentec-organizer-events`.

### Diseño de página
`design-system/ticketera/pages/organizer.md`, sección "Crear evento" (el layout común no se toca):
- **F1:**
  - "Mapa de asientos" en el esquema del layout;
  - tarjetas del modo y sus textos;
  - estado sin modo;
  - modos que ocultan "Ubicación";
  - fila con "Descripción (opcional) | Máximo por compra";
  - "Ciudad" como `Select`;
  - guía de portada, validaciones y "Así se recorta tu portada";
  - la nota de que `EventPreviewCard` no cambia.
- **F2:** botón y diálogo "Vista previa de la página".
- **F3:** recinto y zonas del catálogo.
- **F5:** badge "En revisión" y banner `revision` en "Resumen".

## Reutilización
- **Organizer:**
  - patrón de tarjetas de "Ubicación" (`TicketTypeCapacityFields`) y `TicketTypeInputField`;
  - `intInRange`, `REQUIRED_ON_PUBLISH`, `getTicketTypeErrors`, `getMinTicketPrice`, `buildStartsAt`;
  - `useObjectUrl`, `FormSection`, `FORM_CONTROL_SCROLL`.
- **`hooks/useZodForm`**, sin cambios: `hasCoverImage` y `seatingMode` son valores más.
- **Events:**
  - `CITIES` y `MAX_TICKETS_PER_ORDER`;
  - `EventDetailHeader`, `EventDetailInfo`, `TicketSelector`, sin cambios internos;
  - `normalizeText` (F4, `searchText`).
- **Seating:**
  - `generateSeatRows`, `getSeatRowLabels` y `SeatGridPreview`;
  - `toVenueLayout` y `getVenueMapBySlug`, que leen sin cambios el recinto generado.
- **BD:**
  - esquema de `data-gaps.md` (`venue_status`, `organizer_id`, CHECK de borrador);
  - patrón de `event_seats` del seed.
- **shadcn instalados:** `radio-group`, `select`, `dialog`, `checkbox`, `alert`, `field`, `input`. No se instala nada en F1–F3. F4 añade la dependencia `@google-cloud/storage`.

## Tests
Junto al archivo probado.
- **`organizer.schema.test.ts`** (F1):
  - con `publish` vacío, aparecen `seatingMode`, `city` y `hasCoverImage` con sus mensajes;
  - `mixed` con solo filas generales da el error de mixto; con una general y una numerada válidas, no;
  - `general`/`numbered` sin filas del otro tipo, sin error;
  - `city` "Chiclayo" da "Elige la ciudad"; "Lima" es válida;
  - `maxPerOrder`:
    - "", "0", "11" y "2.5" dan su mensaje, uno por campo, con path `["ticketTypes", i, "maxPerOrder"]`;
    - "1" y "10" son válidos;
  - descripción de 151 caracteres da error y de 150 no;
  - con `draft`, nada de lo anterior da error.
- **`organizerEventForm.test.ts`** (F1):
  - `createTicketTypeRow()` incluye `description: ""` y `maxPerOrder: "10"`; `createTicketTypeRow("numbered").kind === "numbered"`;
  - `getNewRowKind`;
  - `applySeatingMode`:
    - `general` y `numbered` fuerzan `kind` y conservan `quantity`, `rows` y `seatsPerRow`;
    - `mixed` no cambia nada;
    - devuelve objetos nuevos;
  - `getCoverImageError` (con `createImageBitmap` mockeado):
    - GIF, 6 MB, bitmap que falla y 800 × 600 dan sus mensajes en el orden del requisito 7;
    - 1920 × 1080 da `null`;
    - el bitmap se cierra;
  - `getTicketTypeErrors` devuelve `maxPerOrder` y `description`.
- **`OrganizerEventForm.test.tsx`** (F1). Se ajusta `fillValid`: elegir modo, ciudad y portada, con `createImageBitmap` y `URL.createObjectURL` mockeados. Casos:
  - sin modo, no hay filas y se ve la indicación;
  - cada modo muestra u oculta "Ubicación", y la fila nueva nace del tipo correcto;
  - el error de mixto en el selector y su corrección;
  - "Elige la ciudad" y "Sube la imagen de portada" al publicar vacío;
  - la portada inválida conserva la anterior;
  - los 5 recortes;
  - "Máximo por compra" fuera de rango;
  - el borrador solo con nombre;
  - el evento guardado conserva las claves de `OrganizerEvent`.
- **F2:**
  - `eventDetailPreview.test.ts`: lista de faltantes en orden; evento completo con `EventDetail` válido para `eventDetailSchema` (salvo `imageUrl` `blob:`, que se comprueba aparte); `ticketTypes` solo de las filas válidas;
  - `lib/env.test.ts`: se ajusta a `lib/publicEnv`;
  - `OrganizerEventForm.test.tsx`: abrir y cerrar el diálogo, faltantes, composición e `inert`.
- **F3:**
  - `seating.service.test.ts` (BD de test): `getVenueCatalog`;
  - schema y utils: coincidencia modo/zonas, zonas marcadas;
  - formulario: filtro por ciudad y modo, y dirección de solo lectura.
- **F4:**
  - `lib/slug.test.ts`;
  - `lib/storage.test.ts` (SDK mockeado);
  - `organizerEventRecords.test.ts`;
  - `gridVenueLayout.test.ts`: `viewBox` contiene todas las zonas, 10 × 20 da 200 asientos A–J sin solaparse, el resultado pasa `venueLayoutSchema` vía `toVenueLayout`;
  - service de escritura con la BD de test: borrador con catálogo, con recinto nuevo y slug repetido.
- **F5:**
  - service: `published` crea `event_seats` y `getEventBySlug` lo devuelve; con recinto nuevo queda `pending_review` y no aparece en `getEvents`;
  - `hasVenueMap` async;
  - `getOrganizerEvents` desde la BD.
- **Sin test:**
  - `SeatingModeField`, `CoverCropPreview` y `EventDetailPreviewDialog`: son presentacionales y los cubre `OrganizerEventForm.test.tsx`;
  - `modules/events/format.ts` y `detail.ts`: solo reexportan.

## Plan de tareas
Coordinación:
- `seating-all-venue-maps.md` toca `modules/seating/data/**`, y esta spec no toca esa carpeta.
- `modules/checkout` y `app/(purchase)/checkout` no se tocan.
- Nadie hace commits ni ejecuta `npm run build` en paralelo: el build lo corre el reviewer al cerrar cada fase.

### Fase 1. Modo de ubicación y datos obligatorios (13 archivos)
- [ ] T1. Reexportar `CITIES`; schema (`seatingModeSchema`, `seatingMode`, `hasCoverImage`, `description`, `maxPerOrder`, reglas de publicación), tipos y utils (`createTicketTypeRow(kind)`, `getNewRowKind`, `applySeatingMode`, `getCoverImageError` en lugar de `isAcceptedCoverImage`, errores por fila), con tests.
  - Archivos: `modules/events/format.ts`, `modules/organizer/schemas/organizer.schema.ts`, `modules/organizer/schemas/organizer.schema.test.ts`, `modules/organizer/types/organizer.types.ts`, `modules/organizer/utils/organizerEventForm.ts`, `modules/organizer/utils/organizerEventForm.test.ts`, `modules/organizer/utils/eventPreview.test.ts` (solo si deja de compilar).
  - Depende de: —.
  - Secuencial (base: entrada pública de `events`).
- [ ] T2. Selector de modo, filas según el modo, "Descripción (opcional)" y "Máximo por compra" por fila, y "Ciudad" como `Select`, con test.
  - Archivos: `modules/organizer/components/SeatingModeField.tsx` (nuevo), `modules/organizer/components/TicketTypesField.tsx`, `modules/organizer/components/TicketTypeCapacityFields.tsx`, `modules/organizer/components/OrganizerEventForm.tsx`, `modules/organizer/components/OrganizerEventForm.test.tsx`.
  - Depende de: T1.
  - Secuencial.
- [ ] T3. Portada obligatoria: guía, validación asíncrona, `hasCoverImage` y "Así se recorta tu portada", con test.
  - Archivos: `modules/organizer/components/CoverImageField.tsx`, `modules/organizer/components/CoverCropPreview.tsx` (nuevo), `modules/organizer/components/OrganizerEventForm.tsx`, `modules/organizer/components/OrganizerEventForm.test.tsx`.
  - Depende de: T2 (mismos archivos de formulario).
  - Secuencial.
- [ ] T4. Diseño de página: modo, ciudad, portada y campos nuevos de la fila.
  - Archivos: `design-system/ticketera/pages/organizer.md`.
  - Depende de: —.
  - Paralelo con T1–T3.

### Fase 2. La página del evento como landing (11 archivos)
- [ ] T1. Separar `publicEnv` y crear la entrada `modules/events/detail.ts`.
  - Archivos: `lib/publicEnv.ts` (nuevo), `lib/env.ts`, `lib/env.test.ts`, `modules/events/components/EventDetailInfo.tsx` (solo el import), `modules/events/detail.ts` (nuevo).
  - Depende de: Fase 1.
  - Secuencial (base: `lib/` e índices).
- [ ] T2. `buildEventDetailPreview` con test.
  - Archivos: `modules/organizer/utils/eventDetailPreview.ts`, `modules/organizer/utils/eventDetailPreview.test.ts`.
  - Depende de: T1 (tipo `EventDetail`).
  - Paralelo con T4.
- [ ] T3. Diálogo "Vista previa de la página", botón en el `aside` y ayuda de "Descripción", con test.
  - Archivos: `modules/organizer/components/EventDetailPreviewDialog.tsx` (nuevo), `modules/organizer/components/OrganizerEventForm.tsx`, `modules/organizer/components/OrganizerEventForm.test.tsx`.
  - Depende de: T1, T2.
  - Secuencial.
- [ ] T4. Diseño de página: vista previa completa.
  - Archivos: `design-system/ticketera/pages/organizer.md`.
  - Depende de: —.
  - Paralelo con T2–T3.

### Fase 3. Recinto del catálogo o nuevo (~14 archivos)
- [ ] T1. `getVenueCatalog` y el tipo `VenueOption` en seating, con test (BD de test).
  - Archivos: `modules/seating/services/seating.service.ts`, `modules/seating/services/seating.service.test.ts`, `modules/seating/types/seating.types.ts`, `modules/seating/index.ts`.
  - Depende de: Fase 2.
  - Secuencial (base: índice de módulo).
- [ ] T2. Schema y utils: `venueSource`, `venueId`, `sectionId`, coincidencia modo/zonas, zonas marcadas, con tests.
  - Archivos: `modules/organizer/schemas/organizer.schema.ts`, `modules/organizer/schemas/organizer.schema.test.ts`, `modules/organizer/types/organizer.types.ts`, `modules/organizer/utils/organizerEventForm.ts`, `modules/organizer/utils/organizerEventForm.test.ts`.
  - Depende de: T1 (tipo `VenueOption`).
  - Secuencial.
- [ ] T3. `VenueField`, `CatalogZonesField`, página que carga el catálogo y formulario, con test.
  - Archivos: `modules/organizer/components/VenueField.tsx` (nuevo), `modules/organizer/components/CatalogZonesField.tsx` (nuevo), `modules/organizer/components/OrganizerEventForm.tsx`, `modules/organizer/components/OrganizerEventForm.test.tsx`, `app/organizador/eventos/nuevo/page.tsx`.
  - Depende de: T2.
  - Secuencial.
- [ ] T4. Diseño de página: recinto y zonas del catálogo.
  - Archivos: `design-system/ticketera/pages/organizer.md`.
  - Depende de: —.
  - Paralelo con T1–T3.

### Fase 4. Guardar en la BD (~15 archivos). Requiere P1 y P2
- [ ] T1. Infraestructura: dependencia de Cloud Storage, `GCS_BUCKET`, `lib/storage.ts`, `lib/slug.ts` (extraído del seed), host de imágenes, con tests.
  - Archivos: `package.json`, `lib/env.ts`, `lib/env.test.ts`, `lib/storage.ts`, `lib/storage.test.ts`, `lib/slug.ts`, `lib/slug.test.ts`, `lib/db/seed/buildSeedData.ts`, `next.config.ts`.
  - Depende de: Fase 3 y P2.
  - Secuencial (base: `package.json` y `lib/`).
- [ ] T2. Geometría generada del recinto nuevo en seating, con test.
  - Archivos: `modules/seating/utils/gridVenueLayout.ts`, `modules/seating/utils/gridVenueLayout.test.ts`, `modules/seating/seats.ts` (solo la reexportación).
  - Depende de: T1.
  - Paralelo con T3.
- [ ] T3. Mapeo formulario → filas, con test.
  - Archivos: `modules/organizer/utils/organizerEventRecords.ts`, `modules/organizer/utils/organizerEventRecords.test.ts`.
  - Depende de: T1.
  - Paralelo con T2.
- [ ] T4. Server Action y service de escritura (borrador), envío desde el formulario y error en `Alert`, con tests.
  - Archivos: `modules/organizer/actions/organizer.actions.ts` (nuevo), `modules/organizer/services/organizer.service.ts`, `modules/organizer/services/organizer.service.test.ts`, `modules/organizer/components/OrganizerEventForm.tsx`, `modules/organizer/components/OrganizerEventForm.test.tsx`.
  - Depende de: T2, T3 y P1.
  - Secuencial.

### Fase 5. Publicar en el sitio (~13 archivos)
- [ ] T1. `hasVenueMap` asíncrona desde la BD y la página de detalle que la espera, con test.
  - Archivos: `modules/seating/services/seating.service.ts`, `modules/seating/services/seating.service.test.ts`, `app/(site)/eventos/[slug]/page.tsx`.
  - Depende de: Fase 4.
  - Secuencial (base: ruta compartida).
- [ ] T2. Publicar: estado según el recinto, `event_seats`, revalidación y `guardado=revision`, con tests.
  - Archivos: `modules/organizer/actions/organizer.actions.ts`, `modules/organizer/services/organizer.service.ts`, `modules/organizer/services/organizer.service.test.ts`, `modules/organizer/schemas/organizer.schema.ts`, `modules/organizer/schemas/organizer.schema.test.ts`.
  - Depende de: T1.
  - Secuencial.
- [ ] T3. Panel desde la BD: `getOrganizerEvents` real, badge "En revisión", banner y retirada del store.
  - Archivos: `modules/organizer/components/OrganizerDashboard.tsx`, `modules/organizer/components/OrganizerEventsTable.tsx`, `modules/organizer/stores/organizer.store.ts` (se elimina), `modules/organizer/stores/organizer.store.test.ts` (se elimina), `modules/organizer/components/OrganizerEventForm.tsx`.
  - Depende de: T2.
  - Secuencial.
- [ ] T4. Diseño de página: estado "En revisión" y banner.
  - Archivos: `design-system/ticketera/pages/organizer.md`.
  - Depende de: —.
  - Paralelo con T1–T3.

## Preguntas abiertas
1. **Identidad del organizador antes de la F2 de system-design (Clerk).** La Fase 4 necesita saber en el servidor quién guarda el evento. Hoy `auth` es un mock en `localStorage` y el servidor no puede fiarse de él. Opciones:
   - **(a)** implementar antes la F2 de system-design (recomendado);
   - **(b)** un "organizador demo" del seed, usado solo cuando `NODE_ENV !== "production"`, para probar el flujo en local.

   Con (b), en producción la acción respondería "Inicia sesión como organizador" hasta tener (a). ¿Cuál prefieres?
2. **Moderación al publicar.** System-design §7.11 dice que todo evento pasa por la revisión de un admin antes de publicarse. El pedido actual es que el evento publicado aparezca en `/eventos`. Esta spec publica directamente los eventos con recinto del catálogo y deja "En revisión" solo los de recinto nuevo (decisión 16). ¿Lo confirmas, o "Publicar" debe ser siempre "Enviar a revisión" (y entonces no aparecerían en el sitio hasta que exista la moderación)?
