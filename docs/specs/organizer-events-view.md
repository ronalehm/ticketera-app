# Panel organizador: vista «Eventos» unificada, filtros por fecha y acciones compactas

- Módulo: organizer (también events, panel y components/shared)
- Estado: borrador

## Objetivo
Hoy el panel tiene dos páginas para lo mismo:
- «Resumen» (`/organizador`): KPIs y una tabla sin acciones, filtrable solo por estado.
- «Mis eventos» (`/organizador/eventos`): tabla con acciones, estado y búsqueda.

Esto tiene varios problemas:
- «Crear evento» está fuera del listado y además duplicado en el sidebar.
- Las acciones de cada fila (botones `h-11` con texto) se apilan y desbordan su columna.
- No se puede filtrar por fecha.
- El campo de fecha del formulario es el calendario nativo, distinto del resto de la UI.

Esta spec deja una sola página «Eventos» (`/organizador`) con:
- KPIs;
- el listado completo, con filtros de estado, nombre y rango de fechas;
- «Crear evento» dentro del listado;
- acciones compactas.

Fechas: un `DatePicker` compartido basado en Calendar + Popover de shadcn, en los filtros y en Crear/Editar.
Navegación: el sidebar pasa a tener un único ítem «Eventos», activo también en las subrutas.
Solo lectura: Crear y Editar ya no rebotan en silencio a una cuenta en solo lectura.

## Alcance
- Incluye:
  - **Fase 1 (filtros y UI):**
    - Calendar y Popover de shadcn y `components/shared/DatePicker.tsx`.
    - Filtros `from`/`to` en el contrato y en el servicio de `listManagedEvents`.
    - Filtros de estado, búsqueda, desde/hasta y «Limpiar filtros» en `OrganizerEventsList`, con «Crear evento»
      dentro del listado.
    - `DatePicker` en la «Fecha» de Crear/Editar.
    - Acciones compactas en la tabla (lg).
  - **Fase 2 (navegación y consolidación):**
    - `/organizador` unificada (KPIs + listado).
    - `/organizador/eventos` redirige.
    - Enlaces y textos de vuelta apuntan a «Eventos».
    - Sidebar con un solo ítem «Eventos» y matching de subrutas (sidebar y breadcrumb).
    - Solo lectura sin rebote en `/nuevo` y `/[id]/editar`.
    - Actualizar `design-system/ticketera/pages/organizer.md` y `MASTER.md`.
    - Revisión UI de `/organizador/**`.
- No incluye:
  - Cambios en la matriz de permisos (`modules/auth/utils/can.ts`). Ya permite a admin y super_admin crear eventos
    (ver Precondición).
  - Paginación, orden por columnas, exportar ni filtros guardados en la URL.
  - «Datos reales en la landing» y «destacar eventos para el carrusel del Hero»: irán en su propia spec.
    `events.featured` ya existe en `lib/db/schema/events.ts`.
  - Cambiar «Hora de inicio» y «Apertura de puertas», que siguen como `type="time"`.
  - Migraciones de BD.

## Precondición (diagnóstico, no es tarea): el super admin rebota a /organizador
`/organizador/eventos/nuevo` solo redirige a `/organizador` en dos casos:
- `requirePermission("events:manageOwn")` falla. Con `MFA_ENFORCED = false`, eso nunca pasa para admin ni
  super_admin.
- `readOnly`. Solo ocurre con `users.role = 'organizer'` y estado distinto de `approved`.

El rol se lee de la BD (`findUserByClerkId`), no de Clerk: `syncClerkRole` copia BD → Clerk. Así que, si un «super
admin» rebota, lo más probable es que su fila sea `organizer` sin aprobar. Se comprueba así:

```sql
SELECT u.email, u.role, u.clerk_id, o.status AS organizer_status
FROM users u LEFT JOIN organizers o ON o.user_id = u.id
WHERE lower(u.email) = lower('<correo>');
```

Cómo leer el resultado:
- `super_admin / null`: el rol está bien. No se asume que el problema es el seed: se diagnostica el flujo real antes
  de tocar la autorización.
- `organizer / pending` u `organizer / null`: esto explica el rebote. Se arregla con
  `SUPER_ADMIN_EMAIL=<correo> npm run db:seed` (`lib/db/seed/env.ts`), con `SEED_ORGANIZER_EMAILS` bien configurado.
  El seed conserva id, `clerk_id` y perfil, y sube el rol a `super_admin`.

