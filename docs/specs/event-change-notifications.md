# Notificaciones por correo a compradores cuando cambia un evento

- Módulo: notifications (nuevo; también organizer, lib/db, lib/env y app/api)
- Estado: aprobado

## Problema
Cuando un organizador o admin cambia un evento con entradas vendidas (fecha, hora, nombre, tipo de entrada,
cancelación…), los compradores no se enteran salvo que entren a la app. La app no tiene correo transaccional propio:
Clerk solo envía los correos de autenticación.

## Solución
Enviar con **Resend** un correo a **todos los compradores** del evento cuando:
- cambia la **fecha u hora** (inicio o apertura de puertas) → envío inmediato;
- el evento se **cancela** → envío inmediato;
- cambia el **nombre del evento o de un tipo de entrada**, o **cualquier otro campo guardado** (descripción, portada,
  categoría, edad, precio) → se **agrupan** en un solo correo por evento.

El cambio del evento y la notificación se guardan en la **misma transacción** (outbox); el envío ocurre después, con
estados, idempotencia por destinatario y reintentos.

## Alcance
- Incluye: integración con Resend, plantillas en español, outbox en BD (migración), envío inmediato y agrupado,
  modos de entrega por entorno, reintentos, variables en `lib/env.ts` y `.env.example`, documentación.
- No incluye: preferencias o baja por usuario (son correos transaccionales del servicio comprado), reembolsos, SMS o
  push, correos de marketing, panel de administración de envíos.
- Depende de `docs/specs/event-editing.md` (habilita editar fecha, hora y entradas con ventas). Orden de entrega:
  `events-dynamic-landing` (migración `0009`) → `event-editing` (`0010`) → `organizer-manual-venue` (sin migración) →
  esta spec (`0011`).

## Infraestructura ya configurada (Ronald)
- Resend: dominio `ticketera.mentec.dev` verificado. Remitente `Mentec Tickets <notificaciones@ticketera.mentec.dev>`.
- Vercel **Production**: `RESEND_API_KEY` (Sensitive), `EMAIL_FROM`, `EMAIL_DELIVERY_MODE=live`.
- Vercel **Preview**: `RESEND_API_KEY` distinta de Production (Sensitive), `EMAIL_FROM`,
  `EMAIL_DELIVERY_MODE=allowlist`, `EMAIL_ALLOWED_RECIPIENTS` con correos de prueba explícitos.
- **Local** (`.env.local`): API key de prueba/Preview, `EMAIL_DELIVERY_MODE=allowlist`, `EMAIL_ALLOWED_RECIPIENTS`
  solo con el correo de prueba de Ronald.

## Decisiones tomadas
### 1. Variables de entorno (`lib/env.ts`, solo servidor)
| Variable | Validación | Notas |
|---|---|---|
| `RESEND_API_KEY` | opcional, `startsWith("re_")` | Exclusivamente server-side. **Nunca** `NEXT_PUBLIC_RESEND_API_KEY`. |
| `EMAIL_FROM` | opcional; formato `Nombre <correo@dominio>` | `Mentec Tickets <notificaciones@ticketera.mentec.dev>` |
| `EMAIL_DELIVERY_MODE` | `z.enum(["live", "allowlist"])`, por defecto `allowlist` | |
| `EMAIL_ALLOWED_RECIPIENTS` | lista separada por comas de correos válidos, normalizados a minúsculas | Obligatoria si el modo efectivo es `allowlist` y hay clave. |
| `CRON_SECRET` | opcional, ≥ 16 caracteres | Protege el endpoint del cron (Vercel lo envía como `Authorization: Bearer`). |

- **Modo efectivo:** `live` solo si `EMAIL_DELIVERY_MODE=live` **y** `VERCEL_ENV === "production"`. En cualquier
  otro entorno (Preview, Development, local) se fuerza `allowlist` aunque alguien configure `live` por error.
- **Sin `RESEND_API_KEY` o sin `EMAIL_FROM`:** las notificaciones se encolan igual, pero el envío se omite
  (`status` queda `pending` y se registra un aviso sin datos sensibles); la app arranca y funciona.
