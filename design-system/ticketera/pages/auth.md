# Página: acceso `/login` y `/registro`

> Override de `../MASTER.md` para estas páginas. Lo no indicado aquí sigue el MASTER.
> Spec: `docs/specs/layout-fullscreen-shells.md` (Fase 2). Reemplaza el layout de `docs/specs/events-ui-refresh.md` (Fase 3) y los títulos, subtítulos y enlaces del pie de `docs/specs/auth-login-register.md`. Los campos, validaciones, botones y el flujo de los formularios siguen siendo los de esa spec.
> Referencia: capturas del usuario y Claude Design `Auth.dc.html` / `AuthMobile.dc.html`. Se toman estructura, textos y patrones; la identidad visual es la de Mentec (nunca índigo, Poppins ni la marca "Ticketera" del diseño).

## Layout

**Pantalla completa:** sin header ni footer del sitio. Las rutas viven en el route group `app/(auth)`, fuera de `app/(site)`, así que no usan `SiteShell`. Solo se ve el acceso.

### Escritorio (`lg+`)

```
┌──────── 5fr · bg-brand-navy · sticky h-dvh ────────┬──────────── 7fr · bg-background (blanco) ────────────┐
│ [logo blanco] → /                                  │                                                      │
│                                                    │        ┌ Iniciar sesión │ Crear cuenta ┐  max-w-md     │
│     foto a sangre (fill, cover)                    │        └──────────────────────────────┘               │
│     + degradado navy/70 → navy/30 → navy/90        │        h1 Hola de nuevo                               │
│                                                    │        Ingresa para ver tus entradas…                 │
│                                                    │        formulario (sin Card)                          │
│ Tus entradas, siempre a mano.                      │        ¿No tienes cuenta? Crea una gratis             │
│ Compra en minutos y lleva tu QR en el celular.     │                                                      │
└────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘
```

- El panel ocupa toda la altura de la ventana (`lg:sticky lg:top-0 lg:h-dvh lg:self-start`) y no se mueve aunque el registro haga scroll: nunca quedan franjas blancas debajo.
- La columna del formulario va centrada en vertical y en horizontal sobre blanco.

### Móvil (`< lg`)

```
┌──────────── franja navy min-h-56 ────────────┐
│ [logo blanco] → /          ╭─────────────────│
│                            │   imagen 44%    │  rounded-bl-[2.5rem]
│ Tus entradas,              │                 │
│ siempre a mano.            │                 │
│ Compra en minutos y…       │                 │
└──────────────────────────────────────────────┘
[ Iniciar sesión | Crear cuenta ]                 bg-background, px-4 pt-8 pb-12 (md:pt-12)
h1 + subtítulo
formulario
pie
```

### Clases

- `app/(auth)/layout.tsx` (Server Component, sin `SiteShell`):
  ```tsx
  <div className="flex-1 lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <AuthBrandPanel />
    <main className="flex flex-col items-center px-4 pt-8 pb-12 md:pt-12 lg:justify-center lg:px-10 lg:py-12">
      {children}
    </main>
  </div>
  ```
  El fondo es el de `body` (`bg-background`); ya no hay `bg-muted`. El layout aporta el único `<main>` de la página (el root layout no lo tiene).
- Cada página compone pestañas + formulario en `flex w-full max-w-md flex-col gap-6`. Login y registro miden lo mismo (`max-w-md`, ~440 px como el diseño), así las pestañas no cambian de ancho al pasar de una a otra.

## Panel de marca (`AuthBrandPanel`, server)

- Contenedor `<section>`: `relative flex min-h-56 flex-col justify-between gap-4 overflow-hidden bg-brand-navy p-4 text-primary-foreground`; en `lg`, `lg:sticky lg:top-0 lg:h-dvh lg:self-start lg:p-10`.
- **Logo:** único enlace al sitio, visible en todos los breakpoints. `<Link href="/" aria-label="Mentec Tickets: ir al inicio">` (`min-h-11`, `rounded-lg`, foco `focus-visible:ring-2 focus-visible:ring-highlight`) con `BrandLogo variant="white"` (`h-7`, `lg:h-8`). No hay enlace de texto "Volver al inicio".
- **Imagen:** foto de Unsplash de "festival-sol-de-verano" (`photo-1533174072545-7a4b6ad7a6c3`), constante dentro del componente (auth no importa de `modules/events`). `next/image fill preload object-cover alt=""`, `sizes="(min-width: 1024px) 42vw, 44vw"`.
  - Móvil: a la derecha, `absolute inset-y-0 right-0 w-[44%] rounded-bl-[2.5rem]`.
  - `lg`: a sangre completa (`lg:inset-0 lg:w-full lg:rounded-none`).
