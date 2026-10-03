# Página: listado de eventos `/eventos`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER.

## Layout

```
Header sticky   (igual que la landing)
Título          h1 "Eventos" o el label de la categoría activa ("Teatro"); único h1 de la página
Buscador        EventSearchBar precargado con los filtros de la URL (+ hidden `categoria`)
Chips           "Todas" + 6 categorías (scroll horizontal propio en móvil)
Contador        "N eventos encontrados" (texto visible, small, muted-foreground)
Grilla          EventCard 1/2/3/4 columnas, gap-4 md:gap-6, orden por fecha ascendente
Vacío           bloque bg-muted rounded-2xl: "No encontramos eventos con esos filtros" + "Limpiar filtros" (outline, a /eventos)
Footer          (igual que la landing)
```

- Contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8` en todos los bloques.
- h1: `text-3xl md:text-5xl font-extrabold tracking-tight` (mismo tamaño que el h1 de la home), `pt-8 md:pt-12`.
- Resultados (chips + contador + grilla): `py-12 md:py-16`, `gap-6` entre chips y resultados.

## Reglas específicas

- Chips de categoría son **enlaces** (`next/link`), no `ToggleGroup`: cada uno navega a `/eventos` conservando los demás filtros. El activo lleva `aria-current="page"` y `bg-primary text-primary-foreground font-semibold`; el resto `bg-muted hover:bg-accent`. `rounded-full`, `h-11`, foco visible con `ring`.
- Todos los filtros viven en la URL (compartibles, botón atrás funciona); sin filtrado en cliente.
- Estado vacío siempre con salida: enlace "Limpiar filtros" a `/eventos`.
- Metadata: `<Categoría|Eventos> | Mentec Tickets`.
