# Modelo de datos (MER) — Ticketera

- Fecha: 2026-10-03
- Arquitectura y flujos: [`system-design.md`](./system-design.md)
- Implementación: esquema Drizzle en `lib/db/schema/*.ts`, migraciones en `drizzle/` (fase F1).

## Convenciones

- PK `uuid` con `gen_random_uuid()`, salvo donde se indica.
- Dinero en `integer` (céntimos). Nunca `float`/`numeric` para importes.
- Fechas en `timestamptz`; se muestran en `America/Lima`.
- Enums nativos de Postgres.
- Todas las tablas tienen `created_at timestamptz NOT NULL DEFAULT now()`; las editables, `updated_at`.
- Nombres en inglés, `snake_case`, tablas en plural.
- 21 tablas.

## Diagrama

```mermaid
erDiagram
  users ||--o| organizers : "es"
  users ||--o{ audit_logs : "actúa"
  users ||--o{ orders : "compra"
  users ||--o{ event_staff : "escanea en"
  users ||--o{ consents : "otorga"

  organizers ||--o{ events : "organiza"
  organizers ||--o{ payouts : "recibe"

  venues ||--o{ venue_sections : "tiene"
  venue_sections ||--o{ venue_seats : "tiene"
  venues ||--o{ events : "aloja"
  categories ||--o{ events : "clasifica"

  events ||--o{ ticket_types : "vende"
  venue_sections ||--o{ ticket_types : "se vende como"
  events ||--o{ event_seats : "inventario"
  ticket_types ||--o{ event_seats : "agrupa"
  venue_seats |o--o{ event_seats : "instancia"
  events ||--o{ event_staff : "asigna"
  events ||--o{ orders : "recibe"
  events ||--o{ check_in_scans : "registra"
  events ||--o| payouts : "liquida"

  orders ||--o{ event_seats : "reserva"
  orders ||--o{ tickets : "emite"
  event_seats ||--o| tickets : "se vende en"
  orders ||--o{ refunds : "reembolsa"
  refunds ||--o{ tickets : "cubre"
  tickets ||--o{ check_in_scans : "escaneado"

  legal_documents ||--o{ consents : "aceptado en"
  orders ||--o{ consents : "acepta"
  users ||--o{ complaints : "registra"
  orders ||--o{ complaints : "sobre"

  users {
    uuid id PK
    text clerk_id UK
    text email UK
    user_role role
  }
  organizers {
    uuid user_id PK,FK
    text tax_id UK
    int commission_bps
    text stripe_recipient_id
  }
  venues {
    uuid id PK
    text name
    text city
  }
  venue_sections {
    uuid id PK
    uuid venue_id FK
    seating_type seating
    int capacity
  }
  venue_seats {
    uuid id PK
    uuid section_id FK
    text row_label
    int number
  }
  events {
    uuid id PK
    text slug UK
    uuid organizer_id FK
    uuid venue_id FK
    event_status status
    timestamptz starts_at
  }
  ticket_types {
    uuid id PK
    uuid event_id FK
    uuid section_id FK
    int price_cents
  }
  event_seats {
    uuid id PK
    uuid event_id FK
    uuid ticket_type_id FK
    uuid venue_seat_id FK
    seat_status status
    uuid order_id FK
    timestamptz held_until
  }
  orders {
    uuid id PK
    text code UK
    uuid event_id FK
    uuid user_id FK
    order_status status
    timestamptz expires_at
    int subtotal_cents
    int platform_fee_cents
    int organizer_amount_cents
  }
  tickets {
    uuid id PK
    uuid order_id FK
    uuid event_seat_id UK
    text qr_token UK
    ticket_status status
  }
  refunds {
    uuid id PK
    uuid order_id FK
    int amount_cents
    refund_status status
  }
  payouts {
    uuid id PK
    uuid organizer_id FK
    uuid event_id UK
    int amount_cents
    payout_status status
  }
  legal_documents {
    uuid id PK
    legal_document_kind kind
    text version
    legal_document_status status
  }
  consents {
    uuid id PK
    uuid legal_document_id FK
    uuid user_id FK
    uuid order_id FK
    bool accepted
  }
  complaints {
    uuid id PK
    text number UK
    complaint_type type
    complaint_status status
    timestamptz due_at
  }
```

