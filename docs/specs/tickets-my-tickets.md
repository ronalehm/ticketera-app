# Mis entradas

- Módulo: tickets
- Estado: borrador

## Objetivo
Que el comprador con sesión iniciada vea en `/mis-entradas` las entradas de sus pedidos: separadas en próximas y pasadas, con la entrada seleccionada como un boleto (imagen, fecha, QR decorativo, zona, asiento, titular, código y estado), y que pueda imprimirla/guardarla como PDF o agregar el evento a su calendario. Es la pantalla "6 · Mis entradas" del diseño (`design/project/MyTickets.dc.html` y `MyTicketsMobile.dc.html`, ver contexto compartido) adaptada a la identidad Mentec (`design-system/ticketera/MASTER.md`). Solo UI con datos mock: los pedidos salen del store de órdenes del cliente (creado por la spec de checkout con pago simulado) y de pedidos demo para la cuenta de prueba.

## Alcance
- Incluye:
  - Fase 1: módulo nuevo `modules/tickets` (pedidos demo, utilidades puras, hook que combina sesión y órdenes), ruta `/mis-entradas`, estados "cargando" (skeleton), "sin sesión" y "sin pedidos", pestañas Próximas/Pasadas, lista de pedidos y tarjeta de la entrada seleccionada con QR y navegación entre entradas. Archivo `design-system/ticketera/pages/my-tickets.md`.
  - Fase 2: botones "Descargar PDF" (diálogo de impresión del navegador) y "Agregar al calendario" (.ics), estilos de impresión, enlace "Mis entradas" en el header (barra y menú móvil) y tests de componentes.
- No incluye:
  - Backend, base de datos, envío de correos ni validación real de entradas. El QR es decorativo (`TicketQr`, contrato F): no codifica nada escaneable.
  - Generar un PDF propio: "Descargar PDF" abre `window.print()` y el usuario elige "Guardar como PDF".
  - Protección de la ruta (proxy/middleware) o redirección forzada a `/login`: sin sesión se muestra un estado con botón "Iniciar sesión".
  - Volver a `/mis-entradas` tras iniciar sesión (`?next=`): el login sigue redirigiendo a `/` (comportamiento de `auth-login-register`). Ver preguntas abiertas.
  - Enlace profundo a un pedido (`/mis-entradas?pedido=<code>`), página de detalle de pedido, búsqueda, filtros o paginación.
  - Transferir, revender, cancelar o reembolsar entradas; Apple/Google Wallet.
  - Enlace desde la tarjeta al detalle del evento (el diseño no lo tiene; las órdenes pasadas son "fotos" con fecha distinta a la del catálogo).
  - Del header del diseño: botón "Mi cuenta"/avatar y nav "Eventos · Categorías · Cómo funciona" (el header actual se conserva; solo se añade el enlace "Mis entradas").
  - Modificar `modules/checkout/**`, `lib/calendar.ts`, `components/shared/TicketQr.tsx` o `modules/auth/session.ts`: son de la spec de checkout (contratos D, E, F); aquí solo se consumen.

