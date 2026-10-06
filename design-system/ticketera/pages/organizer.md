# Página: panel `/organizador` (Eventos), `/organizador/eventos/nuevo`, `/organizador/eventos/[id]/editar` y `/admin/usuarios`

> Override de `../MASTER.md` para estas páginas. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/organizer-dashboard.md` (Fase 1: panel; Fase 2: formulario y guardado; Fase 3: portada y vista previa).
> Datos reales de Resumen y la página "Mis eventos" `/organizador/eventos` (KPIs de ventas brutas, badges de los 5 estados, filtro y búsqueda, TanStack Query): `docs/specs/admin-panel.md` (Fase 3). Prevalece sobre las reglas de ingresos y badges de `organizer-dashboard`.
> Gestión de usuarios `/admin/usuarios` (tabla, filtros, paginación, diálogos Invitar/Editar/Eliminar): `docs/specs/admin-panel.md` (Fase 4). Reemplaza el estado vacío de F1.
> Shell compartido por organizador y admin (route group `app/(panel)`, sidebar por rol de 264/76 px, "Próximamente", breadcrumb, solo lectura, `/admin/usuarios`): `docs/specs/admin-panel.md` (Fase 1). Prevalece sobre el layout, la navegación y la sesión de `layout-fullscreen-shells` (Fase 3) y de `organizer-dashboard`, y sobre su Decisión 2 (ítems sin página).
> "Mis eventos" (tarjeta con barra de cabecera solo en `lg`) y la vista previa de Crear evento (anatomía de `EventCard`): `docs/specs/design-alignment-account-views.md` (Fase 2). Prevalece sobre el requisito 23 de `layout-fullscreen-shells` F3 y sobre la decisión 4 de `organizer-dashboard` (marcadores y badge "Disponible" de la vista previa).
> Moderación en Mis eventos (Enviar a revisión, Aprobar, Rechazar con motivo, Cancelar evento), `ConfirmDialog` compartido, edición de eventos publicados con campos bloqueados (Decisión 11; un evento en revisión no se edita) y aviso del motivo de rechazo en Editar: `docs/specs/admin-panel.md` (Fase 5b). Prevalece sobre las "Acciones de borrador" y el "Sin Publicar ni Enviar a revisión" de F5a.
> Crear y editar borradores contra la BD (`/organizador/eventos/nuevo` y `/organizador/eventos/[id]/editar`: recinto y organizador en `Select`, tipos de entrada por sección, portada por URL `https`) y acciones Editar/Eliminar de los borradores en Mis eventos: `docs/specs/admin-panel.md` (Fase 5a). Prevalece sobre `organizer-event-seating-mode` y `organizer-event-seating` (modo de ubicación, ciudad y dirección, portada subida, zonas con filas × asientos), que quedan sustituidas.
> Vista «Eventos» unificada en `/organizador` (KPIs + listado con filtros de estado, nombre y rango de fechas, «Crear evento» dentro del listado y acciones compactas), `/organizador/eventos` como redirección, sidebar con un solo ítem «Eventos» activo también en sus subrutas, `DatePicker` compartido en filtros y formulario, y solo lectura sin rebote en Crear/Editar: `docs/specs/organizer-events-view.md`. Prevalece sobre todo lo anterior en esos puntos: donde las specs previas dicen «Resumen» o «Mis eventos» como página, hoy es «Eventos».
> Edición ampliada (matriz de edición por estado, edición en revisión, fecha y precios con ventas, confirmación del cambio de fecha, `price_locked_pending`, aviso «Fecha actualizada» y botón «Editar evento» en el detalle público): `docs/specs/event-editing.md`. Prevalece sobre la Decisión 11 de `admin-panel` F5b («un evento en revisión no se edita», «con ventas solo título, descripción, portada y edad»).

Back-office de Mentec Tickets, compartido por organizadores y administradores. El organizador ve cómo van las ventas de sus eventos (KPIs y lista) y crea eventos; el admin gestiona además usuarios. El acceso exige sesión y rol (`panel:access`); Eventos (`/organizador`) lee los eventos y sus ventas de la BD (`listManagedEvents`, F3 de `admin-panel`): el organizador ve los suyos y el admin, todos. Crear y editar guardan borradores en la BD (F5a): aparecen en el listado de Eventos, donde se editan, eliminan y moderan. Del diseño de referencia (`OrgDashboard*.dc.html`, `OrgCreate*.dc.html`, "Panel · Escritorio/Móvil") se toman estructura, flujo y textos; la identidad visual es la de Mentec (tokens, Creato Display), nunca el índigo/Poppins ni la marca "Ticketera" del diseño. La marca visible es el logo de Mentec Tickets con "Panel" debajo (`PanelBrand`, en el sidebar y en la barra móvil).

## Layout común del panel (`app/(panel)`)

**Pantalla completa:** sin header ni footer del sitio. El route group `app/(panel)` vive fuera de `app/(site)`, así que no usa `SiteShell`; el panel tiene su propio shell (módulo `modules/panel`). Las URLs no cambian: `app/(panel)/organizador/**` → `/organizador/**` y `app/(panel)/admin/usuarios` → `/admin/usuarios`.

### Rutas y acceso

- `app/(panel)/layout.tsx` (Server Component, `LayoutProps<"/">`, metadata `robots: { index: false }`): `getPanelContext("panel:access", { returnTo: "/organizador" })` (`@/modules/panel/server`) exige el permiso y, si el rol es `organizer`, lee su estado (`approved | pending | suspended | null`). Con eso construye `sections = buildPanelNav(role)` (el estado no cambia el menú) (serializables: clave, etiqueta, clave de icono, estado y `href`) y `roleLabel = getPanelRoleLabel(role)`, y los pasa a `PanelSidebar`, `PanelMobileBar` y `PanelBreadcrumb`.
- `app/(panel)/admin/layout.tsx`: `requirePermission("users:manage", { returnTo: "/admin/usuarios" })`.
- Redirecciones: un `customer` en `/organizador` o `/admin/**` va a `/`; un `organizer` en `/admin/**` va a `/organizador`. `proxy.ts` exige sesión en `/organizador(.*)` y `/admin(.*)`.
- Las páginas del organizador (`/organizador`, `/organizador/eventos/nuevo`, `/organizador/eventos/[id]/editar`) vuelven a llamar a `getPanelContext("events:manageOwn", …)`: layout y página se renderizan en paralelo y cada uno valida por su cuenta. Eventos usa además su `user` para leer los eventos en el servidor.
- `/organizador/eventos` no es una página: redirige a `/organizador` (o a `/organizador?guardado=<valor>` si `guardado` es válido según `savedStatusSchema`; cualquier otro valor se descarta).

### Escritorio (`lg+`)

```
┌── 264px · bg-background · border-r ───┬──────────── 1fr · bg-muted ─────────────────────┐
│ [logo Mentec] → /              [⇤]    │  <main> px-10 py-10                              │
│ Panel                                 │  ┌──────── mx-auto max-w-6xl ───────────────┐    │
│                                       │  │ Organizador / Eventos      (breadcrumb)  │    │
│ ADMINISTRACIÓN      (admin, super)    │  │ [Aviso de solo lectura]  (org. no aprob.)│    │
│ ◔ Dashboard          [Próximamente]   │  │ contenido de la página                   │    │
│ ◎ Usuarios                            │  │                                          │    │
│ ▥ Organizadores      [Próximamente]   │  │                                          │    │
│ ORGANIZADOR                           │  │                                          │    │
│ ▦ Eventos          (activo: bg-accent)│  │                                          │    │
│ ⌗ Check-in           [Próximamente]   │  │                                          │    │
│ ▭ Pagos              [Próximamente]   │  │                                          │    │
│ ───────────────────────────────────── │  │                                          │    │
│ (AQ) Ana Quispe                       │  │                                          │    │
│      ana@mentectickets.pe             │  │                                          │    │
│      [Organizador]                    │  │                                          │    │
│ [ ⇥  Cerrar sesión                ]   │  └──────────────────────────────────────────┘    │
└── sticky top-0 · h-dvh ───────────────┴──────────────────────────────────────────────────┘

Rail (contraído, 76px):
┌──────┐
│ [m]  │  logo recortado a la "m"
│ [⇥]  │  Expandir menú
│  ◔   │  solo iconos; etiqueta en sr-only + title
│  ◎   │
│  ▥   │
│ ──── │  Separator entre secciones (los títulos quedan sr-only)
│  ▣   │
│  …   │
│ ──── │
│ (AQ) │  avatar (title "Nombre · Rol")
│ [⇥]  │  Cerrar sesión (solo icono, aria-label)
└──────┘
```

- Contenedor del layout:
  ```tsx
  <div className="flex-1 bg-muted lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
    <PanelSidebar sections={sections} roleLabel={roleLabel} />
    <PanelMobileBar sections={sections} roleLabel={roleLabel} />
    <main className="min-w-0 px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <PanelBreadcrumb sections={sections} />
        {/* organizador no aprobado: pending, suspended o sin fila (null) */}
        {readOnly && organizerStatus !== "approved" && <PanelReadOnlyNotice status={organizerStatus} />}
        {children}
      </div>
    </main>
  </div>
  ```
  La columna del sidebar es `auto`: el ancho lo pone el propio sidebar. El layout aporta el único `<main>`. El contenido va sobre `bg-muted`; las tarjetas blancas (`bg-card`) destacan sobre él.
- **`PanelSidebar`** (cliente, `useState` para `collapsed`): `<header className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col lg:gap-8 lg:overflow-x-hidden lg:overflow-y-auto lg:border-r lg:bg-background lg:px-4 lg:py-6 lg:transition-[width] lg:duration-200 lg:ease-out motion-reduce:lg:transition-none">` con `lg:w-66` (264 px) o `lg:w-19` (76 px, rail: 44 px de contenido con `px-4`). Orden: fila de `PanelBrand` + botón de contraer, `PanelNav` y, abajo (`mt-auto border-t pt-4`), `PanelUserCard`. Se queda fijo a toda la altura de la ventana; si no cabe, hace scroll propio.
- **Botón contraer/expandir:** `Button variant="ghost" size="icon"` `size-11 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground`, icono `PanelLeftClose` / `PanelLeftOpen` (`size-5`). `aria-label` y `title` "Contraer menú" / "Expandir menú", `aria-expanded` (expandido = `true`) y `aria-controls` con el `id` de la `nav`. Expandido va a la derecha de la marca (`items-start justify-between px-2`); en el rail, debajo del logo (`flex-col items-center`). El estado no se persiste.
- **Rail:** las etiquetas de los ítems, los títulos de sección y los badges pasan a `sr-only` (siguen dando el nombre accesible); cada ítem lleva `title` "Etiqueta" o "Etiqueta · Próximamente". Los ítems se centran (`justify-center px-0`) y un `Separator` separa las secciones.

