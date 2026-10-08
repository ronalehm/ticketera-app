# Página: detalle de evento `/eventos/[slug]`

> **Hero, 2026-10-08 (Ronald; prevalece sobre los diagramas de abajo):** portada limpia a todo el ancho (`aspect-[16/9]`, `md:aspect-[21/8]`, `rounded-3xl`, sin texto, botones ni bloque navy encima). Debajo: el `h1` con Editar (solo dueño/admin), Guardar (♥) y Compartir a la derecha; luego una línea `text-muted-foreground` con fecha, hora de inicio, recinto y ciudad, y edad mínima («Todo público» o «Edad mínima: +N»); «Entradas agotadas» si aplica. Sin CTA de compra, sin badge de categoría (la categoría queda en la miga) y sin aviso «Fecha actualizada». En móvil la barra superior solo tiene la flecha «Volver a eventos».
>
> **Barra de acciones (`EventActionBar`, bajo el hero y encima de «Acerca del evento»):** tres botones `h-11` en fila: «Mi entrada» (outline, `/mis-entradas`, pide sesión), «Comprar» (primario; página de asientos con mapa o `#entradas` sin mapa; «Agotado» deshabilitado si no hay stock) y «Más» (menú: «Agregar al calendario» `.ics`, «Cómo llegar» en Google Maps). En móvil ocupan el ancho a partes iguales; desde `sm`, ancho natural.

> Override de `../MASTER.md` para esta página. Lo no indicado aquí sigue el MASTER.
> Spec: `docs/specs/events-ui-refresh.md` (Fases 2 y 5); la sección "Lugar" (mapa y "Cómo llegar") la redefine `docs/specs/events-venue-map.md`. Reemplaza la cabecera anterior (imagen 16:9 sobre el título), la sección "Detalles" y "Ubicación". El aside y la barra de compra de los eventos con mapa vienen de `docs/specs/seating-ticket-selection.md` (contrato H); esta spec no los rehace, pero su diseño sigue documentado aquí ("Aside con mapa" y "Barra inferior móvil").
> Aviso «Fecha actualizada» y botón «Editar evento» del hero: `docs/specs/event-editing.md` (Decisiones 2 y 4).

## Layout

### Escritorio (`lg+`)

```
Header sticky   (igual que la landing)
Breadcrumb      Inicio › Categoría › Título
┌──────────────────────── hero bg-brand-navy rounded-3xl ────────────────────────┐
│ [Conciertos]           [✎ Editar evento]  │                                    │  Editar: solo dueño/admin
│ h1 Título del evento                      │        imagen (fill, cover)        │
│ ▢ sábado 14 de noviembre                  │                                    │
│ ◷ 21:00 h                                 │                                    │
│ ⌖ Estadio Nacional, Lima                  │                                    │
│ (◷ Fecha actualizada el lunes 5 de oct.)  │                                    │  solo si cambió la fecha
│ [ Comprar entradas · desde S/ 180.00 ] ♡ ⇪ │                                    │
└───────────────────────────────────────────┴────────────────────────────────────┘
┌──────────────────────────────────────────┬──────────────┐
│ Acerca del evento · Organiza: …          │ Aside compra │  columna derecha 380px,
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
Acerca del evento · Lugar
También te puede interesar  → carrusel con scroll-snap (< sm)
Barra inferior  (< lg, solo con mapa y no agotado)  Desde S/ X   [Comprar entradas →]
Footer
```