## Decisiones tomadas
1. **Módulo propio `modules/tickets`** (dominio "entradas del comprador"). Lee órdenes solo por la entrada pública `@/modules/checkout/orders` y la sesión por `@/modules/auth/session` (regla 4 de SETUP: no arrastrar formularios ni el checkout al bundle de esta ruta).
2. **Ruta delgada:** `app/mis-entradas/page.tsx` es Server Component con `metadata` y `<MyTickets />`. Todo el contenido depende de localStorage, así que `MyTickets` es el límite cliente y renderiza el `<h1>` en todos sus estados (también en SSR).
3. **Sin parpadeo:** en SSR y en el primer render del cliente se muestra el estado "cargando" (h1 + skeleton). El hook `useMyOrders` rehidrata `useAuthStore` y `useOrdersStore` (ambos con `skipHydration: true`) en un `useEffect` y solo cuando ambas promesas terminan fija `now = new Date()` y pasa a "signed-out" o "ready". Así un usuario con sesión nunca ve el estado "sin sesión" ni hay diferencias de hidratación por la fecha.
4. **Próxima vs pasada:** un pedido es "próximo" si `event.startsAt >= now` y "pasado" si `event.startsAt < now`. Próximas ordenadas por `startsAt` ascendente; pasadas por `startsAt` descendente (la más reciente primero); empate por `createdAt` descendente. La fecha `now` es un parámetro de la utilidad (inyectable en tests).
5. **Combinar store + demo:** se toman las órdenes del store con `ownerEmail === email.trim().toLowerCase()`; si el correo es `demo@mentectickets.pe` se añaden `DEMO_ORDERS`. Se elimina duplicados por `code` (gana la del store, que va primero).
6. **Pedidos demo** en `modules/tickets/data/demoOrders.ts`: 2 próximos y 1 pasado, copiando los datos de eventos de `EVENTS_MOCK` (no se importa: es interno de `events`). Un test los contrasta con `getEventBySlug` (API pública de `events`) para que no diverjan. El pasado usa un `startsAt` fijo anterior (función previa de una obra del catálogo).
7. **Pestañas con shadcn `tabs`** (Base UI `Tabs`): semántica `tablist`/`tab`/`tabpanel` y teclado nativos, mejor que los botones `aria-pressed` del diseño. Los paneles inactivos se desmontan (`keepMounted` por defecto `false`), así que al cambiar de pestaña se selecciona de nuevo el primer pedido de esa pestaña y la entrada 1.
8. **Contadores de pestaña** = número de pedidos ("Próximas (2)"), como el diseño.
9. **Navegación entre entradas** con `Button` de shadcn (Base UI) usando `disabled` + `focusableWhenDisabled` en los extremos: el foco no se pierde al llegar al final y el estado se expone con `aria-disabled="true"`. Siempre visibles (con 1 entrada, ambos deshabilitados). En todos los tamaños el orden es "Entrada n de N" a la izquierda y los botones a la derecha (un solo DOM; el móvil del diseño los pone a los lados del texto).
10. **Estado de la entrada:** "Válida" en la pestaña Próximas, "Usada" en Pasadas (no hay datos de control de acceso). `Badge` con texto, no solo color.
11. **Botones de acción:** etiquetas completas en todos los tamaños ("Descargar PDF", "Agregar al calendario"); bajo `sm` van apilados a todo el ancho (el diseño móvil acorta a "PDF"/"Calendario" en dos columnas, pero a 375 px "Agregar al calendario" no cabe en media columna y acortar cambia el nombre accesible). "Agregar al calendario" no se muestra en Pasadas.
12. **Impresión:** "Descargar PDF" llama a `window.print()`. Con clases `print:` se imprime solo la tarjeta de la entrada mostrada: dentro de `MyTickets` se ocultan h1, pestañas, lista, navegación y botones; `SiteHeader` y `SiteFooter` reciben `print:hidden` (Fase 2).
13. **Sin TanStack Query:** no hay estado de servidor; todo es zustand persistido en el cliente.
14. **Metadata:** título "Mis entradas | Mentec Tickets" (convención de `/checkout` y `/eventos`) y `robots: { index: false }` por ser una página personal (ver `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` § robots).
15. **Header:** con sesión, enlace "Mis entradas" (icono `Ticket`) en la barra a partir de `md` (en `sm` no cabe junto a "Hola, <nombre>" y "Cerrar sesión") y en el menú móvil (`Sheet`) siempre. `aria-current="page"` cuando la ruta es `/mis-entradas` (`usePathname`).
16. **Fondo de página `bg-muted`** a todo el ancho (como el diseño y el layout `(auth)`): la tarjeta blanca destaca y las muescas del talón usan el mismo `bg-muted`. Override registrado en `design-system/ticketera/pages/my-tickets.md`.

## Requisitos
1. **Ruta `/mis-entradas`** (`app/mis-entradas/page.tsx`): Server Component sin params; `metadata = { title: "Mis entradas | Mentec Tickets", robots: { index: false } }`; renderiza `<MyTickets />` de `@/modules/tickets`.
2. **Contenedor** (`MyTickets`): `<section>` `bg-muted` a todo el ancho; interior `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 md:py-12`. Único `<h1>` "Mis entradas" (`text-3xl md:text-5xl font-extrabold tracking-tight`), presente en todos los estados.
3. **Cargando** (`status: "loading"`): bajo el h1, bloque con `role="status"` y texto `sr-only` "Cargando tus entradas…"; dentro, `Skeleton` decorativos (`aria-hidden`) con la forma aproximada de pestañas + lista + tarjeta, visibles sobre `bg-muted` (p. ej. `bg-background`) y `motion-reduce:animate-none`. No se muestra el estado "sin sesión" mientras se rehidrata.
4. **Sin sesión** (`status: "signed-out"`): estado vacío (patrón del req. 8) con título "Inicia sesión para ver tus entradas", descripción "Ingresa con tu cuenta para ver y descargar tus entradas cuando quieras." y botón primario "Iniciar sesión" → `/login`. Sin pestañas. Si el usuario cierra sesión estando en la página, pasa a este estado sin recargar.
5. **Con sesión** (`status: "ready"`): `Tabs` (valor por defecto "upcoming") con:
   - Cabecera: en `md+` h1 a la izquierda y `TabsList` a la derecha (`md:flex-row md:items-end md:justify-between`); en móvil apilados, `TabsList` a todo el ancho en 2 columnas. Triggers `h-11` (≥ 44 px), textos "Próximas (n)" y "Pasadas (n)" con n = nº de pedidos de cada grupo.
   - Panel por pestaña: si el grupo está vacío, estado vacío (req. 8); si no, lista de pedidos + tarjeta de la entrada seleccionada. Al montar el panel se selecciona el primer pedido y su entrada 1.
