import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { z } from "zod";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
// Excepción documentada (spec data-foundation, Decisión 15): el seed es tooling y lee internals de los módulos.
import { EVENTS_MOCK } from "@/modules/events/data/events.mock";
import { EVENT_CATEGORY_LABELS } from "@/modules/events/format";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";
import { eventDetailSchema } from "@/modules/events/schemas/events.schema";
import { getAvailabilityStatus, LOW_STOCK_RATIO } from "@/modules/events/utils/availability";
import { normalizeText } from "@/modules/events/utils/eventFilters";
import { ORGANIZER_DRAFTS_MOCK, ORGANIZER_SALES_MOCK } from "@/modules/organizer/data/organizerEvents.mock";
import { organizerEventSchema } from "@/modules/organizer/schemas/organizer.schema";
import { VENUE_LAYOUTS_MOCK } from "@/modules/seating/data/venueMaps.mock";
import { venueLayoutSchema } from "@/modules/seating/schemas/seating.schema";

export const DEMO_GENERAL_CAPACITY = 200;
const COMMISSION_BPS = 1000;
/** Base de `events.created_at`: cada evento suma su índice en segundos para conservar el orden del mock. */
const SEED_EPOCH = Date.parse("2026-10-01T05:00:00Z");
/** Parte del inventario general que queda libre en un tipo `low-stock` (Decisión 8). */
const LOW_STOCK_FREE_RATIO = 0.1;
const DEMO_BUYER = {
  buyerName: "Ventas de demostración",
  buyerEmail: "demo@example.com",
  buyerPhone: "+51900000000",
  buyerDocumentType: "dni",
  buyerDocumentNumber: "00000000",
} as const;

type Insert<T extends { $inferInsert: unknown }> = T["$inferInsert"];

export type SeedData = {
  users: Insert<typeof users>[]; // organizadores (el super admin lo inserta seed())
  organizers: Insert<typeof organizers>[];
  categories: Insert<typeof categories>[];
  venues: Insert<typeof venues>[];
  venueSections: Insert<typeof venueSections>[];
  venueSeats: Insert<typeof venueSeats>[];
  events: Insert<typeof events>[];
  ticketTypes: Insert<typeof ticketTypes>[];
  orders: Insert<typeof orders>[];
  eventSeats: Insert<typeof eventSeats>[];
};

type VenueLayout = z.infer<typeof venueLayoutSchema>;
type Zone = VenueLayout["zones"][number];
type MockStatus = "available" | "low-stock" | "sold-out";
type SeatPlan = { venueSeatId: string | null; sold: boolean; key: string };

