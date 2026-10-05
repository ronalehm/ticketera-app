import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  integer,
  pgSequence,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  createdAt,
  documentTypeEnum,
  orderStatusEnum,
  payoutStatusEnum,
  refundReasonEnum,
  refundStatusEnum,
  scanResultEnum,
  ticketStatusEnum,
  timestamptz,
  updatedAt,
} from "./enums";
import { eventSeats, events } from "./events";
import { organizers, users } from "./identity";

// orders.code = 'TK-' || nextval('order_code_seq'); huecos aceptables.
export const orderCodeSeq = pgSequence("order_code_seq");

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    userId: uuid("user_id").references(() => users.id),
    // Nullable en `pending` (la orden nace antes de conocer al comprador); obligatorias fuera (orders_buyer_required_check).
    buyerName: text("buyer_name"),
    buyerEmail: text("buyer_email"),
    buyerPhone: text("buyer_phone"),
    buyerDocumentType: documentTypeEnum("buyer_document_type"),
    buyerDocumentNumber: text("buyer_document_number"),
    status: orderStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamptz("expires_at").notNull(),
    // Asientos de la orden: el webhook comprueba que los conserva todos.
    ticketCount: integer("ticket_count").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    platformFeeCents: integer("platform_fee_cents").notNull(),
    organizerAmountCents: integer("organizer_amount_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("PEN"),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    paidAt: timestamptz("paid_at"),
    ticketsEmailedAt: timestamptz("tickets_emailed_at"),
    piiMaskedAt: timestamptz("pii_masked_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "orders_amounts_check",
      sql`${t.platformFeeCents} + ${t.organizerAmountCents} = ${t.subtotalCents}`,
    ),
    check(
      "orders_buyer_required_check",
      sql`${t.status} = 'pending' OR (${t.buyerName} IS NOT NULL AND ${t.buyerEmail} IS NOT NULL AND ${t.buyerPhone} IS NOT NULL AND ${t.buyerDocumentType} IS NOT NULL AND ${t.buyerDocumentNumber} IS NOT NULL)`,
    ),
    check("orders_ticket_count_check", sql`${t.ticketCount} > 0`),
    index("orders_user_id_idx").on(t.userId),
    index("orders_event_id_status_idx").on(t.eventId, t.status),
    index("orders_buyer_email_idx").on(t.buyerEmail),
  ],
);

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    amountCents: integer("amount_cents").notNull(),
    reason: refundReasonEnum("reason").notNull(),
    status: refundStatusEnum("status").notNull().default("pending"),
    stripeRefundId: text("stripe_refund_id").unique(),
    requestedBy: uuid("requested_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("refunds_amount_cents_check", sql`${t.amountCents} > 0`),
    uniqueIndex("refunds_event_cancelled_order_id_unique")
      .on(t.orderId)
      .where(sql`${t.reason} = 'event_cancelled'`),
  ],
);

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  eventSeatId: uuid("event_seat_id")
    .notNull()
    .unique()
    .references(() => eventSeats.id),
  code: text("code").notNull().unique(),
  holderName: text("holder_name").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  qrToken: text("qr_token").notNull().unique(),
  status: ticketStatusEnum("status").notNull().default("valid"),
  refundId: uuid("refund_id").references(() => refunds.id),
  checkedInAt: timestamptz("checked_in_at"),
  checkedInBy: uuid("checked_in_by").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Idempotencia de webhooks; solo inserción.
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamptz("processed_at").notNull(),
  createdAt: createdAt(),
});

// Todos los intentos de escaneo; solo inserción.
export const checkInScans = pgTable(
  "check_in_scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    ticketId: uuid("ticket_id").references(() => tickets.id),
    scannedBy: uuid("scanned_by")
      .notNull()
      .references(() => users.id),
    result: scanResultEnum("result").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("check_in_scans_event_id_created_at_idx").on(t.eventId, t.createdAt)],
);

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizerId: uuid("organizer_id")
    .notNull()
    .references(() => organizers.userId),
  eventId: uuid("event_id")
    .notNull()
    .unique()
    .references(() => events.id),
  amountCents: integer("amount_cents").notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  status: payoutStatusEnum("status").notNull().default("pending"),
  stripePayoutId: text("stripe_payout_id"),
  paidAt: timestamptz("paid_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
