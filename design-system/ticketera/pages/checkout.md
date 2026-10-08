# Página: checkout `/checkout` y `/checkout/confirmacion`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Specs: `docs/specs/checkout-mock-payment.md` (Fases 3 y 4; base en `docs/specs/checkout-purchase.md` Fase 1) y `docs/specs/design-alignment-purchase-flow.md` (Fase 1: pantalla de compra y textos; Fase 3: ancho de los contenedores). Compra real (reserva, Stripe y confirmación desde la BD): `docs/specs/checkout-stripe.md` (Fases 2 y 5).

Pasos 2 ("Datos y pago", `/checkout?orden=<uuid>`) y 3 ("Confirmación", `/checkout/confirmacion?orden=<uuid>`) de la compra. "Continuar" del paso 1 reserva los asientos en la BD (orden `pending` de 10 min) y lleva al paso 2, que lee la orden de la BD. El pago es con tarjeta mediante el **Payment Element de Stripe** (modo test): los datos de tarjeta solo viven en el iframe de Stripe. Un webhook de Stripe emite las entradas y la confirmación lee la orden de la BD según su estado. Las URL usan el UUID de la orden, nunca el código `TK-…`.

## Pantalla de compra (`PurchaseShell`)

> Spec: `docs/specs/design-alignment-purchase-flow.md` Fase 1 (Requisito 6, decisiones 1–5 y 10) y Fase 3 (Decisión 14).

Los tres pasos de la compra (`/eventos/[slug]/entradas`, `/checkout` y `/checkout/confirmacion`) viven en el route group `app/(purchase)`, **sin el header ni el footer del sitio** (sin `SiteShell`) y sin `layout.tsx` propio: cada página compone `components/shared/PurchaseShell`, porque solo ella conoce su paso. Las URL no cambian.

```
Escritorio (lg+, 77 px: fila h-19 de 76 px + 1 px de borde):
[logo Mentec]      ① Entradas ── ② Datos y pago ── ③ Confirmación      [candado] Compra segura
  grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]: logo a la izquierda, stepper centrado y
  "Compra segura" a la derecha (pasos 1 y 2; en el paso 3 no hay)

Móvil y tablet (< lg, 65 px: fila de 60 px + barra de 4 px + 1 px de borde):
Pasos 1 y 2:  [←]  Paso 2 de 3                                [candado]
                   Datos y pago
              ████████████████████████████░░░░░░░░░░░░░░  barra al 66 % (33 % en el paso 1)
Paso 3:       [logo Mentec]                              Paso 3 de 3
              ██████████████████████████████████████████  barra al 100 %
Errores y carga (todos los anchos):  [logo Mentec]   (sin pasos, candado, barra ni flecha)
```

- **Raíz:** `<div className="flex flex-1 flex-col bg-muted">` con `<header>` y un único `<main className="flex flex-1 flex-col">`. El fondo de la página es el gris `--muted`; las tarjetas (`Card`, tarjeta-entrada, "Qué sigue") quedan blancas encima.
- **Contenedores de los pasos con `w-full`** (spec `design-alignment-purchase-flow` Decisión 14): el `<main>` es flex en columna (su `flex-1` estira la página hasta abajo), y dentro de él un hijo `mx-auto max-w-*` sin `w-full` toma el ancho de su contenido. Por eso el contenedor de cada paso lleva `w-full`: paso 1 (`max-w-7xl`, 1280 px a 1440 alineado con el logo, también tras elegir una zona), paso 2 (`max-w-7xl`) y la confirmación (`CONTAINER_CLASS` de `OrderConfirmation`, `max-w-4xl`: 896 px centrado a 1440 y todo el ancho a 375).
- **`<header>`** (único `banner`): `sticky top-0 z-40 border-b bg-background print:hidden`. Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8` con una fila `flex h-15 items-center gap-1` que en `lg` pasa a `lg:grid lg:h-19 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6`. Un único DOM para todos los anchos; la variante cambia en `lg` (en una fila, logo + stepper + "Compra segura" no caben a 768 px).
- **Elementos, en orden del DOM:**
  1. **Flecha de vuelta** (pasos 1 y 2, prop `back`): `Link` `lg:hidden size-11 rounded-xl -ml-2` con `ArrowLeft` `size-5` (`aria-hidden`), `aria-label` "Volver al evento" (paso 1, a `/eventos/<slug>`) o "Volver a entradas" (paso 2, al mismo `href` que "Cambiar entradas"); hover `bg-accent` y foco visible. Por debajo de `lg` es el primer Tab.
  2. **Logo:** `Link href="/"` con `BrandLogo` (`h-7 w-auto lg:h-8`, nombre accesible "Mentec Tickets"), `lg:justify-self-start`. Con flecha lleva `max-lg:hidden`: en móvil la flecha ocupa su lugar. En `lg` es el primer Tab.
  3. **Paso en móvil** (`aria-hidden`, `lg:hidden`): en los pasos 1 y 2, "Paso n de 3" (`text-xs text-muted-foreground`) sobre el título del paso (`text-base font-bold`: "Elige tus entradas" o "Datos y pago"); en el paso 3, solo "Paso 3 de 3", alineado a la derecha (`ml-auto`).
  4. **Stepper** `<ol aria-label="Pasos de la compra">`: `sr-only` por debajo de `lg` y `lg:flex` desde `lg`. Círculos `size-7`: actual y completados `bg-primary text-primary-foreground` (los completados con `Check` y "(completado)" `sr-only`), pendientes `border-2 border-input` con el texto `text-muted-foreground`; conectores `h-0.5 w-10` (`bg-primary` tras un completado, `bg-input` si no); paso actual con `aria-current="step"` y `font-semibold`. Se conservan los colores Mentec, no el negro del diseño.
  5. **"Compra segura"** (pasos 1 y 2): `Lock` (`size-5 lg:size-4`, `aria-hidden`) + texto `max-lg:sr-only`, `text-sm text-muted-foreground`, `lg:justify-self-end`. En móvil se ve solo el candado y el lector anuncia "Compra segura".
- **Barra de progreso** (`< lg`, con paso): fuera del contenedor, a todo el ancho, `h-1 bg-secondary` con relleno `bg-primary` al 33 %, 66 % o 100 %; `aria-hidden`.
- **Sin paso** (errores y carga): la fila solo tiene el logo.
- **Sticky:** la cabecera mide 77 px en `lg` (fila `h-19` de 76 px + 1 px del `border-b`) y 65 px por debajo (60 px de fila + 4 px de barra + 1 px de borde); los `lg:sticky lg:top-24` del resumen y de "Tu compra" quedan 19 px por debajo de ella.
- **Impresión:** la cabecera es `print:hidden`.

## Paso 2: `/checkout`

> Spec: `docs/specs/checkout-mock-payment.md` Fase 3, alineada a las capturas en la Fase 5 (decisiones 16–24 y 32–34).

### Layout

```
Cabecera de compra  PurchaseShell currentStep={2}, flecha "Volver a entradas":
                    logo · ① Entradas ✓ — ② Datos y pago — ③ Confirmación · "Compra segura"
                    (< lg: [←] "Paso 2 de 3" / "Datos y pago" · candado + barra al 66 %)
