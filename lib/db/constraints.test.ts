// @vitest-environment node
import { TransactionRollbackError, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { categories, eventSeats, events, savedEvents } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { tickets } from "@/lib/db/schema/sales";
import { venueSections, venues } from "@/lib/db/schema/venues";
import { describeWithDb } from "@/lib/db/testDb";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type RolledBack<T> = { value?: T; code?: string; constraint?: string };

/** Ejecuta `run` en una transacción que siempre se revierte; devuelve su resultado o el SQLSTATE y la restricción del error. */
async function rolledBack<T>(run: (tx: Tx) => Promise<T>): Promise<RolledBack<T>> {
  const result: RolledBack<T> = {};
  try {
    await db.transaction(async (tx) => {
      try {
        result.value = await run(tx);
      } catch (error) {
        const cause = (error instanceof Error && error.cause ? error.cause : error) as { code?: string; constraint?: string };
        result.code = cause.code;
        result.constraint = cause.constraint;
      }
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  return result;
}

/** SQLSTATE del error de `run` (o undefined), en una transacción revertida. */
async function errorCode(run: (tx: Tx) => Promise<unknown>): Promise<string | undefined> {
  return (await rolledBack(run)).code;
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

  describe("data gaps: borradores, favoritos y recintos", () => {
    let categoryId: string;
    let organizerId: string;
    let userId: string;
    let publishedEventId: string;

    beforeAll(async () => {
      [{ id: categoryId }] = await db.select({ id: categories.id }).from(categories).limit(1);
      [{ userId: organizerId }] = await db.select({ userId: organizers.userId }).from(organizers).limit(1);
      [{ id: userId }] = await db.select({ id: users.id }).from(users).limit(1);
      [{ id: publishedEventId }] = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.status, "published"))
        .limit(1);
    });

    // Solo título, categoría, organizador, slug, min_age y search_text: sin fecha, apertura, recinto, imagen ni descripción.
    const bareEvent = () => ({
      slug: "test-borrador-incompleto",
      title: "Borrador incompleto",
      categoryId,
      organizerId,
      minAge: 0,
      searchText: "borrador incompleto",
    });

    it("events: un borrador incompleto se inserta", async () => {
      expect(await rolledBack((tx) => tx.insert(events).values({ ...bareEvent(), status: "draft" }))).not.toHaveProperty(
        "code",
      );
    });

    it("events: incompleto fuera de draft incumple events_draft_complete_check (23514)", async () => {
      for (const status of ["pending_review", "published", "cancelled", "finished"] as const) {
        expect(await rolledBack((tx) => tx.insert(events).values({ ...bareEvent(), status }))).toMatchObject({
          code: "23514",
          constraint: "events_draft_complete_check",
        });
      }
      expect(
        await rolledBack((tx) => tx.update(events).set({ startsAt: null }).where(eq(events.id, publishedEventId))),
      ).toMatchObject({ code: "23514", constraint: "events_draft_complete_check" });
    });

    it("saved_events: un favorito por usuario y evento (23505 en la PK)", async () => {
      const saved = { userId, eventId: publishedEventId };
      expect(await rolledBack((tx) => tx.insert(savedEvents).values(saved))).not.toHaveProperty("code");
      expect(
        await rolledBack(async (tx) => {
          await tx.insert(savedEvents).values(saved);
          await tx.insert(savedEvents).values(saved);
        }),
      ).toMatchObject({ code: "23505", constraint: "saved_events_user_id_event_id_pk" });
    });

    const newVenue = () => ({ name: "Recinto de prueba", address: "Av. Prueba 123", city: "Lima", createdBy: userId });

    it("venues: sin status queda approved, y los recintos sembrados son approved y sin dueño", async () => {
      const { value } = await rolledBack((tx) =>
        tx.insert(venues).values(newVenue()).returning({ status: venues.status }),
      );
      expect(value).toEqual([{ status: "approved" }]);

      const seeded = await db.select({ status: venues.status, organizerId: venues.organizerId }).from(venues);
      expect(seeded.length).toBeGreaterThan(0);
      expect(seeded.every((v) => v.status === "approved" && v.organizerId === null)).toBe(true);
    });

    it("venues: pending_review exige organizer_id (venues_pending_has_owner_check, 23514)", async () => {
      expect(
        await rolledBack((tx) => tx.insert(venues).values({ ...newVenue(), status: "pending_review" })),
      ).toMatchObject({ code: "23514", constraint: "venues_pending_has_owner_check" });
      expect(
        await rolledBack((tx) => tx.insert(venues).values({ ...newVenue(), status: "pending_review", organizerId })),
      ).not.toHaveProperty("code");
    });
  });
});