Tablas sin relaciones en el diagrama: `stripe_events`, `complaint_counters`.

## Enums

| Enum | Valores |
|---|---|
| `user_role` | `customer`, `organizer`, `admin`, `super_admin` |
| `document_type` | `dni`, `ce`, `passport` |
| `tax_id_type` | `ruc`, `dni` |
| `seating_type` | `general`, `numbered` |
| `event_status` | `draft`, `published`, `cancelled`, `finished` |
| `seat_status` | `available`, `held`, `sold` |
| `order_status` | `pending`, `paid`, `expired`, `refunded`, `partially_refunded` |
| `ticket_status` | `valid`, `used`, `void`, `refunded` |
| `refund_reason` | `event_cancelled`, `customer`, `admin` |
| `refund_status` | `pending`, `succeeded`, `failed` |
| `scan_result` | `ok`, `already_used`, `invalid`, `wrong_event`, `void` |
| `payout_status` | `pending`, `paid`, `failed` |
| `legal_document_kind` | `terms`, `privacy`, `cookies`, `refunds`, `marketing`, `international_transfer` |
| `legal_document_status` | `draft`, `published` |
| `cookie_category` | `necessary`, `analytics`, `marketing` |
| `complaint_type` | `claim` (reclamo), `grievance` (queja) |
| `complaint_item_type` | `product`, `service` |
| `complaint_status` | `open`, `answered` |

## Diccionario de tablas

Columnas `created_at`/`updated_at` omitidas. `NULL` indica columna opcional; el resto es `NOT NULL`.

### Identidad

**`users`**: usuarios autenticados con Clerk. Fuente de verdad del rol.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `clerk_id` | text UNIQUE | Id de Clerk. |
| `email` | text UNIQUE | Minúsculas. Al anonimizar: `deleted+<id>@invalid`. |
| `first_name`, `last_name` | text | |
| `phone` | text NULL | `9XXXXXXXX`. |
| `document_type` | `document_type` NULL | |
| `document_number` | text NULL | Reglas de `lib/formFields` (DNI 8 dígitos, CE 9–12, pasaporte 6–12). |
| `role` | `user_role` | Default `customer`. |
| `anonymized_at` | timestamptz NULL | `user.deleted` de Clerk. |

**`organizers`**: perfil 1:1 de un usuario con rol `organizer`.

| Columna | Tipo | Notas |
|---|---|---|
| `user_id` | uuid PK → `users.id` | |
| `legal_name` | text | Razón social o nombre. |
| `tax_id_type` | `tax_id_type` | |
| `tax_id` | text UNIQUE | RUC (11) o DNI (8). |
| `commission_bps` | integer | Comisión en puntos básicos (1000 = 10%). CHECK 0–10000. La edita `super_admin`. |
| `stripe_recipient_id` | text NULL | Destinatario de Global Payouts. |
| `payouts_enabled` | boolean | Default `false`. |

**`audit_logs`**: acciones sensibles (roles, reembolsos, cancelaciones, respuestas a reclamos, documentos legales). Solo inserción.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `actor_id` | uuid → `users.id` | |
| `action` | text | P. ej. `role.changed`, `refund.created`, `event.cancelled`. |
| `target_type` | text | P. ej. `user`, `order`, `event`. |
| `target_id` | uuid | |
| `payload` | jsonb | Antes/después o parámetros. |

Índice: `(target_type, target_id)`.

### Recinto

**`venues`**: recinto reutilizable. Lo gestiona admin.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `address` | text | |
| `city` | text | |
| `lat`, `lng` | double precision NULL | Google Maps. |
| `place_id` | text NULL | Google Maps. |
| `map_view_box` | text NULL | `viewBox` del SVG del mapa (`0 0 W H`), como `venueLayoutSchema.viewBox` de `modules/seating`. |
| `stage` | jsonb NULL | `{ label, path, labelPos: { x, y } }` del escenario. |
| `created_by` | uuid → `users.id` | |