6. **Lista de pedidos** (`OrderList`): `<ul aria-label="Pedidos">`, cada `<li>` con un `<button type="button">` que selecciona el pedido; el seleccionado lleva `aria-current="true"` y `ring-2 ring-primary`, el resto `ring-1 ring-border` (grosor distinto, no solo color); fondo `bg-background`, `rounded-2xl`, `cursor-pointer`, hover 200 ms y foco visible. Contenido: miniatura `next/image` cuadrada (56 px móvil / 72 px `lg`, `rounded-xl`, `alt=""` porque el título va al lado, `sizes="72px"`), título `font-bold truncate`, línea `text-sm text-muted-foreground` "`formatEventDate(startsAt)` · Ciudad" (p. ej. "SÁB 14 NOV · 21:00 · Lima") y línea `text-sm font-medium text-primary-strong` "`n entrada(s)` · Zonas" (p. ej. "2 entradas · General").
   - Bajo `lg`: fila con scroll horizontal (`flex overflow-x-auto snap-x`), botones de `w-[270px] shrink-0`, sangrado hasta el borde (`-mx-4 px-4 md:-mx-6 md:px-6`) sin generar scroll horizontal de la página; la tarjeta va debajo.
   - En `lg+`: columna vertical a la izquierda (grilla `lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)] gap-6 lg:gap-8 items-start`).
7. **Tarjeta de la entrada** (`TicketCard`, `<article>` `rounded-2xl bg-card ring-1 ring-border overflow-hidden`):
   - Imagen `next/image` `fill` en contenedor `relative h-36 md:h-48` (alto fijo, sin CLS), `object-cover`, `alt` "`título` en `lugar`, `ciudad`", `sizes="(min-width: 1024px) 60vw, 100vw"`. Chip de fecha `aria-hidden` arriba a la izquierda (`absolute top-3 left-3 rounded-xl bg-background`): mes overline (`text-xs font-bold tracking-wider text-primary-strong`, "NOV") y día (`text-2xl font-extrabold`, "14", dos dígitos).
   - Cuerpo: `<h2>` título (`text-xl md:text-2xl font-bold tracking-tight`) y `<ul>` de metadatos `text-muted-foreground` con iconos lucide `aria-hidden` `size-4`: `CalendarDays` + `<time dateTime>` con `formatLongDate` (primera letra en mayúscula, "Sábado, 14 de noviembre de 2026"), `Clock` + `formatTime` ("21:00"), `MapPin` + "Lugar, Ciudad". En `sm+` en fila con `flex-wrap`, en móvil en columna.
   - Talón decorativo (`aria-hidden`): línea `border-t-2 border-dashed border-border` con dos muescas circulares `size-6 rounded-full bg-muted ring-1 ring-border` en los bordes.
   - Parte inferior (`sm:flex-row sm:items-center`, en móvil columna centrada): `TicketQr value={ticket.code}` dentro de un recuadro `bg-background p-3 rounded-2xl ring-1 ring-border` de ~208 px (`size-52`); a su lado/debajo:
     - Navegación: texto "Entrada n de N" (`aria-live="polite"`, `text-lg font-bold`) y botones solo-icono `size-11` `aria-label="Entrada anterior"` / `"Entrada siguiente"` (`ChevronLeft`/`ChevronRight`), deshabilitados en los extremos (decisión 9) con aspecto atenuado.
     - `<dl>` en 2 columnas: "Zona" (`ticket.ticketTypeName`), "Asiento" (`ticket.seatLabel`, solo si existe, `col-span-2`), "Titular" (`ticket.holderName`), "Código" (`ticket.code`, `tabular-nums`), "Estado" (`Badge` "Válida" con `bg-accent text-accent-foreground` en Próximas; "Usada" `variant="secondary"` en Pasadas). `dt` `text-xs font-medium text-muted-foreground`; `dd` `text-base font-semibold`.
     - (Fase 2) Acciones: `Button variant="outline"` `h-11 font-semibold cursor-pointer` "Descargar PDF" (icono `Download`) y, solo en Próximas, "Agregar al calendario" (icono `CalendarPlus`). Bajo `sm` apilados `w-full`; en `sm+` en fila.
   - Cambiar de pedido reinicia la entrada a 1 (`TicketCard` con `key={order.code}`).
8. **Estado vacío** (componente interno de `MyTickets` sobre `Empty` de shadcn): bloque `rounded-2xl border-2 border-dashed border-border bg-background px-6 py-14 md:py-20` centrado, icono `Ticket` en `EmptyMedia` (`size-14 rounded-2xl bg-accent text-accent-foreground`, `aria-hidden`), título como `<h2>` `text-xl font-bold` (dentro de `EmptyTitle` o con `render` si lo admite), descripción `text-muted-foreground max-w-md` y un enlace-botón primario (`buttonVariants()` + `h-11 px-6 font-semibold hover:bg-primary-strong`). Textos:
   - Próximas vacía: "Aún no tienes eventos próximos" / "Cuando compres entradas, las verás aquí." / "Explorar eventos" → `/eventos`.
   - Pasadas vacía: "Aún no tienes eventos pasados" / "Cuando vayas a tu primer evento, lo verás aquí." / "Explorar eventos" → `/eventos`.
   - Sin sesión: req. 4.
