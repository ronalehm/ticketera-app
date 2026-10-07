# next-js-template

Plantilla base para los proyectos de Ronald: Next.js 16 con una estructura modular por dominio y un flujo de desarrollo con agentes de Claude Code basado en **SDD (Spec Driven Development)**, con aprobación humana obligatoria.

## Stack

| Área | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict |
| Estilos | Tailwind CSS v4 (tema en `app/globals.css`, sin `tailwind.config`) |
| UI | shadcn/ui (estilo `base-nova`, sobre Base UI) + `lucide-react` |
| Datos | axios, TanStack Query, TanStack Table |
| Validación y estado | zod, zustand |
| Tests | Vitest + Testing Library (jsdom) |

Requisitos: Node 22 o superior y npm.

## Inicio rápido

```sh
git clone https://github.com/ronalehm/next-js-template.git mi-proyecto
cd mi-proyecto
npm install
npm run dev        # http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (también hace la comprobación de tipos completa) |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm test` | Vitest en modo watch |
| `npx vitest run [ruta]` | Ejecuta los tests una vez (todo, un módulo o un archivo) |
| `npx shadcn@latest add <componente>` | Añade un componente de shadcn/ui a `components/ui/` |

## Base de datos

Postgres con Drizzle. La conexión sale de `DATABASE_URL` (y `DATABASE_URL_UNPOOLED` para migrar y sembrar) en `.env`.

