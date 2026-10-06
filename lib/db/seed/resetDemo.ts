import { and, count, eq, inArray, isNotNull, isNull, like, not, notExists, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { eventSeats, eventStaff, events, savedEvents } from "@/lib/db/schema/events";
import { auditLogs, organizers, users } from "@/lib/db/schema/identity";
import { complaints, consents, legalDocuments } from "@/lib/db/schema/legal";
import { eventNotifications } from "@/lib/db/schema/notifications";
import { organizerApplications, organizerRequests, privacyRequests, refundRequests } from "@/lib/db/schema/requests";
import { checkInScans, orders, payouts, refunds, stripeEvents, tickets } from "@/lib/db/schema/sales";
import { venues } from "@/lib/db/schema/venues";
import { buildSeedData, seedUuid } from "./buildSeedData";
import { parseSeedRoles, type SeedRoles } from "./env";
import { seed, type SeedOptions, type SeedReport } from "./seed";

/**
 * `npm run db:reset-demo` (spec admin-panel, F2 y enmienda 8): borra TODAS las ventas, regenera el inventario de los
 * eventos del seed, libera (sin borrarlo) el de los demás eventos y quita los organizadores sintéticos de seeds
 * anteriores. Destructivo: solo lo ejecuta este comando, nunca `db:seed`, `db:migrate`, la instalación ni el build.
 */

/** Falta `ALLOW_DEMO_RESET=true` o `--confirm=<host>` no coincide: no se conecta ni se escribe nada. */
export class DemoResetNotAllowedError extends Error {
  override name = "DemoResetNotAllowedError";
}

/** Un registro legal (consentimiento o reclamo) apunta a una orden: no se borra, así que el reset aborta. */
export class DemoResetBlockedError extends Error {
  override name = "DemoResetBlockedError";
}

export type DemoResetGuard = {
  /** Valor de `ALLOW_DEMO_RESET`: tiene que ser exactamente `"true"`. */
  allowDemoReset: string | undefined;
  /** Valor de `--confirm=<host>`. */
  confirmHost: string | undefined;
  /** URL de la BD que se va a vaciar (`DATABASE_URL_UNPOOLED ?? DATABASE_URL`). */
  databaseUrl: string;
};

const CONFIRM_FLAG = "--confirm=";

/** El host de `--confirm=<host>` entre los argumentos de la línea de comandos, si está. */
export function parseConfirmArg(argv: readonly string[]): string | undefined {
  const value = argv.find((arg) => arg.startsWith(CONFIRM_FLAG))?.slice(CONFIRM_FLAG.length).trim();
  return value || undefined;
}

/** Host (sin puerto) de una URL de Postgres. */
export const databaseHost = (databaseUrl: string) => new URL(databaseUrl).hostname.toLowerCase();

/** Lanza `DemoResetNotAllowedError` salvo con `ALLOW_DEMO_RESET=true` y `--confirm` igual al host de la BD. */
export function assertDemoResetAllowed({ allowDemoReset, confirmHost, databaseUrl }: DemoResetGuard): void {
  if (allowDemoReset !== "true") {
    throw new DemoResetNotAllowedError(
      "db:reset-demo borra todas las ventas: ejecútalo con ALLOW_DEMO_RESET=true (no se ha tocado nada)",
    );
  }
  const host = databaseHost(databaseUrl);
  if (!confirmHost) {
    throw new DemoResetNotAllowedError(
      `Falta --confirm=<host>: escribe el host de la BD que se va a vaciar (${host}). No se ha tocado nada.`,
    );
  }
  if (confirmHost.toLowerCase() !== host) {
    throw new DemoResetNotAllowedError(
      `--confirm=${confirmHost} no coincide con el host de la BD (${host}). No se ha tocado nada.`,
    );
  }
}

/**
 * Tablas de ventas que se vacían, en orden de dependencias (hijas primero). `refund_requests` apunta a `orders` y
 * `refunds` con NOT NULL: sin vaciarla no se pueden borrar las órdenes. De `event_seats` solo se borra el inventario
 * de los eventos del seed (ver `resetDemo`).
 */
const SALES_TABLES = {
  checkInScans,
  refundRequests,
  tickets,
  refunds,
  eventSeats,
  orders,
  payouts,
  stripeEvents,
} satisfies Record<string, PgTable>;

export type ResetDemoReport = {
  /** Filas borradas por tabla de ventas (`eventSeats`: solo las de los eventos del seed). */
  deleted: Record<keyof typeof SALES_TABLES, number>;
  /** Lugares de eventos que no son del seed que pasaron a `available` (estaban vendidos, retenidos o con pedido). */
  releasedEventSeats: number;
  /** Slugs (ordenados) de los eventos que no son del seed cuyo inventario se liberó. */
  releasedEvents: string[];
  /** Lo que escribió el seed (inventario regenerado, eventos reasignados). */
  seed: SeedReport;
  /** Correos de los organizadores sintéticos borrados (`organizers` + `users`). */
  removedOrganizers: string[];
  /** Correos de los organizadores sintéticos que se conservan porque otra fila los referencia (ver `USER_REFERENCES`). */
  keptOrganizers: string[];
};

export type ResetDemoOptions = SeedOptions & { guard: DemoResetGuard };

type Tx = Parameters<Parameters<NodePgDatabase["transaction"]>[0]>[0];

/**
 * Organizador sintético de un seed anterior (`<nombre>@example.com`, id `seedUuid("user:<correo>")`, sin `clerk_id`).
 * Nunca el super admin ni un organizador de `SEED_ORGANIZER_EMAILS`.
 */
export function isLegacySeedOrganizer(
  user: { id: string; email: string; clerkId: string | null; role: string },
  { superAdminEmail, organizerEmails }: SeedRoles,
): boolean {
  return (
    user.role === "organizer" &&
    user.clerkId === null &&
    user.email.endsWith("@example.com") &&
    user.id === seedUuid(`user:${user.email}`) &&
    user.email !== superAdminEmail &&
    !organizerEmails.includes(user.email)
  );
}

/**
 * Todas las FKs a `users.id` o a `organizers.user_id` (salvo la de `organizers` misma, que se borra junto al usuario).
 * Un organizador sintético referenciado por cualquiera de ellas se conserva: borrarlo rompería la FK y abortaría el
 * reset. Un test compara esta lista con las FKs reales del catálogo de Postgres.
 */
export const USER_REFERENCES: readonly PgColumn[] = [
  events.organizerId,
  events.reviewedBy,
  eventStaff.userId,
  eventStaff.invitedBy,
  savedEvents.userId,
  venues.organizerId,
  venues.createdBy,
  auditLogs.actorId,
  legalDocuments.publishedBy,
  consents.userId,
  complaints.userId,
  complaints.respondedBy,
  organizerApplications.userId,
  organizerApplications.reviewedBy,
  organizerRequests.organizerId,
  organizerRequests.resolvedBy,
  privacyRequests.userId,
  privacyRequests.resolvedBy,
  refundRequests.userId,
  refundRequests.resolvedBy,
  orders.userId,
  refunds.requestedBy,
  tickets.checkedInBy,
  checkInScans.scannedBy,
  payouts.organizerId,
  eventNotifications.createdBy,
];

/**
 * Borra los organizadores sintéticos que nada referencia (tras la reasignación del seed) y devuelve también los que se
 * conservan por estar referenciados.
 */
async function removeLegacyOrganizers(
  tx: Tx,
  roles: SeedRoles,
): Promise<Pick<ResetDemoReport, "removedOrganizers" | "keptOrganizers">> {
  const unreferenced = and(
    ...USER_REFERENCES.map((column) =>
      notExists(tx.select({ one: sql`1` }).from(column.table).where(eq(column, users.id))),
    ),
  ) as SQL;
  const candidates = await tx
    .select({
      id: users.id,
      email: users.email,
      clerkId: users.clerkId,
      role: users.role,
      unreferenced: sql<boolean>`${unreferenced}`,
    })
    .from(users)
    .innerJoin(organizers, eq(organizers.userId, users.id))
    .where(
      and(
        eq(users.role, "organizer"),
        isNull(users.clerkId),
        like(users.email, "%@example.com"),
        notInArray(users.email, [roles.superAdminEmail, ...roles.organizerEmails]),
      ),
    );
  const legacy = candidates.filter((user) => isLegacySeedOrganizer(user, roles));
  const removable = legacy.filter((user) => user.unreferenced);
  const keptOrganizers = legacy
    .filter((user) => !user.unreferenced)
    .map((user) => user.email)
    .sort();
  if (removable.length === 0) return { removedOrganizers: [], keptOrganizers };

  const ids = removable.map((user) => user.id);
  await tx.delete(organizers).where(inArray(organizers.userId, ids));
  await tx.delete(users).where(inArray(users.id, ids));
  return { removedOrganizers: removable.map((user) => user.email).sort(), keptOrganizers };
}

/**
 * Ids de los eventos que siembra `buildSeedData`: dependen solo del slug (`seedUuid("event:<slug>")`), así que no
 * importan los ids de usuario ni el `now` que se le pasen. Un evento creado en el panel nunca tiene uno de estos ids.
 */
function seedEventIds(roles: SeedRoles, now: Date): string[] {
  const userOf = (email: string) => ({ id: seedUuid(`user:${email}`), email });
  return buildSeedData({
    superAdminId: userOf(roles.superAdminEmail).id,
    organizers: roles.organizerEmails.map(userOf),
    now,
  }).events.flatMap((event) => event.id ?? []);
}

/**
 * Libera el inventario de los eventos que no son del seed (enmienda 8): `available`, sin pedido ni retención. Así un
 * evento creado en el panel conserva su inventario. Va antes de borrar las órdenes, por la FK `event_seats.order_id`.
 */
async function releaseForeignInventory(
  tx: Tx,
  notSeedEvent: SQL,
): Promise<Pick<ResetDemoReport, "releasedEventSeats" | "releasedEvents">> {
  const released = await tx
    .update(eventSeats)
    .set({ status: "available", orderId: null, heldUntil: null, updatedAt: sql`now()` })
    .where(
      and(
        notSeedEvent,
        or(not(eq(eventSeats.status, "available")), isNotNull(eventSeats.orderId), isNotNull(eventSeats.heldUntil)),
      ),
    )
    .returning({ eventId: eventSeats.eventId });
  const eventIds = [...new Set(released.map((seat) => seat.eventId))];
  const releasedEvents =
    eventIds.length === 0
      ? []
      : (await tx.select({ slug: events.slug }).from(events).where(inArray(events.id, eventIds)))
          .map((event) => event.slug)
          .sort();
  return { releasedEventSeats: released.length, releasedEvents };
}

/**
 * Reset de los datos demo, en una sola transacción (si algo falla no queda nada a medias):
 * 1. comprueba la protección (`assertDemoResetAllowed`) y los correos del seed antes de escribir;
 * 2. vacía las tablas de ventas (DELETE en orden de FKs; un consentimiento o reclamo ligado a una orden aborta todo)
 *    y reinicia `order_code_seq`. Del inventario, antes libera (`available`, sin pedido) el de los eventos que no son
 *    del seed, y luego borra solo el de los eventos del seed;
 * 3. ejecuta el seed: regenera el inventario `available` de sus eventos y los reasigna a los organizadores reales;
 * 4. borra los organizadores sintéticos `@example.com` que nada referencia; los referenciados se conservan y se
 *    listan en `keptOrganizers`.
 * Conserva a los usuarios con `clerk_id` y al super admin. `database` debe ser la BD de `guard.databaseUrl`.
 */
export async function resetDemo(database: NodePgDatabase, options: ResetDemoOptions): Promise<ResetDemoReport> {
  assertDemoResetAllowed(options.guard);
  const roles = parseSeedRoles(options);

  return database.transaction(async (tx) => {
    // Nadie crea órdenes ni toca el inventario mientras tanto (las lecturas siguen): el código de orden se reinicia.
    await tx.execute(sql`LOCK TABLE ${orders}, ${eventSeats}, ${tickets} IN EXCLUSIVE MODE`);

    const [{ legalRecords }] = await tx
      .select({ legalRecords: count() })
      .from(consents)
      .where(isNotNull(consents.orderId));
    const [{ complaintRecords }] = await tx
      .select({ complaintRecords: count() })
      .from(complaints)
      .where(isNotNull(complaints.orderId));
    if (legalRecords + complaintRecords > 0) {
      throw new DemoResetBlockedError(
        `Hay ${legalRecords} consentimientos y ${complaintRecords} reclamos ligados a órdenes: son registros legales y ` +
          "db:reset-demo no los borra. No se ha tocado nada.",
      );
    }

    const seedEvent = sql`${eventSeats.eventId} = ANY(${sql.param(seedEventIds(roles, options.now))}::uuid[])`;
    // Primero se libera el inventario ajeno al seed: después ya no apunta a ninguna orden que se vaya a borrar.
    const release = await releaseForeignInventory(tx, not(seedEvent));
    const deleted = {} as ResetDemoReport["deleted"];
    for (const [name, table] of Object.entries(SALES_TABLES) as [keyof typeof SALES_TABLES, PgTable][]) {
      deleted[name] = (await tx.delete(table).where(name === "eventSeats" ? seedEvent : undefined)).rowCount ?? 0;
    }
    await tx.execute(sql`ALTER SEQUENCE order_code_seq RESTART`);

    const seedReport = await seed(tx, { ...roles, now: options.now });
    const organizerCleanup = await removeLegacyOrganizers(tx, roles);
    return { deleted, ...release, seed: seedReport, ...organizerCleanup };
  });
}