9. **(Fase 2) Descargar PDF:** `window.print()`. Al imprimir solo se ve la tarjeta de la entrada mostrada (decisión 12): `print:hidden` en h1, `TabsList`, lista, navegación y acciones; contenedor `print:bg-transparent print:p-0`; tarjeta `print:ring-0 print:break-inside-avoid`; `SiteHeader` (`<header>`) y `SiteFooter` (`<footer>`) con `print:hidden`.
10. **(Fase 2) Agregar al calendario:** `buildIcsEvent({ title: event.title, startsAt: event.startsAt, location: "<venue>, <city>", description: "Pedido <order.code> · <n entrada(s)>" })` de `@/lib/calendar` y descarga con el helper de descarga de ese mismo archivo (contrato F) con nombre `<event.slug>.ics`. No se crea otro helper.
11. **(Fase 2) Header:** en `AuthHeaderActions`, con sesión:
    - `bar`: entre "Hola, <firstName>" y "Cerrar sesión", `Link` "Mis entradas" → `/mis-entradas` con icono `Ticket` (`aria-hidden`), clases `buttonVariants({ variant: "ghost" })` + `hidden md:inline-flex h-10 gap-2 px-3 font-semibold cursor-pointer duration-200` y `aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground`.
    - `sheet`: tras el saludo, `SheetClose nativeButton={false} render={<Link href="/mis-entradas" />}` con `PRIMARY_BUTTON w-full` "Mis entradas" (icono `Ticket`), luego "Cerrar sesión".
    - `aria-current="page"` en ambos cuando `usePathname() === "/mis-entradas"`. Sin sesión, sin cambios.
12. **Accesibilidad y responsive:** sin scroll horizontal de página a 375 / 768 / 1024 / 1440 (con sesión, también en el header a 768 y 1280); targets ≥ 44 px; foco visible en todo lo interactivo; pestañas operables con flechas + Enter/Espacio; iconos decorativos `aria-hidden`; solo tokens del tema, Creato Display, sin emojis ni hex; texto mínimo 12 px; transiciones 150–300 ms con `motion-reduce` respetado.

## Criterios de aceptación
### Fase 1
- [ ] Dado `/mis-entradas`, cuando carga, entonces el `<title>` es "Mis entradas | Mentec Tickets", existe `<meta name="robots" content="noindex">` y hay un único `<h1>` "Mis entradas".
- [ ] Dado el HTML servido por el servidor (sin JS), entonces contiene el h1 y el bloque `role="status"` "Cargando tus entradas…", y no contiene "Inicia sesión para ver tus entradas".
- [ ] Dada una sesión guardada en localStorage, cuando se recarga `/mis-entradas`, entonces se pasa del skeleton a las pestañas sin mostrar en ningún momento el estado "Inicia sesión para ver tus entradas".
- [ ] Dado que no hay sesión, cuando termina la rehidratación, entonces se ve "Inicia sesión para ver tus entradas" con el botón "Iniciar sesión" (→ `/login`), sin pestañas y sin redirección automática.
- [ ] Dada la sesión de `demo@mentectickets.pe` sin compras propias (y la fecha actual anterior al 14/11/2026), cuando carga, entonces las pestañas muestran "Próximas (2)" y "Pasadas (1)", la pestaña Próximas está activa y el primer pedido es "Noche de Sintetizadores: Gira Neón 2026" con `aria-current="true"`.
- [ ] Dada la sesión demo y una compra propia en `mentec-orders` con `ownerEmail` del demo, cuando carga, entonces la compra aparece junto a los pedidos demo en la pestaña que le corresponde por fecha y ordenada por fecha del evento; una orden de otro `ownerEmail` no aparece.
- [ ] Dada una cuenta sin órdenes, cuando carga, entonces Próximas muestra "Aún no tienes eventos próximos" y Pasadas "Aún no tienes eventos pasados", ambas con "Explorar eventos" → `/eventos`.
- [ ] Dado el foco en la pestaña "Próximas", cuando se pulsa → y luego Enter, entonces se activa "Pasadas" (`aria-selected="true"`) y su panel muestra el pedido pasado con el Estado "Usada"; volver a Próximas selecciona otra vez el primer pedido y la entrada 1.
- [ ] Dada la lista de pedidos, cuando se pulsa el segundo pedido (ratón o Enter con teclado), entonces ese botón pasa a `aria-current="true"`, el anterior lo pierde y la tarjeta muestra su título (h2), imagen, fecha larga, hora, lugar y "Entrada 1 de N".
- [ ] Dado un pedido con 2 entradas, cuando carga su tarjeta, entonces muestra "Entrada 1 de 2", "Entrada anterior" con `aria-disabled="true"` y el código `…-01`; cuando se pulsa "Entrada siguiente", entonces el texto (región `aria-live="polite"`) pasa a "Entrada 2 de 2", cambian código, titular y QR, "Entrada siguiente" queda `aria-disabled="true"` y el foco permanece en ese botón.
- [ ] Dado el pedido demo con asiento, cuando se ve su entrada, entonces el `dl` muestra "Asiento: Tribuna Occidente · Fila F · Asiento 12"; dado un pedido sin asiento, entonces no aparece "Asiento".
- [ ] Dada la tarjeta, entonces el chip de fecha muestra mes y día en zona America/Lima ("NOV" / "14") y el QR expone `role="img"` con `aria-label` (de `TicketQr`).
- [ ] Dado un ancho de 375 px, entonces no hay scroll horizontal de la página, la lista de pedidos se desplaza horizontalmente dentro de su fila, las pestañas ocupan dos columnas y todos los controles miden ≥ 44 px; a 1024 y 1440 la lista va en columna a la izquierda y la tarjeta a la derecha.
- [ ] Dado `npx vitest run modules/tickets`, entonces pasan los tests de `myOrders`, `demoOrders` y `useMyOrders`; `npm run lint` y `npm run build` sin errores y los tests existentes siguen pasando.

