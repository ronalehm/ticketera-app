# Landing: "Cómo funciona" y newsletter

- Módulo: marketing
- Estado: aprobado

## Objetivo
Completar la landing `/` con dos secciones del diseño de referencia que aún faltan:
1. **"Cómo funciona"**: explica en tres pasos (Buscar, Elegir, Comprar) cómo se compra, para quien llega por primera vez.
2. **Newsletter "No te pierdas ningún evento"**: invita a dejar el correo para recibir novedades.

El newsletter es **solo UI con envío simulado**: no hay backend ni red, y no se guarda ningún correo. Las referencias son `Main.dc.html` (1440 px) y `Mobile.dc.html` (375 px), secciones `COMO FUNCIONA` y `NEWSLETTER`, junto con la captura del usuario. De ellas se toman estructura, textos y layout. La identidad visual sigue siendo la de Mentec (`design-system/ticketera/MASTER.md`: tokens, Creato Display, a11y §11): nunca el índigo, los hex ni los radios en px del diseño.

## Alcance
- Incluye:
  - `HowItWorks` (Server Component): un encabezado centrado y una lista ordenada de 3 pasos. En `md+` los pasos van en 3 columnas, con una línea punteada entre iconos. En móvil van apilados.
  - `NewsletterSignup` (Server Component con el bloque y los textos) con `NewsletterForm` dentro (Client Component). El formulario tiene un campo de correo validado con zod y un estado de envío simulado. Al terminar, muestra un mensaje de éxito en una región `role="status"`.
  - Un schema zod y un service mock para el newsletter, con su test. También un test del formulario.
  - Componer ambas secciones en `app/page.tsx`. Exportarlas desde `modules/marketing/index.ts`.
  - `design-system/ticketera/pages/landing.md` (nuevo): orden de secciones de la landing y reglas visuales de las dos secciones nuevas.
- No incluye:
  - Suscripción real: no hay API, almacenamiento, doble opt-in, consentimiento de datos personales ni preferencias (artistas o equipos).
  - Estado de error del servidor. El mock nunca falla (ver Preguntas abiertas).
  - Cambios en `UpcomingEvents`. El enlace "Ver todos los eventos" a `/eventos` **ya existe** al pie de la sección. Solo le falta la flecha del diseño, que queda como pregunta abierta porque toca `modules/events`, módulo que se está enmendando en paralelo.
  - Quitar o mover `OrganizerBanner` y `TrustHighlights`. No tocar `OrganizerBanner.tsx` (lo modifica la spec organizer-dashboard).
  - Anclas `#como-funciona`, enlaces del header o footer hacia estas secciones, y animaciones de entrada.
  - Cambios en `components/shared/`, `components/ui/`, `hooks/`, `lib/` o `MASTER.md`.

## Decisiones tomadas
1. **Posición en la landing.** El diseño pone "Cómo funciona" justo después de "Próximos eventos" (en la captura, debajo de "Ver todos los eventos →"). El newsletter va justo antes del footer. Las secciones actuales `OrganizerBanner` y `TrustHighlights` no aparecen en el diseño y se conservan entre ambas. Orden final: `HeroCarousel`, `EventSearchBar`, `CategoryGrid`, `FeaturedEventsRail`, `UpcomingEvents`, **`HowItWorks`**, `OrganizerBanner`, `TrustHighlights`, **`NewsletterSignup`**.
2. **Icono del paso 3: `CreditCard`**, como en la captura del usuario ("tarjeta"). El HTML de referencia usa un QR, pero el texto del paso ("Paga de forma segura…") es un pago. Además, `TrustHighlights` ya usa `QrCode`. Pasos 1 y 2: `Search` y `Ticket` (lucide).
3. **Overline "Paso N" en `text-primary-strong`.** Es el "color primario" del diseño. Se usa el token *strong* porque `--primary` sobre blanco da 4.4:1 y no llega a 4.5:1 en `text-xs` (MASTER §2). Estilo de overline del MASTER §3: `text-xs font-bold uppercase tracking-wider`. El texto en el DOM es "Paso 1" y lo pone en mayúsculas el CSS.
4. **Encabezado de "Cómo funciona" centrado en todos los breakpoints.** La captura lo pide así; el móvil de referencia lo alinea a la izquierda. Los pasos siguen el layout de referencia: en móvil, icono a la izquierda y texto a la derecha; en `md+`, columna con el icono arriba.
5. **El formulario conserva el correo tras el éxito.** No se vacía el campo: `useZodForm` no tiene `reset` y, tras el primer envío, vaciarlo haría que al salir del campo apareciera "Ingresa tu correo electrónico". Cambiar el valor después del éxito borra el mensaje de éxito para no dejar una confirmación desfasada.
6. **La lógica del envío simulado va en un service mock** (`subscribeToNewsletter`), no en el componente. Así se respeta la capa "la UI no hace llamadas", se sigue el patrón de `auth.service.ts` y `payment.service.ts`, y el componente se prueba mockeando el service.
7. **`"use client"` lo más abajo posible.** Solo `NewsletterForm` es cliente. `NewsletterSignup` (bloque, h2, texto) y `HowItWorks` son Server Components.

