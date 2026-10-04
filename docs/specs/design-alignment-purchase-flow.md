# Alineación con Claude Design: pantalla de compra propia, textos del checkout y búsqueda en /eventos

- Módulo: checkout · events (más `components/shared` y el route group `app/(purchase)`)
- Estado: aprobado

## Objetivo
Pedido del usuario: alinear con el diseño de Claude Design (artifact `NmeqG8Dta7F7zcSPmbQC8y`) las vistas **Búsqueda y listado**, **Checkout y pago** y **Confirmación de compra**. Tras el análisis de diferencias, el usuario eligió cuatro bloques:

1. **Pantalla de compra propia.** La compra deja de usar el header y el footer del sitio. Tiene una cabecera mínima con el logo, el stepper dentro de la cabecera y "Compra segura", y el fondo de la página en gris (`bg-muted`). En móvil, la cabecera lleva la flecha de vuelta a la izquierda de "Paso n de 3", y la confirmación muestra "Paso 3 de 3" con la barra llena.
2. **Detalles de texto** del checkout y de la confirmación (placeholders, método de pago, subtítulo, resumen móvil, "Qué sigue", "Total").
3. **Buscador móvil compacto** en `/eventos`: por debajo de `md`, un solo campo con lupa y "Buscar" en la misma fila.
4. **Fila única de resultados** en `/eventos` (escritorio): contador, chips y "Ordenar por" en la misma fila.

Lo demás que el análisis marcó como "decidido en spec" **no se toca**. Se mantiene la identidad Mentec: tokens de `app/globals.css`, Creato Display y el logo "Mentec Tickets". Nunca se usan el índigo, el naranja, Poppins, el negro de los pasos activos ni la marca "Ticketera" del diseño.

### Fuentes revisadas
- HTML del artifact: `Search.dc.html`, `SearchMobile.dc.html`, `Checkout.dc.html`, `CheckoutMobile.dc.html`, `Confirmation.dc.html`, `ConfirmationMobile.dc.html`. También `Tickets.dc.html`, `TicketsMobile.dc.html` y `Mobile.dc.html`, para el paso 1 y la landing. Las medidas y los textos se tomaron de los estilos en línea, y el render con datos, de `scratchpad/gapdesign/`.
- Capturas del diseño (`scratchpad/shots/gap-design-*.png`) y de la app (`gap-app-*.png`) a 1440 y 375/390 px.
- Specs vigentes: `layout-fullscreen-shells.md`, `checkout-mock-payment.md`, `events-ui-refresh.md`, `tickets-ticket-pager.md` y `seating-ticket-selection.md`. Páginas de diseño `pages/checkout.md`, `pages/events-list.md`, `pages/ticket-selection.md` y `MASTER.md`.

## Diferencias que cubre esta spec
| # | Vista | Diseño | App actual | Fase |
|---|---|---|---|---|
| D1 | Checkout y confirmación (todas) | Cabecera de compra: logo a la izquierda, stepper centrado, "Compra segura" a la derecha (76 px). Sin header ni footer del sitio. Página sobre gris `#F4F4F5` | Header sticky y footer del sitio, y el stepper en una franja aparte, sobre blanco | F1 |
| D2 | Paso 1 `/eventos/[slug]/entradas` | La misma cabecera de compra (`Tickets*.dc.html`), con "Volver al evento" en móvil | Header y footer del sitio, con el stepper en franja | F1 (Decisión 2) |
| D3 | Checkout móvil | Flecha "Volver a entradas" (44 px) a la izquierda de "Paso 2 de 3 / Datos y pago", candado a la derecha, barra al 66 %. Sin logo | Header del sitio y, debajo, "Paso 2 de 3" sin flecha | F1 |
| D4 | Confirmación móvil | Logo a la izquierda, "Paso 3 de 3" a la derecha y barra llena. Sin candado | Header del sitio y, debajo, "Paso 3 de 3 / Confirmación" con candado | F1 |
| D5 | Confirmación escritorio | Stepper con los pasos 1 y 2 completados y el 3 actual. Sin "Compra segura" | Franja con "Compra segura" | F1 |
| D6 | Datos del comprador | Placeholders "Como figura en tu documento", "tu@email.com", "Número" y "Número de celular" | Sin placeholders | F1 |
| D7 | Método de pago (móvil) | "Tarjeta de crédito o débito" | "Tarjeta" | F1 (solo por debajo de `sm`; Decisión 6) |
| D8 | Subtítulo del comprador (móvil) | "Enviaremos tus entradas a este correo." | "Enviaremos tus entradas al correo que indiques. Los campos con * son obligatorios." | F1 (se conserva la frase de los `*`; Decisión 7) |
| D9 | Resumen móvil desplegado | No repite la miniatura ni el título (ya están en el botón) | Los repite | F1 |
| D10 | "Qué sigue" (móvil) | h2 "Qué sigue" visible y textos cortos | h2 `sr-only` y los textos largos | F1 (solo por debajo de `md`) |
| D11 | Tarjeta-entrada (móvil) | "Total" | "Total pagado" | F1 (solo por debajo de `md`) |
| D12 | Buscador `/eventos` y landing (móvil) | Una fila de 56 px: lupa, "Artista, evento o ciudad" y "Buscar" | Tres segmentos apilados y el botón a todo el ancho | F2 |
| D13 | Resultados `/eventos` (escritorio) | "1 evento", chips y "Ordenar por" en una sola fila | "Ordenar por" en una fila propia, encima del contador y los chips | F2 |

## Alcance
- Incluye:
  - **Fase 1. Pantalla de compra y textos del checkout:**
    - route group `app/(purchase)` con los pasos 1, 2 y 3, sin `SiteShell`;
    - `components/shared/PurchaseShell.tsx`: cabecera de compra con el stepper dentro y `<main>`. Sustituye a `PurchaseStepper.tsx`, que se elimina;
    - fondo `bg-muted` y los ajustes de superficie que exige (muescas, chip del pedido y casilla de Términos);
    - estados de error y de carga con la cabecera solo con el logo;
    - textos D6–D11;
    - `pages/checkout.md` y `pages/ticket-selection.md`.
  - **Fase 2. `/eventos`:**
    - buscador compacto por debajo de `md` (también en la landing: es el mismo componente);
    - fila única de contador, chips y orden en `lg`;
    - `pages/events-list.md` y la fila "Buscador" de MASTER §7.
- No incluye:
  - Cambios en `SiteHeader`, `SiteFooter`, `/login`, `/registro`, el panel de organizador, el detalle del evento o `/mis-entradas`.
  - Cambios de la confirmación de escritorio aparte de D5 y las superficies: cabecera, tarjeta-entrada, talón y paginador (`tickets-ticket-pager`), acciones, PDF y `.ics`.
  - Lo marcado como "decidido en spec" en el análisis. Por ejemplo:
    - Nombres/Apellidos en lugar de "Nombre completo";
    - el correo del comprador en el texto de la confirmación;
    - la nota de demo y los `*`;
    - el orden de los campos;
    - `h-11` y `rounded-lg` en los campos;
    - el botón "Pagar" en la tarjeta del resumen;
    - la anatomía de `EventCard`;
    - el fondo blanco de `/eventos`;
    - el panel de filtros móvil (`Sheet`);
    - las pills de categoría;
    - los textos de las opciones de fecha y precio.
  - Fusionar en una sola tarjeta el botón y el contenido del resumen móvil del checkout: solo se quitan la miniatura y el título repetidos.
  - Otro destino o etiqueta de "Volver al evento" en `EventPurchaseStrip`, y cambios en los componentes de `modules/seating`.
  - Tema oscuro y animaciones nuevas.