- **Hero a ancho completo** del contenedor: `mx-auto max-w-7xl px-4 pt-4 md:px-6 md:pt-8 lg:px-8`, fuera de la grilla.
- **Grilla** debajo: `mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12 lg:px-8`.
- **Orden móvil** (una columna): hero (imagen y luego bloque navy) → aside de compra → información → relacionados. Se logra con el orden del DOM (aside, información) y, en `lg`, aside en `col-start-2 row-start-1` e información en `col-start-1 row-start-1`. Ningún componente se duplica ni se oculta por breakpoint, salvo Guardar/Compartir (barra móvil vs. fila de acciones del hero).
- La celda del aside se estira con la fila, así que su tarjeta (`lg:sticky lg:top-24`, bajo el header) tiene recorrido mientras se lee la información.
- **Relacionados** (`RelatedEvents`) van fuera de los contenedores con padding: la sección `bg-muted` ocupa todo el ancho y lleva su propio contenedor `max-w-7xl`.
- h1 único: título del evento (Display del MASTER con tamaño propio, ver "Hero"). Imagen del hero con `preload`.

## Barra superior móvil y breadcrumb

- `< lg`, encima del hero: a la izquierda, enlace solo icono `ArrowLeft` a `/eventos` (`size-11`, ghost, `aria-label="Volver a eventos"`); a la derecha, Guardar y Compartir (`size-11`, ghost).
- Breadcrumb "Inicio › Categoría › Título" solo en `lg` (`hidden lg:flex`), en el lugar de la barra.

## Hero (`EventDetailHeader`)

- Bloque `rounded-3xl overflow-hidden bg-brand-navy text-primary-foreground`.
  - `lg`: grilla de 2 columnas, texto a la izquierda e imagen a la derecha (`next/image fill object-cover`, `preload`), `min-h-[28rem]`.
  - Móvil: imagen arriba (`aspect-[16/9]`) y texto debajo.
  - Alt de la imagen: "<Título> en <Lugar>, <Ciudad>" (`getCoverAlt`, el mismo texto que `og:image:alt`; sin alt editable).
- Texto:
  - `Badge` outline con la categoría (`border-primary-foreground/30`).
  - h1 (Display) con tamaño propio, un paso más pequeño que el del MASTER: `text-4xl md:text-5xl lg:text-4xl xl:text-5xl` (36 / 48 / 36 / 48 px; peso, interlineado y tracking como el Display). A 1440 px un título largo ("Noche de Sintetizadores: Gira Neón 2026") ocupa como máximo 3 líneas en la columna de texto; a 375 px no desborda.
  - Lista con iconos `aria-hidden` en `text-primary-foreground/80`:
    - Fecha sin año y en minúscula ("sábado 14 de noviembre", `formatLongDayMonth`) dentro de `<time dateTime>` con el ISO completo. Días y meses en minúscula según la norma del español; la línea no es una oración. El año no hace falta: el catálogo solo tiene eventos de los próximos 12 meses.
    - Hora de inicio con sufijo " h" ("21:00 h").
    - "Lugar, Ciudad".
  - **Aviso «Fecha actualizada»** (solo si `events.schedule_changed_at` no es nulo: la fecha u hora cambió con ventas; spec `event-editing`, Decisión 2): bajo la lista, píldora `inline-flex w-fit items-center gap-2 rounded-full bg-highlight px-3 py-1 text-sm font-semibold text-highlight-foreground` (navy sobre cian, legible sobre el bloque navy) con `CalendarClock` (`size-4`, `aria-hidden`) y "Fecha actualizada el lunes 5 de octubre": día de la actualización en hora de Lima (`formatLongDayMonth`) dentro de `<time dateTime>` con el ISO. El dato llega en `EventDetail.scheduleChangedAt` (opcional) desde `getEventBySlug`; la página sigue estática y se revalida con `revalidatePublicEvent` al guardar.
  - **Botón «Editar evento»** (`EventEditLink`, isla cliente; spec `event-editing`, Decisión 4): a la derecha de la badge de categoría (`flex items-center justify-between gap-3`). Tras montar llama a la server action `getEventEditHref(eventId)` (`@/modules/organizer/editLink`), que comprueba sesión, permiso y dueño, y solo se muestra si devuelve un href (`/organizador/eventos/<id>/editar`): organizador dueño, admin y super_admin. Visitantes, customers y otros organizadores no ven nada (no se reserva hueco). Enlace outline sobre navy `h-11 px-4 font-semibold` (`border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10`, foco claro como el resto del hero) con `Pencil` (`size-4`, `aria-hidden`) y el texto "Editar evento". Así la página no lee la sesión en el servidor y sigue prerenderizada (ISR).
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
- Eventos **con** mapa (`getVenueMapBySlug`): `ZonePricesCard` en la celda del aside y `MobileBuyBar` como último hijo de la página (solo si no está agotado). Ver "Aside con mapa" y "Barra inferior móvil".
- Nunca se muestran ambos asides. Los eventos sin mapa no tienen barra inferior móvil.

