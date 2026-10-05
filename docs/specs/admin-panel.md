# Panel admin + organizador: seguridad, seed limpio, datos reales, usuarios y eventos

- Módulo: panel (con cambios en auth, organizer, events, users y lib/db)
- Estado: borrador

## Objetivo
Convertir `/organizador` (hoy casi todo mock, sin control de rol) en un panel de back-office real y compartido por organizadores y administradores, con:
- un sidebar único por rol;
- un seed limpio sin ventas;
- KPIs y eventos leídos de la BD;
- gestión de usuarios con invitaciones de Clerk que llegan a la app;
- CRUD de eventos con moderación (`draft → pending_review → published`).

Diseños de referencia (artifacts de Linder Hassinger): "Panel · Escritorio/Móvil" (sidebar) y "Usuarios y roles" (tabla, filtros, paginación, diálogos). Se toman estructura, textos y flujo. La identidad visual es la de `design-system/ticketera/MASTER.md` (tokens Mentec, Creato Display), nunca el índigo/Poppins/hex del artifact.

## Alcance
- **Incluye** (una fase por aprobación e implementación):
  - **F1 — Seguridad y shell:**
    - migración `0008_organizer_status`;
    - matriz de permisos, `canManageUser`, `requirePermission`, `requireApprovedOrganizer`;
    - route group `(panel)` con `/organizador/**` y `/admin/usuarios`, y `/admin` protegido;
    - sidebar compartido (rail colapsable, `Sheet` en móvil, breadcrumb, "Próximamente").
  - **F2 — Limpieza + seed limpio:** `db:reset-demo` destructivo y protegido, separado de `db:seed`. El seed deja 2 organizadores reales de prueba, eventos futuros, inventario disponible y ninguna orden.
  - **F3 — Dashboard real:** `listManagedEvents` con alcance por rol, KPIs (ventas brutas MVP), `/organizador/eventos` real, TanStack Query; sin mocks de ventas.
  - **F4 — Gestión de usuarios:** listar, invitar, editar y anonimizar; roles; estado y datos fiscales mínimos del organizador; Clerk (`APP_URL`); `audit_logs` sin PII.
  - **F5a — CRUD de borradores:** crear, editar y eliminar `draft`; organizador obligatorio para admin; recinto existente; ticket types; portada por URL.
  - **F5b — Moderación y publicación:** enviar a revisión, aprobar o rechazar, inventario transaccional, cancelación sin ventas, restricciones con reservas y ventas.
- **No incluye:**
  - reembolso automático por cancelación;
  - payouts;
  - creación avanzada de recintos;
  - editor visual de mapas;
  - check-in;
  - página completa de configuración fiscal/payout del organizador;
  - webhook de Clerk;
  - cambios en Vercel, Neon Production, Stripe o el Clerk Dashboard.

## Decisiones tomadas
(Plan aprobado por el usuario; no se reabre.)
1. **Una sola spec por fases.** Cada fase se implementa y revisa por separado; esta sesión solo ejecuta la fase en curso.
2. **Rutas en español:**
   - Organizador: `/organizador`, `/organizador/eventos`, `/organizador/eventos/nuevo`, `/organizador/eventos/[id]/editar`.
   - Admin: `/admin/usuarios`.
   - Todas bajo el route group `app/(panel)/`; las URLs no cambian.
3. **Ítems del sidebar sin página:** se muestran deshabilitados con la etiqueta "Próximamente". Son Dashboard (admin), Organizadores, Check-in y Pagos, más "Mis eventos" hasta F3. Esto reemplaza la Decisión 2 de `organizer-dashboard.md`.
4. **Estado del organizador** en `organizers.status` (migración 0008), separado del rol.
5. **Portada del evento:** URL `https` guardada en `events.image_url`; no hay almacenamiento de archivos.
6. **Moderación:** se respeta `docs/architecture/system-design.md`. El organizador envía a revisión y el admin aprueba o rechaza.
7. **Diagnóstico Clerk (pedido 4):**
   - La invitación se envió desde el Dashboard o sin `redirectUrl`, por eso cae en el Account Portal (`*.accounts.dev`). `NEXT_PUBLIC_CLERK_SIGN_UP_URL` no afecta a los correos de Clerk.
   - Arreglo inmediato (manual, fuera del código): Clerk Dashboard → Paths → Sign-up → Application domain `/registro`.
   - Arreglo definitivo (F4): invitaciones creadas en el servidor con `redirectUrl: \`${env.APP_URL}/registro\``. `APP_URL` es server-only y obligatoria.
