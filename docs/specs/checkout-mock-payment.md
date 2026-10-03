# Checkout con pago simulado y confirmación de compra

- Módulo: checkout
- Estado: borrador

## Objetivo
Completar los pasos 2 ("Datos y pago") y 3 ("Confirmación") del flujo de compra con un **pago simulado** (sin pasarela, sin backend), para que quien compra pueda introducir sus datos, elegir un método de pago (Tarjeta, Yape o PagoEfectivo), "pagar" y ver la confirmación con su entrada y su QR. La orden se guarda en el navegador (`useOrdersStore`) para que "Mis entradas" (spec tickets) la muestre después. Esta spec también crea la base compartida que usan otras specs: `useZodForm` en `hooks/`, validadores de persona en `lib/`, la entrada pública de sesión, `TicketQr` y `lib/calendar.ts`.

Visual según `design-system/ticketera/MASTER.md` (identidad Mentec: tokens, Creato Display, a11y §11) y `design-system/ticketera/pages/checkout.md`. Del diseño de referencia ("5 · Checkout y pago": `Checkout.dc.html` / `CheckoutMobile.dc.html`; "6 · Confirmación de compra": `Confirmation.dc.html` / `ConfirmationMobile.dc.html`) se toman estructura, textos y patrones móviles, **no** sus colores, fuente ni marca ("Ticketera" → "Mentec Tickets"). Español (Perú), PEN.

**Ampliación (Fases 5 y 6):** con las Fases 1–4 ya implementadas, el usuario compartió capturas de "Datos y pago", "Confirmación" y de la entrada con QR que debe salir al "Descargar PDF". La Fase 5 alinea el paso 2 (h1 solo para lectores de pantalla, campos obligatorios con `*`, documento de identidad agrupado, nota corta de demo y resumen compacto con el botón "Pagar" dentro). La Fase 6 alinea el paso 3 (correo del comprador, fecha sin año ni hora, asientos compactos) y sustituye la lista de impresión por una **entrada imprimible por página** (`components/shared/PrintableTicket.tsx`), reutilizable por "Mis entradas". Se mantiene la marca Mentec (tokens; "Pagar" en primario azul), "Nombres" + "Apellidos" separados y el contrato E sin cambios.

**Enmienda (Fase 5 y nueva Fase 7):** el usuario compartió la captura de la tarjeta de resumen ("5 × Tribuna Norte", asientos compactos, "Cambiar entradas", separador discontinuo, "Total", botón "Pagar" pálido y "Acepta los términos para continuar." debajo) y pidió que "Cambiar entradas" permita cambiar la selección sin perderla. La Fase 5 añade el separador discontinuo y el bloqueo visual de "Pagar" hasta aceptar los Términos (decisión 32, que sustituye a la 6). La Fase 7 hace que "Cambiar entradas" lleve la selección actual al paso 1 y que el `TicketSelector` del detalle (eventos sin mapa) la precargue. La precarga en el mapa (`/eventos/<slug>/entradas`) la hace `docs/specs/seating-stadium-map.md`, Fase 4.

## Alcance
- Incluye:
  - **Fase 1 — Base compartida (contratos D y F):** refactor sin cambios de comportamiento de `auth` (`useZodForm` → `hooks/`, reglas de persona → `lib/formFields.ts`, clases de enlace → `lib/linkStyles.ts`, entrada `modules/auth/session.ts`); instalación de shadcn `radio-group`; entrada pública `modules/events/format.ts`; `components/shared/TicketQr.tsx`; `lib/calendar.ts`.
  - **Fase 2 — Dominio del pago simulado (contrato E):** schemas del formulario (comprador, tarjeta, términos), utilidades de tarjeta y de orden, store persistido de órdenes con su entrada pública `modules/checkout/orders.ts` y service mock `payment.service.ts`. Sin cambios visibles.
  - **Fase 3 — Paso 2 `/checkout`:** stepper, banner del temporizador, "Datos del comprador", "Método de pago" (radio cards + campos de tarjeta propios de la simulación + textos de Yape/PagoEfectivo), Términos, resumen sticky en `lg` con "Cambiar entradas" y "Pagar S/ X", resumen plegable y barra inferior con "Pagar" en móvil.
  - **Fase 4 — Paso 3 `/checkout/confirmacion`:** confirmación leída del store, tarjeta-entrada con talón y `TicketQr`, "Ver mis entradas", "Agregar al calendario" (.ics), "Descargar PDF" (impresión), "Qué sigue" y estado "No encontramos tu compra".
  - Actualización de `design-system/ticketera/pages/checkout.md` (Fases 3 y 4).
  - **Fase 5 — Alinear "Datos y pago" a las capturas:** formateadores de fecha `formatShortDayMonth` / `formatLongDayMonth` en `events` (vía `modules/events/format.ts`); formateo compacto de asientos en `modules/checkout/utils/summaryFormat.ts`; h1 `sr-only`; `*` en los campos obligatorios; "Documento de identidad" como un grupo (tipo + número) junto a "Celular"; nota "Demo: no se realiza ningún cobro real." al pie de "Método de pago"; resumen compacto con separador discontinuo antes del total y "Pagar S/ X" dentro de la tarjeta (solo `lg`); "Pagar" (resumen y barra móvil) con aspecto deshabilitado, alcanzable con Tab y el aviso "Acepta los términos para continuar." mientras Términos no esté marcado.
  - **Fase 6 — Alinear "Confirmación" y la entrada imprimible:** correo del comprador en el texto, fecha "lunes 5 de octubre · Lugar, Ciudad", asientos compactos por zona, "Qué sigue" como h2 `sr-only`; componente compartido `PrintableTicket` (props planas) y `buildPrintableTickets(order)`; al imprimir solo salen las entradas, una por página.
  - Actualización de `design-system/ticketera/pages/checkout.md` (Fases 5 y 6).
  - **Fase 7 — "Cambiar entradas" conserva la selección:** el enlace (y "Volver a elegir entradas" del temporizador) lleva al paso 1 con las cantidades y los asientos del pedido; el `TicketSelector` del detalle (eventos sin mapa) precarga las cantidades válidas de la URL. Toca `modules/events` (utilidad pura, `TicketSelector`, un envoltorio cliente nuevo, barrel) y `app/eventos/[slug]/page.tsx`.
  - **Reemplazo funcional de `docs/specs/checkout-purchase.md`:** su Fase 1 (ya implementada) se conserva; sus Fases 2–3 (Stripe) **no se implementan**: esta spec las sustituye. Ese archivo no se edita (sigue aprobado; sus casillas de Fases 2–3 quedan sin marcar).
- No incluye:
  - Pasarela real (Stripe u otra), Server Actions, Route Handlers, webhooks, claves o variables de entorno, dependencias de pago.
  - **Envío de datos de tarjeta a cualquier servicio:** los campos de tarjeta solo existen en el estado de React del formulario; no salen del navegador, no se registran en consola y no se guardan (ni siquiera los últimos 4 dígitos).
  - Flujo real de Yape (QR) o PagoEfectivo (código CIP): en la simulación ambos aprueban al pulsar "Pagar" (ver Preguntas abiertas).
  - Reserva real de inventario o de asientos: el temporizador sigue siendo solo de UI.
  - Envío de correos, comprobantes, facturación/boleta, reembolsos, cupones, cargos por servicio.
  - Un QR legible por lectores: `TicketQr` es decorativo y determinista.
  - Generación real de PDF (se usa el diálogo de impresión del navegador: "Guardar como PDF").
  - La página `/mis-entradas` y el enlace del header (spec tickets). El botón "Ver mis entradas" apunta a una ruta que crea esa spec.
  - El stepper `PurchaseStepper`, el mapa de asientos y la validación de `asientos=` (spec seating, contratos A, B y C).
  - Exigir sesión para comprar: la compra como invitado sigue permitida.
  - TanStack Query, toasts, modo oscuro.
  - (F5–F6) "Nombre completo" en un solo campo: se mantienen "Nombres" y "Apellidos" (decisión del usuario); el contrato E (`Order.buyer`) no cambia.
  - (F5–F6) Cambios en `modules/seating/**` (la spec seating amplía su Fase 6 en paralelo), en `modules/tickets/**` o en `docs/specs/tickets-my-tickets.md`: "Mis entradas" podrá adoptar `PrintableTicket` en una enmienda posterior de su spec.
  - (F5–F6) Cambiar el formato de importes: se mantiene `S/ 310.00` del MASTER (la captura muestra `S/ 310`; ver Preguntas abiertas).
  - (F5–F6) Código de pedido `TK-`: se mantiene `MT-XXXXXX`.
  - (F6) Generar un PDF propio: "Descargar PDF" sigue siendo `window.print()`.
  - (F5) Deshabilitar "Pagar" por otros campos vacíos o inválidos: solo Términos lo bloquea visualmente; el resto se valida al enviar, como hoy.
  - (F7) Precargar la selección en el mapa `/eventos/<slug>/entradas` (`modules/seating/**`): la hace `seating-stadium-map.md`, Fase 4. Hasta entonces esa página ignora los parámetros (sin errores).
  - (F7) Reflejar en la URL los cambios que se hagan en el paso 1, recordar la selección en el navegador (store, `localStorage`) o volver con "Atrás" del navegador conservándola: la selección viaja solo en el enlace.
  - (F7) Precargar Datos del comprador o el método de pago al volver a `/checkout`: el formulario se rellena de nuevo (salvo la precarga de sesión de la decisión 4).

## Decisiones tomadas
1. **Pago simulado en el cliente.** `processMockPayment` es una función asíncrona sin React ni red (latencia `MOCK_PAYMENT_LATENCY_MS = 1200`). Tarjeta `4000 0000 0000 0002` → rechazo; cualquier otra tarjeta válida → aprobada; Yape y PagoEfectivo → aprobados. El número de tarjeta solo se compara en memoria para decidir el rechazo.
2. **Importe desde el pedido validado.** El formulario recibe el `CheckoutOrder` que `getCheckoutOrder` validó en el servidor a partir de la URL (precios del evento, nunca del cliente). `buildOrder` vuelve a calcular `ticketCount` y `total` a partir de `items` (`unitPrice × quantity`) e ignora `order.total`. Ningún campo editable lleva importes.
3. **Formulario único con `useZodForm`.** `checkoutFormSchema` es un `z.object` (requisito de `useZodForm`) con los campos del comprador, `paymentMethod`, los 4 campos de tarjeta y `acceptTerms`. Los campos de tarjeta se validan en `superRefine` solo si `paymentMethod === "card"`, reutilizando `cardDetailsSchema`. Mismo patrón que el registro: errores al enviar, revalidación al salir del campo tras el primer intento, foco al primer inválido, `aria-invalid` + `aria-describedby`, `<form noValidate>`.
4. **Comprador según el contrato E:** "Nombres" y "Apellidos" separados (el diseño usa "Nombre completo", pero la orden guarda `firstName`/`lastName`), "Correo electrónico", "Celular" (+51), "Tipo de documento" y "Número de documento". Sin "Confirmar correo" (el diseño no lo tiene; ver Preguntas abiertas). Precarga desde la sesión de Nombres, Apellidos y Correo **solo si están vacíos** (la rehidratación de `useAuthStore` ya la dispara `AuthHeaderActions` en el header).
5. **Campos de tarjeta con `autoComplete="off"`** (el diseño usa `cc-*`): en una simulación no se invita al navegador a rellenar ni a guardar tarjetas reales. Aviso visible en la sección: es un pago simulado y se indican las tarjetas de prueba.
6. ~~**El botón "Pagar" no se deshabilita por Términos sin marcar**~~ (el diseño sí lo hace): se mantiene el patrón del proyecto (validar al enviar y enfocar el primer error, que explica el problema). Solo se deshabilita al expirar la reserva y mientras se procesa. **Sustituida por la decisión 32 desde la Fase 5.**
7. **Layout de `/checkout` sin duplicar el resumen.** Un único `CheckoutSummaryPanel`, situado en el DOM **después** de las secciones y Términos: en `lg` va en la columna derecha (posición explícita en la grilla), siempre desplegado y `sticky`; en móvil se muestra arriba con `order-first` como botón plegable (`aria-expanded`) con el `OrderSummary` dentro. Así "Pagar" nunca se alcanza con el tabulador antes que los campos; la única diferencia entre orden visual y de tabulación es el botón del resumen móvil (informativo), que se alcanza tras Términos. El botón "Pagar" se renderiza dos veces con el mismo componente interno: dentro del panel (`hidden lg:flex`) y en la barra inferior móvil (`lg:hidden`); en cada ancho solo uno es visible y accesible. La barra móvil es `sticky bottom-0` como último hijo del `<form>` (no `fixed`): queda pegada abajo mientras se rellena y nunca tapa el footer.
8. **Órdenes en `localStorage`** (`mentec-orders`, zustand `persist` con `skipHydration: true`, igual que `auth`). Antes de añadir una orden siempre se rehidrata (`persistOrder`), para no sobrescribir órdenes guardadas con un store aún sin hidratar. La confirmación rehidrata al montar y distingue "cargando" de "no encontrada".
9. **Código de orden** `MT-` + 6 caracteres `[A-Z0-9]` aleatorios (sin almacenamiento central; la colisión es despreciable en un mock y `addOrder` reemplaza si el código ya existe). Entradas: `<código>-01`, `-02`… en el orden de `items` (y de `seats` dentro de cada item).
10. **Formato en código cliente sin el barrel de `events`.** El barrel `@/modules/events` arrastra componentes cliente (carrusel, selector…). Se crea la entrada pública `modules/events/format.ts` (SETUP §1 regla 4, como `modules/auth/header.ts`) que solo reexporta formateadores y etiquetas de categoría. Los archivos de checkout que se ejecutan en el cliente (`payment.schema.ts`, `utils/card.ts`, `utils/order.ts`, `payment.service.ts`, componentes cliente) no importan `@/modules/events` salvo `import type`.
11. **Stepper:** `/checkout` lo renderiza en la página (`currentStep={2}`); en la confirmación la página lo pasa como prop `stepper` a `OrderConfirmation`, que solo lo muestra si encuentra la orden (los estados de error nunca muestran stepper, igual que en `/checkout`).
12. **"Cambiar entradas"** lleva al paso 1: `/eventos/<slug>/entradas` si `hasVenueMap(slug)` (contrato B/H) y `/eventos/<slug>` si no. La página lo calcula y lo pasa a `OrderSummary` y al temporizador ("Volver a elegir entradas"). **Ampliada por la decisión 35 (Fase 7):** el enlace lleva también la selección.
13. **Variantes Stripe obsoletas:** `CheckoutStatusMessage` pierde `not-configured`, `payment-processing` y `payment-failed` (no se usan y pertenecían al flujo Stripe reemplazado); `order-not-found` se adapta a la confirmación local.
14. **"Descargar PDF" = `window.print()`** con estilos `print:` de Tailwind: se ocultan header, footer, stepper, botones y "Qué sigue"; se muestra una lista solo-impresión con todas las entradas (QR, código, tipo, asiento, titular).
15. **`.ics` sin `DTEND`:** los eventos no tienen hora de fin; RFC 5545 permite omitirla. Se registra en Preguntas abiertas.

Decisiones de la ampliación (Fases 5 y 6; donde contradicen a una anterior, prevalecen):

16. **Un solo h1, oculto a la vista.** En `/checkout` el h1 "Finalizar compra" pasa a `sr-only`: arriba solo se ven el stepper y el banner del temporizador, como en la captura. Sigue siendo el único h1 y el primero en la jerarquía.
17. **Campos obligatorios con `*` visual.** La marca es un `<span aria-hidden="true" className="text-destructive">*</span>` dentro de la etiqueta (componente interno `RequiredMark`). Lo obligatorio se comunica a la tecnología de apoyo con el atributo `required` en los `input` (implica `aria-required`, y `noValidate` evita las burbujas del navegador) y en el `Checkbox` de Términos. El nombre accesible de cada campo no cambia ("Nombres", no "Nombres *"). Llevan `*`: Nombres, Apellidos, Correo electrónico, Celular, Documento de identidad, los 4 campos de tarjeta y Términos. "Método de pago" no lo lleva: siempre hay uno elegido (Tarjeta por defecto).
18. **Disposición de "Datos del comprador"** (2 columnas desde `sm`, sin huecos):
    ```
    [Nombres *              ] [Apellidos *                               ]
    [Correo electrónico *  (ancho completo, sm:col-span-2)               ]
    [Celular *  [+51][      ] ] [Documento de identidad *  [DNI ▾][número] ]
    ```
    El correo va a ancho completo porque es el dato al que se envían las entradas (lo dice el subtítulo) y suele ser largo. Celular y Documento comparten fila como en la captura. En móvil, una columna en el mismo orden, que también es el orden de tabulación y el de `checkoutFormSchema` (el foco al primer inválido no cambia).
