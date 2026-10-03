# Paginador de entradas y descargas fiables (calendario y PDF)

- Módulo: tickets (también toca checkout y código compartido de `lib/` y `components/shared/`)
- Estado: borrador

## Objetivo
Pedido del usuario: "En la sección de compra confirmada cuando tengo más de 1 entrada el texto Entrada 1 de x se corta porque aparecen los arrows, y hagamos que los botones de Agregar al calendario y Descargar PDF funcionen".

Esta spec resuelve tres cosas para quien compra (`/checkout/confirmacion`) y para quien consulta sus entradas (`/mis-entradas`):
1. Un **paginador de entradas compartido** ("Entrada n de N" + flechas). El texto no se corta ni se parte en ningún ancho.
2. En la **confirmación**, el talón permite recorrer todas las entradas del pedido (QR, código y titular de cada una). Hoy solo muestra la primera.
3. "**Agregar al calendario**" y "**Descargar PDF**" funcionan en la confirmación y en Mis entradas, con criterios verificables en navegador. Se corrige el defecto real encontrado en la descarga (revocación inmediata de la URL del blob).

Visual según `design-system/ticketera/MASTER.md` y `pages/checkout.md` / `pages/my-tickets.md`. Español (Perú).

## Diagnóstico (2026-10-03, rama `claude/brave-pascal-xa77xk`)
Verificado leyendo el código y con Playwright (Chromium 1194) contra `next dev`.

1. **"Entrada 1 de x" con flechas en la confirmación.** En el código actual `ConfirmationTicketCard` **no tiene flechas**: el talón muestra el QR de `tickets[0]` y `<p class="text-sm text-muted-foreground">Entrada 1 de N</p>`, sin navegación. Así, en 320/375/768/1440 px el texto cabe en una línea (87 px). Lo que el usuario describe es lo que pasa al poner en el talón la fila de `TicketCard`, con el texto a la izquierda y dos botones de 44 px a la derecha. Desde `md` el talón mide `md:w-56` = 224 px, con `p-6`, y deja **176 px** de contenido. La fila necesita 115,5 (texto `text-lg font-bold` "Entrada 1 de 3", medido con Creato Display) + 12 (gap) + 44 + 8 + 44 = **223,5 px** (> 176): el texto se trunca o se parte. Aunque fuera `text-sm`, necesitaría 87 + 12 + 96 = 195 px (> 176).
   - **Mismo riesgo en Mis entradas a 320 px:** la columna de datos mide ~248 px (calculado: 320 − 2 × 16 de `px-4` − 2 × 20 de `p-5`). Con "Entrada 10 de 10" (134,8 px en `text-lg font-bold`), la fila necesita 242,8 px: cabe por 5 px, sin margen.
2. **Calendario y PDF en Chromium: funcionan.** Compra simulada en `/checkout?evento=noche-de-sintetizadores-lima&general=2&vip=1` (tarjeta 4242 4242 4242 4242, Términos aceptados) → `/checkout/confirmacion?orden=MT-XJYS7L`:
   - "Agregar al calendario" (1440 y 375 px): evento `download` `noche-de-sintetizadores-lima.ics` con `DTSTART:20261115T020000Z`, `SUMMARY:Noche de Sintetizadores: Gira Neón 2026`, `LOCATION:Estadio Nacional\, Lima` y `DESCRIPTION:Pedido MT-XJYS7L · 3 entradas · Mentec Tickets`.
   - "Descargar PDF" (1440 y 375 px): `download` `mentec-MT-XJYS7L.pdf`, empieza por `%PDF-`, 39 183 bytes, **3 páginas**.
   - Mis entradas (cuenta demo, pedido `MT-7Q4K2P`): `.ics` correcto y `mentec-MT-7Q4K2P.pdf` con `%PDF-` y **2 páginas**.
   - Los botones de la confirmación reciben los datos de la orden: código, 3 entradas y lugar correctos. No usan `window.open`, así que no hay bloqueo de pop-ups. Sin `pageerror`; los únicos errores de consola son 403 de imágenes de Unsplash, por el proxy del entorno.