Fondo bg-muted
h1 sr-only        "Finalizar compra" (no se ve; único h1 y primer encabezado)
Banner            [reloj] Reservamos tus entradas por mm:ss. Completa el pago antes de que se liberen.
┌──────────────────────────────────────────┬──────────────────────┐
│ Datos del comprador                      │ [img] Título         │  columna derecha 380px,
│ Asociaremos tus entradas al correo que   │       sáb 14 nov ·   │  sticky lg:top-24
│ indiques. Los campos con * son oblig.    │       Lugar, Ciudad  │
│ Nombres *          | Apellidos *         │ ──────────────────── │
│ Correo electrónico * (ancho completo)    │ 2 × General S/ 500.00│
│ Celular * [+51][ ] | Documento de        │ 1 × VIP     S/ 410.00│
│                    | identidad * [DNI▾][]│ (Fila L · 9 · …)     │
├──────────────────────────────────────────┤ Cambiar entradas     │
│ Método de pago                           │ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ │
│ [Tarjeta][Yape Próx.][PagoEfectivo Próx.]│ Total (3 entradas)   │
│ [Payment Element de Stripe (iframe)]     │           S/ 910.00  │
│ (candado) Pago seguro procesado por…     │ Precio final, sin    │
│ (i) Modo de prueba: no se realiza…       │ cargos ocultos       │
│     Tarjeta de prueba 4242 4242 …        │ [Lock Pagar S/ 910]  │
│ [Alert error de pago]                    │ Acepta los términos  │
├──────────────────────────────────────────┤ para continuar.      │
│ ☐ Acepto los Términos… y la Política     │                      │
│   de privacidad. *                       │                      │
└──────────────────────────────────────────┴──────────────────────┘
Barra inferior (< lg)  [Pagar S/ X]  (botón a todo el ancho; aviso de Términos debajo si aplica)
(sin footer)
```

- Página `app/(purchase)/checkout/page.tsx`: `<PurchaseShell currentStep={2} back={{ href: changeHref, label: "Volver a entradas" }}>` (ver "Pantalla de compra"). La flecha usa el mismo `href` que "Cambiar entradas" (`buildChangeTicketsHref`).
- Contenedor `mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-8 md:pb-12`, `flex flex-col gap-6`: h1 y `CheckoutForm` (banner + formulario).
- **Sin título visible:** bajo la cabecera solo se ve el banner del temporizador. El h1 "Finalizar compra" va con `sr-only`: sigue siendo el único h1 y el primer encabezado que anuncia el lector. Los estados de error (`CheckoutStatusMessage`) sustituyen el contenido con su propio h1 visible, dentro de `<PurchaseShell>` sin paso: fondo gris y cabecera solo con el logo (sin stepper, "Compra segura", barra ni flecha).
- Formulario `<form noValidate>` en grilla `grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-12`, sin ancestros con `overflow` distinto de `visible` (para los `sticky`). Columna izquierda con posición explícita: comprador (`row-start-1`), método de pago (`row-start-2`), Términos (`row-start-3`, debajo de "Método de pago" en todos los anchos, nunca dentro del resumen). Columna derecha: `CheckoutSummaryPanel` (`lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:sticky lg:top-24 lg:self-start`).
- Secciones en `Card rounded-2xl`, h2 `text-xl font-bold`. Campos `h-11`.
- **Orden del DOM:** banner → comprador → método de pago → Términos → resumen (con "Pagar" en `lg`) → estado `sr-only` → barra móvil. "Pagar" nunca se alcanza con el tabulador antes que los campos.
- **Móvil (< lg):** una columna. El resumen sube con `order-first` como botón plegable (único cambio entre orden visual y de tabulación); "Pagar" vive en la barra inferior `sticky bottom-0 z-30 lg:hidden`, a ancho completo (`-mx-4 md:-mx-6`), `border-t bg-background`, `pb-[max(0.75rem,env(safe-area-inset-bottom))]`. Es `sticky`, no `fixed`: se queda pegada abajo mientras se rellena y llega al final de la página.
- **Un solo resumen, nunca duplicado.** El botón "Pagar" sí se renderiza dos veces (dentro de la tarjeta del resumen `hidden lg:flex` y en la barra `lg:hidden`); `display:none` deja solo uno visible y accesible en cada ancho. En móvil, al desplegar el resumen no aparece un segundo "Pagar".

### Banner del temporizador (`ReservationTimer`)

- Bloque `rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3` con `Clock` (`aria-hidden`): "Reservamos tus entradas por **mm:ss**. Completa el pago antes de que se liberen." (`tabular-nums`, sin animaciones).
- Anuncio `aria-live="polite"` `sr-only` solo al cambiar el minuto.
- Cuenta el tiempo que le queda a la reserva (`expires_at` de la orden en la BD, 10 min desde "Continuar"; recargar no lo reinicia).
- Al expirar: `Alert` destructivo "Tu reserva expiró" con "Volver a elegir entradas" (`h-11`) hacia el paso 1, y los botones "Pagar" quedan deshabilitados.

### Campos obligatorios (`*`)

- Marca visual `RequiredMark` (`modules/checkout/components/RequiredMark.tsx`): `<span aria-hidden="true" className="ml-0.5 text-destructive">*</span>` al final de la etiqueta.
- Llevan `*`: Nombres, Apellidos, Correo electrónico, Celular, Documento de identidad y Términos (los campos de tarjeta son del Payment Element de Stripe). "Método de pago" no (siempre hay uno elegido, Tarjeta por defecto).
- Lo obligatorio llega a la tecnología de apoyo con `required` en cada `input` y en el `Checkbox` de Términos (`noValidate` evita las burbujas del navegador). El nombre accesible no incluye el `*` ("Nombres", no "Nombres *").

### Datos del comprador

- **Precarga del perfil.** La página lee la fila de `users` en el servidor (`getSessionUser`; si falla, se compra como invitado) y pasa a `CheckoutForm` solo `buyerProfile` (`firstName`, `lastName`, `email`, `phone`, `documentType`, `documentNumber`; `null` sin sesión). Es el estado inicial del formulario: nunca sobrescribe lo que el comprador escribe o vacía. El tipo de documento del perfil solo se aplica si viene con su número; si no, DNI y número vacío. Un valor que no cumpla el schema se precarga igual y la validación lo marca al pagar.
- **Perfil completo** (los 6 datos): en lugar de los campos, un `dl` en `sm:grid-cols-2` con Nombre ("Ana Quispe"), Correo electrónico, Celular ("+51 987654321") y Documento ("DNI 87654321", abreviatura del tipo); `dt` en `text-sm text-muted-foreground`, `dd` en `font-medium wrap-anywhere`. Descripción: "Usamos los datos de tu cuenta. Si los cambias, solo se aplican a esta compra."
  - Botón `outline` `h-11` en `CardAction`: "Cambiar datos" con los campos plegados y "Ver resumen" con los campos abiertos, con `aria-expanded` y `aria-controls="checkout-buyer-fields"`. Por debajo de `sm` baja a su propia fila bajo la descripción (alineado a la izquierda); desde `sm`, a la derecha del título.
  - Los campos no se desmontan: el contenedor `checkout-buyer-fields` lleva el atributo `hidden` mientras se ve el resumen. Al abrir, el foco va a "Nombres"; al volver al resumen, este muestra lo editado.
  - Lo editado vale solo para esta compra (no se guarda en el perfil); viaja igual a `payOrder` y a `billing_details`.
  - Si se paga con los campos plegados y un dato no valida, se despliegan y el foco va al primer error.
- **Perfil parcial:** todos los campos visibles, con lo que exista precargado; sin resumen ni botón.
- **Invitado:** todos los campos visibles y vacíos (DNI por defecto), como antes.
- Descripción (`CardDescription`) con los campos visibles (perfil parcial o invitado), con texto por ancho (`display: none`: nada se anuncia dos veces):
  - por debajo de `sm`: "Asociaremos tus entradas a este correo. Los campos con * son obligatorios." (`<span className="sm:hidden">`);
  - desde `sm`: "Asociaremos tus entradas al correo que indiques. Los campos con * son obligatorios." (`<span className="max-sm:hidden">`).
  - "Asociaremos", no "Enviaremos": en F3 no se envían correos; la compra queda en Mis entradas de la cuenta con sesión o, si se compra como invitado, de la cuenta con ese correo verificado.
  - La leyenda de los `*` va en todos los anchos (el diseño no tiene `*`; la app sí), y solo mientras los campos están visibles: con el resumen del perfil completo no aparece; al pulsar "Cambiar datos" se añade tras la descripción.
- **Placeholders:** Nombres y Apellidos, "Como figura en tu documento"; Correo electrónico, "tu@email.com"; Celular, "Número de celular" (a la derecha de "+51"); número de documento, "Número". Caben sin cortarse a 375 px.
- Grilla `sm:grid-cols-2`, sin huecos:

  ```
  [Nombres *              ] [Apellidos *                               ]
  [Correo electrónico *  (ancho completo, sm:col-span-2)               ]
  [Celular *  [+51][      ] ] [Documento de identidad *  [DNI ▾][número] ]
  ```

  - Nombres (`given-name`) | Apellidos (`family-name`).
  - Correo electrónico (`type="email"`, `email`) a todo el ancho: es el dato al que se asocian las entradas y suele ser largo.
  - Celular (addon "+51", `type="tel"`, `inputMode="numeric"`, `tel-national`, `maxLength={9}`) | Documento de identidad.
  - En móvil, una columna en el mismo orden, que es también el orden de tabulación y el del foco al primer inválido.
- **Documento de identidad** es un grupo: `FieldSet` con `FieldLegend variant="label"` "Documento de identidad *". Dentro, fila `flex gap-2`: `Select` de tipo (`w-32 shrink-0`, DNI por defecto) + `Input` del número (`flex-1 min-w-0`; `inputMode="numeric"` y `maxLength={8}` solo con DNI). Cada control tiene etiqueta `sr-only` ("Tipo de documento", "Número de documento"). El trigger muestra la abreviatura (`DNI`, `CE`, `Pasaporte`); la lista desplegada, los nombres completos ("Carné de extranjería"). El error del número va debajo de la fila. A 375 px tipo y número caben en una fila sin scroll horizontal.
- Ids `checkout-<campo>`.

### Resumen (`CheckoutSummaryPanel` + `OrderSummary`)

- `<aside aria-label="Resumen de la compra">`.
- Móvil: botón `lg:hidden min-h-16 rounded-2xl ring-1 ring-border` con `aria-expanded`/`aria-controls`: miniatura 48 px (`alt=""`), título `line-clamp-1`, "3 entradas · S/ 910.00" ("1 entrada" en singular), `sr-only` "Resumen del pedido:" y `ChevronDown` (`aria-hidden`, rota 180° abierto, `motion-safe:transition-transform`). Plegado por defecto; en `lg` el contenido siempre se ve.
- `OrderSummary`, tarjeta compacta (`Card rounded-2xl`, h2 `sr-only` "Resumen del pedido"):
  1. Cabecera `flex items-center gap-3`: miniatura `next/image` `size-16 rounded-xl object-cover` (`alt=""`, `sizes="64px"`); título `font-bold leading-snug line-clamp-2`. **Miniatura y título llevan `max-lg:hidden`:** en móvil ya están en el botón plegable, así que el resumen desplegado empieza por la fecha y el lugar. Debajo, en todos los anchos, `text-sm text-muted-foreground` con fecha corta y lugar: "sáb 14 nov · Lugar, Ciudad" (`<time>`, minúsculas, sin año ni hora; `formatShortDayMonth`).
  2. `Separator` continuo.
  3. Una línea por tipo: izquierda "2 × General" (`font-medium`), derecha el subtotal "S/ 500.00" (`font-semibold tabular-nums`). Sin precio unitario. Si hay asientos, debajo en `text-sm text-muted-foreground` los asientos compactos agrupados por fila: "Fila L · 9 · Fila M · 8" o "Fila L · 9, 10" (con `sr-only` "Asientos: " delante).
  4. Enlace "Cambiar entradas" (`TEXT_LINK font-semibold`).
  5. `Separator` **discontinuo**: `className="h-0 border-t border-dashed border-border bg-transparent data-horizontal:h-0"` (sigue siendo el `Separator` de shadcn, `role="separator"`).
  6. Fila del total: izquierda "Total" `font-bold` + "(3 entradas)" `font-normal text-muted-foreground` ("(1 entrada)" en singular); derecha el importe `text-xl font-bold tabular-nums`. Debajo, siempre, "Precio final, sin cargos ocultos" (`text-sm text-muted-foreground`).
  7. Botón "Pagar" (solo `lg`) **dentro de la tarjeta**, con su aviso de Términos debajo cuando aplica (ver Botón "Pagar").
- "Cambiar entradas" y "Volver a elegir entradas" (mismo `href`) llevan al paso 1 **conservando la selección** (`buildChangeTicketsHref`):
  - con mapa (`hasVenueMap`): `/eventos/<slug>/entradas?general=2&vip=1&asientos=<id>%2C<id>` (`asientos` solo si el pedido tiene asientos; la precarga del mapa la define `seating-stadium-map.md`, Fase 4);
  - sin mapa: `/eventos/<slug>?general=2&vip=1#entradas`. El `TicketSelector` del detalle muestra esas cantidades desde el primer render (contadores, total y "Continuar con la compra"), sin mover el foco ni anunciar nada; el ancla solo desplaza la vista al selector (`scroll-mt-24`).
  - Lo inválido (valores no enteros, fuera de 1–10, repetidos, tipos agotados o desconocidos) se ignora sin avisos; el total precargado nunca supera 10 ("Máximo 10 entradas por compra"). En un evento agotado se ve "Entradas agotadas" sin precarga.

