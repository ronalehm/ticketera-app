# Pantallas completas para acceso y panel de organizador (route groups)

- Módulo: layout (route groups de `app/`) · auth · organizer
- Estado: aprobado

## Objetivo
Hoy el header y el footer del sitio se pintan en `app/layout.tsx`, así que aparecen en todas las rutas. El usuario pidió que **Iniciar sesión** y **Crear cuenta** sean pantallas completas, sin header, footer ni nada más que el acceso, como en sus capturas. También pidió que el **panel de organizador** sea una app a pantalla completa con su propia barra lateral: marca "Mentec Tickets · Organizadores", navegación, tarjeta del usuario con "Cerrar sesión" y contenido sobre `bg-muted`.

Para eso, el header y el footer pasan a un route group `app/(site)` que agrupa todas las rutas públicas **sin cambiar ninguna URL**. `app/(auth)` y `app/organizador` quedan fuera y tienen cada uno su propio shell.

Referencias:
- Capturas del usuario: login y registro.
- Claude Design: `Auth.dc.html`, `AuthMobile.dc.html`, `OrgDashboard*.dc.html` y `OrgCreate*.dc.html`.
- Captura descrita del panel: sidebar blanca de unos 230 px, marca con "Organizadores", Resumen / Mis eventos / Crear evento, tarjeta de usuario abajo y "← Mis eventos" sobre el h1.

Del diseño se toman la estructura, los textos y los patrones. La identidad visual es la de Mentec (`design-system/ticketera/MASTER.md`: tokens, Creato Display, logo "Mentec Tickets" y accesibilidad de §11). Nunca se usan el índigo, Poppins ni la marca "Ticketera" del diseño.

## Alcance
- Incluye:
  - **Fase 1. Route groups sin cambio visual:**
    - `components/shared/SiteShell.tsx` (header + `<main>` + footer).
    - `app/(site)/layout.tsx`.
    - Mover todas las rutas públicas a `app/(site)/`.
    - `app/layout.tsx` sin header ni footer.
    - `app/not-found.tsx` con el shell del sitio para las URL que no existen, más el componente compartido `NotFoundMessage`.
    - `(auth)` y `organizador` se envuelven **temporalmente** en `SiteShell` para que nada cambie hasta sus fases.
  - **Fase 2. Acceso a pantalla completa:**
    - Layout `(auth)` sin `SiteShell`: panel de marca a toda la altura en `lg` y franja de marca en móvil, con el logo enlazado a `/`. La columna del formulario va sobre fondo blanco y sin tarjeta.
    - Títulos, subtítulos y enlaces de pie del diseño.
    - Pestañas con estilo de control segmentado.
    - Tests de los formularios actualizados.
    - `design-system/ticketera/pages/auth.md` reescrito.
  - **Fase 3. Shell del organizador:**
    - Layout `organizador` sin `SiteShell`.
    - Sidebar en `lg` con marca, navegación y tarjeta de usuario (avatar con iniciales, nombre, correo y "Cerrar sesión", o "Iniciar sesión" si no hay sesión).
    - Barra superior en móvil con menú en `Sheet`.
    - Enlace "Volver al resumen" sobre el h1 de Crear evento.
    - Ajustes mínimos de fondo y sticky en el dashboard y el formulario.
    - `design-system/ticketera/pages/organizer.md` actualizado.
- No incluye:
  - Cambiar URLs, metadata, `generateStaticParams` ni el contenido de las páginas públicas (solo se mueven).
  - Crear `loading.tsx` o `error.tsx`: hoy no existen y no se añaden.
  - `global-not-found.js`: hay un único root layout, así que basta `app/not-found.tsx`.
  - Un segundo root layout (`<html>` por grupo), que provocaría recargas completas entre grupos.
  - Cambiar los campos, validaciones, service, store o redirecciones de login y registro. El registro conserva Nombres, Apellidos, Celular, Documento, Contraseña, Confirmación, Términos y Novedades (ver Preguntas abiertas).
  - Protección de rutas, roles de organizador, middleware/proxy o redirigir a `?next=` tras iniciar sesión.
  - Rutas "Mis eventos", "Ventas" o "Configuración" del panel, ni mostrarlas en la navegación (Decisión 7).
  - El componente `sidebar` de shadcn (Decisión 8).
  - Cambiar `SiteHeader`, `SiteFooter`, `AuthHeaderActions` (lo está modificando tickets-my-tickets F2), el formulario de creación más allá de una clase (Decisión 11), los KPIs o la tabla de eventos.
  - Cambiar la imagen del panel de marca, tema oscuro o animaciones nuevas.

## Decisiones tomadas
1. **Un solo root layout y un route group `(site)` para lo público.** `app/layout.tsx` conserva `<html>`, `<body>`, la fuente, `globals.css` y la metadata por defecto. Solo deja de pintar `SiteHeader`, `<main>` y `SiteFooter`. Según la guía de Next 16 (`route-groups.md`), los grupos no alteran la URL, y con un único root layout la navegación entre `(site)`, `(auth)` y `organizador` sigue siendo una navegación de cliente, sin recarga completa. Los layouts de grupos de primer nivel se tipan con `LayoutProps<"/">` (así los genera Next en `.next/types/validator.ts`). Las claves de `PageProps<"/eventos/[slug]">`, etc., siguen siendo las URL y no cambian.
2. **`SiteShell` compartido** (`components/shared/SiteShell.tsx`) con `<SiteHeader />`, `<main className="flex-1">{children}</main>` y `<SiteFooter />`. Lo usan `app/(site)/layout.tsx` y `app/not-found.tsx` (y, solo durante la Fase 1, `(auth)` y `organizador`). Hace falta en `not-found` porque las URL que no existen se renderizan con el root layout y `app/not-found.tsx`, fuera de `(site)`. Sin esto, enlaces como `/recuperar-contrasena`, `/terminos` o `/nosotros` mostrarían la 404 por defecto de Next, en inglés y sin forma de volver.
3. **`NotFoundMessage` compartido** (`components/shared/NotFoundMessage.tsx`, props `{ title: string; description: string }`). Extrae el bloque que hoy está en `app/eventos/[slug]/not-found.tsx`: `<section>` centrada, h1, párrafo y botón "Volver al inicio" hacia `/`. Con la 404 global sería la segunda repetición real (DRY). La 404 del evento conserva sus textos.
4. **Fase 1 sin cambio visual.** Mover el header fuera del root layout y mover las rutas tiene que ser atómico. Para que la fase se pueda entregar sola, `(auth)/layout.tsx` y `organizador/layout.tsx` envuelven su contenido actual en `<SiteShell>`. Las Fases 2 y 3 quitan ese envoltorio. Es un cambio de una línea en cada archivo.
5. **Acceso: el formulario va sobre blanco y sin `Card`, como en las capturas.**
   - `LoginForm` y `RegisterForm` sustituyen `Card`/`CardHeader`/`CardContent` por un contenedor `flex flex-col gap-6` con un bloque de título (h1 + párrafo).
   - Los títulos y subtítulos pasan a ser los del diseño (Requisito 9).
   - Los enlaces del pie pasan a "Crea una gratis" e "Inicia sesión".
   - Los campos, mensajes, botones ("Iniciar sesión" / "Crear cuenta", "Ingresando…" / "Creando cuenta…") y el flujo no cambian.
   - Las dos columnas de formulario miden `max-w-md` (el diseño usa 440 px en ambas), así las pestañas no cambian de ancho al pasar de una página a otra.
