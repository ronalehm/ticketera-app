# Página: acceso `/login` y `/registro`

> Override de `../MASTER.md` para estas páginas. Lo no indicado aquí sigue el MASTER.
> Spec: `docs/specs/events-ui-refresh.md` (Fase 3). Reemplaza la decisión 5 de `docs/specs/auth-login-register.md` ("sin panel lateral"). Los formularios (`LoginForm`, `RegisterForm`), sus textos, validaciones y h1 siguen siendo los de esa spec.

## Layout

### Escritorio (`lg+`)

```
Header sticky   (igual que la landing)
┌──────── 5fr · bg-brand-navy ────────┬──────────────── 7fr · bg-muted ────────────────┐
│ [logo blanco]                       │                                                │
│ ┌─────────────────────────────────┐ │        ┌ Iniciar sesión │ Crear cuenta ┐      │
│ │ imagen (fill, cover, rounded-2xl)│ │        └──────────────────────────────┘      │
│ │ flex-1, min-h-80                 │ │        ┌────────── Card ──────────────┐      │
│ └─────────────────────────────────┘ │        │ h1 Iniciar sesión            │      │
│ Tus entradas, siempre a mano.       │        │ formulario                   │      │
│ Compra en minutos y lleva tu QR…    │        └──────────────────────────────┘      │
└─────────────────────────────────────┴────────────────────────────────────────────────┘
Footer          (igual que la landing)
```

### Móvil (`< lg`)

```
Header sticky   (ya muestra el logo)
┌──────────── franja navy h-52 ────────────┐
│ Tus entradas,             ╭──────────────│
│ siempre a mano.           │  imagen 44%  │  rounded-bl-[2.5rem]
│ Compra en minutos y…      │              │
└──────────────────────────────────────────┘
[ Iniciar sesión | Crear cuenta ]            bg-muted, px-4 py-12
Card del formulario
Footer
```

- `app/(auth)/layout.tsx`: `lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]` con `AuthBrandPanel` y el contenido en `flex justify-center bg-muted px-4 py-12 md:py-16`. En móvil se apilan (franja arriba, contenido debajo). Header y footer son los del layout raíz.
- Cada página compone pestañas + formulario en una columna `flex w-full flex-col gap-6` con el ancho de su tarjeta: `max-w-md` (login) y `max-w-lg` (registro).

## Panel de marca (`AuthBrandPanel`, server)

- `bg-brand-navy text-primary-foreground`.
- `lg`: columna `p-10 flex flex-col gap-8`: `BrandLogo variant="white"` (`h-8 w-auto`), imagen y textos.
- Móvil: franja `h-52` (`px-4`, textos centrados en vertical) con los textos a la izquierda (`max-w-[55%]`) y la imagen a la derecha (`absolute inset-y-0 right-0 w-[44%] rounded-bl-[2.5rem]`). Sin logo: el header ya lo muestra.
- Imagen: foto de Unsplash de "festival-sol-de-verano" (`photo-1533174072545-7a4b6ad7a6c3`), constante dentro del componente (auth no importa de `modules/events`). `next/image fill object-cover`, `preload`, `alt=""` (decorativa).
- Textos en `<p>` (no encabezados, para que el único h1 sea el del formulario):
  - "Tus entradas, siempre a mano." — `text-2xl lg:text-4xl font-bold tracking-tight`.
  - "Compra en minutos y lleva tu QR en el celular." — `text-base`, `text-primary-foreground/80`.

## Pestañas (`AuthTabs`, server)

- Prop `current: "login" | "register"`; la renderiza cada página (conoce su ruta), así el layout sigue siendo de servidor sin `usePathname`.
- Son **enlaces**, no `role="tablist"`, porque navegan entre rutas: `<nav aria-label="Acceso a tu cuenta">` con una lista `grid grid-cols-2 gap-1 rounded-xl bg-background p-1 ring-1 ring-border`.
- Enlaces `h-11` (≥ 44 px), `rounded-lg`, `text-sm font-medium`:
  - Actual: `aria-current="page"`, `bg-primary text-primary-foreground font-semibold`.
  - Otro: `hover:bg-accent hover:text-accent-foreground`, transición 200 ms.
  - Foco visible: `focus-visible:ring-3 focus-visible:ring-ring/50`.
- Destinos sin query: "Iniciar sesión" → `/login`, "Crear cuenta" → `/registro`.

## Formularios

- `LoginForm` y `RegisterForm` sin cambios: siguen en su `Card` (`rounded-2xl`) sobre `bg-muted`, con su h1 ("Iniciar sesión" / "Crear cuenta") y textos aprobados. No se adoptan los títulos ni el campo "Nombre completo" del diseño de referencia.

## Accesibilidad

- Un solo `<h1>` por página: el del formulario. Los textos del panel son `<p>`.
- Imagen del panel decorativa (`alt=""`); el logo conserva su `alt` "Mentec Tickets".
- Pestañas alcanzables con Tab, con foco visible, `aria-current="page"` en la actual y altura ≥ 44 px.
- Contraste: blanco sobre navy (texto principal) y `primary-foreground/80` sobre navy para el subtítulo; blanco semibold sobre `bg-primary` en la pestaña activa.
- Sin scroll horizontal a 375 px.
