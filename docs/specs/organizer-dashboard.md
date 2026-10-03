# Panel de organizador: resumen de ventas y crear evento (UI con mock data)

- Módulo: organizer
- Estado: borrador

## Objetivo
Dar a quien organiza eventos un panel donde ver cómo van las ventas de sus eventos (KPIs y lista de eventos con su avance de ventas) y un formulario para crear un evento nuevo, guardarlo como borrador o publicarlo, con una vista previa en vivo de cómo lo verán los compradores. Es solo UI/UX con datos mock (sin backend, BD ni roles reales), en español (Perú) y PEN. Pantallas de referencia del diseño: "8 · Panel de organizador" (`OrgDashboard.dc.html`, `OrgDashboardMobile.dc.html`) y "8 · Crear evento" (`OrgCreate.dc.html`, `OrgCreateMobile.dc.html`). Del diseño se toman estructura, flujo, textos y patrones móviles; la identidad visual es la de Mentec (`design-system/ticketera/MASTER.md`: tokens, Creato Display, a11y §11), nunca el índigo/Poppins/hex del diseño. La marca visible es "Mentec Tickets" (la del header global), no "Ticketera".

## Alcance
- Incluye:
  - **Fase 1:** módulo nuevo `modules/organizer`; layout `app/organizador/layout.tsx` con navegación del panel (lateral en `lg`, compacta en móvil) dentro del header/footer globales; página `/organizador` (Resumen): encabezado, botón "Crear evento", KPIs, filtro Todos/Publicados/Borradores y lista de eventos (tabla en `lg`, tarjetas en móvil) con estado, avance de ventas e ingresos; datos mock derivados de eventos existentes; archivo `design-system/ticketera/pages/organizer.md`.
  - **Fase 2:** página `/organizador/eventos/nuevo` con el formulario (Información básica, Fecha y lugar, Tipos de entrada dinámicos), validación con zod y `@/hooks/useZodForm`, acciones "Guardar borrador" y "Publicar evento", store zustand persistido con los eventos creados, el panel muestra esos eventos y un aviso de éxito; enlaces del banner de organizadores de la landing.
  - **Fase 3:** sección "Imagen de portada" (zona de arrastre accesible con vista previa local) y "Vista previa" en vivo de la tarjeta del evento.
- No incluye:
  - Rutas o pantallas de "Mis eventos", "Ventas" y "Configuración" (no se muestran en la navegación, ver Decisión 2), ni detalle de ventas por evento, ni edición de eventos o borradores (ver Decisión 3 y Preguntas abiertas).
  - Control de acceso, roles de organizador o exigir sesión (ver Decisión 1). No se toca `modules/auth` ni el header global.
  - Publicación real: los eventos creados no aparecen en la landing, en `/eventos` ni tienen página `/eventos/<slug>`; solo existen en el panel de este navegador (localStorage).
  - Subida o persistencia de la imagen de portada: es solo vista previa local (`URL.createObjectURL`); al guardar no se almacena (ver Decisión 7).
  - Borrar o despublicar eventos, duplicar, ordenar o paginar la lista, búsqueda, gráficos, exportar, límites de tamaño de imagen, recorte de imagen, más de una imagen, mapa de asientos para el evento creado.
  - Cambiar el enlace "Vende con nosotros" del footer (`components/shared/SiteFooter.tsx`, sigue en `/organizadores`; ver Preguntas abiertas).
  - TanStack Query, axios, toasts.

## Decisiones tomadas
1. **Sin sesión obligatoria.** El panel es una maqueta: `modules/auth` no tiene rol de organizador y un bloqueo solo en cliente no protege nada, pero añadiría estados de carga/redirección. Cualquiera puede abrir `/organizador`. No se muestra el bloque de usuario/"Cerrar sesión" del sidebar del diseño: el header global ya muestra la sesión.
2. **Navegación del panel solo con destinos reales:** "Resumen" (`/organizador`) y "Crear evento" (`/organizador/eventos/nuevo`). "Mis eventos", "Ventas" y "Configuración" **no se muestran** (YAGNI): enlaces muertos rompen la navegación por teclado y elementos deshabilitados con "Próximamente" prometen funciones sin spec. "Mis eventos" sigue existiendo como título de la sección de la lista en Resumen. En móvil, en lugar del menú hamburguesa del diseño ("Abrir menú del panel"), los dos enlaces se muestran como chips horizontales: con dos destinos un `Sheet` añade un clic sin aportar nada (KISS). El bloque de marca "Ticketera · Organizadores" del sidebar se sustituye por el título "Panel de organizador", porque el logo ya está en el header global.
3. **Sin columna de acción en la lista.** "Ver ventas" necesita la pantalla Ventas y "Editar" necesita una ruta de edición, un formulario precargado y actualizar el store (y el borrador mock no está en el store), las dos fuera de alcance. Un botón deshabilitado o que no hace nada es ruido y no se puede enfocar. Se eliminan la columna y los botones; la edición de borradores queda como pregunta abierta.
4. **La vista previa no reutiliza `EventCard`.** Sus props no lo permiten: exige un `Event` completo (`imageUrl` obligatoria; `startsAt` ISO válido, porque `formatEventDate` lanza `RangeError` con una fecha vacía) y siempre muestra enlaces reales a `/eventos/<slug>`, que no existe para un evento sin guardar. Adaptarla obligaría a añadir props solo de preview a un componente de compra (rompe S/YAGNI en `events`). Se crea `EventPreviewCard` en `organizer`, presentacional y sin elementos interactivos, que replica la anatomía de EventCard del MASTER §7 con los mismos primitivos (`Card`, `Badge`) y **reutiliza** `formatEventDate`, `formatEventPrice` y `EVENT_CATEGORY_LABELS` del barrel de `events`.
5. **Categorías:** se usan las 6 del proyecto (`EVENT_CATEGORIES` / `EVENT_CATEGORY_LABELS`: Conciertos, Teatro, Deportes, Festivales, Stand-up, Familia), no las 8 del diseño (Cine, Comedia, Arte…), para que el evento encaje con el listado y la tarjeta. Por defecto, "Conciertos" (como en el diseño).
6. **Entrada al panel:** en `OrganizerBanner` (hoy `/organizadores`, ruta que no existe), "Publica tu evento" pasa a `/organizador/eventos/nuevo` (su texto describe esa acción) y "Conoce más" pasa a `/organizador`. Es el cambio mínimo: solo dos `href`.
7. **La imagen no se persiste.** Una URL `blob:` deja de valer al recargar y guardar la imagen como data URL podría superar el límite de localStorage. En el panel, los eventos creados muestran un marcador neutro (icono) en lugar de la imagen.
8. **Borrador y publicación con un solo schema:** `useZodForm` recibe un único `ZodObject`. El formulario lleva un campo `intent: "draft" | "publish"`. Cada botón es `type="submit"` y, en su `onClick`, hace `setValue("intent", …)` antes del submit; `setValue` actualiza la ref de forma síncrona, así que `handleSubmit` ve el valor nuevo. El `superRefine` solo exige el resto de campos cuando `intent === "publish"`. El borrador solo valida el nombre. Si se pulsa Enter en un campo, el envío implícito activa el primer botón de envío (estándar HTML), que es "Guardar borrador": la opción que no publica nada.
9. **Errores por fila de los tipos de entrada sin tocar el hook compartido:** `useZodForm` agrupa los errores por el primer segmento de la ruta (`errors.ticketTypes`). Cuando existe ese error, el formulario obtiene los mensajes de cada fila con `getTicketTypeErrors(values.ticketTypes)`, que usa el mismo `ticketTypeFormSchema` que el `superRefine` (DRY), y marca cada input con `aria-invalid`. Así, el foco automático del hook (primer `[aria-invalid="true"]`) también funciona en las filas. `hooks/useZodForm.ts` no se modifica.
10. **Ingresos del mock = vendidas × precio desde**, igual que el diseño. Es una aproximación de maqueta y se documenta en el código.
11. **Aviso de éxito por query param:** tras guardar se navega a `/organizador?guardado=publicado|borrador`. La página valida el parámetro con zod (cualquier otro valor se ignora) y muestra el `Alert`. Funciona sin estado transitorio y lo puede verificar el reviewer. Al recargar, el aviso vuelve a mostrarse (aceptable en la maqueta).
12. **Barra de acciones inferior en móvil con `sticky bottom-0`, no `fixed`:** se queda pegada al borde inferior mientras el formulario está en pantalla, pero no tapa el footer global al final de la página. En `lg` es estática bajo el formulario (alineada a la derecha, como en el diseño).
13. **Tabla en `lg` y tarjetas por debajo**, renderizadas por el mismo componente y ocultas por CSS (`hidden lg:block` / `lg:hidden`, es decir, `display: none`, así que no se duplican en el árbol de accesibilidad).
14. **Orden de KPIs:** Ingresos, Entradas vendidas, Eventos publicados en todos los breakpoints (en móvil, Ingresos ocupa el ancho completo, como en el diseño). Un solo orden en el DOM evita que el orden visual y el de lectura no coincidan. La etiqueta es siempre "Eventos publicados" (el móvil del diseño la acortaba a "Publicados").
15. **Una fila inicial de tipo de entrada** (el mínimo), en lugar de las dos vacías del diseño, para no obligar a borrar una fila para publicar.
16. **Breakpoint del panel: `lg` (1024 px)** para sidebar, tabla, formulario en dos columnas y barra estática.

