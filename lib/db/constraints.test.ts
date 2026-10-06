// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TransactionRollbackError, and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { categories, eventSeats, events, savedEvents } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { tickets } from "@/lib/db/schema/sales";
import { venueSections, venues } from "@/lib/db/schema/venues";
import { describeWithDb } from "@/lib/db/testDb";
import { createTestEvent, sellTestSeats, type TestEvent } from "@/lib/db/testFixtures";
import { TEST_SEED_OPTIONS } from "@/lib/db/testSeedOptions";

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
  // El seed no siembra ventas: un evento propio con un lugar vendido y otro disponible.
  let testEvent: TestEvent;

  beforeAll(async () => {
    testEvent = await createTestEvent({ general: 2 });
    const {
      eventSeatIds: [soldSeatId],
    } = await sellTestSeats(testEvent.slug, { count: 1 });
    [soldSeat] = await db.select().from(eventSeats).where(eq(eventSeats.id, soldSeatId));
    [availableSeat] = await db
      .select()
      .from(eventSeats)
      .where(and(eq(eventSeats.eventId, testEvent.eventId), eq(eventSeats.status, "available")));
    [{ id: venueId }] = await db.select({ id: venues.id }).from(venues).limit(1);
  });

  afterAll(async () => {
    await testEvent?.cleanup();
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

  describe("organizers.status (0008_organizer_status)", () => {
    /** Inserta un usuario organizador y su fila de `organizers` con `values`; devuelve el `status` guardado. */
    const insertOrganizer = (tx: Tx, values: Partial<typeof organizers.$inferInsert>) =>
      tx
        .insert(users)
        .values({ email: "organizer.status.test@example.com", firstName: "Prueba", lastName: "Estado", role: "organizer" })
        .returning({ id: users.id })
        .then(([{ id }]) =>
          tx
            .insert(organizers)
            .values({ userId: id, commissionBps: 1000, ...values })
            .returning({ status: organizers.status }),
        );

    const fiscal = { legalName: "Prueba SAC", taxIdType: "ruc", taxId: "test-organizer-status" } as const;

    it("approved sin legal_name, tax_id_type o tax_id incumple organizers_approved_complete_check (23514)", async () => {
      for (const missing of ["legalName", "taxIdType", "taxId"] as const) {
        expect(
          await rolledBack((tx) => insertOrganizer(tx, { ...fiscal, [missing]: null, status: "approved" })),
        ).toMatchObject({ code: "23514", constraint: "organizers_approved_complete_check" });
      }
      expect(
        await rolledBack(async (tx) => {
          await insertOrganizer(tx, { ...fiscal, status: "approved" });
          await tx.update(organizers).set({ taxId: null }).where(eq(organizers.taxId, fiscal.taxId));
        }),
      ).toMatchObject({ code: "23514", constraint: "organizers_approved_complete_check" });
    });

    it("sin status queda pending; pending y suspended sin datos fiscales se insertan", async () => {
      expect(await rolledBack((tx) => insertOrganizer(tx, {}))).toEqual({ value: [{ status: "pending" }] });
      expect(await rolledBack((tx) => insertOrganizer(tx, { status: "suspended" }))).toEqual({
        value: [{ status: "suspended" }],
      });
      expect(await rolledBack((tx) => insertOrganizer(tx, { ...fiscal, status: "approved" }))).toEqual({
        value: [{ status: "approved" }],
      });
    });

    it("la migración 0008 deja approved a los organizadores existentes y pending a los nuevos", async () => {
      // El CREATE TYPE se omite: el tipo ya existe al dejar `organizers` como antes de 0008; los DROP NOT NULL son idempotentes.
      const statements = readFileSync(join(process.cwd(), "drizzle/0008_organizer_status.sql"), "utf8")
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter((statement) => statement && !statement.startsWith("CREATE TYPE"));

      const insertLegacyOrganizer = async (tx: Tx, email: string, taxId: string) => {
        const { rows } = await tx.execute<{ id: string }>(
          sql`INSERT INTO users (email, first_name, last_name, role) VALUES (${email}, 'Prueba', 'Backfill', 'organizer') RETURNING id`,
        );
        await tx.execute(
          sql`INSERT INTO organizers (user_id, legal_name, tax_id_type, tax_id, commission_bps) VALUES (${rows[0].id}, 'Prueba SAC', 'ruc', ${taxId}, 1000)`,
        );
        return rows[0].id;
      };

      const result = await rolledBack(async (tx) => {
        await tx.execute(sql`ALTER TABLE organizers DROP CONSTRAINT organizers_approved_complete_check`);
        await tx.execute(sql`ALTER TABLE organizers DROP COLUMN status`);
        const existingId = await insertLegacyOrganizer(tx, "organizer.backfill.old@example.com", "test-backfill-old");

        for (const statement of statements) await tx.execute(sql.raw(statement));

        const [{ id: newId }] = await tx
          .insert(users)
          .values({ email: "organizer.backfill.new@example.com", firstName: "Prueba", lastName: "Nuevo", role: "organizer" })
          .returning({ id: users.id });
        await tx.insert(organizers).values({ userId: newId, commissionBps: 1000 });

        const rows = await tx
          .select({ userId: organizers.userId, status: organizers.status })
          .from(organizers)
          .where(inArray(organizers.userId, [existingId, newId]));
        return {
          existing: rows.find(({ userId }) => userId === existingId)?.status,
          created: rows.find(({ userId }) => userId === newId)?.status,
        };
      });

      expect(result).toEqual({ value: { existing: "approved", created: "pending" } });
    });

    // Solo las filas del seed: los fixtures de otros archivos de test crean organizadores mientras corre este.
    it("el seed inserta sus organizadores approved", async () => {
      const seeded = await db
        .select({ status: organizers.status })
        .from(organizers)
        .innerJoin(users, eq(users.id, organizers.userId))
        .where(inArray(users.email, TEST_SEED_OPTIONS.organizerEmails));
      expect(seeded).toHaveLength(TEST_SEED_OPTIONS.organizerEmails.length);
      expect(seeded.every(({ status }) => status === "approved")).toBe(true);
    });
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

    it("events: map_view_box y map_stage van juntas (events_map_override_check, 23514)", async () => {
      const mapStage = { label: "CANCHA", path: "M 0 0 L 10 0 L 10 10 Z", labelPos: { x: 5, y: 5 } };
      const setMap = (map: Partial<Pick<typeof events.$inferInsert, "mapViewBox" | "mapStage">>) =>
        rolledBack((tx) => tx.update(events).set(map).where(eq(events.id, publishedEventId)));

      expect(await setMap({ mapViewBox: "0 0 600 300" })).toMatchObject({
        code: "23514",
        constraint: "events_map_override_check",
      });
      expect(await setMap({ mapStage })).toMatchObject({ code: "23514", constraint: "events_map_override_check" });
      expect(await setMap({ mapViewBox: "0 0 600 300", mapStage })).not.toHaveProperty("code");
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
