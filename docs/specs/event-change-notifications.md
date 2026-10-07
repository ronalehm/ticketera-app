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
  push, correos de marketing, panel de administración de envíos, y **permitir cancelar eventos con compradores**
  (enmienda 1): hoy `cancelEvent` rechaza con `has_sales` cualquier evento con ventas, así que el correo `cancelled`
  queda conectado pero solo se enviará cuando una spec de reembolsos habilite esa cancelación.
- Depende de `docs/specs/event-editing.md` (habilita editar fecha, hora y entradas con ventas). Orden de entrega:
  `events-dynamic-landing` (migración `0009`) → `event-editing` (`0010`) → `organizer-manual-venue` (sin migración) →
  esta spec (`0011` y, por la enmienda 1, `0012`).

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
-- Una sola notificación `update` pendiente por evento (se fusionan los cambios en ella). Predicado corregido en 0012.
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
`0011` solo crea objetos nuevos: no altera tablas existentes ni datos. Rollback: `DROP TABLE` de las dos tablas y
`DROP TYPE` de los tres enums.

**Enmienda 1 — migración `drizzle/0012_event_notifications_merge_index.sql`.** El índice parcial de `0011` debe
contar solo las `update` que aún aceptan fusiones (`pending` **y** `attempts = 0`, Decisión 4).
- **`0011` no se edita** (ya está aplicada en dev y en Neon `test`): ni `drizzle/0011_event_notifications.sql` ni
  `drizzle/meta/0011_snapshot.json` ni su entrada del journal cambian respecto al commit `699740c`. sha256 del `.sql`
  (con finales de línea LF): `3999b4ebf351f5f2c9a6f6516f2df194a91ce334018c4721761922c5ddf17715`.
- **Schema** (`lib/db/schema/notifications.ts`): el mismo índice, con el mismo nombre, pasa a
  `.where(sql\`${t.kind} = 'update' AND ${t.status} = 'pending' AND ${t.attempts} = 0\`)` y su comentario se actualiza.
- **Generación:** `npm run db:generate -- --name event_notifications_merge_index`. drizzle-kit 0.31 trata un índice
  con el mismo nombre y otro `where` como índice alterado y emite `DROP INDEX` + `CREATE INDEX`, en ese orden; crea
  además `drizzle/meta/0012_snapshot.json` y la entrada `idx: 12` de `drizzle/meta/_journal.json`. SQL exacto esperado
  (el que genera drizzle-kit; no se retoca a mano):
  ```sql
  DROP INDEX "event_notifications_one_pending_update_idx";--> statement-breakpoint
  CREATE UNIQUE INDEX "event_notifications_one_pending_update_idx" ON "event_notifications" USING btree ("event_id") WHERE "event_notifications"."kind" = 'update' AND "event_notifications"."status" = 'pending' AND "event_notifications"."attempts" = 0;
  ```
- **Si drizzle-kit no generara exactamente eso** (p. ej. no detecta el cambio de `where`): se renombra el índice en el
  schema a `event_notifications_one_mergeable_update_idx` y se vuelve a generar, lo que produce `DROP INDEX` del nombre
  viejo + `CREATE UNIQUE INDEX` del nuevo con el predicado de arriba. **No** se usa `--custom` ni se escribe el SQL a
  mano: `--custom` copia el snapshot anterior, que quedaría con el predicado viejo y desincronizado del schema.
- **Sin deriva:** tras generar `0012`, un segundo `npm run db:generate` responde «No schema changes, nothing to
  migrate» y no crea archivos.
- **Seguridad de datos:** el predicado nuevo es más estricto que el de `0011` (subconjunto de filas), así que el
  `CREATE UNIQUE INDEX` no puede fallar con los datos existentes. `DROP INDEX` no es destructivo de datos y la regla
  aditiva de `lib/db/migrations.test.ts` lo acepta (solo prohíbe `DROP TABLE/COLUMN/TYPE/…`). Entre el `DROP` y el
  `CREATE` no hay ventana: `db:migrate` aplica la migración dentro de una transacción.
- **Rollback de `0012`:** `DROP INDEX "event_notifications_one_pending_update_idx";` y recrearlo con el predicado de
  `0011` (`"kind" = 'update' AND "status" = 'pending'`), solo si no hay dos `update` `pending` del mismo evento.
- **Orden de aplicación:** dev y Neon `test` ya tienen `0011` → solo se les aplica `0012`. Production sigue en `0010`
  hasta la promoción: backup (branch de Neon) → `0011` → `0012` (ver «Entrega»).

### 3. Misma transacción que el cambio del evento
- Los servicios que cambian un evento ya trabajan dentro de `inTransaction(database, async (tx) => …)`
  (`updateEvent`/`updatePublishedEvent`, cancelación y moderación en `modules/organizer/services`).
- Dentro de **ese mismo `tx`**, tras escribir el evento y antes de salir de la transacción, el servicio llama a
  `enqueueEventNotification(tx, { eventId, kind, changes, actorId })` (nuevo, `modules/notifications/services`), que:
  1. comprueba si el evento tiene compradores (`paid`/`partially_refunded`); si no, no encola nada;
  2. calcula `changes` comparando la fila anterior (ya cargada con `lockManagedEvent`, que bloquea la fila del
     evento) con la nueva; si no hay diferencias visibles, no encola nada;
  3. `schedule`/`cancelled`: inserta una fila con `send_after = now()`;
  4. `update`: `SELECT … FOR UPDATE` de la fila `update` `pending` **con `attempts = 0`** del evento (enmienda 1); si
     existe, fusiona `changes` (conserva el primer `before` y el último `after` de cada campo); si no (no hay ninguna, o
     la pendiente ya tiene `attempts > 0`), inserta una fila nueva con `send_after = now() + 10 min`. El índice único
     parcial de `0012` impide dos filas fusionables del mismo evento en una carrera, y deja convivir una `update` en
     reintento (`attempts > 0`) con la nueva.
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

