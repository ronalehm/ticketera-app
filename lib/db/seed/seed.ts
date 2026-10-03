import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { buildSeedData, seedUuid } from "./buildSeedData";

/** Filas por INSERT: lejos del límite de 65 535 parámetros de Postgres. */
const BATCH_SIZE = 1000;

/**
 * Siembra los mocks en una transacción. Idempotente: ids deterministas + `ON CONFLICT DO NOTHING`.
 * El super admin se busca por correo y conserva su `id` (y su `clerk_id`) si ya existía.
 */
export async function seed(db: NodePgDatabase, { superAdminEmail }: { superAdminEmail: string }): Promise<void> {
  const email = superAdminEmail.toLowerCase();

  await db.transaction(async (tx) => {
    const [superAdmin] = await tx
      .insert(users)
      .values({ id: seedUuid(`user:${email}`), email, firstName: "Super", lastName: "Admin", role: "super_admin" })
      .onConflictDoUpdate({ target: users.email, set: { role: "super_admin" } })
      .returning({ id: users.id });

    const data = buildSeedData({ superAdminId: superAdmin.id });

    async function insertAll<T extends PgTable>(table: T, rows: T["$inferInsert"][]) {
      for (let start = 0; start < rows.length; start += BATCH_SIZE) {
        await tx.insert(table).values(rows.slice(start, start + BATCH_SIZE)).onConflictDoNothing();
      }
    }

    // En orden de dependencias.
    await insertAll(users, data.users);
    await insertAll(organizers, data.organizers);
    await insertAll(categories, data.categories);
    await insertAll(venues, data.venues);
    await insertAll(venueSections, data.venueSections);
    await insertAll(venueSeats, data.venueSeats);
    await insertAll(events, data.events);
    await insertAll(ticketTypes, data.ticketTypes);
    await insertAll(orders, data.orders);
    await insertAll(eventSeats, data.eventSeats);
  });
}
