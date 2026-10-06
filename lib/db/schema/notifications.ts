import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import {
  createdAt,
  emailDeliveryStatusEnum,
  eventNotificationKindEnum,
  eventNotificationStatusEnum,
  timestamptz,
  updatedAt,
} from "./enums";
import { events } from "./events";
import { users } from "./identity";

/** Un campo cambiado del evento (fechas en ISO 8601). Al fusionar se conserva el primer `before` y el último `after`. */
export type EventChange = {
  field: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
};

// Outbox de correos a compradores (spec event-change-notifications, Decisión 2): se escribe en la misma transacción
// que el cambio del evento y se envía después.
export const eventNotifications = pgTable(
  "event_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    kind: eventNotificationKindEnum("kind").notNull(),
    status: eventNotificationStatusEnum("status").notNull().default("pending"),
    changes: jsonb("changes").$type<EventChange[]>().notNull(),
    sendAfter: timestamptz("send_after").notNull(),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamptz("next_attempt_at"),
    lockedAt: timestamptz("locked_at"),
    sentAt: timestamptz("sent_at"),
    lastError: text("last_error"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("event_notifications_due_idx").on(t.status, t.sendAfter),
    // Una sola notificación `update` pendiente por evento (se fusionan los cambios en ella).
    uniqueIndex("event_notifications_one_pending_update_idx")
      .on(t.eventId)
      .where(sql`${t.kind} = 'update' AND ${t.status} = 'pending'`),
  ],
);

/** Una entrega por correo (en minúsculas) y notificación, aunque el comprador tenga varios pedidos. */
export const eventNotificationDeliveries = pgTable(
  "event_notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => eventNotifications.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    status: emailDeliveryStatusEnum("status").notNull().default("pending"),
    providerMessageId: text("provider_message_id"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    sentAt: timestamptz("sent_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("event_notification_deliveries_notification_email_unique").on(t.notificationId, t.email)],
);