## Decisiones tomadas
1. **Route group `app/(purchase)` sin `layout.tsx`.**
   - La cabecera depende del paso, que solo conoce cada página. En `/checkout/confirmacion` lo decide además el cliente: solo hay stepper si se encuentra la orden. Un layout de grupo no recibe esos datos, así que cada página compone `PurchaseShell`, igual que `app/not-found.tsx` compone `SiteShell`.
   - `(purchase)` no tiene `layout.tsx`: solo hereda el root layout (`body flex min-h-dvh flex-col`).
   - Las URL no cambian.
2. **El paso 1 (`/eventos/[slug]/entradas`) también usa la pantalla de compra.**
   - Así lo muestra el diseño (`Tickets.dc.html`, `TicketsMobile.dc.html`: cabecera de compra, fondo gris y "Volver al evento" en móvil).
   - Además evita mantener dos variantes del stepper (en franja y en cabecera): `PurchaseStepper` desaparece (DRY, KISS).
   - Sus superficies ya son `Card` (`bg-card`) y sus barras móviles son `bg-background`, así que no se toca ningún componente de `modules/seating`.
   - Su `notFound()` sigue mostrando "No encontramos este evento" con el header y el footer del sitio (Requisito 7): quien llega a un evento inexistente no está comprando.
3. **Una sola cabecera para todos los anchos (un único DOM) y el cambio de variante en `lg`, no en `md`.**
   - En una fila, el logo (~136 px), los tres pasos (~480 px) y "Compra segura" (~130 px) suman ~750 px. A 768 px solo hay 720 px útiles.
   - Por debajo de `lg` (también a 768 px) se usa la cabecera móvil del diseño.
4. **Cabecera sticky** (`sticky top-0 z-40`), como el header del sitio al que sustituye.
   - Mide 77 px en `lg` (fila `h-19` de 76 px, como el diseño, + 1 px del `border-b` del Requisito 6) y 65 px por debajo (60 px de fila + 4 px de barra + 1 px de borde).
   - Los `lg:sticky lg:top-24` del resumen del checkout y de "Tu compra" del paso 1 siguen siendo válidos: quedan 19 px por debajo de la cabecera. No se tocan.
5. **Colores del stepper:** se conserva el de hoy (paso actual y completados en `bg-primary`, pendientes con borde `border-input`), no el negro del diseño (identidad Mentec, MASTER §2).
6. **"Tarjeta de crédito o débito" solo por debajo de `sm`.** Así lo hace el diseño: en escritorio dice "Tarjeta" y en móvil, la etiqueta larga.
   - Por debajo de `sm` los métodos van apilados a todo el ancho y la etiqueta larga cabe.
   - Desde `sm` van en tres columnas: en `lg` (1024 px) cada tarjeta mide ~150 px y la etiqueta larga ocuparía tres líneas.
   - Se implementa en `PaymentMethodFields` con un sufijo `<span className="sm:hidden"> de crédito o débito</span>`. `PAYMENT_METHOD_LABELS` y su test **no cambian**.
7. **Subtítulo del comprador:** por debajo de `sm`, "Enviaremos tus entradas a este correo."; desde `sm`, "Enviaremos tus entradas al correo que indiques.".
   - En todos los anchos sigue " Los campos con * son obligatorios.". La app marca los obligatorios con `*` (decisión de `checkout-mock-payment`) y la leyenda es necesaria; el diseño no tiene `*`.
8. **Textos por ancho con `display: none`.** "Qué sigue", "Total" y el método de pago muestran un texto distinto según el ancho, con `<span>` que se ocultan por breakpoint.
   - Como en `TicketCard` y en el botón "Agregar al calendario", el texto oculto sale del árbol de accesibilidad y nada se anuncia dos veces.
   - Cuando el texto corto es prefijo del largo, se oculta solo el sufijo ("Total" + `<span className="max-md:hidden"> pagado</span>`). Así, en jsdom el texto completo sigue siendo "Total pagado".
9. **Breakpoint de cada texto.** Cada texto cambia en el mismo breakpoint en que cambia el layout de su componente:
   - `sm` en el formulario (la grilla pasa a 2 o 3 columnas);
   - `lg` en el resumen (deja de ser plegable);
   - `md` en la confirmación (la tarjeta pasa a horizontal y "Qué sigue", a 3 columnas).
10. **Superficies sobre `bg-muted`.** Lo que hoy pinta "el color del fondo" pasa a `bg-muted`. Lo que debe verse blanco lleva `bg-card` o `bg-background`:
    - las muescas del talón de `ConfirmationTicketCard` pasan a `bg-muted`;
    - el chip "Pedido N.º" añade `bg-card`;
    - la casilla de Términos añade `bg-background` (sin marcar es blanca, como en el diseño; marcada, `data-checked:bg-primary` sigue ganando por especificidad).
11. **Buscador compacto en la landing también.** `EventSearchBar` es único y no tiene `variant` (`events-ui-refresh` decisión 12). La landing móvil del diseño (`Mobile.dc.html`) usa la misma barra compacta, así que el cambio se aplica a los dos sitios sin añadir props.
    - En la landing móvil no se filtra por fecha ni por precio desde el buscador. Se hace en `/eventos`, en el panel de filtros.
12. **Fecha y Precio siguen en el DOM por debajo de `md`, ocultos con `max-md:hidden`.**
    - Un control con `display: none` se envía igual en un GET, así que buscar desde el móvil **conserva** `mes` y `precio` de la URL (sus `defaultValue`), como los demás filtros ocultos.
    - En móvil, Fecha y Precio se cambian en el panel de filtros (`EventFiltersSheet`), como hoy.
13. **"Ordenar por" se renderiza dos veces, una por ancho.** Una vez va en la fila móvil "Filtros + Orden" (`lg:hidden`) y otra al final de la fila del contador (`hidden lg:flex`).
    - Es el patrón del botón "Pagar" del checkout: `display: none` deja solo uno visible y accesible en cada ancho.
    - Para no repetir el id de la etiqueta, el grupo pasa a nombrarse con `aria-label="Ordenar por"`, y el texto visible es `aria-hidden`.
    - El orden del DOM en `lg` coincide con el visual: contador, chips y orden.