### Método de pago (`PaymentMethodFields`)

- Sin aviso arriba de los métodos.
- `RadioGroup` nombrado por el h2 de la sección, `grid gap-3 sm:grid-cols-3`: radio cards (patrón "choice card" de shadcn) `min-h-16 cursor-pointer`, seleccionada `border-primary bg-accent`; iconos `CreditCard` (Tarjeta), `Smartphone` (Yape), `Store` (PagoEfectivo), `aria-hidden`.
- **Solo Tarjeta:** siempre seleccionada (`defaultValue="card"`). Yape y PagoEfectivo van con `RadioGroupItem disabled` y `Badge variant="secondary"` "Próximamente": atenuados (`opacity-60`, `cursor-not-allowed`), no se pueden elegir.
- **"Tarjeta de crédito o débito" en móvil:** por debajo de `sm` (métodos apilados a todo el ancho), Tarjeta lleva el sufijo `<span className="sm:hidden"> de crédito o débito</span>` (`CARD_MOBILE_SUFFIX`), y el radio se llama "Tarjeta de crédito o débito". Desde `sm` (tres columnas) dice "Tarjeta". `PAYMENT_METHOD_LABELS` no cambia.
- **Payment Element de Stripe** bajo los métodos (sin campos de tarjeta propios): solo tarjeta, sin pestañas ni Apple/Google Pay, sin campos de nombre/correo/teléfono de Stripe (salen de "Datos del comprador"). Appearance con los valores de los tokens Mentec (el iframe no lee variables CSS; spec `checkout-stripe.md` decisión 25), `locale: "es-419"`.
  - **Cargando:** `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Cargando formulario de pago…" (`role="status"`, `text-sm text-muted-foreground`).
  - **Error de carga:** `Alert` destructivo "No pudimos cargar el formulario de pago. Recarga la página." en lugar del Payment Element.
- **Notas** al pie, `<p className="flex gap-2 text-sm text-muted-foreground">` con icono `aria-hidden` `mt-0.5 size-4 shrink-0`:
  - `Lock`: "Pago seguro procesado por Stripe. No almacenamos los datos de tu tarjeta."
  - `Info`: "Modo de prueba: no se realiza ningún cobro real. Tarjeta de prueba 4242 4242 4242 4242, cualquier fecha futura y CVC."
- Error de pago: `Alert` destructivo bajo los métodos, recibe el foco al aparecer: el mensaje de Stripe en español (tarjeta rechazada o datos inválidos), "Tu reserva expiró. Vuelve a elegir tus entradas.", "Esta compra ya no está disponible." o "No pudimos iniciar el pago. Inténtalo de nuevo.". El botón vuelve a quedar activo para reintentar.
- **Envío:** Términos → datos del comprador (`useZodForm`; si fallan, no se llama a Stripe) → `elements.submit()` → `payOrder` (reserva vigente, guarda al comprador y crea el PaymentIntent con el importe de la orden) → `stripe.confirmPayment`, que redirige a `/checkout/confirmacion?orden=<uuid>` (o pasa antes por 3DS).

### Términos

- Checkbox `required` con "Acepto los Términos y condiciones y la Política de privacidad. *" (enlaces `INLINE_LINK`, pestaña nueva), debajo de "Método de pago" en todos los anchos.
- Va directamente sobre el fondo gris, así que la casilla lleva `bg-background`: sin marcar se ve blanca; marcada, gana `data-checked:bg-primary` (azul con el check).

### Botón "Pagar"

- Primario azul, `type="submit"`, `h-12 w-full font-semibold`, icono `Lock` (`aria-hidden`): "Pagar S/ 910.00". Mismo componente interno (`PayButton`) en la tarjeta del resumen (`hidden lg:flex`) y en la barra inferior móvil. Su raíz `flex flex-col gap-2` agrupa botón y aviso, así que el aviso se oculta con su botón.
- **Estados**, por prioridad:

  | Estado | Cuándo | Aspecto | Atributos | Aviso debajo |
  |---|---|---|---|---|
  | 1. Procesando | se está procesando el pago o Stripe ya está redirigiendo | `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Procesando pago…" | `disabled` nativo (sale del orden de Tab); región `sr-only` `role="status"` anuncia "Procesando pago…" | no |
  | 2. Expirado o pago no listo | la reserva expiró, o Stripe / el Payment Element aún no están listos (o no cargaron) | deshabilitado | `disabled` nativo | no (lo explican el `Alert` "Tu reserva expiró" o el estado del Payment Element) |
  | 3. Términos pendientes | Términos sin marcar (también al cargar) | pálido: `opacity-50`, `cursor-not-allowed`, sin hover ni desplazamiento al pulsar (`aria-disabled:` neutraliza `hover:bg-primary` y el `translate-y`) | `aria-disabled="true"` y `aria-describedby` al aviso; **sin** `disabled` (sigue en el orden de Tab) | "Acepta los términos para continuar." (`text-center text-sm text-muted-foreground`) |
  | 4. Activo | Términos marcados, sin procesar ni expirar | primario normal | ninguno extra | no |