- `.env.example` añade las cinco variables **sin valores** y con comentarios.
- La clave nunca aparece en logs, errores, tests ni documentación: el cliente de Resend se crea en un módulo
  `server-only`, los logs registran solo `name`/`message` del error de Resend y el id de la notificación, y los tests
  usan una clave ficticia `re_test_…` con el SDK mockeado.

### 2. Migración exacta (`drizzle/0011_event_notifications.sql`, generada con `drizzle-kit generate` desde el schema)
```sql
CREATE TYPE "public"."event_notification_kind" AS ENUM('schedule', 'cancelled', 'update');
CREATE TYPE "public"."event_notification_status" AS ENUM('pending', 'sending', 'sent', 'failed');
CREATE TYPE "public"."email_delivery_status" AS ENUM('pending', 'sent', 'failed');

CREATE TABLE "event_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "kind" "event_notification_kind" NOT NULL,
  "status" "event_notification_status" DEFAULT 'pending' NOT NULL,
  "changes" jsonb NOT NULL,                -- [{ field, before, after }]
  "send_after" timestamptz NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamptz,
  "locked_at" timestamptz,
  "sent_at" timestamptz,
  "last_error" text,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "event_notifications_due_idx" ON "event_notifications" ("status", "send_after");
-- Una sola notificación `update` pendiente por evento (se fusionan los cambios en ella).
CREATE UNIQUE INDEX "event_notifications_one_pending_update_idx"
  ON "event_notifications" ("event_id") WHERE "kind" = 'update' AND "status" = 'pending';

CREATE TABLE "event_notification_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "notification_id" uuid NOT NULL REFERENCES "event_notifications"("id") ON DELETE CASCADE,
  "email" text NOT NULL,                   -- en minúsculas
  "status" "email_delivery_status" DEFAULT 'pending' NOT NULL,
  "provider_message_id" text,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "sent_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "event_notification_deliveries_notification_email_unique" UNIQUE ("notification_id", "email")
);
```
Solo crea objetos nuevos: no altera tablas existentes ni datos. Rollback: `DROP TABLE` de las dos tablas y
`DROP TYPE` de los tres enums.

### 3. Misma transacción que el cambio del evento
- Los servicios que cambian un evento ya trabajan dentro de `inTransaction(database, async (tx) => …)`
  (`updateEvent`/`updatePublishedEvent`, cancelación y moderación en `modules/organizer/services`).
- Dentro de **ese mismo `tx`**, tras escribir el evento y antes de salir de la transacción, el servicio llama a
  `enqueueEventNotification(tx, { eventId, kind, changes, actorId })` (nuevo, `modules/notifications/services`), que:
  1. comprueba si el evento tiene compradores (`paid`/`partially_refunded`); si no, no encola nada;
  2. calcula `changes` comparando la fila anterior (ya cargada con `lockManagedEvent`, que bloquea la fila del
     evento) con la nueva; si no hay diferencias visibles, no encola nada;
  3. `schedule`/`cancelled`: inserta una fila con `send_after = now()`;
  4. `update`: `SELECT … FOR UPDATE` de la fila `update` pendiente del evento; si existe, fusiona `changes`
     (conserva el primer `before` y el último `after` de cada campo); si no, inserta con
     `send_after = now() + 10 min`. El índice único parcial impide dos filas pendientes en una carrera.
- Si cualquier paso falla, la transacción entera hace rollback: **no hay evento guardado sin notificación ni
  notificación de un cambio que no se guardó**.
- El envío **nunca** ocurre dentro de la transacción. Para `schedule`/`cancelled`, la acción programa con `after()`
  de Next 16 el procesamiento de esa notificación cuando la respuesta ya salió.

### 4. Estados
**Notificación (`event_notifications.status`):**

