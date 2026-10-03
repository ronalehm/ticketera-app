# Mapa del lugar y "Cómo llegar" con Google Maps

- Módulo: events (y `lib/` para la variable de entorno)
- Estado: aprobado

## Objetivo
En el detalle de un evento (`/eventos/[slug]`), la sección "Lugar" muestra hoy un bloque azul claro con un pin decorativo. Su botón "Cómo llegar" abre una **búsqueda** de Google Maps, no una ruta. El comprador quiere ver dónde está el recinto y llegar sin copiar la dirección. Esta spec hace dos cosas:

1. Sustituye el marcador por un **mapa real de Google Maps** que se carga cuando el usuario lo pide (patrón *click-to-load*). Así se respeta la decisión de `legal-documents.md` de no poner un banner de cookies.
2. Hace que "Cómo llegar" abra **la ruta hacia el lugar** en Google Maps: en la app si está instalada en el móvil y, si no, en una pestaña nueva.

Pedido del usuario (textual): "implementar el addin de google maps para ver el mapa de cómo llegar y el botón cómo llegar debe dirigirme a la ubicación en google maps." En la captura se ven la sección "Lugar" con el bloque azul y el pin, "Gran Teatro Nacional / Av. Javier Prado Este 2225, San Borja, Lima, Lima" y el botón "Cómo llegar ↗".

## Alcance
- Incluye:
  - Componente cliente `VenueMap`:
    - Con clave de API: fachada con el aspecto actual (fondo `bg-accent` y `MapPin`), un botón "Ver mapa" y un aviso breve de que se cargará contenido de Google. Al pulsar el botón se monta el iframe de la **Maps Embed API** (modo `place`).
    - Sin clave: el marcador decorativo de hoy, sin botón.
  - Utilidades puras `buildVenueQuery`, `buildDirectionsUrl` y `buildMapEmbedUrl`, con tests.
  - "Cómo llegar" pasa de la URL de búsqueda a la URL universal de **direcciones** (`/maps/dir/?api=1&destination=…`).
  - Variable pública `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`, validada con zod en `lib/env.ts` (con test). Se documenta en un `.env.example` nuevo y versionado.
  - Proporción del bloque del mapa: 4:3 en móvil y 16:7 desde `md`, igual para la fachada y el iframe (sin CLS).
  - Se actualiza `design-system/ticketera/pages/event-detail.md` (sección "Lugar").
- No incluye:
  - Maps JavaScript API, `@vis.gl/react-google-maps` ni ninguna dependencia nueva.
  - Coordenadas (`lat`, `lng`) ni `placeId` en el schema o el mock de eventos. Basta la dirección (ver Decisión 5 y Pregunta 4).
  - Mapa en otras pantallas: tarjetas, `/eventos`, checkout, entradas, PDF o panel del organizador. Tampoco un campo de ubicación en el formulario del organizador.
  - Recordar la elección "Ver mapa" entre páginas o visitas (sin `localStorage` ni cookie propia). Tampoco un banner o gestor de consentimiento.
  - Cambiar la Política de cookies, la de privacidad ni el aviso del footer. Queda como coordinación con `legal-documents.md` (Pregunta 2).
  - Detectar si el iframe falla (clave inválida o red bloqueada). El iframe es de otro origen y Google muestra su propio mensaje dentro.
  - Corregir la ciudad repetida en algunas direcciones del mock ("San Borja, Lima, Lima"; Pregunta 5).
  - Cabeceras CSP (hoy no hay ninguna en `next.config.ts`).
  - Mover o cambiar rutas de `app/`.

## Investigación y supuestos
El proxy del sandbox bloquea `developers.google.com` (WebFetch devolvió `EGRESS_BLOCKED`). Por eso lo que sigue se basa en la documentación oficial de Google conocida hasta 2026, no en una consulta hecha hoy. El developer o el usuario lo confirman en `https://developers.google.com/maps/documentation/embed/embedding-map` y `https://developers.google.com/maps/documentation/urls/get-started` antes de cerrar la tarea 4.

