# Página: detalle de evento `/eventos/[slug]`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER.
> Spec: `docs/specs/events-ui-refresh.md` (Fase 2). Reemplaza la cabecera anterior (imagen 16:9 sobre el título), la sección "Detalles" y "Ubicación". El aside y la barra de compra de los eventos con mapa son de `docs/specs/seating-ticket-selection.md` (contrato H).

## Layout

### Escritorio (`lg+`)

```
Header sticky   (igual que la landing)
Breadcrumb      Inicio › Categoría › Título
┌──────────────────────── hero bg-brand-navy rounded-3xl ────────────────────────┐
│ [Conciertos]                              │                                    │
│ h1 Título del evento                      │        imagen (fill, cover)        │
│ ▢ Sábado, 14 de noviembre de 2026         │                                    │
│ ◷ 21:00                                   │                                    │
│ ⌖ Estadio Nacional, Lima                  │                                    │
│ [ Comprar entradas · desde S/ 180.00 ] ♡ ⇪ │                                    │
└───────────────────────────────────────────┴────────────────────────────────────┘
┌──────────────────────────────────────────┬──────────────┐
│ Acerca del evento · Organiza: …          │ Aside compra │  columna derecha 380px,
│ Información importante (2×2)             │ (sticky)     │  sticky lg:top-24
│ Lugar (mapa · dirección · Cómo llegar)   │              │
└──────────────────────────────────────────┴──────────────┘
También te puede interesar · Ver más en <Categoría> →   (bg-muted, ancho completo, grilla 3/4 col.)
Footer          (igual que la landing)
```

### Móvil (`< lg`)

```
Header sticky
[←]                                  [♡] [⇪]   barra superior (sin breadcrumb)
┌──────────────────────────────┐
│ imagen 16:9                  │
├──────────────────────────────┤  bloque navy
│ [Conciertos] · h1            │
│ fecha · hora · lugar         │
│ [ Comprar entradas · desde ] │
└──────────────────────────────┘
Aside de compra  (id="entradas")
Acerca del evento · Información importante (2×2) · Lugar
También te puede interesar  → carrusel con scroll-snap (< sm)
Barra inferior (solo con mapa y no agotado, ver seating)
Footer
```

- **Hero a ancho completo** del contenedor: `mx-auto max-w-7xl px-4 pt-4 md:px-6 md:pt-8 lg:px-8`, fuera de la grilla.
- **Grilla** debajo: `mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12 lg:px-8`.
- **Orden móvil** (una columna): hero (imagen y luego bloque navy) → aside de compra → información → relacionados. Se logra con el orden del DOM (aside, información) y, en `lg`, aside en `col-start-2 row-start-1` e información en `col-start-1 row-start-1`. Ningún componente se duplica ni se oculta por breakpoint, salvo Guardar/Compartir (barra móvil vs. fila de acciones del hero).
- La celda del aside se estira con la fila, así que su tarjeta (`lg:sticky lg:top-24`, bajo el header) tiene recorrido mientras se lee la información.
- **Relacionados** (`RelatedEvents`) van fuera de los contenedores con padding: la sección `bg-muted` ocupa todo el ancho y lleva su propio contenedor `max-w-7xl`.
- h1 único: título del evento (Display del MASTER). Imagen del hero con `preload`.

## Barra superior móvil y breadcrumb

- `< lg`, encima del hero: a la izquierda, enlace solo icono `ArrowLeft` a `/eventos` (`size-11`, ghost, `aria-label="Volver a eventos"`); a la derecha, Guardar y Compartir (`size-11`, ghost).
- Breadcrumb "Inicio › Categoría › Título" solo en `lg` (`hidden lg:flex`), en el lugar de la barra.

## Hero (`EventDetailHeader`)

- Bloque `rounded-3xl overflow-hidden bg-brand-navy text-primary-foreground`.
  - `lg`: grilla de 2 columnas, texto a la izquierda e imagen a la derecha (`next/image fill object-cover`, `preload`), `min-h-[28rem]`.
  - Móvil: imagen arriba (`aspect-[16/9]`) y texto debajo.
  - Alt de la imagen: "<Título> en <Lugar>, <Ciudad>".
- Texto:
  - `Badge` outline con la categoría (`border-primary-foreground/30`).
  - h1 (Display).
  - Lista con iconos `aria-hidden` en `text-primary-foreground/80`: fecha larga con mayúscula inicial ("Sábado, 14 de noviembre de 2026"), hora de inicio ("21:00") y "Lugar, Ciudad".
- Fila de acciones:
  - CTA primario `h-12` a `purchaseHref`: "Comprar entradas · desde S/ X", o "Ver entradas · Entrada libre" si el precio desde es 0.
  - En `lg`, también Guardar y Compartir: outline sobre navy (`border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10`, `size-12`).
  - Evento agotado: sin CTA; texto "Entradas agotadas" (`font-bold`, no interactivo).
