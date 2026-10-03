# Checkout de compra de entradas con Stripe (modo test)

- Módulo: checkout
- Estado: aprobado

## Objetivo
Que el comprador pague las entradas elegidas en `/eventos/<slug>` y reciba la confirmación de su compra. El botón "Continuar con la compra" del `TicketSelector` ya navega a `/checkout?evento=<slug>&<ticketTypeId>=<qty>...` (hoy 404). La pasarela es **Stripe en modo test** con el **Payment Element** embebido, **solo tarjeta**. Visual según `design-system/ticketera/MASTER.md` (tokens Mentec, Creato Display, a11y §11). Español (Perú), moneda PEN.

## Alcance
- Incluye:
  - Fase 1: módulo `modules/checkout` (validación de los parámetros contra el evento real, cálculo del pedido), ruta `/checkout` con resumen del pedido, temporizador de reserva de 10:00 y estados de error; archivo de diseño `design-system/ticketera/pages/checkout.md`.
  - Fase 2: código compartido (`useZodForm` a `hooks/`, validadores de persona y clases de enlace a `lib/`, sin cambiar el comportamiento de `auth`), dependencias de Stripe, validación de variables de entorno, cliente Stripe de servidor y estado "Pagos no configurados".
  - Fase 3: formulario "Datos del comprador" (con precarga desde la sesión), Payment Element (solo tarjeta), Términos, Server Action que crea el PaymentIntent recalculando el importe en el servidor, `stripe.confirmPayment` con redirección y página `/checkout/confirmacion` que lee el PaymentIntent desde Stripe.
- No incluye:
  - **Webhook** `payment_intent.succeeded` (ni Route Handler `app/api/...`). Es necesario antes de producción para emitir entradas de forma fiable (ver Preguntas abiertas).
  - Emisión real de entradas, generación de QR (en la confirmación solo hay un icono) y envío de correos.
  - Reserva real de inventario: el temporizador es solo de UI; no se bloquean entradas en ningún backend.
  - Yape, billeteras (Apple Pay / Google Pay), Link u otros métodos: solo tarjeta.
  - Formulario propio de tarjeta: los datos de tarjeta solo pasan por los iframes de Stripe (PCI).
  - Persistencia de órdenes en el cliente (zustand/localStorage): la fuente de verdad es Stripe. Sin "Mis entradas", historial ni perfil.
  - Base de datos, cuentas de comercio en vivo (`sk_live_`/`pk_live_`), reembolsos, cupones, cargos por servicio, facturación/boleta.
  - Compra de eventos gratuitos (total S/ 0): se muestra un estado propio (Stripe no cobra 0).
  - Exigir sesión: la compra como invitado está permitida; no hay redirección a `/login`.
  - Toasts, TanStack Query.

