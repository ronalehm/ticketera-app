// @vitest-environment node
import { randomUUID } from "node:crypto";
import { and, count, eq, getTableName, inArray, isNotNull, like, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eventSeats, events, savedEvents } from "@/lib/db/schema/events";
import { auditLogs, organizers, users } from "@/lib/db/schema/identity";
import { refundRequests } from "@/lib/db/schema/requests";
import { checkInScans, orders, payouts, refunds, stripeEvents, tickets } from "@/lib/db/schema/sales";
import { describeWithDb } from "@/lib/db/testDb";
import { TEST_SEED_OPTIONS } from "@/lib/db/testSeedOptions";
import { buildSeedData, organizerIndexForSlug, seedUuid } from "./buildSeedData";
import { SeedConfigError } from "./env";
import {
  assertDemoResetAllowed,
  DemoResetBlockedError,
  DemoResetNotAllowedError,
  databaseHost,
  isLegacySeedOrganizer,
  parseConfirmArg,
  resetDemo,
  USER_REFERENCES,
  type DemoResetGuard,
} from "./resetDemo";
import { seed } from "./seed";

const URL_LOCAL = "postgres://postgres@127.0.0.1:55432/ticketera_dev";
const URL_NEON = "postgresql://user:secret@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=verify-full";
const ROLES = { superAdminEmail: TEST_SEED_OPTIONS.superAdminEmail, organizerEmails: TEST_SEED_OPTIONS.organizerEmails };

describe("parseConfirmArg", () => {
  it.each([
    [["--confirm=127.0.0.1"], "127.0.0.1"],
    [["--otro", "--confirm=ep-x.neon.tech "], "ep-x.neon.tech"],
    [["--confirm="], undefined],
    [["--confirm", "127.0.0.1"], undefined],
    [[], undefined],
  ])("%j → %s", (argv, expected) => {
    expect(parseConfirmArg(argv)).toBe(expected);
  });
});

describe("assertDemoResetAllowed", () => {
  const guard = (overrides: Partial<DemoResetGuard>): DemoResetGuard => ({
    allowDemoReset: "true",
    confirmHost: "127.0.0.1",
    databaseUrl: URL_LOCAL,
    ...overrides,
  });

  it("deja pasar con ALLOW_DEMO_RESET=true y el host de la URL (sin puerto ni credenciales)", () => {
    expect(() => assertDemoResetAllowed(guard({}))).not.toThrow();
    expect(databaseHost(URL_NEON)).toBe("ep-cool-name-123.us-east-2.aws.neon.tech");
    expect(() =>
      assertDemoResetAllowed(guard({ databaseUrl: URL_NEON, confirmHost: "EP-cool-name-123.us-east-2.aws.neon.tech" })),
    ).not.toThrow();
  });

  it.each([
    ["sin ALLOW_DEMO_RESET", { allowDemoReset: undefined }, /ALLOW_DEMO_RESET=true/],
    ["ALLOW_DEMO_RESET distinto de true", { allowDemoReset: "1" }, /ALLOW_DEMO_RESET=true/],
    ["sin --confirm", { confirmHost: undefined }, /Falta --confirm/],
    ["--confirm con otro host", { confirmHost: "ep-cool-name-123.us-east-2.aws.neon.tech" }, /no coincide/],
    ["--confirm con el puerto", { confirmHost: "127.0.0.1:55432" }, /no coincide/],
  ])("lanza DemoResetNotAllowedError %s", (_, overrides, message) => {
    expect(() => assertDemoResetAllowed(guard(overrides))).toThrow(DemoResetNotAllowedError);
    expect(() => assertDemoResetAllowed(guard(overrides))).toThrow(message);
  });
});

describe("isLegacySeedOrganizer", () => {
  const legacyEmail = "pulso-producciones@example.com";
  const legacy = { id: seedUuid(`user:${legacyEmail}`), email: legacyEmail, clerkId: null, role: "organizer" };

  it("reconoce al organizador sintético de un seed anterior", () => {
    expect(isLegacySeedOrganizer(legacy, ROLES)).toBe(true);
  });

  it.each([
    ["con clerk_id", { clerkId: "user_123" }],
    ["con otro rol", { role: "customer" }],
    ["con un id que no es el del seed (p. ej. un fixture)", { id: randomUUID() }],
    ["fuera de @example.com", { email: "pulso@ticketera.test", id: seedUuid("user:pulso@ticketera.test") }],
    ["el super admin", { email: ROLES.superAdminEmail, id: seedUuid(`user:${ROLES.superAdminEmail}`) }],
  ])("no toca a un usuario %s", (_, overrides) => {
    expect(isLegacySeedOrganizer({ ...legacy, ...overrides }, ROLES)).toBe(false);
  });

  it("no toca a un organizador de SEED_ORGANIZER_EMAILS aunque sea @example.com", () => {
    expect(isLegacySeedOrganizer(legacy, { ...ROLES, organizerEmails: [legacyEmail] })).toBe(false);
  });
});