19. **"Documento de identidad" como un grupo.** Se usa `FieldSet` con `FieldLegend variant="label"` "Documento de identidad *". Dentro, en una fila `flex gap-2`, van el `Select` de tipo (`w-32 shrink-0`) y el `Input` del número (`flex-1`). Cada control conserva su nombre accesible con una etiqueta `sr-only` ("Tipo de documento", "Número de documento") y su id (`checkout-documentType`, `checkout-documentNumber`). El error del número va debajo de la fila. El trigger muestra la abreviatura (`DNI`, `CE`, `Pasaporte`) con la función `children` de `SelectValue` (Base UI la admite: `children?: ReactNode | ((value) => ReactNode)`). La lista conserva los nombres completos de `DOCUMENT_TYPE_LABELS`, porque "Carné de extranjería" no cabe en `w-32`.
20. **Nota de demo corta.** El aviso largo de arriba de "Método de pago" se sustituye por una nota al pie de la tarjeta, con icono `Info`: "Demo: no se realiza ningún cobro real.". Las tarjetas de prueba siguen accesibles en esa misma nota, como segunda frase visible **solo con el método Tarjeta**: "Tarjetas de prueba: 4242 4242 4242 4242 (aprobada) y 4000 0000 0000 0002 (rechazada).". No se usa `title`, que no llega a teclado ni a pantallas táctiles.
21. **Términos debajo de "Método de pago"** (columna izquierda, como hoy), no dentro del resumen. En móvil el contenido del resumen va plegado (`hidden`), así que un checkbox obligatorio dentro quedaría oculto. Además, el orden de tabulación "campos → Términos → Pagar" se mantiene en todos los anchos.
22. **"Pagar" dentro de la tarjeta del resumen.** `OrderSummary` gana `footer?: ReactNode` y lo pinta al final de su `CardContent`, después del total. `CheckoutForm` renderiza el propio `OrderSummary` con `footer={<PayButton className="hidden lg:flex" />}`: desaparecen la prop `summary` de `CheckoutForm` y la prop `footer` de `CheckoutSummaryPanel`, y la página deja de importar `OrderSummary`. Como ahora corre en el cliente, `OrderSummary` importa de `@/modules/events/format`, no del barrel (decisión 10). En móvil, la barra `sticky` inferior y el resumen plegable no cambian. El botón de la tarjeta tiene `display:none` bajo `lg`, así que en cada ancho solo un "Pagar" es visible y accesible (igual que en la decisión 7).
23. **Resumen compacto.** Se ven: miniatura (`alt=""`, el título va al lado), título, "lun 5 oct · Lugar, Ciudad" (fecha corta en minúsculas, sin hora), separador, una línea por tipo "2 × Tribuna Oriente … S/ 310.00" con, debajo y en pequeño, los asientos compactos, "Cambiar entradas", separador, "Total S/ 310.00", "Precio final, sin cargos ocultos" y "Pagar". El h2 "Resumen del pedido" queda `sr-only`. Se quita el precio unitario ("2 × S/ 155.00"): lo da el subtotal y ya se vio en el paso 1.
24. **Asientos compactos, agrupados por fila** ("Fila L · 9 · Fila M · 8"; varios en la misma fila: "Fila L · 9, 10"). Las filas van ordenadas por longitud y luego alfabéticamente (A…Z, AA…), y los números de menor a mayor. La función vive en `modules/checkout/utils/summaryFormat.ts` y lee fila y número del **id** del asiento, no de su `label`. El formato del id es el contrato C (`<zoneId>-<fila>-<número>`, fila `[A-Z]{1,2}`, número 1–999, leído desde la derecha). La etiqueta ("Tribuna Norte · Fila F · Asiento 12") es texto de presentación de seating y puede cambiar. Checkout no importa internals de seating. Hoy `parseSeatId` no está en ninguna entrada pública de seating (`index.ts` ni la futura `seats.ts`), así que la lectura del id se define en checkout. Si un id no se puede leer, se usa su `label` completa como fallback. Hay duplicación de conocimiento con `SEAT_ID_PATTERN`: ver Preguntas abiertas.
25. **Fechas nuevas en `events`, no en checkout.** `formatShortDayMonth(iso)` → "lun 5 oct" y `formatLongDayMonth(iso)` → "lunes 5 de octubre" (America/Lima, minúsculas, sin puntos, sin comas, sin año ni hora) se añaden a `modules/events/utils/formatEvent.ts`, junto a `formatEventDate`/`formatLongDate`, y se reexportan en `modules/events/format.ts` (entrada creada por esta spec en la Fase 1). Así "Mis entradas" podrá usarlas sin depender de checkout. La hora del ticket ("14:00 h") reutiliza `formatTime` + `" h"`: no se crea otro formateador.
26. **Confirmación sin "Asientos" largo.** En la tarjeta-entrada, bajo "lunes 5 de octubre · Lugar, Ciudad", va una línea pequeña por tipo con asientos: "Tribuna Oriente: Fila L · 9 · Fila M · 8". Los tipos sin asientos no tienen línea. "Zona" sigue uniendo los nombres con ", " cuando hay varias ("General, VIP"), como en el criterio de la Fase 4. Se quita la hora de esa línea (la captura no la muestra; la entrada imprimible sí la lleva).
27. **"Qué sigue" sin título visible:** se mantiene como h2 `sr-only` (la sección sigue nombrada con `aria-labelledby` y la jerarquía h1 → h2 no salta).
28. **Entrada imprimible compartida.** `components/shared/PrintableTicket.tsx` es presentacional, sin directiva y con **props planas** (no conoce `Order` ni ningún módulo). La usará también "Mis entradas" (ver Coordinación). La función pura `buildPrintableTickets(order)`, en `modules/checkout/utils/printableTickets.ts`, convierte una `Order` en esas props. Empareja cada `tickets[i]` con su asiento recorriendo `items` y `seats` en el mismo orden con el que `buildOrder` numera las entradas (requisito 13).
29. **Impresión = solo entradas, una por página.** Al imprimir se ocultan también la cabecera de confirmación y la tarjeta-entrada (`print:hidden`). Solo sale la lista de `PrintableTicket`, cada una con `break-inside-avoid` y salto de página después (`print:break-after-page`), salvo la última. La franja de marca y los colores se imprimen con `[print-color-adjust:exact]` en el `<article>`, porque los navegadores omiten los fondos por defecto. Las imágenes (evento y logo) llevan `loading="eager"`: la sección está en `display:none` en pantalla y con carga diferida no llegarían a cargarse antes del diálogo de impresión.
30. **Ubicación sin asiento:** en entradas de zonas sin numerar se **omite** el dato "Ubicación" (no se inventa un texto tipo "General · sin butaca"). Ver Preguntas abiertas.
31. **Cantidad de entradas en el total.** La fila del total del resumen dice "Total (N entradas)" ("1 entrada" en singular), como `PurchaseSummary` del paso 1. Ya existen dos `formatTicketCount` idénticos, pero ambos son internals: `modules/seating/utils/selectionSummary.ts` y `modules/tickets/utils/myOrders.ts`. No están en ninguna entrada pública, y esta fase no toca seating ni tickets. Por eso checkout define el suyo en `utils/summaryFormat.ts` y lo usan `OrderSummary` y `CheckoutSummaryPanel`. **Duplicado conocido** (3 copias): ver Preguntas abiertas. `OrderConfirmation` conserva su ternario en línea, porque la F6 no lo toca por este motivo.

Decisiones de la enmienda (Fase 5, captura del resumen, y Fase 7; prevalecen sobre las anteriores):

32. **"Pagar" bloqueado hasta aceptar los Términos (sustituye a la decisión 6).** Lo pide el diseño y el usuario. Estados de cada botón "Pagar", por prioridad:
    1. **Procesando** (`isSubmitting || isRedirecting`): `disabled` nativo, `Spinner` + "Procesando pago…" (como hoy).
    2. **Reserva expirada:** `disabled` nativo (como hoy). Sin aviso de términos: ya lo explica el `Alert` "Tu reserva expiró".
    3. **Términos sin marcar** (`termsPending = !values.acceptTerms && !isExpired && !isProcessing`): aspecto deshabilitado (`opacity-50`, `cursor-not-allowed`, sin hover ni desplazamiento al pulsar), `aria-disabled="true"`, **sin** `disabled` nativo, de modo que sigue en el orden de Tab. Debajo, centrado, `<p className="text-center text-sm text-muted-foreground">Acepta los términos para continuar.</p>`, enlazado con `aria-describedby` desde el botón. El lector anuncia "Pagar S/ 910.00, botón, no disponible, Acepta los términos para continuar.".
    4. **Activo:** sin aviso ni `aria-*` extra.

    **Patrón accesible elegido: `aria-disabled` puesto a mano, no `disabled` + `focusableWhenDisabled` de Base UI.** En `@base-ui/react@1.8.0` (`internals/use-button/useButton.js`), un `Button` con `disabled` cancela el clic (`preventDefault`) y no llama a `onClick`, aunque sea `focusableWhenDisabled`. Así, el formulario no recibiría el envío y pulsar no podría llevar a la casilla. Con `aria-disabled` y sin `disabled`, Base UI no intercepta nada: el clic, Enter o Espacio envían el formulario y la lógica vive en `onSubmit`.
33. **Intento de pago con Términos sin marcar → foco a Términos, sin validar.** Cualquier envío (clic, Enter o Espacio en cualquiera de los dos "Pagar", o Enter en un campo, que es el envío implícito del formulario) con `acceptTerms === false` hace `preventDefault`, no ejecuta la validación (no aparece ningún mensaje de error, tampoco el de Términos), no llama al service y mueve el foco a la casilla de Términos (`ref`, `focus()`; el navegador la desplaza a la vista, útil en móvil desde la barra inferior). Con Términos marcados, el envío es el de siempre: valida todo y enfoca el primer campo inválido ("Nombres" con el formulario vacío). Así se resuelve la contradicción con el criterio de la Fase 3 "con el formulario vacío, Pagar enfoca Nombres", que desde la Fase 5 solo vale con Términos marcados.
    - Desmarcar los Términos tras un envío fallido vuelve al estado 3 de la decisión 32. Además, la revalidación al cambiar la casilla (ya existente) puede mostrar bajo ella "Debes aceptar los Términos y condiciones y la Política de privacidad". Es coherente y no se suprime.
    - La regla `acceptTerms` de `checkoutFormSchema` se mantiene (defensa en profundidad y tests de la Fase 2 sin cambios).
34. **Separador discontinuo antes del total** (captura): el primer `Separator` (tras la cabecera) sigue siendo continuo; el de antes de la fila "Total" pasa a discontinuo con `Separator` + `className="h-0 border-t border-dashed border-border bg-transparent data-horizontal:h-0"` (sigue siendo el componente shadcn, con `role="separator"`).
35. **"Cambiar entradas" conserva la selección** (resuelve la pregunta abierta 5; Fase 7). El enlace lleva los mismos parámetros del pedido. Con mapa: `/eventos/<slug>/entradas?<ticketTypeId>=<qty>…&asientos=<id>,<id>` (mismo formato que el contrato C, con la coma codificada como `%2C` por `URLSearchParams`, igual que `buildSeatingCheckoutHref`). Sin mapa: `/eventos/<slug>?<ticketTypeId>=<qty>…#entradas`. El ancla es el `id="entradas"` existente del aside del detalle; en móvil el selector va bajo el hero. Lo construye la función pura `buildChangeTicketsHref` en `utils/checkoutOrder.ts`: es la inversa de `parseTicketQuantities` y vive junto a ella. "Volver a elegir entradas" del temporizador recibe el mismo `href` (`retryHref={changeHref}`, sin cambios de código). Así, tras expirar también se vuelve con la selección; el paso 1 descarta lo que ya no sea válido.
36. **Precarga en el `TicketSelector` del detalle sin perder el prerenderizado.** `/eventos/[slug]` se prerenderiza (`generateStaticParams`). Leer `searchParams` en la página la volvería dinámica. `useSearchParams` fuera de un `Suspense` rompe el build ("Missing Suspense boundary with useSearchParams", `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` § Prerendering). Por eso:
    - `TicketSelector` gana `initialQuantities?` (estado inicial) y no lee la URL;
    - un envoltorio cliente nuevo, `PreselectedTicketSelector`, lee `useSearchParams()`, convierte con la función pura `parsePreselectedQuantities` y renderiza `TicketSelector`;
    - la página lo envuelve en `<Suspense fallback={<TicketSelector …mismas props… />}>`. El HTML prerenderizado conserva el selector (vacío) y, al hidratar, se sustituye por el precargado. Sin parámetros, el resultado es idéntico al de hoy.
    - En la navegación de cliente desde "Cambiar entradas" (`<Link>`), `useSearchParams` ya tiene valor y no hay paso intermedio.
37. **Reglas de la precarga (`parsePreselectedQuantities`).** Recorre `ticketTypes` en su orden y omite los `sold-out`. Por cada tipo, toma el parámetro `<ticketTypeId>` solo si aparece una vez y es un entero `^\d+$` entre 1 y `MAX_TICKETS_PER_ORDER`. Lo acumulado nunca supera 10: si un tipo lo excediera, se recorta a lo que queda. Se ignoran los parámetros desconocidos (`evento`, `asientos`, `utm_*`…) y los valores inválidos o repetidos. Si el evento está agotado, `TicketSelector` ignora `initialQuantities` (no muestra controles). Es la misma tolerancia que pide el pedido para el mapa: lo inválido u ocupado se ignora, sin errores ni avisos.

## Requisitos

### Fase 1 — Base compartida
1. **`hooks/useZodForm.ts`** (+ `hooks/useZodForm.test.ts`): `git mv` desde `modules/auth/hooks/` sin cambios de código. `modules/auth/hooks/` deja de existir.
2. **`lib/formFields.ts`** (zod puro, sin React), movido desde `modules/auth/schemas/auth.schema.ts` con los mismos mensajes:
   - `DOCUMENT_TYPES`, `DOCUMENT_TYPE_LABELS`.
   - `requiredText(emptyMessage)`, `nameField(emptyMessage, invalidMessage)`, `emailField`, `phoneField` (`"Ingresa tu número de celular"` / `"Ingresa un celular válido de 9 dígitos que empiece con 9"`), `acceptTermsField` (`"Debes aceptar los Términos y condiciones y la Política de privacidad"`).
   - `getDocumentNumberError(documentType, documentNumber): string | undefined` (reglas `DOCUMENT_RULES` actuales; `undefined` si el número está vacío o es válido).
   - `auth.schema.ts` los importa y conserva `authUserSchema`, `loginSchema`, `registerSchema` (mismo comportamiento; su `superRefine` usa `getDocumentNumberError`).
3. **`lib/linkStyles.ts`**: `INLINE_LINK` y `TEXT_LINK` (movidos de `modules/auth/components/formShared.ts`, que conserva solo `GENERIC_ERROR`).
4. `LoginForm`/`RegisterForm` importan de `@/hooks/useZodForm`, `@/lib/formFields` y `@/lib/linkStyles`. Los tests de `modules/auth` no cambian.
5. **`modules/auth/session.ts`**: entrada pública que solo reexporta `useAuthStore` (el barrel `@/modules/auth` arrastraría los formularios).
6. **shadcn `radio-group`** instalado con `npx shadcn@latest add radio-group` (`components/ui/radio-group.tsx`, Base UI, exporta `RadioGroup` y `RadioGroupItem`). Sin edición manual.
7. **`modules/events/format.ts`**: entrada pública que solo reexporta `formatEventDate`, `formatEventPrice`, `formatLongDate`, `formatTime` (de `utils/formatEvent.ts`) y `EVENT_CATEGORY_LABELS` (de `data/categories.ts`).
8. **`components/shared/TicketQr.tsx`** (contrato F; sin `"use client"`, sirve en servidor y cliente):
   - Props `{ value: string; className?: string }`.
   - `getQrModules(value): boolean[][]` (export nombrado del mismo archivo): matriz 21×21; tres patrones de posición 7×7 (esquinas sup-izq, sup-der, inf-izq: anillo exterior, hueco y núcleo 3×3) con separador claro de 1 módulo; el resto de módulos sale de un PRNG sembrado con un hash del `value` (p. ej. FNV-1a 32 bits + mulberry32), ~50 % oscuros. Mismo `value` → misma matriz; distinto `value` → matriz distinta.
   - Render: `<svg viewBox="0 0 21 21" role="img" aria-label="Código QR de la entrada {value}" shapeRendering="crispEdges">` con un único `<path fill="currentColor">` para los módulos oscuros; clases base `bg-background text-foreground` unidas con `cn(…, className)`. Sin tamaño fijo (lo pone `className`).