14. **Los contenedores de los tres pasos llevan `w-full`** (corrección tras la revisión de F1–F2, Fase 3).
    - El `<main>` de `PurchaseShell` sigue siendo `flex flex-1 flex-col`: lo necesita el `flex-1` que estira la página hasta abajo (barra móvil "Continuar", fondo gris hasta el final).
    - Dentro de un flex en columna, un hijo `mx-auto max-w-7xl` sin `w-full` toma el ancho de su contenido: a 1440 px el paso 1 medía 1211 px y saltaba a 1176 px al elegir una zona, desalineado del logo.
    - Por eso cada contenedor de página lleva `w-full`: `app/(purchase)/checkout/page.tsx` (ya lo tiene), `app/(purchase)/eventos/[slug]/entradas/page.tsx` y `CONTAINER_CLASS` de `OrderConfirmation`.

### Desviaciones aceptadas en la revisión de F1–F2
- **`w-full` en el contenedor de `/checkout`** (`app/(purchase)/checkout/page.tsx`): queda formalizado por la Decisión 14 y se extiende a los otros dos pasos en la Fase 3.
- **`<span>` envolvente en `PaymentMethodFields`:** la etiqueta y el sufijo móvil van dentro de un único `<span>` en `FieldTitle`, porque `FieldTitle` es flex con `gap` y separaría el sufijo de "Tarjeta" (Requisito 11).

### Lo que esta spec cambia de otras specs (no se editan)
Al implementar y revisar, prevalece esta spec en estos puntos:
- **`layout-fullscreen-shells.md` F1:**
  - `/checkout`, `/checkout/confirmacion` y `/eventos/[slug]/entradas` salen de `app/(site)` y pasan a `app/(purchase)` (tabla de movimientos del Requisito de rutas).
  - El criterio "se ven igual que antes, con el header sticky arriba, el footer abajo y un único `<main>`" ya no aplica a esas tres rutas. Se sigue cumpliendo "un único `<main>`".
- **`checkout-mock-payment.md` (F3–F6) y `pages/checkout.md`:**
  - "Header sticky (igual que la landing)", la franja del stepper y el footer se sustituyen por `PurchaseShell`.
  - Desaparece la prop `stepper` de `OrderConfirmation`.
  - El h2 "Qué sigue" es visible por debajo de `md`.
  - Cambian los textos D6–D11 y las superficies de la Decisión 10.
  - La página de diseño se actualiza en F1 T5.
- **`seating-ticket-selection.md` / `seating-stadium-map.md` y `pages/ticket-selection.md`:** "Header sticky", la franja del stepper y el footer se sustituyen por `PurchaseShell` sobre `bg-muted`. La barra móvil ya no "llega al footer": llega al final de la página.
- **`events-ui-refresh.md` F4 y `pages/events-list.md`:**
  - **Requisito del buscador `< md`** ("segmentos apilados… botón `mt-2 w-full` debajo"): se sustituye por el Requisito 13 de esta spec.
  - **Criterio "Dado 375 px (en `/eventos` y en la landing), entonces los tres segmentos se apilan…"**: se sustituye por el criterio del buscador compacto de la F2.
  - **Fila "Filtros + Orden"** ("en `lg` solo queda el orden, alineado a la derecha"): se sustituye por el Requisito 14.
- **`tickets-ticket-pager.md`:** sin cambios. El talón y el paginador no se tocan.

## Requisitos

### Comunes
1. Solo tokens del tema, Creato Display e iconos `lucide-react` con `aria-hidden`. Ni hex ni colores por defecto de Tailwind.
2. Targets de 44 px o más y foco visible en todo lo interactivo. Un único `<h1>`, un único `<main>` y un único `banner` por página.
3. Sin scroll horizontal a 375, 768, 1024 y 1440 px. Transiciones de 150–300 ms que respetan `motion-reduce`.
4. Fuera de cada módulo solo se importa desde sus entradas públicas.
5. `PurchaseShell` no importa nada de `modules/`: lo importa `OrderConfirmation` (cliente), y el bundle de `/checkout` no debe arrastrar `seating` ni `events` (`checkout-mock-payment` Fase 8).

### Fase 1: pantalla de compra y textos del checkout
6. **`components/shared/PurchaseShell.tsx`** (sin `"use client"`; presentacional, sin estado):
   ```ts
   type PurchaseStep = 1 | 2 | 3;
   type PurchaseShellProps = {
     /** Paso actual. Sin él (estados de error y de carga), la cabecera solo muestra el logo. */
     currentStep?: PurchaseStep;
     /** Flecha de vuelta de la cabecera móvil (< lg). Pasos 1 y 2. */
     back?: { href: string; label: string };
     children: ReactNode;
   };
   ```
   - **Raíz:** `<div className="flex flex-1 flex-col bg-muted">` con `<header>` y `<main className="flex flex-1 flex-col">{children}</main>`. Como el `<main>` es flex en columna, el contenedor de cada página (`mx-auto … max-w-*`) lleva `w-full` (Decisión 14).
   - **`<header>`:** `sticky top-0 z-40 border-b bg-background print:hidden`. Dentro, un contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8` con una fila:
     - por debajo de `lg`: `flex h-15 items-center gap-1`;
     - en `lg`: `lg:grid lg:h-19 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6` (el stepper queda centrado).
   - **Elementos de la fila, en este orden del DOM:**
     1. **Flecha de vuelta** (solo con `back`): `Link` `lg:hidden` `size-11` (44 px) `rounded-xl` centrado, con `ArrowLeft` `size-5`, `aria-label={back.label}`, hover `bg-accent` y foco visible. Está ligeramente desplazada a la izquierda (`-ml-2`) para alinear el icono con el contenido, como en el diseño.
     2. **Logo:** `Link href="/"` con `BrandLogo` (`preload`, `h-7 w-auto lg:h-8`), cuyo nombre accesible es "Mentec Tickets". Con `back` lleva `max-lg:hidden`: en móvil, la flecha ocupa su lugar. En `lg` va en `justify-self-start`.
     3. **Paso en móvil** (con `currentStep`): bloque `aria-hidden` `lg:hidden`.
        - Pasos 1 y 2: `flex min-w-0 flex-1 flex-col` con "Paso n de 3" (`text-xs text-muted-foreground`) y el título del paso (`text-base font-bold`): "Elige tus entradas" o "Datos y pago".
        - Paso 3: `ml-auto` con solo "Paso 3 de 3" (`text-xs text-muted-foreground`).
     4. **Stepper** (con `currentStep`): el `<ol aria-label="Pasos de la compra">` de hoy, con los mismos pasos, círculos, conectores, `aria-current="step"` y "(completado)" `sr-only`. Pasa de `sr-only md:not-sr-only md:flex` a `sr-only lg:not-sr-only lg:flex`.
     5. **"Compra segura"** (solo con `currentStep` 1 o 2): `<p className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-self-end">` con `Lock` (`size-5 lg:size-4`, `aria-hidden`) y `<span className="max-lg:sr-only">Compra segura</span>`. En móvil se ve el candado y el lector anuncia "Compra segura".
   - **Barra de progreso** (con `currentStep`), fuera del contenedor y a todo el ancho: `<div aria-hidden className="h-1 bg-secondary lg:hidden">` con el relleno `h-full bg-primary` al `w-1/3`, `w-2/3` o `w-full`.
   - Sin `currentStep`, la fila solo tiene el logo. No hay barra, ni stepper, ni "Compra segura".
