// @vitest-environment node
import { and, eq, inArray } from "drizzle-orm";
import { expect, it } from "vitest";
import { events } from "@/lib/db/schema/events";
import { orders } from "@/lib/db/schema/sales";
import { describeWithDb } from "@/lib/db/testDb";
import { inRolledBackTransaction } from "@/lib/db/testTransaction";
import { isActiveSaleOrder } from "./activeSales";

const MINUTE_MS = 60_000;

const BUYER = {
  buyerName: "Comprador de prueba",
  buyerEmail: "comprador.prueba@example.com",
  buyerPhone: "+51900000000",
  buyerDocumentType: "dni",
  buyerDocumentNumber: "00000000",
} as const;

describeWithDb("isActiveSaleOrder", () => {
  it("cuenta paid, partially_refunded y pending vigente; no pending vencida, expired ni refunded", () =>
    inRolledBackTransaction(async (tx) => {
      const [{ id: eventId }] = await tx.select({ id: events.id }).from(events).limit(1);
      const order = (code: string, status: (typeof orders.$inferInsert)["status"], expiresInMs: number) => ({
        ...BUYER,
        code: `TK-TEST-ACTIVE-${code}`,
        eventId,
        status,
        expiresAt: new Date(Date.now() + expiresInMs),
        ticketCount: 1,
        subtotalCents: 1000,
        platformFeeCents: 100,
        organizerAmountCents: 900,
      });
      const inserted = await tx
        .insert(orders)
        .values([
          // Pagadas: cuentan aunque su reserva ya expiró.
          order("PAID", "paid", -60 * MINUTE_MS),
          order("PARTIAL", "partially_refunded", -60 * MINUTE_MS),
          order("PENDING", "pending", 10 * MINUTE_MS),
          order("PENDING-OLD", "pending", -MINUTE_MS),
          order("EXPIRED", "expired", -MINUTE_MS),
          order("REFUNDED", "refunded", -60 * MINUTE_MS),
        ])
        .returning({ id: orders.id });

      const active = await tx
        .select({ code: orders.code })
        .from(orders)
        .where(and(inArray(orders.id, inserted.map((row) => row.id)), eq(orders.eventId, eventId), isActiveSaleOrder));

      expect(active.map((row) => row.code).sort()).toEqual(
        ["TK-TEST-ACTIVE-PAID", "TK-TEST-ACTIVE-PARTIAL", "TK-TEST-ACTIVE-PENDING"].sort(),
      );
    }));
});