Sin geometría (`map_view_box NULL`), la UI usa la lista de zonas sin mapa.

**`venue_sections`**: zona del recinto.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `venue_id` | uuid → `venues.id` | |
| `slug` | text | kebab-case; es el `zoneId` de `modules/seating` y prefijo de los ids de asiento (`norte-F-12`). |
| `name` | text | P. ej. "Tribuna Occidente". |
| `sort_order` | integer | |
| `seating` | `seating_type` | Equivale a `kind` (`general`/`numbered`) de `venueZoneLayoutSchema`. |
| `capacity` | integer NULL | Solo `general`. |
| `map_path` | text NULL | Trazo SVG de la zona en el mapa. |
| `label_x`, `label_y` | real NULL | Posición de la etiqueta. |
| `seat_view_box` | text NULL | Solo `numbered`: `viewBox` del plano de asientos. |

Restricciones: `UNIQUE (venue_id, name)`; `UNIQUE (venue_id, slug)`; `CHECK ((seating = 'general' AND capacity > 0) OR (seating = 'numbered' AND capacity IS NULL))`.

**`venue_seats`**: asiento físico de una zona numerada.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `section_id` | uuid → `venue_sections.id` | La sección debe ser `numbered` (se valida en la app). |
| `row_label` | text | "A", "B"… (1–2 letras mayúsculas, como `seatRowLabelSchema`). |
| `number` | integer | 1–999. |
| `x`, `y` | real | Posición en el plano (`seat_view_box`). |
| `accessible` | boolean | Default `false`. Asiento para silla de ruedas (estado `accessible` del mapa actual). |

Restricción: `UNIQUE (section_id, row_label, number)`.
Id público del asiento: `<section.slug>-<row_label>-<number>` (`SEAT_ID_PATTERN` de `modules/seating`); no se guarda.

### Evento e inventario

**`categories`**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text UNIQUE | `conciertos`, `teatro`, `deportes`, `festivales`, `stand-up`, `familia` (seed). |
| `name` | text | |

**`events`**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text UNIQUE | URL `/eventos/<slug>`. |
| `organizer_id` | uuid → `organizers.user_id` | |
| `venue_id` | uuid → `venues.id` | |
| `category_id` | uuid → `categories.id` | |
| `title` | text | |
| `description` | text | |
| `image_url` | text | Cloud Storage. |
| `starts_at` | timestamptz | |
| `doors_open_at` | timestamptz | |
| `min_age` | integer | 0 = todo público. |
| `featured` | boolean | Default `false`. |
| `currency` | char(3) | Default `PEN`. |
| `status` | `event_status` | Default `draft`. |
| `cancelled_at` | timestamptz NULL | |
| `cancel_reason` | text NULL | |

Índice: `(status, starts_at)`.

**`ticket_types`**: zona en venta para un evento (precio por sección).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid → `events.id` | |
| `section_id` | uuid → `venue_sections.id` | Debe pertenecer al recinto del evento (se valida en la app). |
| `slug` | text | kebab-case; clave en la URL de compra (`/checkout?evento=…&<slug>=<qty>`), hoy `ticketTypeId`. |
| `name` | text | |
| `description` | text NULL | |
| `price_cents` | integer | CHECK `>= 0`. |
| `max_per_order` | integer | Default 6. |

Restricciones: `UNIQUE (event_id, section_id)`; `UNIQUE (event_id, slug)`.

**`event_seats`**: unidad de inventario. Al publicar el evento se genera una fila por `venue_seat` (zona numerada) o `capacity` filas con `venue_seat_id NULL` (zona general).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid → `events.id` | |
| `ticket_type_id` | uuid → `ticket_types.id` | |
| `venue_seat_id` | uuid NULL → `venue_seats.id` | `NULL` en zona general. |
| `status` | `seat_status` | Default `available`. |
| `order_id` | uuid NULL → `orders.id` | Orden que lo reserva o compró. |
| `held_until` | timestamptz NULL | Vence la reserva (expiración perezosa). |

