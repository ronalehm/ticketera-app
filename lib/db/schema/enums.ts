import { pgEnum, timestamp } from "drizzle-orm/pg-core";

// Enums nativos de docs/architecture/erd.md ("Enums"). Varios se comparten entre dominios.
export const userRoleEnum = pgEnum("user_role", ["customer", "organizer", "admin", "super_admin"]);
export const documentTypeEnum = pgEnum("document_type", ["dni", "ce", "passport"]);
export const taxIdTypeEnum = pgEnum("tax_id_type", ["ruc", "dni"]);
export const seatingTypeEnum = pgEnum("seating_type", ["general", "numbered"]);
export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "pending_review",
  "published",
  "cancelled",
  "finished",
]);
export const seatStatusEnum = pgEnum("seat_status", ["available", "held", "sold"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "expired",
  "refunded",
  "partially_refunded",
]);
export const ticketStatusEnum = pgEnum("ticket_status", ["valid", "used", "void", "refunded"]);
export const refundReasonEnum = pgEnum("refund_reason", ["event_cancelled", "customer", "admin"]);
export const refundStatusEnum = pgEnum("refund_status", ["pending", "succeeded", "failed"]);
export const scanResultEnum = pgEnum("scan_result", [
  "ok",
  "already_used",
  "invalid",
  "wrong_event",
  "void",
]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "paid", "failed"]);
export const legalDocumentKindEnum = pgEnum("legal_document_kind", [
  "terms",
  "privacy",
  "cookies",
  "refunds",
  "marketing",
  "international_transfer",
]);
export const legalDocumentStatusEnum = pgEnum("legal_document_status", ["draft", "published"]);
export const cookieCategoryEnum = pgEnum("cookie_category", ["necessary", "analytics", "marketing"]);
export const complaintTypeEnum = pgEnum("complaint_type", ["claim", "grievance"]);
export const complaintItemTypeEnum = pgEnum("complaint_item_type", ["product", "service"]);
export const complaintStatusEnum = pgEnum("complaint_status", ["open", "answered"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "rejected"]);
export const organizerRequestTypeEnum = pgEnum("organizer_request_type", ["cancel", "reschedule"]);
export const privacyRequestTypeEnum = pgEnum("privacy_request_type", [
  "access",
  "rectification",
  "cancellation",
  "opposition",
]);

// Columnas de fecha compartidas por todos los dominios (convención del ERD).
export const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
export const createdAt = () => timestamptz("created_at").notNull().defaultNow();
export const updatedAt = () =>
  timestamptz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
