# Página: selección de entradas `/eventos/[slug]/entradas`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER. Spec: `docs/specs/seating-ticket-selection.md`.

Paso 1 de 3 de la compra. Solo existe para los eventos con mapa del recinto (`hasVenueMap`); el resto da el 404 del evento ("No encontramos este evento").

## Layout

```
Header sticky     (igual que la landing)
Stepper           franja border-b: ① Entradas — ② Datos y pago — ③ Confirmación · "Compra segura"
                  (móvil: "Paso 1 de 3" + "Elige tus entradas" + barra de progreso al 33 %)
← Volver al evento
[mini] h1 Título del evento
       SÁB 14 NOV · 21:00 · Estadio Nacional, Lima
┌──────────────────────────────┬──────────────┐
│ Elige tu zona   Toca una zona│ Tu compra    │  columna derecha 380px,
│ [mapa SVG: escenario + zonas]│ (sticky)     │  sticky lg:top-24
├──────────────────────────────┤              │
│ Entradas                     │              │
│ ■ VIP [Últimas]   [− 0 +]    │              │
│ ■ General         [− 0 +]    │              │
│ ■ Tribuna Norte  próximamente│              │
│ Máximo 10 entradas por compra│              │
└──────────────────────────────┴──────────────┘
Barra inferior (< lg)  Total · 0 entradas / S/ 0.00   [Continuar →]
Footer            (igual que la landing)
```