## Requisitos

### Comunes
1. `app/` solo enruta. Todo el código vive en `modules/organizer`, que importa de otros módulos solo por sus entradas públicas: `@/modules/events` (`getEvents`, `EVENT_CATEGORIES`, `EVENT_CATEGORY_LABELS`, `formatEventDate`, `formatEventPrice`, tipo `EventCategory`) y, desde la Fase 2, `@/hooks/useZodForm`. No se necesitan exportaciones nuevas en `modules/events/index.ts`.
2. Solo tokens del tema (MASTER §2), Creato Display, iconos `lucide-react` con `aria-hidden`. Ningún hex ni color por defecto de Tailwind.
3. Responsive sin scroll horizontal de página en 375 / 768 / 1024 / 1440. Targets ≥ 44 px (`h-11`). Foco visible en todo lo interactivo. Un único `<h1>` por página. No se añade otro `<main>`: el layout raíz ya lo tiene.
4. Formatos: importes con `formatEventPrice` (`S/ 1,387,530.00`), conteos con `Intl.NumberFormat("es-PE")` (`8,146`), fechas con `formatEventDate` (`SÁB 14 NOV · 21:00`).

### Layout `/organizador/*` (Fase 1)
5. `app/organizador/layout.tsx` (Server Component) con contenedor `mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8 md:py-12`. En `lg`, grilla `lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10`: navegación a la izquierda (`lg:sticky lg:top-24 self-start`) y contenido a la derecha. Por debajo de `lg`, la navegación queda encima del contenido. Metadata del layout: `robots: { index: false }`.
6. `OrganizerNav` (cliente, usa `usePathname`): `<nav aria-label="Panel de organizador">` con el título "Panel de organizador" (overline, visible solo en `lg`) y una lista de dos enlaces: "Resumen" (icono `LayoutDashboard`, `/organizador`) y "Crear evento" (icono `Plus`, `/organizador/eventos/nuevo`). El enlace cuya ruta coincide exactamente con la actual lleva `aria-current="page"` y estilo activo `bg-accent text-accent-foreground font-semibold`. En `lg` es una lista vertical (`h-11 rounded-lg px-3`). Por debajo de `lg` son chips horizontales `h-11 rounded-full` con scroll horizontal propio si no caben (patrón de `CategoryFilter`).

### Resumen `/organizador` (Fase 1; Fase 2 añade store y aviso)
7. Encabezado: `<h1>` "Resumen" (`text-3xl md:text-4xl font-extrabold tracking-tight`), párrafo "Así van las ventas de tus eventos." (`text-muted-foreground`) y enlace con aspecto de botón primario "Crear evento" (icono `Plus`, `h-11`, ancho completo en móvil, a la derecha en `md+`) hacia `/organizador/eventos/nuevo`.
8. KPIs en un `<dl>` de tres tarjetas (`rounded-2xl ring-1 ring-border bg-card p-5 md:p-6`), cada una con un `<div>` que agrupa `<dt>` (icono + etiqueta, `text-sm text-muted-foreground`) y `<dd>` (`text-2xl md:text-3xl font-bold tabular-nums`). Orden: "Ingresos" (`ChartColumn`), "Entradas vendidas" (`Ticket`), "Eventos publicados" (`CalendarDays`). Grilla `grid-cols-2 lg:grid-cols-3 gap-4`, con Ingresos en `col-span-2 lg:col-span-1`. Los valores salen de `getDashboardKpis(events)`:
   - Entradas vendidas = Σ `sold` de todos los eventos.
   - Ingresos = Σ `getEventRevenue(e)`; un borrador aporta 0 y un publicado aporta `sold × (priceFrom ?? 0)`.
   - Eventos publicados = número de eventos con `status === "published"`.
9. Sección "Mis eventos" (`<section aria-labelledby>` con `<h2>` "Mis eventos"). En la misma fila que el h2 (debajo en móvil) va un `ToggleGroup` de selección única con `aria-label="Filtrar eventos por estado"` e items "Todos", "Publicados" y "Borradores". Estilo de control segmentado: contenedor `bg-muted p-1 rounded-lg`, items `h-11` con `aria-pressed:bg-background aria-pressed:font-semibold aria-pressed:shadow-sm`, y en móvil `grid grid-cols-3 w-full`. Si Base UI devuelve `[]` al deseleccionar, se vuelve a "Todos" (patrón de `UpcomingEvents`). El filtrado usa `filterOrganizerEvents(events, filter)`.
10. Lista de eventos (`OrganizerEventsTable`):
    - **`lg+`:** `Table` de shadcn con `aria-labelledby` apuntando al h2 y columnas "Evento", "Estado", "Vendidas" e "Ingresos" (esta alineada a la derecha). En la celda Evento (`<th scope="row">` con peso normal) van una miniatura `next/image` `size-12 rounded-lg object-cover` (`alt=""`, `sizes="48px"`), el título (`font-semibold truncate`) y la línea "`<fecha>` · `<ciudad>`" (`text-sm text-muted-foreground`).
    - **`< lg`:** `<ul>` de tarjetas (`rounded-2xl ring-1 ring-border p-4`). Cada tarjeta lleva miniatura, título como `<h3>`, "fecha · ciudad" y el badge de estado en la primera fila; debajo, "`<vendidas>` / `<capacidad>` vendidas" a la izquierda e ingresos a la derecha, y la barra de progreso.
    - **Estado:** `Badge` con texto, nunca solo color: "Publicado" (`bg-accent text-accent-foreground`) o "Borrador" (`bg-secondary text-secondary-foreground`).
    - **Vendidas:** texto "**7,420** / 8,000 vendidas" (`tabular-nums`) y `Progress` de shadcn con `value = getSoldPercentage(sold, capacity)` (0–100, entero), nombre accesible `aria-label="Entradas vendidas de <título>"` y `aria-valuetext` "7,420 de 8,000 vendidas" (vía `getAriaValueText`), de modo que expone `role="progressbar"` con `aria-valuenow`.
    - **Ingresos:** `formatEventPrice(getEventRevenue(e))` para los publicados. Para los borradores, "—" con `aria-hidden` más `<span class="sr-only">Sin ingresos</span>`.
    - **Valores ausentes** (eventos creados en la Fase 2): sin fecha, "Fecha por definir"; sin ciudad, se omite " · ciudad"; sin imagen (`imageUrl: null`), un marcador `size-12 rounded-lg bg-muted` con icono `ImageIcon` `aria-hidden`; con capacidad 0, el porcentaje es 0.
    - Si el filtro no deja resultados: `<p>` "No tienes eventos con este estado." (`rounded-2xl bg-muted p-8 text-center text-muted-foreground`).