9. **`lib/calendar.ts`** (contrato F; nativo, sin librerías):
   - `buildIcsEvent({ title, startsAt, location, description? }): string`: `VCALENDAR` (`VERSION:2.0`, `PRODID:-//Mentec Tickets//ES`, `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`) con un `VEVENT`: `UID` determinista (hash de `title` + `startsAt`, `@mentectickets.pe`), `DTSTAMP` (ahora, UTC), `DTSTART` en UTC (`YYYYMMDDTHHMMSSZ`), `SUMMARY`, `LOCATION` y `DESCRIPTION` (si hay). Sin `DTEND` (decisión 15). Escapa `\`, `;`, `,` y saltos de línea (`\n`); líneas separadas por CRLF; pliega líneas de más de 75 octetos UTF-8 (CRLF + espacio) sin partir caracteres multibyte.
   - `downloadIcs(fileName: string, content: string): void`: `Blob` `text/calendar;charset=utf-8`, `URL.createObjectURL`, `<a download>` temporal, `click()`, `URL.revokeObjectURL`.

### Fase 2 — Dominio del pago simulado
10. **Schemas** `modules/checkout/schemas/payment.schema.ts` (sin importar el barrel de `events`):
    - `PAYMENT_METHODS = ["card", "yape", "pagoefectivo"] as const`, `PAYMENT_METHOD_LABELS = { card: "Tarjeta", yape: "Yape", pagoefectivo: "PagoEfectivo" }`.
    - `cardDetailsSchema` (campos y mensajes):

      | Campo | Regla | Mensaje |
      |---|---|---|
      | cardNumber | vacío | Ingresa el número de tarjeta |
      | cardNumber | sin espacios ≠ 16 dígitos, o falla Luhn | Ingresa un número de tarjeta válido |
      | cardExpiry | vacío | Ingresa la fecha de vencimiento |
      | cardExpiry | no cumple `^(0[1-9]\|1[0-2])\/\d{2}$` | Ingresa una fecha válida (MM/AA) |
      | cardExpiry | mes/año anterior al actual (vigente hasta fin de mes, hora local) | La tarjeta está vencida |
      | cardCvv | vacío | Ingresa el CVV |
      | cardCvv | no son 3 o 4 dígitos | El CVV debe tener 3 o 4 dígitos |
      | cardName | vacío | Ingresa el nombre que figura en la tarjeta |
      | cardName | regla `nameField` | Ingresa un nombre válido |

      `cardNumber` se transforma a solo dígitos.
    - `checkoutFormSchema = z.object({ firstName, lastName, email, phone, documentType, documentNumber, paymentMethod: z.enum(PAYMENT_METHODS), cardNumber: z.string(), cardExpiry: z.string(), cardCvv: z.string(), cardName: z.string(), acceptTerms })` con reglas de `lib/formFields` y mensajes del registro (`"Ingresa tus nombres"`, `"Ingresa un nombre válido"`, `"Ingresa tus apellidos"`, `"Ingresa un apellido válido"`, correo, celular, `"Ingresa tu número de documento"`, términos). `superRefine`: `getDocumentNumberError` → `["documentNumber"]`; si `paymentMethod === "card"`, `cardDetailsSchema.safeParse` y cada issue se copia con su `path`. Con todo vacío deben aparecer a la vez los errores del comprador, de la tarjeta y de Términos (si zod omitiera el `superRefine` por los errores previos, usar su opción `when`).
    - `orderCodeSchema = z.string().regex(/^MT-[A-Z0-9]{6}$/)`.
11. **Utils de tarjeta** `modules/checkout/utils/card.ts` (puras):
    - `formatCardNumber(input)`: solo dígitos, máximo 16, grupos de 4 separados por espacio.
    - `formatCardExpiry(input)`: solo dígitos, máximo 4; con 3 o más dígitos inserta `/` tras el mes (`"1228"` → `"12/28"`).
    - `isLuhnValid(digits): boolean`.
    - `isCardExpired(expiry: "MM/AA", now = new Date()): boolean` (año `2000 + AA`; vencida si el mes/año es anterior al de `now`).
12. **Tipos** `modules/checkout/types/checkout.types.ts`:
    - `CheckoutOrder.event` añade `category` (`Pick<EventDetail, "slug" | "title" | "category" | "startsAt" | "venue" | "city" | "imageUrl">`); `buildCheckoutOrder` lo rellena.
    - `PaymentMethod`, `CheckoutFormValues = z.input<typeof checkoutFormSchema>`, `CheckoutFormData = z.output<…>`.
    - `OrderTicket`, `Order` y `OrderBuyer = Order["buyer"]` **exactamente** con la forma del contrato E (ver Contrato de API).
13. **Utils de orden** `modules/checkout/utils/order.ts` (puras, sin barrel de `events`):
    - `createOrderCode(random = Math.random): string` → `MT-` + 6 caracteres de `A-Z0-9`.
    - `parseOrderCode(value: unknown): string | null` (con `orderCodeSchema`; arrays, vacío o formato inválido → `null`).
    - `buildOrder({ code, createdAt, checkout, buyer, paymentMethod }): Order`:
      - `ownerEmail` = `buyer.email` recortado y en minúsculas; `buyer` sin `acceptTerms` ni campos de tarjeta.
      - `event` = `checkout.event` (con `category`); `items` = copia de `checkout.items` (`ticketTypeId`, `name`, `unitPrice`, `quantity` y `seats` si existen).
      - `ticketCount` y `total` recalculados desde `items` (decisión 2).
      - `tickets`: uno por entrada, en el orden de `items`; `code` = `<code>-NN` (dos dígitos, correlativo desde `01` en toda la orden); `ticketTypeName` = `item.name`; `seatLabel` = `item.seats[i].label` si existe; `holderName` = `"<firstName> <lastName>"`.
14. **Store** `modules/checkout/stores/orders.store.ts` (contrato E):
    - `useOrdersStore`: estado `{ orders: Order[]; addOrder(order): void; getOrder(code): Order | undefined }`; `addOrder` inserta al principio y reemplaza si ya existe el mismo `code`; `getOrder` busca con `get()` (sirve como selector: `useOrdersStore((s) => s.getOrder(code))`).
    - `persist` con `name: "mentec-orders"`, `partialize: ({ orders })`, `skipHydration: true`.
    - `persistOrder(order): Promise<void>`: `await useOrdersStore.persist.rehydrate()` y luego `addOrder(order)` (decisión 8). Uso interno del módulo (no se exporta en `orders.ts`).
15. **Entrada pública** `modules/checkout/orders.ts`: solo `export { useOrdersStore }` y `export type { Order, OrderTicket }`.
16. **Service mock** `modules/checkout/services/payment.service.ts` (sin React ni red; comentario de cabecera: "Simulación: no envía datos a ningún servicio"):
    - `MOCK_PAYMENT_LATENCY_MS = 1200`; `DECLINED_TEST_CARD = "4000000000000002"`.
    - `class PaymentError extends Error { code: "card-declined" }` con mensaje `"Tu tarjeta fue rechazada. Prueba con otra tarjeta o elige otro método de pago."`.
    - `processMockPayment(input: MockPaymentInput): Promise<Order>`: espera la latencia; si `payment.method === "card"` y el número (sin espacios) es `DECLINED_TEST_CARD` → lanza `PaymentError`; si no, devuelve `buildOrder({ code: createOrderCode(), createdAt: new Date().toISOString(), checkout: input.order, buyer: input.buyer, paymentMethod: input.payment.method })`. El número de tarjeta no aparece en la orden ni en logs.

### Fase 3 — Paso 2: `/checkout`
17. **Página** `app/checkout/page.tsx` (Server Component): igual que hoy para los estados de error. Con `ok`: contenedor `mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-12 lg:px-8`; `PurchaseStepper currentStep={2}` (contrato A); h1 "Finalizar compra" (`text-3xl md:text-5xl font-extrabold tracking-tight`); `CheckoutForm` con `order`, `changeHref` (decisión 12, con `hasVenueMap` de `@/modules/seating`) y `summary={<OrderSummary order={order} changeHref={changeHref} />}`. Metadata sin cambios ("Finalizar compra | Mentec Tickets").
18. **`ReservationTimer`** pasa a banner y cambia su prop `eventSlug` por `retryHref: string`:
    - Bloque `rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3` con `Clock` (`aria-hidden`): "Reservamos tus entradas por **mm:ss**. Completa el pago antes de que se liberen." (`tabular-nums`). Resto igual: `aria-live` por minuto, `Alert` "Tu reserva expiró" con "Volver a elegir entradas" → `retryHref`, `onExpire` una vez, sin animaciones.
19. **`OrderSummary`** gana `changeHref?: string`: si viene, enlace "Cambiar entradas" (`TEXT_LINK` de `@/lib/linkStyles`, `font-semibold`) tras la lista de líneas. Lo demás (incluidos asientos de la spec seating y "Precio final, sin cargos ocultos") no cambia.
20. **`CheckoutForm`** (`"use client"`; props `order: CheckoutOrder`, `changeHref: string`, `summary: ReactNode`). Estructura en orden de DOM:
    1. `ReservationTimer` (`retryHref={changeHref}`, `onExpire` → `isExpired`).
    2. `<form noValidate>` en grilla `grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-12` (sin ancestros con `overflow` distinto de `visible`, para que funcionen los `sticky`):
       - `Card` "Datos del comprador" (`lg:col-start-1 lg:row-start-1`) (h2 `text-xl font-bold`, descripción "Enviaremos tus entradas al correo que indiques."): grilla `sm:grid-cols-2` con Nombres | Apellidos (`given-name`/`family-name`), Correo electrónico (`type="email"`, `email`) | Celular (addon "+51", `type="tel"`, `inputMode="numeric"`, `tel-national`, `maxLength={9}`), Tipo de documento (`Select`, DNI por defecto; al cambiar revalida el número) | Número de documento (`inputMode="numeric"` y `maxLength={8}` solo con DNI). Ids `checkout-<campo>`.
       - `Card` "Método de pago" (`lg:row-start-2`; h2 con id, usado como `aria-labelledby` del radio group): `PaymentMethodFields` y, debajo, el `Alert` destructivo del error de pago (`role="alert"`, `tabIndex={-1}`, recibe el foco al aparecer).
       - Checkbox de Términos (`lg:row-start-3`): "Acepto los [Términos y condiciones](/terminos) y la [Política de privacidad](/privacidad)." (pestaña nueva, `rel="noopener noreferrer"`, `INLINE_LINK`).
       - `CheckoutSummaryPanel` (`order-first lg:order-none lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:sticky lg:top-24 lg:self-start`) con `summary` y, como pie, el botón Pagar (`hidden lg:flex`).
       - Región `sr-only` `role="status"` que dice "Procesando pago…" mientras se procesa.
       - Barra inferior móvil (último hijo del form): `sticky bottom-0 z-30 -mx-4 md:-mx-6 border-t bg-background px-4 md:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden` con el botón Pagar a todo el ancho.
    - **Botón Pagar** (componente interno, `type="submit"`, primario, `h-12 w-full font-semibold`, icono `Lock` `aria-hidden`): "Pagar S/ 910.00" (`formatEventPrice(order.total)` de `@/modules/events/format`). Deshabilitado si `isExpired` o `isSubmitting`. En proceso: `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Procesando pago…".
    - **Envío:** `useZodForm(checkoutFormSchema)` valida; si es inválido, no se llama al service. Si expiró, no hace nada. Oculta el error anterior y llama a `processMockPayment({ order, buyer, payment })` (`payment` = `{ method: "card", cardNumber }` o `{ method }`). Éxito → `await persistOrder(order)` → `router.replace("/checkout/confirmacion?orden=<code>")`. `PaymentError` → su mensaje en el `Alert`; otro error → "Ocurrió un error inesperado al procesar el pago. Inténtalo de nuevo.". Tras un error el botón se reactiva y los valores se conservan.
    - **Precarga** (decisión 4) con `useAuthStore` de `@/modules/auth/session`.
21. **`PaymentMethodFields`** (`"use client"`; props: `values` y `errors` de `paymentMethod`/`cardNumber`/`cardExpiry`/`cardCvv`/`cardName`, `onChange(name, value)`, `onBlur(name)`, `labelledBy`):
    - Aviso (icono `Info`, `text-sm text-muted-foreground`): "Pago simulado: no se realiza ningún cobro y los datos de tu tarjeta no se envían ni se guardan. Prueba con 4242 4242 4242 4242 (aprobada) o 4000 0000 0000 0002 (rechazada)."
    - `RadioGroup` (`grid gap-3 sm:grid-cols-3`) con tres radio cards (patrón "choice card" de shadcn: `FieldLabel` > `Field orientation="horizontal"` > `RadioGroupItem` + `FieldTitle`), `min-h-16`, `cursor-pointer`, seleccionada con `has-data-checked:border-primary has-data-checked:bg-accent`; iconos `CreditCard`, `Smartphone`, `Store` (`aria-hidden`); etiquetas de `PAYMENT_METHOD_LABELS`. Al cambiar: `onChange("paymentMethod", v)` y revalida los 4 campos de tarjeta (`onBlur`).
    - **Tarjeta:** grilla `grid-cols-2 sm:grid-cols-4 gap-4`: "Número de tarjeta" (`col-span-2`, placeholder "0000 0000 0000 0000", `inputMode="numeric"`, `maxLength={19}`, formatea con `formatCardNumber`), "Vencimiento" (placeholder "MM/AA", `inputMode="numeric"`, `maxLength={5}`, `formatCardExpiry`), "CVV" (placeholder "3 o 4 dígitos", `inputMode="numeric"`, `maxLength={4}`, solo dígitos), "Nombre en la tarjeta" (`col-span-2 sm:col-span-4`, placeholder "Como aparece en la tarjeta"). Todos `autoComplete="off"`, `h-11`, ids `checkout-<campo>`, errores con `FieldError`.
    - **Yape:** bloque `rounded-2xl bg-accent p-4` con `Smartphone`: "Al continuar te mostraremos un código QR para pagar desde tu app de Yape."
    - **PagoEfectivo:** mismo bloque con `Store`: "Generaremos un código de pago para que pagues en agentes, bodegas o tu banca móvil."
22. **`CheckoutSummaryPanel`** (`"use client"`; props `title`, `imageUrl`, `ticketCount`, `totalLabel`, `children`, `footer`, `className`): `<aside aria-label="Resumen de la compra">`.
    - Móvil: botón (`lg:hidden`, `min-h-16`, `rounded-2xl ring-1 ring-border`, `aria-expanded`, `aria-controls`) con miniatura `next/image` 48 px (`alt=""`), título (`line-clamp-1`), "3 entradas · S/ 910.00" ("1 entrada" en singular), `sr-only` "Resumen del pedido:" al inicio y `ChevronDown` (`aria-hidden`, rota 180° abierto, `motion-safe:transition-transform`). Plegado por defecto.
    - Contenido (`children`) con id del `aria-controls`: `hidden` si está plegado, siempre `lg:block`. `footer` debajo.

### Fase 4 — Paso 3: `/checkout/confirmacion`
23. **Página** `app/checkout/confirmacion/page.tsx` (Server Component; metadata "Confirmación de compra | Mentec Tickets"): `parseOrderCode(orden)`; `null` → `CheckoutStatusMessage variant="order-not-found"`; si no, `<OrderConfirmation code={code} stepper={<PurchaseStepper currentStep={3} />} />`.
24. **Hook** `modules/checkout/hooks/useStoredOrder.ts` (`"use client"`): `useStoredOrder(code)` → `{ status: "loading" } | { status: "not-found" } | { status: "found"; order: Order }`. Primer render (servidor y cliente) `loading`; al montar `useOrdersStore.persist.rehydrate()` y, al terminar, `found`/`not-found` según `getOrder(code)` (reactivo a cambios del store).
25. **`CheckoutStatusMessage`**: elimina `not-configured`, `payment-processing`, `payment-failed`; `order-not-found` = h1 "No encontramos tu compra", "El enlace no es válido o la compra se realizó en otro navegador.", acción "Volver al inicio".
26. **`OrderConfirmation`** (`"use client"`; props `code`, `stepper: ReactNode`), contenedor `mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-8 md:px-6 md:py-12`:
    - `loading`: `Spinner` + "Cargando tu compra…" (`role="status"`). `not-found`: `CheckoutStatusMessage variant="order-not-found"` (sin stepper).
    - `found`: `stepper` (envuelto en `print:hidden`, ancho completo); cabecera centrada: círculo `bg-accent` con `CircleCheck` `text-primary` (`aria-hidden`, `size-16 md:size-20`), h1 "¡Compra confirmada!" (`text-3xl md:text-4xl font-extrabold tracking-tight`), "Enviamos tus entradas a tu correo. También las tienes siempre en Mis entradas." (`text-muted-foreground`), chip `rounded-full ring-1 ring-border` "Pedido N.º **MT-AB12CD**".
    - `ConfirmationTicketCard` (requisito 27).
    - Acciones (`print:hidden`): "Ver mis entradas" (primario, `Ticket`, → `/mis-entradas`); "Agregar al calendario" (outline, `CalendarPlus`; texto visible "Calendario" en móvil y "Agregar al calendario" desde `sm`, `aria-label="Agregar al calendario"`) → `downloadIcs("<slug>.ics", buildIcsEvent({ title, startsAt, location: "<venue>, <city>", description: "Pedido <code> · N entradas · Mentec Tickets" }))`; "Descargar PDF" (outline, `Download`) → `window.print()`. Móvil: "Ver mis entradas" a todo el ancho y los otros dos en `grid-cols-2`; `sm+`: fila. Todos `h-11` mínimo, `cursor-pointer`.
    - "Qué sigue" (`print:hidden`): h2 "Qué sigue" + `<ol>` (`grid gap-3 md:grid-cols-3`), tarjetas `rounded-2xl ring-1 ring-border` con icono (`Mail`, `QrCode`, `Ticket`, `aria-hidden`): "Revisa tu correo" — "Ahí llegan tus entradas y el comprobante de pago."; "Muestra tu QR" — "Cada entrada tiene su propio QR. Muéstralo desde tu celular en el ingreso."; "Todo en Mis entradas" — "Entra con tu cuenta para ver y descargar tus entradas cuando quieras."
    - Solo impresión (`hidden print:block`): h2 "Tus entradas" y una fila por `OrderTicket` (`break-inside-avoid`): `TicketQr` (`size-28`), código, tipo, asiento (si hay) y "Titular: <holderName>".
27. **`ConfirmationTicketCard`** (presentacional; props `order: Order`): `<article>` `rounded-2xl ring-1 ring-border overflow-hidden`, `flex-col md:flex-row`:
    - Imagen `next/image` (`alt=""`, móvil `h-32 w-full`, `md:w-48 md:h-auto`, `object-cover`).
    - Cuerpo: overline categoría (`EVENT_CATEGORY_LABELS`, `text-xs font-bold uppercase tracking-wider text-primary-strong`), h2 título, "`<formatLongDate>` · `<formatTime>` · `<venue>`, `<city>`" (`text-muted-foreground`), `<dl>` en `grid-cols-3`: "Zona" (nombres de `items` unidos por ", "), "Entradas" (`ticketCount`), "Total pagado" (`formatEventPrice(total)`). Si algún item tiene asientos: "Asientos" con la lista de etiquetas.
    - Talón: separador punteado (`border-dashed`, horizontal en móvil y vertical en `md`) con dos muescas decorativas (`bg-background ring-1 ring-border rounded-full`, `aria-hidden`); `TicketQr value={tickets[0].code}` (`size-40 md:size-32`) y "Entrada 1 de N".
28. **Impresión:** `SiteHeader` (`<header>`) y `SiteFooter` (`<footer>`) añaden `print:hidden`.
29. **Accesibilidad y responsive (Fases 3–4):** un `<h1>` por página; labels visibles; errores junto al campo; foco al primer inválido; foco visible; targets ≥ 44 px; iconos `aria-hidden`; sin scroll horizontal a 375 / 768 / 1024 / 1440; solo tokens; Creato Display; sin emojis; `prefers-reduced-motion` respetado.

### Fase 5 — "Datos y pago" según las capturas
30. **Formateadores de fecha** en `modules/events/utils/formatEvent.ts`, con el mismo `timeZone: "America/Lima"` y `es-PE` que los existentes. Usan `formatToParts`: se toman `weekday`, `day` y `month`, se quitan los puntos y se pasan a minúsculas.
    - `formatShortDayMonth(iso)`: `"2026-10-05T14:00:00-05:00"` → `"lun 5 oct"`; `"2026-11-15T03:00:00Z"` → `"sáb 14 nov"`.
    - `formatLongDayMonth(iso)`: → `"lunes 5 de octubre"`; `"2026-11-15T03:00:00Z"` → `"sábado 14 de noviembre"`.
    - `modules/events/format.ts` las reexporta (sigue sin lógica propia).