| Opción | Qué es | Ventajas | Inconvenientes |
|---|---|---|---|
| **(a) Maps Embed API** | `https://www.google.com/maps/embed/v1/place?key=KEY&q=…` en un `<iframe>` | Oficial y documentada. Sin coste y sin límite de uso. Sin JS propio ni dependencias. Admite `q=place_id:…`, `language` y `region` | Necesita una clave de Google Cloud con la "Maps Embed API" habilitada (supuesto: el proyecto debe tener una cuenta de facturación asociada, aunque el uso no se cobra). La clave es pública por naturaleza (va en el `src`), así que se restringe por *referrer* HTTP y solo a esa API |
| (b) iframe sin clave | `https://maps.google.com/maps?q=…&output=embed` | No necesita clave | **No está documentado** ni tiene garantía. Google puede cambiarlo o cortarlo sin aviso, y su encaje en los Términos de Google Maps Platform no está claro |
| (c) Maps JavaScript API | `@vis.gl/react-google-maps` | Mapa interactivo y personalizable | Necesita clave y se factura por carga. Añade una dependencia y bastante JS de cliente. Es excesivo para mostrar un pin (YAGNI, KISS) |

Supuestos de la documentación:
- **Embed (modo `place`):** `q` acepta texto libre o `place_id:<id>`. `language=es` y `region=PE` son opcionales. El snippet de Google usa `loading="lazy"`, `allowfullscreen` y `referrerpolicy="no-referrer-when-downgrade"`. Esta última política envía el *referrer* que necesita la restricción de la clave.
- **URLs de Maps (acción Directions):** `https://www.google.com/maps/dir/?api=1&destination=<texto codificado>`, y opcionalmente `destination_place_id`.
  - Sin `origin`, Google usa la ubicación actual del usuario.
  - En Android e iOS abre la app de Google Maps si está instalada; si no, el navegador.
  - Los parámetros se codifican como URL y la URL completa no supera 2048 caracteres.
  - No necesita clave.

## Decisiones
1. **Opción (a), Maps Embed API, con fallback al marcador actual si no hay clave.** No se usa (b) como fallback: si una pantalla de producción depende de un endpoint no documentado, puede romperse sin aviso. Sin clave, la sección sigue funcionando: muestra el nombre, la dirección y "Cómo llegar", que no necesita clave. Si el usuario quiere ver el mapa en demos sin clave, se decide en la Pregunta 1.
2. **Click-to-load (fachada).** El iframe de Google puede dejar cookies de terceros. `legal-documents.md` decidió "todas las cookies son esenciales, sin banner", y la Política de cookies dice que se pedirá consentimiento antes de usar cookies no esenciales. Por eso:
   - El iframe **no está en el DOM** hasta que el usuario pulsa "Ver mapa", así que antes no se hace ninguna petición a Google.
   - Junto al botón hay un aviso visible: "Al ver el mapa se cargará contenido de Google Maps, que puede usar sus propias cookies." El botón lo referencia con `aria-describedby`.
   - Pulsar el botón es una acción informada del usuario. No se recuerda: cada visita al detalle empieza con la fachada.
   - Como alternativa se descartó cargar siempre el iframe y añadir un banner. Contradice una decisión aprobada y pide un gestor de consentimiento que está fuera del alcance.
   - La actualización de la Política de cookies se coordina con legal (Pregunta 2).
3. **"Cómo llegar" sigue siendo un enlace `<a>`** con estilo de botón outline (ya lo es), no un `<button>`. Solo cambia el `href`, que pasa a la URL de direcciones. Se conservan `target="_blank"`, `rel="noopener noreferrer"`, el `ExternalLink` con `aria-hidden` y el `sr-only` "(se abre en una pestaña nueva)".
4. **Texto de búsqueda único** (`buildVenueQuery`): `"<venue>, <address>, <city>, Perú"`, por ejemplo "Gran Teatro Nacional, Av. Javier Prado Este 2225, San Borja, Lima, Lima, Perú". Se usa en el `q` del iframe y en el `destination` de "Cómo llegar", así que los dos señalan el mismo lugar. Con el nombre del recinto delante, Google suele resolver el lugar exacto (con su ficha) y no solo la calle. El país es una constante `VENUE_COUNTRY = "Perú"` porque todo el catálogo es de Perú (moneda PEN, Indecopi).
5. **Sin coordenadas ni `placeId` en el schema (YAGNI).** Todas las direcciones del mock son geocodificables con el nombre del recinto. Añadirlos obligaría a tocar el schema, el mock, los tests de checkout/tickets que construyen eventos y, más adelante, el formulario del organizador. Si algún recinto aparece mal ubicado, se añade un `placeId` opcional en otra spec (Pregunta 4). Las utilidades quedan preparadas sin parámetros especulativos: solo reciben `venue`, `address` y `city`.
6. **La clave se lee una sola vez, validada con zod**, en `lib/env.ts` (`publicEnv`), según la regla de SETUP §2: "zod valida toda frontera de confianza: … variables de entorno".
   - Una cadena vacía o con solo espacios (`NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=` en un `.env`) se trata como ausente y no rompe el build.
   - `EventDetailInfo` (Server Component) calcula `embedUrl` con `buildMapEmbedUrl` y lo pasa a `VenueMap`.
   - Lleva el prefijo `NEXT_PUBLIC_` porque la clave termina en el HTML (el `src` del iframe). El prefijo deja claro que es pública.
   - La página del detalle es estática (`generateStaticParams`), así que el valor queda fijado en `next build`. Cambiar la clave exige volver a hacer el build (guía `environment-variables.md` de Next 16).
