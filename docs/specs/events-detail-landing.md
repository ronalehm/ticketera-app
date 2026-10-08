# Landing propia de cada evento (vista previa al compartir, hora de fin, mapa, landing minimalista y logo del organizador)

- Módulo: events (también organizer, checkout, tickets, seating, notifications, `components/shared`, `hooks/`, `lib/` y `app/`)
- Estado: aprobado

Backlog: Trello «Ticketera», tarjetas **TK-001.a** (Fases 1A y 1B), **TK-002** (Fase 2) y **TK-001.b** (Fase 3).

## Objetivo
Que el enlace `/eventos/<slug>` sea la landing de cada evento, la que el organizador comparte y el comprador abre:

- Al compartirlo por WhatsApp, Facebook o X se ve la portada, el título, la fecha y el recinto.
- El evento tiene fecha y hora de inicio y hora de fin, y se muestra en todas partes como «21:00 – 23:30 h», sin «apertura de puertas».
- Quien ya compró ve cómo llegar desde «Mis entradas» y desde la confirmación.
- La página es **minimalista**: portada, título, organizador (con su logo), fecha y hora, y recinto.
- La página informa con claridad si el evento está en curso, finalizado, cancelado o agotado. Hoy un cancelado da 404.
- Compartir es fácil: WhatsApp, copiar enlace y QR para afiches.

Lo usan los compradores, los asistentes y los organizadores (que la comparten desde el panel y suben su logo).

## Decisiones ya tomadas (Ronald, no se reabren)
1. **Plantilla única** para todos los eventos, con los datos de la BD. Sin personalización por organizador, salvo su logo (Decisión 12). Los únicos campos nuevos son `events.ends_at` y `organizers.logo_url`.
2. **Misma URL** `/eventos/<slug>`: el detalle actual pasa a ser la landing. No hay ruta corta.

## Decisiones de Ronald (2026-10-08)
1. **Sin texto alternativo editable.** No hay `cover_alt`. El `alt` de la portada y `og:image:alt` son el automático `"<título> en <recinto>, <ciudad>"`.
2. **Cancelado y finalizado mantienen «Lugar»** (mapa y «Cómo llegar»).
3. **Aviso de cancelado:** «Este evento fue cancelado.», sin hablar de reembolsos.
4. **Hora de fin obligatoria** (`events.ends_at`) para enviar a revisión y publicar. **Finalizado = desde la hora de fin.**
5. **Backfill:** los eventos existentes reciben `ends_at = starts_at + interval '3 hours'`.
6. **Duración máxima: 24 horas** (`ends_at <= starts_at + 24 h`).
7. **Cambiar la hora de fin de un publicado con compradores avisa igual que un cambio de horario** (inmediato).
8. **Se elimina la «apertura de puertas»:** no se pide ni se muestra. El horario se muestra como «Hora inicio – Hora fin».
9. **Portadas pesadas en las vistas previas:** se valida en Preview; se optimiza solo si falla.
10. **Sin CTA de compra en el hero** («Comprar entradas · desde S/ X»), por ruido visual; ya está quitado en el código. La compra queda en el aside y en la barra móvil.
11. **Cancelados y finalizados no se indexan:** `robots: { index: false, follow: true }`.
12. **Logo del organizador:** lo sube el propio organizador. Si no hay logo, se muestran sus iniciales.
13. **Hero:** portada → nombre del evento → organizador (logo y nombre en la misma línea) → fecha y hora → recinto.
14. **Landing minimalista:** menos elementos y menos ruido, jerarquía clara, sin badges ni bloques decorativos, mucho espacio en blanco y tokens de MASTER.md.
15. **«Ver landing» y «Copiar enlace» del panel, solo en `published`.**
16. **QR de la URL limpia**, sin UTM.
17. **Bloquear la compra desde la hora de inicio:** tarjeta aparte en Trello, **fuera de esta spec**. Para no contradecirla, la landing deja de ofrecer la compra desde el inicio (estado `in-progress`, requisito 46).
18. **`/eventos` mantiene los eventos pasados:** fuera de alcance.

## Hallazgos del código
1. **Nunca hubo URLs públicas con UUID:** no se crea una redirección 308.
2. **Todo evento público tiene portada** (`events_draft_complete_check`): no se crea `opengraph-image.tsx`.
3. **`system-design §7.11` no existe:** la edición por estado está en §7.5 y la caché en §9.
4. **La compra no bloquea eventos empezados o pasados.** `/entradas`, `resolveCheckoutOrder` y la reserva solo exigen `published`. Lo resuelve la tarjeta de la Decisión 17.
5. **Hoy no se puede cancelar un evento con ventas** (system-design §7.5).
6. **Ningún código pasa un evento a `finished`.** Finalizado = `status = 'finished'` o `ends_at <= now()`.
7. **`Order.event` no trae ni dirección ni hora de fin:** las Fases 1B-d y 2 los añaden.
8. **El detalle no se revalida por tiempo:** la Fase 3A añade `revalidate = 900`.
9. **La URL oficial de Production es `https://ticketera.mentec.dev`** (runbook §2 y §5). Hay que comprobar `APP_URL` en Vercel antes de 1A.
10. **`lib/env.ts` no se importa desde un componente cliente:** la clave del mapa llega por props.
11. **`VenueLocationPreview` (organizer) es un casi-duplicado del bloque «Lugar»:** no se migra.
12. **`doors_open_at` ya es nullable** (`0004`). Solo la nombra `events_draft_complete_check`; no hay un CHECK `doors_open_at <= starts_at`. La columna se conserva, porque las migraciones son aditivas.
13. **Ni `users` ni `organizers` tienen imagen,** y `ensureUser` no guarda la foto de Clerk. El logo necesita una columna nueva.
14. **Las reglas de edición de la hora de inicio no son las que se describieron en el pedido.** En el código, `starts_at` se edita en `draft`, en `pending_review` y en `published`, con y sin ventas (con ventas: confirmación, `schedule_changed_at` y aviso). `ends_at` sigue esas reglas.
15. **`lib/db/migrations.test.ts` prohíbe `UPDATE`,** salvo excepciones revisadas en `ALLOWED_VIOLATIONS` (precedente: `0006`).
16. **El PDF convierte la raya «–» en «-»** (`toPdfText`).
17. **El `.ics` no tiene `DTEND`:** con `ends_at` lo tendrá.
18. **No hay perfil de organizador en el panel.** `organizers` es una fila por usuario organizador (`user_id`). Admin y super_admin no tienen fila.
19. **La ruta de subida `/api/event-covers` ya resuelve lo genérico:** variables de Blob, cuerpo, token prefirmado y errores. Solo la autorización (`getCoverSignedToken`) depende del pathname.

## Alcance
Fases y subfases. Cada una se entrega por separado (≤ 5 tareas). Orden:

**1A → 1B-a → (1B-b + 1B-c) → 1B-d → 1B-e → 2 → 3A → 3B → 3C-a → 3C-b**

1B-b y 1B-c van en la misma release. Hay BD solo en 1B-a (`0013`) y en 1B-e (`0014` y `0015`).

| Subfase | Contenido | Tareas | Archivos (código + tests + docs) |
|---|---|---|---|
| 1A | Metadata, Open Graph, X y canonical | 2 | 4 + 1 + 1 |
| 1B-a | `0013`: `ends_at` + CHECK de rango, `organizers.logo_url`; seed y fixtures | 2 | 8 + 4 + 2 |
| 1B-b | Formulario «Hora de fin», reglas, avisos y correo; sin apertura | 5 | 8 + 8 + 1 |
| 1B-c | Vistas del evento con el horario; `EventDetail` sin apertura | 3 | 9 + 6 + 1 |
| 1B-d | Vistas de la orden: Mis entradas, confirmación, PDF y `.ics` | 5 | 8 + 9 + 2 |
| 1B-e | `0014` backfill y `0015` CHECK de completitud; fuera la compatibilidad | 3 | 10 + 5 + 3 |
| 2 | `VenueLocationCard` en la landing, Mis entradas y la confirmación | 4 | 9 + 7 + 3 |
| 3A | Estados, landing minimalista y nuevo hero | 4 | 10 + 4 + 2 |
| 3B | Compartir y acciones del panel | 4 | 6 + 4 + 2 |
| 3C-a | Logo: subida y tarjeta «Perfil del organizador» | 4 | 10 + 5 + 2 |
| 3C-b | Logo en el hero de la landing | 2 | 4 + 3 + 1 |