/** UUID v8 (RFC 9562) derivado de sha256(key): el mismo id en cada ejecución del seed. */
export function seedUuid(key: string): string {
  const bytes = createHash("sha256").update(key).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80; // versión 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 9562
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const toKebab = (text: string) =>
  normalizeText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const toCents = (price: number) => Math.round(price * 100);

/** Geometría del recinto en un layout (sin ocupación ni tipos de entrada, que son del evento). */
function venueGeometry(layout: VenueLayout) {
  return {
    viewBox: layout.viewBox,
    stage: layout.stage,
    zones: layout.zones.map((zone) =>
      zone.kind === "general"
        ? {
            id: zone.id,
            kind: zone.kind,
            path: zone.path,
            labelPos: zone.labelPos,
            wrapLabel: zone.wrapLabel,
            capacity: zone.capacity,
          }
        : {
            id: zone.id,
            kind: zone.kind,
            path: zone.path,
            labelPos: zone.labelPos,
            wrapLabel: zone.wrapLabel,
            seatViewBox: zone.seatViewBox,
            planTransform: zone.planTransform,
            rows: zone.rows.map((row) => row.seats.map(({ row: label, number, x, y }) => ({ label, number, x, y }))),
          },
    ),
  };
}

/**
 * Lugares de una zona general según el estado del mock: libres todos, el 10 % o ninguno. Con `fillAvailable`,
 * una zona `available` deja libre solo lo justo para seguir `available` (el 20 % + 1), para que el evento
 * entero pueda quedar en `low-stock` (p. ej. `festival-vive-latino-lima`).
 */
function generalSeatPlan(key: string, capacity: number, status: MockStatus, fillAvailable: boolean): SeatPlan[] {
  const free = {
    available: fillAvailable ? Math.floor(capacity * LOW_STOCK_RATIO) + 1 : capacity,
    "low-stock": Math.ceil(capacity * LOW_STOCK_FREE_RATIO),
    "sold-out": 0,
  }[status];
  return Array.from({ length: capacity }, (_, index) => ({
    venueSeatId: null,
    sold: index >= free,
    key: `${key}:${index}`,
  }));
}

/** Filas de cada tabla a partir de los mocks. Pura y determinista; lanza `Error` si los mocks son incoherentes. */
export function buildSeedData({ superAdminId }: { superAdminId: string }): SeedData {
  const mockEvents = eventDetailSchema.array().parse(EVENTS_MOCK);
  const layouts = venueLayoutSchema.array().parse(VENUE_LAYOUTS_MOCK);
  const drafts = organizerEventSchema.array().parse(ORGANIZER_DRAFTS_MOCK);

  const data: SeedData = {
    users: [],
    organizers: [],
    categories: Object.entries(EVENT_CATEGORY_LABELS).map(([slug, name]) => ({
      id: seedUuid(`category:${slug}`),
      slug,
      name,
    })),
    venues: [],
    venueSections: [],
    venueSeats: [],
    events: [],
    ticketTypes: [],
    orders: [],
    eventSeats: [],
  };

  const organizerIds = new Map<string, string>();
  function organizerId(name: string): string {
    const existing = organizerIds.get(name);
    if (existing) return existing;
    const email = `${toKebab(name)}@example.com`;
    const id = seedUuid(`user:${email}`);
    organizerIds.set(name, id);
    data.users.push({ id, email, firstName: name, lastName: "", role: "organizer", clerkId: null });
    data.organizers.push({
      userId: id,
      legalName: name,
      taxIdType: "ruc",
      taxId: `20${String(organizerIds.size).padStart(9, "0")}`,
      commissionBps: COMMISSION_BPS,
      payoutsEnabled: false,
    });
    return id;
  }

  const venueGeometries = new Map<string, ReturnType<typeof venueGeometry>>();
  function venueId(name: string, city: string, address: string, layout: VenueLayout | undefined): string {
    const key = `${name}:${city}`;
    const id = seedUuid(`venue:${key}`);
    if (layout) {
      const geometry = venueGeometry(layout);
      const previous = venueGeometries.get(key);
      if (previous && !isDeepStrictEqual(previous, geometry)) {
        throw new Error(`Dos layouts distintos para el recinto "${name}" (${city})`);
      }
      venueGeometries.set(key, geometry);
    }
    const existing = data.venues.find((venue) => venue.id === id);
    if (!existing) {
      data.venues.push({
        id,
        name,
        city,
        address,
        mapViewBox: layout?.viewBox ?? null,
        stage: layout?.stage ?? null,
        createdBy: superAdminId,
      });
    } else if (layout && !existing.mapViewBox) {
      existing.mapViewBox = layout.viewBox;
      existing.stage = layout.stage;
    }
    return id;
  }

  function sectionId(row: Omit<Insert<typeof venueSections>, "id">, venueKey: string): string {
    const id = seedUuid(`venue-section:${venueKey}:${row.slug}`);
    const existing = data.venueSections.find((section) => section.id === id);
    if (existing && existing.name !== row.name) {
      throw new Error(`Sección "${row.slug}" repetida con nombres distintos en ${venueKey}: ${existing.name} / ${row.name}`);
    }
    if (!existing) data.venueSections.push({ id, ...row });
    return id;
  }

  /** Sección y asientos de una zona del mapa; devuelve la sección y el plan de lugares del evento. */
  function zoneSection(
    zone: Zone,
    zoneIndex: number,
    name: string,
    venueId: string,
    venueKey: string,
    status: MockStatus,
    fillAvailable: boolean,
  ) {
    const base = {
      venueId,
      slug: zone.id,
      name,
      sortOrder: zoneIndex,
      mapPath: zone.path,
      labelX: zone.labelPos.x,
      labelY: zone.labelPos.y,
      wrapLabel: zone.wrapLabel ?? false,
    };
    if (zone.kind === "general") {
      const id = sectionId({ ...base, seating: "general", capacity: zone.capacity, seatViewBox: null }, venueKey);
      return { id, seats: generalSeatPlan(id, zone.capacity, status, fillAvailable) };
    }
    const isNew = !data.venueSections.some((section) => section.slug === zone.id && section.venueId === venueId);
    const id = sectionId(
      {
        ...base,
        seating: "numbered",
        capacity: null,
        seatViewBox: zone.seatViewBox,
        planTransform: zone.planTransform ?? null,
      },
      venueKey,
    );
    const seats = zone.rows.flatMap((row) =>
      row.seats.map((seat) => {
        const venueSeatId = seedUuid(`venue-seat:${venueKey}:${seat.id}`);
        if (isNew) {
          data.venueSeats.push({
            id: venueSeatId,
            sectionId: id,
            rowLabel: seat.row,
            number: seat.number,
            x: seat.x,
            y: seat.y,
            // ponytail: un asiento accesible que el mock marca ocupado se siembra no accesible (el mock no lo conserva).
            accessible: seat.status === "accessible",
          });
        }
        return { venueSeatId, sold: seat.status === "occupied", key: seat.id };
      }),
    );
    return { id, seats };
  }

  mockEvents.forEach((event, eventIndex) => {
    const layout = layouts.find((candidate) => candidate.eventSlug === event.slug);
    for (const zone of layout?.zones ?? []) {
      if (!event.ticketTypes.some((ticketType) => ticketType.id === zone.ticketTypeId)) {
        throw new Error(`La zona "${zone.id}" de ${event.slug} apunta a un tipo de entrada inexistente: ${zone.ticketTypeId}`);
      }
    }

    const eventId = seedUuid(`event:${event.slug}`);
    const venueKey = `${event.venue}:${event.city}`;
    const eventVenueId = venueId(event.venue, event.city, event.address, layout);
    data.events.push({
      id: eventId,
      slug: event.slug,
      organizerId: organizerId(event.organizer),
      venueId: eventVenueId,
      categoryId: seedUuid(`category:${event.category}`),
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      startsAt: new Date(event.startsAt),
      doorsOpenAt: new Date(event.doorsOpenAt),
      minAge: event.minAge,
      featured: event.featured,
      status: "published",
      searchText: normalizeText(`${event.title} ${event.venue} ${event.city}`),
      createdAt: new Date(SEED_EPOCH + eventIndex * 1000),
    });

    const orderId = seedUuid(`order:${event.slug}`);
    let subtotalCents = 0;
    const eventSeatRows: Insert<typeof eventSeats>[] = [];

    /** Sección y plan de lugares de cada tipo de entrada (las secciones y asientos se registran una sola vez). */
    const planTicketTypes = (fillAvailable: boolean) =>
      event.ticketTypes.map((ticketType, ticketTypeIndex) => {
        const zoneIndex = layout?.zones.findIndex((zone) => zone.ticketTypeId === ticketType.id) ?? -1;
        if (layout && zoneIndex >= 0) {
          const zone = layout.zones[zoneIndex];
          return zoneSection(zone, zoneIndex, ticketType.name, eventVenueId, venueKey, ticketType.status, fillAvailable);
        }
        const id = sectionId(
          {
            venueId: eventVenueId,
            slug: ticketType.id,
            name: ticketType.name,
            sortOrder: ticketTypeIndex,
            seating: "general",
            capacity: DEMO_GENERAL_CAPACITY,
          },
          venueKey,
        );
        return { id, seats: generalSeatPlan(id, DEMO_GENERAL_CAPACITY, ticketType.status, fillAvailable) };
      });
    const eventStatus = (plans: { seats: SeatPlan[] }[]) => {
      const seats = plans.flatMap((plan) => plan.seats);
      return getAvailabilityStatus(seats.filter((seat) => !seat.sold).length, seats.length);
    };
    let sections = planTicketTypes(false);
    if (eventStatus(sections) !== event.status) sections = planTicketTypes(true);
    if (eventStatus(sections) !== event.status) {
      throw new Error(`No se puede reproducir el estado "${event.status}" del evento ${event.slug}`);
    }

    event.ticketTypes.forEach((ticketType, ticketTypeIndex) => {
      const section = sections[ticketTypeIndex];
      const ticketTypeId = seedUuid(`ticket-type:${event.slug}:${ticketType.id}`);
      const priceCents = toCents(ticketType.price);
      data.ticketTypes.push({
        id: ticketTypeId,
        eventId,
        sectionId: section.id,
        slug: ticketType.id,
        name: ticketType.name,
        description: ticketType.description ?? null,
        priceCents,
        maxPerOrder: MAX_TICKETS_PER_ORDER,
        sortOrder: ticketTypeIndex,
      });

      for (const seat of section.seats) {
        if (seat.sold) subtotalCents += priceCents;
        eventSeatRows.push({
          id: seedUuid(`event-seat:${event.slug}:${ticketType.id}:${seat.key}`),
          eventId,
          ticketTypeId,
          venueSeatId: seat.venueSeatId,
          status: seat.sold ? "sold" : "available",
          orderId: seat.sold ? orderId : null,
        });
      }
    });

    if (eventSeatRows.some((seat) => seat.status === "sold")) {
      const platformFeeCents = Math.round((subtotalCents * COMMISSION_BPS) / 10000);
      const demoDate = new Date(SEED_EPOCH);
      // ponytail: orden `paid` sin `tickets`; en F3 se decide si el seed los emite (Preguntas abiertas 2 y 5).
      data.orders.push({
        id: orderId,
        code: `TK-DEMO-${String(eventIndex + 1).padStart(3, "0")}`,
        eventId,
        userId: null,
        ...DEMO_BUYER,
        status: "paid",
        expiresAt: demoDate,
        paidAt: demoDate,
        subtotalCents,
        platformFeeCents,
        organizerAmountCents: subtotalCents - platformFeeCents,
      });
    }
    data.eventSeats.push(...eventSeatRows);
  });

  const draftOrganizerSlug = ORGANIZER_SALES_MOCK[0]?.slug;
  const draftOrganizer = mockEvents.find((event) => event.slug === draftOrganizerSlug)?.organizer;
  if (!draftOrganizer) throw new Error(`ORGANIZER_SALES_MOCK apunta a un evento inexistente: ${draftOrganizerSlug}`);

  drafts.forEach((draft, draftIndex) => {
    if (!draft.startsAt || !draft.imageUrl || draft.priceFrom === null) {
      throw new Error(`El borrador "${draft.title}" necesita fecha, imagen y precio para sembrarse`);
    }
    const slug = toKebab(draft.title);
    const eventId = seedUuid(`event:${slug}`);
    const draftVenueId = venueId(draft.venue, draft.city, "Por confirmar", undefined);
    const startsAt = new Date(draft.startsAt);
    data.events.push({
      id: eventId,
      slug,
      organizerId: organizerId(draftOrganizer),
      venueId: draftVenueId,
      categoryId: seedUuid(`category:${draft.category}`),
      title: draft.title,
      description: "Borrador sin descripción.",
      imageUrl: draft.imageUrl,
      startsAt,
      doorsOpenAt: startsAt,
      minAge: 0,
      featured: false,
      status: "draft",
      searchText: normalizeText(`${draft.title} ${draft.venue} ${draft.city}`),
      createdAt: new Date(SEED_EPOCH + (mockEvents.length + draftIndex) * 1000),
    });
    const draftSectionId = sectionId(
      {
        venueId: draftVenueId,
        slug: "general",
        name: "General",
        sortOrder: 0,
        seating: "general",
        capacity: draft.capacity,
      },
      `${draft.venue}:${draft.city}`,
    );
    // Sin event_seats: se generan al publicar.
    data.ticketTypes.push({
      id: seedUuid(`ticket-type:${slug}:general`),
      eventId,
      sectionId: draftSectionId,
      slug: "general",
      name: "General",
      description: null,
      priceCents: toCents(draft.priceFrom),
      maxPerOrder: MAX_TICKETS_PER_ORDER,
      sortOrder: 0,
    });
  });

  return data;
}