### Fase 2
- [ ] Dada una entrada próxima, cuando se pulsa "Descargar PDF", entonces se abre el diálogo de impresión y la vista previa contiene solo la tarjeta de la entrada mostrada (sin header, footer, pestañas, lista ni botones).
- [ ] Dada una entrada próxima, cuando se pulsa "Agregar al calendario", entonces se descarga `<slug>.ics` con el título del evento, su fecha de inicio y "Lugar, Ciudad" como ubicación.
- [ ] Dada la pestaña Pasadas, entonces no aparece "Agregar al calendario" y sí "Descargar PDF".
- [ ] Dado 375 px, entonces "Descargar PDF" y "Agregar al calendario" van apilados a todo el ancho con su texto completo.
- [ ] Dada una sesión iniciada, cuando se ve el header en `md+`, entonces aparece el enlace "Mis entradas" (→ `/mis-entradas`) entre el saludo y "Cerrar sesión"; en el menú móvil aparece "Mis entradas" y al pulsarlo navega y cierra el menú; sin sesión no aparece en ningún lado.
- [ ] Dado `/mis-entradas` con sesión, entonces el enlace "Mis entradas" del header tiene `aria-current="page"` y fondo `bg-accent`.
- [ ] Dada una sesión iniciada, a 768 y 1280 px de ancho, entonces el header no desborda ni genera scroll horizontal.
- [ ] Dado `npx vitest run`, entonces pasan `TicketCard.test`, `MyTickets.test`, el `AuthHeaderActions.test` actualizado y todos los existentes; `npm run lint` y `npm run build` sin errores.

## Diseño técnico
- Rutas (app/):
  - `app/mis-entradas/page.tsx` (Fase 1): Server Component, `export const metadata: Metadata` (decisión 14) y `return <MyTickets />`.
- Componentes:
  - shadcn (instalar, Fase 1): `npx shadcn@latest add tabs skeleton empty` → `components/ui/tabs.tsx` (Base UI `Tabs`: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`), `components/ui/skeleton.tsx` y `components/ui/empty.tsx` (`Empty`, `EmptyHeader`, `EmptyMedia variant="icon"`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`). Si el CLI pide sobrescribir archivos existentes, responder **no**. Si alguno ya existe (instalado por otra spec), no se reinstala. Nota: en esta sesión `npx shadcn@latest search` no pudo consultarse (registro bloqueado por la red); el developer confirma con `npx shadcn@latest docs tabs` / `docs empty` antes de instalar. Si `empty` no estuviera disponible para `base-nova`, `EmptyState` se compone con `div` + tokens según el req. 8 y se omite `empty.tsx`.
  - shadcn (instalados): `Button`/`buttonVariants`, `Badge`, `Sheet`/`SheetClose` (header).
  - existente `components/shared/TicketQr.tsx` (contrato F, spec de checkout): `<TicketQr value={ticket.code} className="size-full" />`.
  - existente `components/shared/SiteHeader.tsx` y `components/shared/SiteFooter.tsx` (Fase 2): solo se añade `print:hidden` al `<header>` y al `<footer>`.
  - existente `modules/auth/components/AuthHeaderActions.tsx` (Fase 2): requisito 11; añade `usePathname` de `next/navigation` e icono `Ticket`.
  - nuevo `modules/tickets/components/MyTickets.tsx` (`"use client"`, límite cliente; Fase 1, clases de impresión en Fase 2): usa `useMyOrders`; renderiza h1 + estado cargando / sin sesión / `Tabs`. Contiene dos componentes internos (no exportados): `EmptyState` (req. 8; props `{ title; description; actionLabel; actionHref }`; compone `Empty` de shadcn con los textos, se usa 3 veces) y `OrdersPanel` (props `{ orders: Order[]; timeframe: OrderTimeframe }`; estado `selectedCode`, por defecto `orders[0].code`; compone `OrderList` + `TicketCard key={selected.code}`). Son internos porque solo los usa `MyTickets`.
  - nuevo `modules/tickets/components/OrderList.tsx` (presentacional, Fase 1): props `{ orders: Order[]; selectedCode: string; onSelect: (code: string) => void }`. Requisito 6.
  - nuevo `modules/tickets/components/TicketCard.tsx` (`"use client"`, estado `ticketIndex`; Fase 1, acciones en Fase 2): props `{ order: Order; timeframe: OrderTimeframe }`. Requisito 7. Usa `formatLongDate`, `formatTime`, `formatEventDate` de `@/modules/events` y `getDateChipParts` de `../utils/myOrders`.