7. **Rutas.** Se mueven con `git mv` sin cambiar las URL:
   | Antes | Después |
   |---|---|
   | `app/(site)/checkout/page.tsx` | `app/(purchase)/checkout/page.tsx` |
   | `app/(site)/checkout/confirmacion/page.tsx` | `app/(purchase)/checkout/confirmacion/page.tsx` |
   | `app/(site)/eventos/[slug]/entradas/page.tsx` | `app/(purchase)/eventos/[slug]/entradas/page.tsx` |
   - **`/checkout`:**
     - Con un estado distinto de `ok`: `<PurchaseShell><CheckoutStatusMessage …/></PurchaseShell>`.
     - Con `ok`: `<PurchaseShell currentStep={2} back={{ href: changeHref, label: "Volver a entradas" }}>`, con el contenedor de hoy más `w-full` (h1 `sr-only` + `CheckoutForm`). La flecha usa el mismo `href` que "Cambiar entradas".
   - **`/checkout/confirmacion`:** con un código inválido, `<PurchaseShell><CheckoutStatusMessage variant="order-not-found" /></PurchaseShell>`; si no, `<OrderConfirmation code={code} />`.
   - **`/eventos/[slug]/entradas`:** `<PurchaseShell currentStep={1} back={{ href: \`/eventos/${event.slug}\`, label: "Volver al evento" }}>` con el contenedor de hoy más `w-full` (Decisión 14; se añade en la Fase 3). El comentario sobre el padding inferior dice "llega al final de la página" en lugar de "al footer". `generateStaticParams`, `generateMetadata` y `notFound()` no cambian.
   - **`app/(purchase)/eventos/[slug]/not-found.tsx`** (nuevo): `<SiteShell><NotFoundMessage title="No encontramos este evento" description="Puede que el enlace sea incorrecto o que el evento ya no esté disponible." /></SiteShell>`. Usa los mismos textos que `app/(site)/eventos/[slug]/not-found.tsx`, que no cambia.
   - Se elimina `components/shared/PurchaseStepper.tsx` cuando ya no lo importa nadie.
8. **`OrderConfirmation`:**
   - Pierde la prop `stepper`: queda `{ code: string }`.
   - Cada estado se envuelve en `PurchaseShell`:
     - cargando y no encontrada: `<PurchaseShell>` (solo el logo);
     - confirmada: `<PurchaseShell currentStep={3}>` (sin `back`).
   - Desaparece el `<div className="w-full print:hidden">{stepper}</div>`: la cabecera ya es `print:hidden`.
   - `CONTAINER_CLASS` añade `w-full` (Decisión 14; se añade en la Fase 3).
   - **Chip "Pedido N.º":** añade `bg-card`.
   - **"Qué sigue":**
     - el h2 pasa de `sr-only` a `text-lg font-bold md:sr-only`;
     - `NEXT_STEPS` añade `shortDescription`;
     - la descripción se renderiza como `<span className="md:hidden">{shortDescription}</span><span className="max-md:hidden">{description}</span>` dentro del `<span>` de texto actual.
     - Textos cortos: "Ahí llegan tus entradas y el comprobante.", "Cada entrada tiene su QR. Muéstralo en el ingreso." e "Ingresa con tu cuenta para verlas cuando quieras.". Los largos no cambian.
9. **`ConfirmationTicketCard`:**
   - `NOTCH_CLASS` pasa de `bg-background` a `bg-muted`.
   - El `<dt>` del total pasa a `Total<span className="max-md:hidden"> pagado</span>`.
   - Nada más cambia: el talón, el QR, el paginador y los asientos siguen igual.
10. **`CheckoutForm`:**
    - **Placeholders:**
      - Nombres y Apellidos: "Como figura en tu documento";
      - Correo electrónico: "tu@email.com";
      - Celular: "Número de celular";
      - Número de documento: "Número".
    - **Subtítulo** (Decisión 7): `<span className="sm:hidden">Enviaremos tus entradas a este correo.</span><span className="max-sm:hidden">Enviaremos tus entradas al correo que indiques.</span> Los campos con * son obligatorios.`
    - **Casilla de Términos:** añade `className="bg-background"` (Decisión 10).
    - Nada más cambia: la validación, el orden, los ids, el `PayButton` y la barra móvil siguen igual.
11. **`PaymentMethodFields`:** junto a la etiqueta de cada método, un sufijo móvil opcional.
    - `const MOBILE_LABEL_SUFFIX: Partial<Record<PaymentMethod, string>> = { card: " de crédito o débito" }`, renderizado dentro de `FieldTitle` como `<span>{label}<span className="sm:hidden">{suffix}</span></span>`. El `<span>` envolvente es necesario: `FieldTitle` es flex con `gap` y, sin él, separaría el sufijo de la etiqueta (desviación aceptada en la revisión).
    - El nombre accesible del radio es "Tarjeta de crédito o débito" por debajo de `sm` y "Tarjeta" desde `sm`.
12. **`OrderSummary`:**
    - En la cabecera de la tarjeta, la miniatura y el título llevan `max-lg:hidden`. Por debajo de `lg` solo queda la línea "sáb 14 nov · Lugar, Ciudad", porque la miniatura y el título ya están en el botón plegable.
    - En `lg` no cambia nada.
    - `CheckoutSummaryPanel` no cambia.

### Fase 2: `/eventos`
13. **`EventSearchBar` compacto por debajo de `md`** (Decisiones 11 y 12). En `md+` no cambia nada: ni medidas, ni clases, ni orden.
    - **Píldora (`< md`):** una fila `flex items-center gap-2` de **56 px** de alto (`p-1.5` y controles de 44 px). Desde `md`, la grilla de hoy con `md:p-2`.
    - **Segmento "Qué quieres ver":**
      - va en `min-w-0 flex-1`;
      - lleva una lupa `Search` (`size-5 text-muted-foreground`, `aria-hidden`, `pointer-events-none`), absoluta a la izquierda y centrada en vertical, con `md:hidden`;
      - el `<label>` sigue en el DOM con `max-md:sr-only`: el nombre accesible es "Qué quieres ver" en todos los anchos;
      - el `Input` mide `h-11` con `pl-10` y sin el hueco superior de la etiqueta por debajo de `md`, y `md:h-14 md:pt-5 md:pl-4` como hoy;
      - el placeholder "Artista, evento o ciudad" no cambia.
    - **Segmentos "Fecha" y "Precio":** `max-md:hidden`. Siguen en el formulario y se envían (Decisión 12).
    - **Botón "Buscar":** `h-11 w-auto shrink-0 px-4` por debajo de `md` (solo el texto: el icono lleva `max-md:hidden`), y `md:h-12 md:px-6` con el icono como hoy.
    - **Orden de tabulación en `< md`:** "Qué quieres ver" y "Buscar".