- **`purchaseHref`** (lo calcula la página): `/eventos/<slug>/entradas` si el evento tiene mapa del recinto (`hasVenueMap` de `@/modules/seating`); si no, `#entradas`. El contenedor del aside lleva `id="entradas"` y `scroll-mt-24` para no quedar tapado por el header sticky.

## Guardar y Compartir

- **Guardar** (`SaveEventButton`): `type="button"`, `aria-label="Guardar evento"` fijo y `aria-pressed`. Icono `Heart`, relleno (`fill-current`) cuando está guardado. Se guarda solo en este navegador (`localStorage["mentec-saved"]`); las dos instancias (móvil y `lg`) comparten estado.
- **Compartir** (`ShareEventButton`): `type="button"`, `aria-label="Compartir evento"`, icono `Share2`.
  - Con Web Share: `navigator.share({ title, url })`; cancelar no muestra nada.
  - Sin Web Share: copia la URL; el icono pasa a `Check` durante 2 s y una región `role="status"` (`sr-only`) anuncia "Enlace copiado" o, si falla, "No pudimos copiar el enlace".

## Aside de compra

- Eventos **sin** mapa: `TicketSelector` (ver "Reglas específicas").
- Eventos **con** mapa (`getVenueMapBySlug`): `ZonePricesCard` en la celda del aside y `MobileBuyBar` como último hijo de la página (solo si no está agotado). Su diseño, la compra en `/eventos/<slug>/entradas` y la barra móvil están en `ticket-selection.md` y en `docs/specs/seating-ticket-selection.md` (contrato H); esta página no los redefine.
- Nunca se muestran ambos asides. Los eventos sin mapa no tienen barra inferior móvil.

## Información (`EventDetailInfo`)

- **Acerca del evento:** párrafos de la descripción y, al final, "Organiza: <organizador>" (`text-muted-foreground`).
- **Información importante:** `dl` en grilla 2×2 a cualquier ancho (`grid-cols-2 gap-3 md:gap-4`).
  - Celda: `rounded-2xl ring-1 ring-border p-4`; icono en `size-11 rounded-xl bg-accent text-primary-strong` (encima del texto en móvil, a la izquierda desde `md`); `dt` `text-sm text-muted-foreground`, `dd` `font-bold`.
  - Celdas: "Apertura de puertas" (`Clock`, hora), "Inicio" (`CalendarClock`, hora), "Edad mínima" (`Users`, "Todo público" o "+N"), "Ingreso" (`QrCode`, "Entrada digital con QR").
- **Lugar:** tarjeta `rounded-2xl ring-1 ring-border overflow-hidden`.
  - Marcador de mapa `aspect-[16/7] bg-accent` con `MapPin` (`text-primary`), decorativo y entero `aria-hidden` (no es un mapa real).
  - Debajo: nombre del lugar (`font-bold`), "dirección, ciudad" (`text-muted-foreground`) y botón outline `h-11` "Cómo llegar" con `ExternalLink` (`aria-hidden`) a Google Maps, en pestaña nueva con `rel="noopener noreferrer"` y `sr-only` "(se abre en una pestaña nueva)".

## Relacionados (`RelatedEvents`)

- Sección `bg-muted` a ancho completo. `SectionHeader` "También te puede interesar" con la acción "Ver más en <Categoría>" → `/eventos?categoria=<categoria>` (`h-11`, `text-primary-strong`, `ArrowRight`).
- `< sm`: carrusel `overflow-x-auto snap-x snap-mandatory`, tarjetas `w-64 shrink-0 snap-start`, scrollbar oculta, sin scroll horizontal de página.
- Desde `sm`: grilla de 2 / 3 (`lg`) / 4 (`xl`) columnas.
- Sin relacionados, la sección no se renderiza.

## Reglas específicas

- Stepper −/cantidad/+ (`TicketSelector`, eventos sin mapa): botones `size-11` (≥ 44px) con `aria-label` "Quitar una entrada <tipo>" / "Añadir una entrada <tipo>"; cantidad con `aria-live="polite"`; total también `aria-live`. "−" deshabilitado en 0; "+" deshabilitado al llegar a 10 entradas en total (mensaje visible "Máximo 10 entradas por compra") o si el tipo está agotado.
- Estado de cada tipo con texto, no solo color: "Últimas entradas" (`bg-warning`), "Agotado" (`bg-destructive`). Evento agotado: "Entradas agotadas" en lugar de controles, sin botón de compra.
- CTA "Continuar con la compra": primario full-width `h-11`; deshabilitado con 0 entradas.
- **Anti-patrón: cargos ocultos.** Bajo el total siempre "Precio final, sin cargos ocultos"; el total mostrado es el que se paga.
- Targets táctiles ≥ 44px en la barra móvil, Guardar, Compartir, "Cómo llegar" y "Ver más en…".
- Sin scroll horizontal de página a 375 px (el carrusel de relacionados tiene su propio scroll).
- Metadata: `<Título del evento> | Mentec Tickets`, descripción = primer párrafo.
- 404 propio: h1 "No encontramos este evento" + "Volver al inicio" (botón primario).
