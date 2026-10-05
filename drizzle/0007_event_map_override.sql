ALTER TABLE "events" ADD COLUMN "map_view_box" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "map_stage" jsonb;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_map_override_check" CHECK (("events"."map_view_box" IS NULL) = ("events"."map_stage" IS NULL));