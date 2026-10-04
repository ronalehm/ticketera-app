// @vitest-environment node
import { TransactionRollbackError, eq } from "drizzle-orm";
import { beforeAll, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { eventSeats } from "@/lib/db/schema/events";
import { tickets } from "@/lib/db/schema/sales";
import { venueSections, venues } from "@/lib/db/schema/venues";
import { describeWithDb } from "@/lib/db/testDb";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Ejecuta `run` en una transacción que siempre se revierte y devuelve el SQLSTATE del error (o undefined). */
async function errorCode(run: (tx: Tx) => Promise<unknown>): Promise<string | undefined> {
  let code: string | undefined;
  try {
    await db.transaction(async (tx) => {
      try {
        await run(tx);
      } catch (error) {
        const cause = error instanceof Error && error.cause ? error.cause : error;
        code = (cause as { code?: string }).code;
      }
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  return code;
}

describeWithDb("restricciones (Postgres)", () => {
  let soldSeat: typeof eventSeats.$inferSelect;
  let availableSeat: typeof eventSeats.$inferSelect;
  let venueId: string;

  beforeAll(async () => {
    [soldSeat] = await db.select().from(eventSeats).where(eq(eventSeats.status, "sold")).limit(1);
    [availableSeat] = await db.select().from(eventSeats).where(eq(eventSeats.status, "available")).limit(1);
    [{ id: venueId }] = await db.select({ id: venues.id }).from(venues).limit(1);
  });

  it("tickets.event_seat_id es único (23505)", async () => {
    const ticket = (suffix: string) => ({
      orderId: soldSeat.orderId ?? "",
      eventSeatId: soldSeat.id,
      code: `TEST-${suffix}`,
      holderName: "Prueba",
      unitPriceCents: 1000,
      qrToken: `qr-test-${suffix}`,
    });
    const code = await errorCode(async (tx) => {
      await tx.insert(tickets).values(ticket("1"));
      await tx.insert(tickets).values(ticket("2"));
    });
    expect(code).toBe("23505");
  });

  it("event_seats: vendido sin orden o disponible con orden incumple el CHECK (23514)", async () => {
    expect(
      await errorCode((tx) => tx.update(eventSeats).set({ status: "sold" }).where(eq(eventSeats.id, availableSeat.id))),
    ).toBe("23514");
    expect(
      await errorCode((tx) => tx.update(eventSeats).set({ status: "available" }).where(eq(eventSeats.id, soldSeat.id))),
    ).toBe("23514");
  });

  const section = { slug: "test-check", name: "Test check", sortOrder: 0 };

  it("venue_sections: general sin capacidad incumple el CHECK (23514)", async () => {
    expect(await errorCode((tx) => tx.insert(venueSections).values({ ...section, venueId, seating: "general" }))).toBe(
      "23514",
    );
  });

  it("venue_sections: numerada con capacidad incumple el CHECK (23514)", async () => {
    expect(
      await errorCode((tx) =>
        tx.insert(venueSections).values({ ...section, venueId, seating: "numbered", capacity: 10 }),
      ),
    ).toBe("23514");
  });
});