Una fila `update` solo acepta fusiones mientras está `pending` **y con `attempts = 0`** (enmienda 1): en cuanto se
reclama por primera vez (aunque vuelva a `pending` por un reintento, con entregas ya enviadas) deja de aceptarlas, y un
cambio posterior crea una fila `update` nueva. Así ningún comprador se pierde cambios fusionados después de recibir el
correo. Al pasar a `sent` se limpia `last_error`. Una notificación que falla siempre después del reclamo (render, BD)
y supera los 5 intentos se marca `failed` en el siguiente reclamo en vez de quedarse en `sending`.

**`sending` abandonada tras el 5.º intento (enmienda 2, nota):** el reclamo que la libera suma un intento más, así que
queda `failed` con `attempts = 6` sin enviar nada. Es correcto (ese 6.º reclamo solo la cierra); el código lo indica con
un comentario junto a la rama `attempts > MAX_ATTEMPTS` y el README lo menciona.

**Reprocesar a mano una `update` en `failed` (enmienda 1, README; decisión firme del usuario):** se vuelve a `pending`
con `attempts = 1`; **nunca** se resetea a `0`. Con `attempts = 0` volvería a aceptar fusiones (los compradores con
entrega `sent` no recibirían esos cambios) y el `UPDATE` chocaría con el índice parcial de `0012` si el evento ya tiene
otra `update` fusionable. Con `attempts = 1` le quedan 4 intentos, y el usuario lo acepta. `schedule` y `cancelled` se
siguen reprocesando con `attempts = 0`.

**Al reprocesar, las entregas conservan su `attempts` (enmienda 2):** el SQL del README solo cambia `status` y
`last_error` de las entregas (`failed` → `pending`); **nunca** toca su `attempts`. Si una entrega ya intentada una a
una (`attempts > 0`) volviera a `0`, saldría dentro de un lote con otra clave y, si Resend había aceptado su envío
individual, el comprador lo recibiría dos veces. Se reactivan juntas todas las entregas `failed` reintentables de la
notificación (para que cada tramo vuelva a formar el mismo lote, Decisión 5) y nunca las `failed` por `validation_error`,
`invalid_idempotent_request` u «omitido por allowlist». Resend solo deduplica 24 h: el README avisa que, pasado ese
plazo desde el último intento, la clave ya no protege.

**Entrega por destinatario (`event_notification_deliveries.status`):** `pending` → `sent` (guarda
`provider_message_id`) o `failed` (error permanente o intentos agotados). Su `attempts` (enmienda 2) solo sube cuando
el resultado de **ese** correo se conoce o se intentó **solo**: `sent` (en lote o individual) o error de un
`emails.send` individual. Un error reintentable de un lote **no** lo sube. Por eso, una entrega `pending` con
`attempts > 0` es exactamente una que ya se intentó una a una.

### 5. Idempotencia (sin correos duplicados)
- **Reclamo atómico:** `UPDATE event_notifications SET status = 'sending', locked_at = now(), attempts = attempts + 1
  WHERE id = $1 AND (status = 'pending' AND send_after <= now() AND (next_attempt_at IS NULL OR next_attempt_at <= now())
  OR status = 'sending' AND locked_at < now() - interval '10 minutes') RETURNING *`. Si no devuelve fila, otro proceso
  la tiene: no se hace nada. Así `after()` y el cron nunca procesan la misma notificación a la vez; un proceso caído
  libera la fila a los 10 minutos.
- **Destinatarios congelados:** al primer reclamo se insertan las entregas con
  `INSERT … SELECT DISTINCT lower(buyer_email) … ON CONFLICT (notification_id, email) DO NOTHING`. Los reintentos
  solo envían entregas en `pending`; una entrega `sent` nunca se reenvía.
- **Clave de idempotencia de Resend (enmienda 1):** `resend.batch.send` admite una sola `idempotencyKey` por petición.
  Cada lote usa `event-notification/<notificationId>/batch-<sha256 de los ids de sus entregas>`; como las entregas están
  congeladas y se ordenan por id, un reintento del mismo lote repite la misma clave. Si un `4xx` de validación rechaza
  el lote, se reenvía correo a correo con `emails.send` y la clave por entrega
  `event-notification/<notificationId>/<deliveryId>`, y solo la dirección inválida queda `failed`. Resend respeta la
  clave 24 h; el reclamo vencido a los 10 min y el backoff (≤ 8 min) quedan dentro de esa ventana, pero con el cron
  diario de Hobby un reintento puede caer fuera (ver «Limitación conocida y temporal: ventana de 24 h de Resend»).
