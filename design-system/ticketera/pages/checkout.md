# Página: checkout `/checkout`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/checkout-mock-payment.md` (Fase 3; base en `docs/specs/checkout-purchase.md` Fase 1).

Paso 2 de 3 de la compra ("Datos y pago"). El pago es **simulado**: no hay pasarela ni se envían datos a ningún servicio; los datos de tarjeta solo existen en el estado del formulario.

## Layout

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

## Banner del temporizador (`ReservationTimer`)

- Bloque `rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3` con `Clock` (`aria-hidden`): "Reservamos tus entradas por **mm:ss**. Completa el pago antes de que se liberen." (`tabular-nums`, sin animaciones).
- Anuncio `aria-live="polite"` `sr-only` solo al cambiar el minuto.
- Al expirar (10 min): `Alert` destructivo "Tu reserva expiró" con "Volver a elegir entradas" (`h-11`) hacia el paso 1, y los botones "Pagar" quedan deshabilitados.

## Resumen (`CheckoutSummaryPanel` + `OrderSummary`)

- `<aside aria-label="Resumen de la compra">`.
- Móvil: botón `lg:hidden min-h-16 rounded-2xl ring-1 ring-border` con `aria-expanded`/`aria-controls`: miniatura 48 px (`alt=""`), título `line-clamp-1`, "3 entradas · S/ 910.00" ("1 entrada" en singular), `sr-only` "Resumen del pedido:" y `ChevronDown` (`aria-hidden`, rota 180° abierto, `motion-safe:transition-transform`). Plegado por defecto; en `lg` el contenido siempre se ve.
- `OrderSummary`: miniatura `next/image` `aspect-[4/3] w-24 rounded-lg`, título `line-clamp-2`, fecha overline, "Lugar, Ciudad", líneas "`<cantidad>` × `S/ <precio>`" con subtotal (y asientos si los hay), enlace "Cambiar entradas" (`TEXT_LINK font-semibold`), total `text-xl font-bold tabular-nums` y siempre "Precio final, sin cargos ocultos".
- "Cambiar entradas" y "Volver a elegir entradas" llevan al paso 1: `/eventos/<slug>/entradas` si el evento tiene mapa (`hasVenueMap`), si no `/eventos/<slug>`.

## Método de pago (`PaymentMethodFields`)

- Aviso `text-sm text-muted-foreground` con `Info`: "Pago simulado: no se realiza ningún cobro y los datos de tu tarjeta no se envían ni se guardan. Prueba con 4242 4242 4242 4242 (aprobada) o 4000 0000 0000 0002 (rechazada)."
- `RadioGroup` nombrado por el h2 de la sección, `grid gap-3 sm:grid-cols-3`: radio cards (patrón "choice card" de shadcn) `min-h-16 cursor-pointer`, seleccionada `border-primary bg-accent`; iconos `CreditCard` (Tarjeta), `Smartphone` (Yape), `Store` (PagoEfectivo), `aria-hidden`.
- Tarjeta: grilla `grid-cols-2 sm:grid-cols-4 gap-4`: "Número de tarjeta" (`col-span-2`, "0000 0000 0000 0000", se agrupa de 4 en 4), "Vencimiento" ("MM/AA"), "CVV" ("3 o 4 dígitos"), "Nombre en la tarjeta" (ancho completo). Todos `autoComplete="off"` (simulación: no se invita a guardar tarjetas reales), `inputMode="numeric"` en los numéricos, `h-11`.
- Yape / PagoEfectivo: sin campos; bloque `rounded-2xl bg-accent p-4` con su icono y el texto informativo.
- Error de pago: `Alert` destructivo bajo los métodos, recibe el foco al aparecer (p. ej. "Tu tarjeta fue rechazada…").

## Botón "Pagar"

- Primario, `type="submit"`, `h-12 w-full font-semibold`, icono `Lock` (`aria-hidden`): "Pagar S/ 910.00".
- No se deshabilita por Términos sin marcar (se valida al enviar y se enfoca el primer error). Solo se deshabilita al expirar la reserva y mientras se procesa: `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Procesando pago…", anunciado en una región `sr-only` `role="status"`.

## Reglas específicas

- Formulario: errores al enviar, revalidación al salir del campo tras el primer intento, foco al primer inválido, `aria-invalid` + `aria-describedby`, error junto al campo (`FieldError`).
- Términos: checkbox con "Acepto los Términos y condiciones y la Política de privacidad." (enlaces `INLINE_LINK`, pestaña nueva).
- Estados (`not-found`, `sold-out`, `invalid-tickets`, `free`, …): patrón del 404 de evento (centrado, h1 + descripción + acciones `h-11`); siempre con salida.
- Sin scroll horizontal a 375 / 768 / 1024 / 1440; targets ≥ 44 px; solo tokens; sin emojis.
- Metadata: `Finalizar compra | Mentec Tickets`.