### Móvil (`< lg`)

```
┌──────────── header sticky top-0 · h-16 · bg-background · border-b ────────────┐
│ [logo Mentec] → /                                                       [≡]   │  botón 44×44
│ Panel                                                                          │
└────────────────────────────────────────────────────────────────────────────────┘
<main> px-4 py-6 (md: px-6 py-8) sobre bg-muted

Sheet desde la izquierda (al pulsar ≡):
┌──────────────────────────────┐
│ Panel                    [✕] │  SheetTitle
│ ADMINISTRACIÓN               │  (mismas secciones que el sidebar)
│ ◔ Dashboard  [Próximamente]  │
│ …                            │
│ ORGANIZADOR                  │
│ ▦ Eventos                    │
│ …                            │
│ ──────────────────────────── │
│ (AQ) Ana Quispe              │
│      ana@mentectickets.pe    │
│      [Organizador]           │
│ [ ⇥  Cerrar sesión       ]   │
└──────────────────────────────┘
```

- **`PanelMobileBar`** (cliente, `Sheet` controlado con `useState`): `<header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b bg-background px-4 lg:hidden">` con `PanelBrand` y un `SheetTrigger` `aria-label="Abrir menú del panel"` (`buttonVariants({ variant: "ghost", size: "icon" })` + `size-11 cursor-pointer`, icono `Menu size-5`).
- `SheetContent side="left"` (`overflow-y-auto`): `SheetHeader` con `SheetTitle` "Panel" y, debajo, `flex flex-1 flex-col gap-6 px-4 pb-6` con `<PanelNav sections={sections} onNavigate={() => setOpen(false)} />` y `<div className="mt-auto border-t pt-4"><PanelUserCard roleLabel={roleLabel} /></div>`. En el `Sheet` nunca hay rail.
- Al elegir un enlace, el `Sheet` se cierra. Base UI mueve el foco al abrir, cierra con Escape y devuelve el foco al disparador.

### Marca (`PanelBrand`, server)

- `<div className="flex flex-col gap-0.5">` con:
  - `<Link href="/" aria-label="Mentec Tickets: ir al inicio">` (`inline-flex min-h-11 items-center self-start rounded-lg`, foco `focus-visible:ring-3 focus-visible:ring-ring/50`) que contiene `<BrandLogo className="h-7 w-auto" />`. El nombre accesible incluye el nombre visible de la marca (WCAG 2.5.3).
  - `<p className="px-0.5 text-xs font-medium text-muted-foreground">Panel</p>`.
- En el rail (`collapsed`): el enlace es `min-w-11 justify-center`, el logo se recorta a la "m" inicial (`w-6.5 object-cover object-left`) y "Panel" no se muestra.
- La misma marca en el sidebar y en la barra móvil. Es el único enlace al sitio público.

### Navegación por rol (`buildPanelNav` + `PanelNav`)

`buildPanelNav(role)` (función pura, `modules/panel/utils/panelNav.ts`) devuelve las secciones visibles:

| Sección | Visible para | Ítems (icono lucide) |
|---|---|---|
| **Administración** | `admin`, `super_admin` (`users:manage`) | Dashboard (`Gauge`, Próximamente) · Usuarios (`Users`, `/admin/usuarios`) · Organizadores (`Building2`, Próximamente) |
| **Organizador** | `organizer`, `admin`, `super_admin` (`events:manageOwn`) | Eventos (`CalendarDays`, `/organizador`) · Check-in (`ScanLine`, Próximamente) · Pagos (`Wallet`, Próximamente) |

- Un `customer` no ve ninguna sección (ni entra al panel). El estado de organizador no cambia el menú (solo lectura lo avisa el layout y lo explican las páginas). Sin "Resumen", "Mis eventos" ni "Crear evento": "Crear evento" vive en el listado de Eventos.
- **`PanelNav`** (cliente): `<nav aria-label="Panel" className="flex flex-col gap-4">`; por sección, un título `<p>` (`px-3 pb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase`) que nombra su `<ul aria-labelledby className="flex flex-col gap-1">`. Los iconos se resuelven en el cliente con un mapa clave → componente (las secciones llegan serializadas del servidor). Icono `size-5` `aria-hidden`.
- Items `flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium`, transición 200 ms, foco `focus-visible:ring-3 focus-visible:ring-ring/50`.
  - Activo (`isPanelNavItemActive(pathname, item)`, la misma función que usa el breadcrumb): `aria-current="page"` + `bg-accent font-semibold text-accent-foreground`. Coincidencia exacta sin barra final, salvo "Eventos", que también queda activo en `/organizador/eventos` y `/organizador/eventos/*` (Crear y Editar), pero no en rutas como `/organizador/eventosx` o `/organizador/pagos`.
  - Inactivo: `text-muted-foreground hover:bg-muted hover:text-foreground`.
  - **Deshabilitado** ("Próximamente"): `<span>` (sin `aria-disabled`, que no aplica a un span genérico), no es enlace ni recibe foco, `cursor-not-allowed text-muted-foreground`, icono `opacity-50` y, a la derecha, `Badge` "Próximamente" (`variant="secondary"`). El texto del badge y un `sr-only` "(no disponible)" anuncian el estado (nunca solo color).
- Prop opcional `onNavigate`, que se llama al pulsar cualquier enlace (la usa la barra móvil para cerrar el `Sheet`).

### Breadcrumb (`PanelBreadcrumb`, cliente)

- Sobre el contenido, dentro del `max-w-6xl` (`mb-4`): `Breadcrumb` de shadcn con `aria-label="Ruta de navegación"` y "Sección / Título" (p. ej. "Organizador / Eventos", "Administración / Usuarios"). La sección es texto (no tiene página); el título es `BreadcrumbPage` `font-medium`.
- Se deriva del pathname con la misma configuración del menú (`findNavItem`, sobre `isPanelNavItemActive`: solo ítems enlace, sin barra final y las subrutas de "Eventos"). En Crear y Editar es "Organizador / Eventos". Fuera del menú no se muestra.

### Solo lectura (organizador `pending`, `suspended` o sin fila)

- **`PanelReadOnlyNotice`** (server): `Alert` (`mb-6 px-4 py-3`, icono `Info`) entre el breadcrumb y el contenido, con título "Tu cuenta de organizador está pendiente de aprobación" / "… está suspendida" / "Tu cuenta de organizador aún no está dada de alta" (estado `null`) (`font-semibold`) y "Puedes ver tu panel, pero no crear ni editar eventos.".
- El menú no cambia. En Eventos, "Crear evento" no se muestra (`canCreate = false`) ni hay acciones por fila (`canMutate = false`).
- **Sin rebote:** `/organizador/eventos/nuevo` y `/organizador/eventos/[id]/editar` no redirigen. Muestran `EventFormHeader` ("Crear evento" / "Editar evento") y `EmptyState` (`Lock`): "No puedes crear eventos mientras tu cuenta esté en solo lectura" / "No puedes editar eventos mientras tu cuenta esté en solo lectura", con "Cuando tu cuenta de organizador esté aprobada podrás crear y editar eventos. En Eventos ves los que ya tienes." y la acción "Volver a Eventos" → `/organizador`. No se añade un segundo `PanelReadOnlyNotice` (el del layout es el único aviso). En Editar la comprobación va antes de consultar el evento.
- Admin y super_admin nunca están en solo lectura (`isReadOnlyOrganizer` solo aplica al rol `organizer`): abren Crear evento con el selector de organizador.
- Un organizador sin fila de `organizers` (estado `null`) también queda en solo lectura en las páginas, con su propio aviso ("Tu cuenta de organizador aún no está dada de alta").

### Tarjeta de usuario (`PanelUserCard`, cliente)

```
Con sesión                                Sin sesión
(AQ)  Ana Quispe                          [ →  Iniciar sesión          ]  → /login
      ana@mentectickets.pe
      [Organizador]
[ ⇥  Cerrar sesión                 ]
```

- **Sesión:** `useSessionUser()` de la entrada pública `@/modules/auth/session` (Clerk). Mientras carga no muestra nada (evita un "Iniciar sesión" fugaz). "Cerrar sesión" llama a `signOut()`, que ya redirige a `/`.
- **Con sesión:** `flex flex-col gap-3` con `UserSummary` (`@/components/shared/UserSummary`: avatar de 40 px con iniciales, nombre `font-semibold` y correo `text-sm text-muted-foreground`), debajo el rol como `Badge variant="secondary"` alineado con la columna de texto (`ms-13`): "Organizador", "Administrador" o "Super admin" (`getPanelRoleLabel`), y `Button variant="outline"` "Cerrar sesión" (`LogOut`) a todo el ancho (`h-11 w-full cursor-pointer gap-2`).
- **Rail:** solo `UserAvatar size="lg"` (con `title` "Nombre · Rol") y un botón outline `size-11` solo icono con `aria-label`/`title` "Cerrar sesión" (o "Iniciar sesión" sin sesión).
- **Sin truncado:** nombres y correos largos hacen salto de línea (`wrap-break-word` / `wrap-anywhere` de `UserSummary`), sin salirse de la tarjeta ni provocar scroll horizontal.

### Landmarks y accesibilidad

- El sidebar (`lg`) y la barra móvil (`< lg`) son `<header>`; solo uno es visible en cada breakpoint y el otro tiene `display: none`, así que hay un único `banner` y una única `nav` "Panel" (con el `Sheet` cerrado).
- Un único `<main>` (el del layout) y un único `<h1>` por página. El `<header>` interno de Eventos (h1 + subtítulo) queda dentro de `<main>`, así que no es un `banner`.
- Todo lo interactivo mide 44 px o más (`h-11`, `min-h-11`, `size-11`) y muestra foco visible. La transición de ancho del sidebar se desactiva con `prefers-reduced-motion`.

## Usuarios y roles `/admin/usuarios` (F4)