- **No incluye:**
  - Personalización por organizador más allá del logo; ruta corta; redirección desde `/eventos/<uuid>`; `opengraph-image.tsx`.
  - Texto alternativo editable.
  - Borrar `doors_open_at`.
  - Fecha de fin para eventos de varios días (máximo 24 h).
  - Mapa en el correo de compra y en el PDF (**TK-003**).
  - **Cambios en el checkout, incluido el bloqueo de compra desde el inicio** (tarjeta aparte, Decisión 17). Las Fases 1B-d y 2 solo cambian la vista de lectura `Order`.
  - Cambios en `/eventos` (mantiene los pasados), el inicio, `EventCard` y `HeroCarousel`. El logo solo se muestra en la landing.
  - **Gestión de organizadores del admin (TK-013):** que un admin cambie el logo de otro organizador va allí.
  - Borrar de Blob los logos reemplazados (los huérfanos son pocos; se limpian en otra iteración).
  - JSON-LD, sitemap y `robots.txt`; UTM; redimensionar portadas; migrar `VenueLocationPreview`; un job a `finished`; la confirmación genérica de envíos (TK-011.a).

## Requisitos

### Fase 1A — Vista previa al compartir
1. `app/layout.tsx` exporta `metadataBase: new URL(env.APP_URL)` junto a su `title` y su `description` actuales.
2. `generateMetadata` devuelve `buildEventMetadata(event)`:
   - `title`: `"<título> | Mentec Tickets"`;
   - `description`: `"<recinto>, <ciudad> · <formatLongDayMonth(startsAt)>, <formatTime(startsAt)> h. <primer párrafo>"`, que 1B-c cambia por el horario;
   - `alternates.canonical`: `/eventos/<slug>`;
   - `openGraph`: `type: "website"`, `siteName: "Mentec Tickets"`, `locale: "es_PE"`, `url`, `title`, `description` e `images: [{ url: imageUrl, alt: getCoverAlt(event) }]`;
   - `twitter`: `card: "summary_large_image"`, `title`, `description` e `images: [{ url, alt }]`.
3. `getCoverAlt(event)` devuelve `"<título> en <recinto>, <ciudad>"`. Lo usan el hero y la metadata.
4. La página sigue prerenderizada: la metadata va en el `<head>` inicial.

### Fase 1B — Hora de fin; fuera la apertura de puertas
**1B-a, BD y seed**
5. `lib/db/schema/events.ts`:
   - `endsAt: timestamptz("ends_at")` (nullable);
   - CHECK `events_ends_at_range_check`: `ends_at IS NULL OR (ends_at > starts_at AND ends_at <= starts_at + interval '24 hours')` (Decisión 6, defensa en BD además de zod).
6. `lib/db/schema/identity.ts`: `organizers.logoUrl: text("logo_url")` (nullable).
   - Va en la misma migración `0013` porque es aditiva, nullable y nada la lee hasta 3C.
   - Así se evita una tercera ventana de migración con backup en Production.
7. Seed:
   - `endsAt = startsAt + 3 h` (`SEED_EVENT_DURATION_MS`) en los eventos del mock y en los borradores;
   - `SEED_OWNED_COLUMNS.events` y `EVENT_DATE_COLUMNS` añaden `endsAt` (con ventas no se desplaza);
   - las fixtures (`lib/db/testFixtures.ts`, `eventTestHelpers.ts`) llevan `endsAt`.

**1B-b, formulario y reglas**
8. `OrganizerEventForm`: «Apertura de puertas» se sustituye por «Hora de fin» (`type="time"`, `h-11`, en la fila de la hora de inicio).
   - Ayuda: «Si termina después de medianoche, se guarda para el día siguiente.»
   - Valor del formulario: `endTime: "HH:MM" | ""`; desaparece `doorsOpen`.
9. Validación (`createEventDraftSchema`):
   - `endTime` sin fecha u hora de inicio válidas → «Indica primero la fecha y la hora de inicio»;
   - formato inválido → «Indica una hora de fin válida»;
   - `endTime === time` → «La hora de fin debe ser distinta de la de inicio»;
   - `endTime < time` → termina al día siguiente.
   
   Con un campo de solo hora, la duración queda siempre entre 1 min y 23 h 59 min, así que cumple la Decisión 6. El CHECK del requisito 5 lo garantiza también en BD. En un borrador, la hora de fin es opcional.
10. `organizerEventForm.ts`:
    - `buildEndsAt(date, time, endTime)` (hora de Lima, +1 día si `endTime < time`);
    - `toEventDraftInput` → `endsAt`;
    - la edición carga `endTime`;
    - `EMPTY_EVENT_DRAFT.endTime = ""`;
    - `hasScheduleChanged` compara `date`, `time` y `endTime`.
11. `publishRequirements.ts`: el problema `"endsAt"` («la hora de fin») sustituye a `"doorsOpenAt"`, al enviar a revisión, al aprobar y al editar un publicado.
12. `eventDrafts.service.ts`:
    - `eventColumns` escribe `endsAt`;
    - `lockManagedEvent`, `getEventForEdit` y `assertPublishable` leen `endsAt`;
    - `EditableEvent` y `EventDraftInput` cambian `doorsOpenAt` por `endsAt`.
13. **Compatibilidad hasta 1B-e:** mientras el CHECK de completitud exija `doors_open_at`, el servicio escribe `doorsOpenAt: input.startsAt`, con el comentario `ponytail: compatibilidad con el CHECK hasta 0015 (Fase 1B-e)`. Ninguna vista lo muestra después de 1B-c.
14. **Edición por estado** (Hallazgo 14): `ends_at` se edita donde se edita `starts_at` (`draft`; `pending_review`; `published`, con y sin ventas). En `cancelled` y `finished`, `edit_locked`.
15. **Avisos** (`updatePublishedEvent`, `describeChanges`):
    - `scheduleChanged` = cambia `starts_at` o `ends_at` (la apertura deja de contar);
    - un cambio real de `ends_at` con ventas marca `schedule_changed_at` y encola `schedule` inmediato (Decisión 7), con `endsAt` en `changes`;
    - **completar una `ends_at` que era `NULL` no es un cambio:** no avisa ni marca.
16. **Confirmación:** el diálogo «Cambiar fecha» (cambio de horario con ventas) también salta al cambiar la hora de fin.
17. `EventNotificationEmail`:
    - `FIELD_LABELS.endsAt = "Hora de fin"` (fecha y hora en Lima);
    - se **conserva** la etiqueta `doorsOpenAt` para las notificaciones ya encoladas.
18. `RejectEventDialog`: el placeholder pasa a «Ej. La portada no corresponde al evento y falta la hora de fin.».
19. **Quitar la apertura no avisa a nadie:** es retirar información, no cambiar el horario.

**1B-c, vistas del evento**
20. `eventDetailSchema`:
    - quita `doorsOpenAt`;
    - añade `endsAt: z.iso.datetime({ offset: true }).optional()`;
    - `eventRecords.ts` y `events.service.ts` dejan de leer `doorsOpenAt` y leen `endsAt`;
    - `EVENTS_MOCK` quita `doorsOpenAt`;
    - el seed escribe `doorsOpenAt = startsAt` (compatibilidad hasta 1B-e).
21. `formatTimeRange(startsAt, endsAt?)` (`formatEvent.ts`, exportada en `@/modules/events/format`), en hora de Lima:
    - sin fin: `"21:00 h"`;
    - mismo día: `"21:00 – 23:30 h"`;
    - otro día: `"21:00 – 02:00 h del domingo 15 de noviembre"`.
22. En el hero, la línea de hora usa `formatTimeRange`. En «Información importante», «Apertura de puertas» e «Inicio del show / del partido» se sustituyen por «Horario» (`col-span-2`). La sección entera desaparece en 3A (requisito 49).
23. La descripción de la metadata usa `formatTimeRange`.

**1B-d, vistas de la orden**
24. `Order.event` añade `endsAt?: string`. `orders.service.ts` lo selecciona y `buildOrderView` recibe `Order["event"]`.
25. El horario con `formatTimeRange` aparece en:
    - `TicketCard` (Mis entradas);
    - `ConfirmationTicketCard`;
    - `buildTicketPdfInput` (`timeLabel`; en el PDF, «21:00 - 23:30 h»).
26. `lib/calendar.ts`: `buildIcsEvent` acepta `endsAt?` y escribe `DTEND`. `TicketCard` y `OrderConfirmation` se lo pasan.

**1B-e, contrato de BD**
27. `0014`: backfill de `ends_at` (Decisión 5).
28. `0015`: `events_draft_complete_check` exige `ends_at` en lugar de `doors_open_at`.
29. Se retira la compatibilidad (requisitos 13 y 20): el servicio, el seed y las fixtures dejan de escribir `doorsOpenAt`. La columna queda sin uso (`erd.md`: obsoleta).

### Fase 2 — Mapa para asistentes
30. `VenueLocationCard`:
    - nuevo, en `modules/events/components/`, expuesto en `@/modules/events/map`;
    - es el bloque «Lugar» actual: `VenueMap`, dirección y «Cómo llegar»;
    - props `{ venue, address, city, embedKey?, className? }`;
    - sin `"use client"` y sin `lib/env`.
