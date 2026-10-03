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
Footer          (igual que la landing)
```

- Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 md:py-12`; grilla `lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-12`.
- **Orden móvil** (una columna): imagen → título → selector → información → relacionados. Se logra con el orden del DOM (cabecera, selector, información) y, en `lg`, el selector en `col-start-2 row-span-2`; ningún componente se duplica ni se oculta por breakpoint.
- Selector **sticky** solo en `lg+` (`lg:sticky lg:top-24`, bajo el header). Su celda abarca las dos filas para que el sticky tenga recorrido.
- h1 único: título del evento (Display). Imagen de cabecera con `preload`.

## Reglas específicas

- Stepper −/cantidad/+: botones `size-11` (≥ 44px) con `aria-label` "Quitar una entrada <tipo>" / "Añadir una entrada <tipo>"; cantidad con `aria-live="polite"`; total también `aria-live`. "−" deshabilitado en 0; "+" deshabilitado al llegar a 10 entradas en total (mensaje visible "Máximo 10 entradas por compra") o si el tipo está agotado.
- Estado de cada tipo con texto, no solo color: "Últimas entradas" (`bg-warning`), "Agotado" (`bg-destructive`). Evento agotado: "Entradas agotadas" en lugar de controles, sin botón de compra.
- CTA "Continuar con la compra": primario full-width `h-11`; deshabilitado con 0 entradas.
- **Anti-patrón: cargos ocultos.** Bajo el total siempre "Precio final, sin cargos ocultos"; el total mostrado es el que se paga.
- Enlace "Ver en Google Maps" en pestaña nueva con `rel="noopener noreferrer"`.
- Metadata: `<Título del evento> | Mentec Tickets`, descripción = primer párrafo.
- 404 propio: h1 "No encontramos este evento" + "Volver al inicio" (botón primario).