```
h1 "Usuarios y roles"                                   [+ Invitar usuario]
8 usuarios registrados
[✓ Ana Quispe fue aprobado.                                          ✕]   aviso descartable (solo tras una acción)
lg: una sola tarjeta (misma sección que el listado de Eventos)
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ h2 "Listado"                                                                        │  barra de cabecera px-6 py-4
│ Buscar                                         Rol              Estado de organizador│
│ [⌕ Nombre o correo                ] [Buscar]   [Todos los roles▾] [Todos        ▾] [Limpiar] │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ USUARIO                          ROL            ORGANIZADOR  REGISTRO     ACCIONES  │
│ (AQ) Ana Quispe  [Tú]            [Administrador]             1 oct 2026   Tu cuenta │
│      ana@correo.pe                                                                  │
│ (OP) Olga Pérez                  [Organizador]  [Pendiente]  3 oct 2026   [Aprobar] ✎ ⌫ │
│      olga@correo.pe                                                       Faltan datos fiscales │
├─────────────────────────────────────────────────────────────────────────────────────┤  border-t
│ Mostrando 1–8 de 20   Filas [8▾]                          ‹  [1] 2 3  ›             │
└─────────────────────────────────────────────────────────────────────────────────────┘
< lg: sin contenedor; controles apilados y una tarjeta por usuario (identidad, badges + registro, acciones)
```

- Solo admin y super_admin. Metadata: `Usuarios y roles | Mentec Tickets`. Breadcrumb "Administración / Usuarios".
- **Datos:** la página llama a `getPanelContext("users:manage", { returnTo: "/admin/usuarios" })` (valida el permiso por su cuenta, además del layout de `/admin`) y a `listUsers(DEFAULT_USERS_FILTERS)`, y pasa `actor` (`id`, `role`) e `initialData` a `UsersManager` (cliente, `modules/users`). Filtros, búsqueda y paginación se resuelven **en el servidor** con `useUsers` (server action `listUsersAction`); los datos iniciales solo valen para los filtros por defecto. Al cambiar de filtros o de página se mantiene la anterior (`aria-busy` en la sección) hasta que llega la nueva. Cada mutación recarga el listado.
- **Encabezado** (`UsersManager`): h1 `text-3xl md:text-4xl font-extrabold tracking-tight`; debajo "N usuarios registrados" (`text-muted-foreground tabular-nums`; total sin filtros, de la misma query que la primera página por defecto). "Invitar usuario" (`UserPlus`) es un botón primario `h-11 font-semibold hover:bg-primary-strong`, a todo el ancho en móvil y a la derecha desde `md`.
- **Aviso de resultado:** región `aria-live="polite"` siempre presente bajo el encabezado; tras cada acción muestra un `Alert` (`CircleCheck`; `destructive` con `CircleAlert` si falló Aprobar/Suspender) con un botón `size-11` "Cerrar aviso" (`X`). Textos: "Invitación enviada a <correo>." (`invited`), "Invitación reenviada a <correo>." (`reinvited`), "<correo> ya tenía cuenta: ahora es organizador/administrador." (`roleUpdated`), "<nombre> fue aprobado." / "fue suspendido." / "fue eliminado.", "Cambios guardados para <nombre>.". Se borra al empezar otra acción.
- **Sección** (`UsersTable`): mismas clases que el listado de Eventos (tarjeta solo en `lg`, barra de cabecera `lg:border-b lg:px-6 lg:py-4`, h2 "Listado" `text-lg font-bold`).
  - **Buscar:** `<form role="search">` con `Label`, `Input type="search"` (`h-11`, lupa `aria-hidden`, placeholder "Nombre o correo", `maxLength` 100) y `Button` outline "Buscar". Busca al enviar, no por tecla.
  - **Rol:** `NativeSelect` (`h-11`, `md:w-48`) "Todos los roles", Super admin, Administrador, Organizador, Cliente. **Estado de organizador:** "Todos", Aprobado, Pendiente, Suspendido. Filtran al cambiar y vuelven a la página 1.
  - **"Limpiar"** (`Button` ghost `h-11`) solo con búsqueda o filtro activos; quita ambos y vacía el campo (conserva las filas por página).
- **Lista** (`UsersTableRows`): tabla en `lg` y tarjetas por debajo (`display:none` en la otra), nombradas por el h2. Cabecera "Usuario", "Rol", "Organizador", "Registro", "Acciones" con las clases del listado de Eventos.
  - **Usuario** (`<th scope="row">`, `w-full max-w-0`): `UserAvatar size="lg"` + nombre completo `font-semibold truncate` (un invitado sin nombre muestra su correo y no repite la línea del correo) + `Badge` "Tú" (`bg-accent text-accent-foreground`) en la fila del actor + correo `text-sm text-muted-foreground`.
  - **Rol** (`Badge h-6 px-2.5 font-semibold`, etiqueta de `getPanelRoleLabel`): Super admin `bg-brand-navy text-primary-foreground`; Administrador `bg-highlight text-highlight-foreground`; Organizador `bg-secondary text-secondary-foreground`; Cliente `border-border bg-background text-muted-foreground`.
  - **Organizador:** badge de estado solo si el rol es `organizer` (un ex organizador conserva su fila `suspended`, pero no la muestra): Aprobado `bg-accent text-accent-foreground`; Pendiente `bg-warning text-warning-foreground`; Suspendido `bg-destructive text-foreground` (mismos tokens que Publicado / En revisión / Cancelado).
  - **Registro:** fecha corta es-PE en hora de Lima, "1 oct 2026" (`formatUserDate`).
  - **Acciones:** si `getManageBlockReason(actor, usuario)` da un motivo, en su lugar el texto `text-sm text-muted-foreground` "Tu cuenta", "Cuenta protegida" o "Solo el super admin" (`MANAGE_BLOCK_REASON_LABELS`). Si no:
    - **Aprobar / Suspender** (solo organizadores): `Button` outline `h-11 font-semibold`, "Suspender" si está aprobado y "Aprobar" si está pendiente o suspendido; nombre accesible "Aprobar a <nombre>". Sin razón social, tipo o número fiscal, "Aprobar" queda deshabilitado (`focusableWhenDisabled`) con "Faltan datos fiscales" (`text-xs text-muted-foreground`, `aria-describedby`) debajo. Se deshabilita mientras su cambio está en curso. No pide confirmación.
    - **Editar** (`Pencil`) y **Eliminar** (`Trash2`, `text-destructive`): botones ghost solo icono `size-11` con `aria-label` "Editar a <nombre>" / "Eliminar a <nombre>".
  - **Tarjetas** (< `lg`): `<li>` `space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border` con la identidad (h3), los badges y "Registro: <fecha>", y las acciones.
- **Vacío:** `Empty` (`rounded-2xl border-2 border-dashed`, `bg-card`; en `lg` `bg-muted` con 24 px de margen; icono `Users` en `bg-accent`) con h3 "Sin resultados", "Ningún usuario coincide con los filtros." y "Limpiar filtros" (outline `h-11`). Sin filtros: "Aún no hay usuarios registrados.".
- **Error de carga:** `<p role="alert">` "No pudimos cargar los usuarios. Inténtalo de nuevo." (clases del error del listado de Eventos); no se muestra el vacío ni la paginación.
- **Pie** (`UsersPagination`, `lg:border-t lg:px-6 lg:py-4`): "Mostrando a–b de N" (`aria-live="polite"`, `tabular-nums`), `Label` "Filas" + `NativeSelect` 8 / 16 / 24 (`USERS_PAGE_SIZES`, vuelve a la página 1) y `<nav aria-label="Paginación de usuarios">` con anterior (`ChevronLeft`, "Página anterior"), hasta 5 números consecutivos centrados en la actual (`getPageWindow`; `aria-label` "Página n", la actual con `aria-current="page"` y `bg-accent font-semibold text-accent-foreground`) y siguiente ("Página siguiente"); todos ghost `size-11`, anterior y siguiente deshabilitados (`focusableWhenDisabled`) en los extremos. Si se elimina el último usuario de la última página, se pasa a la anterior.
- **Diálogos** (`Dialog` / `AlertDialog` de shadcn, `p-5`, título `text-xl font-bold`, sin botón ✕: cierran con Cancelar o Escape; pie a sangre con Cancelar outline y la acción, ambos `h-11 font-semibold`). El formulario vive dentro del popup, así que cada apertura empieza de cero. Errores del servidor: general en `Alert destructive` arriba; de campo bajo su campo (`FieldError`, `aria-invalid`, `aria-describedby`); el foco va al primer campo inválido.
  - **Invitar usuario** (`InviteUserDialog`, `sm:max-w-md`, `useZodForm` + `inviteUserSchema`): "Si el correo ya tiene cuenta, se cambia su rol. Si no, recibe una invitación."; Correo (`type="email"`) y Rol (`NativeSelect`: Organizador; Administrador solo si `getAssignRoleBlockReason` lo permite, es decir, para un super admin). "Cancelar" / "Enviar invitación" ("Enviando…" con `Spinner`).
  - **Editar usuario** (`EditUserDialog`, `sm:max-w-lg`, con scroll interno si no cabe): Nombre y Apellido (2 columnas desde `sm`), Correo deshabilitado con "El correo viene de la cuenta y no se edita.", Rol (Cliente, Organizador y, para un super admin, Administrador). Con rol Organizador aparece un `FieldSet` `rounded-xl bg-muted p-4` "Datos del organizador": Razón social, Tipo de documento fiscal ("Elige el tipo", RUC, DNI), RUC/DNI y Estado de organizador (Aprobado, Pendiente, Suspendido; quien pasa a organizador empieza en Pendiente) con la ayuda "Para aprobar hacen falta la razón social, el tipo y el número fiscal.". Valida con `updateUserSchema` en el cliente y muestra los errores por ruta (`organizer.taxId`…), igual que los `fieldErrors` de la acción. "Cancelar" / "Guardar cambios".
  - **Eliminar** (`DeleteUserDialog` sobre `ConfirmDialog` compartido, destructivo): "¿Eliminar a <nombre>?" / "Perderá el acceso a Mentec Tickets. Esta acción no se puede deshacer." / Cancelar / "Eliminar" (`bg-destructive text-foreground`, navy sobre rojo como "Cancelado"). Mientras elimina, Cancelar y Eliminar quedan deshabilitados ("Eliminando…"). Si falla, el error se muestra en el diálogo, que sigue abierto para reintentar.

## Eventos `/organizador` (vista unificada, spec `organizer-events-view`)

> Desde `organizer-events-view` (Fase 2), «Resumen» y «Mis eventos» son una sola página, «Eventos» (`/organizador`): KPIs + listado completo con filtros, «Crear evento» y acciones. `/organizador/eventos` ya no es una página: redirige a `/organizador`, conservando solo un `?guardado=` válido (`savedStatusSchema`). Prevalece sobre las secciones «Resumen» y «Mis eventos» de `organizer-dashboard`, `admin-panel` (F3, F5a y F5b) y `design-alignment-account-views` en navegación, encabezado, filtros y acciones; las reglas de datos, badges, KPIs y diálogos se mantienen.

