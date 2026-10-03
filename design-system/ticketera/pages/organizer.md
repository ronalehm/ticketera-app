# Página: panel de organizador `/organizador` y `/organizador/eventos/nuevo`

> Override de `../MASTER.md` para estas páginas. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/organizer-dashboard.md` (Fase 1: panel; Fase 2: formulario y guardado; Fase 3: portada y vista previa).
> Shell a pantalla completa (sidebar, barra móvil, tarjeta de usuario, fondo `bg-muted`, "Volver al resumen"): `docs/specs/layout-fullscreen-shells.md` (Fase 3). Prevalece sobre el layout, la navegación y la ausencia de sesión de `organizer-dashboard`.
> "Mis eventos" en tarjeta es **provisional**: `docs/specs/design-alignment-account-views.md` (Fase 2) rehace después esa sección y la vista previa de Crear evento.

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
┌─ tarjeta bg-card rounded-2xl ring-1 ring-border p-4 md:p-6 (provisional) ──────┐
│ h2 "Mis eventos"                  [Todos|Publicados|Borradores]                 │
│ ┌───────────────────────────┬──────────┬──────────────────┬───────────────┐     │
│ │ Evento                    │ Estado   │ Vendidas         │      Ingresos │     │  lg: <table>
│ │ [img] Título              │ Publicado│ 7,420 / 8,000    │ S/ 1,335,600.00│    │
│ │       SÁB 14 NOV · Lima   │          │ ▓▓▓▓▓▓▓▓▓░       │               │     │
│ └───────────────────────────┴──────────┴──────────────────┴───────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────┘
Móvil: <ul> de tarjetas (img + h3 + fecha · ciudad + badge / vendidas + ingresos / barra)
```

- **"Mis eventos" en tarjeta (provisional):** la `<section aria-labelledby>` lleva `rounded-2xl bg-card p-4 ring-1 ring-border md:p-6`. Sobre el fondo `bg-muted` del panel, la pista del filtro segmentado y el bloque de vacío (ambos `bg-muted`) desaparecerían sin ella. `design-alignment-account-views` F2 reescribe esta sección (tarjeta solo en `lg` con barra de cabecera y tabla a sangre).

- Encabezado: h1 `text-3xl md:text-4xl font-extrabold tracking-tight` (único h1), párrafo `text-muted-foreground`. "Crear evento" es un enlace con aspecto de botón primario (`Plus`, `h-11`, `font-semibold`, `hover:bg-primary-strong`): a todo el ancho en móvil y a la derecha en `md+`.
- **KPIs** (Decisión 14): `<dl>` `grid-cols-2 lg:grid-cols-3 gap-4`; cada tarjeta `rounded-2xl ring-1 ring-border bg-card p-5 md:p-6` con `<dt>` (icono + etiqueta, `text-sm text-muted-foreground`) y `<dd>` (`text-2xl md:text-3xl font-bold tabular-nums`). Orden único en el DOM: Ingresos (`ChartColumn`, `col-span-2 lg:col-span-1`), Entradas vendidas (`Ticket`), Eventos publicados (`CalendarDays`). La etiqueta es siempre "Eventos publicados". Los KPIs resumen todos los eventos: el filtro no los cambia.
- **Filtro**: `ToggleGroup` de selección única, `aria-label="Filtrar eventos por estado"`, control segmentado `bg-muted p-1 rounded-lg`; items `h-11`, seleccionado `bg-background font-semibold shadow-sm`. Móvil: `grid grid-cols-3 w-full`. Deseleccionar vuelve a "Todos".
- **Lista** (Decisión 13): tabla en `lg` (`hidden lg:block`) y tarjetas por debajo (`lg:hidden`); `display:none` evita duplicados en el árbol de accesibilidad. Ambas nombradas por el h2 (`aria-labelledby`).
  - Celda Evento: `<th scope="row">` de peso normal, miniatura `next/image` `size-12 rounded-lg object-cover` (`alt=""`), título `font-semibold truncate`, "fecha · ciudad" `text-sm text-muted-foreground`.
  - **Sin columna de acción** (Decisión 3): sin "Ver ventas" ni "Editar" hasta que existan esas pantallas.