14. **Fila única de resultados en `lg`** (Decisión 13):
    - **Página `app/(site)/eventos/page.tsx`:**
      - la fila móvil "Filtros + Orden" pasa a `flex flex-wrap items-center justify-between gap-2 lg:hidden` (sin `lg:justify-end`), y su `EventsSort` va sin clase de ancho;
      - se pasa `sort={<EventsSort className="hidden shrink-0 lg:flex" filters={filters} />}` a `EventsResults`.
    - **`EventsResults`:**
      - prop nueva `sort?: ReactNode`;
      - la fila del contador pasa a `<div className="flex items-start justify-between gap-4">`, con un bloque izquierdo `flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 lg:min-h-13` (contador + chips) y, a la derecha, `{sort}`;
      - `lg:min-h-13` (52 px) iguala la altura del grupo de orden (`p-1` + enlaces de 44 px), así que la primera línea de chips queda centrada con él;
      - si los chips ocupan varias líneas, el orden se queda arriba a la derecha.
    - **`EventsSort`:** el grupo pasa a `role="group" aria-label="Ordenar por"`. El `<span>` visible "Ordenar por" (`sr-only sm:not-sr-only`) añade `aria-hidden` y pierde el `id`, y se elimina `LABEL_ID`. Los enlaces, el orden y los estilos no cambian.

### Páginas de diseño
15. **F1:**
    - **`pages/checkout.md`:**
      - diagramas de los pasos 2 y 3 con la cabecera de compra en lugar del header, la franja y el footer;
      - fondo `bg-muted`;
      - flecha "Volver a entradas" y "Paso 3 de 3" en móvil;
      - placeholders, "Tarjeta de crédito o débito" en móvil y subtítulo;
      - resumen móvil sin la miniatura ni el título;
      - "Qué sigue" visible en móvil, con los textos cortos;
      - "Total" en móvil;
      - superficies de la Decisión 10;
      - impresión: se oculta la cabecera de compra.
    - **`pages/ticket-selection.md`:** el diagrama y el texto del stepper con la cabecera de compra, la flecha "Volver al evento" en móvil y `bg-muted`.
16. **F2:**
    - **`pages/events-list.md`:**
      - diagrama de escritorio con la fila única;
      - diagrama móvil con el buscador compacto;
      - fila `< md` de la tabla del buscador;
      - filas "Orden" y "Contador + chips" de la tabla de componentes;
      - orden de tabulación del buscador en móvil.
    - **MASTER §7, fila "Buscador":** se añade "en móvil (`< md`), solo el campo de texto con lupa y 'Buscar' en una fila de 56 px; Fecha y Precio, en el panel de filtros de `/eventos`".

## Criterios de aceptación
Se verifican con Playwright (`npm run build && npm start`) a 375, 768 y 1440 px, más 1024 donde se indica. URL de ejemplo:
- paso 2: `/checkout?evento=festival-vive-latino-lima&campo-vip=2`;
- paso 1: `/eventos/noche-de-sintetizadores-lima/entradas`;
- paso 3: la confirmación tras pagar con `4242 4242 4242 4242`.

### Fase 1: pantalla de compra y textos del checkout
- [ ] **Paso 2 a 1440 px.**
  - **Sin el sitio:** no existen la navegación "Categorías" ni el `contentinfo`.
  - **Cabecera:** el único `banner` mide 76 px + 1 px de borde = 77 px de alto y es blanco, con borde inferior. Tiene el logo "Mentec Tickets" a la izquierda (enlace a `/`); en el centro, el stepper "Entradas" (completado, con check) — "Datos y pago" (actual, `aria-current="step"`) — "Confirmación"; y "Compra segura" con candado a la derecha. No se ve ninguna flecha.
  - **Fondo y tarjetas:** el fondo de la página es el gris `--muted`, y las tarjetas "Datos del comprador", "Método de pago" y el resumen son blancas.
  - **Sticky:** al desplazarse, la cabecera sigue arriba y el resumen sigue visible debajo de ella, sin quedar tapado.
- [ ] **Paso 2 a 768 px y 375 px.**
  - **Cabecera:** mide 65 px de alto (60 px de fila + 4 px de barra + 1 px de borde). A la izquierda, una flecha de 44 × 44 px llamada "Volver a entradas"; a su derecha, "Paso 2 de 3" sobre "Datos y pago"; a la derecha del todo, el candado. Debajo, la barra al 66 %. No se ve el logo ni el stepper horizontal.
  - **Flecha:** al pulsarla, se navega al mismo `href` que "Cambiar entradas".
  - Sin scroll horizontal.
- [ ] **Teclado en el paso 2.** A 375 px, el primer Tab enfoca "Volver a entradas" (foco visible). A 1440 px, enfoca el logo. Después, el orden de tabulación del formulario es el de hoy.
- [ ] **Paso 3 a 1440 px.**
  - **Cabecera:** el logo a la izquierda y el stepper con "Entradas" y "Datos y pago" completados y "Confirmación" actual. Sin "Compra segura" y sin el header ni el footer del sitio.
  - **Fondo y superficies:** fondo gris; la tarjeta-entrada es blanca y sus dos muescas son del gris del fondo; el chip "Pedido N.º" es blanco.
  - **Textos:** el h2 "Qué sigue" no se ve, las tres tarjetas muestran los textos largos y la tarjeta-entrada dice "Total pagado".
- [ ] **Paso 3 a 768 px.** La cabecera es la móvil (logo a la izquierda, "Paso 3 de 3" a la derecha, barra llena). La tarjeta-entrada es horizontal, con "Total pagado", los textos largos y "Qué sigue" sin verse.
- [ ] **Paso 3 a 375 px.**
  - **Cabecera:** el logo a la izquierda, "Paso 3 de 3" a la derecha y la barra al 100 %. Sin flecha ni candado.
  - **"Qué sigue":** el h2 "Qué sigue" se ve encima de las tres tarjetas, con "Ahí llegan tus entradas y el comprobante.", "Cada entrada tiene su QR. Muéstralo en el ingreso." e "Ingresa con tu cuenta para verlas cuando quieras.".
  - **Tarjeta-entrada:** dice "Total" (no "Total pagado").
  - En el árbol de accesibilidad, cada texto aparece una sola vez.
- [ ] **Impresión.** Con `emulateMedia({ media: "print" })` en la confirmación, la cabecera de compra no se ve. Sí se ven la cabecera de confirmación y la tarjeta-entrada.
- [ ] **Estados de error.**
  - `/checkout?evento=no-existe&general=1` muestra "No encontramos este evento", y `/checkout/confirmacion` (sin `orden`) muestra "No encontramos tu compra".
  - En ambos, sobre fondo gris, con una cabecera que solo tiene el logo: sin stepper, ni "Compra segura", ni barra, ni flecha, y sin el header ni el footer del sitio.
  - Mientras carga la confirmación, la cabecera también tiene solo el logo.
