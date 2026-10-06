import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import {
  createdAt,
  documentTypeEnum,
  organizerStatusEnum,
  taxIdTypeEnum,
  timestamptz,
  updatedAt,
  userRoleEnum,
} from "./enums";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  documentType: documentTypeEnum("document_type"),
  documentNumber: text("document_number"),
  role: userRoleEnum("role").notNull().default("customer"),
  anonymizedAt: timestamptz("anonymized_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const organizers = pgTable(
  "organizers",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id),
    status: organizerStatusEnum("status").notNull().default("pending"),
    // Datos fiscales opcionales mientras el organizador no esté aprobado (organizers_approved_complete_check).
    legalName: text("legal_name"),
    taxIdType: taxIdTypeEnum("tax_id_type"),
    taxId: text("tax_id").unique(),
    commissionBps: integer("commission_bps").notNull(),
    stripeRecipientId: text("stripe_recipient_id"),
    payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("organizers_commission_bps_check", sql`${t.commissionBps} BETWEEN 0 AND 10000`),
    check(
      "organizers_approved_complete_check",
      sql`${t.status} <> 'approved' OR (${t.legalName} IS NOT NULL AND ${t.taxIdType} IS NOT NULL AND ${t.taxId} IS NOT NULL)`,
    ),
  ],
);

// Solo inserción: sin updated_at.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_target_idx").on(t.targetType, t.targetId)],
);
