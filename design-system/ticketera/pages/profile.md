# Página: Mi perfil `/perfil`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/auth-user-menu.md` (Fase 2: página `/perfil`, solo lectura).

Datos de la cuenta con sesión iniciada: nombres, apellidos, correo, celular, documento y fecha de alta. Es una **maqueta con datos mock**: la sesión sale del store zustand persistido en el navegador (`localStorage`, clave `mentec-auth`). No hay edición, foto de perfil ni acciones en la tarjeta. Se llega desde "Mi perfil", el primer enlace del menú de usuario (barra) y del bloque "Tu cuenta" del menú móvil (`Sheet`).

## Layout

A 375 px (bajo `sm`, todo centrado y apilado, `dl` en 1 columna):

```
Header sticky     (igual que la landing)
┌─ section bg-muted a todo el ancho ─┐
│ h1 "Mi perfil"                     │
│ ┌─ tarjeta ──────────────────────┐ │
│ │          ( AQ )  80 px         │ │
│ │       h2 Ana Quispe            │ │
│ │   demo@mentectickets.pe        │ │
│ │ ────────────────────────────── │ │
│ │ Nombres                        │ │
│ │ Ana                            │ │
│ │ Apellidos                      │ │
│ │ Quispe                         │ │
│ │ Correo electrónico             │ │
│ │ demo@mentectickets.pe          │ │
│ │ Celular                        │ │
│ │ 987654321                      │ │
│ │ Documento                      │ │
│ │ DNI 45781236                   │ │
│ │ Miembro desde                  │ │
│ │ marzo de 2025                  │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
Footer            (igual que la landing)
```

A 1440 px (desde `sm`: avatar a la izquierda del nombre y `dl` en 2 columnas; contenido limitado a `max-w-3xl` centrado):

```
Header sticky
┌─ section bg-muted a todo el ancho ──────────────────────────────────────┐
│              h1 "Mi perfil"                                              │
│              ┌─ tarjeta (max-w-3xl) ────────────────────────────────┐    │
│              │ ( AQ )  h2 Ana Quispe                                │    │
│              │ 80 px   demo@mentectickets.pe                        │    │
│              │ ──────────────────────────────────────────────────── │    │
│              │ Nombres               │ Apellidos                    │    │
│              │ Ana                   │ Quispe                       │    │
│              │ Correo electrónico    │ Celular                      │    │
│              │ demo@mentectickets.pe │ 987654321                    │    │
│              │ Documento             │ Miembro desde                │    │
│              │ DNI 45781236          │ marzo de 2025                │    │
│              └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
Footer
```

- **Fondo `bg-muted`** a todo el ancho (mismo override que `/mis-entradas`): la tarjeta blanca destaca. Interior `mx-auto flex max-w-3xl flex-col gap-6 md:gap-8 px-4 md:px-6 py-8 md:py-12`.
- h1 "Mi perfil" `text-3xl md:text-5xl font-extrabold tracking-tight`, único h1 y presente en todos los estados (también en SSR).
- `UserProfile` (`modules/auth`) es el límite cliente; la ruta `app/(site)/perfil/page.tsx` es un Server Component que solo pone metadata (`Mi perfil | Mentec Tickets`, `robots: noindex`) y lo renderiza. El build la genera como ruta estática.

## Tarjeta del perfil

- `<section aria-labelledby="profile-name">` con las clases de tarjeta del MASTER: `rounded-2xl bg-card p-6 md:p-8 ring-1 ring-border` (como `TicketCard`; no se usa `Card` de shadcn, cuya cabecera/pie no hacen falta).
- **Cabecera:** `flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left`.
  - `UserAvatar size="xl"` (`components/shared/UserAvatar.tsx`): círculo de 80 px (`size-20`) `bg-accent text-accent-foreground font-semibold text-2xl` con las iniciales (`getInitials`), `aria-hidden` (el nombre va al lado). Sin foto.
  - Bloque `min-w-0`: h2 `id="profile-name"` con el nombre completo (`getFullName`) `text-2xl font-bold tracking-tight wrap-break-word` y el correo `text-base text-muted-foreground wrap-anywhere`. Sin truncado: los nombres y correos largos hacen salto de línea.
