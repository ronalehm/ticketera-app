# Página: panel de organizador `/organizador` y `/organizador/eventos/nuevo`

> Override de `../MASTER.md` para estas páginas. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/organizer-dashboard.md` (Fase 1: panel; Fase 2: formulario y guardado; Fase 3: portada y vista previa).
> Shell a pantalla completa (sidebar, barra móvil, tarjeta de usuario, fondo `bg-muted`, "Volver al resumen"): `docs/specs/layout-fullscreen-shells.md` (Fase 3). Prevalece sobre el layout, la navegación y la ausencia de sesión de `organizer-dashboard`.
> "Mis eventos" (tarjeta con barra de cabecera solo en `lg`) y la vista previa de Crear evento (anatomía de `EventCard`): `docs/specs/design-alignment-account-views.md` (Fase 2). Prevalece sobre el requisito 23 de `layout-fullscreen-shells` F3 y sobre la decisión 4 de `organizer-dashboard` (marcadores y badge "Disponible" de la vista previa).
> Crear evento, modo de ubicación ("Mapa de asientos"), "Ciudad" como `Select`, portada obligatoria con guía y recortes, y "Descripción (opcional)" / "Máximo por compra" por tipo de entrada: `docs/specs/organizer-event-seating-mode.md` (Fase 1). Prevalece sobre `organizer-event-seating` y `organizer-dashboard` en esos puntos (subtítulo de "Tipos de entrada", ciudad de texto libre, portada opcional, "no se pide descripción por tipo").

Panel para quien organiza eventos: ver cómo van las ventas (KPIs y lista de eventos) y crear un evento nuevo. Es una **maqueta con datos mock**: sin backend, sin sesión obligatoria ni roles; los eventos creados solo existen en este navegador (`localStorage`, clave `mentec-organizer-events`). Del diseño de referencia (`OrgDashboard*.dc.html`, `OrgCreate*.dc.html`) se toman estructura, flujo y textos; la identidad visual es la de Mentec (tokens, Creato Display), nunca el índigo/Poppins ni la marca "Ticketera" del diseño. La marca visible es "Mentec Tickets · Organizadores" (`OrganizerBrand`, en el sidebar y en la barra móvil).

## Layout común `/organizador/*`

**Pantalla completa:** sin header ni footer del sitio. `app/organizador` vive fuera del route group `app/(site)`, así que no usa `SiteShell`; el panel tiene su propio shell.

### Escritorio (`lg+`)

```
┌──── 240px · bg-background · border-r ────┬──────────── 1fr · bg-muted ────────────────────┐
│ [logo Mentec] → /                         │  <main> px-10 py-10                             │
│ Organizadores                             │  ┌──────── mx-auto max-w-6xl ───────────────┐   │
│                                           │  │ contenido de la página                   │   │
│ ▣ Resumen          (activo: bg-accent)    │  │                                          │   │
│ + Crear evento                            │  │                                          │   │
│                                           │  │                                          │   │
│                                           │  │                                          │   │
│ ───────────────────────────────────────── │  │                                          │   │
│ (AQ) Ana Quispe                           │  │                                          │   │
│      demo@mentectickets.pe                │  │                                          │   │
│ [ ⇥  Cerrar sesión                    ]   │  └──────────────────────────────────────────┘   │
└──── sticky top-0 · h-dvh ─────────────────┴─────────────────────────────────────────────────┘
```

- `app/organizador/layout.tsx` (Server Component, `LayoutProps<"/organizador">`, metadata `robots: { index: false }`):
  ```tsx
  <div className="flex-1 bg-muted lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
    <OrganizerSidebar />
    <OrganizerMobileBar />
    <main className="min-w-0 px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">{children}</div>
    </main>
  </div>
  ```
  El layout aporta el único `<main>` (el root layout ya no lo tiene). El contenido va sobre `bg-muted`; las tarjetas blancas (`bg-card`) destacan sobre él.
- **`OrganizerSidebar`** (server): `<header className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col lg:gap-8 lg:overflow-y-auto lg:border-r lg:bg-background lg:px-4 lg:py-6">`. Orden: `OrganizerBrand` (en `px-2`), `OrganizerNav` y, abajo (`mt-auto border-t pt-4`), `OrganizerUserCard`. Se queda fijo a toda la altura de la ventana al hacer scroll; si no cabe, hace scroll propio.

### Móvil (`< lg`)

```
┌──────────── header sticky top-0 · h-16 · bg-background · border-b ────────────┐
│ [logo Mentec] → /                                                       [≡]   │  botón 44×44
│ Organizadores                                                                  │
└────────────────────────────────────────────────────────────────────────────────┘
<main> px-4 py-6 (md: px-6 py-8) sobre bg-muted

Sheet desde la izquierda (al pulsar ≡):
┌──────────────────────────────┐
│ Panel de organizador     [✕] │  SheetTitle
│ ▣ Resumen                    │
│ + Crear evento               │
│                              │
│ ──────────────────────────── │
│ (AQ) Ana Quispe              │
│      demo@mentectickets.pe   │
│ [ ⇥  Cerrar sesión       ]   │
└──────────────────────────────┘
```

- **`OrganizerMobileBar`** (cliente, `Sheet` controlado con `useState`): `<header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b bg-background px-4 lg:hidden">` con `OrganizerBrand` y un `SheetTrigger` `aria-label="Abrir menú del panel"` (`buttonVariants({ variant: "ghost", size: "icon" })` + `size-11 cursor-pointer`, icono `Menu size-5`).
- `SheetContent side="left"` (`overflow-y-auto`): `SheetHeader` con `SheetTitle` "Panel de organizador" y, debajo, `flex flex-1 flex-col gap-6 px-4 pb-6` con `<OrganizerNav onNavigate={() => setOpen(false)} />` y `<div className="mt-auto border-t pt-4"><OrganizerUserCard /></div>`.
- Al elegir un enlace, el `Sheet` se cierra. Base UI mueve el foco al abrir, cierra con Escape y devuelve el foco al disparador.
- Sustituye a los chips horizontales de la primera versión: sin header global, el menú también tiene que alojar la sesión.

### Marca (`OrganizerBrand`, server)

- `<div className="flex flex-col gap-0.5">` con:
  - `<Link href="/" aria-label="Mentec Tickets: ir al inicio">` (`inline-flex min-h-11 items-center self-start rounded-lg`, foco `focus-visible:ring-3 focus-visible:ring-ring/50`) que contiene `<BrandLogo className="h-7 w-auto" />`. El nombre accesible incluye el nombre visible de la marca (WCAG 2.5.3).
  - `<p className="px-0.5 text-xs font-medium text-muted-foreground">Organizadores</p>`.
- La misma marca en el sidebar y en la barra móvil. Es el único enlace al sitio público.

### Navegación (`OrganizerNav`, cliente)

- `<nav aria-label="Panel de organizador">` con lista **vertical** en todos los anchos (`flex flex-col gap-1`). Sin overline ni chips.
- Enlaces: "Resumen" (`LayoutDashboard`, `/organizador`) y "Crear evento" (`Plus`, `/organizador/eventos/nuevo`). Icono `size-5` `aria-hidden`.
- Items `flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium`, transición 200 ms, foco `focus-visible:ring-3 focus-visible:ring-ring/50`.
  - Activo (ruta exacta): `aria-current="page"` + `bg-accent font-semibold text-accent-foreground`.
  - Inactivo: `text-muted-foreground hover:bg-muted hover:text-foreground`.
- Prop opcional `onNavigate`, que se llama al pulsar cualquier enlace (la usa la barra móvil para cerrar el `Sheet`).
- **Solo destinos reales**: "Mis eventos", "Ventas" y "Configuración" no aparecen (ni deshabilitados ni como "Próximamente"). "Mis eventos" no tiene ruta propia: la lista vive en Resumen, y un ancla compartiría `aria-current` con "Resumen".

### Tarjeta de usuario (`OrganizerUserCard`, cliente)

```
Con sesión                                Sin sesión
(AQ)  Ana Quispe                          [ →  Iniciar sesión          ]  → /login
      demo@mentectickets.pe
[ ⇥  Cerrar sesión                 ]
```

- **Regla de sesión:** lee `useAuthStore` (`user`, `signOut`) desde la entrada pública `@/modules/auth/session` y la rehidrata al montar (`useAuthStore.persist.rehydrate()`, patrón de `AuthHeaderActions`).
  - **Sin sesión el panel sigue accesible** (sin redirección: un bloqueo solo en cliente no protege nada). La tarjeta muestra el enlace "Iniciar sesión" (`LogIn`) hacia `/login`.
  - **"Cerrar sesión"** llama a `signOut()` y navega a `/` (el panel no se queda en la página, a diferencia del menú del header del sitio).
- **Con sesión:** `flex flex-col gap-3` con:
  - `UserSummary` (`@/components/shared/UserSummary`): avatar `UserAvatar size="lg"` de 40 px con las iniciales (`bg-accent text-accent-foreground`, p. ej. "AQ"), nombre completo (`font-semibold`) y correo (`text-sm text-muted-foreground`).
  - Debajo, `Button variant="outline"` "Cerrar sesión" con icono `LogOut` (`aria-hidden`) y texto, **a todo el ancho** (`h-11 w-full cursor-pointer gap-2`).
- Sin sesión: enlace con `buttonVariants({ variant: "outline" })` y las mismas clases de ancho completo.
- **Sin truncado:** nombres y correos largos hacen salto de línea (`wrap-break-word` / `wrap-anywhere` de `UserSummary`), sin salirse de la tarjeta ni provocar scroll horizontal. Con el botón debajo (y no un botón solo-icono al lado) el texto dispone de ~155 px en el sidebar de 240 px y el botón tiene etiqueta visible.
- Es la misma composición que el bloque "Tu cuenta" del `Sheet` del sitio (tarjeta + "Cerrar sesión" outline a todo el ancho). No compone `Avatar` ni calcula iniciales: lo hace `UserSummary` → `UserAvatar`.

### Landmarks y accesibilidad

- El sidebar (`lg`) y la barra móvil (`< lg`) son `<header>`; solo uno es visible en cada breakpoint y el otro tiene `display: none`, así que hay un único `banner` y una única `nav` "Panel de organizador" (con el `Sheet` cerrado).
- Un único `<main>` (el del layout) y un único `<h1>` por página. El `<header>` interno de Resumen (h1 + "Crear evento") queda dentro de `<main>`, así que no es un `banner`.
- Todo lo interactivo mide 44 px o más (`h-11`, `min-h-11`, `size-11`) y muestra foco visible.

## Resumen `/organizador`

### Layout

```
h1 "Resumen"                                         [+ Crear evento]
Así van las ventas de tus eventos.
[Alert de guardado]                                   (Fase 2, solo con ?guardado=)
┌──────────────┬──────────────┬──────────────┐
│ ▥ Ingresos   │ ▤ Entradas   │ ▦ Eventos     │  <dl>; lg: 3 columnas
│ S/ 1,387,530 │ vendidas 8,146│ publicados 3 │  móvil: Ingresos fila completa,
└──────────────┴──────────────┴──────────────┘  los otros dos en la siguiente
lg: una sola tarjeta (bg-card rounded-2xl ring-1 ring-border overflow-hidden), sin relleno propio
┌─────────────────────────────────────────────────────────────────────────────────┐
│ h2 "Mis eventos" (18 px)                    [Todos|Publicados|Borradores]       │  barra de cabecera px-6 py-4
├─────────────────────────────────────────────────────────────────────────────────┤  border-b
│ EVENTO                       ESTADO     VENDIDAS              INGRESOS          │  cabecera: mayúsculas text-xs, sin fondo
├─────────────────────────────────────────────────────────────────────────────────┤
│ [img] Título                 Publicado  7,420 / 8,000 vendidas  S/ 1,335,600.00 │  filas px-6 py-3.5, a sangre
│       SÁB 14 NOV · 21:00 · Lima          ▓▓▓▓▓▓▓▓▓░                              │
├─────────────────────────────────────────────────────────────────────────────────┤  border-b entre filas
│ [img] Título                 Borrador   0 / 500 vendidas                     —  │  la última sin borde
└─────────────────────────────────────────────────────────────────────────────────┘

< lg: sin contenedor, todo directamente sobre el bg-muted del panel
h2 "Mis eventos"
[ Todos | Publicados | Borradores ]          pista bg-secondary, segmento elegido bg-background
┌──────────────────────────────────────┐
│ [img] Título (2 líneas)   [Publicado]│     <li> bg-card rounded-2xl ring-1 ring-border p-4
│       SÁB 14 NOV · 21:00 · Lima      │
│ 7,420 / 8,000 vendidas  S/ 1,335,600 │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░          │
└──────────────────────────────────────┘
```

- **"Mis eventos" sin tarjeta dentro de tarjeta** (Decisión 10 de `design-alignment-account-views`):
  - **Sección:** `<section aria-labelledby className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:bg-card lg:ring-1 lg:ring-border">`. En `lg` es una sola tarjeta blanca sin relleno: la barra de cabecera y la tabla llevan su propio `px-6`. Por debajo de `lg` no tiene contenedor: el h2, el filtro y las tarjetas van directamente sobre el `bg-muted` del panel, como en el diseño móvil.
  - **Barra de cabecera:** `<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:border-b lg:px-6 lg:py-4">` con el h2 "Mis eventos" (`text-lg font-bold`, 18 px; antes `text-2xl md:text-3xl`) y el filtro a la derecha desde `md`. En `lg`, su `border-b` la separa de la tabla.
  - **Pista del filtro:** `bg-secondary` por debajo de `lg` (sobre `bg-muted` no se vería) y `bg-muted` en `lg` (dentro de la tarjeta blanca). El segmento elegido es `bg-background`.

- Encabezado: h1 `text-3xl md:text-4xl font-extrabold tracking-tight` (único h1), párrafo `text-muted-foreground`. "Crear evento" es un enlace con aspecto de botón primario (`Plus`, `h-11`, `font-semibold`, `hover:bg-primary-strong`): a todo el ancho en móvil y a la derecha en `md+`.
- **KPIs** (Decisión 14): `<dl>` `grid-cols-2 lg:grid-cols-3 gap-4`; cada tarjeta `rounded-2xl ring-1 ring-border bg-card p-5 md:p-6` con `<dt>` (icono + etiqueta, `text-sm text-muted-foreground`) y `<dd>` (`text-2xl md:text-3xl font-bold tabular-nums`). Orden único en el DOM: Ingresos (`ChartColumn`, `col-span-2 lg:col-span-1`), Entradas vendidas (`Ticket`), Eventos publicados (`CalendarDays`). La etiqueta es siempre "Eventos publicados". Los KPIs resumen todos los eventos: el filtro no los cambia.
- **Filtro**: `ToggleGroup` de selección única, `aria-label="Filtrar eventos por estado"`, control segmentado `rounded-lg bg-secondary p-1 lg:bg-muted`; items `h-11 px-4 text-muted-foreground`, seleccionado (`aria-pressed`) `bg-background font-semibold text-foreground shadow-sm`. Móvil: `grid grid-cols-3 w-full`; desde `md`, `flex w-fit`. Deseleccionar vuelve a "Todos".
- **Lista** (Decisión 13): tabla en `lg` (`hidden lg:block`) y tarjetas por debajo (`lg:hidden`); `display:none` evita duplicados en el árbol de accesibilidad. Ambas nombradas por el h2 (`aria-labelledby`).
  - **Tabla a sangre** (`lg`): el contenedor es solo `hidden lg:block`, sin anillo, radio ni `overflow-hidden` propios (los pone la sección). `TableHeader` sin fondo; su fila, `hover:bg-transparent`.
  - **Cabecera:** "Evento", "Estado", "Vendidas" e "Ingresos" (esta alineada a la derecha) con `h-11 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase`. El `px-6` alinea las columnas con el h2 de la barra de cabecera.
  - **Celdas:** `px-6 py-3.5`. Las filas conservan el `border-b` de shadcn; la última no lo tiene (`TableBody` de shadcn quita el borde a `tr:last-child`), así que la tarjeta termina sin línea doble.
  - Celda Evento: `<th scope="row">` de peso normal (`h-auto w-full max-w-0`: ocupa el espacio libre y el título se trunca en vez de ensanchar la tabla), miniatura `next/image` `size-12 rounded-lg object-cover` (`alt=""`), título `font-semibold truncate`, "fecha · ciudad" `text-sm text-muted-foreground`.
  - Celda Vendidas: bloque `w-48 space-y-2` con el conteo y la barra. Celda Ingresos: `text-right font-semibold tabular-nums`.
  - **Tarjetas** (< `lg`): `<ul className="space-y-3 lg:hidden">`; cada `<li>` `space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border` (blanca con anillo sobre el `bg-muted` del panel). Contenido: miniatura + h3 (`line-clamp-2 leading-snug font-bold`) + "fecha · ciudad" + badge; debajo, vendidas e ingresos; al final, la barra.
  - **Sin columna de acción** (Decisión 3): sin "Ver ventas" ni "Editar" hasta que existan esas pantallas.
- **Vacío por filtro:** `<p>` "No tienes eventos con este estado." con `rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border lg:m-6 lg:bg-muted lg:ring-0`. En `lg` es un bloque gris dentro de la tarjeta (con 24 px de margen); por debajo, un bloque blanco con anillo sobre el fondo gris del panel.

### Reglas específicas

- **Badges de estado** (texto, nunca solo color): "Publicado" `bg-accent text-accent-foreground`; "Borrador" `bg-secondary text-secondary-foreground`.
- **Avance de ventas**: "**7,420** / 8,000 vendidas" (`tabular-nums`) + `Progress` de shadcn con `value` = porcentaje entero 0–100, `aria-label="Entradas vendidas de <título>"` y `aria-valuetext` "7,420 de 8,000 vendidas" (`getAriaValueText`). Capacidad 0 → 0 %.
- **Ingresos**: `formatEventPrice` (`S/ 1,335,600.00`) para publicados (vendidas × precio desde, aproximación de maqueta). Borradores: "—" `aria-hidden` + `sr-only` "Sin ingresos".
- **Marcadores**: sin fecha → "Fecha por definir"; sin ciudad → se omite " · ciudad"; sin imagen → bloque `size-12 rounded-lg bg-muted` con `ImageIcon` `aria-hidden`.
- Formatos: importes `S/ 1,387,530.00`, conteos `Intl.NumberFormat("es-PE")` (`8,146`), fechas `SÁB 14 NOV · 21:00`.
- **Aviso de guardado** (Fase 2): `?guardado=publicado|borrador` (cualquier otro valor se ignora) muestra un `Alert` (`CircleCheck`) entre el encabezado y los KPIs: "Evento publicado" / "Borrador guardado".
- Metadata: `Panel de organizador | Mentec Tickets`.

## Crear evento `/organizador/eventos/nuevo` (Fases 2 y 3)

> Asientos y precio por zona (Fase 1) y datos del evento público (Fase 2): `docs/specs/organizer-event-seating.md`, ampliación de la spec del panel.
> Modo de ubicación, ciudad, portada obligatoria y campos nuevos de cada tipo de entrada: `docs/specs/organizer-event-seating-mode.md` (Fase 1).

### Layout

```
← Volver al resumen                                   → /organizador, ~8 px sobre el h1
h1 "Crear evento"
┌──────────────────────────────────┬──────────────┐
│ Información básica               │ VISTA PREVIA │  lg: grilla 1fr | 340px, gap-8
│ Nombre del evento                │ [tarjeta]    │  vista previa sticky lg:top-10
│ Categoría | Edad mínima          │ Así verán tu │
│ Descripción · Organizador        │ evento…      │
├──────────────────────────────────┤              │
│ Fecha y lugar                    │              │
│ Fecha | Hora | Apertura puertas  │              │
│ Lugar | Ciudad [Select ▾]        │              │
│ Dirección                        │              │
├──────────────────────────────────┤              │
│ Imagen de portada  (dropzone)    │              │
│ guía del centro                  │              │
│ "Así se recorta tu portada" (con │              │
│  imagen: 5 recortes)             │              │
├──────────────────────────────────┤              │
│ Mapa de asientos                 │              │  sección nueva (modo de ubicación)
│ ¿Cómo se ubica el público?       │              │
│ [Sin asientos][Con mapa][Mixto]  │              │  md: 3 columnas · móvil: apiladas
├──────────────────────────────────┤              │
│ Tipos de entrada                 │              │
│ (sin modo: solo la indicación)   │              │
│ ┌ Tipo 1 ──────────────────── ✕ ┐│              │
│ │ Nombre | Precio (S/)          ││              │
│ │ Descripción | Máx. por compra ││              │
│ │ Ubicación [General] [Numerada]││              │  solo en modo "Mixto"
│ │ campos de capacidad           ││              │
│ │ [plano] (solo numerada)       ││              │
│ └───────────────────────────────┘│              │
│ [+ Agregar tipo de entrada]      │              │
│ Capacidad total      1,500 entr. │              │
└──────────────────────────────────┘              │
                 [Guardar borrador] [Publicar evento]   lg: estática, a la derecha
Móvil: secciones → vista previa (tarjeta horizontal) → barra sticky [Guardar borrador | Publicar]
```

- **"Volver al resumen"** (equivale al "← Mis eventos" del diseño: la lista vive en Resumen): el h1 va dentro de `<div className="flex flex-col gap-2">`, precedido de un `Link` a `/organizador` con `ArrowLeft size-4` (`aria-hidden`) y clases `inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground`, foco `focus-visible:ring-3 focus-visible:ring-ring/50`. Así queda pegado al h1 y no separado por el `gap` de la raíz. El h1 y su clase no cambian.
- Secciones en `Card rounded-2xl` con h2 `text-lg font-bold` (blancas sobre el `bg-muted` del panel).
- **Mapa de asientos**: sección nueva entre "Imagen de portada" y "Tipos de entrada" con el selector del modo de ubicación (ver "Mapa de asientos (modo de ubicación)").
- **Tipos de entrada**: subtítulo "Cada tipo de entrada es una zona con su precio y su capacidad." (sustituye a "Cada tipo es una zona con su precio: general (de pie) o numerada (con filas y asientos)."). Su contenido depende del modo elegido arriba (ver "Tipos de entrada según el modo"). Cada tipo es un bloque `<fieldset>` en todos los anchos (ver "Bloque por tipo de entrada"). Una fila inicial, no dos. "Agregar tipo de entrada" lleva el foco al Nombre de la nueva; al quitar, el foco pasa a "Agregar tipo de entrada". Pie "Capacidad total" (ver "Precio y capacidad").
- **Barra de acciones** (Decisión 12): por debajo de `lg`, `sticky bottom-0` (no `fixed`) con `border-t bg-background` y `env(safe-area-inset-bottom)`; se queda abajo mientras se rellena. Sus márgenes negativos (`-mx-4 md:-mx-6`) coinciden con el `px-4 md:px-6` del `<main>` del panel. Los controles llevan `scroll-mb-28 lg:scroll-mb-0` para no quedar tapados al enfocarlos. El primario muestra "Publicar" en móvil con nombre accesible "Publicar evento".
- **Imagen de portada** (dropzone): `<label>` con borde discontinuo `border-primary/40 bg-accent rounded-2xl` (`h-36` móvil / `h-44` `lg`, `ImagePlus`), input file `sr-only` (PNG/JPEG) cuyo foco se ve en la zona; admite arrastrar y soltar. Con imagen: vista previa `aspect-video` + "Cambiar imagen" / "Quitar imagen" (`h-11`). Solo vista previa local: no se guarda. **Obligatoria al publicar**, con guía, validación al elegir y "Así se recorta tu portada" (ver "Imagen de portada").
- **Vista previa**: `<aside aria-labelledby>` (`flex flex-col gap-3 self-start`), sticky en `lg` a `lg:top-10` (ya no hay header global de 64 px que compensar), con el h2 "Vista previa" como overline (`text-xs font-bold tracking-wider text-muted-foreground uppercase`), `EventPreviewCard` y el texto "Así verán tu evento los compradores en el listado." (`text-sm text-muted-foreground`). Anatomía de la tarjeta en "Vista previa (`EventPreviewCard`)".
- Categorías: las 6 del proyecto (por defecto "Conciertos").
- Metadata: `Crear evento | Mentec Tickets`.

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

- **Datos** (`buildEventPreview`, tipo `EventPreview`): `dateLabel` es la fecha corta de la tarjeta ("sáb 5 dic", `formatShortDayMonth`) y `dateChip` las partes del chip (`{ month: "DIC", day: "05" }`, `getDateChipParts`), ambas de `@/modules/events/format`; las dos son `null` sin fecha válida. `place` une lugar y ciudad con `" · "` ("Estadio Nacional · Lima"; solo "Lima" si falta el lugar). Sin hora en la tarjeta, como `EventCard`.
- **Contenedor:** `Card` `gap-0 overflow-hidden rounded-2xl py-0 ring-1 ring-border`; por debajo de `lg`, `max-lg:flex-row max-lg:min-h-32`.
- **Imagen:** `relative h-44 shrink-0` (`max-lg:h-auto max-lg:w-27`, 108 px) con la portada (`next/image` `fill`, `object-cover`, `alt=""`: ya está descrita en "Imagen de portada") o, sin portada, un bloque `bg-muted` con `ImageIcon` (`size-8 text-muted-foreground`, `aria-hidden`).
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
- **Marcadores** (`text-muted-foreground`): "Nombre del evento", "Lugar · Ciudad", "Fecha por definir", chip "MES" / "--" y "S/ —". La categoría nunca falta (por defecto "Conciertos").
- **Sin badge "Disponible"**: `EventCard` tampoco lo muestra (es el caso normal).
- **Nada enfocable:** sin enlaces ni botones reales; chip, talón, muescas y falso botón son decorativos (`aria-hidden`).
- **No cambia con `organizer-event-seating-mode`** (decisión 10): no muestra el modo de ubicación, la descripción ni el máximo por compra de los tipos de entrada, porque `EventCard` del listado tampoco los muestra. La ciudad es ahora siempre un valor de la lista ("Estadio Nacional · Lima").

### Datos del evento público

Campos que la página de detalle del evento muestra y que el formulario no pedía: "Organizador" ("Organiza: …"), "Edad mínima" ("Información importante"), "Apertura de puertas" (junto a la hora de inicio) y "Dirección" ("Lugar" y "Cómo llegar"). No se piden slug, destacado ni estado. La descripción por tipo de entrada sí se pide desde `organizer-event-seating-mode` (ver "Bloque por tipo de entrada"), y "Ciudad" pasa a ser un `Select` (ver "Ciudad").

```
Información básica                                   1440 (md+)              375
Nombre del evento                                    todo el ancho           todo el ancho
Categoría            │ Edad mínima                   md:grid-cols-2 gap-4    una debajo de la otra
Descripción                                          sin cambios
Organizador                                          todo el ancho           todo el ancho
Aparece en la página del evento como «Organiza: …».

Fecha y lugar
Fecha │ Hora de inicio │ Apertura de puertas         md:grid-cols-3 gap-4    Fecha | Hora de inicio
                                                                             Apertura | (vacío)
Lugar │ Ciudad [Select ▾]                            sin cambios de grilla
Dirección                                            todo el ancho           todo el ancho
```

- **"Edad mínima"** (junto a "Categoría"): `Select` de shadcn con `items={MIN_AGE_LABELS}` (el trigger muestra la etiqueta, no el valor). Opciones "Todo público" (por defecto), "+12", "+14", "+16" y "+18"; valores en código `"0"`, `"12"`, `"14"`, `"16"`, `"18"`. Mismo formato que el detalle del evento (`0` → "Todo público", `n` → "+n"). Se opera con teclado; desde la UI nunca da error.
- **"Organizador"** (después de "Descripción"): `Input` con placeholder "Ej. Pulso Producciones" y `maxLength={100}`, con `FieldDescription` "Aparece en la página del evento como «Organiza: …»." (no hay perfil de organizador del que tomarlo).
- **"Apertura de puertas"** (tercera columna de la grilla de fecha): `Input type="time"`, del mismo día que el evento y a la hora de inicio o antes. En móvil, la grilla es `grid-cols-2`: Fecha y Hora de inicio comparten la primera línea y Apertura queda en la segunda, en la primera columna.
- **"Dirección"** (debajo de "Lugar" y "Ciudad", a todo el ancho): `Input` con placeholder "Ej. Av. José Díaz s/n, Cercado de Lima" y `maxLength={150}`.
- **Patrón de campo** igual que el resto del formulario: `Field` con `data-invalid`, `aria-invalid`, `aria-describedby` hacia `FieldError` con id, validación al salir del campo tras el primer intento y clases `scroll-mb-*` para no quedar bajo la barra sticky.
- **Validación al publicar** (el borrador sigue exigiendo solo el nombre). Mensajes, uno por campo:

  | Campo | Regla | Mensaje |
  |---|---|---|
  | Organizador | Vacío (con trim) | "Indica el nombre del organizador" |
  | Apertura de puertas | Vacía o sin formato `HH:MM` | "Indica la hora de apertura de puertas" |
  | Apertura de puertas | Posterior a una hora de inicio válida (la misma hora es válida) | "La apertura de puertas debe ser a la hora de inicio o antes" |
  | Dirección | Vacía (con trim) | "Indica la dirección del lugar" |

  Al publicar con errores, el foco va al primer campo inválido en el orden del formulario ("Nombre del evento" si el formulario está vacío).
- **No se guardan**: estos cuatro valores no pasan al evento guardado (`OrganizerEvent`, `localStorage` `mentec-organizer-events`) ni cambian la tarjeta de "Vista previa". Solo se piden y se validan.

### Ciudad

- **`Select` de shadcn** en lugar del `Input` de texto libre, en el mismo sitio (junto a "Lugar"). Opciones: exactamente `CITIES` de `@/modules/events/format` (Lima, Arequipa, Cusco, Trujillo y Piura), la misma lista que el filtro público de `/eventos`, para que un evento publicado sea filtrable. `items` = `CITIES` (la etiqueta es el propio nombre).
- **Sin valor inicial:** `""`, ninguna opción marcada, con `SelectValue placeholder="Elige la ciudad"` (sustituye al placeholder "Ej. Lima").
- **Accesibilidad:** `SelectTrigger id="organizer-event-city"`, así que la etiqueta visible "Ciudad" (`FieldLabel htmlFor`) sigue asociada; `aria-invalid` y `aria-describedby` hacia `FieldError`. Se opera con teclado (comportamiento de Base UI). Mismas clases de alto y scroll que "Categoría" y "Edad mínima" (`h-11`, `scroll-mb-*`).
- **Validación al publicar:** vacía o fuera de `CITIES` → "Elige la ciudad" (sustituye a "Indica la ciudad"). Tras el primer intento, cambiar el valor revalida, como "Categoría". En borrador no da error.
- La tarjeta de "Vista previa" muestra la ciudad elegida ("Estadio Nacional · Lima"). Se guarda en `OrganizerEvent.city` como hoy, ahora siempre como un valor de `CITIES`. Añadir una ciudad es editar esa constante (el filtro público también la ofrece).

### Imagen de portada

Es la imagen principal de la página del evento ("landing" dentro de Mentec) y la que se recorta en el listado y en el inicio. Componentes: `CoverImageField` (zona de subida, vista previa y botones) y `CoverCropPreview` (recortes, presentacional).

```
Sin imagen                                       Con imagen
┌─────────────── dropzone ───────────────┐       ┌──────── vista previa aspect-video ────────┐
│                [ImagePlus]              │       │                                           │
│ Arrastra una imagen o haz clic…         │       └───────────────────────────────────────────┘
│ JPG o PNG, hasta 5 MB. Recomendado:     │       [Cambiar imagen] [Quitar imagen]
│ 1920 × 1080 px (16:9); mínimo           │       guía del centro
│ 1200 × 675 px.                          │       Así se recorta tu portada            (h3)
└─────────────────────────────────────────┘       ┌──────────────┬──────────────┬──────┐  md: 3 columnas
guía del centro (siempre visible)                 │ 16:9         │ 4:3          │ 2:1  │  móvil: 2 columnas
[FieldError]                                      │ Pág. · móvil │ Pág. · escr. │ List.│
                                                  ├──────────────┴──────────────┼──────┤
                                                  │ 21:8 (col-span-2)           │ 4:5  │
                                                  │ Inicio · escritorio         │ Ini. │
                                                  └─────────────────────────────┴──────┘
                                                  Los recortes de «Inicio» solo se usan si…
```

- **Texto de ayuda de la zona de subida** (el `span` con id `-hint` al que apunta el `aria-describedby` del input; sustituye a "JPG o PNG, horizontal (16:9)"): "JPG o PNG, hasta 5 MB. Recomendado: 1920 × 1080 px (16:9); mínimo 1200 × 675 px.".
- **Guía bajo el campo**, siempre visible, con o sin imagen (`text-sm text-muted-foreground`): "Es la imagen principal de la página de tu evento. Deja lo importante (rostros, texto, logo) en el centro: cada pantalla la recorta de forma distinta.". Motivo: el hero del detalle es 16:9 en móvil y ~4:3 en `lg`, la tarjeta del listado ~2:1 y el carrusel de inicio 21:8 en `lg` y 4:5 en móvil; en los casos extremos solo queda a la vista el 45 % central del ancho y el 68 % central del alto.
- **Reglas** (`COVER_IMAGE_RULES`, definidas una sola vez en código y usadas por la validación y los textos): JPG o PNG, hasta 5 MB, al menos 1200 × 675 px; se recomienda 1920 × 1080 (16:9).
- **Validación al elegir o soltar un archivo** (`getCoverImageError`, asíncrona: lee el tamaño con `createImageBitmap`). Se muestra el primer error que aplique, en este orden, y **se conserva la imagen anterior**:

  | Orden | Regla | Mensaje |
  |---|---|---|
  | 1 | Tipo distinto de JPG o PNG | "Sube una imagen en formato JPG o PNG." |
  | 2 | Peso mayor de 5 MB | "La imagen pesa más de 5 MB. Sube una más liviana." |
  | 3 | No se puede leer | "No se pudo leer la imagen. Prueba con otro archivo." |
  | 4 | Menor que 1200 × 675 px | "La imagen debe medir al menos 1200 × 675 px." |

- **Orden:** el esquema es orientativo en la posición relativa de la guía, el error y los recortes; la spec fija que la guía va "bajo el campo" y que los recortes van "bajo la vista previa actual".
- **Obligatoria al publicar** (valor `hasCoverImage` del formulario: `true` al aceptar una imagen, `false` al quitarla; el archivo sigue fuera del store). Sin portada: "Sube la imagen de portada", en el mismo `FieldError` del campo. El error de archivo tiene prioridad sobre el de obligatoriedad. El `input` de la zona de subida (sin imagen) lleva `aria-invalid`, así que recibe el foco si es el primer error. Con vista previa, el `input` oculto **no** lleva `aria-invalid`: no se puede enfocar y un archivo rechazado con imagen previa no bloquea el envío, así que no debe atraer el foco al publicar (iría al siguiente campo con error); el error se enlaza a "Cambiar imagen" con `aria-describedby`. En borrador no da error.
- **"Así se recorta tu portada"** (`CoverCropPreview`, solo con imagen, bajo la vista previa actual):
  - título `h3` "Así se recorta tu portada" (`text-sm font-semibold`);
  - grilla `grid grid-flow-row-dense grid-cols-2 items-start gap-3 md:grid-cols-3` de `<figure>`. `grid-flow-row-dense` hace que en móvil (2 columnas) «Inicio · móvil» rellene el hueco que deja «Listado de eventos» antes del recorte de 2 columnas, así que en móvil se ve **antes** que «Inicio · escritorio» (en `md`, 3 columnas, se mantiene el orden de la tabla); `items-start` evita que cada figura se estire al alto de su fila y deforme el marco. Cada uno: marco `relative overflow-hidden rounded-lg bg-muted` con su `aspect-*` y la imagen (`next/image` `fill` `unoptimized` `object-cover`, `alt=""`: decorativa, el texto la describe), más `<figcaption className="text-xs text-muted-foreground">`:

    | Pie | Proporción | Extra |
    |---|---|---|
    | "Página del evento · móvil" | `aspect-[16/9]` | — |
    | "Página del evento · escritorio" | `aspect-[4/3]` | — |
    | "Listado de eventos" | `aspect-[2/1]` | — |
    | "Inicio · escritorio" | `aspect-[21/8]` | `col-span-2` |
    | "Inicio · móvil" | `aspect-[4/5]` | — |

  - debajo, la nota "Los recortes de «Inicio» solo se usan si Mentec destaca tu evento en la portada.".
  - Sin scroll horizontal a 375 ni a 1440. No se instala `aspect-ratio` de shadcn: basta la utilidad `aspect-[x/y]` de Tailwind.

### Mapa de asientos (modo de ubicación)

Decisión a nivel de evento: si quien compra elegirá su asiento en un plano. Componente `SeatingModeField` (cliente), en una `FormSection` propia entre "Imagen de portada" y "Tipos de entrada".

```
Mapa de asientos                                                         h2 (FormSection)
Define si quien compra elegirá su asiento en un plano. De esto depende cómo configuras los tipos de entrada.
¿Cómo se ubica el público?                                               text-sm font-medium
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│ ○ [PersonStanding]      │ │ ○ [Armchair]            │ │ ○ [Layers]              │  md: grid-cols-3
│ Sin asientos numerados  │ │ Con mapa de asientos    │ │ Mixto                   │  móvil: una debajo
│ Todas las zonas son     │ │ Todas las zonas tienen  │ │ Zonas de pie y zonas    │  de otra
│ generales (de pie)…     │ │ filas y asientos…       │ │ numeradas, como campo…  │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
[FieldError]
```

- **Sección:** `FormSection` titulada "Mapa de asientos", con la descripción "Define si quien compra elegirá su asiento en un plano. De esto depende cómo configuras los tipos de entrada.".
- **Etiqueta del grupo:** texto visible "¿Cómo se ubica el público?" (`text-sm font-medium`), al que apunta el `aria-labelledby` del `RadioGroup`.
- **Tarjetas:** mismo patrón "choice card" que "Ubicación" (`FieldLabel` > `Field orientation="horizontal"` > `RadioGroupItem` + icono `aria-hidden` + `FieldTitle` + línea `text-sm text-muted-foreground` enlazada con `aria-describedby`), para que la explicación se lea antes de elegir. Valores en código `seatingMode` (los de `kind` más `mixed`):

  | Valor | Título | Icono | Línea |
  |---|---|---|---|
  | `general` | "Sin asientos numerados" | `PersonStanding` | "Todas las zonas son generales (de pie). Quien compra elige cuántas entradas quiere." |
  | `numbered` | "Con mapa de asientos" | `Armchair` | "Todas las zonas tienen filas y asientos. Quien compra elige su asiento en el plano." |
  | `mixed` | "Mixto" | `Layers` | "Zonas de pie y zonas numeradas, como campo y tribunas. Quien compra elige asiento solo en las numeradas." |

- **Disposición:** `grid gap-3 md:grid-cols-3`; en móvil, una tarjeta debajo de otra (cada una ≥ 44 px). Tarjetas `min-h-11 cursor-pointer`; la elegida, `has-data-checked:border-primary has-data-checked:bg-accent` (más el radio marcado: el estado nunca depende solo del color).
- **Sin valor por defecto:** ninguna opción marcada al entrar. El pedido es que el organizador *elija*; un valor por defecto permitiría publicar sin decidir.
- **Teclado:** Tab entra en el grupo y las flechas cambian la opción (Base UI); foco visible.
- **Al elegir:** se fija `seatingMode`, las filas se ajustan al modo (`applySeatingMode`, ver "Tipos de entrada según el modo") y se revalidan `seatingMode` y `ticketTypes`.
- **Errores** (solo al publicar): `aria-invalid` en el `RadioGroup` y `aria-describedby` hacia `FieldError` con id `organizer-event-seatingMode-error`. Recibe el foco si es el primer campo inválido.

  | Regla | Mensaje |
  |---|---|
  | Sin modo | "Elige cómo se ubica el público" |
  | "Mixto" sin al menos una zona general y una numerada | "Un evento mixto necesita al menos una zona general (de pie) y una numerada" |

  El error de "Mixto" se muestra en el selector y no en la lista de tipos: es el control que recibe el foco y el mensaje dice cómo corregirlo. Cambiar, agregar o quitar una fila revalida el modo, así que el error desaparece en cuanto hay una zona de cada tipo.
- **Qué ve quien compra** (lo explica cada línea): con mapa del recinto, las zonas numeradas se eligen asiento por asiento en el plano (`/eventos/[slug]/entradas`) y las generales por cantidad; sin mapa, se elige la cantidad de cada tipo (`TicketSelector`).
- **No se guarda** en `OrganizerEvent` ni en `localStorage` (decisión 11 de la spec): nadie lo lee hasta que el evento vaya a la BD. Tampoco cambia la tarjeta de "Vista previa".

### Tipos de entrada según el modo

| Modo | Contenido de "Tipos de entrada" | Grupo "Ubicación" por fila | Fila nueva |
|---|---|---|---|
| Sin elegir | Solo `<p className="text-sm text-muted-foreground">` "Elige arriba cómo se ubica el público para configurar los tipos de entrada." Sin filas, sin "Agregar tipo de entrada" ni "Capacidad total" | — | — |
| "Sin asientos numerados" (`general`) | Filas, todas `general` ("Cantidad") | Oculto (no se renderiza) | `general` |
| "Con mapa de asientos" (`numbered`) | Filas, todas `numbered` ("Filas", "Asientos por fila", "Cantidad" de solo lectura y plano) | Oculto (no se renderiza) | `numbered` |
| "Mixto" (`mixed`) | Filas tal como estaban | Visible, como en "Tarjetas «Ubicación»" | `general` |

- **Elegir un modo cambia el `kind` de las filas** (no se deriva al leer): así validación, capacidad y plano siguen leyendo el tipo de cada fila sin cambios.
- **Nada se pierde al cambiar de modo:** la cantidad de "General" y las filas/asientos de "Numerada" se conservan (una fila general con Cantidad 100 sigue en 100 tras pasar por "Con mapa de asientos" y volver). Sin modo, las filas siguen en el estado aunque no se vean.
- Cambiar una fila, agregarla o quitarla revalida `ticketTypes` y `seatingMode`.

### Bloque por tipo de entrada

```
┌ Tipo 1 ─────────────────────────────────────── [✕] ┐  <fieldset> rounded-xl ring-1 ring-border p-4
│ Nombre                         │ Precio (S/)       │   md: 1fr | 160px · móvil: uno debajo del otro
│ Descripción (opcional)         │ Máximo por compra │   misma grilla; [10] por defecto
│ Se muestra bajo el nombre…     │ Entradas de este… │   FieldDescription de cada uno
│ Ubicación                                          │   solo en modo "Mixto"
│ ┌──────────────────────┐ ┌──────────────────────┐  │   tarjetas de elección, grid-cols-2 gap-3
│ │ ◉ General (de pie)   │ │ ○ Numerada           │  │   (también en móvil)
│ │ Sin asiento asignado │ │ Filas y asientos num.│  │
│ └──────────────────────┘ └──────────────────────┘  │
│ General:  Cantidad (media columna desde md)        │
│ Numerada: Filas | Asientos por fila | Cantidad     │   md: 3 columnas · móvil: Filas | Asientos,
│                                       (solo lect.) │          Cantidad debajo a todo el ancho
│ ┌──────────────── figure bg-muted ────────────────┐│   solo numerada
│ │            [ ESCENARIO ]                        ││
│ │            ○ ○ ○ ○ ○ ○ ○ ○                      ││
│ │            ○ ○ ○ ○ ○ ○ ○ ○                      ││
│ │Filas A–J · 20 asientos por fila · S/ 120.00 c/u ││  figcaption
│ └─────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────┘
```

- **Orden en el DOM**: cabecera → Nombre | Precio → Descripción (opcional) | Máximo por compra → "Ubicación" (solo en modo "Mixto") → campos de capacidad → vista previa del plano (solo numerada). Contenedor `<fieldset>` `rounded-xl ring-1 ring-border p-4 flex flex-col gap-4`.
- **Cabecera**: `<legend>` "Tipo n" (`text-sm font-semibold`) **visible en todos los anchos** (ya no es `lg:sr-only`) y, a la derecha, botón `Trash2` con `aria-label="Quitar tipo de entrada n"` (deshabilitado con una sola fila). Las etiquetas de cada campo son visibles en todos los anchos; **no hay** fila de cabeceras `aria-hidden` en `lg` (el bloque ya no cabe en una línea de tabla).
- **Nombre y Precio (S/)**: mismos inputs, placeholders y atributos que antes. Grilla `md:grid-cols-[minmax(0,1fr)_160px] gap-4`.
- **Descripción (opcional) y Máximo por compra**: segunda línea, en una grilla con las mismas columnas (`md:grid-cols-[minmax(0,1fr)_160px] gap-4`; en móvil, uno debajo del otro). Usan el patrón `TicketTypeInputField` (ids `ticket-type-<id>-description` y `ticket-type-<id>-maxPerOrder`, `aria-invalid`, `aria-describedby` hacia la ayuda y el error):
  - **"Descripción (opcional)"**: `Input` (una línea, no `Textarea`), placeholder "Ej. Campo de pie, sin ubicación asignada.", `maxLength={150}`, con `FieldDescription` "Se muestra bajo el nombre al elegir entradas." (`TicketSelector` la muestra bajo el nombre del tipo).
  - **"Máximo por compra"**: `Input type="number" inputMode="numeric" min=1 max=10 step=1`, valor inicial `"10"` (el tope global de la compra, `MAX_TICKETS_PER_ORDER` de `@/modules/events/purchase`), con `FieldDescription` "Entradas de este tipo en una misma compra (1 a 10).".
  - **Validación al publicar** (el borrador no los valida), un mensaje por campo:

    | Campo | Regla | Mensaje |
    |---|---|---|
    | Descripción (opcional) | Más de 150 caracteres (con trim) | "La descripción debe tener como máximo 150 caracteres" |
    | Máximo por compra | Vacío | "Ingresa el máximo por compra" |
    | Máximo por compra | No es un entero entre 1 y 10 ("0", "11", "2.5") | "El máximo por compra debe ser un número entero entre 1 y 10" |

  - **No se guardan** en `OrganizerEvent` ni en `localStorage` (decisión 11 de la spec) ni cambian la tarjeta de "Vista previa". El máximo por compra tampoco limita todavía la compra (sigue el tope global de 10) ni cambia la "Capacidad total".
- **Campos y errores**: patrón común del formulario (`Field` con `data-invalid`, `aria-invalid`, `aria-describedby` hacia `FieldError` con id; ids únicos por fila). Controles con `scroll-mb-28 lg:scroll-mb-0 scroll-mt-24` para no quedar bajo la barra sticky ni el header.

### Tarjetas "Ubicación"

- **Solo en modo "Mixto"** (ver "Tipos de entrada según el modo"). En "Sin asientos numerados" y "Con mapa de asientos" el grupo no se renderiza y la fila muestra los campos del tipo forzado.
- `RadioGroup` de shadcn (Base UI) con `aria-labelledby` hacia el texto visible "Ubicación" (`text-sm font-medium`). Patrón "choice card" de `PaymentMethodFields` (ver `checkout.md`): cada opción es un `FieldLabel` con `htmlFor` que contiene un `Field orientation="horizontal"` con `RadioGroupItem`, icono `aria-hidden` y `FieldTitle`, más una línea `text-sm text-muted-foreground`.
- Opciones (valores en código `kind: "general" | "numbered"`, como `VenueZoneLayout.kind` de seating):

  | Opción | Icono | Línea |
  |---|---|---|
  | "General (de pie)" (por defecto en filas nuevas de "Mixto") | `PersonStanding` | "Sin asiento asignado" |
  | "Numerada" | `Armchair` | "Filas y asientos numerados" |

- Grilla `grid-cols-2 gap-3` en todos los anchos; tarjetas `min-h-11 cursor-pointer`. Elegida: `has-data-checked:border-primary has-data-checked:bg-accent` (más el radio marcado: el estado nunca depende solo del color).
- Teclado: Tab entra en la opción marcada y las flechas cambian la selección (comportamiento nativo de Base UI); foco visible.
- **Cambiar de opción no borra datos**: la cantidad de "General" y las filas/asientos de "Numerada" se conservan al ir y volver. Solo se validan y cuentan los campos de la opción elegida. Tras el primer intento de envío, cambiar la opción revalida.

### Campos de capacidad

- **General (de pie)**: "Cantidad" (`type="number" inputMode="numeric" min=1 step=1`, placeholder "0"), en media columna desde `md`.
- **Numerada**: grilla `grid-cols-2 md:grid-cols-3 gap-4`:
  - "Filas": `type="number" inputMode="numeric" min=1 max=30 step=1`, placeholder "0".
  - "Asientos por fila": `min=1 max=60`, resto igual.
  - **"Cantidad" de solo lectura** (`col-span-2 md:col-span-1`): `Input` con `readOnly`, `bg-muted` y `tabular-nums`; enfocable, con nombre accesible "Cantidad" y `aria-describedby` hacia la descripción "Filas × asientos por fila" (`FieldDescription`). Valor = filas × asientos con `formatCount` ("1,800"); vacío con placeholder "—" mientras filas o asientos no son válidos.

### Vista previa del plano (solo zonas numeradas)

- Si filas y asientos por fila son enteros dentro de los límites: `<figure>` `rounded-lg bg-muted p-3 md:p-4 flex flex-col gap-2` con `SeatGridPreview` (de `seating`, entrada `@/modules/seating/preview`) y `<figcaption className="text-sm text-muted-foreground">`.
- Si no: en lugar del `figure`, solo `<p className="text-sm text-muted-foreground">` "Indica las filas (1 a 30) y los asientos por fila (1 a 60) para ver el plano.". También en borrador: un valor fuera de rango (p. ej. 500) nunca dibuja un plano.
- **Barra "Escenario"** en HTML, encima del plano (no dentro del SVG, para que el texto nunca baje de 12 px): `rounded-md bg-foreground py-1 text-center text-xs font-bold uppercase tracking-widest text-background`, ancho `max(ancho del plano, 160 px)` sin superar el contenedor, centrada.
- **Asientos**: misma forma "Disponible" que el plano de compra (`SeatShape`, círculo `fill-background stroke-primary`; ver `ticket-selection.md`) y mismo paso entre asientos. Fila A la más cercana al escenario; asientos 1…n de izquierda a derecha. Todos disponibles: es una vista previa, sin estados de compra ni leyenda.
- **Tamaño**: SVG `block h-auto w-full max-h-64 mx-auto` con `max-width` = ancho natural del plano. **Nunca se agranda por encima de 1 px por unidad** (un asiento mide como máximo 24 px); se reduce para caber en el bloque, sin scroll horizontal a 375 ni a 1440 (30 × 60 incluido).
- **Accesibilidad**: barra + SVG son decorativos (`aria-hidden`) y sin elementos enfocables. La información va en texto en el `figcaption`, legible con o sin lector de pantalla:
  - "Filas A–J · 20 asientos por fila · S/ 120.00 c/u"
  - "Fila A · 1 asiento por fila" (sin precio)
  - "… · Entrada libre" (precio 0)
  - "Filas A–AD · 60 asientos por fila" (máximo)

### Límites

- **1–30 filas y 1–60 asientos por fila** por zona numerada (como máximo 1,800 asientos). Con 30 filas, la última es "AD". Definidos una sola vez en código (`SEAT_GRID_LIMITS`); los usan validación, textos de ayuda y los `max` de los inputs.
- Se validan **al publicar** (el borrador sigue exigiendo solo el nombre). Mensajes, uno por campo:

  | Campo | Vacío | Fuera de rango o no entero |
  |---|---|---|
  | Filas | "Ingresa el número de filas" | "Las filas deben ser un número entero entre 1 y 30" |
  | Asientos por fila | "Ingresa los asientos por fila" | "Los asientos por fila deben ser un número entero entre 1 y 60" |

- Zonas rectangulares: todas las filas con el mismo número de asientos; sin pasillos, filas de distinta longitud ni asientos accesibles o bloqueados. Filas siempre con letras (A, B… Z, AA…), nunca con números.

### Precio y capacidad

- **Precio por zona**: todos los asientos de una zona cuestan su "Precio (S/)"; sin recargo por fila ni precio por asiento. En la vista previa se muestra como "S/ X c/u", igual que el plano de compra.
- **"Capacidad total"** suma la cantidad de las zonas generales y filas × asientos de las numeradas; una zona con valores no válidos no suma. La capacidad del evento guardado se calcula igual.

## Comunes

- Breakpoint del panel: `lg` (1024 px) para sidebar, tabla, formulario en dos columnas y barra estática.
- Sin scroll horizontal a 375 / 768 / 1024 / 1440; targets ≥ 44 px (`h-11`); foco visible; solo tokens; iconos `lucide-react` con `aria-hidden`; sin emojis.
