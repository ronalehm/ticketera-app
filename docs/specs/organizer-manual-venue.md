# Recinto manual al crear un evento, con dirección exacta para Google Maps

- Módulo: organizer (también events y lib/db)
- Estado: aprobado

## Problema
En Crear/Editar evento el recinto solo se elige de una lista de recintos `approved`. Un café, bar o local pequeño que
no esté en la lista impide crear el evento. Además, el detalle del evento ubica el mapa con `venue + address + city`
(`modules/events/utils/venueMap.ts`), así que la dirección tiene que ser exacta para que Google Maps la encuentre.

## Solución
Si el recinto no está en la lista, el organizador (o el admin que crea el evento por él) lo ingresa a mano:
- **Nombre** del recinto.
- **Dirección exacta** (calle y número, distrito y referencia si hace falta), la que se mostrará y se usará en Google
  Maps.
- **Ciudad** (una de las ciudades de la app: `CITIES` = Lima, Arequipa, Cusco, Trujillo, Piura).
- **Zonas generales**: una o más zonas sin asientos numerados, cada una con nombre y aforo (p. ej. «General 200»,
  «VIP 50»).
- **Vista previa del mapa** en el formulario con el mismo `VenueMap`/`buildMapEmbedUrl` del detalle, para que compruebe
  que Google Maps ubica bien la dirección antes de guardar, más el enlace «Abrir en Google Maps»
  (`buildDirectionsUrl`).

El recinto se crea en `pending_review`, solo lo usa su organizador, y pasa a `approved` cuando el admin aprueba el
evento. El organizador del evento, en cambio, **no** se ingresa a mano: sigue siendo obligatorio elegir un organizador
registrado y aprobado.

## Alcance
- Incluye: checkbox «Mi recinto no está en la lista» en la sección Recinto del formulario, que abre los campos manuales; creación del recinto y
  sus zonas generales en la misma transacción que el evento; edición de ese recinto mientras el evento está en
  borrador o en revisión; vista previa del mapa; aprobación del recinto junto con el evento; documentación.
- No incluye: asientos numerados ni mapa de asientos para recintos manuales; geocodificación automática a lat/lng
  (Places API); ciudades nuevas fuera de `CITIES`; una pantalla de moderación de recintos aparte; que otros
  organizadores reutilicen un recinto pendiente.
- No cambia: el selector de organizador solo lista organizadores registrados y `approved` (`listApprovedOrganizers`);
  el servidor rechaza cualquier otro (`organizer_not_approved`). No hay organizador manual.

## Decisiones tomadas
1. **Sin migración de esquema.** `venues` ya admite recintos del organizador (`status pending_review`,
   `organizer_id`, `created_by`; check `venues_pending_has_owner_check`) y `venue_sections` admite zonas `general`
   con `capacity > 0` (`venue_sections_seating_capacity_check`). `lat`, `lng` y `place_id` quedan `NULL`.
1b. **Nombre del recinto manual:** campo de texto libre **«Nombre del recinto»**, obligatorio, 2–120 caracteres,
   placeholder «Ej.: Café La Esquina». Es el nombre que se muestra en el detalle, las tarjetas y las entradas, y forma
   parte de la consulta del mapa. Solo aparece con el checkbox marcado; con un recinto de la lista, el nombre es el del
   recinto elegido.
2. **Dirección exacta:** `address` obligatoria, 10–200 caracteres, con ayuda «Calle y número, distrito. Ej.: Av.
   Larco 1150, Miraflores». El mapa del detalle y la vista previa usan `buildVenueQuery(venue, address, city)` como hoy.
   La vista previa del formulario reutiliza el click-to-load de `VenueMap` (sin cargar Google hasta que se pulsa) y
   `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`; sin clave, solo el enlace «Abrir en Google Maps».
3. **UX:** en «Recinto», por defecto se elige del Select de recintos aprobados (más los pendientes del propio
   organizador). Debajo, un checkbox (`components/ui/checkbox.tsx`) **«Mi recinto no está en la lista»**, desmarcado
   por defecto. Solo al marcarlo se abre el bloque manual (nombre del recinto, dirección, ciudad, zonas, vista previa) y
   el Select se deshabilita; al desmarcarlo se vuelve al Select y el bloque manual se oculta (sus valores se conservan
   hasta guardar, pero no se envían). Solo uno de los dos está activo. Las zonas se gestionan con filas añadir/quitar (mínimo
   1, máximo 10), aforo entero 1–100 000. Los tipos de entrada (`TicketTypesField`) se construyen sobre esas zonas igual
   que sobre las secciones de un recinto de la lista.
3b. **Dirección y mapa en todas las opciones.** También al elegir un recinto de la lista, el formulario muestra su
   dirección exacta (solo lectura), la vista previa del mapa (`VenueMap`, click-to-load) y el enlace «Abrir en Google
   Maps». `VenueOption` y `listApprovedVenuesWithSections` añaden `address` (y `lat`/`lng`/`placeId` si existen, para
   que la vista previa use la misma consulta que el detalle). Un recinto `approved` es compartido, así que su dirección
   no se edita desde el evento; si está mal, se corrige aparte (fuera de alcance). En el modo manual la dirección es
   editable, como en la Decisión 2.