## Decisiones tomadas
1. **Fusión en «Eventos» (decisión del usuario).** Un solo ítem de sidebar y una sola página, `/organizador`.
   - `/organizador/eventos` deja de ser una página y redirige a `/organizador`. Conserva solo un `guardado` válido
     según `savedStatusSchema`.
   - Las rutas `/organizador/eventos/nuevo` y `/organizador/eventos/[id]/editar` no cambian.
2. **Rango desde/hasta (decisión del usuario).**
   - Los límites son días calendario de Lima con offset fijo `-05:00`, porque Perú no tiene horario de verano:
     - `from` → `starts_at >= <from>T00:00:00-05:00`;
     - `to` → `starts_at < <to + 1 día>T00:00:00-05:00`.
   - Con algún límite, los eventos sin fecha quedan fuera.
   - El filtro se aplica en el servidor, igual que estado y búsqueda.
3. **`DatePicker` compartido con shadcn (decisión del usuario).**
   - Calendar + Popover de shadcn (`npx shadcn@latest add calendar popover`). El CLI instala las dependencias que
     pida su versión actual. No se mete a mano un calendario alternativo y el diff de `components/ui` se revisa.
   - El componente vive en `components/shared/` porque lo usan filtros y formulario y es genérico.
   - El contrato es string `"YYYY-MM-DD" | ""`, el mismo formato que ya usan el form y los filtros, sin `Date`
     UTC que desplace el día.
   - Reemplaza todos los `Input type="date"` de `/organizador/**`.
4. **Búsqueda con dos estados.** `searchDraft` es el texto del input, controlado. `filters.q` es lo que se aplica,
   al hacer submit con «Buscar». Se conserva así el comportamiento actual de no pedir al servidor en cada tecla, y
   «Limpiar filtros» puede vaciar también el input.
5. **KPIs independientes de los filtros.** Siempre usan la query con `DEFAULT_MANAGED_EVENTS_FILTERS`, la misma
   caché que `initialEvents`. El listado usa sus propios filtros. Las mutaciones invalidan `managedEventsBaseKey`, así
   que ambos se refrescan.
6. **Acciones compactas solo en la tabla (lg).**
   - `[Editar]` es un botón de icono, y el resto de acciones permitidas van en un menú «Más acciones» (`•••`).
   - En las tarjetas móviles se mantienen los botones con texto, que ya ocupan el ancho completo.
   - Todos los objetivos miden ≥ 44 px (MASTER «Targets táctiles»), así que los ítems del menú llevan `min-h-11`.
7. **Matching de subrutas.** Una sola función, `isPanelNavItemActive(pathname, item)`, la usan `PanelNav` y
   `findNavItem`:
   - «Eventos» queda activo en `/organizador`, `/organizador/eventos` y `/organizador/eventos/*`.
   - Los demás ítems siguen con coincidencia exacta.
   - Así, Crear y Editar siguen con «Eventos» activo y el breadcrumb «Organizador / Eventos».
8. **Solo lectura sin rebote.**
   - `/nuevo` y `/[id]/editar` muestran `EventFormHeader` + `EmptyState` explicativo en lugar de
     `redirect("/organizador")`.
   - No se añade otro `PanelReadOnlyNotice`, porque el layout `app/(panel)/layout.tsx` ya lo muestra.
   - En editar, la comprobación va antes de consultar el evento.
9. **Limpieza (YAGNI).** Al quitar Resumen, Mis eventos y Crear evento del sidebar, dejan de usarse los iconos
   `summary` y `create` (con `LayoutDashboard` y `Plus` en `PanelNav`) y el estado `read-only` (con
   `DISABLED_BADGES["read-only"]`). Se eliminan tras comprobar con grep que nadie más los usa. También se elimina
   `filterManagedEvents` (`utils/organizerStats.ts`).
10. **Commit, push y PR los decide el usuario** (SETUP §3). Cada fase termina en Developer → Reviewer → visto bueno
    del reviewer.

## Requisitos