11. Datos (Fase 1): la página (Server Component) obtiene `getOrganizerEvents()` y se los pasa a `OrganizerDashboard`. El service une `getEvents()` de `@/modules/events` con las ventas mock por `slug` y añade el borrador mock; el resultado se valida con `organizerEventSchema.array().parse`. Mock (`data/organizerEvents.mock.ts`):
    - `ORGANIZER_SALES_MOCK`: `noche-de-sintetizadores-lima` 7420/8000, `la-casa-de-los-espejos` 312/420, `el-circo-de-las-estrellas` 414/1200 (status `published`, `priceFrom` del evento).
    - `ORGANIZER_DRAFTS_MOCK`: `{ id: "org-draft-001", title: "Feria Familiar de Verano", category: "familia", startsAt: "2026-12-01T11:00:00-05:00", venue: "Parque Selva Alegre", city: "Arequipa", imageUrl: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1600&q=80", priceFrom: 40, sold: 0, capacity: 1500, status: "draft" }`.
    - KPIs resultantes: Ingresos `S/ 1,387,530.00`, Entradas vendidas `8,146`, Eventos publicados `3`.
12. (Fase 2) `OrganizerDashboard` rehidrata `useOrganizerStore` al montar (`useEffect(() => { useOrganizerStore.persist.rehydrate(); }, [])`, patrón de `AuthHeaderActions`) y muestra `[...storeEvents, ...initialEvents]` (los creados primero, del más reciente al más antiguo). KPIs, filtro y lista usan esa lista combinada.
13. (Fase 2) Aviso de guardado: la página lee `searchParams.guardado` y lo valida con `savedStatusSchema` (`"publicado" | "borrador"`; cualquier otro valor da `undefined`). `OrganizerDashboard` recibe `saved` y, si existe, muestra un `Alert` (role `alert`, icono `CircleCheck`) entre el encabezado y los KPIs:
    - `publicado`: título "Evento publicado", descripción "Ya aparece en Mis eventos con el estado Publicado."
    - `borrador`: título "Borrador guardado", descripción "Lo encontrarás en Mis eventos con el estado Borrador."

### Crear evento `/organizador/eventos/nuevo` (Fase 2; Fase 3 añade portada y vista previa)
14. `app/organizador/eventos/nuevo/page.tsx` (Server Component, metadata "Crear evento | Mentec Tickets") con `<h1>` "Crear evento" (mismo estilo que Resumen) y `<OrganizerEventForm />`. No hay enlace "volver": "Resumen" está siempre en la navegación del panel.
15. `OrganizerEventForm` (cliente) usa `useZodForm(organizerEventFormSchema, INITIAL_VALUES)` de `@/hooks/useZodForm` con `<form noValidate>`. Valores iniciales: `{ intent: "publish", name: "", category: "conciertos", description: "", date: "", time: "", venue: "", city: "", ticketTypes: [nuevaFila()] }`, donde `nuevaFila() = { id: crypto.randomUUID(), name: "", price: "", quantity: "" }`. Patrón de campos de `RegisterForm`: `Field` con `data-invalid`, `FieldLabel htmlFor`, `aria-invalid`, `aria-describedby` → `FieldError` con id; revalidación en `onBlur` con `handleBlur`. Al montar rehidrata `useOrganizerStore` (si no, el primer `addEvent` sobrescribiría los eventos guardados). Las secciones son `Card` `rounded-2xl` con `<h2>` `text-lg font-bold`:
    - **"Información básica":**
      - "Nombre del evento": `Input`, placeholder "Ej. Festival de verano 2026", `maxLength={100}`.
      - "Categoría": `Select` de shadcn con `items={EVENT_CATEGORY_LABELS}` (patrón de `RegisterForm`), opciones `EVENT_CATEGORIES`.
      - "Descripción": `Textarea` `rows={4}`, `maxLength={2000}`, placeholder "Cuenta de qué trata el evento, quiénes se presentan y qué incluye la entrada."
    - **"Fecha y lugar":** grilla `grid-cols-2` en todos los anchos para "Fecha" (`Input type="date"`, `min` = hoy en Lima) y "Hora de inicio" (`Input type="time"`). Debajo, "Lugar" (placeholder "Ej. Estadio Nacional") y "Ciudad" (placeholder "Ej. Lima"), ambos `maxLength={100}`. En `md+`, Lugar y Ciudad van en dos columnas.
    - **"Tipos de entrada"** (`TicketTypesField`) con el subtítulo "Cada tipo tiene su precio y su cantidad disponible.":
      - Cada fila es un `<fieldset>` cuyo `<legend>` es "Tipo n" (visible en móvil, `lg:sr-only`). Contiene "Nombre" (placeholder "Ej. General"), "Precio (S/)" (`type="number" inputMode="decimal" min=0 step=0.01`, placeholder "0") y "Cantidad" (`type="number" inputMode="numeric" min=1 step=1`, placeholder "0"), con etiquetas visibles en móvil y `lg:sr-only` en `lg`, donde una fila de cabeceras `aria-hidden` ("Nombre", "Precio (S/)", "Cantidad") imita la tabla del diseño (`lg:grid-cols-[minmax(0,1fr)_150px_150px_44px]`).
      - Botón solo-icono `Trash2` con `aria-label="Quitar tipo de entrada n"`, deshabilitado si solo queda una fila. Al quitar una fila, el foco pasa al botón "Agregar tipo de entrada".
      - Botón "Agregar tipo de entrada" (icono `Plus`, `variant="outline"` con borde discontinuo, `h-11`). Añade una fila vacía al final y mueve el foco a su campo "Nombre".
      - Pie: "Capacidad total" a la izquierda y `formatTicketCount(getTicketCapacity(rows))` a la derecha (`font-semibold tabular-nums`), que da "0 entradas", "1 entrada" o "1,500 entradas".
    - **Acciones:**
      - "Guardar borrador" (`variant="outline"`) y "Publicar evento" (primario). Ambos son `type="submit"`, `h-11` en móvil y `md:h-12`, se deshabilitan mientras `isSubmitting` y fijan `intent` en su `onClick` (Decisión 8).
      - En móvil, el botón primario muestra "Publicar" con `<span class="max-lg:sr-only"> evento</span>`, así que su nombre accesible siempre es "Publicar evento".
      - Por debajo de `lg`, barra `sticky bottom-0 z-10 grid grid-cols-2 gap-3 border-t bg-background` con `-mx-4 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]` (Decisión 12). En `lg` es estática, `flex justify-end gap-3` y sin borde.
      - Para que la barra no tape el campo enfocado, los controles del formulario llevan `scroll-mb-28 lg:scroll-mb-0 scroll-mt-24`.
16. Validación (`organizerEventFormSchema`, mensajes exactos):
    - **Siempre:** nombre (con trim) vacío da "Ingresa el nombre del evento".
    - **Solo con `intent: "publish"`:**
      - descripción vacía: "Agrega una descripción del evento";
      - fecha vacía: "Elige la fecha del evento"; formato distinto de `YYYY-MM-DD`: "Elige una fecha válida"; anterior a hoy en `America/Lima`: "La fecha no puede ser anterior a hoy" (hoy sí es válido);
      - hora vacía o que no cumple `HH:MM`: "Indica la hora de inicio";
      - lugar vacío: "Indica el lugar del evento";
      - ciudad vacía: "Indica la ciudad";
      - cada fila de tipo de entrada, según `ticketTypeFormSchema`: nombre vacío "Ingresa el nombre del tipo de entrada"; precio vacío "Ingresa el precio"; precio no numérico o negativo "El precio debe ser 0 o mayor"; cantidad vacía "Ingresa la cantidad"; cantidad que no es un entero ≥ 1 "La cantidad debe ser un número entero mayor o igual a 1".
    - El `superRefine` se ejecuta aunque falle el nombre (en zod 4 los checks no son abortivos), así que publicar con todo vacío muestra todos los errores a la vez.
    - Los errores aparecen al enviar y el foco va al primer campo inválido en orden del DOM (comportamiento de `useZodForm`). Después del primer intento, cada `onBlur` revalida.
