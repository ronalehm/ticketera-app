# Renovación de UI: búsqueda, detalle de evento y acceso

- Módulo: events (Fases 1–2) · auth (Fase 3)
- Estado: aprobado

## Objetivo
Alinear tres pantallas que ya existen con el diseño de referencia (pantallas "2 · Búsqueda y listado", "3 · Detalle de evento" y "7 · Login y registro"), manteniendo la identidad Mentec (`design-system/ticketera/MASTER.md`). El objetivo es que el comprador filtre `/eventos` con facetas y conteos, entienda mejor el detalle de un evento (hero de marca, información clave, guardar y compartir) y acceda a su cuenta desde una pantalla con presencia de marca. Solo UI con datos mock. Se amplía lo existente sin romperlo: los tests actuales siguen pasando (salvo los casos de `eventFilters.test.ts` que se indican, que se adaptan al nuevo contrato multivalor) y las URLs de filtros actuales siguen funcionando.

## Alcance
- Incluye:
  - **Fase 1 · Búsqueda `/eventos`**: panel de filtros (Categoría y Ciudad con casillas y conteos; Fecha por mes y Precio con opciones únicas), barra lateral de 288 px en `lg`, botón "Filtros" con contador y `Sheet` a pantalla completa en móvil, chips de filtros activos que se pueden quitar, "Ordenar por" (Fecha / Precio más bajo), contador "n eventos", estado vacío del diseño, pills de categoría en móvil, tarjeta horizontal tipo ticket en móvil (variante de `EventCard`) y buscador compacto en `/eventos`.
  - **Fase 2 · Detalle `/eventos/[slug]`**: hero con bloque `bg-brand-navy`, CTA "Comprar entradas · desde S/ X", botones Guardar (persistido en local) y Compartir, barra móvil con volver/guardar/compartir, "Información importante" en grilla 2×2, "Lugar" con mapa de marcador y "Cómo llegar", y relacionados en carrusel con scroll-snap en móvil.
  - **Fase 3 · Acceso `/login` y `/registro`**: layout en dos columnas en `lg` con panel de marca, cabecera de marca en móvil y pestañas segmentadas (enlaces) entre ambas rutas.
  - Archivos de diseño por página: `design-system/ticketera/pages/events-list.md` y `event-detail.md` (se actualizan) y `auth.md` (nuevo).
- No incluye:
  - El aside de compra del detalle para eventos con mapa, la barra fija móvil "Desde S/ X · Comprar entradas" y la ruta `/eventos/<slug>/entradas`: son de la spec seating (contrato H). Aquí no se rehacen. Para eventos sin mapa sigue `TicketSelector` sin cambios.
  - Barra fija móvil de compra para eventos **sin** mapa (el diseño la muestra en todos; ver Preguntas abiertas).
  - Página o listado de "Guardados", sincronizar los guardados con la cuenta o con un backend.
  - Mapa real embebido (Google Maps/Leaflet): el bloque de mapa es un marcador visual.
  - Cambios en `LoginForm`, `RegisterForm`, sus validaciones, textos, h1 o tests; tampoco login social, ni los campos del registro del diseño ("Nombre completo"): se conservan los aprobados.
  - Paginación, búsqueda por texto con autocompletado, filtro por rango libre de fechas en el panel, nuevas categorías o ciudades (el diseño trae "Cine", "Comedia", etc.; se usan las 6 categorías y 5 ciudades del modelo).
  - Rangos de precio del diseño (S/ 50–150, 150–300, > 300): se conservan los actuales por compatibilidad de URL.
  - Cambiar `SiteHeader`, `SiteFooter` o el layout raíz.
- Reemplaza (de specs aprobadas, solo en lo indicado): en `events-listing.md`, el texto del contador ("n eventos encontrados" → "n eventos"), el buscador completo en `/eventos` (pasa a compacto) y los chips de categoría en `lg` (pasan a la barra lateral). En `events-detail.md`, el bloque de cabecera, la sección "Detalles" (pasa a "Información importante" y a la cabecera) y "Ubicación" (pasa a "Lugar" con "Cómo llegar"). En `auth-login-register.md`, la decisión 5 ("sin panel lateral").

## Decisiones tomadas
1. **Filtros con la URL como fuente de verdad y mejora progresiva.** El panel es un `<form action="/eventos" method="get">` con inputs nativos. Sin JS se envía con un botón "Aplicar filtros" dentro de `<noscript>`. Con JS, cada cambio navega al momento con `router.push(href, { scroll: false })` y `useOptimistic` (la casilla responde sin esperar al servidor). El filtrado y los conteos se calculan siempre en el servidor. No se usa `key` para remontar el formulario porque se perdería el foco del control.
2. **Inputs nativos en el panel** (`<input type="checkbox|radio">` con `accent-primary`), no `Checkbox`/`RadioGroup` de shadcn: los de Base UI necesitan JS para cambiar de estado y el panel debe funcionar sin él (KISS, "preferir lo nativo").
3. **Estado del `Sheet` móvil:** al cambiar solo los searchParams, Next 16 conserva el estado de cliente de la página. Su clave de estado no incluye los search params: lo verifiqué en `layout-router.js` (`createRouterCacheKey(segment, true)`) y en `docs/01-app/03-api-reference/02-components/form.md`. Por eso el `Sheet` sigue abierto mientras se aplican filtros y "Ver n eventos" muestra el recuento real del servidor. Sin JS, el `Sheet` no abre (igual que el menú del header). En móvil sin JS siguen funcionando el buscador, las pills, el orden y los chips.
4. **Multivalor compatible:** `categoria` y `ciudad` admiten valores repetidos (`?categoria=teatro&categoria=conciertos`, el formato nativo de un GET con casillas). Un valor único (`?categoria=teatro`) sigue funcionando. Los valores inválidos se descartan uno a uno.
5. **Fecha por mes (`mes=YYYY-MM`)**, con los meses **derivados de los eventos** en zona `America/Lima`. Con el mock actual: Noviembre 2026, Diciembre 2026, Enero 2027, Febrero 2027 y Marzo 2027, más "Cualquier fecha". Así son coherentes con el mock: el diseño traía octubre a diciembre fijos. El parámetro `fecha` actual ("ese día o después", del buscador de la landing) se conserva, se combina con AND y se puede quitar como chip.
6. **Conteos facetados:** el número junto a cada categoría o ciudad es el de eventos que cumplen los demás filtros activos más ese valor. Se ignora la propia faceta para que marcar "Teatro" no ponga a 0 las otras categorías.
7. **Pills de categoría (móvil):** son los enlaces de `CategoryFilter` y mantienen su semántica aprobada de selección única ("Todas" + 6, `aria-current="page"`). La selección múltiple de categorías se hace con las casillas de la barra lateral (`lg`).
8. **Orden** `orden=precio` = `priceFrom` ascendente (empate por fecha). Sin `orden` o con `orden=fecha` se ordena por fecha ascendente (como hoy). En la URL se omite `orden=fecha`.
9. **Detalle:** la cabecera (hero) pasa a ancho completo sobre la grilla. El orden en móvil se mantiene (hero → aside de compra → información → relacionados). El CTA del hero apunta a `#entradas` (contenedor del aside) o, si `hasVenueMap(slug)`, a `/eventos/<slug>/entradas`. La página llama a `hasVenueMap`, de modo que `modules/events` no depende de `modules/seating`.
10. **Auth:** se conservan h1 y textos aprobados ("Iniciar sesión" / "Crear cuenta"). Las pestañas son enlaces (`nav` + `aria-current="page"`), no `role="tablist"`, porque navegan entre rutas. Las renderiza cada página, que conoce su ruta, así que el layout sigue siendo de servidor y no necesita `usePathname`. Los formularios siguen dentro de su `Card` sobre `bg-muted`, sin tocarlos.

