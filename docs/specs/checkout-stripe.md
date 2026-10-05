# Compra real: reserva en BD, pago con Stripe, webhook y "Mis entradas" desde la BD

- Módulo: checkout (con cambios en tickets y seating)
- Estado: aprobado

## Objetivo
Convertir el checkout simulado (`checkout-mock-payment.md`: pago falso, órdenes en el navegador con el store `mentec-orders`) en una compra real de la fase F3 de `docs/architecture/system-design.md`: el comprador reserva sus asientos en Postgres al pulsar "Continuar", paga con tarjeta mediante Stripe (modo test) sin salir del checkout, un webhook de Stripe emite las entradas con QR real y "Mis entradas" las lee de la base de datos. Para compradores (con o sin cuenta) y, de forma indirecta, para organizadores (comisión y neto congelados en cada orden).

## Alcance
- Incluye:
  - **F3.1 Reserva y orden en BD:** Server Action `startCheckout` desde "Continuar" de `/eventos/[slug]/entradas`; orden `pending` + `event_seats` `held` en una transacción; `/checkout?orden=<uuid>` lee la orden de la BD; temporizador con el `expires_at` real; estados de orden vencida/pagada/inexistente. El pago sigue siendo el simulado durante esta fase.
  - **F3.2 Pago Stripe + webhook + emisión + confirmación:** dependencias de Stripe, `lib/stripe.ts`, variables en `lib/env.ts`, Payment Element (solo tarjeta, Appearance Mentec), Server Action de pago, Route Handler `app/api/webhooks/stripe/route.ts` (firma, idempotencia, emisión o reembolso automático), confirmación leída de la BD.
  - **F3.3 "Mis entradas" desde la BD:** lista de órdenes del usuario y de las de invitado con su correo verificado (asociación al entrar), QR real con `qrcode`, PDF con el mismo QR, eliminación del store `mentec-orders`, del pago simulado y de las órdenes de demo.
- No incluye:
  - Correos (Resend), `tickets_emailed_at` queda `NULL`.
  - Cupones, cargo por servicio al comprador, comprobantes SUNAT.
  - Reembolso a pedido del cliente o del admin, webhook `refund.updated`, `refund_requests`.
  - Claves live/producción, endpoint de webhook registrado en el Dashboard, `APP_URL`.
  - Job de limpieza de órdenes vencidas (expiración perezosa; las órdenes vencidas quedan `pending` con `expires_at` pasado).
  - Yape, PagoEfectivo, billeteras (Apple/Google Pay), Link: Yape y PagoEfectivo solo se muestran deshabilitados con "Próximamente".
  - Límites anti-abuso de §10 (N órdenes `pending` por correo/IP, tope por documento).
  - Eventos gratuitos (total S/ 0): siguen mostrando "Este evento es de entrada libre", sin orden.
  - Cambiar la selección de asientos o el mapa (solo cambia la salida del botón "Continuar").
  - Búsqueda `pg_trgm` y caché del catálogo (otras partes de F3 en `system-design.md` §13, con su propia spec).

## Decisiones tomadas
(diseño aprobado por el usuario, no se reabre)
1. **Métodos de pago:** solo tarjeta vía Stripe en modo test. Yape y PagoEfectivo visibles pero deshabilitados con la etiqueta "Próximamente".
2. **UI de pago:** Payment Element embebido en `/checkout`, tema Mentec (Appearance API), sin redirigir a una página de Stripe salvo 3DS; temporizador visible.
3. **Reserva al entrar al checkout:** Server Action `startCheckout` (desde "Continuar" de `/eventos/[slug]/entradas`), en una transacción: crea la orden `pending` (`expires_at = now() + 10 min`, precios y comisión desde la BD, `user_id` si hay sesión, `code = 'TK-' || nextval('order_code_seq')`) y pasa los `event_seats` a `held`. Numerados: por los ids elegidos. Generales: `LIMIT n … FOR UPDATE SKIP LOCKED`. Disponible = `available` o `held` con `held_until < now()`. Si faltan asientos: rollback y "Esos asientos ya no están disponibles". Redirige a `/checkout?orden=<uuid>` (nunca el código `TK-`, que es adivinable). El temporizador usa el `expires_at` real. Expiración perezosa, sin cron.
4. **Pago:** Server Action valida orden `pending` y vigente, guarda los datos del comprador, crea el PaymentIntent con el importe de la orden (nunca del cliente), `currency: "pen"`, `allowed_payment_method_types: ["card"]`, `idempotencyKey = order.id`, `metadata.order_id`; el cliente llama a `stripe.confirmPayment` con `return_url = <origin>/checkout/confirmacion?orden=<uuid>`.
5. **Webhook** `app/api/webhooks/stripe/route.ts`: firma verificada con `STRIPE_WEBHOOK_SECRET` (`stripe.webhooks.constructEvent`), idempotencia con `stripe_events`; `payment_intent.succeeded` → transacción: si los asientos siguen con `order_id` de la orden → `sold`, `tickets` con `qr_token` aleatorio de 128 bits, orden `paid`; si no → reembolso automático del 100% y orden `refunded`.
6. **Confirmación** lee la orden de la BD: `paid` → entradas con QR real (librería `qrcode`); `pending` → "Procesando tu pago…" con refresco; `refunded` → explicación.
7. **"Mis entradas" desde la BD:** órdenes del usuario + las de invitado con su correo verificado en Clerk (se asocian a su cuenta al entrar). Se eliminan `mentec-orders`, el pago simulado y las órdenes de demo.
8. **Dinero:** sin cargo extra al comprador; comisión (`organizers.commission_bps`) y neto congelados en la orden; céntimos en la BD.
9. **Local:** `lib/stripe.ts` con `server-only`; claves validadas en `lib/env.ts` (en desarrollo solo `sk_test_`/`pk_test_`) más `STRIPE_WEBHOOK_SECRET`; `stripe listen --forward-to localhost:3000/api/webhooks/stripe` documentado.
10. **Fuera de F3:** correos (Resend), cupones, reembolso a pedido del cliente, claves live/producción, job de limpieza.

### Decisiones técnicas de esta spec
11. **Fases:** el diseño aprobado tiene 3 fases (F3.1, F3.2, F3.3); para respetar el límite de `docs/SETUP.md` (≤ 5 tareas / ~15 archivos por fase) se dividen en **7 fases** numeradas (1–2 = F3.1, 3–5 = F3.2, 6–7 = F3.3). Cada una se revisa y queda funcional por sí misma (ver Preguntas abiertas 1).
12. **Migración de `orders`** (`drizzle/0005_*.sql`): la orden nace en `startCheckout`, antes de conocer al comprador, así que `buyer_name`, `buyer_email`, `buyer_phone`, `buyer_document_type` y `buyer_document_number` pasan a `NULL`-ables con `CHECK orders_buyer_required_check (status = 'pending' OR (las cinco NOT NULL))`. Se añade `ticket_count integer NOT NULL CHECK (ticket_count > 0)`: el webhook lo necesita para saber si la orden conserva **todos** sus asientos (los asientos perdidos ya no apuntan a la orden). El SQL generado se edita para rellenar las órdenes demo existentes (`ADD COLUMN` nullable → `UPDATE … = (SELECT count(*) FROM event_seats WHERE order_id = orders.id)` → `SET NOT NULL`). Se documenta en `docs/architecture/erd.md`.
13. **Selección enviada a `startCheckout`:** el botón "Continuar" pasa a ser un `<form>` con un `<input type="hidden" name="selection">` cuyo valor es el `checkoutHref` que ya calculan seating y events (`/checkout?evento=…&<tipo>=<n>&asientos=…`, contrato C). Así no cambia ningún cálculo de selección. La acción lo valida con `getCheckoutOrder` (mismas reglas que hoy: evento, tipos, cantidades, mapa y asientos libres) y además con `ticket_types.max_per_order`. `/checkout?evento=…` deja de ser una página válida.
14. **Precios y comisión** se leen de la BD dentro de la transacción de reserva (`ticket_types.price_cents`, `organizers.commission_bps`): `platform_fee_cents = round(subtotal × bps / 10000)` (mismo redondeo que el seed), `organizer_amount_cents = subtotal − fee`.
15. **Cambiar de selección (cookie `mentec_checkout`):** `startCheckout` guarda el id de la orden en una cookie `httpOnly`, `sameSite: "lax"`, `secure` en producción, `path: "/"`, `maxAge: 600`. Al volver a pulsar "Continuar", si la cookie apunta a una orden `pending`, `releaseOrder` la vence en el acto (`expires_at = now()`) y libera sus asientos `held` **antes** de validar la nueva selección; sin esto, "Cambiar entradas" y "Volver a entradas" chocarían con los asientos que el propio comprador retiene durante 10 min. Si esa orden se llegara a pagar después, el webhook la reembolsa (no conserva sus asientos).
16. **Temporizador:** la página calcula `remainingMs = expires_at − now()` con el reloj de la BD y se lo pasa a `ReservationTimer`, que usa `useCountdown(remainingMs)` sin cambios (plazo relativo al montar: inmune al desfase de reloj del cliente). `ponytail:` el plazo visible se corre la latencia de carga (~1 s) a favor del comprador; el servidor siempre decide con `expires_at`.
17. **Entradas públicas nuevas del módulo checkout** (SETUP §1 regla 4): `modules/checkout/server.ts` (`import "server-only"`, funciones de servidor para páginas, route handler y `tickets`) y `modules/checkout/start.ts` (solo `StartCheckoutButton`, para que seating y events no arrastren el checkout al bundle). El barrel `index.ts` sigue exportando los componentes del checkout.
18. **Webhook en una sola transacción:** `INSERT stripe_events … ON CONFLICT DO NOTHING RETURNING` → si no inserta, 200 y fin; si inserta, se procesa en la misma transacción. Si algo falla, el rollback deshace también el registro del evento y Stripe reintenta. El reembolso (`stripe.refunds.create({ payment_intent }, { idempotencyKey: "refund-" + order.id })`) se llama dentro de la transacción, antes del commit: un reintento repite la misma clave y Stripe no duplica el reembolso. `ponytail:` la llamada a Stripe mantiene los locks de la orden ~1 s, solo en el caso raro de asiento perdido; mover a un job si molesta.
19. **Sin fila en `refunds`** para el reembolso automático: el ERD no tiene un `refund_reason` que encaje (ver Preguntas abiertas 2). Queda la orden `refunded`; el reembolso se consulta en Stripe por su PaymentIntent.
20. **Confirmación con orden `pending`:** se consulta el PaymentIntent en Stripe. `succeeded`/`processing` → "Estamos procesando tu pago" con refresco cada 3 s (el webhook aún no llega). Cualquier otro estado (`requires_payment_method` tras un 3DS fallido, sin PaymentIntent…) → "Tu pago no se completó" con "Volver a intentar el pago" → `/checkout?orden=<uuid>` si la reserva sigue vigente, o "Tu reserva expiró" si no.
21. **Acceso por UUID:** `/checkout?orden=<uuid>` y `/checkout/confirmacion?orden=<uuid>` son URLs-capacidad (UUID v4, 122 bits aleatorios); no se exige sesión porque se permite comprar como invitado. Nunca se usa el código `TK-` en URLs.
22. **Modelo de vista `Order` (contrato E):** se mantiene como el tipo que consumen la confirmación, "Mis entradas" y el PDF, pero se construye desde la BD (`buildOrderView`). Pierde `ownerEmail` y `paymentMethod`, `buyer` pasa a `{ name, email }` y cada entrada gana `qrToken`. El QR codifica solo `tickets.qr_token`.
23. **"Mis entradas":** órdenes `paid` con al menos una entrada cuyo `user_id` es el del usuario. En cada visita, si Clerk marca su correo principal como verificado, `claimGuestOrders` asigna `user_id` a las órdenes de invitado (`user_id IS NULL`) con `lower(buyer_email)` igual a ese correo y **ya cerradas** (`status IN ('paid', 'partially_refunded', 'refunded')`). Una orden `pending` no se vincula: su `buyer_email` todavía puede cambiar en un reintento de pago, y vincularla podría dar las entradas a otra persona. Las órdenes demo del seed (`paid` sin `tickets`) no aparecen.
24. **Claves de Stripe solo de test** en F3 (`sk_test_`, `pk_test_`, `whsec_`), en todos los entornos; aceptar claves live es de F8. Se validan en `lib/env.ts` como el resto (obligatorias: la app no arranca sin ellas, igual que con Clerk). La publicable llega al cliente como prop desde la página.
25. **Appearance de Stripe** (el iframe no lee variables CSS; única excepción a "solo tokens", comentada con el token equivalente de `design-system/ticketera/MASTER.md`): `theme: "stripe"`, `colorPrimary #0072F6`, `colorText #010817`, `colorTextSecondary #5A6070`, `colorDanger #E5484D`, `colorBackground #FFFFFF`, `borderRadius 12px`, `fontSizeBase 16px`, `fontFamily "ui-sans-serif, system-ui, sans-serif"` (Creato Display no carga en el iframe), regla `.Input` con borde `#D4D4D8` y alto ≥ 44 px. `locale: "es-419"`.
26. **Emisión:** una entrada por asiento de la orden, en el orden `ticket_types.sort_order`, fila (`length(row_label), row_label`), número y `id`; `code = <order.code>-01, -02…`; `holder_name = buyer_name`; `unit_price_cents = ticket_types.price_cents`; `qr_token = randomBytes(16).toString("base64url")` (128 bits, 22 caracteres). `ponytail:` el precio unitario se lee al emitir; si un organizador cambiara el precio dentro de los 10 min de la reserva, la suma de entradas no coincidiría con `subtotal_cents` (F5 limita la edición con ventas).
27. **Tests de integración sobre eventos `draft` propios** (`lib/db/testFixtures.ts`): los tests de catálogo comparan la BD sembrada con el mock, así que reservar asientos de eventos sembrados o publicar eventos de prueba los rompería. `seed.test.ts` pasa a contar solo las filas del seed.