7. **Accesibilidad del mapa:**
   - iframe con `title="Mapa de <venue>"`, `loading="lazy"`, `referrerPolicy="no-referrer-when-downgrade"` (supuesto de la documentación; Pregunta 6) y `allowFullScreen`.
   - Al cargarlo, el foco pasa al iframe, porque el botón desaparece y el foco no puede perderse en `<body>`.
   - El iframe tiene foco visible con `outline`, que se pinta por encima del contenido: `focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring`.
   - No hay trampa de foco: con Tab se recorren los controles de Google y se sale al enlace "Cómo llegar".
   - Sin la clave, el marcador sigue siendo decorativo y entero `aria-hidden`.
8. **Proporción estable:** el contenedor fija el tamaño con `aspect-[4/3] md:aspect-[16/7]` y la fachada y el iframe (`size-full`) lo ocupan entero. Cargar el mapa no mueve nada.
   - 375 px: unos 343 × 257 px. Con 16:7 serían unos 150 px de alto, insuficiente para un mapa.
   - 1440 px: columna de unos 788 px, unos 345 px de alto.
   - Cambia también la altura del marcador sin clave en móvil, que pasa de 16:7 a 4:3. Se documenta en `event-detail.md`.
9. **Sin JavaScript:** el botón "Ver mapa" se renderiza en el servidor pero no hace nada hasta la hidratación. "Cómo llegar" funciona siempre. Es aceptable porque el mapa es una mejora (mismo criterio que el `Sheet` de filtros en `events-ui-refresh.md`).
10. **`.env.example` versionado.** `.gitignore` ignora `.env*`. Se añade la excepción `!.env.example` para que el ejemplo se suba y `.env.local` siga ignorado.

## Requisitos
1. **`buildVenueQuery({ venue, address, city })`** devuelve `` `${venue}, ${address}, ${city}, ${VENUE_COUNTRY}` `` (Decisión 4).
2. **`buildDirectionsUrl(location)`** devuelve `https://www.google.com/maps/dir/?api=1&destination=<buildVenueQuery codificado>`. Construye la query con `URLSearchParams` (los espacios pasan a `+` y las comas a `%2C`). No lleva `origin`, `travelmode` ni clave.
3. **`buildMapEmbedUrl(location, apiKey)`**:
   - Con `apiKey` no vacía, devuelve `https://www.google.com/maps/embed/v1/place?key=<apiKey>&q=<buildVenueQuery>&language=es&region=PE`, codificado con `URLSearchParams`.
   - Con `apiKey` `undefined` o vacía, devuelve `null`.
4. **`lib/env.ts`**:
   - `publicEnvSchema = z.object({ NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: z.string().trim().transform((v) => v || undefined).optional() })`, o una forma equivalente en zod v4 con el mismo comportamiento.
   - `publicEnv = publicEnvSchema.parse({ NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY })`. La referencia va literal para que Next la incruste.
