# Página: Mis entradas `/mis-entradas`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/tickets-my-tickets.md` (Fase 1: datos, pestañas, lista y entrada; Fase 2: acciones, impresión y enlace en el header). "Descargar PDF": `docs/specs/tickets-pdf-download.md`. h1, chip y metadatos móviles: `docs/specs/design-alignment-account-views.md` (Fase 3). Aviso «Fecha actualizada»: `docs/specs/event-editing.md` (Decisión 2).

Entradas de los pedidos del comprador con sesión iniciada, separadas en próximas y pasadas, con la entrada seleccionada como un boleto. Las órdenes salen de la BD: las pagadas con Stripe (modo test) del usuario, más las compras de invitado hechas con su correo verificado, que se vinculan a su cuenta al entrar (`docs/specs/checkout-stripe.md`). Del diseño de referencia (`MyTickets.dc.html`, `MyTicketsMobile.dc.html`) se toman estructura, flujo y textos; la identidad visual es la de Mentec (tokens, Creato Display), nunca el índigo/Poppins del diseño. El QR es decorativo (`TicketQr`): no codifica nada escaneable.

## Layout

```
Header sticky     (igual que la landing)
┌─ section bg-muted a todo el ancho ─────────────────────────────────────┐
│ h1 "Mis entradas"                       [ Próximas (2) | Pasadas (1) ] │  md+: h1 izq., pestañas der.
│                                                                         │  móvil: apilados, pestañas 2 col.
│ ┌─ lista ─────────┐  ┌─ tarjeta de la entrada ───────────────────────┐ │
│ │ [img] Título    │  │ [imagen h-36/48]  (chip NOV/14 arriba izq.)   │ │
│ │ SÁB 14 NOV · …  │  │ h2 Título                                     │ │
│ │ 2 entradas · …  │  │ ▢ Sábado, 14 de… ◷ 21:00 ◎ Lugar, Ciudad      │ │
│ ├─────────────────┤  │ ◖╌╌╌╌╌╌╌╌╌╌╌╌ talón ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌◗   │ │
│ │ [img] …         │  │ [ QR ]   Entrada 1 de 2          [<] [>]      │ │
│ └─────────────────┘  │          Zona | Titular                       │ │
│                      │          Asiento (si hay, 2 col.)             │ │
│                      │          Código | Estado                      │ │
│                      │          (Fase 2) [Descargar PDF] [Calendario]│ │
│                      └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
Footer            (igual que la landing)
```

- **Fondo `bg-muted`** a todo el ancho (override del MASTER, que reserva `bg-muted` para secciones alternas): la tarjeta blanca destaca y las muescas del talón usan el mismo `bg-muted`. Interior `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 md:py-12`.
- h1 "Mis entradas" `text-3xl font-extrabold tracking-tight md:text-4xl` (30 px en móvil, 36 px desde `md`; la misma escala que el h1 del panel de organizador), único h1 y presente en todos los estados (también en SSR).
- `MyTickets` es el límite cliente (pestañas y selección); la ruta es un Server Component que exige sesión, vincula las compras de invitado, lee las órdenes de la BD, pone metadata (`Mis entradas | Mentec Tickets`, `robots: noindex`) y le pasa `upcoming`/`past`.

## Pestañas (`Tabs` de shadcn / Base UI)

- Semántica `tablist`/`tab`/`tabpanel` nativa (no los botones `aria-pressed` del diseño); flechas para mover el foco y Enter/Espacio para activar.
- `TabsList` `rounded-xl bg-background p-1 ring-1 ring-border` (sobre `bg-muted` necesita fondo blanco); móvil `grid grid-cols-2 w-full`, `md+` ancho según contenido.
- Triggers `h-11 rounded-lg px-4 text-sm font-semibold`: inactivo `text-muted-foreground` (hover `text-foreground`), activo `bg-primary text-primary-foreground` (el negro del diseño pasa al azul de marca). Textos "Próximas (n)" / "Pasadas (n)", n = nº de pedidos.
- Los paneles inactivos se desmontan: al volver a una pestaña se selecciona otra vez su primer pedido y la entrada 1. Panel con foco visible (`outline-ring`).

## Lista de pedidos (`OrderList`)