## Decisiones tomadas
1. **Cuenta y moneda (confirmado por el usuario):** cuenta Stripe registrada en **EE. UU.**; se cobra en **soles (PEN)** (`currency: "pen"`, importe en céntimos). Stripe liquida en la moneda de la cuenta (USD) aplicando su conversión; esa liquidación no afecta a la UI. El mínimo de Stripe (equivalente a USD 0.50) no es un problema: la entrada pagada más barata cuesta S/ 35.
2. **Flujo "deferred intent" de Stripe:** el Payment Element se monta sin PaymentIntent (`mode: "payment"`, `amount`, `currency: "pen"`, tipos `["card"]`). Al pagar: validación del formulario → `elements.submit()` → Server Action crea el PaymentIntent → `stripe.confirmPayment` → redirección a `return_url`. Así no se crean intents al abrir la página y la metadata incluye al comprador. Cada intento de pago crea un intent nuevo (los fallidos quedan abandonados en Stripe; aceptable en test).
3. **Server Action, no Route Handler** (consultado en `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, `backend-for-frontend.md` y `data-security.md`): es una mutación invocada solo desde nuestro componente cliente; la Server Action va por POST con comprobación Origin/Host (CSRF), ID cifrado, tipado de extremo a extremo y sin capa `fetch`/axios extra. Se trata como entrada no confiable: valida todo con zod. Los Route Handlers se reservan para el webhook (fuera de alcance), que sí es un endpoint HTTP público para un tercero.
4. **Importe solo en el servidor:** la acción recibe `slug`, `quantities` y datos del comprador, nunca precios ni total; vuelve a cargar el evento con `getEventBySlug` y recalcula con la misma función que usa la página (`buildCheckoutOrder`).
5. **Solo tarjeta:** PaymentIntent con `payment_method_types: ["card"]` (no `automatic_payment_methods`); Elements con el mismo tipo (`allowedPaymentMethodTypes: ["card"]`, o `paymentMethodTypes` si es el nombre que expone `StripeElementsOptions` en la versión instalada) y `wallets: { applePay: "never", googlePay: "never" }`. Sin selector de método ni radio group.
6. **Claves:** `STRIPE_SECRET_KEY` (solo servidor) y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` en `.env.local` (no versionado; lo rellena el usuario, ningún agente escribe claves). Se validan con zod en `lib/stripe.ts` (`import "server-only"`) y **solo se aceptan claves de test** (`sk_test_` / `pk_test_`). Si faltan o no son válidas, el checkout muestra "Pagos no configurados" (no se rompe la página). La clave publicable llega al cliente como prop desde la página (no se lee `process.env` en el cliente).
7. **Confirmación desde Stripe:** `/checkout/confirmacion` (Server Component) lee `payment_intent` y `payment_intent_client_secret` (los añade Stripe a la `return_url`), recupera el PaymentIntent con el SDK de servidor y exige que su `client_secret` coincida con el de la URL (solo quien pagó ve la orden). Éxito solo si `status === "succeeded"`. Sin store de órdenes.
8. **Código de orden:** `MT-` + últimos 8 caracteres del id del PaymentIntent en mayúsculas (p. ej. `pi_3Q…a1B2c3D4` → `MT-A1B2C3D4`). No necesita almacenamiento.
9. **Metadata del PaymentIntent** (valores ≤ 500 caracteres): `event_slug`, `items` (JSON con `ticketTypeId`, `name`, `quantity`, `unitPrice`), `buyer_name`, `buyer_email`, `buyer_document` (`<tipo>:<número>`). Nombre, correo y celular (`+51…`) también van en `billing_details` de `confirmPayment`. Nunca datos de tarjeta.
10. **Código compartido entre módulos (SETUP §1 reglas 4 y 5):**
    - `useZodForm` → `hooks/useZodForm.ts` (es un hook reutilizable entre dominios; se mueve con su test sin cambios).
    - Validadores de persona del registro → `lib/formFields.ts` (zod puro, sin React: `requiredText`, `nameField`, `emailField`, `phoneField`, `acceptTermsField`, `DOCUMENT_TYPES`, `DOCUMENT_TYPE_LABELS`, `getDocumentNumberError`). No es UI ni hook, por eso `lib/` y no `components/shared`/`hooks/`.
    - `INLINE_LINK` y `TEXT_LINK` (hoy en `modules/auth/components/formShared.ts`) → `lib/linkStyles.ts`, porque el checkbox de Términos del checkout usa el mismo enlace. `GENERIC_ERROR` se queda en `auth`.
    - Sesión: nueva entrada pública `modules/auth/session.ts` que solo reexporta `useAuthStore`. Motivo (regla 4): el barrel `@/modules/auth` arrastraría `LoginForm`/`RegisterForm` al bundle cliente del checkout (mismo motivo que `header.ts`).
    - Del módulo `events` se usan solo exports del barrel (`getEventBySlug`, tipos, y se añaden `MAX_TICKETS_PER_ORDER`, `getOrderTotal`, `formatEventDate`, `formatEventPrice`), y solo desde código de servidor del checkout. Los componentes cliente del checkout reciben textos y números ya calculados (p. ej. `totalLabel`), así no importan el barrel de `events`.
    - No se extrae un componente compartido para los campos de comprador ni para el checkbox de Términos: solo se repite el cableado (ids, `useZodForm`) y los textos pueden divergir; se reutilizan las reglas (lib) y las clases (lib).
11. **Precarga con sesión:** si `useAuthStore` tiene usuario (la rehidratación ya la dispara `AuthHeaderActions` en el header del layout raíz), se rellenan Nombres, Apellidos, Correo y Confirmar correo **solo si están vacíos**. Celular y documento no están en la sesión.
12. **Fuente en el Payment Element:** el iframe de Stripe no puede cargar Creato Display (servida por `next/font` con URL con hash y sin CORS); se usa el fallback `ui-sans-serif, system-ui, sans-serif`. Colores y radios sí siguen la marca (Appearance API). Los hex del `appearance` son la única excepción a "solo tokens" (el iframe no lee variables CSS); se comentan con el token equivalente.
13. **Orden móvil:** h1 → temporizador → Datos del comprador → Pago → Términos → Resumen + botón "Pagar". En `lg` el resumen y el botón van en la columna derecha `sticky`. Ningún bloque se duplica por breakpoint.
14. **Eventos gratuitos:** si el total es S/ 0, `/checkout` muestra "Este evento es de entrada libre" con enlace al evento.

## Requisitos
1. **Ruta `/checkout`** (Server Component, `searchParams` es Promise en Next 16). Metadata: título "Finalizar compra | Mentec Tickets". La página solo lee params, llama a `getCheckoutOrder` (y desde Fase 2 a `getStripePublishableKey`) y compone componentes del módulo.
2. **Validación de parámetros** (`getCheckoutOrder`), en este orden:
   - `evento` ausente, vacío, repetido o sin evento → `not-found`.
   - Evento `sold-out` → `sold-out`.
   - Resto de parámetros = tipos de entrada. Cada uno debe ser un id de `event.ticketTypes`, aparecer una sola vez, tener un valor entero en texto (`^\d+$`) ≥ 1, el tipo no debe estar `sold-out`, debe haber al menos uno y la suma ≤ `MAX_TICKETS_PER_ORDER` (10). Si algo falla → `invalid-tickets`. Parámetros desconocidos (p. ej. `utm_source`) también invalidan.
   - Total = `getOrderTotal`; si es 0 → `free`.
   - Si todo es válido → `ok` con el pedido: datos del evento (slug, título, fecha, lugar, ciudad, imagen), líneas en el orden de `event.ticketTypes` (`ticketTypeId`, `name`, `unitPrice`, `quantity`), `quantities`, `ticketCount` y `total` (PEN).
   - Nunca lanza ni devuelve 500 por parámetros inválidos.
3. **Estados (`CheckoutStatusMessage`)**, cada uno con un único `<h1>`, descripción y acciones (`h-11`):

   | Variante | h1 | Descripción | Acciones |
   |---|---|---|---|
   | `not-found` | No encontramos este evento | Puede que el enlace sea incorrecto o que el evento ya no esté disponible. | "Volver al inicio" (primario, `/`) |
   | `sold-out` | Entradas agotadas | Ya no quedan entradas disponibles para este evento. | "Ver más eventos" (primario, `/eventos`), "Ver el evento" (outline, `/eventos/<slug>`) |
   | `invalid-tickets` | No pudimos preparar tu compra | Las entradas seleccionadas no son válidas o ya no están disponibles. | "Volver a elegir entradas" (primario, `/eventos/<slug>`) |
   | `free` | Este evento es de entrada libre | No necesitas comprar entradas para asistir. | "Ver el evento" (primario, `/eventos/<slug>`) |
   | `not-configured` | Pagos no configurados | El pago en línea no está disponible en este momento. Inténtalo más tarde. | "Volver al inicio" (primario, `/`) |
   | `order-not-found` | No encontramos tu compra | El enlace de confirmación no es válido o ha caducado. | "Volver al inicio" (primario, `/`) |
   | `payment-processing` | Estamos procesando tu pago | Tu banco aún no confirma el pago. Actualiza esta página en unos minutos. | "Volver al inicio" (outline, `/`) |
   | `payment-failed` | Tu pago no se completó | No se realizó ningún cobro. Puedes volver a intentarlo. | "Volver a elegir entradas" (primario, `/eventos/<slug>`), "Volver al inicio" (outline, `/`) |

4. **Resumen del pedido (`OrderSummary`)**, `Card` `rounded-2xl`: h2 "Resumen del pedido"; miniatura del evento (`next/image`, `aspect-[4/3]`, `w-24`, `rounded-lg`, `sizes="96px"`, `alt` con el título), título (`line-clamp-2`, bold), fecha `formatEventDate` y "Lugar, Ciudad" con iconos `CalendarDays`/`MapPin` (`aria-hidden`); `Separator`; por línea: nombre, "`<cantidad>` × `S/ <precio>`" (`text-muted-foreground`) y subtotal a la derecha; `Separator`; "Total" + importe (`text-xl font-bold tabular-nums`) y debajo "Precio final, sin cargos ocultos". Se usa en `/checkout` y en la confirmación.
5. **Temporizador de reserva (`ReservationTimer`, `"use client"`)**: 10:00 desde que se monta la página (`RESERVATION_DURATION_MS = 600_000`; recargar lo reinicia).
   - Bloque `bg-muted rounded-lg` con icono `Clock` (`aria-hidden`): "Tiempo para completar tu compra: **mm:ss**" (`tabular-nums`).
   - Región `sr-only` con `aria-live="polite"`: "Te quedan N minutos" ("1 minuto" en singular); su texto solo cambia al cambiar el minuto (no anuncia cada segundo).
   - Al llegar a 0: `Alert` destructivo (`role="alert"`) "Tu reserva expiró" + "El tiempo para completar la compra terminó. Vuelve a elegir tus entradas para intentarlo de nuevo." y enlace "Volver a elegir entradas" (`/eventos/<slug>`, `h-11`). Llama a `onExpire` (opcional) una sola vez.
   - Sin animaciones (cumple `prefers-reduced-motion`).
   - Hook `useCountdown(durationMs)`: fija el plazo al montar (sin desajuste de hidratación: el primer render muestra la duración completa), actualiza cada segundo con `Date.now()` (resistente a pestañas en segundo plano) y detiene el intervalo al llegar a 0.
6. **Layout de `/checkout`** (Fase 3): contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 md:py-12`; h1 "Finalizar compra" (`text-3xl md:text-5xl font-extrabold tracking-tight`); temporizador a todo el ancho; grilla `lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-12`; izquierda: secciones en `Card` (h2 `text-xl font-bold`) "Datos del comprador", "Pago" y el checkbox de Términos; derecha (`lg:sticky lg:top-24 self-start`): `OrderSummary`, `Alert` de error de pago (si hay) y botón "Pagar S/ X". En Fase 1 (sin formulario) la página muestra h1, temporizador y resumen en una columna `max-w-xl`.
7. **Datos del comprador** (Fase 3), validados con `useZodForm` (mismas reglas que el registro: errores al enviar, revalidación al salir del campo tras el primer intento, foco al primer inválido, `aria-invalid` + `aria-describedby`, `<form noValidate>`), ids `checkout-<campo>`; en `sm+` van en dos columnas los pares Nombres/Apellidos, Correo/Confirmar correo y Tipo/Número de documento:
   - "Nombres" (`given-name`), "Apellidos" (`family-name`).
   - "Correo electrónico" (`type="email"`, `email`, descripción "Aquí te enviaremos tus entradas.") y "Confirmar correo electrónico" (`type="email"`, `email`).
   - "Celular" (`type="tel"`, `inputMode="numeric"`, `tel-national`, addon "+51", `maxLength={9}`).
   - "Tipo de documento" (`Select`, DNI por defecto) y "Número de documento" (`inputMode="numeric"` y `maxLength={8}` solo con DNI); cambiar el tipo revalida el número.
   - Checkbox obligatorio "Acepto los [Términos y condiciones](/terminos) y la [Política de privacidad](/privacidad)" (enlaces en pestaña nueva, `rel="noopener noreferrer"`, clase `INLINE_LINK`).
   - Mensajes: los del registro (nombres, apellidos, correo, celular, documento, términos) más:

     | Campo | Regla | Mensaje |
     |---|---|---|
     | confirmEmail | vacío | Confirma tu correo electrónico |
     | confirmEmail | distinto de email (sin espacios, sin distinguir mayúsculas) | Los correos no coinciden |
8. **Pago** (Fase 3): sección h2 "Pago", subtítulo "Tarjeta de crédito o débito", `PaymentElement` con `fields.billingDetails` `name`/`email`/`phone` en `"never"` (se envían desde los datos del comprador) y wallets desactivadas; mientras carga, `Spinner` + "Cargando formulario de pago…" (`role="status"`); si falla la carga (`onLoadError`): `Alert` "No pudimos cargar el formulario de pago. Recarga la página.". Nota bajo el elemento con icono `Lock`: "Pago seguro procesado por Stripe. No almacenamos los datos de tu tarjeta." Elements con `locale: "es-419"` y `appearance`: `theme: "stripe"`, `colorPrimary #0072F6`, `colorText #010817`, `colorTextSecondary #5A6070`, `colorDanger #E5484D`, `colorBackground #FFFFFF`, `borderRadius 12px`, `fontSizeBase 16px`, `fontFamily` fallback (decisión 12), borde de input `#D4D4D8` y alto de input ≥ 44 px.
9. **Botón "Pagar S/ X"** (primario, full-width, `h-11`, `type="submit"`): deshabilitado mientras Stripe/Payment Element no están listos, mientras se procesa y tras expirar la reserva. En proceso: `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Procesando pago…".
10. **Envío** (Fase 3):
    1. `useZodForm` valida al comprador; si es inválido, no se llama a Stripe ni a la acción.
    2. Si la reserva expiró, no hace nada (el botón ya está deshabilitado).
    3. `elements.submit()`; si devuelve error, Stripe lo muestra dentro del elemento y se detiene.
    4. Server Action `createPaymentIntent({ slug, quantities, buyer })`. Errores → `Alert` destructivo junto al botón: `invalid-input` y `payment-error` → "No pudimos iniciar el pago. Inténtalo de nuevo."; `order-unavailable` → "Las entradas seleccionadas ya no están disponibles. Vuelve a elegirlas."; `not-configured` → "El pago en línea no está disponible en este momento.".
    5. `stripe.confirmPayment({ elements, clientSecret, confirmParams: { return_url: <origin>/checkout/confirmacion, payment_method_data: { billing_details: { name, email, phone: "+51<celular>" } } } })`. Si devuelve error de tipo `card_error` o `validation_error`, se muestra `error.message` (Stripe lo localiza a español); otro error → "Ocurrió un error inesperado al procesar el pago. Inténtalo de nuevo.". Sin error, Stripe redirige.
    - Cada nuevo envío oculta el `Alert` anterior.
11. **Server Action** `createPaymentIntent(input: unknown)` (`"use server"`): valida `input` con zod (`createPaymentIntentInputSchema`, descarta campos extra como `total`); `resolveCheckoutOrder(slug, quantities)` (mismas reglas que el requisito 2; cualquier estado distinto de `ok` → `order-unavailable`); crea el PaymentIntent (`amount = round(total × 100)`, `currency: "pen"`, `payment_method_types: ["card"]`, `description: "<título del evento> — Mentec Tickets"`, metadata de la decisión 9). Devuelve `{ ok: true, clientSecret }` o `{ ok: false, error }`. Nunca devuelve ni registra claves; los errores de Stripe se registran en servidor con `console.error` sin datos del comprador.
12. **Confirmación `/checkout/confirmacion`** (Server Component, metadata "Confirmación de compra | Mentec Tickets"): `getPaymentConfirmation(searchParams)`:
    - Params inválidos/ausentes, intent inexistente, `client_secret` distinto, metadata inválida o evento inexistente → `order-not-found`.
    - Sin claves → `not-configured`.
    - `succeeded` → `OrderConfirmation`; `processing` → `payment-processing`; cualquier otro estado (`requires_payment_method`, `requires_action`, `canceled`, …) → `payment-failed` (con el slug de la metadata).
    - `OrderConfirmation`: icono `CircleCheck` (`text-primary`, `aria-hidden`), h1 "¡Compra confirmada!", "Código de orden" + código (`text-2xl font-bold tracking-wider`), icono `QrCode` (`size-16`, `aria-hidden`) con "Te enviamos tus entradas a **<email>**", `OrderSummary` (líneas de la metadata, total = `amount / 100`) y botones "Ver más eventos" (primario, `/eventos`) y "Volver al inicio" (outline, `/`).
13. **Accesibilidad y responsive:** un `<h1>` por página; labels visibles; errores junto al campo; foco al primer campo inválido del comprador; targets ≥ 44 px; foco visible; iconos `aria-hidden`; `Alert` con `role="alert"`; sin scroll horizontal a 375 / 768 / 1024 / 1440; solo tokens (salvo decisión 12); Creato Display; sin emojis.

## Criterios de aceptación
### Fase 1 — Pedido y página de revisión
- [ ] Dado `/checkout?evento=noche-de-sintetizadores-lima&general=2&vip=1`, cuando carga, entonces el `<title>` es "Finalizar compra | Mentec Tickets", hay un único h1 "Finalizar compra", el resumen muestra imagen, título, fecha `SÁB 14 NOV · 21:00`, lugar y ciudad, las líneas "General 2 × S/ 180.00 … S/ 360.00" y "VIP 1 × S/ 550.00 … S/ 550.00", total "S/ 910.00" y "Precio final, sin cargos ocultos".
- [ ] Dado `/checkout` sin `evento` o con un slug inexistente, entonces se muestra "No encontramos este evento" con "Volver al inicio" (respuesta 200, sin error de servidor).
- [ ] Dado `evento=los-ecos-del-sur-arequipa&general=1`, entonces se muestra "Entradas agotadas" con enlaces al evento y a `/eventos`.
- [ ] Dado un tipo inexistente (`&foo=1`), un tipo agotado (`risas-sin-filtro&mesa=1`), una cantidad `0`, `1.5`, `-1` o `abc`, un parámetro repetido, ningún tipo, o 11 entradas en total, entonces se muestra "No pudimos preparar tu compra" con "Volver a elegir entradas" → `/eventos/<slug>`.
- [ ] Dado `evento=aventura-en-el-bosque-magico&entrada-libre=2`, entonces se muestra "Este evento es de entrada libre".
- [ ] Dado el temporizador, cuando carga, entonces muestra "10:00" y baja cada segundo; la región `aria-live` solo cambia de texto al cambiar el minuto.
- [ ] Dado que pasan 10 minutos, entonces aparece el `Alert` "Tu reserva expiró" con "Volver a elegir entradas" → `/eventos/<slug>`.
- [ ] Dado el flujo desde `/eventos/<slug>`, cuando se eligen entradas y se pulsa "Continuar con la compra", entonces `/checkout` muestra el resumen correcto (ya no hay 404).
- [ ] Dado 375 px de ancho, entonces no hay scroll horizontal.
- [ ] Dado `npx vitest run`, entonces pasan los tests nuevos y los existentes; `npm run lint` y `npm run build` sin errores.

### Fase 2 — Base compartida y configuración de Stripe
- [ ] Dado el refactor, entonces `modules/auth/hooks/` ya no existe, `LoginForm`/`RegisterForm` importan `useZodForm` de `@/hooks/useZodForm`, las reglas de `@/lib/formFields` y los enlaces de `@/lib/linkStyles`; `git diff` sobre `modules/auth/**/*.test.*` está vacío y `npx vitest run modules/auth hooks` pasa.
- [ ] Dado `/login` y `/registro`, entonces se comportan igual que antes (mismos mensajes, foco y enlaces).
- [ ] Dado `package.json`, entonces incluye `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js` y `server-only`.
- [ ] Dado `.env.example`, entonces está versionado (`.gitignore` lo excluye de `.env*`) y contiene `STRIPE_SECRET_KEY=` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=` sin valores.
- [ ] Dado que faltan las claves (o son `sk_live_`/`pk_live_`), cuando se abre un `/checkout` válido, entonces se muestra "Pagos no configurados" y la página no falla; con claves de test válidas se ve la página de la Fase 1.
- [ ] Dado `npx vitest run`, `npm run lint` y `npm run build`, entonces pasan (el build no necesita claves).

### Fase 3 — Comprador, pago y confirmación
- [ ] Dado `/checkout` válido con claves de test, entonces se ven las secciones "Datos del comprador", "Pago" (Payment Element solo con tarjeta: sin pestañas de método, sin Apple/Google Pay, sin campos de nombre/correo/teléfono de Stripe), Términos, y en la columna derecha (sticky en `lg`) el resumen y "Pagar S/ 910.00".
- [ ] Dado el formulario vacío, cuando se pulsa "Pagar", entonces cada campo del comprador muestra su mensaje (incluido Términos), el foco va a "Nombres" y no se llama a Stripe ni a la acción.
- [ ] Dados correos distintos tras un primer envío, cuando se sale de "Confirmar correo electrónico", entonces aparece "Los correos no coinciden".
- [ ] Dada una sesión iniciada (Ana Quispe), cuando se abre `/checkout`, entonces Nombres, Apellidos, Correo y Confirmar correo vienen rellenados; sin sesión, vacíos.
- [ ] Dados datos válidos y la tarjeta `4242 4242 4242 4242` (fecha futura, cualquier CVC), cuando se paga, entonces el botón muestra "Procesando pago…", se redirige a `/checkout/confirmacion?payment_intent=…` y se ve "¡Compra confirmada!", el código `MT-XXXXXXXX`, "Te enviamos tus entradas a <email>", el resumen con el total pagado y los botones "Ver más eventos" y "Volver al inicio".
- [ ] Dado el pago anterior, entonces en el Dashboard de Stripe (test) el PaymentIntent tiene importe 91000 PEN, `payment_method_types: ["card"]` y la metadata `event_slug`, `items`, `buyer_name`, `buyer_email`, `buyer_document`.
- [ ] Dada la tarjeta `4000 0000 0000 0002`, cuando se paga, entonces aparece un `Alert` con el mensaje de rechazo de Stripe en español, no hay redirección y se puede reintentar.
- [ ] Dada la tarjeta `4000 0025 0000 3155` (3DS), cuando se completa la autenticación, entonces se llega a "¡Compra confirmada!"; si se cancela, entonces se ve el error y no hay cobro.
- [ ] Dada una llamada a la acción con un `total` o precios manipulados, entonces se ignoran y el importe se calcula desde el evento.
- [ ] Dada la reserva expirada, entonces "Pagar" queda deshabilitado.
- [ ] Dado `/checkout/confirmacion` sin params, con un `payment_intent` inexistente o con un `payment_intent_client_secret` que no corresponde, entonces se ve "No encontramos tu compra".
- [ ] Dado un PaymentIntent `processing` o `requires_payment_method`, entonces se ven "Estamos procesando tu pago" o "Tu pago no se completó", respectivamente.
- [ ] Dado el código, entonces no hay inputs propios de tarjeta, ni claves en el repositorio, ni `STRIPE_SECRET_KEY` en código cliente.
- [ ] Dado `npx vitest run`, entonces pasan los tests nuevos y los existentes sin llamadas reales a Stripe; `npm run lint` y `npm run build` sin errores.

## Diseño técnico
- Rutas (`app/`), consultar `node_modules/next/dist/docs/` (`searchParams` Promise, `PageProps`, Server Actions):
  - `app/checkout/page.tsx` (Fases 1–3).
  - `app/checkout/confirmacion/page.tsx` (Fase 3).
- Componentes:
  - shadcn (instalados, nada que instalar): `card`, `button`/`buttonVariants`, `separator`, `alert`, `spinner`, `field`, `input`, `input-group`, `select`, `checkbox`, `label`. Búsqueda hecha: `radio-group` existe en base-nova pero **no se usa** (solo tarjeta); `progress` no hace falta (temporizador en texto).
  - Stripe: `Elements`, `PaymentElement`, `useStripe`, `useElements` de `@stripe/react-stripe-js`; `loadStripe` de `@stripe/stripe-js`.
  - nuevo `modules/checkout/components/OrderSummary.tsx` (servidor, presentacional; prop `order: CheckoutOrder`). Solo lo usa checkout; no existe nada parecido (el `TicketSelector` es interactivo y de `events`).
  - nuevo `modules/checkout/components/CheckoutStatusMessage.tsx` (servidor, presentacional; props `variant` y `eventSlug?`; tabla del requisito 3). Sigue el patrón de `app/eventos/[slug]/not-found.tsx`.
  - nuevo `modules/checkout/components/ReservationTimer.tsx` (`"use client"`; props `eventSlug: string`, `onExpire?: () => void`).
  - nuevo `modules/checkout/components/CheckoutForm.tsx` (`"use client"`; Fase 3). Props: `publishableKey: string`, `eventSlug: string`, `quantities: Record<string, number>`, `total: number`, `totalLabel: string`, `summary: ReactNode` (el `OrderSummary` renderizado en servidor). Exporta `CheckoutForm`, que crea `stripePromise` una vez (`useState(() => loadStripe(publishableKey))`) y envuelve en `Elements` un componente interno del mismo archivo con el formulario (`useStripe`/`useElements` deben estar dentro del provider). Contiene la constante `STRIPE_APPEARANCE` (decisión 12) y renderiza el temporizador, las secciones y la columna derecha.
  - nuevo `modules/checkout/components/OrderConfirmation.tsx` (servidor, presentacional; props `code`, `email`, `order`).
- Hook `modules/checkout/hooks/useCountdown.ts` (`"use client"`):
  ```ts
  export function useCountdown(durationMs: number): {
    remainingMs: number;   // 0..durationMs
    label: string;         // "mm:ss"
    minutesLeft: number;   // Math.ceil(remainingMs / 60_000)
    isExpired: boolean;
  };
  ```
- Schemas `modules/checkout/schemas/checkout.schema.ts`:
  ```ts
  // Fase 1
  export const checkoutSlugSchema = z.string().trim().min(1);
  export const ticketQuantitySchema = z.string().regex(/^\d+$/).transform(Number)
    .pipe(z.number().int().min(1).max(MAX_TICKETS_PER_ORDER));
  // Fase 3 (reglas de lib/formFields)
  export const checkoutBuyerSchema = z.object({
    firstName, lastName, email, confirmEmail, phone,
    documentType: z.enum(DOCUMENT_TYPES), documentNumber, acceptTerms,
  }).superRefine(/* getDocumentNumberError → ["documentNumber"]; correos distintos → ["confirmEmail"] */);
  export const createPaymentIntentInputSchema = z.object({
    slug: checkoutSlugSchema,
    quantities: z.record(z.string(), z.number().int().min(1).max(MAX_TICKETS_PER_ORDER)),
    buyer: checkoutBuyerSchema,
  });
  export const confirmationParamsSchema = z.object({
    payment_intent: z.string().startsWith("pi_"),
    payment_intent_client_secret: z.string().min(1),
  });
  export const paymentMetadataSchema = z.object({
    event_slug: z.string().min(1),
    items: /* string JSON → array min(1) de { ticketTypeId, name, quantity, unitPrice } (JSON inválido = issue, no excepción) */,
    buyer_name: z.string(),
    buyer_email: z.email(),
    buyer_document: z.string(),
  });
  ```
- Tipos `modules/checkout/types/checkout.types.ts`:
  ```ts
  // Fase 1 (datos calculados, no externos)
  export type CheckoutOrderItem = { ticketTypeId: string; name: string; unitPrice: number; quantity: number };
  export type CheckoutOrder = {
    event: Pick<EventDetail, "slug" | "title" | "startsAt" | "venue" | "city" | "imageUrl">;
    items: CheckoutOrderItem[];
    quantities: Record<string, number>;
    ticketCount: number;
    total: number; // PEN
  };
  export type CheckoutOrderResult =
    | { status: "ok"; order: CheckoutOrder }
    | { status: "not-found" }
    | { status: "sold-out" | "invalid-tickets" | "free"; eventSlug: string };
  // Fase 3
  export type CheckoutBuyer = z.output<typeof checkoutBuyerSchema>;
  export type CreatePaymentIntentResult =
    | { ok: true; clientSecret: string }
    | { ok: false; error: "invalid-input" | "order-unavailable" | "not-configured" | "payment-error" };
  export type PaymentStatusView = "succeeded" | "processing" | "failed";
  export type PaymentConfirmation =
    | { status: "not-configured" | "order-not-found" }
    | { status: "payment-failed"; eventSlug: string }
    | { status: "payment-processing" }
    | { status: "succeeded"; code: string; email: string; order: CheckoutOrder };
  ```
- Utils (puros, sin `server-only`):
  - `modules/checkout/utils/checkoutOrder.ts` (Fase 1): `parseTicketQuantities(params: Record<string, string | string[] | undefined>): Record<string, number> | null` y `buildCheckoutOrder(event: EventDetail, quantities: Record<string, number> | null): CheckoutOrderResult` (reglas del requisito 2 salvo `not-found`).
  - `modules/checkout/utils/payment.ts` (Fase 3): `toStripeAmount(total): number` (`Math.round(total * 100)`), `formatOrderCode(paymentIntentId): string`, `buildPaymentMetadata(order, buyer): Record<string, string>`, `getPaymentStatusView(status: Stripe.PaymentIntent.Status): PaymentStatusView` (import de tipo desde `stripe`).
- Services:
  - `modules/checkout/services/checkout.service.ts` (Fase 1, servidor, sin secretos): `getCheckoutOrder(searchParams): Promise<CheckoutOrderResult>` y `resolveCheckoutOrder(slug, quantities): Promise<CheckoutOrderResult>`; usan `getEventBySlug` de `@/modules/events` y los utils.
  - `modules/checkout/services/payment.service.ts` (Fase 3, `import "server-only"`): `createOrderPaymentIntent(order, buyer): Promise<string>` (devuelve `client_secret`; lanza `PaymentNotConfiguredError` si `getStripe()` es `null`) y `getPaymentConfirmation(searchParams): Promise<PaymentConfirmation>` (requisito 12; usa `getEventBySlug` para los datos del evento).
- Server Action `modules/checkout/actions/checkout.actions.ts` (Fase 3, `"use server"` al inicio): solo exporta `createPaymentIntent(input: unknown): Promise<CreatePaymentIntentResult>`. Va en un archivo propio porque con `"use server"` cada export es un endpoint público: no puede compartir archivo con `payment.service.ts` (que expone `getPaymentConfirmation`). Carpeta `actions/` nueva: SETUP no define capa para Server Actions; nombre según el patrón `<dominio>.<capa>.ts`.
- `lib/stripe.ts` (Fase 2, `import "server-only"`):
  ```ts
  const stripeEnvSchema = z.object({
    STRIPE_SECRET_KEY: z.string().startsWith("sk_test_"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_test_"),
  });
  export function parseStripeEnv(env: Record<string, string | undefined>): StripeEnv | null;
  export function getStripePublishableKey(): string | null;   // parseStripeEnv(process.env)
  export function getStripe(): Stripe | null;                  // instancia única, creada al primer uso
  ```
  Lectura perezosa (dentro de las funciones): `npm run build` no exige claves.
- Código compartido (Fase 2): `hooks/useZodForm.ts` (+ test, movidos sin cambios), `lib/formFields.ts`, `lib/linkStyles.ts`, `modules/auth/session.ts` (Fase 3). Ver decisión 10.
- `modules/events/index.ts` (Fase 1): añade `MAX_TICKETS_PER_ORDER`, `getOrderTotal`, `formatEventDate`, `formatEventPrice`.
- `modules/checkout/index.ts`: Fase 1 `getCheckoutOrder`, `OrderSummary`, `ReservationTimer`, `CheckoutStatusMessage`; Fase 3 añade `CheckoutForm`, `OrderConfirmation`, `getPaymentConfirmation`. Solo lo importan páginas de `app/` (servidor). La acción no se exporta.
- Contrato de API:
  - Server Action `createPaymentIntent`: request `z.input<typeof createPaymentIntentInputSchema>` = `{ slug: string; quantities: Record<string, number>; buyer: { firstName; lastName; email; confirmEmail; phone; documentType: "dni" | "ce" | "passport"; documentNumber; acceptTerms: true } }` → response `CreatePaymentIntentResult`.
  - Stripe `paymentIntents.create`: `{ amount: number /* céntimos PEN */, currency: "pen", payment_method_types: ["card"], description: string, metadata: { event_slug, items, buyer_name, buyer_email, buyer_document } }`.
  - Retorno de Stripe: `GET /checkout/confirmacion?payment_intent=pi_…&payment_intent_client_secret=…&redirect_status=…` (`redirect_status` se ignora: la verdad es el PaymentIntent recuperado).
- Archivos de entorno: `.env.example` (versionado, sin valores), `.gitignore` añade `!.env.example`. `.env.local` lo crea el usuario.
- Tarjetas de prueba de Stripe para QA: `4242 4242 4242 4242` (aprobada), `4000 0000 0000 0002` (rechazada), `4000 0000 0000 9995` (fondos insuficientes), `4000 0025 0000 3155` (3DS). Cualquier fecha futura y CVC.

## Reutilización
- `events`: `getEventBySlug`, `EventDetail`, `MAX_TICKETS_PER_ORDER`, `getOrderTotal`, `formatEventDate`, `formatEventPrice` (vía barrel, solo en servidor); mock de eventos para los tests.
- `auth`: `useZodForm` (sube a `hooks/`), reglas de `registerSchema` (suben a `lib/formFields.ts`), `INLINE_LINK`/`TEXT_LINK` (suben a `lib/linkStyles.ts`), `useAuthStore` (vía `modules/auth/session.ts`), patrón visual de `RegisterForm` (campos, `+51`, `Select`, `Checkbox`, `Alert`, `Spinner`), patrón de tests con `vi.mock` de `LoginForm.test.tsx`.
- shadcn ya instalados (lista en Diseño técnico). Sin componentes nuevos de shadcn.
- `cn` de `@/lib/utils`; patrón de página de estado de `app/eventos/[slug]/not-found.tsx`; grilla y sticky de `/eventos/[slug]`.
- Nativos: `URLSearchParams`, `Intl`, `Date.now()`, `crypto` no hace falta (el id lo da Stripe).
- Dependencias nuevas (versiones actuales según `npm view`): `stripe@^23.0.0`, `@stripe/stripe-js@^10.0.0`, `@stripe/react-stripe-js@^7.0.0` (peer `react <20`, `@stripe/stripe-js >=10 <11`: compatibles), `server-only@^0.0.1` (opcional en Next, se instala para que lint/TS no lo marquen).

## Tests
- `modules/checkout/utils/checkoutOrder.test.ts` (F1): `parseTicketQuantities` acepta `{ general: "2" }`, rechaza `"0"`, `"1.5"`, `"-1"`, `"abc"`, `""`, arrays y objeto vacío; `buildCheckoutOrder` con un `EventDetail` de prueba: `ok` con líneas en el orden de `ticketTypes`, `ticketCount` y total correctos; evento `sold-out` → `sold-out`; `null`, id desconocido, tipo agotado o 11 entradas → `invalid-tickets` con `eventSlug`; exactamente 10 → `ok`; total 0 → `free`.
- `modules/checkout/services/checkout.service.test.ts` (F1, con el mock real de eventos): `getCheckoutOrder` para `noche-de-sintetizadores-lima&general=2&vip=1` → total 910; sin `evento` y slug inexistente → `not-found`; `los-ecos-del-sur-arequipa` → `sold-out`; `aventura-en-el-bosque-magico&entrada-libre=1` → `free`; `resolveCheckoutOrder` válido e inexistente.
- `modules/checkout/hooks/useCountdown.test.ts` (F1, fake timers, `renderHook`): empieza en `10:00` y `minutesLeft` 10; tras 1 s `09:59`; tras 60 s `09:00` y `minutesLeft` 9; a los 600 s `isExpired` y `00:00`; después no quedan timers (`vi.getTimerCount() === 0`).
- `lib/stripe.test.ts` (F2, `vi.mock("server-only", () => ({}))`): `parseStripeEnv` con claves `sk_test_`/`pk_test_` → objeto; sin alguna, vacías o `sk_live_`/`pk_live_` → `null`.
- Refactor (F2): `hooks/useZodForm.test.ts` (movido sin cambios) y los tests de `modules/auth` sin cambios deben pasar; `lib/formFields.ts` queda cubierto por `auth.schema.test.ts` y `checkout.schema.test.ts` (sin test propio).
- `modules/checkout/schemas/checkout.schema.test.ts` (F3): comprador válido completo (espacios recortados); correos que difieren solo en mayúsculas/espacios → válido; distintos → "Los correos no coinciden" en `confirmEmail`; `confirmEmail` vacío; DNI de 7 dígitos y celular `812345678` inválidos con el mensaje del registro; `acceptTerms: false`; `createPaymentIntentInputSchema` descarta `total` y rechaza cantidades 0 o no enteras; `paymentMetadataSchema` acepta la metadata generada y rechaza `items` con JSON inválido o vacío; `confirmationParamsSchema` exige `pi_`.
- `modules/checkout/utils/payment.test.ts` (F3): `toStripeAmount(910) === 91000` y redondeo (`19.99` → 1999); `formatOrderCode("pi_3Qabc1234XyZ9")` → `MT-` + 8 últimos en mayúsculas; `buildPaymentMetadata` produce las 5 claves, `items` JSON reversible y todos los valores ≤ 500 caracteres para el evento con más tipos (`clasico-del-pacifico`, 4 tipos); `getPaymentStatusView` para `succeeded`, `processing`, `requires_payment_method`, `requires_action`, `canceled`.
- `modules/checkout/services/payment.service.test.ts` (F3, `vi.mock("server-only")` y `vi.mock("@/lib/stripe")` con un Stripe falso): `createOrderPaymentIntent` llama a `paymentIntents.create` con `amount` en céntimos, `currency: "pen"`, `payment_method_types: ["card"]` y la metadata, y devuelve `client_secret`; sin Stripe lanza `PaymentNotConfiguredError`; `getPaymentConfirmation`: `succeeded` con secreto correcto → datos de la orden y código; secreto distinto, params inválidos o `retrieve` que lanza → `order-not-found`; `processing` → `payment-processing`; `requires_payment_method` → `payment-failed` con slug; sin Stripe → `not-configured`.
- `modules/checkout/actions/checkout.actions.test.ts` (F3, `vi.mock("../services/payment.service")`, `checkout.service` real): input inválido → `invalid-input` sin crear intent; un `total: 1` añadido se ignora y `createOrderPaymentIntent` recibe el pedido con total 910 calculado desde el evento; tipo agotado → `order-unavailable`; el service lanza → `payment-error`; sin configuración → `not-configured`.
- `modules/checkout/components/CheckoutForm.test.tsx` (F3; `vi.mock("@stripe/react-stripe-js")` con `Elements` que solo renderiza `children`, `PaymentElement` que llama a `onReady`, `useStripe`/`useElements` falsos; `vi.mock("@stripe/stripe-js")`; `vi.mock("../actions/checkout.actions")`): envío vacío muestra errores, enfoca "Nombres" y no llama a `elements.submit` ni a la acción; correos distintos → error al salir del campo tras el primer intento; envío válido muestra "Procesando pago…", llama a `elements.submit`, a la acción con `{ slug, quantities, buyer }` (sin importes) y a `confirmPayment` con el `clientSecret`, `return_url` que termina en `/checkout/confirmacion` y `billing_details` con `+51`; `confirmPayment` con `card_error` muestra su mensaje y reactiva el botón; acción `order-unavailable` muestra su mensaje y no llama a `confirmPayment`; `elements.submit` con error no llama a la acción; con `useAuthStore` con usuario se precargan nombre y correos; con fake timers, a los 10 min el botón queda deshabilitado y aparece "Tu reserva expiró".
- Sin tests: páginas de `app/`, `OrderSummary`, `CheckoutStatusMessage`, `OrderConfirmation` (presentacionales), `ReservationTimer` (su lógica está en `useCountdown`; la expiración se cubre en `CheckoutForm.test`), `index.ts`/`session.ts` (solo reexportan), tipos, componentes de `components/ui/`.

## Plan de tareas
Coordinación: ninguna otra spec abierta toca estos archivos. No ejecutar dos `npm install` a la vez.

### Fase 1 — Pedido y página de revisión
- [x] T1 — Exportar utilidades de pedido y formato del barrel de events · archivos: `modules/events/index.ts` · depende de: — · secuencial (base, `index.ts` compartido)
- [x] T2 — Dominio del pedido: schemas de params, tipos, `parseTicketQuantities`/`buildCheckoutOrder` y service con tests · archivos: `modules/checkout/schemas/checkout.schema.ts`, `modules/checkout/types/checkout.types.ts`, `modules/checkout/utils/checkoutOrder.ts`, `modules/checkout/utils/checkoutOrder.test.ts`, `modules/checkout/services/checkout.service.ts`, `modules/checkout/services/checkout.service.test.ts` · depende de: T1 · paralelo con T3
- [x] T3 — Temporizador: `useCountdown` con test y `ReservationTimer` · archivos: `modules/checkout/hooks/useCountdown.ts`, `modules/checkout/hooks/useCountdown.test.ts`, `modules/checkout/components/ReservationTimer.tsx` · depende de: T1 · paralelo con T2 y T4
- [x] T4 — Componentes presentacionales `OrderSummary` y `CheckoutStatusMessage` (todas las variantes del requisito 3) · archivos: `modules/checkout/components/OrderSummary.tsx`, `modules/checkout/components/CheckoutStatusMessage.tsx` · depende de: T2 (tipos) · paralelo con T3
- [x] T5 — Ruta `/checkout`, barrel del módulo y diseño de página · archivos: `app/checkout/page.tsx`, `modules/checkout/index.ts`, `design-system/ticketera/pages/checkout.md` · depende de: T2, T3, T4 · secuencial

### Fase 2 — Base compartida y configuración de Stripe
- [ ] T1 — Instalar dependencias (`npm install stripe @stripe/stripe-js @stripe/react-stripe-js server-only`) · archivos: `package.json`, `package-lock.json` · depende de: Fase 1 · secuencial (base)
- [ ] T2 — Subir código compartido de auth sin cambiar comportamiento (`git mv` del hook y su test; reglas a `lib/formFields.ts`; enlaces a `lib/linkStyles.ts`; actualizar imports) · archivos: `hooks/useZodForm.ts`, `hooks/useZodForm.test.ts`, `lib/formFields.ts`, `lib/linkStyles.ts`, `modules/auth/schemas/auth.schema.ts`, `modules/auth/components/formShared.ts`, `modules/auth/components/LoginForm.tsx`, `modules/auth/components/RegisterForm.tsx` (se eliminan `modules/auth/hooks/useZodForm.ts` y su test) · depende de: T1 · secuencial (toca `lib/` y `hooks/`)
- [ ] T3 — Entorno y cliente Stripe de servidor con test · archivos: `.gitignore`, `.env.example`, `lib/stripe.ts`, `lib/stripe.test.ts` · depende de: T2 · secuencial (toca `lib/`)
- [ ] T4 — Estado "Pagos no configurados" en `/checkout` · archivos: `app/checkout/page.tsx` · depende de: T3 · secuencial

### Fase 3 — Comprador, pago y confirmación
- [ ] T1 — Entrada pública de sesión, schemas del comprador/acción/confirmación/metadata y tipos, con test · archivos: `modules/auth/session.ts`, `modules/checkout/schemas/checkout.schema.ts`, `modules/checkout/schemas/checkout.schema.test.ts`, `modules/checkout/types/checkout.types.ts` · depende de: Fase 2 · secuencial (base)
- [ ] T2 — Servidor de pago: utils de pago, `payment.service` y Server Action, con tests · archivos: `modules/checkout/utils/payment.ts`, `modules/checkout/utils/payment.test.ts`, `modules/checkout/services/payment.service.ts`, `modules/checkout/services/payment.service.test.ts`, `modules/checkout/actions/checkout.actions.ts`, `modules/checkout/actions/checkout.actions.test.ts` · depende de: T1 · secuencial
- [ ] T3 — `CheckoutForm` (comprador + Payment Element + temporizador + resumen + pago) con test · archivos: `modules/checkout/components/CheckoutForm.tsx`, `modules/checkout/components/CheckoutForm.test.tsx` · depende de: T2 · paralelo con T4
- [ ] T4 — Componente `OrderConfirmation` · archivos: `modules/checkout/components/OrderConfirmation.tsx` · depende de: T2 · paralelo con T3
- [ ] T5 — Rutas y barrel: `/checkout` compone `CheckoutForm`; nueva `/checkout/confirmacion`; el barrel añade `CheckoutForm`, `OrderConfirmation` y `getPaymentConfirmation` · archivos: `app/checkout/page.tsx`, `app/checkout/confirmacion/page.tsx`, `modules/checkout/index.ts` · depende de: T3, T4 · secuencial

## Preguntas abiertas
1. **Webhook `payment_intent.succeeded`:** fuera de alcance. Antes de producción hace falta un Route Handler con verificación de firma (`STRIPE_WEBHOOK_SECRET`) para registrar la venta y emitir entradas aunque el comprador cierre el navegador antes de volver a la confirmación. ¿Se planifica como siguiente spec?
2. **Emisión de entradas y correo:** la confirmación dice "Te enviamos tus entradas a <email>", pero aún no se envía nada (ni QR real). ¿Se mantiene el texto en modo test o se cambia por algo como "Recibirás tus entradas en <email>" hasta que exista la emisión?
3. **Reserva de inventario:** el temporizador es solo visual; dos compradores pueden pagar las últimas entradas a la vez. ¿Cuándo se integra la reserva real?
4. **Datos del comprador en Stripe:** sin base de datos, la metadata del PaymentIntent es el único registro del comprador (incluido `buyer_document`). ¿Es aceptable guardar el número de documento ahí en test, o se omite hasta tener backend?
5. **Fuente del Payment Element:** usa la fuente del sistema. ¿Se quiere servir Creato Display con URL pública y CORS (`public/fonts` + cabeceras en `next.config.ts`) para el iframe de Stripe?
6. **Eventos gratuitos:** hoy muestran "Este evento es de entrada libre". ¿Debe existir una inscripción gratuita (sin Stripe) con confirmación?
7. **Claves en vivo:** la validación solo acepta `sk_test_`/`pk_test_`. Al pasar a producción hay que permitir claves live (y el webhook). ¿Se confirma esta restricción por ahora?
8. **Orden en móvil:** el resumen y "Pagar" quedan al final del formulario en móvil (decisión 13). ¿Se prefiere un resumen compacto arriba?