6. **El logo del panel de marca es el enlace a `/`**, en `lg` y en móvil, igual que en el diseño. No se añade "← Volver al inicio": el usuario pidió que solo se vea el acceso (ver Preguntas abiertas). El enlace lleva `aria-label="Mentec Tickets: ir al inicio"`, que incluye el nombre visible de la marca (WCAG 2.5.3).
7. **Navegación del panel: solo destinos reales.** Se mantienen "Resumen" (`/organizador`) y "Crear evento" (`/organizador/eventos/nuevo`).
   - "Mis eventos" **no** se añade porque no tiene ruta. Un enlace a un ancla de la misma página compartiría la ruta con "Resumen" y confundiría el `aria-current`. Queda como pregunta abierta.
   - El enlace sobre el h1 de Crear evento es "Volver al resumen", hacia `/organizador`. Equivale al "← Mis eventos" del diseño, porque la lista "Mis eventos" vive en Resumen.
8. **No se usa el `sidebar` de shadcn**, aunque existe en `@shadcn/sidebar` (`base-nova`):
   - Trae `SidebarProvider` con estado en cookie (`sidebar_state`), atajo de teclado `Ctrl/⌘+B`, modo colapsable a iconos y el hook `use-mobile`, con un breakpoint fijo de 768 px (el panel usa `lg`, 1024 px).
   - Instala `tooltip`, `skeleton` e `input` en `components/ui` y `hooks/use-mobile.ts`.
   - Para dos enlaces y una tarjeta basta componer `Sheet` (instalado), `Avatar` (se instala) y `buttonVariants` (KISS/YAGNI).
9. **Sesión en el panel.** La tarjeta de usuario lee `useAuthStore` desde la entrada pública `@/modules/auth/session` y la rehidrata al montar (patrón de `AuthHeaderActions`).
   - **Sin sesión, el panel sigue accesible** (se mantiene la Decisión 1 de `organizer-dashboard.md`: un bloqueo solo en cliente no protege nada). La tarjeta muestra un enlace "Iniciar sesión" a `/login`.
   - **"Cerrar sesión"** llama a `signOut()` y navega a `/`, como en el diseño, donde el botón lleva al inicio del sitio.
   - Las iniciales salen de `getInitials(firstName, lastName)`.
10. **Móvil del panel:** barra superior `sticky top-0` de `h-16` con la marca y el botón "Abrir menú del panel" (44×44), que abre un `Sheet` desde la izquierda con la navegación y la tarjeta de usuario. Sustituye a los chips horizontales de la Fase 1 de organizer-dashboard: sin header global, el menú también tiene que alojar la sesión, y los chips ya no bastan. Al elegir un enlace, el `Sheet` se cierra (`OrganizerNav` recibe `onNavigate`).
11. **Cambios mínimos en archivos de organizer-dashboard en curso:**
    - `OrganizerDashboard`: la `<section>` "Mis eventos" pasa a ser una tarjeta blanca (`rounded-2xl bg-card p-4 ring-1 ring-border md:p-6`). Sobre `bg-muted` desaparecerían el fondo del filtro segmentado y el del estado vacío, que son `bg-muted`.
    - `OrganizerEventForm`: la vista previa sticky pasa de `lg:top-24`, que compensaba el header global de 64 px, a `lg:top-10`.
    - `app/organizador/eventos/nuevo/page.tsx`: se añade el enlace "Volver al resumen" encima del h1.
    - Nada más de esos archivos cambia.
12. **Landmarks del panel:** el sidebar (`lg`) y la barra móvil (`< lg`) son `<header>`. Solo uno es visible en cada breakpoint y el otro lleva `display: none`, así que hay un único `banner` y un único `<nav aria-label="Panel de organizador">` en el árbol de accesibilidad. El layout añade su propio `<main>`, porque el root layout ya no lo tiene.

### Lo que esta spec reemplaza en otras specs y páginas de diseño
Esas specs no se editan (están aprobadas o en curso). Al implementar y revisar, prevalece esta spec en estos puntos:

- **`docs/specs/organizer-dashboard.md`:**
  - Alcance F1 ("dentro del header/footer globales").
  - Requisito 3 ("No se añade otro `<main>`").
  - Requisito 5 (contenedor y grilla del layout).
  - Requisito 6 (overline "Panel de organizador" y chips en móvil).
  - Decisión 1, en la parte de "No se muestra el bloque de usuario": ahora sí se muestra.
  - Decisión 2, en la parte de "chips en lugar de `Sheet`" y "título en lugar de bloque de marca".
  - Requisito 14 ("No hay enlace volver").
  - Requisito 19 (`lg:top-24`).
  - **Criterio F1 "el header y el footer globales siguen visibles", que queda reemplazado por los criterios de la Fase 3 de esta spec.** También los criterios que mencionan chips en móvil y "no tapa el footer".
- **`docs/specs/auth-login-register.md` y `docs/specs/events-ui-refresh.md` (Fase 3):**
  - h1 "Iniciar sesión" / "Crear cuenta" y sus subtítulos.
  - Enlaces "Crear cuenta" / "Iniciar sesión" del pie.
  - Formularios en `Card` sobre `bg-muted`.
  - Pestaña activa `bg-primary`.
  - Header y footer del layout raíz en `/login` y `/registro`.
  - Franja móvil sin logo.
- **`design-system/ticketera/pages/auth.md` y `pages/organizer.md`:** se reescriben en las Fases 2 y 3.

## Requisitos