3. **Defecto real: `lib/download.ts` revoca la URL del blob justo después de `link.click()`.** En Chromium la descarga ya empezó y no pasa nada. En WebKit (Safari de macOS y todos los navegadores de iOS), la navegación de descarga se procesa después. Revocar en el mismo tick puede cancelarla en silencio, sin error ni archivo: "no hace nada". Afecta a los dos botones, porque ambos usan `downloadBlob`. Es la práctica que evita FileSaver.js, que revoca a los 40 s. **Corrección:** revocar con retardo (decisión 6). No se puede verificar aquí porque el entorno solo tiene Chromium (ver Preguntas abiertas 1).
4. **Otros casos revisados, sin cambios:**
   - El PDF se descarga tras un `await` (carga de jsPDF y generación), fuera del gesto del usuario. Los navegadores no exigen activación para `<a download>` sobre un blob del mismo origen; en Chromium funciona. Queda como riesgo en Safari, sin cambio (Preguntas abiertas 1).
   - Si el usuario tiene una copia anterior a `709730c`, "Descargar PDF" abría el diálogo de impresión en lugar de descargar (Preguntas abiertas 1).
   - Chrome muestra la descarga solo como un icono en la barra; puede parecer que "no hace nada" (Preguntas abiertas 2).

## Alcance
- Incluye:
  - `lib/download.ts`: `downloadBlob` revoca la URL del blob con retardo. Afecta a `.ics` y `.pdf` sin cambiar la firma de `downloadIcs`, `downloadTicketsPdf` ni `downloadBlob`.
  - Componente compartido `components/shared/TicketPager.tsx`, controlado: texto "Entrada n de N" + flechas "Entrada anterior/siguiente", teclado y layout que nunca corta el texto (container query).
  - `ConfirmationTicketCard`: talón navegable con QR, código y titular de la entrada actual, y `TicketPager`.
  - `TicketCard` (Mis entradas): sustituye su navegación propia por `TicketPager`, sin cambiar textos ni comportamiento salvo el layout estrecho y el teclado (requisitos 3 y 4).
  - Tests unitarios: `lib/download.test.ts` (nuevo), `TicketPager.test.tsx` (nuevo), ajustes en `lib/calendar.test.ts`, `OrderConfirmation.test.tsx` y `TicketCard.test.tsx`.
  - Documentación de diseño: fila nueva en MASTER §7 (tabla de componentes), `pages/checkout.md` (talón) y `pages/my-tickets.md` (navegación).
- No incluye:
  - Cambios en `lib/calendar.ts` (`buildIcsEvent`), en `lib/ticketPdf.ts` o en `TicketsPdfButton`: funcionan y su contenido no cambia. Tampoco `DTEND`/duración en el `.ics`, ni enlaces "Abrir en Google Calendar / Outlook".
  - Mensajes visibles de "descarga completada" (Preguntas abiertas 2).
  - Descargar solo la entrada mostrada: el PDF sigue llevando **todas** las entradas del pedido en ambos sitios (decisión 3 de `tickets-pdf-download.md`).
  - Gestos de deslizar (swipe) o `Carousel` para el QR, y teclas Inicio/Fin.
  - Mostrar en el talón de la confirmación la zona o el asiento de la entrada actual (ya están en las líneas compactas del cuerpo).
  - Ocultar las flechas con una sola entrada (decisión 4; Preguntas abiertas 3).
  - Configurar Playwright/E2E en el repositorio: el reviewer verifica con un script fuera del repo.
  - Editar otras specs. Ver "Coordinación" en el plan.

## Decisiones tomadas
1. **`TicketPager` solo pagina; no incluye el QR.** En Mis entradas el QR va en un recuadro de 208 px, en una columna distinta de la navegación y del `<dl>`. En la confirmación va en el talón, encima del código y del titular. Meter el QR en el componente obligaría a una prop de layout. El componente es **controlado** (`index`, `count`, `onIndexChange`): cada consumidor guarda `useState(0)` y pinta los datos de `tickets[index]`.
2. **Ubicación: `components/shared/`**. Lo usan dos dominios (checkout y tickets), y un módulo no puede importar componentes internos de otro (SETUP §1, regla 5).
3. **Layout por container query, no por breakpoint de viewport.** El ancho disponible depende de dónde se use (talón de 176 px en `md+`, columna de 248–640 px en Mis entradas), no de la pantalla:
   - raíz `@container`;
   - con **< 16rem (256 px)** de contenedor, **apilado y centrado**: texto arriba y las dos flechas debajo, juntas;
   - con **≥ 16rem**, **una fila**: texto a la izquierda y flechas a la derecha (`justify-between`), como hoy en Mis entradas.
   - El peor caso en fila ("Entrada 10 de 10", 134,8 px + 12 + 96 = 242,8 px) cabe en 256 px. En apilado necesita max(134,8; 96) px, que cabe en 176 px.
   - El texto lleva `whitespace-nowrap`; el grupo de botones, `shrink-0`.
   - Así `md:w-56` del talón **no cambia**: no se le resta ancho al cuerpo de la tarjeta a 768 px.