5. **`VenueMap`** (`"use client"`, props `{ venue: string; embedUrl: string | null }`) se renderiza dentro de la tarjeta "Lugar", en lugar del marcador. Su contenedor es `relative aspect-[4/3] overflow-hidden bg-accent md:aspect-[16/7]`.
   - **`embedUrl === null`:** el contenido actual (`MapPin size-8 text-primary` centrado), con el contenedor entero `aria-hidden`.
   - **Con `embedUrl`, antes de pulsar:** columna centrada (`flex size-full flex-col items-center justify-center gap-3 p-4 text-center`) con:
     - `MapPin` (`aria-hidden`, `size-8 text-primary`);
     - `Button` de shadcn `type="button"`, `variant="outline"`, `h-11 px-4 font-semibold cursor-pointer duration-200`, con el texto "Ver mapa" y `aria-describedby` apuntando al aviso;
     - el aviso `<p>` `max-w-xs text-sm text-muted-foreground` con "Al ver el mapa se cargará contenido de Google Maps, que puede usar sus propias cookies.".
     - Sin iframe en el DOM.
   - **Después de pulsar (clic, Enter o Espacio):** desaparece la fachada y se monta `<iframe title="Mapa de {venue}" src={embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen className="size-full border-0 …foco (Decisión 7)" />`. El foco pasa al iframe (`ref` + `useEffect`).
   - Solo tokens del tema: sin hex ni colores por defecto de Tailwind.
6. **`EventDetailInfo`** (sigue siendo Server Component):
   - Elimina `mapsHref` (búsqueda) y el marcador inline.
   - Calcula `location = { venue, address, city }` del evento y renderiza `<VenueMap venue={event.venue} embedUrl={buildMapEmbedUrl(location, publicEnv.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY)} />`.
   - El enlace "Cómo llegar" usa `href={buildDirectionsUrl(location)}`, con el resto igual.
   - No toca "Acerca del evento" ni "Información importante", donde se respetan los cambios de `events-ui-refresh` F5 · T1 si ya están.
7. **`.env.example`** (nuevo) con un comentario en español y la línea `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=`. El comentario indica:
   - qué es: la clave de la Maps Embed API;
   - que es opcional: sin ella se ve el marcador y "Cómo llegar" funciona igual;
   - que es pública y se debe restringir en Google Cloud Console por *referrers* HTTP (dominio de producción y `http://localhost:3000/*`) y por API (solo "Maps Embed API");
   - que va en `.env.local`;
   - que fijarla o cambiarla exige reiniciar `npm run dev` o volver a hacer `npm run build`.
8. **`.gitignore`**: añade `!.env.example` justo después de `.env*`.
9. **`design-system/ticketera/pages/event-detail.md`**: la viñeta "Lugar" de "Información (`EventDetailInfo`)" describe:
   - el bloque `aspect-[4/3] md:aspect-[16/7]`;
   - los dos estados sin clave y con clave (fachada → iframe), con sus textos y la accesibilidad;
   - "Cómo llegar" con la URL de direcciones.

   La línea "decorativo y entero `aria-hidden` (no es un mapa real)" queda limitada al caso sin clave. Se añade "Ver mapa" a la lista de targets táctiles ≥ 44 px de "Reglas específicas".

## Criterios de aceptación
Todos son de la Fase 1. El sandbox puede bloquear `google.com`. Por eso "se ve el mapa" y "abre la app" se comprueban en el navegador del usuario, con una clave válida en `.env.local`. En CI y en la revisión se comprueban el DOM, el `src` del iframe y el `href`.

- [ ] Dado `/eventos/<slug del Gran Teatro Nacional>` con `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` definida, a 1440 px, entonces "Lugar" muestra:
  - el bloque `bg-accent` con el pin;
  - el botón "Ver mapa" de 44 px de alto o más;
  - el aviso "Al ver el mapa se cargará contenido de Google Maps, que puede usar sus propias cookies.";
  - debajo, "Gran Teatro Nacional", la dirección y "Cómo llegar".

  No hay ningún `<iframe>` en el DOM y en la pestaña Network no hay peticiones a `google.com` antes de pulsar.