31. `EventDetailInfo` lo usa con `publicEnv.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`.
32. `Order.event` añade `address: string` (`venues.address`).
33. `TicketCard` (solo en «Próximas»): bloque `print:hidden` con un h3 «Lugar» y `VenueLocationCard`. `mapsEmbedKey` llega desde la página.
34. Confirmación: sección `print:hidden` con un h2 «Lugar del evento», entre las acciones y «Qué sigue».

### Fase 3A — Estados, landing minimalista y nuevo hero
35. `getEventLandingBySlug(slug)` (React `cache()`):
    - devuelve `published`, `cancelled` y `finished`, con `lifecycle`;
    - `draft`, `pending_review` o inexistente → `null` (404);
    - `getEventBySlug`, `getEvents`, `getUpcomingEvents` y `getFeaturedEvents` no cambian.
36. `getLandingState(event, now)`, por prioridad:

    | Estado | Condición |
    |---|---|
    | `cancelled` | `lifecycle = "cancelled"` |
    | `finished` | `lifecycle = "finished"` o `(endsAt ?? startsAt) <= now` |
    | `in-progress` | `startsAt <= now < endsAt` |
    | `sold-out` | futuro con `status = "sold-out"` |
    | `on-sale` | el resto |

    `endsAt` solo falta en eventos anteriores al backfill de 1B-e.
37. Qué se muestra en cada estado:

    | | on-sale | sold-out | in-progress | finished | cancelled |
    |---|---|---|---|---|---|
    | Hero, Acerca y Lugar | sí | sí | sí | sí | sí |
    | Aviso en el hero (texto, sin CTA de compra) | — | «Entradas agotadas» | «Este evento ya empezó» | «Este evento ya terminó» | «Este evento fue cancelado» |
    | Enlace «Ver más eventos de <categoría>» | — | — | — | sí | sí |
    | Aside de compra (`id="entradas"`) | sí | sí (precios y «Entradas agotadas») | no | no | no |
    | Barra móvil `MobileBuyBar` | sí, con y sin mapa | no | no | no | no |
    | `robots` | — | — | — | `noindex, follow` | `noindex, follow` |

    - Los avisos son texto `font-medium` con un icono `aria-hidden` (`TicketX`, `Clock`, `CalendarX2`, `Ban`).
    - Sin aside, la información ocupa una sola columna `max-w-3xl`.
38. **Hero minimalista** (`EventDetailHeader`), igual en todos los tamaños. Sobre fondo `background`; **desaparece el bloque navy**. De arriba abajo:
    1. **Barra superior única** (sustituye a la miga de pan de `lg` y a la barra móvil): a la izquierda, el enlace «Eventos» con `ArrowLeft` (`h-11`, ghost, a `/eventos`); a la derecha, «Editar evento» (`EventEditLink`, solo para el dueño y los admins), Guardar y Compartir (ghost, `size-11`).
    2. **Portada** a todo el ancho del contenedor: `rounded-3xl overflow-hidden`, `aspect-[16/9] md:aspect-[21/8]` (21:8 es el recorte «Hero escritorio» que ya enseña `CoverImageField`). `EventCoverImage` con `fill`, `object-cover`, `preload` y `sizes="(min-width: 1280px) 1216px, 100vw"`, y `alt` = `getCoverAlt`. Es el mismo archivo sin optimizar: el LCP no pesa más.
    3. Bloque de texto `max-w-3xl`, con `gap-4 md:gap-5` y `pt-6 md:pt-8`:
       - **h1** con el nombre: `text-4xl md:text-5xl font-extrabold tracking-tight text-balance wrap-break-word`;
       - **organizador**: `flex items-center gap-3`, con avatar circular de 40 px (`UserAvatar size="lg"`: logo en 3C-b o iniciales del nombre legal, decorativo, sin `alt` propio) y el nombre en `font-semibold`, precedido de un `sr-only` «Organiza: »;
       - **datos**: `ul` en `text-muted-foreground` con iconos `size-4 aria-hidden`: fecha (`CalendarDays`, `formatLongDayMonth`), horario (`Clock`, `formatTimeRange`), recinto (`MapPin`, «recinto, ciudad») y edad mínima (`Users`, «Todo público» o «+18»);
       - «Fecha actualizada» (si aplica; es información, no decoración);
       - aviso de estado y «Ver más eventos…» (requisito 37).
39. **Minimalista: qué se quita o se simplifica** (Decisión 14):
    - el bloque navy del hero: fondo claro, el color solo en las acciones (MASTER §1 y §2);
    - la badge de categoría del hero (la categoría solo aparece en «Ver más eventos de <categoría>» de los finalizados y cancelados);
    - la miga de pan de `lg` y la barra móvil, sustituidas por una única barra «← Eventos» + acciones;
    - la sección «Información importante» con sus tarjetas de iconos de color: la edad mínima pasa a la lista del hero, el horario ya está en el hero y «Ingreso: Entrada digital con QR» se quita (es genérico);
    - «Organiza: …» de «Acerca del evento» (ya está en el hero);
    - «También te puede interesar» (`RelatedEvents` y `getRelatedEvents` se eliminan).
    
    Se mantienen «Acerca del evento» y «Lugar», con `SectionHeader` y `py-12 md:py-16` entre secciones. El aside de compra y la barra móvil no cambian de diseño (son de otras specs). El header y el footer del sitio se mantienen (el footer lleva el Libro de Reclamaciones).
40. `MobileBuyBar`: props `{ href, priceFrom }`; `href` = `/eventos/<slug>/entradas` con mapa o `#entradas` sin mapa; gratis → «Entrada libre» y «Ver entradas». Solo en `on-sale`.
41. `revalidate = 900` y las invalidaciones de `revalidatePublicEvent`. Un cancelado se renderiza a demanda (ISR).
42. Metadata por estado: en `cancelled` y `finished`, la descripción empieza por «Evento cancelado. » o «Evento finalizado. » y lleva `robots: { index: false, follow: true }` (Decisión 11).

### Fase 3B — Compartir
43. `hooks/useCopyToClipboard.ts`: `{ result: "copied" | "failed" | null; copy(text) }`, que vuelve a `null` a los 2 s y limpia el temporizador al desmontar.
44. `shareUrl = new URL(`/eventos/${slug}`, env.APP_URL).href` (página). En el panel, `window.location.origin`.
45. `ShareEventButton` → `DropdownMenu` (mismo botón `Share2`, «Compartir evento»). Items de `min-h-11`:
    1. «Compartir por WhatsApp»: `wa.me` con `buildShareText` + URL.
    2. «Copiar enlace».
    3. «Descargar QR para afiches»: `buildQrPng` (1024 px, margen 4, corrección M) → `downloadBlob("mentec-<slug>-qr.png")`.
    4. «Más opciones…»: solo con `navigator.share`.
    - Región `role="status"` para los avisos.
46. `EventRowActions`, solo en `published`: «Ver landing» (pestaña nueva) y «Copiar enlace». En la tabla son iconos de 44 px y en la tarjeta, botones con texto.

### Fase 3C — Logo del organizador
**3C-a, subida y «Perfil del organizador»**
47. **Pathname** `organizers/<userId>/<uuid>.<ext>` (`modules/organizer/utils/logoPathname.ts`: `buildLogoPathname` / `parseLogoPathname`):
    - mismos tipos y peso máximo que las portadas (`COVER_MIME_TO_EXT`, `COVER_MAX_BYTES` = 5 MB);
    - `LOGO_RECOMMENDED = { width: 512, height: 512, minWidth: 256 }` (cuadrado).
48. **Subida por la ruta existente** `/api/event-covers`, parametrizada por pathname (Hallazgo 19). `getCoverSignedToken` despacha los pathnames `organizers/` a `authorizeLogoUpload(user, pathname)`:
    - sin sesión → 401;
    - con rol distinto de `organizer`, sin fila `approved` o con un `userId` del pathname distinto del de la sesión → 403;
    - pathname inválido → 400.
    
    Sin ruta nueva: una segunda ruta duplicaría la validación de las variables, el cuerpo y el token. El nombre de la ruta queda histórico (renombrarla está fuera de alcance).
49. **Cliente:** `uploadCover` y `routeError` salen de `CoverImageField` a `modules/organizer/utils/blobUpload.ts` (`uploadImageToBlob(file, { pathname, clientPayload })`). Lo usan la portada y el logo, sin duplicar.
50. **Servicio** `organizerProfile.service.ts`:
    - `getOrganizerProfile(actor)` → `{ legalName, logoUrl } | null`, solo para el organizador `approved` de la sesión;
    - `updateOrganizerLogo(actor, logoUrl: string | null)`: solo el organizador `approved` dueño. La URL tiene que ser de nuestro store y estar bajo `organizers/<actor.id>/`; reutiliza `ownStoreHost`, que sale de `eventCoverCleanup.service.ts` a un util exportado. `null` quita el logo.
