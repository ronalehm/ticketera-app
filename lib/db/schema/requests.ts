import { sql } from "drizzle-orm";
import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import {
  createdAt,
  organizerRequestTypeEnum,
  privacyRequestTypeEnum,
  requestStatusEnum,
  taxIdTypeEnum,
  timestamptz,
  updatedAt,
} from "./enums";
import { events } from "./events";
import { organizers, users } from "./identity";
import { orders, refunds } from "./sales";

export const organizerApplications = pgTable(
  "organizer_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    legalName: text("legal_name").notNull(),
    taxIdType: taxIdTypeEnum("tax_id_type").notNull(),
    taxId: text("tax_id").notNull(),
    contactPhone: text("contact_phone").notNull(),
    message: text("message"),
    status: requestStatusEnum("status").notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamptz("reviewed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("organizer_applications_pending_user_id_unique")
      .on(t.userId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export const organizerRequests = pgTable(
  "organizer_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => organizers.userId),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    type: organizerRequestTypeEnum("type").notNull(),
    reason: text("reason").notNull(),
    proposedStartsAt: timestamptz("proposed_starts_at"),
    status: requestStatusEnum("status").notNull().default("pending"),
    resolutionNote: text("resolution_note"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamptz("resolved_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("organizer_requests_pending_event_id_unique")
      .on(t.eventId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export const refundRequests = pgTable(
  "refund_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    ticketIds: uuid("ticket_ids").array().notNull(),
    reason: text("reason").notNull(),
    status: requestStatusEnum("status").notNull().default("pending"),
    resolutionNote: text("resolution_note"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamptz("resolved_at"),
    refundId: uuid("refund_id").references(() => refunds.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("refund_requests_pending_order_id_unique")
      .on(t.orderId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export const privacyRequests = pgTable(
  "privacy_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    email: text("email").notNull(),
    type: privacyRequestTypeEnum("type").notNull(),
    details: text("details").notNull(),
    status: requestStatusEnum("status").notNull().default("pending"),
    dueAt: timestamptz("due_at").notNull(),
    response: text("response"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamptz("resolved_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("privacy_requests_status_due_at_idx").on(t.status, t.dueAt)],
);