### Fase 1. Filtros y UI
1. **DatePicker** (`components/shared/DatePicker.tsx`, `"use client"`):
   - Se compone de `Popover` + `Button` trigger (`variant="outline"`, `h-11`, icono `CalendarDays`, texto con la
     fecha formateada en `es-PE`, p. ej. «sáb 5 dic 2026», o el `placeholder`) + `Calendar` (`mode="single"`,
     locale `es`).
   - Props: `value: string` (`"YYYY-MM-DD" | ""`), `onChange(value: string)`, `min?`, `max?` (`YYYY-MM-DD`),
     `disabled?`, `id?`, `placeholder?`, `aria-invalid?`, `aria-describedby?` y `className?` (reenviada).
   - Los días fuera de `[min, max]` se muestran deshabilitados. Elegir un día emite `YYYY-MM-DD` y cierra el popover.
   - Con `disabled` el trigger no abre.
   - El popover usa `collisionPadding` y queda dentro del viewport a 375 px.
2. **Contrato de filtros** (`managedEventsFiltersSchema`):
   - Queda `{ status, q, from, to }`, con `from` y `to` como `z.union([z.literal(""), z.iso.date()]).default("")`.
   - Un `refine` rechaza `from > to` con el mensaje «La fecha Hasta no puede ser anterior a Desde» en
     `path: ["to"]`.
3. **Servicio** (`listManagedEvents`): aplica `from` y `to` según la Decisión 2, combinados con alcance, estado y
   búsqueda.
4. **Listado** (`OrganizerEventsList`):
   - `DEFAULT_MANAGED_EVENTS_FILTERS = { status: "all", q: "", from: "", to: "" }`.
   - Controles, todos `h-11`:
     - Filtro de estado: `NativeSelect`, filtra al cambiar.
     - Buscar: input controlado por `searchDraft` + botón «Buscar», que pasa el texto a `q` al hacer submit.
     - Desde y Hasta: dos `DatePicker` con `Desde.max = to` y `Hasta.min = from`. Filtran al seleccionar.
     - «Limpiar filtros»: solo se ve con algún filtro activo y resetea `status`, `q`, `from`, `to` y `searchDraft`.
   - `isDefault` compara los cuatro campos.
   - Layout sin overflow:
     - < md: columna a todo el ancho, con Desde/Hasta en una grilla de 2 columnas;
     - md: wrap;
     - lg: una fila con la búsqueda flexible.
   - Prop `canCreate`: cabecera interna con «Mis eventos» (h2) y el contador a la izquierda, y `<CreateEventLink />`
     a la derecha. En < md se apila a todo el ancho.
5. **Formulario** (`OrganizerEventForm`):
   - «Fecha» usa `DatePicker` con `min={today}` y `disabled={salesLocked}`. Mantiene el formato `YYYY-MM-DD` y los
     schemas actuales.
   - El error se conecta con `aria-invalid`/`aria-describedby`.
   - «Hora de inicio» y «Apertura de puertas» no cambian.
6. **Acciones** (`EventRowActions`, `OrganizerEventsTable`):
   - `rowActions?: (event, layout: "table" | "card") => ReactNode`.
   - `card`: como hoy.
   - `table`:
     - `[Editar]`: icono `Pencil`, `size-11`, `aria-label="Editar <título>"`. Solo en los estados editables.
     - `[•••]`: botón `size-11` con `aria-label="Más acciones de <título>"` que abre un `DropdownMenu` con las
       acciones permitidas por rol y estado (Eliminar, Enviar a revisión, Aprobar, Rechazar, Cancelar evento).
       Cada ítem lleva `min-h-11`.
     - Si «Cancelar evento» está bloqueado por ventas, va deshabilitado con «Tiene ventas ·
       {CANCEL_WITH_SALES_MESSAGE}» y no se ejecuta.
     - Sin acciones de menú no se muestra `•••`.
     - La celda no hace wrap y la columna tiene ancho fijo.

### Fase 2. Navegación y consolidación
7. **`/organizador`**:
   - Metadata «Eventos | Mentec Tickets».
   - h1 «Eventos» con el subtítulo «Ventas y gestión de todos tus eventos».
   - Sin `CreateEventLink` en el header.
   - Parsea `?guardado` con `savedStatusSchema`.
   - `OrganizerDashboard` muestra los KPIs y debajo `<OrganizerEventsList>` con `role`, `canMutate`,
     `canCreate = !readOnly` y `saved`. Se quitan su toggle y su tabla propios.
