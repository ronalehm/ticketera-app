import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  inet,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import {
  complaintItemTypeEnum,
  complaintStatusEnum,
  complaintTypeEnum,
  cookieCategoryEnum,
  createdAt,
  documentTypeEnum,
  legalDocumentKindEnum,
  legalDocumentStatusEnum,
  timestamptz,
  updatedAt,
} from "./enums";
import { users } from "./identity";
import { orders } from "./sales";

export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: legalDocumentKindEnum("kind").notNull(),
    version: text("version").notNull(),
    content: text("content").notNull(),
    status: legalDocumentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamptz("published_at"),
    publishedBy: uuid("published_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("legal_documents_kind_version_unique").on(t.kind, t.version)],
);

// Solo inserción: sin updated_at.
export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    legalDocumentId: uuid("legal_document_id")
      .notNull()
      .references(() => legalDocuments.id),
    userId: uuid("user_id").references(() => users.id),
    orderId: uuid("order_id").references(() => orders.id),
    email: text("email"),
    scope: cookieCategoryEnum("scope"),
    accepted: boolean("accepted").notNull(),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [
    check("consents_subject_check", sql`${t.userId} IS NOT NULL OR ${t.orderId} IS NOT NULL`),
    index("consents_user_id_legal_document_id_idx").on(t.userId, t.legalDocumentId),
  ],
);

export const complaints = pgTable(
  "complaints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(),
    type: complaintTypeEnum("type").notNull(),
    consumerName: text("consumer_name").notNull(),
    consumerDocumentType: documentTypeEnum("consumer_document_type").notNull(),
    consumerDocumentNumber: text("consumer_document_number").notNull(),
    consumerAddress: text("consumer_address").notNull(),
    consumerPhone: text("consumer_phone").notNull(),
    consumerEmail: text("consumer_email").notNull(),
    isMinor: boolean("is_minor").notNull(),
    guardianName: text("guardian_name"),
    userId: uuid("user_id").references(() => users.id),
    orderId: uuid("order_id").references(() => orders.id),
    itemType: complaintItemTypeEnum("item_type").notNull(),
    amountClaimedCents: integer("amount_claimed_cents"),
    description: text("description").notNull(),
    consumerRequest: text("consumer_request").notNull(),
    status: complaintStatusEnum("status").notNull().default("open"),
    dueAt: timestamptz("due_at").notNull(),
    response: text("response"),
    respondedAt: timestamptz("responded_at"),
    respondedBy: uuid("responded_by").references(() => users.id),
    receiptEmailedAt: timestamptz("receipt_emailed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("complaints_guardian_check", sql`NOT ${t.isMinor} OR ${t.guardianName} IS NOT NULL`),
    index("complaints_status_due_at_idx").on(t.status, t.dueAt),
  ],
);

export const complaintCounters = pgTable("complaint_counters", {
  year: integer("year").primaryKey(),
  lastNumber: integer("last_number").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