- **Regla de reintento de lotes (enmienda 2; sustituye a la de la enmienda 1, que subía `attempts` de las entregas de
  un lote con error reintentable y las reenviaba una a una con otra clave → correo duplicado si Resend había aceptado
  el lote y solo se perdió la respuesta; además un `429` en un lote de 100 se convertía en 100 llamadas):**
  1. Cada intento carga **todas** las entregas de la notificación (cualquier estado) ordenadas por id y las corta en
     **tramos fijos** de 100 (enmienda 3; ver «Por qué la clave del lote es estable»). De cada tramo, sus entregas
     `pending` permitidas con `attempts = 0` salen en un solo `batch.send` con la clave `batch-<sha256 de sus ids>`; un
     tramo sin ninguna no genera llamada. Las `pending` permitidas con `attempts > 0` (ya intentadas una a una, p. ej.
     por el fallback `4xx`) van una a una con `emails.send` y su clave por entrega.
  2. **Error reintentable de un lote** (red/timeout con `statusCode: null`, `429`, `5xx` y los nombres reintentables de
     `isRetryableSendError`): sus entregas siguen `pending` con `attempts` **sin cambios**; solo se guarda `last_error`.
     En el siguiente intento su tramo vuelve a dar el mismo lote con la **misma** clave, así que Resend devuelve la
     respuesta original si lo había aceptado. `emails.send` no se llama para ellas. Un `429` sigue cortando el envío del
     intento.
  3. **Error de validación `4xx` de un lote:** Resend rechazó el lote entero (no salió nada con esa clave) y se reenvía
     correo a correo con la clave por entrega; ahí sí sube `attempts` de cada entrega intentada. Si un `429` (o una
     caída) corta ese reenvío, las no intentadas siguen con `attempts = 0` y en el siguiente intento salen en lote
     dentro de su tramo, con una clave nueva (enmienda 3): con la anterior no salió nada, así que no hay nada que
     deduplicar, y los demás tramos no cambian.
  4. **`409 invalid_idempotent_request`** (misma clave con otro contenido, p. ej. el organizador cambió el título del
     evento durante el backoff y el asunto ya no coincide): la clave ya se usó, así que el envío original pudo haber
     salido. Es permanente y **no** se reenvía con otra clave: en un lote, el lote se da por resuelto y sus entregas
     pasan a `failed` con ese `last_error`, sin fallback uno a uno; en un envío individual ya es `4xx` permanente.
     **Decisión firme del usuario** (aprobada en la enmienda 2 y confirmada al cerrar la enmienda 3; la fase 4 no la
     cambia): se prefiere no duplicar a reenviar. Ningún comprador recibe el correo dos veces, aunque alguno podría no
     recibirlo, porque la documentación de Resend no aclara si guarda la clave de una petición que falló.
  5. El límite de 5 lo controla solo `event_notifications.attempts` (Decisión 6); al agotarlo, las entregas aún
     `pending` pasan a `failed` aunque su `attempts` sea `0`.
- **Por qué la clave del lote es estable (enmienda 3; sustituye al argumento de la enmienda 2, que recomponía los
  lotes sobre las entregas pendientes):** antes, si un `429` cortaba el reenvío uno a uno de un lote rechazado con
  `4xx`, las entregas no intentadas volvían a la recomposición y desplazaban los límites y las claves de los lotes
  posteriores; si uno de ellos ya había tenido un resultado desconocido, salía otra vez con otra clave (correo
  duplicado).
  - **Identidad persistida, sin columna nueva:** el tramo de una entrega es su posición en `ORDER BY id` sobre **todas**
    las entregas de la notificación, dividida entre 100. Ese conjunto se congela en el primer reclamo (`NOT EXISTS` en
    `freezeRecipients`), ninguna entrega se borra (solo `ON DELETE CASCADE` de la notificación) y los ids no cambian:
    el tramo de cada entrega es el mismo en todos los intentos, pase lo que pase con las demás. Una columna de número
    de lote (`0013`) guardaría un dato que ya se deriva de lo persistido.
  - **Descartado: marcar como individual todo el lote rechazado** (subir `attempts` de todas sus entregas antes del
    reenvío uno a uno). También fija las claves, pero manda esas entregas una a una para siempre. Con el rate limit de
    Resend, cada intento envía unas pocas antes del `429`, así que un lote de 100 puede agotar los 5 intentos sin
    notificar a la mayoría. Además cambia la semántica de `attempts` (Decisión 4).
  - **Invariante:** el conjunto enviable de un tramo (`pending`, `attempts = 0`, permitido) solo cambia (1) **entero**,
    con una sola sentencia: enviado (`markSent`), `409` → `failed`, agotamiento → `failed`; o (2) tras un `4xx` de
    validación **con su clave actual**, es decir, cuando con esa clave no salió nada. Un error reintentable no lo
    cambia, y lo que pasa en un tramo no afecta a los demás. Por tanto, si Resend aceptó un lote con la clave K (aunque
    se perdiera la respuesta), ese tramo se vuelve a enviar con K hasta resolverse.
  - **Secuencias:**
    - `429` en un lote: su tramo queda intacto y el intento se corta; los tramos posteriores ni se tocan. Siguiente
      intento: mismas claves.
    - `429` en el reenvío uno a uno (o caída del proceso o fallo de BD a mitad): las ya intentadas tienen
      `attempts > 0` y siguen con su clave por entrega; las no intentadas salen en lote dentro de su tramo con una
      clave nueva, que nunca se usó y cuyo antecesor recibió `4xx`. Los demás tramos conservan su clave.
    - Resultado desconocido (red/timeout/`5xx` tras aceptar Resend): tramo intacto, misma clave, Resend devuelve la
      respuesta original.
    - `409 invalid_idempotent_request`: el tramo pasa entero a `failed`; los demás no cambian.
    - Agotamiento de los 5 intentos: estado final. Reprocesar a mano reactivando juntas todas las entregas reintentables
      (Decisión 4) devuelve a cada tramo exactamente lo que tenía, con las mismas claves (dentro de las 24 h de Resend).
    - Envíos individuales: la clave por entrega no depende de ningún lote.
  - **Excepciones declaradas** (ninguna ocurre en Production por el flujo normal):
    - cambio de `EMAIL_ALLOWED_RECIPIENTS` entre intentos: solo en `allowlist` (Preview/local, en `live` todos están
      permitidos) y solo afecta al tramo de la dirección retirada;
    - reactivar a mano solo parte de las entregas: el README lo prohíbe (Decisión 4);
    - un despliegue que cambie `BATCH_SIZE`, el orden por id o la derivación de la clave con notificaciones en
      reintento: el código lo advierte en un comentario junto a `BATCH_SIZE`;
    - un proceso que siga vivo más de 10 min tras su reclamo: la Decisión 5 ya supone que no ocurre (sin `maxDuration`,
      Vercel corta antes).
  - **Limitación conocida y temporal: ventana de 24 h de Resend** (aceptada por el usuario). Resend garantiza la
    idempotency key durante 24 h. Con el cron diario de Vercel Hobby (Decisión 7) queda un caso residual: un reintento
    que solo recoja el cron puede llegar más de 24 h después del intento anterior (el cron no garantiza el minuto
    dentro de la hora, p. ej. 10:05 un día y 10:50 el siguiente), y entonces la clave estable ya no deduplica. El riesgo
    solo importa si el intento anterior tuvo un resultado desconocido del proveedor (Resend aceptó el lote y se perdió
    la respuesta): ese lote podría salir dos veces. El envío inmediato con `after()` y el drenado oportunista reducen el
    riesgo, pero no lo eliminan. En esta fase no se añade migración ni otra estrategia compleja, ni se crea otra
    enmienda para resolverlo: se cubre con el requisito operativo previo al Go-Live (ver «Entrega»).
