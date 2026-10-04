import { and, eq, getTableColumns, isNull, not, sql, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable, PgUpdateSetSource } from "drizzle-orm/pg-core";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { legalDocuments } from "@/lib/db/schema/legal";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { buildSeedData, seedUuid, type SeedData } from "./buildSeedData";

/** Filas por INSERT: lejos del límite de 65 535 parámetros de Postgres. */
const BATCH_SIZE = 1000;

/**
 * Columnas que el seed posee y actualiza en filas ya existentes (spec seating-all-venue-maps, decisión 7):
 * la geometría del mapa y el inventario demo. Con `[]`, la tabla solo inserta las filas que faltan.
 */
export const SEED_OWNED_COLUMNS: { [K in keyof SeedData]: (keyof SeedData[K][number])[] } = {
  users: [],
  organizers: [],
  categories: [],
  venues: ["mapViewBox", "stage"],
  venueSections: [
    "sortOrder",
    "seating",
    "capacity",
    "mapPath",
    "labelX",
    "labelY",
    "seatViewBox",
    "wrapLabel",
    "planTransform",
  ],
  venueSeats: ["x", "y", "accessible"],
  events: [],
  ticketTypes: ["sectionId", "sortOrder"],
  orders: ["subtotalCents", "platformFeeCents", "organizerAmountCents"],
  eventSeats: ["status", "orderId", "retiredAt"],
  // Documentos legales publicados: identidad y negocio, como `users`; solo se insertan los que faltan.
  legalDocuments: [],
};

export type SeedReport = {
  /** Filas insertadas o actualizadas por tabla (rowCount de cada INSERT … ON CONFLICT). Sin el super admin. */
  written: Record<keyof SeedData, number>;
  /** Lugares que esta ejecución pasó a retirados. */
  retiredEventSeats: number;
  /** Lugares obsoletos que no se retiran porque tienen una venta o retención real. */
  obsoleteWithSales: number;
};

/** Un array como un único parámetro `uuid[]` (no como lista de parámetros). */
const uuidArray = (ids: string[]) => sql`${sql.param(ids)}::uuid[]`;

/**
 * Siembra los mocks en una transacción, sin borrar nada:
 * - inserta lo que falta y actualiza solo las columnas de `SEED_OWNED_COLUMNS` que cambian (ids deterministas);
 * - nunca toca un lugar retenido ni uno vendido a un pedido que no es demo;
 * - retira (`retired_at`) el inventario demo que el layout ya no tiene.
 * El super admin se busca por correo y conserva su `id` (y su `clerk_id`) si ya existía.
 */
export async function seed(db: NodePgDatabase, { superAdminEmail }: { superAdminEmail: string }): Promise<SeedReport> {
  const email = superAdminEmail.toLowerCase();

  return db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({ id: seedUuid(`user:${email}`), email, firstName: "Super", lastName: "Admin", role: "super_admin" })
      .onConflictDoUpdate({
        target: users.email,
        set: { role: "super_admin" },
        setWhere: sql`${users.role} IS DISTINCT FROM 'super_admin'`,
      });
    // `returning` no devuelve la fila si no se actualizó.
    const [superAdmin] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));

    const data = buildSeedData({ superAdminId: superAdmin.id });

    /** Un lugar se puede reescribir o retirar: no está retenido y no es de un pedido real. */
    const demoOrderIds = data.events.map((event) => seedUuid(`order:${event.slug}`));
    const withoutRealSale = sql`(${eventSeats.status} <> 'held' AND (${eventSeats.orderId} IS NULL OR ${eventSeats.orderId} = ANY(${uuidArray(demoOrderIds)})))`;

    /** INSERT … ON CONFLICT por lotes; devuelve las filas escritas (insertadas o actualizadas). */
    async function upsertAll<T extends PgTable>(
      table: T,
      rows: T["$inferInsert"][],
      owned: readonly (keyof T["$inferInsert"])[],
      guard?: SQL,
    ): Promise<number> {
      const columns = getTableColumns(table);
      const ownedColumns = owned.map((key) => columns[String(key)]);
      const excluded = (name: string) => sql`excluded.${sql.identifier(name)}`;
      const set = Object.fromEntries([
        ...owned.map((key, index) => [key, excluded(ownedColumns[index].name)]),
        ["updatedAt", sql`now()`],
      ]) as PgUpdateSetSource<T>;
      const changed = sql`(${sql.join(ownedColumns, sql`, `)}) IS DISTINCT FROM (${sql.join(
        ownedColumns.map((column) => excluded(column.name)),
        sql`, `,
      )})`;

      let written = 0;
      for (let start = 0; start < rows.length; start += BATCH_SIZE) {
        const insert = tx.insert(table).values(rows.slice(start, start + BATCH_SIZE));
        const result = await (ownedColumns.length === 0
          ? insert.onConflictDoNothing()
          : insert.onConflictDoUpdate({
              target: columns.id,
              set,
              setWhere: guard ? and(changed, guard) : changed,
            }));
        written += result.rowCount ?? 0;
      }
      return written;
    }

    // En orden de dependencias.
    const written: SeedReport["written"] = {
      users: await upsertAll(users, data.users, SEED_OWNED_COLUMNS.users),
      organizers: await upsertAll(organizers, data.organizers, SEED_OWNED_COLUMNS.organizers),
      categories: await upsertAll(categories, data.categories, SEED_OWNED_COLUMNS.categories),
      venues: await upsertAll(venues, data.venues, SEED_OWNED_COLUMNS.venues),
      venueSections: await upsertAll(venueSections, data.venueSections, SEED_OWNED_COLUMNS.venueSections),
      venueSeats: await upsertAll(venueSeats, data.venueSeats, SEED_OWNED_COLUMNS.venueSeats),
      events: await upsertAll(events, data.events, SEED_OWNED_COLUMNS.events),
      ticketTypes: await upsertAll(ticketTypes, data.ticketTypes, SEED_OWNED_COLUMNS.ticketTypes),
      orders: await upsertAll(orders, data.orders, SEED_OWNED_COLUMNS.orders),
      eventSeats: await upsertAll(
        eventSeats,
        data.eventSeats.map((row) => ({ ...row, retiredAt: null })),
        SEED_OWNED_COLUMNS.eventSeats,
        withoutRealSale,
      ),
      legalDocuments: await upsertAll(legalDocuments, data.legalDocuments, SEED_OWNED_COLUMNS.legalDocuments),
    };

    // Inventario demo que el layout ya no tiene: activo, de un tipo del seed y fuera de los lugares esperados.
    const obsolete = and(
      sql`${eventSeats.ticketTypeId} = ANY(${uuidArray(data.ticketTypes.flatMap((row) => row.id ?? []))})`,
      isNull(eventSeats.retiredAt),
      sql`${eventSeats.id} <> ALL(${uuidArray(data.eventSeats.flatMap((row) => row.id ?? []))})`,
    );
    const retired = await tx
      .update(eventSeats)
      .set({ retiredAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(obsolete, withoutRealSale));
    const [{ obsoleteWithSales }] = await tx
      .select({ obsoleteWithSales: sql<number>`count(*)::int` })
      .from(eventSeats)
      .where(and(obsolete, not(withoutRealSale)));

    return { written, retiredEventSeats: retired.rowCount ?? 0, obsoleteWithSales };
  });
}
