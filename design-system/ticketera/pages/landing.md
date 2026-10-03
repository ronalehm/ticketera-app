# Página: landing `/`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER (§8 "Layout de la landing").
> Spec: `docs/specs/marketing-how-it-works.md` (Fase 1). Añade "Cómo funciona" y el newsletter "No te pierdas ningún evento". De las referencias (`Main.dc.html` a 1440 px, `Mobile.dc.html` a 375 px, secciones `COMO FUNCIONA` y `NEWSLETTER`, y la captura del usuario) se toman estructura, textos y layout; la identidad visual es la de Mentec (tokens, Creato Display, a11y §11), nunca el índigo, los hex ni los radios en px del diseño.

## Orden de secciones

```
Header sticky        (layout del grupo (site))
HeroCarousel         h1 "Encuentra tu próximo plan en vivo" (único h1) + slider
EventSearchBar       buscador píldora, months={getEventMonths(events)}
CategoryGrid         6 tiles
FeaturedEventsRail   Destacados
UpcomingEvents       Próximos eventos + "Ver todos los eventos" → /eventos
HowItWorks           NUEVO · "Cómo funciona" (3 pasos)
OrganizerBanner      banner de organizadores
TrustHighlights      Compra con confianza
NewsletterSignup     NUEVO · "No te pierdas ningún evento"
Footer navy          (layout del grupo (site))
```

- `app/(site)/page.tsx` es un Server Component que solo compone, en este orden. `OrganizerBanner` y `TrustHighlights` no están en el diseño de referencia pero se conservan entre las dos secciones nuevas.
- Un solo `<h1>` en `/` (el del hero). Las secciones nuevas usan `h2` y `h3`.
- Ambas secciones: `<section>` sobre `bg-background`, contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8`, `py-12 md:py-16`.

## "Cómo funciona" (`HowItWorks`)

Server Component, sin elementos interactivos.

### Escritorio (`md+`, referencia 1440 px)

```
                         Cómo funciona                          ← h2 centrado (SectionHeader)
                  Tres pasos y ya estás dentro.                 ← descripción centrada

┌────┐╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  ┌────┐╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  ┌────┐
│ ⌕  │                      │ 🎫 │                      │ ▭  │      icono size-16 rounded-2xl
└────┘                      └────┘                      └────┘      bg-accent text-primary
PASO 1                      PASO 2                      PASO 3      overline primary-strong
Buscar                      Elegir                      Comprar     h3
Encuentra el evento,        Selecciona tus entradas     Paga de forma segura y
artista o ciudad…           y la cantidad…              recibe tus entradas…
```

- `<ol class="grid gap-6 md:grid-cols-3 md:gap-8">`, cada `<li>` `flex gap-4 md:flex-col`.
- **Línea punteada solo en `md+`**: en los pasos 1 y 2 el icono va en una fila `flex items-center gap-4` seguida de `<span aria-hidden="true" class="hidden md:block flex-1 border-t-2 border-dashed border-input">`. Une el icono 1 con la columna 2 y el icono 2 con la columna 3. El paso 3 no tiene línea.

### Móvil (`< md`, referencia 375 px)

```
      Cómo funciona                ← centrado también en móvil (decisión de la captura)
Tres pasos y ya estás dentro.

┌────┐  PASO 1
│ ⌕  │  Buscar
└────┘  Encuentra el evento, artista o ciudad que te interesa.

┌────┐  PASO 2
│ 🎫 │  Elegir
└────┘  Selecciona tus entradas y la cantidad que necesitas.