31. **`modules/checkout/utils/summaryFormat.ts`** (formateadores del resumen; puro, sin React ni imports de seating; decisiones 24 y 31):
    - `formatTicketCount(count: number): string` → `"1 entrada"` / `"3 entradas"`.
    - `parseSeatPosition(seatId: string): { row: string; number: number } | null`. Usa `/-([A-Z]{1,2})-(\d{1,3})$/` (contrato C, leído desde la derecha). Devuelve `null` si no encaja o si el número es 0.
    - `formatSeatPosition(row: string, number: number): string` → `"Fila L, asiento 9"` (lo usa la entrada imprimible en la Fase 6).
    - `formatCompactSeats(seats: { id: string; label: string }[]): string`. Agrupa por fila: `"Fila L · 9 · Fila M · 8"` y `"Fila L · 9, 10"`. Ordena las filas por longitud y luego alfabéticamente, y los números de menor a mayor. Los ids que no se pueden leer se añaden al final con su `label`, separados por " · ". Con `[]` devuelve `""`.
32. **`app/checkout/page.tsx`:** el h1 "Finalizar compra" pasa a `className="sr-only"`; `CheckoutForm` se llama sin `summary` (decisión 22); deja de importar `OrderSummary`. Lo demás no cambia (stepper, estados de error, `changeHref`, metadata).
33. **`OrderSummary`** (sigue sin directiva; decisiones 22–23):
    - Props: `order`, `changeHref?`, `footer?: ReactNode`. Importa `formatEventPrice` y `formatShortDayMonth` de `@/modules/events/format`.
    - `Card` `rounded-2xl` con h2 `sr-only` "Resumen del pedido".
    - Cabecera `flex gap-3 items-center`: miniatura `next/image` `size-16 rounded-xl object-cover` (`alt=""`, `sizes="64px"`); título `font-bold leading-snug line-clamp-2`; `<p className="text-sm text-muted-foreground">` con `<time dateTime={startsAt}>lun 5 oct</time> · Lugar, Ciudad`.
    - `Separator`. `<ul>` con una línea por item: izquierda "`<quantity>` × `<name>`" (`font-medium`), derecha el subtotal (`font-semibold tabular-nums`, `formatEventPrice(unitPrice × quantity)`). Si el item tiene `seats`, debajo va `<p className="text-sm text-muted-foreground">` con `<span className="sr-only">Asientos: </span>` + `formatCompactSeats(seats)`. Se quita la `<ul aria-label="Asientos de …">` con etiquetas completas.
    - "Cambiar entradas" (si hay `changeHref`), `Separator` discontinuo (decisión 34), fila del total como en el paso 1: a la izquierda `Total <span className="font-normal text-muted-foreground">({formatTicketCount(ticketCount)})</span>` (`font-bold`; p. ej. "Total (3 entradas)", "Total (1 entrada)"), a la derecha el importe (`text-xl font-bold tabular-nums`), "Precio final, sin cargos ocultos" (`text-sm text-muted-foreground`) y `footer`.
34. **`CheckoutSummaryPanel`:** se elimina la prop `footer` y su render (el botón ahora va dentro de `children`). El encabezado plegable móvil ya muestra "3 entradas · S/ 910.00" ("1 entrada" en singular, requisito 22); solo sustituye su ternario en línea por `formatTicketCount(ticketCount)` (mismo texto). Lo demás no cambia (botón plegable móvil, `aria-expanded`/`aria-controls`, `lg:block`).
35. **`CheckoutForm`** (decisiones 17–19, 21–22):
    - Props: `order`, `changeHref` (sin `summary`). Renderiza `<OrderSummary order={order} changeHref={changeHref} footer={<PayButton {...payButtonProps} className="hidden lg:flex" />} />` dentro de `CheckoutSummaryPanel`. La barra inferior móvil no cambia.
    - "Datos del comprador": `CardDescription` "Enviaremos tus entradas al correo que indiques. Los campos con * son obligatorios.". Grilla `sm:grid-cols-2` según la decisión 18: Nombres | Apellidos; Correo (`sm:col-span-2`); Celular | Documento de identidad (decisión 19).
    - Cada etiqueta obligatoria lleva `<RequiredMark />` y cada `input` obligatorio, `required`. El `Checkbox` de Términos lleva `required` y su etiqueta termina con `<RequiredMark />`.
    - `RequiredMark` (`modules/checkout/components/RequiredMark.tsx`, sin directiva): `<span aria-hidden="true" className="ml-0.5 text-destructive">*</span>`. Solo lo usan `CheckoutForm` y `PaymentMethodFields`.
    - **`PayButton`** (componente interno; decisiones 32–33):
      - Props: `totalLabel`, `isProcessing`, `disabled` (= `isExpired || isProcessing`, `disabled` nativo como hoy), `termsPending` y `className`.
      - Raíz `<div className={cn("flex flex-col gap-2", className)}>`: `className` (`hidden lg:flex` en el resumen) se aplica al bloque, así que el aviso se oculta con su botón.
      - Dentro, el `Button` de siempre (`type="submit"`). Con `termsPending`, además: `aria-disabled="true"`, `aria-describedby={hintId}` (`useId`) y las clases `aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-primary aria-disabled:active:not-aria-[haspopup]:translate-y-0`. Es el mismo neutralizado que `STEPPER_CLASS` de `TicketSelector`, ahora para el primario. Sin `termsPending`, ni `aria-disabled` ni `aria-describedby`.
      - Con `termsPending`, debajo del botón: `<p id={hintId} className="text-center text-sm text-muted-foreground">Acepta los términos para continuar.</p>`. Sin `termsPending` no se renderiza.
    - **Envío** (`onSubmit`), en este orden:
      1. Si `isExpired || isProcessing || paymentInFlightRef.current`: `preventDefault` y nada más (como hoy).
      2. Si `!values.acceptTerms`: `preventDefault`, `termsRef.current?.focus()` y `return`. No se llama a `handleSubmit`, así que no hay validación, ni errores, ni llamada al service.
      3. Si no, `handleSubmit(...)` como hoy.
      - `termsRef` (`useRef<HTMLElement>`) va en el `Checkbox` de Términos (el `ref` llega al elemento `role="checkbox"` de Base UI).
    - La barra inferior móvil renderiza `<PayButton {...payButtonProps} />`, con el aviso debajo del botón dentro de la barra.
36. **`PaymentMethodFields`** (decisión 20):
    - Se elimina el aviso "Pago simulado: …" de arriba.
    - "Número de tarjeta", "Vencimiento", "CVV" y "Nombre en la tarjeta" llevan `<RequiredMark />` en la etiqueta y `required` en el input.
    - Al final (tras los campos de tarjeta o el bloque informativo de Yape/PagoEfectivo) va `<p className="flex gap-2 text-sm text-muted-foreground">` con `Info` (`aria-hidden`, `size-4 shrink-0 mt-0.5`): "Demo: no se realiza ningún cobro real." y, solo con `paymentMethod === "card"`, " Tarjetas de prueba: 4242 4242 4242 4242 (aprobada) y 4000 0000 0000 0002 (rechazada).".
    - Radio cards, formatos, `autoComplete="off"` y el resto no cambian.
37. **`modules/checkout/index.ts`:** deja de exportar `OrderSummary` (solo lo importaba la página).
38. **Accesibilidad y responsive (F5):**
    - Un único h1 (`sr-only`), que el lector de pantalla anuncia primero.
    - Ningún nombre accesible incluye "*".
    - El grupo de documento se anuncia como "Documento de identidad", con "Tipo de documento" y "Número de documento" dentro.
    - Orden de tabulación: Nombres → Apellidos → Correo → Celular → Tipo → Número → método → tarjeta → Términos → (móvil: botón del resumen) → "Cambiar entradas" → Pagar. "Pagar" está en ese orden también con Términos sin marcar (`aria-disabled`, sin `disabled`); solo sale de él al expirar la reserva o mientras se procesa (`disabled` nativo, como hoy).
    - El aviso "Acepta los términos para continuar." es la descripción accesible de "Pagar" (`aria-describedby`), no una región `aria-live`: el cambio de estado lo anuncia la propia casilla.
    - Sin scroll horizontal a 375 / 768 / 1024 / 1440. A 375 px, la fila tipo + número cabe sin desbordar (`min-w-0` en el input).
    - Targets ≥ 44 px (`h-11`). Solo tokens.

### Fase 6 — "Confirmación" y entrada imprimible según las capturas
39. **`components/shared/PrintableTicket.tsx`** (presentacional, sin directiva; decisiones 28–30):
    - Props planas:
      ```ts
      type PrintableTicketProps = {
        ticketNumber: number; ticketCount: number;           // "Entrada 1 de 2"
        imageUrl: string; categoryLabel: string; title: string;
        dateLabel: string; timeLabel: string; placeLabel: string; // "lunes 5 de octubre", "14:00 h", "Costa Verde, Lima"
        zoneLabel: string; seatLabel?: string;               // "Tribuna Oriente", "Fila L, asiento 9"
        holderName: string; ticketCode: string; orderCode: string;
        className?: string;
      };
      ```
    - Raíz: `<article aria-label="Entrada {ticketNumber} de {ticketCount}" className={cn("mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-border break-inside-avoid [print-color-adjust:exact]", className)}>`.
    - **Franja de marca:** `flex items-center justify-between bg-primary px-5 py-3 text-primary-foreground`. A la izquierda, `BrandLogo variant="white"` (`h-6 w-auto`, `loading="eager"`; su `alt` "Mentec Tickets" es el texto de la marca). A la derecha, "Entrada {n} de {N}" (`text-sm font-semibold`: blanco sobre primario exige semibold ≥ 14 px, MASTER §2).
    - **Imagen** `next/image` a todo el ancho: `relative aspect-[2/1]`, `fill`, `object-cover`, `alt=""`, `sizes="448px"`, `loading="eager"`.
    - **Cuerpo** (`p-5 flex flex-col gap-3`):
      - Overline de categoría (`text-xs font-bold uppercase tracking-wider text-primary-strong`).
      - Título en `<h3>` (`text-2xl font-bold tracking-tight leading-tight`).
      - `<dl className="grid grid-cols-3 gap-3">` con "Fecha", "Hora" y "Lugar".
    - **Talón:** `relative border-t-2 border-dashed border-input` con dos muescas (`absolute size-6 rounded-full bg-background ring-1 ring-border`, `-left-3`/`-right-3` y `-top-3`, `aria-hidden`).
    - **Bloque inferior** (`p-5 flex gap-5 items-start`):
      - `TicketQr value={ticketCode}` (`size-36 shrink-0 rounded-xl p-2 ring-1 ring-border`).
      - `<dl className="grid grid-cols-2 gap-x-4 gap-y-3 min-w-0">`: "Zona" (`col-span-2`), "Ubicación" (`col-span-2`, solo si hay `seatLabel`), "Titular" (`col-span-2`, `break-words`), "Código" y "Pedido" (`tabular-nums`).
    - **Pie:** `<p className="px-5 pb-5 text-center text-xs text-muted-foreground">Presenta este QR en el ingreso. Cada entrada es válida para una persona.</p>`.
    - Todos los `dt` llevan `text-xs font-medium uppercase tracking-wider text-muted-foreground`, con el texto en caja normal ("Fecha", no "FECHA") para que el lector no deletree. Todos los `dd` llevan `text-sm font-semibold`.
    - Solo tokens (sin índigo ni hex).
40. **`modules/checkout/utils/printableTickets.ts`** (puro):
    - `buildPrintableTickets(order: Order): Omit<PrintableTicketProps, "className">[]` (`import type` de `@/components/shared/PrintableTicket`). Devuelve una entrada por `order.tickets[i]`, en orden:
      - `ticketNumber` `i + 1` y `ticketCount` `tickets.length`;
      - `imageUrl`, `title` y `categoryLabel` (`EVENT_CATEGORY_LABELS[event.category]`);
      - `dateLabel` `formatLongDayMonth(startsAt)`, `timeLabel` `` `${formatTime(startsAt)} h` `` y `placeLabel` `"<venue>, <city>"`;
      - `zoneLabel` `ticket.ticketTypeName`, `holderName`, `ticketCode` `ticket.code` y `orderCode` `order.code`;
      - `seatLabel`:
        - si el slot `i` (de `items.flatMap(item => quantity slots, seat = item.seats?.[q])`) tiene asiento y `parseSeatPosition(seat.id)` lo lee → `formatSeatPosition(row, number)`;
        - si hay asiento pero no se lee → `ticket.seatLabel`;
        - sin asiento → `undefined`.
    - Importa de `@/modules/events/format` (nunca del barrel) y de `./summaryFormat`.
41. **`ConfirmationTicketCard`** (decisión 26):
    - `<article aria-labelledby={id del h2}>`, para distinguirla de las entradas imprimibles.
    - Línea de fecha: `<time dateTime>{formatLongDayMonth(startsAt)}</time> · {venue}, {city}`.
    - Debajo, una `<p className="text-sm text-muted-foreground">` por item con `seats`: "{item.name}: {formatCompactSeats(item.seats)}".
    - `<dl>`: Zona, Entradas y Total pagado como hoy, sin el bloque "Asientos".
    - `print:hidden` en la raíz (decisión 29). Ya no importa `formatLongDate`/`formatTime`.
42. **`OrderConfirmation`:**
    - **Cabecera** (`print:hidden`): "Enviamos tus entradas a <strong className="font-semibold text-foreground break-all">{order.buyer.email}</strong>. También las tienes siempre en Mis entradas." `ConfirmationHeader` recibe `code` y `email` (props planas).
    - **"Qué sigue":** el h2 pasa a `sr-only` (decisión 27). Las tarjetas no cambian.
    - **`PrintableTickets`:**
      - `<section aria-labelledby="order-printable-tickets" className="hidden w-full print:block">` con h2 `sr-only` "Tus entradas".
      - Dentro, `<ol>` con un `<li className="print:break-after-page print:last:break-after-auto">` por cada elemento de `buildPrintableTickets(order)` → `<PrintableTicket {...ticket} />`.
      - Sustituye las filas actuales (QR + código + tipo + asiento + "Titular: …").
    - **Contenedor** `CONTAINER_CLASS` con `print:block print:p-0`, para que el `gap` y el centrado no desplacen las páginas.
43. **Accesibilidad y responsive (F6):**
    - Un único h1. Jerarquía h1 → h2 (tarjeta-entrada, "Qué sigue" `sr-only`, "Tus entradas" `sr-only`) → h3 (título en cada entrada imprimible).
    - El correo largo no provoca scroll horizontal a 375 px (`break-all`).
    - A 375 y 1440 px la pantalla se ve como la captura. Al imprimir, N páginas con una entrada cada una, con la franja de marca en color.
    - Solo tokens. Sin emojis.

### Fase 7 — "Cambiar entradas" conserva la selección
44. **`buildChangeTicketsHref(order, hasMap)`** en `modules/checkout/utils/checkoutOrder.ts` (pura; decisión 35):
    - Firma: `(order: Pick<CheckoutOrder, "event" | "items">, hasMap: boolean) => string`.
    - Parámetros con `URLSearchParams`, en el orden de `items`: `<ticketTypeId>=<quantity>` por item. Si algún item tiene `seats`, al final `asientos` con todos los ids unidos por `,`, en el orden de `items` y de `seats`.
    - `hasMap` → `/eventos/<slug>/entradas?<params>`. Si no → `/eventos/<slug>?<params>#entradas`.
    - Se exporta en `modules/checkout/index.ts` (solo la usa la página).
45. **`app/checkout/page.tsx`:** `const changeHref = buildChangeTicketsHref(order, hasVenueMap(slug))`. Sustituye al ternario actual. Lo demás no cambia: `CheckoutForm` lo pasa a `OrderSummary` y a `ReservationTimer` (`retryHref`).
46. **`parsePreselectedQuantities(ticketTypes, params)`** en `modules/events/utils/ticketOrder.ts` (pura; decisión 37):
    - Firma: `(ticketTypes: Pick<TicketType, "id" | "status">[], params: Pick<URLSearchParams, "getAll">) => Record<string, number>`. `ReadonlyURLSearchParams` de `useSearchParams` encaja.
    - Devuelve solo los tipos con cantidad > 0, en el orden de `ticketTypes`; sin nada válido, `{}`.
47. **`TicketSelector`** gana `initialQuantities?: Record<string, number>`: `useState(() => (soldOut ? {} : (initialQuantities ?? {})))`. Sin la prop, comportamiento idéntico. El total, el aviso de límite y "Continuar con la compra" (`buildCheckoutHref`) reflejan las cantidades precargadas desde el primer render.
48. **`modules/events/components/PreselectedTicketSelector.tsx`** (`"use client"`):
    - Mismas props que `TicketSelector` (`slug`, `status`, `priceFrom`, `ticketTypes`).
    - `const searchParams = useSearchParams()` (de `next/navigation`) y `<TicketSelector {...props} initialQuantities={parsePreselectedQuantities(ticketTypes, searchParams)} />`.
    - Sin más lógica. Se exporta en `modules/events/index.ts`.
49. **`app/eventos/[slug]/page.tsx`**, solo la rama sin mapa del aside (decisión 36):
    ```tsx
    <Suspense fallback={<TicketSelector {...selectorProps} />}>
      <PreselectedTicketSelector {...selectorProps} />
    </Suspense>
    ```
    `selectorProps` = `{ slug, status, priceFrom, ticketTypes }` del evento, como hoy. La rama con mapa (`ZonePricesCard`), `generateStaticParams`, `generateMetadata`, el `id="entradas"` y el resto de la página no cambian.
50. **Accesibilidad (F7):** la precarga no mueve el foco ni anuncia nada: las cantidades ya están en los contadores y en el total desde el primer render del selector. El ancla `#entradas` solo desplaza la vista (`scroll-mt-24`, como hoy).

## Criterios de aceptación