17. Al enviar con datos válidos: `addEvent(toOrganizerEvent(data, \`org-${crypto.randomUUID()}\`))` y `router.push("/organizador?guardado=publicado")` o `"…?guardado=borrador"` según `intent`. `toOrganizerEvent` hace lo siguiente:
    - `title`: el nombre con trim; `venue` y `city`: con trim; `category` tal cual.
    - `startsAt = buildStartsAt(date, time)`, que da `"YYYY-MM-DDTHH:MM:00-05:00"` si ambos son válidos y `null` en otro caso.
    - `priceFrom = getMinTicketPrice(rows)`: el mínimo de los precios válidos ≥ 0, o `null`.
    - `capacity = getTicketCapacity(rows)`: la suma de las cantidades enteras ≥ 1; las filas inválidas se ignoran.
    - `sold: 0`, `imageUrl: null`, `status`: `"published"` si `intent === "publish"` y `"draft"` en otro caso.
    - Un borrador puede guardarse con campos vacíos o inválidos; se guarda lo interpretable.
18. **(Fase 3) "Imagen de portada"** (`CoverImageField`), sección entre "Fecha y lugar" y "Tipos de entrada":
    - **Zona de subida (sin imagen):** un `<label>` con borde discontinuo (`border-2 border-dashed border-primary/40 bg-accent rounded-2xl`, `h-44` en `lg` y `h-36` en móvil, icono `ImagePlus`), con el texto "Arrastra una imagen o haz clic para subirla" (`lg`) o "Subir imagen" (móvil) y la pista "JPG o PNG, horizontal (16:9)". Envuelve un `<input type="file" accept="image/png,image/jpeg" class="sr-only">` con `aria-describedby` hacia la pista (y hacia el error, si lo hay). El foco del input se ve en la zona (`has-[input:focus-visible]:ring-2 ring-ring`), que se abre con Tab + Enter/Espacio (nativo). Admite arrastrar y soltar (`onDragOver` con `preventDefault` y estado visual `border-primary`, `onDrop` toma el primer archivo).
    - **Validación:** `isAcceptedCoverImage(file)` (`image/png` o `image/jpeg`). Si el archivo no es válido, se muestra `FieldError` "Sube una imagen en formato JPG o PNG.", el input lleva `aria-invalid` y se conserva la imagen anterior.
    - **Con imagen:** vista previa `aspect-video rounded-2xl` con `next/image` `fill` (`unoptimized`; las URL `blob:` ya no se optimizan) y `alt="Vista previa de la imagen de portada"`, más los botones "Cambiar imagen" (abre el selector) y "Quitar imagen" (`h-11`). Al elegir una imagen válida, el foco pasa a "Cambiar imagen". "Quitar imagen" la elimina y devuelve el foco a la zona de subida.
    - **URL de la imagen:** la crea `useObjectUrl(file)` en `OrganizerEventForm` (una sola URL compartida con la vista previa), que revoca la anterior al cambiar de archivo y la actual al desmontar. Debe funcionar en StrictMode (crear y revocar dentro del mismo efecto). La imagen no se envía al store (Decisión 7).
19. **(Fase 3) "Vista previa":**
    - Va en un `<aside aria-labelledby>` con `<h2>` "Vista previa" (overline `text-xs font-bold uppercase tracking-wider text-muted-foreground`), el `EventPreviewCard` y el texto "Así verán tu evento los compradores en el listado." (`text-sm text-muted-foreground`). Se actualiza en cada cambio del formulario con `buildEventPreview(values, imageUrl)`.
    - **Disposición en `lg`:** el formulario es una grilla `lg:grid-cols-[minmax(0,1fr)_340px] gap-8`, con la vista previa en la columna derecha (`lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 self-start`) y la barra de acciones bajo las secciones, en la columna izquierda.
    - **Disposición en móvil:** la vista previa va después de "Tipos de entrada" y antes de la barra; el orden del DOM es secciones → vista previa → acciones.
    - **`EventPreviewCard`:** replica la anatomía de EventCard (MASTER §7), con imagen `aspect-[4/3]` y badge de categoría encima, fecha overline `text-primary-strong`, título `<h3>` `line-clamp-2`, `MapPin` + lugar, "Desde **S/ X**" con badge "Disponible" y un falso botón "Ver entradas" (`<span aria-hidden>`, estilo outline). Sin enlaces ni botones.
    - **Marcadores** (`text-muted-foreground`) cuando faltan datos: título "Nombre del evento", fecha "Fecha por definir" (si falta la fecha o la hora), lugar "Lugar, Ciudad", precio "Desde S/ —"; con precio mínimo 0, "Entrada libre" (igual que EventCard); sin imagen, un bloque `bg-muted` con icono `ImageIcon` `aria-hidden`.
    - En móvil, la tarjeta es horizontal (imagen `w-28` a la izquierda, `flex-row`) y en `lg`, vertical.

## Criterios de aceptación

### Fase 1 — Panel con datos mock
- [ ] Dado `/organizador` a 1440 px, cuando carga, entonces el header y el footer globales siguen visibles; a la izquierda está la navegación "Panel de organizador" con "Resumen" (`aria-current="page"`) y "Crear evento"; no aparecen "Mis eventos", "Ventas" ni "Configuración" como enlaces de navegación.
- [ ] Dado `/organizador`, entonces hay un único `<h1>` "Resumen", el texto "Así van las ventas de tus eventos." y un enlace "Crear evento" hacia `/organizador/eventos/nuevo` (en la Fase 1 ese destino da 404 hasta la Fase 2).
- [ ] Dado el mock, entonces el `<dl>` muestra, en este orden: Ingresos `S/ 1,387,530.00`, Entradas vendidas `8,146` y Eventos publicados `3` (cada etiqueta en `<dt>` y cada valor en `<dd>`).
- [ ] Dado `/organizador` a 1440 px, entonces "Mis eventos" se muestra como `<table>` con las cabeceras Evento, Estado, Vendidas e Ingresos y 4 filas: "Noche de Sintetizadores: Gira Neón 2026" (Publicado, "7,420 / 8,000 vendidas", `S/ 1,335,600.00`), "La casa de los espejos", "El circo de las estrellas" y "Feria Familiar de Verano" (Borrador, "0 / 1,500 vendidas", ingresos "—" con texto accesible "Sin ingresos").
- [ ] Dada cualquier fila, entonces su barra de avance expone `role="progressbar"` con `aria-valuenow` igual al porcentaje redondeado (93 para 7,420/8,000), un nombre accesible "Entradas vendidas de <título>" y `aria-valuetext` "7,420 de 8,000 vendidas".
- [ ] Dado el filtro, cuando se pulsa "Borradores", entonces solo se lista "Feria Familiar de Verano" y el botón tiene `aria-pressed="true"`; con "Publicados" se listan 3; con "Todos", 4. Los KPIs no cambian con el filtro.
- [ ] Dado el filtro, cuando se recorre con Tab y se activa con Enter/Espacio, entonces cambia la selección y el foco es visible en cada opción.
- [ ] Dado `/organizador` a 375 px, entonces no hay scroll horizontal de página; la navegación son chips horizontales `h-11`; el botón "Crear evento" ocupa todo el ancho; Ingresos ocupa una fila completa y los otros dos KPIs comparten la siguiente; los eventos se muestran como tarjetas (lista `<ul>`, título en `<h3>`, badge de estado con texto, "vendidas", ingresos y barra) y la tabla no está en el árbol de accesibilidad.
- [ ] Dado el código, entonces `getDashboardKpis`, `getEventRevenue`, `getSoldPercentage`, `filterOrganizerEvents` y `getOrganizerEvents` tienen tests que pasan, y `design-system/ticketera/pages/organizer.md` existe.