describe("resetDemo sin protección", () => {
  it("no abre la transacción sin ALLOW_DEMO_RESET, con un --confirm incorrecto o con el super admin de organizador", async () => {
    const transaction = vi.fn();
    const database = { transaction } as unknown as NodePgDatabase;
    const guard = { allowDemoReset: "true", confirmHost: "127.0.0.1", databaseUrl: URL_LOCAL };

    await expect(
      resetDemo(database, { ...TEST_SEED_OPTIONS, guard: { ...guard, allowDemoReset: undefined } }),
    ).rejects.toThrow(DemoResetNotAllowedError);
    await expect(resetDemo(database, { ...TEST_SEED_OPTIONS, guard: { ...guard, confirmHost: "localhost" } })).rejects.toThrow(
      DemoResetNotAllowedError,
    );
    await expect(
      resetDemo(database, { ...TEST_SEED_OPTIONS, organizerEmails: [ROLES.superAdminEmail], guard }),
    ).rejects.toThrow(SeedConfigError);
    expect(transaction).not.toHaveBeenCalled();
  });
});

// --- Integración: BD aislada ---
// El reset vacía tablas enteras. La BD de test la comparten en paralelo los demás archivos, y hacerlo dentro de una
// transacción revertida bloquearía sus filas (órdenes, inventario) mientras dura. Por eso este test crea una BD propia
// en el mismo servidor de DATABASE_URL_TEST (CREATE DATABASE), la migra y la siembra, y la borra al terminar.

const LEGACY_EMAILS = ["compania-teatral-espejo@example.com", "pulso-producciones@example.com"];
const CLERK_CUSTOMER = { email: "cliente.real@ticketera.test", clerkId: "user_test_real_customer" };
/** El reset se ejecuta un día después del seed: las fechas deben quedar después de este `now`. */
const RESET_NOW = new Date(TEST_SEED_OPTIONS.now.getTime() + 86_400_000);
const DB_TIMEOUT_MS = 300_000;

type Database = NodePgDatabase;

async function countOf(database: Database, table: PgTable) {
  const [{ value }] = await database.select({ value: count() }).from(table);
  return value;
}

/** Filas de cada tabla que toca el reset, más el último valor de `order_code_seq`. */
async function snapshot(database: Database) {
  const [{ lastValue }] = (
    await database.execute<{ lastValue: string }>(sql`SELECT last_value AS "lastValue" FROM order_code_seq`)
  ).rows;
  const [{ soldOrHeld }] = await database
    .select({ soldOrHeld: count() })
    .from(eventSeats)
    .where(sql`${eventSeats.status} <> 'available'`);
  return {
    orders: await countOf(database, orders),
    tickets: await countOf(database, tickets),
    refunds: await countOf(database, refunds),
    refundRequests: await countOf(database, refundRequests),
    checkInScans: await countOf(database, checkInScans),
    payouts: await countOf(database, payouts),
    stripeEvents: await countOf(database, stripeEvents),
    eventSeats: await countOf(database, eventSeats),
    soldOrHeld,
    users: await countOf(database, users),
    organizers: await countOf(database, organizers),
    orderCodeSeq: lastValue,
  };
}

/**
 * Estado "de antes": sembrada con el seed actual más lo que dejaba el seed anterior (organizadores sintéticos dueños de
 * todos los eventos y una orden TK-DEMO) y ventas reales en todas las tablas de ventas.
 */