- **Un correo por dirección:** el `UNIQUE (notification_id, email)` garantiza una entrega por correo aunque tenga
  varios pedidos.

### 6. Reintentos de fallos de Resend
- **Reintentables:** errores de red, timeout, `429` (rate limit) y `5xx`. La entrega sigue `pending` y la notificación
  vuelve a `pending` con `next_attempt_at = now() + 2^(attempts-1) minutos` (1, 2, 4 y 8 min tras los intentos 1 a 4;
  el 5.º termina en `failed`). El `attempts` de la entrega solo sube si el error vino de su envío individual; si vino
  de un lote, no cambia y el lote se repite con la misma clave (enmienda 2, Decisión 5).
- **Fallos que no son de Resend (enmienda 2):** en el `catch` posterior al reclamo (render, BD) y en el de
  `processDueEventNotifications` se usa `describeError(error)` de `lib/describeError.ts`, la convención del proyecto:
  el log es `{ notificationId, name, code? }` y `last_error` guarda `name` o `name (SQLSTATE)` (p. ej.
  `DrizzleQueryError (23505)`, `TypeError`). **Nunca** `message`, `query` ni `params`: un `DrizzleQueryError` los lleva
  en el mensaje con correos de compradores. Los errores de Resend siguen registrando `name` y `message` con las
  direcciones enmascaradas (Decisión 1).
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
  - **Pro (mejora; obligatoria antes del Go-Live real, ver «Entrega → Requisito operativo antes del Go-Live real»):**
    `"*/10 * * * *"`. Solo se cambia esa línea; ni la BD ni la lógica cambian.
- **Backoff y cron diario:** el backoff (1, 2, 4 y 8 min) define el **mínimo** antes de reintentar. Con cron diario
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
- [ ] `cancelEvent` encola una notificación `cancelled` en la misma transacción (con tests). El envío real queda
  condicionado a que una spec de reembolsos permita cancelar eventos con compradores (enmienda 1).
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

**Enmienda 1 (fase 2):**
- [ ] Dado un evento con compradores y una `update` `pending` con `attempts = 0`, cuando se guarda otro cambio menor,
  entonces se fusiona en esa fila y el evento sigue con una sola `update` (T6).
- [ ] Dada una `update` `pending` con `attempts > 0` (en reintento), cuando se guarda otro cambio menor, entonces no
  se fusiona: se crea una `update` nueva con `attempts = 0`, `send_after = now() + 10 min` y solo los cambios nuevos, y
  la fila en reintento conserva sus `changes` intactos (T6).
- [ ] Con `0012` aplicada, insertar dos `update` `pending` con `attempts = 0` del mismo evento falla con violación de
  unicidad (`23505`) sobre `event_notifications_one_pending_update_idx`; en cambio se permiten a la vez una `update`
  `pending` con `attempts = 0` y otra con `attempts ≥ 1`, o una `pending` y otra `sending`, del mismo evento (T6).
- [ ] `drizzle/0012_event_notifications_merge_index.sql` contiene exactamente el SQL de la Decisión 2 (enmienda 1),
  `_journal.json` tiene la entrada `idx: 12` con tag `0012_event_notifications_merge_index`, existe
  `drizzle/meta/0012_snapshot.json` con el `where` nuevo, y un segundo `npm run db:generate` no genera cambios (T6).
- [ ] `drizzle/0011_event_notifications.sql`, `drizzle/meta/0011_snapshot.json` y la entrada `idx: 11` del journal
  son idénticos a los del commit `699740c` (`git diff 699740c -- drizzle/0011_event_notifications.sql
  drizzle/meta/0011_snapshot.json` vacío) y el test de migraciones verifica el sha256 del `.sql` de `0011` (T6).