### Layout

```
h1 "Eventos"
Ventas y gestión de todos tus eventos
[Alert de aviso]                     (región aria-live; ?guardado= o tras una acción)
┌──────────────┬──────────────┬──────────────┐
│ ▥ Ingresos   │ ▤ Entradas   │ ▦ Eventos     │  <dl>; lg: 3 columnas
│ S/ 13,500.50 │ vendidas 150 │ publicados 1  │  móvil: Ingresos fila completa
└──────────────┴──────────────┴──────────────┘
lg: una sola tarjeta (bg-card rounded-2xl ring-1 ring-border overflow-hidden), sin relleno propio
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ h2 "Mis eventos"  5 eventos                                      [+ Crear evento]    │  barra de cabecera px-6 py-4
│ Estado               Buscar                                 Desde          Hasta     │
│ [Todos los estados▾] [⌕ Título, recinto o ciudad ] [Buscar] [▣ Cualquier…][▣ Cualq…] │  1440: una fila
│ [✕ Limpiar filtros]                                    (solo con algún filtro activo) │  1024: dos filas (wrap)
├──────────────────────────────────────────────────────────────────────────────────────┤  border-b
│ EVENTO                       ESTADO      VENDIDAS            INGRESOS     ACCIONES   │
│ [img] Título (truncate)      Borrador    0 / 1,240 vendidas         —     [✎] [•••]  │
│       SÁB 14 NOV · 21:00 · Lima          ▓▓▓▓▓░░░░                                   │
│ …                            En revisión 0 / 500 vendidas           —         [•••]  │  admin: Aprobar/Rechazar
│ …                            Publicado   30 / 500 vendidas   S/ 2,700.00  [✎] [•••]  │
│ …                            Cancelado   …                                           │  sin acciones
└──────────────────────────────────────────────────────────────────────────────────────┘
< lg: sin contenedor; cabecera y controles apilados a todo el ancho (Desde | Hasta en 2 columnas) y una tarjeta por
evento con las acciones como botones con texto
```

- Metadata: `Eventos | Mentec Tickets`. Breadcrumb "Organizador / Eventos"; en el menú, "Eventos" activo (también en `/organizador/eventos/*`).
- **Datos:** la página llama a `getPanelContext("events:manageOwn", { returnTo: "/organizador" })`, parsea `?guardado` con `savedStatusSchema` y lee en el servidor todos los eventos que gestiona el usuario (`listManagedEvents(user)`: los suyos o, para admin y super_admin, todos). Se los pasa a `OrganizerDashboard` (cliente) como `initialEvents`, con `role`, `showOrganizer` (`events:manageAny`), `canMutate = canCreate = !readOnly` y `saved`.
- **`OrganizerDashboard`:** los KPIs y debajo `<OrganizerEventsList>`. Los KPIs usan siempre `useManagedEvents(userId, DEFAULT_MANAGED_EVENTS_FILTERS, initialEvents)` (la misma caché que el listado sin filtros); el listado tiene sus propios filtros. Las mutaciones invalidan `managedEventsBaseKey`, así que ambos se refrescan.
- **Encabezado:** h1 `text-3xl md:text-4xl font-extrabold tracking-tight` (único h1) y el subtítulo `text-base leading-relaxed text-muted-foreground`. Sin "Crear evento" en el encabezado: está en la cabecera del listado.
- **KPIs** (Decisión 14): `<dl>` `grid-cols-2 lg:grid-cols-3 gap-4`; cada tarjeta `rounded-2xl ring-1 ring-border bg-card p-5 md:p-6` con `<dt>` (icono + etiqueta, `text-sm text-muted-foreground`) y `<dd>` (`text-2xl md:text-3xl font-bold tabular-nums`). Orden único en el DOM: Ingresos (`ChartColumn`, `col-span-2 lg:col-span-1`), Entradas vendidas (`Ticket`), Eventos publicados (`CalendarDays`). La etiqueta es siempre "Eventos publicados". Los KPIs resumen todos los eventos: los filtros del listado no los cambian (Decisión 5 de `organizer-events-view`). **Ingresos** = ventas brutas MVP (Decisión 10): suma de las órdenes `paid` (sin `refunded`, `partially_refunded`, `pending` ni `expired`); para un organizador, su parte (`organizer_amount_cents`); para el admin, el subtotal (`subtotal_cents`). **Entradas vendidas** = `ticket_count` de esas órdenes. **Eventos publicados** = eventos en estado `published`.
- **Sección del listado** (`OrganizerEventsList`, sin tarjeta dentro de tarjeta): `<section aria-labelledby aria-busy className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:bg-card lg:ring-1 lg:ring-border">`. En `lg` es una sola tarjeta blanca sin relleno (la barra y la tabla llevan su propio `px-6`); por debajo, todo va sobre el `bg-muted` del panel.
- **Barra de cabecera** (`flex flex-col gap-4 lg:border-b lg:px-6 lg:py-4`):
  - Primera línea (`flex flex-col gap-3 md:flex-row md:items-center md:justify-between`): h2 "Mis eventos" (`text-lg font-bold`) con el número de resultados al lado ("1 evento" / "N eventos", `text-sm text-muted-foreground tabular-nums`, `aria-live="polite"`) y, a la derecha desde `md`, **"Crear evento"** (`CreateEventLink`: enlace con aspecto de botón primario, `Plus`, `h-11 font-semibold hover:bg-primary-strong`, `w-full md:w-auto`). Solo con `canCreate` (no en solo lectura).
  - **Filtros** (`flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end`): por debajo de `md`, columna a todo el ancho; desde `md`, fila con wrap, así que lo que no cabe baja de línea y nunca hay scroll horizontal. A 768 px y a 1024 px (con sidebar, ~630 px útiles) van en dos filas (Estado + Buscar; Desde/Hasta + Limpiar); a 1440 px, en una (con "Limpiar filtros" visible, ese botón baja).
    - **Estado:** `Label` + `NativeSelect` (`h-11`, `md:w-52`, `bg-background`) con "Todos los estados" y los 5 estados. Filtra al cambiar.
    - **Buscar:** `<form role="search">` (`md:min-w-72 md:flex-1`) con `Label`, `Input type="search"` controlado (`searchDraft`; `h-11`, lupa `aria-hidden`, placeholder "Título, recinto o ciudad", `maxLength` 100) y `Button` outline "Buscar" (`h-11`). Busca al enviar (pasa el texto a `filters.q`), no por tecla: las server actions se despachan de una en una. Coincide con el título o con título, recinto y ciudad sin tildes (`search_text`).
    - **Desde / Hasta:** `grid grid-cols-2 gap-3 md:w-96`, cada uno `Label` + `DatePicker` (MASTER §7, placeholder "Cualquier fecha", `bg-background`, `aria-labelledby` con la etiqueta: se anuncia "Desde Cualquier fecha" o "Desde lun 5 oct 2026"). `Desde.max = to` y `Hasta.min = from`; filtran al elegir el día. Rango en días calendario de Lima (`-05:00`): `from` incluye desde las 00:00 y `to` hasta el final del día; con algún límite, los eventos sin fecha no aparecen. El schema rechaza `from > to` ("La fecha Hasta no puede ser anterior a Desde").
    - **"Limpiar filtros"** (`Button` ghost `h-11`, `X`): solo con algún filtro activo; vuelve a `DEFAULT_MANAGED_EVENTS_FILTERS` (`{ status: "all", q: "", from: "", to: "" }`) y vacía el campo de búsqueda.
  - Filtros, búsqueda y fechas se resuelven **en el servidor** (`useManagedEvents` → `listManagedEventsAction`, zod + `requirePermission`). Los datos iniciales solo valen para los filtros por defecto; al cambiar se mantiene la lista anterior (`aria-busy`) hasta que llega la nueva.
- **Lista** (`OrganizerEventsTable`): tabla en `lg` (`hidden lg:block`) y tarjetas por debajo (`lg:hidden`); `display:none` evita duplicados en el árbol de accesibilidad. Ambas nombradas por el h2.
  - **Tabla a sangre:** `TableHeader` sin fondo (`hover:bg-transparent`); cabecera "Evento", "Estado", "Vendidas", "Ingresos" (derecha) y, con acciones, "Acciones" (derecha), `h-11 text-xs font-semibold tracking-wider text-muted-foreground uppercase`. Celdas `px-6 py-3.5`; la última fila sin borde.
  - Celda Evento: `<th scope="row">` de peso normal (`h-auto w-full max-w-0`: ocupa el espacio libre y el título se trunca en vez de ensanchar la tabla), miniatura `size-12 rounded-lg object-cover` (`alt=""`; sin portada, bloque `bg-muted` con `ImageIcon`), título `font-semibold truncate`, "fecha · ciudad" (admin y super_admin: "· organizador") `text-sm text-muted-foreground truncate`.
  - Celda Vendidas: bloque `xl:w-48 space-y-2` con el conteo y la barra. Celda Ingresos: `text-right font-semibold tabular-nums`. Columna Acciones: `w-36 whitespace-nowrap`, contenido `flex items-center justify-end gap-2` en una sola línea.
  - **Tabla compacta entre `lg` y `xl` (1024–1279 px):** con el sidebar abierto la tabla mide ~680 px y las columnas fijas dejaban el título sin sitio (la tabla desbordaba su contenedor). En ese rango las celdas interiores pasan a `px-3` (los bordes izquierdo y derecho conservan `px-6`), la miniatura se oculta, "Vendidas" pierde el sufijo "vendidas" (lo dice la cabecera) y su ancho fijo, y la columna de acciones va a `w-auto`. El título conserva ~175 px en el peor caso ("S/ 1,335,600.00", "En revisión"). Desde `xl`, la tabla completa.
  - **Tarjetas** (< `lg`): `<ul className="space-y-3 lg:hidden">`; cada `<li>` `space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border`: miniatura + h3 (`line-clamp-2 leading-snug font-bold`) + "fecha · ciudad" + badge; vendidas e ingresos; la barra; y, si hay acciones, un pie `flex flex-wrap gap-2 border-t pt-3 *:flex-1`.