- **Degradado de contraste** (solo `lg`): `bg-gradient-to-b from-brand-navy/70 via-brand-navy/30 to-brand-navy/90`, para que el logo (arriba) y los textos (abajo) se lean sobre cualquier zona de la foto.
- **Textos** abajo (`justify-between`), en `<p>` (no encabezados), dentro de `relative z-10 flex max-w-[55%] flex-col gap-2 lg:max-w-md lg:gap-3`:
  - "Tus entradas, siempre a mano." — `text-2xl lg:text-4xl font-bold tracking-tight leading-tight`.
  - "Compra en minutos y lleva tu QR en el celular." — `text-primary-foreground/80 leading-relaxed`.

## Pestañas (`AuthTabs`, server)

- Prop `current: "login" | "register"`; la renderiza cada página (conoce su ruta), así el layout sigue siendo de servidor sin `usePathname`.
- Son **enlaces**, no `role="tablist"`, porque navegan entre rutas: `<nav aria-label="Acceso a tu cuenta">`.
- Estilo de **control segmentado** (como el filtro de `OrganizerDashboard`):
  - Lista: `grid grid-cols-2 gap-1 rounded-xl bg-muted p-1`.
  - Enlaces `h-11` (≥ 44 px), `rounded-lg`, `text-sm font-medium`, transición 200 ms, foco `focus-visible:ring-3 focus-visible:ring-ring/50`.
  - Actual: `aria-current="page"`, `bg-background font-semibold text-foreground shadow-sm`.
  - Otra: `text-muted-foreground hover:bg-background/60 hover:text-foreground`.
- Destinos sin query: "Iniciar sesión" → `/login`, "Crear cuenta" → `/registro`.

## Formularios

- `LoginForm` y `RegisterForm` van **sin `Card`**, directamente sobre blanco: raíz `flex w-full flex-col gap-6`, bloque de título `flex flex-col gap-1.5` (h1 `text-2xl md:text-3xl font-bold tracking-tight` + `<p className="text-base text-muted-foreground">`), el `<form>` y el pie (`text-center text-sm text-muted-foreground`, enlace `TEXT_LINK` + `font-semibold`).
- Textos (del diseño):

  | Página | h1 | Subtítulo | Pie |
  |---|---|---|---|
  | `/login` | "Hola de nuevo" | "Ingresa para ver tus entradas y comprar más rápido." | "¿No tienes cuenta? **Crea una gratis**" → `/registro` |
  | `/registro` | "Crea tu cuenta" | "Guarda tus entradas y recibe novedades de tus eventos." | "¿Ya tienes cuenta? **Inicia sesión**" → `/login` |

- La metadata no cambia: "Iniciar sesión — Mentec Tickets" y "Crear cuenta — Mentec Tickets".
- Campos, mensajes, botones ("Iniciar sesión" / "Crear cuenta", "Ingresando…" / "Creando cuenta…") y flujo sin cambios. El registro conserva Nombres, Apellidos, Celular, Documento, Contraseña, Confirmación, Términos y Novedades: **el campo "Nombre completo" del diseño sigue sin adoptarse**.

## Accesibilidad

- Un único `<main>` (el del layout `(auth)`) y un único `<h1>` por página: el del formulario. Los textos del panel son `<p>`.
- Logo: nombre accesible "Mentec Tickets: ir al inicio" (incluye el nombre visible de la marca, WCAG 2.5.3), área táctil ≥ 44 px y foco cian (`ring-highlight`) sobre navy.
- Orden de Tab: logo, pestañas, campos, "¿Olvidaste tu contraseña?" (login), botones y enlace del pie, todos con foco visible y ≥ 44 px de alto.
- Imagen del panel decorativa (`alt=""`); el logo conserva su `alt` "Mentec Tickets".
- Contraste: blanco sobre navy (con el degradado en `lg`), `primary-foreground/80` sobre navy para el subtítulo; `foreground` sobre `background` en la pestaña activa.
- Sin scroll horizontal a 375, 768, 1024 y 1440 px.
