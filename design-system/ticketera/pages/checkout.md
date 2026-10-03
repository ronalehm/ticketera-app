# Página: checkout `/checkout` y `/checkout/confirmacion`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/checkout-mock-payment.md` (Fases 3 y 4; base en `docs/specs/checkout-purchase.md` Fase 1).

Pasos 2 ("Datos y pago", `/checkout`) y 3 ("Confirmación", `/checkout/confirmacion`) de la compra. El pago es **simulado**: no hay pasarela ni se envían datos a ningún servicio; los datos de tarjeta solo existen en el estado del formulario. La orden aprobada se guarda solo en el navegador (`localStorage`).

## Paso 2: `/checkout`

### Layout

```
Header sticky     (igual que la landing)
Stepper           franja border-b: ① Entradas — ② Datos y pago — ③ Confirmación · "Compra segura"
                  (móvil: "Paso 2 de 3" + "Datos y pago" + barra de progreso al 66 %)
h1 "Finalizar compra"
Banner            [reloj] Reservamos tus entradas por mm:ss. Completa el pago antes de que se liberen.
┌──────────────────────────────┬──────────────┐
│ Datos del comprador          │ Resumen del  │  columna derecha 380px,
│ Nombres | Apellidos          │ pedido       │  sticky lg:top-24
│ Correo  | Celular (+51)      │ (OrderSummary│
│ Tipo doc| Número de documento│ + "Cambiar   │
├──────────────────────────────┤  entradas")  │
│ Método de pago               │              │
│ (i) Pago simulado…           │ [Pagar S/ X] │
│ [Tarjeta][Yape][PagoEfectivo]│              │
│ Número | Venc. | CVV         │              │
│ Nombre en la tarjeta         │              │
│ [Alert error de pago]        │              │
├──────────────────────────────┤              │
│ ☐ Acepto los Términos… y la  │              │
│   Política de privacidad.    │              │
└──────────────────────────────┴──────────────┘
Barra inferior (< lg)  [Pagar S/ X]  (botón a todo el ancho)
Footer            (igual que la landing)
```