4. **Servicio:** `createEvent`/`updateEvent` aceptan `venue: { kind: "existing", id } | { kind: "manual", name,
   address, city, sections[] }`. Con `manual` crean (o, en `draft`/`pending_review`, actualizan) el recinto
   `pending_review` con `organizer_id` = organizador del evento y `created_by` = actor, y sus `venue_sections`
   (`seating: "general"`, `slug` derivado del nombre, `sort_order`), todo en la misma transacción que el evento.
5. **Visibilidad:** `listApprovedVenuesWithSections` pasa a devolver los `approved` más los `pending_review` cuyo
   `organizer_id` es el organizador del formulario (para el admin, el organizador elegido). Un recinto pendiente nunca
   aparece a otros organizadores ni en la web pública salvo a través de su evento.
6. **Aprobación conjunta:** `approveEvent` (moderación) pasa a `approved` el recinto del evento si estaba
   `pending_review`, en la misma transacción. `rejectEvent` no lo toca (queda pendiente para que el organizador lo
   corrija). Un evento publicado nunca queda con un recinto pendiente.
7. **Edición:** con el evento en `draft` o `pending_review`, el recinto manual se puede corregir; con el evento
   `published`, el recinto ya está `approved` y sigue las reglas de estructura bloqueada.
8. **Permisos:** los de siempre (`events:manageOwn`; organizador aprobado; admin/super_admin para cualquier
   organizador). Un organizador no puede editar un recinto `approved` ni uno pendiente ajeno.

## Criterios de aceptación
- [ ] En Crear evento el recinto se elige del Select por defecto. El checkbox «Mi recinto no está en la lista» está
  desmarcado; al marcarlo se deshabilita el Select y aparecen nombre del recinto, dirección exacta, ciudad, zonas y
  vista previa del mapa; al desmarcarlo se vuelve al Select. Guardar con el check marcado crea el evento y un recinto
  `pending_review` con sus zonas generales.
- [ ] Con el checkbox marcado, el «Nombre del recinto» se escribe a mano y es obligatorio (vacío o de menos de 2
  caracteres se rechaza); ese nombre aparece en el detalle, las tarjetas y las entradas.
- [ ] La dirección vacía, demasiado corta o una ciudad fuera de `CITIES` se rechazan con mensajes claros; una zona sin
  nombre o con aforo ≤ 0 también.
- [ ] Al elegir un recinto de la lista se ven su dirección exacta (solo lectura), la vista previa del mapa y «Abrir en
  Google Maps», igual que en el modo manual.
- [ ] La vista previa del mapa carga Google Maps solo al pulsar «Ver mapa» y usa la misma consulta que el detalle;
  «Abrir en Google Maps» abre la dirección exacta.
- [ ] Los tipos de entrada se definen sobre las zonas del recinto manual y el inventario general se genera al aprobar.
- [ ] El recinto pendiente aparece en el Select solo para su organizador (y para el admin con ese organizador
  elegido).
- [ ] Al aprobar el evento, el recinto pasa a `approved`; al rechazarlo, sigue pendiente y editable.
- [ ] El detalle público muestra la dirección exacta y el mapa la ubica.
- [ ] El selector de organizador sigue listando solo organizadores registrados y aprobados.
- [ ] `npx vitest run`, `npm run lint` y `npm run build` pasan.

## Tests
- Servicio (BD de test): crear evento con recinto manual (recinto, zonas, ids, estado), validaciones, actualizar en
  draft/pending_review, visibilidad por organizador, aprobación conjunta y rechazo, permisos (organizador ajeno, recinto
  approved no editable).
- Schema: dirección, ciudad, zonas.
- Componentes: bloque manual (alternar, zonas añadir/quitar, vista previa con y sin clave), `TicketTypesField` con
  zonas manuales, `OrganizerEventForm`.

## Entrega: flujo de promoción y sincronización
Los 12 pasos de siempre. **Sin migración** (si la implementación descubre que hace falta, se para y se reaprueba la
spec). Preview = `origin/main` + esta feature; sin variables nuevas (`NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` ya existe).
Smoke test de Production: crear un borrador con recinto manual, comprobar el mapa en la vista previa y eliminarlo.

**Orden:** después de `events-dynamic-landing.md` y `event-editing.md` (las tres tocan `OrganizerEventForm` y
`eventDrafts.service.ts`).

## Plan de tareas
- [ ] T1. Contrato y servicio: schema del recinto manual, `createEvent`/`updateEvent`, visibilidad en
  `listApprovedVenuesWithSections` (+ tests).
- [ ] T2. Moderación: aprobación conjunta en `approveEvent` (+ tests). Paralelo con T3.
- [ ] T3. UI: bloque manual en `OrganizerEventForm`, zonas, vista previa con `VenueMap`, `TicketTypesField` (+ tests).
  Depende de T1.
- [ ] T4. Documentación (`design-system/ticketera/pages/organizer.md`).

## Preguntas abiertas
(ninguna)
