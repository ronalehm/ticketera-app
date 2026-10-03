# Descarga de entradas en PDF

- Módulo: tickets (también toca checkout y código compartido de `lib/` y `components/shared/`)
- Estado: borrador

## Objetivo
Hoy "Descargar PDF" llama a `window.print()` en `modules/checkout/components/OrderConfirmation.tsx` y en `modules/tickets/components/TicketCard.tsx`: abre el diálogo de impresión, pero no descarga ningún archivo. El usuario pidió "verificar que la opción de descargar PDF sí descargue un pdf". Esta spec hace que el botón genere en el navegador un archivo `.pdf` real y lo descargue (p. ej. `mentec-MT-7Q4K2P.pdf`), con una página por entrada. No hay backend. Es para quien compra (confirmación de compra) y para quien consulta sus entradas ("Mis entradas").

Visual según `design-system/ticketera/MASTER.md` (tokens Mentec en RGB). Español (Perú).

## Alcance
- Incluye:
  - Dependencia `jspdf` (cliente), cargada con `import()` dinámico solo al pulsar el botón.
  - Generador compartido y puro `lib/ticketPdf.ts`: recibe datos planos y devuelve un `Blob` PDF (A4, una página por entrada, QR vectorial). También define la función de descarga del PDF.
  - `lib/download.ts` (`downloadBlob`): el patrón de descarga de `downloadIcs` (`createObjectURL` + `<a download>` + `revokeObjectURL`) se extrae a una función. `downloadIcs` pasa a usarla sin cambiar su comportamiento.
  - Mapeo `Order` → datos del PDF en checkout (`buildTicketPdfInput`), publicado en la entrada `modules/checkout/orders.ts`.
  - Botón compartido `components/shared/TicketsPdfButton.tsx`: estado "Generando…", `aria-busy`, bloqueo mientras genera y error recuperable.
  - Integración en `OrderConfirmation` (todas las entradas del pedido) y en `TicketCard` de "Mis entradas" (todas las entradas del pedido seleccionado).
  - Se quitan `window.print()` de ambos botones y la lista "Tus entradas", que solo existía para imprimir, de `OrderConfirmation`.
  - Documentación de diseño: MASTER (anatomía del PDF, colores RGB y la excepción de fuente), `pages/checkout.md` y `pages/my-tickets.md`.
  - Enmienda de `docs/specs/checkout-mock-payment.md` (en borrador): se retira de su Fase 6 la entrada imprimible (`PrintableTicket`, `buildPrintableTickets`, impresión de una entrada por página), que esta spec sustituye.
- No incluye:
  - Backend, Route Handlers, Server Actions, envío del PDF por correo ni almacenamiento del archivo.
  - Un QR legible por lectores: el PDF dibuja el mismo QR decorativo de `TicketQr` (`getQrModules`).
  - Imagen del evento o logo SVG dentro del PDF. La marca va como texto "Mentec Tickets" sobre la franja azul (ver decisión 5).
  - Incrustar Creato Display en el PDF (decisión 4).
  - PDF etiquetado/accesible (PDF/UA): jsPDF no lo genera. La versión accesible sigue siendo la página.
  - Cambiar o quitar las clases `print:` existentes (header, footer, stepper, acciones, "Mis entradas"). Siguen dando una impresión limpia con Ctrl+P, pero ningún botón llama ya a imprimir.
  - Descargar solo la entrada mostrada en "Mis entradas" (ver Preguntas abiertas 1).
  - Configurar Playwright/E2E en el repositorio (ver Preguntas abiertas 2). El criterio con Playwright lo verifica el reviewer con un script fuera del repo.
  - Editar `docs/specs/tickets-my-tickets.md` (aprobada). Su decisión 12, su requisito 9 y los criterios de impresión de su Fase 2 quedan sustituidos por esta spec en lo que se refiere a "Descargar PDF" (ver Coordinación).
  - Cambios en `modules/events/**`, `modules/seating/**` o `components/shared/TicketQr.tsx`.