- [ ] Al pasar una notificación a `sent` su `last_error` queda `NULL`; una notificación que falla tras el reclamo
  (render o BD) en su 5.º intento queda `failed` con `last_error`, no en `sending`; el backoff tras los intentos 1 a 4 es
  1, 2, 4 y 8 min; cada lote usa la clave `batch-<sha256>` y las entregas con `attempts > 0` se reenvían una a una con
  su clave por entrega (T6).
- [ ] `README.md` documenta el orden de migraciones (dev/`test`: solo `0012`; Production: backup → `0011` → `0012`) y
  que una `update` en `failed` se reprocesa con `attempts = 1`; `modules/notifications/index.ts` existe y solo
  reexporta tipos (T7).

**Enmienda 2 (fase 3):**
- [ ] Dado un lote que falla con timeout/red (`statusCode: null`), `5xx` o `429`, cuando el siguiente worker reintenta
  la notificación, entonces `batch.send` recibe las mismas entregas en el mismo orden con la misma clave `batch-…`,
  `emails.send` no se llama y las entregas del lote siguen con `attempts = 0` hasta quedar `sent` (T8).
- [ ] Dado un `429` en el primero de dos lotes (150 entregas), cuando se procesa, entonces solo hay una llamada a
  `batch.send`, las 150 entregas quedan `pending` con `attempts = 0`, y en el reintento salen en 2 llamadas a
  `batch.send` (la primera con la clave del intento anterior), no en llamadas sueltas (T8).
- [ ] Dado un lote que Resend rechaza con `4xx` de validación y un envío individual que luego falla con `5xx`, cuando
  se reintenta, entonces esa entrega (`attempts = 1`) sale sola con `emails.send` y su clave por entrega, y
  `batch.send` no se vuelve a llamar (T8).
- [ ] Dado un lote que falla siempre con `5xx`, cuando se agotan los 5 intentos, entonces hubo 5 llamadas a
  `batch.send` con la misma clave y ninguna a `emails.send`, la notificación queda `failed` con `attempts = 5` y la
  entrega `failed` con `attempts = 0` y `last_error` (T8).
- [ ] Dado un lote que responde `409 invalid_idempotent_request`, cuando se procesa, entonces sus entregas quedan
  `failed` con ese `last_error`, `emails.send` no se llama y la notificación no las reintenta (T8).
- [ ] Dado un fallo tras el reclamo con un `DrizzleQueryError` cuyo SQL y `params` incluyen un correo, cuando se
  procesa, entonces `last_error` es `DrizzleQueryError (<SQLSTATE>)` (o `DrizzleQueryError` sin código) y ni
  `last_error` ni `console.error` contienen el SQL, los `params` ni el correo; un `TypeError` queda como `TypeError`
  (T8).
- [ ] Una `sending` abandonada tras el 5.º intento queda `failed` con `attempts = 6`, y el código lo explica en un
  comentario (T8).
- [ ] El SQL de README «Reprocesar una notificación `failed`» no modifica `attempts` de
  `event_notification_deliveries`, excluye también `invalid_idempotent_request`, y el README explica la regla de
  reintento de lotes, el aviso de 24 h y el caso `attempts = 6` (T9).

**Enmienda 3 (fase 4).** En estos criterios, tramo 0, 1 y 2 son los ids en las posiciones 0–99, 100–199 y 200–249 del
orden por id de todas las entregas de la notificación, y `K(tramo)` es `batchIdempotencyKey` de esos ids.
- [ ] Dadas 250 entregas y un `422` del lote del tramo 0 cuyo reenvío uno a uno corta un `429` en la 2.ª entrega,
  cuando se procesa, entonces hay 1 llamada a `batch.send` y 2 a `emails.send`; la 1.ª entrega del tramo 0 queda `sent`,
  la 2.ª `pending` con `attempts = 1`, y las otras 98 del tramo 0 y las 150 de los tramos 1 y 2 siguen `pending` con
  `attempts = 0`. Cuando se reintenta sin errores, entonces `batch.send` se llama 3 veces: con las 98 del tramo 0, con
  el tramo 1 y clave `K(tramo 1)`, y con el tramo 2 y clave `K(tramo 2)`; `emails.send` se llama una sola vez más (la
  entrega con `attempts = 1`, con su clave por entrega), ningún lote contiene esa entrega ni la 1.ª, y las 250 quedan
  `sent` (T10).
- [ ] Dado un Resend simulado que deduplica por clave y 200 entregas, cuando el intento 1 recibe `503` sin aceptar en el
  tramo 0 y el tramo 1 se acepta con la respuesta perdida (`503`), el intento 2 recibe `422` en el tramo 0 y su reenvío
  uno a uno se corta con un `429` en la 2.ª entrega, y el intento 3 va sin errores, entonces el tramo 1 sale en el
  intento 3 con la misma clave que en el intento 1, el simulador entrega cada una de las 200 direcciones exactamente
  una vez, las 200 entregas quedan `sent` y la notificación `sent` con `attempts = 3`. Este test falla con la
  composición de la enmienda 2 (T10).
- [ ] Dadas 250 entregas y, en el tramo 0, cada una de estas secuencias —`503`, `429`, `409 invalid_idempotent_request`,
  y una caída a mitad del reenvío uno a uno (simulada dejando a mano una entrega del tramo 0 `sent` con `attempts = 1`
  y la notificación `sending` con el reclamo vencido)— seguida de un intento sin errores, entonces toda llamada a
  `batch.send` con entregas de los tramos 1 o 2 usa `K(tramo 1)` o `K(tramo 2)` con exactamente esas entregas; el
  tramo 0 repite `K(tramo 0)`, salvo tras la caída, en que sale una vez con la clave de sus 99 restantes (T10).