- [ ] **Paso 1 a 1440 px.** `/eventos/noche-de-sintetizadores-lima/entradas` tiene la cabecera de compra con "Entradas" como paso actual y "Compra segura", fondo gris y ningún header ni footer del sitio. "Tu compra" sigue sticky bajo la cabecera.
- [ ] **Paso 1 a 375 px.**
  - La cabecera muestra la flecha "Volver al evento" (lleva a `/eventos/noche-de-sintetizadores-lima`), "Paso 1 de 3" sobre "Elige tus entradas", el candado y la barra al 33 %.
  - La barra inferior "Continuar" sigue pegada abajo.
  - Sin scroll horizontal.
- [ ] **404 del paso 1.** `/eventos/no-existe/entradas` muestra "No encontramos este evento" con el header y el footer del sitio.
- [ ] **Placeholders.** En `/checkout`:
  - Nombres y Apellidos muestran "Como figura en tu documento";
  - Correo electrónico, "tu@email.com";
  - Celular (a la derecha de "+51"), "Número de celular";
  - el número de documento, "Número".
  - A 375 px caben sin cortarse.
- [ ] **Método de pago.**
  - A 375 px, el primer método dice "Tarjeta de crédito o débito" en una línea y su radio se llama así.
  - A 768 y 1440 px dice "Tarjeta" y los tres métodos siguen en una fila.
- [ ] **Subtítulo del comprador.**
  - A 375 px: "Enviaremos tus entradas a este correo. Los campos con * son obligatorios.".
  - A 768 y 1440 px: "Enviaremos tus entradas al correo que indiques. Los campos con * son obligatorios.".
- [ ] **Resumen móvil.**
  - A 375 px, al desplegar el resumen, el contenido no repite la miniatura ni el título. Empieza por "lun 5 oct · Costa Verde, Lima" y muestra las líneas de entradas, "Cambiar entradas" y el total.
  - A 1440 px, el resumen sigue con la miniatura y el título.
- [ ] **Casilla de Términos.** Sin marcar, la casilla se ve blanca sobre el fondo gris. Marcada, se ve azul con el check.
- [ ] **Rutas.** `npm run build` termina sin errores y la lista de rutas tiene las mismas URL que antes: `/checkout`, `/checkout/confirmacion` y `/eventos/[slug]/entradas`, con sus parámetros estáticos.
- [ ] **Código.**
  - `components/shared/PurchaseStepper.tsx` ya no existe y nadie lo importa.
  - `.next/server/app/(purchase)/checkout/page_client-reference-manifest.js` no referencia `modules/seating` ni `modules/events` (Fase 8 de `checkout-mock-payment`). Se comprueba con `grep -oE '(modules|components)/[A-Za-z0-9_/.-]+\.tsx?' <manifiesto> | sort -u`.
  - `npx vitest run components/shared modules/checkout` y `npm run lint` pasan.
  - `pages/checkout.md` y `pages/ticket-selection.md` describen la pantalla de compra.

### Fase 2: `/eventos`
- [ ] **Buscador a 375 px.** En `/eventos` y en `/`, el buscador es **una fila** de 56 px de alto con:
  - la lupa a la izquierda;
  - el campo con el placeholder "Artista, evento o ciudad";
  - el botón "Buscar" (solo texto, 44 px de alto) a la derecha, dentro de la píldora.
  - No se ven "Fecha" ni "Precio" ni la etiqueta "Qué quieres ver", pero el campo se llama "Qué quieres ver" en el árbol de accesibilidad. Sin scroll horizontal.
- [ ] **Buscar conserva los filtros.** Dado `/eventos?mes=2026-11&precio=100-200` a 375 px, cuando se escribe "lima" y se pulsa "Buscar", entonces la URL contiene `q=lima`, `mes=2026-11` y `precio=100-200`, y los chips del mes y del precio siguen visibles.
- [ ] **Buscador a 768 y 1440 px.** Es la píldora de hoy, sin cambios: "Qué quieres ver", "Fecha", "Precio" y "Buscar" con icono, en una fila, y sin lupa dentro del campo.
- [ ] **Fila de resultados a 1440 px.** Dado `/eventos?categoria=conciertos&ciudad=Lima&precio=100-200` (el valor de `ciudad` distingue mayúsculas: `lima` no genera chip), entonces en la parte superior de la columna de resultados hay **una sola fila**: "1 evento", los chips "Conciertos", "Lima" y "S/ 100 – S/ 200" a la izquierda, y "Ordenar por [Fecha | Precio más bajo]" alineado a la derecha y centrado en vertical con los chips. Debajo, la grilla. No queda ninguna fila vacía encima.
- [ ] **Fila de resultados a 1024 px.** Con los mismos filtros más `mes`, los chips pueden ocupar dos líneas, pero "Ordenar por" sigue arriba a la derecha. Sin scroll horizontal.
- [ ] **Sin filtros a 1440 px.** En `/eventos`, la fila tiene "N eventos" a la izquierda y "Ordenar por" a la derecha.
- [ ] **Móvil y tablet (375 y 768 px).** La fila "Filtros (n) + orden", las pills y la línea del contador con los chips se ven como hoy.
- [ ] **Un solo orden por ancho.** En cada ancho (375, 768 y 1440 px), el árbol de accesibilidad tiene **un** grupo "Ordenar por" con dos enlaces, y el activo con `aria-current="true"`. No hay ids duplicados en la página.
- [ ] **Teclado a 1440 px.** Tras la barra lateral, el Tab recorre los chips, después "Fecha" y "Precio más bajo", y después las tarjetas.
- [ ] **Código.**
  - `npx vitest run modules/events` y `npm run lint` pasan, y `npm run build` termina sin errores.
  - `pages/events-list.md` y MASTER §7 describen el buscador compacto y la fila única.

### Fase 3: corrección del ancho de los contenedores
- [ ] **Ancho del paso 1 a 1440 px.** Dado `/eventos/noche-de-sintetizadores-lima/entradas` a 1440 px, cuando se mide el contenedor de la página (`mx-auto … max-w-7xl`) antes y después de elegir una zona, entonces mide 1280 px en ambos casos y su contenido empieza alineado con el logo de la cabecera (x ≈ 112–113 px).
- [ ] **Ancho del paso 2 a 1440 px.** En `/checkout?evento=festival-vive-latino-lima&campo-vip=2`, el contenedor mide 1280 px y está alineado con el logo (x ≈ 112–113 px).
- [ ] **Ancho de la confirmación.** A 1440 px, en la confirmación (cargando, encontrada y no encontrada), el contenedor mide 896 px (`max-w-4xl`) y queda centrado; a 375 px ocupa todo el ancho, sin scroll horizontal.
- [ ] **Página de diseño.** `pages/checkout.md` indica 77 px en `lg` y 65 px por debajo (borde incluido) y que los contenedores de los pasos llevan `w-full`.
- [ ] **Código.** `npx vitest run modules/checkout` y `npm run lint` pasan, y `npm run build` termina sin errores.

## Diseño técnico

### Rutas (`app/`)
- **Nuevo route group** `app/(purchase)/`, sin `layout.tsx` (Decisión 1). Contiene:
  - `checkout/page.tsx` (movida);
  - `checkout/confirmacion/page.tsx` (movida);
  - `eventos/[slug]/entradas/page.tsx` (movida);
  - `eventos/[slug]/not-found.tsx` (nuevo).