## Decisiones tomadas
1. **Librería: `jspdf` `^4.2.1`** (comprobado con `npm view` el 2026-10-03: última versión 4.2.1, del 2026-03-17; MIT; sin `peerDependencies`; tipos incluidos en `types/index.d.ts`; `exports` con build ES para navegador `dist/jspdf.es.min.js` y build Node). El pedido citaba la v3, pero la vigente es la 4.x. La 4.0.0 (enero de 2026) endureció sobre todo el acceso a archivos en Node. La API de dibujo que se usa aquí (`text`, `rect`, `line`, `setLineDashPattern`, `splitTextToSize`, `addPage`, `setProperties`, `output("blob")`) no cambia.
   - **Tamaño:** `jspdf.es.min.js` ocupa 343,6 kB minificado y ~107 kB gzip (medido sobre el tarball de npm), más `fflate` y `fast-png`. Se carga en un chunk aparte con `await import("jspdf")` dentro de `buildTicketsPdf`, así que no entra en la carga inicial.
   - **Optional deps:** `html2canvas`, `dompurify`, `canvg` y `core-js` son `optionalDependencies` que jsPDF solo importa dinámicamente para `html()` y SVG, que no se usan. Se instalan con `npm install` normal (no usar `--omit=optional`: el bundler resuelve esos `import()`). Nunca se piden en el navegador.
   - **QR vectorial:** con `rect(x, y, w, h, "F")` en milímetros, cada tramo horizontal de módulos oscuros es un rectángulo. Es nítido a cualquier zoom y sin imágenes.
   - **Texto real** (Helvetica estándar): se puede seleccionar y copiar (códigos de entrada y pedido) y los tests pueden comprobarlo leyendo el PDF sin comprimir.
   - **Descartadas:**
     - `pdf-lib` 1.17.1 (MIT): sin publicaciones desde noviembre de 2021 (casi 5 años sin mantenimiento) y más pesada: `pdf-lib.esm.min.js` ocupa 523 kB minificado y ~201 kB gzip. Su fuerte es editar PDF existentes, algo que aquí no hace falta.
     - `@react-pdf/renderer` 4.9.0 (MIT, peer `react ^19` compatible, activa): arrastra `pdfkit`, `fontkit`, el layout `yoga` y un reconciliador de React. Es la opción más pesada; no pude medir su bundle porque la red bloquea unpkg, y la suposición, documentada, es que supera con holgura 1 MB minificado. Además, tiene historial de problemas de empaquetado con bundlers ESM/Next. Diseñar con componentes React no aporta nada para una sola plantilla fija.
2. **A4 vertical, una entrada por página.** A4 es el tamaño de las impresoras domésticas en Perú y se ve bien en el visor del móvil. Un "tamaño ticket" se imprime mal o con escalado. La entrada ocupa la mitad superior de la página, en un marco de 170 mm de ancho.
3. **Un archivo por pedido, con todas sus entradas, en ambos sitios.** El nombre es `mentec-<código de pedido>.pdf` (`mentec-MT-7Q4K2P.pdf`). En "Mis entradas" también se descargan todas las entradas del pedido seleccionado, no solo la mostrada:
   - el nombre del archivo es por pedido;
   - el comprador suele reenviar o imprimir todas las de su grupo;
   - la salida es idéntica en confirmación y en "Mis entradas" (DRY);
   - las flechas sirven para ver los QR en pantalla, no para elegir qué descargar.

   Ver Preguntas abiertas 1.
4. **Fuente Helvetica estándar (excepción documentada a MASTER §3).** Creato Display solo existe en el repo como `.woff2` (`app/fonts/`), y jsPDF solo incrusta TTF. Incrustarla obligaría a convertir y versionar TTF, a descargarlos (~4 pesos) y a pasarlos a base64 al pulsar el botón. El PDF crecería en decenas de kB por peso. Helvetica es una de las 14 fuentes estándar de PDF: no se incrusta y el archivo queda en pocos kB. La excepción aplica solo al PDF y se anota en el MASTER.
5. **Marca como texto.** La franja superior es un rectángulo `--primary` con "Mentec Tickets" en Helvetica Bold blanca. El logo es un SVG, y jsPDF solo lo dibujaría con `canvg` (dependencia opcional pesada) o rasterizándolo.
6. **Colores: constantes RGB derivadas de los tokens** (jsPDF no lee CSS). Viven solo en `lib/ticketPdf.ts`, con un comentario por token, y se documentan en el MASTER:

   | Constante | Token (MASTER §2) | Hex | RGB |
   |---|---|---|---|
   | `primary` | `--primary` | `#0072F6` | `0, 114, 246` |
   | `primaryForeground` | `--primary-foreground` | `#FFFFFF` | `255, 255, 255` |
   | `foreground` | `--foreground` (navy) | `#010817` | `1, 8, 23` |
   | `mutedForeground` | `--muted-foreground` | `#5A6070` | `90, 96, 112` |
   | `border` | `--border` | `#E4E4E7` | `228, 228, 231` |

   Los componentes siguen sin hex; esta tabla es la única excepción y se limita al generador.
7. **Texto compatible con Helvetica estándar (WinAnsi).** Las fuentes estándar solo cubren Latin-1, y los nombres admiten cualquier letra Unicode (`NAME_PATTERN = /^[\p{L}' -]+$/u` en `lib/formFields.ts`). Por eso todo texto pasa por `toPdfText`:
   - normaliza a NFC;
   - deja igual U+0020–U+007E y U+00A0–U+00FF (incluye `á é í ó ú ñ ¡ ¿ ·`);
   - cambia `’ ‘` por `'`, `“ ”` por `"` y `– —` por `-`;
   - descompone (NFKD) el resto de caracteres y quita las marcas combinantes (U+0300–U+036F): `ễ` → `e`, `…` → `...`;
   - lo que siga fuera de Latin-1 pasa a ser `?`.