## Requisitos

### Fase 1 · Búsqueda `/eventos`
1. **Parámetros** (todos opcionales; los inválidos se ignoran sin error): `q`, `categoria` (multi), `ciudad` (multi), `mes` (`YYYY-MM`), `fecha` (`YYYY-MM-DD`), `precio` (valores actuales), `orden` (`fecha` | `precio`). En los de valor único, si llegan repetidos se toma el primero.
2. **Filtrado:** AND entre facetas y OR dentro de una faceta multivalor. `mes` compara el mes del evento en zona Lima. El resto de reglas no cambia (`events-listing.md` req. 3).
3. **h1:** "Eventos", o el nombre de la categoría si hay **exactamente una** (p. ej. "Teatro"). Metadata `<h1> | Mentec Tickets`.
4. **Buscador en `/eventos`:** variante compacta de `EventSearchBar` (solo "Buscar" + botón "Buscar"), con inputs ocultos que conservan los demás filtros y el orden. La landing sigue con la variante completa, sin cambios visibles.
5. **Barra lateral (`lg+`)**, columna de 288 px a la izquierda de los resultados:
   - `<aside aria-labelledby>` con h2 "Filtros" (icono `SlidersHorizontal`) y, solo si hay algún filtro de faceta activo (`categoria`, `ciudad`, `mes`, `fecha`, `precio`), un enlace "Limpiar" que conserva `q` y `orden`.
   - Cuatro `fieldset` con `legend`: "Categoría" (6 casillas con conteo), "Ciudad" (5 casillas con conteo), "Fecha" (radios "Cualquier fecha" + meses) y "Precio desde" (radios "Cualquier precio" + los 5 rangos de `PRICE_RANGES`).
   - Cada opción es un `<label>` de `h-11` (≥ 44 px) con el input `size-5 accent-primary cursor-pointer`. Nombre accesible de las casillas: "Teatro, 2 eventos" (el conteo es visible, `tabular-nums text-muted-foreground`, y lleva un texto `sr-only`).
6. **Móvil y tablet (`< lg`):**
   - Fila con un botón "Filtros" (outline `h-11`, icono `SlidersHorizontal`) y un contador `rounded-full bg-primary text-primary-foreground` cuando hay filtros del panel activos. Contador = nº de ciudades + 1 si `mes` + 1 si `precio`, con nombre accesible "Filtros, n activos".
   - Al pulsar "Filtros" se abre un `Sheet` a pantalla completa:
     - Cabecera: título "Filtros" y botón de cierre propio `size-11` "Cerrar filtros".
     - Cuerpo con scroll: "Ciudad", "Fecha" y "Precio desde" (Categoría va en las pills).
     - Pie fijo: "Limpiar" (outline; enlace que quita `ciudad`, `mes` y `precio` y conserva el resto) y "Ver n eventos" (primario, cierra el `Sheet`; "Ver 1 evento" en singular).
     - El foco queda atrapado dentro y vuelve al botón al cerrar (Base UI); Escape cierra.
   - Debajo, las pills de categoría (`CategoryFilter`, scroll horizontal propio). En `lg` se ocultan.
7. **Ordenar por:** grupo `role="group"` con la etiqueta "Ordenar por" (visible desde `sm`, `sr-only` en móvil) y dos enlaces "Fecha" y "Precio más bajo". El activo lleva `aria-current="true"` y `bg-primary text-primary-foreground font-semibold`. `h-11`, dentro de un contenedor `rounded-xl ring-1 ring-border p-1`. Conserva todos los filtros.
8. **Contador y chips:**
   - `<p aria-live="polite" aria-atomic="true">` con "n eventos" o "1 evento" (`text-base font-bold`).
   - A su lado (`flex-wrap`), un chip por cada valor activo, en este orden: categorías, ciudades, mes ("Noviembre 2026"), fecha ("Desde el 1 de enero de 2027"), precio (label del rango). No hay chip para `q` ni `orden`.
   - Cada chip es un enlace a la URL sin ese valor, con texto visible = label + icono `X` (`aria-hidden`) y `aria-label="Quitar filtro <label>"`. Estilo: `h-11 rounded-full bg-accent text-accent-foreground ring-1 ring-primary/30`.
9. **Grilla:** 1 columna en móvil con `EventCard layout="ticket"`, `sm:grid-cols-2` y `xl:grid-cols-3` (la barra lateral ocupa columna), `gap-4 md:gap-6`.
10. **Tarjeta ticket (`< sm`)**, de la misma `EventCard`:
    - Horizontal: imagen de 108 px a la izquierda (con el badge de categoría) y contenido con borde izquierdo discontinuo (`border-dashed border-border`) más dos muescas semicirculares decorativas (`aria-hidden`, `bg-background ring-1 ring-border`).
    - Contenido: fecha overline, título `line-clamp-2`, "Lugar, Ciudad" truncado, y "Desde S/ X" con el badge de estado.
    - Sin el botón "Ver entradas": toda la tarjeta es clicable porque el enlace del título se estira (`after:absolute after:inset-0`).
    - Desde `sm` es idéntica a la tarjeta actual. El valor por defecto de `layout` (`"grid"`) no cambia nada para el resto de usos.
11. **Estado vacío:**
    - Bloque `rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center`.
    - Contiene: icono `Search` en un cuadro `size-14 rounded-2xl bg-accent text-primary-strong`, "No encontramos eventos con esos filtros" (`text-xl font-bold`), "Prueba quitando algún filtro o buscando otra ciudad." (`text-muted-foreground`) y un botón primario "Limpiar filtros" `h-11` que enlaza a `/eventos`.
12. **Accesibilidad:** un único h1; foco visible en todo; nada se comunica solo con color (el chip activo de orden lleva `aria-current`); sin scroll horizontal de página a 375 / 768 / 1024 / 1440; `prefers-reduced-motion` respetado (sin animaciones nuevas salvo las del `Sheet`).

### Fase 2 · Detalle `/eventos/[slug]`
1. **Barra superior móvil (`< lg`)**, encima del hero: enlace "Volver a eventos" (solo icono `ArrowLeft`, `size-11`, `aria-label`) a `/eventos`, y a la derecha Guardar y Compartir (`size-11`, ghost). En `lg` se ve el breadcrumb actual en su lugar (el breadcrumb pasa a `hidden lg:flex`).
2. **Hero** (`EventDetailHeader`), con ancho completo del contenedor:
   - Bloque `rounded-3xl overflow-hidden bg-brand-navy text-primary-foreground`. En `lg` es una grilla de 2 columnas: texto a la izquierda e imagen a la derecha (`next/image fill object-cover`, `preload`, alt actual), con `min-h-[28rem]`. En móvil, la imagen va arriba (`aspect-[16/9]`) y el texto debajo.
   - Texto: badge de categoría outline (`border-primary-foreground/30`), h1 (Display del MASTER) y lista con iconos (`aria-hidden`):
     - fecha larga con mayúscula inicial ("Sábado, 14 de noviembre de 2026", `formatLongDate`);
     - hora de inicio ("21:00", `formatTime`);
     - "Lugar, Ciudad".
     Los secundarios van en `text-primary-foreground/80`.
   - Fila de acciones:
     - CTA primario `h-12`: "Comprar entradas · desde S/ X" (`formatEventPrice(priceFrom)`), o "Ver entradas · Entrada libre" si `priceFrom = 0`. Enlaza a `purchaseHref`.
     - En `lg`, también Guardar y Compartir (outline sobre navy: `border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10`, `size-12`).
     - Evento `sold-out`: sin CTA; en su lugar, el texto "Entradas agotadas" (`font-bold`, no interactivo).