4. **Flechas siempre visibles, también con 1 entrada** (ambas deshabilitadas). Es la regla vigente de `pages/my-tickets.md` ("Siempre visibles, también con una sola entrada"). Se mantiene un solo comportamiento en los dos sitios (Preguntas abiertas 3).
5. **Un solo estilo de texto en ambos sitios:** `text-lg font-bold tabular-nums`, el actual de Mis entradas. En la confirmación sustituye al `text-sm text-muted-foreground` de hoy: ahora es un control, no una nota.
6. **Revocación diferida: `OBJECT_URL_REVOKE_DELAY_MS = 40_000`** en `lib/download.ts` (`setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS)`). Es el mismo margen que FileSaver.js para WebKit. Retener un blob de ~40 kB durante 40 s no tiene coste apreciable. El enlace temporal se sigue quitando del DOM justo después del clic.
7. **Teclado:**
   - Tab llega a las dos flechas; Enter/Espacio las activan (nativo de `Button`).
   - Además, con el foco en cualquiera de las dos, **ArrowLeft/ArrowRight** cambian de entrada (MASTER §11: navegación con flechas, como el carrusel). El foco no se mueve.
   - En los extremos no hacen nada.
   - El manejador va en la raíz del componente (burbujeo) y **no mira `event.defaultPrevented`**: Base UI hace `preventDefault()` en `keydown` sobre un botón `disabled` + `focusableWhenDisabled`, pero no detiene la propagación (`useFocusableWhenDisabled`).
8. **Anuncio:** `aria-live="polite"` y `aria-atomic="true"` en el texto, renderizado como **un único nodo de texto** (template literal `` `Entrada ${index + 1} de ${count}` ``). Así el lector anuncia "Entrada 2 de 3" completo y no solo el número que cambió.
9. **Impresión:** el paginador va con `print:hidden` en ambos sitios (hoy ya en Mis entradas). La confirmación impresa muestra el QR, el código y el titular de la entrada visible. El documento para imprimir es el PDF.

## Requisitos
1. `components/shared/TicketPager.tsx` (`"use client"`) renderiza, dentro de una raíz `role="group"` `aria-label="Entradas del pedido"`:
   - `<p aria-live="polite" aria-atomic="true">` con "Entrada {index + 1} de {count}" (un solo nodo de texto), `text-lg font-bold tabular-nums whitespace-nowrap`;
   - dos `Button` `variant="outline"` `size="icon"` `type="button"`, `size-11` (44 × 44 px), con `aria-label` "Entrada anterior" (`ChevronLeft`) y "Entrada siguiente" (`ChevronRight`), iconos `size-5` `aria-hidden`, `cursor-pointer`, transición 200 ms.
2. En los extremos, el botón correspondiente queda `disabled` + `focusableWhenDisabled`: tiene `aria-disabled="true"`, sigue enfocable, `opacity-50 cursor-not-allowed` y sin hover. Al pulsarlo no llama a `onIndexChange`. Si el foco estaba en él al llegar al extremo, se queda ahí.
3. Layout según la decisión 3 (container query `@3xs` = 16rem): apilado y centrado por debajo de 256 px de contenedor; fila con `justify-between` desde 256 px. El texto nunca se trunca, nunca se parte en dos líneas y nunca se solapa con las flechas.
4. ArrowLeft/ArrowRight según la decisión 7. Las demás teclas no se tocan.
5. Props: `index` (0-based), `count` (≥ 1; el consumidor no lo renderiza sin entradas), `onIndexChange(index)`. Reenvía `className` y el resto de props de `div` a la raíz (Liskov). `children` y `onKeyDown` no se aceptan.
6. **Confirmación (`ConfirmationTicketCard`):** el talón (mismo contenedor, `md:w-56`, separador y muescas sin cambios) muestra, en columna centrada, para la entrada `tickets[index]`:
   1. `TicketQr value={ticket.code}` (`size-40 md:size-32`);
   2. el código, `text-sm font-semibold tabular-nums`, con prefijo `sr-only` "Código de entrada: ";
   3. "Titular: {holderName}" (`text-sm text-muted-foreground break-words`, centrado), solo si `holderName.trim()` no está vacío;
   4. `TicketPager` con `className="print:hidden"`.

   Empieza en la entrada 1. El cuerpo de la tarjeta (Zona, Entradas, Total pagado, asientos compactos) no cambia.
