# Página: acceso `/login` y `/registro`

> Override de `../MASTER.md` para estas páginas. Lo no indicado aquí sigue el MASTER.
> Spec: `docs/specs/layout-fullscreen-shells.md` (Fase 2). Reemplaza el layout de `docs/specs/events-ui-refresh.md` (Fase 3) y los títulos, subtítulos y enlaces del pie de `docs/specs/auth-login-register.md`. Los campos, validaciones, botones y el flujo de los formularios siguen siendo los de esa spec.
> Acceso con Google (maqueta), separador "o" y placeholder del correo: `docs/specs/design-alignment-account-views.md` (Fase 1). Prevalece sobre la spec de layout en esos puntos; el resto del layout no cambia.
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
│                                                    │        [G  Continuar con Google]                      │
│                                                    │        Al continuar con Google, aceptas…              │
│                                                    │        ─────────────── o ───────────────              │
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
[G  Continuar con Google] + aviso
──── o ────
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

- Orden dentro de la raíz `flex flex-col gap-6`: bloque de título, `<GoogleSignIn />`, `<FieldSeparator>o</FieldSeparator>`, `<form>` y pie. No hay contenedor extra.
- Campo de correo: `placeholder="tu@email.com"` en los dos formularios (del diseño). Es solo un ejemplo: la etiqueta "Correo electrónico" sigue visible.
- La metadata no cambia: "Iniciar sesión — Mentec Tickets" y "Crear cuenta — Mentec Tickets".
- Campos, mensajes, botones ("Iniciar sesión" / "Crear cuenta", "Ingresando…" / "Creando cuenta…") y flujo sin cambios. El registro conserva Nombres, Apellidos, Celular, Documento, Contraseña, Confirmación, Términos y Novedades: **el campo "Nombre completo" del diseño sigue sin adoptarse**.

## Acceso con Google (maqueta)

Spec: `docs/specs/design-alignment-account-views.md` (Fase 1). **Sin integración real:** no carga Google Identity Services ni llama a ningún backend. El service mock `signInWithGoogle()` (`modules/auth/services/googleAuth.service.ts`) espera `MOCK_LATENCY_MS` (~600 ms) y devuelve la cuenta de ejemplo `GOOGLE_DEMO_ACCOUNT` (`modules/auth/data/googleAccount.mock.ts`: Lucía Fernández Rojas, `lucia.fernandez@gmail.com`, `id` estable `usr-google-001`).

Componentes (`modules/auth/components/`):

| Componente | Tipo | Rol |
|---|---|---|
| `GoogleSignIn` | cliente | Bloque completo: botón, aviso, alerta, región de estado y selector. Sin props: el mismo texto en `/login` y `/registro`. |
| `GoogleAccountChooser` | cliente, presentacional | Selector de cuenta simulado sobre `Dialog` de shadcn (Base UI). |
| `GoogleLogo` | presentacional | "G" oficial a cuatro colores, SVG inline `viewBox="0 0 48 48"`, `aria-hidden`, `focusable="false"`. Excepción de color de MASTER §2. |

### Anatomía

```
┌──────────────────────────────────────────┐
│ [G]  Continuar con Google                │  Button outline, h-11, w-full, blanco con borde gris
└──────────────────────────────────────────┘
  Al continuar con Google, aceptas los Términos y      text-sm muted, centrado; 3 enlaces en línea
  condiciones y la Política de privacidad, y autorizas
  la transferencia internacional de tus datos a
  proveedores fuera del Perú.
[ ! Cancelaste el inicio de sesión con Google… ]       Alert destructive (solo si hay error)
───────────────────── o ─────────────────────          FieldSeparator (ya fuera de GoogleSignIn)
```

- Raíz de `GoogleSignIn`: `flex flex-col gap-3`. Orden en el DOM: botón, aviso, `Alert` (si lo hay), región de estado (`sr-only`) y diálogo (en portal).
- **Botón** (guía de marca de Google Sign-In, tema claro, con tokens Mentec): `Button type="button" variant="outline"` + `h-11 w-full cursor-pointer gap-2.5 rounded-lg border-muted-foreground bg-background font-medium text-foreground duration-200 hover:bg-accent`.
  - Logo `size-4.5` (18 px) `shrink-0`, a 10 px del texto. Nunca se recolorea, se deforma ni se pone sobre otro fondo.
  - Borde `border-muted-foreground` (6.3:1), equivalente al trazo gris oscuro de la guía.
  - Texto "Continuar con Google" (variante localizada permitida; vale también para el registro) en Creato Display. Google recomienda Roboto Medium: pendiente de decisión (pregunta abierta 1 de la spec).
- **Aviso de aceptación** (patrón del bloque `login-03` de shadcn): `<p className="text-center text-sm text-muted-foreground">`. "Términos y condiciones" → `/terminos`, "Política de privacidad" → `/privacidad` y "transferencia internacional de tus datos" → `/privacidad#transferencia-internacional`; `Link` con `INLINE_LINK`, `target="_blank" rel="noopener noreferrer"`.
  - Entrar con Google también crea la cuenta, por eso el aviso va en las dos páginas. Novedades queda desmarcada (opt-in): Google no suscribe a nadie.
  - Solución de maqueta: la Ley 29733 pide consentimiento expreso para la transferencia internacional (pregunta abierta 2 de la spec: posible paso "Completa tu registro" con casillas). No se registran consentimientos con `recordConsents`.