- `<ul aria-label="Pedidos">`; cada pedido es un `<button>` `rounded-2xl bg-background cursor-pointer` con hover de sombra suave (200 ms) y foco visible (`outline-2 outline-offset-2 outline-ring`).
- Seleccionado: `aria-current="true"` + `ring-2 ring-primary`; resto `ring-1 ring-border` (cambia el grosor, no solo el color).
- Contenido: miniatura cuadrada `rounded-xl` (56 px móvil / 72 px `lg`, `alt=""` porque el título va al lado), título `font-bold truncate`, "SÁB 14 NOV · 21:00 · Lima" (`text-sm text-muted-foreground`) y "2 entradas · General" (`text-sm font-medium text-primary-strong`).
- **Bajo `lg`:** fila con scroll horizontal (`overflow-x-auto snap-x`), botones de 270 px, sangrada hasta el borde (`-mx-4 px-4 md:-mx-6 md:px-6`) sin scroll horizontal de página; `py-1.5` para que anillo y foco no se recorten. La tarjeta va debajo.
- **`lg+`:** columna a la izquierda; grilla `lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)] gap-6 lg:gap-8 items-start`.

## Tarjeta de la entrada (`TicketCard`)

- `<article>` `rounded-2xl bg-card ring-1 ring-border overflow-hidden`.
- **Imagen:** `next/image` `fill` en contenedor de alto fijo `h-36 md:h-48` (sin CLS), `alt` "Título en Lugar, Ciudad".
- **Chip de fecha:** `DateChip` compartido (`components/shared/DateChip.tsx`, decorativo con `aria-hidden`: la fecha ya está en el cuerpo) con `className="absolute top-3 left-3"`. Mes overline `text-xs font-bold tracking-wider text-primary-strong` ("NOV") y día `text-2xl font-extrabold tabular-nums` de dos dígitos ("14") sobre `rounded-xl bg-background ring-1 ring-border/60`, 62 px de alto; zona America/Lima.
- **Cuerpo:** h2 título `text-xl md:text-2xl font-bold tracking-tight`; metadatos `text-muted-foreground` con iconos `size-4` `aria-hidden`: `CalendarDays` + fecha larga con mayúscula inicial ("Sábado, 14 de noviembre de 2026", en `<time>`), `Clock` + hora, `MapPin` + "Lugar, Ciudad".
  - **Bajo `sm` (dos elementos en columna):** la hora va en la línea de la fecha, "Sábado, 14 de noviembre de 2026 · 21:00" (se parte en dos líneas si no cabe), con `<span className="sm:hidden"> · 21:00</span>` tras el `<time>`; debajo, `MapPin` + lugar. El `<li>` de `Clock` es `hidden sm:flex`: no se muestra.
  - **Desde `sm`:** tres elementos (fecha, `Clock` + hora, lugar) en fila con `flex-wrap`; el `<span>` de la hora junto a la fecha se oculta.
  - Un único DOM: lo oculto usa `display: none`, así que la hora se anuncia una sola vez en el árbol de accesibilidad en cualquier ancho.
  - **Aviso «Fecha actualizada»** (spec `event-editing`, Decisión 2): si el evento cambió de fecha u hora con ventas (`order.event.scheduleChangedAt`) y el pedido es anterior a ese cambio (`order.createdAt < scheduleChangedAt`), bajo los metadatos va la misma píldora que en el detalle del evento: `bg-highlight text-highlight-foreground rounded-full px-3 py-1 text-sm font-semibold`, `CalendarClock` `aria-hidden` y "Fecha actualizada el lunes 5 de octubre" (hora de Lima, `<time dateTime>`). Pedidos posteriores al cambio, sin aviso: compraron con la fecha nueva. La fecha mostrada arriba ya es la nueva.
- **Talón** (`aria-hidden`): `border-t-2 border-dashed border-border` con dos muescas `size-6 rounded-full bg-muted ring-1 ring-border` en los bordes (el `overflow-hidden` de la tarjeta las corta a media luna).
- **Parte inferior:** columna centrada en móvil, fila desde `sm`. QR (`TicketQr value={código}`) en recuadro `size-52 rounded-2xl bg-background p-3 ring-1 ring-border`.
  - Navegación: paginador compartido `TicketPager` (`components/shared/`, MASTER §7 "Paginador de entradas"; spec `docs/specs/tickets-ticket-pager.md`), `print:hidden`. "Entrada n de N" (`text-lg font-bold tabular-nums whitespace-nowrap`, `aria-live="polite"` `aria-atomic="true"`) y botones solo-icono `size-11` ("Entrada anterior"/"Entrada siguiente", `ChevronLeft`/`ChevronRight`), un solo DOM.
    - **Layout por container query** (`@container`, no por breakpoint de viewport): con menos de 16rem (256 px) de columna (`@3xs`), texto arriba y las dos flechas juntas y centradas debajo (p. ej. a 320 px de pantalla); desde 16rem, una fila con el texto a la izquierda y las flechas a la derecha (`justify-between`). El texto nunca se corta, ni se parte, ni se solapa con las flechas.
    - **Teclado:** Tab llega a las dos flechas y Enter/Espacio las activan; además, con el foco en cualquiera de ellas (también deshabilitada), ArrowLeft/ArrowRight cambian de entrada sin mover el foco. En los extremos no hacen nada.
    - En los extremos quedan deshabilitados pero enfocables (`focusableWhenDisabled`, `aria-disabled="true"`, `opacity-50`, `cursor-not-allowed`): el foco no se pierde. Siempre visibles, también con una sola entrada.
  - `<dl>` en 2 columnas: Zona | Titular, Asiento (solo si existe, 2 columnas), Código (`tabular-nums`) | Estado. `dt` `text-xs font-medium text-muted-foreground`; `dd` `text-base font-semibold`.
  - Estado con texto, no solo color: "Válida" (`Badge` `bg-accent text-accent-foreground`) en Próximas; "Usada" (`Badge variant="secondary"`) en Pasadas. El verde del diseño no existe en la paleta Mentec.