## Requisitos

### "Cómo funciona" (`HowItWorks`)
1. Es un `<section>` con el contenedor del MASTER (`mx-auto max-w-7xl px-4 md:px-6 lg:px-8`, `py-12 md:py-16`) sobre fondo blanco.
2. Encabezado con `SectionHeader` (`components/shared`): `title="Cómo funciona"` y `description="Tres pasos y ya estás dentro."`. Se centra con `className` (`items-center text-center md:flex-col md:items-center`); no se modifica `SectionHeader`.
3. Los pasos van en un `<ol>` con 3 `<li>`, en este orden:

   | # | Icono (lucide) | Overline | h3 | Texto |
   |---|---|---|---|---|
   | 1 | `Search` | Paso 1 | Buscar | Encuentra el evento, artista o ciudad que te interesa. |
   | 2 | `Ticket` | Paso 2 | Elegir | Selecciona tus entradas y la cantidad que necesitas. |
   | 3 | `CreditCard` | Paso 3 | Comprar | Paga de forma segura y recibe tus entradas al instante. |

   Los datos viven en una constante local `STEPS` (mismo patrón que `HIGHLIGHTS` en `TrustHighlights`).
4. Icono: cuadrado redondeado `bg-accent text-primary`, `rounded-2xl`, `size-13 md:size-16`, icono `size-6 md:size-7` con `aria-hidden="true"`.
5. Grilla: `grid gap-6 md:grid-cols-3 md:gap-8`. Cada `<li>` es `flex gap-4` en móvil (icono a la izquierda y texto a la derecha) y `md:flex-col` desde `md`.
6. Línea punteada (solo `md+`): en los pasos 1 y 2, el icono va en una fila `flex items-center gap-4` seguida de un `<span aria-hidden="true">` con `hidden md:block flex-1 border-t-2 border-dashed border-input`. El paso 3 no tiene línea. En móvil no se ve ninguna línea.
7. Tipografía: overline `text-xs font-bold uppercase tracking-wider text-primary-strong`; h3 `text-lg font-bold md:text-xl`; texto `text-base leading-relaxed text-muted-foreground` (máximo `max-w-sm`).
8. Sin elementos interactivos. Server Component (sin `"use client"`).

### Newsletter (`NewsletterSignup` + `NewsletterForm`)
9. `NewsletterSignup` es un `<section aria-labelledby="newsletter-title">` con el contenedor del MASTER y `py-12 md:py-16`. Dentro va un bloque `rounded-3xl bg-accent px-6 py-8 md:px-12 md:py-14 lg:px-16`:
   - `lg+`: `flex items-center justify-between gap-12`, con los textos a la izquierda (`max-w-xl`) y el formulario a la derecha.
   - `< lg`: columna con `gap-6`.
10. Textos: h2 `id="newsletter-title"` "No te pierdas ningún evento" (`text-2xl font-bold tracking-tight md:text-3xl`). Párrafo "Suscríbete y recibe las novedades de tus artistas y equipos favoritos." (`text-base leading-relaxed text-muted-foreground`, 5.5:1 sobre `--accent`).
11. `NewsletterForm` (`"use client"`), estructura:
    - `<form noValidate>` con `useZodForm(newsletterSchema, { email: "" })`.
    - `Field` (`data-invalid`) contiene:
      - `FieldLabel htmlFor="newsletter-email" className="sr-only"` con el texto "Correo electrónico".
      - `InputGroup` (`h-12 bg-background`, ancho `w-full sm:w-80 lg:w-90`) con `InputGroupAddon` (icono `Mail`, `aria-hidden`) e `InputGroupInput`:
        - `id="newsletter-email"`, `type="email"`, `autoComplete="email"`, `placeholder="tu@email.com"`.
        - `aria-invalid` y `aria-describedby="newsletter-email-error"` solo cuando hay error.
      - `FieldError id="newsletter-email-error"`.
    - `Button type="submit"` (`h-12 cursor-pointer px-6 font-semibold duration-200 hover:bg-primary-strong`, `w-full sm:w-auto`) con el texto "Suscribirme".
    - Layout de la fila: `flex flex-col gap-3 sm:flex-row sm:items-start`, para que el error bajo el input no estire el botón.