- **Acciones por estado y rol** (prop `rowActions(event, layout)`; solo con `canMutate`: no en solo lectura). `EventRowActions` con las transiciones de `getAvailableTransitions(rol, estado)`. Cancelado y finalizado no tienen acciones para el organizador (`hasEventRowActions`: sin pie en la tarjeta ni `[•••]` en la fila); en un evento en revisión le queda Editar.
  - **Tabla (`layout="table"`), compactas:** **[Editar]** es un enlace icono (`Pencil`, outline `size-11`, `aria-label="Editar <título>"`) a `/organizador/eventos/<id>/editar`, en borrador, en revisión y publicado. **[•••]** (`Ellipsis`, outline `size-11`, `aria-label="Más acciones de <título>"`) abre un `DropdownMenu` (`align="end"`, `min-w-48 max-w-72 p-1.5`; Base UI lo mantiene dentro del viewport) con las acciones permitidas, en este orden: Eliminar, Enviar a revisión, Aprobar, Rechazar, Cancelar evento. Cada ítem `min-h-11 gap-3 px-3 text-sm font-medium` con su icono (el de Eliminar y Cancelar en `text-destructive`; el texto, en el color normal). Sin acciones de menú no hay `[•••]`. "Cancelar evento" con ventas (`hasActiveSales`) va deshabilitado (no se ejecuta), sin la opacidad por defecto para que se lea, con "Tiene ventas o reservas en curso · Cancelación con reembolsos: Próximamente" (`text-xs`, `aria-describedby`).
  - **Tarjeta (`layout="card"`):** botones con texto `h-11 px-3 font-semibold` a partes iguales: "Editar" (outline), "Eliminar" (outline, `Trash2` rojo), "Enviar a revisión" y "Aprobar" (primarios), "Rechazar" (outline) y "Cancelar evento" (outline, `Ban` rojo; con ventas, deshabilitado y enfocable con el mismo motivo debajo).
  - Detalle y confirmación de cada acción (los textos de los botones de arriba valen para el ítem del menú):
    - **"Editar"** (borrador, en revisión y publicado; organizador dueño y admins; cancelado y finalizado no): enlace outline con `Pencil` a `/organizador/eventos/<id>/editar`.
    - **"Eliminar"** (borrador): outline con `Trash2` en `text-destructive` (el texto, en el color normal: rojo sobre blanco no llega a 4.5:1). Abre `DeleteEventDialog`: "¿Eliminar el borrador «<título>»?" / "Se borran el evento y sus tipos de entrada. Esta acción no se puede deshacer." / "Cancelar" / "Eliminar" (destructiva, "Eliminando…").
    - **"Enviar a revisión"** (borrador; organizador dueño o admin): primario con `Send`. Confirmación: "¿Enviar «<título>» a revisión?" / "Un administrador lo revisará antes de publicarlo. Mientras está en revisión puedes seguir editándolo: el administrador aprobará la última versión guardada." / "Cancelar" / "Enviar a revisión" ("Enviando…"). Si faltan datos, el error del servidor dice cuáles ("Faltan datos para publicar el evento: el recinto y la portada.", "Algún tipo de entrada es de una sección sin lugares: quítalo para publicar el evento." y/o "La fecha de inicio ya pasó: elige una fecha futura.").
    - **"Destacar" / "Quitar destacado"** (admin y super_admin con `events:manageAny`, en cualquier estado; el organizador no la ve): `FeaturedToggle`, outline con `Star` (rellena si ya está destacado) y `aria-pressed`. En la tabla es un ítem del menú "Más acciones"; en la tarjeta, un botón con texto; en `[id]/editar`, en la cabecera, con el resultado en una región `aria-live` ("Evento destacado." / "Evento retirado de destacados."). Sin confirmación. Un borrador puede quedar destacado, pero la landing solo muestra destacados publicados futuros (máx. 5, por fecha).
    - **"Aprobar"** (en revisión; admin y super_admin): primario con `Check`. Confirmación: "¿Aprobar y publicar «<título>»?" / "Se genera su inventario de entradas y queda a la venta en el catálogo." / "Cancelar" / "Aprobar y publicar" ("Publicando…"). Si el organizador o el recinto ya no están aprobados, el servidor lo rechaza ("El organizador del evento ya no está aprobado: no se puede publicar hasta que lo esté." / "El recinto del evento ya no está aprobado: …").
    - **"Rechazar"** (en revisión; admin y super_admin): outline con `X`. Abre `RejectEventDialog` (`Dialog`, `p-5`, `sm:max-w-md`, sin ✕): "¿Rechazar «<título>»?" / "Vuelve a borrador. El organizador verá el motivo al editarlo y podrá enviarlo a revisión otra vez."; `Textarea` "Motivo del rechazo" (obligatorio, `maxLength` 1000, ayuda "Qué debe corregir el organizador.", `aria-invalid` y `aria-describedby` hacia la ayuda y el error "Escribe el motivo del rechazo"); "Cancelar" / "Rechazar" ("Rechazando…").
    - **"Cancelar evento"** (publicado; admin y super_admin): outline con `Ban` en `text-destructive`. Con ventas activas (`hasActiveSales`: órdenes `paid`, `partially_refunded` o reservas `pending` vigentes) queda deshabilitado y enfocable (`focusableWhenDisabled`) con "Tiene ventas o reservas en curso · Cancelación con reembolsos: Próximamente" debajo (`text-xs text-muted-foreground`, `aria-describedby`). Confirmación destructiva: "¿Cancelar «<título>»?" / "Deja de estar a la venta y no se puede volver a publicar. Solo se cancelan eventos sin ventas." / "Volver" (no "Cancelar", que se confundiría) / "Cancelar evento" ("Cancelando…"). Si entre la carga de la lista y la confirmación entró una venta o una reserva, el servidor lo rechaza con el mismo mensaje y el diálogo sigue abierto. Aprobar, cancelar y guardar un evento publicado invalidan sus páginas públicas (inicio, catálogo, detalle y compra).
- **Diálogos de confirmación** (`components/shared/ConfirmDialog`, compartido): `AlertDialog` `p-5`, título `text-xl font-bold`, descripción `text-base`, pie a sangre (`-mx-5 -mb-5 p-5`) con el botón de cerrar outline y la acción (`h-11 px-4 font-semibold`; primaria `hover:bg-primary-strong` o destructiva `bg-destructive text-foreground`). Mientras se ejecuta, ambos se deshabilitan y la acción muestra `Spinner` y su texto de carga. Un error del servidor se muestra en el diálogo (`Alert destructive`), que sigue abierto para reintentar; cada apertura empieza sin el error anterior. Tras cualquier acción (o un error de listado desactualizado: el evento ya cambió de estado o le entraron ventas) se recarga el listado (`useModerateEvent`/`useDeleteEventDraft` invalidan `["managed-events", userId]`).
- **Avisos** (región `aria-live="polite"` sobre la sección; `Alert` con `CircleCheck` y "Cerrar aviso" `size-11`; uno a la vez, se borra al empezar otra acción):
  - `?guardado=borrador`: "Borrador guardado" / "Está en el listado con el estado «Borrador». Aún no es visible para el público."; `?guardado=cambios`: "Cambios guardados" / "El evento publicado ya muestra los cambios." (cualquier otro valor se ignora).
  - "Borrador «<título>» eliminado"; "«<título>» enviado a revisión" / "Un administrador lo revisará antes de publicarlo."; "«<título>» aprobado y publicado" / "Ya está a la venta en el catálogo."; "«<título>» rechazado" / "Volvió a borrador con el motivo para el organizador."; "«<título>» cancelado" / "Ya no está a la venta.".
- **Vacío:** `<p>` "Aún no tienes eventos." (sin filtros) o "No hay eventos con estos filtros." con `rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border lg:m-6 lg:bg-muted lg:ring-0`.
- **Error de carga:** `<p role="alert">` "No pudimos cargar los eventos. Inténtalo de nuevo." (`text-sm text-destructive`, bloque `bg-card rounded-2xl ring-1 ring-border p-4 lg:m-6 lg:mb-0`) sobre la lista; con error no se muestra el vacío.

### Reglas específicas

- **Badges de estado** (texto, nunca solo color; `MANAGED_EVENT_STATUS_BADGE`, los 5 valores de `event_status`): "Borrador" `bg-secondary text-secondary-foreground`; "En revisión" `bg-warning text-warning-foreground`; "Publicado" `bg-accent text-accent-foreground`; "Cancelado" `bg-destructive text-foreground` (navy sobre rojo, como "Agotado"); "Finalizado" `border-border bg-background text-muted-foreground`.
- **Avance de ventas**: "**7,420** / 8,000 vendidas" (`tabular-nums`) + `Progress` de shadcn con `value` = porcentaje entero 0–100, `aria-label="Entradas vendidas de <título>"` y `aria-valuetext` "7,420 de 8,000 vendidas" (`getAriaValueText`). Capacidad 0 → 0 %. **Capacidad**: fuera de `draft`, los `event_seats` sin retirar; en un borrador (aún sin inventario), la configurada: por cada tipo de entrada, la `capacity` de su sección general o los `venue_seats` de su sección numerada.
- **Ingresos** por evento: `formatRevenue` (céntimos → `S/ 1,335,600.00`) con los ingresos de la BD (mismo cálculo que el KPI). Borradores: "—" `aria-hidden` + `sr-only` "Sin ingresos".
- **Marcadores**: sin fecha → "Fecha por definir"; sin ciudad → se omite " · ciudad"; sin imagen → bloque `size-12 rounded-lg bg-muted` con `ImageIcon` `aria-hidden`.
- Formatos: importes `S/ 1,387,530.00`, conteos `Intl.NumberFormat("es-PE")` (`8,146`), fechas `SÁB 14 NOV · 21:00`.

## Crear y editar evento `/organizador/eventos/nuevo` y `/organizador/eventos/[id]/editar` (F5a, edición fuera de borrador en F5b)

> CRUD de borradores contra la BD (`createEvent`/`updateEvent`/`deleteEvent`), organizador obligatorio para admin, recinto existente, tipos de entrada por sección y portada por URL: `docs/specs/admin-panel.md` (Fase 5a). Prevalece sobre `organizer-event-seating` y `organizer-event-seating-mode` (lugar libre, ciudad, dirección y organizador de texto, modo de ubicación, zonas con filas × asientos, máximo y descripción por tipo, portada subida desde el equipo) y sobre el guardado en `localStorage` de `organizer-dashboard`.

> Portada con pestañas «Subir imagen» (Vercel Blob) / «Usar URL», estados de la subida y recortes: `docs/specs/event-cover-upload.md`. Prevalece sobre la "portada por URL" de F5a.