### Comunes
1. `app/` solo enruta. Los componentes nuevos viven en `components/shared` (los usan varias rutas o grupos) o en su módulo. Fuera del módulo solo se importa desde sus entradas públicas (`@/modules/auth`, `@/modules/auth/session`, `@/modules/organizer`).
2. Solo tokens del tema, Creato Display, iconos `lucide-react` con `aria-hidden` y nada de hex ni colores por defecto de Tailwind. Targets de 44 px o más, foco visible, un único `<h1>` por página, sin scroll horizontal a 375, 768, 1024 y 1440 px.

### Fase 1: route groups
3. Estructura final de `app/` (los movimientos se hacen con `git mv` para conservar el historial, sin commit):

   | Antes | Después |
   |---|---|
   | `app/page.tsx` | `app/(site)/page.tsx` |
   | `app/eventos/page.tsx` | `app/(site)/eventos/page.tsx` |
   | `app/eventos/[slug]/page.tsx` | `app/(site)/eventos/[slug]/page.tsx` |
   | `app/eventos/[slug]/not-found.tsx` | `app/(site)/eventos/[slug]/not-found.tsx` (pasa a usar `NotFoundMessage`) |
   | `app/eventos/[slug]/entradas/page.tsx` | `app/(site)/eventos/[slug]/entradas/page.tsx` |
   | `app/checkout/page.tsx` | `app/(site)/checkout/page.tsx` |
   | `app/checkout/confirmacion/page.tsx` | `app/(site)/checkout/confirmacion/page.tsx` |
   | `app/mis-entradas/page.tsx` | `app/(site)/mis-entradas/page.tsx` |

   Se quedan donde están: `app/layout.tsx`, `app/globals.css`, `app/fonts/`, `app/icon.svg`, `app/(auth)/` y `app/organizador/`. Las páginas movidas no cambian: solo importan con `@/` (no hay imports relativos en `app/` salvo `./globals.css` y `./fonts/*` del root layout, que no se mueve). Ningún test referencia archivos de `app/`.
4. `app/layout.tsx`: el mismo `<html lang="es">`, la fuente y la metadata. `<body className="flex min-h-dvh flex-col">{children}</body>`, sin `SiteHeader`, `<main>` ni `SiteFooter`.
5. `app/(site)/layout.tsx` (Server Component, `LayoutProps<"/">`): `return <SiteShell>{children}</SiteShell>`. No exporta metadata.
6. `app/not-found.tsx`: `<SiteShell><NotFoundMessage title="No encontramos esta página" description="Puede que el enlace sea incorrecto o que la página ya no exista." /></SiteShell>`.
7. `app/(site)/eventos/[slug]/not-found.tsx`: `<NotFoundMessage title="No encontramos este evento" description="Puede que el enlace sea incorrecto o que el evento ya no esté disponible." />`. Visualmente queda igual que hoy.
8. Temporal hasta las Fases 2 y 3: `app/(auth)/layout.tsx` y `app/organizador/layout.tsx` devuelven `<SiteShell>{/* contenido actual sin cambios */}</SiteShell>`.

### Fase 2: acceso a pantalla completa
9. Textos (tomados de `Auth.dc.html`):

   | Página | h1 | Subtítulo (`<p>`) | Pie |
   |---|---|---|---|
   | `/login` | "Hola de nuevo" | "Ingresa para ver tus entradas y comprar más rápido." | "¿No tienes cuenta? **Crea una gratis**" (enlace a `/registro`) |
   | `/registro` | "Crea tu cuenta" | "Guarda tus entradas y recibe novedades de tus eventos." | "¿Ya tienes cuenta? **Inicia sesión**" (enlace a `/login`) |

   La metadata de las páginas no cambia ("Iniciar sesión — Mentec Tickets", "Crear cuenta — Mentec Tickets").
10. `app/(auth)/layout.tsx` (Server Component), sin `SiteShell`:
    ```tsx
    <div className="flex-1 lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <AuthBrandPanel />
      <main className="flex flex-col items-center px-4 pt-8 pb-12 md:pt-12 lg:justify-center lg:px-10 lg:py-12">
        {children}
      </main>
    </div>
    ```
    El fondo es el de `body` (`bg-background`, blanco), así que el `bg-muted` desaparece.
11. Páginas: `login/page.tsx` y `registro/page.tsx` componen `<div className="flex w-full max-w-md flex-col gap-6"><AuthTabs current=… /><LoginForm /> | <RegisterForm /></div>`. El registro pasa de `max-w-lg` a `max-w-md` (Decisión 5).
12. `AuthBrandPanel` (Server Component):
    - **Contenedor:** `<section>` `relative flex min-h-56 flex-col justify-between gap-4 overflow-hidden bg-brand-navy p-4 text-primary-foreground`. En `lg`, `lg:sticky lg:top-0 lg:h-dvh lg:self-start lg:p-10`: ocupa toda la altura de la ventana y no se mueve aunque el registro haga scroll.
    - **Logo:** `<Link href="/" aria-label="Mentec Tickets: ir al inicio">`, `relative z-10 inline-flex min-h-11 items-center self-start rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-highlight`, con `<BrandLogo variant="white" className="h-7 w-auto lg:h-8" />`. Es visible en todos los breakpoints (hoy está oculto en móvil).
    - **Imagen:** la misma constante, `next/image fill preload object-cover alt=""`. En móvil, dentro de un contenedor `absolute inset-y-0 right-0 w-[44%] overflow-hidden rounded-bl-[2.5rem]`, como hoy. En `lg`, a sangre completa: `lg:inset-0 lg:w-full lg:rounded-none`. `sizes="(min-width: 1024px) 42vw, 44vw"`.
    - **Overlay de contraste:** solo en `lg`, `hidden lg:block absolute inset-0 bg-gradient-to-b from-brand-navy/70 via-brand-navy/30 to-brand-navy/90`, para que el logo (arriba) y los textos (abajo) se lean sobre cualquier zona de la foto.
    - **Textos:** `relative z-10 flex max-w-[55%] flex-col gap-2 lg:max-w-md lg:gap-3`, abajo del todo por `justify-between`. Son los mismos `<p>` de hoy: "Tus entradas, siempre a mano." (`text-2xl lg:text-4xl font-bold tracking-tight leading-tight`) y "Compra en minutos y lleva tu QR en el celular." (`text-primary-foreground/80 leading-relaxed`). No se usan encabezados.
13. `AuthTabs` mantiene el contrato (`current`), los enlaces, `aria-current`, `nav aria-label="Acceso a tu cuenta"`, `h-11` y el foco visible. Solo cambia el estilo, a control segmentado como en el diseño:
    - Lista: `grid grid-cols-2 gap-1 rounded-xl bg-muted p-1`.
    - Activa: `bg-background font-semibold text-foreground shadow-sm`.
    - Inactiva: `text-muted-foreground hover:bg-background/60 hover:text-foreground`.
