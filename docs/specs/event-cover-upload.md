# Portada de evento: subir imagen a Vercel Blob

- Módulo: organizer (también components/shared y app/api)
- Estado: aprobado

## Problema
En Crear/Editar evento (`/organizador/eventos/nuevo` y `/organizador/eventos/[id]/editar`) la portada solo se puede
indicar con una URL `https` (`imageUrl` en `OrganizerEventForm`, guardada en `events.image_url`). El organizador tiene
que subir la imagen a otro sitio antes de crear el evento, y no ve cómo quedará recortada.

## Solución
El organizador podrá elegir entre dos opciones:
- **Subir imagen** (por defecto): arrastrar y soltar o seleccionar un archivo. Ticketera lo valida, lo sube a Vercel
  Blob (store público `ticketera-media`) y pone la URL pública resultante en `imageUrl`.
- **Usar URL**: el campo actual, con las mismas validaciones `https`.

En la BD no cambia nada: `events.image_url` sigue guardando solo una URL. El binario vive en Blob. Landing, detalle y
Hero siguen pintando esa URL con `EventCoverImage`. **No hay migración.**

## Alcance
- Incluye:
  - Dependencia `@vercel/blob` (versión actual `^2.8.0`).
  - Route handler de subida con presigned URLs (`handleUploadPresigned` + `issueSignedToken`), autenticado por OIDC.
  - Componente reutilizable `components/shared/ImageUpload.tsx` (drag & drop, selección, validación, vista previa,
    cambiar, eliminar).
  - Pestañas «Subir imagen» / «Usar URL» en la sección «Imagen de portada» del formulario.
  - Vista previa de los recortes (detalle 16:9, Hero escritorio 21:8, Hero móvil 4:5) con `EventCoverImage`.
  - Borrado *best effort* del blob anterior **después** de guardar el evento con la nueva portada, y del blob de un
    borrador eliminado.
  - Documentación de la configuración en Vercel y en localhost.
- No incluye:
  - Versiones físicas (thumbnail, móvil, Hero), recorte o conversión de formato. Una sola imagen; el encuadre lo
    resuelve `object-fit: cover` centrado (YAGNI).
  - Limpieza programada de huérfanos (ver «Archivos huérfanos»).
  - Cambios en Stripe, checkout, tickets, QR, Clerk, roles/permisos, schema de Neon, moderación, landing o destacados.
  - Avatares u otras imágenes del sitio (el componente queda reutilizable, pero solo se usa aquí).