- `app/(site)/eventos/[slug]/page.tsx` y `app/(purchase)/eventos/[slug]/entradas/page.tsx` comparten el segmento `[slug]` en grupos distintos. No hay conflicto, porque resuelven URL distintas (Next, "Route Groups · Conflicting paths").
- `app/(site)/eventos/page.tsx` (F2): solo se recoloca `EventsSort` (Requisito 14).

### Componentes
| Componente | Tipo | Ubicación / motivo | Fase |
|---|---|---|---|
| `PurchaseShell` | nuevo (sustituye a `PurchaseStepper`) | `components/shared/PurchaseShell.tsx`: lo usan las rutas de `app/` y `checkout` (`OrderConfirmation`); el paso 1 es de `seating`, pero la página solo lo compone. No existe en shadcn: es un layout de página | 1 |
| `BrandLogo`, `SiteShell`, `NotFoundMessage` | existentes (`components/shared/`) | Logo de la cabecera y 404 del paso 1 | 1 |
| `CheckoutStatusMessage`, `CheckoutForm`, `CheckoutSummaryPanel` | existentes (`modules/checkout/components/`) | `CheckoutForm`: placeholders, subtítulo y casilla. Los otros dos, sin cambios | 1 |
| `PaymentMethodFields`, `OrderSummary`, `OrderConfirmation`, `ConfirmationTicketCard` | existentes, modificados | `modules/checkout/components/` (Requisitos 8–12) | 1 |
| `Input`, `Checkbox`, `RadioGroup`, `Field*`, `Card`, `Separator`, `Button`, `NativeSelect` | shadcn (instalados) | `components/ui/`. No se instala nada | 1–2 |
| `EventSearchBar`, `EventsResults`, `EventsSort` | existentes, modificados | `modules/events/components/` (Requisitos 13–14) | 2 |

Ningún componente de shadcn sustituye a la cabecera de compra:
- `npx shadcn@latest search @shadcn -q stepper` no devuelve nada;
- `-q header` solo devuelve el bloque `sidebar-16` (una sidebar con header) y fuentes.

Se compone con `Link`, `BrandLogo` e iconos, como `SiteHeader`.

### Hooks, services, schemas, stores
Sin cambios. `PAYMENT_METHOD_LABELS` no cambia (Decisión 6).

### Contrato de API
No hay API HTTP. Contratos internos que cambian:
```ts
// components/shared/PurchaseShell.tsx (nuevo; sustituye a PurchaseStepper({ currentStep }))
export function PurchaseShell(props: {
  currentStep?: 1 | 2 | 3;
  back?: { href: string; label: string };
  children: React.ReactNode;
}): React.JSX.Element;

// modules/checkout/components/OrderConfirmation.tsx
export function OrderConfirmation(props: { code: string }): React.JSX.Element; // antes: { code; stepper: ReactNode }

// modules/events/components/EventsResults.tsx
export function EventsResults(props: { events: Event[]; chips: FilterChip[]; sort?: React.ReactNode }): React.JSX.Element;
```

## Reutilización
- **Stepper:** el marcado actual de `PurchaseStepper` (pasos, círculos, conectores, `aria-current`, "(completado)", barra móvil) se traslada a `PurchaseShell`; no se reescribe.
- **Shell, logo y 404:**
  - `BrandLogo` y el patrón de `SiteHeader` (sticky, `border-b`, contenedor `max-w-7xl`, logo `h-7 lg:h-8` con foco visible);
  - `SiteShell` y `NotFoundMessage` para el 404 del paso 1.
- **Enlaces de vuelta:** `buildChangeTicketsHref` (ya calculado en la página como `changeHref`) para "Volver a entradas"; `/eventos/<slug>` para "Volver al evento".
- **Textos por ancho y doble render:** los patrones de `TicketCard` y de "Calendario/Agregar al calendario" para los textos por ancho, y el de `PayButton` para el doble render por ancho.
- **Buscador:** `NativeSelect` e `Input` siguen igual; solo cambian las clases por breakpoint.

## Tests
Ubicados junto al archivo probado.
- **F1 `components/shared/PurchaseShell.test.tsx`** (nuevo; es un componente compartido con lógica por props):
  - Con `currentStep={2}` y `back={{ href: "/x", label: "Volver a entradas" }}`:
    - hay un `banner` y un `main` con los `children`;
    - existe el enlace "Volver a entradas" con `href="/x"` y clase `lg:hidden`;
    - el enlace "Mentec Tickets" lleva a `/` con `max-lg:hidden`;
    - la lista "Pasos de la compra" tiene 3 elementos y `aria-current="step"` en "Datos y pago";
    - "Entradas" incluye "(completado)";
    - existen "Compra segura" y "Paso 2 de 3".
  - Con `currentStep={3}` sin `back`: no hay enlace de vuelta, el logo no tiene `max-lg:hidden`, no existe "Compra segura", existe "Paso 3 de 3" y `aria-current="step"` está en "Confirmación".
  - Con `currentStep={1}`: "Paso 1 de 3", "Elige tus entradas" y "Compra segura".
  - Sin `currentStep`: solo el enlace del logo. No hay lista de pasos, ni "Paso", ni "Compra segura".
- **F1 `modules/checkout/components/OrderConfirmation.test.tsx`** (actualizar):
  - `renderConfirmation` deja de pasar `stepper` y desaparece `STEPPER`.
  - **Orden confirmada:**
    - existe la lista "Pasos de la compra" con `aria-current="step"` en "Confirmación";
    - no existe "Compra segura";
    - el h2 "Qué sigue" tiene la clase `md:sr-only` (y no `sr-only` sola);
    - cada tarjeta de "Qué sigue" contiene el texto corto (en un `span` con `md:hidden`) y el largo (con `max-md:hidden`);
    - el `<dt>` del total se encuentra con un matcher por su texto completo (`textContent === "Total pagado"`, p. ej. `getByText(byFullText("DT", "Total pagado"))`), porque `getByText("Total pagado")` no casa con el texto partido en `Total` + `<span> pagado</span>`; el `span` " pagado" tiene `max-md:hidden`.
  - **Cargando y no encontrada:** no existe la lista de pasos y existe el enlace "Mentec Tickets". Esto sustituye a "sin stepper".
  - El resto de casos, sin cambios y en verde.
- **F1 `modules/checkout/components/CheckoutForm.test.tsx`** (ampliar):
  - placeholders de `checkout-firstName`, `checkout-lastName`, `checkout-email`, `checkout-phone` y `checkout-documentNumber`;
  - existe el radio "Tarjeta de crédito o débito", y el sufijo " de crédito o débito" está en un `span` con `sm:hidden`;
  - el subtítulo contiene ambos textos, cada uno en su `span` (`sm:hidden` / `max-sm:hidden`), y "Los campos con * son obligatorios.";
  - dentro de la tarjeta del resumen (la del h2 "Resumen del pedido"), la miniatura y el título tienen `max-lg:hidden`, y la fecha corta no.
  - El resto de casos, sin cambios y en verde.
