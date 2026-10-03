import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, seatingTypeEnum, updatedAt } from "./enums";
import { users } from "./identity";

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  placeId: text("place_id"),
  mapViewBox: text("map_view_box"),
  stage: jsonb("stage").$type<{ label: string; path: string; labelPos: { x: number; y: number } }>(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const venueSections = pgTable(
  "venue_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    seating: seatingTypeEnum("seating").notNull(),
    capacity: integer("capacity"),
    mapPath: text("map_path"),
    labelX: real("label_x"),
    labelY: real("label_y"),
    seatViewBox: text("seat_view_box"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("venue_sections_venue_id_name_unique").on(t.venueId, t.name),
    unique("venue_sections_venue_id_slug_unique").on(t.venueId, t.slug),
    check(
      "venue_sections_seating_capacity_check",
      sql`(${t.seating} = 'general' AND ${t.capacity} > 0) OR (${t.seating} = 'numbered' AND ${t.capacity} IS NULL)`,
    ),
  ],
);

export const venueSeats = pgTable(
  "venue_seats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => venueSections.id),
    rowLabel: text("row_label").notNull(),
    number: integer("number").notNull(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    accessible: boolean("accessible").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("venue_seats_section_row_number_unique").on(t.sectionId, t.rowLabel, t.number)],
);