8. **Matriz de permisos** (sección "Autorización"): `can()` es pura y solo mira el rol. El estado del organizador se comprueba aparte, en servicios con acceso a la BD.
9. **Seed:** el borrado destructivo vive solo en `db:reset-demo`, nunca en `db:seed`, `db:migrate`, install ni build. Las variables propias del seed no entran en `lib/env.ts`.
10. **Ingresos = ventas brutas MVP:** órdenes `paid`. No se incluyen `refunded` ni `partially_refunded`; el neto post-reembolso queda fuera.
11. **Después de la primera venta** (o con una orden `pending` vigente) no se cambian precio, zonas, recinto ni fecha; solo título, descripción, portada y edad. Esto reemplaza la regla de precios de `system-design.md`, que se actualiza en F5b.
12. **Cancelar un evento con ventas está bloqueado** ("Cancelación con reembolsos: Próximamente"). Solo el admin cancela un `published` sin ventas.

## Autorización

### Permisos por rol (`can(user, action)`, pura, sin BD)

| Acción | customer | organizer | admin | super_admin |
|---|---|---|---|---|
| `panel:access` | ❌ | ✅ (también pending/suspended) | ✅ | ✅ |
| `events:manageOwn` | ❌ | ✅ | ✅ | ✅ |
| `events:manageAny` | ❌ | ❌ | ✅ | ✅ |
| `events:moderate` | ❌ | ❌ | ✅ | ✅ |
| `users:manage` | ❌ | ❌ | ✅ | ✅ |
| `users:assignAdmin` | ❌ | ❌ | ❌ | ✅ |

- `profile:update` sigue como hoy (todos los roles).
- Sin sesión, o con MFA pendiente cuando se exige, `can` devuelve `false` siempre.

### Estado del organizador (separado del rol)
- `getOrganizerStatus(userId)` devuelve `approved | pending | suspended | null`.
- `requireApprovedOrganizer(userId)` lanza `OrganizerNotApprovedError` si el estado no es `approved`. Se exige en **toda mutación de eventos** hecha por un organizador (F5a/F5b).
- Con `pending` o `suspended`, el organizador entra al panel y lo ve en solo lectura:
  - aviso en el layout;
  - "Crear evento" deshabilitado con el motivo;
  - `/organizador/eventos/nuevo` redirige a `/organizador`.

### Reglas sobre el usuario objetivo (`canManageUser(actor, target)`, pura)
- Nadie se edita ni se elimina a sí mismo.
- **admin:** gestiona `customer` y `organizer`. No gestiona `admin` ni `super_admin`. No asigna el rol `admin`.
- **super_admin:** gestiona `customer`, `organizer` y `admin`, y asigna `admin`. No modifica ni elimina a otro `super_admin`.
- `customer` y `organizer` no gestionan usuarios.
- `canAssignRole(actor, role)`: `admin` exige `users:assignAdmin`; `super_admin` no se asigna desde el panel.
- El correo no se edita.

## Requisitos

### F1 — Seguridad y shell
1. **Migración `drizzle/0008_organizer_status.sql`** (generada con `npm run db:generate` y revisada; aditiva, sin `UPDATE`):
   - enum `organizer_status` (`approved`, `pending`, `suspended`);
   - `organizers.status organizer_status NOT NULL`, añadida con `DEFAULT 'approved'`, para que las filas existentes queden `approved` sin `UPDATE`, y luego `SET DEFAULT 'pending'`;
   - `legal_name`, `tax_id_type` y `tax_id` pasan a nullable (`DROP NOT NULL`; `tax_id` sigue `UNIQUE`);
   - CHECK `organizers_approved_complete_check`: `status <> 'approved' OR (legal_name IS NOT NULL AND tax_id_type IS NOT NULL AND tax_id IS NOT NULL)`.
   - Se reflejan en `lib/db/schema/enums.ts` (`organizerStatusEnum`) e `identity.ts`, y en `docs/architecture/erd.md`.
2. **Permisos** en `modules/auth/utils/can.ts`, que se extiende sin duplicar:
   - `Action` suma `panel:access`, `events:manageOwn`, `events:manageAny`, `events:moderate`, `users:manage` y `users:assignAdmin`, definidos por una tabla rol → acciones.
   - `canManageUser(actor, target)` y `canAssignRole(actor, role)`, con `actor`/`target` como `Pick<SessionUser, "id" | "role">`.
3. **`requirePermission(action, { returnTo })`** en `session.service.ts`:
   - llama a `requireUser({ returnTo })`;
   - si `can` es falso, redirige a `/organizador` cuando el usuario tiene `panel:access`, y a `/` en otro caso;
   - devuelve el `SessionUser`.