### Fase 2 — Crear evento y guardar
- [ ] Dada la landing, cuando se pulsa "Publica tu evento" en el banner de organizadores, entonces se navega a `/organizador/eventos/nuevo`; "Conoce más" lleva a `/organizador`.
- [ ] Dado `/organizador/eventos/nuevo`, entonces hay un único `<h1>` "Crear evento", "Crear evento" tiene `aria-current="page"` en la navegación y se ven las secciones "Información básica", "Fecha y lugar" y "Tipos de entrada" con las etiquetas y placeholders del Requisito 15. La categoría por defecto es "Conciertos" y sus opciones son las 6 del proyecto.
- [ ] Dado el formulario vacío, cuando se pulsa "Publicar evento", entonces aparecen a la vez los errores de nombre, descripción, fecha, hora, lugar, ciudad y los de la fila "Tipo 1" (nombre, precio, cantidad); cada campo con error tiene `aria-invalid="true"` y `aria-describedby` hacia su mensaje, el foco va a "Nombre del evento" y no se navega.
- [ ] Dado el formulario vacío, cuando se pulsa "Guardar borrador", entonces solo aparece "Ingresa el nombre del evento", el foco va a ese campo y no se guarda nada.
- [ ] Dado solo el nombre "Mi borrador", cuando se pulsa "Guardar borrador", entonces se navega a `/organizador?guardado=borrador`, se ve el `Alert` "Borrador guardado" y "Mi borrador" aparece primero en la lista con el badge "Borrador", "Fecha por definir", marcador sin imagen, "0 / 0 vendidas" e ingresos "—". Los KPIs no cambian.
- [ ] Dado un formulario completo (fecha de hoy o futura, dos tipos de entrada de S/ 50 × 100 y S/ 80 × 50), cuando se pulsa "Publicar evento", entonces se navega a `/organizador?guardado=publicado`, se ve el `Alert` "Evento publicado", el evento aparece primero con el badge "Publicado" y "0 / 150 vendidas", y "Eventos publicados" pasa a 4.
- [ ] Dada una fecha anterior a hoy, cuando se publica, entonces aparece "La fecha no puede ser anterior a hoy" en el campo Fecha.
- [ ] Dado un tipo de entrada con precio "-5" o cantidad "0", cuando se publica, entonces el error aparece en ese input concreto de esa fila (no en otra) y, al corregirlo y salir del campo, desaparece.
- [ ] Dados los tipos de entrada, cuando hay una sola fila, entonces "Quitar tipo de entrada 1" está deshabilitado; cuando se pulsa "Agregar tipo de entrada", aparece "Tipo 2" y el foco pasa a su campo Nombre; cuando se quita una fila, el foco pasa a "Agregar tipo de entrada"; y "Capacidad total" se actualiza al escribir las cantidades ("1 entrada", "150 entradas").
- [ ] Dado el formulario, cuando se recorre solo con teclado, entonces se alcanzan y se operan todos los campos (incluido el `Select` de categoría) y los botones con foco visible, y pulsar Enter en "Nombre del evento" equivale a "Guardar borrador".
- [ ] Dado el formulario a 375 px, entonces cada tipo de entrada es un `<fieldset>` con su `<legend>` visible "Tipo n" y etiquetas visibles; la barra inferior con "Guardar borrador" | "Publicar" (nombre accesible "Publicar evento") queda pegada abajo mientras se recorre el formulario, no tapa el campo enfocado ni el footer al final de la página, y no hay scroll horizontal.
- [ ] Dado un evento guardado, cuando se recarga `/organizador`, entonces sigue en la lista (persistido en localStorage con la clave `mentec-organizer-events`) y no hay errores de hidratación en la consola.
- [ ] Dado `/organizador?guardado=otro`, entonces no se muestra ningún aviso.
- [ ] Dado el código, entonces `organizer.schema.test.ts`, `organizerEventForm.test.ts`, `organizer.store.test.ts` y `OrganizerEventForm.test.tsx` pasan.

### Fase 3 — Imagen de portada y vista previa
- [ ] Dado el formulario a 1440 px, entonces a la derecha hay un `<aside>` "Vista previa" fijo al hacer scroll, con la tarjeta y el texto "Así verán tu evento los compradores en el listado."; con el formulario vacío, la tarjeta muestra "Nombre del evento", "Fecha por definir", "Lugar, Ciudad", el badge "Conciertos" y "Desde S/ —".
- [ ] Dado el formulario, cuando se escribe el nombre, se elige "Teatro", se pone fecha 2026-12-05 y hora 20:00, lugar y ciudad, y precios 120 y 80, entonces la tarjeta muestra al momento el nombre, el badge "Teatro", "SÁB 5 DIC · 20:00", "Lugar, Ciudad" y "Desde S/ 80.00"; con un precio 0, "Entrada libre".
- [ ] Dada la vista previa, entonces no contiene enlaces ni elementos enfocables.
- [ ] Dada la zona de subida, cuando se llega con Tab, entonces se ve el foco sobre la zona y Enter abre el selector de archivos, que filtra PNG/JPEG.
- [ ] Dado un PNG o JPEG, cuando se elige o se arrastra a la zona, entonces se muestra la vista previa con alt "Vista previa de la imagen de portada", aparece también en la tarjeta de "Vista previa" y el foco pasa a "Cambiar imagen".
- [ ] Dado un archivo que no es PNG ni JPEG (p. ej. GIF arrastrado), cuando se suelta, entonces aparece "Sube una imagen en formato JPG o PNG.", el input tiene `aria-invalid="true"` y se conserva la imagen anterior, si la había.
- [ ] Dada una imagen cargada, cuando se pulsa "Quitar imagen", entonces vuelve la zona de subida con el foco en ella y se ha llamado a `URL.revokeObjectURL` con la URL anterior; también se revoca al cambiar de imagen y al salir de la página.
- [ ] Dado el formulario a 375 px, entonces la sección "Imagen de portada" muestra "Subir imagen" y la pista "JPG o PNG, horizontal (16:9)", y la vista previa aparece como tarjeta horizontal después de "Tipos de entrada".
- [ ] Dado el código, entonces `useObjectUrl.test.ts` y `eventPreview.test.ts` pasan, y `OrganizerEventForm.test.tsx` cubre que la portada no se guarda en el store (`imageUrl: null`).

## Diseño técnico

### Rutas (`app/`)
| Ruta | Archivo | Fase | Notas |
|---|---|---|---|
| layout `/organizador/*` | `app/organizador/layout.tsx` | 1 | Server. `metadata: { robots: { index: false } }`. Compone `OrganizerNav` + `children` (Requisito 5). `LayoutProps<"/organizador">`. |
| `/organizador` | `app/organizador/page.tsx` | 1 (mod. 2) | Server. `metadata.title = "Panel de organizador \| Mentec Tickets"`. Encabezado (h1, texto, CTA) y `<OrganizerDashboard initialEvents={await getOrganizerEvents()} />`. En la Fase 2 además lee `searchParams` (`PageProps<"/organizador">`, Promise) → `savedStatusSchema.parse(guardado)` → prop `saved`. |
| `/organizador/eventos/nuevo` | `app/organizador/eventos/nuevo/page.tsx` | 2 | Server. `metadata.title = "Crear evento \| Mentec Tickets"`. h1 + `<OrganizerEventForm />`. |

### Componentes
| Componente | Tipo | Ubicación | Fase |
|---|---|---|---|
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | shadcn (instalar: `npx shadcn@latest add table`) | `components/ui/table.tsx` | 1 |
| `Progress` (Base UI; `getAriaValueText`) | shadcn (instalar: `npx shadcn@latest add progress`) | `components/ui/progress.tsx` | 1 |
| `ToggleGroup`, `ToggleGroupItem` | shadcn (instalado) | `components/ui/toggle-group.tsx` | 1 |
| `Badge`, `Card`, `buttonVariants`/`Button` | shadcn (instalado) | `components/ui/` | 1–3 |
| `Alert`, `AlertTitle`, `AlertDescription` | shadcn (instalado) | `components/ui/alert.tsx` | 2 |
| `Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldSet`, `FieldLegend`, `Input`, `Textarea`, `Select*`, `Spinner` | shadcn (instalado) | `components/ui/` | 2 |
| `OrganizerNav` | nuevo, cliente (`usePathname`) | `modules/organizer/components/OrganizerNav.tsx`: navegación propia del panel, no existe nada parecido; solo la usa este dominio | 1 |
| `OrganizerDashboard` | nuevo, cliente (estado del filtro; en la Fase 2, store) | `modules/organizer/components/OrganizerDashboard.tsx`: compone KPIs, filtro y lista; en la Fase 2 combina el store y muestra el `Alert` | 1 (mod. 2) |
| `OrganizerKpis` | nuevo, presentacional. Props `{ revenue: number; ticketsSold: number; publishedCount: number }` | `modules/organizer/components/OrganizerKpis.tsx` | 1 |
| `OrganizerEventsTable` | nuevo, presentacional. Props `{ events: OrganizerEvent[]; labelledBy: string }`. Tabla `lg+` y lista `< lg`. Helpers locales no exportados: `StatusBadge`, `SoldProgress`, `EventThumbnail`, y `ORGANIZER_STATUS_BADGE` (label + clase por estado, patrón de `EVENT_STATUS_BADGE`) | `modules/organizer/components/OrganizerEventsTable.tsx` | 1 |
| `OrganizerEventForm` | nuevo, cliente | `modules/organizer/components/OrganizerEventForm.tsx` | 2 (mod. 3) |
| `TicketTypesField` | nuevo, cliente (gestión de foco al agregar/quitar). Props `{ rows: TicketTypeRow[]; errors: TicketTypeRowErrors[] \| null; onChange(rows): void; onBlur(): void }` | `modules/organizer/components/TicketTypesField.tsx` | 2 |
| `CoverImageField` | nuevo, cliente (arrastrar/soltar, foco). Props `{ previewUrl: string \| null; error?: string; onSelect(file: File): void; onRemove(): void }` | `modules/organizer/components/CoverImageField.tsx`: no hay dropzone en shadcn | 3 |
| `EventPreviewCard` | nuevo, presentacional. Props `EventPreview` (ver tipos) | `modules/organizer/components/EventPreviewCard.tsx`: ver Decisión 4 | 3 |
| `OrganizerBanner` | existente (`modules/marketing/components/OrganizerBanner.tsx`), solo cambian los dos `href` | — | 2 |

