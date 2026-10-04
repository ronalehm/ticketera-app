// @vitest-environment node
import { count, eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { legalDocuments } from "@/lib/db/schema/legal";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { describeWithDb } from "@/lib/db/testDb";
import { buildSeedData } from "./buildSeedData";
import { seed } from "./seed";

// El mismo correo que usa lib/db/testGlobalSetup.ts.
const SUPER_ADMIN_EMAIL = "super.admin@example.com";
/** Un seed completo contra Neon tarda decenas de segundos. */
const SEED_TIMEOUT_MS = 120_000;

const TABLES = {
  users,
  organizers,
  categories,
  venues,
  venueSections,
  venueSeats,
  events,
  ticketTypes,
  orders,
  eventSeats,
  legalDocuments,
};

async function countRows() {
  const entries = await Promise.all(
    Object.entries(TABLES).map(async ([name, table]) => {
      const [{ value }] = await db.select({ value: count() }).from(table);
      return [name, value] as const;
    }),
  );
  return Object.fromEntries(entries);
}

describeWithDb("seed (Postgres)", () => {
  it("volver a ejecutarlo no falla y deja los conteos de buildSeedData", async () => {
    await seed(db, { superAdminEmail: SUPER_ADMIN_EMAIL });

    const data = buildSeedData({ superAdminId: "00000000-0000-0000-0000-000000000000" });
    const expected = Object.fromEntries(Object.entries(data).map(([name, rows]) => [name, rows.length]));
    expect(await countRows()).toEqual({ ...expected, users: data.users.length + 1 }); // + super admin
  }, SEED_TIMEOUT_MS);

  it("el super admin tiene el correo en minúsculas, rol super_admin, sin clerk_id y es el creador de los recintos", async () => {
    const admins = await db.select().from(users).where(eq(users.email, SUPER_ADMIN_EMAIL));
    expect(admins).toEqual([expect.objectContaining({ role: "super_admin", clerkId: null })]);

    const creators = await db.selectDistinct({ createdBy: venues.createdBy }).from(venues);
    expect(creators).toEqual([{ createdBy: admins[0].id }]);
  });

  it("promueve a un usuario previo conservando su id y su clerk_id", async () => {
    const email = "promote.me@example.com";
    const [created] = await db
      .insert(users)
      .values({ email, clerkId: "user_test_promote", firstName: "Promo", lastName: "Test", role: "customer" })
      .returning();
    try {
      await seed(db, { superAdminEmail: "Promote.Me@Example.com" });
      const promoted = await db.select().from(users).where(eq(users.email, email));
      expect(promoted).toEqual([
        expect.objectContaining({ id: created.id, clerkId: "user_test_promote", role: "super_admin" }),
      ]);
    } finally {
      await db.delete(users).where(eq(users.id, created.id));
    }
  }, SEED_TIMEOUT_MS);
});