4. **`getOrganizerStatus(userId, database = db)`** y **`requireApprovedOrganizer(userId, database = db)`** en `modules/auth/services/organizers.service.ts`, con `OrganizerNotApprovedError`.
   - Se exportan por `@/modules/auth/server` junto con `requirePermission`.
   - `can`, `canManageUser` y `canAssignRole` se exportan por una entrada sin `server-only`, que pueda usar el cliente.
5. **Rutas:**
   - `app/organizador/**` se mueve a `app/(panel)/organizador/**` (mismas URLs).
   - Nuevo `app/(panel)/layout.tsx`: exige `panel:access`, lee el estado de organizador si el rol es `organizer` y renderiza el shell.
   - Nuevo `app/(panel)/admin/layout.tsx`: exige `users:manage`.
   - Nuevo `app/(panel)/admin/usuarios/page.tsx`: encabezado "Usuarios y roles" + estado vacío "La gestión de usuarios llega en la siguiente fase" (se reemplaza en F4).
   - `/organizador/eventos/nuevo` redirige a `/organizador` si el usuario es un organizador no aprobado.
   - El botón "Crear evento" de Resumen se oculta para un organizador no aprobado.
6. **`proxy.ts`:** añade `/admin(.*)` a las rutas que exigen sesión.
7. **Shell** en el módulo nuevo `modules/panel/`, que generaliza los `Organizer*` actuales (se mueven, no se duplican):
   - **Componentes:** `PanelBrand` (marca + "Panel"), `PanelNav`, `PanelSidebar`, `PanelMobileBar`, `PanelUserCard`, `PanelBreadcrumb` y `PanelReadOnlyNotice`.
   - **`buildPanelNav(role, organizerStatus)`:** función pura con test. Devuelve las secciones visibles:
     - "Administración" (solo con `users:manage`): Dashboard (Próximamente), Usuarios (`/admin/usuarios`), Organizadores (Próximamente).
     - "Organizador" (con `events:manageOwn`): Resumen (`/organizador`), Mis eventos (Próximamente en F1), Crear evento (deshabilitado con "Solo lectura" si es un organizador no aprobado), Check-in (Próximamente), Pagos (Próximamente).
   - **Desktop (`lg`):** sidebar sticky de 264 px, colapsable a un rail de 76 px con un botón "Contraer menú" / "Expandir menú" (`aria-expanded`). En el rail las etiquetas se ocultan visualmente pero quedan como `aria-label`/`title`.
   - **Móvil (< `lg`):** barra superior con marca y `Sheet` con las mismas secciones.
   - **Breadcrumb** "Sección / Título" sobre el contenido, derivado del pathname con la misma configuración de navegación (shadcn `breadcrumb`).
   - **Ítems deshabilitados:** no son enlaces (`aria-disabled`, no enfocables como destino) y muestran un `Badge` "Próximamente" o "Solo lectura".
   - **Estilos:** activo `bg-accent font-semibold text-accent-foreground` (patrón de `pages/organizer.md`); tokens del MASTER y objetivos táctiles ≥ 44 px.
   - **`PanelUserCard`:** muestra el rol ("Organizador", "Administrador", "Super admin") debajo del nombre.
   - **Archivos:** se eliminan `OrganizerSidebar`, `OrganizerNav`, `OrganizerMobileBar`, `OrganizerBrand` y `OrganizerUserCard` (y su test, que se mueve a `PanelUserCard.test.tsx`), y salen del barrel de organizer.
   - Se actualiza `design-system/ticketera/pages/organizer.md` (sidebar 264/76 px, secciones, "Próximamente").

### F2 — Limpieza + seed limpio
1. **`npm run db:reset-demo`** (`lib/db/seed/resetDemo.ts` + `resetDemo.run.ts`):
   - **Protección:** aborta sin `ALLOW_DEMO_RESET=true` y sin `--confirm=<host de la BD>` igual al host de la URL usada. Ningún otro script lo invoca.
   - **Limpieza:** en una transacción vacía `check_in_scans`, `tickets`, `refunds`, `event_seats`, `orders`, `payouts` y `stripe_events`, y reinicia `order_code_seq`.
   - **Organizadores sintéticos:** reasigna sus eventos a los organizadores de `SEED_ORGANIZER_EMAILS` (mismo reparto que el seed) y borra los `organizers` y `users` `@example.com` creados por el seed.
   - **Conserva** a los usuarios con `clerk_id` y a `SUPER_ADMIN_EMAIL`.