### Schemas, tipos, utils, services, stores, hooks
```ts
// modules/organizer/schemas/organizer.schema.ts
import { z } from "zod";
import { EVENT_CATEGORIES } from "@/modules/events";

// Fase 1
export const organizerEventStatusSchema = z.enum(["published", "draft"]);
export const organizerEventSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: z.enum(EVENT_CATEGORIES),
  startsAt: z.iso.datetime({ offset: true }).nullable(), // null: borrador sin fecha/hora
  venue: z.string(),
  city: z.string(),
  imageUrl: z.url().nullable(),                           // null: evento creado (imagen no persistida)
  priceFrom: z.number().nonnegative().nullable(),         // null: sin precios válidos
  sold: z.number().int().nonnegative(),
  capacity: z.number().int().nonnegative(),
  status: organizerEventStatusSchema,
});

// Fase 2
export const savedStatusSchema = z.enum(["publicado", "borrador"]).optional().catch(undefined);

export const ticketTypeFormSchema = z.object({          // reglas de una fila al publicar (Requisito 16)
  id: z.string(),
  name: z.string().trim().min(1, "Ingresa el nombre del tipo de entrada"),
  price: z.string().trim().min(1, "Ingresa el precio")
    .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, "El precio debe ser 0 o mayor"),
  quantity: z.string().trim().min(1, "Ingresa la cantidad")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, "La cantidad debe ser un número entero mayor o igual a 1"),
});

export const organizerEventFormSchema = z
  .object({
    intent: z.enum(["draft", "publish"]),
    name: z.string().trim().min(1, "Ingresa el nombre del evento"),
    category: z.enum(EVENT_CATEGORIES),
    description: z.string(),
    date: z.string(),   // "YYYY-MM-DD" (input date) o ""
    time: z.string(),   // "HH:MM" (input time) o ""
    venue: z.string(),
    city: z.string(),
    ticketTypes: z.array(z.object({ id: z.string(), name: z.string(), price: z.string(), quantity: z.string() })).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.intent === "draft") return;
    // required de description/date/time/venue/city con path [campo];
    // fecha: regex YYYY-MM-DD y comparación con la fecha de hoy en America/Lima (helper privado del archivo,
    //   p. ej. Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date()));
    // cada fila: ticketTypeFormSchema.safeParse(row) → issues con path ["ticketTypes", i, campo].
  });
```
(Esquema orientativo: el developer puede ajustar la implementación, pero no los mensajes, las reglas ni los nombres exportados.)

```ts
// modules/organizer/types/organizer.types.ts
export type OrganizerEvent = z.infer<typeof organizerEventSchema>;
export type OrganizerEventStatus = z.infer<typeof organizerEventStatusSchema>;
export type OrganizerEventFilter = "all" | OrganizerEventStatus;
export type DashboardKpis = { revenue: number; ticketsSold: number; publishedCount: number };
// Fase 2
export type SavedStatus = z.infer<typeof savedStatusSchema>;            // "publicado" | "borrador" | undefined
export type OrganizerEventFormValues = z.input<typeof organizerEventFormSchema>;
export type TicketTypeRow = OrganizerEventFormValues["ticketTypes"][number];
export type TicketTypeRowErrors = Partial<Record<"name" | "price" | "quantity", string>>;
// Fase 2 T1 (lo usa la Fase 3)
export type EventPreview = {
  title: string | null; categoryLabel: string; dateLabel: string | null;
  place: string | null; priceFrom: number | null; imageUrl: string | null;
};
```

| Unidad | Archivo | Firma / comportamiento | Fase |
|---|---|---|---|
| Stats | `modules/organizer/utils/organizerStats.ts` | `getEventRevenue(e): number` (borrador → 0; publicado → `sold × (priceFrom ?? 0)`). `getDashboardKpis(events): DashboardKpis`. `getSoldPercentage(sold, capacity): number` (entero 0–100; capacidad 0 → 0; tope 100). `filterOrganizerEvents(events, filter)`. `formatCount(n): string` (`Intl.NumberFormat("es-PE")`) | 1 |
| Mock | `modules/organizer/data/organizerEvents.mock.ts` | `ORGANIZER_SALES_MOCK: { slug; sold; capacity }[]`, `ORGANIZER_DRAFTS_MOCK` (Requisito 11) | 1 |
| Service | `modules/organizer/services/organizer.service.ts` | `getOrganizerEvents(): Promise<OrganizerEvent[]>`: publicados en el orden de `ORGANIZER_SALES_MOCK` (`id`, `title`, `category`, `startsAt`, `venue`, `city`, `imageUrl`, `priceFrom` del `Event`), después los borradores; ignora los slugs que no existan; `organizerEventSchema.array().parse` | 1 |
| Form utils | `modules/organizer/utils/organizerEventForm.ts` | `createTicketTypeRow(): TicketTypeRow`, `getTicketCapacity(rows)`, `getMinTicketPrice(rows): number \| null`, `formatTicketCount(n)` ("1 entrada" / "N entradas" con separador es-PE), `buildStartsAt(date, time): string \| null` (offset fijo `-05:00`, Perú sin horario de verano), `getTicketTypeErrors(rows): TicketTypeRowErrors[]` (usa `ticketTypeFormSchema`), `toOrganizerEvent(values, id): OrganizerEvent`. Fase 3: `isAcceptedCoverImage(file): boolean` | 2 (mod. 3) |
| Store | `modules/organizer/stores/organizer.store.ts` | `useOrganizerStore`: `{ events: OrganizerEvent[]; addEvent(event): void }` (`addEvent` antepone). `persist` con `name: "mentec-organizer-events"`, `partialize: ({ events }) => ({ events })`, `skipHydration: true` (patrón de `auth.store.ts`); la rehidratación la hacen `OrganizerDashboard` y `OrganizerEventForm` al montar | 2 |
| Preview util | `modules/organizer/utils/eventPreview.ts` | `buildEventPreview(values, imageUrl): EventPreview`: `title` = nombre con trim o `null`; `categoryLabel` = `EVENT_CATEGORY_LABELS[category]`; `dateLabel` = `formatEventDate(buildStartsAt(...))` o `null`; `place` = `[venue, city]` con trim, sin vacíos, unidos por ", ", o `null`; `priceFrom` = `getMinTicketPrice` | 3 |
| Hook | `modules/organizer/hooks/useObjectUrl.ts` | `useObjectUrl(file: File \| null): string \| null`; crea con `URL.createObjectURL` y revoca la anterior al cambiar y al desmontar | 3 |

### Barrel `modules/organizer/index.ts`
- Fase 1: `OrganizerNav`, `OrganizerDashboard`, `getOrganizerEvents`, tipo `OrganizerEvent`.
- Fase 2: añade `OrganizerEventForm` y `savedStatusSchema`.

