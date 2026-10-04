# Página: acceso `/login`, `/registro`, `/perfil/completar` y `/perfil/seguridad`

> Override de `../MASTER.md` para estas páginas. Lo no indicado aquí sigue el MASTER.
> Layout de pantalla completa: `docs/specs/layout-fullscreen-shells.md` (Fase 2).
> Acceso con Clerk, "Completa tu perfil" y página de seguridad: `docs/specs/auth-clerk.md` (Fases 3, 4 y 5). Sustituye a los formularios propios de `docs/specs/auth-login-register.md` y al acceso con Google simulado de `docs/specs/design-alignment-account-views.md` (Fase 1), que ya no existen.
> Referencia: capturas del usuario y Claude Design `Auth.dc.html` / `AuthMobile.dc.html`. Se toman estructura y patrones; la identidad visual es la de Mentec (nunca índigo, Poppins ni la marca "Ticketera" del diseño).

## Layout

**Pantalla completa:** sin header ni footer del sitio. `/login`, `/registro` y `/perfil/completar` viven en el route group `app/(auth)`, fuera de `app/(site)`, así que no usan `SiteShell`. Solo se ve el acceso. `/perfil/seguridad` es la excepción: vive en `app/(site)` (ver "Seguridad de la cuenta").

### Escritorio (`lg+`)

```
┌──────── 5fr · bg-brand-navy · sticky h-dvh ────────┬──────────── 7fr · bg-background (blanco) ────────────┐
│ [logo blanco] → /                                  │                                                      │
│                                                    │        ┌─ <SignIn/> / <SignUp/> de Clerk ─┐  max-w-md │
│     foto a sangre (fill, cover)                    │        │ título y subtítulo (esES)        │           │
│     + degradado navy/70 → navy/30 → navy/90        │        │ [G  Continuar con Google]        │           │
│                                                    │        │ ─────────── o ───────────        │           │
│                                                    │        │ campos y botón                   │           │
│                                                    │        │ pie: enlace a la otra página     │           │
│ Tus entradas, siempre a mano.                      │        └──────────────────────────────────┘           │
│ Compra en minutos y lleva tu QR en el celular.     │                                                      │
└────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘
```

- El panel ocupa toda la altura de la ventana (`lg:sticky lg:top-0 lg:h-dvh lg:self-start`) y no se mueve aunque la columna derecha haga scroll: nunca quedan franjas blancas debajo.
- La columna derecha va centrada en vertical y en horizontal sobre blanco.

### Móvil (`< lg`)

```
┌──────────── franja navy min-h-56 ────────────┐
│ [logo blanco] → /          ╭─────────────────│
│                            │   imagen 44%    │  rounded-bl-[2.5rem]
│ Tus entradas,              │                 │
│ siempre a mano.            │                 │
│ Compra en minutos y…       │                 │
└──────────────────────────────────────────────┘
<SignIn/> / <SignUp/> de Clerk                    bg-background, px-4 pt-8 pb-12 (md:pt-12)
(o el formulario "Completa tu perfil")
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
  El fondo es el de `body` (`bg-background`). El layout aporta el único `<main>` de la página (el root layout no lo tiene).
- Cada página envuelve su contenido en `flex w-full max-w-md flex-col gap-6`. Las tres páginas miden lo mismo (`max-w-md`, ~440 px), así la columna no cambia de ancho al pasar de una a otra.

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

## Login y registro (componentes de Clerk)

- `/login` → `app/(auth)/login/[[...rest]]/page.tsx` con `<SignIn />`; `/registro` → `app/(auth)/registro/[[...rest]]/page.tsx` con `<SignUp />`. La ruta catch-all opcional `[[...rest]]` cubre las subrutas de Clerk (verificación del correo, segundo factor, callback de SSO). Desde la Fase 5, `<SignUp fallbackRedirectUrl="/perfil/completar" />`.
- **Estilo:** el de MASTER §2 "Componentes de Clerk": tema `shadcn` sobre los tokens de Mentec, Creato Display heredada del `<body>` y textos de `esES`. No se añaden `appearance.variables` ni `appearance.elements` por página. La tarjeta, los campos, los botones y el separador "o" son los que dibuja Clerk con ese tema.
- **Google:** el botón "Continuar con Google" lo pone Clerk (dashboard: Google activo). No hay botón, logo, aviso ni selector de cuenta propios.
- **Navegación entre las dos páginas:** el pie de la tarjeta de Clerk enlaza a la otra (`NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/registro`). Ya no hay pestañas propias.
- **Nombres:** nombre y apellido se piden en el `<SignUp/>` (ajuste del dashboard). Celular, documento y consentimientos van en "Completa tu perfil".
- Recuperar contraseña y verificar el correo son pantallas de Clerk; no hay diseño propio.
- La metadata no cambia: "Iniciar sesión — Mentec Tickets" y "Crear cuenta — Mentec Tickets".

## "Completa tu perfil" (`/perfil/completar`)

Ruta `app/(auth)/perfil/completar/page.tsx`, en el layout `(auth)` (con `AuthBrandPanel`). Componente `CompleteProfileForm` (`modules/auth/components/`, `"use client"`), prop `redirectUrl`. **Hereda el diseño del registro anterior** (`RegisterForm`, historial git): mismo bloque de título, mismos campos de celular y documento, mismas casillas y botón. No pide nombre, apellido, correo ni contraseña (los tiene Clerk).

### Anatomía

```
h1 Completa tu perfil                                    text-2xl md:text-3xl font-bold tracking-tight
Lo usamos para emitir tus entradas a tu nombre.          text-base text-muted-foreground
[ ! error del servidor ]                                 Alert destructive (solo si lo hay)
Celular            [+51 | 9XXXXXXXX        ]             InputGroup h-11
Tipo de documento [DNI ▾]   Número de documento [    ]   grid sm:grid-cols-2
[✓] Acepto los Términos y condiciones y la Política de privacidad, incluida la
    transferencia internacional de mis datos a proveedores en EE. UU.   (obligatorio)