- Hook `modules/tickets/hooks/useMyOrders.ts` (`"use client"`, Fase 1):
  ```ts
  export function useMyOrders(): MyOrdersState;
  // useEffect al montar: Promise.all([useAuthStore.persist.rehydrate(), useOrdersStore.persist.rehydrate()])
  //   .then(() => setNow(new Date()))  (con guardia de desmontaje)
  // now === null            → { status: "loading" }
  // user === null           → { status: "signed-out" }
  // si no                   → { status: "ready", ...splitOrdersByDate(getUserOrders(orders, user.email), now) } (useMemo)
  ```
  `useAuthStore` desde `@/modules/auth/session` (contrato D) y `useOrdersStore` desde `@/modules/checkout/orders` (contrato E; se asume el estado `orders: Order[]`, ver Coordinación).
- Tipos `modules/tickets/types/tickets.types.ts` (Fase 1):
  ```ts
  import type { Order } from "@/modules/checkout/orders";
  export type OrderTimeframe = "upcoming" | "past";
  export type OrdersByTimeframe = Record<OrderTimeframe, Order[]>;
  export type MyOrdersState =
    | { status: "loading" }
    | { status: "signed-out" }
    | ({ status: "ready" } & OrdersByTimeframe);
  ```
- Utils `modules/tickets/utils/myOrders.ts` (Fase 1, puras, sin React):
  ```ts
  export function getUserOrders(storeOrders: readonly Order[], email: string): Order[]; // decisión 5
  export function splitOrdersByDate(orders: readonly Order[], now: Date): OrdersByTimeframe; // decisión 4, no muta la entrada
  export function formatTicketCount(count: number): string; // 1 → "1 entrada", 3 → "3 entradas"
  export function formatOrderZones(items: Order["items"]): string; // nombres únicos unidos por ", " → "General, VIP"
  export function getDateChipParts(iso: string): { month: string; day: string }; // America/Lima, "NOV" / "02"; mayúsculas sin punto
  ```
  `getDateChipParts` usa `Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "short" })` (mismo criterio que `formatEventDate`). Vive en `tickets` porque solo lo usa este dominio; sube a `events`/`lib` si otro lo necesita.
- Datos `modules/tickets/data/demoOrders.ts` (Fase 1): `export const DEMO_ACCOUNT_EMAIL = "demo@mentectickets.pe"` y `export const DEMO_ORDERS = [...] satisfies Order[]` (comentario: datos de demostración, no compras reales). Contenido (comprador Ana Quispe, `demo@mentectickets.pe`, celular `987654321`, DNI `45678912`; imágenes = URL completa de Unsplash del evento en `EVENTS_MOCK`, formato `https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=1600&q=80`):

  | code | createdAt | evento (slug) | startsAt | ítems | entradas (code · zona · asiento · titular) | total | pago |
  |---|---|---|---|---|---|---|---|
  | `MT-7Q4K2P` | 2026-09-20T18:42:00-05:00 | `noche-de-sintetizadores-lima` | el del catálogo (2026-11-14T21:00:00-05:00) | `general` "General" 180 × 2 | `-01` General · Ana Quispe; `-02` General · Carlos Quispe | 360 | `card` |
  | `MT-3HX9RB` | 2026-09-28T10:15:00-05:00 | `clasico-del-pacifico` | el del catálogo (2026-11-29T15:30:00-05:00) | `occidente` "Occidente" 220 × 1, `seats: [{ id: "occidente-F-12", label: "Tribuna Occidente · Fila F · Asiento 12" }]` | `-01` Occidente · Tribuna Occidente · Fila F · Asiento 12 · Ana Quispe | 220 | `yape` |
  | `MT-9LM2TC` | 2026-07-30T20:05:00-05:00 | `la-casa-de-los-espejos` | **2026-08-15T19:30:00-05:00** (función anterior, fija) | `platea-baja` "Platea baja" 180 × 2 | `-01` Platea baja · Ana Quispe; `-02` Platea baja · Lucía Mendoza | 360 | `pagoefectivo` |

  `title`, `category`, `venue`, `city`, `imageUrl` copiados del catálogo; `ownerEmail` = `DEMO_ACCOUNT_EMAIL`; `ticketCount` = nº de entradas.
- API pública: `modules/tickets/index.ts` exporta solo `MyTickets`. Fase 1 también añade a `modules/events/index.ts` la exportación de `formatLongDate` y `formatTime` (ya existen en `modules/events/utils/formatEvent.ts` con tests).
- Contrato de datos (no hay API HTTP; todo es cliente):
  - Entrada (contrato E, definido por la spec de checkout): `Order` / `OrderTicket` desde `@/modules/checkout/orders`; store `useOrdersStore` con persist `mentec-orders` y `skipHydration: true`.
  - Sesión (contrato D): `useAuthStore` desde `@/modules/auth/session`; `user: { id; firstName; lastName; email } | null`.
  - Calendario (contrato F, Fase 2): `buildIcsEvent({ title, startsAt, location, description? }): string` + helper de descarga de `lib/calendar.ts`.
  - Salida de este módulo: `MyOrdersState` (arriba). `/mis-entradas` no recibe parámetros.