8. **Generador puro con datos planos** (`TicketPdfInput`). No conoce `Order` ni ningún módulo, porque `lib/` no importa de `modules/`. Las fechas llegan ya formateadas. Quien convierte `Order` → `TicketPdfInput` es `buildTicketPdfInput`, en checkout (dueño del contrato E). Se publica en `modules/checkout/orders.ts`, que tickets ya usa. Así checkout y tickets no duplican el mapeo.
9. **`getQrModules` se importa desde `@/components/shared/TicketQr`** (export existente, sin `"use client"`), así que el QR es idéntico al de pantalla. No se mueve a `lib/`: eso tocaría `TicketQr` y su test (contrato F de checkout) sin beneficio funcional.
10. **Descarga con `downloadBlob(fileName, blob)`** en `lib/download.ts`, que es la segunda repetición real del patrón de `downloadIcs` (DRY). Mantiene el comportamiento ya probado: enlace temporal en el `body`, `click()`, quitar el enlace y revocar la URL justo después. `downloadIcs` construye su `Blob` y delega en ella; `lib/calendar.test.ts` no cambia.
11. **Botón compartido `TicketsPdfButton`** en `components/shared/`. Lo usan checkout y tickets, y no existe en shadcn (`npx shadcn@latest search @shadcn -q download` y `-q pdf` sin resultados). Compone `Button` (shadcn, Base UI) y `Spinner`. Estados:
    - **Reposo:** icono `Download` + "Descargar PDF".
    - **Generando:**
      - `Spinner` (`aria-hidden`, `size-5 motion-reduce:animate-none`) + "Generando…";
      - `aria-busy="true"`, `disabled` + `focusableWhenDisabled`: Base UI pone `aria-disabled="true"`, cancela los clics (no hay dobles descargas) y el botón conserva el foco;
      - región `sr-only` `role="status"` con "Generando PDF…".

      El texto visible es corto porque a 375 px el botón de la confirmación ocupa media columna (~165 px) y "Generando PDF…" con icono no cabe.
    - **Error** (falla el `import()` del chunk o la generación): vuelve a reposo y muestra debajo `<p role="alert">` "No pudimos generar el PDF. Inténtalo de nuevo.". Al reintentar, el mensaje desaparece.
12. **Sin `window.print()`.** "Descargar PDF" ya no imprime. Se elimina la sección solo-impresión "Tus entradas" de `OrderConfirmation`, porque duplicaba el PDF y solo existía para ese botón. Las demás clases `print:` se conservan (decisión de alcance).

## Requisitos
1. **Dependencia:** `npm install jspdf@^4.2.1` (en `dependencies`). No se añaden alias ni configuración en `next.config.ts`.
2. **`lib/download.ts`:** `downloadBlob(fileName: string, blob: Blob): void`. Hace `URL.createObjectURL(blob)`, añade al `document.body` un `<a>` con `href` y `download = fileName`, llama a `click()`, quita el enlace y luego `URL.revokeObjectURL(url)`. `lib/calendar.ts` → `downloadIcs` crea el `Blob` `text/calendar;charset=utf-8` como hoy y llama a `downloadBlob`. Su firma no cambia.
3. **`lib/ticketPdf.ts`** (sin directiva; sin imports estáticos de `jspdf`, salvo `import type`):
   - Tipos `TicketPdfInput` y `TicketPdfTicket` (ver Contrato).
   - `toPdfText(value: string): string`, según la decisión 7.
   - `getQrRuns(modules: boolean[][]): { row: number; col: number; length: number }[]`: tramos horizontales máximos de módulos `true`, en orden de fila y columna.
   - `getTicketsPdfFileName(orderCode: string): string` → `` `mentec-${orderCode}.pdf` ``.
   - `buildTicketsPdf(input: TicketPdfInput): Promise<Blob>`:
     - Si `input.tickets` está vacío, rechaza con `RangeError("No hay entradas para generar el PDF")` sin importar jsPDF.
     - `const { jsPDF } = await import("jspdf")`; `new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: false })`. `compress: false` deja el contenido legible para los tests; el archivo pesa pocos kB igualmente.
     - `setProperties({ title: "Entradas <orderCode> · <título>", author: "Mentec Tickets", creator: "Mentec Tickets" })`.
     - Una página por entrada, en el orden de `tickets` (`addPage()` desde la segunda) con la anatomía del requisito 4. Todo texto pasa por `toPdfText`.
     - Devuelve `doc.output("blob")` (`type` `application/pdf`).
   - `downloadTicketsPdf(input: TicketPdfInput): Promise<void>` → `downloadBlob(getTicketsPdfFileName(input.orderCode), await buildTicketsPdf(input))`. Propaga los errores (los gestiona el botón).