- **Términos pendientes, al intentar pagar** (clic, Enter o Espacio en "Pagar", o Enter en un campo): no se valida, no aparece ningún error, no se llama al pago y el foco pasa a la casilla de Términos (que el navegador desplaza a la vista; útil en móvil desde la barra inferior).
- El lector anuncia "Pagar S/ 910.00, botón, no disponible, Acepta los términos para continuar.". El aviso es la descripción accesible del botón, no una región `aria-live`: el cambio lo anuncia la propia casilla.
- Al marcar Términos, el aviso desaparece y el botón queda activo; al desmarcarlos, vuelven el aspecto pálido y el aviso.

### Reglas específicas

- Formulario: con Términos marcados, errores al enviar, revalidación al salir del campo tras el primer intento, foco al primer inválido ("Nombres" con el formulario vacío), `aria-invalid` + `aria-describedby`, error junto al campo (`FieldError`).
- Orden de tabulación: cabecera ("Volver a entradas" por debajo de `lg`, el logo desde `lg`) → Nombres → Apellidos → Correo → Celular → Tipo → Número → método (Tarjeta) → campos del Payment Element (iframe de Stripe) → Términos → (móvil: botón del resumen) → "Cambiar entradas" → Pagar, con foco visible.
- Estados (`CheckoutStatusMessage`): `order-not-found` (`orden` ausente, inválida o inexistente: "No encontramos tu compra") y `order-expired` (reserva vencida: "Tu reserva expiró" con "Volver a elegir entradas" → `/eventos/<slug>`). Una orden ya pagada o reembolsada redirige a la confirmación. Patrón del 404 de evento (centrado, h1 + descripción + acciones `h-11`); siempre con salida. Van en `<PurchaseShell>` sin paso (cabecera solo con el logo, fondo gris).
- Importes con el formato del MASTER (`S/ 910.00`).
- Sin scroll horizontal a 375 / 768 / 1024 / 1440; targets ≥ 44 px; solo tokens; sin emojis.
- Metadata: `Finalizar compra | Mentec Tickets`.