- **F2 `modules/events/components/EventSearchBar.test.tsx`** (ampliar):
  - el contenedor de "Fecha" y el de "Precio" tienen `max-md:hidden`, y sus `select` (`name="mes"`, `name="precio"`) siguen dentro del `form`;
  - la etiqueta "Qué quieres ver" tiene `max-md:sr-only` y el campo se encuentra por `getByLabelText("Qué quieres ver")`;
  - el segmento de texto contiene una lupa `svg` con `aria-hidden`.
  - Los 9 casos actuales, sin cambios y en verde.
- **Sin test:**
  - las páginas de `app/` y `not-found.tsx` (solo componen);
  - `ConfirmationTicketCard`, `OrderSummary` y `PaymentMethodFields`: se ejercen desde los tests de `OrderConfirmation` y `CheckoutForm`;
  - `EventsResults` y `EventsSort`: presentacionales, sin tests hoy; se verifican con los criterios de Playwright.
- `npx vitest run modules/checkout/schemas` sigue en verde sin cambios (`PAYMENT_METHOD_LABELS` intacto).

## Plan de tareas
Coordinación con otras specs (ninguna está en curso sobre estos archivos al redactar):

| Esta spec | Comparte archivos con | Regla |
|---|---|---|
| F1 T2 | `legal-documents` F5 T2/T3 (`CheckoutForm.tsx`, su test, `app/(site)/checkout/page.tsx`, `pages/checkout.md`) | No en paralelo. Si `legal-documents` F5 va después, usa la ruta nueva `app/(purchase)/checkout/page.tsx`. |
| F1 T4 y T5 | `seating-stadium-map` F4 T4 (página `/entradas`, `pages/ticket-selection.md`) y `seating-curved-venues` T6 (`pages/ticket-selection.md`) | No en paralelo. T5 espera a que T6 esté cerrada. Si F4 va después, usa la ruta nueva `app/(purchase)/eventos/[slug]/entradas/page.tsx`. |
| F2 | `events-ui-refresh` (cerrada) | — |
| F3 T1 | `seating-stadium-map` F6 T5 (en otra rama: envoltorio `Suspense` con `PreselectedTicketSelection` en `app/(purchase)/eventos/[slug]/entradas/page.tsx`) | Se puede hacer en paralelo: F3 T1 solo añade la clase `w-full` al contenedor, así que la fusión no tiene conflicto de lógica. Quien fusione después conserva la clase. |

- F1 y F2 tienen archivos disjuntos (MASTER solo se toca en F2), así que pueden ejecutarse en cualquier orden, cada una en su sesión.
- **Builds y commits:** los developers en paralelo no ejecutan `npm run build`; lo hace el reviewer al cerrar cada fase. Nadie hace commits.

### Fase 1 — Pantalla de compra y textos del checkout (5 tareas, 16 archivos)
- [x] T1 — `PurchaseShell` con su test (archivo nuevo; `PurchaseStepper` se queda hasta T5 para que el árbol compile en cada tarea) · archivos: `components/shared/PurchaseShell.tsx`, `components/shared/PurchaseShell.test.tsx` · depende de: — · secuencial (base, `components/shared/`)
- [x] T2 — Paso 2: mover la página a `(purchase)` con `PurchaseShell` y la flecha, más los textos del checkout (placeholders, subtítulo, casilla, "Tarjeta de crédito o débito", resumen móvil) con el test ampliado · archivos: `app/(site)/checkout/page.tsx` → `app/(purchase)/checkout/page.tsx` (`git mv`), `modules/checkout/components/CheckoutForm.tsx`, `modules/checkout/components/CheckoutForm.test.tsx`, `modules/checkout/components/PaymentMethodFields.tsx`, `modules/checkout/components/OrderSummary.tsx` · depende de: T1 y `legal-documents` F5 no en curso · paralelo con T3 y T4
- [x] T3 — Paso 3: mover la página, `OrderConfirmation` sin `stepper` y con `PurchaseShell`, "Qué sigue" móvil, chip `bg-card`, muescas `bg-muted` y "Total" móvil, con el test actualizado · archivos: `app/(site)/checkout/confirmacion/page.tsx` → `app/(purchase)/checkout/confirmacion/page.tsx` (`git mv`), `modules/checkout/components/OrderConfirmation.tsx`, `modules/checkout/components/OrderConfirmation.test.tsx`, `modules/checkout/components/ConfirmationTicketCard.tsx` · depende de: T1 · paralelo con T2 y T4
- [x] T4 — Paso 1: mover la página `/entradas` a `(purchase)` con `PurchaseShell` y "Volver al evento", y el 404 propio · archivos: `app/(site)/eventos/[slug]/entradas/page.tsx` → `app/(purchase)/eventos/[slug]/entradas/page.tsx` (`git mv`), `app/(purchase)/eventos/[slug]/not-found.tsx` · depende de: T1 y `seating-stadium-map` F4 no en curso · paralelo con T2 y T3
- [x] T5 — Eliminar `PurchaseStepper` y actualizar las páginas de diseño · archivos: `components/shared/PurchaseStepper.tsx` (eliminar), `design-system/ticketera/pages/checkout.md`, `design-system/ticketera/pages/ticket-selection.md` · depende de: T2, T3, T4 y `seating-curved-venues` T6 cerrada · secuencial

### Fase 2 — `/eventos`: buscador compacto y fila única (3 tareas, 7 archivos)
- [x] T1 — Buscador compacto por debajo de `md`, con el test ampliado · archivos: `modules/events/components/EventSearchBar.tsx`, `modules/events/components/EventSearchBar.test.tsx` · depende de: — · paralelo con T2
- [x] T2 — Fila única de contador, chips y orden en `lg` · archivos: `app/(site)/eventos/page.tsx`, `modules/events/components/EventsResults.tsx`, `modules/events/components/EventsSort.tsx` · depende de: — · paralelo con T1
- [x] T3 — `pages/events-list.md` (buscador compacto, fila única y tabulación) y la fila "Buscador" de MASTER §7 · archivos: `design-system/ticketera/pages/events-list.md`, `design-system/ticketera/MASTER.md` · depende de: T1, T2 · secuencial

### Fase 3 — Corrección tras la revisión de F1–F2 (1 tarea, 3 archivos)
- [x] T1 — `w-full` en el contenedor del paso 1 y en `CONTAINER_CLASS` de `OrderConfirmation` (Decisión 14), y en `pages/checkout.md` las alturas de la cabecera (77 px en `lg` y 65 px por debajo, borde incluido; hoy dice 76/64) y la nota de `w-full` en los contenedores · archivos: `app/(purchase)/eventos/[slug]/entradas/page.tsx`, `modules/checkout/components/OrderConfirmation.tsx`, `design-system/ticketera/pages/checkout.md` · depende de: F1 · secuencial (coordinación con `seating-stadium-map` F6 T5 en la tabla de arriba)