| Estado | Significado | Transiciones |
|---|---|---|
| `pending` | Encolada; espera `send_after` (y `next_attempt_at` si hubo fallo) | → `sending` al reclamarla |
| `sending` | Un proceso la reclamó (`locked_at`) | → `sent` si todas las entregas quedan `sent`/`failed` permanente; → `pending` con `next_attempt_at` si quedan entregas reintentables; → `failed` al agotar intentos |
| `sent` | Todas las entregas resueltas | final |
| `failed` | Se agotaron los 5 intentos con entregas aún pendientes | final (queda `last_error`) |

Una fila `update` deja de aceptar fusiones en cuanto pasa a `sending`; un cambio posterior crea una fila `update`
nueva.

**Entrega por destinatario (`event_notification_deliveries.status`):** `pending` → `sent` (guarda
`provider_message_id`) o `failed` (error permanente o intentos agotados).

### 5. Idempotencia (sin correos duplicados)
- **Reclamo atómico:** `UPDATE event_notifications SET status = 'sending', locked_at = now(), attempts = attempts + 1
  WHERE id = $1 AND (status = 'pending' AND send_after <= now() AND (next_attempt_at IS NULL OR next_attempt_at <= now())
  OR status = 'sending' AND locked_at < now() - interval '10 minutes') RETURNING *`. Si no devuelve fila, otro proceso
  la tiene: no se hace nada. Así `after()` y el cron nunca procesan la misma notificación a la vez; un proceso caído
  libera la fila a los 10 minutos.
- **Destinatarios congelados:** al primer reclamo se insertan las entregas con
  `INSERT … SELECT DISTINCT lower(buyer_email) … ON CONFLICT (notification_id, email) DO NOTHING`. Los reintentos
  solo envían entregas en `pending`; una entrega `sent` nunca se reenvía.
- **Clave de idempotencia de Resend:** cada envío usa `idempotencyKey = "event-notification/<notificationId>/<deliveryId>"`.
  Si un proceso envía y cae antes de marcar `sent`, el reintento con la misma clave no genera un segundo correo
  (Resend la respeta 24 h; el reclamo vencido a los 10 min queda dentro de esa ventana).
- **Un correo por dirección:** el `UNIQUE (notification_id, email)` garantiza una entrega por correo aunque tenga
  varios pedidos.

### 6. Reintentos de fallos de Resend
- **Reintentables:** errores de red, timeout, `429` (rate limit) y `5xx`. La entrega sigue `pending`, se incrementa
  `attempts` y la notificación vuelve a `pending` con `next_attempt_at = now() + 2^attempts minutos`
  (1, 2, 4, 8, 16 min).
- **Permanentes:** `4xx` de validación (dirección inválida, dominio rechazado). La entrega pasa a `failed` sin
  reintento; no bloquea al resto de destinatarios.
- **Límite:** 5 intentos por notificación. Al agotarlos, las entregas aún `pending` pasan a `failed` y la notificación
  a `failed`, con `last_error`.
- **Ritmo:** se envía en lotes con `resend.batch.send` (máximo 100 por llamada) y se respeta el rate limit de la
  cuenta; un `429` corta el lote y se reintenta en el siguiente ciclo.
- **Primer intento de un crítico:** inmediato, con `after()`. Si falla, queda persistido para reintento.
- **Quién reintenta:** el worker (Decisión 7): el drenado oportunista de `after()` y el cron, que recogen las
  notificaciones `pending` vencidas, las reintentables y las `sending` con reclamo vencido.

### 7. Worker: inmediato con `after()` y cron compatible con Hobby
El dominio solo conoce `send_after` y `next_attempt_at`; **la frecuencia del worker no forma parte de la lógica ni
de la BD**. Cambiar de plan de Vercel solo cambia una línea de `vercel.json`.

- **Cambios críticos (fecha/hora y cancelación):** `send_after = now()`. Tras confirmar la transacción, la acción
  llama con `after()` a `processEventNotification(id)`, que la reclama y envía en el momento. **No dependen del
  cron.** Si el envío falla (total o parcialmente), la notificación queda persistida (`pending` con
  `next_attempt_at`) para reintento posterior.