8. **`/organizador/eventos`**: `redirect("/organizador")`, o `redirect("/organizador?guardado=<valor>")` si
   `guardado` es válido.
9. **Enlaces y textos**:
   - Apuntan a `/organizador`: `SAVED_HREF`, `SAVED_CHANGES_HREF` y Cancelar en `OrganizerEventForm`, Volver en
     `EventFormHeader` y `actionHref` del `EmptyState` de editar.
   - «Volver a Mis eventos» pasa a «Volver a Eventos», y «En Mis eventos ves su estado actual» a «En Eventos ves su
     estado actual».
10. **Sidebar**:
    - Organizador queda con: Eventos (`/organizador`, icono `events`), Check-in (Próximamente) y Pagos
      (Próximamente).
    - El matching sigue la Decisión 7.
    - La limpieza sigue la Decisión 9.
11. **Solo lectura**: Decisión 8. Textos:
    - nuevo: «No puedes crear eventos mientras tu cuenta esté en solo lectura»;
    - editar: «No puedes editar eventos mientras tu cuenta esté en solo lectura».
    - Acción en los dos: «Volver a Eventos» → `/organizador`.
12. **Design system**:
    - `pages/organizer.md` describe la vista «Eventos» unificada, el sidebar, el matching, los filtros con
      DatePicker, las acciones compactas y el modo solo lectura.
    - `MASTER.md` añade `DatePicker` a la tabla de componentes.
13. **Revisión UI** de `/organizador/**` a 375, 768, 1024 y 1440 px. Los bugs que aparezcan dentro de este alcance se
    corrigen en T8. Se comprueba:
    - sin scroll horizontal;
    - filtros sin desbordarse;
    - Calendar, Popover y menú de acciones dentro del viewport;
    - controles ≥ 44 px;
    - focus visible;
    - títulos largos truncados sin romper la tabla.

## Criterios de aceptación

### Fase 1
- [ ] Dado el listado, cuando se elige Desde = 2026-10-05, entonces:
  - se llama a `listManagedEventsAction` con `{ status: "all", q: "", from: "2026-10-05", to: "" }`;
  - en Hasta, los días anteriores al 5 están deshabilitados.
- [ ] Dado un evento a `2026-10-05T05:00:00Z` (medianoche de Lima) y otro un instante antes, cuando se filtra con
  `from = 2026-10-05`, entonces sale solo el primero.
- [ ] Con `to = 2026-10-04` se incluye el último instante del 4 en Lima y se excluye `2026-10-05T05:00:00Z`.
- [ ] Dado un borrador sin fecha, cuando hay algún límite de fecha, entonces no aparece. Sin límites, sí.
- [ ] Dado `{ from: "2026-10-06", to: "2026-10-05" }`, entonces el schema falla en `to` con «La fecha Hasta no puede
  ser anterior a Desde».
- [ ] Dado «feria» escrito y buscado, cuando se pulsa «Limpiar filtros», entonces:
  - el input queda vacío;
  - los cuatro filtros vuelven a los valores por defecto;
  - el botón desaparece.
- [ ] Dado `canCreate`, entonces «Crear evento» está dentro de la sección del listado. Sin `canCreate`, no aparece.
- [ ] Dado el formulario de crear, entonces «Fecha» es un `DatePicker` (no hay `input[type=date]` en
  `/organizador/**`) y los días anteriores a hoy en Lima están deshabilitados.
- [ ] Dado un evento publicado con ventas en editar, entonces el trigger de «Fecha» está deshabilitado.
- [ ] Dado un borrador en lg, entonces la fila muestra `[Editar]` y `[•••]` en una línea.
- [ ] El menú de esa fila contiene «Eliminar» y «Enviar a revisión». Un evento en revisión visto por un admin tiene
  `[•••]` con «Aprobar» y «Rechazar» y sin `[Editar]`.
- [ ] Un publicado con ventas visto por un admin muestra «Cancelar evento» deshabilitado con el motivo.
- [ ] Todos los ítems del menú miden ≥ 44 px.
- [ ] Dado el móvil (cards), entonces las acciones siguen siendo botones con texto.
- [ ] `npm run lint`, `npx vitest run` y `npm run build` pasan.

### Fase 2
- [ ] Dado el sidebar del organizador, entonces solo contiene «Eventos», «Check-in» y «Pagos». No hay «Resumen»,
  «Mis eventos» ni «Crear evento».