3. **`purchaseHref`** (calculado en la página): `hasVenueMap(slug)` (de `@/modules/seating`, contrato B) → `/eventos/<slug>/entradas`; si no → `#entradas`. El contenedor del aside lleva `id="entradas"` y `scroll-mt-24`.
4. **Guardar:** botón `type="button"` con `aria-label="Guardar evento"` fijo y `aria-pressed`. Icono `Heart`, relleno (`fill-current`) cuando está guardado. Usa `useSavedEventsStore` (zustand `persist`, clave localStorage `mentec-saved`, solo `slugs`, `skipHydration: true`). El botón rehidrata el store en un `useEffect` al montar, como `AuthHeaderActions`. Las dos instancias (móvil y `lg`) comparten estado.
5. **Compartir:** botón `type="button"` con `aria-label="Compartir evento"` e icono `Share2`.
   - Si existe `navigator.share`, llama `navigator.share({ title, url: window.location.href })` e ignora el `AbortError` (cuando el usuario cancela).
   - Si no, hace `navigator.clipboard.writeText(url)`. El icono pasa a `Check` durante 2 s y una región `role="status"` (`sr-only`) anuncia "Enlace copiado".
   - Si la copia falla, anuncia "No pudimos copiar el enlace".
6. **Contenido** (`EventDetailInfo`), en la columna izquierda en `lg`:
   - "Acerca del evento": párrafos actuales y, al final, "Organiza: <organizador>" (`text-muted-foreground`).
   - "Información importante": `dl` en grilla 2×2 a cualquier ancho (`grid-cols-2 gap-3 md:gap-4`). Cada celda es una tarjeta `rounded-2xl ring-1 ring-border p-4` con un icono en `size-11 rounded-xl bg-accent text-primary-strong`, `dt` (`text-sm text-muted-foreground`) y `dd` (`font-bold`). En móvil, el icono va encima del texto; desde `md`, al lado. Valores:
     - "Apertura de puertas" (`Clock`): `formatTime(doorsOpenAt)`.
     - "Inicio" (`CalendarClock`): `formatTime(startsAt)`.
     - "Edad mínima" (`Users`): "Todo público" o "+N".
     - "Ingreso" (`QrCode`): "Entrada digital con QR".
   - "Lugar": tarjeta `rounded-2xl ring-1 ring-border overflow-hidden` con:
     - marcador de mapa `aspect-[16/7] bg-accent` con icono `MapPin` (`text-primary`), decorativo y entero `aria-hidden`;
     - debajo, el nombre del lugar (`font-bold`), "dirección, ciudad" (`text-muted-foreground`) y el botón outline `h-11` "Cómo llegar". Este enlaza a la URL de Google Maps actual, se abre en pestaña nueva con `rel="noopener noreferrer"`, lleva el icono `ExternalLink` (`aria-hidden`) y el texto `sr-only` "(se abre en una pestaña nueva)".
   - Desaparece la sección "Detalles": su fecha y hora pasan al hero; el lugar, a "Lugar".
7. **Relacionados:**
   - Sección `bg-muted` a ancho completo. `SectionHeader` "También te puede interesar" con la acción "Ver más en <Categoría>", que enlaza a `/eventos?categoria=<categoria>` (`h-11`, `text-primary-strong`).
   - En móvil (`< sm`): fila con `overflow-x-auto snap-x snap-mandatory`, tarjetas `w-64 shrink-0 snap-start`, scrollbar oculta y sin scroll horizontal de página. Desde `sm`, la grilla actual (2/3/4 columnas).
8. **Sin cambios** en el contenido del aside (seating o `TicketSelector`), la barra fija móvil de seating, `not-found.tsx`, `generateStaticParams` ni `generateMetadata`.

### Fase 3 · Acceso
1. **Layout `(auth)`:**
   - En `lg`: grilla `lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`. Izquierda, el panel de marca; derecha, el contenido sobre `bg-muted`, centrado, con `px-4 py-12 md:py-16`.
   - En móvil: la cabecera de marca arriba y el contenido debajo.
   - Header y footer del layout raíz se mantienen.
2. **Panel de marca** (`AuthBrandPanel`, server), en `bg-brand-navy text-primary-foreground`:
   - En `lg`: columna `p-10 flex flex-col gap-8` con `BrandLogo variant="white"` (`h-8 w-auto`), imagen (`next/image fill`, `rounded-2xl`, `flex-1 min-h-80`, `alt=""` decorativa) y textos.
   - En móvil: franja de `h-52` con los textos a la izquierda (`max-w-[55%]`) y la imagen a la derecha (`w-[44%]`, `rounded-bl-[2.5rem]`). Sin logo, porque el header ya lo muestra.
   - Textos (`<p>`, no encabezados, para no alterar la jerarquía del h1): "Tus entradas, siempre a mano." (`text-2xl lg:text-4xl font-bold tracking-tight`) y "Compra en minutos y lleva tu QR en el celular." (`text-primary-foreground/80`).
   - Imagen: la URL de Unsplash de `festival-sol-de-verano` (`photo-1533174072545-7a4b6ad7a6c3`), copiada como constante en el componente (auth no importa de events).
3. **Pestañas** (`AuthTabs`, server, prop `current: "login" | "register"`):
   - `<nav aria-label="Acceso a tu cuenta">` con un contenedor segmentado `grid grid-cols-2 gap-1 rounded-xl bg-background p-1 ring-1 ring-border`.
   - Dos enlaces `h-11`: "Iniciar sesión" (→ `/login`) y "Crear cuenta" (→ `/registro`). El actual lleva `aria-current="page"` y `bg-primary text-primary-foreground font-semibold`; el otro, `hover:bg-accent`. Foco visible.
4. **Páginas:** `/login` y `/registro` componen `<AuthTabs current=…/>` + el formulario en una columna con el ancho de su tarjeta (`max-w-md` / `max-w-lg`) y `gap-6`. Metadata sin cambios.
5. **Formularios intactos:** `LoginForm` y `RegisterForm` (y sus tests) no se modifican.

## Criterios de aceptación