51. **Acción** `updateOrganizerLogoAction(url: unknown)`: zod; llama al servicio; `revalidatePath("/(site)/eventos/[slug]", "page")` (todas las landings, guía `revalidatePath.md`). Devuelve el resultado discriminado del módulo.
52. **Tarjeta «Perfil del organizador»** (`OrganizerLogoCard`) en `/organizador`, encima del dashboard. Es una sección mínima, sin ruta ni ítem de menú nuevos.
    - Solo para el rol `organizer` `approved` (`!readOnly`). Los organizadores en solo lectura y los admins no la ven (no tienen perfil propio; el logo de otros va en TK-013).
    - Contenido: h2 «Perfil del organizador»; avatar de 80 px (`UserAvatar size="xl"` con el logo o las iniciales) junto al nombre legal; la ayuda «Tu logo aparece junto a tu nombre en la página de tus eventos.»; y `ImageUpload` (`accept`, `maxBytes`, `recommended` del logo, `previewAlt="Vista previa del logo"`).
    - Subir guarda al momento (`onChange` → acción). «Eliminar» → `null`.
    - Anuncia «Logo actualizado» o «Logo eliminado» (`role="status"`) y los errores (`role="alert"`).
53. `UserAvatar` (shared) acepta `src?: string`:
    - con `src`, `AvatarImage src alt=""` y las iniciales como respaldo (Base UI las muestra mientras carga o si falla);
    - sigue siendo decorativo (`aria-hidden`).
54. El logo es de nuestro store (https), así que no hace falta abrir `images.remotePatterns`: `AvatarImage` usa `<img>`.

**3C-b, logo en la landing**
55. `EventDetail` añade `organizerLogoUrl?: string` (`organizers.logo_url`, en el servicio y en `eventRecords`). El hero pasa `src` al avatar del organizador.

### Transversales (todas las fases)
56. Un único `<h1>` por página.
57. Foco visible.
58. Targets ≥ 44 × 44 px.
59. Nada nuevo se anima (`motion-reduce:transition-none`).
60. Ningún estado solo con color.
61. Solo tokens y Creato Display.
62. Sin scroll horizontal a 375 / 768 / 1024 / 1440 px.

## Criterios de aceptación

### Fase 1A
- [ ] Dado `npm run build` + `npm run start` y `curl -s -A "facebookexternalhit/1.1" http://localhost:3000/eventos/<slug>` (con `APP_URL=http://localhost:3000`), entonces el `<head>` tiene:
  - `<link rel="canonical" href="http://localhost:3000/eventos/<slug>"/>`
  - `meta[name=description]` = `"<recinto>, <ciudad> · <día largo>, <HH:MM> h. <primer párrafo>"`
  - `og:title` = `<título>`
  - `og:description` = la misma descripción
  - `og:url` = la URL absoluta
  - `og:site_name` = `Mentec Tickets`
  - `og:locale` = `es_PE`
  - `og:image` = `image_url`
  - `og:image:alt` = `<título> en <recinto>, <ciudad>`
  - `og:type` = `website`
  - `twitter:card` = `summary_large_image`
  - `twitter:title`, `twitter:description`, `twitter:image` y `twitter:image:alt` iguales a su par de Open Graph
  - y ninguna `meta[name=robots]`.
- [ ] Dado el `<title>`, entonces es `<título> | Mentec Tickets`.
- [ ] Dado el Preview, entonces el Sharing Debugger de Facebook y WhatsApp muestran la portada, el título y la descripción (verificación manual).

### Fase 1B-a
- [ ] Dado `drizzle/0013_event_ends_at_organizer_logo.sql`, entonces contiene exactamente las sentencias de «Migraciones y backfill» y `migrations.test.ts` pasa.
- [ ] Dado un evento con `ends_at <= starts_at` o `ends_at > starts_at + 24 h`, entonces la BD lo rechaza. Con `ends_at` `NULL` lo acepta.
- [ ] Dado `npm run db:seed`, entonces cada evento tiene `ends_at = starts_at + 3 h`; con ventas no se desplaza.
- [ ] Dado el despliegue, entonces ninguna pantalla cambia.

### Fase 1B-b
- [ ] El formulario no tiene «Apertura de puertas» y tiene «Hora de fin», con label, ayuda en `aria-describedby` y error con `aria-invalid` + `FieldError`.
- [ ] Inicio 21:00 + fin 23:30 → `ends_at` el mismo día. Fin 02:00 → el día siguiente. Fin = inicio → «La hora de fin debe ser distinta de la de inicio».
- [ ] Un borrador sin hora de fin no se puede enviar a revisión ni aprobar: «Faltan datos para publicar el evento: la hora de fin.».
- [ ] En un publicado con compradores, cambiar solo la hora de fin pide la confirmación «Cambiar fecha». Al confirmar, guarda `schedule_changed_at` y encola `schedule` con `endsAt` (sin `doorsOpenAt`).
- [ ] En un publicado con `ends_at` `NULL`, completarla no pide confirmación, no marca `schedule_changed_at` y no avisa.
- [ ] El correo muestra «Hora de fin»; una notificación antigua con `doorsOpenAt` sigue mostrando «Apertura de puertas».

### Fase 1B-c
- [ ] El hero muestra «21:00 – 23:30 h». «Información importante» tiene «Horario» y no tiene «Apertura de puertas» ni «Inicio del show».
- [ ] Un evento de 22:00 a 02:00 muestra «22:00 – 02:00 h del <día>». Sin `ends_at`, muestra «21:00 h» y la página no falla.
- [ ] La descripción de la metadata usa el horario. El HTML de la landing no contiene «Apertura».

### Fase 1B-d
- [ ] «Mis entradas» y la confirmación muestran «21:00 – 23:30 h». El PDF, «<Fecha> · 21:00 - 23:30 h».
- [ ] El `.ics` tiene `DTEND` = `ends_at` en UTC. Sin `ends_at`, no tiene `DTEND`.

### Fase 1B-e
- [ ] `0014` y `0015` contienen exactamente las sentencias de «Migraciones y backfill». `migrations.test.ts` pasa, con `0014` en `ALLOWED_VIOLATIONS` (`UPDATE`).
- [ ] En `production`, tras migrar:
  - `SELECT count(*) FROM events WHERE status <> 'draft' AND ends_at IS NULL` = 0;
  - 16 migraciones aplicadas;
  - conteos de filas clave iguales;
  - ninguna fila nueva en `event_notifications`.
- [ ] Un no borrador sin `ends_at` se rechaza. `doors_open_at` `NULL` se acepta.
- [ ] Ningún archivo de `modules/`, `lib/` o `app/` escribe ni lee `doorsOpenAt`, salvo la etiqueta del correo y el esquema Drizzle.

### Fase 2
- [ ] «Lugar» del detalle se ve igual y sale de `VenueLocationCard`.
- [ ] «Mis entradas» («Próximas») muestra un h3 «Lugar» con «Ver mapa» (si hay clave) y «Cómo llegar» (`https://www.google.com/maps/dir/?api=1&destination=…`). En «Pasadas», no.
- [ ] La confirmación muestra un h2 «Lugar del evento». Al imprimir, no aparece. Sin clave, no hay «Ver mapa». Sin scroll horizontal en los cuatro anchos.

### Fase 3A
- [ ] A 375, 768, 1024 y 1440 px, el hero muestra, en este orden y sin scroll horizontal:
  1. la barra «← Eventos» con las acciones;
  2. la portada a todo el ancho (16:9 en `< md`, 21:8 desde `md`);
  3. el h1;
  4. la línea del organizador (avatar circular + nombre en la misma línea);
  5. fecha, horario, recinto y edad mínima.
- [ ] Hay un único `<h1>`. El avatar es decorativo (`aria-hidden`, sin `alt` propio) y el lector anuncia «Organiza: <organizador>».
- [ ] La portada conserva `preload` (`<link rel="preload" as="image">`) y `alt` = `<título> en <recinto>, <ciudad>`.
- [ ] No hay bloque navy, badge de categoría, miga de pan, «Información importante», «Organiza:» en «Acerca», «También te puede interesar» ni CTA de compra en el hero.
- [ ] Un evento a la venta tiene aside y, en `< lg`, la barra «Comprar entradas» (sin mapa, `href="#entradas"`). Un gratuito sin mapa muestra «Entrada libre» / «Ver entradas».
- [ ] Un agotado muestra «Entradas agotadas» en el hero y en el aside, y no tiene barra.
- [ ] Un publicado entre el inicio y el fin muestra «Este evento ya empezó», sin aside ni barra.
- [ ] Un publicado con `ends_at` pasado, o `finished`, responde 200 con «Este evento ya terminó» y «Ver más eventos de <categoría>», sin compra y con `<meta name="robots" content="noindex, follow"/>`. Su descripción empieza por «Evento finalizado. ».
- [ ] Un `cancelled` responde 200 con «Este evento fue cancelado», sin compra y con `noindex, follow`. `/`, `/eventos` y `/entradas` no lo muestran ni lo venden.
- [ ] `draft`, `pending_review` o un slug inexistente → 404.
- [ ] Al cancelar desde el panel, la landing muestra el aviso sin esperar a `revalidate`.

