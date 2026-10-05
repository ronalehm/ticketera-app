// Solo para tests de integración (describeWithDb): eventos propios que no tocan el seed (en `draft` no llegan al
// catálogo; `published`, para comprar, sí), y ventas de prueba (el seed no siembra ventas: spec admin-panel, F2).
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { orders, tickets } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";

export type TestEventOptions = {
  /** Lugares de la zona general (sección `general`). */
  general?: number;
  /** Asientos de la sección `numbered`: `seatsPerRow` por cada fila (1–2 letras mayúsculas). */
  numbered?: { rows: string[]; seatsPerRow: number };
  /** Precio de cada tipo de entrada. Por defecto S/ 50. */
  priceCents?: number;
  /** Comisión del organizador. Por defecto 10 %. */
  commissionBps?: number;
  /**
   * Estado del evento. Por defecto `draft`; `published` (con los datos que exige `events_draft_complete_check` y una
   * fecha lejana) para reservar y pagar, porque el checkout solo vende eventos publicados.
   */
  status?: "draft" | "published";
};

/** Prefijo del slug de los eventos de `createTestEvent`: los tests del catálogo los ignoran (pueden estar publicados). */
export const TEST_EVENT_SLUG_PREFIX = "test-checkout-";

/** Fecha de los eventos de prueba publicados: lejana, para quedar al final del catálogo y de los relacionados. */
const PUBLISHED_TEST_EVENT_STARTS_AT = new Date("2099-12-31T01:00:00Z");

export type TestEvent = {
  eventId: string;
  slug: string;
  generalTicketTypeId?: string;
  numberedTicketTypeId?: string;
  generalSlug?: string;
  numberedSlug?: string;
  numberedSectionSlug?: string;
  /** Borra el evento, sus órdenes (y entradas), el recinto, el organizador y su usuario. */
  cleanup: () => Promise<void>;
};

const GENERAL_SLUG = "general";
const NUMBERED_SLUG = "numbered";

/** Crea un evento de prueba (`draft` por defecto) con sufijo aleatorio, sus `ticket_types` y `event_seats` disponibles. */
export async function createTestEvent(options: TestEventOptions = {}): Promise<TestEvent> {
  const { general, numbered, priceCents = 5000, commissionBps = 1000, status = "draft" } = options;
  const suffix = randomUUID().slice(0, 8);
  const slug = `${TEST_EVENT_SLUG_PREFIX}${suffix}`;

  const created = await db.transaction(async (tx) => {
    const [{ id: userId }] = await tx
      .insert(users)
      .values({ email: `fixture.${suffix}@example.com`, firstName: "Prueba", lastName: suffix, role: "organizer" })
      .returning({ id: users.id });
    await tx.insert(organizers).values({
      userId,
      legalName: `Organizador de prueba ${suffix}`,
      taxIdType: "ruc",
      taxId: `test-${suffix}`,
      commissionBps,
    });
    const [{ id: venueId }] = await tx
      .insert(venues)
      .values({ name: `Recinto ${suffix}`, address: "Av. Prueba 123", city: "Lima", status: "approved", createdBy: userId })
      .returning({ id: venues.id });
    const [{ id: categoryId }] = await tx.select({ id: categories.id }).from(categories).limit(1);
    const [{ id: eventId }] = await tx
      .insert(events)
      .values({
        slug,
        organizerId: userId,
        venueId,
        categoryId,
        title: `Evento de prueba ${suffix}`,
        minAge: 0,
        status,
        searchText: slug,
        ...(status === "published" && {
          description: "Evento de prueba",
          imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
          startsAt: PUBLISHED_TEST_EVENT_STARTS_AT,
          doorsOpenAt: PUBLISHED_TEST_EVENT_STARTS_AT,
        }),
      })
      .returning({ id: events.id });

    const result: Omit<TestEvent, "cleanup"> & { userId: string; venueId: string } = { eventId, slug, userId, venueId };

    if (general !== undefined) {
      const [section] = await tx
        .insert(venueSections)
        .values({ venueId, slug: GENERAL_SLUG, name: "General", sortOrder: 0, seating: "general", capacity: general })
        .returning({ id: venueSections.id });
      const [type] = await tx
        .insert(ticketTypes)
        .values({ eventId, sectionId: section.id, slug: GENERAL_SLUG, name: "General", priceCents, sortOrder: 0 })
        .returning({ id: ticketTypes.id });
      await tx
        .insert(eventSeats)
        .values(Array.from({ length: general }, () => ({ eventId, ticketTypeId: type.id })));
      Object.assign(result, { generalTicketTypeId: type.id, generalSlug: GENERAL_SLUG });
    }

    if (numbered) {
      const [section] = await tx
        .insert(venueSections)
        .values({ venueId, slug: NUMBERED_SLUG, name: "Platea", sortOrder: 1, seating: "numbered" })
        .returning({ id: venueSections.id });
      const seats = await tx
        .insert(venueSeats)
        .values(
          numbered.rows.flatMap((rowLabel, rowIndex) =>
            Array.from({ length: numbered.seatsPerRow }, (_, index) => ({
              sectionId: section.id,
              rowLabel,
              number: index + 1,
              x: index * 10,
              y: rowIndex * 10,
            })),
          ),
        )
        .returning({ id: venueSeats.id });
      const [type] = await tx
        .insert(ticketTypes)
        .values({ eventId, sectionId: section.id, slug: NUMBERED_SLUG, name: "Platea", priceCents, sortOrder: 1 })
        .returning({ id: ticketTypes.id });
      await tx
        .insert(eventSeats)
        .values(seats.map((seat) => ({ eventId, ticketTypeId: type.id, venueSeatId: seat.id })));
      Object.assign(result, {
        numberedTicketTypeId: type.id,
        numberedSlug: NUMBERED_SLUG,
        numberedSectionSlug: NUMBERED_SLUG,
      });
    }

    return result;
  });

  const { userId, venueId, ...testEvent } = created;
  return { ...testEvent, cleanup: () => deleteTestEvent(testEvent.eventId, venueId, userId) };
}