- **Drenado oportunista:** cada ejecución de `after()` procesa además hasta 5 notificaciones vencidas de cualquier
  evento (mismo reclamo atómico), para que los reintentos y los agrupados no esperen siempre al cron. Es una mejora de
  latencia; la corrección no depende de ella.
- **Cambios no críticos agrupados:** `send_after = now() + 10 min`. La regla de agrupación es solo `send_after`; los
  envía el siguiente worker que corra después de esa hora (el drenado oportunista o el cron).
- **Cron:** route handler `GET /api/cron/event-notifications`, protegido con `Authorization: Bearer ${CRON_SECRET}`
  (401 sin él), que procesa en lotes:
  - notificaciones `pending` con `send_after <= now()` y `next_attempt_at` vencido o nulo;
  - notificaciones `pending` por fallos reintentables;
  - notificaciones `sending` con reclamo vencido (`locked_at < now() - 10 min`).
- **Frecuencia en `vercel.json` → `crons`:**
  - **Hobby (inicial):** diario, `"0 10 * * *"` (05:00 hora de Lima). Vercel Hobby solo admite cron diario y no
    garantiza el minuto exacto dentro de la hora. Consecuencia: en el peor caso, un cambio no crítico o un reintento
    sale al día siguiente (salvo que antes lo recoja el drenado oportunista). Los críticos salen en el momento.
  - **Pro (mejora):** `"*/10 * * * *"`. Solo se cambia esa línea; ni la BD ni la lógica cambian.
- **Backoff y cron diario:** el backoff (1, 2, 4, 8, 16 min) define el **mínimo** antes de reintentar. Con cron diario
  el reintento real ocurre en la siguiente ejecución del worker después de `next_attempt_at`; el límite sigue siendo 5
  intentos.

### 8. Destinatarios y modos de entrega
- **Destinatarios:** `DISTINCT lower(buyer_email)` de los pedidos `paid`/`partially_refunded` del evento al primer
  reclamo. Registrados e invitados. Las reservas `pending` no reciben correo.
- **Modo `allowlist`:** antes de enviar, se descartan los destinatarios que no estén en `EMAIL_ALLOWED_RECIPIENTS`;
  su entrega queda `failed` con `last_error = "omitido por allowlist"` (sin llamar a Resend). Nunca se escribe fuera de
  la lista en Preview ni en local.
- **Modo `live`:** solo en Production (Decisión 1).

### 9. Contenido
Asuntos: «Nueva fecha para {título}», «{título} fue cancelado», «Cambios en tu evento: {título}». Cuerpo con los
cambios (antes → ahora), fechas en hora de Lima, enlace al detalle y a «Mis entradas», y pie con el remitente. HTML
simple con React Email (`@react-email/components`) más versión de texto plano. Remitente: `EMAIL_FROM`.

## Criterios de aceptación
- [ ] Cambiar la fecha de un evento con compradores crea, en la misma transacción, una notificación `schedule` y envía
  un correo por dirección distinta, una sola vez.
- [ ] Cancelar un evento envía el correo de cancelación a todos sus compradores.
- [ ] Varios cambios menores dentro de 10 minutos generan un único correo con todos los cambios (primer «antes», último
  «después»).
- [ ] Si falla el guardado del evento, no queda notificación; si falla `enqueueEventNotification`, el evento no se
  guarda.
- [ ] Un error `5xx`/`429` de Resend deja la entrega `pending` y se reintenta con backoff; un `4xx` de validación la
  marca `failed` sin reintento; al quinto intento la notificación queda `failed`.
- [ ] Procesar la misma notificación dos veces (después de `after()` y del cron) no envía correos duplicados.
- [ ] En Preview y local no sale ningún correo a direcciones fuera de `EMAIL_ALLOWED_RECIPIENTS`, aunque
  `EMAIL_DELIVERY_MODE` diga `live`.
- [ ] Sin `RESEND_API_KEY` la app funciona y las notificaciones quedan `pending`.
- [ ] Un evento sin ventas no genera notificaciones.
- [ ] Un cambio de fecha/hora o una cancelación se envía con `after()` sin ejecutar el cron; si Resend falla, la
  notificación queda `pending` con `next_attempt_at` y el siguiente worker la reintenta.