14. `LoginForm` y `RegisterForm` (Decisión 5):
    - Raíz `<div className="flex w-full flex-col gap-6">`.
    - Título: `<div className="flex flex-col gap-1.5">` con h1 `text-2xl md:text-3xl font-bold tracking-tight` y `<p className="text-base text-muted-foreground">`.
    - Debajo, el `<form>` igual que hoy y el `<p>` del pie (`text-center text-sm text-muted-foreground`, enlace con `cn(TEXT_LINK, "font-semibold")`).
    - Se quitan los imports de `Card*` que ya no se usan. Ningún otro cambio de comportamiento.

### Fase 3: shell del organizador
15. Instalar `Avatar` de shadcn: `npx shadcn@latest add avatar` crea `components/ui/avatar.tsx` (Base UI `@base-ui/react/avatar`, sin dependencias nuevas). Si el CLI falla, se detiene la fase y se avisa: no se escribe a mano.
16. `app/organizador/layout.tsx` (Server Component, `LayoutProps<"/organizador">`, mantiene `metadata: { robots: { index: false } }`), sin `SiteShell`:
    ```tsx
    <div className="flex-1 bg-muted lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <OrganizerSidebar />
      <OrganizerMobileBar />
      <main className="min-w-0 px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
    ```
17. `OrganizerBrand` (presentacional, sin `"use client"`): `<div className="flex flex-col gap-0.5">` con:
    - `<Link href="/" aria-label="Mentec Tickets: ir al inicio">` (`inline-flex min-h-11 items-center self-start rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50`) que contiene `<BrandLogo className="h-7 w-auto" />`.
    - `<p className="px-0.5 text-xs font-medium text-muted-foreground">Organizadores</p>`.
18. `OrganizerNav` (cliente, modificado):
    - `<nav aria-label="Panel de organizador">` con una lista **vertical** en todos los anchos (`flex flex-col gap-1`).
    - Se eliminan el overline "Panel de organizador" y los chips/scroll horizontal.
    - Items `flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50`, con icono `size-5`.
    - Activo (ruta exacta): `aria-current="page"` y `bg-accent font-semibold text-accent-foreground`. Inactivo: `text-muted-foreground hover:bg-muted hover:text-foreground`.
    - Mismos destinos e iconos que hoy (`LayoutDashboard` Resumen, `Plus` Crear evento).
    - Nueva prop opcional `onNavigate?: () => void`, que se llama en el `onClick` de cada enlace.
19. `OrganizerUserCard` (cliente). Usa `useAuthStore` de `@/modules/auth/session` y `useEffect(() => { useAuthStore.persist.rehydrate(); }, [])`.
    - **Con usuario:** `<div className="flex items-center gap-3">` con:
      - `Avatar` (`size="lg"`, `aria-hidden`) y `AvatarFallback` `bg-accent font-semibold text-accent-foreground` con `getInitials(firstName, lastName)`.
      - Un bloque `min-w-0 flex-1` con el nombre `"{firstName} {lastName}"` (`truncate text-sm font-semibold`, `title`) y el correo (`truncate text-sm text-muted-foreground`, `title`).
      - Un botón solo-icono `LogOut` con `aria-label="Cerrar sesión"`, `buttonVariants({ variant: "ghost", size: "icon" })` y `size-11 shrink-0 cursor-pointer`. Al pulsarlo: `signOut()` y `router.push("/")`.
    - **Sin usuario:** enlace `cn(buttonVariants({ variant: "outline" }), "h-11 w-full cursor-pointer gap-2")` con icono `LogIn` y el texto "Iniciar sesión", hacia `/login`.
20. `OrganizerSidebar` (Server Component): `<header className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col lg:gap-8 lg:overflow-y-auto lg:border-r lg:bg-background lg:px-4 lg:py-6">` con `OrganizerBrand` (en `px-2`), `OrganizerNav`, y abajo (`mt-auto border-t pt-4`) `OrganizerUserCard`.
21. `OrganizerMobileBar` (cliente, `Sheet` controlado con `useState`):
    - Contenedor: `<header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b bg-background px-4 lg:hidden">` con `OrganizerBrand` y un `SheetTrigger` con `aria-label="Abrir menú del panel"` (`buttonVariants({ variant: "ghost", size: "icon" })`, `size-11 cursor-pointer`, icono `Menu size-5`).
    - `SheetContent side="left"` (`overflow-y-auto`) contiene `SheetHeader` con `SheetTitle` "Panel de organizador" y, debajo, `<div className="flex flex-1 flex-col gap-6 px-4 pb-6">` con `<OrganizerNav onNavigate={() => setOpen(false)} />` y `<div className="mt-auto border-t pt-4"><OrganizerUserCard /></div>`.
    - Base UI mueve el foco al abrir, cierra con Escape y devuelve el foco al disparador.
22. `app/organizador/eventos/nuevo/page.tsx`: encima del h1 "Crear evento" se añade `<Link href="/organizador" className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-sm font-medium text-muted-foreground transition-colors duration-200 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"><ArrowLeft className="size-4" aria-hidden />Volver al resumen</Link>`. El h1 y el formulario no cambian.
23. `OrganizerDashboard`: la `<section aria-labelledby>` "Mis eventos" añade `rounded-2xl bg-card p-4 ring-1 ring-border md:p-6` (Decisión 11). Nada más cambia.
24. `OrganizerEventForm`: en el `<aside>` de la vista previa, `lg:top-24` pasa a `lg:top-10` (Decisión 11). Nada más cambia. `FORM_CONTROL_SCROLL` (`scroll-mt-24`) se mantiene, porque en móvil sigue habiendo una barra sticky de 64 px.
25. Barrel `modules/organizer/index.ts`: añade `OrganizerSidebar` y `OrganizerMobileBar` y quita `OrganizerNav`, que ya solo usan componentes internos. El resto de exports no cambia.

## Criterios de aceptación

