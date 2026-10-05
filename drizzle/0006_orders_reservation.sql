ALTER TABLE "orders" ALTER COLUMN "buyer_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "buyer_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "buyer_phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "buyer_document_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "buyer_document_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "ticket_count" integer;--> statement-breakpoint
-- Editado a mano (spec checkout-stripe, decisión 12): rellena las órdenes existentes (demo del seed) con sus asientos.
UPDATE "orders" SET "ticket_count" = (SELECT count(*) FROM "event_seats" WHERE "event_seats"."order_id" = "orders"."id");--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "ticket_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_required_check" CHECK ("orders"."status" = 'pending' OR ("orders"."buyer_name" IS NOT NULL AND "orders"."buyer_email" IS NOT NULL AND "orders"."buyer_phone" IS NOT NULL AND "orders"."buyer_document_type" IS NOT NULL AND "orders"."buyer_document_number" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_ticket_count_check" CHECK ("orders"."ticket_count" > 0);