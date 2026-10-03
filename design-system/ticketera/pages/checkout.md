# Página: checkout `/checkout` y `/checkout/confirmacion`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/checkout-mock-payment.md` (Fases 3 y 4; base en `docs/specs/checkout-purchase.md` Fase 1).

Pasos 2 ("Datos y pago", `/checkout`) y 3 ("Confirmación", `/checkout/confirmacion`) de la compra. El pago es **simulado**: no hay pasarela ni se envían datos a ningún servicio; los datos de tarjeta solo existen en el estado del formulario. La orden aprobada se guarda solo en el navegador (`localStorage`).

## Paso 2: `/checkout`

> Spec: `docs/specs/checkout-mock-payment.md` Fase 3, alineada a las capturas en la Fase 5 (decisiones 16–24 y 32–34).

### Layout

```
Header sticky     (igual que la landing)
Stepper           franja border-b: ① Entradas — ② Datos y pago — ③ Confirmación · "Compra segura"
                  (móvil: "Paso 2 de 3" + "Datos y pago" + barra de progreso al 66 %)
h1 sr-only        "Finalizar compra" (no se ve; único h1 y primer encabezado)
Banner            [reloj] Reservamos tus entradas por mm:ss. Completa el pago antes de que se liberen.
┌──────────────────────────────────────────┬──────────────────────┐
│ Datos del comprador                      │ [img] Título         │  columna derecha 380px,
│ Enviaremos tus entradas al correo que    │       sáb 14 nov ·   │  sticky lg:top-24
│ indiques. Los campos con * son oblig.    │       Lugar, Ciudad  │
│ Nombres *          | Apellidos *         │ ──────────────────── │
│ Correo electrónico * (ancho completo)    │ 2 × General S/ 500.00│
│ Celular * [+51][ ] | Documento de        │ 1 × VIP     S/ 410.00│
│                    | identidad * [DNI▾][]│ (Fila L · 9 · …)     │
├──────────────────────────────────────────┤ Cambiar entradas     │
│ Método de pago                           │ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│ [Tarjeta][Yape][PagoEfectivo]            │ Total (3 entradas)   │
│ Número * | Venc. * | CVV *               │           S/ 910.00  │
│ Nombre en la tarjeta *                   │ Precio final, sin    │
│ (i) Demo: no se realiza ningún cobro     │ cargos ocultos       │
│     real. [Tarjetas de prueba: …]        │ [Lock Pagar S/ 910]  │
│ [Alert error de pago]                    │ Acepta los términos  │
├──────────────────────────────────────────┤ para continuar.      │
│ ☐ Acepto los Términos… y la Política     │                      │
│   de privacidad. *                       │                      │
└──────────────────────────────────────────┴──────────────────────┘
Barra inferior (< lg)  [Pagar S/ X]  (botón a todo el ancho; aviso de Términos debajo si aplica)
Footer            (igual que la landing)
```