- [ ] Dado ese estado, cuando se pulsa "Ver mapa" (con el ratón, con Enter o con Espacio), entonces la fachada se sustituye por un `<iframe>` en la misma caja (misma altura antes y después: sin desplazamiento del contenido inferior). El iframe tiene:
  - `title="Mapa de Gran Teatro Nacional"`, `loading="lazy"`, `referrerpolicy="no-referrer-when-downgrade"` y `allowfullscreen`;
  - un `src` cuyo origen y ruta son `https://www.google.com/maps/embed/v1/place`, con `key` igual a la variable, `q` (decodificado) igual a "Gran Teatro Nacional, Av. Javier Prado Este 2225, San Borja, Lima, Lima, Perú", `language=es` y `region=PE`.

  El foco queda en el iframe.
- [ ] Dado el mismo caso en el navegador del usuario con una clave válida y restringida, entonces el iframe muestra el mapa de Google con el marcador en el Gran Teatro Nacional (San Borja). *Verificación manual.*
- [ ] Dado que la variable no existe o está vacía (`NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY=`), cuando se hace el build y se abre el detalle, entonces el bloque es el marcador decorativo (contenedor `aria-hidden`), sin botón "Ver mapa" ni iframe. "Cómo llegar" funciona igual y el build no falla.
- [ ] Dado cualquier evento, entonces "Cómo llegar" cumple todo esto:
  - es un `<a>` (no un `<button>`) con `href` que empieza por `https://www.google.com/maps/dir/?api=1&destination=`;
  - su `destination` decodificado es `"<lugar>, <dirección>, <ciudad>, Perú"`;
  - tiene `target="_blank"` y `rel="noopener noreferrer"`;
  - contiene el texto `sr-only` "(se abre en una pestaña nueva)" y el icono `ExternalLink` con `aria-hidden`;
  - mide 44 px de alto o más y tiene foco visible.

  En el navegador del usuario abre la ruta hacia el recinto en Google Maps (en móvil, en la app si está instalada). *Verificación manual.*
- [ ] Dado el detalle a 375 px, entonces el bloque del mapa mide 4:3 (unos 343 × 257 px) en los dos estados. El botón y el aviso no desbordan y no hay scroll horizontal de página. A 1440 px el bloque es 16:7.
- [ ] Dado el recorrido con teclado, entonces el orden en "Lugar" es: "Ver mapa" (foco visible) → tras activarlo, el iframe (contorno de foco visible si se llegó con teclado) → los controles internos de Google → "Cómo llegar". No hay trampa de foco: Tab y Shift+Tab salen del iframe.
- [ ] Dado el código, entonces:
  - `EventDetailInfo.tsx` no tiene `"use client"` y `VenueMap.tsx` sí;
  - la clave solo se lee a través de `publicEnv` de `@/lib/env`;
  - no hay URLs de Google Maps fuera de `modules/events/utils/venueMap.ts`;
  - `package.json` no tiene dependencias nuevas;
  - no hay hex ni colores por defecto de Tailwind;
  - "Información importante" conserva los cambios de `events-ui-refresh` F5 · T1 si ya estaban aplicados.
- [ ] Dado `.env.example`, entonces existe, documenta la variable (Requisito 7) y Git no lo ignora (`git check-ignore .env.example` no imprime nada), mientras `.env.local` sigue ignorado.
- [ ] Dado `design-system/ticketera/pages/event-detail.md`, entonces "Lugar" describe la proporción 4:3 / 16:7, los estados sin clave, fachada e iframe, los textos, la accesibilidad y la URL de direcciones. "Ver mapa" está en la lista de targets ≥ 44 px.
- [ ] Dado `npx vitest run`, entonces pasan `lib/env.test.ts`, `modules/events/utils/venueMap.test.ts` y `modules/events/components/VenueMap.test.tsx`, junto con todos los tests existentes sin modificarlos. `npm run lint` y `npm run build` terminan sin errores.

## Diseño técnico
- **Rutas (`app/`):** sin cambios. El detalle vive en `app/(site)/eventos/[slug]/page.tsx` (lo movió `layout-fullscreen-shells.md` F1) y ya renderiza `<EventDetailInfo event={event} />`, que no cambia de props.
- **Componentes:**
  - `Button`: shadcn (instalado, `components/ui/button.tsx`). Sirve para "Ver mapa"; `buttonVariants` sigue en "Cómo llegar".
  - `SectionHeader`: existente (`components/shared/SectionHeader.tsx`), sin cambios.
  - `EventDetailInfo`: existente (`modules/events/components/EventDetailInfo.tsx`). Se modifica según el Requisito 6.
  - `VenueMap`: nuevo (`modules/events/components/VenueMap.tsx`). No existe nada parecido en el proyecto ni en shadcn: `aspect-ratio` de shadcn solo envuelve la proporción, y la clase nativa `aspect-*` de Tailwind ya cubre eso (KISS), así que no se instala. Va en `events` porque solo lo usa el detalle; si otro dominio lo necesita, se sube a `components/shared`. Es cliente por el estado `loaded` y el manejo del foco. No se exporta en `modules/events/index.ts` porque solo lo usa `EventDetailInfo`.