### Fase 1
- [ ] Dado `/eventos` a 1440 px, cuando carga, entonces se ve h1 "Eventos", el buscador compacto y la barra lateral de 288 px con h2 "Filtros". La barra tiene los grupos "Categoría" (6 casillas), "Ciudad" (5), "Fecha" ("Cualquier fecha", "Noviembre 2026", "Diciembre 2026", "Enero 2027", "Febrero 2027", "Marzo 2027") y "Precio desde" ("Cualquier precio" + 5 rangos). Además se ven "12 eventos", el orden con "Fecha" activo y 12 tarjetas en 3 columnas. No hay enlace "Limpiar".
- [ ] Dado `/eventos` con JS, cuando se marca "Teatro", entonces la URL pasa a `/eventos?categoria=teatro` sin volver arriba, se listan 2 eventos, el contador dice "2 eventos", el chip "Teatro" aparece y la casilla sigue marcada y con el foco.
- [ ] Dado `/eventos?categoria=teatro`, cuando se marca también "Conciertos", entonces la URL es `/eventos?categoria=teatro&categoria=conciertos`, se listan 4 eventos y el h1 es "Eventos".
- [ ] Dado `/eventos?categoria=teatro` (URL antigua de valor único), entonces el h1 es "Teatro", el `<title>` es "Teatro | Mentec Tickets", la casilla "Teatro" está marcada y, en móvil, la pill "Teatro" tiene `aria-current="page"`. Dado `/eventos?ciudad=Cusco&precio=0-50`, entonces solo hay eventos de Cusco con `priceFrom` ≤ 50.
- [ ] Dado `/eventos?ciudad=Lima`, entonces cada categoría muestra el conteo 1 y las ciudades muestran Lima 6, Arequipa 2, Cusco 1, Trujillo 2 y Piura 1. El nombre accesible de la casilla Lima es "Lima, 6 eventos".
- [ ] Dado `/eventos?mes=2027-01`, entonces se listan 3 eventos (10, 16 y 23 de enero de 2027), el radio "Enero 2027" está marcado y hay un chip "Enero 2027".
- [ ] Dado `/eventos?orden=precio`, entonces la primera tarjeta es "Aventura en el bosque mágico" (Entrada libre), seguida de "El circo de las estrellas" (S/ 35.00) y "Copa del Norte: semifinal" (S/ 40.00), y "Precio más bajo" tiene `aria-current="true"`. Al pulsar "Fecha", la URL ya no tiene `orden`.
- [ ] Dado `/eventos?categoria=teatro&ciudad=Lima&precio=100-200`, entonces hay 1 evento y los chips "Teatro", "Lima" y "S/ 100 – S/ 200", con `aria-label` "Quitar filtro Teatro", etc. Cuando se pulsa "Quitar filtro Lima", entonces navega a `/eventos?categoria=teatro&precio=100-200` y la casilla "Lima" queda desmarcada.
- [ ] Dado `/eventos?q=estadio&categoria=deportes&orden=precio`, cuando se pulsa "Limpiar" en la barra lateral, entonces navega a `/eventos?q=estadio&orden=precio`.
- [ ] Dado `/eventos?fecha=2027-01-01` (desde la landing), entonces aparece el chip "Desde el 1 de enero de 2027" y al quitarlo se listan los 12 eventos.
- [ ] Dado JS desactivado a 1440 px, cuando se marcan "Lima" y "Arequipa" y se pulsa "Aplicar filtros", entonces navega a `/eventos?ciudad=Lima&ciudad=Arequipa` (más los inputs ocultos no vacíos) y muestra los 8 eventos. Los chips, el orden, las pills y el buscador funcionan sin JS (son enlaces o GET).
- [ ] Dado `/eventos?categoria=deportes`, cuando se busca "nacional" en el buscador compacto, entonces navega a `/eventos?q=nacional&categoria=deportes` y se conserva el filtro.
- [ ] Dado el buscador de la landing con ciudad "Lima" y "Hasta S/ 50", cuando se envía, entonces `/eventos` muestra la casilla "Lima" marcada, el radio "Hasta S/ 50" seleccionado y sus dos chips.
- [ ] Dado `/eventos?categoria=opera&categoria=teatro&ciudad=Tokio&mes=2027-13&orden=xyz`, entonces solo se aplica `categoria=teatro` (2 eventos), sin errores.
- [ ] Dado 375 px, entonces no hay scroll horizontal ni barra lateral. Se ve la fila "Filtros" + "Ordenar por" (que cabe en el ancho), las pills con scroll propio, el contador y las tarjetas en formato ticket horizontal: sin botón "Ver entradas" y con toda la tarjeta enlazando al detalle.
- [ ] Dado 375 px y `/eventos?ciudad=Lima&ciudad=Cusco&precio=0-50`, entonces el botón muestra "Filtros" con el contador 3 y su nombre accesible incluye "3 activos". Cuando se pulsa, se abre un `Sheet` a pantalla completa titulado "Filtros" con "Ciudad", "Fecha" y "Precio desde", y el foco queda dentro.
- [ ] Dado el `Sheet` abierto, cuando se desmarca "Cusco", entonces la URL se actualiza, el `Sheet` sigue abierto y el botón pasa a "Ver n eventos" con el recuento real. Cuando se pulsa "Ver n eventos" o Escape, entonces se cierra y el foco vuelve a "Filtros". Cuando se pulsa "Limpiar", entonces se quitan ciudad, mes y precio y se conservan `q`, `categoria` y `orden`.
- [ ] Dado `/eventos?categoria=teatro&ciudad=Piura`, entonces se ve "0 eventos", el bloque vacío con "No encontramos eventos con esos filtros", "Prueba quitando algún filtro o buscando otra ciudad." y "Limpiar filtros" (→ `/eventos`).
- [ ] Dado navegación solo con teclado, entonces todos los controles del panel, los chips, el orden, las pills y las tarjetas se alcanzan con Tab, tienen foco visible y miden ≥ 44 px de alto.
- [ ] Dado `npx vitest run`, entonces pasan los tests nuevos y los existentes; en `eventFilters.test.ts` solo se adaptan los casos que indica la sección Tests. `npm run lint` y `npm run build` terminan sin errores.