> Recinto ingresado a mano («Mi recinto no está en la lista»), dirección y mapa del recinto en las dos opciones y aprobación conjunta del recinto con el evento: `docs/specs/organizer-manual-venue.md`. Prevalece sobre el "recinto existente" de F5a.

### Layout

```
← Volver a Eventos                                    → /organizador, ~8 px sobre el h1
h1 "Crear evento" | "Editar borrador" | "Editar evento"
[Aviso según el estado (solo en Editar)]
┌──────────────────────────────────┬──────────────┐
│ Información básica               │ VISTA PREVIA │  lg: grilla 1fr | 340px, gap-8
│ Nombre del evento                │ [tarjeta]    │  vista previa sticky lg:top-10
│ Categoría | Edad mínima          │ Así verán tu │
│ Descripción                      │ evento…      │
│ Organizador [Select ▾]  (admin)  │              │
├──────────────────────────────────┤              │
│ Fecha y recinto                  │              │
│ Fecha | Hora | Apertura puertas  │              │
│ Recinto [Estadio Nacional · Lima]│              │  deshabilitado con el checkbox marcado
│ ☐ Mi recinto no está en la lista │              │
│ [Datos del recinto] (marcado)    │              │  nombre, dirección, ciudad, zonas
│ ┌ mapa (Ver mapa) ─────────────┐ │              │  recinto de la lista o el escrito
│ │ Nombre · dirección, ciudad   │ │              │
│ │        [Abrir en Google Maps]│ │              │
│ └──────────────────────────────┘ │              │
├──────────────────────────────────┤              │
│ Imagen de portada                │              │
│ [Subir imagen] [Usar URL]        │              │
│ zona de arrastre | vista previa  │              │
├──────────────────────────────────┤              │
│ Tipos de entrada                 │              │
│ ┌ Campo ─────── 1,000 lugares… ┐ │              │  una fila por sección del recinto
│ │ ☑ Vender entradas en esta s. │ │              │
│ │ Nombre del tipo | Precio (S/)│ │              │  @md: 1fr | 160px
│ └──────────────────────────────┘ │              │
│ Capacidad a la venta  1,000 ent. │              │
└──────────────────────────────────┘              │
[Alert de error del servidor]                     │
                         [Cancelar] [Guardar borrador]   lg: estática, a la derecha
Móvil: secciones → vista previa (tarjeta horizontal) → barra sticky [Cancelar | Guardar borrador]
```

- **Rutas** (Server Components): ambas llaman a `getPanelContext("events:manageOwn", …)`; en solo lectura (organizador no aprobado) muestran el `EmptyState` de "Solo lectura" (ver Layout común) en lugar del formulario, sin redirigir. Leen en el servidor los recintos (`listApprovedVenuesWithSections`: aprobados y pendientes, ver "Recinto") y, para admin y super_admin, los organizadores (`listApprovedOrganizers`), de `@/modules/organizer/server`, y renderizan `OrganizerEventForm` (cliente) con la clave del mapa (`mapsEmbedKey`, `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` vía `publicEnv`: `lib/env` no se importa en el cliente). Editar precarga el evento con `getEventForEdit(user, id)` (el suyo o, para admin, cualquiera): si no existe, no es suyo o el id no es un uuid → `notFound()`. En lugar del formulario muestra `EmptyState` (`FilePen`, acción "Volver a Eventos" → `/organizador`) solo si está cancelado o finalizado ("Este evento ya no se puede editar" / "Los eventos cancelados o finalizados no se editan. En Eventos ves su estado actual."). h1: "Editar borrador" en un borrador; "Editar evento" en revisión y publicado.
- **Matriz de edición** (spec `event-editing`, Decisión 1; las reglas las garantiza `updateEvent` y el formulario las refleja con `getEventFormLock`). "Ventas" son órdenes `paid`, `partially_refunded` o `pending` vigentes (`hasActiveSales`). La **estructura** de un publicado (recinto, secciones a la venta, altas o bajas de tipos de entrada y organizador) nunca cambia: su inventario de asientos ya está generado.

  | Estado | Campos editables | Estado tras guardar | Aviso (`EventEditNotice`) |
  |---|---|---|---|
  | Borrador | todos | borrador | solo si un admin lo rechazó (ver abajo) |
  | En revisión | todos (aún sin inventario); exige los requisitos de envío a revisión | en revisión | "Este evento está en revisión" / "Al guardar sigue en revisión y el administrador revisa la versión nueva." |
  | Publicado sin ventas | todo salvo la estructura | publicado | "Este evento está publicado" / "Puedes cambiar los textos, la portada, la categoría, la fecha y los precios. El recinto y las secciones a la venta ya no se cambian." |
  | Publicado con ventas | igual que sin ventas: textos, portada, edad, categoría, fecha y hora, nombre y precio de cada tipo | publicado | "Este evento tiene ventas o reservas en curso" / "Puedes cambiar los textos, la portada, la categoría, la fecha y los nombres y precios de las entradas (si cambias la fecha, los compradores la verán actualizada). El recinto y las secciones a la venta ya no se cambian." |
  | Cancelado, finalizado | nada (`edit_locked`: "Un evento cancelado o finalizado ya no se puede editar.") | — | `EmptyState` en lugar del formulario |

  - **Borrador rechazado:** `EventEditNotice` muestra `Alert` (`MessageSquareWarning`) "El administrador pidió cambios" con el motivo (`whitespace-pre-line text-foreground`) y "Corrígelo y vuelve a enviarlo a revisión desde Eventos.".
  - **Publicado** (`getEventFormLock` → `structure`, con o sin ventas): Recinto, Organizador y los checkboxes "Vender entradas en esta sección" deshabilitados; Categoría, Fecha, Hora de inicio, Apertura de puertas y nombre y precio de cada tipo, editables. Un cambio de estructura lo rechaza el servidor con `structure_locked` ("En un evento publicado no se pueden cambiar el recinto, las secciones a la venta ni el organizador.").
  - **En revisión:** sin campos bloqueados. Si al guardar falta un requisito de revisión (recinto, portada, tipos con lugares, fecha futura…), no se guarda y el `Alert destructive` dice qué falta (mismos mensajes que "Enviar a revisión"). El admin aprueba la versión guardada; el inventario se genera con las secciones vigentes al aprobar.
  - **Confirmación del cambio de fecha** (Decisión 3): en un publicado con entradas vendidas (`sold > 0`), si cambian la fecha, la hora de inicio o la apertura de puertas (`hasScheduleChanged`), "Guardar cambios" no guarda todavía: abre el `ConfirmDialog` compartido "¿Cambiar la fecha del evento?" / "Este evento tiene N entradas vendidas. Los compradores verán la nueva fecha." ("1 entrada vendida" en singular) / "Cancelar" / "Cambiar fecha" ("Guardando…"). Al confirmar se guarda y el servidor informa `events.schedule_changed_at`; el detalle público y «Mis entradas» muestran el aviso «Fecha actualizada» (ver `event-detail.md` y `my-tickets.md`). Cancelar cierra el diálogo sin guardar y conserva lo escrito. Sin correos ni reembolsos.
  - **Precio con reservas en curso** (`price_locked_pending`, enmienda 1): cambiar el precio de un tipo de entrada con reservas `pending` vigentes se rechaza entero con "Hay compras en curso para esta entrada; inténtalo en unos minutos" en el `Alert destructive` (el webhook de pago escribe el precio actual del tipo al confirmar). El nombre sí se cambia. Un precio nuevo solo afecta a las ventas nuevas: las entradas pagadas conservan el suyo.
  - El aviso va entre el encabezado y el formulario (`Alert` `px-4 py-3`, como el de solo lectura del panel).
- **Encabezado** (`EventFormHeader`): enlace "Volver a Eventos" (→ `/organizador`; `ArrowLeft size-4` `aria-hidden`, `inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground`, foco `focus-visible:ring-3 focus-visible:ring-ring/50`) pegado sobre el h1 (`text-3xl md:text-4xl font-extrabold tracking-tight`). Breadcrumb: "Organizador / Eventos" en las dos (subrutas de "Eventos").
- **Secciones** en `Card rounded-2xl` con h2 `text-lg font-bold` (blancas sobre el `bg-muted` del panel). Cada campo: `Field` con `data-invalid`, `aria-invalid`, `aria-describedby` hacia `FieldError` con id `organizer-event-<campo>-error`, controles `h-11` con `scroll-mt-24 scroll-mb-28 lg:scroll-mb-0` (`formStyles.ts`) para no quedar bajo la barra sticky. Validación al guardar y, tras el primer intento, al salir de cada campo; el foco va al primer campo inválido.
- **Barra de acciones:** por debajo de `lg`, `sticky bottom-0` con `border-t bg-background` y `env(safe-area-inset-bottom)` (márgenes negativos `-mx-4 md:-mx-6`, los del `<main>`); en `lg`, estática a la derecha. "Cancelar" es un enlace outline a `/organizador`; "Guardar borrador" (o "Guardar cambios" en un evento en revisión o publicado) es el botón primario (`hover:bg-primary-strong`, "Guardando…" con `Spinner` mientras guarda; sigue deshabilitado tras guardar hasta que llega Eventos, para no crear dos borradores). **Sin "Publicar" ni "Enviar a revisión"** en el formulario: se envía a revisión desde el listado de Eventos (F5b).
- **Tras guardar:** se descartan los listados del usuario en caché (`useSaveEventDraft`) y se navega a `/organizador?guardado=borrador`, a `/organizador?guardado=cambios` si era un evento publicado, o a `/organizador` sin aviso si estaba en revisión (sigue en revisión; ninguno de los dos avisos lo describe). Un cambio de estructura de un publicado (`structure_locked`), un precio con reservas en curso (`price_locked_pending`) o un evento publicado o en revisión incompleto se rechazan en el servidor con su mensaje en el `Alert destructive`. Un fallo del servidor (organizador no aprobado, recinto no aprobado, sección ajena, ya no es borrador…) se muestra en un `Alert destructive` sobre la barra (`role="alert"`) y el formulario sigue editable.
- Metadata: `Crear evento | Mentec Tickets` y `Editar evento | Mentec Tickets`.

### Campos y reglas (`createEventDraftSchema`)

Un borrador solo exige el nombre y la categoría; lo demás puede faltar, pero lo que se indique tiene que ser válido (la BD no guarda datos a medias). El mismo schema valida el formulario y la entrada de las acciones; las comprobaciones de la BD las hace el servicio.