- **Utils:** nuevo `modules/events/utils/venueMap.ts`, con `VENUE_COUNTRY`, `buildVenueQuery`, `buildDirectionsUrl` y `buildMapEmbedUrl`. No se exportan en el barrel (uso interno del módulo).
- **Entorno:** nuevo `lib/env.ts` (`publicEnvSchema`, `publicEnv`). Es global y es la primera variable de entorno del proyecto, por eso va en `lib/` y no en el módulo.
- **Hooks, services, stores, schemas de dominio:** no aplica. No cambian `events.schema.ts`, `events.mock.ts` ni sus tipos.
- **Contrato (no hay API propia; firmas y URLs externas):**

```ts
// modules/events/utils/venueMap.ts
import type { EventDetail } from "../types/events.types";

export type VenueLocation = Pick<EventDetail, "venue" | "address" | "city">;
export const VENUE_COUNTRY = "Perú";

export function buildVenueQuery(location: VenueLocation): string;
// "Gran Teatro Nacional, Av. Javier Prado Este 2225, San Borja, Lima, Lima, Perú"

export function buildDirectionsUrl(location: VenueLocation): string;
// https://www.google.com/maps/dir/?api=1&destination=Gran+Teatro+Nacional%2C+Av.+Javier+Prado+Este+2225%2C+...%2C+Per%C3%BA

export function buildMapEmbedUrl(location: VenueLocation, apiKey: string | undefined): string | null;
// https://www.google.com/maps/embed/v1/place?key=<apiKey>&q=<query>&language=es&region=PE  |  null sin clave

// lib/env.ts
export const publicEnvSchema: z.ZodObject<{ NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: /* string | undefined, "" → undefined */ }>;
export const publicEnv: { NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?: string };

// modules/events/components/VenueMap.tsx  ("use client")
export function VenueMap(props: { venue: string; embedUrl: string | null }): JSX.Element;
```

- **Estructura del bloque "Lugar"** (la tarjeta y el pie no cambian):

```
<section> SectionHeader "Lugar"
  <div rounded-2xl ring-1 ring-border overflow-hidden>
    <VenueMap venue embedUrl />       ← aspect-[4/3] md:aspect-[16/7], bg-accent
    <div pie> <address>…</address> <a "Cómo llegar" href=buildDirectionsUrl(...) /> </div>
  </div>
</section>
```

## Reutilización
- `Button` y `buttonVariants` (`components/ui/button.tsx`), `cn` (`@/lib/utils`) y `SectionHeader`.
- Iconos de `lucide-react` ya usados en el archivo: `MapPin` y `ExternalLink`.
- El estilo, el `sr-only` y los atributos actuales de "Cómo llegar". La tarjeta "Lugar" de `EventDetailInfo`.
- `zod` v4 (instalado) para `lib/env.ts`.
- Patrón de tests de componentes cliente del módulo: `@testing-library/react` con `fireEvent`, como `ShareEventButton.test.tsx` (no hay `user-event` instalado).

## Tests
- **`modules/events/utils/venueMap.test.ts`** (util con lógica). Las aserciones parsean con `new URL(...)` y `searchParams` para no depender de cómo se codifica cada carácter.
  - `buildVenueQuery`: con el Gran Teatro Nacional devuelve exactamente "Gran Teatro Nacional, Av. Javier Prado Este 2225, San Borja, Lima, Lima, Perú".
  - `buildDirectionsUrl`:
    - `origin + pathname` es `https://www.google.com/maps/dir/`, `api` es `"1"` y `destination` es igual a `buildVenueQuery(...)`;
    - no tiene `key`, `origin` ni `travelmode`;
    - una dirección con `&`, `#`, `?`, tildes y `ñ` (por ejemplo "Jr. Ñaña & Cía #2? Peña") llega intacta en `destination` y no crea parámetros extra;
    - el string empieza por `https://www.google.com/maps/dir/?api=1&destination=`.
  - `buildMapEmbedUrl`:
    - con la clave `"test-key"`, `origin + pathname` es `https://www.google.com/maps/embed/v1/place`, `key === "test-key"`, `q === buildVenueQuery(...)`, `language === "es"` y `region === "PE"`;
    - con `undefined` devuelve `null`;
    - con `""` devuelve `null`.
