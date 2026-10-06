// @vitest-environment node
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, count, eq, getTableColumns, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { legalDocuments } from "@/lib/db/schema/legal";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { describeWithDb } from "@/lib/db/testDb";
import { TEST_SEED_OPTIONS } from "@/lib/db/testSeedOptions";
import { inRolledBackTransaction, type Tx } from "@/lib/db/testTransaction";
import { getEventBySlug } from "@/modules/events/catalog";
import { EVENTS_MOCK } from "@/modules/events/data/events.mock";
import { VENUE_LAYOUTS_MOCK } from "@/modules/seating/data/venueMaps.mock";
import { getVenueMapBySlug } from "@/modules/seating/seats";
import { buildSeedData, organizerIndexForSlug, seedUuid, type SeedData } from "./buildSeedData";
import { SeedConfigError } from "./env";
import { seed, type SeedDatabase, type SeedReport } from "./seed";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

// Las mismas opciones con las que lib/db/testGlobalSetup.ts siembra la BD de test.
const SUPER_ADMIN_EMAIL = TEST_SEED_OPTIONS.superAdminEmail;
const ORGANIZER_EMAILS = TEST_SEED_OPTIONS.organizerEmails;
const NOW = TEST_SEED_OPTIONS.now;
const DAY_MS = 86_400_000;
/** Un seed completo contra Neon tarda decenas de segundos. */
const SEED_TIMEOUT_MS = 120_000;

const idsOf = (rows: { id?: string }[]) => rows.map((row) => row.id as string);

/** Por tabla del seed: la columna que la filtra y sus valores en el seed. */
type SeedScope = Record<keyof SeedData, [table: PgTable, column: PgColumn, values: string[]]>;

/**
 * Solo las filas del seed (de uno o varios `buildSeedData`): otros tests de integración crean usuarios, eventos `draft`
 * y órdenes en paralelo. Las tablas grandes se filtran por su padre del seed para no mandar miles de ids.
 */
function seedScope(datasets: SeedData[], seedEmails: string[]): SeedScope {
  const union = (pick: (data: SeedData) => string[]) => [...new Set(datasets.flatMap(pick))];
  const sectionIds = union((data) => idsOf(data.venueSections));
  const eventIds = union((data) => idsOf(data.events));
  return {
    users: [users, users.email, seedEmails],
    organizers: [organizers, organizers.userId, union((data) => data.organizers.map((row) => row.userId))],
    categories: [categories, categories.id, union((data) => idsOf(data.categories))],
    venues: [venues, venues.id, union((data) => idsOf(data.venues))],
    venueSections: [venueSections, venueSections.id, sectionIds],
    venueSeats: [venueSeats, venueSeats.sectionId, sectionIds],
    events: [events, events.id, eventIds],
    ticketTypes: [ticketTypes, ticketTypes.eventId, eventIds],
    eventSeats: [eventSeats, eventSeats.eventId, eventIds],
    legalDocuments: [legalDocuments, legalDocuments.id, union((data) => idsOf(data.legalDocuments))],
  };
}

