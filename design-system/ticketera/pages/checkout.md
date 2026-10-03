# Página: checkout `/checkout`

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER.

## Layout

Fase 1 (sin formulario de pago):

```
Header sticky   (igual que la landing)
h1 "Finalizar compra"
Temporizador    bloque bg-muted rounded-lg "Tiempo para completar tu compra: mm:ss"
Resumen         Card rounded-2xl (OrderSummary)
Footer          (igual que la landing)
```

- Una columna `mx-auto max-w-xl px-4 md:px-6 py-8 md:py-12`, `gap-6`.
- h1: `text-3xl md:text-5xl font-extrabold tracking-tight` (como `/eventos`). Único h1; los estados de error (`CheckoutStatusMessage`) sustituyen la página entera con su propio h1.

Fase 3 (con comprador y pago): contenedor `max-w-7xl`, h1 y temporizador a todo el ancho, grilla `lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-12`. Izquierda: "Datos del comprador", "Pago", Términos (cada sección en `Card`, h2 `text-xl font-bold`). Derecha `lg:sticky lg:top-24 self-start`: resumen, `Alert` de error y botón "Pagar S/ X". Orden móvil = orden del DOM (h1 → temporizador → comprador → pago → términos → resumen + pagar); ningún bloque se duplica por breakpoint.

## Reglas específicas

- Resumen: miniatura `next/image` `aspect-[4/3] w-24 rounded-lg`, título `line-clamp-2`, fecha overline, "Lugar, Ciudad", líneas "`<cantidad>` × `S/ <precio>`" con subtotal, total `text-xl font-bold tabular-nums` y siempre "Precio final, sin cargos ocultos".
- Temporizador: `tabular-nums`, sin animaciones; anuncio `aria-live="polite"` solo por minuto. Al expirar, `Alert` destructivo "Tu reserva expiró" con "Volver a elegir entradas" (`h-11`).
- Estados (`not-found`, `sold-out`, `invalid-tickets`, `free`, …): patrón del 404 de evento (centrado, h1 + descripción + acciones `h-11`); siempre con salida.
- Pago (Fase 3): solo tarjeta con el Payment Element de Stripe; su `appearance` usa hex equivalentes a los tokens (única excepción a "solo tokens", el iframe no lee variables CSS) y fuente de sistema.
- Metadata: `Finalizar compra | Mentec Tickets`.