### Fase 3B
- [ ] El menú Compartir tiene WhatsApp, «Copiar enlace», «Descargar QR para afiches» y «Más opciones…» (solo con Web Share). Se recorre con las flechas y Escape devuelve el foco.
- [ ] WhatsApp → `https://wa.me/?text=<encodeURIComponent("<título> · <día largo> · <recinto>, <ciudad>\n<APP_URL>/eventos/<slug>")>`. «Copiar enlace» copia `<APP_URL>/eventos/<slug>` sin query ni hash y lo anuncia.
- [ ] El QR descarga `mentec-<slug>-qr.png` (1024 × 1024), que abre la URL.
- [ ] En el panel, «Ver landing» y «Copiar enlace» solo en `published`, de ≥ 44 px y con el título en su nombre accesible.

### Fase 3C-a
- [ ] Un organizador `approved` ve en `/organizador` la tarjeta «Perfil del organizador» con su avatar (iniciales si no hay logo) y su nombre legal. Un organizador en solo lectura y un admin no la ven.
- [ ] Al subir un PNG, JPG o WebP de ≤ 5 MB, se guarda en `organizers.logo_url` como `https://<store>.public.blob.vercel-storage.com/organizers/<userId>/<uuid>.<ext>`, se anuncia «Logo actualizado» y el avatar lo muestra. «Eliminar» lo quita (`NULL`) y vuelven las iniciales.
- [ ] Un archivo de otro tipo o de > 5 MB se rechaza en el cliente con el mensaje de `ImageUpload`.
- [ ] Una petición de token para `organizers/<otro-id>/…`, o de un admin, responde 403. Sin sesión, 401.
- [ ] La acción rechaza una URL que no sea de nuestro store o que no esté bajo `organizers/<id-de-la-sesión>/`.
- [ ] La subida de portadas sigue igual (los tests existentes de `CoverImageField` y de la ruta pasan).

### Fase 3C-b
- [ ] Con logo, el hero de sus eventos muestra el logo circular de 40 px con `alt=""` junto al nombre. Sin logo, las iniciales.
- [ ] Tras cambiar el logo, la landing lo muestra en la siguiente visita (`revalidatePath` de todas las landings).

### Todas las fases
- [ ] `npx vitest run` (avisando antes: trunca Neon `test`, hoy la BD de Preview), `npm run lint` y `npm run build` pasan.

## Diseño técnico

### Rutas (`app/`)
- `app/layout.tsx` (1A): `metadataBase`.
- `app/(site)/eventos/[slug]/page.tsx`:
  - 1A: metadata;
  - 3A: `getEventLandingBySlug`, `getLandingState`, `revalidate = 900`, sin relacionados, aside y barra según el estado;
  - 3B: `shareUrl`.
- `app/(site)/mis-entradas/page.tsx` y `app/(purchase)/checkout/confirmacion/page.tsx` (2): `mapsEmbedKey`.
- `app/(panel)/organizador/page.tsx` (3C-a): carga `getOrganizerProfile` y pinta `OrganizerLogoCard` si no es `readOnly`.
- `app/api/event-covers/route.ts`: sin cambios (el despacho por pathname está en el servicio).
- No hay rutas nuevas.

### Componentes
| Pieza | Tipo | Fase |
|---|---|---|
| `DropdownMenu`, `Button`, `Input`, `Field*`, `Avatar` / `AvatarImage` | shadcn (instalado) | 1B-b, 3B, 3C |
| `UserAvatar` | existente (`components/shared/`); 3C-a añade `src?` | 3A, 3C |
| `ImageUpload` | existente (`components/shared/`), para el logo | 3C-a |
| `EventCoverImage`, `SectionHeader` | existente | — |
| `VenueLocationCard` | **nuevo** (`modules/events/components/`) | 2 |
| `OrganizerLogoCard` | **nuevo** (`modules/organizer/components/`): no hay perfil de organizador; es de un solo dominio | 3C-a |
| `EventDetailHeader` | existente; 1A `alt`; 1B-c horario; 3A rediseño minimalista y estados; 3B `shareUrl`; 3C-b logo | varias |
| `EventDetailInfo` | existente; 1B-c «Horario»; 2 `VenueLocationCard`; 3A sin «Información importante» ni «Organiza:» | varias |
| `OrganizerEventForm`, `RejectEventDialog`, `EventNotificationEmail` | existentes | 1B-b |
| `TicketCard`, `MyTickets`, `ConfirmationTicketCard`, `OrderConfirmation` | existentes | 1B-d, 2 |
| `CoverImageField` | existente; usa `uploadImageToBlob` | 3C-a |
| `ShareEventButton`, `EventRowActions`, `MobileBuyBar` | existentes | 3A, 3B |
| `RelatedEvents` | **se elimina** | 3A |

### Services, utils, hooks, schemas
```ts
// events (1A, 1B-c, 3A, 3C-b)
export function getCoverAlt(event: Pick<EventDetail, "title" | "venue" | "city">): string;
export function buildEventMetadata(event: EventDetail, state?: LandingState): Metadata;
export function formatTimeRange(startsAt: string, endsAt?: string): string;
eventDetailSchema = eventSchema.extend({ /* sin doorsOpenAt */ endsAt: iso.optional(), organizerLogoUrl: z.url().optional() });
export const getEventLandingBySlug: (slug: string) => Promise<EventLanding | null>;          // cache(...)
export type LandingState = "on-sale" | "sold-out" | "in-progress" | "finished" | "cancelled";
export function getLandingState(event: Pick<EventLanding, "lifecycle" | "startsAt" | "endsAt" | "status">, now: Date): LandingState;
export function buildShareText(event): string; buildWhatsAppShareUrl(text, url): string; buildQrPng(url): Promise<Blob>; // 3B

// organizer (1B-b, 3C-a)
export function buildEndsAt(date: string, time: string, endTime: string): string | null;
export function buildLogoPathname(userId: string, mime: CoverMime): string;
export function parseLogoPathname(pathname: string): { userId: string; mime: CoverMime } | null;
export async function authorizeLogoUpload(user: CoverUploader | null, pathname: string): Promise<CoverMime>;
export async function getOrganizerProfile(actor: Actor): Promise<{ legalName: string; logoUrl: string | null } | null>;
export async function updateOrganizerLogo(actor: Actor, logoUrl: string | null): Promise<void>;
export async function updateOrganizerLogoAction(url: unknown): Promise<EventDraftActionResult>;
export function uploadImageToBlob(file: File, opts: { pathname: string; clientPayload: string }): Promise<{ url: string }>; // cliente

// shared / lib
export function useCopyToClipboard(resetMs?: number): { result: "copied" | "failed" | null; copy(text: string): Promise<void> }; // hooks/
buildIcsEvent({ title, startsAt, endsAt?, location, description? });                         // lib/calendar.ts
```
- Tipos que cambian:
  - `EventDraftInput` y `EditableEvent`: `doorsOpenAt` → `endsAt`;
  - `PublishIssue`: `"doorsOpenAt"` → `"endsAt"`;
  - `Order.event`: + `endsAt?` (1B-d) y + `address` (2);
  - `buildOrderView(order, event: Order["event"], tickets)`.
- Stores: no hay.

### Contrato de API
```ts
// Formulario del evento (entrada de createEventAction / updateEventAction): sale doorsOpen, entra endTime ("HH:MM" | "")
// EventDetail: sale doorsOpenAt; entran endsAt?: string y organizerLogoUrl?: string
// EventLanding = EventDetail & { lifecycle: "published" | "cancelled" | "finished" }
// Order.event: + endsAt?: string, + address: string
// updateOrganizerLogoAction(url: string | null) → { ok: true } | { ok: false; error: string }
//   url: z.url({ protocol: /^https$/ }) de nuestro store bajo organizers/<id>/, o null
// POST /api/event-covers: mismo contrato de handleUploadPresigned; acepta además pathnames organizers/<userId>/<uuid>.<ext>
//   (clientPayload se ignora en los logos: el dueño sale del pathname y se compara con la sesión; 401 / 403 / 400 / 503 como hoy)
```

### Migraciones y backfill
Patrón **expandir → migrar el código → contraer**, para que el código desplegado nunca viole un CHECK.

1. **`0013_event_ends_at_organizer_logo.sql` (1B-a, generada).** Se cambian `events.ts` e `identity.ts` y se ejecuta `npm run db:generate -- --name event_ends_at_organizer_logo`. Sentencias esperadas (en el orden que emita drizzle-kit):
   ```sql
   ALTER TABLE "events" ADD COLUMN "ends_at" timestamp with time zone;--> statement-breakpoint
   ALTER TABLE "organizers" ADD COLUMN "logo_url" text;--> statement-breakpoint
   ALTER TABLE "events" ADD CONSTRAINT "events_ends_at_range_check" CHECK ("events"."ends_at" IS NULL OR ("events"."ends_at" > "events"."starts_at" AND "events"."ends_at" <= "events"."starts_at" + interval '24 hours'));
   ```
   Es aditiva. El código anterior nunca escribe `ends_at` ni `logo_url`.
