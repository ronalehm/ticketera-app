import { and, eq, getTableColumns, inArray, isNull, not, sql, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable, PgUpdateSetSource } from "drizzle-orm/pg-core";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { legalDocuments } from "@/lib/db/schema/legal";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { buildSeedData, seedUuid, type SeedData } from "./buildSeedData";
import { parseSeedRoles, SeedConfigError } from "./env";

/** Filas por INSERT: lejos del límite de 65 535 parámetros de Postgres. */
const BATCH_SIZE = 1000;

/**
 * Columnas que el seed posee y actualiza en filas ya existentes (spec seating-all-venue-maps, decisión 7, y
 * admin-panel F2): la geometría del mapa, el inventario demo y el organizador y las fechas de los eventos.
 * Con `[]`, la tabla solo inserta las filas que faltan. `users` va aparte: se busca por correo (ver `seed`).
 */
export const SEED_OWNED_COLUMNS: { [K in Exclude<keyof SeedData, "users">]: (keyof SeedData[K][number])[] } = {
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
  // Mapa propio del evento (`NULL` = el del recinto): así un evento recibe el suyo en una BD ya sembrada.
  // Organizador (reparto por hash del slug) y fechas (relativas a `now`): se reasignan y desplazan en cada ejecución.
  events: ["organizerId", "startsAt", "doorsOpenAt", "mapViewBox", "mapStage"],
  ticketTypes: ["sectionId", "sortOrder"],
  eventSeats: ["status", "orderId", "retiredAt"],
  // Documentos legales publicados: identidad y negocio, como `users`; solo se insertan los que faltan.
  legalDocuments: [],
};

export type SeedOptions = {
  superAdminEmail: string;
  /** Organizadores reales de prueba (`SEED_ORGANIZER_EMAILS`): al menos uno y nunca el super admin. */
  organizerEmails: string[];
  /** Instante de referencia de las fechas sembradas (`run.ts` pasa `new Date()`). */
  now: Date;
};

export type SeedReport = {
  /** Filas insertadas o actualizadas por tabla (rowCount de cada INSERT … ON CONFLICT). Sin el super admin. */
  written: Record<keyof SeedData, number>;
  /** Lugares que esta ejecución pasó a retirados. */
  retiredEventSeats: number;
  /** Lugares obsoletos que no se retiran porque tienen una venta o retención real. */
  obsoleteWithSales: number;
  /**
   * Organizadores de `SEED_ORGANIZER_EMAILS` cuya fila en `organizers` no está `approved` (p. ej. un admin la dejó
   * `pending` o `suspended`): el seed respeta ese estado y no lo aprueba, aunque les reparte eventos igual.
   */
  nonApprovedOrganizers: { email: string; status: (typeof organizers.$inferSelect)["status"] }[];
};

/** Un array como un único parámetro `uuid[]` (no como lista de parámetros). */
const uuidArray = (ids: string[]) => sql`${sql.param(ids)}::uuid[]`;

/** Lo único que `seed` usa de la conexión: vale una BD o una transacción abierta (`db:reset-demo`). */
export type SeedDatabase = Pick<NodePgDatabase, "transaction">;

/**
 * Siembra los mocks en una transacción, sin borrar nada:
 * - inserta lo que falta y actualiza solo las columnas de `SEED_OWNED_COLUMNS` que cambian (ids deterministas);
 * - todo el inventario que escribe queda disponible, y nunca toca un lugar retenido o vendido (con pedido);
 * - retira (`retired_at`) el inventario demo que el layout ya no tiene.
 * El super admin y los organizadores se buscan por correo y conservan su `id`, su `clerk_id` y sus datos de perfil
 * si ya existían; tampoco cambia el `status` de un organizador que ya tenía fila (un admin pudo dejarlo `pending` o
 * `suspended`): lo informa en `nonApprovedOrganizers`. Lanza `SeedConfigError`, sin escribir nada, si el super admin está entre los organizadores o si un
 * organizador ya es admin o super admin (nunca se degrada).
 */