[ ] Quiero recibir novedades y promociones por correo                   (opcional)
[        Guardar y continuar        ]                    Button default h-11 w-full
```

- Raíz `flex w-full flex-col gap-6` (sin `Card`, sobre blanco): bloque de título `flex flex-col gap-1.5` (h1 + `<p>`) y el `<form noValidate>` con `FieldGroup`. Sin pie: no hay a dónde navegar hasta completar el perfil.
- **Textos:** h1 "Completa tu perfil"; subtítulo "Lo usamos para emitir tus entradas a tu nombre."; botón "Guardar y continuar" / "Guardando…" (con `Spinner` `aria-hidden` `motion-reduce:animate-none`).
- **Celular:** `Field` + `FieldLabel` "Celular" + `InputGroup className="h-11"` con `InputGroupAddon` → `InputGroupText` "+51" e `InputGroupInput` (`type="tel"`, `inputMode="numeric"`, `autoComplete="tel-national"`, `maxLength={9}`, `className="h-full"`). Validación de `phoneField` (`lib/formFields`).
- **Documento:** `grid gap-5 sm:grid-cols-2 sm:gap-4`. "Tipo de documento": `Select` con `DOCUMENT_TYPES` / `DOCUMENT_TYPE_LABELS` (`SelectTrigger` `w-full cursor-pointer data-[size=default]:h-11`, `SelectItem` `min-h-11 cursor-pointer`); al cambiarlo se revalidan tipo y número. "Número de documento": `Input h-11`, con DNI `inputMode="numeric"` y `maxLength={8}`. Regla de `getDocumentNumberError`.
- **Consentimiento obligatorio:** `Field orientation="horizontal"` + `Checkbox` + `FieldContent` con `FieldLabel className="block font-normal"`: "Acepto los **Términos y condiciones** y la **Política de privacidad**, incluida la transferencia internacional de mis datos a proveedores en EE. UU." Enlaces `Link` con `INLINE_LINK` (`lib/linkStyles.ts`) a `/terminos` y `/privacidad`, `target="_blank" rel="noopener noreferrer"`. Crea los consentimientos `terms`, `privacy` e `international_transfer`.
- **Publicidad (opcional):** `Field orientation="horizontal"` + `Checkbox` + `FieldLabel className="font-normal"` "Quiero recibir novedades y promociones por correo". Desmarcada por defecto (opt-in). Crea el consentimiento `marketing` con su valor.
- **Botón:** `Button type="submit"` `h-11 w-full cursor-pointer font-semibold duration-200 hover:bg-primary-strong`; `disabled` mientras se envía.
- **Errores:** por campo con `FieldError` (`id` `<campo>-error`, `aria-invalid` y `aria-describedby` en el control), mensajes de `lib/formFields`. El error de la Server Action va arriba del formulario en `Alert variant="destructive"` con `CircleAlert` (`aria-hidden`) y `AlertTitle`.
- Formulario controlado con `useZodForm` (`hooks/useZodForm.ts`) y `completeProfileSchema`. Al guardar, la acción redirige a `redirect_url` (solo rutas internas) o a `/perfil`.
- Metadata: "Completa tu perfil — Mentec Tickets", `robots: { index: false }`.

## Seguridad de la cuenta (`/perfil/seguridad`)

Ruta `app/(site)/perfil/seguridad/page.tsx`, **dentro de `(site)`** (con header y footer, como `/perfil`). Componente `AccountSecurity` (`modules/auth/components/`, server), prop `user` (`role`, `mfaVerified`).

```
Header sticky
┌─ section bg-muted a todo el ancho ──────────────────────────┐
│ max-w-5xl                                                   │
│ h1 Seguridad                                                │
│ ┌ [ShieldAlert] Verificación en dos pasos obligatoria ────┐ │  Alert (oculto: MFA diferido)
│ │ Tu rol requiere verificación en dos pasos: actívala y   │ │
│ │ vuelve a iniciar sesión.                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌ <UserProfile routing="hash"/> de Clerk ─────────────────┐ │  menú lateral + pestaña de seguridad
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
Footer
```

- `<section className="bg-muted">` → `mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-12`. `max-w-5xl` (y no `max-w-7xl`) porque el `<UserProfile/>` de Clerk tiene un ancho propio (~55 rem con su menú lateral) y así queda alineado con el título.
- h1 "Seguridad": `text-3xl font-extrabold tracking-tight md:text-5xl` (mismo estilo que el h1 de `/perfil`).
- **Aviso de MFA (no se muestra mientras el MFA esté diferido):** el MFA de `admin`/`super_admin` está diferido hasta Clerk Pro/producción (`MFA_ENFORCED = false` en `modules/auth/utils/can.ts`), así que `isMfaPending(user)` siempre es `false` y hoy ningún usuario ve el aviso. Al activarlo, aparece solo cuando `isMfaPending(user)` (rol `admin`/`super_admin` y sesión sin segundo factor). `Alert` (variante por defecto, no destructive: es una instrucción, no un error) con `className="px-4 py-3"`, icono `ShieldAlert` (`aria-hidden`), `AlertTitle className="font-bold"` "Verificación en dos pasos obligatoria" y `AlertDescription` "Tu rol requiere verificación en dos pasos: actívala y vuelve a iniciar sesión."
- **`<UserProfile routing="hash" />`** de Clerk (importado como `ClerkUserProfile` para no chocar con nuestro `UserProfile`), con el tema `shadcn` y `esES` del provider; sin `appearance` propia. `routing="hash"` evita una ruta catch-all.
- Metadata: "Seguridad | Mentec Tickets", `robots: { index: false }`.

## Accesibilidad

- Un único `<main>` (el del layout `(auth)` o el de `SiteShell` en `/perfil/seguridad`) y un único `<h1>` por página. En `/login` y `/registro` el h1 es el título de la tarjeta de Clerk; los textos del panel son `<p>`.
- Logo: nombre accesible "Mentec Tickets: ir al inicio" (incluye el nombre visible de la marca, WCAG 2.5.3), área táctil ≥ 44 px y foco cian (`ring-highlight`) sobre navy.
- Componentes de Clerk: su teclado, foco, etiquetas y anuncios de error son los de Clerk; el foco visible usa `--ring` a través del tema `shadcn`.
- "Completa tu perfil": orden de Tab = logo, celular, tipo y número de documento, casilla obligatoria y sus dos enlaces, casilla de publicidad, botón. Todos con foco visible y ≥ 44 px de alto (los enlaces en línea `INLINE_LINK` están exentos por WCAG 2.5.8). Errores asociados con `aria-describedby`; el error del servidor en `Alert` (`role="alert"`).
- Imagen del panel decorativa (`alt=""`); el logo conserva su `alt` "Mentec Tickets". Iconos de los `Alert` con `aria-hidden`.
- Contraste: blanco sobre navy (con el degradado en `lg`), `primary-foreground/80` sobre navy para el subtítulo del panel.
- Sin scroll horizontal a 375, 768, 1024 y 1440 px. A 375 px el `<UserProfile/>` de Clerk pasa a su diseño móvil (menú arriba).