### Fase 1: route groups sin cambio visual
- [ ] Dado `app/`, entonces las rutas públicas están en `app/(site)/` según la tabla del Requisito 3, `app/layout.tsx` no importa `SiteHeader`, `SiteFooter` ni renderiza `<main>`, y `app/(site)/layout.tsx` usa `SiteShell` con `LayoutProps<"/">`.
- [ ] Dado `npm run build`, entonces termina sin errores y la lista de rutas tiene exactamente las mismas URL que antes: `/`, `/checkout`, `/checkout/confirmacion`, `/eventos`, `/eventos/[slug]` (con sus parámetros estáticos), `/eventos/[slug]/entradas`, `/login`, `/mis-entradas`, `/organizador`, `/registro`, más `/organizador/eventos/nuevo` si ya existe y `/_not-found`.
- [ ] Dado `/`, `/eventos`, `/eventos/<slug>`, `/eventos/<slug>/entradas`, `/checkout`, `/checkout/confirmacion` y `/mis-entradas` a 375 y 1440 px, entonces se ven igual que antes, con el header sticky arriba, el footer abajo y un único `<main>`.
- [ ] Dado `/eventos/no-existe`, entonces se ve "No encontramos este evento" con header y footer, como antes.
- [ ] Dada una URL que no existe (p. ej. `/recuperar-contrasena` o `/terminos`), entonces se ven el header, el h1 "No encontramos esta página", el texto y el botón "Volver al inicio" (enlace a `/`, `h-11`), y el footer. No aparece la 404 por defecto de Next.
- [ ] Dado `/login`, `/registro` y `/organizador`, entonces se ven exactamente igual que antes de la fase (con header y footer: envoltorio temporal) y hay un único `<main>`.
- [ ] Dado el código, entonces `npx vitest run` y `npm run lint` pasan sin cambios en los tests.

### Fase 2: acceso a pantalla completa
- [ ] Dado `/login` a 1440 px, entonces no hay header ni footer del sitio (no existen la nav "Categorías" ni el `contentinfo`). A la izquierda, el panel navy ocupa toda la altura de la ventana, con la foto a sangre, el logo blanco arriba y "Tus entradas, siempre a mano." más el subtítulo abajo, legibles sobre el degradado. A la derecha, sobre blanco, están centradas las pestañas (con "Iniciar sesión" en `aria-current="page"`), el h1 "Hola de nuevo", "Ingresa para ver tus entradas y comprar más rápido.", el formulario y "¿No tienes cuenta? Crea una gratis".
- [ ] Dado `/registro` a 1440 px, entonces el h1 es "Crea tu cuenta" con "Guarda tus entradas y recibe novedades de tus eventos.", los campos son los mismos que hoy, el pie dice "¿Ya tienes cuenta? Inicia sesión" (enlace a `/login`) y, al hacer scroll hasta el botón "Crear cuenta", el panel de marca sigue fijo y a toda la altura, sin franjas blancas debajo.
- [ ] Dado `/login` o `/registro` a 375 px, entonces arriba hay una franja navy con el logo (enlace) arriba a la izquierda, los textos abajo a la izquierda sin desbordar y la imagen a la derecha con la esquina redondeada. Debajo, sobre blanco, van las pestañas y el formulario. No hay header, footer ni scroll horizontal.
- [ ] Dado el logo del panel en cualquier breakpoint, cuando se activa con clic o Enter, entonces navega a `/`. Su nombre accesible es "Mentec Tickets: ir al inicio", el área táctil mide 44 px de alto o más y el foco se ve (anillo cian sobre navy).
- [ ] Dadas ambas páginas, entonces hay un único `<h1>` y un único `<main>`. Al recorrerlas con Tab, el orden es logo, pestañas, campos, "¿Olvidaste tu contraseña?" (login), botones y enlace del pie, todos con foco visible y una altura de 44 px o más.
- [ ] Dado `/login` con `demo@mentectickets.pe` / `Mentec2026`, cuando se envía, entonces se ve "Ingresando…", se navega a `/` y el header del sitio muestra "Hola, Ana". Con una contraseña incorrecta se ve el `Alert` "Correo o contraseña incorrectos" y no se navega.
- [ ] Dado `/registro` con datos válidos y un correo nuevo, cuando se envía, entonces se ve "Creando cuenta…", se navega a `/` y el header muestra "Hola, <nombre>". Con `demo@mentectickets.pe` se ve "Ya existe una cuenta con este correo".
- [ ] Dado `/login`, cuando se pulsa "Crea una gratis" o la pestaña "Crear cuenta", entonces se navega a `/registro`, y a la inversa con "Inicia sesión" y la pestaña "Iniciar sesión".
- [ ] Dado el código, entonces `LoginForm.test.tsx` y `RegisterForm.test.tsx`, actualizados según la sección Tests, pasan junto con el resto de `npx vitest run modules/auth`, y `design-system/ticketera/pages/auth.md` describe el nuevo layout.

### Fase 3: shell del organizador
- [ ] Dado `/organizador` a 1440 px, entonces no hay header ni footer del sitio. A la izquierda hay un sidebar blanco de 240 px con borde derecho y estos elementos:
  - El logo Mentec, como enlace "Mentec Tickets: ir al inicio" hacia `/`, con "Organizadores" debajo.
  - La navegación "Panel de organizador" con "Resumen" (`aria-current="page"`, fondo acento) y "Crear evento".
  - Abajo, la tarjeta de usuario.

  El contenido va sobre `bg-muted` y la sección "Mis eventos" es una tarjeta blanca.
- [ ] Dado `/organizador` a 1440 px con mucho contenido, cuando se hace scroll, entonces el sidebar se queda fijo a toda la altura de la ventana.
- [ ] Dada la sesión demo iniciada, entonces la tarjeta muestra el avatar "AQ", "Ana Quispe" y "demo@mentectickets.pe" (con truncado y puntos suspensivos si no caben, sin scroll horizontal), y un botón "Cerrar sesión" de 44×44 px.
- [ ] Dada la sesión demo iniciada, cuando se pulsa "Cerrar sesión", entonces se navega a `/` y el header del sitio muestra "Iniciar sesión" y "Crear cuenta".
- [ ] Dado `/organizador` sin sesión, entonces el panel se muestra igual (sin redirección) y la tarjeta muestra el enlace "Iniciar sesión" hacia `/login`.
- [ ] Dado `/organizador/eventos/nuevo` a 1440 px, entonces "Crear evento" tiene `aria-current="page"`. Encima del único `<h1>` "Crear evento" está el enlace "Volver al resumen" hacia `/organizador`. Al hacer scroll, la vista previa queda fija a unos 40 px del borde superior, sin el hueco de un header inexistente.
- [ ] Dado `/organizador` o `/organizador/eventos/nuevo` a 375 px, entonces arriba hay una barra blanca sticky de 64 px con el logo, "Organizadores" y el botón "Abrir menú del panel" (44×44). No se ven el sidebar, el header ni el footer del sitio, y no hay scroll horizontal. En Crear evento, la barra de acciones inferior sigue pegada abajo mientras se rellena el formulario.
- [ ] Dado el menú móvil, cuando se pulsa "Abrir menú del panel", entonces se abre un `Sheet` desde la izquierda con el título "Panel de organizador", la navegación y la tarjeta de usuario, y el foco entra en el panel. Cuando se elige "Crear evento", se navega y el `Sheet` se cierra. Con Escape se cierra y el foco vuelve al botón.
- [ ] Dado el árbol de accesibilidad en cualquier breakpoint, entonces hay un solo `banner`, una sola `nav` "Panel de organizador" (con el `Sheet` cerrado), un único `<main>` y un único `<h1>`. Todo lo interactivo muestra foco visible al navegar con Tab.
- [ ] Dado el código, entonces `userInitials.test.ts` y `OrganizerUserCard.test.tsx` pasan, `npx vitest run modules/organizer` sigue en verde y `design-system/ticketera/pages/organizer.md` describe el nuevo shell.