### Fase 2
- [ ] Dado `/eventos/noche-de-sintetizadores-lima` a 1440 px, entonces se ve el breadcrumb y el hero navy con badge "Conciertos", h1 "Noche de Sintetizadores: Gira Neón 2026", "Sábado, 14 de noviembre de 2026", "21:00", "Estadio Nacional, Lima" y la imagen a la derecha, además de "Comprar entradas · desde S/ 180.00", "Guardar evento" y "Compartir evento". Hay un único h1.
- [ ] Dado un evento sin mapa (`hasVenueMap` falso), cuando se pulsa el CTA del hero, entonces se desplaza al selector de entradas (`#entradas`), que no queda tapado por el header. Dado un evento con mapa (según la spec seating), entonces el CTA enlaza a `/eventos/<slug>/entradas`.
- [ ] Dado `los-ecos-del-sur-arequipa`, entonces el hero muestra "Entradas agotadas" sin enlace de compra. Dado `aventura-en-el-bosque-magico`, entonces el CTA dice "Ver entradas · Entrada libre".
- [ ] Dado "Guardar evento" con `aria-pressed="false"`, cuando se pulsa, entonces pasa a `aria-pressed="true"`, el corazón se rellena y `localStorage["mentec-saved"]` contiene el slug. Tras recargar, sigue pulsado. Al pulsarlo otra vez, el slug se elimina.
- [ ] Dado un navegador con Web Share, cuando se pulsa "Compartir evento", entonces se llama `navigator.share` con el título y la URL. Sin Web Share, la URL se copia al portapapeles, se anuncia "Enlace copiado" (`role="status"`) y el icono cambia a check durante 2 s. Si la copia falla, se anuncia "No pudimos copiar el enlace".
- [ ] Dado `noche-de-sintetizadores-lima`, entonces "Información importante" muestra 4 celdas en 2×2: "Apertura de puertas" 18:00, "Inicio" 21:00, "Edad mínima" "Todo público" e "Ingreso" "Entrada digital con QR". Dado `festival-sol-de-verano`, la edad es "+18". "Acerca del evento" termina con "Organiza: …".
- [ ] Dado la sección "Lugar", entonces el marcador de mapa es `aria-hidden` y se ven el lugar, la dirección con la ciudad y "Cómo llegar", que se abre en pestaña nueva con `rel="noopener noreferrer"` hacia Google Maps.
- [ ] Dado "También te puede interesar" a 375 px, entonces las tarjetas se desplazan en horizontal con scroll-snap sin scroll horizontal de página. Desde 640 px se ven en grilla. "Ver más en Conciertos" enlaza a `/eventos?categoria=conciertos`.
- [ ] Dado 375 px, entonces arriba se ve la barra con "Volver a eventos" (→ `/eventos`), "Guardar evento" y "Compartir evento" (≥ 44 px), y no se ve el breadcrumb. El orden es hero (imagen y luego bloque navy) → aside de compra → información → relacionados, sin scroll horizontal.
- [ ] Dado un evento sin mapa, entonces el aside sigue siendo `TicketSelector` con su comportamiento actual. Dado un evento con mapa, entonces el aside y la barra móvil son los de la spec seating, sin cambios.
- [ ] Dado `npx vitest run`, entonces pasan los tests nuevos (store, Guardar, Compartir) y los existentes (incluido `TicketSelector.test.tsx`). `npm run lint` y `npm run build` terminan sin errores.

### Fase 3
- [ ] Dado `/login` a 1440 px, entonces a la izquierda se ve el panel navy con el logo blanco, la imagen, "Tus entradas, siempre a mano." y "Compra en minutos y lleva tu QR en el celular.", y a la derecha las pestañas sobre la tarjeta de inicio de sesión. El h1 sigue siendo "Iniciar sesión" y es el único h1.
- [ ] Dado `/login`, entonces la pestaña "Iniciar sesión" tiene `aria-current="page"`. Cuando se pulsa "Crear cuenta", entonces navega a `/registro`, donde "Crear cuenta" tiene `aria-current="page"` y se ve el formulario de registro con su h1 "Crear cuenta".
- [ ] Dado navegación por teclado, entonces ambas pestañas se alcanzan con Tab, tienen foco visible y miden ≥ 44 px.
- [ ] Dado 375 px, entonces arriba se ve la franja navy con los dos textos y la imagen a la derecha, y debajo las pestañas y el formulario, sin scroll horizontal. La imagen es decorativa (`alt=""`).
- [ ] Dado `npx vitest run modules/auth`, entonces pasan todos los tests existentes sin modificarlos. `npm run lint` y `npm run build` terminan sin errores.

## Diseño técnico

### Fase 1
- **Ruta** `app/eventos/page.tsx`: solo compone. Consultar `node_modules/next/dist/docs/` (searchParams como Promise).
  ```tsx
  const filters = parseEventFilters(await searchParams);
  const allEvents = await getEvents();
  const events = filterEvents(allEvents, filters);           // ya ordenado según filters.orden
  const facets = getFacetCounts(allEvents, filters);
  const months = getEventMonths(allEvents);
  const chips = getActiveFilterChips(filters);
  // h1 → <EventSearchBar variant="compact" defaultValues={filters} />
  // → contenedor `grid gap-8 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start lg:gap-10`:
  //    <EventFiltersSidebar className="hidden lg:block" filters facets months />
  //    <section aria-label="Resultados" className="flex min-w-0 flex-col gap-4 md:gap-6">
  //      fila: <EventFiltersSheet className="lg:hidden" filters facets months resultCount={events.length} /> + <EventsSort filters />
  //      <CategoryFilter className="lg:hidden" filters />
  //      <EventsResults events chips />
  ```
  `pageTitle`: `filters.categoria?.length === 1 ? EVENT_CATEGORY_LABELS[filters.categoria[0]] : "Eventos"`.
- **Datos** `modules/events/data/searchOptions.ts` (modificar): añade `SORT_OPTIONS = [{ value: "fecha", label: "Fecha" }, { value: "precio", label: "Precio más bajo" }] as const` y `SORT_VALUES`. `CITIES` y `PRICE_RANGES` no cambian.
- **Schema** `modules/events/schemas/eventFilters.schema.ts` (modificar). Contrato resultante:
  ```ts
  export const citySchema = z.enum(CITIES);
  // multi: string | string[] → array de valores válidos, sin duplicados, en orden de llegada; [] → undefined.
  export const eventFiltersSchema = z.object({
    q: z.string().trim().min(1).optional().catch(undefined),
    categoria: multiValue(eventCategorySchema),          // EventCategory[] | undefined
    ciudad: multiValue(citySchema),                      // City[] | undefined
    mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().catch(undefined),
    fecha: z.iso.date().optional().catch(undefined),
    precio: z.enum(PRICE_RANGE_VALUES).optional().catch(undefined),
    orden: z.enum(SORT_VALUES).optional().catch(undefined),
  });
  export type EventFilters = z.infer<typeof eventFiltersSchema>;
  export type City = z.infer<typeof citySchema>;
  ```
  `multiValue` es un helper local del archivo (preprocess + `array(item.catch(...))` filtrado, o equivalente sin `any`), sin regla de negocio fuera de lo indicado.
- **Utils** `modules/events/utils/eventFilters.ts` (modificar). Todo puro y sin React:
  - `parseEventFilters(searchParams)`: en `categoria`/`ciudad` conserva todos los valores; en el resto toma el primero si llega un array.
  - `filterEvents(events, filters)`: requisito F1-2. Ordena por `orden` (decisión 8) y no muta la entrada.
  - `toSearchParamEntries(filters): [string, string][]`: respeta el orden de las claves del objeto, repite las claves multivalor, omite vacíos, `undefined`, arrays vacíos y `orden="fecha"`.
  - `buildEventsHref(filters)`: `/eventos` + `URLSearchParams(toSearchParamEntries(filters))`.
  - `toggleFilterValue(filters, key: "categoria" | "ciudad", value)`: añade o quita el valor; si queda vacío → `undefined`.
  - `getFacetCounts(events, filters): FacetCounts` con `FacetCounts = { categoria: Record<EventCategory, number>; ciudad: Record<City, number> }` (decisión 6; incluye las opciones con 0).
  - `formatMonthLabel("2026-11")` → "Noviembre 2026".
  - `getEventMonths(events): MonthOption[]` con `MonthOption = { value: string; label: string }`: meses únicos en zona Lima, ascendentes.
  - `getActiveFilterChips(filters): FilterChip[]` con `FilterChip = { id: string; label: string; href: string }`: orden y labels del requisito F1-8; `href` = la URL sin ese valor. La fecha se formatea con `Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })` sobre `${fecha}T00:00:00Z` → "Desde el 1 de enero de 2027".