- Vacío por filtro: `<p>` "No tienes eventos con este estado." (`rounded-2xl bg-muted p-8 text-center text-muted-foreground`).

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
│ Lugar | Ciudad · Dirección       │              │
├──────────────────────────────────┤              │
│ Imagen de portada  (dropzone)    │              │
├──────────────────────────────────┤              │
│ Tipos de entrada                 │              │
│ ┌ Tipo 1 ──────────────────── ✕ ┐│              │
│ │ Nombre | Precio (S/)          ││              │
│ │ Ubicación [General] [Numerada]││              │
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
- **Tipos de entrada**: subtítulo "Cada tipo es una zona con su precio: general (de pie) o numerada (con filas y asientos).". Cada tipo es un bloque `<fieldset>` en todos los anchos (ver "Bloque por tipo de entrada"). Una fila inicial, no dos. "Agregar tipo de entrada" lleva el foco al Nombre de la nueva; al quitar, el foco pasa a "Agregar tipo de entrada". Pie "Capacidad total" (ver "Precio y capacidad").
- **Barra de acciones** (Decisión 12): por debajo de `lg`, `sticky bottom-0` (no `fixed`) con `border-t bg-background` y `env(safe-area-inset-bottom)`; se queda abajo mientras se rellena. Sus márgenes negativos (`-mx-4 md:-mx-6`) coinciden con el `px-4 md:px-6` del `<main>` del panel. Los controles llevan `scroll-mb-28 lg:scroll-mb-0` para no quedar tapados al enfocarlos. El primario muestra "Publicar" en móvil con nombre accesible "Publicar evento".
- **Imagen de portada** (dropzone): `<label>` con borde discontinuo `border-primary/40 bg-accent rounded-2xl` (`h-36` móvil / `h-44` `lg`, `ImagePlus`), input file `sr-only` (PNG/JPEG) cuyo foco se ve en la zona; admite arrastrar y soltar. Error "Sube una imagen en formato JPG o PNG.". Con imagen: vista previa `aspect-video` + "Cambiar imagen" / "Quitar imagen" (`h-11`). Solo vista previa local: no se guarda.
- **Vista previa** (Decisión 4): `<aside>` sticky en `lg` a `lg:top-10` (ya no hay header global de 64 px que compensar) con overline "Vista previa" y `EventPreviewCard` (anatomía de EventCard sin enlaces ni elementos enfocables; "Ver entradas" es un falso botón `aria-hidden`). Marcadores en `text-muted-foreground`: "Nombre del evento", "Fecha por definir", "Lugar, Ciudad", "Desde S/ —"; precio 0 → "Entrada libre". Móvil: tarjeta horizontal; `lg`: vertical.
- Categorías: las 6 del proyecto (por defecto "Conciertos").
- Metadata: `Crear evento | Mentec Tickets`.

### Datos del evento público

Campos que la página de detalle del evento muestra y que el formulario no pedía: "Organizador" ("Organiza: …"), "Edad mínima" ("Información importante"), "Apertura de puertas" (junto a la hora de inicio) y "Dirección" ("Lugar" y "Cómo llegar"). No se piden slug, destacado, estado ni descripción por tipo de entrada.

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
Lugar │ Ciudad                                       sin cambios
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

### Bloque por tipo de entrada

```
┌ Tipo 1 ─────────────────────────────────────── [✕] ┐  <fieldset> rounded-xl ring-1 ring-border p-4
│ Nombre                         │ Precio (S/)       │   md: 1fr | 160px · móvil: uno debajo del otro
│ Ubicación                                          │
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

- **Orden en el DOM**: cabecera → Nombre | Precio → "Ubicación" → campos de capacidad → vista previa del plano (solo numerada). Contenedor `<fieldset>` `rounded-xl ring-1 ring-border p-4 flex flex-col gap-4`.
- **Cabecera**: `<legend>` "Tipo n" (`text-sm font-semibold`) **visible en todos los anchos** (ya no es `lg:sr-only`) y, a la derecha, botón `Trash2` con `aria-label="Quitar tipo de entrada n"` (deshabilitado con una sola fila). Las etiquetas de cada campo son visibles en todos los anchos; **no hay** fila de cabeceras `aria-hidden` en `lg` (el bloque ya no cabe en una línea de tabla).
- **Nombre y Precio (S/)**: mismos inputs, placeholders y atributos que antes. Grilla `md:grid-cols-[minmax(0,1fr)_160px] gap-4`.
- **Campos y errores**: patrón común del formulario (`Field` con `data-invalid`, `aria-invalid`, `aria-describedby` hacia `FieldError` con id; ids únicos por fila). Controles con `scroll-mb-28 lg:scroll-mb-0 scroll-mt-24` para no quedar bajo la barra sticky ni el header.

### Tarjetas "Ubicación"

- `RadioGroup` de shadcn (Base UI) con `aria-labelledby` hacia el texto visible "Ubicación" (`text-sm font-medium`). Patrón "choice card" de `PaymentMethodFields` (ver `checkout.md`): cada opción es un `FieldLabel` con `htmlFor` que contiene un `Field orientation="horizontal"` con `RadioGroupItem`, icono `aria-hidden` y `FieldTitle`, más una línea `text-sm text-muted-foreground`.
- Opciones (valores en código `kind: "general" | "numbered"`, como `VenueZoneLayout.kind` de seating):

  | Opción | Icono | Línea |
  |---|---|---|
  | "General (de pie)" (por defecto) | `PersonStanding` | "Sin asiento asignado" |
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