## Diseño técnico

### Rutas (`app/`)
| Archivo | Fase | Tipo | Notas |
|---|---|---|---|
| `app/layout.tsx` | 1 | Server, root | Sin header, footer ni `<main>` (Requisito 4). `LayoutProps<"/">`. |
| `app/(site)/layout.tsx` | 1 | Server | `SiteShell`. `LayoutProps<"/">`. |
| `app/(site)/**/page.tsx` y `not-found.tsx` del evento | 1 | — | Solo se mueven (Requisito 3). La 404 del evento usa `NotFoundMessage`. |
| `app/not-found.tsx` | 1 | Server | `SiteShell` + `NotFoundMessage` (Requisito 6). Lo usa Next para toda URL que no existe. |
| `app/(auth)/layout.tsx` | 1 (temporal), 2 | Server | F1: envuelve en `SiteShell`. F2: Requisito 10. `LayoutProps<"/">`. |
| `app/(auth)/login/page.tsx`, `app/(auth)/registro/page.tsx` | 2 | Server | Requisito 11. |
| `app/organizador/layout.tsx` | 1 (temporal), 3 | Server | F1: envuelve en `SiteShell`. F3: Requisito 16. `LayoutProps<"/organizador">`. |
| `app/organizador/eventos/nuevo/page.tsx` | 3 | Server | Enlace "Volver al resumen" (Requisito 22). |

Tras mover las rutas, se ejecuta `npx next typegen` (o `npm run dev`/`build`) para regenerar `.next/types`, porque el `validator.ts` antiguo apunta a `../../app/page.js` y similares. No se edita nada en `.next/`.

### Componentes
| Componente | Tipo | Ubicación / motivo | Fase |
|---|---|---|---|
| `SiteShell` | nuevo, presentacional. Props `{ children: ReactNode }` | `components/shared/SiteShell.tsx`: lo usan `(site)` y la 404 global (Decisión 2) | 1 |
| `NotFoundMessage` | nuevo, presentacional. Props `{ title: string; description: string }` | `components/shared/NotFoundMessage.tsx`: lo usan dos 404 (Decisión 3) | 1 |
| `SiteHeader`, `SiteFooter`, `BrandLogo` | existentes (`components/shared/`), sin cambios | — | 1–3 |
| `buttonVariants` | shadcn (instalado) | `components/ui/button.tsx` | 1, 3 |
| `AuthBrandPanel` | existente (`modules/auth/components/AuthBrandPanel.tsx`), modificado (Requisito 12) | — | 2 |
| `AuthTabs` | existente (`modules/auth/components/AuthTabs.tsx`), solo cambia el estilo (Requisito 13) | — | 2 |
| `LoginForm`, `RegisterForm` | existentes, sin `Card` y con textos nuevos (Requisito 14) | `modules/auth/components/` | 2 |
| `Avatar`, `AvatarFallback` | shadcn (instalar: `npx shadcn@latest add avatar`) | `components/ui/avatar.tsx` | 3 |
| `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle` | shadcn (instalado) | `components/ui/sheet.tsx` | 3 |
| `OrganizerBrand` | nuevo, presentacional | `modules/organizer/components/OrganizerBrand.tsx`: lo usan el sidebar y la barra móvil; solo es de este dominio | 3 |
| `OrganizerNav` | existente, modificado: vertical y con `onNavigate` (Requisito 18) | `modules/organizer/components/OrganizerNav.tsx` | 3 |
| `OrganizerUserCard` | nuevo, cliente (store de sesión, router) | `modules/organizer/components/OrganizerUserCard.tsx`: no existe una tarjeta de usuario; `AuthHeaderActions` es otra pieza (barra/menú del sitio) | 3 |
| `OrganizerSidebar` | nuevo, Server Component | `modules/organizer/components/OrganizerSidebar.tsx` | 3 |
| `OrganizerMobileBar` | nuevo, cliente (estado del `Sheet`) | `modules/organizer/components/OrganizerMobileBar.tsx` | 3 |
| `OrganizerDashboard`, `OrganizerEventForm` | existentes (organizer-dashboard), una clase cada uno (Requisitos 23 y 24) | `modules/organizer/components/` | 3 |

### Utils
| Unidad | Archivo | Firma / comportamiento | Fase |
|---|---|---|---|
| Iniciales | `modules/organizer/utils/userInitials.ts` | `getInitials(firstName: string, lastName: string): string`. Toma el primer carácter (con `Array.from`, para no partir caracteres compuestos) de la primera palabra tras `trim` de cada argumento y lo pasa a `toLocaleUpperCase("es-PE")`. Si uno está vacío, devuelve solo la otra inicial; si ambos lo están, `""`. | 3 |

### Imports entre módulos
- `organizer` → `@/modules/auth/session` (`useAuthStore`): entrada pública existente, sin cambios en `auth`.
- `OrganizerUserCard` y `OrganizerMobileBar` importan los componentes internos por ruta relativa (Decisión 17 de organizer-dashboard). Nunca importan `@/modules/organizer`.

### Contrato de API
No hay API HTTP nueva. Contratos internos:
```ts
// components/shared/SiteShell.tsx
export function SiteShell(props: { children: React.ReactNode }): React.JSX.Element;
// components/shared/NotFoundMessage.tsx
export function NotFoundMessage(props: { title: string; description: string }): React.JSX.Element;
// modules/organizer/components/OrganizerNav.tsx
export function OrganizerNav(props: { onNavigate?: () => void }): React.JSX.Element;
// modules/organizer/utils/userInitials.ts
export function getInitials(firstName: string, lastName: string): string;
// Sesión (existente, sin cambios): useAuthStore → { user: { id; firstName; lastName; email } | null; signOut(): void }
```