2. **Variables del seed** en `lib/db/seed/env.ts` (no en `lib/env.ts`):
   - `SEED_ORGANIZER_EMAILS` (lista separada por comas, al menos 1 correo) y `SUPER_ADMIN_EMAIL`.
   - `.env.example` documenta `SEED_ORGANIZER_EMAILS=linderhassinger02@gmail.com,linderhassingerwotdev@gmail.com`.
   - **Roles de las cuentas reales:** el super admin es `ronalehm@gmail.com` (`SUPER_ADMIN_EMAIL` en el `.env` local, no se commitea). Los dos correos de Linder son **solo organizadores** y nunca super admin.
   - **Validación:** si `SUPER_ADMIN_EMAIL` aparece en `SEED_ORGANIZER_EMAILS`, el seed aborta sin escribir nada; el seed nunca degrada al super admin a organizador. Lleva test.
3. **`db:seed`** (no destructivo):
   - **Organizadores:** cada correo pasa a `users` con rol `organizer` y `clerk_id NULL` (lo vincula `ensureUser`) + `organizers` `approved` con datos fiscales demo completos.
   - **Reparto:** cada evento elige organizador por un hash determinista de su slug.
   - **Columnas propias:** `organizerId`, `startsAt` y `doorsOpenAt` pasan a `SEED_OWNED_COLUMNS.events`.
   - **Sin órdenes demo:** todo el inventario generado queda `available`.
   - **Fechas:** se calculan con un `now` inyectado y son siempre posteriores a `now`.
4. **Idempotencia:** con el mismo `now`, dos corridas dan el mismo estado. Con un `now` posterior, las fechas se desplazan a propósito para seguir siendo futuras.

### F3 — Dashboard real
1. **`listManagedEvents(actor, { status, q }, database = db)`** en `modules/events/services/`:
   - **Alcance:** con `events:manageAny` ve todo; si no, `organizer_id = actor.id`.
   - **Ingresos:** órdenes `paid`; `sum(subtotal_cents)` para admin y `sum(organizer_amount_cents)` para organizador.
   - **Vendidas:** `sum(ticket_count)` de órdenes `paid`.
   - **Capacidad:** si el evento no es `draft`, `event_seats` no retirados; si es `draft`, la capacidad configurada en secciones/ticket types.
2. **KPIs:** entradas vendidas, ingresos brutos y eventos publicados (`organizerStats.ts` sin aproximación mock).
3. **Server action y hook:**
   - `listManagedEventsAction`: zod + `requirePermission("events:manageOwn")`.
   - `app/providers.tsx` con `QueryClientProvider` en `app/layout.tsx`.
   - Hook `useManagedEvents(filters)`.
4. **Páginas:** `/organizador` y `/organizador/eventos` reales ("Mis eventos" deja de ser Próximamente). Se retiran los mocks de ventas y el store zustand de lectura.

### F4 — Gestión de usuarios (`modules/users/`)
1. **`listUsers({ q, role, organizerStatus, page, pageSize })`:**
   - paginación SQL (`pageSize` 8, 16 o 24) + `count`;
   - sin anonimizados;
   - orden por `created_at` descendente.
2. **`inviteUser(actor, { email, role })`**, sujeto a `canManageUser` y `canAssignRole`:
   1. **Correo nuevo:** crea la fila (`clerk_id NULL`) y llama a `createInvitation({ emailAddress, redirectUrl: \`${APP_URL}/registro\`, publicMetadata: { role } })`.
   2. **Fila precreada sin `clerk_id`:** actualiza el rol si procede y reenvía la invitación.
   3. **Usuario de Clerk activo:** solo cambia el rol y sincroniza `publicMetadata.role`, sin invitación.
   4. **Objetivo protegido:** se rechaza.
3. **`updateUser(actor, id, { firstName, lastName, role, organizer? })`:**
   - Promover a organizador crea `organizers` `pending` con los datos fiscales opcionales.
   - Aprobar exige razón social, tipo y número fiscal (validación zod + CHECK).
   - En el diálogo Editar, el rol `organizer` muestra razón social, tipo de documento fiscal, RUC/DNI y estado.
4. **Quitar el rol organizer (o borrar a un organizador):**
   - Se bloquea si tiene eventos `pending_review` o `published`, o payouts `pending`, con un mensaje de qué resolver.
   - Si no hay bloqueo, el rol pasa a `customer` (o `admin` si lo asigna un super_admin) y `organizers.status` pasa a `suspended`. La fila se conserva.