- **`modules/events/components/VenueMap.test.tsx`** (componente con estado y eventos):
  - Con `embedUrl={null}`: no hay botón "Ver mapa" ni iframe, y el contenedor tiene `aria-hidden="true"`.
  - Con `embedUrl`:
    - Antes de pulsar: hay un botón con nombre "Ver mapa" y su descripción accesible (`toHaveAccessibleDescription` o `aria-describedby` → texto) contiene "Google Maps". No hay `iframe` (`container.querySelector("iframe") === null`).
    - Tras `fireEvent.click`: hay un iframe con `title="Mapa de Gran Teatro Nacional"`, `src` igual al `embedUrl` recibido, `loading="lazy"`, `referrerpolicy="no-referrer-when-downgrade"` y `allowfullscreen`. El botón ya no está y `document.activeElement` es el iframe.
- **`lib/env.test.ts`** (schema con transformación): `publicEnvSchema.parse` con
  - `{}` da una clave `undefined`;
  - `{ …: "" }` da `undefined`;
  - `{ …: "   " }` da `undefined`;
  - `{ …: " abc " }` da `"abc"`.
- **Sin tests:** `EventDetailInfo` (presentacional, Server Component; su lógica está en las utils probadas), `.env.example`, `.gitignore` y `event-detail.md`. La carga real del mapa y la apertura de la app de Maps se verifican a mano (criterios marcados).

## Coordinación con otras specs
- **`events-ui-refresh.md` (aprobada), Fase 5 · T1 (pendiente)** modifica `EventDetailInfo.tsx` en "Información importante" (horas con " h", "Inicio del show"). La Fase 5 · T2 modifica `event-detail.md`. Esta spec toca los mismos dos archivos en otras secciones ("Lugar"):
  - **Nunca se ejecutan a la vez.** Tampoco en paralelo dentro de una misma sesión.
  - **Orden recomendado:** primero F5 · T1/T2 de events-ui-refresh si ya se puede (depende de checkout F5 · T1), y después esta spec. Si F5 sigue bloqueada, esta spec puede ir antes. En ese caso, F5 · T1 parte de la versión con `VenueMap` y no toca "Lugar", que su Requisito 3 deja "sin cambios".
  - Quien vaya segundo conserva los cambios del primero (lo verifica el reviewer con el criterio del código).
- **`layout-fullscreen-shells.md` (aprobada):** ya movió el detalle a `app/(site)/eventos/[slug]/page.tsx`. Esta spec no toca `app/`, así que no depende de sus Fases 2–3 ni las bloquea.
- **`legal-documents.md` (aprobada):** decide "todas las cookies son esenciales, sin banner". Esta spec no edita esa spec ni `modules/legal/`. Con click-to-load no se cargan cookies de Google sin una acción informada del usuario. Aun así, la Política de cookies (`legalDocuments.mock.ts`, documento `cookies-v1`) debería mencionar el contenido de terceros. Ver la Pregunta 2.
- **Reemplaza (solo en lo indicado):**
  - En `event-detail.md`, la viñeta "Lugar" (marcador "decorativo… no es un mapa real", `aspect-[16/7]` fijo) y el destino de "Cómo llegar".
  - En `events-ui-refresh.md` F2 requisito 6, "enlaza a la URL de Google Maps actual" pasa a la URL de direcciones. También el criterio F2 "el marcador de mapa es `aria-hidden`", que solo aplica sin clave.

