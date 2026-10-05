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
| `npm run db:seed` | Crea los datos demo que faltan y actualiza solo lo que el seed posee: la geometría de los mapas, el inventario demo y el organizador y las fechas de cada evento. No borra nada y se puede repetir: una 2.ª ejecución el mismo día escribe 0 filas (otro día solo desplaza las fechas). Al terminar imprime un informe por tabla (filas escritas, lugares retirados y lugares obsoletos con venta real, que no se tocan). |
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

1. vacía `check_in_scans`, `refund_requests`, `tickets`, `refunds`, `event_seats`, `orders`, `payouts` y `stripe_events`, y reinicia `order_code_seq` (la próxima orden vuelve a `TK-1`);
2. ejecuta el seed: regenera todo el inventario disponible y reasigna los eventos a `SEED_ORGANIZER_EMAILS`;
3. borra los organizadores sintéticos `@example.com` de seeds anteriores (los que creó el seed, sin `clerk_id`) que ya nada referencia. Si otra fila sigue apuntando a uno (p. ej. un evento guardado, un registro de auditoría o una solicitud), lo conserva en vez de abortar el reset.

Conserva a los usuarios con `clerk_id` y al super admin. Si un consentimiento o un reclamo apunta a una orden, aborta sin tocar nada (son registros legales).

**Orden exacto:**

```sh
npm run db:migrate
ALLOW_DEMO_RESET=true npm run db:reset-demo -- --confirm=<host de la BD>
```

y listo: no hace falta un `db:seed` después (el reset ya lo ejecuta). `npm run db:seed` solo **no borra** ventas ni organizadores sintéticos.

- `<host de la BD>` es el host de `DATABASE_URL_UNPOOLED` (o de `DATABASE_URL` si no hay), sin usuario, puerto ni base de datos: p. ej. `ep-cool-name-123.us-east-2.aws.neon.tech` o `127.0.0.1`. Si no coincide, o falta `ALLOW_DEMO_RESET=true`, el comando aborta sin conectarse.
- Necesita `SUPER_ADMIN_EMAIL` y `SEED_ORGANIZER_EMAILS` en `.env`, como `db:seed`. `ALLOW_DEMO_RESET` va en la misma línea del comando, no en `.env`.
- Al terminar imprime las filas borradas por tabla, lo que escribió el seed, los organizadores sintéticos borrados y los conservados por estar referenciados.

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