## Paso 3: `/checkout/confirmacion`

> Spec: `docs/specs/checkout-mock-payment.md` Fase 4, alineada a las capturas en la Fase 6 (decisiones 24–27). El PDF de "Descargar PDF" lo define `docs/specs/tickets-pdf-download.md`; el talón navegable, `docs/specs/tickets-ticket-pager.md`. Confirmación desde la BD: `docs/specs/checkout-stripe.md` (requisito 11, Fase 5).

URL `/checkout/confirmacion?orden=<uuid>` (a ella redirige Stripe tras `confirmPayment`, con o sin 3DS). La página (Server Component) lee la orden de la BD (`getOrderConfirmation`) y, según su estado, compone `OrderConfirmation` (orden `paid`) o un `CheckoutStatusMessage` (ver Estados). Las entradas las emite el webhook de Stripe: hasta que llega, la orden sigue `pending` y se ve "Estamos procesando tu pago".

### Layout

```
Cabecera de compra  PurchaseShell currentStep={3}, sin flecha (oculta al imprimir):
                    logo · ① Entradas ✓ — ② Datos y pago ✓ — ③ Confirmación   (sin "Compra segura")
                    (< lg: logo · "Paso 3 de 3" a la derecha + barra al 100 %)
Fondo bg-muted
        (CircleCheck en círculo bg-accent)
        h1 "¡Compra confirmada!"
        Tus entradas están listas. Te las mostramos abajo y también las tienes
        en Mis entradas con tu cuenta de **luis@correo.pe**.
        ( Pedido N.º TK-1042 )
┌────────┬──────────────────────────────────────────┬╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
│ imagen │ CATEGORÍA                                ┆     [QR]      │  tarjeta-entrada
│        │ Título del evento                        ┆  TK-1042-01   │  (md+: horizontal,
│        │ lunes 5 de octubre · Costa Verde, Lima   ┆ Titular: Luis │   talón a la derecha)
│        │ Tribuna Oriente: Fila L · 9 · Fila M · 8 ┆ Entrada 1 de N│  (una línea por zona
│        │ Zona | Entradas | Total pagado           ┆    [<] [>]    │   con asientos)
└────────┴──────────────────────────────────────────┴╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
[Ver mis entradas]  [Agregar al calendario]  [Descargar PDF]   (ocultos al imprimir)
(h2 "Qué sigue": visible < md, sr-only en md+)
[Descarga tus entradas] [Muestra tu QR] [Todo en Mis entradas]   (oculto al imprimir)
(sin footer)
```