2. **`0014_backfill_event_ends_at.sql` (1B-e, migración de datos).** `npm run db:generate -- --custom --name backfill_event_ends_at`, escrita a mano como la `0009`:
   ```sql
   -- Migración de datos (spec events-detail-landing, Fase 1B-e; Decisión 5): hora de fin = inicio + 3 horas.
   -- Idempotente: solo filas sin ends_at y con starts_at. No toca otras columnas.
   UPDATE "events" SET "ends_at" = "starts_at" + interval '3 hours'
   WHERE "ends_at" IS NULL AND "starts_at" IS NOT NULL;
   ```
   - Va como migración de drizzle y no como script suelto: queda registrada, se aplica igual en todos los entornos y corre en su propia transacción.
   - Lleva la excepción `ALLOWED_VIOLATIONS["0014_backfill_event_ends_at.sql"] = ["UPDATE"]` (como `0006`: solo rellena la columna nueva) y se documenta en el runbook §7.
   - Cumple el CHECK de rango.
   - Va en 1B-e para cubrir también los eventos que creó el código anterior entre releases.
3. **`0015_events_complete_check_ends_at.sql` (1B-e, generada), después del backfill:**
   ```sql
   ALTER TABLE "events" DROP CONSTRAINT "events_draft_complete_check";--> statement-breakpoint
   ALTER TABLE "events" ADD CONSTRAINT "events_draft_complete_check" CHECK ("events"."status" = 'draft' OR ("events"."venue_id" IS NOT NULL AND "events"."description" IS NOT NULL AND "events"."image_url" IS NOT NULL AND "events"."starts_at" IS NOT NULL AND "events"."ends_at" IS NOT NULL));
   ```
   - `db:migrate` aplica `0014` y luego `0015`, cada una en su transacción.
   - Si quedara un no borrador sin `ends_at`, `0015` falla entera sin destruir nada.
   - `doors_open_at` no tiene otros CHECK (Hallazgo 12).
4. **Entre releases:**
   - de 1B-b a 1B-d, el código escribe `ends_at` (obligatoria para publicar) y `doors_open_at = starts_at`, así que cumple el CHECK viejo y el nuevo;
   - `0014` y `0015` se aplican cuando ese código ya está en Production;
   - 1B-e retira la compatibilidad.

**Aplicación por entorno.** Runbook §3, §7, §8 y §12. Los comandos de BD fuera de `dev` los ejecuta Ronald.

| Release | Migraciones | `dev` | Neon `test` (BD de Preview hoy) | Preview | `production` |
|---|---|---|---|---|---|
| R1 (1B-a) | `0013` | `db:migrate` → 14 | `npx vitest run` (migra y **trunca**: avisar y restaurar el `super_admin`) o `db:migrate` con la URL en la sesión; ≥ las de prod | `preview/events-detail-landing-1b-a` + commit vacío; validación | backup `backup-pre-0013-…` y conteos → `db:migrate` justo antes del merge → 14, conteos iguales → merge → smoke |
| R2 (1B-b + 1B-c) | — | — | — | validación | merge → smoke |
| R3 (1B-d) | — | — | — | validación | merge → smoke (PDF, `.ics`) |
| R4 (1B-e) | `0014`, `0015` | `db:migrate` → 16 | como en R1 | validación | backup `backup-pre-0014-…` y conteos → `db:migrate` → `status <> 'draft' AND ends_at IS NULL` = 0, 16 migraciones, conteos iguales, `event_notifications` sin filas nuevas → merge → smoke («Noche de Sintetizadores» muestra «inicio – inicio + 3 h») |
| R5… (2, 3A, 3B, 3C-a, 3C-b) | — | — | — | validación | merge → smoke |

- **Rollback:** tras R4 nunca se vuelve a un código anterior a 1B-b, porque ese código no escribe `ends_at` (runbook §11). Todas las demás releases son reversibles sin tocar la BD.
- La autorización «autopilot» de 2026-10-06 no cubre esta spec: cada migración de Production espera la confirmación explícita de Ronald.

## Reutilización
- **shadcn instalados:** `dropdown-menu`, `button`, `input`, `field`, `avatar`. No hay componentes de compartir ni de QR en `@shadcn`. No se instala nada.
- **Del proyecto:**
  - `UserAvatar` + `getInitials`, `ImageUpload`, `EventCoverImage`, `SectionHeader`;
  - `VenueMap` y `venueMap.ts`;
  - `formatLongDayMonth`, `formatTime` y `toLimaDateTime` / `buildStartsAt`;
  - `hasScheduleChanged`, `getPublishIssues`, `describeChanges` y el diálogo «Cambiar fecha»;
  - la ruta `/api/event-covers`, `getCoverSignedToken`, `COVER_MIME_TO_EXT`, `COVER_MAX_BYTES`, `ownStoreHost` y la lógica de subida de `CoverImageField` (extraída);
  - `getPanelContext` (`readOnly`), `downloadBlob`, `qrcode`, `buildIcsEvent`, `buildEventsHref`, `revalidatePublicEvent`, `MobileBuyBar`, `ZonePricesCard`, `TicketSelector`, `EventEditLink`, `cache()`, `inRolledBackTransaction` y `describeWithDb`;
  - los precedentes de migración `0006` y `0009`.
- **Next 16** (`node_modules/next/dist/docs/`): `metadataBase`, `alternates`, `openGraph`, `twitter`, `robots`, `revalidate` y `revalidatePath(path, "page")` con segmentos dinámicos.

## Tests
Vitest + Testing Library, junto a cada archivo. Los de BD usan `describeWithDb` sobre Neon `test` (se trunca). Sin E2E.

- **1A:** `eventMetadata.test.ts` (nuevo): descripción exacta, canonical, `openGraph`, `twitter`, `getCoverAlt` y que no haya `robots`.
- **1B-a:**
  - `constraints.test.ts`: rango de `ends_at` (≤ inicio, > 24 h y `NULL`) y `logo_url` nullable;
  - `buildSeedData.test.ts` y `seed.test.ts`: `endsAt` = inicio + 3 h y no se desplaza con ventas.
- **1B-b:**
  - `organizer.schema.test.ts`: mensajes de `endTime`; 21:00 → 20:59 vale (23 h 59 min);
  - `organizerEventForm.test.ts`: `buildEndsAt` (mismo día, día siguiente, vacío), edición y `hasScheduleChanged`;
  - `publishRequirements.test.ts`;
  - `eventDrafts.service.test.ts` (BD): escritura; aviso `schedule` al cambiar `endsAt` con ventas; completar `NULL` sin aviso; compatibilidad `doors_open_at = starts_at`;
  - `eventModeration.service.test.ts` y `eventDrafts.actions.test.ts` (fixtures);
  - `OrganizerEventForm.test.tsx`: sin apertura; «Hora de fin»; confirmación al cambiarla con ventas;
  - `EventNotificationEmail.test.tsx`.
- **1B-c:**
  - `formatEvent.test.ts`: `formatTimeRange`, incluida la medianoche en Lima;
  - `eventRecords.test.ts` y `events.service.test.ts`;
  - `EventDetailHeader.test.tsx` (horario), `eventMetadata.test.ts` y `checkoutOrder.test.ts` (fixture).
- **1B-d:**
  - `lib/calendar.test.ts` (`DTEND`) y `ticketPdfInput.test.ts`;
  - `orders.service.test.ts` y `orderViews.test.ts`;
  - `TicketCard.test.tsx` y `OrderConfirmation.test.tsx`;
  - fixtures en `MyTickets.test.tsx` y `myOrders.test.ts`.
- **1B-e:**
  - `migrations.test.ts` (excepción de `0014`; `0015`);
  - `constraints.test.ts` (no borrador sin `ends_at`);
  - `eventDrafts.service.test.ts`, `seed.test.ts` y `buildSeedData.test.ts` (sin `doorsOpenAt`).
- **2:**
  - `orders.service.test.ts` (`address`) y `orderViews.test.ts`;
  - `OrderConfirmation.test.tsx` y `TicketCard.test.tsx`;
  - fixtures.
- **3A:**
  - `landingState.test.ts` (nuevo): los cinco estados y sus límites (`startsAt === now` → `in-progress`; `endsAt === now` → `finished`; sin `endsAt`, `finished` desde `startsAt`);
  - `events.service.test.ts` (BD): `getEventLandingBySlug` con `lifecycle`; `null` en `draft`, `pending_review` e inexistente; `getEventBySlug` del cancelado → `null`; se borran los casos de `getRelatedEvents`;
  - `EventDetailHeader.test.tsx`:
    - orden del DOM: barra → portada → h1 → organizador → lista;
    - avatar `aria-hidden` con iniciales; «Organiza: » `sr-only`;
    - un solo h1;
    - sin badge, sin miga y sin CTA;
    - el texto de cada aviso y «Ver más eventos…» en `finished` y `cancelled`;
  - `eventMetadata.test.ts`: prefijos y `robots` solo en `cancelled` y `finished`.