5. **`deleteUser(actor, id)`**, reintentable:
   1. Valida reglas y bloqueos.
   2. Llama a Clerk `users.deleteUser` (un 404 cuenta como éxito).
   3. Anonimiza en la BD: `clerk_id NULL`, `email deleted+<uuid>@anon.invalid`, `first_name 'Usuario'`, `last_name 'Eliminado'`, `phone`, `document_type` y `document_number` a `NULL`, `anonymized_at now()`.
   4. Escribe `audit_logs`.
   - `audit_logs` **no** guarda el `clerk_id`.
6. **`audit_logs`:** `actor_id`, `target_type 'user'`, `target_id` y un payload solo de transiciones: `{ field: "role" | "organizerStatus", from, to }` o `{ action: "invite" | "delete" }`. Sin correos, nombres, teléfonos ni datos fiscales.
7. **UI en `/admin/usuarios`:**
   - **Tabla `UsersTable`:** búsqueda; filtros de rol y de estado de organizador; "Limpiar"; filas 8/16/24; paginación de 5 números; badges de rol y estado; acciones Aprobar/Suspender, Editar y Eliminar, o el motivo del bloqueo ("Tu cuenta", "Cuenta protegida", "Solo el super admin").
   - **Diálogos:** Invitar y Editar (`dialog`), Eliminar (`alert-dialog`, componente nuevo de shadcn); estado vacío (`empty`).
   - **Datos:** hook `useUsers` con TanStack Query.
8. **Variable `APP_URL`:** server-only, URL `http(s)`, en `lib/env.ts` y `.env.example`.

### F5a — CRUD de borradores
1. **Server actions** `createEvent`, `updateEvent` y `deleteEvent` (este último solo `draft`), con zod. `OrganizerEventForm` deja zustand y persiste en la BD.
2. **Dueño del evento:**
   - Un organizador crea con `organizer_id = actor`, tras `requireApprovedOrganizer`.
   - Un admin o super_admin elige obligatoriamente un organizador `approved` en un Select.
3. **Recinto:** Select de recintos `approved` existentes. Los ticket types se definen por sección del recinto (precio y orden). La portada es una URL `https`.
4. **Rutas:** `/organizador/eventos/nuevo` y `/organizador/eventos/[id]/editar`.

### F5b — Moderación, publicación e inventario
1. **Transiciones permitidas:**
   - organizador (dueño y aprobado) o admin: `draft → pending_review`. El admin también puede enviarlo, por ejemplo cuando creó el evento para un organizador (decisión del usuario);
   - admin: `pending_review → published` (aprobar) o `pending_review → draft` con `review_note` (rechazar);
   - admin: `published → cancelled`, solo sin ventas activas (punto 3).
   - `cancelled` es terminal y `finished` lo pone el sistema. Cualquier otra transición se rechaza.
2. **Aprobar** en una sola transacción:
   1. `SELECT … FOR UPDATE` del evento.
   2. Si `status ≠ pending_review`, no hace nada.
   3. Comprueba que no hay inventario activo.
   4. Genera todos los `event_seats` (numerados y generales).
   5. Pone `status = published` y `reviewed_by`/`reviewed_at`.
   6. `COMMIT`.
   - Un segundo clic espera el lock y no genera nada; un fallo hace rollback de todo.
3. **Cambios sensibles** (Decisión 11). **Ventas activas** son las órdenes `paid`, `partially_refunded` (todavía tienen entradas válidas) o `pending` sin vencer (decisión del usuario). Qué se edita según el estado:
   - `draft`: todo.
   - `pending_review`: nada. Si hacen falta cambios, el admin lo rechaza y vuelve a borrador.
   - `published` sin ventas activas: textos, portada, categoría, fecha, y nombre y precio de los tipos de entrada. Recinto, secciones y organizador no se cambian nunca, porque el inventario ya está generado (decisión del usuario).
   - `published` con ventas activas: solo título, descripción, portada y edad mínima.
   - `cancelled` / `finished`: nada.
   - Aprobar, cancelar o editar un publicado invalida la caché de las páginas públicas (`/`, `/eventos` y `/eventos/<slug>`). Se actualiza `system-design.md`.
4. **Requisitos para enviar a revisión y para aprobar:** ambos exigen `starts_at > now()` y los campos que pide `events_draft_complete_check` (recinto, descripción, portada, `starts_at`, `doors_open_at`), además de al menos un tipo de entrada. Si falta algo, el mensaje dice qué.
5. **Orden de los tipos de entrada:** es el de la sección dentro del recinto. El usuario no lo elige.
6. **Portadas en las vistas públicas** (decisión del usuario): toda imagen de portada de evento se renderiza con `next/image` `unoptimized`, en tarjeta, carrusel, detalle, compra, checkout y "Mis entradas". Así se acepta cualquier URL `https` sin abrir `remotePatterns`. Las imágenes estáticas propias del sitio siguen optimizadas.