4. **Anatomía de cada página** (mm, A4 210 × 297, margen 20; los valores son orientativos, pero el orden y el contenido son obligatorios):
   ```
   ┌──────────────────────────── marco 170 mm (rect, border, 0,3) ────────────────────────────┐
   │ ███ franja primary (alto 18) ███  Mentec Tickets (16 pt bold, blanco)   Entrada 1 de 2 ███│  (11 pt bold, blanco, alineado a la derecha)
   │                                                                                          │
   │ Noche de Sintetizadores: Gira Neón 2026          (20 pt bold, foreground; envuelve a 154) │
   │ Sábado, 14 de noviembre de 2026 · 21:00 h        (12 pt, foreground)                       │
   │ Estadio Nacional, Lima                           (12 pt, mutedForeground)                  │
   │╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ (línea discontinua, border) ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌│
   │ ┌─────────────┐   ZONA / ASIENTO                (9 pt bold, mutedForeground, mayúsculas)  │
   │ │   QR 63 mm  │   Tribuna Norte · Fila B · Asiento 4   (12 pt bold, foreground; envuelve)│
   │ │ (21 × 3 mm) │   TITULAR                                                                 │
   │ │  marco rect │   Ana Quispe                                                              │
   │ │   border    │   CÓDIGO DE ENTRADA                                                       │
   │ └─────────────┘   MT-7Q4K2P-01                         (14 pt bold, foreground)           │
   │                   PEDIDO                                                                  │
   │                   MT-7Q4K2P                                                               │
   │          Presenta este código en la entrada    (10 pt, mutedForeground, centrado)         │
   └──────────────────────────────────────────────────────────────────────────────────────────┘
   ```
   - Línea de fecha: `` `${event.dateLabel} · ${event.timeLabel}` ``. Línea de lugar: `event.venueLabel`.
   - Los textos largos (título, zona/asiento, titular) se envuelven con `splitTextToSize` y desplazan hacia abajo lo que sigue. Nada sale del marco a lo ancho.
   - QR:
     - `getQrModules(ticket.code)` dibujado en `foreground`, con un `rect(…, "F")` por tramo de `getQrRuns`, sobre fondo blanco;
     - marco `rect` en `border` con 3 mm de separación;
     - tamaño de módulo de 3 mm (63 mm en total).
   - Tamaño mínimo de texto: 9 pt (= 12 px, MASTER §3). El texto blanco sobre `primary` va en bold y a ≥ 11 pt (≥ 14 px semibold, MASTER §2).
5. **`modules/checkout/utils/ticketPdfInput.ts`** (puro): `buildTicketPdfInput(order: Order): TicketPdfInput`:
   - `orderCode` = `order.code`;
   - `event.title` = `order.event.title`;
   - `event.dateLabel` = `formatLongDate(startsAt)` con la primera letra en mayúscula ("Sábado, 14 de noviembre de 2026");
   - `event.timeLabel` = `` `${formatTime(startsAt)} h` `` ("21:00 h");
   - `event.venueLabel` = `"<venue>, <city>"`;
   - `tickets` = `order.tickets.map(({ code, seatLabel, ticketTypeName, holderName }) => ({ code, locationLabel: seatLabel ?? ticketTypeName, holderName }))`, en el mismo orden.
   - Importa los formateadores de `@/modules/events/format` (nunca del barrel) y `import type { TicketPdfInput }` de `@/lib/ticketPdf`.
6. **`modules/checkout/orders.ts`** añade `export { buildTicketPdfInput } from "./utils/ticketPdfInput";`. Sigue solo reexportando.
7. **`components/shared/TicketsPdfButton.tsx`** (`"use client"`):
   - Props: `Omit<ButtonProps, "onClick" | "children" | "disabled" | "type">` + `{ input: TicketPdfInput; errorClassName?: string }`. Reenvía `variant`, `className` y el resto a `Button` (`type="button"`).
   - `onClick`: si ya genera, no hace nada. Si no: borra el error, pasa a "generando", `await downloadTicketsPdf(input)` y vuelve a reposo; si falla, pasa a "error".
   - Render (fragmento):
     - el `Button` según la decisión 11, con `aria-busy` solo mientras genera y las clases `aria-busy:cursor-progress aria-busy:opacity-70`;
     - `<span role="status" className="sr-only">` (siempre presente; texto solo mientras genera);
     - si hay error, `<p role="alert" className={cn("text-sm text-destructive", errorClassName)}>`.
   - Importa `downloadTicketsPdf` y el tipo de `@/lib/ticketPdf` (estático: `jspdf` sigue siendo dinámico dentro).
8. **`OrderConfirmation`** (`modules/checkout/components/OrderConfirmation.tsx`):
   - En `ConfirmationActions`, el botón "Descargar PDF" pasa a `<TicketsPdfButton variant="outline" input={buildTicketPdfInput(order)} className={OUTLINE_ACTION_CLASS} errorClassName="col-span-2 text-center sm:basis-full" />`. En móvil, el error ocupa las dos columnas de la grilla; desde `sm`, la línea completa del `flex-wrap`.
   - Se eliminan `window.print`, el componente `PrintableTickets` y su render, y los imports que queden sin uso (`TicketQr`).
   - `buildTicketPdfInput` se importa de `../utils/ticketPdfInput` (archivo interno del propio módulo).
   - Lo demás no cambia (calendario, "Ver mis entradas", "Qué sigue", clases `print:`).
9. **`TicketCard`** (`modules/tickets/components/TicketCard.tsx`):
   - El botón "Descargar PDF" pasa a `<TicketsPdfButton variant="outline" input={buildTicketPdfInput(order)} className={ACTION_CLASS} errorClassName="sm:basis-full" />`, con todas las entradas del pedido (decisión 3).
   - `buildTicketPdfInput` se importa de `@/modules/checkout/orders`.
   - Se elimina `window.print`. El comentario JSDoc del componente deja de decir "imprimir".
   - Lo demás no cambia (navegación, calendario, clases `print:`).
10. **Diseño:**
    - `design-system/ticketera/MASTER.md`: nueva subsección en §7 "PDF de entradas" con la anatomía del requisito 4, la tabla RGB de la decisión 6 y la nota de Helvetica como única excepción a §3/§12 (solo en el PDF).
    - `pages/checkout.md`: "Descargar PDF" descarga `mentec-<pedido>.pdf`, con los estados del botón. Se quita "Tus entradas" solo al imprimir. "Impresión" pasa a describir solo lo que oculta Ctrl+P.
    - `pages/my-tickets.md`: igual, con todas las entradas del pedido.
