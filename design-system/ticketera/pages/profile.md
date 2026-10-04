# Página: Mi perfil `/perfil`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Specs: `docs/specs/auth-user-menu.md` (Fase 2: página `/perfil`, solo lectura) y `docs/specs/auth-clerk.md` (Fases 3 y 4: sesión de Clerk y fila de `users`).

Datos de la cuenta con sesión iniciada: nombres, apellidos, correo, celular, documento y fecha de alta. La sesión es la de Clerk y los datos salen de la fila de `users` del usuario (la BD manda), que obtiene `requireUser()` en el servidor. Celular y documento muestran "—" hasta que el usuario los registre en "Completa tu perfil" (`/perfil/completar`). No hay edición, foto de perfil ni acciones en la tarjeta. Se llega desde "Mi perfil", el primer enlace del menú de usuario (barra) y del bloque "Tu cuenta" del menú móvil (`Sheet`).

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
- h1 "Mi perfil" `text-3xl md:text-5xl font-extrabold tracking-tight`, único h1 de la página.
- La ruta `app/(site)/perfil/page.tsx` es un Server Component dinámico: pone metadata (`Mi perfil | Mentec Tickets`, `robots: noindex`), obtiene el usuario con `requireUser()` (`@/modules/auth/server`) y renderiza `UserProfile` (`modules/auth`, Server Component, prop `user: SessionUser`). Sin `"use client"`.

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
  - **"—":** si falta un dato (celular o documento antes de "Completa tu perfil"; nombre vacío si Clerk no lo trajo), el `dd` muestra "—" en `font-normal text-muted-foreground`, no en negrita. La página no falla.

## Acceso

- Sin sesión no se llega a la página: `proxy.ts` (`auth.protect()`) manda a `/login` con `redirect_url` y, tras iniciar sesión, se vuelve a `/perfil`. `requireUser()` repite la comprobación en el servidor (sin sesión → `redirect("/login")`).
- No hay estados de carga ni de "sin sesión": la página se renderiza en el servidor con el usuario ya resuelto.
- **Cerrar sesión** desde el menú de usuario lleva a `/`.

## Accesibilidad

- Un único `<h1>` "Mi perfil"; el nombre de la tarjeta es `<h2>`.
- La tarjeta es una región con nombre: `aria-labelledby="profile-name"` apunta al h2 con el nombre completo.
- Datos como lista de descripción (`dl`/`dt`/`dd`), que los lectores de pantalla anuncian como pares etiqueta-valor.
- El avatar es decorativo (`aria-hidden`).

## Reglas específicas

- Sin scroll horizontal a 375 / 768 / 1024 / 1440, también con el nombre "Ronald Eleazar Mendoza Huamán" y un correo largo (`wrap-break-word` / `wrap-anywhere`).
- La página no tiene controles propios; los del header siguen el MASTER (targets ≥ 44 px, foco visible).
- Solo tokens del tema, Creato Display, iconos lucide `aria-hidden`; sin emojis ni hex; transiciones 150–300 ms con `motion-reduce` respetado.