## Requisitos

### Reserva (Fases 1–2)
1. **`startCheckout`** (Server Action, `useActionState`): recibe `FormData` con `selection` (string ≤ 2000 caracteres que empieza por `/checkout?`). Pasos:
   1. Si la cookie `mentec_checkout` trae un UUID, `releaseOrder(id)` (solo actúa si la orden está `pending`).
   2. Convierte la query de `selection` en `Record<string, string | string[]>` (claves repetidas → array) y llama a `getCheckoutOrder`. Cualquier estado distinto de `ok` → error.
   3. Usuario de la sesión con `getSessionUser()` (`@/modules/auth/server`); sin sesión o si falla, `null` (compra como invitado).
   4. `reserveCheckoutOrder(order, userId)`.
   5. `reserved` → cookie con el id (decisión 15) y `redirect("/checkout?orden=<uuid>")`.
   - Mensajes (`{ error }`): selección inválida, agotada o asientos ocupados (`invalid`/`unavailable`) → "Esos asientos ya no están disponibles. Elige otros para continuar."; evento inexistente, gratuito o error inesperado → "No pudimos reservar tus entradas. Inténtalo de nuevo." Los errores inesperados se registran con `console.error` sin datos personales.
2. **`reserveCheckoutOrder(order: CheckoutOrder, userId: string | null)`**, en una transacción:
   - Carga el evento por `slug`, su `organizers.commission_bps` y sus `ticket_types` (`id`, `slug`, `price_cents`, `max_per_order`). Un tipo inexistente o `quantity > max_per_order` → `invalid`.
   - Asientos numerados: los ids de `item.seats` (`<sección>-<fila>-<número>`, `parseSeatId`) se traducen a `event_seats.id` del evento por `venue_sections.slug`, `venue_seats.row_label` y `venue_seats.number`; si falta alguno → `invalid`.
   - Inserta la orden: `code = 'TK-' || nextval('order_code_seq')`, `status = 'pending'`, `expires_at = now() + interval '10 minutes'`, `user_id`, `ticket_count`, importes (decisión 14), comprador `NULL`.
   - Toma los asientos con `held_until = expires_at`, `status = 'held'` y `order_id = <orden>`:
     - numerados: `UPDATE event_seats … WHERE id = ANY($ids) AND ticket_type_id = $tipo AND (status = 'available' OR (status = 'held' AND held_until < now())) RETURNING id`;
     - "Disponible" excluye siempre los lugares retirados (`retired_at IS NULL`, columna de `0005_event_seat_retired` de main): un lugar retirado nunca se reserva ni se vende.
     - generales, en **dos sentencias** dentro de la misma transacción: `SELECT id FROM event_seats WHERE ticket_type_id = $tipo AND (disponible) ORDER BY venue_seat_id NULLS LAST, id LIMIT $n FOR UPDATE SKIP LOCKED` y luego `UPDATE … WHERE id = ANY($ids) AND (disponible) RETURNING id`. La forma con subconsulta (`UPDATE … WHERE id IN (SELECT … LIMIT n FOR UPDATE SKIP LOCKED)`) se descarta: Postgres puede reevaluar la subconsulta y retener más de `n` (lo reprodujo un test). Si se obtienen menos de `n`, rollback y `unavailable`.
   - Si alguna línea obtiene menos filas que las pedidas → rollback y `unavailable`. Si no → `{ status: "reserved", orderId }`.