11. **Accesibilidad:** el nombre del botón es "Descargar PDF" en reposo; foco visible; target ≥ 44 px (`h-11`, ya en las clases de acción); `cursor-pointer` en reposo; iconos `aria-hidden`; sin scroll horizontal a 375 / 768 / 1024 / 1440, tampoco con el texto "Generando…" ni con el mensaje de error.

## Criterios de aceptación
- [ ] Dada la confirmación de un pedido con 3 entradas (`/checkout/confirmacion?orden=MT-XXXXXX`), cuando se pulsa "Descargar PDF", entonces se descarga `mentec-MT-XXXXXX.pdf` y no se abre el diálogo de impresión.
- [ ] Dado "Mis entradas" con la cuenta demo (`demo@mentectickets.pe` / `Mentec2026`) y el pedido `MT-7Q4K2P` seleccionado (2 entradas), cuando se pulsa "Descargar PDF" (también estando en "Entrada 2 de 2"), entonces se descarga `mentec-MT-7Q4K2P.pdf` con 2 páginas.
- [ ] **(Playwright)** Dados `npm run build && npm run start` y un script de Playwright (Chromium, `acceptDownloads`), en confirmación (orden inyectada en `localStorage["mentec-orders"]` con `page.addInitScript`, formato `{"state":{"orders":[<Order>]},"version":0}`, con N = 3) y en "Mis entradas" (login demo, `MT-7Q4K2P`, N = 2), cuando se pulsa "Descargar PDF" con `Promise.all([page.waitForEvent("download"), click])`, entonces:
  - se dispara el evento `download`;
  - `suggestedFilename()` termina en `.pdf` y es `mentec-<pedido>.pdf`;
  - el archivo guardado empieza por los bytes `%PDF-`;
  - contiene exactamente N objetos `/Type /Page` (sin contar `/Pages`).
- [ ] Dado el PDF de `MT-7Q4K2P`, cuando se abre en un visor, entonces cada página es A4 vertical y muestra, en este orden:
  - la franja azul con "Mentec Tickets" y "Entrada n de 2";
  - el título;
  - "Sábado, 14 de noviembre de 2026 · 21:00 h";
  - "Estadio Nacional, Lima";
  - la línea discontinua;
  - el QR vectorial (nítido con zoom al 400 %) idéntico al que se ve en pantalla para ese código;
  - Zona / asiento "General", Titular ("Ana Quispe", luego "Carlos Quispe"), Código de entrada `MT-7Q4K2P-01`/`-02`, Pedido `MT-7Q4K2P`;
  - "Presenta este código en la entrada".

  Los códigos se pueden seleccionar como texto.
- [ ] Dado un pedido con asiento (`MT-3HX9RB`), entonces "Zona / asiento" muestra la etiqueta completa ("Tribuna Occidente · Fila F · Asiento 12"). Sin asiento, muestra el nombre de la zona.
- [ ] Dado que se pulsa "Descargar PDF", mientras se genera:
  - el botón muestra spinner + "Generando…" y tiene `aria-busy="true"` y `aria-disabled="true"`;
  - conserva el foco;
  - un segundo clic no inicia otra descarga;
  - un lector de pantalla anuncia "Generando PDF…".

  Al terminar, vuelve a "Descargar PDF".
- [ ] Dado que falla la carga del chunk de jsPDF (p. ej. red cortada en DevTools antes del primer clic), cuando se pulsa "Descargar PDF", entonces aparece "No pudimos generar el PDF. Inténtalo de nuevo." (`role="alert"`) y el botón vuelve a estar activo. Con la red restaurada, un nuevo clic descarga el PDF y el mensaje desaparece.
- [ ] Dado el bundle, entonces `jspdf` solo aparece en `import("jspdf")` dentro de `lib/ticketPdf.ts` (sin imports estáticos en ningún archivo, salvo `import type`). En la pestaña Red, el chunk de jsPDF no se pide al cargar `/checkout/confirmacion` ni `/mis-entradas`, sino solo al pulsar.
- [ ] Dado 375 px, entonces en la confirmación "Calendario" y "Descargar PDF" siguen en dos columnas sin desbordar, también durante "Generando…". El mensaje de error ocupa el ancho completo bajo los botones. En "Mis entradas", los botones siguen apilados a todo el ancho.
- [ ] Dado el código, entonces no queda ningún `window.print` en `modules/`, `OrderConfirmation` ya no renderiza la región "Tus entradas" y los colores RGB solo existen en `lib/ticketPdf.ts`, con su token en un comentario.
- [ ] Dado "Agregar al calendario" en ambas pantallas, entonces sigue descargando `<slug>.ics` como antes (`downloadIcs` usa `downloadBlob`; `lib/calendar.test.ts` pasa sin cambios).
- [ ] Dados MASTER, `pages/checkout.md` y `pages/my-tickets.md`, entonces describen el PDF (anatomía, colores, Helvetica) y ya no dicen que "Descargar PDF" abre el diálogo de impresión.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