## Aside con mapa (`ZonePricesCard`)

Para los eventos con mapa, la compra se hace en `/eventos/<slug>/entradas` (ver `ticket-selection.md`); el aside resume precios y enlaza allí: cada zona comprable abre directamente su sub-paso 2 y el botón abre el mapa con todas las zonas (sub-paso 1). Misma celda (`id="entradas"`, columna derecha de 380px en `lg`) y mismo sticky que el selector (`lg:sticky lg:top-24`). En móvil va justo debajo del hero, antes de la información. Las filas como enlaces y el botón "Ver mapa de zonas" vienen de `docs/specs/seating-stadium-map.md` (Fase 6, decisión 31, requisito 38); la tarjeta sigue siendo Server Component y no cambian sus props.

```
┌──────────────────────────────┐
│ Entradas                     │  h2 text-xl font-bold
│ Entradas desde               │  text-sm text-muted-foreground
│ S/ 180.00                    │  text-3xl font-bold tabular-nums
├──────────────────────────────┤  ul aria-label="Zonas", divide-y, border-y
│ ■ VIP [Últimas]  S/ 550.00 › │  enlace → …/entradas?zona=vip
│ ■ Preferencial   S/ 320.00 › │  enlace → …/entradas?zona=preferencial
│ ■ General        S/ 180.00 › │  enlace → …/entradas?zona=general
│ ■ Tribuna Norte  S/ 220.00 › │  enlace → …/entradas?zona=norte
│ ■ Mesa            Agotado    │  zona agotada (ejemplo): texto, sin enlace
├──────────────────────────────┤
│ [ Ver mapa de zonas → ]      │  primario h-11 w-full → …/entradas
│ (Lock) Pago seguro · Entr…   │  text-sm text-muted-foreground
└──────────────────────────────┘
```

- `Card rounded-2xl`, h2 "Entradas"; "Entradas desde" + `priceFrom`.
- Lista `ul aria-label="Zonas"` (`divide-y divide-border border-y`), una fila por zona (`min-h-14`) en el orden del mapa. Contenido de la fila: muestra de tono (`size-3.5 rounded-sm`, `aria-hidden`, mismos tonos por precio que el mapa), nombre (`text-base font-medium`), `Badge` "Últimas entradas" (`bg-warning text-warning-foreground`) si la zona es `low-stock`, y a la derecha el precio (`text-base font-bold tabular-nums`) o "Agotado" (`text-sm font-bold text-muted-foreground`).
- **Zona comprable** (zona no agotada y evento no agotado): la fila es un enlace (`Link`, un `<a href>`: funciona sin JavaScript y se puede abrir en otra pestaña).
  - Destino: `/eventos/<slug>/entradas?zona=<zoneId>` (`buildZoneEntryHref`), que abre directamente el sub-paso 2 de esa zona (cantidad en las de pie, plano en las numeradas; ver `ticket-selection.md`).
  - A la derecha del precio, `ChevronRight` (`size-5 text-muted-foreground`, `aria-hidden`) que pasa a `text-foreground` con el puntero sobre la fila (`group-hover`); precio y chevron en `flex items-center gap-1`.
  - Hover: fondo `bg-accent/40` (el de las tarjetas de zona de `/entradas`), `transition-colors duration-200`, `cursor-pointer`. Foco: `focus-visible:ring-3 focus-visible:ring-ring/50` (sin outline).
  - El fondo sobresale 8 px a cada lado (`-mx-2 px-2 rounded-lg`), así que la muestra y el nombre no se mueven respecto de una fila de texto. Alto `min-h-14` (56 px, target ≥ 44 px).
  - Nombre accesible (`aria-label`): "Elegir entradas de <nombre>, <precio>" y, si es `low-stock`, ", últimas entradas" (p. ej. "Elegir entradas de VIP, S/ 550.00, últimas entradas"). Empieza por la acción y contiene el nombre visible de la zona (WCAG 2.5.3).