┌────┐  PASO 3
│ ▭  │  Comprar
└────┘  Paga de forma segura y recibe tus entradas al instante.
```

- Pasos apilados, icono a la izquierda (`size-13`, icono `size-6`) y texto a la derecha. Sin línea punteada. Sin scroll horizontal.

### Pasos

| # | Icono (lucide) | Overline | h3 | Texto |
|---|---|---|---|---|
| 1 | `Search` | Paso 1 | Buscar | Encuentra el evento, artista o ciudad que te interesa. |
| 2 | `Ticket` | Paso 2 | Elegir | Selecciona tus entradas y la cantidad que necesitas. |
| 3 | `CreditCard` | Paso 3 | Comprar | Paga de forma segura y recibe tus entradas al instante. |

- Paso 3 usa `CreditCard` (la captura muestra una tarjeta y el texto es un pago), no el QR del HTML de referencia; `TrustHighlights` ya usa `QrCode`.

### Tipografía y color

| Parte | Clases |
|---|---|
| Encabezado | `SectionHeader` (`components/shared`) sin modificar, centrado con `className="items-center text-center md:flex-col md:items-center"`. |
| Icono | `rounded-2xl bg-accent text-primary`, `size-13 md:size-16`; icono `size-6 md:size-7`, `aria-hidden="true"`. |
| Overline | `text-xs font-bold uppercase tracking-wider text-primary-strong`. Texto en el DOM "Paso 1", mayúsculas por CSS. Se usa `primary-strong` porque `--primary` sobre blanco da 4.4:1, por debajo de 4.5:1 en `text-xs` (MASTER §2). |
| h3 | `text-lg font-bold md:text-xl`. |
| Texto | `text-base leading-relaxed text-muted-foreground max-w-sm`. |

### Accesibilidad

- El lector anuncia el h2 "Cómo funciona" y una lista ordenada de 3 elementos, cada uno con su h3.
- Iconos y línea punteada `aria-hidden`.
- Contenido estático: nada recibe el foco al tabular.

## Newsletter (`NewsletterSignup` + `NewsletterForm`)

`NewsletterSignup` es Server Component (bloque y textos); solo `NewsletterForm` es cliente. Envío **simulado**: `subscribeToNewsletter` (service mock, 600 ms) no hace peticiones de red ni guarda el correo.

### Escritorio (`lg+`, referencia 1440 px)

```
┌─ rounded-3xl bg-accent ─────────────────────────────────────────────────────────┐
│                                                                                 │
│  No te pierdas ningún evento                  ┌─────────────────────┐ ┌────────────┐
│  Suscríbete y recibe las novedades de tus     │ ✉ tu@email.com      │ │ Suscribirme│
│  artistas y equipos favoritos.                └─────────────────────┘ └────────────┘
│                                               ✓ ¡Listo! Te enviaremos las novedades a …
└─────────────────────────────────────────────────────────────────────────────────┘
Footer
```

- `<section aria-labelledby="newsletter-title">`. Bloque `rounded-3xl bg-accent px-6 py-8 md:px-12 md:py-14 lg:px-16`.
- `lg+`: `flex items-center justify-between gap-12`; textos a la izquierda (`max-w-xl`), formulario a la derecha.

### Móvil (`< lg`, referencia 375 px)

```
┌─ rounded-3xl bg-accent ─────┐
│ No te pierdas ningún evento │
│ Suscríbete y recibe las     │
│ novedades de tus artistas…  │
│ ┌─────────────────────────┐ │  input h-12, ancho completo
│ │ ✉ tu@email.com          │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │  botón h-12, ancho completo
│ │       Suscribirme       │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- `< lg`: columna con `gap-6`. Desde `sm` el input (`sm:w-80`, `lg:w-90`) y el botón (`sm:w-auto`) van en la misma fila.
- Input y botón de 48 px de alto (≥ 44 px). Sin scroll horizontal.

### Anatomía

| Parte | Clases / comportamiento |
|---|---|
| h2 | `id="newsletter-title"` "No te pierdas ningún evento", `text-2xl font-bold tracking-tight md:text-3xl`. |
| Párrafo | "Suscríbete y recibe las novedades de tus artistas y equipos favoritos.", `text-base leading-relaxed text-muted-foreground` (5.5:1 sobre `--accent`). |
| Formulario | `<form noValidate>` con `useZodForm(newsletterSchema, { email: "" })`; `newsletterSchema = z.object({ email: emailField })`. |
| Fila | `flex flex-col gap-3 sm:flex-row sm:items-start`: el error bajo el input no estira el botón. |
| Label | `FieldLabel htmlFor="newsletter-email" className="sr-only"` "Correo electrónico" (visible solo para lectores de pantalla; el placeholder no sustituye al label). |
| Input | `InputGroup` `h-12 bg-background` + `InputGroupAddon` con `Mail` (`aria-hidden`) + `InputGroupInput` `id="newsletter-email" type="email" autoComplete="email" placeholder="tu@email.com"`. |
| Error | `FieldError id="newsletter-email-error"` (`role="alert"`). Vacío → "Ingresa tu correo electrónico"; formato → "Ingresa un correo electrónico válido". El input lleva `aria-invalid` y `aria-describedby="newsletter-email-error"` solo con error. |
| Botón | `Button type="submit"` "Suscribirme", `h-12 px-6 font-semibold cursor-pointer duration-200 hover:bg-primary-strong`, `w-full sm:w-auto`. Durante el envío: `disabled`, `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Suscribiendo…". |
| Estado | `<p role="status">` `mt-3 text-sm font-medium text-foreground`, **siempre en el DOM**, vacío hasta el éxito: `CircleCheck` (`aria-hidden`) + "¡Listo! Te enviaremos las novedades a {email}.". Se vacía al empezar otro envío o al editar el campo. |

### Comportamiento

- Validación al enviar; después del primer intento, salir del campo revalida. Con error, el foco pasa al input y no se llama al service.
- El correo se envía recortado (`"  ana@correo.pe "` → `"ana@correo.pe"`).
- Tras el éxito el campo **conserva** el correo (no se vacía): vaciarlo haría aparecer "Ingresa tu correo electrónico" al salir del campo.
- Sin estado de error del servidor: el mock nunca falla.

### Accesibilidad

- El lector anuncia el campo como "Correo electrónico", campo de edición de correo; el icono del sobre no se anuncia.
- Orden de tabulación: input → botón, ambos con foco visible (`ring`). Enter en el input envía.
- La región `role="status"` anuncia el éxito sin mover el foco.
- Con `prefers-reduced-motion: reduce` el spinner no gira.