- Cabecera: `OrderConfirmation` (`{ order }`: la orden `paid` que lee la página) se envuelve en `PurchaseShell currentStep={3}` (sin `back`). Los demás estados los compone la página `app/(purchase)/checkout/confirmacion/page.tsx` en `<PurchaseShell>` sin paso (solo el logo).
- Contenedor (`CONTAINER_CLASS`; los estados usan `CheckoutStatusMessage`, centrado) `mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 md:px-6 py-8 md:py-12`.
- Cabecera centrada: círculo `bg-accent` con `CircleCheck` `text-primary` (`aria-hidden`, `size-16 md:size-20`); h1 `text-3xl md:text-4xl font-extrabold tracking-tight` (único h1); texto `text-muted-foreground`; chip `rounded-full bg-card ring-1 ring-border` "Pedido N.º **TK-1042**" (blanco sobre el fondo gris; código `TK-<n>` de la orden).
- **Correo del comprador** en el texto de la cabecera: "Tus entradas están listas. Te las mostramos abajo y también las tienes en Mis entradas con tu cuenta de **luis@correo.pe**." (no se envían correos en F3). El correo (`order.buyer.email`) va en `<strong className="font-semibold text-foreground break-all">`: destaca sobre el `text-muted-foreground` del párrafo y, si es largo, se parte en varias líneas sin scroll horizontal a 375 px. `ConfirmationHeader` recibe props planas `code` y `email`.