- **Componentes** (`modules/events/components/`):
  - existente `EventCard.tsx` (modificar): prop `layout?: "grid" | "ticket"` (por defecto `"grid"`), con las clases de cada parte (card, imagen, contenido, CTA) definidas con `cva`. `ticket` solo cambia por debajo de `sm` (`max-sm:` en las variantes); el resto, como el requisito F1-10. No se duplica el componente.
  - existente `EventSearchBar.tsx` (modificar): prop `variant?: "full" | "compact"` (por defecto `"full"`, que es la landing sin cambios visibles; `defaultValues.ciudad?.[0]` precarga el `Select`). `compact`: label "Buscar", input `q` y botón "Buscar" en una fila (`grid-cols-[minmax(0,1fr)_auto]`), con `<input type="hidden">` por cada entrada de `toSearchParamEntries(filters)` salvo `q`. Se elimina el hidden `categoria` actual: lo cubren estos inputs.
  - existente `CategoryFilter.tsx` (modificar): acepta `className`. "Todas" → `categoria: undefined`; cada pill → `categoria: [category]`. Activa = `categoria` con exactamente ese valor ("Todas" si no hay ninguno). Conserva los demás filtros.
  - existente `EventsResults.tsx` (modificar): props `{ events: Event[]; chips: FilterChip[] }`. Contador y chips (requisito F1-8, como subcomponente local `ActiveFilterChips` en el mismo archivo), grilla con `layout="ticket"` (F1-9) y estado vacío (F1-11). Mantiene el h2 `sr-only` "Resultados".
  - nuevo `EventsSort.tsx` (server): requisito F1-7, enlaces con `buildEventsHref({ ...filters, orden })`. No hay equivalente en el proyecto ni en shadcn: `ToggleGroup` es de cliente y no navega.
  - nuevo `EventFiltersForm.tsx` (`"use client"`): props `{ filters; facets; months; sections: FilterSection[]; className? }` con `FilterSection = "categoria" | "ciudad" | "mes" | "precio"`.
    - Renderiza `<form action="/eventos" method="get">` con los `fieldset` de `sections` (inputs nativos controlados por `useOptimistic(filters)`).
    - Un `<input type="hidden">` por cada entrada de los filtros que no están en `sections`, más `q`, `fecha` y `orden`.
    - `<noscript>` con el botón "Aplicar filtros" (`h-11`, primario).
    - `onChange`: `startTransition(() => { setOptimistic(next); router.push(buildEventsHref(next), { scroll: false }) })`.
    - "Cualquier fecha" y "Cualquier precio" tienen `value=""`.
    - Es nuevo porque es la única pieza del panel con estado; sin él no hay mejora progresiva.
  - nuevo `EventFiltersSidebar.tsx` (server): `<aside>` con la cabecera (h2 "Filtros" + "Limpiar" si aplica) y `<EventFiltersForm sections={["categoria","ciudad","mes","precio"]} />` en una tarjeta `rounded-2xl ring-1 ring-border p-6`.
  - nuevo `EventFiltersSheet.tsx` (`"use client"`): `Sheet` (shadcn, instalado) con `SheetTrigger` "Filtros" + contador y `SheetContent side="right"` a pantalla completa (`w-full`, sin `max-w`) con `showCloseButton={false}`. Dentro: `SheetHeader`/`SheetTitle` "Filtros" + `SheetClose` "Cerrar filtros" (`size-11`), `<EventFiltersForm sections={["ciudad","mes","precio"]} />` con scroll, y `SheetFooter` con "Limpiar" (`Link`) y `SheetClose` "Ver n eventos".
- **API pública** `modules/events/index.ts` (modificar): añade `EventFiltersSheet`, `EventFiltersSidebar`, `EventsSort`, `getActiveFilterChips`, `getEventMonths`, `getFacetCounts`. El tipo `EventFilters` ya está exportado.
- **Contrato de URL** (no hay API; mock): query de `/eventos` = `EventFilters` serializado con `toSearchParamEntries`. Cuando exista API, se enviará el mismo `EventFilters`, y la respuesta deberá incluir los resultados y `FacetCounts`.

### Fase 2
- **Ruta** `app/eventos/[slug]/page.tsx` (modificar, **después** de las tareas de seating que la tocan):
  ```tsx
  const purchaseHref = hasVenueMap(slug) ? `/eventos/${slug}/entradas` : "#entradas"; // import { hasVenueMap } from "@/modules/seating"
  // <div className="mx-auto max-w-7xl px-4 pt-4 md:px-6 md:pt-8 lg:px-8"><EventDetailHeader event={event} purchaseHref={purchaseHref} /></div>
  // <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12 lg:px-8">
  //   <div id="entradas" className="scroll-mt-24 lg:col-start-2 lg:row-start-1">{/* aside tal como lo dejó seating: mapa → componente seating; si no → TicketSelector */}</div>
  //   <EventDetailInfo event={event} />   {/* lg:col-start-1 lg:row-start-1 */}
  // </div>
  // <RelatedEvents events={relatedEvents} category={event.category} />
  // (+ barra fija móvil de seating donde la haya dejado)
  ```
- **Store** `modules/events/stores/saved.store.ts` (nuevo):
  ```ts
  type SavedEventsState = { slugs: string[]; toggle: (slug: string) => void };
  export const useSavedEventsStore = create<SavedEventsState>()(
    persist(/* toggle añade o quita */, { name: "mentec-saved", partialize: (s) => ({ slugs: s.slugs }), skipHydration: true }),
  );
  ```
  Es interno del módulo (no se exporta: YAGNI).
- **Componentes** (`modules/events/components/`):
  - nuevo `SaveEventButton.tsx` (`"use client"`): props `{ slug: string } & ComponentProps<"button">` (reenvía `className`/props). `useEffect(() => { useSavedEventsStore.persist.rehydrate() }, [])`. Requisito F2-4. No existe en el proyecto ni en shadcn (`Toggle` de shadcn sirve como base visual; el developer puede usar `Toggle` con `pressed`/`onPressedChange` si mantiene `aria-label` y tamaños).
  - nuevo `ShareEventButton.tsx` (`"use client"`): props `{ title: string } & ComponentProps<"button">`. Requisito F2-5. El temporizador de 2 s se limpia al desmontar.
  - existente `EventDetailHeader.tsx` (modificar): props `{ event: EventDetail; purchaseHref: string }`. Contiene la barra móvil (F2-1), el breadcrumb (`hidden lg:flex`) y el hero (F2-2). Sigue siendo Server Component y embebe los dos botones cliente.
  - existente `EventDetailInfo.tsx` (modificar): requisito F2-6. Reutiliza `formatTime` y la URL de Maps actual.
  - existente `RelatedEvents.tsx` (modificar): prop nueva `category: EventCategory`; requisito F2-7.
- `modules/events/index.ts`: sin cambios (los componentes nuevos los usa `EventDetailHeader`).
- **Contrato de API:** no aplica. `localStorage["mentec-saved"]` = `{ state: { slugs: string[] }, version: 0 }` (formato de `persist`).

### Fase 3
- **Componentes** (`modules/auth/components/`):
  - nuevo `AuthBrandPanel.tsx` (server): requisito F3-2. Usa `BrandLogo` (existente, `components/shared`) y `next/image`.
  - nuevo `AuthTabs.tsx` (server): requisito F3-3, con `next/link`.