- **3B:**
  - `hooks/useCopyToClipboard.test.ts` y `shareLinks.test.ts` (nuevos);
  - `ShareEventButton.test.tsx` (se reescribe);
  - `EventRowActions.test.tsx` (nuevo).
- **3C-a:**
  - `logoPathname.test.ts` (nuevo): construir y parsear; rechaza otras extensiones y pathnames de `events/`;
  - `eventCoverUpload.service.test.ts`: despacho de `organizers/`: 401, 403 (otro id, admin, no `approved`) y 400;
  - `organizerProfile.service.test.ts` (nuevo, BD): guarda y quita el logo; rechaza una URL ajena o de otro organizador;
  - `organizerLogo.actions.test.ts` (nuevo): llama a `revalidatePath("/(site)/eventos/[slug]", "page")`;
  - `OrganizerLogoCard.test.tsx` (nuevo): subir → acción → «Logo actualizado»; eliminar → `null`; error en `role="alert"`;
  - `CoverImageField.test.tsx` y `app/api/event-covers/route.test.ts` siguen pasando;
  - `UserAvatar.test.tsx` (nuevo): con `src`, `img alt=""` e iniciales de respaldo; sin `src`, iniciales.
- **3C-b:** `eventRecords.test.ts` (`organizerLogoUrl`), `events.service.test.ts` y `EventDetailHeader.test.tsx` (pasa el `src` al avatar).
- **Sin tests:** páginas de `app/`, `VenueLocationCard`, `MobileBuyBar` y tipos.

## Riesgos
1. **Portadas pesadas** (hasta 5 MB y de cualquier dominio): se validan en Preview (Decisión 9).
2. **Compra de eventos empezados o pasados por URL:** el checkout no la bloquea hasta que se implemente la tarjeta de Trello «Bloquear compra desde la hora de inicio» (Decisión 17). Mientras tanto, la landing ya oculta la compra desde el inicio (`in-progress`), con un desfase de hasta 15 min (`revalidate = 900`).
3. **Vitest trunca Neon `test`**, hoy la BD de Preview.
4. **`APP_URL` de Production** (Hallazgo 9).
5. **Backfill con una duración supuesta (+3 h)** en eventos reales, incluido el que tiene un comprador. Corregir la hora de fin de un evento con compradores les envía el aviso. Mitigación: revisar los publicados tras R4 y antes de anunciar la función.
6. **Compatibilidad temporal `doors_open_at = starts_at`** (R2 a R4). R4 debe seguir a R2 en días, no en semanas.
7. **La ruta `/api/event-covers` también sirve logos:** el nombre queda histórico. Renombrarla (p. ej. `/api/uploads`) es otra tarea.
8. **Logos reemplazados no se borran de Blob:** pocos archivos huérfanos.
9. **Tamaño:** varias subfases superan ~15 archivos si se cuentan los tests y las fixtures. Las tareas son ≤ 5 y con archivos disjuntos.
10. **`revalidatePath` de todas las landings al cambiar un logo:** se regeneran a demanda en la siguiente visita. Es aceptable con el catálogo actual.

## Plan de tareas

### Fase 1A — Vista previa al compartir (TK-001.a)
- [x] T1 — `metadataBase` y utils de metadata con tests · archivos: `app/layout.tsx`, `modules/events/utils/eventMetadata.ts`, `modules/events/utils/eventMetadata.test.ts`, `modules/events/index.ts` · depende de: — · secuencial (base)
- [x] T2 — `generateMetadata`, `alt` del hero y diseño · archivos: `app/(site)/eventos/[slug]/page.tsx`, `modules/events/components/EventDetailHeader.tsx`, `design-system/ticketera/pages/event-detail.md` · depende de: T1 · secuencial

### Fase 1B-a — BD y seed (migración `0013`)
- [ ] T1 — Columnas, CHECK y migración · archivos: `lib/db/schema/events.ts`, `lib/db/schema/identity.ts`, `drizzle/0013_event_ends_at_organizer_logo.sql`, `drizzle/meta/0013_snapshot.json`, `drizzle/meta/_journal.json`, `lib/db/constraints.test.ts`, `docs/architecture/erd.md`, `docs/architecture/system-design.md` · depende de: Fase 1A · secuencial (base)
- [ ] T2 — Seed y fixtures con `endsAt` · archivos: `lib/db/seed/buildSeedData.ts`, `lib/db/seed/buildSeedData.test.ts`, `lib/db/seed/seed.ts`, `lib/db/seed/seed.test.ts`, `lib/db/testFixtures.ts`, `modules/organizer/services/eventTestHelpers.ts` · depende de: T1 · secuencial

### Fase 1B-b — Formulario y reglas (misma release que 1B-c)
- [ ] T1 — Requisitos para publicar · archivos: `modules/organizer/utils/publishRequirements.ts`, `modules/organizer/utils/publishRequirements.test.ts` · depende de: Fase 1B-a · secuencial (base)
- [ ] T2 — Schema, tipos y conversión · archivos: `modules/organizer/schemas/organizer.schema.ts`, `modules/organizer/schemas/organizer.schema.test.ts`, `modules/organizer/types/organizer.types.ts`, `modules/organizer/utils/organizerEventForm.ts`, `modules/organizer/utils/organizerEventForm.test.ts` · depende de: T1 · secuencial
- [ ] T3 — Servicio: escritura, edición y avisos · archivos: `modules/organizer/services/eventDrafts.service.ts`, `modules/organizer/services/eventDrafts.service.test.ts`, `modules/organizer/services/eventModeration.service.test.ts`, `modules/organizer/actions/eventDrafts.actions.test.ts` · depende de: T2 · paralelo con T4 y T5
- [ ] T4 — Formulario y diálogo de rechazo · archivos: `modules/organizer/components/OrganizerEventForm.tsx`, `modules/organizer/components/OrganizerEventForm.test.tsx`, `modules/organizer/components/RejectEventDialog.tsx`, `design-system/ticketera/pages/organizer.md` · depende de: T2 · paralelo con T3 y T5
- [ ] T5 — Etiqueta del correo · archivos: `modules/notifications/components/EventNotificationEmail.tsx`, `modules/notifications/components/EventNotificationEmail.test.tsx` · depende de: T1 · paralelo con T3 y T4

### Fase 1B-c — Vistas del evento (misma release que 1B-b)
- [ ] T1 — `EventDetail` sin apertura y con `endsAt` · archivos: `modules/events/schemas/events.schema.ts`, `modules/events/data/events.mock.ts`, `modules/events/utils/eventRecords.ts`, `modules/events/utils/eventRecords.test.ts`, `modules/events/services/events.service.ts`, `modules/events/services/events.service.test.ts`, `modules/checkout/utils/checkoutOrder.test.ts`, `lib/db/seed/buildSeedData.ts` · depende de: Fase 1B-b · secuencial (base)
- [ ] T2 — `formatTimeRange` · archivos: `modules/events/utils/formatEvent.ts`, `modules/events/utils/formatEvent.test.ts`, `modules/events/format.ts` · depende de: — · paralelo con T1
- [ ] T3 — Hero, «Horario», metadata y diseño · archivos: `modules/events/components/EventDetailHeader.tsx`, `modules/events/components/EventDetailHeader.test.tsx`, `modules/events/components/EventDetailInfo.tsx`, `modules/events/utils/eventMetadata.ts`, `modules/events/utils/eventMetadata.test.ts`, `design-system/ticketera/pages/event-detail.md` · depende de: T1, T2 · secuencial

### Fase 1B-d — Vistas de la orden
- [ ] T1 — `endsAt` en `Order` y fixtures · archivos: `modules/checkout/types/checkout.types.ts`, `modules/checkout/services/orders.service.ts`, `modules/checkout/services/orders.service.test.ts`, `modules/checkout/utils/orderViews.ts`, `modules/checkout/utils/orderViews.test.ts`, `modules/tickets/components/MyTickets.test.tsx`, `modules/tickets/utils/myOrders.test.ts` · depende de: Fase 1B-c · secuencial (base)
- [ ] T2 — `DTEND` · archivos: `lib/calendar.ts`, `lib/calendar.test.ts` · depende de: — · paralelo con T1
- [ ] T3 — PDF · archivos: `modules/checkout/utils/ticketPdfInput.ts`, `modules/checkout/utils/ticketPdfInput.test.ts` · depende de: T1 · paralelo con T4 y T5
- [ ] T4 — Mis entradas · archivos: `modules/tickets/components/TicketCard.tsx`, `modules/tickets/components/TicketCard.test.tsx`, `design-system/ticketera/pages/my-tickets.md` · depende de: T1, T2 · paralelo con T3 y T5
- [ ] T5 — Confirmación · archivos: `modules/checkout/components/ConfirmationTicketCard.tsx`, `modules/checkout/components/OrderConfirmation.tsx`, `modules/checkout/components/OrderConfirmation.test.tsx`, `design-system/ticketera/pages/checkout.md` · depende de: T1, T2 · paralelo con T3 y T4