### Enmiendas a fases ya implementadas (decisiones del usuario; se implementan en F5b)
7. **Capacidad (modifica F3.1):** `draft` y `pending_review` muestran la capacidad configurada en secciones y tipos de entrada. Desde `published`, se cuentan los `event_seats` no retirados.
8. **`db:reset-demo` (modifica F2.1):**
   - El inventario de los eventos que no son del seed se libera en vez de borrarse: `status 'available'`, `order_id` NULL, `held_until` NULL. Así un evento creado en el panel conserva su inventario.
   - El inventario de los eventos del seed se borra y se regenera, como hasta ahora.
   - Se mantiene lo ya implementado y que ahora queda documentado aquí: se vacía también `refund_requests`, por su FK a `orders`, y el reset aborta sin tocar nada si algún `consent` o `complaint` apunta a una orden.
9. **`db:seed` (modifica F2.3 y F2.4):** no desplaza la fecha de un evento demo que tenga órdenes `paid` o `pending` vigentes, igual que la Decisión 11. El informe del seed lista los eventos que conservaron su fecha.

## Criterios de aceptación

### F1
- [x] `0008_organizer_status` existe en `drizzle/` y `_journal.json`; `migrations.test.ts` la acepta como aditiva (sin excepciones nuevas en `ALLOWED_VIOLATIONS`).
- [x] Con la migración aplicada en la BD de test, insertar u actualizar un organizador `approved` sin `legal_name`, `tax_id_type` o `tax_id` falla con 23514. Uno `pending` sin esos datos se inserta. Los organizadores ya existentes quedan `approved`.
- [x] Test tabla de `can`: rol × acción completo según la matriz; sin sesión, `false`.
- [x] Test tabla de `canManageUser` y `canAssignRole`: actor × objetivo según las reglas (incluye "a sí mismo" y "super_admin a super_admin").
- [x] Un `customer` que entra a `/organizador` o a `/admin/usuarios` es redirigido a `/`. Un `organizer` que entra a `/admin/usuarios` es redirigido a `/organizador`. Un `admin` entra a ambos.
- [x] Un organizador `pending` o `suspended` entra a `/organizador`, ve el aviso de solo lectura y "Crear evento" deshabilitado; `/organizador/eventos/nuevo` lo redirige a `/organizador`.
- [x] `requireApprovedOrganizer` lanza para `pending`, `suspended` y para quien no tiene fila de organizador.
- [x] El sidebar muestra "Administración" solo a admin y super_admin. Los ítems sin página aparecen con "Próximamente" y no navegan. Se puede contraer a rail y expandir, y en móvil se abre en un `Sheet`. El breadcrumb muestra la sección y el título de la página.
- [x] `proxy.ts` exige sesión en `/admin(.*)`.
- [x] `npm run lint`, `npx vitest run` y `npm run build` sin errores.

### F2
- [x] `db:reset-demo` aborta sin `ALLOW_DEMO_RESET=true` o sin un `--confirm` correcto, y no lo invoca ningún otro script.
- [x] El seed aborta si `SUPER_ADMIN_EMAIL` está en `SEED_ORGANIZER_EMAILS`.
- [x] Tras reset + seed (BD de test): `orders`, `tickets`, `refunds` y `stripe_events` en 0; 2 organizadores `approved`; todos los eventos con `starts_at > now`; los usuarios con `clerk_id` y el super admin intactos; ningún organizador `@example.com`.
- [x] Con el mismo `now`, dos corridas del seed dan el mismo estado.

### F3
- [x] Un organizador solo ve sus eventos y un admin ve todos.
- [x] Los KPIs cuentan solo órdenes `paid`.
- [x] Un `draft` muestra la capacidad configurada.
- [x] No quedan imports de `organizerEvents.mock.ts` para ventas.

### F4
- [x] Los 4 casos de `inviteUser` cubiertos con Clerk mockeado.
- [x] Reglas de objetivo aplicadas en el servidor.
- [x] Aprobar sin datos fiscales falla.
- [x] Quitar el rol organizer con eventos activos falla.
- [x] `deleteUser` es reintentable tras un fallo de Clerk.
- [x] El payload de `audit_logs` no lleva PII ni `clerk_id`.
- [x] Una invitación manual aterriza en `<APP_URL>/registro`.

### F5a
- [x] Un admin no puede crear un evento sin elegir organizador.
- [x] Un organizador `pending` o `suspended` no puede mutar.
- [x] Borrar un evento que no es `draft` falla.