| Campo | Control | Regla | Mensaje |
|---|---|---|---|
| Nombre del evento | `Input`, `maxLength` 100 | Obligatorio (con trim) | "Ingresa el nombre del evento" |
| Categoría | `Select` con las categorías de la BD (prop `categories` de `listEventCategories()`), sin valor por defecto (placeholder "Elige una categoría") | `categorySlugSchema`; un slug que no existe en la BD → "Categoría no válida" | "Elige una categoría" |
| Edad mínima | `Select` (`items={MIN_AGE_LABELS}`): "Todo público", "+12", "+14", "+16", "+18" | Una de la lista | — |
| Descripción | `Textarea`, `maxLength` 2000 | Opcional | "La descripción admite hasta 2000 caracteres" |
| Organizador (solo admin y super_admin) | `Select` de organizadores `approved` (razón social o nombre), placeholder "Elige el organizador", ayuda "Dueño del evento: solo organizadores aprobados." | Obligatorio | "Elige el organizador del evento" |
| Fecha / Hora de inicio | `DatePicker` (MASTER §7; `min` = hoy en Lima, solo en cliente; deshabilitado en un publicado con ventas; `aria-invalid`/`aria-describedby` hacia su error y `aria-labelledby` con la etiqueta) / `Input type="time"` | Las dos o ninguna | "Elige la fecha del evento" / "Indica la hora de inicio" / "Elige una fecha válida" |
| Apertura de puertas | `Input type="time"`, mismo día | Opcional; exige fecha y hora de inicio y ser a esa hora o antes | "Indica primero la fecha y la hora de inicio" / "La apertura de puertas debe ser a la hora de inicio o antes" |
| Recinto | `Select` de recintos ("Nombre · Ciudad": los `approved` y los `pending_review` del organizador del evento), placeholder "Elige el recinto", ayuda "Recintos aprobados y los del organizador en revisión. Sus secciones definen los tipos de entrada." Deshabilitado con «Mi recinto no está en la lista» marcado (ver "Recinto") | Opcional; obligatorio si se vende alguna sección (salvo con el recinto manual) | "Elige el recinto para vender entradas" |
| Recinto manual | Bloque «Datos del recinto» tras marcar «Mi recinto no está en la lista» (ver "Recinto") | Solo con el checkbox marcado (`getManualVenueErrors`) | ver "Recinto" |
| Imagen de portada | `CoverImageField` (ver "Imagen de portada"). En «Usar URL»: "URL de la imagen", `Input type="url"`, placeholder "https://…", ayuda "Enlace https a la imagen (recomendado 1920 × 1080 px, 16:9). Deja lo importante en el centro: cada pantalla la recorta de forma distinta." | Opcional; URL absoluta `https` con dominio (Decisión 5) | "Ingresa una URL válida que empiece por https://" |

- Fechas en `America/Lima` (UTC−5 todo el año): se guardan como `timestamptz` y al editar se muestran en Lima.
- **Rejillas por ancho de sección, no de viewport** (container queries): a 1024 px, con sidebar y vista previa, la columna del formulario mide ~260 px. Categoría | Edad mínima van en dos columnas desde `@md/field-group` (28rem); Fecha, Hora de inicio y Apertura de puertas en tres desde `@lg/field-group` (32rem) y, por debajo, Fecha a todo el ancho (el `DatePicker` necesita ~140 px) con Hora | Apertura debajo. En cada fila de tipos de entrada (`@container`), Nombre | Precio en `@md:grid-cols-[minmax(0,1fr)_160px]`.
- El organizador de un evento creado por un organizador es siempre él mismo (el campo no se muestra y lo que llegue se ignora). Un admin puede cambiar el dueño de un borrador al editarlo.

### Recinto (spec `organizer-manual-venue`)

- **Por defecto, el `Select`** de recintos. `listApprovedVenuesWithSections` devuelve los aprobados y, para un organizador, sus pendientes; para admin y super_admin, todos los pendientes. El formulario filtra: `status === "approved"` o `organizerId` = organizador del evento (el propio usuario si es organizador; el elegido en "Organizador" si es admin). Si el admin cambia de organizador y el recinto elegido es un pendiente de otro, se quita (con sus tipos de entrada).
- **Checkbox «Mi recinto no está en la lista»** (`Checkbox` de shadcn en `Field orientation="horizontal"` `min-h-11`), desmarcado por defecto, bajo el `Select`. Deshabilitado en un evento publicado (estructura bloqueada).
  - **Marcado:** el `Select` se deshabilita y aparece el bloque manual (`ManualVenueFields`, `FieldSet` `rounded-xl p-4 ring-1 ring-border` con la leyenda "Datos del recinto" y la ayuda "Queda en revisión: el administrador lo aprueba junto con el evento."). La primera vez se abre vacío con una zona (uuid de `crypto.randomUUID()`, `createManualVenue`).
  - **Desmarcado:** vuelve el `Select` y el bloque se oculta; lo escrito se conserva (al volver a marcarlo sigue ahí) pero no se valida ni se envía (`manualVenue.enabled: false`).
  - Al alternar, los tipos de entrada pasan a las secciones del modo activo (`syncTicketTypeRows`).
- **Campos del bloque manual** (controles `h-11`, `aria-invalid` y `aria-describedby` hacia la ayuda y el error, ids `organizer-event-manualVenue-<campo>`):

  | Campo | Control | Regla | Mensaje |
  |---|---|---|---|
  | Nombre del recinto | `Input`, placeholder "Ej.: Café La Esquina", `maxLength` 120 | Obligatorio, 2–120 caracteres | "Ingresa el nombre del recinto" / "El nombre del recinto debe tener al menos 2 caracteres" |
  | Dirección exacta | `Input`, ayuda "Calle y número, distrito. Ej.: Av. Larco 1150, Miraflores", `maxLength` 200 | Obligatoria, 10–200 caracteres | "Ingresa la dirección exacta del recinto" / "La dirección es muy corta: indica calle y número, distrito. Ej.: Av. Larco 1150, Miraflores" |
  | Ciudad | `Select` de `CITIES` (Lima, Arequipa, Cusco, Trujillo, Piura), placeholder "Elige la ciudad" | Una de la lista | "Elige una ciudad de la lista" |
  | Zonas | Filas (`role="group"` "Zona n", `rounded-lg bg-muted/50 p-3`): "Nombre de la zona" (placeholder "Ej.: General") \| "Aforo" (`type="number"`, 1–100 000) \| botón ghost `size-11` `Trash2` "Quitar zona n" (deshabilitado con una sola zona); debajo, "Agregar zona" (outline `h-11`, `Plus`; deshabilitado con 10 y "Máximo 10 zonas."). En una fila desde `@md` (container query) | 1–10 zonas generales, nombres distintos | "Ingresa el nombre de la zona" / "Ingresa el aforo de la zona" / "El aforo debe ser un número entero de 1 a 100,000" / "Cada zona necesita un nombre distinto" |

- **Dirección y mapa en las dos opciones** (`VenueLocationPreview`): con un recinto de la lista, su dirección (solo lectura, no se edita desde el evento); con el bloque manual, los valores escritos. Tarjeta `rounded-xl ring-1 ring-border` con `VenueMap` (el del detalle, click-to-load: Google no carga hasta pulsar «Ver mapa»; sin clave, solo el marcador decorativo), el nombre y "dirección, ciudad" en `<address>` y el enlace outline `h-11` «Abrir en Google Maps» (`ExternalLink`, pestaña nueva, `buildDirectionsUrl`). La consulta es la del detalle (`buildMapEmbedUrl` → `buildVenueQuery`: "Nombre, dirección, ciudad, Perú"), de la entrada `@/modules/events/map`. Si cambia la dirección, el mapa vuelve a «Ver mapa» (no recarga Google con cada tecla). En modo manual, mientras falte el nombre, la dirección o la ciudad: "Completa el nombre, la dirección y la ciudad para ver el recinto en el mapa.".
- **Tipos de entrada sobre las zonas:** `TicketTypesField` recibe las zonas como secciones generales (`toManualVenueSections`: sin nombre, "Zona n"; aforo no válido, 0) y funciona igual que con un recinto de la lista ("200 lugares de pie"). Añadir, quitar o renombrar zonas actualiza las filas: se conservan las de las zonas que siguen y una sin marcar toma el nombre nuevo.
- **Vista previa:** el lugar es el recinto manual ("Café La Esquina · Cusco", o lo que haya escrito).
- **Guardar:** crea (o, en borrador o en revisión, corrige) el recinto `pending_review` del organizador del evento con sus zonas, en la misma transacción que el evento. **Aprobación conjunta:** al aprobar el evento, el recinto pasa a `approved`; si se rechaza, sigue pendiente y editable.
- **Editar** un evento cuyo recinto sigue pendiente (ingresado a mano): el checkbox aparece marcado y el bloque relleno con su nombre, dirección, ciudad y zonas (con sus ids, así los tipos de entrada guardados siguen marcados).

### Imagen de portada (`CoverImageField` + `ImageUpload`)

- **Pestañas** (`Tabs`, `aria-label="Origen de la portada"`, triggers `h-11`, activa `bg-primary text-primary-foreground`): «Subir imagen» (por defecto) y «Usar URL». En Editar se abre en «Usar URL» si la portada guardada no es una URL de Vercel Blob (`*.public.blob.vercel-storage.com`); solo se decide al montar. Cambiar de pestaña no borra el valor. «Usar URL» queda deshabilitada mientras se comprueba o sube un archivo. El error de validación de la portada (`organizer-event-imageUrl-error`) va bajo las pestañas.
- **Subir imagen → vacío:** zona `rounded-2xl border-2 border-dashed bg-muted py-8` con `ImageUp`, "Arrastra una imagen aquí", "o", botón outline `h-11` "Seleccionar archivo" (el control de teclado; `aria-describedby` a los requisitos) y "JPG, PNG o WebP · Máx. 5 MB" / "Tamaño recomendado: 1920 × 1080 px (16:9)". Arrastrar es una mejora: el botón siempre funciona.
- **Estados:**
  - **Drag over:** zona `border-primary bg-accent` y "Suelta la imagen"; con vista previa, `ring-2 ring-primary` y la capa "Suelta la imagen".
  - **Validando** (tipo y peso al instante; luego medidas con `createImageBitmap`): "Comprobando la imagen…" (en la zona o en capa sobre la vista previa).
  - **Subiendo:** vista previa local con capa `bg-background/80`, `Spinner` y "Subiendo…"; botones, «Usar URL» y "Guardar borrador"/"Guardar cambios" deshabilitados; un segundo archivo se ignora. Estado anunciado en `role="status"` (`sr-only`).
  - **Éxito:** vista previa 16:9 de la URL de Blob, "1920 × 1080 px · 1.8 MB" (`tabular-nums`, peso `es-PE`), "Cambiar imagen" (outline) y "Eliminar" (destructive), ambos `h-11`.
  - **Preview existente** (Editar): la portada actual con "Cambiar imagen" y "Eliminar", sin medidas ni peso.
  - **Reemplazo:** como Subiendo; la portada actual sigue en `imageUrl` hasta que la nueva termina de subir.
  - **Error:** `role="alert"` `text-sm text-destructive`; `imageUrl` no cambia.
