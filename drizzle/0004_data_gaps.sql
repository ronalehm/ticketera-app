CREATE TYPE "public"."venue_status" AS ENUM('pending_review', 'approved');--> statement-breakpoint
CREATE TABLE "saved_events" (
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_events_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "venue_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "image_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "starts_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "doors_open_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "status" "venue_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "organizer_id" uuid;--> statement-breakpoint
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_organizer_id_organizers_user_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_draft_complete_check" CHECK ("events"."status" = 'draft' OR ("events"."venue_id" IS NOT NULL AND "events"."description" IS NOT NULL AND "events"."image_url" IS NOT NULL AND "events"."starts_at" IS NOT NULL AND "events"."doors_open_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_pending_has_owner_check" CHECK ("venues"."status" = 'approved' OR "venues"."organizer_id" IS NOT NULL);