# Edición de eventos: más campos con ventas, edición en revisión y botón en el detalle

- Módulo: organizer (también events, tickets y lib/db)
- Estado: aprobado

## Problema
La edición existe (`/organizador/eventos/[id]/editar`, botón lápiz en `/organizador`, permitido al organizador dueño y a
admin/super_admin), pero es demasiado restrictiva para el uso real:
- Con ventas o reservas activas solo se cambian título, descripción, portada y edad mínima: no la categoría, la fecha u
  hora, ni el nombre o precio de las entradas (`sensitive_locked` en `updatePublishedEvent`).
- Un evento en revisión no se puede tocar; el admin tiene que rechazarlo para que vuelva a borrador.
- Desde la página pública del evento no hay forma rápida de ir a editarlo.

## Solución
1. **Con ventas se pueden cambiar también** la categoría, la fecha y hora (inicio y apertura de puertas) y el nombre y
   precio de cada tipo de entrada. Sigue bloqueada la **estructura** de un evento publicado (recinto, zonas/secciones,
   altas o bajas de tipos de entrada y organizador), porque el inventario de asientos ya está generado.
2. **Cambio de fecha con ventas:** el formulario pide confirmación («Este evento tiene N entradas vendidas. Los
   compradores verán la nueva fecha.») y los compradores ven un aviso «Fecha actualizada» en el detalle del evento y en
   «Mis entradas». Sin correos ni reembolsos en esta spec.
3. **Precio con ventas (enmienda 1):** el cambio solo afecta a ventas nuevas; las entradas ya pagadas conservan su
   `tickets.unit_price_cents`. Como el webhook de Stripe escribe ese precio al confirmar el pago leyendo el precio
   **actual** del tipo de entrada (`modules/checkout/services/webhook.service.ts`), **no se permite cambiar el precio de
   un tipo de entrada mientras tenga reservas `pending` vigentes** (`isActiveSaleOrder` con estado `pending`): el
   servidor responde `price_locked_pending` con «Hay compras en curso para esta entrada; inténtalo en unos minutos» y
   no guarda nada. El nombre sí se puede cambiar. No se toca el checkout ni la BD.
4. **Edición en revisión:** el organizador dueño y los admins pueden editar un evento `pending_review` con las mismas
   reglas que un borrador (aún no tiene inventario). Al guardar **sigue en revisión** y el admin aprueba la versión
   nueva. Se siguen exigiendo los requisitos de envío a revisión (`publishRequirements`) para no dejar en la cola un
   evento incompleto.
5. **Botón «Editar evento» en el detalle público** (`/eventos/[slug]`), visible solo para el organizador dueño y para
   admin/super_admin.

## Alcance
- Incluye: reglas de `updateEvent`/`updatePublishedEvent`, bloqueos del formulario (`OrganizerEventForm`), botón Editar
  para `pending_review` en `EventRowActions`, aviso de fecha actualizada, botón en el detalle público, migración de una
  columna y documentación.
- No incluye: correos a compradores (spec aparte: `docs/specs/event-change-notifications.md`), reembolsos o cambio de entradas por cambio de fecha; cambiar recinto, zonas u
  organizador de un evento publicado; editar eventos `cancelled` o `finished`; el recinto manual
  (`docs/specs/organizer-manual-venue.md`).
- No cambia: quién puede editar (organizador dueño aprobado, admin y super_admin, con `events:manageOwn` /
  `events:manageAny`); el selector de organizador solo lista organizadores registrados y `approved`
  (`listApprovedOrganizers`) y el servidor rechaza cualquier otro (`organizer_not_approved`).

## Decisiones tomadas
1. **Matriz de edición**

   | Estado | Campos editables | Estado tras guardar |
   |---|---|---|
   | `draft` | todos | `draft` |
   | `pending_review` | todos (sin inventario aún); exige requisitos de revisión | `pending_review` |
   | `published` sin ventas | todo salvo estructura (recinto, secciones, altas/bajas de tipos, organizador) | `published` |
   | `published` con ventas activas | igual que sin ventas: título, descripción, portada, edad, **categoría, fecha/hora, nombre y precio de tipos** | `published` |
   | `cancelled`, `finished` | nada (`edit_locked`) | — |

   `sensitive_locked` desaparece; `structure_locked` se mantiene para `published`.
2. **Aviso de fecha:** nueva columna `events.schedule_changed_at timestamptz NULL`. Se pone a `now()` cuando cambia
   `starts_at` o `doors_open_at` de un evento `published` con ventas activas. El detalle muestra «Fecha actualizada el
   {fecha}» y «Mis entradas» marca las entradas de ese evento cuyo pedido es anterior a `schedule_changed_at`. Migración
   `drizzle/00NN_event_schedule_changed.sql` (número siguiente al de la spec de categorías, que añade `0009`).
3. **Confirmación en el formulario:** si el evento está publicado con ventas y cambian fecha u hora, Guardar abre el
   `ConfirmDialog` existente con el número de entradas vendidas (`sold` ya viene en el listado; `getEventForEdit` lo
   expone) antes de llamar a la acción.
4. **Botón en el detalle público sin romper la caché:** la página `/eventos/[slug]` es pública y se revalida con
   `revalidatePublicEvent`. El botón es una isla cliente (`EventEditLink`) que, tras montar, llama a una server action
   `getEventEditHref(eventId)`; la acción comprueba la sesión, el permiso y el dueño (mismo alcance que
   `getEventForEdit`) y devuelve el href o `null`. Así la página sigue siendo estática y solo quien puede editar ve el
   botón.
5. **Moderación:** el admin sigue aprobando o rechazando un evento en revisión como hoy; si el organizador lo editó,
   aprueba la versión guardada. Al aprobar se genera el inventario con las secciones vigentes en ese momento.