## Decisiones tomadas
1. **Autenticación de Blob: OIDC, sin `BLOB_READ_WRITE_TOKEN`.** El store `ticketera-media` está conectado a
   `ticketera-app-x6xq` (Production y Preview) con OIDC. El SDK autentica con `BLOB_STORE_ID` + `VERCEL_OIDC_TOKEN`
   (token corto que Vercel rota solo en las Functions). No se crea ningún secreto Blob permanente ni variables
   `NEXT_PUBLIC_BLOB_*`. Fuente: [Server uploads](https://vercel.com/docs/vercel-blob/server-upload) y
   [Client uploads](https://vercel.com/docs/vercel-blob/client-upload).
2. **Subida directa desde el navegador con presigned URLs.** Las Vercel Functions aceptan como máximo 4.5 MB de cuerpo
   ([Server uploads](https://vercel.com/docs/vercel-blob/server-upload)), así que una imagen de 5 MB no puede pasar
   por un route handler ni por una server action (además, `bodySizeLimit` de las server actions es 1 MB por
   defecto). El `handleUpload` clásico **necesita** `BLOB_READ_WRITE_TOKEN` para firmar el token de cliente; su
   alternativa `handleUploadPresigned` **funciona con OIDC**
   ([Client uploads](https://vercel.com/docs/vercel-blob/client-upload),
   [Signed URLs](https://vercel.com/docs/vercel-blob/vercel-signed-urls)). Flujo:
   1. El navegador llama a `uploadPresigned(pathname, file, { access: "public", handleUploadUrl, clientPayload })`
      de `@vercel/blob/client`.
   2. `POST /api/event-covers` ejecuta `handleUploadPresigned`. En `getSignedToken` autentica, autoriza, valida el
      pathname y emite `issueSignedToken({ pathname, operations: ["put"], allowedContentTypes, maximumSizeInBytes,
      validUntil })` (OIDC).
   3. El navegador sube el archivo directamente a Blob con la URL prefirmada. Blob aplica tipo y tamaño en el CDN, sin
      ningún token `Authorization` en el navegador.
   4. El navegador recibe `PutBlobResult.url` y lo pone en `imageUrl`. El evento se guarda con el botón de siempre.
3. **Sin `onUploadCompleted`.** La URL se persiste al guardar el formulario, no desde el callback de Blob (que además no
   llega a localhost). Por eso `BLOB_WEBHOOK_PUBLIC_KEY` **no se usa** en esta versión: solo sirve para verificar ese
   callback. Si T1 confirma que `handleUploadPresigned` la exige igualmente, se valida como opcional en `lib/env.ts` y
   se documenta; no se añade lógica de callback.
4. **`BLOB_STORE_ID` opcional en `lib/env.ts`.** Sin él, la subida responde «La subida de imágenes no está configurada
   en este entorno» y el resto del formulario (incluida «Usar URL») sigue funcionando. La app no deja de arrancar por
   faltar Blob.
5. **Archivos aceptados:** JPG/JPEG (`image/jpeg`), PNG (`image/png`) y WebP (`image/webp`), máximo 5 MB
   (5 × 1024 × 1024 bytes). Cualquier relación de aspecto.
6. **Ancho < 1200 px: advertencia, no bloqueo.** Texto: «La imagen mide {w} px de ancho; se recomienda al menos
   1200 px para que no se vea borrosa». Se lee en el cliente (`createImageBitmap` o `HTMLImageElement.naturalWidth`).
   El servidor no conoce las dimensiones (el archivo no pasa por él), así que no puede bloquear por ancho, y no se
   pretende.
7. **Pathname generado y validado.** El cliente pide `events/<scope>/<uuid>.<ext>`, con `scope` = id del evento en
   editar o `draft` en crear, `uuid` de `crypto.randomUUID()` y `ext` según el MIME (`jpg`, `png`, `webp`). El
   servidor rechaza todo lo que no cumpla `^events/(draft|<uuid>)/<uuid>\.(jpg|png|webp)$`, comprueba que el MIME
   permitido para ese `ext` es el único en `allowedContentTypes`, y firma con `addRandomSuffix: false` y
   `allowOverwrite: false`. Nunca se usa el nombre original del archivo; no hay path traversal ni colisiones.
8. **Autorización en `getSignedToken`** (sin cambiar permisos, reutilizando los existentes):
   - Sesión obligatoria; sin sesión → 401.
   - `roleCan(user.role, "events:manageOwn")`; un `customer` → 403.
   - Organizador no aprobado (`isReadOnlyOrganizer`) → 403, igual que `assertActorCanMutate`.
   - Con `scope` = id de evento: el evento debe existir y ser gestionable por el actor (suyo, o cualquiera con
     `events:manageAny`), en un estado editable (`draft` o `published`). Si no → 403/404.
   - `clientPayload` se valida con zod (`{ eventId: uuid | null }`) y debe coincidir con el `scope` del pathname.
   - En route handlers no se usa `requirePermission` (redirige); se usa la sesión y `roleCan` y se responde con JSON
     `{ error }` y el status adecuado.
9. **Pestañas «Subir imagen» / «Usar URL»** con el `Tabs` de shadcn ya instalado (`components/ui/tabs.tsx`). Por
   defecto «Subir imagen»; en editar se abre en «Usar URL» si la portada actual no es de nuestro store. Solo un campo
   visible a la vez; cambiar de pestaña no borra el valor hasta que se elige otro.
10. **Vista previa con `EventCoverImage`.** Se reutiliza tal cual (`object-cover`, `unoptimized`); no se crea otro
    sistema de visualización. Tres marcos pequeños: «Detalle 16:9», «Hero escritorio 21:8», «Hero móvil 4:5», con la
    nota «Deja lo importante en el centro: cada pantalla la recorta de forma distinta».
11. **Archivos huérfanos (MVP):** ver la sección propia.

## UX
Sección «Imagen de portada»:

```
[ Subir imagen ] [ Usar URL ]

┌──────────────────────────────────────────┐
│        Arrastra una imagen aquí          │
│                   o                      │
│         [ Seleccionar archivo ]          │
│  JPG, PNG o WebP · Máx. 5 MB             │
│  Tamaño recomendado: 1920 × 1080 px (16:9)│
└──────────────────────────────────────────┘
```

Con imagen:

```
┌──────────────── vista previa 16:9 ───────────────┐
└──────────────────────────────────────────────────┘
1920 × 1080 px · 1,8 MB
[ Cambiar imagen ] [ Eliminar ]
Recortes: [16:9] [21:8] [4:5]
```

Estados de `ImageUpload`:

| Estado | Qué se ve |
|---|---|
| vacío | Zona de arrastre con el texto de arriba. |
| drag over | Borde y fondo de acento, texto «Suelta la imagen». |
| validando | «Comprobando la imagen…» (tipo, tamaño, dimensiones). |
| subiendo | Vista previa local, barra o spinner con «Subiendo…»; botones deshabilitados; el botón Guardar del formulario se deshabilita mientras dure. |
| éxito | Vista previa con la URL de Blob, medidas y peso, «Cambiar imagen» y «Eliminar». |
| error | Mensaje en `role="alert"` («Solo JPG, PNG o WebP», «La imagen pesa más de 5 MB», «No se pudo subir la imagen. Inténtalo de nuevo», «No tienes permiso para subir imágenes»…) y se conserva el valor anterior. |
| preview existente | En editar, la portada actual con «Cambiar imagen» y «Eliminar». |
| reemplazo | Igual que subiendo, pero la portada actual sigue en `imageUrl` hasta que la nueva termina de subir. |

- La zona es un `button`/`label` operable con teclado (Enter/Espacio abre el selector), con `aria-describedby` hacia
  los requisitos. Drag & drop es una mejora; el botón siempre funciona.
- Controles ≥ 44 px (`h-11`), foco visible, textos en español, tokens del design system.
- Un segundo archivo durante una subida se ignora (sin doble envío). Si la subida falla, `imageUrl` no cambia: nunca
  queda una URL parcial.
- «Eliminar» vacía `imageUrl` (la validación de «enviar a revisión» ya exige portada; un borrador puede quedar sin ella).

## Arquitectura

```
OrganizerEventForm ──(imageUrl)──► updateEventAction / createEventAction (sin cambios de contrato)
   │
   └─ CoverImageField (Tabs)
        ├─ «Subir imagen» → ImageUpload ──uploadPresigned()──► POST /api/event-covers
        │                                                         └ handleUploadPresigned
        │                                                            └ getSignedToken: sesión + permisos + pathname
        │                                                               └ issueSignedToken (OIDC)
        │                       ◄────────── presigned PUT URL ──────────┘
        │                       ──PUT archivo──► Vercel Blob (ticketera-media, public)
        │                       ◄── PutBlobResult.url
        └─ «Usar URL»   → Input actual (coverImageUrlSchema)
```

Archivos:
- `app/api/event-covers/route.ts` (nuevo): solo `POST`, delega en el servicio.
- `modules/organizer/services/eventCoverUpload.service.ts` (nuevo): `authorizeCoverUpload(user, pathname,
  clientPayload)` y `getCoverSignedToken(...)`.
- `modules/organizer/utils/coverPathname.ts` (nuevo): `buildCoverPathname(scope, mime)`, `parseCoverPathname`,
  `COVER_MIME_TO_EXT`, `COVER_MAX_BYTES`, `COVER_RECOMMENDED`.
- `modules/organizer/services/eventCoverCleanup.service.ts` (nuevo): `deleteOwnCoverBestEffort(url)`; solo borra si la
  URL es del host de nuestro store y el pathname empieza por `events/`.
- `components/shared/ImageUpload.tsx` (nuevo): componente genérico. Recibe `value`, `onChange(url | "")`,
  `upload(file) => Promise<{ url }>`, límites y textos; no conoce Blob (se inyecta `upload`), así se testea sin red.
- `modules/organizer/components/CoverImageField.tsx` (nuevo): pestañas + `ImageUpload` + previews de recorte; llama a
  `uploadPresigned` con el `clientPayload` del evento.
- `modules/organizer/components/OrganizerEventForm.tsx`: sustituye el `Input` de URL por `CoverImageField`.
- `modules/organizer/actions/eventDrafts.actions.ts`: tras `updateEvent`/`deleteEvent` correctos, llama a la limpieza
  *best effort* de la portada anterior.
- `lib/env.ts` y `.env.example`: `BLOB_STORE_ID` opcional (y `BLOB_WEBHOOK_PUBLIC_KEY` solo si T1 confirma que hace
  falta).

## Almacenamiento
- Store `ticketera-media`, **Public** (las portadas se muestran sin autenticación), región `iad1`.
- URLs `https://<id>.public.blob.vercel-storage.com/events/<scope>/<uuid>.<ext>`, que ya pasan `coverImageUrlSchema`
  (https + dominio) y se pintan con `next/image` `unoptimized` sin tocar `remotePatterns`.
- `cacheControlMaxAge` por defecto de Blob; como cada subida tiene pathname nuevo, no hay problema de caché al
  reemplazar.
- La BD guarda solo la URL en `events.image_url` (máx. 2000 caracteres, ya validado).

## Seguridad
- Todo lo sensible ocurre en el servidor (`getSignedToken`): sesión, permiso, estado del organizador, dueño del evento,
  pathname, MIME y tamaño. `accept=""` del input es solo ayuda de UX.
- El token prefirmado se limita a `operations: ["put"]`, a **ese** pathname, al MIME de su extensión, a 5 MB y a
  10 minutos (`validUntil`). Blob lo aplica en el CDN aunque el cliente manipule la petición.
- El `clientSigningToken` nunca se envía al navegador: `handleUploadPresigned` devuelve solo la URL prefirmada.
- No hay `NEXT_PUBLIC_BLOB_*` ni token RW. OIDC lo rota Vercel.
- `del` solo se ejecuta en servidor y solo sobre URLs del host de nuestro store bajo `events/`; una URL externa nunca se
  intenta borrar.
- `proxy.ts` no protege `/api`; la ruta valida la sesión ella misma (401 sin sesión).

## Manejo de errores

| Caso | Respuesta | UI |
|---|---|---|
| Sin sesión | 401 `{ error: "Inicia sesión para subir imágenes" }` | error en `ImageUpload`, `imageUrl` intacto |
| Customer u organizador en solo lectura | 403 | «No tienes permiso para subir imágenes» |
| Evento ajeno, inexistente o no editable | 403/404 | «No puedes cambiar la portada de este evento» |
| Pathname/payload inválido | 400 | «No se pudo subir la imagen» |
| Sin `BLOB_STORE_ID` (p. ej. localhost sin `env pull`) | 503 | «La subida de imágenes no está configurada en este entorno. Usa la pestaña “Usar URL”.» |
| Tipo o tamaño rechazado por el cliente | — | mensaje específico, sin llamar al servidor |
| Blob rechaza la subida o falla la red | — | «No se pudo subir la imagen. Inténtalo de nuevo»; `imageUrl` intacto |
| Falla el guardado del evento tras subir | error actual del formulario | la portada anterior sigue en BD; el blob nuevo queda huérfano (ver abajo) |
| Falla `del` del blob anterior | log `console.error` con contexto, sin afectar al usuario | — |

## Archivos huérfanos
Regla principal: **nunca se borra la portada anterior antes de que el evento esté guardado en la BD con la nueva.**

- **Reemplazo (Blob→Blob o Blob→URL externa/vacío):** `updateEventAction` lee la `imageUrl` anterior en el servicio
  (ya la carga para actualizar), guarda, y **solo si el guardado terminó bien** llama a
  `deleteOwnCoverBestEffort(anterior)` cuando la anterior era de nuestro store y es distinta de la nueva. Si `del`
  falla, se registra y se sigue.
- **Borrador eliminado:** tras `deleteEvent` correcto, el mismo borrado *best effort* de su portada si era nuestra.
- **Subidas no guardadas** (el usuario sube y cancela, cambia dos veces antes de guardar, o falla el guardado): quedan
  huérfanas en `events/<scope>/`. Para el MVP se aceptan: son pocas y pequeñas. Se pueden revisar a mano en Vercel →
  Storage → `ticketera-media`. Una limpieza programada (cron que compare `list({ prefix: "events/" })` con
  `events.image_url`) queda fuera de alcance; se hará si el volumen lo justifica.
- Portadas compartidas por varios eventos: no ocurre (cada subida tiene pathname único); aun así, antes de borrar se
  comprueba que ningún otro evento usa esa URL.

## Criterios de aceptación
- [ ] Dado Crear evento, entonces «Imagen de portada» muestra las pestañas «Subir imagen» (activa) y «Usar URL», y la
  zona dice «JPG, PNG o WebP · Máx. 5 MB» y «Tamaño recomendado: 1920 × 1080 px (16:9)».
- [ ] Arrastrar un JPG, PNG o WebP válido (≤ 5 MB) a la zona lo sube y muestra la vista previa, «{w} × {h} px · {peso}»,
  «Cambiar imagen», «Eliminar» y los tres recortes; `imageUrl` pasa a la URL pública de Blob.
- [ ] «Seleccionar archivo» (también con teclado) hace lo mismo que arrastrar.
- [ ] Un archivo de más de 5 MB o de otro tipo (p. ej. GIF, PDF) se rechaza con el mensaje correspondiente, sin llamar
  al servidor.
- [ ] Una imagen de menos de 1200 px de ancho se sube igualmente y muestra la advertencia.
- [ ] Durante la subida no se puede soltar otro archivo ni guardar el formulario.
- [ ] Si la subida falla, `imageUrl` conserva su valor anterior y se ve el error.
- [ ] «Eliminar» vacía la portada; «Cambiar imagen» permite elegir otra y mantiene la actual hasta que la nueva sube.
- [ ] «Usar URL» sigue aceptando solo URLs `https` válidas, con los mensajes actuales.
- [ ] En editar, se ve la portada actual; si era externa, se abre en «Usar URL»; se puede reemplazar externa→Blob y
  Blob→Blob.
- [ ] Al guardar un reemplazo Blob→Blob, el evento queda con la nueva URL y después se borra la anterior; si el guardado
  falla, la anterior sigue en BD y en Blob.
- [ ] `POST /api/event-covers` sin sesión → 401; con un `customer` o un organizador no aprobado → 403; con un evento
  ajeno → 403; con un pathname fuera del patrón → 400; sin `BLOB_STORE_ID` → 503.
- [ ] El token emitido está limitado a `put`, a ese pathname, al MIME de su extensión, a 5 MB y a 10 minutos.
- [ ] No existe ninguna variable `NEXT_PUBLIC_BLOB_*` ni uso de `BLOB_READ_WRITE_TOKEN`.
- [ ] En Preview, un organizador aprobado sube una portada, guarda y la ve en el detalle y en el Hero.
- [ ] `npm run lint`, `npx vitest run` y `npm run build` pasan.

## Tests
Sin subidas reales: se mockean `@vercel/blob` (`issueSignedToken`, `del`) y `@vercel/blob/client`
(`handleUploadPresigned`, `uploadPresigned`).

- `coverPathname.test.ts`: construye y valida pathnames; rechaza `..`, barras extra, extensiones y scopes inválidos,
  MIME/extensión incoherentes.
- `eventCoverUpload.service.test.ts` (con BD de test, como los demás servicios): JPG, PNG y WebP válidos emiten token con
  el MIME correcto y 5 MB; usuario sin permiso, customer y organizador no aprobado rechazados; evento ajeno, inexistente
  y no editable rechazados; admin puede subir para cualquier evento; `draft` sin evento permitido.
- `app/api/event-covers/route` (test del handler con el servicio mockeado): 401/403/400/503 y el JSON de éxito.
- `ImageUpload.test.tsx`: drag & drop; selección por botón y teclado; preview con medidas y peso; > 5 MB rechazado;
  MIME no permitido rechazado; advertencia < 1200 px sin bloqueo; eliminar; reemplazar; error de `upload` no cambia el
  valor; sin doble envío durante la subida.
- `CoverImageField.test.tsx` / `OrganizerEventForm.test.tsx`: pestañas (por defecto Subir; editar con URL externa abre
  «Usar URL»); URL externa sigue validándose; éxito pone la URL de Blob en el payload de guardado; el botón Guardar se
  deshabilita durante la subida.
- `eventDrafts.actions.test.ts`: reemplazo correcto llama al borrado de la anterior **después** de guardar; guardado
  fallido no borra nada y conserva la portada anterior; URL externa nunca se borra; fallo de `del` no rompe la acción;
  borrar un borrador borra su portada propia.
- `eventCoverCleanup.service.test.ts`: solo borra URLs del store bajo `events/` y no usadas por otro evento.

## Configuración manual
### Vercel (ya hecho por Ronald)
- Store `ticketera-media` creado en `ticketera-app-x6xq`, **Public**, región `iad1`, prefijo `BLOB`.
- Conectado a **Production** y **Preview** con OIDC («All connected projects use OIDC»).
- Variables creadas: `BLOB_STORE_ID` y `BLOB_WEBHOOK_PUBLIC_KEY`. `VERCEL_OIDC_TOKEN` lo inyecta Vercel en runtime.
- **No** se activó «Add a read-write token env var»: correcto, no hace falta.

### Vercel (pendiente)
- Para probar en localhost con `vercel env pull`, la conexión del store debe incluir **Development**: Storage →
  `ticketera-media` → pestaña Projects → menú (⋯) de `ticketera-app-x6xq` → **Update Project Connection** → marcar
  Development ([Client uploads](https://vercel.com/docs/vercel-blob/client-upload)).

### Localhost (lo ejecuta Ronald, nunca Claude)
1. `vercel link` en la raíz del repo y elegir el proyecto **existente** `ticketera-app-x6xq` (nunca crear uno nuevo).
   `.vercel/` ya está en `.gitignore`; no se commitea.
2. `vercel env pull .env.local` trae `BLOB_STORE_ID` y un `VERCEL_OIDC_TOKEN` de desarrollo. No se copian a `.env` ni a
   ningún archivo versionado.
3. El `VERCEL_OIDC_TOKEN` local es de corta duración (del orden de horas): cuando la subida empiece a responder error
   de autenticación, repetir `vercel env pull .env.local`. T1 confirma la duración exacta y la anota aquí.
4. Sin estas variables, la subida responde 503 y la pestaña «Usar URL» sigue funcionando.

### Preview y Production
- Nada más que configurar: el store ya está conectado y las Functions reciben el token OIDC automáticamente.
- Preview usa la BD Neon `test` (que `npx vitest run` vacía) y el mismo store `ticketera-media`: las portadas subidas
  en Preview quedan en el store aunque la BD se vacíe (huérfanas aceptadas).

## Entrega: flujo de promoción y sincronización
Política obligatoria (también para las siguientes specs):

1. Implementación en la rama `claude/event-cover-upload`.
2. Validación local (`npm run dev:webpack` si Turbopack falla en Windows).
3. `npx vitest run` + `npm run lint` + `npm run build`.
4. Migraciones: **esta feature no tiene migraciones de BD.**
5. Rebase sobre `origin/main` actualizado y publicar `preview/event-cover-upload` = `origin/main` + solo esta feature
   (con un commit vacío «chore: trigger Vercel preview» solo en esa rama, porque Vercel no despliega un SHA ya visto en
   `claude/**`).
6. Validación manual de Ronald en el Preview: subir JPG/PNG/WebP, rechazo de > 5 MB, advertencia < 1200 px, reemplazo,
   eliminar, «Usar URL», y portada visible en detalle y Hero.
7. Sin merge a `main` sin la aprobación manual de Ronald.
8. Antes de Production: se declara explícitamente que **no hay cambios de BD**; se verifica en Vercel que
   `BLOB_STORE_ID` está en Production.
9. Merge a `main` solo con el Preview aprobado.
10. Esperar a que el despliegue de Production esté Ready.
11. Smoke test de Production: subir una portada de prueba a un borrador, comprobar que aparece en Vercel → Storage →
    `ticketera-media` bajo `events/`, y eliminar el borrador (su blob se borra).
12. Tras validar Production: borrar `claude/event-cover-upload` y `preview/event-cover-upload`, y sincronizar
    `preview/qa` con `origin/main`. Después, Ronald revoca en Vercel el token Blob antiguo, comprobando antes que
    ninguna variable de Production o Preview lo usa.

Sincronización de ambientes:
- `main` = código liberado en Production. `preview/qa` = exactamente `origin/main`, sin features.
- Un `preview/<feature>` parte siempre de `origin/main` actualizado y contiene solo esa feature. Si Production recibe
  un hotfix, se incorpora a los previews activos antes de seguir probando.
- Neon `test` tiene como mínimo todas las migraciones de Neon `production` (hoy 9 y 9). Nunca se usa Neon `production`
  como BD de Preview.

## Reutilización
- `EventCoverImage` (vista previa y recortes), `Tabs` de `components/ui/tabs.tsx`, `Button`, `Field*`, `Input`,
  `Spinner`/`Progress` de `components/ui`, `coverImageUrlSchema`, `roleCan`, `isReadOnlyOrganizer`, el alcance de
  eventos de `eventDrafts.service.ts` (`manageAny` / `organizerId = actor.id`) y los mensajes de `eventDraftError.ts`.
- Nuevo: `@vercel/blob`, `ImageUpload`, `CoverImageField`, la ruta `/api/event-covers` y los dos servicios.

## Plan de tareas
Coordinación: una sola fase. Sin otra spec abierta sobre estos archivos. Al final: `npx vitest run`, `npm run lint`,
`npm run build` y revisión del `reviewer`.

- [x] T1. Servidor de subida (OIDC).
  - Archivos: `package.json`, `package-lock.json`, `lib/env.ts`, `.env.example`, `app/api/event-covers/route.ts`,
    `app/api/event-covers/route.test.ts`, `modules/organizer/utils/coverPathname.ts` (+ test),
    `modules/organizer/services/eventCoverUpload.service.ts` (+ test).
  - Confirma con el paquete instalado la API de `handleUploadPresigned`/`issueSignedToken`, si exige
    `BLOB_WEBHOOK_PUBLIC_KEY` sin `onUploadCompleted`, y la duración del token OIDC local; anota el resultado en el
    informe.
  - Depende de: —. Paralelo con T2.
- [x] T2. Componente `ImageUpload`.
  - Archivos: `components/shared/ImageUpload.tsx`, `components/shared/ImageUpload.test.tsx`.
  - Depende de: —. Paralelo con T1.
- [x] T3. Pestañas de portada en el formulario.
  - Archivos: `modules/organizer/components/CoverImageField.tsx` (+ test),
    `modules/organizer/components/OrganizerEventForm.tsx`, `modules/organizer/components/OrganizerEventForm.test.tsx`.
  - Depende de: T1 (ruta y `coverPathname`) y T2.
  - Paralelo con T4.
- [x] T4. Limpieza *best effort* tras guardar o borrar.
  - Archivos: `modules/organizer/services/eventCoverCleanup.service.ts` (+ test),
    `modules/organizer/actions/eventDrafts.actions.ts`, `modules/organizer/actions/eventDrafts.actions.test.ts`.
  - Depende de: T1. Paralelo con T3.
- [x] T5. Documentación.
  - Archivos: `design-system/ticketera/pages/organizer.md` (portada con pestañas, estados y recortes),
    `design-system/ticketera/MASTER.md` (fila `ImageUpload` en la tabla de componentes).
  - Depende de: T3.

## Preguntas abiertas
1. ¿Añades **Development** a la conexión del store `ticketera-media` para poder probar la subida en localhost con
   `vercel env pull`? Sin eso, en local solo funciona «Usar URL» y la subida se prueba en el Preview.