## Reutilización
- shadcn: `Tabs`, `Skeleton` y `Empty` (nuevos), `Button`/`buttonVariants` (con `focusableWhenDisabled` de Base UI), `Badge`, `Sheet`/`SheetClose`.
- Proyecto: `TicketQr` y `lib/calendar.ts` (spec de checkout, contrato F); `useOrdersStore`/`Order` (contrato E); `useAuthStore` vía `session.ts` (contrato D); `formatEventDate`, `formatLongDate`, `formatTime`, `getEventBySlug` y tipo `EventCategory` de `@/modules/events`; patrón de rehidratación explícita de `AuthHeaderActions`; constantes `PRIMARY_BUTTON` de `AuthHeaderActions`; clases de estados de `CheckoutStatusMessage`/MASTER (botón primario `h-11 hover:bg-primary-strong`); `cn` de `@/lib/utils`; `next/image` con Unsplash ya permitido en `next.config.ts`.
- Iconos lucide: `Ticket`, `CalendarDays`, `Clock`, `MapPin`, `ChevronLeft`, `ChevronRight`, `Download`, `CalendarPlus`.
- Sin dependencias nuevas en `package.json`.

## Tests
- `modules/tickets/utils/myOrders.test.ts` (Fase 1):
  - `getUserOrders`: filtra por `ownerEmail` aceptando el correo de entrada con mayúsculas/espacios; excluye órdenes de otros correos; con el correo demo añade `DEMO_ORDERS`, con otro no; si el store tiene una orden con el mismo `code` que una demo, aparece una sola vez y es la del store; store vacío + correo no demo → `[]`.
  - `splitOrdersByDate` (con `now` fijo): futuras en `upcoming` ascendente; pasadas en `past` descendente; `startsAt === now` cuenta como próxima; empate de `startsAt` → `createdAt` descendente; no muta el array recibido.
  - `formatTicketCount`: 1 y 2. `formatOrderZones`: uno, dos y nombres repetidos.
  - `getDateChipParts`: `2026-11-14T21:00:00-05:00` → NOV/14; día de un dígito → "02"; ISO UTC que cambia de día (`2026-11-15T03:00:00Z` → NOV/14); enero → "ENE".
- `modules/tickets/data/demoOrders.test.ts` (Fase 1): con `now = 2026-10-03T12:00:00-05:00`, `splitOrdersByDate(DEMO_ORDERS)` da ≥ 2 próximas y ≥ 1 pasada; cada orden: `code` `^MT-[A-Z0-9]{6}$`, códigos de entrada `<code>-01…` correlativos, `tickets.length === ticketCount === Σ quantity`, `total === Σ unitPrice × quantity`, `ownerEmail === DEMO_ACCOUNT_EMAIL`; contra `getEventBySlug(slug)`: mismos `title`, `category`, `venue`, `city`, `imageUrl` (y `startsAt` en las próximas), y cada `ticketTypeId` existe con el mismo `name` y `price`; las entradas con asiento tienen `seatLabel` igual a la `label` del ítem.
- `modules/tickets/hooks/useMyOrders.test.ts` (Fase 1, `renderHook`; `vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-03T12:00:00-05:00") })` para no depender de la fecha real; stores sembrados con `setState` o localStorage con la forma persistida, y limpiados en `beforeEach`): el primer valor es `loading`; sin sesión → `signed-out`; con sesión no demo y órdenes propias y ajenas → `ready` solo con las propias, separadas; sesión demo → incluye los 3 pedidos demo (2 próximos, 1 pasado); `signOut()` tras `ready` → `signed-out`.
- `modules/tickets/components/TicketCard.test.tsx` (Fase 2; `vi.mock("@/lib/calendar")`, `vi.spyOn(window, "print")`): "Entrada 1 de 2" con "Entrada anterior" `aria-disabled`; "Entrada siguiente" avanza código y titular y queda `aria-disabled` en la última; "Asiento" solo con `seatLabel`; Estado "Válida"/"Usada" según `timeframe`; "Descargar PDF" llama a `window.print`; "Agregar al calendario" llama a `buildIcsEvent` con título, `startsAt`, "Lugar, Ciudad" y la descripción, y al helper de descarga con `<slug>.ics`; en `past` no hay botón de calendario.
- `modules/tickets/components/MyTickets.test.tsx` (Fase 2; mismo fake de `Date`): sin sesión → tras rehidratar "Inicia sesión para ver tus entradas" con enlace a `/login`; sesión demo → "Próximas (2)" y "Pasadas (1)", primer pedido `aria-current="true"`; clic en el segundo pedido mueve `aria-current` y cambia el h2 de la tarjeta; activar "Pasadas" muestra "Usada"; usuario sin órdenes → "Aún no tienes eventos próximos" con "Explorar eventos" → `/eventos`.
- `modules/auth/components/AuthHeaderActions.test.tsx` (Fase 2, actualizar; `vi.mock("next/navigation", () => ({ usePathname: … }))`): los 3 casos actuales siguen igual; con usuario, enlace "Mis entradas" → `/mis-entradas`; sin usuario no existe; con pathname `/mis-entradas` tiene `aria-current="page"`; variante `sheet` con usuario (renderizada dentro de `<Sheet defaultOpen><SheetContent>`) muestra "Mis entradas".
- Sin tests: `app/mis-entradas/page.tsx`, `OrderList` (presentacional; cubierto por `MyTickets.test`), tipos, `index.ts`, componentes de `components/ui/`, cambios `print:hidden` de header/footer.