12. Validación con `newsletterSchema = z.object({ email: emailField })` (reutiliza `emailField` de `@/lib/formFields`). Mensajes:
    - Vacío o solo espacios: "Ingresa tu correo electrónico".
    - Formato inválido: "Ingresa un correo electrónico válido".

    Al enviar con errores, el foco pasa al input (comportamiento de `useZodForm`). Después del primer intento, salir del campo revalida.
13. Envío válido:
    - Se llama a `subscribeToNewsletter(data.email)` con el correo ya recortado por el schema.
    - Mientras dura, el botón queda `disabled` y muestra `<Spinner aria-hidden className="motion-reduce:animate-none" />` "Suscribiendo…".
    - Al resolverse, el botón vuelve a "Suscribirme" y la región de estado muestra "¡Listo! Te enviaremos las novedades a {email}.", con un icono `CircleCheck` `aria-hidden`.
14. Región de estado: un `<p role="status">` (`text-sm font-medium text-foreground`, `mt-3`) **siempre presente en el DOM**, vacío hasta el éxito, para que los lectores de pantalla anuncien el cambio. Al empezar un nuevo envío o al cambiar el valor del campo, se vacía.
15. `subscribeToNewsletter(email: string): Promise<void>` espera `MOCK_LATENCY_MS` (600 ms, exportada) y se resuelve. No hace peticiones de red ni guarda datos. Lleva un comentario de que se reemplazará por la llamada real sin cambiar la firma.

### Landing
16. `app/page.tsx` sigue siendo un Server Component que solo compone, en el orden de la decisión 1. No se quita ninguna sección ni se cambia ninguna prop existente.
17. Sigue habiendo un único `<h1>` en `/`. Las secciones nuevas usan `h2` y `h3`.

## Criterios de aceptación
Todos son de la Fase 1.

### Cómo funciona
- [ ] Dado `/` a 1440 px, cuando se hace scroll tras "Próximos eventos" y su botón "Ver todos los eventos", entonces la sección siguiente es "Cómo funciona":
  - h2 "Cómo funciona" y subtítulo "Tres pasos y ya estás dentro." centrados.
  - 3 columnas en el orden Buscar, Elegir, Comprar. Cada una tiene su icono (lupa, ticket, tarjeta) en un cuadrado redondeado `bg-accent`, el overline "PASO 1/2/3" en `text-primary-strong`, el h3 y el texto exactos de la tabla del requisito 3.
- [ ] Dado `/` a 1440 px, entonces una línea punteada horizontal (`border-dashed`) une el icono 1 con la columna 2 y el icono 2 con la columna 3, y después del icono 3 no hay línea.
- [ ] Dado `/` a 375 px, entonces los 3 pasos están apilados, con el icono a la izquierda y el texto a la derecha, sin línea punteada visible y sin scroll horizontal de página.
- [ ] Dado un lector de pantalla, cuando recorre la sección, entonces anuncia el h2 "Cómo funciona" y una lista ordenada de 3 elementos, cada uno con su h3. Los iconos y la línea punteada no se anuncian (`aria-hidden`).
- [ ] Dado el teclado, cuando se tabula por la sección, entonces ningún elemento de "Cómo funciona" recibe el foco: es contenido estático.
- [ ] Dado el código, entonces `HowItWorks.tsx` no tiene `"use client"`, usa `SectionHeader` sin modificarlo y solo usa tokens del tema (sin hex ni colores por defecto de Tailwind).

### Newsletter
- [ ] Dado `/` a 1440 px, entonces, justo antes del footer, hay un bloque `rounded-3xl bg-accent` con h2 "No te pierdas ningún evento" y el texto de suscripción a la izquierda, y el campo de correo (icono de sobre, placeholder "tu@email.com") con el botón "Suscribirme" a la derecha, en la misma fila.
- [ ] Dado `/` a 375 px, entonces el bloque se apila: textos arriba, y debajo el input y el botón, ambos a ancho completo y de al menos 44 px de alto, sin scroll horizontal.
- [ ] Dado un lector de pantalla, cuando enfoca el campo, entonces lo anuncia como "Correo electrónico", campo de edición de correo. El icono del sobre no se anuncia.
- [ ] Dado el campo vacío, cuando se pulsa "Suscribirme", entonces:
  - aparece "Ingresa tu correo electrónico" bajo el campo;
  - el input tiene `aria-invalid="true"` y `aria-describedby="newsletter-email-error"`;
  - el foco pasa al input;
  - no se llama al service.
