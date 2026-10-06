CREATE TYPE "public"."email_delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."event_notification_kind" AS ENUM('schedule', 'cancelled', 'update');--> statement-breakpoint
CREATE TYPE "public"."event_notification_status" AS ENUM('pending', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "event_notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"email" text NOT NULL,
	"status" "email_delivery_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_notification_deliveries_notification_email_unique" UNIQUE("notification_id","email")
);
--> statement-breakpoint
CREATE TABLE "event_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" "event_notification_kind" NOT NULL,
	"status" "event_notification_status" DEFAULT 'pending' NOT NULL,
	"changes" jsonb NOT NULL,
	"send_after" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"last_error" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_notification_deliveries" ADD CONSTRAINT "event_notification_deliveries_notification_id_event_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."event_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_notifications" ADD CONSTRAINT "event_notifications_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_notifications" ADD CONSTRAINT "event_notifications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_notifications_due_idx" ON "event_notifications" USING btree ("status","send_after");--> statement-breakpoint
CREATE UNIQUE INDEX "event_notifications_one_pending_update_idx" ON "event_notifications" USING btree ("event_id") WHERE "event_notifications"."kind" = 'update' AND "event_notifications"."status" = 'pending';