## Diseño técnico
- Rutas (`app/`): ninguna nueva ni modificada.
- Componentes:
  - shadcn (instalado): `button` (Base UI; `disabled` + `focusableWhenDisabled`), `spinner`. No hay nada que instalar. No existe un botón de descarga ni de PDF en el registro (`search -q download`, `-q pdf`: sin resultados).
  - existente (`components/shared/TicketQr.tsx`): solo se importa `getQrModules`; el archivo no se modifica.
  - existente, modificado (`modules/checkout/components/OrderConfirmation.tsx`): usa `TicketsPdfButton`; sin `window.print` ni `PrintableTickets`.
  - existente, modificado (`modules/tickets/components/TicketCard.tsx`): usa `TicketsPdfButton`; sin `window.print`.
  - nuevo `components/shared/TicketsPdfButton.tsx` (`"use client"`): lo usan checkout y tickets (dos dominios); el estado de carga y error no existe en shadcn.
- Utils:
  - nuevo `lib/download.ts`: `downloadBlob` (extraído de `downloadIcs`).
  - modificado `lib/calendar.ts`: `downloadIcs` delega en `downloadBlob`.
  - nuevo `lib/ticketPdf.ts`: generador, nombre de archivo, descarga, `toPdfText`, `getQrRuns`.
  - nuevo `modules/checkout/utils/ticketPdfInput.ts`: `buildTicketPdfInput`.
- Entradas públicas: `modules/checkout/orders.ts` añade `buildTicketPdfInput`.
- Hooks, services, schemas, stores: sin cambios. Contratos E y F sin cambios.
- Contrato (no hay HTTP; contratos entre capas):
  ```ts
  // lib/ticketPdf.ts
  export type TicketPdfTicket = {
    code: string;          // "MT-7Q4K2P-01"
    locationLabel: string; // "Tribuna Norte · Fila B · Asiento 4" o "General"
    holderName: string;    // "Ana Quispe"
  };
  export type TicketPdfInput = {
    orderCode: string;     // "MT-7Q4K2P"
    event: {
      title: string;       // "Noche de Sintetizadores: Gira Neón 2026"
      dateLabel: string;   // "Sábado, 14 de noviembre de 2026"
      timeLabel: string;   // "21:00 h"
      venueLabel: string;  // "Estadio Nacional, Lima"
    };
    tickets: TicketPdfTicket[]; // ≥ 1; una página por entrada, en orden
  };
  export function toPdfText(value: string): string;
  export function getQrRuns(modules: boolean[][]): { row: number; col: number; length: number }[];
  export function getTicketsPdfFileName(orderCode: string): string;       // "mentec-MT-7Q4K2P.pdf"
  export function buildTicketsPdf(input: TicketPdfInput): Promise<Blob>;  // application/pdf; RangeError si no hay entradas
  export function downloadTicketsPdf(input: TicketPdfInput): Promise<void>;

  // lib/download.ts
  export function downloadBlob(fileName: string, blob: Blob): void;

  // modules/checkout/utils/ticketPdfInput.ts (reexportado en modules/checkout/orders.ts)
  export function buildTicketPdfInput(order: Order): TicketPdfInput;

  // components/shared/TicketsPdfButton.tsx
  type TicketsPdfButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children" | "disabled" | "type"> & {
    input: TicketPdfInput;
    errorClassName?: string;
  };
  export function TicketsPdfButton(props: TicketsPdfButtonProps): JSX.Element;
  ```

## Reutilización
- `getQrModules` (`components/shared/TicketQr.tsx`): el mismo QR que en pantalla.
- Patrón de descarga de `downloadIcs` (`lib/calendar.ts`), extraído a `downloadBlob`.
- `formatLongDate`, `formatTime` (vía `@/modules/events/format`); "primera letra en mayúscula" como en `TicketCard`.
- `Order`/`OrderTicket` (contrato E) vía `@/modules/checkout/orders`.
- shadcn `Button` (`focusableWhenDisabled`, igual que la navegación de `TicketCard`) y `Spinner` (con `aria-hidden` y `motion-reduce:animate-none`, como en `OrderConfirmation`).
- Clases de acción existentes (`OUTLINE_ACTION_CLASS`, `ACTION_CLASS`).
- Nueva dependencia: `jspdf` (decisión 1). No hay alternativa nativa: el navegador no genera PDF sin el diálogo de impresión.