async function deleteTestEvent(eventId: string, venueId: string, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const orderIds = tx.select({ id: orders.id }).from(orders).where(eq(orders.eventId, eventId));
    await tx.delete(tickets).where(inArray(tickets.orderId, orderIds));
    await tx.delete(eventSeats).where(eq(eventSeats.eventId, eventId));
    await tx.delete(orders).where(eq(orders.eventId, eventId));
    await tx.delete(ticketTypes).where(eq(ticketTypes.eventId, eventId));
    await tx.delete(events).where(eq(events.id, eventId));
    const sectionIds = tx.select({ id: venueSections.id }).from(venueSections).where(eq(venueSections.venueId, venueId));
    await tx.delete(venueSeats).where(inArray(venueSeats.sectionId, sectionIds));
    await tx.delete(venueSections).where(eq(venueSections.venueId, venueId));
    await tx.delete(venues).where(eq(venues.id, venueId));
    await tx.delete(organizers).where(eq(organizers.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });
}

export type SellTestSeatsFilter = {
  /** Solo los lugares de estos tipos de entrada (slug). */
  ticketTypes?: string[];
  /** Solo estas butacas, con el id del mapa: `<sección>-<fila>-<número>` (p. ej. `occidente-F-4`). */
  seatIds?: string[];
  /** Como mucho estos lugares. */
  count?: number;
};

/**
 * Vende a una orden `paid` de prueba los lugares disponibles del evento `slug` que cumplan `filter` (todos sin filtro);
 * devuelve la orden y los lugares. Sobre un evento del seed, úsalo solo dentro de `inRolledBackTransaction` (con
 * `vi.mock("@/lib/db/client", …)`), para no dejar ventas en la BD que comparten los demás tests.
 */
export async function sellTestSeats(
  slug: string,
  filter: SellTestSeatsFilter = {},
): Promise<{ orderId: string; eventSeatIds: string[] }> {
  return db.transaction(async (tx) => {
    const seats = await tx
      .select({ id: eventSeats.id, eventId: eventSeats.eventId })
      .from(eventSeats)
      .innerJoin(events, eq(events.id, eventSeats.eventId))
      .innerJoin(ticketTypes, eq(ticketTypes.id, eventSeats.ticketTypeId))
      .leftJoin(venueSeats, eq(venueSeats.id, eventSeats.venueSeatId))
      .leftJoin(venueSections, eq(venueSections.id, venueSeats.sectionId))
      .where(
        and(
          eq(events.slug, slug),
          eq(eventSeats.status, "available"),
          isNull(eventSeats.retiredAt),
          filter.ticketTypes && inArray(ticketTypes.slug, filter.ticketTypes),
          filter.seatIds &&
            inArray(sql`${venueSections.slug} || '-' || ${venueSeats.rowLabel} || '-' || ${venueSeats.number}`, filter.seatIds),
        ),
      )
      .orderBy(eventSeats.id)
      .then((rows) => rows.slice(0, filter.count));
    if (seats.length === 0) throw new Error(`sellTestSeats: no hay lugares disponibles en ${slug} con ese filtro`);

    const [{ id: orderId }] = await tx
      .insert(orders)
      .values({
        code: `TK-TEST-${randomUUID().slice(0, 8)}`,
        eventId: seats[0].eventId,
        buyerName: "Comprador de prueba",
        buyerEmail: "comprador.prueba@example.com",
        buyerPhone: "+51900000000",
        buyerDocumentType: "dni",
        buyerDocumentNumber: "00000000",
        status: "paid",
        expiresAt: new Date(),
        paidAt: new Date(),
        ticketCount: seats.length,
        subtotalCents: 0,
        platformFeeCents: 0,
        organizerAmountCents: 0,
      })
      .returning({ id: orders.id });
    const eventSeatIds = seats.map((seat) => seat.id);
    await tx.update(eventSeats).set({ status: "sold", orderId }).where(inArray(eventSeats.id, eventSeatIds));
    return { orderId, eventSeatIds };
  });
}
