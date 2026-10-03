# Página: panel de organizador `/organizador` y `/organizador/eventos/nuevo`

> Override de `../MASTER.md` para estas páginas. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/organizer-dashboard.md` (Fase 1: panel; Fase 2: formulario y guardado; Fase 3: portada y vista previa).

Panel para quien organiza eventos: ver cómo van las ventas (KPIs y lista de eventos) y crear un evento nuevo. Es una **maqueta con datos mock**: sin backend, sin sesión obligatoria ni roles; los eventos creados solo existen en este navegador (`localStorage`, clave `mentec-organizer-events`). Del diseño de referencia (`OrgDashboard*.dc.html`, `OrgCreate*.dc.html`) se toman estructura, flujo y textos; la identidad visual es la de Mentec (tokens, Creato Display), nunca el índigo/Poppins del diseño. La marca visible es "Mentec Tickets" (header global).

## Layout común `/organizador/*`

```
Header sticky     (global, igual que la landing)
┌──────────────┬───────────────────────────────────────┐
│ PANEL DE     │ contenido de la página                │  lg: grilla 220px | 1fr, gap-10
│ ORGANIZADOR  │                                       │  nav sticky lg:top-24
│ ▣ Resumen    │                                       │
│ + Crear      │                                       │
│   evento     │                                       │
└──────────────┴───────────────────────────────────────┘
Footer            (global)

Móvil (< lg):
[▣ Resumen] [+ Crear evento]   chips h-11 rounded-full, scroll horizontal propio
contenido
```

- `app/organizador/layout.tsx` (Server Component): contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 md:py-12`; en `lg`, `grid-cols-[220px_minmax(0,1fr)] gap-10`. Dentro del `<main>` del layout raíz (no se añade otro).
- `OrganizerNav`: `<nav aria-label="Panel de organizador">`. Overline "Panel de organizador" solo en `lg` (sustituye al bloque de marca "Ticketera · Organizadores" del diseño: el logo ya está en el header).
  - Enlaces: "Resumen" (`LayoutDashboard`, `/organizador`) y "Crear evento" (`Plus`, `/organizador/eventos/nuevo`).
  - Activo (ruta exacta): `aria-current="page"` + `bg-accent text-accent-foreground font-semibold`.
  - `lg`: lista vertical, items `h-11 rounded-lg px-3`. Móvil: chips `h-11 rounded-full bg-muted` (patrón de `CategoryFilter`).
- **Solo destinos reales** (Decisión 2): "Mis eventos", "Ventas" y "Configuración" no aparecen (ni deshabilitados ni como "Próximamente"). En móvil no hay hamburguesa ni `Sheet`: con dos destinos bastan los chips. No hay bloque de usuario / "Cerrar sesión" en el panel: la sesión vive en el header global.
- Metadata del layout: `robots: { index: false }`.

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
h2 "Mis eventos"                  [Todos|Publicados|Borradores]
┌───────────────────────────┬──────────┬──────────────────┬───────────────┐
│ Evento                    │ Estado   │ Vendidas         │      Ingresos │  lg: <table>
│ [img] Título              │ Publicado│ 7,420 / 8,000    │ S/ 1,335,600.00│
│       SÁB 14 NOV · Lima   │          │ ▓▓▓▓▓▓▓▓▓░       │               │
└───────────────────────────┴──────────┴──────────────────┴───────────────┘
Móvil: <ul> de tarjetas (img + h3 + fecha · ciudad + badge / vendidas + ingresos / barra)
```

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

### Layout

```
h1 "Crear evento"
┌──────────────────────────────────┬──────────────┐
│ Información básica               │ VISTA PREVIA │  lg: grilla 1fr | 340px, gap-8
│ Nombre · Categoría · Descripción │ [tarjeta]    │  vista previa sticky lg:top-24
├──────────────────────────────────┤ Así verán tu │
│ Fecha y lugar                    │ evento…      │
│ Fecha | Hora · Lugar | Ciudad    │              │
├──────────────────────────────────┤              │
│ Imagen de portada  (dropzone)    │              │
├──────────────────────────────────┤              │
│ Tipos de entrada                 │              │
│ Nombre | Precio (S/) | Cantidad ✕│              │
│ [+ Agregar tipo de entrada]      │              │
│ Capacidad total      1,500 entr. │              │
└──────────────────────────────────┘              │
                 [Guardar borrador] [Publicar evento]   lg: estática, a la derecha
Móvil: secciones → vista previa (tarjeta horizontal) → barra sticky [Guardar borrador | Publicar]
```

- Secciones en `Card rounded-2xl` con h2 `text-lg font-bold`. Sin enlace "volver": "Resumen" está siempre en la navegación del panel.
- **Tipos de entrada**: cada fila es un `<fieldset>` con `<legend>` "Tipo n" (visible en móvil, `lg:sr-only`); en `lg`, fila de cabeceras `aria-hidden` que imita la tabla del diseño. Botón `Trash2` con `aria-label="Quitar tipo de entrada n"` (deshabilitado con una sola fila). Una fila inicial, no dos.
- **Barra de acciones** (Decisión 12): por debajo de `lg`, `sticky bottom-0` (no `fixed`) con `border-t bg-background` y `env(safe-area-inset-bottom)`; se queda abajo mientras se rellena y no tapa el footer. Los controles llevan `scroll-mb-28 lg:scroll-mb-0` para no quedar tapados al enfocarlos. El primario muestra "Publicar" en móvil con nombre accesible "Publicar evento".
- **Imagen de portada** (dropzone): `<label>` con borde discontinuo `border-primary/40 bg-accent rounded-2xl` (`h-36` móvil / `h-44` `lg`, `ImagePlus`), input file `sr-only` (PNG/JPEG) cuyo foco se ve en la zona; admite arrastrar y soltar. Error "Sube una imagen en formato JPG o PNG.". Con imagen: vista previa `aspect-video` + "Cambiar imagen" / "Quitar imagen" (`h-11`). Solo vista previa local: no se guarda.
- **Vista previa** (Decisión 4): `<aside>` con overline "Vista previa" y `EventPreviewCard` (anatomía de EventCard sin enlaces ni elementos enfocables; "Ver entradas" es un falso botón `aria-hidden`). Marcadores en `text-muted-foreground`: "Nombre del evento", "Fecha por definir", "Lugar, Ciudad", "Desde S/ —"; precio 0 → "Entrada libre". Móvil: tarjeta horizontal; `lg`: vertical.
- Categorías: las 6 del proyecto (por defecto "Conciertos").
- Metadata: `Crear evento | Mentec Tickets`.

## Comunes

- Breakpoint del panel: `lg` (1024 px) para sidebar, tabla, formulario en dos columnas y barra estática.
- Sin scroll horizontal a 375 / 768 / 1024 / 1440; targets ≥ 44 px (`h-11`); foco visible; solo tokens; iconos `lucide-react` con `aria-hidden`; sin emojis.