Restricciones: `UNIQUE (event_id, venue_seat_id)`; `CHECK ((status = 'available') = (order_id IS NULL))`.
Índice: `(ticket_type_id, status)`.

Disponibles de una zona: `status = 'available' OR (status = 'held' AND held_until < now())`.

**`event_staff`**: staff de puerta por evento.

| Columna | Tipo | Notas |
|---|---|---|
| `event_id` | uuid → `events.id` | |
| `user_id` | uuid → `users.id` | |

PK: `(event_id, user_id)`.

### Venta

**`orders`**: la orden `pending` es la reserva.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `code` | text UNIQUE | `TK-` + `nextval('order_code_seq')`. |
| `event_id` | uuid → `events.id` | |
| `user_id` | uuid NULL → `users.id` | `NULL` = compra como invitado. |
| `buyer_name` | text | |
| `buyer_email` | text | |
| `buyer_phone` | text | |
| `buyer_document_type` | `document_type` | |
| `buyer_document_number` | text | |
| `status` | `order_status` | Default `pending`. |
| `expires_at` | timestamptz | `now() + 10 min` al reservar. |
| `subtotal_cents` | integer | Lo que paga el comprador. |
| `platform_fee_cents` | integer | Congelado al crear la orden. |
| `organizer_amount_cents` | integer | `subtotal − platform_fee`. CHECK de la suma. |
| `currency` | char(3) | Default `PEN`. |
| `stripe_payment_intent_id` | text UNIQUE NULL | |
| `paid_at` | timestamptz NULL | |
| `tickets_emailed_at` | timestamptz NULL | `NULL` = correo pendiente (reintento por job). |

Índices: `(user_id)`, `(event_id, status)`, `(buyer_email)`.

**`tickets`**: una entrada por asiento vendido.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `order_id` | uuid → `orders.id` | |
| `event_seat_id` | uuid UNIQUE → `event_seats.id` | Garantiza que un lugar no se vende dos veces. |
| `code` | text UNIQUE | `<code de orden>-01`. |
| `holder_name` | text | |
| `unit_price_cents` | integer | |
| `qr_token` | text UNIQUE | 128 bits aleatorios (base64url). |
| `status` | `ticket_status` | Default `valid`. |
| `refund_id` | uuid NULL → `refunds.id` | |
| `checked_in_at` | timestamptz NULL | |
| `checked_in_by` | uuid NULL → `users.id` | |

**`refunds`**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | También es la `idempotencyKey` en Stripe. |
| `order_id` | uuid → `orders.id` | |
| `amount_cents` | integer | CHECK `> 0`. |
| `reason` | `refund_reason` | |
| `status` | `refund_status` | Default `pending`. |
| `stripe_refund_id` | text UNIQUE NULL | |
| `requested_by` | uuid NULL → `users.id` | `NULL` = sistema (asiento perdido). |

Índice único parcial: `(order_id) WHERE reason = 'event_cancelled'`.

**`stripe_events`**: idempotencia de webhooks.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | text PK | `evt_…` de Stripe. |
| `type` | text | |
| `processed_at` | timestamptz | |

### Check-in y liquidación

**`check_in_scans`**: todos los intentos de escaneo, incluidos los rechazados.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid → `events.id` | |
| `ticket_id` | uuid NULL → `tickets.id` | `NULL` si el QR no existe. |
| `scanned_by` | uuid → `users.id` | |
| `result` | `scan_result` | |

Índice: `(event_id, created_at)`.

**`payouts`**: liquidación por evento (Global Payouts).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `organizer_id` | uuid → `organizers.user_id` | |
| `event_id` | uuid UNIQUE → `events.id` | Un payout por evento. |
| `amount_cents` | integer | |
| `currency` | char(3) | |
| `status` | `payout_status` | Default `pending`. |
| `stripe_payout_id` | text NULL | |
| `paid_at` | timestamptz NULL | |

### Legal