async function seedLegacyDemoState(database: Database) {
  await seed(database, TEST_SEED_OPTIONS);
  const [superAdmin] = await database
    .update(users)
    .set({ clerkId: "user_test_owner" })
    .where(eq(users.email, TEST_SEED_OPTIONS.superAdminEmail))
    .returning();
  const [customer] = await database
    .insert(users)
    .values({ ...CLERK_CUSTOMER, firstName: "Cliente", lastName: "Real" })
    .returning();

  const legacy = LEGACY_EMAILS.map((email) => ({ id: seedUuid(`user:${email}`), email }));
  await database
    .insert(users)
    .values(legacy.map(({ id, email }) => ({ id, email, firstName: email, lastName: "", role: "organizer" as const })));
  await database.insert(organizers).values(
    legacy.map(({ id }, index) => ({
      userId: id,
      status: "approved" as const,
      legalName: `Sintético ${index + 1}`,
      taxIdType: "ruc" as const,
      taxId: `2000000000${index + 1}`,
      commissionBps: 1000,
    })),
  );
  const seededEvents = await database.select({ id: events.id, slug: events.slug }).from(events);
  for (const [index, event] of seededEvents.entries()) {
    await database.update(events).set({ organizerId: legacy[index % 2].id }).where(eq(events.id, event.id));
  }

  const eventId = seedUuid("event:noche-de-sintetizadores-lima");
  const freeSeats = await database
    .select({ id: eventSeats.id })
    .from(eventSeats)
    .where(and(eq(eventSeats.eventId, eventId), eq(eventSeats.status, "available")))
    .limit(5);
  const buyer = {
    buyerName: "Cliente Real",
    buyerEmail: CLERK_CUSTOMER.email,
    buyerPhone: "+51911111111",
    buyerDocumentType: "dni" as const,
    buyerDocumentNumber: "12345678",
  };
  const amounts = { subtotalCents: 2000, platformFeeCents: 200, organizerAmountCents: 1800 };
  const [demoOrder, paidOrder, pendingOrder] = await database
    .insert(orders)
    .values([
      { code: "TK-DEMO-001", eventId, ...buyer, status: "paid", expiresAt: new Date(), paidAt: new Date(), ticketCount: 2, ...amounts },
      {
        code: sql<string>`'TK-' || nextval('order_code_seq')`,
        eventId,
        userId: customer.id,
        ...buyer,
        status: "paid",
        expiresAt: new Date(),
        paidAt: new Date(),
        ticketCount: 2,
        ...amounts,
      },
      { code: sql<string>`'TK-' || nextval('order_code_seq')`, eventId, status: "pending", expiresAt: new Date(), ticketCount: 1, ...amounts },
    ])
    .returning();
  const sell = (orderId: string, seats: { id: string }[], status: "sold" | "held") =>
    database
      .update(eventSeats)
      .set({ status, orderId, heldUntil: status === "held" ? new Date() : null })
      .where(inArray(eventSeats.id, seats.map((seat) => seat.id)));
  await sell(demoOrder.id, freeSeats.slice(0, 2), "sold");
  await sell(paidOrder.id, freeSeats.slice(2, 4), "sold");
  await sell(pendingOrder.id, freeSeats.slice(4, 5), "held");

  const [refund] = await database
    .insert(refunds)
    .values({ orderId: paidOrder.id, amountCents: 1000, reason: "customer", requestedBy: customer.id })
    .returning();
  const ticketRows = await database
    .insert(tickets)
    .values(
      freeSeats.slice(2, 4).map((seat, index) => ({
        orderId: paidOrder.id,
        eventSeatId: seat.id,
        code: `TK-TEST-TICKET-${index}`,
        holderName: "Cliente Real",
        unitPriceCents: 1000,
        qrToken: `qr-test-${randomUUID()}`,
        refundId: index === 0 ? refund.id : null,
      })),
    )
    .returning();
  await database.insert(refundRequests).values({
    orderId: paidOrder.id,
    userId: customer.id,
    ticketIds: [ticketRows[0].id],
    reason: "No puedo ir",
    refundId: refund.id,
  });
  await database
    .insert(checkInScans)
    .values({ eventId, ticketId: ticketRows[1].id, scannedBy: superAdmin.id, result: "ok" });
  await database
    .insert(payouts)
    .values({ organizerId: legacy[0].id, eventId, amountCents: 1800, currency: "PEN" });
  await database.insert(stripeEvents).values({ id: "evt_test_reset", type: "payment_intent.succeeded", processedAt: new Date() });

  return { superAdmin, customer };
}