7. **Mis entradas (`TicketCard`):** la fila actual "Entrada n de N" + flechas se sustituye por `<TicketPager className="print:hidden" …/>`, con el mismo estado `ticketIndex`. QR, `<dl>`, acciones y reinicio a la entrada 1 al cambiar de pedido (`key` en `MyTickets`) no cambian.
8. `lib/download.ts`: `downloadBlob` crea la URL, añade el `<a download>`, hace clic, quita el enlace y **programa** `URL.revokeObjectURL(url)` a los `OBJECT_URL_REVOKE_DELAY_MS` (exportada). Firma sin cambios.
9. "Agregar al calendario" y "Descargar PDF" siguen generando los mismos archivos que hoy en ambos sitios: mismo nombre, mismo contenido `.ics` y mismo PDF con todas las entradas del pedido, aunque se esté viendo otra entrada.
10. Accesibilidad y estilo: solo tokens, iconos lucide `aria-hidden`, foco visible, targets ≥ 44 px, sin scroll horizontal de página, `motion-reduce` respetado (no hay animaciones nuevas).

## Criterios de aceptación
Todos son de la Fase 1.

### Paginador compartido
- [ ] Dado `TicketPager` con `index=0` y `count=3`, cuando se renderiza, entonces hay un `group` "Entradas del pedido" con el texto "Entrada 1 de 3" en un único elemento con `aria-live="polite"` y `aria-atomic="true"`; "Entrada anterior" tiene `aria-disabled="true"` y es enfocable; "Entrada siguiente" no está deshabilitada.
- [ ] Dado `index=1`, `count=3`, cuando se pulsa "Entrada siguiente" o "Entrada anterior", entonces se llama `onIndexChange(2)` o `onIndexChange(0)`, respectivamente.
- [ ] Dado `index=2`, `count=3`, cuando se pulsa "Entrada siguiente", entonces no se llama `onIndexChange` y el botón tiene `aria-disabled="true"`.
- [ ] Dado el foco en "Entrada siguiente" (índice 0 de 3), cuando se pulsa ArrowRight, entonces se llama `onIndexChange(1)` y el foco sigue en ese botón; con ArrowLeft en el índice 0, o ArrowRight en el último, no se llama. Esto también vale si el foco está en un botón deshabilitado.
- [ ] Dado `count=1`, entonces se ve "Entrada 1 de 1" con las dos flechas deshabilitadas (`aria-disabled="true"`) y visibles.

### Confirmación de compra
- [ ] Dada una compra simulada de 3 entradas (`general=2&vip=1`), cuando carga `/checkout/confirmacion`, entonces el talón muestra el QR "Código QR de la entrada <pedido>-01", el código `<pedido>-01`, "Titular: <Nombres Apellidos>", "Entrada 1 de 3" y "Entrada anterior" deshabilitada.
- [ ] Dado el talón en la entrada 1, cuando se pulsa "Entrada siguiente" dos veces, entonces se ven sucesivamente el QR y el código `-02` y `-03`; el texto pasa a "Entrada 2 de 3" y "Entrada 3 de 3"; en la 3, "Entrada siguiente" queda con `aria-disabled="true"` y conserva el foco.
- [ ] Dada una entrada con `holderName` vacío o solo espacios, entonces su talón no muestra la línea "Titular".
- [ ] Dado que se está viendo "Entrada 2 de 3", cuando se pulsa "Descargar PDF", entonces el PDF incluye las 3 entradas del pedido en orden.