**`legal_documents`**: textos legales versionados. Publicado = inmutable.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `kind` | `legal_document_kind` | |
| `version` | text | `1.0`, `1.1`… |
| `content` | text | Markdown (render sin HTML crudo). |
| `status` | `legal_document_status` | Default `draft`. |
| `published_at` | timestamptz NULL | |
| `published_by` | uuid NULL → `users.id` | |

Restricción: `UNIQUE (kind, version)`. Vigente = última `published` por `kind`.

**`consents`**: solo inserción. Vigente = última fila por (sujeto, documento, `scope`).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `legal_document_id` | uuid → `legal_documents.id` | Versión exacta aceptada. |
| `user_id` | uuid NULL → `users.id` | |
| `order_id` | uuid NULL → `orders.id` | Compra como invitado. |
| `email` | text NULL | |
| `scope` | `cookie_category` NULL | Solo para `cookies`. |
| `accepted` | boolean | `false` = retiro. |
| `ip` | inet NULL | |
| `user_agent` | text NULL | |

Restricción: `CHECK (user_id IS NOT NULL OR order_id IS NOT NULL)`. Visitantes anónimos (cookies) no generan fila: su elección vive en la cookie `cookie_consent`.
Índice: `(user_id, legal_document_id)`.

**`complaints`**: Libro de Reclamaciones. No se borra.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `number` | text UNIQUE | `000123-2026`. |
| `type` | `complaint_type` | |
| `consumer_name` | text | |
| `consumer_document_type` | `document_type` | |
| `consumer_document_number` | text | |
| `consumer_address` | text | |
| `consumer_phone` | text | |
| `consumer_email` | text | |
| `is_minor` | boolean | |
| `guardian_name` | text NULL | Obligatorio si `is_minor` (CHECK). |
| `user_id` | uuid NULL → `users.id` | |
| `order_id` | uuid NULL → `orders.id` | |
| `item_type` | `complaint_item_type` | |
| `amount_claimed_cents` | integer NULL | |
| `description` | text | |
| `consumer_request` | text | Pedido del consumidor. |
| `status` | `complaint_status` | Default `open`. |
| `due_at` | timestamptz | +15 días hábiles. |
| `response` | text NULL | |
| `responded_at` | timestamptz NULL | |
| `responded_by` | uuid NULL → `users.id` | |
| `receipt_emailed_at` | timestamptz NULL | `NULL` = copia pendiente. |

Índice: `(status, due_at)`.

**`complaint_counters`**: correlativo anual sin huecos.

| Columna | Tipo | Notas |
|---|---|---|
| `year` | integer PK | |
| `last_number` | integer | |

## Secuencias

- `order_code_seq`: número de `orders.code` (huecos aceptables).

## Datos calculados (sin columna)

| Dato | Cálculo |
|---|---|
| "Desde S/" del evento | `MIN(ticket_types.price_cents)` |
| Estado de zona (disponible, últimas, agotado) | Conteo de `event_seats` disponibles vs. total |
| Saldo del organizador | Órdenes pagadas − reembolsos − payouts |
| Ingresos y entradas vendidas (dashboard) | Agregados sobre `orders` y `tickets` |
| Documento legal vigente | Última versión `published` por `kind` |
| Estado de un asiento en el mapa (`available`/`occupied`/`accessible`) | `event_seats.status` disponible o no + `venue_seats.accessible` |

## Reglas que garantiza la BD

- Un lugar no se vende dos veces: `UNIQUE tickets.event_seat_id`.
- Un asiento reservado o vendido siempre tiene orden: CHECK en `event_seats`.
- Un webhook no se procesa dos veces: PK de `stripe_events`.
- Un evento cancelado no genera reembolsos duplicados: índice único parcial en `refunds`.
- Un payout por evento: `UNIQUE payouts.event_id`.
- Zonas consistentes: CHECK `seating`/`capacity` en `venue_sections`.

## Reglas que garantiza la app (no la BD)

- `ticket_types.section_id` pertenece al recinto del evento.
- `venue_seats` solo en secciones `numbered`; una sección `numbered` tiene asientos antes de publicar.
- Permisos (`can()`), límites anti-abuso y cálculo de importes.