describeWithDb("db:reset-demo contra una BD aislada (Postgres)", () => {
  const adminUrl = process.env.DATABASE_URL_TEST ?? "";
  const name = `ticketera_reset_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const isolatedUrl = Object.assign(new URL(adminUrl || URL_LOCAL), { pathname: `/${name}` }).toString();
  const guard: DemoResetGuard = {
    allowDemoReset: "true",
    confirmHost: databaseHost(isolatedUrl),
    databaseUrl: isolatedUrl,
  };
  let adminPool: Pool;
  let pool: Pool | undefined;
  let database: Database;
  let before: Awaited<ReturnType<typeof seedLegacyDemoState>>;

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: adminUrl, max: 1 });
    await adminPool.query(`CREATE DATABASE "${name}"`);
    pool = new Pool({ connectionString: isolatedUrl });
    database = drizzle({ client: pool });
    await migrate(database, { migrationsFolder: "drizzle" });
    before = await seedLegacyDemoState(database);
  }, DB_TIMEOUT_MS);

  afterAll(async () => {
    await pool?.end();
    await adminPool.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await adminPool.end();
  }, DB_TIMEOUT_MS);

  it("sin ALLOW_DEMO_RESET=true o con un --confirm incorrecto aborta sin tocar nada", async () => {
    const initial = await snapshot(database);
    expect(initial).toMatchObject({ orders: 3, tickets: 2, refunds: 1, refundRequests: 1, checkInScans: 1, payouts: 1 });
    expect(initial.soldOrHeld).toBe(5);

    for (const wrong of [
      { ...guard, allowDemoReset: undefined },
      { ...guard, allowDemoReset: "false" },
      { ...guard, confirmHost: undefined },
      { ...guard, confirmHost: "ep-otra-bd.aws.neon.tech" },
    ]) {
      await expect(resetDemo(database, { ...TEST_SEED_OPTIONS, now: RESET_NOW, guard: wrong })).rejects.toThrow(
        DemoResetNotAllowedError,
      );
    }
    expect(await snapshot(database)).toEqual(initial);
  });

  it(
    "con la protección vacía las ventas, regenera el inventario y deja solo los organizadores reales",
    async () => {
      const report = await resetDemo(database, { ...TEST_SEED_OPTIONS, now: RESET_NOW, guard });

      expect(report.deleted).toMatchObject({
        checkInScans: 1,
        refundRequests: 1,
        tickets: 2,
        refunds: 1,
        orders: 3,
        payouts: 1,
        stripeEvents: 1,
      });
      expect(report.removedOrganizers).toEqual(LEGACY_EMAILS);
      expect(report.keptOrganizers).toEqual([]);

      const data = buildSeedData({
        superAdminId: before.superAdmin.id,
        organizers: TEST_SEED_OPTIONS.organizerEmails.map((email) => ({ id: seedUuid(`user:${email}`), email })),
        now: RESET_NOW,
      });
      const after = await snapshot(database);
      expect(after).toMatchObject({
        orders: 0,
        tickets: 0,
        refunds: 0,
        refundRequests: 0,
        checkInScans: 0,
        payouts: 0,
        stripeEvents: 0,
        eventSeats: data.eventSeats.length,
        soldOrHeld: 0,
      });
      // order_code_seq reiniciada: la próxima orden vuelve a TK-1.
      const { rows } = await database.execute<{ next: string }>(sql`SELECT nextval('order_code_seq') AS next`);
      expect(rows[0].next).toBe("1");

      // Solo los organizadores de SEED_ORGANIZER_EMAILS, approved; ningún organizador @example.com.
      const remaining = await database
        .select({ email: users.email, status: organizers.status })
        .from(organizers)
        .innerJoin(users, eq(users.id, organizers.userId));
      expect(remaining.sort((a, b) => a.email.localeCompare(b.email))).toEqual(
        TEST_SEED_OPTIONS.organizerEmails.map((email) => ({ email, status: "approved" })),
      );
      expect(
        await database
          .select({ email: users.email })
          .from(users)
          .where(and(eq(users.role, "organizer"), like(users.email, "%@example.com"))),
      ).toEqual([]);

      // Eventos futuros respecto del `now` del reset y repartidos por hash entre los organizadores reales.
      const seededEvents = await database
        .select({ slug: events.slug, organizerId: events.organizerId, startsAt: events.startsAt })
        .from(events);
      expect(seededEvents).toHaveLength(data.events.length);
      for (const event of seededEvents) {
        expect(event.startsAt!.getTime(), event.slug).toBeGreaterThan(RESET_NOW.getTime());
        expect(event.organizerId, event.slug).toBe(data.users[organizerIndexForSlug(event.slug, 2)].id);
      }

      // Usuarios con clerk_id y super admin intactos.
      const kept = await database.select().from(users).where(isNotNull(users.clerkId));
      expect(kept.sort((a, b) => a.email.localeCompare(b.email))).toEqual(
        [before.customer, before.superAdmin].sort((a, b) => a.email.localeCompare(b.email)),
      );
    },
    DB_TIMEOUT_MS,
  );

  it(
    "una segunda ejecución no encuentra ventas ni organizadores sintéticos y solo regenera el inventario",
    async () => {
      const report = await resetDemo(database, { ...TEST_SEED_OPTIONS, now: RESET_NOW, guard });
      expect(report.deleted).toMatchObject({ orders: 0, tickets: 0, refunds: 0, payouts: 0, stripeEvents: 0 });
      expect(report.removedOrganizers).toEqual([]);
      expect(report.keptOrganizers).toEqual([]);
      // Vaciar `event_seats` y volver a sembrarlos los reescribe; el resto del seed ya estaba al día.
      expect(report.seed.written).toMatchObject({ users: 0, organizers: 0, events: 0, ticketTypes: 0 });
      expect(report.seed.written.eventSeats).toBe(report.deleted.eventSeats);
    },
    DB_TIMEOUT_MS,
  );

  it("USER_REFERENCES cubre todas las FKs a users y organizers del catálogo de Postgres", async () => {
    const { rows } = await database.execute<{ reference: string }>(sql`
      SELECT c.conrelid::regclass::text || '.' || a.attname AS reference
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
      WHERE c.contype = 'f' AND c.confrelid IN ('users'::regclass, 'organizers'::regclass)
    `);
    const fromCatalog = rows.map((row) => row.reference).filter((reference) => reference !== "organizers.user_id");
    const fromCode = USER_REFERENCES.map((column) => `${getTableName(column.table)}.${column.name}`);
    expect(fromCode.sort()).toEqual(fromCatalog.sort());
  });

  it(
    "conserva un organizador sintético que otra fila referencia y borra el resto sin abortar",
    async () => {
      const [referencedEmail, unreferencedEmail] = ["sintetico-referenciado@example.com", "sintetico-libre@example.com"];
      const synthetic = [referencedEmail, unreferencedEmail].map((email) => ({ id: seedUuid(`user:${email}`), email }));
      await database
        .insert(users)
        .values(synthetic.map(({ id, email }) => ({ id, email, firstName: email, lastName: "", role: "organizer" as const })));
      await database
        .insert(organizers)
        .values(synthetic.map(({ id }) => ({ userId: id, status: "pending" as const, commissionBps: 1000 })));
      const [referenced] = synthetic;
      await database
        .insert(savedEvents)
        .values({ userId: referenced.id, eventId: seedUuid("event:noche-de-sintetizadores-lima") });
      await database.insert(auditLogs).values({
        actorId: referenced.id,
        action: "test.reset",
        targetType: "event",
        targetId: seedUuid("event:noche-de-sintetizadores-lima"),
        payload: {},
      });

      const report = await resetDemo(database, { ...TEST_SEED_OPTIONS, now: RESET_NOW, guard });

      expect(report.removedOrganizers).toEqual([unreferencedEmail]);
      expect(report.keptOrganizers).toEqual([referencedEmail]);
      const remaining = await database
        .select({ email: users.email, status: organizers.status })
        .from(users)
        .leftJoin(organizers, eq(organizers.userId, users.id))
        .where(inArray(users.email, [referencedEmail, unreferencedEmail]));
      expect(remaining).toEqual([{ email: referencedEmail, status: "pending" }]);
    },
    DB_TIMEOUT_MS,
  );

  it(
    "aborta sin tocar nada si un consentimiento apunta a una orden",
    async () => {
      const [order] = await database
        .insert(orders)
        .values({
          code: "TK-TEST-CONSENT",
          eventId: seedUuid("event:noche-de-sintetizadores-lima"),
          status: "pending",
          expiresAt: new Date(),
          ticketCount: 1,
          subtotalCents: 0,
          platformFeeCents: 0,
          organizerAmountCents: 0,
        })
        .returning();
      const [legalDocument] = (
        await database.execute<{ id: string }>(sql`SELECT id FROM legal_documents LIMIT 1`)
      ).rows;
      await database.execute(
        sql`INSERT INTO consents (legal_document_id, order_id, accepted) VALUES (${legalDocument.id}, ${order.id}, true)`,
      );
      const initial = await snapshot(database);

      await expect(resetDemo(database, { ...TEST_SEED_OPTIONS, now: RESET_NOW, guard })).rejects.toThrow(
        DemoResetBlockedError,
      );
      expect(await snapshot(database)).toEqual(initial);
    },
    DB_TIMEOUT_MS,
  );
});