- [ ] Dado `/organizador/eventos/nuevo` o `/organizador/eventos/<id>/editar`, entonces «Eventos» tiene
  `aria-current="page"` y el breadcrumb es «Organizador / Eventos».
- [ ] `/organizador/eventos?guardado=borrador` redirige a `/organizador?guardado=borrador` y muestra el aviso.
  `?guardado=x` redirige a `/organizador` sin parámetro.
- [ ] Dado `/organizador`, entonces se ven el h1 «Eventos», los KPIs y el listado con filtros y acciones.
- [ ] Filtrar no cambia los KPIs.
- [ ] Guardar un borrador navega a `/organizador?guardado=borrador`. «Volver a Eventos» y Cancelar llevan a
  `/organizador`.
- [ ] Dado un organizador `pending` que abre `/organizador/eventos/nuevo`, entonces:
  - no hay redirección;
  - se ve «Crear evento» con el mensaje de solo lectura;
  - hay un único aviso global (el del layout).
- [ ] Lo mismo en editar, sin consultar el evento.
- [ ] Dados un admin y un super_admin (con el rol verificado en la Precondición), entonces abren Crear evento y ven
  el selector de organizador.
- [ ] A 375, 768, 1024 y 1440 px no hay scroll horizontal en `/organizador/**`, y el Popover y el menú quedan dentro
  del viewport.
- [ ] `organizer.md` y `MASTER.md` están actualizados.
- [ ] `npm run lint`, `npx vitest run` y `npm run build` pasan.

## Diseño técnico
- Rutas:
  - `app/(panel)/organizador/page.tsx`: unificada.
  - `app/(panel)/organizador/eventos/page.tsx`: redirect.
  - `eventos/nuevo/page.tsx` y `eventos/[id]/editar/page.tsx`: solo lectura sin rebote.
- Componentes:
  - shadcn nuevos: `calendar` y `popover`.
  - Nuevo: `components/shared/DatePicker.tsx`.
  - Modificados: `OrganizerDashboard`, `OrganizerEventsList`, `OrganizerEventsTable`, `EventRowActions`,
    `OrganizerEventForm`, `EventFormHeader` y `PanelNav`.
- Hooks: `useManagedEvents` (`DEFAULT_MANAGED_EVENTS_FILTERS`).
- Schema y servicio: `managedEvents.schema.ts` y `managedEvents.service.ts` (módulo events). El action
  `listManagedEventsAction` no cambia, porque ya valida con el schema.
- Panel: `panelNav.ts` (ítems, `isPanelNavItemActive` y `findNavItem`) y `panel.types.ts` (limpieza).

## Reutilización
- `CreateEventLink`, `EventFormHeader`, `EmptyState`, `savedStatusSchema`, `getAvailableTransitions` y
  `hasEventRowActions`.
- `DropdownMenu` (`components/ui/dropdown-menu.tsx`), `NativeSelect`, `Input` y `Button`.
- `getTodayInLima` (form) y `escapeLike`/`normalizeText` (servicio).
- Caché `managedEventsBaseKey`/`managedEventsQueryKey`.

## Tests
- `components/shared/DatePicker.test.tsx`: abrir y elegir (emite `YYYY-MM-DD`), `min`/`max` deshabilitan días,
  `disabled` no abre y el texto formateado.
- `modules/events/schemas/managedEvents.schema.test.ts` (nuevo): valores por defecto, formato inválido y `from > to`.
- `modules/events/services/managedEvents.service.test.ts`: rango, solo desde, solo hasta, `null` excluido y bordes
  de Lima.
- `modules/organizer/hooks/useManagedEvents.test.tsx`: filtros con 4 campos.
- `modules/organizer/components/OrganizerEventsList.test.tsx`:
  - filtros de fecha;
  - limpiar (incluido el input);
  - `canCreate`;
  - acciones de tabla con `within(table)` y móvil con `within(list)`;
  - menú y cancelar bloqueado.
- `modules/organizer/components/OrganizerEventForm.test.tsx`: DatePicker de Fecha (elegir, bloqueado con ventas,
  fecha pasada) y hrefs a `/organizador`.