- [ ] Dado "ana@correo", cuando se envía, entonces aparece "Ingresa un correo electrónico válido". Si después se corrige a "ana@correo.pe" y se sale del campo, el error desaparece.
- [ ] Dado "  ana@correo.pe ", cuando se envía, entonces:
  - el botón queda deshabilitado con el spinner y "Suscribiendo…";
  - se llama a `subscribeToNewsletter("ana@correo.pe")`;
  - al resolverse, la región `role="status"` muestra "¡Listo! Te enviaremos las novedades a ana@correo.pe." y el botón vuelve a "Suscribirme".
- [ ] Dado el mensaje de éxito visible, cuando se edita el campo, entonces el mensaje desaparece.
- [ ] Dado el teclado, cuando se tabula desde la sección anterior, entonces el foco va al input y luego al botón, ambos con foco visible (`ring`). Pulsar Enter en el input envía el formulario.
- [ ] Dado el envío, entonces la pestaña Red de DevTools no muestra ninguna petición: el envío es simulado.
- [ ] Dado `prefers-reduced-motion: reduce`, cuando se envía, entonces el spinner no gira.
- [ ] Dado el código, entonces `NewsletterSignup.tsx` no tiene `"use client"`, `NewsletterForm.tsx` sí, y el formulario usa `useZodForm`, `emailField`, `Field`/`FieldLabel`/`FieldError`, `InputGroup`, `Button` y `Spinner` existentes.

### Landing y calidad
- [ ] Dado `/`, entonces las secciones aparecen en este orden: Hero, Buscador, Categorías, Destacados, Próximos eventos, Cómo funciona, Banner de organizadores, Compra con confianza, Newsletter y footer. Hay un solo `<h1>`.
- [ ] Dado el proyecto, entonces `npx vitest run modules/marketing`, `npm run lint` y `npm run build` terminan sin errores.

## Diseño técnico
- **Rutas (`app/`):** solo `app/page.tsx` (modificar). Se importan `HowItWorks` y `NewsletterSignup` desde `@/modules/marketing` y se insertan según la decisión 1. Sin rutas nuevas.
- **Componentes:**

  | Pieza | Tipo | Ubicación / nota |
  |---|---|---|
  | `HowItWorks` | nuevo | `modules/marketing/components/HowItWorks.tsx`. Sección de un solo dominio (marketing de la landing); no existe nada equivalente. Server Component. |
  | `NewsletterSignup` | nuevo | `modules/marketing/components/NewsletterSignup.tsx`. Bloque y textos; Server Component que renderiza `NewsletterForm`. |
  | `NewsletterForm` | nuevo | `modules/marketing/components/NewsletterForm.tsx`. Formulario cliente; no existe un formulario de un solo campo reutilizable. |
  | `SectionHeader` | existente (`components/shared/SectionHeader.tsx`) | Centrado vía `className` (cn hace merge de `md:flex-col`/`md:items-center`). |
  | `Field`, `FieldLabel`, `FieldError` | shadcn (instalado) | `components/ui/field.tsx`. `FieldError` ya renderiza `role="alert"`. |
  | `InputGroup`, `InputGroupAddon`, `InputGroupInput` | shadcn (instalado) | `components/ui/input-group.tsx` (mismo patrón que el celular de `RegisterForm`). |
  | `Button` | shadcn (instalado) | `components/ui/button.tsx`. |
  | `Spinner` | shadcn (instalado) | `components/ui/spinner.tsx`. |
  | Iconos | `lucide-react` | `Search`, `Ticket`, `CreditCard`, `Mail`, `CircleCheck`. |

  Búsqueda en shadcn (`npx shadcn@latest search @shadcn -q newsletter` / `-q step`): no hay bloque de newsletter ni de stepper. No se instala nada.