- Stepper (`components/shared/PurchaseStepper`, `currentStep={2}`) fuera del contenedor, a ancho completo, con su propio `max-w-7xl` (como en `/eventos/[slug]/entradas`).
- Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-8 md:pb-12`, `flex flex-col gap-6`: h1 y `CheckoutForm` (banner + formulario).
- h1: `text-3xl md:text-5xl font-extrabold tracking-tight` (como `/eventos`). Único h1; los estados de error (`CheckoutStatusMessage`) sustituyen la página entera con su propio h1 y sin stepper.
- Formulario `<form noValidate>` en grilla `grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-12`, sin ancestros con `overflow` distinto de `visible` (para los `sticky`). Columna izquierda con posición explícita: comprador (`row-start-1`), método de pago (`row-start-2`), Términos (`row-start-3`). Columna derecha: `CheckoutSummaryPanel` (`lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:sticky lg:top-24 lg:self-start`).
- Secciones en `Card rounded-2xl`, h2 `text-xl font-bold`. "Datos del comprador" lleva la descripción "Enviaremos tus entradas al correo que indiques."; campos en `sm:grid-cols-2`, todos `h-11`.
- **Orden del DOM:** banner → comprador → método de pago → Términos → resumen (con "Pagar" en `lg`) → estado `sr-only` → barra móvil. "Pagar" nunca se alcanza con el tabulador antes que los campos.
- **Móvil (< lg):** el resumen sube con `order-first` como botón plegable (único cambio entre orden visual y de tabulación); "Pagar" vive en la barra inferior `sticky bottom-0 z-30 lg:hidden`, a ancho completo (`-mx-4 md:-mx-6`), `border-t bg-background`, `pb-[max(0.75rem,env(safe-area-inset-bottom))]`. Es `sticky`, no `fixed`: se queda pegada abajo mientras se rellena y no tapa el footer al final.
- **Un solo resumen, nunca duplicado.** El botón "Pagar" sí se renderiza dos veces (panel `hidden lg:flex` y barra `lg:hidden`); `display:none` deja solo uno visible y accesible en cada ancho.

### Banner del temporizador (`ReservationTimer`)

- Bloque `rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3` con `Clock` (`aria-hidden`): "Reservamos tus entradas por **mm:ss**. Completa el pago antes de que se liberen." (`tabular-nums`, sin animaciones).
- Anuncio `aria-live="polite"` `sr-only` solo al cambiar el minuto.
- Al expirar (10 min): `Alert` destructivo "Tu reserva expiró" con "Volver a elegir entradas" (`h-11`) hacia el paso 1, y los botones "Pagar" quedan deshabilitados.

### Resumen (`CheckoutSummaryPanel` + `OrderSummary`)

- `<aside aria-label="Resumen de la compra">`.
- Móvil: botón `lg:hidden min-h-16 rounded-2xl ring-1 ring-border` con `aria-expanded`/`aria-controls`: miniatura 48 px (`alt=""`), título `line-clamp-1`, "3 entradas · S/ 910.00" ("1 entrada" en singular), `sr-only` "Resumen del pedido:" y `ChevronDown` (`aria-hidden`, rota 180° abierto, `motion-safe:transition-transform`). Plegado por defecto; en `lg` el contenido siempre se ve.
- `OrderSummary`: miniatura `next/image` `aspect-[4/3] w-24 rounded-lg`, título `line-clamp-2`, fecha overline, "Lugar, Ciudad", líneas "`<cantidad>` × `S/ <precio>`" con subtotal (y asientos si los hay), enlace "Cambiar entradas" (`TEXT_LINK font-semibold`), total `text-xl font-bold tabular-nums` y siempre "Precio final, sin cargos ocultos".
- "Cambiar entradas" y "Volver a elegir entradas" llevan al paso 1: `/eventos/<slug>/entradas` si el evento tiene mapa (`hasVenueMap`), si no `/eventos/<slug>`.

### Método de pago (`PaymentMethodFields`)

- Aviso `text-sm text-muted-foreground` con `Info`: "Pago simulado: no se realiza ningún cobro y los datos de tu tarjeta no se envían ni se guardan. Prueba con 4242 4242 4242 4242 (aprobada) o 4000 0000 0000 0002 (rechazada)."
- `RadioGroup` nombrado por el h2 de la sección, `grid gap-3 sm:grid-cols-3`: radio cards (patrón "choice card" de shadcn) `min-h-16 cursor-pointer`, seleccionada `border-primary bg-accent`; iconos `CreditCard` (Tarjeta), `Smartphone` (Yape), `Store` (PagoEfectivo), `aria-hidden`.
- Tarjeta: grilla `grid-cols-2 sm:grid-cols-4 gap-4`: "Número de tarjeta" (`col-span-2`, "0000 0000 0000 0000", se agrupa de 4 en 4), "Vencimiento" ("MM/AA"), "CVV" ("3 o 4 dígitos"), "Nombre en la tarjeta" (ancho completo). Todos `autoComplete="off"` (simulación: no se invita a guardar tarjetas reales), `inputMode="numeric"` en los numéricos, `h-11`.
- Yape / PagoEfectivo: sin campos; bloque `rounded-2xl bg-accent p-4` con su icono y el texto informativo.
- Error de pago: `Alert` destructivo bajo los métodos, recibe el foco al aparecer (p. ej. "Tu tarjeta fue rechazada…").

### Botón "Pagar"

- Primario, `type="submit"`, `h-12 w-full font-semibold`, icono `Lock` (`aria-hidden`): "Pagar S/ 910.00".
- No se deshabilita por Términos sin marcar (se valida al enviar y se enfoca el primer error). Solo se deshabilita al expirar la reserva y mientras se procesa: `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Procesando pago…", anunciado en una región `sr-only` `role="status"`.