### Páginas de diseño
- **`design-system/ticketera/pages/auth.md` (Fase 2), reescrito:**
  - Pantalla completa sin header ni footer.
  - Esquemas de `lg` (panel navy sticky `h-dvh` con foto a sangre y degradado, y columna blanca centrada `max-w-md`) y de móvil (franja `min-h-56` con logo, textos e imagen).
  - El logo como único enlace al sitio.
  - Pestañas segmentadas.
  - Textos de la tabla del Requisito 9.
  - Accesibilidad: un `<main>`, un h1, foco cian sobre navy.
  - Se elimina la frase "No se adoptan los títulos… del diseño" y se indica que el campo "Nombre completo" sigue sin adoptarse.
- **`design-system/ticketera/pages/organizer.md` (Fase 3):** sustituye la sección "Layout común" por el nuevo shell:
  - Sidebar `lg` de 240 px con marca, navegación y tarjeta de usuario.
  - Barra móvil con `Sheet`.
  - Contenido sobre `bg-muted` con "Mis eventos" en tarjeta.
  - Enlace "Volver al resumen".
  - Vista previa en `lg:top-10`.
  - Se eliminan "dentro del `<main>` del layout raíz", "en móvil no hay hamburguesa ni `Sheet`" y "No hay bloque de usuario". Se añade la regla de sesión (Decisión 9).

## Reutilización
- `SiteHeader`, `SiteFooter` y `BrandLogo` (`components/shared/`) sin cambios. El bloque de la 404 del evento se extrae a `NotFoundMessage`.
- `AuthBrandPanel`, `AuthTabs`, `LoginForm`, `RegisterForm`, `PasswordInput`, `useZodForm`, `TEXT_LINK` y el service y store de auth: se reutilizan tal cual o con cambios de presentación.
- `@/modules/auth/session` (`useAuthStore`) y el patrón de `AuthHeaderActions` (`persist.rehydrate()` al montar, `SheetClose`/`Sheet` del header).
- `OrganizerNav` existente, extendido por prop (`onNavigate`) en lugar de crear otro menú.
- shadcn instalados: `sheet`, `button`. A instalar: `avatar`. Se descarta `sidebar` (Decisión 8).
- Patrones visuales existentes: control segmentado del filtro de `OrganizerDashboard` (para `AuthTabs`), anillo `ring-highlight` sobre navy de `SiteFooter` (para el logo del panel) y overlay `bg-gradient-to-*` de `HeroCarousel`.
- Guía de Next 16 leída: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`, `layout.md` (root layout, `LayoutProps`) y `not-found.md` (la `app/not-found.tsx` raíz atiende las URL que no existen; `global-not-found` solo hace falta con varios root layouts).

## Tests
Ubicados junto al archivo probado.
- **Fase 1:** sin tests nuevos. Layouts, páginas y componentes presentacionales (`SiteShell`, `NotFoundMessage`) no los requieren (SETUP §3). Se verifica con `npx vitest run` (sin cambios), `npm run lint` y el `npm run build` del reviewer (lista de rutas).
- **Fase 2: `modules/auth/components/LoginForm.test.tsx`** (actualizar):
  - El caso "muestra los enlaces…" pasa a esperar `heading` nivel 1 "Hola de nuevo", el texto "Ingresa para ver tus entradas y comprar más rápido.", `link` "Crea una gratis" con `href="/registro"` y "¿Olvidaste tu contraseña?" sin cambios.
  - El resto de casos (vacío, envío válido con `replace("/")`, `AuthError`, error genérico, mostrar contraseña) sigue sin cambios y pasando.
- **Fase 2: `modules/auth/components/RegisterForm.test.tsx`** (actualizar):
  - El caso "muestra el título…" pasa a esperar `heading` nivel 1 "Crea tu cuenta", el texto "Guarda tus entradas y recibe novedades de tus eventos." y `link` "Inicia sesión" con `href="/login"`.
  - El resto sin cambios y pasando.
- **Fase 3: `modules/organizer/utils/userInitials.test.ts`:**
  - `("Ana", "Quispe")` → "AQ".
  - `("  luis ", "pérez")` → "LP".
  - `("María José", "De la Cruz")` → "MD".
  - `("Ángel", "Ñahui")` → "ÁÑ".
  - `("Ana", "")` → "A".
  - `("", "")` → "".
- **Fase 3: `modules/organizer/components/OrganizerUserCard.test.tsx`** (mock de `next/navigation` con `useRouter().push`; limpiar el store y localStorage, patrón de `AuthHeaderActions.test.tsx`):
  - Con `useAuthStore.setState({ user })` muestra "Ana Quispe", "demo@mentectickets.pe" y "AQ".
  - "Cerrar sesión" (por `aria-label`) deja `user` en `null` y llama a `push("/")`.
  - Sin usuario muestra el enlace "Iniciar sesión" con `href="/login"`.
  - Con la sesión guardada en localStorage (`mentec-auth`), tras montar muestra el nombre (rehidratación).
- **Sin test:** `AuthBrandPanel`, `AuthTabs`, `OrganizerBrand`, `OrganizerNav`, `OrganizerSidebar`, `OrganizerMobileBar` (presentacionales o comportamiento nativo de Base UI), layouts y páginas, y `components/ui/avatar.tsx`.

## Plan de tareas
Coordinación:
- **Archivos movidos y otras specs.** Tras la Fase 1, toda referencia a `app/<ruta>` de otras specs se lee como `app/(site)/<ruta>` para las rutas de la tabla del Requisito 3. Tienen tareas pendientes sobre esas rutas:
  - `events-ui-refresh` F4 T5: `app/eventos/page.tsx`, `app/page.tsx`.
  - `marketing-how-it-works` T4: `app/page.tsx`.
  - `checkout-mock-payment` F5 T4: página `/checkout`.
  - `checkout-purchase` F2/F3.

  **La Fase 1 no se ejecuta mientras haya un developer trabajando en cualquiera de esas rutas.** El orden con esas specs está en Preguntas abiertas.
- **Fase 2:** solo depende de la Fase 1. No toca `AuthHeaderActions` ni `modules/auth/index.ts` (tickets-my-tickets F2 T1 está modificando `AuthHeaderActions`).
- **Fase 3:** se ejecuta **después de cerrar las Fases 2 y 3 de `organizer-dashboard.md`**, que crean o modifican `OrganizerEventForm`, `TicketTypesField`, el store, `OrganizerDashboard`, `app/organizador/page.tsx`, `app/organizador/eventos/nuevo/page.tsx` y `modules/organizer/index.ts`. Si no están cerradas, se detiene y se avisa. De esos archivos solo se tocan los cambios mínimos de los Requisitos 22–25.
- **Builds y commits:** los developers en paralelo no ejecutan `npm run build`; lo hace el reviewer al cerrar cada fase. Nadie hace commits.

### Fase 1 — Route groups sin cambio visual (15 archivos, 8 movidos)
- [x] T1 — Componentes compartidos `SiteShell` y `NotFoundMessage` · archivos: `components/shared/SiteShell.tsx`, `components/shared/NotFoundMessage.tsx` · depende de: — · secuencial (base, `components/shared/`)
- [x] T2 — Reestructurar `app/`:
  - Root layout sin header, footer ni `<main>`.
  - `(site)/layout.tsx`.
  - Mover las 8 rutas con `git mv`.
  - 404 del evento con `NotFoundMessage`.
  - `app/not-found.tsx`.
  - Envoltorio temporal `SiteShell` en `(auth)` y `organizador`.
  - `npx next typegen`.

  Archivos:
  - Modificados: `app/layout.tsx`, `app/(auth)/layout.tsx`, `app/organizador/layout.tsx`.
  - Nuevos: `app/(site)/layout.tsx`, `app/not-found.tsx`.
  - Movidos: `app/(site)/page.tsx`, `app/(site)/eventos/page.tsx`, `app/(site)/eventos/[slug]/page.tsx`, `app/(site)/eventos/[slug]/not-found.tsx` (también se modifica), `app/(site)/eventos/[slug]/entradas/page.tsx`, `app/(site)/checkout/page.tsx`, `app/(site)/checkout/confirmacion/page.tsx`, `app/(site)/mis-entradas/page.tsx`.

  Depende de: T1 · secuencial (`app/layout.tsx`; los movimientos y el root layout deben cambiar a la vez)

### Fase 2 — Acceso a pantalla completa (10 archivos)
- [x] T1 — Panel de marca a toda la altura con logo enlazado, y pestañas segmentadas · archivos: `modules/auth/components/AuthBrandPanel.tsx`, `modules/auth/components/AuthTabs.tsx` · depende de: Fase 1 · paralelo con T2
- [x] T2 — Formularios sin `Card`, con los títulos, subtítulos y enlaces del diseño, y sus tests actualizados · archivos: `modules/auth/components/LoginForm.tsx`, `modules/auth/components/LoginForm.test.tsx`, `modules/auth/components/RegisterForm.tsx`, `modules/auth/components/RegisterForm.test.tsx` · depende de: Fase 1 · paralelo con T1
- [x] T3 — Layout `(auth)` a pantalla completa (sin `SiteShell`), páginas con columna `max-w-md` y página de diseño · archivos: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/registro/page.tsx`, `design-system/ticketera/pages/auth.md` · depende de: T1, T2 · secuencial