### Mis entradas
- [ ] Dada la cuenta demo y el pedido `MT-7Q4K2P` (2 entradas), entonces la navegación se comporta como hoy: "Entrada 1 de 2", flechas con los mismos nombres; al avanzar cambian código, titular ("Carlos Quispe") y QR; la flecha del extremo queda deshabilitada y enfocable. Además, ArrowRight con el foco en una flecha avanza.
- [ ] `TicketCard.test.tsx` sigue pasando con sus casos actuales.

### Anchos (navegador, 320 / 375 / 768 / 1440 px)
Se mide en la confirmación (3 entradas y 10 entradas: `/checkout?evento=noche-de-sintetizadores-lima&general=10`, avanzando hasta "Entrada 10 de 10") y en Mis entradas (`MT-7Q4K2P`).
- [ ] Dado cualquiera de esos anchos, entonces el `<p aria-live="polite">` del paginador cumple:
  - `scrollWidth ≤ clientWidth`;
  - su alto es una sola línea (28 px con `text-lg`);
  - su rectángulo no se solapa con el de ninguna flecha;
  - cada flecha mide ≥ 44 × 44 px;
  - `document.documentElement.scrollWidth === window.innerWidth`.
- [ ] Dada la confirmación, entonces el paginador está **apilado** (texto encima de las flechas, que van centradas bajo él) a 320, 768 y 1440 px, y **en fila** a 375 px. Dado Mis entradas, entonces está **apilado** a 320 px y **en fila** a 375, 768 y 1440 px. "En fila" significa que los centros verticales del texto y de las flechas difieren ≤ 4 px y que el texto queda a la izquierda.
- [ ] Dado `md+` (768 y 1440 px), entonces el talón de la confirmación sigue midiendo 224 px de ancho (`md:w-56`). Contiene QR de 128 px, código, titular y paginador sin desbordar, y la tarjeta sigue horizontal con el talón a la derecha.

### Descargas (navegador; Playwright con `acceptDownloads`)
- [ ] Dada la confirmación de una compra `general=2&vip=1` a 1440 y a 375 px, cuando se pulsa "Agregar al calendario", entonces se emite el evento `download`:
  - `suggestedFilename()` = `noche-de-sintetizadores-lima.ics`;
  - el archivo contiene `BEGIN:VCALENDAR`, `SUMMARY:Noche de Sintetizadores: Gira Neón 2026`, `DTSTART:20261115T020000Z`, `LOCATION:Estadio Nacional\, Lima` y `DESCRIPTION:Pedido <pedido> · 3 entradas · Mentec Tickets`.
- [ ] Dada la misma confirmación, cuando se pulsa "Descargar PDF" (también tras ir a "Entrada 2 de 3"), entonces se emite `download` con `mentec-<pedido>.pdf`, cuyos 5 primeros bytes son `%PDF-` y que tiene **3** objetos `/Type /Page`.
- [ ] Dado Mis entradas con la cuenta demo (`demo@mentectickets.pe` / `Mentec2026`), pedido `MT-7Q4K2P`, cuando se pulsan "Agregar al calendario" y "Descargar PDF", entonces se descargan `noche-de-sintetizadores-lima.ics` (con `SUMMARY`, `DTSTART` y `LOCATION` como arriba) y `mentec-MT-7Q4K2P.pdf` (`%PDF-`, **2** páginas).
- [ ] Dadas esas descargas, entonces no hay `pageerror` y ninguna URL `blob:` se revoca antes de 40 s: lo cubre el unit test de `lib/download.ts`.

### Calidad
- [ ] `npx vitest run`, `npm run lint` y `npm run build` sin errores.