- Stepper (`components/shared/PurchaseStepper`, `currentStep={2}`) fuera del contenedor, a ancho completo, con su propio `max-w-7xl` (como en `/eventos/[slug]/entradas`).
- Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-8 md:pb-12`, `flex flex-col gap-6`: h1 y `CheckoutForm` (banner + formulario).
- **Sin título visible:** bajo el stepper solo se ve el banner del temporizador. El h1 "Finalizar compra" va con `sr-only`: sigue siendo el único h1 y el primer encabezado que anuncia el lector. Los estados de error (`CheckoutStatusMessage`) sustituyen la página entera con su propio h1 visible y sin stepper.
- Formulario `<form noValidate>` en grilla `grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-12`, sin ancestros con `overflow` distinto de `visible` (para los `sticky`). Columna izquierda con posición explícita: comprador (`row-start-1`), método de pago (`row-start-2`), Términos (`row-start-3`, debajo de "Método de pago" en todos los anchos, nunca dentro del resumen). Columna derecha: `CheckoutSummaryPanel` (`lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:sticky lg:top-24 lg:self-start`).
- Secciones en `Card rounded-2xl`, h2 `text-xl font-bold`. Campos `h-11`.
- **Orden del DOM:** banner → comprador → método de pago → Términos → resumen (con "Pagar" en `lg`) → estado `sr-only` → barra móvil. "Pagar" nunca se alcanza con el tabulador antes que los campos.
- **Móvil (< lg):** una columna. El resumen sube con `order-first` como botón plegable (único cambio entre orden visual y de tabulación); "Pagar" vive en la barra inferior `sticky bottom-0 z-30 lg:hidden`, a ancho completo (`-mx-4 md:-mx-6`), `border-t bg-background`, `pb-[max(0.75rem,env(safe-area-inset-bottom))]`. Es `sticky`, no `fixed`: se queda pegada abajo mientras se rellena y no tapa el footer al final.
- **Un solo resumen, nunca duplicado.** El botón "Pagar" sí se renderiza dos veces (dentro de la tarjeta del resumen `hidden lg:flex` y en la barra `lg:hidden`); `display:none` deja solo uno visible y accesible en cada ancho. En móvil, al desplegar el resumen no aparece un segundo "Pagar".

### Banner del temporizador (`ReservationTimer`)

- Bloque `rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3` con `Clock` (`aria-hidden`): "Reservamos tus entradas por **mm:ss**. Completa el pago antes de que se liberen." (`tabular-nums`, sin animaciones).
- Anuncio `aria-live="polite"` `sr-only` solo al cambiar el minuto.
- Al expirar (10 min): `Alert` destructivo "Tu reserva expiró" con "Volver a elegir entradas" (`h-11`) hacia el paso 1, y los botones "Pagar" quedan deshabilitados.

### Campos obligatorios (`*`)

- Marca visual `RequiredMark` (`modules/checkout/components/RequiredMark.tsx`): `<span aria-hidden="true" className="ml-0.5 text-destructive">*</span>` al final de la etiqueta.
- Llevan `*`: Nombres, Apellidos, Correo electrónico, Celular, Documento de identidad, Número de tarjeta, Vencimiento, CVV, Nombre en la tarjeta y Términos. "Método de pago" no (siempre hay uno elegido, Tarjeta por defecto).
- Lo obligatorio llega a la tecnología de apoyo con `required` en cada `input` y en el `Checkbox` de Términos (`noValidate` evita las burbujas del navegador). El nombre accesible no incluye el `*` ("Nombres", no "Nombres *").

### Datos del comprador

- Descripción (`CardDescription`): "Enviaremos tus entradas al correo que indiques. Los campos con * son obligatorios."
- Grilla `sm:grid-cols-2`, sin huecos:

  ```
  [Nombres *              ] [Apellidos *                               ]
  [Correo electrónico *  (ancho completo, sm:col-span-2)               ]
  [Celular *  [+51][      ] ] [Documento de identidad *  [DNI ▾][número] ]
  ```

  - Nombres (`given-name`) | Apellidos (`family-name`).
  - Correo electrónico (`type="email"`, `email`) a todo el ancho: es el dato al que se envían las entradas y suele ser largo.
  - Celular (addon "+51", `type="tel"`, `inputMode="numeric"`, `tel-national`, `maxLength={9}`) | Documento de identidad.
  - En móvil, una columna en el mismo orden, que es también el orden de tabulación y el del foco al primer inválido.
- **Documento de identidad** es un grupo: `FieldSet` con `FieldLegend variant="label"` "Documento de identidad *". Dentro, fila `flex gap-2`: `Select` de tipo (`w-32 shrink-0`, DNI por defecto) + `Input` del número (`flex-1 min-w-0`; `inputMode="numeric"` y `maxLength={8}` solo con DNI). Cada control tiene etiqueta `sr-only` ("Tipo de documento", "Número de documento"). El trigger muestra la abreviatura (`DNI`, `CE`, `Pasaporte`); la lista desplegada, los nombres completos ("Carné de extranjería"). El error del número va debajo de la fila. A 375 px tipo y número caben en una fila sin scroll horizontal.
- Ids `checkout-<campo>`.

### Resumen (`CheckoutSummaryPanel` + `OrderSummary`)

- `<aside aria-label="Resumen de la compra">`.
- Móvil: botón `lg:hidden min-h-16 rounded-2xl ring-1 ring-border` con `aria-expanded`/`aria-controls`: miniatura 48 px (`alt=""`), título `line-clamp-1`, "3 entradas · S/ 910.00" ("1 entrada" en singular), `sr-only` "Resumen del pedido:" y `ChevronDown` (`aria-hidden`, rota 180° abierto, `motion-safe:transition-transform`). Plegado por defecto; en `lg` el contenido siempre se ve.
- `OrderSummary`, tarjeta compacta (`Card rounded-2xl`, h2 `sr-only` "Resumen del pedido"):
  1. Cabecera `flex items-center gap-3`: miniatura `next/image` `size-16 rounded-xl object-cover` (`alt=""`, `sizes="64px"`); título `font-bold leading-snug line-clamp-2`; debajo `text-sm text-muted-foreground` con fecha corta y lugar: "sáb 14 nov · Lugar, Ciudad" (`<time>`, minúsculas, sin año ni hora; `formatShortDayMonth`).
  2. `Separator` continuo.
  3. Una línea por tipo: izquierda "2 × General" (`font-medium`), derecha el subtotal "S/ 500.00" (`font-semibold tabular-nums`). Sin precio unitario. Si hay asientos, debajo en `text-sm text-muted-foreground` los asientos compactos agrupados por fila: "Fila L · 9 · Fila M · 8" o "Fila L · 9, 10" (con `sr-only` "Asientos: " delante).
  4. Enlace "Cambiar entradas" (`TEXT_LINK font-semibold`).
  5. `Separator` **discontinuo**: `className="h-0 border-t border-dashed border-border bg-transparent data-horizontal:h-0"` (sigue siendo el `Separator` de shadcn, `role="separator"`).
  6. Fila del total: izquierda "Total" `font-bold` + "(3 entradas)" `font-normal text-muted-foreground` ("(1 entrada)" en singular); derecha el importe `text-xl font-bold tabular-nums`. Debajo, siempre, "Precio final, sin cargos ocultos" (`text-sm text-muted-foreground`).
  7. Botón "Pagar" (solo `lg`) **dentro de la tarjeta**, con su aviso de Términos debajo cuando aplica (ver Botón "Pagar").
- "Cambiar entradas" y "Volver a elegir entradas" llevan al paso 1: `/eventos/<slug>/entradas` si el evento tiene mapa (`hasVenueMap`), si no `/eventos/<slug>`.

### Método de pago (`PaymentMethodFields`)

- Sin aviso arriba de los métodos.
- `RadioGroup` nombrado por el h2 de la sección, `grid gap-3 sm:grid-cols-3`: radio cards (patrón "choice card" de shadcn) `min-h-16 cursor-pointer`, seleccionada `border-primary bg-accent`; iconos `CreditCard` (Tarjeta), `Smartphone` (Yape), `Store` (PagoEfectivo), `aria-hidden`.
- Tarjeta: grilla `grid-cols-2 sm:grid-cols-4 gap-4`: "Número de tarjeta *" (`col-span-2`, "0000 0000 0000 0000", se agrupa de 4 en 4), "Vencimiento *" ("MM/AA"), "CVV *" ("3 o 4 dígitos"), "Nombre en la tarjeta *" (ancho completo). Todos `required`, `autoComplete="off"` (simulación: no se invita a guardar tarjetas reales), `inputMode="numeric"` en los numéricos, `h-11`.
- Yape / PagoEfectivo: sin campos; bloque `rounded-2xl bg-accent p-4` con su icono y el texto informativo.
- **Nota de demo** al pie (tras los campos de tarjeta o el bloque de Yape/PagoEfectivo): `<p className="flex gap-2 text-sm text-muted-foreground">` con `Info` (`aria-hidden`, `size-4 shrink-0 mt-0.5`): "Demo: no se realiza ningún cobro real." Solo con Tarjeta se añade: " Tarjetas de prueba: 4242 4242 4242 4242 (aprobada) y 4000 0000 0000 0002 (rechazada)." Texto visible, sin `title`.
- Error de pago: `Alert` destructivo bajo los métodos, recibe el foco al aparecer (p. ej. "Tu tarjeta fue rechazada…").

### Términos

- Checkbox `required` con "Acepto los Términos y condiciones y la Política de privacidad. *" (enlaces `INLINE_LINK`, pestaña nueva), debajo de "Método de pago" en todos los anchos.

### Botón "Pagar"

- Primario azul, `type="submit"`, `h-12 w-full font-semibold`, icono `Lock` (`aria-hidden`): "Pagar S/ 910.00". Mismo componente interno (`PayButton`) en la tarjeta del resumen (`hidden lg:flex`) y en la barra inferior móvil. Su raíz `flex flex-col gap-2` agrupa botón y aviso, así que el aviso se oculta con su botón.
- **Estados**, por prioridad:

  | Estado | Cuándo | Aspecto | Atributos | Aviso debajo |
  |---|---|---|---|---|
  | 1. Procesando | se está procesando el pago | `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Procesando pago…" | `disabled` nativo (sale del orden de Tab); región `sr-only` `role="status"` anuncia "Procesando pago…" | no |
  | 2. Expirado | la reserva expiró | deshabilitado | `disabled` nativo | no (lo explica el `Alert` "Tu reserva expiró") |
  | 3. Términos pendientes | Términos sin marcar (también al cargar) | pálido: `opacity-50`, `cursor-not-allowed`, sin hover ni desplazamiento al pulsar (`aria-disabled:` neutraliza `hover:bg-primary` y el `translate-y`) | `aria-disabled="true"` y `aria-describedby` al aviso; **sin** `disabled` (sigue en el orden de Tab) | "Acepta los términos para continuar." (`text-center text-sm text-muted-foreground`) |
  | 4. Activo | Términos marcados, sin procesar ni expirar | primario normal | ninguno extra | no |