- [ ] Una ejecución del cron procesa las `pending` vencidas (agrupadas y reintentables) y libera las `sending` con
  reclamo vencido.
- [ ] `vercel.json` declara el cron diario (Hobby); pasar a `*/10 * * * *` no requiere cambios de código ni de BD.
- [ ] `/api/cron/event-notifications` responde 401 sin `CRON_SECRET`.
- [ ] No existe `NEXT_PUBLIC_RESEND_API_KEY` y la clave no aparece en logs, tests ni documentación.
- [ ] `npx vitest run`, `npm run lint` y `npm run build` pasan.

## Tests
Resend mockeado (clave ficticia `re_test_…`). Con BD de test:
- outbox: crear, fusionar `update`, índice único, rollback conjunto con el evento, sin ventas → nada;
- reclamo: dos reclamos concurrentes → uno gana; reclamo vencido se libera;
- entregas: destinatarios distintos, solo pagados, invitados incluidos, `ON CONFLICT` en reintentos;
- reintentos: clasificación 429/5xx/4xx, backoff, límite de 5, estados finales;
- idempotencia: `idempotencyKey` estable por entrega;
- modos: allowlist filtra, `live` forzado a `allowlist` fuera de Production;
- `lib/env.ts`: validaciones y modo efectivo;
- plantillas (texto de cada tipo), handler del cron (401, lote).

## Entrega: flujo de promoción y sincronización
1. Rama `claude/event-change-notifications` desde `origin/main` (después de `event-editing` y
   `organizer-manual-venue`).
2. Validación local con `.env.local` en `allowlist`.
3. `npx vitest run` + `npm run lint` + `npm run build`.
4. **Migración `0011`** (dos tablas y tres enums nuevos): primero dev, luego Neon `test`.
5. Publicar `preview/event-change-notifications` = `origin/main` + solo esta feature.
6. Validación manual en Preview con una compra de prueba a un correo de la allowlist: cambio de hora (inmediato),
   cancelación, cambios menores agrupados, y comprobación de que un correo fuera de la allowlist no recibe nada.
7. Sin merge sin la aprobación de Ronald.
8. Antes de Production: declarar el cambio de BD (migración `0011`, solo objetos nuevos); branch de backup de Neon
   `production`; aplicar la migración; verificar `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_DELIVERY_MODE=live` y
   `CRON_SECRET` en Production.
9. Merge tras Preview aprobado y migración aplicada. 10. Production Ready.
11. Smoke test: cambiar la hora de un evento de prueba con una compra propia y recibir el correo; ver la entrega
    `sent` con `provider_message_id`.
12. Borrar ramas temporales y sincronizar `preview/qa`.

Sincronización: Preview = `origin/main` + esta feature; Neon `test` ≥ migraciones de `production`; nunca Neon
`production` como BD de Preview.

## Plan de tareas
- [x] T1. Base: dependencias `resend` y `@react-email/components`, `lib/env.ts` + `.env.example`, cliente
  `server-only`, modo efectivo y allowlist (+ tests).
- [x] T2. Schema y migración `0011`, servicio de outbox (`enqueueEventNotification`, fusión) (+ tests). Paralelo con
  T1 salvo `package.json`.
- [x] T3. Procesador: reclamo, entregas, envío por lotes, clasificación de errores, reintentos, plantillas (+ tests).
  Depende de T1 y T2.
- [x] T4. Integración en editar/cancelar/moderar (mismo `tx` + `after()` con envío inmediato y drenado oportunista) y
  cron (`vercel.json` con `"0 10 * * *"`, handler) (+ tests).
  Depende de T3.
- [x] T5. Documentación (configuración, operación y cómo reprocesar una notificación `failed`).

## Preguntas abiertas
(ninguna; el plan de Vercel no se asume: la spec funciona en Hobby con cron diario y en Pro basta con cambiar la
frecuencia en `vercel.json`)