export async function seed(db: SeedDatabase, options: SeedOptions): Promise<SeedReport> {
  const { superAdminEmail: email, organizerEmails } = parseSeedRoles(options);

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(inArray(users.email, organizerEmails));
    const privileged = existing.filter((user) => user.role === "admin" || user.role === "super_admin");
    if (privileged.length > 0) {
      throw new SeedConfigError(
        `SEED_ORGANIZER_EMAILS incluye cuentas admin o super admin (${privileged.map((user) => user.email).join(", ")}): el seed no las degrada a organizador`,
      );
    }

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

    const existingIds = new Map(existing.map((user) => [user.email, user.id]));
    const data = buildSeedData({
      superAdminId: superAdmin.id,
      organizers: organizerEmails.map((organizerEmail) => ({
        id: existingIds.get(organizerEmail) ?? seedUuid(`user:${organizerEmail}`),
        email: organizerEmail,
      })),
      now: options.now,
    });

    /**
     * Un lugar se puede reescribir o retirar si no tiene pedido (`event_seats_status_order_check`: solo los
     * `available` no lo tienen). Así nunca toca una retención ni una venta, tampoco las demo de seeds anteriores:
     * esas solo las borra `db:reset-demo`.
     */
    const withoutSale = isNull(eventSeats.orderId);

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

    /**
     * Organizadores por correo: una fila previa conserva id, `clerk_id` y perfil, y solo un `customer` pasa a
     * `organizer` (un admin o super admin nunca se degrada, aunque cambie de rol tras la comprobación de arriba).
     */
    async function upsertOrganizerUsers(): Promise<number> {
      const result = await tx
        .insert(users)
        .values(data.users)
        .onConflictDoUpdate({
          target: users.email,
          set: { role: "organizer", updatedAt: sql`now()` },
          setWhere: sql`${users.role} = 'customer'`,
        });
      return result.rowCount ?? 0;
    }

    // En orden de dependencias.
    const written: SeedReport["written"] = {
      users: await upsertOrganizerUsers(),
      organizers: await upsertAll(organizers, data.organizers, SEED_OWNED_COLUMNS.organizers),
      categories: await upsertAll(categories, data.categories, SEED_OWNED_COLUMNS.categories),
      venues: await upsertAll(venues, data.venues, SEED_OWNED_COLUMNS.venues),
      venueSections: await upsertAll(venueSections, data.venueSections, SEED_OWNED_COLUMNS.venueSections),
      venueSeats: await upsertAll(venueSeats, data.venueSeats, SEED_OWNED_COLUMNS.venueSeats),
      events: await upsertAll(events, data.events, SEED_OWNED_COLUMNS.events),
      ticketTypes: await upsertAll(ticketTypes, data.ticketTypes, SEED_OWNED_COLUMNS.ticketTypes),
      eventSeats: await upsertAll(
        eventSeats,
        data.eventSeats.map((row) => ({ ...row, retiredAt: null })),
        SEED_OWNED_COLUMNS.eventSeats,
        withoutSale,
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
      .where(and(obsolete, withoutSale));
    const [{ obsoleteWithSales }] = await tx
      .select({ obsoleteWithSales: sql<number>`count(*)::int` })
      .from(eventSeats)
      .where(and(obsolete, not(withoutSale)));

    const nonApprovedOrganizers = await tx
      .select({ email: users.email, status: organizers.status })
      .from(organizers)
      .innerJoin(users, eq(users.id, organizers.userId))
      .where(
        and(
          inArray(organizers.userId, data.organizers.map((row) => row.userId)),
          sql`${organizers.status} <> 'approved'`,
        ),
      )
      .orderBy(users.email);

    return { written, retiredEventSeats: retired.rowCount ?? 0, obsoleteWithSales, nonApprovedOrganizers };
  });
}