- [ ] Los tests de lotes existentes (5 intentos con la misma clave, `429` en el primero de dos lotes, `422` + `500`
  individual, `409`, `5xx` que sigue con el siguiente lote) pasan sin cambiar sus expectativas (T10).
- [ ] Un `409 invalid_idempotent_request` en un lote sigue sin reenviarse: el lote queda resuelto con sus entregas
  `failed` (decisión de la enmienda 2, sin cambios en la fase 4) (T10).
- [ ] La fase 4 solo modifica `modules/notifications/services/eventNotificationProcessor.service.ts` y su `.test.ts`:
  `0011` y `0012` no cambian, no existe `drizzle/0013_*` y `git diff -- drizzle/` sigue vacío respecto al inicio de la
  fase 4 (T10).

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

**Enmienda 1 (T6; los tests con BD necesitan `0012` aplicada en Neon `test`):**
- `eventNotificationOutbox.service.test.ts`: fusión con `attempts = 0`; con una `update` `pending` y `attempts = 1`
  se crea una fila nueva y la vieja no cambia; índice nuevo: dos inserciones fusionables del mismo evento → `23505`,
  `attempts = 0` + `attempts = 1` → ambas se insertan, `pending` + `sending` → ambas se insertan.
- `eventNotificationProcessor.service.test.ts`: `last_error = NULL` al quedar `sent`; fallo tras el reclamo en el 5.º
  intento → `failed`; `next_attempt_at` a 1, 2, 4 y 8 min tras los intentos 1 a 4; clave del lote estable para las
  mismas entregas; entregas con `attempts > 0` enviadas con `emails.send` y clave por entrega.
- `lib/db/migrations.test.ts` (sin BD): el sha256 de `0011_event_notifications.sql`, normalizando `\r\n` a `\n`, es
  `3999b4ebf351f5f2c9a6f6516f2df194a91ce334018c4721761922c5ddf17715`; `0012_event_notifications_merge_index.sql`
  contiene el `DROP INDEX` y el `CREATE UNIQUE INDEX … AND "event_notifications"."attempts" = 0` de la Decisión 2 (la
  regla aditiva y el orden del journal ya los cubren los tests existentes).
- No requieren test: `index.ts` (solo reexporta tipos) y `README.md` (T7).

**Enmienda 2 (T8; con BD de test, sin migraciones nuevas), en `eventNotificationProcessor.service.test.ts`:**
- Se ajustan los tests existentes que asumían la regla de la enmienda 1:
  - «congela los destinatarios…»: tras un `500` del lote, la entrega queda `pending` con `attempts = 0`; el
    reintento llama a `batch.send` con la misma clave que la primera vez (no a `emails.send`), sin el comprador nuevo;
  - «un 429 corta el envío»: las 150 entregas quedan con `attempts = 0`;
  - «backoff 1, 2, 4 y 8 min…»: 5 llamadas a `batch.send` con la misma clave, `emails.send` sin llamar, entrega final
    `failed` con `attempts = 0`;
  - «un fallo tras el reclamo…»: `last_error` exactamente `TypeError`.
- Casos nuevos:
  - `it.each` con timeout/red (`batch.send` rechaza), `503` y `429` en el lote: el reintento repite el lote con la
    misma clave y `emails.send` no se llama;
  - `429` en el primero de dos lotes: el reintento hace 2 llamadas a `batch.send`, la primera con la clave anterior;
  - `422` en el lote, luego `500` en un envío individual: el reintento envía solo esa entrega con `emails.send` y su
    clave por entrega, sin `batch.send`;
  - `409 invalid_idempotent_request` en el lote: entregas `failed`, sin `emails.send`, notificación `sent` (no quedan
    `pending`);
  - `DrizzleQueryError` tras el reclamo (p. ej. `vi.spyOn(db, "execute").mockRejectedValueOnce(new
    DrizzleQueryError("INSERT … ana@example.com", ["ana@example.com"], Object.assign(new Error("x"), { code: "23505" })))`
    para que falle `freezeRecipients`): `last_error = "DrizzleQueryError (23505)"`, y ni la fila ni
    `console.error` contienen `INSERT` ni `ana@example.com`;
  - `sending` abandonada tras el 5.º intento: `failed` con `attempts = 6` (se amplía el test existente).
- `isRetryableSendError`: `409 invalid_idempotent_request` → no reintentable (ya lo es; se añade la fila).
- No requiere test: `README.md` (T9); el reviewer comprueba a mano que su SQL no asigna `attempts` en
  `event_notification_deliveries`.

**Enmienda 3 (T10; con BD de test, sin migraciones nuevas), en `eventNotificationProcessor.service.test.ts`:**
- Helper del test para los tramos: los ids de las entregas de la notificación ordenados por `id` en SQL
  (`orderBy(eventNotificationDeliveries.id)`), no en JS, para que coincida con el orden del procesador.
- Helper del test «Resend con idempotencia» (no es código de producción): `batch.send` y `emails.send` mockeados
  sobre un `Map<idempotencyKey, respuesta>`. Con una clave ya aceptada devuelven la respuesta guardada sin entregar
  nada; si no, siguen el guion de la llamada: aceptar (añaden cada `to` a `delivered` y guardan la respuesta), aceptar
  y perder la respuesta (entregan, guardan el éxito y devuelven `503`) o rechazar (`503`, `422`, `429`: ni entregan ni
  guardan).