- **"Eliminar"** vacía la portada (un borrador puede quedar sin ella; "Enviar a revisión" la exige).
- **Advertencia < 1200 px** (no bloquea, la imagen se sube): `TriangleAlert` `text-warning` + "La imagen mide {w} px de ancho; se recomienda al menos 1200 px para que no se vea borrosa".
- **Recortes** (bajo la vista previa, también durante la subida, con `EventCoverImage` `object-cover`): "Detalle 16:9" (`w-36`), "Hero escritorio 21:8" (`w-48`) y "Hero móvil 4:5" (`w-20`), con la nota "Deja lo importante en el centro: cada pantalla la recorta de forma distinta.".
- **Mensajes de error:** "Solo JPG, PNG o WebP", "La imagen pesa más de 5 MB", "No se pudo leer la imagen. Prueba con otro archivo" (sin llamar al servidor); de la ruta `/api/event-covers`: "Inicia sesión para subir imágenes" (401), "No tienes permiso para subir imágenes" (403), "No puedes cambiar la portada de este evento" (403), "No se pudo subir la imagen" (400), "La subida de imágenes no está configurada en este entorno. Usa la pestaña “Usar URL”." (503); fallo de Blob o de red: "No se pudo subir la imagen. Inténtalo de nuevo".

### Tipos de entrada (`TicketTypesField`)

- Sin recinto: `<p className="text-sm text-muted-foreground">` "Elige el recinto para configurar los tipos de entrada."; recinto sin secciones: "Este recinto aún no tiene secciones configuradas.". Con el recinto manual, las secciones son sus zonas (ver "Recinto").
- **Una fila por sección** del recinto, en su orden: `<div role="group" aria-labelledby>` `rounded-xl p-4 ring-1 ring-border` (`ring-primary/40` si está marcada) con h3 del nombre de la sección (`font-semibold`) y su capacidad a la derecha (`text-sm text-muted-foreground tabular-nums`: "1,000 lugares de pie" en una general; "240 asientos numerados" en una numerada).
  - `Checkbox` "Vender entradas en esta sección" (`Field orientation="horizontal"`, `min-h-11`), sin marcar por defecto.
  - "Nombre del tipo de entrada" (por defecto, el nombre de la sección; `maxLength` 100) y "Precio (S/)" (`type="number"`, `min` 0, `step` 0.01), en `@md:grid-cols-[minmax(0,1fr)_160px]` (container query de la fila); deshabilitados mientras la sección no se vende.
  - Una fila marcada exige nombre ("Ingresa el nombre del tipo de entrada") y precio ("Ingresa el precio"; "El precio debe ser un número de 0 o más, con hasta 2 decimales"; "El precio no puede superar S/ 100,000"). Las filas sin marcar no se validan ni se guardan.
- Cambiar de recinto reinicia las filas (sin marcar, con el nombre de cada sección).
- Pie "Capacidad a la venta": suma de la capacidad de las secciones marcadas ("1,240 entradas"). La capacidad la fija el recinto; no se piden filas, asientos ni cantidades.
- **Al guardar**, cada fila marcada es un `ticket_type` de esa sección (UNIQUE(evento, sección)) con su precio en céntimos, su posición como orden, el slug de la sección y el máximo por compra de la compra (10). Al editar se reemplazan todos (un borrador no tiene órdenes ni inventario).

### Vista previa (`EventPreviewCard`)

Replica la anatomía de `EventCard` (MASTER §7) sin enlaces ni botones reales (Decisión 8 de `design-alignment-account-views`): `EventCard` no se reutiliza porque exige un `Event` completo y renderiza enlaces. Vertical en `lg`; por debajo, la tarjeta horizontal tipo entrada (variante `ticket` de `EventCard`).

```
lg (vertical, columna de 340 px)            < lg (horizontal, tipo entrada)
┌──────────────────────────────┐            ┌─────────◗─────────────────────────────┐
│┌───┐                         │            │┌───┐    ┆ CONCIERTOS                   │
││DIC│      imagen h-44        │            ││DIC│    ┆ Festival de verano (2 l.)    │
││05 │                         │            ││05 │    ┆ ◎ Estadio Nacional · Lima    │
│└───┘                         │            │└───┘    ┆ ▣ sáb 5 dic                  │
├──────────────────────────────┤            │ 108 px  ┆ Desde                        │
│ CONCIERTOS                   │            │         ┆ S/ 120.00                    │
│ Festival de verano (2 l.)    │            └─────────◗─────────────────────────────┘
│ ◎ Estadio Nacional · Lima    │              min-h-32; borde izquierdo discontinuo del cuerpo;
│ ▣ sáb 5 dic                  │              muescas en las esquinas derechas de la imagen;
◖┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄◗              sin talón horizontal ni "Ver entradas"
│ Desde                        │
│ S/ 120.00     [Ver entradas] │  falso botón aria-hidden
└──────────────────────────────┘
```

- **Datos** (`buildEventPreview`, tipo `EventPreview`): `dateLabel` es la fecha corta de la tarjeta ("sáb 5 dic", `formatShortDayMonth`) y `dateChip` las partes del chip (`{ month: "DIC", day: "05" }`, `getDateChipParts`), ambas de `@/modules/events/format`; las dos son `null` sin fecha válida. `place` es el recinto elegido (o el manual) y su ciudad ("Estadio Nacional · Lima"; del manual, solo lo escrito; `null` sin recinto). `priceFrom` es el menor precio válido de las secciones marcadas. `imageUrl` es la URL de la portada solo si es una URL `https` válida (la misma regla que al guardar). Sin hora en la tarjeta, como `EventCard`.
- **Contenedor:** `Card` `gap-0 overflow-hidden rounded-2xl py-0 ring-1 ring-border`; por debajo de `lg`, `max-lg:flex-row max-lg:min-h-32`.
- **Imagen:** `relative h-44 shrink-0` (`max-lg:h-auto max-lg:w-27`, 108 px) con la portada (`next/image` `fill` `unoptimized`, porque la URL puede ser de cualquier dominio; `object-cover`, `alt=""`: ya está descrita en "Imagen de portada") o, sin portada, un bloque `bg-muted` con `ImageIcon` (`size-8 text-muted-foreground`, `aria-hidden`).
- **Chip de fecha:** `DateChip` compartido en `absolute top-3 left-3` (`max-lg:top-2 max-lg:left-2`). Sin fecha muestra el marcador "MES" / "--" atenuado (`placeholder`).
- **Cuerpo** (`CardContent` `flex flex-1 flex-col gap-1.5 p-4`; `max-lg:gap-1 max-lg:px-3.5 max-lg:pt-3 max-lg:pb-2`):
  - overline de categoría (`text-xs font-bold tracking-wider text-primary-strong uppercase`);
  - h3 del título (`line-clamp-2 text-base leading-snug font-bold md:text-lg`);
  - lugar con `MapPin` (`truncate`) y fecha con `CalendarDays`, ambos `text-sm font-medium text-muted-foreground` con icono `size-4` `aria-hidden`.
  - Por debajo de `lg`, el bloque de cuerpo y pie lleva `max-lg:border-l max-lg:border-dashed max-lg:border-border`.
- **Talón** (solo `lg`): `<span aria-hidden>` `relative mt-auto block border-t border-dashed border-border max-lg:hidden` con dos muescas centradas en la línea (`-left-2.5` / `-right-2.5`, `-translate-y-1/2`). Es un `span` y no un `div aria-hidden` porque el formulario reserva ese patrón al plano de asientos.
- **Muescas:** `size-5 rounded-full bg-muted ring-1 ring-border`, del color del fondo del panel; el `overflow-hidden` de `Card` las recorta a media luna. Por debajo de `lg` van en las esquinas derechas de la imagen (`-top-2.5 -right-2.5` y `-right-2.5 -bottom-2.5`, `lg:hidden`), sobre la línea discontinua vertical.
- **Pie:** `flex flex-wrap items-end justify-between gap-3 p-4` (`max-lg:flex-nowrap max-lg:items-center max-lg:px-3.5 max-lg:pt-0 max-lg:pb-3`):
  - con precio: "Desde" (`block text-xs font-medium text-muted-foreground`) y el precio (`block text-xl font-extrabold tracking-tight tabular-nums`, `max-lg:text-base`), en el color del texto: el azul se reserva para la acción;
  - precio 0: "Entrada libre", sin "Desde";
  - sin precio: "Desde" + "S/ —" en `text-muted-foreground`;
  - a la derecha (solo `lg`), el falso botón "Ver entradas": `<span aria-hidden>` con `buttonVariants({ variant: "outline" })` + `pointer-events-none h-11 rounded-xl px-4 font-semibold text-primary-strong max-lg:hidden`.
- **Marcadores** (`text-muted-foreground`): "Nombre del evento", "Lugar · Ciudad", "Fecha por definir", chip "MES" / "--" y "S/ —". Sin categoría elegida, la overline muestra el marcador "Categoría".
- **Sin badge "Disponible"**: `EventCard` tampoco lo muestra (es el caso normal).
- **Nada enfocable:** sin enlaces ni botones reales; chip, talón, muescas y falso botón son decorativos (`aria-hidden`).
- No muestra los tipos de entrada ni la capacidad: `EventCard` del listado tampoco los muestra.

## Comunes

- Breakpoint del panel: `lg` (1024 px) para sidebar, tabla, formulario en dos columnas y barra estática. Entre `lg` y `xl` la tabla de Eventos es compacta (ver "Lista").
- Sin scroll horizontal a 375 / 768 / 1024 / 1440 (tampoco dentro de la tabla); `Popover` del `DatePicker` (`collisionPadding` 16) y menú "Más acciones" dentro del viewport; targets ≥ 44 px (`h-11`); foco visible; solo tokens; iconos `lucide-react` con `aria-hidden`; sin emojis.
