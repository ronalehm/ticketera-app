// @vitest-environment node
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { count, eq, getTableColumns, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { legalDocuments } from "@/lib/db/schema/legal";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { describeWithDb } from "@/lib/db/testDb";
import { inRolledBackTransaction, type Tx } from "@/lib/db/testTransaction";
import { getEventBySlug } from "@/modules/events/catalog";
import { EVENTS_MOCK } from "@/modules/events/data/events.mock";
import { VENUE_LAYOUTS_MOCK } from "@/modules/seating/data/venueMaps.mock";
import { getVenueMapBySlug } from "@/modules/seating/seats";
import { buildSeedData, seedUuid, type SeedData } from "./buildSeedData";
import { seed, type SeedReport } from "./seed";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

// El mismo correo que usa lib/db/testGlobalSetup.ts.
const SUPER_ADMIN_EMAIL = "super.admin@example.com";
/** Un seed completo contra Neon tarda decenas de segundos. */
const SEED_TIMEOUT_MS = 120_000;

const idsOf = (rows: { id?: string }[]) => rows.map((row) => row.id as string);

/**
 * Cuenta solo las filas del seed: otros tests de integración crean usuarios, eventos `draft` y órdenes en paralelo.
 * Las tablas grandes se filtran por su padre del seed para no mandar miles de ids.
 */
async function countSeedRows(data: SeedData, seedEmails: string[]) {
  const sectionIds = idsOf(data.venueSections);
  const eventIds = idsOf(data.events);
  const filters: [string, PgTable, SQL][] = [
    ["users", users, inArray(users.email, seedEmails)],
    ["organizers", organizers, inArray(organizers.userId, data.organizers.map((row) => row.userId))],
    ["categories", categories, inArray(categories.id, idsOf(data.categories))],
    ["venues", venues, inArray(venues.id, idsOf(data.venues))],
    ["venueSections", venueSections, inArray(venueSections.id, sectionIds)],
    ["venueSeats", venueSeats, inArray(venueSeats.sectionId, sectionIds)],
    ["events", events, inArray(events.id, eventIds)],
    ["ticketTypes", ticketTypes, inArray(ticketTypes.eventId, eventIds)],
    ["orders", orders, inArray(orders.id, idsOf(data.orders))],
    ["eventSeats", eventSeats, inArray(eventSeats.eventId, eventIds)],
    ["legalDocuments", legalDocuments, inArray(legalDocuments.id, idsOf(data.legalDocuments))],
  ];
  const entries = await Promise.all(
    filters.map(async ([name, table, where]) => {
      const [{ value }] = await db.select({ value: count() }).from(table).where(where);
      return [name, value] as const;
    }),
  );
  return Object.fromEntries(entries);
}

describeWithDb("seed (Postgres)", () => {
  const data = buildSeedData({ superAdminId: "00000000-0000-0000-0000-000000000000" });

  it("volver a ejecutarlo no falla y deja los conteos de buildSeedData", async () => {
    await seed(db, { superAdminEmail: SUPER_ADMIN_EMAIL });

    const expected = Object.fromEntries(Object.entries(data).map(([name, rows]) => [name, rows.length]));
    const seedEmails = [...data.users.map((user) => user.email), SUPER_ADMIN_EMAIL];
    expect(await countSeedRows(data, seedEmails)).toEqual({ ...expected, users: seedEmails.length });
  }, SEED_TIMEOUT_MS);

  it("el super admin tiene el correo en minúsculas, rol super_admin, sin clerk_id y es el creador de los recintos", async () => {
    const admins = await db.select().from(users).where(eq(users.email, SUPER_ADMIN_EMAIL));
    expect(admins).toEqual([expect.objectContaining({ role: "super_admin", clerkId: null })]);

    const creators = await db
      .selectDistinct({ createdBy: venues.createdBy })
      .from(venues)
      .where(inArray(venues.id, idsOf(data.venues)));
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

// --- Seed incremental (spec seating-all-venue-maps, Fase 1b): desde el estado de producción, sin vaciar. ---

const COPA = "copa-del-norte-trujillo";
const ECOS = "los-ecos-del-sur-arequipa";
/** Layouts que añadió la Fase 1: sin ellos, `buildSeedData` es el seed de producción (`main` en b90d48a, decisión 7). */
const PHASE_1_SLUGS = [COPA, ECOS];
const MIGRATION_TIMEOUT_MS = 300_000;

/** Las tablas del seed, en orden de dependencias. */
const SEED_TABLES = {
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
} satisfies Record<keyof SeedData, PgTable>;
type SeedTable = keyof SeedData;
const SEED_TABLE_NAMES = Object.keys(SEED_TABLES) as SeedTable[];
type TableIds = Record<SeedTable, string[]>;

/** Requisito 22: la 1.ª ejecución sobre el estado de producción. */
const PRE_F1_REPORT: SeedReport = {
  written: {
    users: 0,
    organizers: 0,
    categories: 0,
    venues: 2,
    venueSections: 5,
    venueSeats: 100,
    events: 0,
    ticketTypes: 0,
    orders: 2,
    eventSeats: 2600,
    legalDocuments: 0,
  },
  retiredEventSeats: 400,
  obsoleteWithSales: 0,
};
const EMPTY_REPORT: SeedReport = {
  written: Object.fromEntries(SEED_TABLE_NAMES.map((name) => [name, 0])) as SeedReport["written"],
  retiredEventSeats: 0,
  obsoleteWithSales: 0,
};
const NO_IDS = Object.fromEntries(SEED_TABLE_NAMES.map((name) => [name, []])) as unknown as TableIds;

const keyName = (name: SeedTable) => (name === "organizers" ? "userId" : "id");
const keyColumn = (name: SeedTable) => (name === "organizers" ? organizers.userId : SEED_TABLES[name].id);
const rowKey = (name: SeedTable, row: object) => String((row as Record<string, unknown>)[keyName(name)]);
const ticketTypeId = (slug: string, type: string) => seedUuid(`ticket-type:${slug}:${type}`);
const anyId = (column: ReturnType<typeof keyColumn>, ids: string[]) => sql`${column} = ANY(${sql.param(ids)}::uuid[])`;

/** `buildSeedData` sin los layouts de la Fase 1 (los restaura siempre, como buildSeedData.test.ts). */
function buildPreF1SeedData(superAdminId: string): SeedData {
  const layouts = [...VENUE_LAYOUTS_MOCK];
  VENUE_LAYOUTS_MOCK.splice(0, layouts.length, ...layouts.filter((layout) => !PHASE_1_SLUGS.includes(layout.eventSlug)));
  try {
    return buildSeedData({ superAdminId });
  } finally {
    VENUE_LAYOUTS_MOCK.splice(0, VENUE_LAYOUTS_MOCK.length, ...layouts);
  }
}

/** Todas las columnas de `row` (las que no trae, a su DEFAULT), salvo la clave y las fechas de auditoría. */
function fullRow(name: SeedTable, row: object) {
  const values = row as Record<string, unknown>;
  const skip = [keyName(name), "createdAt", "updatedAt"];
  return Object.fromEntries(
    Object.keys(getTableColumns(SEED_TABLES[name]))
      .filter((key) => !skip.includes(key))
      .map((key) => [key, values[key] === undefined ? sql`DEFAULT` : values[key]]),
  );
}

/** Lleva la BD de test (sembrada con la rama) al estado de producción, aplicando la diferencia `post → pre`. */
async function toPreF1State(tx: Tx) {
  const [admin] = await tx.select({ id: users.id }).from(users).where(eq(users.email, SUPER_ADMIN_EMAIL));
  const post = buildSeedData({ superAdminId: admin.id });
  const pre = buildPreF1SeedData(admin.id);
  const keysOf = (name: SeedTable, data: SeedData) => new Set(data[name].map((row: object) => rowKey(name, row)));

  // Solo en esta transacción de test (se revierte): el seed nunca borra.
  for (const name of [...SEED_TABLE_NAMES].reverse()) {
    const preKeys = keysOf(name, pre);
    const extra = [...keysOf(name, post)].filter((key) => !preKeys.has(key));
    const table: PgTable = SEED_TABLES[name];
    if (extra.length > 0) await tx.delete(table).where(anyId(keyColumn(name), extra));
  }
  for (const name of SEED_TABLE_NAMES) {
    const table: PgTable = SEED_TABLES[name];
    const postRows = new Map(post[name].map((row: object) => [rowKey(name, row), row]));
    const missing: object[] = [];
    for (const row of pre[name] as object[]) {
      const current = postRows.get(rowKey(name, row));
      if (!current) missing.push(row);
      else if (!isDeepStrictEqual(row, current)) {
        await tx.update(table).set(fullRow(name, row)).where(eq(keyColumn(name), rowKey(name, row)));
      }
    }
    for (let start = 0; start < missing.length; start += 1000) {
      await tx.insert(table).values(missing.slice(start, start + 1000) as PgTable["$inferInsert"][]);
    }
  }

  const seedEmails = [...post.users.map((user) => user.email), SUPER_ADMIN_EMAIL];
  expect(await countActiveRows(tx, seedEmails)).toEqual(expectedCounts(pre, seedEmails));
  // Fase 1: 456 → 556 butacas, 38 956 → 41 156 lugares y 7 → 8 pedidos demo.
  expect([
    post.venueSeats.length - pre.venueSeats.length,
    post.eventSeats.length - pre.eventSeats.length,
    post.orders.length - pre.orders.length,
  ]).toEqual([100, 2200, 1]);
  for (const slug of PHASE_1_SLUGS) expect(await getVenueMapBySlug(slug)).toBeNull();

  return { pre, post, seedEmails };
}

const expectedCounts = (data: SeedData, seedEmails: string[]) =>
  Object.fromEntries(SEED_TABLE_NAMES.map((name) => [name, name === "users" ? seedEmails.length : data[name].length]));

/** Filas por tabla del seed: `users` solo los de `seedEmails` y `event_seats` solo los activos (sin retirar). */
async function countActiveRows(tx: Tx, seedEmails: string[]) {
  const counts: Record<string, number> = {};
  for (const name of SEED_TABLE_NAMES) {
    const where =
      name === "users" ? inArray(users.email, seedEmails) : name === "eventSeats" ? isNull(eventSeats.retiredAt) : undefined;
    const table: PgTable = SEED_TABLES[name];
    const [{ value }] = await tx.select({ value: count() }).from(table).where(where);
    counts[name] = value;
  }
  return counts;
}

/** Ids de cada tabla del seed (`users`, solo los de `emails`: otros archivos de test crean y borran usuarios). */
async function tableIds(tx: Tx, emails: string[]): Promise<TableIds> {
  const ids = {} as TableIds;
  for (const name of SEED_TABLE_NAMES) {
    const key = keyColumn(name);
    const table: PgTable = SEED_TABLES[name];
    const rows = await tx
      .select({ key })
      .from(table)
      .where(name === "users" ? inArray(users.email, emails) : undefined);
    ids[name] = rows.map((row) => row.key);
  }
  return ids;
}

/** Los ids de `before` que ya no existen. */
async function missingIds(tx: Tx, before: TableIds): Promise<TableIds> {
  const missing = {} as TableIds;
  for (const name of SEED_TABLE_NAMES) {
    const key = keyColumn(name);
    const table: PgTable = SEED_TABLES[name];
    const found = new Set((await tx.select({ key }).from(table).where(anyId(key, before[name]))).map((row) => row.key));
    missing[name] = before[name].filter((id) => !found.has(id));
  }
  return missing;
}

/**
 * Huella de cada tabla del seed: todas las columnas de cada fila (`updated_at` incluido) y su `xmin`. Dentro de una
 * transacción `now()` no avanza, así que es `xmin` (el savepoint que escribió la fila) lo que delata una reescritura.
 */
async function fingerprint(tx: Tx, seedEmails: string[]) {
  const digests: Record<string, string | null> = {};
  for (const name of SEED_TABLE_NAMES) {
    const where: SQL = name === "users" ? sql`WHERE t.email = ANY(${sql.param(seedEmails)}::text[])` : sql``;
    const { rows } = await tx.execute<{ digest: string | null }>(
      sql`SELECT md5(string_agg(t::text || '@' || t.xmin::text, ',' ORDER BY t::text)) AS digest
          FROM ${SEED_TABLES[name]} t ${where}`,
    );
    digests[name] = rows[0].digest;
  }
  return digests;
}

function numberedSeats(map: Awaited<ReturnType<typeof getVenueMapBySlug>>, zoneId: string) {
  const zone = map?.zones.find((candidate) => candidate.id === zoneId);
  if (zone?.kind !== "numbered") throw new Error(`La zona ${zoneId} no es numerada`);
  return zone.rows.flatMap((row) => row.seats);
}

describeWithDb("seed: actualiza una BD sembrada antes de la Fase 1 sin vaciarla", () => {
  it(
    "converge a buildSeedData, retira lo obsoleto sin borrar nada y una 2.ª ejecución no escribe",
    async () => {
      await inRolledBackTransaction(async (tx) => {
        const { post, seedEmails } = await toPreF1State(tx);
        const idsBefore = await tableIds(tx, seedEmails);

        const first = await seed(db, { superAdminEmail: SUPER_ADMIN_EMAIL });
        const afterFirst = await fingerprint(tx, seedEmails);
        const second = await seed(db, { superAdminEmail: SUPER_ADMIN_EMAIL });

        expect(first).toEqual(PRE_F1_REPORT);
        expect(second).toEqual(EMPTY_REPORT);
        expect(await fingerprint(tx, seedEmails)).toEqual(afterFirst);
        expect(await missingIds(tx, idsBefore)).toEqual(NO_IDS);
        expect(await countActiveRows(tx, seedEmails)).toEqual(expectedCounts(post, seedEmails));

        const copa = await getVenueMapBySlug(COPA);
        expect(copa?.stage.label).toBe("CANCHA");
        expect(copa?.zones).toHaveLength(3);
        expect(numberedSeats(copa, "occidente")).toHaveLength(39);
        const ecos = await getVenueMapBySlug(ECOS);
        const platea = numberedSeats(ecos, "platea");
        expect(platea).toHaveLength(61);
        expect(platea.filter((seat) => seat.status !== "occupied")).toEqual([]);
        expect(ecos?.zones.map((zone) => zone.status)).toEqual(["sold-out", "sold-out"]);

        for (const slug of PHASE_1_SLUGS) {
          const mock = EVENTS_MOCK.find((event) => event.slug === slug);
          const event = await getEventBySlug(slug);
          const statuses = (source: typeof mock | typeof event) => ({
            status: source?.status,
            ticketTypes: source?.ticketTypes.map((type) => [type.id, type.status]),
          });
          expect(statuses(event)).toEqual(statuses(mock));
        }

        const retired = await tx
          .select({
            ticketTypeId: eventSeats.ticketTypeId,
            venueSeatId: eventSeats.venueSeatId,
            status: eventSeats.status,
            orderCode: orders.code,
          })
          .from(eventSeats)
          .leftJoin(orders, eq(orders.id, eventSeats.orderId))
          .where(isNotNull(eventSeats.retiredAt));
        const byType = (id: string) => retired.filter((seat) => seat.ticketTypeId === id);
        expect(retired).toHaveLength(400);
        expect(byType(ticketTypeId(COPA, "occidente"))).toHaveLength(200);
        const ecosRetired = byType(ticketTypeId(ECOS, "platea"));
        expect(ecosRetired).toHaveLength(200);
        // Conservan su estado de venta demo.
        expect(ecosRetired.filter((seat) => seat.status !== "sold" || seat.orderCode !== "TK-DEMO-002")).toEqual([]);
        expect(retired.filter((seat) => seat.venueSeatId !== null)).toEqual([]);
      });
    },
    MIGRATION_TIMEOUT_MS,
  );

  it(
    "no toca los datos ajenos: el usuario, su pedido y sus lugares vendidos siguen intactos",
    async () => {
      await inRolledBackTransaction(async (tx) => {
        const { pre, post, seedEmails } = await toPreF1State(tx);
        const postIds = new Set(post.eventSeats.map((row) => row.id));
        const preIds = new Set(pre.eventSeats.map((row) => row.id));
        // El general de índice 0 de Occidente (obsoleto) y uno de Popular que el seed quiere libre.
        const obsoleteSeat = pre.eventSeats.find((row) => row.ticketTypeId === ticketTypeId(COPA, "occidente"));
        const keptSeat = post.eventSeats.find(
          (row) => row.ticketTypeId === ticketTypeId(COPA, "popular") && row.status === "available" && preIds.has(row.id),
        );
        if (!obsoleteSeat?.id || !keptSeat?.id) throw new Error("Faltan los lugares de Copa del estado de producción");
        expect(postIds.has(obsoleteSeat.id)).toBe(false);
        const foreignSeatIds = [obsoleteSeat.id, keptSeat.id].sort();

        const [customer] = await tx
          .insert(users)
          .values({ email: `seed-test-${randomUUID()}@example.com`, firstName: "Cliente", lastName: "Ajeno", role: "customer" })
          .returning();
        const [order] = await tx
          .insert(orders)
          .values({
            code: "TK-TEST-1",
            eventId: seedUuid(`event:${COPA}`),
            userId: customer.id,
            buyerName: "Cliente Ajeno",
            buyerEmail: customer.email,
            buyerPhone: "+51911111111",
            buyerDocumentType: "dni",
            buyerDocumentNumber: "12345678",
            status: "paid",
            expiresAt: new Date(),
            paidAt: new Date(),
            subtotalCents: 2000,
            platformFeeCents: 200,
            organizerAmountCents: 1800,
            ticketCount: 2,
          })
          .returning();
        await tx
          .update(eventSeats)
          .set({ status: "sold", orderId: order.id })
          .where(inArray(eventSeats.id, foreignSeatIds));
        const idsBefore = await tableIds(tx, [...seedEmails, customer.email]);

        const report = await seed(db, { superAdminEmail: SUPER_ADMIN_EMAIL });

        expect(report).toMatchObject({ retiredEventSeats: 399, obsoleteWithSales: 1 });
        expect(await tx.select().from(users).where(eq(users.id, customer.id))).toEqual([customer]);
        expect(await tx.select().from(orders).where(eq(orders.id, order.id))).toEqual([order]);
        const seats = await tx
          .select({ id: eventSeats.id, status: eventSeats.status, orderId: eventSeats.orderId, retiredAt: eventSeats.retiredAt })
          .from(eventSeats)
          .where(inArray(eventSeats.id, foreignSeatIds))
          .orderBy(eventSeats.id);
        expect(seats).toEqual(foreignSeatIds.map((id) => ({ id, status: "sold", orderId: order.id, retiredAt: null })));
        expect(await missingIds(tx, idsBefore)).toEqual(NO_IDS);
      });
    },
    MIGRATION_TIMEOUT_MS,
  );
});