### Contrato de API
No hay API HTTP. Contratos internos:
- `getOrganizerEvents(): Promise<OrganizerEvent[]>` (forma en `organizerEventSchema`).
- Query param de la ruta `/organizador`: `guardado?: "publicado" | "borrador"` (`savedStatusSchema`; cualquier otro valor se ignora).
- localStorage `mentec-organizer-events`: `{ state: { events: OrganizerEvent[] }, version: 0 }`.
- Formulario → store: `toOrganizerEvent(values: OrganizerEventFormValues, id: string): OrganizerEvent` (Requisito 17).

### Diseño de página `design-system/ticketera/pages/organizer.md` (Fase 1)
Override del MASTER para `/organizador` y `/organizador/eventos/nuevo`, con la misma estructura que `pages/checkout.md`: esquema de layout de ambas páginas (sidebar en `lg` / chips en móvil, KPIs, lista tabla/tarjetas, formulario de dos columnas con vista previa, barra inferior `sticky` en móvil), reglas específicas (badges Publicado/Borrador, `Progress` con `aria-valuetext`, "—" con "Sin ingresos", marcadores sin imagen o sin fecha, dropzone, Decisiones 2, 3, 4, 12 y 14 en forma breve) y metadata de cada página.

## Reutilización
- `@/modules/events`: `getEvents` (origen del mock), `EVENT_CATEGORIES`, `EVENT_CATEGORY_LABELS`, `formatEventDate`, `formatEventPrice`, tipo `EventCategory`. Sin cambios en el módulo.
- `@/hooks/useZodForm` (contrato D, movido por la spec de checkout con pago simulado): estado, errores, foco en el primer campo inválido y revalidación en blur. Sin cambios.
- Patrones: `RegisterForm` (campos `Field` + `aria-invalid`/`aria-describedby`, `Select` con `items`, `Spinner` en el envío); `auth.store.ts` + `AuthHeaderActions` (`persist` + `skipHydration` + `rehydrate` al montar); `UpcomingEvents` (`ToggleGroup` de selección única); `CategoryFilter` (chips `h-11` con scroll horizontal); `EVENT_STATUS_BADGE` (mapa de badge con texto); `EventCard` (anatomía replicada en `EventPreviewCard`, Decisión 4); `pages/checkout.md` (formato del archivo de diseño).
- shadcn instalados: `toggle-group`, `badge`, `card`, `button`, `alert`, `field`, `input`, `textarea`, `select`, `spinner`. A instalar: `table`, `progress`.
- Nativo: `input type="date"`/`"time"`/`"file"` (KISS, accesibles y con teclado del sistema en móvil), `crypto.randomUUID()`, `URL.createObjectURL`.

## Tests
Ubicados junto al archivo probado (`npx vitest run modules/organizer`).
- **`utils/organizerStats.test.ts`** (Fase 1):
  - `getEventRevenue`: publicado 7420 × 180 = 1,335,600; borrador = 0; `priceFrom: null` = 0.
  - `getDashboardKpis` con los 4 eventos del mock: `{ revenue: 1387530, ticketsSold: 8146, publishedCount: 3 }`; lista vacía da ceros.
  - `getSoldPercentage`: (7420, 8000) → 93; (0, 1500) → 0; (5, 0) → 0; (10, 5) → 100.
  - `filterOrganizerEvents`: `all` / `published` / `draft`.
  - `formatCount(8146)` → "8,146".
- **`services/organizer.service.test.ts`** (Fase 1):
  - Devuelve 4 eventos; el primero es `evt-001` con los datos del evento (título, `imageUrl`, `priceFrom: 180`) y la venta 7420/8000, `published`.
  - El último es el borrador `org-draft-001`.
  - Con `@/modules/events` mockeado sin uno de los slugs, ese evento se omite.
- **`schemas/organizer.schema.test.ts`** (Fase 2; `vi.useFakeTimers({ toFake: ["Date"] })` + `vi.setSystemTime`):
  - Borrador: solo con el nombre es válido; con el nombre en blanco (`"  "`) da el error de nombre; el resto de campos vacíos no da errores.
  - Publicar: con todo vacío da los errores de `name`, `description`, `date`, `time`, `venue`, `city` y `ticketTypes` (con path `["ticketTypes", 0, …]`); un formulario completo es válido.
  - Fecha: ayer da "La fecha no puede ser anterior a hoy"; hoy en Lima es válido, incluso cuando en UTC ya es mañana (p. ej. `2026-10-03T03:00:00Z` con fecha `2026-10-02`); `"2026-13-45"` da "Elige una fecha válida".
  - Hora `"25:00"` da error.
  - Fila: precio `"-5"` → "El precio debe ser 0 o mayor"; `"0"` es válido; cantidad `"0"`, `"1.5"` y `""` dan sus mensajes respectivos.
  - `savedStatusSchema`: `"publicado"`, `"borrador"`, `"x"` → `undefined`, `["publicado", "borrador"]` → `undefined`.
- **`utils/organizerEventForm.test.ts`** (Fase 2; Fase 3 añade `isAcceptedCoverImage`):
  - `getTicketCapacity`: ignora filas inválidas o vacías y suma 100 + 50 = 150.
  - `getMinTicketPrice`: `["80", "120"]` → 80; `["0", "50"]` → 0; vacíos → `null`; `"-5"` se ignora.
  - `formatTicketCount`: 0, 1 y 1500 → "0 entradas", "1 entrada", "1,500 entradas".
  - `buildStartsAt`: válido → `"2026-12-05T20:00:00-05:00"`; falta la hora → `null`.
  - `getTicketTypeErrors`: los mensajes de cada fila por campo.
  - `toOrganizerEvent`: publicar (`status`, trims, `capacity`, `priceFrom`, `sold: 0`, `imageUrl: null`, y el resultado pasa `organizerEventSchema`); borrador con solo el nombre (`startsAt: null`, `priceFrom: null`, `capacity: 0`).
  - `isAcceptedCoverImage`: png/jpeg sí; gif/webp/pdf no.
- **`stores/organizer.store.test.ts`** (Fase 2):
  - `addEvent` antepone y persiste en `mentec-organizer-events`.
  - `persist.rehydrate` restaura los eventos guardados.
  - El estado inicial es `[]`.
- **`components/OrganizerEventForm.test.tsx`** (Fase 2; Fase 3 añade un caso). Se mockea `next/navigation` (`useRouter().push`) y se limpia el store y localStorage antes de cada test.
  - "Publicar evento" vacío: muestra los errores y el foco queda en "Nombre del evento"; no llama a `push`.
  - "Guardar borrador" solo con el nombre: el store contiene un borrador y se llama a `push("/organizador?guardado=borrador")`.
  - Publicación válida (fecha 2030-01-01): evento `published` con `capacity` correcta y `push("/organizador?guardado=publicado")`.
  - Filas: quitar está deshabilitado con 1 fila; agregar mueve el foco al nombre de la nueva; la capacidad total se actualiza.
  - Fase 3: tras elegir un PNG (con `URL.createObjectURL` mockeado), el evento guardado tiene `imageUrl: null`.
- **`hooks/useObjectUrl.test.ts`** (Fase 3, `renderHook`, `URL.createObjectURL`/`revokeObjectURL` mockeados):
  - `null` → `null`.
  - Con un archivo devuelve la URL creada.
  - Al cambiar de archivo revoca la anterior.
  - Al desmontar revoca la actual.
- **`utils/eventPreview.test.ts`** (Fase 3):
  - Formulario vacío: `title`, `dateLabel`, `place` y `priceFrom` a `null` y `categoryLabel` "Conciertos".
  - Completo: "SÁB 5 DIC · 20:00", "Teatro Municipal, Lima", 80.
  - Solo la ciudad: "Lima".
- **Sin test** (SETUP §3): `OrganizerNav`, `OrganizerKpis`, `OrganizerEventsTable`, `EventPreviewCard`, `CoverImageField`, `TicketTypesField` (presentacionales o cubiertos por el test del formulario), `OrganizerDashboard` (compone utils ya probados), páginas y layout, y los archivos de `components/ui/`.