## Diseño técnico
- **Rutas (`app/`):** sin cambios (`app/checkout/confirmacion/page.tsx` y `app/mis-entradas/page.tsx` solo componen).
- **Componentes:**

  | Pieza | Origen | Uso |
  |---|---|---|
  | `Button` (`outline`, `size="icon"`, `focusableWhenDisabled`) | shadcn (instalado), `components/ui/button.tsx` | flechas del paginador |
  | `TicketPager` | nuevo, `components/shared/TicketPager.tsx`: no existe en el proyecto; la fila de `TicketCard` es local; shadcn `pagination` es una `nav` de enlaces a páginas, no un control "n de N" sin URL | confirmación y Mis entradas |
  | `TicketQr` | existente, `components/shared/TicketQr.tsx` | QR de la entrada actual |
  | `TicketsPdfButton` | existente, `components/shared/TicketsPdfButton.tsx` (sin cambios) | "Descargar PDF" |
  | `ConfirmationTicketCard` | existente, `modules/checkout/components/ConfirmationTicketCard.tsx` (se modifica) | talón navegable |
  | `TicketCard` | existente, `modules/tickets/components/TicketCard.tsx` (se modifica) | usa `TicketPager` |
  | `Carousel` | shadcn (instalado), **descartado** | su ventaja es el deslizamiento y el scroll-snap entre slides; aquí solo cambia el contenido de un recuadro (KISS) |

- **Contrato del componente:**

  ```ts
  // components/shared/TicketPager.tsx
  "use client";
  import type { ComponentProps } from "react";

  type TicketPagerProps = Omit<ComponentProps<"div">, "children" | "onKeyDown"> & {
    /** Índice (0-based) de la entrada mostrada. */
    index: number;
    /** Número de entradas del pedido (≥ 1). */
    count: number;
    onIndexChange: (index: number) => void;
  };

  export function TicketPager(props: TicketPagerProps); // devuelve el JSX de abajo
  ```

  Estructura (clases orientativas):

  ```tsx
  <div role="group" aria-label="Entradas del pedido" onKeyDown={handleKeyDown} className={cn("@container w-full", className)} {...rest}>
    <div className="flex flex-col items-center gap-2 @3xs:flex-row @3xs:justify-between @3xs:gap-3">
      <p aria-live="polite" aria-atomic="true" className="text-lg font-bold whitespace-nowrap tabular-nums">
        {`Entrada ${index + 1} de ${count}`}
      </p>
      <div className="flex shrink-0 gap-2">{/* Entrada anterior / Entrada siguiente */}</div>
    </div>
  </div>
  ```

  - `NAV_BUTTON_CLASS` se mueve de `TicketCard` al componente: `size-11 cursor-pointer duration-200 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-background`.
  - `handleKeyDown`: con `ArrowLeft` y `index > 0`, o `ArrowRight` y `index < count - 1`, hace `preventDefault()` y llama a `onIndexChange(index ∓ 1)`. No comprueba `defaultPrevented` (decisión 7).
- **Confirmación** (`ConfirmationTicketCard.tsx`):
  - `const [ticketIndex, setTicketIndex] = useState(0)` y `const ticket = tickets[ticketIndex]`. Sin entradas no se renderiza el talón (guarda actual).
  - No necesita `"use client"` propio: solo se importa desde `OrderConfirmation`, que ya es cliente (igual que hoy con `useId`).
  - Talón: `flex flex-col items-center justify-center gap-3 p-6` (sin cambios), con los hijos del requisito 6. El bloque de código y titular va en `flex w-full min-w-0 flex-col items-center gap-0.5 text-center`.
- **Mis entradas** (`TicketCard.tsx`):
  - Se elimina la fila local (`<div className="flex items-center justify-between gap-3 print:hidden">…`) y `NAV_BUTTON_CLASS`. En su lugar: `<TicketPager index={ticketIndex} count={tickets.length} onIndexChange={setTicketIndex} className="print:hidden" />`.
  - Quedan sin uso `isFirst`/`isLast` y los imports `ChevronLeft`/`ChevronRight`: se quitan.
- **`lib/download.ts`:**

  ```ts
  /** Margen antes de liberar la URL del blob: WebKit procesa la descarga después del clic (ver FileSaver.js). */
  export const OBJECT_URL_REVOKE_DELAY_MS = 40_000;

  export function downloadBlob(fileName: string, blob: Blob): void; // firma sin cambios
  // …link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
  ```

- **Hooks, services, schemas, stores:** ninguno nuevo. El estado del índice es local (`useState`) en cada consumidor.
- **Contrato de API:** no hay llamadas a API. Datos de entrada: `Order["tickets"]` (contrato E, sin cambios): `{ code: string; ticketTypeName: string; seatLabel?: string; holderName: string }[]`.