### Fase 1B-e — Contrato de BD (migraciones `0014` y `0015`)
- [ ] T1 — Backfill y CHECK · archivos: `drizzle/0014_backfill_event_ends_at.sql`, `drizzle/0015_events_complete_check_ends_at.sql`, `drizzle/meta/0014_snapshot.json`, `drizzle/meta/0015_snapshot.json`, `drizzle/meta/_journal.json`, `lib/db/schema/events.ts`, `lib/db/migrations.test.ts`, `lib/db/constraints.test.ts` · depende de: Fase 1B-c en Production · secuencial (base)
- [ ] T2 — Retirar la compatibilidad `doors_open_at` · archivos: `modules/organizer/services/eventDrafts.service.ts`, `modules/organizer/services/eventDrafts.service.test.ts`, `lib/db/seed/buildSeedData.ts`, `lib/db/seed/buildSeedData.test.ts`, `lib/db/seed/seed.ts`, `lib/db/seed/seed.test.ts`, `lib/db/testFixtures.ts`, `modules/organizer/services/eventTestHelpers.ts` · depende de: T1 · secuencial
- [ ] T3 — Documentación · archivos: `docs/architecture/erd.md`, `docs/architecture/system-design.md`, `docs/operations/runbook.md` · depende de: T1 · paralelo con T2

### Fase 2 — Mapa para asistentes (TK-002)
- [ ] T1 — `VenueLocationCard` y el detalle · archivos: `modules/events/components/VenueLocationCard.tsx`, `modules/events/map.ts`, `modules/events/components/EventDetailInfo.tsx`, `design-system/ticketera/MASTER.md` · depende de: Fase 1B-e · secuencial (base)
- [ ] T2 — `address` en `Order` y fixtures · archivos: `modules/checkout/types/checkout.types.ts`, `modules/checkout/services/orders.service.ts`, `modules/checkout/services/orders.service.test.ts`, `modules/checkout/utils/orderViews.test.ts`, `modules/checkout/utils/ticketPdfInput.test.ts`, `modules/checkout/components/OrderConfirmation.test.tsx`, `modules/tickets/components/MyTickets.test.tsx`, `modules/tickets/components/TicketCard.test.tsx`, `modules/tickets/utils/myOrders.test.ts` · depende de: — · paralelo con T1
- [ ] T3 — Confirmación · archivos: `modules/checkout/components/OrderConfirmation.tsx`, `modules/checkout/components/OrderConfirmation.test.tsx`, `app/(purchase)/checkout/confirmacion/page.tsx`, `design-system/ticketera/pages/checkout.md` · depende de: T1, T2 · paralelo con T4
- [ ] T4 — Mis entradas · archivos: `modules/tickets/components/MyTickets.tsx`, `modules/tickets/components/TicketCard.tsx`, `modules/tickets/components/TicketCard.test.tsx`, `app/(site)/mis-entradas/page.tsx`, `design-system/ticketera/pages/my-tickets.md` · depende de: T1, T2 · paralelo con T3

### Fase 3A — Estados, landing minimalista y nuevo hero (TK-001.b)
- [ ] T1 — Contrato y servicio de la landing · archivos: `modules/events/schemas/events.schema.ts`, `modules/events/types/events.types.ts`, `modules/events/utils/landingState.ts`, `modules/events/utils/landingState.test.ts`, `modules/events/services/events.service.ts`, `modules/events/services/events.service.test.ts`, `modules/events/index.ts`, `modules/events/components/RelatedEvents.tsx` (se elimina) · depende de: Fase 2 · secuencial (base)
- [ ] T2 — Hero minimalista, organizador, estados y metadata · archivos: `modules/events/components/EventDetailHeader.tsx`, `modules/events/components/EventDetailHeader.test.tsx`, `modules/events/components/EventDetailInfo.tsx`, `modules/events/utils/eventMetadata.ts`, `modules/events/utils/eventMetadata.test.ts` · depende de: T1 · paralelo con T3
- [ ] T3 — Barra de compra móvil · archivos: `modules/seating/components/MobileBuyBar.tsx` · depende de: T1 · paralelo con T2
- [ ] T4 — Página y documentación · archivos: `app/(site)/eventos/[slug]/page.tsx`, `design-system/ticketera/pages/event-detail.md`, `docs/architecture/system-design.md` · depende de: T2, T3 · secuencial

### Fase 3B — Compartir (TK-001.b)
- [ ] T1 — Hook de copia · archivos: `hooks/useCopyToClipboard.ts`, `hooks/useCopyToClipboard.test.ts` · depende de: Fase 3A · secuencial (base)
- [ ] T2 — Enlaces y QR · archivos: `modules/events/utils/shareLinks.ts`, `modules/events/utils/shareLinks.test.ts` · depende de: T1 · paralelo con T4
- [ ] T3 — Menú Compartir · archivos: `modules/events/components/ShareEventButton.tsx`, `modules/events/components/ShareEventButton.test.tsx`, `modules/events/components/EventDetailHeader.tsx`, `app/(site)/eventos/[slug]/page.tsx`, `design-system/ticketera/pages/event-detail.md` · depende de: T1, T2 · secuencial
- [ ] T4 — Acciones del panel · archivos: `modules/organizer/components/EventRowActions.tsx`, `modules/organizer/components/EventRowActions.test.tsx`, `design-system/ticketera/pages/organizer.md` · depende de: T1 · paralelo con T2

### Fase 3C-a — Logo: subida y «Perfil del organizador»
- [ ] T1 — `UserAvatar` con imagen (shared) · archivos: `components/shared/UserAvatar.tsx`, `components/shared/UserAvatar.test.tsx`, `design-system/ticketera/MASTER.md` («Avatar de usuario») · depende de: Fase 1B-a · secuencial (base)
- [ ] T2 — Pathname, autorización y despacho en la ruta · archivos: `modules/organizer/utils/logoPathname.ts`, `modules/organizer/utils/logoPathname.test.ts`, `modules/organizer/services/eventCoverUpload.service.ts`, `modules/organizer/services/eventCoverUpload.service.test.ts` · depende de: T1 · paralelo con T3
- [ ] T3 — Servicio y acción del perfil · archivos: `modules/organizer/services/organizerProfile.service.ts`, `modules/organizer/services/organizerProfile.service.test.ts`, `modules/organizer/services/eventCoverCleanup.service.ts` (exporta `ownStoreHost`), `modules/organizer/actions/organizerLogo.actions.ts`, `modules/organizer/actions/organizerLogo.actions.test.ts`, `modules/organizer/server.ts` · depende de: T1 · paralelo con T2
- [ ] T4 — Subida en el cliente y tarjeta en `/organizador` · archivos: `modules/organizer/utils/blobUpload.ts`, `modules/organizer/components/CoverImageField.tsx`, `modules/organizer/components/OrganizerLogoCard.tsx`, `modules/organizer/components/OrganizerLogoCard.test.tsx`, `modules/organizer/index.ts`, `app/(panel)/organizador/page.tsx`, `design-system/ticketera/pages/organizer.md` · depende de: T2, T3 · secuencial

### Fase 3C-b — Logo en la landing
- [ ] T1 — `organizerLogoUrl` en el detalle · archivos: `modules/events/schemas/events.schema.ts`, `modules/events/utils/eventRecords.ts`, `modules/events/utils/eventRecords.test.ts`, `modules/events/services/events.service.ts`, `modules/events/services/events.service.test.ts` · depende de: Fase 3C-a · secuencial (base)
- [ ] T2 — Avatar con logo en el hero · archivos: `modules/events/components/EventDetailHeader.tsx`, `modules/events/components/EventDetailHeader.test.tsx`, `design-system/ticketera/pages/event-detail.md` · depende de: T1 · secuencial

Promoción de cada release: rama de trabajo → `preview/events-detail-landing-<fase>` desde `origin/main` + la fase y un commit vacío de disparo → validación de Ronald → merge squash → smoke → borrar ramas temporales. BD solo en R1 y R4 (ver «Migraciones y backfill»).

## Preguntas abiertas
Ninguna bloqueante. Quedan decididas por defecto, salvo que Ronald diga otra cosa:
1. **Estado `in-progress`:** entre el inicio y el fin, la landing dice «Este evento ya empezó» y no ofrece la compra (coherente con la Decisión 17). Es nuevo frente al pedido; si prefieres vender hasta el fin, se quita ese estado.
2. **Proporción de la portada desde `md`:** 21:8, el recorte «Hero escritorio» que ya enseña la vista previa del organizador. Con 16:9, a 1440 px la portada mediría ~684 px de alto.
3. **Admins y logos:** la tarjeta de perfil es solo del organizador dueño. Que un admin cambie el logo de otro organizador va en «Gestión de organizadores» (TK-013).