- Casos nuevos:
  - `422` en el tramo 0 + `429` en la 2.ª entrega del reenvío uno a uno, con 250 entregas: estado tras el intento 1 y
    llamadas del reintento según el primer criterio de la enmienda 3;
  - resultado desconocido en el tramo 1 + esa secuencia en el tramo 0, con 200 entregas y el helper con idempotencia:
    cada dirección en `delivered` exactamente una vez, misma clave del tramo 1 en los intentos 1 y 3;
  - `it.each` con `503`, `429`, `409 invalid_idempotent_request` y caída a mitad del reenvío uno a uno en el tramo 0
    (250 entregas): las claves de los tramos 1 y 2 son siempre `K(tramo 1)` y `K(tramo 2)` con las mismas entregas.
- Los tests existentes no cambian sus expectativas: sin reenvíos parciales, los tramos fijos coinciden con los lotes de
  la enmienda 2. El de agotamiento ya prueba 5 llamadas con la misma clave.
- No requiere cambios: `README.md`. Lo que documenta (lotes de hasta 100, misma clave en reintentos, reenvío uno a uno
  tras un `4xx`, reactivar juntas todas las entregas reintentables) sigue siendo cierto.

## Entrega: flujo de promoción y sincronización

> **Requisito operativo antes del Go-Live real (obligatorio).** ANTES de habilitar pagos live u operar con usuarios
> reales, el procesador de notificaciones debe ejecutarse con una frecuencia claramente inferior a 24 h. Objetivo
> recomendado: cron cada 10 minutos (`"*/10 * * * *"` en `vercel.json`) en Vercel Pro, o un scheduler equivalente con
> frecuencia inferior a 24 h. Motivo: la limitación de la ventana de 24 h de Resend (Decisión 5). Mientras Production
> siga en etapa de prueba y con Stripe TEST, el cron diario de Hobby y esa limitación quedan aceptados.

1. Rama `claude/event-change-notifications` desde `origin/main` (después de `event-editing` y
   `organizer-manual-venue`).
2. Validación local con `.env.local` en `allowlist`.
3. `npx vitest run` + `npm run lint` + `npm run build`.
4. **Migraciones `0011` (dos tablas y tres enums nuevos) y `0012` (rehace el índice parcial de `event_notifications`):**
   dev y Neon `test` ya tienen `0011` aplicada, así que solo se les aplica `0012` con `npm run db:migrate` (primero dev,
   luego Neon `test`, antes de correr los tests con BD de T6). `0011` no se edita ni se vuelve a aplicar.
5. Publicar `preview/event-change-notifications` = `origin/main` + solo esta feature.
6. Validación manual en Preview con una compra de prueba a un correo de la allowlist: cambio de hora (inmediato),
   cancelación, cambios menores agrupados, y comprobación de que un correo fuera de la allowlist no recibe nada.
7. Sin merge sin la aprobación de Ronald.
8. Antes de Production (que sigue en `0010` hasta este paso): declarar el cambio de BD (migraciones `0011` y `0012`,
   solo objetos de las tablas nuevas); en este orden: **(a)** branch de backup de Neon `production`; **(b)** `0011`;
   **(c)** `0012` (`npm run db:migrate` aplica ambas en orden del journal; comprobar en `__drizzle_migrations` que
   quedan las dos y en `pg_indexes` que el índice tiene el predicado con `attempts = 0`); verificar `RESEND_API_KEY`, `EMAIL_FROM`,
   `EMAIL_DELIVERY_MODE=live` y `CRON_SECRET` en Production.
9. Merge tras Preview aprobado y migración aplicada. 10. Production Ready.
11. Smoke test: cambiar la hora de un evento de prueba con una compra propia y recibir el correo; ver la entrega
    `sent` con `provider_message_id`.
12. Borrar ramas temporales y sincronizar `preview/qa`.

Sincronización: Preview = `origin/main` + esta feature; Neon `test` ≥ migraciones de `production`; nunca Neon
`production` como BD de Preview.

## Plan de tareas
### Fase 1 (hecha, hasta `6d31b6a`)
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

### Fase 2 — Enmienda 1 (2 tareas, 11 archivos)
- [x] T6 — Índice fusionable, migración `0012` y ajustes de servicios (+ tests) · archivos:
  `lib/db/schema/notifications.ts` (M: `where` con `attempts = 0`), `drizzle/0012_event_notifications_merge_index.sql`
  (nuevo, generado), `drizzle/meta/0012_snapshot.json` (nuevo, generado), `drizzle/meta/_journal.json` (M, generado),
  `lib/db/migrations.test.ts` (M: sha256 de `0011` y contenido de `0012`),
  `modules/notifications/services/eventNotificationOutbox.service.ts` (+ `.test.ts`) (M: fusión solo con
  `attempts = 0`), `modules/notifications/services/eventNotificationProcessor.service.ts` (+ `.test.ts`) (M: limpiar
  `last_error` al pasar a `sent`, `failed` al superar 5 intentos tras el reclamo, backoff 1/2/4/8, idempotencia por lote
  + por entrega con reenvío uno a uno de las entregas con `attempts > 0`) · prohibido tocar
  `drizzle/0011_event_notifications.sql` y `drizzle/meta/0011_snapshot.json` · generar con
  `npm run db:generate -- --name event_notifications_merge_index` y comprobar que un segundo `db:generate` no genera
  nada · aplicar `0012` solo en dev y Neon `test` (`npm run db:migrate`), nunca en `production` · depende de: Fase 1 ·
  secuencial (toca `lib/` y `drizzle/`).