- **Términos pendientes, al intentar pagar** (clic, Enter o Espacio en "Pagar", o Enter en un campo): no se valida, no aparece ningún error, no se llama al pago y el foco pasa a la casilla de Términos (que el navegador desplaza a la vista; útil en móvil desde la barra inferior).
- El lector anuncia "Pagar S/ 910.00, botón, no disponible, Acepta los términos para continuar.". El aviso es la descripción accesible del botón, no una región `aria-live`: el cambio lo anuncia la propia casilla.
- Al marcar Términos, el aviso desaparece y el botón queda activo; al desmarcarlos, vuelven el aspecto pálido y el aviso.

### Reglas específicas

- Formulario: con Términos marcados, errores al enviar, revalidación al salir del campo tras el primer intento, foco al primer inválido ("Nombres" con el formulario vacío), `aria-invalid` + `aria-describedby`, error junto al campo (`FieldError`).
- Orden de tabulación: Nombres → Apellidos → Correo → Celular → Tipo → Número → método → campos de tarjeta → Términos → (móvil: botón del resumen) → "Cambiar entradas" → Pagar, con foco visible.
- Estados (`not-found`, `sold-out`, `invalid-tickets`, `free`): patrón del 404 de evento (centrado, h1 + descripción + acciones `h-11`); siempre con salida.
- Importes con el formato del MASTER (`S/ 910.00`).
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