## Tests
- `lib/ticketPdf.test.ts` (nuevo; `// @vitest-environment node`, de modo que Vitest use el build Node de jsPDF y el `Blob` nativo; los bytes se leen con `Buffer.from(await blob.arrayBuffer()).toString("latin1")`):
  - `toPdfText`:
    - "Ana Quispe", "Tribuna Norte · Fila B · Asiento 4" y "¡Música en Ñaña!" no cambian;
    - "Nguyễn" → "Nguyen", "O’Brien" → "O'Brien", "Rock – Pop" → "Rock - Pop", "Gira…" → "Gira...";
    - "Łukasz" → "?ukasz";
    - una cadena descompuesta (`"á"`) → "á".
  - `getQrRuns`:
    - una matriz pequeña conocida da sus tramos exactos (fila, columna inicial, longitud);
    - fila vacía → sin tramos;
    - fila llena → un tramo;
    - para `getQrModules("MT-7Q4K2P-01")`, la suma de longitudes es igual al número de módulos `true` y ningún tramo se solapa.
  - `getTicketsPdfFileName("MT-7Q4K2P")` → `"mentec-MT-7Q4K2P.pdf"`.
  - `buildTicketsPdf` con un input de 3 entradas (una con asiento y un titular con caracteres fuera de Latin-1):
    - `blob.type` es `application/pdf`;
    - los bytes empiezan por `%PDF-`;
    - hay exactamente 3 coincidencias de `/Type /Page` no seguido de `s`;
    - el contenido incluye "Mentec Tickets", "Entrada 1 de 3"…"Entrada 3 de 3", el título, "Sábado, 14 de noviembre de 2026 · 21:00 h", el lugar, "ZONA / ASIENTO", la etiqueta con asiento, cada titular (ya normalizado), cada código de entrada, el código de pedido, "Presenta este código en la entrada" y el título del documento "Entradas MT-…";
    - el número de operadores `re` es mayor o igual que la suma de `getQrRuns(getQrModules(code)).length` de las 3 entradas.
  - `buildTicketsPdf` con `tickets: []` → rechaza con `RangeError`.
  - `downloadTicketsPdf` (con `vi.mock("./download")`): llama a `downloadBlob("mentec-<pedido>.pdf", blob)` con un `Blob` PDF. Si la generación falla (input vacío), rechaza y no llama a `downloadBlob`.
- `lib/download.ts`: sin test propio. Lo cubre `lib/calendar.test.ts` (`downloadIcs` → `createObjectURL` con el `Blob`, `<a download>` con el nombre, `click`, `revokeObjectURL`), que debe pasar **sin cambios**. Que el nombre `.pdf` le llega lo cubre `downloadTicketsPdf`.
- `modules/checkout/utils/ticketPdfInput.test.ts` (nuevo): con una orden de 2 entradas (una con `seatLabel`, otra sin él), `startsAt` `2026-11-14T21:00:00-05:00`, `venue` "Estadio Nacional" y `city` "Lima":
  - `orderCode`, `title`, `dateLabel` "Sábado, 14 de noviembre de 2026", `timeLabel` "21:00 h" y `venueLabel` "Estadio Nacional, Lima";
  - `locationLabel` = `seatLabel` en la primera y `ticketTypeName` en la segunda;
  - `holderName` y `code` en el mismo orden.
- `components/shared/TicketsPdfButton.test.tsx` (nuevo; `vi.mock("@/lib/ticketPdf", () => ({ downloadTicketsPdf: vi.fn() }))` con promesas controladas):
  - en reposo: botón "Descargar PDF", sin `aria-busy` ni `aria-disabled`, región `status` vacía;
  - al pulsar:
    - llama una vez a `downloadTicketsPdf` con el `input` recibido;
    - mientras la promesa está pendiente, el botón tiene `aria-busy="true"`, `aria-disabled="true"` y el texto "Generando…", y `status` contiene "Generando PDF…";
    - un segundo clic no vuelve a llamar;
    - el foco sigue en el botón;
  - al resolverse, vuelve a "Descargar PDF" sin `aria-busy` y `status` queda vacío;
  - al rechazarse:
    - `alert` "No pudimos generar el PDF. Inténtalo de nuevo." con `errorClassName` aplicada;
    - el botón vuelve a estar activo;
    - un nuevo clic quita el `alert` y vuelve a llamar;
  - reenvía `className` y `variant` al `Button`.
- `modules/checkout/components/OrderConfirmation.test.tsx` (**cambian** casos existentes; `vi.mock("@/lib/ticketPdf", …)` con `downloadTicketsPdf: vi.fn().mockResolvedValue(undefined)`):
  - "Descargar PDF abre el diálogo de impresión" se sustituye por "Descargar PDF descarga el PDF del pedido": llama a `downloadTicketsPdf` con `orderCode` del pedido, 3 `tickets` con sus códigos en orden y `locationLabel` de cada uno; `window.print` (espiado) no se llama.
  - "la lista de impresión tiene una fila por entrada…" se sustituye por: no existe la región "Tus entradas".
  - Los demás casos no cambian.
- `modules/tickets/components/TicketCard.test.tsx` (**cambia** un caso; mismo mock):
  - "Descargar PDF abre el diálogo de impresión" se sustituye por: con `MT-7Q4K2P`, tras pulsar "Entrada siguiente", "Descargar PDF" llama a `downloadTicketsPdf` con `orderCode` `MT-7Q4K2P` y las 2 entradas (`-01`, `-02`) en orden; `window.print` no se llama.
  - Con `MT-3HX9RB`, el `locationLabel` es "Tribuna Occidente · Fila F · Asiento 12".
- Sin tests propios: `modules/checkout/orders.ts` (solo reexporta), docs.