### Reglas específicas

- Formulario: errores al enviar, revalidación al salir del campo tras el primer intento, foco al primer inválido, `aria-invalid` + `aria-describedby`, error junto al campo (`FieldError`).
- Términos: checkbox con "Acepto los Términos y condiciones y la Política de privacidad." (enlaces `INLINE_LINK`, pestaña nueva).
- Estados (`not-found`, `sold-out`, `invalid-tickets`, `free`): patrón del 404 de evento (centrado, h1 + descripción + acciones `h-11`); siempre con salida.
- Sin scroll horizontal a 375 / 768 / 1024 / 1440; targets ≥ 44 px; solo tokens; sin emojis.
- Metadata: `Finalizar compra | Mentec Tickets`.

## Paso 3: `/checkout/confirmacion`

URL `/checkout/confirmacion?orden=MT-XXXXXX` (a ella se llega con `router.replace` tras el pago aprobado). La página (Server Component) valida `orden` (`parseOrderCode`); si falta o es inválido muestra directamente "No encontramos tu compra". Si es válido, `OrderConfirmation` lee la orden del store persistido (`useStoredOrder`).

### Layout

```
Header sticky     (igual que la landing; oculto al imprimir)
Stepper           franja border-b, paso 3 "Confirmación" activo (oculto al imprimir)
        (CircleCheck en círculo bg-accent)
        h1 "¡Compra confirmada!"
        Enviamos tus entradas a tu correo. También las tienes siempre en Mis entradas.
        ( Pedido N.º MT-AB12CD )
┌────────┬───────────────────────────────────┬╌╌╌╌╌╌╌╌╌╌┐
│ imagen │ CATEGORÍA                         ┆  [QR]    │  tarjeta-entrada
│        │ Título del evento                 ┆ Entrada  │  (md+: horizontal,
│        │ Fecha · hora · Lugar, Ciudad      ┆ 1 de N   │   talón a la derecha)
│        │ Zona | Entradas | Total pagado    ┆          │
└────────┴───────────────────────────────────┴╌╌╌╌╌╌╌╌╌╌┘
[Ver mis entradas]  [Agregar al calendario]  [Descargar PDF]   (ocultos al imprimir)
Qué sigue: [Revisa tu correo] [Muestra tu QR] [Todo en Mis entradas]   (oculto al imprimir)
Footer            (igual que la landing; oculto al imprimir)
```

- Stepper (`PurchaseStepper currentStep={3}`): la página lo pasa como prop `stepper` a `OrderConfirmation`, que lo pinta fuera del contenedor, a ancho completo y envuelto en `print:hidden`, solo cuando encuentra la orden.
- Contenedor `mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 md:px-6 py-8 md:py-12`.
- Cabecera centrada: círculo `bg-accent` con `CircleCheck` `text-primary` (`aria-hidden`, `size-16 md:size-20`); h1 `text-3xl md:text-4xl font-extrabold tracking-tight` (único h1); texto `text-muted-foreground`; chip `rounded-full ring-1 ring-border` "Pedido N.º **MT-AB12CD**".

### Tarjeta-entrada (`ConfirmationTicketCard`)

- `<article>` `rounded-2xl ring-1 ring-border overflow-hidden`, `flex-col md:flex-row`.
- Imagen `next/image` (`alt=""`, `object-cover`): móvil `h-32 w-full`, `md:w-48 md:h-auto`.
- Cuerpo: overline de categoría (`text-xs font-bold uppercase tracking-wider text-primary-strong`), h2 título, "Fecha · hora · Lugar, Ciudad" (`text-muted-foreground`), `<dl>` en `grid-cols-3`: "Zona" (nombres de las zonas unidos por ", "), "Entradas", "Total pagado" (`S/ 910.00`); "Asientos" si la compra los tiene.
- Talón: separador punteado (`border-dashed`; horizontal en móvil, vertical en `md`) con dos muescas decorativas (`bg-background ring-1 ring-border rounded-full`, `aria-hidden`); `TicketQr` de la primera entrada (`size-40 md:size-32`) y "Entrada 1 de N".
- **Móvil:** vertical (imagen, datos, separador, QR). **md+:** horizontal con el talón a la derecha.

