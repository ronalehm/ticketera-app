ALTER TABLE "venue_sections" ADD COLUMN "wrap_label" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "venue_sections" ADD COLUMN "plan_transform" jsonb;