| Comando | Qué hace |
|---|---|
| `npm run db:migrate` | Aplica solo las migraciones pendientes de `drizzle/`, cada una en su transacción. Todas son aditivas: no borran ni reescriben datos. |
| `npm run db:seed` | Crea los datos demo que faltan y actualiza solo lo que el seed posee: la geometría de los mapas, el inventario demo y el organizador y las fechas de cada evento. No borra nada y se puede repetir: una 2.ª ejecución el mismo día escribe 0 filas (otro día solo desplaza las fechas, salvo las de un evento con ventas activas —órdenes pagadas, parcialmente reembolsadas o pendientes vigentes—, que conserva su fecha). Al terminar imprime un informe por tabla (filas escritas, lugares retirados, lugares obsoletos con venta real, que no se tocan, y eventos que conservaron su fecha por tener ventas). |
| `npm run db:reset-demo` | **Destructivo.** Borra todas las ventas y deja la BD como un seed limpio. Exige `ALLOW_DEMO_RESET=true` y `--confirm=<host>`; ver [Reset de datos demo](#reset-de-datos-demo). |
| `npm run db:generate -- --name <nombre>` | Genera una migración nueva a partir de los cambios en `lib/db/schema/`. |

**En producción** el procedimiento es solo este, **sin vaciar la BD**:

```sh
npm run db:migrate && npm run db:seed
```

- El inventario no se borra: los lugares demo que el layout ya no tiene se **retiran** (`event_seats.retired_at`), conservan su historial y dejan de venderse y contarse.
- El seed nunca toca un lugar vendido o retenido (con pedido), ni los datos de negocio (títulos, precios, pedidos), ni el perfil ni el `clerk_id` de un usuario que ya existe.

**Qué siembra** (`lib/db/seed/`; variables en `.env`, solo para los scripts del seed, no para la app):

| Variable | Qué es |
|---|---|
| `SUPER_ADMIN_EMAIL` | Correo del `super_admin`. Nunca puede estar en `SEED_ORGANIZER_EMAILS`: el seed aborta sin escribir nada y nunca lo degrada a organizador. |
| `SEED_ORGANIZER_EMAILS` | Organizadores reales de prueba, separados por comas (al menos uno). Cada correo pasa a `users` con rol `organizer` (sin `clerk_id`: se vincula en su primer login) y a `organizers` `approved` con datos fiscales demo. Si el correo ya es `admin` o `super_admin`, el seed aborta sin escribir nada. |

- Cada evento demo se asigna a un organizador de `SEED_ORGANIZER_EMAILS` por un hash de su slug (siempre el mismo reparto).
- Las fechas se calculan a partir del día en que se ejecuta: el primer evento queda 7 días después, conservando la hora y la distancia entre eventos del mock. Todas son futuras.
- Todo el inventario que crea queda disponible y no crea órdenes.
- El seed respeta el estado que un admin puso a un organizador: si un correo de `SEED_ORGANIZER_EMAILS` ya tiene su fila en `organizers` como `pending` o `suspended`, no lo vuelve a aprobar (solo crea `approved` la fila que falta). Aun así le reparte eventos, y el informe final lo avisa con su correo y su estado.

**Regla para migraciones nuevas:**

- se generan con `npm run db:generate -- --name <nombre>`; las ya publicadas en `main` no se editan;
- son **aditivas**: `CREATE`, `ADD COLUMN` nula o con `DEFAULT`, `ADD CONSTRAINT`, índices, `DROP NOT NULL`, y `DROP CONSTRAINT` solo si la misma migración la vuelve a crear;
- no llevan `DROP TABLE/COLUMN/TYPE/SCHEMA/EXTENSION/SEQUENCE/VIEW`, `TRUNCATE`, `DELETE`, `UPDATE`, `RENAME` ni `ALTER COLUMN … TYPE`;
- si una restricción nueva no la cumplieran los datos existentes, la migración falla entera (transacción) y no destruye nada.

`lib/db/migrations.test.ts` comprueba esta regla en cada `drizzle/*.sql`. Única excepción revisada, registrada en su `ALLOWED_VIOLATIONS`: `0006_orders_reservation.sql` lleva un `UPDATE` que solo rellena `orders.ticket_count` (la columna que crea esa misma migración) con el número de asientos de cada orden, antes de su `SET NOT NULL`; no toca ninguna otra columna.

## Reset de datos demo

`npm run db:reset-demo` deja la BD como recién sembrada, **sin ventas**. Es lo único que borra datos: `db:seed`, `db:migrate`, la instalación y el build nunca lo ejecutan.

En una sola transacción (si algo falla no cambia nada):

1. libera el inventario de los eventos que **no** son del seed (p. ej. los creados en el panel): todos sus lugares pasan a `available`, sin pedido ni retención, y el evento conserva su inventario;
2. vacía `check_in_scans`, `refund_requests`, `tickets`, `refunds`, `orders`, `payouts` y `stripe_events`, borra el `event_seats` de los eventos del seed y reinicia `order_code_seq` (la próxima orden vuelve a `TK-1`);
3. ejecuta el seed: regenera el inventario disponible de sus eventos y los reasigna a `SEED_ORGANIZER_EMAILS`;
4. borra los organizadores sintéticos `@example.com` de seeds anteriores (los que creó el seed, sin `clerk_id`) que ya nada referencia. Si otra fila sigue apuntando a uno (p. ej. un evento guardado, un registro de auditoría o una solicitud), lo conserva en vez de abortar el reset.

Conserva a los usuarios con `clerk_id` y al super admin. Si un consentimiento o un reclamo apunta a una orden, aborta sin tocar nada (son registros legales).

**Orden exacto:**

```sh
npm run db:migrate
ALLOW_DEMO_RESET=true npm run db:reset-demo -- --confirm=<host de la BD>
```

y listo: no hace falta un `db:seed` después (el reset ya lo ejecuta). `npm run db:seed` solo **no borra** ventas ni organizadores sintéticos.

- `<host de la BD>` es el host de `DATABASE_URL_UNPOOLED` (o de `DATABASE_URL` si no hay), sin usuario, puerto ni base de datos: p. ej. `ep-cool-name-123.us-east-2.aws.neon.tech` o `127.0.0.1`. Si no coincide, o falta `ALLOW_DEMO_RESET=true`, el comando aborta sin conectarse.
- Necesita `SUPER_ADMIN_EMAIL` y `SEED_ORGANIZER_EMAILS` en `.env`, como `db:seed`. `ALLOW_DEMO_RESET` va en la misma línea del comando, no en `.env`.
- Al terminar imprime las filas borradas por tabla, los lugares liberados y los eventos que no son del seed a los que pertenecen, lo que escribió el seed, los organizadores sintéticos borrados y los conservados por estar referenciados.

## URL de la app (`APP_URL`)

`APP_URL` es obligatoria y solo de servidor (`lib/env.ts`): sin ella la app no arranca. Es la URL pública de la app, `http(s)` y sin query; la barra final se quita sola. Con ella se construyen las URLs absolutas que salen del servidor, como el enlace de las invitaciones de Clerk que envía `/admin/usuarios` (`<APP_URL>/registro`).

| Entorno | Valor |
|---|---|
| Local | `http://localhost:3000` |
| Preview (Vercel) | La URL de la rama del despliegue |
| Producción (Vercel) | `https://ticketera-app-x6xq.vercel.app` |

En Vercel se define en Project Settings → Environment Variables (Production y Preview) antes de desplegar: el build valida el entorno.

Las invitaciones enviadas desde el Dashboard de Clerk (sin `redirectUrl`) siguen cayendo en el Account Portal (`*.accounts.dev`); para ellas, en el Clerk Dashboard → Paths → Sign-up, elige el dominio de la app con `/registro`.

## Pagos con Stripe (modo test)

La app solo acepta claves de **test** de Stripe y no arranca sin ellas (`lib/env.ts` las valida). Cópialas de [Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys) a `.env`:

| Variable | Valor |
|---|---|
| `STRIPE_SECRET_KEY` | Clave secreta `sk_test_…` (solo servidor, `lib/stripe.ts`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave publicable `pk_test_…` (Payment Element en el navegador) |
| `STRIPE_WEBHOOK_SECRET` | Secreto `whsec_…` que imprime `stripe listen` (ver abajo) |

Para recibir los webhooks en local, con el [Stripe CLI](https://docs.stripe.com/stripe-cli):

```sh
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # imprime whsec_… → cópialo a STRIPE_WEBHOOK_SECRET
npm run dev
```

Deja `stripe listen` abierto mientras pruebas: sin él, el pago se aprueba pero las entradas no se emiten hasta que Stripe reenvía el evento.

Tarjetas de prueba (cualquier fecha futura y cualquier CVC):

| Tarjeta | Resultado |
|---|---|
| `4242 4242 4242 4242` | Aprobada |
| `4000 0000 0000 0002` | Rechazada |
| `4000 0000 0000 9995` | Fondos insuficientes |
| `4000 0025 0000 3155` | Pide autenticación 3D Secure |

## Correo a compradores (Resend)

Cuando se edita un evento **publicado** con compradores (órdenes `paid` o `partially_refunded`) o se cancela, la app avisa por correo a cada dirección distinta, una sola vez (spec `event-change-notifications`). El código vive en `modules/notifications`.

### Configuración

Variables solo de servidor, validadas en `lib/env.ts` y documentadas en `.env.example` (nunca con prefijo `NEXT_PUBLIC_`; la clave nunca va en logs, issues ni documentación):

| Variable | Production | Preview | Local (`.env.local`) |
|---|---|---|---|
| `RESEND_API_KEY` | Clave de Production (Sensitive) | Otra clave, distinta de Production (Sensitive) | Clave de prueba/Preview |
| `EMAIL_FROM` | `Nombre <correo@dominio verificado>` | Igual | Igual |
| `EMAIL_DELIVERY_MODE` | `live` | `allowlist` | `allowlist` |
| `EMAIL_ALLOWED_RECIPIENTS` | — | Correos de prueba, separados por comas | Solo tu correo de prueba |
| `CRON_SECRET` | ≥ 16 caracteres aleatorios | Opcional | Opcional |

- **Modos:** `live` solo tiene efecto si además `VERCEL_ENV=production`; en cualquier otro entorno se fuerza `allowlist` aunque diga `live`. En `allowlist`, los destinatarios fuera de la lista no reciben nada: su entrega queda `failed` con `omitido por allowlist`, sin llamar a Resend.
- **Sin `RESEND_API_KEY` o sin `EMAIL_FROM`:** la app funciona igual; las notificaciones se encolan y quedan `pending` (se registra un aviso) hasta que haya clave.

### Migraciones: orden de aplicación

`0011_event_notifications` crea las dos tablas y los tres enums; `0012_event_notifications_merge_index` rehace el índice parcial para que solo cuente las `update` `pending` con `attempts = 0`. `0011` no se edita ni se vuelve a aplicar.

- **Dev y Neon `test`:** ya tienen `0011`; solo se les aplica `0012` con `npm run db:migrate` (primero dev, luego `test`).
- **Production:** en este orden: **(1)** branch de backup de Neon `production`; **(2)** `0011`; **(3)** `0012`. `npm run db:migrate` aplica ambas en el orden del journal. Después comprueba que las dos están en `__drizzle_migrations` y que en `pg_indexes` el índice `event_notifications_one_pending_update_idx` tiene el predicado con `attempts = 0`.

### Cómo funciona

1. **Outbox en la misma transacción.** Al guardar el evento, su servicio (`updateEvent` / `cancelEvent`) escribe una fila en `event_notifications` dentro de la misma transacción: si falla una de las dos cosas, no se guarda ninguna. Borradores y eventos en revisión no avisan (no tienen compradores).
2. **Tipos:**
   - `schedule`: cambió el inicio o la apertura de puertas. Sale **ya**. Si en el mismo guardado cambiaron también otros campos, van en ese mismo correo.
   - `cancelled`: el evento se canceló. Sale **ya**.
   - `update`: cualquier otro cambio (nombre, descripción, portada, categoría, edad, nombre o precio de un tipo de entrada). Espera **10 minutos** y los cambios de ese intervalo se fusionan en un solo correo (primer «antes», último «después»).
3. **Envío inmediato con `after()`.** Tras responder al usuario, la acción procesa la notificación `schedule`/`cancelled` y, de paso, hasta 5 notificaciones vencidas de cualquier evento (drenado oportunista). No depende del cron.
4. **Cron.** `GET /api/cron/event-notifications`, protegido con `Authorization: Bearer <CRON_SECRET>` (401 sin él o sin `CRON_SECRET` configurado), procesa en lotes las `pending` vencidas (agrupadas y reintentos) y libera las `sending` con el reclamo vencido (más de 10 minutos). Vercel solo ejecuta crons en el despliegue de Production.
5. **Reintentos.** Red, timeout, `429` y `5xx` se reintentan con backoff (1, 2, 4, 8 min como mínimo) hasta 5 intentos; un `4xx` de validación marca esa entrega `failed` sin reintento. Al quinto intento fallido la notificación queda `failed`. Una entrega `sent` nunca se reenvía y cada envío lleva una clave de idempotencia de Resend.
   - **Lotes:** las entregas `pending` con `attempts = 0` salen en lotes de 100 (`batch.send`, clave `batch-<sha256 de sus ids>`); las de `attempts > 0` (ya intentadas una a una) salen una a una con `emails.send` y su clave por entrega.
   - **Error reintentable de un lote** (red/timeout, `429`, `5xx`): sus entregas siguen `pending` con `attempts` sin cambios y el siguiente intento repite **el mismo lote con la misma clave**, sin llamadas sueltas a `emails.send`; si Resend lo había aceptado, devuelve la respuesta original y nadie recibe el correo dos veces. Un `429` corta el intento.
   - **`4xx` de validación de un lote:** no salió nada; se reenvía correo a correo con la clave por entrega y solo la dirección inválida queda `failed`.
   - **`409 invalid_idempotent_request`** (misma clave con otro contenido, p. ej. cambió el título durante el backoff): el envío original pudo haber salido, así que esas entregas quedan `failed` y **no** se reenvían con otra clave.
   - El límite de 5 lo marca solo `event_notifications.attempts`; al agotarlo, las entregas aún `pending` pasan a `failed`.
   - Una `sending` abandonada tras el 5.º intento queda `failed` con `attempts = 6`: el reclamo que la libera cuenta un intento más y solo la cierra, sin enviar nada. Es lo esperado.

### Frecuencia del cron: Hobby y Pro

La frecuencia es solo configuración de `vercel.json` → `crons`; ni la BD ni el código dependen de ella.

| Plan | `schedule` | Consecuencia |
|---|---|---|
| Hobby (actual) | `"0 10 * * *"` (05:00 hora de Lima, una vez al día; Vercel no garantiza el minuto) | Fecha y cancelación salen al momento con `after()`. En el peor caso, un cambio agrupado o un reintento sale al día siguiente, salvo que antes lo recoja el drenado de otra acción. |
| Pro | `"*/10 * * * *"` | Agrupados y reintentos salen en ≤ 10 minutos. |

Para pasar a Pro basta con cambiar esa línea de `vercel.json` y desplegar.

Para ejecutarlo a mano (p. ej. en Preview, donde Vercel no lo lanza), con el `CRON_SECRET` de ese entorno en una variable de tu terminal (no lo pegues en chats ni issues):

```sh
curl -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/event-notifications   # → {"processed": N}
```

### Reprocesar una notificación `failed`

Una notificación queda `failed` al agotar 5 intentos con entregas aún pendientes (p. ej. Resend caído o una clave mal configurada). Corrige primero la causa (`last_error`) y después, en la consola SQL de Neon de esa rama:

```sql
-- 1. Localizarla y ver por qué falló.
SELECT id, event_id, kind, attempts, last_error, updated_at
FROM event_notifications WHERE status = 'failed' ORDER BY updated_at DESC;

SELECT status, last_error, count(*)
FROM event_notification_deliveries WHERE notification_id = '<id>' GROUP BY status, last_error;

-- 2. Volver a dejarla pendiente. Todas las entregas `failed` por un error reintentable, juntas: las `sent` nunca se
--    reenvían, y no reactives las omitidas por la allowlist, los 4xx permanentes por entrega (`validation_error`,
--    `invalid_parameter`, `missing_required_field`) ni las de `invalid_idempotent_request` (pudieron haber salido).
--    Las entregas conservan su `attempts`: no lo toques.
--    Ajusta el filtro a lo que viste en el paso 1, pero solo para excluir más errores permanentes: nunca reactives
--    solo una parte de las entregas reintentables.
BEGIN;
UPDATE event_notification_deliveries
SET status = 'pending', last_error = NULL, updated_at = now()
WHERE notification_id = '<id>' AND status = 'failed'
  AND last_error IS DISTINCT FROM 'omitido por allowlist'
  AND last_error NOT LIKE 'validation_error%'
  AND last_error NOT LIKE 'invalid_parameter%'
  AND last_error NOT LIKE 'missing_required_field%'
  AND last_error NOT LIKE 'invalid_idempotent_request%';
UPDATE event_notifications
SET status = 'pending',
    attempts = CASE WHEN kind = 'update' THEN 1 ELSE 0 END,   -- `update`: siempre 1, nunca 0 (ver abajo)
    next_attempt_at = NULL, locked_at = NULL, last_error = NULL, updated_at = now()
WHERE id = '<id>' AND status = 'failed';
COMMIT;
```

**Regla firme para `update`: vuelve a `pending` con `attempts = 1`, nunca `0`.** Con `attempts = 0` volvería a aceptar fusiones (los compradores con entrega `sent` no recibirían los cambios fusionados después) y el `UPDATE` chocaría con el índice parcial de `0012` si el evento ya tiene otra `update` fusionable. Con `attempts = 1` le quedan 4 intentos. `schedule` y `cancelled` se siguen reprocesando con `attempts = 0`.

**Las entregas conservan su `attempts`.** El SQL solo cambia `status`, `last_error` y `updated_at` de las entregas. Si una entrega ya intentada una a una (`attempts > 0`) volviera a `0`, saldría dentro de un lote con otra clave y, si Resend había aceptado su envío individual, el comprador lo recibiría dos veces.

**Reactiva juntas todas las entregas reintentables** de la notificación, no solo una parte: así los lotes se recomponen con las mismas entregas y repiten la misma clave de idempotencia.

**No reactives los errores permanentes por entrega.** `last_error` se guarda como `<name>: <message>` del error de Resend. Son permanentes los `4xx` de esa entrega: como mínimo `validation_error`, `invalid_parameter` y `missing_required_field`, además de `invalid_idempotent_request` (pudo haber salido) y `omitido por allowlist`. Si en el paso 1 ves otro `4xx` permanente, añade su `AND last_error NOT LIKE '<name>%'`; ajustar el filtro solo sirve para excluir errores permanentes.

**Resend solo deduplica durante 24 h.** Pasado ese plazo desde el último intento, la clave ya no protege: un lote o envío que Resend aceptó pero cuya respuesta se perdió saldría otra vez.

La recoge el siguiente worker: el cron (o su llamada manual con `curl`) o el drenado de la próxima acción que encole un aviso. Los destinatarios no se recalculan: son los que se congelaron en el primer intento.

### Limitación conocida

Hoy un evento con ventas activas no se puede cancelar (`has_sales`: «Cancelación con reembolsos: Próximamente»), así que el correo `cancelled` solo se enviará cuando se habilite cancelar con compradores; la integración ya está en `cancelEvent`.

## Estructura

```
app/              # solo rutas (App Router)
components/
  ui/             # componentes de shadcn/ui
  shared/         # componentes reutilizables entre dominios
hooks/            # hooks reutilizables entre dominios
lib/              # utilidades globales (cliente axios, utils)
modules/<dominio>/  # código de negocio: components, hooks, services, schemas, stores, types
docs/
  SETUP.md        # reglas del proyecto
  specs/          # especificaciones SDD
.claude/
  agents/         # agentes orchestrator, spec, developer, reviewer
  hooks/          # hooks de aprobación de specs
```

Las reglas completas (estructura, nombres, SOLID/DRY/KISS/YAGNI, qué lleva tests) están en [`docs/SETUP.md`](docs/SETUP.md). Léelo antes de escribir código.

## Flujo de trabajo con Claude Code

El proyecto incluye 4 agentes en `.claude/agents/`:

| Agente | Rol |
|---|---|
| `orchestrator` | Decide si el pedido es **build** (cambio pequeño y claro) o **SDD**, planifica y coordina a los demás, en paralelo cuando las tareas no comparten archivos |
| `spec` | Escribe la spec en `docs/specs/<module>-<feature>.md`, con un plan de tareas que cabe en una sesión |
| `developer` | Implementa una spec aprobada o un cambio en modo build, con sus tests |
| `reviewer` | Revisa contra la spec y `docs/SETUP.md`; devuelve observaciones hasta aprobar |

Para usarlo:

```sh
claude --agent orchestrator
```

y describe la funcionalidad que quieres.

### Aprobación de specs

Ninguna spec se implementa sin tu aprobación. Cuando el orquestador te muestre la spec, apruébala escribiendo en el chat:

```
apruebo docs/specs/<slug>.md
```

Un hook cambia la spec de `Estado: borrador` a `Estado: aprobado`, registra quién aprobó en `docs/specs/approvals.jsonl` (con una firma cuya clave se guarda en `~/.claude/spec-approval.key`) y Claude continúa con la implementación.

Bloqueos técnicos (`.claude/settings.json` y `.claude/hooks/spec-approval.mjs`):

- Solo tu mensaje en el chat puede aprobar una spec; Claude solo puede escribirlas con `Estado: borrador`.
- El agente `developer` no se lanza si la spec no está aprobada o cambió después de aprobarse.
- El `developer` no puede modificar nada en `docs/specs/`.
- Las aprobaciones son por equipo: una spec aprobada en otra máquina hay que aprobarla de nuevo en la tuya.

Tests de los hooks: `npx vitest run .claude/hooks`.

## Skills recomendadas

Plugins y skills de Claude Code que complementan esta plantilla. Los comandos con `/plugin` se escriben dentro de Claude Code; reinicia la sesión después de instalar.

| Skill | Para qué | Instalación |
|---|---|---|
| [**frontend-design**](https://github.com/anthropics/claude-plugins-official) (Anthropic) | Interfaces con diseño cuidado en vez del aspecto genérico de IA. Se activa sola al pedir pantallas o componentes. | `/plugin install frontend-design@claude-plugins-official` |
| [**ui-ux-pro-max**](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Base de datos de estilos, paletas, tipografías y guías de UX para elegir el diseño de un producto. | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill`<br>`/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` |
| [**vercel-labs/agent-skills**](https://github.com/vercel-labs/agent-skills) | Buenas prácticas de React y Next.js de Vercel (rendimiento, waterfalls, bundle, re-renders). Encaja con el stack de la plantilla. | `npx skills add vercel-labs/agent-skills` |
| [**ponytail**](https://github.com/dietrichgebert/ponytail) | Fuerza la solución más simple que funcione: YAGNI, librería estándar antes que dependencias, menos código. Refuerza KISS/YAGNI de `SETUP.md`. | `/plugin marketplace add dietrichgebert/ponytail`<br>`/plugin install ponytail@ponytail` |
| [**caveman**](https://github.com/JuliusBrussee/caveman) | Respuestas ultracompactas de Claude: menos tokens de salida sin perder precisión técnica. | `/plugin marketplace add JuliusBrussee/caveman`<br>`/plugin install caveman@caveman` |
| [**superpowers**](https://github.com/obra/superpowers) | Biblioteca de skills de ingeniería: brainstorming, planificación, TDD, depuración sistemática y revisión de código. | `/plugin marketplace add obra/superpowers-marketplace`<br>`/plugin install superpowers@superpowers-marketplace` |

Cómo combinarlas:

- **Diseño:** `ui-ux-pro-max` para decidir el estilo y `frontend-design` para construir la interfaz, siempre usando los componentes de shadcn/ui y los tokens del tema de `app/globals.css`.
- **Código:** `vercel-labs/agent-skills` para el rendimiento de React/Next y `ponytail` para no sobrediseñar.
- **superpowers** trae su propio flujo de planificación y ejecución. En este proyecto manda el flujo SDD (spec aprobada → developer → reviewer); usa sus skills de TDD y depuración dentro de ese flujo, no como sustituto.
- **caveman** es opcional: reduce el coste, pero las respuestas son muy telegráficas. Desactívalo cuando necesites explicaciones detalladas.