### F5b
- [ ] Tabla de transiciones cubierta.
- [ ] Dos aprobaciones concurrentes dejan el mismo número de `event_seats`, incluidos los generales.
- [ ] Cancelar con ventas está bloqueado.
- [ ] Los cambios sensibles están bloqueados con órdenes `pending` vigentes.
- [ ] Enviar a revisión y aprobar fallan con fecha pasada o con datos incompletos, y el mensaje dice qué falta.
- [ ] Un evento publicado con portada de un dominio distinto de Unsplash se ve en la tarjeta, el detalle y el checkout.
- [ ] Un evento `pending_review` muestra la capacidad configurada.
- [ ] Tras `db:reset-demo`, un evento que no es del seed conserva su inventario, todo `available`.
- [ ] `db:seed` no cambia la fecha de un evento demo con una orden `paid`.
- [ ] Un evento `pending_review` no se puede editar; en un publicado no se cambian recinto, secciones ni organizador.
- [ ] Una reserva no puede quedar `pending` sobre un evento cancelado (prueba concurrente cancelar/reservar), y una orden de un evento no publicado no se paga.
- [ ] Al aprobar, cancelar o editar un publicado, las páginas públicas muestran el cambio.

## Diseño técnico (F1)
- **`modules/auth`:**
  - `utils/can.ts` (+ test): tabla `ROLE_PERMISSIONS`, `can`, `canManageUser`, `canAssignRole`.
  - `services/session.service.ts` (+ test): `requirePermission`.
  - `services/organizers.service.ts` (+ test de integración): `getOrganizerStatus`, `requireApprovedOrganizer`, `OrganizerNotApprovedError`.
  - `server.ts`: exporta `requirePermission`, `getOrganizerStatus`, `requireApprovedOrganizer`, `OrganizerNotApprovedError` y los tipos `OrganizerStatus` y `Action`.
  - Entrada pública cliente `permissions.ts` que reexporta `can`, `canManageUser` y `canAssignRole`.
- **`modules/panel`:**
  - `components/` con `PanelSidebar`, `PanelNav`, `PanelMobileBar`, `PanelBrand`, `PanelUserCard`, `PanelBreadcrumb` y `PanelReadOnlyNotice`.
  - `utils/panelNav.ts` (+ test): `buildPanelNav` y `findNavItem(pathname)`.
  - `types/panel.types.ts` e `index.ts`.
  - El layout pasa `sections` (serializables: href, label, clave de icono y estado) del servidor al cliente; los iconos se resuelven en el cliente con un mapa clave → componente de `lucide-react`.
- **`app/(panel)`:** `layout.tsx` (shell + `requirePermission("panel:access")`), `organizador/**` (movido), `admin/layout.tsx` y `admin/usuarios/page.tsx`.
- **BD:** `lib/db/schema/{enums,identity}.ts`, `drizzle/0008_organizer_status.sql`, `drizzle/meta/*`, test en `lib/db/constraints.test.ts`.

## Reutilización
- `requireUser`, `isMfaPending` y `useSessionUser` (auth).
- `UserSummary` y `BrandLogo` (`components/shared`).
- shadcn `sheet`, `breadcrumb`, `badge`, `button`, `alert` y `empty` (ya instaladas). En F4 se añade `alert-dialog`.
- `testDb` y `testTransaction` (`rolledBack`) de `lib/db` para los tests de BD.
- Los componentes `Organizer*` del shell se mueven y generalizan; no se duplican.

## Plan de tareas
Coordinación:
- Sin otra spec abierta sobre estos archivos.
- Cada fase termina con `npm run lint`, `npx vitest run` y `npm run build`, y la revisión del `reviewer`.
- Las fases F2 a F5b pueden ajustar su lista de archivos al empezar. Cambiar la spec la devuelve a `borrador` y requiere una nueva aprobación.

### F1 — Seguridad y shell · ~24 archivos (4 generados/movidos)
- [x] T1 — Migración 0008 con su test
  - archivos: `lib/db/schema/enums.ts`, `lib/db/schema/identity.ts`, `drizzle/0008_organizer_status.sql`, `drizzle/meta/0008_snapshot.json`, `drizzle/meta/_journal.json`, `lib/db/constraints.test.ts`, `docs/architecture/erd.md`
  - depende de: —
  - paralelo con T2 y T3
- [x] T2 — Matriz de permisos, `canManageUser`, `canAssignRole`, `requirePermission`, `getOrganizerStatus`/`requireApprovedOrganizer`, entradas públicas, con tests
  - archivos: `modules/auth/utils/can.ts`, `modules/auth/utils/can.test.ts`, `modules/auth/services/session.service.ts`, `modules/auth/services/session.service.test.ts`, `modules/auth/services/organizers.service.ts`, `modules/auth/services/organizers.service.test.ts`, `modules/auth/server.ts`, `modules/auth/permissions.ts`
  - depende de: T1 (columna `status`), solo para el test de integración
  - paralelo con T3