- **Zona no comprable** (agotada, o cualquier zona con el evento agotado): la fila sigue siendo texto, sin enlace, sin chevron y sin hover; no recibe foco y se lee "<nombre> Agotado" en la lista. Muestra "Agotado" o, si el evento está agotado y la zona no, su precio. El texto de la derecha lleva `mr-6` (el ancho del chevron más su separación) para alinearse con los precios de las filas enlace.
- **Botón "Ver mapa de zonas"** + `ArrowRight`: enlace primario `h-11 w-full font-semibold hover:bg-primary-strong` a `/eventos/<slug>/entradas` (sub-paso 1, el mismo destino que el CTA del hero, `purchaseHref`). Las filas eligen zona; el botón abre el mapa con todas. Ningún enlace del aside se llama solo "Elegir entradas".
- Orden de Tab: las filas comprables (en el orden del mapa) y luego "Ver mapa de zonas". Enter en una fila navega como el clic.
- Evento agotado: ninguna fila es enlace y "Entradas agotadas" (`rounded-lg bg-muted p-3 text-center font-bold`) sustituye al botón.
- Nota final con `Lock` (`aria-hidden`): "Pago seguro · Entrada digital con QR".
- No cambian con las filas enlace: el CTA del hero ("Comprar entradas · desde S/ X") ni la barra inferior móvil ("Comprar entradas"); siguen siendo el CTA principal de compra (llevan al sub-paso 1, igual que en los eventos sin mapa).

## Barra inferior móvil (`MobileBuyBar`)

- Solo en eventos con mapa y no agotados; la página no la renderiza en el resto (sin mapa, el detalle no tiene barra inferior).
- Último hijo de la página, después de "También te puede interesar": `sticky bottom-0 z-30 lg:hidden`, a ancho completo, `border-t bg-background shadow-lg shadow-foreground/5`, `px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]`. Es `sticky`, no `fixed`: se queda pegada abajo al desplazarse y no tapa el footer al final.
- Izquierda: "Desde" (`text-xs text-muted-foreground`) + `priceFrom` (`text-xl font-bold tabular-nums`). Derecha: enlace primario `h-11 px-6` "Comprar entradas" + `ArrowRight` a `/eventos/<slug>/entradas`.
- Mismo estilo que la barra de `/entradas`. En `lg+` desaparece: el aside cumple esa función.

## Información (`EventDetailInfo`)

