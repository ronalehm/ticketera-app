import "server-only";

import { and, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { isActiveSaleOrder } from "@/lib/db/activeSales";
import { db } from "@/lib/db/client";
import { escapeLike } from "@/lib/db/escapeLike";
import { eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { normalizeText } from "@/lib/text";
import { roleCan } from "@/modules/auth/permissions";
import type { SessionUser } from "@/modules/auth/server";
import { managedEventSchema } from "../schemas/managedEvents.schema";
import type { ManagedEvent, ManagedEventsFilters } from "../types/events.types";

type Actor = Pick<SessionUser, "id" | "role">;
type Queryable = Pick<typeof db, "select">;

/** Suma `column` de las órdenes `paid` del evento (Decisión 10: sin `refunded` ni `partially_refunded`). */
function paidOrdersSum(column: AnyPgColumn) {
  return sql<number>`(select coalesce(sum(${column}), 0) from ${orders} where ${orders.eventId} = ${events.id} and ${orders.status} = 'paid')`.mapWith(
    Number,
  );
}

/** Lugares del inventario del evento, sin los retirados (desde `published`, cuando ya se generó al aprobar). */
const inventoryCapacity = sql`(select count(*) from ${eventSeats} where ${eventSeats.eventId} = ${events.id} and ${eventSeats.retiredAt} is null)`;

/**
 * Capacidad configurada de un evento aún sin inventario (`draft` o `pending_review`: se genera al aprobar): por cada
 * tipo de entrada, su sección del recinto; una general aporta su `capacity` y una numerada sus `venue_seats`.
 */
const configuredCapacity = sql`(select coalesce(sum(case when ${venueSections.seating} = 'general' then ${venueSections.capacity} else (select count(*) from ${venueSeats} where ${venueSeats.sectionId} = ${venueSections.id}) end), 0) from ${ticketTypes} inner join ${venueSections} on ${venueSections.id} = ${ticketTypes.sectionId} where ${ticketTypes.eventId} = ${events.id})`;

/** Título (tal cual) o `search_text` (título, recinto y ciudad normalizados) contienen `q`. */
function matchesQuery(q: string): SQL | undefined {
  return or(
    ilike(events.title, `%${escapeLike(q)}%`),
    ilike(events.searchText, `%${escapeLike(normalizeText(q))}%`),
  );
}

const DAY_MS = 86_400_000;

/**
 * Medianoche de Lima del día `YYYY-MM-DD` (Decisión 2). Perú no tiene horario de verano: el offset es siempre -05:00,
 * así que el día siguiente empieza exactamente `DAY_MS` después.
 */
const limaMidnight = (day: string) => new Date(`${day}T00:00:00-05:00`);

/**
 * Eventos que `actor` gestiona en el panel, con sus ventas, por fecha de inicio (los borradores sin fecha al final).
 * Alcance: con `events:manageAny` (admin, super_admin) todos; si no, solo los suyos (`organizer_id = actor.id`).
 * Ingresos: `organizer_amount_cents` para el organizador y `subtotal_cents` (bruto) para el admin.
 * Un rol sin `events:manageOwn` (customer) no gestiona eventos: devuelve `[]` sin consultar. Autorizar es tarea de quien
 * llama (`requirePermission`); este servicio solo acota el alcance.
 */
export async function listManagedEvents(
  actor: Actor,
  { status = "all", q = "", from = "", to = "" }: Partial<ManagedEventsFilters> = {},
  database: Queryable = db,
): Promise<ManagedEvent[]> {
  if (!roleCan(actor.role, "events:manageOwn")) return [];
  const manageAny = roleCan(actor.role, "events:manageAny");
  const query = q.trim();

  const rows = await database
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      status: events.status,
      startsAt: events.startsAt,
      venue: venues.name,
      city: venues.city,
      imageUrl: events.imageUrl,
      organizer: sql<string>`coalesce(${organizers.legalName}, trim(${users.firstName} || ' ' || ${users.lastName}))`,
      sold: paidOrdersSum(orders.ticketCount),
      hasActiveSales: sql<boolean>`exists (select 1 from ${orders} where ${orders.eventId} = ${events.id} and ${isActiveSaleOrder})`,
      revenueCents: paidOrdersSum(manageAny ? orders.subtotalCents : orders.organizerAmountCents),
      capacity: sql<number>`case when ${events.status} in ('draft', 'pending_review') then ${configuredCapacity} else ${inventoryCapacity} end`.mapWith(
        Number,
      ),
    })
    .from(events)
    .innerJoin(users, eq(users.id, events.organizerId))
    .leftJoin(organizers, eq(organizers.userId, events.organizerId))
    .leftJoin(venues, eq(venues.id, events.venueId))
    .where(
      and(
        manageAny ? undefined : eq(events.organizerId, actor.id),
        status === "all" ? undefined : eq(events.status, status),
        query ? matchesQuery(query) : undefined,
        // Con un límite, `starts_at` null no cumple la comparación: los borradores sin fecha quedan fuera.
        from ? gte(events.startsAt, limaMidnight(from)) : undefined,
        to ? lt(events.startsAt, new Date(limaMidnight(to).getTime() + DAY_MS)) : undefined,
      ),
    )
    .orderBy(sql`${events.startsAt} asc nulls last`, events.title, events.id);

  return managedEventSchema
    .array()
    .parse(rows.map((row) => ({ ...row, startsAt: row.startsAt?.toISOString() ?? null })));
}