## Plan de tareas
Coordinación:
- **Orden global de esta ronda:** seating → checkout → tickets → **organizer** → events-ui-refresh. Esta spec se implementa después de checkout-mock-payment.
- **Prerrequisito de la Fase 2:** `hooks/useZodForm.ts` debe existir (contrato D, lo mueve la spec de checkout). Si no existe, se detiene la fase y se avisa: no se copia el hook ni se importa desde `modules/auth`.
- **Archivos compartidos con otras specs:** `components/ui/progress.tsx` y `components/ui/table.tsx` (si otra spec ya los instaló, Fase 1 T1 solo lo comprueba y se marca hecha sin reinstalar ni sobrescribir); `modules/marketing/components/OrganizerBanner.tsx` (si events-ui-refresh lo modifica después, debe partir de este cambio de `href`).
- **Registro de shadcn:** al redactar esta spec, `ui.shadcn.com` no era accesible desde el proxy (403), así que no se pudieron ejecutar `npx shadcn search`/`docs`; `table` y `progress` son componentes conocidos del registro `base-nova`. Si `npx shadcn@latest add` falla, se detiene y se avisa al usuario: no se escriben a mano.
- Nadie hace commits ni ejecuta `npm run build` en paralelo: el build lo corre el reviewer al cerrar cada fase.

### Fase 1 — Panel con datos mock (17 archivos, 2 generados por shadcn)
- [ ] T1 — Instalar componentes shadcn: `npx shadcn@latest add table progress` · archivos: `components/ui/table.tsx`, `components/ui/progress.tsx` · depende de: — · secuencial (base, `components/ui/`)
- [ ] T2 — Schema y tipos del evento de organizador, y utils de estadísticas con test · archivos: `modules/organizer/schemas/organizer.schema.ts`, `modules/organizer/types/organizer.types.ts`, `modules/organizer/utils/organizerStats.ts`, `modules/organizer/utils/organizerStats.test.ts` · depende de: T1 · secuencial (base del módulo)
- [ ] T3 — Datos mock y service `getOrganizerEvents` con test · archivos: `modules/organizer/data/organizerEvents.mock.ts`, `modules/organizer/services/organizer.service.ts`, `modules/organizer/services/organizer.service.test.ts` · depende de: T2 · paralelo con T4
- [ ] T4 — Componentes del panel: navegación, KPIs, lista tabla/tarjetas y dashboard con filtro · archivos: `modules/organizer/components/OrganizerNav.tsx`, `modules/organizer/components/OrganizerKpis.tsx`, `modules/organizer/components/OrganizerEventsTable.tsx`, `modules/organizer/components/OrganizerDashboard.tsx` · depende de: T1, T2 · paralelo con T3
- [ ] T5 — Rutas, barrel y diseño de página · archivos: `app/organizador/layout.tsx`, `app/organizador/page.tsx`, `modules/organizer/index.ts`, `design-system/ticketera/pages/organizer.md` · depende de: T3, T4 · secuencial

### Fase 2 — Crear evento, store y aviso (15 archivos)
- [ ] T1 — Schema del formulario (`savedStatusSchema`, `ticketTypeFormSchema`, `organizerEventFormSchema`), tipos del formulario y utils del formulario, con tests · archivos: `modules/organizer/schemas/organizer.schema.ts`, `modules/organizer/schemas/organizer.schema.test.ts`, `modules/organizer/types/organizer.types.ts`, `modules/organizer/utils/organizerEventForm.ts`, `modules/organizer/utils/organizerEventForm.test.ts` · depende de: Fase 1 · paralelo con T2
- [ ] T2 — Store `useOrganizerStore` con persist y test · archivos: `modules/organizer/stores/organizer.store.ts`, `modules/organizer/stores/organizer.store.test.ts` · depende de: Fase 1 · paralelo con T1
- [ ] T3 — Formulario `OrganizerEventForm` + `TicketTypesField` con test · archivos: `modules/organizer/components/OrganizerEventForm.tsx`, `modules/organizer/components/TicketTypesField.tsx`, `modules/organizer/components/OrganizerEventForm.test.tsx` · depende de: T1, T2, `hooks/useZodForm.ts` (spec de checkout) · paralelo con T4
- [ ] T4 — El dashboard combina el store y muestra el `Alert` de guardado · archivos: `modules/organizer/components/OrganizerDashboard.tsx` · depende de: T1 (tipo `SavedStatus`), T2 · paralelo con T3
- [ ] T5 — Ruta de creación, `searchParams` en Resumen, barrel y enlaces del banner · archivos: `app/organizador/eventos/nuevo/page.tsx`, `app/organizador/page.tsx`, `modules/organizer/index.ts`, `modules/marketing/components/OrganizerBanner.tsx` · depende de: T3, T4 · secuencial

### Fase 3 — Imagen de portada y vista previa (10 archivos)
- [ ] T1 — Hook `useObjectUrl` con test · archivos: `modules/organizer/hooks/useObjectUrl.ts`, `modules/organizer/hooks/useObjectUrl.test.ts` · depende de: Fase 2 · paralelo con T2
- [ ] T2 — `buildEventPreview` e `isAcceptedCoverImage`, con tests · archivos: `modules/organizer/utils/eventPreview.ts`, `modules/organizer/utils/eventPreview.test.ts`, `modules/organizer/utils/organizerEventForm.ts`, `modules/organizer/utils/organizerEventForm.test.ts` · depende de: Fase 2 · paralelo con T1
- [ ] T3 — Componentes presentacionales `CoverImageField` (recibe `previewUrl`/`error` y emite `onSelect`/`onRemove`; la validación del tipo la hace el formulario) y `EventPreviewCard` · archivos: `modules/organizer/components/CoverImageField.tsx`, `modules/organizer/components/EventPreviewCard.tsx` · depende de: Fase 2 (tipo `EventPreview`) · paralelo con T1 y T2
- [ ] T4 — Integrar portada y vista previa en el formulario (grilla de dos columnas en `lg`, orden en móvil, `useObjectUrl`, `isAcceptedCoverImage`, `buildEventPreview`) y el caso de test de `imageUrl: null` · archivos: `modules/organizer/components/OrganizerEventForm.tsx`, `modules/organizer/components/OrganizerEventForm.test.tsx` · depende de: T1, T2, T3 · secuencial

Nota: el tipo `EventPreview` se declara en `modules/organizer/types/organizer.types.ts` en la Fase 2 T1, junto al resto de tipos, para que ninguna tarea de la Fase 3 toque ese archivo y T1–T3 puedan ir en paralelo.

## Preguntas abiertas
1. **Edición de borradores:** sin la acción "Editar", un borrador guardado no puede completarse ni publicarse (Decisión 3). ¿Se planifica una fase o spec siguiente con `/organizador/eventos/<id>/editar`? Exigiría guardar en el store todos los campos del formulario (descripción, hora, tipos de entrada), no solo los que muestra el panel.
2. **Sesión:** el panel es accesible sin iniciar sesión (Decisión 1). ¿Debe exigirse sesión (y algún rol "organizador" en el mock de auth) en una iteración futura?
3. **Pantallas "Mis eventos", "Ventas" y "Configuración":** no se muestran en la navegación. ¿Se confirma que no hacen falta ni como "Próximamente"?
4. **Enlace "Vende con nosotros" del footer:** sigue apuntando a `/organizadores` (no existe). ¿Se apunta también a `/organizador` o se reserva `/organizadores` para una futura landing comercial de organizadores?
5. **Imagen de portada:** no se persiste (Decisión 7) y no tiene límite de tamaño. ¿Hace falta validar tamaño o proporción 16:9, o guardar la imagen de alguna forma en la maqueta?
6. **Reglas de negocio de publicación:** se asumió que la descripción es obligatoria al publicar, que la fecha puede ser hoy y que el precio 0 (entrada libre) está permitido. ¿Hay mínimos (precio mínimo, antelación mínima, número máximo de tipos de entrada o de capacidad)?
7. **Visibilidad de los eventos publicados:** solo aparecen en el panel. ¿Deberían mostrarse también en `/eventos` y la landing (lo que implicaría que `events` lea el store de organizer)?