### Fase 1 — Base compartida
- [ ] Dado el refactor, entonces `modules/auth/hooks/` no existe, `LoginForm`/`RegisterForm` importan `@/hooks/useZodForm`, `@/lib/formFields` y `@/lib/linkStyles`, `git diff` sobre `modules/auth/**/*.test.*` está vacío y `npx vitest run modules/auth hooks` pasa.
- [ ] Dado `/login` y `/registro`, entonces se comportan igual que antes (mismos mensajes, foco y enlaces).
- [ ] Dado `modules/auth/session.ts` y `modules/events/format.ts`, entonces solo contienen reexportaciones.
- [ ] Dado `components/ui/radio-group.tsx`, entonces lo generó el CLI de shadcn y exporta `RadioGroup` y `RadioGroupItem`.
- [ ] Dado `<TicketQr value="MT-AB12CD-01" />`, entonces hay un `svg` con `role="img"`, `aria-label="Código QR de la entrada MT-AB12CD-01"` y `viewBox="0 0 21 21"`; renderizarlo dos veces produce el mismo dibujo y otro valor produce uno distinto.
- [ ] Dado `buildIcsEvent` con un evento a las 21:00 de Lima, entonces `DTSTART` está en UTC (`…T020000Z` del día siguiente), los textos con `,`/`;` están escapados, las líneas usan CRLF y ninguna supera 75 octetos.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 2 — Dominio del pago simulado
- [ ] Dado `checkoutFormSchema` con todo vacío y método tarjeta, entonces hay un mensaje para cada campo del comprador, para los 4 de tarjeta y para Términos; con método Yape o PagoEfectivo los campos de tarjeta no se validan.
- [ ] Dado el número `4242 4242 4242 4241`, `13/30`, una fecha del mes anterior o el CVV `12`, entonces los mensajes son, respectivamente, "Ingresa un número de tarjeta válido", "Ingresa una fecha válida (MM/AA)", "La tarjeta está vencida" y "El CVV debe tener 3 o 4 dígitos"; la fecha del mes actual es válida.
- [ ] Dado `processMockPayment` con la tarjeta `4000 0000 0000 0002`, entonces tras ~1,2 s lanza `PaymentError` con "Tu tarjeta fue rechazada. Prueba con otra tarjeta o elige otro método de pago."; con `4242 4242 4242 4242`, Yape o PagoEfectivo devuelve una `Order` con la forma del contrato E.
- [ ] Dado un pedido de 2 General + 1 VIP con un `total` manipulado a 1, entonces la `Order` tiene `total` 910, `ticketCount` 3 y entradas `MT-XXXXXX-01`, `-02` (General) y `-03` (VIP) con `holderName` del comprador; con asientos, cada entrada lleva su `seatLabel`.
- [ ] Dada la `Order` devuelta y lo guardado en `localStorage["mentec-orders"]`, entonces no contienen número de tarjeta, vencimiento, CVV ni nombre de tarjeta (tampoco los últimos 4 dígitos).
- [ ] Dado `modules/checkout/orders.ts`, entonces solo reexporta `useOrdersStore` y los tipos `Order` y `OrderTicket`.
- [ ] Dadas órdenes ya guardadas en `localStorage` y un store sin hidratar, cuando se llama a `persistOrder`, entonces se conservan las anteriores y la nueva queda la primera.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan (sin cambios visibles en la app).

### Fase 3 — Paso 2 `/checkout`
- [ ] Dado `/checkout?evento=noche-de-sintetizadores-lima&general=2&vip=1` en 1440 px, entonces se ven el stepper en el paso 2 ("Datos y pago" con `aria-current="step"`), h1 "Finalizar compra", el banner "Reservamos tus entradas por 10:00. Completa el pago antes de que se liberen.", las secciones "Datos del comprador" y "Método de pago", Términos y, en la columna derecha sticky, el resumen con "Cambiar entradas", total S/ 910.00 y "Pagar S/ 910.00".
- [ ] Dado 375 px, entonces no hay scroll horizontal, el resumen aparece plegado arriba ("3 entradas · S/ 910.00", `aria-expanded="false"`), se despliega al pulsarlo (`aria-expanded="true"`) y la barra inferior con "Pagar S/ 910.00" queda pegada abajo mientras se desplaza el formulario sin tapar el footer al final.
- [ ] Dado el formulario vacío, cuando se pulsa "Pagar", entonces cada campo muestra su mensaje (incluidos tarjeta y Términos), el foco va a "Nombres" y no se llama al service. *(Desde la Fase 5 lo sustituyen los criterios de Términos de la Fase 5: decisión 33.)*
- [ ] Dado "Yape" o "PagoEfectivo" elegido, entonces desaparecen los campos de tarjeta y se ve su texto informativo del diseño; con datos válidos y Términos, "Pagar" aprueba.
- [ ] Dado que se escribe `4242424242424242` y `1230`, entonces los campos muestran `4242 4242 4242 4242` y `12/30`.
- [ ] Dada una sesión iniciada (Ana Quispe), cuando se abre `/checkout`, entonces Nombres, Apellidos y Correo vienen rellenados; sin sesión, vacíos; lo ya escrito no se sobrescribe.
- [ ] Dados datos válidos y la tarjeta `4242 4242 4242 4242`, cuando se pulsa "Pagar", entonces el botón muestra "Procesando pago…" deshabilitado, se anuncia "Procesando pago…" (`role="status"`) y, tras ~1,2 s, se navega (sin entrada en el historial) a `/checkout/confirmacion?orden=MT-XXXXXX`.
- [ ] Dada la tarjeta `4000 0000 0000 0002`, entonces aparece el `Alert` "Tu tarjeta fue rechazada…" con el foco en él, no hay navegación ni orden guardada y se puede reintentar.
- [ ] Dado que pasan 10 minutos, entonces aparece "Tu reserva expiró" con "Volver a elegir entradas" y los botones "Pagar" quedan deshabilitados.
- [ ] Dado "Cambiar entradas" en un evento sin mapa, entonces lleva a `/eventos/<slug>`; en uno con mapa (`hasVenueMap`), a `/eventos/<slug>/entradas`. *(Desde la Fase 7, con los parámetros de la selección: decisión 35.)*
- [ ] Dado un checkout con asientos válidos (contrato C), entonces el resumen los muestra y la orden guarda cada `seatLabel`.
- [ ] Dado el teclado, entonces el orden de tabulación es: comprador → método → tarjeta → Términos → resumen ("Cambiar entradas"; en móvil, antes el botón del resumen) → Pagar, con foco visible en todo; "Pagar" nunca se alcanza antes que los campos.
- [ ] Dado el código, entonces ningún archivo de checkout que se ejecute en el cliente importa `@/modules/events` (salvo `import type`) y no hay `fetch`/axios en el pago.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 4 — Paso 3 `/checkout/confirmacion`
- [ ] Dado un pago aprobado, cuando carga la confirmación, entonces el `<title>` es "Confirmación de compra | Mentec Tickets" y se ven el stepper en el paso 3, h1 "¡Compra confirmada!", "Pedido N.º MT-XXXXXX", la tarjeta-entrada con categoría, título, fecha, lugar, "Zona" "General, VIP", "Entradas" 3, "Total pagado" S/ 910.00, el QR de la entrada `-01` y "Entrada 1 de 3".
- [ ] Dado que se recarga la página de confirmación, entonces la orden se lee de `localStorage` y se ve igual (antes, un breve "Cargando tu compra…").
- [ ] Dado `/checkout/confirmacion` sin `orden`, con un formato inválido o con un código que no está en el navegador, entonces se ve "No encontramos tu compra" con "Volver al inicio" y sin stepper.
- [ ] Dado "Agregar al calendario", entonces se descarga `<slug>.ics` y se puede importar en un calendario con título, fecha y lugar del evento.
- [ ] Dado "Descargar PDF", entonces se abre el diálogo de impresión y la vista previa no muestra header, footer, stepper, botones ni "Qué sigue", y sí la confirmación y una ficha por entrada con su QR, código, tipo, asiento (si hay) y titular.
- [ ] Dado "Ver mis entradas", entonces enlaza a `/mis-entradas`.
- [ ] Dado 375 px, entonces la tarjeta-entrada es vertical (imagen, datos, separador punteado, QR), "Ver mis entradas" ocupa todo el ancho, "Calendario" y "Descargar PDF" van en dos columnas y no hay scroll horizontal; en 1440 px la tarjeta es horizontal con el talón a la derecha.
- [ ] Dado `design-system/ticketera/pages/checkout.md`, entonces describe los layouts de `/checkout` y `/checkout/confirmacion` de esta spec y ya no menciona Stripe.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 5 — "Datos y pago" según las capturas
- [ ] Dado `/checkout?evento=noche-de-sintetizadores-lima&general=2&vip=1` en 1440 px:
  - entonces bajo el stepper solo se ve el banner "Reservamos tus entradas por 10:00. Completa el pago antes de que se liberen." (no se ve el título "Finalizar compra");
  - el DOM tiene un único h1 "Finalizar compra" con `sr-only`.
- [ ] Dado 1440 px, entonces "Datos del comprador" muestra el subtítulo "Enviaremos tus entradas al correo que indiques. Los campos con * son obligatorios." y tres filas:
  - Nombres * | Apellidos *;
  - Correo electrónico * a todo el ancho;
  - Celular * (+51) | Documento de identidad * con el selector "DNI" estrecho y el número en la misma fila.
  - No hay huecos en la grilla y los `*` van en color destructivo.
- [ ] Dado 375 px, entonces los campos van en una columna en ese orden, el selector de tipo y el número caben en una fila sin scroll horizontal, y el resumen plegado y la barra inferior "Pagar S/ 910.00" funcionan como en la Fase 3.
- [ ] Dado "Carné de extranjería" elegido, entonces el selector muestra "CE" y la lista desplegada muestra los nombres completos.
- [ ] Dado un lector de pantalla:
  - entonces cada campo obligatorio se anuncia como requerido (`required`) y su nombre no incluye "asterisco" ni "*" (p. ej. "Nombres");
  - el grupo se anuncia como "Documento de identidad", con "Tipo de documento" y "Número de documento";
  - el h1 "Finalizar compra" es el primer encabezado.
- [ ] Dado el teclado, entonces el orden de tabulación es Nombres → Apellidos → Correo → Celular → Tipo → Número → método → campos de tarjeta → Términos → (móvil: botón del resumen) → "Cambiar entradas" → Pagar, con foco visible, también con Términos sin marcar ("Pagar" sigue siendo alcanzable). Con Términos marcados y el formulario vacío, "Pagar" muestra los errores y enfoca "Nombres" (sin Términos marcados, ver los criterios de Términos).
- [ ] Dada la tarjeta "Método de pago", entonces:
  - no hay aviso arriba de los métodos;
  - al pie se lee "Demo: no se realiza ningún cobro real." con icono de información;
  - con Tarjeta se añaden las tarjetas de prueba (4242… aprobada y 4000…0002 rechazada), y con Yape o PagoEfectivo no aparecen;
  - los 4 campos de tarjeta llevan `*`.
- [ ] Dado 1440 px, entonces el resumen (columna derecha, sticky) es compacto:
  - miniatura, título y "sáb 14 nov · <Lugar>, <Ciudad>" (en minúsculas, sin hora);
  - líneas "2 × General … S/ 500.00" y "1 × VIP … S/ 410.00", sin precio unitario;
  - "Cambiar entradas", un separador **discontinuo**, la fila "Total (3 entradas)" con "S/ 910.00" a la derecha (con 1 entrada: "Total (1 entrada)") y el botón primario azul "Pagar S/ 910.00" con candado **dentro** de la misma tarjeta;
  - al cargar (Términos sin marcar), el botón se ve pálido y debajo, centrado y dentro de la tarjeta, "Acepta los términos para continuar." (como la captura).
- [ ] Dado 375 px, entonces el encabezado plegable del resumen muestra "3 entradas · S/ 910.00" ("1 entrada" en singular) y, al desplegarlo, la fila "Total (3 entradas)".
- [ ] Dado 375 px, entonces al desplegar el resumen no se ve un segundo botón "Pagar" dentro de la tarjeta: solo el de la barra inferior.
- [ ] Dado un checkout con dos asientos de filas distintas (p. ej. `L-9` y `M-8` de "Tribuna Oriente" en el evento que añade seating F6, o cualquier zona numerada existente), entonces el resumen muestra "2 × Tribuna Oriente" y debajo "Fila L · 9 · Fila M · 8" (y el lector lee "Asientos: …").
- [ ] Dado Términos, entonces sigue debajo de "Método de pago" en todos los anchos.
- [ ] Dado `/checkout` recién cargado (Términos sin marcar), a 1440 px y a 375 px, entonces:
  - el "Pagar" visible (tarjeta del resumen en `lg`, barra inferior en móvil) se ve deshabilitado (pálido, cursor "no permitido", sin hover) y tiene `aria-disabled="true"`, pero **no** el atributo `disabled`;
  - debajo de ese botón se lee "Acepta los términos para continuar." (`text-sm text-muted-foreground`, centrado), y el botón lo referencia con `aria-describedby`;
  - con lector de pantalla, "Pagar" se anuncia como no disponible, con esa descripción.
- [ ] Dados Términos sin marcar (con o sin el resto de datos), cuando se pulsa "Pagar" (clic, Enter o Espacio) o se pulsa Enter en un campo, entonces no aparece ningún mensaje de error, no se llama al service, no se muestra "Procesando pago…" y el foco pasa a la casilla de Términos (en móvil, la casilla queda a la vista).
- [ ] Dado que se marcan los Términos, entonces el aviso desaparece, "Pagar" pierde `aria-disabled` y `aria-describedby` y se ve activo. Con datos válidos, paga como en la Fase 3. Con campos vacíos, muestra sus errores y enfoca "Nombres". Si se desmarcan, vuelven el aspecto deshabilitado y el aviso.
- [ ] Dada la reserva expirada, entonces los "Pagar" quedan `disabled` como en la Fase 3 y no se muestra "Acepta los términos para continuar." (aunque Términos no esté marcado). Mientras se procesa, tampoco.
- [ ] Dados importes, entonces siguen el formato del MASTER (`S/ 910.00`).
- [ ] Dado `formatShortDayMonth`/`formatLongDayMonth` y `formatCompactSeats`, entonces cumplen los ejemplos de los requisitos 30–31 (tests).
- [ ] Dado el código, entonces ningún archivo de `modules/checkout` importa de `modules/seating/**` salvo sus entradas públicas, no se modifica `modules/seating/**`, y `OrderSummary` no importa el barrel `@/modules/events`.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 6 — "Confirmación" y entrada imprimible
- [ ] Dado un pago aprobado con el correo `luis@correo.pe`, entonces la confirmación dice "Enviamos tus entradas a **luis@correo.pe**. También las tienes siempre en Mis entradas." (correo en negrita) y conserva "Pedido N.º MT-XXXXXX".
- [ ] Dada la tarjeta-entrada de una compra con asientos (ejemplo de la captura: `Tribuna Oriente`, L-9 y M-8, el 5 de octubre en Costa Verde, Lima; con otro evento, sus datos en el mismo formato), entonces muestra:
  - "lunes 5 de octubre · Costa Verde, Lima" (sin año ni hora);
  - debajo, "Tribuna Oriente: Fila L · 9 · Fila M · 8";
  - "Zona" Tribuna Oriente, "Entradas" 2 y "Total pagado" S/ 310.00;
  - no aparece el bloque "Asientos".
  - Sin asientos, no aparece la línea de asientos.
- [ ] Dada una compra con General y VIP, entonces "Zona" muestra "General, VIP".
- [ ] Dado 1440 px, entonces "Qué sigue" no tiene título visible y sus 3 tarjetas siguen en fila. Con lector de pantalla existe el h2 "Qué sigue", y el único h1 es "¡Compra confirmada!".
- [ ] Dado 375 px, entonces la tarjeta-entrada es vertical, un correo largo no provoca scroll horizontal y las acciones se ven como en la Fase 4.
- [ ] Dado "Descargar PDF" con una compra de 2 entradas, entonces la vista previa de impresión tiene 2 páginas, cada una con una entrada vertical:
  - franja azul de marca con el logo Mentec Tickets en blanco y "Entrada n de 2", impresa en color;
  - imagen del evento, categoría, título, Fecha "lunes 5 de octubre", Hora "14:00 h" y Lugar "Costa Verde, Lima";
  - talón punteado con muescas;
  - QR de esa entrada, Zona "Tribuna Oriente", Ubicación "Fila L, asiento 9" (y "Fila M, asiento 8" en la segunda), Titular, Código `MT-XXXXXX-01`/`-02` y Pedido `MT-XXXXXX`;
  - pie "Presenta este QR en el ingreso. Cada entrada es válida para una persona.";
  - no salen header, footer, stepper, cabecera de confirmación, tarjeta-entrada, acciones ni "Qué sigue".
- [ ] Dada una entrada de zona general (sin asiento), entonces la entrada imprimible omite "Ubicación".
- [ ] Dado `PrintableTicket`, entonces no importa nada de `modules/` ni el tipo `Order`, solo usa tokens y acepta `className`.
- [ ] Dado `design-system/ticketera/pages/checkout.md`, entonces describe los layouts de las Fases 5 y 6 (incluida la anatomía de la entrada imprimible).
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 7 — "Cambiar entradas" conserva la selección
- [ ] Dado `/checkout?evento=festival-arena-y-mar-piura&general=2&vip=1` (evento sin mapa), entonces "Cambiar entradas" enlaza a `/eventos/festival-arena-y-mar-piura?general=2&vip=1#entradas`. Al pulsarlo:
  - el `TicketSelector` del detalle muestra General 2 y VIP 1, con el total "S/ 570.00";
  - la vista queda en el selector;
  - "Continuar con la compra" lleva a `/checkout?evento=festival-arena-y-mar-piura&general=2&vip=1`, con el mismo resumen.
- [ ] Dado ese selector precargado, cuando se cambia una cantidad (p. ej. "−" en VIP), entonces se actualizan el contador, el total y el enlace de "Continuar", como en una selección normal.
- [ ] Dado `/checkout?evento=noche-de-sintetizadores-lima&general=2&vip=1` (con mapa), entonces "Cambiar entradas" enlaza a `/eventos/noche-de-sintetizadores-lima/entradas?general=2&vip=1`. Con asientos, añade `&asientos=<id1>%2C<id2>` en el orden del pedido. La precarga en esa pantalla la verifica la Fase 4 de `seating-stadium-map.md`; hasta entonces la página carga sin errores e ignora los parámetros.
- [ ] Dada la reserva expirada, entonces "Volver a elegir entradas" tiene el mismo `href` que "Cambiar entradas".
- [ ] Dado `/eventos/festival-arena-y-mar-piura?general=abc&vip=99&foo=1`, entonces no se precarga nada y el selector se ve como sin parámetros. Además:
  - con `general=8&vip=5`, queda General 8 y VIP 2 (límite de 10, aviso "Máximo 10 entradas por compra");
  - con un tipo agotado en la URL, ese tipo se ignora;
  - en un evento agotado, se ve "Entradas agotadas" sin precarga.