- Stepper (`components/shared/PurchaseStepper`) fuera del contenedor, a ancho completo, con su propio `max-w-7xl`.
- Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 pt-6 md:pt-8 lg:pb-12`, `flex flex-col gap-6`. Sin padding inferior por debajo de `lg`: la barra móvil es el último elemento y llega al footer.
- Grilla `lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8`. Columna izquierda `min-w-0`: mapa → lista. Columna derecha: "Tu compra", `hidden lg:flex lg:sticky lg:top-24 self-start`.
- Barra inferior móvil `sticky bottom-0 z-30 lg:hidden`, a ancho completo (`-mx-4 md:-mx-6`), con `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`. Es `sticky`, no `fixed`: se queda pegada abajo al desplazarse y no tapa el footer al final.
- **Orden móvil = orden del DOM.** Por breakpoint solo se alternan el resumen (`lg+`) y la barra (`< lg`); `display:none` saca al oculto del árbol de accesibilidad, así que nunca hay duplicados para los lectores.
- h1 único: título del evento (`text-2xl md:text-3xl font-bold tracking-tight`), junto a una miniatura decorativa `size-13 md:size-16 rounded-xl` (`alt=""`).
- Tarjetas (mapa, lista, resumen): `Card rounded-2xl`, h2 `text-xl font-bold tracking-tight`.

## Tonos por precio (mapa y listas)

Se asignan por rango de precio entre las zonas **no agotadas**, de mayor a menor (`getZoneTones`). Precios iguales comparten tono; desde el 4.º precio distinto todos usan `tier-4`. El texto siempre acompaña al color (nombre y precio o "Agotado").

| Tono | Forma (SVG) | Texto en el mapa | Muestra en listas |
|---|---|---|---|
| `tier-1` (más caro) | `fill-brand-navy` | `fill-background` | `bg-brand-navy` |
| `tier-2` | `fill-primary-strong` | `fill-primary-foreground` | `bg-primary-strong` |
| `tier-3` | `fill-highlight` | `fill-highlight-foreground` | `bg-highlight` |
| `tier-4` | `fill-accent stroke-primary/40` | `fill-foreground` | `bg-accent ring-1 ring-primary/40` |
| `sold-out` | `fill-secondary` | `fill-muted-foreground` + "Agotado" | `bg-secondary ring-1 ring-input` |

Muestra en listas: `size-3.5 rounded-sm`, `aria-hidden`.

## Mapa de zonas

- Lienzo `rounded-xl bg-muted p-3`; SVG `h-auto w-full` con `viewBox` de ≤ 600 de ancho y textos de ≥ 24 unidades (≥ 12 px a 375 px).
- Escenario: forma `fill-foreground`, texto `fill-background` en mayúsculas, `aria-hidden`.
- Etiqueta de zona (`aria-hidden`, `pointer-events-none`, centrada en `labelPos`): nombre en bold, precio o "Agotado" y, si quedan pocas, píldora `fill-warning` "Últimas entradas" (`fill-warning-foreground`).

### Estados de zona

| Estado | Mapa | Lista |
|---|---|---|
| Disponible | color del tono | nombre, "S/ X c/u" y stepper (de pie) |
| Últimas entradas (`low-stock`) | píldora "Últimas entradas" | `Badge` "Últimas entradas" `bg-warning text-warning-foreground` |
| Agotada (`sold-out`) | gris (`sold-out`) con "Agotado"; se puede activar, solo resalta su fila | etiqueta "Agotado" `h-11 rounded-lg bg-muted px-4 font-bold text-muted-foreground`, sin controles |
| Numerada (Fase 2) | color del tono; el `aria-label` añade "asientos numerados" | "Elección de asientos próximamente" (`text-sm text-muted-foreground`), sin stepper |
| Activa | halo exterior `stroke-brand-navy` de 8 unidades + trazo interior `stroke-background` de 3 | fila `bg-accent rounded-xl` |
| Foco (teclado) | trazo `stroke-ring` de 4 unidades discontinuo (`[stroke-dasharray:8_6]`), `outline-none` | anillo de foco de `Button` |
| Hover | `opacity-85`, transición 200 ms | — |

## Lista "Entradas"

- Una fila (`li`, `min-h-18`) por zona en el orden del mapa; separadas con `divide-y`.
- Stepper de zona de pie en pastilla (`rounded-xl border p-0.5`): "−" `secondary` y "+" primario, ambos `Button size-11`, con la cantidad en medio (`tabular-nums`, `aria-live="polite"`). Pulsarlo también activa la zona.
- "−" deshabilitado en 0 y todos los "+" al llegar a 10 entradas en total (`focusableWhenDisabled` + `aria-disabled:*`, como `TicketSelector`: no pierden el foco).
- Pie `<p role="status">`: "Máximo 10 entradas por compra." o, en el límite, "Llegaste al máximo de 10 entradas por compra.".

## Resumen "Tu compra" y barra móvil

- Vacío: caja `border-2 border-dashed border-input rounded-xl p-5` "Todavía no elegiste entradas. Toca una zona o usa los botones +.".
- Líneas "`<n>` × `<zona>`" con importe `tabular-nums font-bold`; separador `border-t-2 border-dashed`; "Total (n entradas)" con importe `text-2xl font-bold tabular-nums` (`aria-live="polite"`) y siempre "Precio final, sin cargos ocultos".
- CTA "Continuar" + `ArrowRight`: primario `h-11 font-semibold hover:bg-primary-strong`. Con 0 entradas es `<button disabled>`; con ≥ 1 es un enlace a `/checkout?evento=<slug>&<tipo>=<n>…`.
- Barra móvil: "Total · n entradas" (`text-xs text-muted-foreground`) + importe `text-xl font-bold tabular-nums` en un bloque `aria-live="polite"`, y "Continuar" (`h-11 px-6`) a la derecha.

## Accesibilidad

- Un solo `<h1>` (título del evento); h2 por tarjeta ("Elige tu zona", "Entradas", "Tu compra").
- Stepper: `<ol aria-label="Pasos de la compra">` siempre en el DOM (`sr-only` por debajo de `md`), paso actual con `aria-current="step"`; el bloque móvil visual es `aria-hidden`.
- Mapa: `<svg role="group" aria-label="Mapa de zonas de <recinto>">`; cada zona es un `<path role="button" tabIndex={0} aria-pressed>` con `aria-label` "<nombre>, <precio>" o "<nombre>, agotado", más ", asientos numerados" y ", últimas entradas" cuando aplica. Se activa con clic, Enter o Espacio (Espacio con `preventDefault`, no desplaza la página).
- Mapa y lista están sincronizados: activar una zona en el mapa resalta su fila y usar el stepper activa la zona del mapa.
- Cantidades y totales con `aria-live="polite"`; estados siempre con texto ("Últimas entradas", "Agotado"), nunca solo color.
- Targets ≥ 44 px (`h-11`/`size-11`), foco visible en todo lo interactivo, iconos `aria-hidden`.
- Sin scroll horizontal a 375 / 768 / 1024 / 1440.

## Metadata

- Título: `Elige tus entradas: <Título del evento> | Mentec Tickets`.
- Descripción: `Elige tu zona y tus entradas para <Título> en <Lugar>, <Ciudad>.`
- Solo se generan estáticamente los eventos con mapa.