async function countSeedRows(data: SeedData, seedEmails: string[]) {
  const entries = await Promise.all(
    Object.entries(seedScope([data], seedEmails)).map(async ([name, [table, column, values]]) => {
      const [{ value }] = await db.select({ value: count() }).from(table).where(inArray(column, values));
      return [name, value] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** `buildSeedData` con los ids reales de la BD del super admin y de los organizadores de `options`. */
async function seedDataFor(tx: Pick<Tx, "select">, options = TEST_SEED_OPTIONS): Promise<SeedData> {
  const rows = await tx
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, [options.superAdminEmail, ...options.organizerEmails]));
  const idOf = (email: string) => rows.find((row) => row.email === email)?.id ?? seedUuid(`user:${email}`);
  return buildSeedData({
    superAdminId: idOf(options.superAdminEmail),
    organizers: [...options.organizerEmails].sort().map((email) => ({ id: idOf(email), email })),
    now: options.now,
  });
}

describe("seed: validación previa", () => {
  it("aborta sin abrir la transacción si SUPER_ADMIN_EMAIL está entre los organizadores", async () => {
    const transaction = vi.fn();
    const database = { transaction } as unknown as SeedDatabase;

    await expect(
      seed(database, { ...TEST_SEED_OPTIONS, organizerEmails: [...ORGANIZER_EMAILS, SUPER_ADMIN_EMAIL.toUpperCase()] }),
    ).rejects.toThrow(SeedConfigError);
    await expect(seed(database, { ...TEST_SEED_OPTIONS, organizerEmails: [] })).rejects.toThrow(SeedConfigError);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describeWithDb("seed (Postgres)", () => {
  it("volver a ejecutarlo no falla y deja los conteos de buildSeedData", async () => {
    await seed(db, TEST_SEED_OPTIONS);

    const data = await seedDataFor(db);
    const expected = Object.fromEntries(Object.entries(data).map(([name, rows]) => [name, rows.length]));
    const seedEmails = [...ORGANIZER_EMAILS, SUPER_ADMIN_EMAIL];
    expect(await countSeedRows(data, seedEmails)).toEqual({ ...expected, users: seedEmails.length });
  }, SEED_TIMEOUT_MS);

  it("el super admin tiene el correo en minúsculas, rol super_admin, sin clerk_id y es el creador de los recintos", async () => {
    const admins = await db.select().from(users).where(eq(users.email, SUPER_ADMIN_EMAIL));
    expect(admins).toEqual([expect.objectContaining({ role: "super_admin", clerkId: null })]);

    const creators = await db
      .selectDistinct({ createdBy: venues.createdBy })
      .from(venues)
      .where(inArray(venues.id, idsOf((await seedDataFor(db)).venues)));
    expect(creators).toEqual([{ createdBy: admins[0].id }]);
  });

  it("promueve a un usuario previo conservando su id y su clerk_id", async () => {
    const email = "promote.me@example.com";
    const [created] = await db
      .insert(users)
      .values({ email, clerkId: "user_test_promote", firstName: "Promo", lastName: "Test", role: "customer" })
      .returning();
    try {
      await seed(db, { ...TEST_SEED_OPTIONS, superAdminEmail: "Promote.Me@Example.com" });
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
    eventSeats: 2600,
    legalDocuments: 0,
  },
  retiredEventSeats: 400,
  obsoleteWithSales: 0,
  nonApprovedOrganizers: [],
  eventsWithKeptDates: [],
};
const EMPTY_REPORT: SeedReport = {
  written: Object.fromEntries(SEED_TABLE_NAMES.map((name) => [name, 0])) as SeedReport["written"],
  retiredEventSeats: 0,
  obsoleteWithSales: 0,
  nonApprovedOrganizers: [],
  eventsWithKeptDates: [],
};
const NO_IDS = Object.fromEntries(SEED_TABLE_NAMES.map((name) => [name, []])) as unknown as TableIds;

const keyName = (name: SeedTable) => (name === "organizers" ? "userId" : "id");
const keyColumn = (name: SeedTable) => (name === "organizers" ? organizers.userId : SEED_TABLES[name].id);
const rowKey = (name: SeedTable, row: object) => String((row as Record<string, unknown>)[keyName(name)]);
const ticketTypeId = (slug: string, type: string) => seedUuid(`ticket-type:${slug}:${type}`);
const anyId = (column: ReturnType<typeof keyColumn>, ids: string[]) => sql`${column} = ANY(${sql.param(ids)}::uuid[])`;

/** `buildSeedData` sin los layouts de la Fase 1 (los restaura siempre, como buildSeedData.test.ts). */
async function buildPreF1SeedData(tx: Tx): Promise<SeedData> {
  const layouts = [...VENUE_LAYOUTS_MOCK];
  VENUE_LAYOUTS_MOCK.splice(0, layouts.length, ...layouts.filter((layout) => !PHASE_1_SLUGS.includes(layout.eventSlug)));
  try {
    return await seedDataFor(tx);
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
  const post = await seedDataFor(tx);
  const pre = await buildPreF1SeedData(tx);
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

  const seedEmails = [...ORGANIZER_EMAILS, SUPER_ADMIN_EMAIL];
  const scope = seedScope([pre, post], seedEmails);
  expect(await countActiveRows(tx, scope)).toEqual(expectedCounts(pre, seedEmails));
  // Fase 1: 456 → 556 butacas y 38 956 → 41 156 lugares.
  expect([
    post.venueSeats.length - pre.venueSeats.length,
    post.eventSeats.length - pre.eventSeats.length,
  ]).toEqual([100, 2200]);
  for (const slug of PHASE_1_SLUGS) expect(await getVenueMapBySlug(slug)).toBeNull();

  return { pre, post, seedEmails, scope };
}

const expectedCounts = (data: SeedData, seedEmails: string[]) =>
  Object.fromEntries(SEED_TABLE_NAMES.map((name) => [name, name === "users" ? seedEmails.length : data[name].length]));

/** Filas del seed (`scope`) por tabla; de `event_seats`, solo los activos (sin retirar). */
async function countActiveRows(tx: Tx, scope: SeedScope) {
  const counts: Record<string, number> = {};
  for (const name of SEED_TABLE_NAMES) {
    const [table, column, values] = scope[name];
    const where = and(inArray(column, values), name === "eventSeats" ? isNull(eventSeats.retiredAt) : undefined);
    const [{ value }] = await tx.select({ value: count() }).from(table).where(where);
    counts[name] = value;
  }
  return counts;
}

/** Ids de las filas del seed (`scope`) de cada tabla: otros archivos de test crean y borran filas en paralelo. */
async function tableIds(tx: Tx, scope: SeedScope): Promise<TableIds> {
  const ids = {} as TableIds;
  for (const name of SEED_TABLE_NAMES) {
    const [table, column, values] = scope[name];
    const key = keyColumn(name);
    const rows = await tx.select({ key }).from(table).where(inArray(column, values));
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
async function fingerprint(tx: Tx, scope: SeedScope) {
  const digests: Record<string, string | null> = {};
  for (const name of SEED_TABLE_NAMES) {
    const [table, column, values] = scope[name];
    const type = name === "users" ? sql`text[]` : sql`uuid[]`;
    const { rows } = await tx.execute<{ digest: string | null }>(
      sql`SELECT md5(string_agg(t::text || '@' || t.xmin::text, ',' ORDER BY t::text)) AS digest
          FROM ${table} t WHERE t.${sql.identifier(column.name)} = ANY(${sql.param(values)}::${type})`,
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
        const { post, seedEmails, scope } = await toPreF1State(tx);
        const idsBefore = await tableIds(tx, scope);

        const first = await seed(db, TEST_SEED_OPTIONS);
        const afterFirst = await fingerprint(tx, scope);
        const second = await seed(db, TEST_SEED_OPTIONS);

        expect(first).toEqual(PRE_F1_REPORT);
        expect(second).toEqual(EMPTY_REPORT);
        expect(await fingerprint(tx, scope)).toEqual(afterFirst);
        expect(await missingIds(tx, idsBefore)).toEqual(NO_IDS);
        expect(await countActiveRows(tx, scope)).toEqual(expectedCounts(post, seedEmails));

        const copa = await getVenueMapBySlug(COPA);
        expect(copa?.stage.label).toBe("CANCHA");
        expect(copa?.zones).toHaveLength(3);
        expect(numberedSeats(copa, "occidente")).toHaveLength(39);
        const ecos = await getVenueMapBySlug(ECOS);
        const platea = numberedSeats(ecos, "platea");
        expect(platea).toHaveLength(61);
        // Sin ventas (admin-panel F2): todo disponible, aunque el mock lo dé por vendido.
        expect(platea.filter((seat) => seat.status !== "available")).toEqual([]);
        expect(ecos?.zones.map((zone) => zone.status)).toEqual(["available", "available"]);

        for (const slug of PHASE_1_SLUGS) {
          const mock = EVENTS_MOCK.find((event) => event.slug === slug);
          const event = await getEventBySlug(slug);
          expect(event?.status).toBe("available");
          expect(event?.ticketTypes.map((type) => [type.id, type.status])).toEqual(
            mock?.ticketTypes.map((type) => [type.id, "available"]),
          );
        }

        const retired = await tx
          .select({
            ticketTypeId: eventSeats.ticketTypeId,
            venueSeatId: eventSeats.venueSeatId,
            status: eventSeats.status,
            orderId: eventSeats.orderId,
          })
          .from(eventSeats)
          .where(and(isNotNull(eventSeats.retiredAt), inArray(eventSeats.eventId, scope.eventSeats[2])));
        const byType = (id: string) => retired.filter((seat) => seat.ticketTypeId === id);
        expect(retired).toHaveLength(400);
        expect(byType(ticketTypeId(COPA, "occidente"))).toHaveLength(200);
        const ecosRetired = byType(ticketTypeId(ECOS, "platea"));
        expect(ecosRetired).toHaveLength(200);
        // Retirados tal como estaban: disponibles y sin pedido.
        expect(ecosRetired.filter((seat) => seat.status !== "available" || seat.orderId !== null)).toEqual([]);
        expect(retired.filter((seat) => seat.venueSeatId !== null)).toEqual([]);
      });
    },
    MIGRATION_TIMEOUT_MS,
  );

  it(
    "no toca los datos ajenos: el usuario, su pedido y sus lugares vendidos siguen intactos",
    async () => {
      await inRolledBackTransaction(async (tx) => {
        const { pre, post, scope } = await toPreF1State(tx);
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
        // Las filas del seed más el cliente ajeno (su pedido se comprueba aparte: el seed ya no tiene órdenes).
        const seedIds = await tableIds(tx, scope);
        const idsBefore = { ...seedIds, users: [...seedIds.users, customer.id] };

        const report = await seed(db, TEST_SEED_OPTIONS);

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

// --- Seed limpio (spec admin-panel, F2): organizadores reales, reparto por hash, fechas desde `now`, sin ventas. ---

describeWithDb("seed: organizadores reales, fechas desde now y sin ventas (admin-panel F2)", () => {
  const seedEmails = [...ORGANIZER_EMAILS, SUPER_ADMIN_EMAIL];

  /** Evento → organizador que le toca a cada evento del seed en la BD. */
  async function organizerBySlug(tx: Pick<Tx, "select">, data: SeedData) {
    const rows = await tx
      .select({ slug: events.slug, organizerId: events.organizerId })
      .from(events)
      .where(inArray(events.id, idsOf(data.events)));
    return Object.fromEntries(rows.map((row) => [row.slug, row.organizerId]));
  }
  const expectedOrganizers = (data: SeedData) =>
    Object.fromEntries(data.events.map((event) => [event.slug, event.organizerId]));

  it("sin ventas ni órdenes demo: inventario disponible, eventos futuros y 2 organizadores approved", async () => {
    const data = await seedDataFor(db);
    const eventIds = idsOf(data.events);
    const [{ notAvailable }] = await db
      .select({ notAvailable: count() })
      .from(eventSeats)
      .where(and(inArray(eventSeats.eventId, eventIds), sql`${eventSeats.status} <> 'available'`));
    expect(notAvailable).toBe(0);
    const [{ demoOrders }] = await db
      .select({ demoOrders: count() })
      .from(orders)
      .where(sql`${orders.code} LIKE 'TK-DEMO-%'`);
    expect(demoOrders).toBe(0);

    const seeded = await db.select({ startsAt: events.startsAt }).from(events).where(inArray(events.id, eventIds));
    expect(seeded).toHaveLength(eventIds.length);
    expect(seeded.every(({ startsAt }) => startsAt !== null && startsAt > NOW)).toBe(true);

    const seedOrganizers = await db
      .select({ email: users.email, role: users.role, clerkId: users.clerkId, status: organizers.status })
      .from(organizers)
      .innerJoin(users, eq(users.id, organizers.userId))
      .where(inArray(users.email, ORGANIZER_EMAILS));
    expect(seedOrganizers.sort((a, b) => a.email.localeCompare(b.email))).toEqual(
      ORGANIZER_EMAILS.map((email) => ({ email, role: "organizer", clerkId: null, status: "approved" })),
    );
    // Reparto por sha256(slug) mod 2: los dos reciben eventos.
    expect(new Set(Object.values(await organizerBySlug(db, data))).size).toBe(2);
    for (const event of data.events) {
      expect(event.organizerId, event.slug).toBe(data.users[organizerIndexForSlug(event.slug, 2)].id);
    }
  });

  it(
    "con el mismo now no escribe nada ni cambia la huella; con un now posterior solo desplaza las fechas",
    async () => {
      await inRolledBackTransaction(async (tx) => {
        const data = await seedDataFor(tx);
        const scope = seedScope([data], seedEmails);
        const before = await fingerprint(tx, scope);

        expect(await seed(db, TEST_SEED_OPTIONS)).toEqual(EMPTY_REPORT);
        expect(await fingerprint(tx, scope)).toEqual(before);

        const later = new Date(NOW.getTime() + 10 * DAY_MS);
        expect(await seed(db, { ...TEST_SEED_OPTIONS, now: later })).toEqual({
          ...EMPTY_REPORT,
          written: { ...EMPTY_REPORT.written, events: data.events.length },
        });
        const rows = await tx
          .select({ id: events.id, startsAt: events.startsAt, doorsOpenAt: events.doorsOpenAt })
          .from(events)
          .where(inArray(events.id, idsOf(data.events)));
        expect(rows).toHaveLength(data.events.length);
        for (const row of rows) {
          const seeded = data.events.find((event) => event.id === row.id);
          expect(row.startsAt!.getTime() - seeded!.startsAt!.getTime(), seeded?.slug).toBe(10 * DAY_MS);
          expect(row.doorsOpenAt!.getTime() - seeded!.doorsOpenAt!.getTime(), seeded?.slug).toBe(10 * DAY_MS);
          expect(row.startsAt!.getTime()).toBeGreaterThan(later.getTime());
        }
      });
    },
    SEED_TIMEOUT_MS,
  );

  it(
    "no desplaza la fecha de un evento demo con una orden paid, partially_refunded o pending vigente, y lo lista en el informe",
    async () => {
      await inRolledBackTransaction(async (tx) => {
        const data = await seedDataFor(tx);
        const [paidEvent, pendingEvent, expiredEvent, partialEvent] = data.events;
        const MINUTE_MS = 60_000;
        const baseOrder = { ticketCount: 1, subtotalCents: 1000, platformFeeCents: 100, organizerAmountCents: 900 };
        await tx.insert(orders).values([
          {
            ...baseOrder,
            code: "TK-TEST-KEPT-PAID",
            eventId: paidEvent.id as string,
            buyerName: "Cliente Pagado",
            buyerEmail: "kept.paid@example.com",
            buyerPhone: "+51911111111",
            buyerDocumentType: "dni",
            buyerDocumentNumber: "12345678",
            status: "paid",
            // Una orden pagada protege la fecha aunque su reserva ya haya expirado.
            expiresAt: new Date(Date.now() - 60 * MINUTE_MS),
            paidAt: new Date(),
          },
          {
            ...baseOrder,
            code: "TK-TEST-KEPT-PARTIAL",
            eventId: partialEvent.id as string,
            buyerName: "Cliente Reembolsado",
            buyerEmail: "kept.partial@example.com",
            buyerPhone: "+51922222222",
            buyerDocumentType: "dni",
            buyerDocumentNumber: "87654321",
            // Reembolso parcial: aún tiene entradas válidas, así que cuenta como venta.
            status: "partially_refunded",
            expiresAt: new Date(Date.now() - 60 * MINUTE_MS),
            paidAt: new Date(),
          },
          {
            ...baseOrder,
            code: "TK-TEST-KEPT-PENDING",
            eventId: pendingEvent.id as string,
            expiresAt: new Date(Date.now() + 10 * MINUTE_MS),
          },
          {
            ...baseOrder,
            code: "TK-TEST-EXPIRED-PENDING",
            eventId: expiredEvent.id as string,
            expiresAt: new Date(Date.now() - MINUTE_MS),
          },
        ]);

        const later = new Date(NOW.getTime() + 10 * DAY_MS);
        const report = await seed(db, { ...TEST_SEED_OPTIONS, now: later });

        expect(report).toEqual({
          ...EMPTY_REPORT,
          written: { ...EMPTY_REPORT.written, events: data.events.length - 3 },
          eventsWithKeptDates: [paidEvent.slug, pendingEvent.slug, partialEvent.slug].sort(),
        });
        const rows = await tx
          .select({ id: events.id, startsAt: events.startsAt, doorsOpenAt: events.doorsOpenAt })
          .from(events)
          .where(inArray(events.id, idsOf([paidEvent, pendingEvent, expiredEvent, partialEvent])));
        const shiftOf = (event: SeedData["events"][number]) => {
          const row = rows.find((candidate) => candidate.id === event.id)!;
          return [
            row.startsAt!.getTime() - event.startsAt!.getTime(),
            row.doorsOpenAt!.getTime() - event.doorsOpenAt!.getTime(),
          ];
        };
        expect(shiftOf(paidEvent)).toEqual([0, 0]);
        expect(shiftOf(pendingEvent)).toEqual([0, 0]);
        expect(shiftOf(partialEvent)).toEqual([0, 0]);
        expect(shiftOf(expiredEvent)).toEqual([10 * DAY_MS, 10 * DAY_MS]);
      });
    },
    SEED_TIMEOUT_MS,
  );

  it(
    "reasigna en una BD ya sembrada los eventos de otro organizador (p. ej. uno sintético de un seed anterior)",
    async () => {
      await inRolledBackTransaction(async (tx) => {
        const data = await seedDataFor(tx);
        const legacyEmail = "pulso-producciones@example.com";
        const [legacy] = await tx
          .insert(users)
          .values({ id: seedUuid(`user:${legacyEmail}`), email: legacyEmail, firstName: "Pulso", lastName: "", role: "organizer" })
          .returning({ id: users.id });
        await tx
          .insert(organizers)
          .values({ userId: legacy.id, status: "approved", legalName: "Pulso", taxIdType: "ruc", taxId: "test-legacy", commissionBps: 1000 });
        const moved = idsOf(data.events).slice(0, 3);
        await tx.update(events).set({ organizerId: legacy.id }).where(inArray(events.id, moved));

        const report = await seed(db, TEST_SEED_OPTIONS);

        expect(report).toEqual({ ...EMPTY_REPORT, written: { ...EMPTY_REPORT.written, events: moved.length } });
        expect(await organizerBySlug(tx, data)).toEqual(expectedOrganizers(data));
      });
    },
    SEED_TIMEOUT_MS,
  );

  it.each(["pending", "suspended"] as const)(
    "respeta un organizador que un admin dejó %s: no lo aprueba, le reparte eventos y lo avisa en el informe",
    async (status) => {
      await inRolledBackTransaction(async (tx) => {
        const data = await seedDataFor(tx);
        const [email] = ORGANIZER_EMAILS;
        const [{ id }] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
        await tx.update(organizers).set({ status }).where(eq(organizers.userId, id));

        const report = await seed(db, TEST_SEED_OPTIONS);

        expect(report).toEqual({ ...EMPTY_REPORT, nonApprovedOrganizers: [{ email, status }] });
        const [organizer] = await tx.select().from(organizers).where(eq(organizers.userId, id));
        expect(organizer.status).toBe(status);
        expect(await organizerBySlug(tx, data)).toEqual(expectedOrganizers(data));
        expect(Object.values(expectedOrganizers(data))).toContain(id);
      });
    },
    SEED_TIMEOUT_MS,
  );

  it(
    "un organizador que ya existía conserva id, clerk_id y perfil, pasa a organizer y recibe su fila approved",
    async () => {
      await inRolledBackTransaction(async (tx) => {
        const email = "existing.organizer@ticketera.test";
        const [existing] = await tx
          .insert(users)
          .values({ email, clerkId: "user_test_existing_organizer", firstName: "Ana", lastName: "Previa", phone: "+51911111111" })
          .returning();
        const options = { ...TEST_SEED_OPTIONS, organizerEmails: [...ORGANIZER_EMAILS, email] };

        await seed(db, options);

        const [user] = await tx.select().from(users).where(eq(users.id, existing.id));
        expect(user).toEqual({ ...existing, role: "organizer", updatedAt: user.updatedAt });
        const [organizer] = await tx.select().from(organizers).where(eq(organizers.userId, existing.id));
        expect(organizer).toMatchObject({ status: "approved", taxIdType: "ruc", legalName: expect.any(String) });
        expect(organizer.taxId).toMatch(/^20\d{9}$/);
        // Con 3 organizadores el reparto es sha256(slug) mod 3.
        const data = await seedDataFor(tx, options);
        expect(await organizerBySlug(tx, data)).toEqual(expectedOrganizers(data));
        expect(Object.values(expectedOrganizers(data))).toContain(existing.id);
      });
    },
    SEED_TIMEOUT_MS,
  );

  it.each(["admin", "super_admin"] as const)(
    "aborta sin escribir nada si un correo de organizador ya es %s",
    async (role) => {
      await inRolledBackTransaction(async (tx) => {
        const email = `already.${role}@ticketera.test`;
        const [privileged] = await tx
          .insert(users)
          .values({ email, firstName: "Ya", lastName: "Admin", role })
          .returning();
        const scope = seedScope([await seedDataFor(tx)], seedEmails);
        const before = await fingerprint(tx, scope);

        const error = await seed(db, { ...TEST_SEED_OPTIONS, organizerEmails: [...ORGANIZER_EMAILS, email] }).catch(
          (caught: unknown) => caught,
        );
        expect(error).toBeInstanceOf(SeedConfigError);
        expect((error as Error).message).toContain(email);

        expect(await tx.select().from(users).where(eq(users.id, privileged.id))).toEqual([privileged]);
        expect(await tx.select().from(organizers).where(eq(organizers.userId, privileged.id))).toEqual([]);
        expect(await fingerprint(tx, scope)).toEqual(before);
      });
    },
    SEED_TIMEOUT_MS,
  );
});