- **Hooks:** existente `@/hooks/useZodForm` (sin cambios). `useState` local para el correo suscrito, que alimenta el mensaje de éxito.
- **Schemas:** nuevo `modules/marketing/schemas/newsletter.schema.ts`:
  ```ts
  import { z } from "zod";
  import { emailField } from "@/lib/formFields";

  export const newsletterSchema = z.object({ email: emailField });
  ```
  No hace falta un archivo de tipos: el formulario infiere los tipos de `useZodForm` y el service recibe un `string`.
- **Services:** nuevo `modules/marketing/services/newsletter.service.ts`:
  ```ts
  // Mock por ahora: se reemplazará por la llamada a la API sin cambiar la firma.
  export const MOCK_LATENCY_MS = 600;
  export function subscribeToNewsletter(email: string): Promise<void>;
  ```
- **Stores:** ninguno.
- **Contrato de API:** no hay llamada real. Contrato del service mock: entrada `email: string` (validado por `newsletterSchema`, ya `trim`), salida `Promise<void>` que se resuelve tras `MOCK_LATENCY_MS`. No rechaza.
- **API pública** (`modules/marketing/index.ts`): se añaden `export { HowItWorks }` y `export { NewsletterSignup }`. No se exportan `NewsletterForm`, el schema ni el service: nadie fuera del módulo los usa.
- **Diseño de página:** nuevo `design-system/ticketera/pages/landing.md` (override del MASTER para `/`). Incluye:
  - el orden completo de secciones de la decisión 1;
  - la anatomía de "Cómo funciona" (ASCII 1440/375, línea punteada solo en `md+`, overline `primary-strong`);
  - la anatomía del newsletter (bloque `rounded-3xl bg-accent`, fila en `lg+`, apilado en móvil, label `sr-only`, región `role="status"`);
  - la a11y de ambas.

  No se edita `MASTER.md`.

### Coordinación con otras specs
- **`events-ui-refresh` F4** (cambia `EventCard` y el buscador que usa la landing): esta spec no toca `modules/events/**`.
  - El único archivo que pueden compartir es `app/page.tsx`. **T4 de esta spec no se ejecuta en paralelo con ninguna tarea de F4 que modifique `app/page.tsx`.** Si F4 lo toca, va primero y T4 parte de su versión.
  - T4 solo añade un import y dos líneas JSX, sin tocar las props de `EventSearchBar` ni de las secciones de events.
  - T1–T3 son archivos nuevos de `modules/marketing` y pueden ir en paralelo con F4.
- **`organizer-dashboard`** modifica `modules/marketing/components/OrganizerBanner.tsx` (solo `href`). Esta spec no toca ese archivo. Ambas tocan el módulo `marketing`, pero sus archivos son disjuntos: `index.ts` solo lo modifica esta spec.
- **`seating`, `checkout`, `tickets`:** no hay archivos en común.
- **`events-landing`** dejó el newsletter fuera de alcance. Esta spec lo añade sin modificar esa spec.

## Reutilización
- `components/shared/SectionHeader.tsx`: encabezado de "Cómo funciona".
- `hooks/useZodForm.ts`: estado, validación al enviar, revalidación al salir del campo, foco al primer inválido e `isSubmitting`.
- `lib/formFields.ts` → `emailField`: mensajes en español ya probados en registro y login.
- shadcn instalados: `field`, `input-group`, `button`, `spinner`.
- Patrones existentes:
  - `TrustHighlights`: constante con icono, título y texto, e icono en `bg-accent text-primary`.
  - `LoginForm`: `Field` + `aria-invalid`/`aria-describedby` + botón con `Spinner` y `motion-reduce:animate-none`.
  - `auth.service.ts`: `MOCK_LATENCY_MS` + `wait`.
  - `auth.service.test.ts`: fake timers y `advanceTimersByTimeAsync`.

## Tests
- **`modules/marketing/services/newsletter.service.test.ts`** (nuevo; `vi.useFakeTimers()`):
  - la promesa sigue pendiente antes de `MOCK_LATENCY_MS` y se resuelve (`undefined`) al avanzar `MOCK_LATENCY_MS`;
  - no llama a `fetch` (`vi.spyOn(globalThis, "fetch")` sin llamadas).