## Reutilización
- `Button` de shadcn con `focusableWhenDisabled` de Base UI: el patrón ya probado en `TicketCard`.
- `TicketQr`, `TicketsPdfButton`, `buildTicketPdfInput`, `buildIcsEvent`/`downloadIcs` y `downloadTicketsPdf`, sin cambios.
- Container queries nativas de Tailwind v4 (`@container`, `@3xs` = 16rem en `tailwindcss` 4.3.3), ya usadas en `components/ui/card.tsx` y `field.tsx`. Sin dependencias nuevas.

## Tests
- **`lib/download.test.ts` (nuevo):** con fake timers y `URL.createObjectURL`/`revokeObjectURL` sustituidos, y `HTMLAnchorElement.prototype.click` espiado:
  - crea la URL desde el blob; el enlace tiene `download = fileName` y `href` = la URL; se hace clic una vez y el enlace queda desconectado (`isConnected === false`);
  - `revokeObjectURL` **no** se llama de forma síncrona ni a los `OBJECT_URL_REVOKE_DELAY_MS - 1` ms; se llama una vez con la URL al llegar a `OBJECT_URL_REVOKE_DELAY_MS`.
- **`lib/calendar.test.ts` (ajuste del caso `downloadIcs`):** sigue comprobando el tipo `text/calendar;charset=utf-8`, el contenido, el nombre y el enlace desconectado. La aserción "revoca la URL después del clic" pasa a hacerse tras `vi.runAllTimers()`, con fake timers.
- **`components/shared/TicketPager.test.tsx` (nuevo):** cubre los cinco criterios de "Paginador compartido":
  - texto en un único elemento con `aria-live`/`aria-atomic`;
  - extremos con `aria-disabled` y enfocables;
  - clics que llaman o no a `onIndexChange`;
  - ArrowLeft/ArrowRight (incluido desde un botón deshabilitado) y que otras teclas, p. ej. `Enter` en el `group`, no llaman;
  - `count = 1`;
  - reenvía `className` y atributos (`data-testid`) a la raíz.
  - Un caso con un envoltorio con estado comprueba que el texto pasa a "Entrada 2 de 3" y que el foco sigue en el botón pulsado.
- **`modules/checkout/components/OrderConfirmation.test.tsx` (ampliar):**
  - los casos actuales siguen pasando: QR `-01` y "Entrada 1 de 3" en la tarjeta;
  - nuevo: talón con código `MT-AB12CD-01` y "Titular: Luis Pérez"; "Entrada siguiente" ×2 → QR/código `-02` y `-03`, "Entrada 3 de 3", "Entrada siguiente" con `aria-disabled="true"` y foco conservado;
  - orden con `holderName: " "` sin línea "Titular";
  - orden de 1 entrada → "Entrada 1 de 1" con ambas flechas deshabilitadas;
  - en "Entrada 2 de 3", "Descargar PDF" llama a `downloadTicketsPdf` con las 3 entradas.
- **`modules/tickets/components/TicketCard.test.tsx` (ampliar):** los casos actuales sin cambios y en verde. Nuevo: con el foco en "Entrada siguiente", `keyDown` ArrowRight muestra "Entrada 2 de 2" y el código `MT-7Q4K2P-02`. Así se comprueba que `TicketCard` usa el paginador compartido.
- **Sin unit tests:** documentación del design system. El layout por container query no se puede medir en jsdom: lo cubren los criterios de "Anchos" en navegador.

## Plan de tareas
Coordinación:
- **`docs/specs/checkout-mock-payment.md` (aprobada, fases cerradas; no se edita):** T3 modifica `ConfirmationTicketCard.tsx` y `OrderConfirmation.test.tsx`, que son de sus Fases 4 y 6. Esta spec sustituye, solo en lo relativo al talón:
  - su diseño técnico "`TicketQr value={tickets[0].code}` … y 'Entrada 1 de N'";
  - sus criterios de F4/F6 sobre el talón. Siguen cumpliéndose en el estado inicial (QR `-01`, "Entrada 1 de 3"), pero ahora hay navegación.

  El resto de esa spec no cambia.