- [x] T7 — Documentación y API pública del módulo · archivos: `README.md` (M, sección de notificaciones: orden de
  migraciones —dev/`test` solo `0012`; Production backup → `0011` → `0012`— y, en «Reprocesar una notificación
  `failed`», la regla firme de que una `update` se vuelve a `pending` con `attempts = 1`, nunca `0`, con el motivo de
  la Decisión 4 y la nota de que le quedan 4 intentos), `modules/notifications/index.ts` (nuevo, porque
  `docs/SETUP.md` §1 regla 4 exige que cada módulo exponga su API pública mediante `index.ts`, y hoy el módulo solo
  tiene `server.ts`; `index.ts` reexporta **solo tipos**
  —`EnqueueEventNotificationInput`, `EventChange`, `EventNotificationKind`— con `export type`, para no arrastrar
  `server-only` a quien importe el barrel; las funciones siguen en `server.ts` y los imports existentes no cambian) ·
  depende de: — · **paralelo con T6** (archivos disjuntos y ninguna depende de la otra; T6 no toca `index.ts` ni
  `README.md`, T7 no toca `lib/` ni `drizzle/`).

El módulo no tiene README propio: la documentación de T5 vive en `README.md` de la raíz y T7 la amplía allí (no se
crea `modules/notifications/README.md`).

### Fase 3 — Enmienda 2 (2 tareas, 3 archivos)
Sin migraciones: `0011` y `0012` no cambian. Depende de la Fase 2 (T6 y T7), sobre la que se aplica.
- [x] T8 — Reintento de lotes con la misma clave y errores sin datos sensibles (+ tests) · archivos:
  `modules/notifications/services/eventNotificationProcessor.service.ts` (M), su `.test.ts` (M) · cambios:
  - `sendLots`: ante un error reintentable de un lote, las entregas siguen `pending` con `attempts` sin cambios y solo
    se guarda `last_error`;
  - `invalid_idempotent_request` en un lote → sus entregas `failed`, sin fallback uno a uno;
  - el fallback `4xx` y el envío uno a uno de `attempts > 0` no cambian;
  - `markFailedAttempt` (o una variante) admite no sumar `attempts`;
  - los `catch` de `processEventNotification` y `processDueEventNotifications` usan `describeError` para el log y para
    `last_error`;
  - comentario de `attempts = 6` en la rama `attempts > MAX_ATTEMPTS`;
  - actualizar el comentario de `sendLots`.
  · depende de: T6 · paralelo con T9.
- [x] T9 — README · archivos: `README.md` (M, sección de notificaciones) · cambios:
  - «Cómo funciona» punto 5: regla de reintento de lotes (misma clave, sin llamadas sueltas) y que
    `invalid_idempotent_request` no se reenvía;
  - en «Reprocesar una notificación `failed`», el `UPDATE event_notification_deliveries` solo cambia `status`,
    `last_error` y `updated_at` (sin `attempts`) y excluye también `invalid_idempotent_request%`;
  - nota: reactivar juntas todas las entregas reintentables y aviso de que Resend solo deduplica 24 h;
  - nota de que una `sending` abandonada tras el 5.º intento queda `failed` con `attempts = 6`.
  · depende de: T7 · **paralelo con T8** (archivos disjuntos; T9 documenta la regla de la spec, no el código).

### Fase 4 — Enmienda 3 (1 tarea, 2 archivos)
Una sola tarea (T10) sobre dos archivos: `modules/notifications/services/eventNotificationProcessor.service.ts` y su
`.test.ts`. Sin migraciones: no se modifican `0011` ni `0012`, no se crea `0013` y `git diff -- drizzle/` debe seguir
vacío; tampoco cambian `lib/`, el schema ni `README.md`. Depende de la Fase 3. El retoque en modo build que tocaba el
mismo archivo (quitar el helper `asError` del procesador y ajustar `README.md`) ya terminó y está aprobado: no bloquea.
- [x] T10 — Tramos fijos de 100 sobre las entregas congeladas (+ tests) · archivos:
  `modules/notifications/services/eventNotificationProcessor.service.ts` (M), su `.test.ts` (M) · cambios:
  - `send`: la consulta de entregas carga todas las de la notificación (sin filtrar por `status`, incluyendo `status`),
    ordenadas por id; la allowlist sigue marcando `failed` solo las `pending` no permitidas;
  - `sendLots`: recorre tramos fijos de `BATCH_SIZE` sobre esa lista completa. De cada tramo envía en lote solo las
    `pending` permitidas con `attempts = 0`; si no hay ninguna, no llama. El resto no cambia: errores reintentables,
    `409`, fallback `4xx`, corte por `429` y envío uno a uno de las `attempts > 0` al final, filtradas con el estado
    leído al inicio del intento como hoy, así que lo que el fallback resolvió en este intento no se reenvía en él;
  - sin cambios en `markSent`, `markFailedAttempt`, `batchIdempotencyKey`, `deliveryIdempotencyKey` ni en la semántica
    de `attempts` (Decisión 4);
  - comentario junto a `BATCH_SIZE`: cambiarlo, o cambiar el orden por id o la derivación de la clave, con
    notificaciones en reintento cambia las claves de sus lotes; hay que drenarlas antes;
  - actualizar el comentario de `sendLots` (tramos fijos y por qué);
  - tests de «Tests → Enmienda 3».
  · prohibido tocar `drizzle/` (ni `0011`, ni `0012`, ni `0013` nuevo) y cualquier otro archivo · depende de: Fase 3
  (retoque en modo build de `asError`/`README.md`: cumplido) · secuencial (única tarea de la fase).

## Preguntas abiertas
Ninguna.