- [ ] Dado `/eventos/<slug>` sin parámetros, entonces el detalle se ve y se comporta igual que antes de esta fase, y en `npm run build` la ruta `/eventos/[slug]` sigue prerenderizada (SSG, no dinámica `ƒ`).
- [ ] Dado el código, entonces `TicketSelector` no lee la URL, `PreselectedTicketSelector` solo conecta `useSearchParams` con `parsePreselectedQuantities`, y `app/eventos/[slug]/page.tsx` no lee `searchParams`.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

## Diseño técnico
- Rutas (`app/`), consultar `node_modules/next/dist/docs/` (`searchParams` es Promise, `PageProps<"…">`, `useRouter` de `next/navigation`):
  - `app/checkout/page.tsx` (modificada, Fase 3).
  - `app/checkout/confirmacion/page.tsx` (nueva, Fase 4).
- Componentes:
  - shadcn (instalados): `card`, `button`, `field` (`Field`, `FieldLabel`, `FieldTitle`, `FieldError`, `FieldDescription`, `FieldGroup`, `FieldContent`), `input`, `input-group`, `select`, `checkbox`, `alert`, `spinner`, `separator`.
  - shadcn (instalar: `npx shadcn@latest add radio-group`): radio cards de método de pago. No pude consultar `npx shadcn@latest docs/search` (el registro no responde desde este entorno); `checkout-purchase.md` ya verificó que `radio-group` existe en `base-nova` y `@base-ui/react@1.8.0` incluye `radio` y `radio-group`. Si el CLI falla por red, se consulta al usuario (no se escribe a mano).
  - existente (`modules/checkout/components/OrderSummary.tsx`): se extiende con `changeHref`.
  - existente (`modules/checkout/components/ReservationTimer.tsx`): banner y `retryHref`.
  - existente (`modules/checkout/components/CheckoutStatusMessage.tsx`): variantes ajustadas (decisión 13).
  - existente (contrato A, spec seating): `components/shared/PurchaseStepper.tsx`.
  - existente (`components/shared/SiteHeader.tsx`, `SiteFooter.tsx`): solo `print:hidden`.
  - nuevo `components/shared/TicketQr.tsx`: lo usan checkout y tickets (dos dominios); no existe en shadcn.
  - nuevo `modules/checkout/components/CheckoutForm.tsx` (`"use client"`): formulario del paso 2; solo checkout.
  - nuevo `modules/checkout/components/PaymentMethodFields.tsx` (`"use client"`): separado de `CheckoutForm` para que cada archivo tenga una responsabilidad (métodos y tarjeta vs. comprador, envío y layout).
  - nuevo `modules/checkout/components/CheckoutSummaryPanel.tsx` (`"use client"`): plegable móvil / sticky `lg`; no hay `collapsible` instalado y el comportamiento depende del breakpoint (siempre abierto en `lg`), así que basta un `button` con `aria-expanded`.
  - nuevo `modules/checkout/components/OrderConfirmation.tsx` (`"use client"`): lee la orden del store.
  - nuevo `modules/checkout/components/ConfirmationTicketCard.tsx` (presentacional, sin directiva: lo importa `OrderConfirmation`).
- Hooks: `hooks/useZodForm.ts` (movido); nuevo `modules/checkout/hooks/useStoredOrder.ts`.
- Schemas: `lib/formFields.ts` (nuevo, Fase 1); `modules/checkout/schemas/payment.schema.ts` (nuevo, Fase 2). `checkout.schema.ts` no se toca (importa el barrel de `events` y solo lo usa el servidor).
- Utils: `lib/linkStyles.ts`, `lib/calendar.ts` (Fase 1); `modules/checkout/utils/card.ts`, `modules/checkout/utils/order.ts` (Fase 2); `modules/checkout/utils/checkoutOrder.ts` (añade `category`).
- Store: `modules/checkout/stores/orders.store.ts` (Fase 2).
- Service: `modules/checkout/services/payment.service.ts` (mock en cliente, Fase 2).
- Entradas públicas: `modules/auth/session.ts`, `modules/events/format.ts` (Fase 1), `modules/checkout/orders.ts` (Fase 2).
- `modules/checkout/index.ts`: Fase 3 añade `CheckoutForm` y quita `ReservationTimer` (ya lo renderiza `CheckoutForm`); Fase 4 añade `OrderConfirmation` y `parseOrderCode`. Solo lo importan páginas de `app/`.
- Contrato de API (no hay HTTP; contratos entre capas):
  ```ts
  // modules/checkout/types/checkout.types.ts — contrato E (al pie de la letra)
  export type OrderTicket = { code: string /* MT-AB12CD-01 */; ticketTypeName: string; seatLabel?: string; holderName: string };
  export type Order = {
    code: string;            // "MT-" + 6 chars A-Z0-9
    createdAt: string;       // ISO
    ownerEmail: string;      // correo del comprador (en minúsculas)
    event: { slug: string; title: string; category: EventCategory; startsAt: string; venue: string; city: string; imageUrl: string };
    items: { ticketTypeId: string; name: string; unitPrice: number; quantity: number; seats?: { id: string; label: string }[] }[];
    ticketCount: number;
    total: number;           // PEN
    paymentMethod: "card" | "yape" | "pagoefectivo";
    buyer: { firstName: string; lastName: string; email: string; phone: string; documentType: "dni" | "ce" | "passport"; documentNumber: string };
    tickets: OrderTicket[];
  };
  export type OrderBuyer = Order["buyer"];

  // modules/checkout/services/payment.service.ts
  export type MockPaymentInput = {
    order: CheckoutOrder;    // validado en servidor (getCheckoutOrder)
    buyer: OrderBuyer;
    payment: { method: "card"; cardNumber: string } | { method: "yape" } | { method: "pagoefectivo" };
  };
  export function processMockPayment(input: MockPaymentInput): Promise<Order>; // rechaza con PaymentError("card-declined")

  // modules/checkout/stores/orders.store.ts — contrato E
  type OrdersState = { orders: Order[]; addOrder: (order: Order) => void; getOrder: (code: string) => Order | undefined };
  export const useOrdersStore; // persist "mentec-orders", skipHydration: true
  export function persistOrder(order: Order): Promise<void>;

  // components/shared/TicketQr.tsx — contrato F
  export function TicketQr(props: { value: string; className?: string }): JSX.Element;
  export function getQrModules(value: string): boolean[][]; // 21×21

  // lib/calendar.ts — contrato F
  export function buildIcsEvent(input: { title: string; startsAt: string; location: string; description?: string }): string;
  export function downloadIcs(fileName: string, content: string): void;
  ```
  - URL de confirmación: `GET /checkout/confirmacion?orden=MT-XXXXXX` (`orden` validado con `orderCodeSchema`).

### Ampliación (Fases 5 y 6)
- Rutas: `app/checkout/page.tsx` (modificada, F5: h1 `sr-only`, sin `summary`). `app/checkout/confirmacion/page.tsx` no cambia.
- Componentes:
  - shadcn (instalados): `card`, `field` (incluye `FieldSet`, `FieldLegend`), `select` (`SelectValue` con `children` función), `input`, `input-group`, `checkbox`, `separator`, `button`, `radio-group`. No hay que instalar nada. Se revisó shadcn para la marca de obligatorio y para el ticket imprimible: no existe un "required indicator" ni un componente de ticket/boleto. No pude ejecutar `npx shadcn@latest search` (el registro no responde desde este entorno; ver la nota de la Fase 1).
  - existente (`components/shared/BrandLogo.tsx`): `variant="white"` en la franja de la entrada imprimible.
  - existente (`components/shared/TicketQr.tsx`): QR de cada entrada imprimible.
  - existente, modificados: `modules/checkout/components/OrderSummary.tsx` (F5), `CheckoutSummaryPanel.tsx` (F5), `CheckoutForm.tsx` (F5), `PaymentMethodFields.tsx` (F5), `ConfirmationTicketCard.tsx` (F6), `OrderConfirmation.tsx` (F6).
  - nuevo `modules/checkout/components/RequiredMark.tsx` (F5): marca `*` `aria-hidden`. La usan dos componentes del módulo (`CheckoutForm`, `PaymentMethodFields`) en 10 etiquetas. No existe en shadcn. Si otro dominio la necesita (p. ej. el registro), sube a `components/shared`.
  - nuevo `components/shared/PrintableTicket.tsx` (F6): entrada imprimible con props planas. Va en `shared` porque la usan checkout y, en una enmienda posterior, tickets (dos dominios). No existe en shadcn.
- Utils:
  - `modules/events/utils/formatEvent.ts` (+ test) y `modules/events/format.ts` (F5): `formatShortDayMonth`, `formatLongDayMonth`.
  - nuevo `modules/checkout/utils/summaryFormat.ts` (+ test) (F5): `formatTicketCount` (duplicado conocido, decisión 31), `parseSeatPosition`, `formatSeatPosition`, `formatCompactSeats`.
  - nuevo `modules/checkout/utils/printableTickets.ts` (+ test) (F6): `buildPrintableTickets`.
- Hooks, services, schemas, stores, tipos: sin cambios. **Contrato E sin cambios** (`Order`, `OrderTicket`, `OrderBuyer`).
- `modules/checkout/index.ts` (F5): quita `OrderSummary`.
- Contratos nuevos (entre capas):
  ```ts
  // modules/events/utils/formatEvent.ts (reexportados en modules/events/format.ts)
  export function formatShortDayMonth(iso: string): string; // "lun 5 oct"
  export function formatLongDayMonth(iso: string): string;  // "lunes 5 de octubre"

  // modules/checkout/utils/summaryFormat.ts
  export function formatTicketCount(count: number): string;                                   // 1 → "1 entrada", 3 → "3 entradas"
  export function parseSeatPosition(seatId: string): { row: string; number: number } | null; // "tribuna-oriente-L-9" → { row: "L", number: 9 }
  export function formatSeatPosition(row: string, number: number): string;                    // "Fila L, asiento 9"
  export function formatCompactSeats(seats: { id: string; label: string }[]): string;         // "Fila L · 9 · Fila M · 8"

  // components/shared/PrintableTicket.tsx
  export type PrintableTicketProps = {
    ticketNumber: number; ticketCount: number;
    imageUrl: string; categoryLabel: string; title: string;
    dateLabel: string; timeLabel: string; placeLabel: string;
    zoneLabel: string; seatLabel?: string;
    holderName: string; ticketCode: string; orderCode: string;
    className?: string;
  };
  export function PrintableTicket(props: PrintableTicketProps): JSX.Element;

  // modules/checkout/utils/printableTickets.ts
  export function buildPrintableTickets(order: Order): Omit<PrintableTicketProps, "className">[];

  // modules/checkout/components/OrderSummary.tsx
  type OrderSummaryProps = { order: CheckoutOrder; changeHref?: string; footer?: ReactNode };

  // modules/checkout/components/CheckoutForm.tsx
  type CheckoutFormProps = { order: CheckoutOrder; changeHref: string }; // sin `summary`

  // modules/checkout/components/CheckoutSummaryPanel.tsx
  type CheckoutSummaryPanelProps = { title: string; imageUrl: string; ticketCount: number; totalLabel: string; children: ReactNode; className?: string }; // sin `footer`
  ```

### Enmienda (Fase 5: Términos y separador; Fase 7: "Cambiar entradas")
- Rutas:
  - `app/checkout/page.tsx` (F7: `changeHref` con `buildChangeTicketsHref`).
  - `app/eventos/[slug]/page.tsx` (F7: `Suspense` + `PreselectedTicketSelector` en la rama sin mapa). Sigue prerenderizada; no lee `searchParams` (decisión 36).
  - `app/eventos/[slug]/entradas/page.tsx` no se toca aquí (seating, Fase 4).
- Componentes:
  - shadcn (instalados): `button` (Base UI; `aria-disabled` manual, decisión 32), `checkbox` (recibe `ref`), `separator` (variante discontinua por `className`, decisión 34). No hay nada que instalar. shadcn no tiene un "botón con motivo de deshabilitado" ni un separador discontinuo: se resuelve con props y clases.
  - existente, modificado (F5): `modules/checkout/components/CheckoutForm.tsx` (`PayButton` con `termsPending` y aviso, `termsRef`, `onSubmit`), `OrderSummary.tsx` (separador discontinuo). Ya estaban en el plan de la F5.
  - existente, modificado (F7): `modules/events/components/TicketSelector.tsx` (`initialQuantities?`).
  - nuevo `modules/events/components/PreselectedTicketSelector.tsx` (F7, `"use client"`): conecta la URL con el selector. Va en `events` porque solo envuelve `TicketSelector`, que es de `events`. No existe en shadcn. Separado de `TicketSelector` porque `useSearchParams` obliga a un `Suspense` cuyo `fallback` es el propio `TicketSelector`, que por eso no puede leer la URL.
- Utils:
  - `modules/checkout/utils/checkoutOrder.ts` (+ test) (F7): `buildChangeTicketsHref`.
  - `modules/events/utils/ticketOrder.ts` (+ test) (F7): `parsePreselectedQuantities`.
- Barrels (F7): `modules/checkout/index.ts` añade `buildChangeTicketsHref`; `modules/events/index.ts` añade `PreselectedTicketSelector`.
- Hooks, services, schemas, stores, tipos: sin cambios. Contrato E y contrato C sin cambios.
- Contratos nuevos:
  ```ts
  // modules/checkout/utils/checkoutOrder.ts
  export function buildChangeTicketsHref(order: Pick<CheckoutOrder, "event" | "items">, hasMap: boolean): string;
  // hasMap:  "/eventos/<slug>/entradas?general=2&vip=1&asientos=<id>%2C<id>"
  // !hasMap: "/eventos/<slug>?general=2&vip=1#entradas"

  // modules/events/utils/ticketOrder.ts
  export function parsePreselectedQuantities(
    ticketTypes: Pick<TicketType, "id" | "status">[],
    params: Pick<URLSearchParams, "getAll">,
  ): Record<string, number>; // solo tipos no agotados, 1..10 cada uno, suma ≤ 10

  // modules/events/components/TicketSelector.tsx
  type TicketSelectorProps = { slug: string; status: EventStatus; priceFrom: number; ticketTypes: TicketType[]; initialQuantities?: Record<string, number> };

  // modules/events/components/PreselectedTicketSelector.tsx
  export function PreselectedTicketSelector(props: Omit<TicketSelectorProps, "initialQuantities">): JSX.Element;

  // modules/checkout/components/CheckoutForm.tsx (interno)
  type PayButtonProps = { totalLabel: string; isProcessing: boolean; disabled: boolean; termsPending: boolean; className?: string };
  ```

## Reutilización
- `auth`: `useZodForm` (sube a `hooks/`), reglas de `registerSchema` (suben a `lib/formFields.ts`), `INLINE_LINK`/`TEXT_LINK` (suben a `lib/linkStyles.ts`), `useAuthStore` (vía `modules/auth/session.ts`), patrón visual y de tests de `RegisterForm` (campos, "+51", `Select`, `Checkbox`, `Alert`, `Spinner`, `vi.mock` de `next/navigation`), patrón de store persistido con `skipHydration` y su test.
- `checkout` (Fase 1 de `checkout-purchase.md` + extensiones de seating): `getCheckoutOrder`, `CheckoutOrder`, `OrderSummary`, `ReservationTimer`/`useCountdown`, `CheckoutStatusMessage`.
- `events`: `formatEventPrice`, `formatLongDate`, `formatTime`, `EVENT_CATEGORY_LABELS` (vía `modules/events/format.ts`), `EventCategory`/`EventDetail` (`import type`).
- `seating` (contratos A, B, C): `PurchaseStepper`, `hasVenueMap`, `seats` en `CheckoutOrderItem` y su presentación en `OrderSummary`.
- shadcn ya instalados (lista en Diseño técnico) + `radio-group`.
- Nativos: `Intl`, `Blob`, `URL.createObjectURL`, `window.print`, `Math.random`, `localStorage` (vía zustand `persist`), Tailwind `print:`.
- Sin dependencias nuevas.
- (F5–F6) `formatTime`, `formatEventPrice`, `EVENT_CATEGORY_LABELS` (vía `@/modules/events/format`); `BrandLogo` (`variant="white"`); `TicketQr`; `FieldSet`/`FieldLegend`; `SelectValue` con `children` función; patrón de muescas del talón de `ConfirmationTicketCard`; `DOCUMENT_TYPE_LABELS`; utilidades `print:` y `break-after-page` de Tailwind v4. Sin dependencias nuevas ni componentes shadcn nuevos.
- (Enmienda F5/F7):
  - patrón de neutralizado `aria-disabled:*` de `STEPPER_CLASS` (`TicketSelector`);
  - `useId` para el aviso;
  - `URLSearchParams` (como `buildCheckoutHref` y `buildSeatingCheckoutHref`);
  - `MAX_TICKETS_PER_ORDER`;
  - `useSearchParams` + `Suspense` (documentación de Next 16);
  - el ancla `id="entradas"` existente del detalle.