## Plan de tareas
### Fase 1 — Mapa con click-to-load y "Cómo llegar" con ruta (4 tareas, 10 archivos)
- [ ] T1 — Variable de entorno validada con zod, con test, y ejemplo versionado · archivos: `lib/env.ts`, `lib/env.test.ts`, `.env.example` (nuevo), `.gitignore` (añadir `!.env.example`) · depende de: — · secuencial (base: `lib/` y configuración compartida)
- [ ] T2 — Utilidades `VENUE_COUNTRY`, `buildVenueQuery`, `buildDirectionsUrl` y `buildMapEmbedUrl`, con tests · archivos: `modules/events/utils/venueMap.ts`, `modules/events/utils/venueMap.test.ts` · depende de: T1 (orden de base compartida; no importa `lib/env`) · paralelo con T3
- [ ] T3 — Componente cliente `VenueMap` (marcador sin clave, fachada "Ver mapa" con aviso, iframe con foco), con test · archivos: `modules/events/components/VenueMap.tsx`, `modules/events/components/VenueMap.test.tsx` · depende de: T1 (orden de base) · paralelo con T2
- [ ] T4 — Integración en "Lugar" (`VenueMap` + `buildMapEmbedUrl(publicEnv…)` + "Cómo llegar" con `buildDirectionsUrl`) y diseño de página · archivos: `modules/events/components/EventDetailInfo.tsx`, `design-system/ticketera/pages/event-detail.md` · depende de: T1, T2, T3 y **no concurrente** con `events-ui-refresh` F5 · T1/T2 (mismos archivos; ver Coordinación) · secuencial

## Preguntas abiertas
1. **Clave de API:** ¿tienes o vas a crear un proyecto en Google Cloud con la "Maps Embed API" habilitada?
   - Supuesto: hace falta una cuenta de facturación asociada, aunque el Embed no se cobra.
   - Sin clave, el detalle muestra el marcador de hoy (sin mapa) y "Cómo llegar" ya abre la ruta.
   - Si quieres ver un mapa en demos sin clave, se puede usar como fallback la opción (b) (`maps.google.com/maps?q=…&output=embed`, no documentada). No lo recomiendo para producción. Supone un cambio pequeño en `buildMapEmbedUrl`, sus tests y los criterios.
2. **Política de cookies (coordinación con `legal-documents.md`):** propongo una enmienda de esa spec que publique `cookies` v2, con una sección "Contenido de terceros". Diría que el mapa de Google Maps del detalle solo se carga si pulsas "Ver mapa", que Google puede usar sus propias cookies entonces y que remite a la política de privacidad de Google.
   - ¿Hay que mencionarlo también en la Política de privacidad (transferencia a Google: IP y página visitada)?
   - El aviso del footer ("Solo usamos cookies esenciales…") seguiría siendo cierto para las cookies propias. ¿Lo matizamos?
   - ¿Lo hacemos en esa spec, o prefieres cargar el mapa siempre y añadir un banner de consentimiento? Lo segundo contradice la decisión aprobada.
3. **Recordar "Ver mapa":** cada visita al detalle empieza con la fachada. ¿Quieres una casilla "Cargar siempre los mapas de Google"? Implicaría guardar esa preferencia (y enmendar legal).
4. **`placeId` o coordenadas:** no se añaden. Si al probar con clave algún recinto del mock aparece mal ubicado (por ejemplo, "Explanada Costa 21" o "Playa Colán"), ¿añadimos un `placeId` opcional al schema y al mock, para usar `q=place_id:…` y `destination_place_id`? Supondría otra spec, porque toca el schema, el mock y quizá el formulario del organizador.
5. **Ciudad repetida:** en algunos eventos del mock, `address` ya incluye la ciudad ("Av. Javier Prado Este 2225, San Borja, Lima"). Por eso se ve "San Borja, Lima, Lima" (como en tu captura) y la búsqueda la repite, algo inofensivo para Google. ¿Quitamos la ciudad de esas direcciones del mock (cambio en modo build) o lo dejamos así?
6. **Referrer policy:** se usa `no-referrer-when-downgrade`, la del snippet oficial de Google (supuesto; la documentación no se pudo consultar desde el sandbox). Envía a Google la URL completa del detalle, que es pública. Si al probar con la clave restringida funciona con `strict-origin-when-cross-origin` (solo envía el dominio), ¿prefieres esa?
7. **Textos:** "Ver mapa" y "Al ver el mapa se cargará contenido de Google Maps, que puede usar sus propias cookies." ¿Conforme, o prefieres otro texto (por ejemplo, con un enlace a `/cookies` cuando exista esa página)?