- [x] T3 — Módulo `panel`: `buildPanelNav`/`findNavItem` con test y componentes del shell (movidos desde organizer), con el test de `PanelUserCard`
  - archivos: `modules/panel/utils/panelNav.ts`, `modules/panel/utils/panelNav.test.ts`, `modules/panel/types/panel.types.ts`, `modules/panel/components/{PanelSidebar,PanelNav,PanelMobileBar,PanelBrand,PanelUserCard,PanelUserCard.test,PanelBreadcrumb,PanelReadOnlyNotice}.tsx`, `modules/panel/index.ts`
  - elimina: `modules/organizer/components/{OrganizerSidebar,OrganizerNav,OrganizerMobileBar,OrganizerBrand,OrganizerUserCard,OrganizerUserCard.test}.tsx`
  - depende de: —
  - paralelo con T1 y T2
- [x] T4 — Rutas `(panel)`, protección y doc
  - mover `app/organizador/**` a `app/(panel)/organizador/**`
  - `app/(panel)/layout.tsx`, `app/(panel)/admin/layout.tsx`, `app/(panel)/admin/usuarios/page.tsx`
  - nuevo-evento y Resumen respetan el estado del organizador
  - `proxy.ts`, barrel de organizer, `design-system/ticketera/pages/organizer.md`
  - depende de: T2 y T3
  - secuencial

### F2 — Limpieza + seed limpio
- [x] T1 — `lib/db/seed/env.ts` con test y `.env.example`
- [x] T2 — `buildSeedData.ts`/`seed.ts`: 2 organizadores, reparto por hash, `now` inyectado, sin órdenes demo, `SEED_OWNED_COLUMNS.events`, con tests
- [x] T3 — `resetDemo.ts` + runner + script `db:reset-demo`, con protección y test de integración
- [x] T4 — README: cómo ejecutar reset + seed

### F3 — Dashboard real
- [x] T1 — `listManagedEvents` con test de integración
- [x] T2 — Acción `listManagedEventsAction` + `app/providers.tsx` + `useManagedEvents`, con tests
- [x] T3 — `OrganizerDashboard`, `OrganizerKpis`, `OrganizerEventsTable` y `organizerStats` con datos reales; `/organizador/eventos`
- [x] T4 — Retiro de mocks y del store de lectura; nav "Mis eventos" activa

### F4 — Gestión de usuarios
- [x] T1 — `APP_URL` en `lib/env.ts` (+ test) y `.env.example`; `npx shadcn@latest add alert-dialog`
- [x] T2 — `users.service.ts`: `listUsers`, `inviteUser`, `updateUser` y `deleteUser` + `audit_logs`, con tests (Clerk mockeado)
- [x] T3 — Acciones con zod + hook `useUsers`, con tests
- [x] T4 — `UsersTable`, diálogos Invitar/Editar/Eliminar y `/admin/usuarios`, con tests
- [x] T5 — Correcciones de la revisión de F4 (si las hay)

### F5a — CRUD de borradores
- [x] T1 — Schemas zod del evento (recinto, ticket types por sección, URL de portada) con test
- [x] T2 — Servicio y acciones `createEvent`/`updateEvent`/`deleteEvent` con permisos y dueño, con tests de integración
- [x] T3 — `OrganizerEventForm` contra la BD (Selects de organizador y recinto); rutas nuevo/editar
- [x] T4 — Retiro del store zustand de creación

### F5b — Moderación, publicación e inventario
- [ ] T1 — Reglas de transición (util pura, test tabla) + `submitForReview`, `approveEvent` (transacción con lock e inventario), `rejectEvent` y `cancelEvent`, con tests de integración (incluida la doble aprobación concurrente y los requisitos del punto 4)
- [ ] T2 — Bloqueo de cambios sensibles con órdenes `paid` o `pending` vigentes, con test
- [ ] T3 — UI de moderación (acciones por estado en Mis eventos)
- [ ] T4 — `system-design.md` (regla de precios y transiciones) y portadas `unoptimized` en las vistas públicas
- [ ] T5 — Enmiendas 7–9: capacidad de `pending_review` en `listManagedEvents`, inventario liberado en `db:reset-demo`, fechas fijas con ventas en `db:seed`; con tests

## Preguntas abiertas
Ninguna: el plan quedó aprobado por el usuario antes de redactar la spec.