- `modules/organizer/components/OrganizerDashboard.test.tsx`: KPIs y listado, y KPIs estables al filtrar.
- `modules/organizer/utils/organizerStats.test.ts`: se quitan los casos de `filterManagedEvents`.
- `modules/panel/utils/panelNav.test.ts` y `modules/panel/components/PanelNav.test.tsx`: ítems, matching de
  subrutas, breadcrumb y `aria-current`.
- Las páginas async (redirect y solo lectura) no se pueden testear unitariamente: se verifican a mano.

## Plan de tareas
Coordinación:
- Sin otra spec abierta sobre estos archivos.
- Cada fase termina con `npm run lint`, `npx vitest run` y `npm run build`, y la revisión del `reviewer`.
- Se ejecuta una fase por sesión.

### Fase 1. Filtros y UI
- [ ] T1. DatePicker shadcn compartido.
  - Archivos: `components/ui/calendar.tsx`, `components/ui/popover.tsx` (CLI), `package.json`, `package-lock.json`,
    `components/shared/DatePicker.tsx` y `components/shared/DatePicker.test.tsx`.
  - Depende de: —.
  - Paralelo con T2 y T5.
- [ ] T2. Filtros de fecha en el servidor.
  - Archivos: `modules/events/schemas/managedEvents.schema.ts`, `modules/events/schemas/managedEvents.schema.test.ts`,
    `modules/events/services/managedEvents.service.ts` y `modules/events/services/managedEvents.service.test.ts`.
  - Depende de: —.
  - Paralelo con T1 y T5.
- [ ] T5. Acciones compactas responsive.
  - Archivos: `modules/organizer/components/EventRowActions.tsx`,
    `modules/organizer/components/OrganizerEventsTable.tsx`, `modules/organizer/components/OrganizerEventsList.tsx`
    (firma de `rowActions`) y `modules/organizer/components/OrganizerEventsList.test.tsx`.
  - Depende de: —.
  - Paralelo con T1 y T2. Va antes de T3, porque comparten `OrganizerEventsList`.
- [ ] T3. Filtros y «Crear evento» en el listado.
  - Archivos: `modules/organizer/components/OrganizerEventsList.tsx`,
    `modules/organizer/components/OrganizerEventsList.test.tsx`, `modules/organizer/hooks/useManagedEvents.ts` y
    `modules/organizer/hooks/useManagedEvents.test.tsx`.
  - Depende de: T1, T2 y T5.
  - Paralelo con T4.
- [ ] T4. DatePicker en Crear/Editar.
  - Archivos: `modules/organizer/components/OrganizerEventForm.tsx` y
    `modules/organizer/components/OrganizerEventForm.test.tsx`.
  - Depende de: T1.
  - Paralelo con T3 y T5.

### Fase 2. Navegación y consolidación
- [ ] T6. Vista `/organizador` unificada.
  - Archivos: `modules/organizer/components/OrganizerDashboard.tsx`,
    `modules/organizer/components/OrganizerDashboard.test.tsx`, `modules/organizer/utils/organizerStats.ts`,
    `modules/organizer/utils/organizerStats.test.ts`, `app/(panel)/organizador/page.tsx`,
    `app/(panel)/organizador/eventos/page.tsx`, `modules/organizer/components/OrganizerEventForm.tsx` (hrefs),
    `modules/organizer/components/OrganizerEventForm.test.tsx` y `modules/organizer/components/EventFormHeader.tsx`.
  - Depende de: Fase 1.
  - Paralelo con T7.
- [ ] T7. Sidebar y breadcrumb.
  - Archivos: `modules/panel/utils/panelNav.ts`, `modules/panel/utils/panelNav.test.ts`,
    `modules/panel/types/panel.types.ts`, `modules/panel/components/PanelNav.tsx` y
    `modules/panel/components/PanelNav.test.tsx`.
  - Depende de: —.
  - Paralelo con T6.
- [ ] T8. Solo lectura, super_admin y revisión final.
  - Archivos: `app/(panel)/organizador/eventos/nuevo/page.tsx`, `app/(panel)/organizador/eventos/[id]/editar/page.tsx`,
    `design-system/ticketera/pages/organizer.md` y `design-system/ticketera/MASTER.md`, más las correcciones de la
    revisión UI dentro de `/organizador/**`.
  - Depende de: T6 y T7.
  - Secuencial.

## Preguntas abiertas
(ninguna)