## Plan de tareas
Coordinación:
- **Dependencias (bloqueantes):** se implementa después de la spec de checkout con pago simulado (`docs/specs/checkout-mock-payment.md` o el slug que tenga). Fase 1 requiere ya hechos: `modules/auth/session.ts` (D), `modules/checkout/orders.ts` + `useOrdersStore` (E) y `components/shared/TicketQr.tsx` (F). Fase 2 requiere `lib/calendar.ts` (F). Se asume que el estado de `useOrdersStore` expone `orders: Order[]` y que `lib/calendar.ts` exporta un helper de descarga (aquí llamado `downloadIcs(filename, ics)`); si la spec de checkout usa otros nombres, se usan los suyos sin crear nada nuevo.
- **Orden global:** seating → checkout → **tickets** → organizer → events-ui-refresh. Archivos compartidos que toca esta spec y que otras specs posteriores podrían tocar: `modules/events/index.ts`, `components/ui/tabs.tsx`/`skeleton.tsx`/`empty.tsx`, `components/shared/SiteHeader.tsx`, `components/shared/SiteFooter.tsx`, `modules/auth/components/AuthHeaderActions.tsx` (+ test). Organizer y events-ui-refresh parten de estos cambios.
- No se toca `modules/checkout/**`, `modules/seating/**`, `lib/**` ni `components/shared/TicketQr.tsx`.

### Fase 1 — Página Mis entradas (datos, pestañas, lista y entrada)
- [ ] T1 — Base compartida: instalar `tabs`, `skeleton` y `empty` de shadcn y exportar `formatLongDate`/`formatTime` en el barrel de events · archivos: `components/ui/tabs.tsx`, `components/ui/skeleton.tsx`, `components/ui/empty.tsx`, `modules/events/index.ts` · depende de: checkout (contratos D, E, F) · secuencial (base)
- [ ] T2 — Pedidos demo y utilidades puras con tests · archivos: `modules/tickets/data/demoOrders.ts`, `modules/tickets/data/demoOrders.test.ts`, `modules/tickets/utils/myOrders.ts`, `modules/tickets/utils/myOrders.test.ts` · depende de: T1 · secuencial
- [ ] T3 — Tipos y hook `useMyOrders` con test · archivos: `modules/tickets/types/tickets.types.ts`, `modules/tickets/hooks/useMyOrders.ts`, `modules/tickets/hooks/useMyOrders.test.ts` · depende de: T2 · secuencial
- [ ] T4 — UI, ruta y página de design system · archivos: `modules/tickets/components/MyTickets.tsx`, `modules/tickets/components/OrderList.tsx`, `modules/tickets/components/TicketCard.tsx`, `modules/tickets/index.ts`, `app/mis-entradas/page.tsx`, `design-system/ticketera/pages/my-tickets.md` (override del MASTER: fondo `bg-muted`, layout lista/tarjeta por breakpoint, talón con muescas, chip de fecha, estados vacíos, reglas de impresión, textos) · depende de: T1, T3 · secuencial

### Fase 2 — Acciones, impresión y enlace en el header
- [ ] T1 — Ocultar header y footer al imprimir · archivos: `components/shared/SiteHeader.tsx`, `components/shared/SiteFooter.tsx` · depende de: Fase 1 · secuencial (base, archivos compartidos)
- [ ] T2 — Enlace "Mis entradas" en `AuthHeaderActions` (bar y sheet, `aria-current`) con test actualizado · archivos: `modules/auth/components/AuthHeaderActions.tsx`, `modules/auth/components/AuthHeaderActions.test.tsx` · depende de: T1 · paralelo con T3
- [ ] T3 — "Descargar PDF", "Agregar al calendario", clases de impresión y tests de componentes · archivos: `modules/tickets/components/TicketCard.tsx`, `modules/tickets/components/TicketCard.test.tsx`, `modules/tickets/components/MyTickets.tsx`, `modules/tickets/components/MyTickets.test.tsx`, `design-system/ticketera/pages/my-tickets.md` (solo si cambia alguna regla de impresión) · depende de: T1 · paralelo con T2

## Preguntas abiertas
1. **Cuándo pasa a "Pasadas":** se usa `startsAt < ahora`, así que un evento que empezó hace una hora ya aparece en Pasadas con Estado "Usada" (aunque el usuario esté en la puerta). ¿Se prefiere mantenerlo en Próximas hasta el fin del día del evento (hora de Lima)?
2. **Estado "Usada":** sin datos de control de acceso, toda entrada pasada se muestra como "Usada". ¿Se prefiere otro texto (p. ej. "Evento finalizado")?
3. **Volver tras iniciar sesión:** desde el estado "sin sesión", el login redirige a `/` (spec de auth). ¿Se quiere `?next=/mis-entradas` (cambiaría `LoginForm`, fuera de esta spec)?
4. **Enlace desde la confirmación de compra:** ¿la página de confirmación del checkout debe abrir `/mis-entradas` con el pedido recién comprado preseleccionado (`?pedido=<code>`)? Hoy se selecciona el primer pedido por fecha.
5. **Contratos con checkout:** confirmar el nombre del campo de órdenes del store (`orders`) y el nombre/firma del helper de descarga `.ics` de `lib/calendar.ts`.