- Cambiar de pedido reinicia la entrada a 1.

## Estados

- **Sin estado de carga ni de "sin sesión":** la ruta exige sesión (`requireUser`; sin ella no se llega a la página) y llega con las órdenes ya cargadas desde el servidor, así que no hay esqueleto ni rehidratación.
- **Vacíos** (`Empty` de shadcn): bloque `rounded-2xl border-2 border-dashed border-border bg-background px-6 py-14 md:py-20` centrado; icono `Ticket` en `size-14 rounded-2xl bg-accent text-accent-foreground` (`aria-hidden`); título h2 `text-xl font-bold`; descripción `text-muted-foreground max-w-md`; enlace-botón primario `h-11 px-6 font-semibold hover:bg-primary-strong`.

| Caso | Título | Descripción | Acción |
|---|---|---|---|
| Próximas vacía | Aún no tienes eventos próximos | Cuando compres entradas, las verás aquí. | Explorar eventos → `/eventos` |
| Pasadas vacía | Aún no tienes eventos pasados | Cuando vayas a tu primer evento, lo verás aquí. | Explorar eventos → `/eventos` |

## Acciones, PDF e impresión (Fase 2)

- Bajo el `<dl>`: `Button variant="outline"` `h-11 font-semibold` "Descargar PDF" (`Download`) y, solo en Próximas, "Agregar al calendario" (`CalendarPlus`). Etiquetas completas en todos los tamaños (no "PDF"/"Calendario" como el diseño móvil); bajo `sm` apilados a todo el ancho, en fila desde `sm`.
- "Descargar PDF" (`TicketsPdfButton`, `components/shared/`) genera en el navegador y descarga `mentec-<pedido>.pdf` (p. ej. `mentec-TK-1042.pdf`) con **todas las entradas del pedido seleccionado**, una por página A4, aunque se esté viendo "Entrada 2 de 2": las flechas sirven para ver los QR en pantalla, no para elegir qué descargar. Es el mismo PDF que en la confirmación de compra (anatomía, colores RGB y Helvetica en MASTER §7 "PDF de entradas"). No abre el diálogo de impresión.
  - **Reposo:** `Download` + "Descargar PDF".
  - **Generando:** `Spinner` (`aria-hidden`, `size-5 motion-reduce:animate-none`) + "Generando…"; `aria-busy="true"`, `aria-disabled="true"` (deshabilitado pero enfocable: conserva el foco y no admite un segundo clic), `cursor-progress opacity-70`; región `sr-only` `role="status"` anuncia "Generando PDF…".
  - **Error** (falla la carga de jsPDF o la generación): vuelve a reposo y aparece debajo `<p role="alert">` "No pudimos generar el PDF. Inténtalo de nuevo." (`text-sm text-destructive`, `sm:basis-full`: bajo `sm` queda apilado con los botones; desde `sm`, en su propia línea del `flex-wrap`). Al reintentar desaparece.
- "Agregar al calendario" descarga `<slug>.ics` (`lib/calendar.ts`).
- **Impresión (Ctrl+P):** ningún botón imprime ya, pero las clases `print:` se conservan para una impresión limpia: solo se ve la tarjeta de la entrada mostrada (`print:hidden` en h1, pestañas, lista, navegación y acciones; contenedor `print:bg-transparent print:p-0`; tarjeta `print:ring-0 print:break-inside-avoid`). Header y footer del sitio ya se ocultan al imprimir.

## Reglas específicas

- Sin scroll horizontal a 375 / 768 / 1024 / 1440; targets ≥ 44 px (pestañas, pedidos, navegación, botones); foco visible en todo lo interactivo.
- Solo tokens del tema, Creato Display, iconos lucide `aria-hidden`; sin emojis ni hex; texto mínimo 12 px; transiciones 150–300 ms con `motion-reduce` respetado.
- Del header del diseño no se toman "Mi cuenta"/avatar ni la nav "Eventos · Categorías · Cómo funciona"; solo el enlace "Mis entradas" (Fase 2).