- **Separador:** `FieldSeparator` de shadcn (`components/ui/field.tsx`) con el texto "o", línea `border` a cada lado y texto `text-muted-foreground` sobre `bg-background`.

### Selector de cuenta (modo demostración)

```
┌──────────────────────────────────┐  DialogContent sm:max-w-sm, rounded-xl, p-4
│ [G]                              │  GoogleLogo size-6
│ Elige una cuenta                 │  DialogTitle
│ Modo demostración: no se conecta │  DialogDescription
│ con Google.                      │
│ ┌──────────────────────────────┐ │
│ │ (LF)  Lucía Fernández Rojas  │ │  botón de cuenta: UserAvatar lg (40 px) + nombre
│ │       lucia.fernandez@gmail… │ │  semibold + correo text-sm muted (salto de línea)
│ └──────────────────────────────┘ │
├──────────────────────────────────┤  DialogFooter (borde superior, bg-muted/50)
│                       [Cancelar] │  DialogClose outline h-11
└──────────────────────────────────┘
```

- Diálogo modal centrado (`Dialog` de shadcn sobre Base UI, no `Sheet`). Usa tokens Mentec y **no imita la interfaz de Google**: el texto "Modo demostración" deja claro que es una simulación.
- **Botón de cuenta:** `<button type="button">` `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left ring-1 ring-border transition-colors duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring`. Nombre (`getFullName`, `wrap-break-word`) y correo (`wrap-anywhere`) no se truncan. Nombre accesible: "Continuar como Lucía Fernández Rojas, lucia.fernandez@gmail.com" ("Continuar como" y la coma en `sr-only`).
- **"Cancelar":** `DialogClose` con `buttonVariants({ variant: "outline" })` + `h-11 cursor-pointer`.
- **Sin X de cierre:** `DialogContent showCloseButton={false}`. "Cancelar" es la única salida visible (además de Escape y el clic fuera); una X duplicaría la acción con un target de 32 px (`icon-sm`) y la etiqueta "Close" en inglés del componente generado.
- Teclado (Base UI, sin código propio): el foco entra en el diálogo al abrirse y Tab queda atrapado dentro; Escape o clic fuera cierran.
- Al cerrarse, el foco vuelve al botón "Continuar con Google" por el comportamiento por defecto de Base UI (devuelve el foco al elemento que lo tenía al abrir). No se usa `finalFocus` ni código propio.

### Estados

| Estado | Cuándo | Botón | Otros |
|---|---|---|---|
| Reposo | inicial, tras cancelar o tras un error | Logo + "Continuar con Google" | — |
| Eligiendo | al pulsar el botón (clic, Enter o Espacio) | igual | Se borra la alerta previa y se abre el selector |
| Conectando | tras elegir la cuenta (el diálogo ya se cerró) | `Spinner` (`aria-hidden`, `motion-reduce:animate-none`) + "Conectando con Google…"; `aria-busy="true"`, `disabled` + `focusableWhenDisabled` (conserva el foco, no admite otro clic), `aria-busy:cursor-progress aria-busy:opacity-70` | Región `<p role="status" className="sr-only">` anuncia "Conectando con Google…" |
| Éxito | `signInWithGoogle` resuelve | — | `signIn(user)` del store `mentec-auth` (persistido) y `router.replace("/")`, el mismo destino que el login con correo |
| Cancelado | el diálogo se cierra sin elegir cuenta ("Cancelar", Escape o clic fuera) | vuelve a reposo | `Alert variant="destructive"` (`role="alert"`, `CircleAlert`): "Cancelaste el inicio de sesión con Google. Puedes intentarlo de nuevo." No navega |
| Error | `signInWithGoogle` rechaza | vuelve a reposo | El mismo `Alert` con `GENERIC_ERROR` (`formShared`). No navega |

- `focusableWhenDisabled` solo se activa mientras conecta (en reposo Base UI pondría `aria-disabled="false"`).
- Volver a pulsar el botón quita la alerta y reabre el selector.
- El formulario de correo no se bloquea mientras se conecta con Google (fuera de alcance de la spec).

## Accesibilidad

- Un único `<main>` (el del layout `(auth)`) y un único `<h1>` por página: el del formulario. Los textos del panel son `<p>`.
- Logo: nombre accesible "Mentec Tickets: ir al inicio" (incluye el nombre visible de la marca, WCAG 2.5.3), área táctil ≥ 44 px y foco cian (`ring-highlight`) sobre navy.
- Orden de Tab: logo, pestañas, "Continuar con Google", los tres enlaces del aviso, campos (en login: correo, "¿Olvidaste tu contraseña?", contraseña, mostrar contraseña), botones y enlace del pie, todos con foco visible y ≥ 44 px de alto. Los enlaces del aviso son enlaces en línea (`INLINE_LINK`), exentos del tamaño mínimo por WCAG 2.5.8.
- Acceso con Google: logo `aria-hidden` (el texto del botón da el nombre accesible); "Conectando con Google…" se anuncia por la región `role="status"`; cancelación y error por `role="alert"`. Selector: foco atrapado, Escape y devolución del foco al botón (Base UI).
- Imagen del panel decorativa (`alt=""`); el logo conserva su `alt` "Mentec Tickets".
- Contraste: blanco sobre navy (con el degradado en `lg`), `primary-foreground/80` sobre navy para el subtítulo; `foreground` sobre `background` en la pestaña activa.
- Sin scroll horizontal a 375, 768, 1024 y 1440 px. A 375 px el texto del botón de Google cabe en una línea y el aviso hace salto de línea.