### Fase 3 — Shell del organizador (15 archivos)
- [ ] T1 — Instalar `avatar` de shadcn · archivos: `components/ui/avatar.tsx` (y `package.json`/`package-lock.json` solo si el CLI los cambia) · depende de: Fase 2 y organizer-dashboard Fases 2–3 cerradas · secuencial (base, `components/ui/`)
- [ ] T2 — `getInitials` con test · archivos: `modules/organizer/utils/userInitials.ts`, `modules/organizer/utils/userInitials.test.ts` · depende de: — (archivos nuevos) · paralelo con T1 y T3
- [ ] T3 — Marca y navegación vertical con `onNavigate` · archivos: `modules/organizer/components/OrganizerBrand.tsx`, `modules/organizer/components/OrganizerNav.tsx` · depende de: organizer-dashboard Fases 2–3 cerradas · paralelo con T1 y T2
- [ ] T4 — Tarjeta de usuario (con test), sidebar y barra móvil con `Sheet` · archivos: `modules/organizer/components/OrganizerUserCard.tsx`, `modules/organizer/components/OrganizerUserCard.test.tsx`, `modules/organizer/components/OrganizerSidebar.tsx`, `modules/organizer/components/OrganizerMobileBar.tsx` · depende de: T1, T2, T3 · secuencial
- [ ] T5 — Layout del panel a pantalla completa, barrel, enlace "Volver al resumen", tarjeta de "Mis eventos", sticky de la vista previa y página de diseño · archivos: `app/organizador/layout.tsx`, `modules/organizer/index.ts`, `app/organizador/eventos/nuevo/page.tsx`, `modules/organizer/components/OrganizerDashboard.tsx`, `modules/organizer/components/OrganizerEventForm.tsx`, `design-system/ticketera/pages/organizer.md` · depende de: T4 · secuencial

## Preguntas abiertas
1. **Campos del registro:** se mantienen Nombres y Apellidos separados (checkout y Mis entradas usan nombre y apellido), más Celular, Documento, Confirmar contraseña y Novedades. ¿Se simplifica en una iteración futura a Nombre completo / Correo / Contraseña / Términos como en el diseño? Eso obligaría a cambiar `registerSchema`, el usuario de sesión y la precarga del checkout.
2. **Acceso al panel sin sesión:** se mantiene abierto (Decisión 9), con "Iniciar sesión" en la tarjeta. ¿Debe exigirse sesión, con un rol "organizador" en el mock de auth y una redirección, en otra spec?
3. **Volver al panel tras iniciar sesión:** desde la tarjeta del panel, "Iniciar sesión" lleva a `/login`, que siempre redirige a `/`, porque `?next=` está fuera de alcance de la spec de auth. ¿Se añade el retorno al origen?
4. **"Mis eventos" en la navegación del panel:** no tiene ruta y no se muestra (Decisión 7). ¿Se crea una página `/organizador/eventos` con la lista completa, o se acepta un enlace a `/organizador#mis-eventos`?
5. **Enlace "← Volver al inicio" en el acceso:** solo el logo lleva al sitio (Decisión 6). ¿Se quiere además un enlace de texto visible sobre las pestañas?
6. **Orden con otras specs que tocan rutas de `app/`:** hay tareas pendientes en events-ui-refresh F4, marketing-how-it-works, checkout-mock-payment F5 y checkout-purchase F2/F3 sobre `app/page.tsx`, `app/eventos/page.tsx` y `app/checkout/page.tsx`. ¿Se ejecuta la Fase 1 antes (y esas tareas usan las rutas de `app/(site)/`) o después de cerrarlas?