### Tarjeta-entrada (`ConfirmationTicketCard`)

- `<article aria-labelledby>` apuntando al id del h2 (nombre accesible = título del evento), `rounded-2xl bg-card ring-1 ring-border overflow-hidden`, `flex-col md:flex-row`.
- Imagen `next/image` (`alt=""`, `object-cover`): móvil `h-32 w-full`, `md:w-48 md:h-auto`.
- Cuerpo:
  1. Overline de categoría (`text-xs font-bold uppercase tracking-wider text-primary-strong`).
  2. h2 título.
  3. Línea de fecha y lugar (`text-muted-foreground`): `<time dateTime>` con la fecha larga **sin año ni hora** ("lunes 5 de octubre", minúsculas, America/Lima; `formatLongDayMonth`) + " · Lugar, Ciudad". Ejemplo: "lunes 5 de octubre · Costa Verde, Lima". La hora no se muestra aquí (sí va en el PDF y en el `.ics`).
  4. **Asientos compactos por zona:** debajo, una `<p className="text-sm text-muted-foreground">` por tipo de entrada con asientos: "{zona}: {asientos}", p. ej. "Tribuna Oriente: Fila L · 9 · Fila M · 8". Agrupados por fila: varios en la misma fila, "Fila L · 9, 10"; filas ordenadas por longitud y luego alfabéticamente (A…Z, AA…), números de menor a mayor (`formatCompactSeats`, mismo formato que el resumen del paso 2). Si el id de un asiento no se puede leer, se usa su etiqueta completa. Los tipos sin asientos no tienen línea; una compra sin asientos no tiene ninguna.
  5. `<dl>` en `grid-cols-3`: "Zona" (nombres de las zonas unidos por ", ", p. ej. "General, VIP"), "Entradas", "Total pagado" (`S/ 310.00`). **Sin bloque "Asientos"**: los asientos solo aparecen en las líneas compactas. Por debajo de `md` (tarjeta vertical) el `<dt>` dice "Total": `Total<span className="max-md:hidden"> pagado</span>`.
- **Talón navegable** (spec `docs/specs/tickets-ticket-pager.md`): separador punteado (`border-dashed`; horizontal en móvil, vertical en `md`) con dos muescas decorativas (`bg-muted ring-1 ring-border rounded-full`, `aria-hidden`: del gris del fondo de la página). Contenedor `flex flex-col items-center justify-center gap-3 p-6`, `md:w-56` (224 px; no cambia). Recorre **todas** las entradas del pedido (`useState(0)`, empieza en la entrada 1) y muestra, en columna centrada, la entrada actual `tickets[index]`:
  1. `TicketQr` de la entrada actual (`size-40 md:size-32`).
  2. Bloque `flex w-full min-w-0 flex-col items-center gap-0.5 text-center`:
     - código `text-sm font-semibold tabular-nums` con prefijo `sr-only` "Código de entrada: " (p. ej. "TK-1042-01");
     - "Titular: {nombre}" (`text-sm text-muted-foreground break-words`), solo si el titular no está vacío ni es solo espacios.
  3. Paginador de entradas compartido (`components/shared/TicketPager`, MASTER §7) con `className="print:hidden"`: "Entrada n de N" (`text-lg font-bold tabular-nums`) y flechas "Entrada anterior" / "Entrada siguiente" (44 × 44 px), siempre visibles; la del extremo queda deshabilitada y enfocable (también ambas con 1 entrada). ArrowLeft/ArrowRight con el foco en una flecha cambian de entrada. Por container query va **apilado y centrado** (texto encima, flechas debajo) con < 256 px de contenedor, como en el talón `md+` (176 px de contenido) y a 320 px; **en fila** (texto a la izquierda, flechas a la derecha) desde 256 px.
- El cuerpo de la tarjeta (Zona, Entradas, Total pagado y asientos compactos) no cambia al navegar. "Descargar PDF" incluye siempre todas las entradas del pedido, sea cual sea la que se ve.
- **Móvil:** vertical (imagen, datos, separador, talón con QR, código, titular y paginador). **md+:** horizontal con el talón a la derecha.

### Acciones

- "Ver mis entradas" (primario, `Ticket`, enlace a `/mis-entradas`).
- "Agregar al calendario" (outline, `CalendarPlus`; texto visible "Calendario" en móvil y "Agregar al calendario" desde `sm`, `aria-label="Agregar al calendario"`): descarga `<slug>.ics` con título, fecha, "Lugar, Ciudad" y "Pedido <código> · N entradas · Mentec Tickets".
- "Descargar PDF" (`TicketsPdfButton` outline, `Download`): genera en el navegador y descarga `mentec-<pedido>.pdf` (p. ej. `mentec-TK-1042.pdf`), A4 con una página por entrada del pedido (anatomía, colores y fuente en MASTER §7 "PDF de entradas"). Recibe `buildTicketPdfInput(order)`; jsPDF se carga solo al pulsar. No abre el diálogo de impresión.
  - **Reposo:** `Download` + "Descargar PDF".
  - **Generando:** `Spinner` (`aria-hidden`, `size-5 motion-reduce:animate-none`) + "Generando…"; `aria-busy="true"` y `aria-disabled="true"` (`disabled` + `focusableWhenDisabled`: conserva el foco y no admite un segundo clic); `cursor-progress opacity-70`; región `sr-only` `role="status"` anuncia "Generando PDF…".
  - **Error:** vuelve a reposo y muestra debajo "No pudimos generar el PDF. Inténtalo de nuevo." (`role="alert"`, `text-sm text-destructive`, `col-span-2 text-center sm:basis-full`: ocupa las dos columnas en móvil y la línea completa desde `sm`). Al reintentar, el mensaje desaparece.