## Plan de tareas
Coordinación:
- **Con `docs/specs/checkout-mock-payment.md` (borrador):**
  - esta spec y su **Fase 6** modifican `OrderConfirmation.tsx` y su test. Se ejecutan en **sesiones distintas**, y la segunda edita sobre la versión de la primera;
  - se recomienda ejecutar esta spec **antes** de la F6: la F6 ya está enmendada para no crear `PrintableTicket` ni `buildPrintableTickets` y no volver a añadir impresión;
  - esta spec no depende de las Fases 5–7 de checkout ni de su aprobación: usa `formatLongDate`/`formatTime`, que ya existen;
  - al lanzar developers de esta spec, cita solo `docs/specs/tickets-pdf-download.md`.
- **Con `docs/specs/tickets-my-tickets.md` (aprobada, no se edita):** en lo relativo a "Descargar PDF", esta spec sustituye su decisión 12, su requisito 9 y los criterios "abre el diálogo de impresión" de su Fase 2. Sus clases `print:` siguen como están.
- `lib/calendar.ts` y `components/shared/` son base de checkout (contrato F). Aquí solo se refactoriza `downloadIcs` sin cambiar su firma ni su comportamiento.
- No ejecutar `npm install` a la vez que otra tarea.

### Fase 1 — PDF real en confirmación y Mis entradas (5 tareas, 18 archivos: 14 de código, el lockfile y 3 de documentación)
- [ ] T1 — Instalar `jspdf@^4.2.1`; extraer `downloadBlob` a `lib/download.ts` y hacer que `downloadIcs` lo use (`lib/calendar.test.ts` sin cambios y en verde) · archivos: `package.json`, `package-lock.json`, `lib/download.ts`, `lib/calendar.ts` · depende de: — · secuencial (base: dependencias y `lib/`)
- [ ] T2 — Generador `lib/ticketPdf.ts` (`toPdfText`, `getQrRuns`, `getTicketsPdfFileName`, `buildTicketsPdf` con `import("jspdf")`, `downloadTicketsPdf`) con tests; subsección "PDF de entradas" en el MASTER · archivos: `lib/ticketPdf.ts`, `lib/ticketPdf.test.ts`, `design-system/ticketera/MASTER.md` · depende de: T1 · secuencial (`lib/`)
- [ ] T3 — Botón compartido `TicketsPdfButton` con test; `buildTicketPdfInput` con test y su export en la entrada pública de checkout · archivos: `components/shared/TicketsPdfButton.tsx`, `components/shared/TicketsPdfButton.test.tsx`, `modules/checkout/utils/ticketPdfInput.ts`, `modules/checkout/utils/ticketPdfInput.test.ts`, `modules/checkout/orders.ts` · depende de: T2 · secuencial (`components/shared/` y entrada pública)
- [ ] T4 — Checkout: `OrderConfirmation` con `TicketsPdfButton`, sin `window.print` ni "Tus entradas"; tests actualizados; `pages/checkout.md` · archivos: `modules/checkout/components/OrderConfirmation.tsx`, `modules/checkout/components/OrderConfirmation.test.tsx`, `design-system/ticketera/pages/checkout.md` · depende de: T3 · paralelo con T5
- [ ] T5 — Tickets: `TicketCard` con `TicketsPdfButton` (todas las entradas del pedido), sin `window.print`; test actualizado; `pages/my-tickets.md` · archivos: `modules/tickets/components/TicketCard.tsx`, `modules/tickets/components/TicketCard.test.tsx`, `design-system/ticketera/pages/my-tickets.md` · depende de: T3 · paralelo con T4

Verificación final (reviewer): `npx vitest run`, `npm run lint` y `npm run build`, más el criterio Playwright. Playwright no está en el repo: el reviewer lo ejecuta con un script en su scratchpad (`npx -y playwright@latest install chromium` y un script con `@playwright/test` o `playwright`). Si la red no permite descargar el navegador, lo indica y verifica la descarga a mano en Chrome (nombre, `%PDF-` con `head -c 5` y número de páginas en el visor).

## Preguntas abiertas
1. **Qué descarga "Mis entradas":** se descargan todas las entradas del pedido seleccionado en un solo `mentec-<pedido>.pdf` (decisión 3). ¿Prefieres que descargue solo la entrada mostrada (`mentec-MT-7Q4K2P-01.pdf`, 1 página), o un selector "Esta entrada / Todas"?
2. **E2E en el repo:** el criterio Playwright se verifica con un script fuera del repo porque no hay infraestructura E2E (SETUP §3: "cuando se configuren"). ¿Quieres una spec aparte para añadir `@playwright/test`, su configuración y este test como primer E2E?
3. **Fuente del PDF:** se usa Helvetica (decisión 4) en lugar de Creato Display. ¿Aceptas la excepción o quieres que se incruste Creato Display? Eso requiere añadir los TTF al repo (licencia de la fuente para incrustar en PDF por confirmar) y unos 30–60 kB por peso en cada PDF.
4. **Logo en el PDF:** la marca va como texto "Mentec Tickets" sobre la franja azul (decisión 5). ¿Hace falta el logotipo gráfico? Requeriría una versión PNG del logo (o `canvg`) y aumentaría el tamaño del PDF.
5. **Impresión con Ctrl+P:** se conservan las clases `print:` existentes (header, footer, stepper, acciones ocultos). ¿Prefieres quitarlas ahora que el PDF es real? Tocaría `SiteHeader`, `SiteFooter`, `MyTickets`, `TicketCard` y `OrderConfirmation`.
