CREATE TYPE "public"."organizer_status" AS ENUM('approved', 'pending', 'suspended');--> statement-breakpoint
ALTER TABLE "organizers" ALTER COLUMN "legal_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organizers" ALTER COLUMN "tax_id_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organizers" ALTER COLUMN "tax_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organizers" ADD COLUMN "status" "organizer_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizers" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "organizers" ADD CONSTRAINT "organizers_approved_complete_check" CHECK ("organizers"."status" <> 'approved' OR ("organizers"."legal_name" IS NOT NULL AND "organizers"."tax_id_type" IS NOT NULL AND "organizers"."tax_id" IS NOT NULL));