- `modules/auth/index.ts` (modificar): exporta además `AuthBrandPanel` y `AuthTabs`.
- **Rutas:**
  - `app/(auth)/layout.tsx` (modificar): grilla de F3-1 con `<AuthBrandPanel />` + `<div className="flex justify-center bg-muted px-4 py-12 md:py-16">{children}</div>`.
  - `app/(auth)/login/page.tsx` y `app/(auth)/registro/page.tsx` (modificar): `<div className="flex w-full max-w-md flex-col gap-6"><AuthTabs current="login" /><LoginForm /></div>`, o `max-w-lg` y `register` en registro.
- **Contrato de API:** no aplica.

## Reutilización
- **Events:** `EventCard` (se extiende con `layout`), `EventSearchBar` (se extiende con `variant`), `CategoryFilter`, `EventsResults`, `EventDetailHeader`, `EventDetailInfo`, `RelatedEvents`, `TicketSelector` (intacto), `parseEventFilters`/`filterEvents`/`buildEventsHref`, `CITIES`, `PRICE_RANGES`, `EVENT_CATEGORY_LABELS`, `EVENT_STATUS_BADGE`, `formatEventDate`/`formatLongDate`/`formatTime`/`formatEventPrice`, `getEvents`/`getRelatedEvents`.
- **Shared y UI:** `SectionHeader` (con `action`), `BrandLogo` (`variant="white"`), shadcn instalados: `Sheet`, `Button`/`buttonVariants`, `Badge`, `Card`, `Breadcrumb`, `Input`, `Select`, `Toggle` (opcional en Guardar).
- **Otros módulos y librerías:** patrón de store con `persist` + `skipHydration` + rehidratación en `useEffect` de `modules/auth/stores/auth.store.ts`, y `AuthHeaderActions`; `hasVenueMap` de `@/modules/seating` (contrato B); `cn` de `@/lib/utils`; `cva` (`class-variance-authority`, ya instalado); `lucide-react`.
- **Nativo:** `<form method="get">`, `<noscript>`, inputs checkbox/radio, `Intl.DateTimeFormat`, `URLSearchParams`, Web Share API y Clipboard API, scroll-snap de CSS.
- **Sin dependencias nuevas ni instalaciones de shadcn.** El registro de shadcn no se pudo consultar desde este entorno (el proxy bloquea `ui.shadcn.com`). La decisión de no usar `Checkbox`/`RadioGroup` es deliberada (decisión 2) y el resto de piezas ya está instalado.

## Tests
- **`modules/events/utils/eventFilters.test.ts` (Fase 1, ampliar).**
  - Solo se **adaptan** estos casos existentes al contrato multivalor:
    - "acepta valores válidos": `ciudad: ["Cusco"]`, `categoria: ["teatro"]`.
    - "convierte cada valor inválido…": el parámetro desconocido de ejemplo `orden: "desc"` pasa a `pagina: "2"`, porque `orden` ahora es conocido.
    - "toma el primer valor…" pasa a "conserva todos los valores multivalor y el primero en los de valor único": `ciudad: ["Arequipa", "Lima"]`, `precio: undefined`.
    - En los casos de `filterEvents` y `buildEventsHref`, `ciudad`/`categoria` se escriben como arrays, con las mismas expectativas.
  - Casos nuevos:
    - `parseEventFilters`: un string en multivalor pasa a array; los valores inválidos de un array se descartan y se conservan los válidos; sin duplicados; todo inválido → `undefined`; `mes` válido o inválido (`2027-13`, `2027-1`); `orden` válido o inválido; `q`/`mes`/`precio` en array → el primero.
    - `filterEvents`: OR dentro de `categoria` y de `ciudad`, AND entre ambas; `mes` en zona Lima (un evento a las 22:00 del 30/11 en Lima cuenta en `2026-11`); `orden: "precio"` ascendente con empate por fecha; sin `orden` → por fecha.
    - `toSearchParamEntries`/`buildEventsHref`: claves repetidas, arrays vacíos omitidos, `orden: "fecha"` omitido y `orden: "precio"` incluido.
    - `toggleFilterValue`: añade, quita, y al quitar el último → `undefined`, sin mutar la entrada.
    - `getFacetCounts`: sin filtros = totales por valor (incluidos los ceros); con `categoria: ["teatro"]` los conteos de ciudad solo cuentan teatro y los de categoría no cambian por su propia selección; con `ciudad: ["Lima"]` los conteos de categoría solo cuentan Lima.
    - `getEventMonths`: únicos, ordenados, labels "Noviembre 2026", zona Lima.
    - `formatMonthLabel`.
    - `getActiveFilterChips`: orden y labels (incluido "Desde el 1 de enero de 2027" y el label del rango de precio); el `href` quita solo ese valor; no hay chips para `q` ni `orden`.
- **`modules/events/components/EventFiltersForm.test.tsx` (Fase 1, nuevo; mock de `next/navigation`).**
  - Renderiza solo los `fieldset` de `sections`.
  - Las casillas y radios reflejan `filters`; el nombre accesible incluye el conteo ("Teatro, 2 eventos").
  - Marcar "Teatro" → `push("/eventos?categoria=teatro", { scroll: false })` conservando `q` y `orden`; desmarcar quita el valor.
  - El radio "Hasta S/ 50" → `precio=0-50`; "Cualquier precio" lo quita.
  - Con `sections` sin `categoria`, hay inputs ocultos `categoria` por cada valor activo.
- **`modules/events/stores/saved.store.test.ts` (Fase 2, nuevo).** `toggle` añade y quita; persiste en `localStorage["mentec-saved"]`; `persist.rehydrate()` restaura los slugs.
- **`modules/events/components/SaveEventButton.test.tsx` (Fase 2, nuevo).** `aria-pressed` alterna y el store cambia; se rehidrata un slug guardado al montar.
- **`modules/events/components/ShareEventButton.test.tsx` (Fase 2, nuevo; `navigator.share`/`clipboard` mockeados y fake timers).**
  - Con `share` disponible lo llama con `{ title, url }`; un `AbortError` no muestra nada.
  - Sin `share`, llama `writeText(url)`, el `status` dice "Enlace copiado" y a los 2 s vuelve el icono inicial.
  - Si `writeText` rechaza → "No pudimos copiar el enlace".
- **Sin tests**, por ser presentacionales o por estar cubiertos por los tests de utils o de `EventFiltersForm`: `EventCard`, `EventSearchBar`, `CategoryFilter`, `EventsResults`, `EventsSort`, `EventFiltersSidebar`, `EventFiltersSheet` (composición de shadcn `Sheet`), `EventDetailHeader`, `EventDetailInfo`, `RelatedEvents`, `AuthBrandPanel`, `AuthTabs`, las páginas y el layout de `app/`, y los `index.ts`.
- **Los tests existentes no cambian** (salvo los casos de `eventFilters.test.ts` indicados): `TicketSelector.test.tsx`, `events.service.test.ts`, `formatEvent.test.ts`, `ticketOrder.test.ts` y todos los de `modules/auth`.

## Plan de tareas
**Coordinación entre specs** (orden global: seating → checkout → tickets → organizer → events-ui-refresh):
- Esta spec se implementa al final.
- `app/eventos/[slug]/page.tsx` lo modifica antes la spec seating (aside y barra móvil). La Fase 2 · T5 parte de esa versión y conserva el aside y la barra tal cual.
- La spec checkout (contrato D) modifica `modules/auth/components/formShared.ts`, `LoginForm`, `RegisterForm` y crea `modules/auth/session.ts`; la spec tickets (contrato G) modifica `AuthHeaderActions`. La Fase 3 no toca esos archivos; solo `modules/auth/index.ts` y archivos nuevos, después de ellas.
- Si alguna spec previa añade consumidores de `EventFilters`, `buildEventsHref` o `CategoryFilter`, la Fase 1 · T5 los adapta al tipo multivalor (hoy solo los usa `app/eventos/page.tsx`).
- `EventCard` gana una prop opcional con un valor por defecto que no altera a quienes ya la usan.