### Acciones

- "Ver mis entradas" (primario, `Ticket`, enlace a `/mis-entradas`).
- "Agregar al calendario" (outline, `CalendarPlus`; texto visible "Calendario" en móvil y "Agregar al calendario" desde `sm`, `aria-label="Agregar al calendario"`): descarga `<slug>.ics` con título, fecha, "Lugar, Ciudad" y "Pedido <código> · N entradas · Mentec Tickets".
- "Descargar PDF" (`TicketsPdfButton` outline, `Download`): genera en el navegador y descarga `mentec-<pedido>.pdf` (p. ej. `mentec-MT-AB12CD.pdf`), A4 con una página por entrada del pedido (anatomía, colores y fuente en MASTER §7 "PDF de entradas"). Recibe `buildTicketPdfInput(order)`; jsPDF se carga solo al pulsar. No abre el diálogo de impresión.
  - **Reposo:** `Download` + "Descargar PDF".
  - **Generando:** `Spinner` (`aria-hidden`, `size-5 motion-reduce:animate-none`) + "Generando…"; `aria-busy="true"` y `aria-disabled="true"` (`disabled` + `focusableWhenDisabled`: conserva el foco y no admite un segundo clic); `cursor-progress opacity-70`; región `sr-only` `role="status"` anuncia "Generando PDF…".
  - **Error:** vuelve a reposo y muestra debajo "No pudimos generar el PDF. Inténtalo de nuevo." (`role="alert"`, `text-sm text-destructive`, `col-span-2 text-center sm:basis-full`: ocupa las dos columnas en móvil y la línea completa desde `sm`). Al reintentar, el mensaje desaparece.
- **Móvil:** "Ver mis entradas" a todo el ancho y los otros dos en `grid-cols-2`. **sm+:** en fila. Todos `h-11` mínimo, `cursor-pointer`, iconos `aria-hidden`.

### Qué sigue

- h2 "Qué sigue" + `<ol>` `grid gap-3 md:grid-cols-3` de tarjetas `rounded-2xl ring-1 ring-border` con icono (`Mail`, `QrCode`, `Ticket`, `aria-hidden`):
  - "Revisa tu correo" — "Ahí llegan tus entradas y el comprobante de pago."
  - "Muestra tu QR" — "Cada entrada tiene su propio QR. Muéstralo desde tu celular en el ingreso."
  - "Todo en Mis entradas" — "Entra con tu cuenta para ver y descargar tus entradas cuando quieras."

### Impresión (Ctrl+P)

Ningún botón imprime; las clases `print:` solo limpian la impresión manual del navegador.

- Ocultos (`print:hidden`): header, footer, stepper, acciones y "Qué sigue".
- Visibles: cabecera de confirmación y tarjeta-entrada.

### Estados

- **Cargando** (primer render y rehidratación del store): `Spinner` + "Cargando tu compra…" (`role="status"`), sin stepper.
- **No encontrada** (sin `orden`, formato inválido o código que no está en este navegador): `CheckoutStatusMessage variant="order-not-found"`: h1 "No encontramos tu compra", "El enlace no es válido o la compra se realizó en otro navegador." y "Volver al inicio"; sin stepper.

### Reglas específicas

- El QR (`TicketQr`) es decorativo y determinista (`role="img"` con `aria-label` "Código QR de la entrada <código>"); no es legible por lectores.
- Sin scroll horizontal a 375 / 768 / 1024 / 1440; targets ≥ 44 px; solo tokens; sin emojis; `prefers-reduced-motion` respetado.
- Metadata: `Confirmación de compra | Mentec Tickets`.