- `Separator` de shadcn con `my-6`.
- **`<dl>`** `grid gap-x-6 gap-y-4 sm:grid-cols-2`: cada par en un `<div>`; `dt` `text-sm font-medium text-muted-foreground`, `dd` `text-base font-semibold wrap-break-word`. Orden: Nombres, Apellidos, Correo electrónico (`wrap-anywhere`), Celular, Documento, Miembro desde.
  - **Documento:** "<tipo> <número>" con las etiquetas de `DOCUMENT_TYPE_LABELS` (`lib/formFields.ts`), p. ej. "DNI 45781236", "Carné de extranjería 001234567". Solo si existen tipo y número.
  - **Celular:** tal como se guardó ("987654321"), sin agrupar ni prefijo.
  - **Miembro desde:** mes y año de `createdAt` con `formatMemberSince` (`Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "America/Lima" })`), p. ej. "marzo de 2025". Una cuenta registrada hoy muestra el mes y el año actuales.
  - **"No registrado":** si falta un dato (sesiones antiguas en `localStorage` con solo `id`, `firstName`, `lastName` y `email`), el `dd` dice "No registrado" en `font-normal text-muted-foreground`, no en negrita. La página no falla.

## Estados

| Estado | Cuándo | Contenido |
|---|---|---|
| Cargando | SSR, primer render del cliente y hasta que termina la rehidratación | h1 + `<div role="status">` con "Cargando tu perfil…" `sr-only` y un `Skeleton` `aria-hidden` `h-96 rounded-2xl bg-background motion-reduce:animate-none` |
| Sin sesión | Rehidratado y sin usuario | `EmptyState` compartido (`components/shared/EmptyState.tsx`), mismo aspecto que `/mis-entradas`: icono `UserRound`, h2 "Inicia sesión para ver tu perfil", "Ingresa con tu cuenta para ver tus datos y tus entradas." y botón primario "Iniciar sesión" → `/login`. Sin redirección. |
| Con sesión | Rehidratado y con usuario | Tarjeta del perfil |

- **Rehidratación sin parpadeo:** el store `mentec-auth` usa `skipHydration`. `UserProfile` arranca en "cargando" y, en un `useEffect`, hace `await useAuthStore.persist.rehydrate()`; solo entonces pasa a "sin sesión" o a la tarjeta. Así el HTML del servidor y el primer render del cliente coinciden (sin errores de hidratación) y un usuario con sesión nunca ve "Inicia sesión para ver tu perfil", ni siquiera un instante.
- **Cerrar sesión** desde el menú de usuario estando en `/perfil` deja al usuario en la misma URL y la página pasa al estado "Sin sesión".

## Accesibilidad

- Un único `<h1>` "Mi perfil" en todos los estados; el nombre (tarjeta) o el título del estado vacío son `<h2>`.
- `role="status"` en el estado cargando, con texto `sr-only`; el `Skeleton` es `aria-hidden`.
- La tarjeta es una región con nombre: `aria-labelledby="profile-name"` apunta al h2 con el nombre completo.
- Datos como lista de descripción (`dl`/`dt`/`dd`), que los lectores de pantalla anuncian como pares etiqueta-valor.
- El avatar y el icono del estado vacío son decorativos (`aria-hidden`).

## Reglas específicas

- Sin scroll horizontal a 375 / 768 / 1024 / 1440, también con el nombre "Ronald Eleazar Mendoza Huamán" y un correo largo (`wrap-break-word` / `wrap-anywhere`).
- Targets ≥ 44 px (el botón "Iniciar sesión" del estado vacío mide `h-11`); foco visible en todo lo interactivo.
- Solo tokens del tema, Creato Display, iconos lucide `aria-hidden`; sin emojis ni hex; transiciones 150–300 ms con `motion-reduce` respetado.
