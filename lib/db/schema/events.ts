import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, eventStatusEnum, seatStatusEnum, timestamptz, updatedAt } from "./enums";
import { organizers, users } from "./identity";
import { orders } from "./sales";
import { venueSeats, venueSections, venues } from "./venues";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => organizers.userId),
    venueId: uuid("venue_id").references(() => venues.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    title: text("title").notNull(),
    // Nullable en borrador; obligatorias fuera de `draft` (events_draft_complete_check).
    description: text("description"),
    imageUrl: text("image_url"),
    startsAt: timestamptz("starts_at"),
    doorsOpenAt: timestamptz("doors_open_at"),
    minAge: integer("min_age").notNull(),
    featured: boolean("featured").notNull().default(false),
    currency: char("currency", { length: 3 }).notNull().default("PEN"),
    status: eventStatusEnum("status").notNull().default("draft"),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamptz("reviewed_at"),
    searchText: text("search_text").notNull(),
    cancelledAt: timestamptz("cancelled_at"),
    cancelReason: text("cancel_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("events_status_starts_at_idx").on(t.status, t.startsAt),
    index("events_search_text_trgm_idx").using("gin", t.searchText.op("gin_trgm_ops")),
    check(
      "events_draft_complete_check",
      sql`${t.status} = 'draft' OR (${t.venueId} IS NOT NULL AND ${t.description} IS NOT NULL AND ${t.imageUrl} IS NOT NULL AND ${t.startsAt} IS NOT NULL AND ${t.doorsOpenAt} IS NOT NULL)`,
    ),
  ],
);

export const ticketTypes = pgTable(
  "ticket_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => venueSections.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    maxPerOrder: integer("max_per_order").notNull().default(6),
    // Desvío documentado del ERD (spec data-foundation, Decisión 6).
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("ticket_types_event_id_section_id_unique").on(t.eventId, t.sectionId),
    unique("ticket_types_event_id_slug_unique").on(t.eventId, t.slug),
    check("ticket_types_price_cents_check", sql`${t.priceCents} >= 0`),
  ],
);

export const eventSeats = pgTable(
  "event_seats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    ticketTypeId: uuid("ticket_type_id")
      .notNull()
      .references(() => ticketTypes.id),
    venueSeatId: uuid("venue_seat_id").references(() => venueSeats.id),
    status: seatStatusEnum("status").notNull().default("available"),
    orderId: uuid("order_id").references(() => orders.id),
    heldUntil: timestamptz("held_until"),
    // Fuera del inventario (el seed retira lo que su layout ya no tiene); no se vende ni cuenta.
    // No se borra: conserva el historial y las FKs.
    retiredAt: timestamptz("retired_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("event_seats_event_id_venue_seat_id_unique").on(t.eventId, t.venueSeatId),
    check(
      "event_seats_status_order_check",
      sql`(${t.status} = 'available') = (${t.orderId} IS NULL)`,
    ),
    index("event_seats_ticket_type_id_status_idx").on(t.ticketTypeId, t.status),
  ],
);

export const eventStaff = pgTable(
  "event_staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    email: text("email").notNull(),
    userId: uuid("user_id").references(() => users.id),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    acceptedAt: timestamptz("accepted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("event_staff_event_id_email_unique").on(t.eventId, t.email)],
);

export const savedEvents = pgTable(
  "saved_events",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.eventId] })],
);