- **Acerca del evento:** párrafos de la descripción y, al final, "Organiza: <organizador>" (`text-muted-foreground`).
- **Información importante: eliminada** (Ronald, 2026-10-08). La edad mínima pasa a la línea de datos bajo el título (ver «Hero, 2026-10-08»), la hora de inicio ya está ahí, «Apertura de puertas» desaparece (el horario es inicio y fin; la hora de fin llega con la Fase 1B de `events-detail-landing`) e «Ingreso: entrada digital con QR» se quita.
- **Lugar:** tarjeta `rounded-2xl ring-1 ring-border overflow-hidden`.
  - Bloque del mapa (`VenueMap`): `relative aspect-[4/3] md:aspect-[16/7] overflow-hidden bg-accent` (4:3 en móvil, unos 343 × 257 px a 375 px; 16:7 desde `md`). La fachada y el iframe ocupan la caja entera (`size-full`), así que cargar el mapa no desplaza el contenido (sin CLS). Depende de `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` (vía `publicEnv` de `@/lib/env`):
    - **Sin clave:** marcador con `MapPin` (`size-8 text-primary`) centrado, decorativo y entero `aria-hidden` (no es un mapa real). Sin botón ni iframe.
    - **Con clave, fachada (click-to-load):** columna centrada (`gap-3 p-4 text-center`) con `MapPin` (`aria-hidden`), botón outline `h-11 px-4 font-semibold` "Ver mapa" y debajo el aviso `max-w-xs text-sm text-muted-foreground` "Al ver el mapa se cargará contenido de Google Maps, que puede usar sus propias cookies.", que el botón referencia con `aria-describedby`. El iframe no está en el DOM: no se hace ninguna petición a Google antes de pulsar. La elección no se recuerda; cada visita empieza con la fachada.
    - **Con clave, tras pulsar "Ver mapa"** (clic, Enter o Espacio): la fachada se sustituye por el iframe de la Maps Embed API (modo `place`, `language=es`, `region=PE`) con `title="Mapa de <lugar>"`, `loading="lazy"`, `referrerPolicy="no-referrer-when-downgrade"`, `allowFullScreen` y `border-0`. El foco pasa al iframe (el botón desaparece); foco visible con `focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring`. Sin trampa de foco: Tab recorre los controles de Google y sale a "Cómo llegar".
    - Sin JavaScript, "Ver mapa" no hace nada (el mapa es una mejora); "Cómo llegar" funciona siempre.
  - Debajo: nombre del lugar (`font-bold`), "dirección, ciudad" (`text-muted-foreground`) y enlace `<a>` con estilo de botón outline `h-11` "Cómo llegar" con `ExternalLink` (`aria-hidden`), en pestaña nueva con `rel="noopener noreferrer"` y `sr-only` "(se abre en una pestaña nueva)". Abre la **ruta** hacia el lugar: URL de direcciones `https://www.google.com/maps/dir/?api=1&destination=<lugar, dirección, ciudad, Perú>` (sin `origin`: Google usa la ubicación actual; en móvil abre la app de Google Maps si está instalada). No necesita clave.
  - El mismo texto "<lugar>, <dirección>, <ciudad>, Perú" (`buildVenueQuery`) se usa en el `q` del iframe y en el `destination`, para que ambos señalen el mismo sitio. Las URLs de Google Maps solo se construyen en `modules/events/utils/venueMap.ts`.

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
- Targets táctiles ≥ 44px en la barra móvil, Guardar, Compartir, "Ver mapa", "Cómo llegar" y "Ver más en…".
- Sin scroll horizontal de página a 375 px (el carrusel de relacionados tiene su propio scroll).
- **Metadata y vista previa al compartir** (`buildEventMetadata`, spec `events-detail-landing`, Fase 1A): `metadataBase` = `APP_URL` en el layout raíz; las URLs relativas se resuelven contra él.
  - `<title>`: `<Título del evento> | Mentec Tickets`.
  - Descripción (`description`, `og:description`, `twitter:description`): "<Lugar>, <Ciudad> · <sábado 14 de noviembre>, <21:00> h. <primer párrafo>" (hora de Lima).
  - `canonical` y `og:url`: `/eventos/<slug>` (absoluta con `APP_URL`).
  - Open Graph: `type` `website`, `site_name` "Mentec Tickets", `locale` `es_PE`, `og:title` = título del evento (sin sufijo), `og:image` = la portada (`image_url`) con `og:image:alt` = el alt del hero.
  - X: `summary_large_image` con título, descripción, imagen y alt iguales a Open Graph.
  - Sin `robots`: la página se indexa. La metadata va en el `<head>` inicial (página prerenderizada; los bots sin JavaScript, como `facebookexternalhit`, la reciben bloqueante).
- 404 propio: h1 "No encontramos este evento" + "Volver al inicio" (botón primario).