**Dentro de cada fase:**
- La Fase 1 · T1 cambia el tipo `EventFilters`. Hasta T5 el build completo no compila, así que los developers en paralelo verifican solo con `vitest`/`eslint` sobre sus archivos y el reviewer hace el `build` al final de la fase.
- Las fases son independientes entre sí y cada una es entregable por separado. La Fase 3 no depende de la 1 ni de la 2.

### Fase 1 — Búsqueda `/eventos` (5 tareas, 16 archivos)
- [x] T1 — Contrato de filtros: opciones de orden, schema multivalor, utils (filtrado por mes y orden, serialización, toggle, facetas, meses, chips) y tests · archivos: `modules/events/data/searchOptions.ts`, `modules/events/schemas/eventFilters.schema.ts`, `modules/events/utils/eventFilters.ts`, `modules/events/utils/eventFilters.test.ts` · depende de: — · secuencial (base)
- [x] T2 — Variante `layout="ticket"` de `EventCard` · archivos: `modules/events/components/EventCard.tsx` · depende de: — · paralelo con T1 y T3
- [x] T3 — Panel de filtros: formulario cliente con test, barra lateral y `Sheet` móvil · archivos: `modules/events/components/EventFiltersForm.tsx`, `modules/events/components/EventFiltersForm.test.tsx`, `modules/events/components/EventFiltersSidebar.tsx`, `modules/events/components/EventFiltersSheet.tsx` · depende de: T1 · paralelo con T2 y T4
- [x] T4 — Buscador compacto, pills multivalor, orden y resultados (contador, chips, grilla ticket, vacío) · archivos: `modules/events/components/EventSearchBar.tsx`, `modules/events/components/CategoryFilter.tsx`, `modules/events/components/EventsSort.tsx`, `modules/events/components/EventsResults.tsx` · depende de: T1, T2 · paralelo con T3
- [x] T5 — Ruta `/eventos`, API pública y diseño de página · archivos: `app/eventos/page.tsx`, `modules/events/index.ts`, `design-system/ticketera/pages/events-list.md` (layout nuevo: buscador compacto, barra lateral de 288 px, fila móvil Filtros/Orden, pills, contador + chips, tarjeta ticket, vacío; reglas de URL multivalor, mejora progresiva y conteos facetados) · depende de: T3, T4 · secuencial

### Fase 2 — Detalle `/eventos/[slug]` (5 tareas, 11 archivos)
- [x] T1 — Store de guardados con test · archivos: `modules/events/stores/saved.store.ts`, `modules/events/stores/saved.store.test.ts` · depende de: Fase 1 cerrada (comparte `modules/events`) · base, paralelo con T3
- [x] T2 — Botones Guardar y Compartir con tests · archivos: `modules/events/components/SaveEventButton.tsx`, `modules/events/components/SaveEventButton.test.tsx`, `modules/events/components/ShareEventButton.tsx`, `modules/events/components/ShareEventButton.test.tsx` · depende de: T1 · paralelo con T3
- [x] T3 — "Información importante", "Lugar" con "Cómo llegar" y relacionados con scroll-snap y "Ver más en…" · archivos: `modules/events/components/EventDetailInfo.tsx`, `modules/events/components/RelatedEvents.tsx` · depende de: — · paralelo con T1, T2 y T4
- [x] T4 — Hero navy con CTA, barra móvil y breadcrumb solo en `lg` · archivos: `modules/events/components/EventDetailHeader.tsx` · depende de: T2 · paralelo con T3
- [x] T5 — Página de detalle (hero a ancho completo, `purchaseHref` con `hasVenueMap`, `id="entradas"`, `category` en relacionados) y diseño de página · archivos: `app/eventos/[slug]/page.tsx`, `design-system/ticketera/pages/event-detail.md` (hero navy, barra móvil, información 2×2, lugar, relacionados en carrusel; el aside para eventos con mapa remite a la spec seating) · depende de: T3, T4 y las tareas de seating que tocan este archivo · secuencial

### Fase 3 — Acceso (2 tareas, 7 archivos)
- [x] T1 — Panel de marca, pestañas y exports · archivos: `modules/auth/components/AuthBrandPanel.tsx`, `modules/auth/components/AuthTabs.tsx`, `modules/auth/index.ts` · depende de: las tareas de checkout (contrato D) y tickets (contrato G) que tocan `modules/auth` · secuencial (base)
- [x] T2 — Layout `(auth)` en dos columnas, páginas con pestañas y diseño de página · archivos: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/registro/page.tsx`, `design-system/ticketera/pages/auth.md` (nuevo: panel de marca, franja móvil, pestañas-enlace, formularios en tarjeta sobre `bg-muted`, a11y) · depende de: T1 · secuencial

## Preguntas abiertas
1. **Títulos de acceso:** se conservan el h1 "Iniciar sesión" / "Crear cuenta" y las descripciones aprobadas. ¿Quieres adoptar los del diseño ("Hola de nuevo" / "Crea tu cuenta"; "Ingresa para ver tus entradas y comprar más rápido." / "Guarda tus entradas y recibe novedades de tus eventos.")? Implica cambiar `LoginForm`/`RegisterForm`, sus tests y lo aprobado en `auth-login-register.md`.
2. **h1 de `/eventos`:** se mantiene "Eventos" (o la categoría si hay una). ¿Prefieres el "Explora eventos" del diseño?
3. **Rangos de precio:** se conservan los actuales (Gratis, Hasta S/ 50, S/ 50–100, S/ 100–200, Más de S/ 200) por compatibilidad de URL. ¿Pasamos a los del diseño (Hasta S/ 50, S/ 50–150, S/ 150–300, Más de S/ 300)?
4. **Filtros móviles sin JS:** el `Sheet` necesita JS, como el menú del header. Sin JS, en móvil funcionan el buscador, las pills, el orden y los chips. ¿Es aceptable?
5. **Barra fija de compra en móvil para eventos sin mapa:** el diseño la muestra en todos los eventos, pero la spec seating solo la pone en los que tienen mapa. Aquí no se añade (el selector va justo después del hero). ¿La quieres también para los eventos sin mapa?
6. **Guardados:** solo se guardan en este navegador (`mentec-saved`). ¿Se necesita una lista de "Guardados" (por ejemplo, en Mis entradas) o asociarlos a la cuenta?
7. **`?next=` en el acceso:** si la spec checkout hace que `/login` reciba un parámetro de retorno, ¿las pestañas deben conservarlo al cambiar entre `/login` y `/registro`? Por ahora enlazan a las rutas sin query.
8. **Textos del detalle que cambian:** "Ver en Google Maps" pasa a "Cómo llegar"; el organizador pasa de "Detalles" a una línea "Organiza: …" en "Acerca del evento"; la celda de hora se llama "Inicio" (no "Inicio del show", porque hay eventos deportivos y festivales). ¿Conforme?