- **Móvil:** "Ver mis entradas" a todo el ancho y los otros dos en `grid-cols-2`. **sm+:** en fila. Todos `h-11` mínimo, `cursor-pointer`, iconos `aria-hidden`.

### Qué sigue

- `<section aria-labelledby>` con h2 "Qué sigue" `text-lg font-bold md:sr-only`: **visible por debajo de `md`** (tarjetas apiladas) y `sr-only` en `md+`. Siempre nombra la sección para el lector y mantiene la jerarquía h1 → h2 sin saltos.
- `<ol>` `grid gap-3 md:grid-cols-3` (en `md+` las 3 tarjetas en fila) de tarjetas `rounded-2xl bg-card ring-1 ring-border` con icono (`Download`, `QrCode`, `Ticket`, `aria-hidden`). Las descripciones con dos textos llevan uno corto (`<span className="md:hidden">`) y uno largo (`<span className="max-md:hidden">`); el oculto sale del árbol de accesibilidad. Sin "Revisa tu correo": en F3 no se envían correos.

  | Tarjeta | Texto corto (< md) | Texto largo (md+) |
  |---|---|---|
  | "Descarga tus entradas" | "Guárdalas en PDF o muéstralas desde Mis entradas." (un solo texto en todos los anchos) | (igual) |
  | "Muestra tu QR" | "Cada entrada tiene su QR. Muéstralo en el ingreso." | "Cada entrada tiene su propio QR. Muéstralo desde tu celular en el ingreso." |
  | "Todo en Mis entradas" | "Ingresa con tu cuenta para verlas cuando quieras." | "Entra con tu cuenta para ver y descargar tus entradas cuando quieras." |

### Impresión (Ctrl+P)

Ningún botón imprime; las clases `print:` solo limpian la impresión manual del navegador.

- Ocultos (`print:hidden`): la cabecera de compra (con el stepper), las acciones y "Qué sigue". No hay header ni footer del sitio.
- Visibles: cabecera de confirmación y tarjeta-entrada. El paginador del talón va con `print:hidden`: se imprimen el QR, el código y el titular de la entrada visible. El documento para imprimir todas las entradas es el PDF.

### Estados

Según el estado de la orden en la BD (`getOrderConfirmation`). Sin estado "cargando": la página llega ya con la orden. Todos menos `paid` son un `CheckoutStatusMessage` en `<PurchaseShell>` sin paso (cabecera solo con el logo y fondo gris; sin stepper, barra ni "Compra segura"):

| Estado | Cuándo | h1 / descripción | Acción |
|---|---|---|---|
| `paid` | el webhook emitió las entradas | "¡Compra confirmada!" (layout de arriba) | las de "Acciones" |
| `processing` (`payment-processing`) | orden `pending` con el PaymentIntent `succeeded`/`processing` (el webhook aún no llega) | "Estamos procesando tu pago" / "Esto puede tardar unos segundos. Esta página se actualizará sola." | "Volver al inicio" (outline). `AutoRefresh` pide la página cada 3 s (no con la pestaña oculta) |
| `payment-failed` | orden `pending` vigente con el pago sin completar (p. ej. 3DS rechazado) | "Tu pago no se completó" / "No se realizó ningún cobro. Puedes volver a intentarlo mientras tu reserva siga vigente." | "Volver a intentar el pago" → `/checkout?orden=<uuid>` |
| `expired` (`order-expired`) | la misma, con la reserva vencida | "Tu reserva expiró" (como en el paso 2) | "Volver a elegir entradas" |
| `refunded` (`order-refunded`) | el pago llegó sin los asientos y se reembolsó | "No pudimos confirmar tus entradas" / reembolso del 100 % (5 a 10 días hábiles) | "Volver a elegir entradas" |
| `not-found` (`order-not-found`) | sin `orden`, UUID inválido o inexistente | "No encontramos tu compra" / "El enlace no es válido o la compra ya no existe." | "Volver al inicio" |

### Reglas específicas

- Un único h1 ("¡Compra confirmada!"). Jerarquía h1 → h2: título del evento en la tarjeta-entrada y "Qué sigue" (visible por debajo de `md`, `sr-only` en `md+`).
- A 375 y 1440 px la pantalla sigue las capturas de "Confirmación".
- El QR (`TicketQr`) es decorativo y determinista (`role="img"` con `aria-label` "Código QR de la entrada <código>"); no es legible por lectores.
- Sin scroll horizontal a 375 / 768 / 1024 / 1440; targets ≥ 44 px; solo tokens; sin emojis; `prefers-reduced-motion` respetado.
- Metadata: `Confirmación de compra | Mentec Tickets`.