- **`modules/marketing/components/NewsletterForm.test.tsx`** (nuevo; `vi.mock("../services/newsletter.service")` con `subscribeToNewsletter` como `vi.fn()`):
  1. Renderiza el campo accesible por `getByLabelText("Correo electrónico")` con `type="email"` y placeholder "tu@email.com", el botón "Suscribirme" y una región `role="status"` vacía.
  2. Envío vacío:
     - muestra "Ingresa tu correo electrónico";
     - `aria-invalid="true"` y `aria-describedby="newsletter-email-error"`;
     - el foco está en el input;
     - el service no se llama.
  3. Envío con "ana@correo": muestra "Ingresa un correo electrónico válido". Tras corregir a "ana@correo.pe" y hacer `blur`, el error desaparece.
  4. Envío válido con espacios, usando una promesa controlada (patrón de `LoginForm.test.tsx`):
     - el botón está `disabled` con "Suscribiendo…";
     - el service se llama con `"ana@correo.pe"`;
     - al resolver, `role="status"` contiene "¡Listo! Te enviaremos las novedades a ana@correo.pe." y el botón vuelve a "Suscribirme" habilitado.
  5. Tras el éxito, un `change` en el input vacía la región `role="status"`.
- **Sin test:**
  - `HowItWorks` y `NewsletterSignup`: presentacionales, sin lógica (SETUP §3).
  - `newsletter.schema.ts`: sin reglas propias; `emailField` ya está cubierto por `auth.schema.test.ts`.
  - `app/page.tsx`: solo compone.

## Plan de tareas
Notas de ejecución:
- Las tareas tocan solo archivos de `modules/marketing` (nuevos salvo `index.ts`), `app/page.tsx` y un doc de diseño nuevo. No se instala nada ni se tocan `components/ui`, `components/shared`, `hooks/` ni `lib/`.
- `modules/marketing/index.ts` (barrel compartido) se modifica en una sola tarea, la última y secuencial. Va al final porque exporta componentes que crean T2 y T3, y exportarlos antes rompería `lint` y `build`.
- `app/page.tsx` va en la misma tarea final. Ver la coordinación con events-ui-refresh F4 en Diseño técnico.
- Los developers en paralelo verifican con `npx vitest run <archivo>` y `npx eslint <archivos>`, sin `build`. El reviewer ejecuta el `build` al final.

### Fase 1 — Cómo funciona y newsletter (4 tareas, 10 archivos)
- [ ] T1 — Schema y service mock del newsletter, con test · archivos: `modules/marketing/schemas/newsletter.schema.ts`, `modules/marketing/services/newsletter.service.ts`, `modules/marketing/services/newsletter.service.test.ts` · depende de: — · base, paralelo con T2
- [ ] T2 — Sección "Cómo funciona" · archivos: `modules/marketing/components/HowItWorks.tsx` · depende de: — · paralelo con T1 y T3
- [ ] T3 — Bloque y formulario del newsletter, con test · archivos: `modules/marketing/components/NewsletterSignup.tsx`, `modules/marketing/components/NewsletterForm.tsx`, `modules/marketing/components/NewsletterForm.test.tsx` · depende de: T1 · paralelo con T2
- [ ] T4 — API pública, composición de la landing y diseño de página · archivos: `modules/marketing/index.ts`, `app/page.tsx`, `design-system/ticketera/pages/landing.md` (nuevo) · depende de: T2, T3 y cualquier tarea de events-ui-refresh F4 que modifique `app/page.tsx` · secuencial

## Preguntas abiertas
1. **Flecha en "Ver todos los eventos".** `UpcomingEvents` ya tiene el enlace a `/eventos` con el estilo outline, pero sin el icono `ArrowRight` que muestran el diseño y la captura. Hay dos opciones:
   - (a) incorporarlo en events-ui-refresh F4, que ya está modificando `modules/events`;
   - (b) hacerlo en modo build después de F4 (1 archivo: `modules/events/components/UpcomingEvents.tsx`, `<ArrowRight aria-hidden className="size-5" />` tras el texto).

   Esta spec no lo incluye para no tocar un módulo que se está enmendando en paralelo.
2. **`TrustHighlights` y `OrganizerBanner` frente al diseño.** El diseño no las incluye, y el paso 3 ("Paga de forma segura y recibe tus entradas al instante") se solapa en parte con "Compra 100% segura" y "Entrada digital con QR" de `TrustHighlights`. No es un duplicado claro, así que se conservan ambas. ¿Se quiere quitar o fusionar `TrustHighlights` más adelante?
3. **Texto del éxito.** Se propone "¡Listo! Te enviaremos las novedades a {email}.". ¿Es correcto o se prefiere otro texto?
4. **Suscripción real.** Cuando exista backend, harán falta un consentimiento de tratamiento de datos (Ley 29733), un estado de error y un aviso si el correo ya está suscrito. Quedan fuera de esta spec por ser solo UI mock. ¿Se confirma?
