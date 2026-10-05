import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { z } from "zod";
import { categories, eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { organizers, users } from "@/lib/db/schema/identity";
import { legalDocuments } from "@/lib/db/schema/legal";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import { normalizeText, slugify } from "@/lib/text";
// Excepción documentada (spec data-foundation, Decisión 15; auth-clerk, Decisión 13): el seed es tooling y lee
// internals de los módulos.
import { EVENTS_MOCK } from "@/modules/events/data/events.mock";
import { EVENT_CATEGORY_LABELS } from "@/modules/events/format";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";
import { eventDetailSchema } from "@/modules/events/schemas/events.schema";
import { LEGAL_DOCUMENTS_MOCK } from "@/modules/legal/data/legalDocuments.mock";
import { legalDocumentSchema } from "@/modules/legal/schemas/legal.schema";
import { ORGANIZER_DRAFTS_MOCK } from "@/modules/organizer/data/organizerEvents.mock";
import { organizerEventSchema } from "@/modules/organizer/schemas/organizer.schema";
import { VENUE_LAYOUTS_MOCK } from "@/modules/seating/data/venueMaps.mock";
import { venueLayoutSchema } from "@/modules/seating/schemas/seating.schema";

export const DEMO_GENERAL_CAPACITY = 200;
const COMMISSION_BPS = 1000;
/** Base de `events.created_at`: cada evento suma su índice en segundos para conservar el orden del mock. */
const SEED_EPOCH = Date.parse("2026-10-01T05:00:00Z");
/** Días entre `now` y el día del primer evento sembrado. */
export const SEED_LEAD_DAYS = 7;
const DAY_MS = 86_400_000;
/** Lima no tiene horario de verano: UTC−5 todo el año. */
const LIMA_OFFSET_MS = -5 * 3_600_000;

type Insert<T extends { $inferInsert: unknown }> = T["$inferInsert"];

export type SeedData = {
  users: Insert<typeof users>[]; // organizadores reales de prueba (el super admin lo inserta seed())
  organizers: Insert<typeof organizers>[];
  categories: Insert<typeof categories>[];
  venues: Insert<typeof venues>[];
  venueSections: Insert<typeof venueSections>[];
  venueSeats: Insert<typeof venueSeats>[];
  events: Insert<typeof events>[];
  ticketTypes: Insert<typeof ticketTypes>[];
  eventSeats: Insert<typeof eventSeats>[];
  legalDocuments: Insert<typeof legalDocuments>[];
};

type VenueLayout = z.infer<typeof venueLayoutSchema>;
type Zone = VenueLayout["zones"][number];
type SeatPlan = { venueSeatId: string | null; key: string };

/** Organizador real de prueba: su fila de `users` (`id` existente o `seedUuid`) y su correo. */
export type SeedOrganizer = { id: string; email: string };

export type BuildSeedDataInput = {
  superAdminId: string;
  /** Al menos uno, en el orden de `parseSeedRoles` (ordenados por correo). */
  organizers: SeedOrganizer[];
  /** Instante de referencia: todas las fechas sembradas son posteriores. */
  now: Date;
};

/** UUID v8 (RFC 9562) derivado de sha256(key): el mismo id en cada ejecución del seed. */
export function seedUuid(key: string): string {
  const bytes = createHash("sha256").update(key).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80; // versión 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 9562
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const toCents = (price: number) => Math.round(price * 100);

/** Lugares de una zona general: todos disponibles (el seed no siembra ventas). */
const generalSeatPlan = (key: string, capacity: number): SeatPlan[] =>
  Array.from({ length: capacity }, (_, index) => ({ venueSeatId: null, key: `${key}:${index}` }));

/** Primeros 32 bits de sha256(key): base del reparto y de los datos fiscales demo. */
const hash32 = (key: string) => createHash("sha256").update(key).digest().readUInt32BE(0);

/** Índice del organizador de un evento: sha256(slug) mod n. */
export const organizerIndexForSlug = (slug: string, organizerCount: number) => hash32(`event:${slug}`) % organizerCount;

/** RUC demo (20 + 9 dígitos) derivado del correo: único por organizador y estable entre ejecuciones. */
export const demoTaxId = (email: string) => `20${String(hash32(`tax-id:${email}`) % 1_000_000_000).padStart(9, "0")}`;

/** Día del calendario de Lima (días desde la época) de un instante. */
const limaDay = (time: number) => Math.floor((time + LIMA_OFFSET_MS) / DAY_MS);

/**
 * Desplazamiento (múltiplo de días) que lleva la fecha más temprana de los mocks a `now` + `SEED_LEAD_DAYS` días en
 * Lima. Conserva la hora local y la distancia entre eventos; todas las fechas quedan después de `now`.
 */
function dateShiftMs(now: Date, mockDates: string[]): number {
  const earliest = Math.min(...mockDates.map((date) => Date.parse(date)));
  return (limaDay(now.getTime()) + SEED_LEAD_DAYS - limaDay(earliest)) * DAY_MS;
}

/** Filas de cada tabla a partir de los mocks. Pura y determinista; lanza `Error` si los mocks son incoherentes. */
export function buildSeedData({ superAdminId, organizers: seedOrganizers, now }: BuildSeedDataInput): SeedData {
  if (seedOrganizers.length === 0) throw new Error("El seed necesita al menos un organizador");
  const mockEvents = eventDetailSchema.array().parse(EVENTS_MOCK);
  const layouts = venueLayoutSchema.array().parse(VENUE_LAYOUTS_MOCK);
  const drafts = organizerEventSchema.array().parse(ORGANIZER_DRAFTS_MOCK);
  const shiftMs = dateShiftMs(now, [
    ...mockEvents.flatMap((event) => [event.startsAt, event.doorsOpenAt]),
    ...drafts.flatMap((draft) => draft.startsAt ?? []),
  ]);
  const shiftDate = (date: string) => new Date(Date.parse(date) + shiftMs);
  const organizerIdForSlug = (slug: string) => seedOrganizers[organizerIndexForSlug(slug, seedOrganizers.length)].id;

  const data: SeedData = {
    users: seedOrganizers.map(({ id, email }, index) => ({
      id,
      email,
      firstName: "Organizador",
      lastName: `Demo ${index + 1}`,
      role: "organizer",
      clerkId: null,
    })),
    organizers: seedOrganizers.map(({ id, email }, index) => ({
      userId: id,
      status: "approved",
      legalName: `Productora Demo ${index + 1} S.A.C.`,
      taxIdType: "ruc",
      taxId: demoTaxId(email),
      commissionBps: COMMISSION_BPS,
      payoutsEnabled: false,
    })),
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
    eventSeats: [],
    legalDocuments: legalDocumentSchema
      .array()
      .parse(LEGAL_DOCUMENTS_MOCK)
      .map((document) => ({
        id: seedUuid(`legal-document:${document.kind}:${document.version}`),
        kind: document.kind,
        version: String(document.version),
        content: document.content,
        status: "published",
        publishedAt: new Date(document.publishedAt),
        publishedBy: superAdminId,
      })),
  };

  /**
   * Recinto del evento. El recinto toma el `viewBox` y el escenario del primer layout que lo usa; un evento cuyo
   * layout trae otros los guarda como propios (`mapViewBox`/`mapStage`), y si no, `null` = los del recinto.
   */
  function venueId(name: string, city: string, address: string, layout: VenueLayout | undefined) {
    const id = seedUuid(`venue:${name}:${city}`);
    let venue = data.venues.find((candidate) => candidate.id === id);
    if (!venue) {
      venue = { id, name, city, address, mapViewBox: null, stage: null, createdBy: superAdminId };
      data.venues.push(venue);
    }
    if (layout && !venue.mapViewBox) {
      venue.mapViewBox = layout.viewBox;
      venue.stage = layout.stage;
    }
    const ownMap = layout && (layout.viewBox !== venue.mapViewBox || !isDeepStrictEqual(layout.stage, venue.stage));
    return { id, mapViewBox: ownMap ? layout.viewBox : null, mapStage: ownMap ? layout.stage : null };
  }

  /** Geometría de una sección en el mapa: dos layouts que comparten la sección deben darle la misma. */
  const sectionGeometry = (section: Omit<Insert<typeof venueSections>, "id">) => ({
    mapPath: section.mapPath,
    labelX: section.labelX,
    labelY: section.labelY,
    seating: section.seating,
    capacity: section.capacity ?? null,
    seatViewBox: section.seatViewBox ?? null,
    wrapLabel: section.wrapLabel ?? false,
    planTransform: section.planTransform ?? null,
  });

  function sectionId(row: Omit<Insert<typeof venueSections>, "id">, venueKey: string): string {
    const id = seedUuid(`venue-section:${venueKey}:${row.slug}`);
    const existing = data.venueSections.find((section) => section.id === id);
    if (existing && existing.name !== row.name) {
      throw new Error(`Sección "${row.slug}" repetida con nombres distintos en ${venueKey}: ${existing.name} / ${row.name}`);
    }
    if (existing?.mapPath && row.mapPath && !isDeepStrictEqual(sectionGeometry(existing), sectionGeometry(row))) {
      throw new Error(`Sección "${row.slug}" con geometría distinta en ${venueKey}`);
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
      return { id, seats: generalSeatPlan(id, zone.capacity) };
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
        return { venueSeatId, key: seat.id };
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
    const { id: eventVenueId, mapViewBox, mapStage } = venueId(event.venue, event.city, event.address, layout);
    data.events.push({
      id: eventId,
      slug: event.slug,
      organizerId: organizerIdForSlug(event.slug),
      venueId: eventVenueId,
      mapViewBox,
      mapStage,
      categoryId: seedUuid(`category:${event.category}`),
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      startsAt: shiftDate(event.startsAt),
      doorsOpenAt: shiftDate(event.doorsOpenAt),
      minAge: event.minAge,
      featured: event.featured,
      status: "published",
      searchText: normalizeText(`${event.title} ${event.venue} ${event.city}`),
      createdAt: new Date(SEED_EPOCH + eventIndex * 1000),
    });

    /** Sección y plan de lugares de cada tipo de entrada (las secciones y asientos se registran una sola vez). */
    const sections = event.ticketTypes.map((ticketType, ticketTypeIndex) => {
      const zoneIndex = layout?.zones.findIndex((zone) => zone.ticketTypeId === ticketType.id) ?? -1;
      if (layout && zoneIndex >= 0) {
        const zone = layout.zones[zoneIndex];
        return zoneSection(zone, zoneIndex, ticketType.name, eventVenueId, venueKey);
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
      return { id, seats: generalSeatPlan(id, DEMO_GENERAL_CAPACITY) };
    });

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

      // Todo el inventario queda disponible: el seed no siembra ventas (spec admin-panel, F2).
      for (const seat of section.seats) {
        data.eventSeats.push({
          id: seedUuid(`event-seat:${event.slug}:${ticketType.id}:${seat.key}`),
          eventId,
          ticketTypeId,
          venueSeatId: seat.venueSeatId,
          status: "available",
          orderId: null,
        });
      }
    });
  });

  drafts.forEach((draft, draftIndex) => {
    if (!draft.startsAt || !draft.imageUrl || draft.priceFrom === null) {
      throw new Error(`El borrador "${draft.title}" necesita fecha, imagen y precio para sembrarse`);
    }
    const slug = slugify(draft.title);
    const eventId = seedUuid(`event:${slug}`);
    const { id: draftVenueId, mapViewBox, mapStage } = venueId(draft.venue, draft.city, "Por confirmar", undefined);
    const startsAt = shiftDate(draft.startsAt);
    data.events.push({
      id: eventId,
      slug,
      organizerId: organizerIdForSlug(slug),
      venueId: draftVenueId,
      mapViewBox,
      mapStage,
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