3. **`releaseOrder(orderId)`**: en una transacción, si la orden está `pending`: `expires_at = now()` y sus asientos `held` → `available`, `order_id = NULL`, `held_until = NULL`. Otro estado o inexistente: no hace nada.
4. **Botón "Continuar" (`StartCheckoutButton`)**: sustituye al `Link` en `PurchaseSummary` y `MobilePurchaseBar` (seating) y en `TicketSelector` (events, eventos sin mapa). Mismo aspecto y texto ("Continuar" / "Continuar con la compra"). Con `checkoutHref === null`, botón deshabilitado como hoy. Mientras la acción corre: deshabilitado, `aria-busy`, `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Reservando…". Error: `<p role="alert">` (`text-sm text-destructive`) bajo el botón.
5. **`/checkout?orden=<uuid>`** (`getPendingCheckout`):
   - `orden` ausente, repetido, no UUID o inexistente → "No encontramos tu compra". Una orden con estado `expired` se trata igual que una `pending` vencida.
   - `pending` vencida (`expires_at <= now()`) → nueva variante `order-expired`: h1 "Tu reserva expiró", "El tiempo para completar la compra terminó y liberamos tus entradas. Vuelve a elegirlas para intentarlo de nuevo.", acción "Volver a elegir entradas" (`/eventos/<slug>`).
   - `paid` o `refunded` → `redirect` a `/checkout/confirmacion?orden=<uuid>` (desde la Fase 5; antes, "No encontramos tu compra").
   - `pending` vigente → el checkout actual con el pedido leído de la BD: datos del evento leídos junto con la orden (`slug`, `title`, `category`, `startsAt` ISO, recinto, ciudad, imagen), líneas por tipo en el orden de `sort_order` con sus asientos (`id` = `formatSeatId`, `label` = `formatSeatLabel(nombre del tipo, fila, número)`), `ticketCount`, `total = subtotal_cents / 100`; temporizador con el tiempo real restante (decisión 16); "Volver a entradas"/"Cambiar entradas" con `buildChangeTicketsHref` como hoy.
6. En las Fases 1–4 el pago sigue siendo el simulado (`checkout-mock-payment.md`); la orden de la BD queda `pending` y vence sola.

### Pago con Stripe (Fases 3 y 5)
7. **`payOrder(input: unknown)`** (Server Action): `payOrderInputSchema` (`orderId: z.uuid()`, `buyer`: nombres, apellidos, correo, celular, tipo y número de documento, `acceptTerms: true`; mismas reglas y mensajes que hoy). Llama a `createOrderPayment(orderId, buyer, sessionUserId)`:
   - En una transacción con la orden `FOR UPDATE`: inexistente o no `pending` → `order-unavailable`; `expires_at <= now()` → `order-expired`. Si no, guarda `buyer_name = "<nombres> <apellidos>"`, `buyer_email` (minúsculas, sin espacios), `buyer_phone = "+51<celular>"`, tipo y número de documento, y `user_id = COALESCE(user_id, <usuario de la sesión>)`.
   - Después del commit: `stripe.paymentIntents.create({ amount: subtotal_cents, currency: "pen", allowed_payment_method_types: ["card"], description: "Mentec Tickets <code>", metadata: { order_id } }, { idempotencyKey: order.id })` y guarda `stripe_payment_intent_id`. Devuelve `{ ok: true, clientSecret }`. Reintentar tras un rechazo devuelve el mismo PaymentIntent (misma clave e iguales parámetros).
   - Error de Stripe → `payment-error` (log con `type`/`code` del error, sin datos del comprador). Input inválido → `invalid-input`. El cliente nunca envía importes; los campos extra se descartan.
8. **Formulario de pago** (Fase 5): "Datos del comprador" y Términos como hoy (sin campos de tarjeta propios). "Método de pago": `RadioGroup` con "Tarjeta" seleccionada y "Yape" y "PagoEfectivo" deshabilitados con `Badge` "Próximamente" (se ven atenuados, no se pueden elegir). Bajo "Tarjeta": `PaymentElement` (`fields.billingDetails` `name`/`email`/`phone` = `"never"`, `wallets` `applePay`/`googlePay` = `"never"`); mientras carga, `Spinner` + "Cargando formulario de pago…" (`role="status"`); si falla la carga, `Alert` "No pudimos cargar el formulario de pago. Recarga la página."; nota con `Lock`: "Pago seguro procesado por Stripe. No almacenamos los datos de tu tarjeta."; nota de modo test: "Modo de prueba: no se realiza ningún cobro real. Tarjeta de prueba 4242 4242 4242 4242, cualquier fecha futura y CVC." `Elements` con `{ mode: "payment", amount: amountCents, currency: "pen", allowedPaymentMethodTypes: ["card"], appearance, locale: "es-419" }`.
9. **Envío** (Fase 5): Términos sin marcar → foco a la casilla (como hoy) → `useZodForm` valida al comprador (si falla, no se llama a Stripe ni a la acción) → `elements.submit()` (si devuelve error, Stripe lo muestra y se detiene) → `payOrder` → `stripe.confirmPayment({ elements, clientSecret, confirmParams: { return_url: <origin>/checkout/confirmacion?orden=<uuid>, payment_method_data: { billing_details: { name, email, phone: "+51…" } } } })`. Mensajes en el `Alert` actual: `card_error`/`validation_error` → `error.message` de Stripe; `order-expired` → "Tu reserva expiró. Vuelve a elegir tus entradas."; `order-unavailable` → "Esta compra ya no está disponible."; `invalid-input`/`payment-error` → "No pudimos iniciar el pago. Inténtalo de nuevo."; otro → el `UNEXPECTED_ERROR` actual. "Pagar S/ X" deshabilitado mientras Stripe/Elements no están listos, durante el proceso, tras la redirección y al expirar la reserva.
10. **Webhook `POST /api/webhooks/stripe`** (`handleStripeWebhook(payload, signature)`): `stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)`; firma ausente o inválida → 400. Tipo distinto de `payment_intent.succeeded` → 200 sin cambios. Para `payment_intent.succeeded`, en una transacción (decisión 18):
    - `stripe_events` ya tenía el `event.id` → 200 sin cambios.
    - `metadata.order_id` ausente o no UUID, orden inexistente, `stripe_payment_intent_id` distinto o `amount`/`currency` distintos de la orden → `console.error` (solo ids) y 200 sin cambios (el evento queda registrado).
    - Orden `paid`, `refunded` o `partially_refunded` → 200 sin cambios.
    - Orden `expired` → igual que si no conservara sus asientos (rama "Si no": reembolso del 100% y `refunded`). Hoy nada escribe `expired` (la expiración es perezosa), pero el pago confirmado nunca debe quedar cobrado sin entradas ni reembolso.
    - Asientos con `order_id` de la orden y `status = 'held'` (`FOR UPDATE`) = `ticket_count` (aunque `held_until` haya vencido) → asientos `sold` (`held_until = NULL`), `tickets` (decisión 26), orden `paid` con `paid_at = now()`.
    - Si no → asientos `held` restantes de la orden → `available`; reembolso del 100% (decisión 18); orden `refunded`.
    - Si `stripe.refunds.create` responde `charge_already_refunded` (reintento pasadas las 24 h de la clave de idempotencia, con el reembolso ya hecho), se trata como reembolso hecho y la transacción sigue.
    - Un error de `constructEvent` que no sea de firma se registra (solo `name`) antes de responder 500.
    - Cualquier error → rollback y 500 (Stripe reintenta).

### Confirmación (Fases 4–5)
11. **`/checkout/confirmacion?orden=<uuid>`** (`getOrderConfirmation`, estado según `getConfirmationState`):
    - `paid` → `OrderConfirmation` con la orden de la BD (código `TK-…`, entradas con código, titular y asiento). Texto bajo el h1 "¡Compra confirmada!": "Tus entradas están listas. Te las mostramos abajo y también las tienes en Mis entradas con tu cuenta de **<correo>**." En "Qué sigue", "Revisa tu correo" pasa a "Descarga tus entradas" / "Guárdalas en PDF o muéstralas desde Mis entradas." (no hay correos en F3; Preguntas abiertas 6).
    - `processing` → variante `payment-processing`: "Estamos procesando tu pago" / "Esto puede tardar unos segundos. Esta página se actualizará sola." + "Volver al inicio" (outline); `AutoRefresh` llama a `router.refresh()` cada 3 s.
    - `payment-failed` → "Tu pago no se completó" / "No se realizó ningún cobro. Puedes volver a intentarlo mientras tu reserva siga vigente." + "Volver a intentar el pago" (primario, `/checkout?orden=<uuid>`).
    - `expired` → variante `order-expired` (requisito 5).
    - `refunded` → variante `order-refunded`: "No pudimos confirmar tus entradas" / "Tu reserva venció antes de que se confirmara el pago y las entradas ya no estaban disponibles. Te devolvimos el 100 % del pago; puede tardar de 5 a 10 días hábiles en verse en tu tarjeta." + "Volver a elegir entradas" (`/eventos/<slug>`).
    - UUID inválido o inexistente → "No encontramos tu compra", con la descripción "El enlace no es válido o la compra ya no existe."

### "Mis entradas" y QR (Fases 6–7)
12. **`/mis-entradas`**: `requireUser` (como hoy) → `getVerifiedEmail()` → si hay correo verificado, `claimGuestOrders(user.id, email)` → `getUserPaidOrders(user.id)` → `splitOrdersByDate(orders, new Date())` → `MyTickets` con `upcoming` y `past`. Mismo diseño de pestañas, lista, tarjeta y estados vacíos que hoy; desaparecen el esqueleto de carga y el estado "Inicia sesión" (la página ya exige sesión).
13. **`getVerifiedEmail()`** (auth): correo principal de `currentUser()` de Clerk en minúsculas si `verification.status === "verified"`; si no, `null`.
14. **QR real** (Fase 7): `getQrModules(value)` devuelve la matriz de `QRCode.create(value, { errorCorrectionLevel: "M" })` de `qrcode`; `TicketQr` la dibuja en SVG con margen de 2 módulos dentro del `viewBox` y `aria-label` "Código QR de la entrada <código>" (prop nueva `ticketCode`; el token no se anuncia). El PDF usa la misma función. Confirmación y "Mis entradas" pasan `value={ticket.qrToken}`.
15. **Eliminado:** pago simulado (`processMockPayment`, `PaymentError`, validación de tarjeta propia), códigos `MT-`, store `mentec-orders` (`useOrdersStore`, `persistOrder`, `useStoredOrder`), `useMyOrders` y las órdenes de demo (`DEMO_ORDERS`).
16. **Accesibilidad y responsive:** un `<h1>` por página; targets ≥ 44 px; foco visible; iconos `aria-hidden`; errores con `role="alert"`; sin scroll horizontal a 375 / 768 / 1024 / 1440; tokens del tema (salvo decisión 25); sin emojis.

## Criterios de aceptación

### Fase 1 — Reserva en la BD (servidor)
- [ ] Dado `npm run db:migrate` sobre la rama `dev` con las órdenes demo del seed, entonces la migración aplica sin errores, cada orden demo tiene `ticket_count` igual a sus asientos vendidos y `npm run db:seed` sigue funcionando dos veces seguidas.
- [ ] Dado un `INSERT` de una orden `paid` con `buyer_email` nulo, entonces la BD lo rechaza (`orders_buyer_required_check`); con `pending`, lo acepta.
- [ ] Dado un evento de prueba con una zona general de 1 lugar, cuando se lanzan dos `reserveCheckoutOrder` en paralelo por 1 entrada, entonces una devuelve `reserved` y la otra `unavailable`, y hay una sola orden con ese lugar `held`.
- [ ] Dado el mismo asiento numerado pedido por dos reservas en paralelo, entonces gana una.
- [ ] Dada una reserva de 2 generales y 1 numerado a S/ 50 con `commission_bps = 1000`, entonces la orden queda `pending`, `code` `TK-<n>`, `expires_at` ≈ `now() + 10 min`, `ticket_count = 3`, `subtotal_cents = 15000`, `platform_fee_cents = 1500`, `organizer_amount_cents = 13500`, comprador nulo, y los 3 lugares `held` con su `order_id` y `held_until = expires_at`.
- [ ] Dado un lugar `held` con `held_until` vencido, cuando otra reserva lo pide, entonces se lo lleva (pasa a la nueva orden).
- [ ] Dada una cantidad mayor que `max_per_order` o un asiento numerado inexistente, entonces `invalid` y no se escribe nada.
- [ ] Dado `releaseOrder` de una orden `pending`, entonces sus lugares vuelven a `available` sin `order_id` y la orden queda vencida; sobre una orden `paid`, no cambia nada.
- [ ] Dado `getPendingCheckout` con un UUID inválido, uno inexistente, una orden vencida y una vigente, entonces devuelve `not-found`, `not-found`, `expired` (con `eventSlug`) y `ok` con líneas, asientos, total, `amountCents` y `remainingMs` entre 0 y 600 000.
- [ ] Dado `npx vitest run` (con y sin `DATABASE_URL_TEST`), `npm run lint` y `npm run build`, entonces pasan; `seed.test.ts` sigue pasando con los tests de checkout en paralelo.

### Fase 2 — "Continuar" reserva y `/checkout` lee la orden
- [ ] Dado `/eventos/noche-de-sintetizadores-lima/entradas` con 2 asientos elegidos, cuando se pulsa "Continuar", entonces el botón muestra "Reservando…", se llega a `/checkout?orden=<uuid>` y el resumen muestra los mismos asientos y el total, con "Reservamos tus entradas por 09:5x".
- [ ] Dado un evento sin mapa (detalle `/eventos/<slug>`), cuando se eligen entradas y se pulsa "Continuar con la compra", entonces se llega a `/checkout?orden=<uuid>` con esas entradas.
- [ ] Dado un asiento que otra persona reservó mientras tanto, cuando se pulsa "Continuar", entonces aparece "Esos asientos ya no están disponibles. Elige otros para continuar." bajo el botón y no se navega.
- [ ] Dado `/checkout?orden=<uuid>` recargado a los 3 minutos, entonces el temporizador muestra ~07:00 (no vuelve a 10:00).
- [ ] Dado "Cambiar entradas" desde `/checkout` y "Continuar" otra vez con los mismos asientos, entonces la nueva reserva funciona y en la BD la orden anterior está vencida y sin asientos.
- [ ] Dado `/checkout` sin `orden`, con `orden=abc`, con un UUID inexistente o con `?evento=…` (enlace antiguo), entonces "No encontramos tu compra".
- [ ] Dada una orden vencida, entonces "Tu reserva expiró" con "Volver a elegir entradas" → `/eventos/<slug>`.
- [ ] Dado el pago simulado sobre una orden de la BD, entonces sigue llegando a la confirmación actual.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 3 — Stripe base y pago en servidor
- [ ] Dado `package.json`, entonces incluye `stripe`, `@stripe/stripe-js` y `@stripe/react-stripe-js`.
- [ ] Dado `STRIPE_SECRET_KEY` ausente o `sk_live_…`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` `pk_live_…`, o `STRIPE_WEBHOOK_SECRET` sin `whsec_`, entonces `lib/env.ts` falla nombrando la variable; con `sk_test_`/`pk_test_`/`whsec_` pasa.
- [ ] Dado `README.md`, entonces documenta las tres variables, `stripe login`, `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (copiar su `whsec_` a `STRIPE_WEBHOOK_SECRET`) y las tarjetas de prueba.
- [ ] Dada una orden `pending` vigente y un comprador válido, cuando se llama a `payOrder`, entonces el comprador queda guardado (`+51…`, correo en minúsculas), Stripe recibe `amount = subtotal_cents`, `currency: "pen"`, `allowed_payment_method_types: ["card"]`, `metadata.order_id` e `idempotencyKey = order.id`, y la orden guarda `stripe_payment_intent_id`.
- [ ] Dada una llamada con `amount`/`total` añadidos al input, entonces se ignoran.
- [ ] Dada una orden vencida, pagada o inexistente, entonces `order-expired`, `order-unavailable` u `order-unavailable`, sin llamar a Stripe.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan sin llamadas reales a Stripe.

### Fase 4 — Webhook y lectura de la confirmación
- [ ] Dado un `payment_intent.succeeded` firmado de una orden que conserva sus asientos, entonces la orden queda `paid` con `paid_at`, sus lugares `sold` y hay `ticket_count` entradas `valid` con códigos `<TK>-01…`, titular = comprador y `qr_token` de 22 caracteres base64url, todos distintos.
- [ ] Dado el mismo evento enviado dos veces (en serie y en paralelo), entonces las entradas se emiten una sola vez y ambas respuestas son 200.
- [ ] Dada una orden vencida cuyo asiento tomó otra reserva, cuando llega su `payment_intent.succeeded`, entonces se llama una vez a `refunds.create` con su `payment_intent` e `idempotencyKey = "refund-<order.id>"`, la orden queda `refunded`, no hay entradas y sus lugares restantes quedan `available`.
- [ ] Dada una firma inválida o ausente, entonces 400; dado otro tipo de evento o un PaymentIntent sin `metadata.order_id` (p. ej. `stripe trigger payment_intent.succeeded`), entonces 200 sin cambios.
- [ ] Dado `getOrderConfirmation` para una orden `paid`, `refunded`, `pending` con PaymentIntent `succeeded`, `pending` con `requires_payment_method` vigente, la misma vencida y un UUID inexistente, entonces devuelve `paid` (con la vista `Order`), `refunded`, `processing`, `payment-failed`, `expired` y `not-found`.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 5 — Payment Element y confirmación en la UI
- [ ] Dado `/checkout?orden=<uuid>` vigente, entonces se ven "Datos del comprador", "Método de pago" con "Tarjeta" seleccionada y "Yape" y "PagoEfectivo" deshabilitados con "Próximamente", el Payment Element (solo tarjeta: sin pestañas, sin Apple/Google Pay, sin campos de nombre/correo/teléfono de Stripe) con colores y radios Mentec, Términos y "Pagar S/ X".
- [ ] Dado el formulario vacío con Términos marcados, cuando se pulsa "Pagar", entonces cada campo del comprador muestra su error, el foco va a "Nombres" y no se llama a Stripe ni a la acción.
- [ ] Dados datos válidos y la tarjeta `4242 4242 4242 4242`, cuando se paga, entonces se ve "Procesando pago…", Stripe redirige a `/checkout/confirmacion?orden=<uuid>` y, con `stripe listen` activo (el CLI muestra `[200] POST /api/webhooks/stripe`), se ve "¡Compra confirmada!" con el código `TK-…` y las entradas.
- [ ] Dada la tarjeta `4000 0000 0000 0002`, entonces aparece el mensaje de rechazo de Stripe en español, no hay redirección y se puede reintentar con otra tarjeta.
- [ ] Dada la tarjeta 3DS `4000 0025 0000 3155`, cuando se completa la autenticación, entonces "¡Compra confirmada!"; cuando se rechaza, entonces "Tu pago no se completó" con "Volver a intentar el pago".
- [ ] Dado un pago aprobado con `stripe listen` detenido, entonces la confirmación muestra "Estamos procesando tu pago" y pasa sola a "¡Compra confirmada!" al reactivarlo (Stripe reenvía el evento).
- [ ] Dado el código, entonces no existen `processMockPayment`, `utils/card.ts`, `parseOrderCode` ni `useStoredOrder`; no hay inputs propios de tarjeta ni `STRIPE_SECRET_KEY` en código cliente.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 6 — "Mis entradas" desde la BD
- [ ] Dado un usuario que compró con sesión, cuando abre `/mis-entradas`, entonces ve esa orden con sus entradas (en "Próximas" o "Pasadas" según la fecha del evento).
- [ ] Dada una compra como invitado con `Ana@Example.com` y un usuario cuyo correo verificado en Clerk es `ana@example.com`, cuando abre `/mis-entradas`, entonces la orden aparece y en la BD tiene su `user_id`.
- [ ] Dado un correo no verificado en Clerk, entonces no se asocia ninguna orden de invitado.
- [ ] Dadas órdenes `pending`, `refunded`, órdenes demo sin entradas y órdenes de otro usuario, entonces no aparecen.
- [ ] Dado el código, entonces no existen `mentec-orders`, `useOrdersStore`, `useMyOrders` ni `DEMO_ORDERS`.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

### Fase 7 — QR real
- [ ] Dada una entrada en la confirmación, en "Mis entradas" y en el PDF, cuando se escanea su QR con la cámara de un celular, entonces se lee exactamente su `qr_token` (22 caracteres).
- [ ] Dado un lector de pantalla, entonces el QR se anuncia como "Código QR de la entrada TK-…-01", sin el token.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan.

## Diseño técnico

Consultado en `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` (acciones con `useActionState`, `redirect` lanza y corta la acción, comprobación de Origin), `backend-for-frontend.md` (webhooks con Route Handlers) y `03-api-reference/03-file-conventions/route.md`. `searchParams` es `Promise` (`PageProps<"/checkout">`); `cookies()` de `next/headers` es async.

### Rutas (`app/`)
| Archivo | Fase | Qué hace |
|---|---|---|
| `app/(purchase)/checkout/page.tsx` | 2, 5 | `getPendingCheckout((await searchParams).orden)`; `not-found` → `CheckoutStatusMessage "order-not-found"`; `expired` → `"order-expired"`; `closed` → `redirect` a la confirmación (F5); `ok` → `CheckoutForm` con `order`, `remainingMs`, `changeHref` y (F5) `orderId`, `amountCents` y `publishableKey={publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`. |
| `app/(purchase)/checkout/confirmacion/page.tsx` | 5 | `getOrderConfirmation((await searchParams).orden)` → `OrderConfirmation` (`paid`) o `CheckoutStatusMessage` (resto; `processing` + `<AutoRefresh />`). |
| `app/api/webhooks/stripe/route.ts` | 4 | `export async function POST(request: Request)`: `handleStripeWebhook(await request.text(), request.headers.get("stripe-signature"))` → `new Response(null, { status })`. Cuerpo crudo (`text()`, nunca `json()`) para verificar la firma. Runtime Node por defecto. `proxy.ts` ya deja pasar `/api` sin exigir sesión. |
| `app/(site)/mis-entradas/page.tsx` | 6 | `requireUser` → `getVerifiedEmail` → `claimGuestOrders` → `getUserPaidOrders` → `splitOrdersByDate` → `<MyTickets upcoming past />`. |

### Componentes
| Componente | Estado | Fase | Notas |
|---|---|---|---|
| `button`, `card`, `alert`, `spinner`, `badge`, `radio-group`, `field`, `input`, `input-group`, `select`, `checkbox`, `tabs`, `skeleton` | shadcn (instalados) | — | Nada que instalar (`components/ui/` ya los tiene). |
| `Elements`, `PaymentElement`, `useStripe`, `useElements` (`@stripe/react-stripe-js`), `loadStripe` (`@stripe/stripe-js`) | dependencia nueva | 3 | Los iframes de Stripe son la única UI de tarjeta (PCI). |
| `modules/checkout/components/StartCheckoutButton.tsx` | nuevo (`"use client"`) | 2 | Props `{ checkoutHref: string \| null; className?: string; children: ReactNode }`. `useActionState(startCheckout, null)`; `<form action>` + `<input type="hidden" name="selection">` + `<button type="submit">` (requisito 4). Va en checkout porque usa su acción; se publica en `modules/checkout/start.ts`. No existe nada parecido (hoy los CTAs son `Link`). |
| `modules/seating/components/PurchaseSummary.tsx`, `MobilePurchaseBar.tsx` | existente (modificar) | 2 | El `Link`/botón deshabilitado del CTA → `<StartCheckoutButton checkoutHref className={CTA_CLASS}>Continuar <ArrowRight /></StartCheckoutButton>`. |
| `modules/events/components/TicketSelector.tsx` | existente (modificar) | 2 | Igual con `buildCheckoutHref(slug, quantities)` (o `null` con 0 entradas) y "Continuar con la compra". |
| `modules/checkout/components/ReservationTimer.tsx` | existente (modificar) | 2 | Prop nueva `durationMs: number` en lugar de la constante `RESERVATION_DURATION_MS`. |
| `modules/checkout/components/CheckoutForm.tsx` | existente (modificar) | 2, 5 | F2: prop `remainingMs` (al temporizador). F5: props `orderId`, `amountCents`, `publishableKey`; `stripePromise ??= loadStripe(publishableKey)` en una variable de módulo (una carga por pestaña); envuelve en `Elements` un formulario interno del mismo archivo (los hooks de Stripe deben ir dentro del provider); constante `STRIPE_APPEARANCE` (decisión 25); quita `persistOrder`, `processMockPayment` y los campos de tarjeta. |
| `modules/checkout/components/PaymentMethodFields.tsx` | existente (reescribir) | 5 | Props `{ labelledBy: string; children: ReactNode }` (`children` = Payment Element y sus estados). `RadioGroup` con valor fijo `"card"`; `yape`/`pagoefectivo` con `RadioGroupItem disabled` + `Badge variant="secondary"` "Próximamente". Sin campos de tarjeta propios. |
| `modules/checkout/components/CheckoutStatusMessage.tsx` | existente (modificar) | 2, 5 | Variantes nuevas `order-expired` (F2), `payment-processing`, `payment-failed`, `order-refunded` (F5) y texto nuevo de `order-not-found` (F5). Prop nueva `orderId?` para la acción "Volver a intentar el pago" (`href: "checkout"` → `/checkout?orden=<id>`). |
| `modules/checkout/components/AutoRefresh.tsx` | nuevo (`"use client"`) | 5 | `useEffect` con `setInterval(() => router.refresh(), 3000)`; devuelve `null`. Solo para la confirmación en proceso. `ponytail:` sin límite de intentos; añadir un tope si una orden se queda `processing` horas. |
| `modules/checkout/components/OrderConfirmation.tsx` | existente (modificar) | 5 | Recibe `order: Order` (ya no lee el store ni muestra "Cargando tu compra…"); textos del requisito 11. Sigue `"use client"` (calendario, PDF). |
| `modules/checkout/components/ConfirmationTicketCard.tsx`, `modules/tickets/components/TicketCard.tsx` | existente (modificar) | 7 | `<TicketQr value={ticket.qrToken} ticketCode={ticket.code} …>`. |
| `modules/tickets/components/MyTickets.tsx` | existente (modificar) | 6 | Props `{ upcoming: Order[]; past: Order[] }`; sin `useMyOrders`, `LoadingState` ni estado "Inicia sesión". Sigue `"use client"` (pestañas y selección). |
| `components/shared/TicketQr.tsx` | existente (modificar) | 7 | `getQrModules` con `qrcode`; prop `ticketCode` para el `aria-label`; `viewBox` con margen de 2 módulos. |

### Server Actions — `modules/checkout/actions/checkout.actions.ts` (`"use server"`, ya existe la carpeta `actions/` en `auth` como patrón)
```ts
// F2
export async function startCheckout(prev: StartCheckoutState, formData: FormData): Promise<StartCheckoutState>;
// F3
export async function payOrder(input: unknown): Promise<PayOrderResult>;
```
Solo exporta acciones (cada export de un archivo `"use server"` es un endpoint público). El parseo de `selection` es una función privada del archivo.

### Services (`import "server-only"`; reciben `database = db` opcional para los tests)
- `modules/checkout/services/reservation.service.ts` (F1): `reserveCheckoutOrder(order: CheckoutOrder, userId: string | null): Promise<ReservationResult>`, `releaseOrder(orderId: string): Promise<void>`.
- `modules/checkout/services/orders.service.ts`: `getPendingCheckout(orderId: unknown): Promise<PendingCheckoutResult>` (F1; `closed` en F4), `getOrderConfirmation(orderId: unknown): Promise<OrderConfirmationResult>` (F4; consulta el PaymentIntent solo si la orden está `pending` y tiene `stripe_payment_intent_id`; un error de Stripe cuenta como `null`), `getUserPaidOrders(userId: string): Promise<Order[]>` y `claimGuestOrders(userId: string, email: string): Promise<void>` (F6). Una sola consulta de entradas por lote de órdenes (`WHERE order_id = ANY($ids)`), sin N+1.
- `modules/checkout/services/orderPayment.service.ts` (F3): `createOrderPayment(orderId: string, buyer: CheckoutBuyer, sessionUserId: string | null): Promise<PayOrderResult>` (requisito 7).
- `modules/checkout/services/webhook.service.ts` (F4): `handleStripeWebhook(payload: string, signature: string | null): Promise<{ status: 200 | 400 }>`; lanza en errores inesperados (500).
- `modules/checkout/services/payment.service.ts` (mock) se **elimina** en F5.
- `modules/auth/services/session.service.ts` (F6): añade `getVerifiedEmail(): Promise<string | null>`.

### Utils puros
- `modules/checkout/utils/orderRules.ts`:
  ```ts
  export const RESERVATION_MINUTES = 10;                                   // F1
  export function computeOrderAmounts(
    lines: { priceCents: number; quantity: number }[], commissionBps: number,
  ): { ticketCount: number; subtotalCents: number; platformFeeCents: number; organizerAmountCents: number }; // F1
  export function getConfirmationState(                                    // F4
    order: { status: "pending" | "paid" | "expired" | "refunded" | "partially_refunded"; isExpired: boolean },
    paymentIntentStatus: Stripe.PaymentIntent.Status | null,               // import type desde "stripe"
  ): ConfirmationState;
  // paid/partially_refunded → "paid"; refunded → "refunded"; expired → "expired";
  // pending: PI succeeded|processing → "processing"; si no, isExpired → "expired"; si no → "payment-failed".
  ```
- `modules/checkout/utils/orderViews.ts`:
  ```ts
  type SeatPlace = { sectionSlug: string | null; rowLabel: string | null; number: number | null }; // null en zonas generales
  export type PendingSeatRow = SeatPlace & { ticketTypeSlug: string; ticketTypeName: string; priceCents: number }; // ya ordenadas
  export type OrderTicketRow = SeatPlace & { code: string; ticketTypeSlug: string; ticketTypeName: string; unitPriceCents: number; holderName: string; qrToken: string /* F7 */ };
  export function buildPendingCheckoutOrder(event: CheckoutOrder["event"], seats: PendingSeatRow[], subtotalCents: number): CheckoutOrder; // F1
  export function buildOrderView(
    order: { code: string; paidAt: Date; buyerName: string; buyerEmail: string; subtotalCents: number },
    event: CheckoutOrder["event"], tickets: OrderTicketRow[],
  ): Order;                                                                // F4
  ```
  Agrupa por tipo en el orden recibido; asiento numerado → `{ id: formatSeatId(section, row, number), label: formatSeatLabel(nombre del tipo, row, number) }`; `total = subtotalCents / 100`, `unitPrice = priceCents / 100`; `createdAt = paidAt.toISOString()`.
- Sin util para el código de entrada ni el token: `${code}-${String(i + 1).padStart(2, "0")}` y `randomBytes(16).toString("base64url")` van en línea en el webhook (se comprueban en su test de integración).

### Schemas — `modules/checkout/schemas/payment.schema.ts`
- F3: extrae la forma del comprador a `const buyerShape = { firstName, lastName, email, phone, documentType, documentNumber, acceptTerms }` (mismas reglas de `@/lib/formFields`) y añade:
  ```ts
  export const checkoutBuyerSchema = z.object(buyerShape).superRefine(/* getDocumentNumberError → ["documentNumber"] */);
  export const payOrderInputSchema = z.object({ orderId: z.uuid(), buyer: checkoutBuyerSchema }); // descarta claves extra
  ```
  `checkoutFormSchema` (con tarjeta) se mantiene hasta F5 reutilizando `buyerShape`.
- F5: se eliminan `cardDetailsSchema`, `checkoutFormSchema` y `orderCodeSchema`; se conservan `PAYMENT_METHODS` y `PAYMENT_METHOD_LABELS` (etiquetas de los radios).

### Tipos — `modules/checkout/types/checkout.types.ts`
```ts
// F1
export type ReservationResult = { status: "reserved"; orderId: string } | { status: "invalid" | "unavailable" };
export type PendingCheckoutResult =
  | { status: "not-found" }
  | { status: "expired"; eventSlug: string }
  | { status: "closed"; orderId: string }                       // F4: paid | refunded
  | { status: "ok"; orderId: string; amountCents: number; remainingMs: number; order: CheckoutOrder };
// F2
export type StartCheckoutState = { error: string } | null;
// F3
export type CheckoutBuyer = z.output<typeof checkoutBuyerSchema>;
export type PayOrderResult =
  | { ok: true; clientSecret: string }
  | { ok: false; error: "invalid-input" | "order-expired" | "order-unavailable" | "payment-error" };
// F4
export type ConfirmationState = "paid" | "refunded" | "processing" | "payment-failed" | "expired" | "not-found";
export type OrderConfirmationResult =
  | { status: "not-found" | "processing" }
  | { status: "paid"; order: Order }
  | { status: "payment-failed"; orderId: string }
  | { status: "expired" | "refunded"; eventSlug: string };
// Order (contrato E): F4 `buyer` → { name: string; email: string }; F7 quita `ownerEmail` y `paymentMethod`
// y añade `qrToken: string` a `OrderTicket`. Se eliminan `PaymentMethod`, `CheckoutFormValues`/`CheckoutFormData`
// pasan a derivar de `checkoutBuyerSchema` (F5) y `OrderBuyer` desaparece.
```

### Entradas públicas
- `modules/checkout/server.ts` (nuevo F2, `import "server-only"`; solo reexporta): `getPendingCheckout` (F2), `handleStripeWebhook` (F4), `getOrderConfirmation` (F4), `getUserPaidOrders`, `claimGuestOrders` (F6).
- `modules/checkout/start.ts` (nuevo F2): `StartCheckoutButton`.
- `modules/checkout/index.ts`: F5 quita `getCheckoutOrder` (ya solo lo usa la acción) y `parseOrderCode`; F6 quita `useOrdersStore`. `modules/checkout/orders.ts`: F6 quita `useOrdersStore` (quedan `buildTicketPdfInput` y los tipos `Order`/`OrderTicket`).
- `modules/seating/seats.ts` (F1): añade `formatSeatId` y `parseSeatId`.
- `modules/auth/server.ts` (F6): añade `getVerifiedEmail`.
- `modules/tickets/index.ts` (F6): añade `splitOrdersByDate`.

### `lib/` y configuración
- `lib/db/schema/sales.ts` (F1): decisión 12 (columnas de comprador sin `.notNull()`, `ticketCount: integer("ticket_count").notNull()`, `check("orders_buyer_required_check", …)`, `check("orders_ticket_count_check", sql\`… > 0\`)`). Migración con `npm run db:generate` y SQL editado para el relleno.
- `lib/db/seed/buildSeedData.ts` (F1): `ticketCount` de cada orden demo = asientos vendidos.
- `lib/db/testFixtures.ts` (F1, solo tests): `createTestEvent(options: { general?: number; numbered?: { rows: string[]; seatsPerRow: number }; priceCents?: number; commissionBps?: number }): Promise<{ eventId; slug; generalTicketTypeId?; numberedTicketTypeId?; generalSlug?; numberedSlug?; numberedSectionSlug?; cleanup(): Promise<void> }>` (`cleanup` borra en una transacción todo lo que creó). Crea con sufijo aleatorio: usuario + organizador, recinto `approved`, secciones (`general` con `capacity`, `numbered` con `venue_seats`), evento **`draft`** (decisión 27) de una categoría sembrada, `ticket_types` y `event_seats` disponibles.
- `lib/env.ts` (F3): `serverEnvSchema` + `STRIPE_SECRET_KEY: z.string().startsWith("sk_test_")`, `STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_")`; `publicEnvSchema` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_test_")` (acceso literal a `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
- `lib/stripe.ts` (F3): `import "server-only"; export const stripe = new Stripe(env.STRIPE_SECRET_KEY);` (versión de API la que fija el SDK).
- `vitest.config.mts` (F3): valores inertes `STRIPE_SECRET_KEY: "sk_test_unused"`, `STRIPE_WEBHOOK_SECRET: "whsec_test_unused"`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_unused"` (como los de Clerk).
- `README.md` (F3): sección "Pagos con Stripe (modo test)". `.env.example` ya trae las tres variables (no se toca).
- Dependencias: `stripe@^23`, `@stripe/stripe-js@^10`, `@stripe/react-stripe-js@^7` (peer `react <20`, `@stripe/stripe-js >=10 <11`: compatibles) en F3; `qrcode@^1.5` y `@types/qrcode@^1.5` (dev) en F7. `server-only` ya está.

### Contrato de API
- **`startCheckout`** — request `FormData { selection: string }` (`/checkout?evento=<slug>&<tipo>=<n>…&asientos=<id>,<id>`) → `redirect("/checkout?orden=<uuid>")` o `StartCheckoutState`.
- **`payOrder`** — request `z.input<typeof payOrderInputSchema>` = `{ orderId: string /* uuid */; buyer: { firstName; lastName; email; phone /* 9 dígitos */; documentType: "dni" | "ce" | "passport"; documentNumber; acceptTerms: true } }` → `PayOrderResult`.
- **Stripe `paymentIntents.create`** — `{ amount: number /* céntimos */, currency: "pen", allowed_payment_method_types: ["card"], description: "Mentec Tickets TK-…", metadata: { order_id: string } }`, opciones `{ idempotencyKey: order.id }`.
  - Nota de versión: `stripe@23` (API `2026-09-30.endive`) elimina `payment_method_types` de `PaymentIntentCreateParams`; su reemplazo es `allowed_payment_method_types`. En `@stripe/stripe-js@10` la opción de `Elements` es `allowedPaymentMethodTypes`. Ambos siguen limitando el pago a tarjeta (decisión 1).
- **Stripe `refunds.create`** — `{ payment_intent: string }` (importe total por defecto), opciones `{ idempotencyKey: "refund-" + order.id }`.
- **`POST /api/webhooks/stripe`** — cabecera `stripe-signature`, cuerpo crudo de Stripe → `200` (procesado, duplicado o ignorado), `400` (firma), `500` (error; Stripe reintenta). Sin cuerpo de respuesta.
- **Retorno de Stripe** — `GET /checkout/confirmacion?orden=<uuid>&payment_intent=…&payment_intent_client_secret=…&redirect_status=…`: solo se lee `orden`; el estado sale de la BD (y del PaymentIntent si la orden sigue `pending`).
- **Cookie** `mentec_checkout=<uuid>` (decisión 15).

### Desarrollo local con webhooks
```sh
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # imprime whsec_… → STRIPE_WEBHOOK_SECRET
npm run dev
```
Tarjetas: `4242 4242 4242 4242` (aprobada), `4000 0000 0000 0002` (rechazada), `4000 0000 0000 9995` (fondos insuficientes), `4000 0025 0000 3155` (3DS). Cualquier fecha futura y CVC.

## Reutilización
- **checkout:** `getCheckoutOrder`/`resolveCheckoutOrder`/`buildCheckoutOrder` (validación completa de la selección, sin cambios), `buildChangeTicketsHref`, `OrderSummary`, `CheckoutSummaryPanel`, `RequiredMark`, `ReservationTimer` + `useCountdown` (sin cambios en el hook), `CheckoutForm` (campos del comprador, Términos, `PayButton`, guarda de envíos concurrentes, foco al error), `CheckoutStatusMessage`, `OrderConfirmation` + `ConfirmationTicketCard` (diseño de la confirmación), `buildTicketPdfInput`, tipos `CheckoutOrder` y `Order`.
- **seating / events:** el `checkoutHref` que ya calculan `useSeatSelection`/`buildSeatingCheckoutHref` y `buildCheckoutHref` (contrato C) viaja tal cual como `selection`; `parseSeatId`, `formatSeatId`, `formatSeatLabel`; la expresión de disponibilidad (`available` o `held` vencido) ya usada en `events.service` y `seating.service`.
- **auth:** `getSessionUser`, `requireUser` (`@/modules/auth/server`), `useSessionUser` (precarga del comprador), patrón de Server Action de `profile.actions.ts` (validar `unknown` con zod, `console.error` sin datos personales).
- **compartido:** `useZodForm` (`hooks/`), `lib/formFields` (reglas y mensajes del comprador), `lib/linkStyles`, `lib/calendar` (Agregar al calendario), `lib/ticketPdf` + `TicketsPdfButton`, `TicketPager`, `TicketQr` (se cambia su interior, no su uso), `PurchaseShell`, `EmptyState`, `lib/env.ts` (patrón de validación), `lib/db/client`, `describeWithDb`, `testGlobalSetup` (migra y siembra la rama `test`).
- **tickets:** `splitOrdersByDate`, `formatTicketCount`, `formatOrderZones`, `getDateChipParts`, `OrderList`, `TicketCard`.
- **shadcn:** todo lo necesario está instalado (`radio-group`, `badge`, `spinner`, `alert`, `card`, `field`, `input`, `input-group`, `select`, `checkbox`, `tabs`, `skeleton`, `button`); no se instala nada.
- **Nativo / ya instalado:** `crypto.randomBytes` (token), `URLSearchParams` (selección), `FOR UPDATE SKIP LOCKED`, `ON CONFLICT DO NOTHING`, `nextval` (Postgres), `useActionState` (React 19), cookies de Next. Dependencias nuevas solo las imprescindibles: SDKs de Stripe (F3) y `qrcode` (F7).

## Tests
Unitarios junto al archivo; los de BD con `describeWithDb` (se omiten sin `DATABASE_URL_TEST`) sobre eventos `draft` de `createTestEvent` (decisión 27), con `// @vitest-environment node`.

**Fase 1**
- `orderRules.test.ts`: `computeOrderAmounts` con 2 × 5000 + 1 × 5000 y 1000 bps → `{ ticketCount: 3, subtotalCents: 15000, platformFeeCents: 1500, organizerAmountCents: 13500 }`; redondeo (3333 → fee 333; 3335 → 334); 0 bps → fee 0; 10000 bps → neto 0; siempre `fee + neto = subtotal`.
- `orderViews.test.ts`: `buildPendingCheckoutOrder` agrupa por tipo en el orden recibido, `quantities` y `ticketCount` correctos, asientos numerados con `id`/`label` (`"Platea · Fila B · Asiento 4"`), líneas generales sin `seats`, `total = subtotal / 100`.
- `reservation.service.test.ts` (BD): dos reservas en paralelo por el último lugar general → una `reserved`, una `unavailable`; mismo asiento numerado en paralelo → gana una; reserva mixta → importes, `TK-`, `expires_at`, `ticket_count`, lugares `held` con `held_until = expires_at`; lugar con retención vencida → lo toma la nueva orden; `max_per_order` superado y asiento inexistente → `invalid` sin filas nuevas; `releaseOrder` en `pending` libera y vence; en `paid` no cambia nada.
- `orders.service.test.ts` (BD): `getPendingCheckout` con `"abc"`, UUID inexistente, orden vencida (forzando `expires_at` al pasado) y vigente.
- `seed.test.ts`: los conteos solo miran filas del seed (ids de `buildSeedData`, o `event_id`/`venue_id`/`section_id` del seed en tablas grandes).

**Fase 2**
- `checkout.actions.test.ts` (`vi.mock` de `../services/checkout.service`, `../services/reservation.service`, `@/modules/auth/server`, `next/headers` y `next/navigation`): selección válida → `getCheckoutOrder` recibe los params (claves repetidas como array), `reserveCheckoutOrder` recibe el pedido y el id de sesión, se fija la cookie (`httpOnly`, `sameSite: "lax"`, `maxAge: 600`) y `redirect("/checkout?orden=<uuid>")`; cookie previa → `releaseOrder` se llama antes de `getCheckoutOrder`; `selection` ausente, sin prefijo `/checkout?` o de más de 2000 caracteres → error sin llamar a servicios; `invalid-tickets`/`sold-out`/`unavailable` → "Esos asientos ya no están disponibles…"; `not-found`/`free`/excepción → "No pudimos reservar tus entradas…"; `getSessionUser` que lanza → reserva como invitado.
- `StartCheckoutButton.test.tsx` (`vi.mock("../actions/checkout.actions")`): `null` → botón deshabilitado sin formulario; con href → `input[name=selection]` con ese valor; al enviar llama a la acción con ese `FormData`; mientras espera, "Reservando…" y deshabilitado; con `{ error }` muestra el `role="alert"`.
- `TicketSelection.test.tsx`, `TicketSelector.test.tsx`: `vi.mock("@/modules/checkout/start")` con un stub que expone `checkoutHref`; las aserciones de `href` pasan a comprobar ese valor (mismos casos que hoy).
- `CheckoutForm.test.tsx`: renderiza con `remainingMs`; la expiración ocurre a los `remainingMs` (no a los 10 min fijos).

**Fase 3**
- `lib/env.test.ts`: falta o prefijo inválido de cada variable de Stripe (`sk_live_`, `pk_live_`, sin `whsec_`) → error que la nombra; valores de test → válido.
- `payment.schema.test.ts`: `checkoutBuyerSchema` válido (recorta espacios), errores de cada campo con los mensajes actuales, DNI de 7 dígitos; `payOrderInputSchema` exige UUID y descarta `amount`/`total`.
- `orderPayment.service.test.ts` (BD + `vi.mock("@/lib/stripe")`): orden vigente → comprador guardado (`+51…`, correo en minúsculas, `user_id` de la sesión si estaba vacío), `paymentIntents.create` con importe, moneda, tipos, metadata e `idempotencyKey`, `stripe_payment_intent_id` guardado y `clientSecret` devuelto; segundo intento → misma `idempotencyKey`; vencida → `order-expired`; `paid` o inexistente → `order-unavailable` (sin Stripe); Stripe lanza → `payment-error`.
- `checkout.actions.test.ts`: `payOrder` con input inválido → `invalid-input` sin servicio; claves extra descartadas; pasa el id de sesión (o `null`) y devuelve el resultado del servicio.

**Fase 4**
- `webhook.service.test.ts` (BD; `vi.mock("@/lib/stripe")` con `webhooks` reales de `new Stripe("sk_test_unused")` y `refunds.create = vi.fn()`; cuerpo firmado con `stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET })`): emisión completa (estado, `paid_at`, lugares `sold`, entradas, códigos, titular, tokens únicos de 22 caracteres); mismo evento dos veces en serie y en paralelo → una emisión; reserva vencida con un lugar tomado por otra orden → un `refunds.create` con su clave, orden `refunded`, sin entradas, lugares restantes `available`; firma inválida/ausente → 400; otro tipo, sin `order_id`, PaymentIntent o importe distintos → 200 sin cambios; orden ya `paid` → 200 sin cambios.
- `orderRules.test.ts`: tabla de `getConfirmationState` (todas las combinaciones del Diseño técnico).
- `orderViews.test.ts`: `buildOrderView` (código, `createdAt`, `buyer`, líneas agrupadas con precio unitario, entradas en orden con `seatLabel` solo en numeradas, `total`).
- `orders.service.test.ts` (BD + `paymentIntents.retrieve` mockeado): `getOrderConfirmation` para cada estado del criterio; `getPendingCheckout` → `closed` para `paid` y `refunded`.
- `order.test.ts`: `buildOrder` devuelve `buyer: { name, email }`.

**Fase 5**
- `CheckoutForm.test.tsx` (`vi.mock("@stripe/react-stripe-js")` con `Elements` que renderiza `children`, `PaymentElement` que llama a `onReady`, `useStripe`/`useElements` falsos; `vi.mock("@stripe/stripe-js")`; `vi.mock("../actions/checkout.actions")`): Yape y PagoEfectivo deshabilitados con "Próximamente"; envío vacío → errores, foco en "Nombres", sin `elements.submit` ni acción; envío válido → "Procesando pago…", `elements.submit`, `payOrder({ orderId, buyer })` sin importes, `confirmPayment` con `clientSecret`, `return_url` que termina en `/checkout/confirmacion?orden=<uuid>` y `billing_details` con `+51`; `card_error` → su mensaje y botón reactivado; `order-expired` → su mensaje sin `confirmPayment`; `elements.submit` con error → sin acción; precarga desde la sesión; expiración → botón deshabilitado.
- `OrderConfirmation.test.tsx`: con una `Order` de prueba muestra h1, código `TK-…`, correo, entradas con el pager, "Ver mis entradas", calendario y PDF; "Qué sigue" sin "Revisa tu correo".
- `payment.schema.test.ts`: se quitan los casos de tarjeta.

**Fase 6**
- `session.service.test.ts` (`vi.mock("@clerk/nextjs/server")`): `getVerifiedEmail` con correo verificado → en minúsculas; no verificado, sin correo principal o sin usuario → `null`.
- `orders.service.test.ts` (BD): `claimGuestOrders` asigna `user_id` a las órdenes de invitado con ese correo (sin distinguir mayúsculas) y no toca las de otro correo, las que ya tienen dueño ni las `pending`; `getUserPaidOrders` devuelve solo `paid` con entradas del usuario, sin `pending`/`refunded`/demo.
- `MyTickets.test.tsx`: renderiza con `upcoming`/`past` (pestañas con conteos, lista, tarjeta, vacíos); `myOrders.test.ts`: se quitan los casos de `getUserOrders`.

**Fase 7**
- `TicketQr.test.tsx`: `getQrModules(v)` es la matriz de `QRCode.create(v, { errorCorrectionLevel: "M" })` (tamaño ≥ 21), determinista, distinta para otro valor, con los tres patrones de posición; `aria-label` con `ticketCode` y sin el token.
- `ticketPdf.test.ts`: el QR del PDF sale de `qrToken`.
- `orderViews.test.ts`, `ticketPdfInput.test.ts`, `orders.service.test.ts`: `qrToken` en cada entrada; fixtures sin `ownerEmail`/`paymentMethod`.
- `OrderConfirmation.test.tsx`, `TicketCard.test.tsx`, `MyTickets.test.tsx`: fixtures con `qrToken`.

**Sin tests:** páginas de `app/` y `route.ts` (solo componen/delegan), `lib/stripe.ts` (una línea), `AutoRefresh` (efecto de tres líneas), `PaymentMethodFields` y `CheckoutStatusMessage` (presentacionales; cubiertos por `CheckoutForm.test`), entradas públicas (`server.ts`, `start.ts`, `index.ts`, `orders.ts`), `lib/db/testFixtures.ts` (lo ejercitan los tests de BD), tipos y `components/ui/`.

## Plan de tareas
Coordinación: no hay otra spec abierta sobre estos archivos. Nunca dos `npm install` a la vez. Las tareas con BD no ejecutan `db:migrate` contra `dev` en paralelo. Cada fase termina con `npx vitest run`, `npm run lint` y `npm run build` del reviewer.

### Fase 1 — Reserva en la BD (servidor) · F3.1, parte 1 · 18 archivos (3 generados/doc)
- [x] T1 — Migración de `orders` (decisión 12), `ticketCount` en el seed, `seed.test.ts` que cuenta solo filas del seed y ERD actualizado; aplicar con `npm run db:migrate` · archivos: `lib/db/schema/sales.ts`, `drizzle/0005_<nombre>.sql` (generado y editado), `drizzle/meta/0005_snapshot.json`, `drizzle/meta/_journal.json` (generados), `lib/db/seed/buildSeedData.ts`, `lib/db/seed/seed.test.ts`, `docs/architecture/erd.md` · depende de: — · secuencial (base)
- [x] T2 — Fixtures de test (`createTestEvent`) y `parseSeatId`/`formatSeatId` en la entrada de seating · archivos: `lib/db/testFixtures.ts`, `modules/seating/seats.ts` · depende de: T1 · secuencial (lib/ y entrada pública)
- [x] T3 — `orderRules` (`RESERVATION_MINUTES`, `computeOrderAmounts`) con test y tipos `ReservationResult`/`PendingCheckoutResult` · archivos: `modules/checkout/utils/orderRules.ts`, `modules/checkout/utils/orderRules.test.ts`, `modules/checkout/types/checkout.types.ts` · depende de: T1 · paralelo con T2
- [x] T4 — `reserveCheckoutOrder` y `releaseOrder` con test de integración · archivos: `modules/checkout/services/reservation.service.ts`, `modules/checkout/services/reservation.service.test.ts` · depende de: T2, T3 · secuencial
- [x] T5 — `buildPendingCheckoutOrder` y `getPendingCheckout` con tests · archivos: `modules/checkout/utils/orderViews.ts`, `modules/checkout/utils/orderViews.test.ts`, `modules/checkout/services/orders.service.ts`, `modules/checkout/services/orders.service.test.ts` · depende de: T4 (su test crea órdenes con la reserva) · secuencial

### Fase 2 — "Continuar" reserva y `/checkout` lee la orden · F3.1, parte 2 · 16 archivos
- [x] T1 — `startCheckout`, `StartCheckoutButton` con tests y entrada `start.ts` · archivos: `modules/checkout/actions/checkout.actions.ts`, `modules/checkout/actions/checkout.actions.test.ts`, `modules/checkout/components/StartCheckoutButton.tsx`, `modules/checkout/components/StartCheckoutButton.test.tsx`, `modules/checkout/start.ts` · depende de: Fase 1 · secuencial (base: entrada pública)
- [x] T2 — CTAs de seating y events con el botón nuevo · archivos: `modules/seating/components/PurchaseSummary.tsx`, `modules/seating/components/MobilePurchaseBar.tsx`, `modules/seating/components/TicketSelection.test.tsx`, `modules/events/components/TicketSelector.tsx`, `modules/events/components/TicketSelector.test.tsx` · depende de: T1 · paralelo con T3
- [x] T3 — `/checkout?orden=` desde la BD: entrada `server.ts`, temporizador con `durationMs`, `CheckoutForm` con `remainingMs`, variante `order-expired` · archivos: `modules/checkout/server.ts`, `modules/checkout/components/ReservationTimer.tsx`, `modules/checkout/components/CheckoutForm.tsx`, `modules/checkout/components/CheckoutForm.test.tsx`, `modules/checkout/components/CheckoutStatusMessage.tsx`, `app/(purchase)/checkout/page.tsx` · depende de: Fase 1 · paralelo con T1 y T2

### Fase 3 — Stripe base y pago en servidor · F3.2, parte 1 · 14 archivos
- [x] T1 — `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`; variables en `lib/env.ts` con test; valores inertes en Vitest; `lib/stripe.ts`; sección de Stripe en el README · archivos: `package.json`, `package-lock.json`, `lib/env.ts`, `lib/env.test.ts`, `vitest.config.mts`, `lib/stripe.ts`, `README.md` · depende de: Fase 2 · secuencial (base)
- [x] T2 — `checkoutBuyerSchema`/`payOrderInputSchema`, tipos de pago y `createOrderPayment` con tests · archivos: `modules/checkout/schemas/payment.schema.ts`, `modules/checkout/schemas/payment.schema.test.ts`, `modules/checkout/types/checkout.types.ts`, `modules/checkout/services/orderPayment.service.ts`, `modules/checkout/services/orderPayment.service.test.ts` · depende de: T1 · secuencial
- [x] T3 — Acción `payOrder` con test · archivos: `modules/checkout/actions/checkout.actions.ts`, `modules/checkout/actions/checkout.actions.test.ts` · depende de: T2 · secuencial

### Fase 4 — Webhook y lectura de la confirmación · F3.2, parte 2 · 14 archivos
- [x] T1 — `handleStripeWebhook` con test de integración, Route Handler y export en `server.ts` · archivos: `modules/checkout/services/webhook.service.ts`, `modules/checkout/services/webhook.service.test.ts`, `app/api/webhooks/stripe/route.ts`, `modules/checkout/server.ts` · depende de: Fase 3 · secuencial (entrada pública)
- [x] T2 — `getConfirmationState`, `buildOrderView` con tests; `Order.buyer` → `{ name, email }` (y su uso en el mock y la demo) · archivos: `modules/checkout/utils/orderRules.ts`, `modules/checkout/utils/orderRules.test.ts`, `modules/checkout/utils/orderViews.ts`, `modules/checkout/utils/orderViews.test.ts`, `modules/checkout/types/checkout.types.ts`, `modules/checkout/utils/order.ts`, `modules/checkout/utils/order.test.ts`, `modules/tickets/data/demoOrders.ts` · depende de: Fase 3 · paralelo con T1
- [x] T2b — Ajuste mecánico de fixtures por el cambio de `Order.buyer` a `{ name, email }` (derivado de T2; sin cambios de comportamiento) · archivos: `modules/checkout/services/payment.service.test.ts`, `modules/checkout/components/CheckoutForm.test.tsx`, `modules/checkout/components/OrderConfirmation.test.tsx`, `modules/checkout/hooks/useStoredOrder.test.ts`, `modules/checkout/stores/orders.store.test.ts`, `modules/checkout/utils/ticketPdfInput.test.ts`, `modules/tickets/hooks/useMyOrders.test.ts`, `modules/tickets/utils/myOrders.test.ts` · depende de: T2 · paralelo con T1
- [x] T3 — `getOrderConfirmation` y `closed` en `getPendingCheckout`, con test · archivos: `modules/checkout/services/orders.service.ts`, `modules/checkout/services/orders.service.test.ts`, `modules/checkout/server.ts` · depende de: T1, T2 · secuencial
- [x] T4 — Correcciones de la revisión de la Fase 4 (merge con main): `seed.test.ts` cuenta y compara solo filas del seed en el bloque "seed incremental" (`countActiveRows`, `tableIds`/`missingIds`, `fingerprint` filtrados por ids del seed, como `countSeedRows`), para que pase en paralelo con los tests de checkout; README menciona la excepción revisada de `0006` (`ALLOWED_VIOLATIONS`) · archivos: `lib/db/seed/seed.test.ts`, `README.md` · depende de: T1–T3 · paralelo con T5
- [x] T5 — Correcciones de la revisión de la Fase 4 (checkout): `isSeatAvailable` excluye `retired_at` con test (un lugar general retirado no se reserva); webhook trata `charge_already_refunded` como reembolso hecho y registra el `name` de los errores de `constructEvent` que no son de firma, con tests; timeout propio (~20 s) del test de eventos inválidos en serie · archivos: `modules/checkout/services/reservation.service.ts`, `modules/checkout/services/reservation.service.test.ts`, `modules/checkout/services/webhook.service.ts`, `modules/checkout/services/webhook.service.test.ts` · depende de: T1–T3 · paralelo con T4
- [x] T6 — Estabilidad de la suite con BD: `testTimeout: 60_000` global en `vitest.config.mts` (comentario `ponytail:` con el límite: tests contra Neon remoto y esperas por bloqueo de filas mientras `seed.test.ts` reescribe filas del seed durante 18–35 s; el arreglo de fondo es que los tests de "retirados" de events/seating usen un evento propio). Cubre los timeouts intermitentes de `reservation.service.test.ts` ("lugares retirados"), `events.service.test.ts`, `seating.service.test.ts` y `OrganizerEventForm.test.tsx` · archivos: `vitest.config.mts` · depende de: T4, T5 · secuencial

### Fase 5 — Payment Element y confirmación en la UI · F3.2, parte 3 · 13 archivos + 8 eliminados
- [x] T1 — Formulario con Stripe (Elements, Payment Element, Appearance, `payOrder`, `confirmPayment`), métodos con "Próximamente", esquema sin tarjeta · archivos: `modules/checkout/components/CheckoutForm.tsx`, `modules/checkout/components/CheckoutForm.test.tsx`, `modules/checkout/components/PaymentMethodFields.tsx`, `modules/checkout/schemas/payment.schema.ts`, `modules/checkout/schemas/payment.schema.test.ts`, `modules/checkout/types/checkout.types.ts` · elimina: `modules/checkout/utils/card.ts`, `modules/checkout/utils/card.test.ts`, `modules/checkout/services/payment.service.ts`, `modules/checkout/services/payment.service.test.ts` · depende de: Fase 4 · paralelo con T2
- [x] T2 — Confirmación desde la BD: `OrderConfirmation` con prop `order`, `AutoRefresh`, variantes de estado · archivos: `modules/checkout/components/OrderConfirmation.tsx`, `modules/checkout/components/OrderConfirmation.test.tsx`, `modules/checkout/components/AutoRefresh.tsx`, `modules/checkout/components/CheckoutStatusMessage.tsx` · elimina: `modules/checkout/hooks/useStoredOrder.ts`, `modules/checkout/hooks/useStoredOrder.test.ts` · depende de: Fase 4 · paralelo con T1
- [x] T3 — Rutas (`/checkout` con Stripe y redirección de `closed`; `/checkout/confirmacion` desde la BD), barrel y fin de los códigos `MT-` · archivos: `app/(purchase)/checkout/page.tsx`, `app/(purchase)/checkout/confirmacion/page.tsx`, `modules/checkout/index.ts`, `modules/checkout/schemas/payment.schema.ts`, `modules/checkout/types/checkout.types.ts` · elimina: `modules/checkout/utils/order.ts`, `modules/checkout/utils/order.test.ts` · depende de: T1, T2 · secuencial

### Fase 6 — "Mis entradas" desde la BD · F3.3, parte 1 · 15 archivos + 6 eliminados
- [x] T1 — `getVerifiedEmail` con test y export en `@/modules/auth/server` · archivos: `modules/auth/services/session.service.ts`, `modules/auth/services/session.service.test.ts`, `modules/auth/server.ts` · depende de: Fase 5 · secuencial (entrada pública) · paralelo con T2
- [x] T2 — `getUserPaidOrders` y `claimGuestOrders` con test y export en `server.ts` · archivos: `modules/checkout/services/orders.service.ts`, `modules/checkout/services/orders.service.test.ts`, `modules/checkout/server.ts` · depende de: Fase 5 · paralelo con T1
- [x] T3 — `/mis-entradas` desde la BD; `MyTickets` con props; fuera store, `useMyOrders` y demo · archivos: `app/(site)/mis-entradas/page.tsx`, `modules/tickets/components/MyTickets.tsx`, `modules/tickets/components/MyTickets.test.tsx`, `modules/tickets/utils/myOrders.ts`, `modules/tickets/utils/myOrders.test.ts`, `modules/tickets/types/tickets.types.ts`, `modules/tickets/index.ts`, `modules/checkout/orders.ts`, `modules/checkout/index.ts` · elimina: `modules/tickets/hooks/useMyOrders.ts`, `modules/tickets/hooks/useMyOrders.test.ts`, `modules/tickets/data/demoOrders.ts`, `modules/tickets/data/demoOrders.test.ts`, `modules/checkout/stores/orders.store.ts`, `modules/checkout/stores/orders.store.test.ts` · depende de: T1, T2 · secuencial
- [x] T4 — Fin de los pedidos demo: `TicketCard.test.tsx` con fixtures propios (sin `DEMO_ORDERS`), se eliminan `demoOrders.ts` y su test; documentación sin pago simulado ni `mentec-orders` (`system-design.md` líneas del estado actual, `pages/my-tickets.md`). El texto de la Política de cookies (`legalDocuments.mock.ts`, documento publicado) no se toca aquí: cambiarlo exige una versión nueva del documento legal (fuera de F3) · archivos: `modules/tickets/components/TicketCard.test.tsx`, `docs/architecture/system-design.md`, `design-system/ticketera/pages/my-tickets.md` · elimina: `modules/tickets/data/demoOrders.ts`, `modules/tickets/data/demoOrders.test.ts` · depende de: T3 · paralelo con T5
- [x] T5 — Correcciones de la revisión de la Fase 5: el formulario deja de prometer un correo que F3 no envía ("Asociaremos tus entradas a este correo." / "Asociaremos tus entradas al correo que indiques.") con su test; `AutoRefresh` no refresca mientras `document.visibilityState === "hidden"`; se quita `CheckoutFormData` (sin uso, igual a `CheckoutBuyer`); restos de `MT-` pasan a `TK-` (placeholder del Libro de Reclamaciones, comentarios de `lib/ticketPdf.ts`) y las páginas de diseño describen el flujo real · archivos: `modules/checkout/components/CheckoutForm.tsx`, `modules/checkout/components/CheckoutForm.test.tsx`, `modules/checkout/components/AutoRefresh.tsx`, `modules/checkout/types/checkout.types.ts`, `modules/legal/components/ComplaintForm.tsx`, `lib/ticketPdf.ts`, `design-system/ticketera/pages/checkout.md`, `design-system/ticketera/MASTER.md`, `design-system/ticketera/pages/complaints-book.md` · depende de: Fase 5 · paralelo con T4
- [x] T6 — Correcciones de la revisión de la Fase 6: `claimGuestOrders` solo vincula órdenes cerradas (decisión 23), con el test "una `pending` con ese correo no se vincula"; `pages/my-tickets.md` sin los estados "Cargando" y "Sin sesión" (la ruta exige sesión y llega con los datos cargados) y ejemplo `mentec-TK-1042.pdf` · archivos: `modules/checkout/services/orders.service.ts`, `modules/checkout/services/orders.service.test.ts`, `design-system/ticketera/pages/my-tickets.md` · depende de: T1–T5 · secuencial

### Fase 7 — QR real · F3.3, parte 2 · 17 archivos
- [ ] T1 — `npm install qrcode` y `npm install -D @types/qrcode` · archivos: `package.json`, `package-lock.json` · depende de: Fase 6 · secuencial (base)
- [ ] T2 — `getQrModules` con `qrcode`, `TicketQr` con `ticketCode` y PDF con `qrToken`, con tests · archivos: `components/shared/TicketQr.tsx`, `components/shared/TicketQr.test.tsx`, `lib/ticketPdf.ts`, `lib/ticketPdf.test.ts` · depende de: T1 · secuencial (components/shared y lib)
- [ ] T3 — `qrToken` en `Order`/`OrderTicket` (y fuera `ownerEmail`/`paymentMethod`), en la vista, el servicio y el PDF del pedido · archivos: `modules/checkout/types/checkout.types.ts`, `modules/checkout/utils/orderViews.ts`, `modules/checkout/utils/orderViews.test.ts`, `modules/checkout/services/orders.service.ts`, `modules/checkout/services/orders.service.test.ts`, `modules/checkout/utils/ticketPdfInput.ts`, `modules/checkout/utils/ticketPdfInput.test.ts` · depende de: T2 · secuencial
- [ ] T4 — Confirmación y "Mis entradas" con el QR real · archivos: `modules/checkout/components/ConfirmationTicketCard.tsx`, `modules/checkout/components/OrderConfirmation.test.tsx`, `modules/tickets/components/TicketCard.tsx`, `modules/tickets/components/TicketCard.test.tsx`, `modules/tickets/components/MyTickets.test.tsx` · depende de: T3 · secuencial

## Preguntas abiertas
1. **7 fases en lugar de 3** (decisión 11): F3.1 = Fases 1–2, F3.2 = Fases 3–5, F3.3 = Fases 6–7, para no pasar de ~15 archivos por fase. Las Fases 1, 3 y 4 son solo de servidor (con tests) y no cambian la UI. ¿Se aceptan así o prefieres 3 fases más grandes?
2. **Registro del reembolso automático:** por defecto no se crea fila en `refunds` (el enum `refund_reason` solo tiene `event_cancelled`, `customer`, `admin`); queda la orden `refunded` y el reembolso en Stripe. ¿Se añade un motivo `seat_lost` (migración) para tenerlo en la BD?
3. **Consentimientos en el checkout:** `system-design.md` §8 pide aceptar Términos, Privacidad y "Garantía y devoluciones" en el checkout. Hoy la casilla cubre los dos primeros y no se guarda en `consents` (un invitado no tiene `user_id`). Por defecto queda igual en F3. ¿Se añade `/devoluciones` a la casilla y/o se registra la aceptación ligada a la orden?
4. **Retenciones abusivas:** sin los límites de §10, cualquiera puede retener asientos 10 min una y otra vez. Por defecto fuera de F3. ¿Se prioriza antes de abrir ventas reales?
5. **Disponibilidad del mapa:** `/eventos/[slug]/entradas` se genera estática, así que un asiento ya reservado o vendido puede verse libre; `startCheckout` lo rechaza con "Esos asientos ya no están disponibles". Se resuelve con la spec de caché del catálogo (F3). ¿Conforme?
6. **Textos sin correo:** como Resend queda fuera, la confirmación deja de decir "Enviamos tus entradas a <correo>" y "Revisa tu correo" (requisito 11). ¿Te sirven esos textos o prefieres otros?
7. **Cambiar de selección libera la reserva anterior** (decisión 15): si esa orden estaba a medio pagar en otra pestaña y el pago se aprueba, se reembolsa automáticamente. ¿Conforme?
8. **Invitados sin cuenta:** ven sus entradas en la confirmación y en el PDF; para volver a verlas después deben crear una cuenta con el mismo correo (verificado). No hay "buscar mi compra por correo" en F3. ¿Conforme?