- **`docs/specs/tickets-my-tickets.md` (aprobada; no se edita):** T4 sustituye su navegación local por `TicketPager`. Cambia "a la derecha en todos los tamaños" por el layout de la decisión 3 (apilado bajo 256 px de contenedor) y añade ArrowLeft/ArrowRight. Textos, nombres accesibles y estados no cambian.
- **`docs/specs/tickets-pdf-download.md` (aprobada; no se edita):** T1 cambia el momento de la revocación en `downloadBlob`. Su T1 pedía "`lib/calendar.test.ts` sin cambios"; aquí ese test se ajusta (fake timers) porque la revocación ya no es síncrona. Firma y archivos generados sin cambios.
- Al lanzar developers, cita solo `docs/specs/tickets-ticket-pager.md`.
- Los developers en paralelo (T3 y T4) no ejecutan `build`; el build completo lo ejecuta el reviewer al final.

### Fase 1 — Paginador compartido, talón navegable y descargas fiables (4 tareas, 12 archivos)
- [ ] T1 — Revocación diferida en `downloadBlob` (`OBJECT_URL_REVOKE_DELAY_MS`), con test propio y ajuste del test de calendario · archivos: `lib/download.ts`, `lib/download.test.ts` (nuevo), `lib/calendar.test.ts` · depende de: — · secuencial (base, `lib/`)
- [ ] T2 — `TicketPager` compartido con su test; fila "Paginador de entradas" en la tabla de componentes del MASTER §7 · archivos: `components/shared/TicketPager.tsx` (nuevo), `components/shared/TicketPager.test.tsx` (nuevo), `design-system/ticketera/MASTER.md` · depende de: T1 (orden secuencial de lo compartido) · secuencial (base, `components/shared/`)
- [ ] T3 — Checkout: talón navegable en `ConfirmationTicketCard` (QR, código, titular y `TicketPager`); tests ampliados; `pages/checkout.md` (sección "Tarjeta-entrada": talón; layout ASCII; nota de que el paginador es `print:hidden`) · archivos: `modules/checkout/components/ConfirmationTicketCard.tsx`, `modules/checkout/components/OrderConfirmation.test.tsx`, `design-system/ticketera/pages/checkout.md` · depende de: T2 · paralelo con T4
- [ ] T4 — Tickets: `TicketCard` usa `TicketPager` (quita la fila local, `NAV_BUTTON_CLASS`, `isFirst`/`isLast` y los chevrons); test ampliado con ArrowRight; `pages/my-tickets.md` ("Navegación": layout por container query y teclado) · archivos: `modules/tickets/components/TicketCard.tsx`, `modules/tickets/components/TicketCard.test.tsx`, `design-system/ticketera/pages/my-tickets.md` · depende de: T2 · paralelo con T3

Verificación final (reviewer):
- `npx vitest run`, `npm run lint` y `npm run build`.
- Los criterios de "Anchos" y "Descargas", con un script de Playwright fuera del repo:
  - servidor `node_modules/.bin/next dev -p <puerto>`; detenerlo por PID, nunca con `pkill`;
  - Chromium en `/opt/pw-browsers/chromium`; `acceptDownloads: true`;
  - compra simulada con la tarjeta 4242 4242 4242 4242 y Términos marcados;
  - páginas del PDF contadas con `/\/Type\s*\/Page[^s]/g` sobre el archivo en latin1.

## Preguntas abiertas
1. **Navegador y dispositivo del fallo.** En Chromium ambos botones descargan bien (ver Diagnóstico 2). ¿Dónde viste que "no hacen nada"? Navegador, sistema y si es móvil.
   - Si es Safari o iOS, la corrección de T1 es la causa probable, pero aquí no se puede probar WebKit: habría que confirmarlo en tu equipo.
   - Si tu copia es anterior al commit `709730c`, "Descargar PDF" abría el diálogo de impresión. Conviene actualizarla antes de probar.
2. **Aviso tras descargar.** Chrome solo muestra la descarga como un icono en la barra, y el `.ics` no abre el calendario solo: hay que abrir el archivo. ¿Quieres un mensaje visible tras cada descarga (p. ej. "Descargamos noche-de-sintetizadores-lima.ics. Ábrelo para añadirlo a tu calendario.")? ¿O, para el calendario, un enlace directo a Google Calendar además del `.ics`? Ninguno entra en esta spec.
3. **Flechas con una sola entrada.** Se muestran deshabilitadas en ambos sitios (decisión 4, regla vigente de Mis entradas). ¿Prefieres ocultar el paginador (o solo las flechas) cuando el pedido tiene 1 entrada?