6. **Invalidación:** cualquier cambio en un evento publicado sigue llamando a `revalidatePublicEvent(slug)`.

## Criterios de aceptación
- [ ] Un evento publicado con ventas permite cambiar categoría, fecha/hora y nombre/precio de sus tipos de entrada, y
  rechaza cambiar recinto, secciones, altas/bajas de tipos u organizador (`structure_locked`).
- [ ] Al cambiar fecha u hora con ventas, aparece la confirmación con el número de entradas vendidas; al confirmar se
  guarda y `schedule_changed_at` queda informado.
- [ ] El detalle público muestra «Fecha actualizada el …» y «Mis entradas» marca las entradas compradas antes del
  cambio.
- [ ] Un cambio de precio con ventas no altera los pedidos ni las entradas existentes; las ventas nuevas usan el precio
  nuevo.
- [ ] Si el tipo de entrada tiene reservas `pending` vigentes, el cambio de precio se rechaza con `price_locked_pending`
  («Hay compras en curso para esta entrada; inténtalo en unos minutos») y no se guarda nada; cambiar su nombre sí
  funciona.
- [ ] Un evento `pending_review` tiene botón Editar en `/organizador` para su organizador y para admins; al guardar
  sigue en `pending_review`; si falta un requisito de revisión, no se guarda y se explica qué falta.
- [ ] `cancelled` y `finished` siguen sin botón Editar y la acción responde `edit_locked`.
- [ ] En `/eventos/[slug]` el botón «Editar evento» aparece para el organizador dueño y para admin/super_admin, y no
  para otros organizadores, customers ni visitantes; la página sigue siendo estática.
- [ ] El selector de organizador al crear/editar solo lista organizadores registrados y aprobados.
- [ ] `npx vitest run`, `npm run lint` y `npm run build` pasan.

## Tests
- `eventDrafts.service.test.ts`: matriz de la Decisión 1 (cada estado y con/sin ventas); `schedule_changed_at` solo se
  informa con ventas y cambio de fecha; precio nuevo no toca pedidos ni `tickets`; precio con reserva `pending` vigente → `price_locked_pending`, y sin
  ella se guarda;
  `pending_review` sigue en revisión y exige requisitos.
- `eventDrafts.actions.test.ts`: `getEventEditHref` (dueño, admin, otro organizador, customer, sin sesión).
- `OrganizerEventForm.test.tsx`: campos habilitados según la matriz; confirmación al cambiar fecha con ventas.
- `EventRowActions` / `OrganizerEventsList`: Editar visible en `pending_review`.
- `EventEditLink.test.tsx`, y los tests del aviso en el detalle y en `MyTickets`/`TicketCard`.
- Test de la migración: la columna existe y es nullable.

## Entrega: flujo de promoción y sincronización
1. Rama `claude/event-editing` desde `origin/main` (después de mergear la spec de categorías, para numerar la
   migración tras `0009`).
2. Validación local. 3. `npx vitest run` + `npm run lint` + `npm run build`.
4. **Hay migración de esquema** (una columna nullable, sin datos): primero dev, luego Neon `test`.
5. Publicar `preview/event-editing` = `origin/main` + solo esta feature (commit vacío de disparo solo ahí).
6. Validación manual de Ronald en el Preview. 7. Sin merge sin su aprobación.
8. Antes de Production: declarar el cambio de BD (`ALTER TABLE events ADD COLUMN schedule_changed_at timestamptz`),
   branch de backup de Neon `production`, aplicar la migración y verificar el número de migraciones. Sin variables
   nuevas.
9. Merge tras Preview aprobado y migración aplicada. 10. Production Ready. 11. Smoke test: editar un evento de prueba
   y ver el botón en su detalle. 12. Borrar ramas temporales y sincronizar `preview/qa`.

Sincronización: Preview = `origin/main` + esta feature; Neon `test` ≥ migraciones de `production`; nunca `production`
como BD de Preview; hotfixes a los previews activos.

## Reutilización
`updateEvent`/`updatePublishedEvent`, `getEventForEdit`, `lockManagedEvent`, `hasActiveSales`, `publishRequirements`,
`revalidatePublicEvent`, `ConfirmDialog`, `EventRowActions`, `MyTickets`/`TicketCard`, `EventDetailHeader`.
Nuevo: columna `schedule_changed_at`, `EventEditLink`, `getEventEditHref`.

## Plan de tareas
- [x] T1. Reglas de edición en el servidor y migración.
  - Archivos: `drizzle/00NN_*.sql` (+ meta), `lib/db/schema/events.ts`,
    `modules/organizer/services/eventDrafts.service.ts` (+ test), `modules/organizer/utils/eventDraftError.ts`,
    `modules/organizer/actions/eventDrafts.actions.ts` (+ test, incluye `getEventEditHref`).
  - Depende de: —.
- [x] T2. Formulario y listado.
  - Archivos: `modules/organizer/components/OrganizerEventForm.tsx` (+ test), `EventRowActions.tsx`,
    `OrganizerEventsList.test.tsx`, `app/(panel)/organizador/eventos/[id]/editar/page.tsx`.
  - Depende de: T1.
- [x] T3. Aviso y botón públicos.
  - Archivos: `modules/events/components/EventEditLink.tsx` (+ test), `EventDetailHeader.tsx` (+ test),
    `app/(site)/eventos/[slug]/page.tsx`, `modules/tickets/components/TicketCard.tsx` (+ test) y el servicio de
    lectura que alimente `schedule_changed_at`.
  - Depende de: T1. Paralelo con T2.
- [x] T4. Documentación (`design-system/ticketera/pages/organizer.md`, `MASTER.md` si aplica).
  - Depende de: T2 y T3.

## Preguntas abiertas
(ninguna)