## Tests
- `hooks/useZodForm.test.ts` (F1): movido sin cambios; junto con los tests de `modules/auth` sin cambios deben pasar. `lib/formFields.ts` queda cubierto por `auth.schema.test.ts` y `payment.schema.test.ts` (sin test propio).
- `components/shared/TicketQr.test.tsx` (F1): `role="img"` y `aria-label` con el valor; `viewBox="0 0 21 21"`; `className` se une a las clases base; mismo valor → mismo `d` del path; valores distintos → `d` distinto; `getQrModules` devuelve 21×21 y las tres esquinas tienen el patrón de posición (anillo 7×7, hueco, núcleo 3×3) y separador claro.
- `lib/calendar.test.ts` (F1, `vi.useFakeTimers` + `setSystemTime`): contiene `BEGIN:VCALENDAR`…`END:VCALENDAR` con un `VEVENT`; `DTSTART:20261115T020000Z` para `2026-11-14T21:00:00-05:00`; `DTSTAMP` con la hora fijada; `UID` igual para la misma entrada; escapa `,`, `;`, `\` y saltos de línea; sin `DESCRIPTION` si no viene; todas las líneas separadas por `\r\n`; una descripción larga con tildes se pliega en líneas ≤ 75 octetos y al desplegarla se recupera el texto exacto. `downloadIcs`: con `URL.createObjectURL`/`revokeObjectURL` simulados, crea un `Blob` `text/calendar`, hace `click` en un `<a>` con `download` = nombre dado y revoca la URL.
- `modules/checkout/schemas/payment.schema.test.ts` (F2, fecha fijada): formulario válido con tarjeta (espacios del número eliminados en la salida, textos recortados); válido con Yape y campos de tarjeta vacíos; todo vacío con tarjeta → mensaje en cada campo (comprador, tarjeta, `acceptTerms`); casos de la tabla del requisito 10 (Luhn, 15 dígitos, `13/30`, `00/30`, mes anterior vencido, mes actual válido, CVV `12`/`12345`/`abc` inválidos y `123`/`1234` válidos, nombre `"A"`); DNI de 7 dígitos y celular `812345678` con los mensajes del registro; `orderCodeSchema` acepta `MT-AB12CD` y rechaza `mt-ab12cd`, `MT-AB12C`, `MT-AB12CD1`, `""`.
- `modules/checkout/utils/card.test.ts` (F2): `formatCardNumber` (16 dígitos agrupados, guiones/letras ignorados, recorte a 16, vacío); `formatCardExpiry` (`"1"`, `"12"`, `"122"` → `"12/2"`, `"1228"` → `"12/28"`, `"12/28"` estable, letras ignoradas, recorte a 4 dígitos); `isLuhnValid` (`4242424242424242` y `4000000000000002` válidos, `4242424242424241` inválido); `isCardExpired` con `now` explícito (mes anterior, actual y siguiente; cambio de año).
- `modules/checkout/utils/checkoutOrder.test.ts` (F2): el pedido `ok` incluye `event.category`.
- `modules/checkout/utils/order.test.ts` (F2): `createOrderCode` con `random` simulado produce el código esperado y cumple `^MT-[A-Z0-9]{6}$`; `parseOrderCode` (válido, inválido, array, `undefined`); `buildOrder` según el requisito 13: `ownerEmail` en minúsculas y recortado, `buyer` sin campos extra, `event` con `category`, `items` con `seats`, `total`/`ticketCount` recalculados ignorando un `total` manipulado, códigos `-01..-NN` en orden de items, `seatLabel` en orden de `seats`, `holderName`, `paymentMethod`.
- `modules/checkout/stores/orders.store.test.ts` (F2, mismo patrón que `auth.store.test.ts`): `addOrder` guarda y persiste en `mentec-orders` (la más reciente primero); mismo código reemplaza; `getOrder` encuentra o devuelve `undefined`; `persist.rehydrate` restaura; `persistOrder` con órdenes previas en `localStorage` y store vacío conserva ambas.
- `modules/checkout/services/payment.service.test.ts` (F2, fake timers, `vi.spyOn(globalThis, "fetch")`): no resuelve antes de 1200 ms y sí después; tarjeta `4000 0000 0000 0002` (con espacios) → `PaymentError` `card-declined` con su mensaje; `4242…` → `Order` con `paymentMethod: "card"`; Yape y PagoEfectivo aprueban; `JSON.stringify(order)` no contiene el número de tarjeta; `fetch` nunca se llama.
- `modules/checkout/components/CheckoutForm.test.tsx` (F3; `vi.mock("next/navigation")` con `replace`; `vi.mock("../services/payment.service")` conservando `PaymentError` real; store de órdenes y `useAuthStore` reales con `localStorage` limpio; `summary` simple): envío vacío muestra los errores, enfoca "Nombres" y no llama al service; formato de número y vencimiento al escribir; cambiar a Yape oculta la tarjeta, muestra su texto y el envío válido llama al service con `{ method: "yape" }`; envío válido con tarjeta muestra "Procesando pago…" (botones deshabilitados y `role="status"`), llama al service con `order` (el de la prop), `buyer` (sin `acceptTerms` ni tarjeta) y `{ method: "card", cardNumber: "4242424242424242" }`, guarda la orden en `useOrdersStore` y llama a `replace("/checkout/confirmacion?orden=<code>")`; `localStorage["mentec-orders"]` no contiene el número ni el CVV; rechazo → `Alert` con el mensaje y el foco, botones reactivados, sin navegación ni orden guardada; con sesión se precargan Nombres, Apellidos y Correo; el botón del resumen alterna `aria-expanded`; con fake timers, a los 10 min aparece "Tu reserva expiró", los botones "Pagar" quedan deshabilitados y enviar no llama al service. (Los botones "Pagar" son dos en el DOM de jsdom: usar `getAllByRole`.)
- `modules/checkout/hooks/useStoredOrder.test.ts` (F4, `renderHook`): primer render `loading`; con la orden en `localStorage` → `found` tras rehidratar; sin ella → `not-found`; pasa a `found` si se añade la orden después.
- `modules/checkout/components/OrderConfirmation.test.tsx` (F4; `vi.mock("@/lib/calendar")` conservando `buildIcsEvent` real y `downloadIcs` como `vi.fn`; `window.print` espiado): con una orden guardada muestra h1, "Pedido N.º", datos de la tarjeta (Zona, Entradas, Total pagado), QR con `aria-label` de la entrada `-01`, "Entrada 1 de N", el `stepper` recibido y el enlace "Ver mis entradas" → `/mis-entradas`; "Agregar al calendario" llama a `downloadIcs("<slug>.ics", …)` con un contenido que incluye `SUMMARY:<título>`; "Descargar PDF" llama a `window.print`; la lista de impresión tiene una fila por entrada con su `seatLabel`; código inexistente → "No encontramos tu compra" sin stepper.
- Sin tests: páginas de `app/`, entradas que solo reexportan (`session.ts`, `format.ts`, `orders.ts`, `index.ts`), `OrderSummary`, `ConfirmationTicketCard`, `CheckoutStatusMessage`, `CheckoutSummaryPanel` y `PaymentMethodFields` (cubiertos por `CheckoutForm.test`), `ReservationTimer` (lógica en `useCountdown`), tipos, `components/ui/`.

**Ampliación (Fases 5 y 6):**
- `modules/events/utils/formatEvent.test.ts` (F5, **se añaden casos**, los existentes no cambian):
  - `formatShortDayMonth("2026-10-05T14:00:00-05:00")` → `"lun 5 oct"`;
  - `formatShortDayMonth("2026-11-15T03:00:00Z")` → `"sáb 14 nov"` (día de Lima);
  - `formatLongDayMonth` → `"lunes 5 de octubre"` y `"sábado 14 de noviembre"`;
  - ninguno contiene `.`, `,`, dígitos de año ni hora.
- `modules/checkout/utils/summaryFormat.test.ts` (F5, nuevo):
  - `formatTicketCount`: `1` → `"1 entrada"`, `3` → `"3 entradas"`, `0` → `"0 entradas"`.
  - `parseSeatPosition`: `"tribuna-oriente-L-9"` → `{ row: "L", number: 9 }`, zona con guiones y fila de 2 letras (`"platea-baja-AA-101"`); `"general"`, `"norte-f-12"`, `"norte-F-0"`, `"norte-F-1000"` → `null`.
  - `formatSeatPosition("L", 9)` → `"Fila L, asiento 9"`.
  - `formatCompactSeats`:
    - `[L-9, M-8]` → `"Fila L · 9 · Fila M · 8"`;
    - `[M-8, L-10, L-9]` → `"Fila L · 9, 10 · Fila M · 8"` (orden de filas y números);
    - `[Z-1, AA-1]` → `"Fila Z · 1 · Fila AA · 1"`;
    - un id ilegible añade su `label` al final;
    - `[]` → `""`.
- `modules/checkout/components/CheckoutForm.test.tsx` (F5, **cambian** los existentes):
  - `renderForm()` deja de pasar `summary`. El `OrderSummary` real se renderiza dentro: el test del botón del resumen (`aria-expanded`) sigue igual.
  - El helper `input(label)` pasa de `getByLabelText(label)` a `getByRole("textbox", { name: label })`, y el `queryByLabelText("Número de tarjeta")` del test de Yape a `queryByRole("textbox", { name: "Número de tarjeta" })`. Con el `*` dentro del `<label>`, el texto de la etiqueta es "Nombres*", y la búsqueda exacta por texto falla. El nombre accesible excluye el `aria-hidden` y sigue siendo "Nombres". Que esto funcione verifica la decisión 17. "Número de documento" se busca igual, por su etiqueta `sr-only`.
  - El caso del botón del resumen (`aria-expanded`) añade que su texto contiene "3 entradas · S/ 910.00" (hoy solo busca por `/Resumen del pedido:/`).
  - "envío vacío muestra los errores (comprador, tarjeta y Términos), enfoca 'Nombres'…" pasa a "con Términos marcados, el envío vacío muestra los errores del comprador y de la tarjeta, enfoca 'Nombres' y no llama al service". Primero marca la casilla; ya no espera el mensaje de Términos (decisión 33).
  - "muestra los botones 'Pagar' con el total del pedido" comprueba además que, al cargar, ambos tienen `aria-disabled="true"`, no tienen el atributo `disabled` y su `aria-describedby` apunta a un elemento con el texto "Acepta los términos para continuar.".
  - Los demás casos (formato, Yape, pago aprobado/rechazado, doble envío, precarga, expiración) no cambian de expectativas: sus helpers (`fillBuyer`) ya marcan los Términos antes de pagar.
- `modules/checkout/components/CheckoutForm.test.tsx` (F5, **casos nuevos**):
  - Los campos Nombres, Apellidos, Correo electrónico, Celular, Número de documento y los 4 de tarjeta tienen `required`. El checkbox de Términos tiene `aria-required="true"` o `required`. Ningún nombre accesible contiene "*". Hay `*` con `aria-hidden="true"` en el DOM.
  - Existe un `group` con nombre "Documento de identidad" que contiene el combobox "Tipo de documento" y el textbox "Número de documento". El combobox muestra "DNI".
  - Se lee "Demo: no se realiza ningún cobro real." y, con Tarjeta, "4242 4242 4242 4242". Tras elegir Yape sigue la nota de demo pero no las tarjetas de prueba. Ya no existe el texto "Pago simulado:".
  - Dentro del `complementary` "Resumen de la compra":
    - un botón "Pagar S/ 910.00" en el mismo contenedor que la fila del total (el de la tarjeta);
    - la fila del total con el texto "Total (3 entradas)" y "S/ 910.00". Con un `ORDER` de 1 entrada se lee "Total (1 entrada)" y el botón del resumen móvil dice "1 entrada · S/ …";
    - las líneas "2 × General" y "1 × VIP";
    - "sáb 14 nov · Estadio, Lima".
    - Con un `ORDER` con asientos `[{ id: "tribuna-oriente-L-9", … }, { id: "tribuna-oriente-M-8", … }]` se lee "Fila L · 9 · Fila M · 8".
    - El aviso "Acepta los términos para continuar." del botón de la tarjeta está dentro de ese `complementary`.
  - **Términos y "Pagar"** (decisiones 32–33):
    - con comprador y tarjeta válidos pero Términos sin marcar, `pay()` no llama al service, no muestra ningún mensaje de error (ni el de Términos), no muestra "Procesando pago…" y deja el foco en el `checkbox` de Términos. Lo mismo con `fireEvent.submit(form)`, que es el envío implícito con Enter;
    - al marcar los Términos desaparecen los dos avisos (`queryAllByText("Acepta los términos para continuar.")` vacío) y los botones pierden `aria-disabled` y `aria-describedby`; al desmarcarlos, vuelven;
    - con Términos marcados y datos válidos, el pago sigue el flujo de siempre (cubierto por el caso existente);
    - con la reserva expirada y Términos sin marcar, los botones tienen `disabled` y no hay aviso de términos.
- `modules/checkout/utils/printableTickets.test.ts` (F6, nuevo; fixture con 2 items, uno con asientos y otro sin ellos):
  - una entrada por ticket, en orden, con `ticketNumber` 1..N y `ticketCount` N;
  - `categoryLabel` de la categoría, `dateLabel` `"sábado 14 de noviembre"` para `2026-11-14T21:00:00-05:00`, `timeLabel` `"21:00 h"` y `placeLabel` `"Estadio, Lima"`;
  - `zoneLabel` = `ticketTypeName`, `holderName`, `ticketCode` = código de la entrada y `orderCode` = código del pedido;
  - `seatLabel`:
    - `"Fila A, asiento 1"`/`"Fila A, asiento 2"` en las entradas con asiento (emparejadas por orden);
    - `undefined` en las de la zona sin asientos;
    - con un id de asiento ilegible → `ticket.seatLabel`.
- `modules/checkout/components/OrderConfirmation.test.tsx` (F6, **cambian** los existentes):
  - La tarjeta-entrada se busca con `getByRole("article", { name: "Noche de Sintetizadores" })` (antes `getByRole("article")`): las entradas imprimibles también son `article`, y en jsdom la clase `hidden` no oculta nada.
  - El caso "con una orden guardada…" sigue comprobando h1 único, stepper, "Pedido N.º", categoría, título, Zona "General, VIP", Entradas 3, Total pagado S/ 910.00, el QR `-01`, "Entrada 1 de 3" dentro de la tarjeta, "Ver mis entradas" y el h2 "Qué sigue" (ahora `sr-only`, se encuentra igual por rol).
  - Además comprueba:
    - el texto "Enviamos tus entradas a luis@correo.pe…" con el correo en un `<strong>`;
    - en la tarjeta, "sábado 14 de noviembre · Estadio, Lima" y las líneas "General: Fila A · 1, 2" y "VIP: Fila B · 5";
    - que no existe el término "Asientos".
  - "la lista de impresión tiene una fila por entrada…" **se sustituye** por: la región "Tus entradas" contiene 3 `article` ("Entrada 1 de 3"…"Entrada 3 de 3"). Cada uno tiene:
    - el QR de su código;
    - Zona = tipo, Ubicación ("Fila A, asiento 1", "Fila A, asiento 2", "Fila B, asiento 5"), Titular "Luis Pérez", Código = código de la entrada y Pedido `MT-AB12CD`;
    - Fecha "sábado 14 de noviembre", Hora "21:00 h" y Lugar "Estadio, Lima";
    - el pie "Presenta este QR en el ingreso. Cada entrada es válida para una persona.".
  - Nuevo: con una orden sin asientos, ni las entradas imprimibles muestran "Ubicación" ni la tarjeta-entrada líneas de asientos.
  - Los casos de carga, calendario, `window.print` y "No encontramos tu compra" no cambian.
- Sin tests propios: `PrintableTicket` (presentacional, cubierto por `OrderConfirmation.test`), `RequiredMark`, `OrderSummary`, `CheckoutSummaryPanel`, `ConfirmationTicketCard`, páginas.

**Fase 7:**
- `modules/checkout/utils/checkoutOrder.test.ts` (**se añaden casos**; los existentes no cambian). `buildChangeTicketsHref`:
  - sin mapa, `general` 2 + `vip` 1 → `"/eventos/<slug>?general=2&vip=1#entradas"`;
  - con mapa y sin asientos → `"/eventos/<slug>/entradas?general=2&vip=1"`;
  - con mapa y asientos en dos items → los ids en orden de items y de `seats`, unidos por `%2C`, en `asientos` al final;
  - ida y vuelta: los parámetros de la URL (sin `asientos`), pasados por `parseTicketQuantities`, dan las mismas cantidades que el pedido.
- `modules/events/utils/ticketOrder.test.ts` (**se añaden casos**). `parsePreselectedQuantities` con `new URLSearchParams(...)`:
  - `"general=2&vip=1"` → `{ general: 2, vip: 1 }`;
  - parámetros desconocidos (`evento`, `asientos`, `foo`) ignorados;
  - `"abc"`, `"0"`, `"11"`, `"1.5"`, `"-1"`, `""` y un parámetro repetido (`general=1&general=2`) → ese tipo se ignora;
  - un tipo `sold-out` se ignora;
  - `"general=8&vip=5"` → `{ general: 8, vip: 2 }` (recorte en el orden de `ticketTypes`);
  - sin parámetros → `{}`.
- `modules/events/components/TicketSelector.test.tsx` (**se añaden casos**; los existentes no cambian):
  - con `initialQuantities={{ general: 2 }}` se ven la cantidad 2, el total y el enlace "Continuar con la compra" con `general=2`, y "−" la baja a 1;
  - con `status="sold-out"` e `initialQuantities` se ve "Entradas agotadas" sin controles;
  - `PreselectedTicketSelector`, con `vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal()), useSearchParams: () => new URLSearchParams("general=2&vip=1") }))`, muestra esas cantidades.
- Sin tests propios: `app/eventos/[slug]/page.tsx`, `app/checkout/page.tsx`, barrels.

## Plan de tareas
Coordinación:
- **Orden global:** seating → checkout → tickets → organizer → events-ui-refresh. La Fase 1 no depende de seating; las Fases 2–4 requieren seating implementada (contrato A `PurchaseStepper`, B `hasVenueMap`, C `seats` en `CheckoutOrderItem`, validación de `asientos=` y su presentación en `OrderSummary`). Seating modifica antes que esta spec `checkout.types.ts`, `checkoutOrder.ts`(+test), `checkout.schema.ts`, `checkout.service.ts`(+test) y `OrderSummary.tsx`; aquí se edita sobre su versión.
- **Archivos que consumen otras specs:** `hooks/useZodForm.ts`, `lib/formFields.ts`, `lib/linkStyles.ts`, `modules/auth/session.ts` (organizer, tickets); `modules/checkout/orders.ts`, `components/shared/TicketQr.tsx`, `lib/calendar.ts` (tickets); `modules/events/format.ts` (disponible para tickets/organizer si formatean en cliente). `SiteHeader`/`SiteFooter` reciben `print:hidden`: events-ui-refresh debe conservarlo.
- `/mis-entradas` devuelve 404 hasta que se implemente la spec tickets.
- `docs/specs/checkout-purchase.md`: sus Fases 2–3 quedan reemplazadas; no se implementan ni se marcan.
- No ejecutar dos `npx shadcn add`/`npm install` a la vez.

### Fase 1 — Base compartida
- [x] T1 — Subir código compartido de auth sin cambiar comportamiento (`git mv` del hook y su test; reglas a `lib/formFields.ts`; enlaces a `lib/linkStyles.ts`; entrada `session.ts`; actualizar imports) · archivos: `hooks/useZodForm.ts`, `hooks/useZodForm.test.ts`, `lib/formFields.ts`, `lib/linkStyles.ts`, `modules/auth/schemas/auth.schema.ts`, `modules/auth/components/formShared.ts`, `modules/auth/components/LoginForm.tsx`, `modules/auth/components/RegisterForm.tsx`, `modules/auth/session.ts` (se eliminan `modules/auth/hooks/useZodForm.ts` y su test) · depende de: — · secuencial (base: `lib/`, `hooks/`)
- [x] T2 — Instalar shadcn `radio-group` y crear la entrada `modules/events/format.ts` · archivos: `components/ui/radio-group.tsx` (y `package.json`/`package-lock.json` solo si el CLI los cambia), `modules/events/format.ts` · depende de: T1 · secuencial (`components/ui/`, entrada pública)
- [x] T3 — `TicketQr` con test · archivos: `components/shared/TicketQr.tsx`, `components/shared/TicketQr.test.tsx` · depende de: T2 · paralelo con T4 (archivos nuevos y disjuntos)
- [x] T4 — `lib/calendar.ts` con test · archivos: `lib/calendar.ts`, `lib/calendar.test.ts` · depende de: T2 · paralelo con T3 (archivos nuevos y disjuntos)

### Fase 2 — Dominio del pago simulado
- [x] T1 — Schemas del formulario, utils de tarjeta, tipos (`Order`, `OrderTicket`, `OrderBuyer`, `PaymentMethod`, formulario) y `category` en el pedido, con tests · archivos: `modules/checkout/schemas/payment.schema.ts`, `modules/checkout/schemas/payment.schema.test.ts`, `modules/checkout/utils/card.ts`, `modules/checkout/utils/card.test.ts`, `modules/checkout/types/checkout.types.ts`, `modules/checkout/utils/checkoutOrder.ts`, `modules/checkout/utils/checkoutOrder.test.ts` · depende de: Fase 1 y spec seating · secuencial (base)
- [x] T2 — Store de órdenes, `persistOrder` y entrada pública `orders.ts`, con test · archivos: `modules/checkout/stores/orders.store.ts`, `modules/checkout/stores/orders.store.test.ts`, `modules/checkout/orders.ts` · depende de: T1 · paralelo con T3
- [x] T3 — Utils de orden y service mock de pago, con tests · archivos: `modules/checkout/utils/order.ts`, `modules/checkout/utils/order.test.ts`, `modules/checkout/services/payment.service.ts`, `modules/checkout/services/payment.service.test.ts` · depende de: T1 · paralelo con T2

### Fase 3 — Paso 2 `/checkout`
- [x] T1 — Piezas presentacionales: banner y `retryHref` en `ReservationTimer`, `changeHref` en `OrderSummary`, `CheckoutSummaryPanel` · archivos: `modules/checkout/components/ReservationTimer.tsx`, `modules/checkout/components/OrderSummary.tsx`, `modules/checkout/components/CheckoutSummaryPanel.tsx` · depende de: Fase 2 · paralelo con T2
- [x] T2 — `PaymentMethodFields` (radio cards, campos de tarjeta, textos Yape/PagoEfectivo, aviso de simulación) · archivos: `modules/checkout/components/PaymentMethodFields.tsx` · depende de: Fase 2 · paralelo con T1
- [x] T3 — `CheckoutForm` (comprador, Términos, envío, error, precarga, layout, barra móvil) con test · archivos: `modules/checkout/components/CheckoutForm.tsx`, `modules/checkout/components/CheckoutForm.test.tsx` · depende de: T1, T2 · secuencial
- [x] T4 — Página `/checkout`, barrel y diseño de página (sección `/checkout`) · archivos: `app/checkout/page.tsx`, `modules/checkout/index.ts`, `design-system/ticketera/pages/checkout.md` · depende de: T3 · secuencial

### Fase 4 — Paso 3 `/checkout/confirmacion`
- [x] T1 — `print:hidden` en header y footer del sitio · archivos: `components/shared/SiteHeader.tsx`, `components/shared/SiteFooter.tsx` · depende de: Fase 3 · secuencial (`components/shared/`)
- [x] T2 — Hook `useStoredOrder` con test · archivos: `modules/checkout/hooks/useStoredOrder.ts`, `modules/checkout/hooks/useStoredOrder.test.ts` · depende de: T1 · paralelo con T3
- [x] T3 — `CheckoutStatusMessage` (variantes de la decisión 13) y `ConfirmationTicketCard` · archivos: `modules/checkout/components/CheckoutStatusMessage.tsx`, `modules/checkout/components/ConfirmationTicketCard.tsx` · depende de: T1 · paralelo con T2
- [x] T4 — `OrderConfirmation` (estados, acciones, Qué sigue, lista de impresión) con test · archivos: `modules/checkout/components/OrderConfirmation.tsx`, `modules/checkout/components/OrderConfirmation.test.tsx` · depende de: T2, T3 · secuencial
- [x] T5 — Página `/checkout/confirmacion`, barrel y diseño de página (sección confirmación; quitar menciones a Stripe) · archivos: `app/checkout/confirmacion/page.tsx`, `modules/checkout/index.ts`, `design-system/ticketera/pages/checkout.md` · depende de: T4 · secuencial

Coordinación de la ampliación (Fases 5 y 6):
- **Seating (Fase 6 en paralelo: mapa curvo, "Festival Vive Latino Lima", butacas en arco):**
  - Estas fases no tocan `modules/seating/**` y no dependen de esa fase: funcionan con cualquier evento con o sin mapa.
  - `parseSeatPosition` depende solo del formato de id del contrato C (`<zoneId>-<fila>-<número>`, fila `[A-Z]{1,2}`). Si seating F6 cambia ese formato (p. ej. filas numéricas en el arco), debe avisar y esta función se adapta en la misma enmienda.
  - Si seating publica `parseSeatId` en una entrada pública, checkout puede sustituir su regex (Preguntas abiertas).
  - La etiqueta `seat.label` puede cambiar libremente: checkout ya no la parsea.
- **Events:**
  - F5 T1 añade dos funciones a `modules/events/utils/formatEvent.ts` y a la entrada `modules/events/format.ts` (que creó esta spec).
  - No cambia las existentes ni sus tests.
  - `events-ui-refresh` debe conservarlas si edita esos archivos.
- **Tickets (Mis entradas):**
  - `PrintableTicket` y los formateadores de F5 quedan disponibles.
  - Adoptarlos en el "Descargar PDF" de `/mis-entradas` (Fase 2 de `tickets-my-tickets.md`) requiere una enmienda de esa spec. Esta spec no la edita.
  - Si tickets necesita `buildPrintableTickets`, se expondrá en `modules/checkout/orders.ts` en esa enmienda (hoy YAGNI).
- F6 depende de F5 (formateadores y `summaryFormat`). Se ejecuta una fase por sesión.

### Fase 5 — "Datos y pago" según las capturas
- [ ] T1 — Formateadores de fecha en events (+ casos de test) y formateadores del resumen (`formatTicketCount`, asientos compactos) con test · archivos: `modules/events/utils/formatEvent.ts`, `modules/events/utils/formatEvent.test.ts`, `modules/events/format.ts`, `modules/checkout/utils/summaryFormat.ts`, `modules/checkout/utils/summaryFormat.test.ts` · depende de: Fase 4 · secuencial (base: entrada pública `events/format.ts`)
- [ ] T2 — Resumen compacto con `footer`, separador discontinuo antes del total y "Total (N entradas)"; panel sin `footer` y con `formatTicketCount` · archivos: `modules/checkout/components/OrderSummary.tsx`, `modules/checkout/components/CheckoutSummaryPanel.tsx` · depende de: T1 · paralelo con T3 y T5
- [ ] T3 — `RequiredMark` y `PaymentMethodFields` (nota de demo al pie, tarjetas de prueba solo con Tarjeta, `*` y `required` en tarjeta) · archivos: `modules/checkout/components/RequiredMark.tsx`, `modules/checkout/components/PaymentMethodFields.tsx` · depende de: T1 · paralelo con T2 y T5
- [ ] T4 — `CheckoutForm` (disposición del comprador, grupo de documento, `*`/`required`, Términos con `*`, `OrderSummary` con "Pagar" dentro, sin `summary`; `PayButton` con `termsPending`, `aria-disabled` y aviso "Acepta los términos para continuar."; `termsRef` y foco a Términos en `onSubmit`) con tests actualizados y nuevos; página con h1 `sr-only`; barrel sin `OrderSummary` · archivos: `modules/checkout/components/CheckoutForm.tsx`, `modules/checkout/components/CheckoutForm.test.tsx`, `app/checkout/page.tsx`, `modules/checkout/index.ts` · depende de: T2, T3 · secuencial
- [ ] T5 — Diseño de página, sección `/checkout` (layout sin h1 visible, disposición del comprador, nota de demo, resumen compacto con separador discontinuo y "Pagar" dentro, `*`, estados de "Pagar": procesando / expirado / Términos pendientes con aviso / activo) · archivos: `design-system/ticketera/pages/checkout.md` · depende de: T1 · paralelo con T2 y T3 (y con T4: archivos disjuntos)

### Fase 6 — "Confirmación" y entrada imprimible
- [ ] T1 — `PrintableTicket` (props planas, franja de marca, talón, `[print-color-adjust:exact]`, imágenes `eager`) · archivos: `components/shared/PrintableTicket.tsx` · depende de: Fase 5 · secuencial (`components/shared/`)
- [ ] T2 — `buildPrintableTickets` con test · archivos: `modules/checkout/utils/printableTickets.ts`, `modules/checkout/utils/printableTickets.test.ts` · depende de: T1 · paralelo con T3 y T5
- [ ] T3 — `ConfirmationTicketCard` (fecha "lunes 5 de octubre" sin año ni hora, asientos compactos por zona, sin "Asientos", `aria-labelledby`, `print:hidden`) · archivos: `modules/checkout/components/ConfirmationTicketCard.tsx` · depende de: T1 · paralelo con T2 y T5
- [ ] T4 — `OrderConfirmation` (correo en negrita, "Qué sigue" `sr-only`, cabecera `print:hidden`, lista de `PrintableTicket` con salto de página) con tests actualizados y nuevos · archivos: `modules/checkout/components/OrderConfirmation.tsx`, `modules/checkout/components/OrderConfirmation.test.tsx` · depende de: T2, T3 · secuencial
- [ ] T5 — Diseño de página, sección confirmación e impresión (anatomía de la entrada imprimible) · archivos: `design-system/ticketera/pages/checkout.md` · depende de: T1 · paralelo con T2, T3 y T4

Coordinación de la Fase 7:
- **Depende de la Fase 5** (modifica de nuevo `app/checkout/page.tsx` y `modules/checkout/index.ts`, que toca la F5 T4). **No depende de la Fase 6**: se puede ejecutar antes o después, pero no en la misma sesión que otra fase de esta spec.
- **Events:**
  - toca `modules/events/utils/ticketOrder.ts`(+test), `TicketSelector.tsx`(+test), `modules/events/index.ts` y `app/eventos/[slug]/page.tsx`;
  - no se ejecuta a la vez que una fase de `events-ui-refresh.md` que toque esos archivos;
  - sin parámetros, `TicketSelector` se comporta igual, así que sus criterios de "`TicketSelector` sin cambios" siguen cumpliéndose.
- **Seating:**
  - la precarga del mapa es la **Fase 4 de `seating-stadium-map.md`**, que usa el mismo formato de URL (contrato C sin `evento`);
  - las dos fases son independientes: cada una funciona sola. La prueba de ida y vuelta con mapa necesita las dos.

### Fase 7 — "Cambiar entradas" conserva la selección (3 tareas, 11 archivos)
- [ ] T1 — `buildChangeTicketsHref` con tests, exportarla en el barrel y usarla en la página `/checkout` · archivos: `modules/checkout/utils/checkoutOrder.ts`, `modules/checkout/utils/checkoutOrder.test.ts`, `modules/checkout/index.ts`, `app/checkout/page.tsx` · depende de: Fase 5 · paralelo con T2 (archivos disjuntos, otro módulo)
- [ ] T2 — `parsePreselectedQuantities` con tests, `initialQuantities` en `TicketSelector` y nuevo `PreselectedTicketSelector`, con tests · archivos: `modules/events/utils/ticketOrder.ts`, `modules/events/utils/ticketOrder.test.ts`, `modules/events/components/TicketSelector.tsx`, `modules/events/components/TicketSelector.test.tsx`, `modules/events/components/PreselectedTicketSelector.tsx` · depende de: Fase 5 · paralelo con T1
- [ ] T3 — Barrel de events y página de detalle con `Suspense` + `PreselectedTicketSelector` (rama sin mapa); diseño de página (`/checkout`: "Cambiar entradas" conserva la selección) · archivos: `modules/events/index.ts`, `app/eventos/[slug]/page.tsx`, `design-system/ticketera/pages/checkout.md` · depende de: T1, T2 · secuencial. Verificar en `npm run build` (lo ejecuta el reviewer) que `/eventos/[slug]` sigue prerenderizada.

## Preguntas abiertas
1. **Yape y PagoEfectivo:** los textos del diseño prometen un QR de Yape y un código de pago, pero en la simulación "Pagar" aprueba al instante. ¿Se mantienen los textos tal cual, se cambian por algo como "En esta demo el pago se aprueba al instante", o se simula un paso intermedio con QR/código?
2. **"Enviamos tus entradas a tu correo"** (confirmación y "Qué sigue"): no se envía ningún correo. ¿Se mantiene el texto del diseño o se cambia mientras no exista envío?
3. **Confirmar correo:** el diseño no lo tiene y se omitió, pero "Mis entradas" filtra por `ownerEmail`: un error al escribir el correo deja la compra fuera de "Mis entradas" de esa cuenta. ¿Se añade "Confirmar correo electrónico"?
4. **Duración en el calendario:** los eventos no tienen hora de fin, así que el `.ics` no lleva `DTEND` (algunos calendarios lo muestran como un evento de 0 minutos). ¿Se fija una duración por defecto (p. ej. 3 h) o se añade `endsAt` a los eventos?
5. **"Cambiar entradas"** vuelve al paso 1 sin conservar la selección actual (ni el `TicketSelector` ni, que yo sepa, el plano de seating leen parámetros de preselección). ¿Debe conservarse?
6. **Tarjetas aceptadas:** solo 16 dígitos con formato 4-4-4-4 (no Amex de 15), aunque el CVV admite 4 dígitos como en el diseño. ¿Se aceptan también tarjetas de 15 dígitos?
7. **Autocompletado de tarjeta:** se usa `autoComplete="off"` (decisión 5) en lugar de `cc-*` del diseño. ¿De acuerdo, al menos mientras el pago sea simulado?
8. **Alcance del almacenamiento:** las órdenes viven solo en el `localStorage` de ese navegador; en otro dispositivo no aparecen y la confirmación muestra "No encontramos tu compra". ¿Aceptable para la demo?
9. **`checkout-purchase.md`:** sigue aprobada con sus Fases 2–3 (Stripe) sin marcar. ¿Quieres anotar tú en ese archivo que quedan reemplazadas por esta spec? (Los agentes no la editan.)

Ampliación (Fases 5 y 6):

10. **Importes sin decimales:** las capturas muestran "S/ 310" y la app usa "S/ 310.00" (formato del MASTER §10). Se mantiene el MASTER. ¿Quieres "S/ 310" en todo el sitio? Eso cambiaría `formatEventPrice`, el MASTER y los tests de varios módulos, fuera de esta spec.
11. **Ubicación en entradas sin asiento:** la entrada imprimible omite "Ubicación" en zonas de pie (decisión 30). ¿Prefieres un texto, p. ej. "Entrada general · sin asiento asignado"?
12. **Tarjetas de prueba:** se muestran en la nota de demo solo con el método Tarjeta (decisión 20). ¿Las quieres en otro sitio o fuera de la UI (p. ej. solo en la documentación)?
13. **Lectura del id de asiento en checkout:** `parseSeatPosition` repite el conocimiento de `SEAT_ID_PATTERN` (seating), porque `parseSeatId` no está en ninguna entrada pública de seating y esta fase no toca `modules/seating/**`. ¿Se pide a la spec seating que exponga `parseSeatId` (p. ej. en `seats.ts`) en su próxima enmienda, para que checkout lo use y borre su regex?
14. **Precio unitario en el resumen:** la captura no lo muestra y se quita (decisión 23). ¿De acuerdo, o se conserva "2 × S/ 155.00" en pequeño?
15. **"Precio final, sin cargos ocultos"**: la captura del resumen no lo muestra, pero se mantiene bajo el total (era requisito de `checkout-purchase.md` y del MASTER, anti-patrón "cargos ocultos"). ¿Se mantiene?
16. **Impresión:** al "Descargar PDF" solo salen las entradas, una por página, sin la cabecera "¡Compra confirmada!" ni la tarjeta-entrada (decisión 29). ¿De acuerdo?
17. **Mis entradas:** ¿se enmienda `tickets-my-tickets.md` para que su "Descargar PDF" use `PrintableTicket` (misma salida en ambos sitios)? Si es así, `buildPrintableTickets` se publicaría en `modules/checkout/orders.ts`.
18. **`formatTicketCount` triplicado:** hay copias idénticas en seating (`utils/selectionSummary.ts`), tickets (`utils/myOrders.ts`) y ahora checkout (`utils/summaryFormat.ts`), porque ninguna es pública y esta fase no toca otros módulos (decisión 31). ¿Se sube a `lib/` en una enmienda conjunta de las tres specs, y se borran las copias?
