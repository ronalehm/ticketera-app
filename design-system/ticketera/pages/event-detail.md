# Página: detalle de evento `/eventos/[slug]`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER.

## Layout

```
Header sticky   (igual que la landing)
┌──────────────────────────────┬──────────────┐
│ Breadcrumb Inicio › Cat › …  │ Entradas     │  columna derecha 380px,
│ Imagen 16:9 rounded-2xl      │ (selector    │  sticky lg:top-24
│ Badge · h1 · fecha · lugar   │  sticky)     │
├──────────────────────────────┤              │
│ Acerca / Detalles / Ubicación│              │
└──────────────────────────────┴──────────────┘
También te puede interesar  (4 EventCard, ancho completo)
Barra inferior (< lg, solo con mapa y no agotado)  Desde S/ X   [Comprar entradas →]
Footer          (igual que la landing)
```

- Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 md:py-12`; grilla `lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-12`.
- **Orden móvil** (una columna): imagen → título → selector → información → relacionados. Se logra con el orden del DOM (cabecera, selector, información) y, en `lg`, el selector en `col-start-2 row-span-2`; ningún componente se duplica ni se oculta por breakpoint.
- Selector **sticky** solo en `lg+` (`lg:sticky lg:top-24`, bajo el header). Su celda abarca las dos filas para que el sticky tenga recorrido.
- h1 único: título del evento (Display). Imagen de cabecera con `preload`.
- La celda derecha muestra `TicketSelector` (eventos sin mapa) o `ZonePricesCard` (eventos con mapa del recinto, `getVenueMapBySlug`); nunca ambos. Ver "Aside con mapa".

## Aside con mapa (`ZonePricesCard`)

Para los eventos con mapa, la compra se hace en `/eventos/<slug>/entradas` (ver `ticket-selection.md`); el aside solo resume precios y enlaza allí. Misma celda y mismo sticky que el selector (`lg:sticky lg:top-24`).

```
┌──────────────────────────────┐
│ Entradas                     │  h2 text-xl font-bold
│ Entradas desde               │  text-sm text-muted-foreground
│ S/ 180.00                    │  text-3xl font-bold tabular-nums
├──────────────────────────────┤
│ ■ VIP [Últimas]    S/ 550.00 │  lista divide-y, border-y
│ ■ Preferencial     S/ 320.00 │
│ ■ General          S/ 180.00 │
│ ■ Tribuna Norte    S/ 220.00 │
├──────────────────────────────┤
│ [ Elegir entradas → ]        │  primario h-11 w-full
│ (Lock) Pago seguro · Entr…   │  text-sm text-muted-foreground
└──────────────────────────────┘
```

- `Card rounded-2xl`, h2 "Entradas"; "Entradas desde" + `priceFrom`.
- Una fila por zona (`min-h-14`) en el orden del mapa: muestra de tono (`size-3.5 rounded-sm`, `aria-hidden`, mismos tonos por precio que el mapa), nombre (`text-base font-medium`), `Badge` "Últimas entradas" (`bg-warning text-warning-foreground`) si la zona es `low-stock`, y a la derecha el precio (`font-bold tabular-nums`) o "Agotado" (`text-sm font-bold text-muted-foreground`).
- CTA "Elegir entradas" + `ArrowRight`: enlace primario `h-11 w-full font-semibold hover:bg-primary-strong` a `/eventos/<slug>/entradas`.
- Evento agotado: "Entradas agotadas" (`rounded-lg bg-muted p-3 text-center font-bold`) en lugar del CTA.
- Nota final con `Lock` (`aria-hidden`): "Pago seguro · Entrada digital con QR".

## Barra inferior móvil (`MobileBuyBar`)

- Solo en eventos con mapa y no agotados; la página no la renderiza en el resto (sin mapa, el detalle no tiene barra).
- Último hijo de la página, después de "También te puede interesar": `sticky bottom-0 z-30 lg:hidden`, a ancho completo, `border-t bg-background shadow-lg shadow-foreground/5`, `px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]`. Es `sticky`, no `fixed`: se queda pegada abajo al desplazarse y no tapa el footer al final.
- Izquierda: "Desde" (`text-xs text-muted-foreground`) + `priceFrom` (`text-xl font-bold tabular-nums`). Derecha: enlace primario `h-11 px-6` "Comprar entradas" + `ArrowRight` a `/eventos/<slug>/entradas`.
- Mismo estilo que la barra de `/entradas`. En `lg+` desaparece: el aside cumple esa función.

## Reglas específicas

- Stepper −/cantidad/+ (`TicketSelector`, eventos sin mapa): botones `size-11` (≥ 44px) con `aria-label` "Quitar una entrada <tipo>" / "Añadir una entrada <tipo>"; cantidad con `aria-live="polite"`; total también `aria-live`. "−" deshabilitado en 0; "+" deshabilitado al llegar a 10 entradas en total (mensaje visible "Máximo 10 entradas por compra") o si el tipo está agotado.
- Estado de cada tipo con texto, no solo color: "Últimas entradas" (`bg-warning`), "Agotado" (`bg-destructive`). Evento agotado: "Entradas agotadas" en lugar de controles, sin botón de compra.
- CTA "Continuar con la compra": primario full-width `h-11`; deshabilitado con 0 entradas.
- **Anti-patrón: cargos ocultos.** Bajo el total siempre "Precio final, sin cargos ocultos"; el total mostrado es el que se paga.
- Enlace "Ver en Google Maps" en pestaña nueva con `rel="noopener noreferrer"`.
- Metadata: `<Título del evento> | Mentec Tickets`, descripción = primer párrafo.
- 404 propio: h1 "No encontramos este evento" + "Volver al inicio" (botón primario).
