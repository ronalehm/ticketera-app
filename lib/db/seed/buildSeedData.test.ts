import { afterEach, describe, expect, it } from "vitest";
import { EVENTS_MOCK } from "@/modules/events/data/events.mock";
import { getAvailabilityStatus } from "@/modules/events/utils/availability";
import { LEGAL_DOCUMENT_KINDS } from "@/modules/legal/schemas/legal.schema";
import { VENUE_LAYOUTS_MOCK, VENUE_SECTORS_MOCK } from "@/modules/seating/data/venueMaps.mock";
import { DEMO_GENERAL_CAPACITY, buildSeedData, seedUuid } from "./buildSeedData";

const SUPER_ADMIN_ID = seedUuid("test:super-admin");
const data = buildSeedData({ superAdminId: SUPER_ADMIN_ID });

const UUID_V8 = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const eventBySlug = (slug: string) => {
  const event = data.events.find((row) => row.slug === slug);
  if (!event) throw new Error(`Evento no sembrado: ${slug}`);
  return event;
};

const layoutBySlug = (slug: string) => {
  const layout = VENUE_LAYOUTS_MOCK.find((candidate) => candidate.eventSlug === slug);
  if (!layout) throw new Error(`Layout inexistente: ${slug}`);
  return layout;
};

/** Conjunto ordenado de pares (id del recinto, slug) de secciones. */
const sectionKeySet = (sections: { venueId: string; slug: string }[]) =>
  [...new Set(sections.map((section) => `${section.venueId}/${section.slug}`))].sort();

function countSeats(predicate: (seat: (typeof data.eventSeats)[number]) => boolean) {
  const seats = data.eventSeats.filter(predicate);
  return { total: seats.length, available: seats.filter((seat) => seat.status === "available").length };
}

describe("seedUuid", () => {
  it("es determinista, UUID versión 8 y distinto para claves distintas", () => {
    expect(seedUuid("event:a")).toBe(seedUuid("event:a"));
    expect(seedUuid("event:a")).toMatch(UUID_V8);
    expect(seedUuid("event:a")).not.toBe(seedUuid("event:b"));
  });
});

describe("buildSeedData", () => {
  const snapshot = { events: structuredClone(EVENTS_MOCK), layouts: structuredClone(VENUE_LAYOUTS_MOCK) };
  afterEach(() => {
    EVENTS_MOCK.splice(0, EVENTS_MOCK.length, ...structuredClone(snapshot.events));
    VENUE_LAYOUTS_MOCK.splice(0, VENUE_LAYOUTS_MOCK.length, ...structuredClone(snapshot.layouts));
  });

  it("es determinista", () => {
    expect(buildSeedData({ superAdminId: SUPER_ADMIN_ID })).toEqual(data);
  });

  it("siembra 6 categorías, 13 eventos publicados, 1 borrador y un asiento de recinto por butaca de los layouts", () => {
    expect(data.categories).toHaveLength(6);
    expect(data.events.filter((event) => event.status === "published")).toHaveLength(13);
    expect(data.events.filter((event) => event.status === "draft").map((event) => event.slug)).toEqual([
      "feria-familiar-de-verano",
    ]);
    const layoutSeats = VENUE_LAYOUTS_MOCK.flatMap((layout) =>
      layout.zones.flatMap((zone) => (zone.kind === "numbered" ? zone.rows.flatMap((row) => row.seats) : [])),
    );
    expect(layoutSeats.length).toBeGreaterThan(0);
    expect(data.venueSeats).toHaveLength(layoutSeats.length);
  });

  it("los ids son únicos en cada tabla", () => {
    for (const rows of Object.values(data)) {
      const ids = rows.map((row) => ("legalName" in row ? row.userId : row.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("un solo Estadio Nacional con geometría y 8 secciones en su orden", () => {
    const stadiums = data.venues.filter((venue) => venue.name === "Estadio Nacional");
    expect(stadiums).toHaveLength(1);
    expect(stadiums[0]).toMatchObject({
      city: "Lima",
      mapViewBox: layoutBySlug("noche-de-sintetizadores-lima").viewBox,
      createdBy: SUPER_ADMIN_ID,
    });
    expect(stadiums[0].stage).toMatchObject({ label: "ESCENARIO" });
    const sections = data.venueSections
      .filter((section) => section.venueId === stadiums[0].id)
      .sort((a, b) => Number(!a.mapPath) - Number(!b.mapPath) || a.sortOrder - b.sortOrder);
    expect(sections.map((section) => [section.slug, section.sortOrder, section.seating])).toEqual([
      ["vip", 0, "general"],
      ["preferencial", 1, "general"],
      ["general", 2, "general"],
      ["norte", 3, "numbered"],
      ["popular", 0, "general"],
      ["oriente", 1, "general"],
      ["occidente", 2, "general"],
      ["palco", 3, "general"],
    ]);
    expect(sections.slice(0, 4).every((section) => section.mapPath)).toBe(true);
    expect(sections.slice(4).every((section) => !section.mapPath && section.capacity === DEMO_GENERAL_CAPACITY)).toBe(
      true,
    );
  });

  it("cada recinto con layout guarda el viewBox y el escenario de su layout", () => {
    for (const layout of VENUE_LAYOUTS_MOCK) {
      const venue = data.venues.find((candidate) => candidate.id === eventBySlug(layout.eventSlug).venueId);
      expect(venue?.mapViewBox, layout.eventSlug).toBe(layout.viewBox);
      expect(venue?.stage, layout.eventSlug).toEqual(layout.stage);
    }
  });

  it("la Costa Verde guarda el escenario del layout con sus 7 luces", () => {
    const costaVerde = data.venues.find((venue) => venue.name === "Costa Verde");
    const layout = layoutBySlug("festival-vive-latino-lima");
    expect(costaVerde?.stage).toEqual(layout.stage);
    expect(costaVerde?.stage?.lights).toHaveLength(7);
  });

  it("cada sección guarda wrapLabel y planTransform de su zona, y las secciones sin zona no los tienen", () => {
    const zoneSections = new Set<(typeof data.venueSections)[number]>();
    for (const layout of VENUE_LAYOUTS_MOCK) {
      const venueId = eventBySlug(layout.eventSlug).venueId;
      for (const zone of layout.zones) {
        const label = `${layout.eventSlug}/${zone.id}`;
        const section = data.venueSections.find(
          (candidate) => candidate.venueId === venueId && candidate.slug === zone.id,
        );
        if (!section) throw new Error(`Sección no sembrada: ${label}`);
        zoneSections.add(section);
        expect(section.wrapLabel, label).toBe(zone.wrapLabel ?? false);
        expect(section.planTransform ?? null, label).toEqual((zone.kind === "numbered" && zone.planTransform) || null);
      }
    }
    const withoutZone = data.venueSections.filter((section) => !zoneSections.has(section));
    expect(withoutZone.length).toBeGreaterThan(0);
    for (const section of withoutZone) {
      expect(section.wrapLabel ?? false, section.slug).toBe(false);
      expect(section.planTransform ?? null, section.slug).toBeNull();
    }
  });

  it("las secciones con planTransform son exactamente las zonas numeradas de los recintos curvos", () => {
    const expected = VENUE_LAYOUTS_MOCK.filter((layout) => layout.eventSlug in VENUE_SECTORS_MOCK).flatMap((layout) =>
      layout.zones
        .filter((zone) => zone.kind === "numbered")
        // Los eventos publicados del seed siempre tienen recinto (events_draft_complete_check).
        .map((zone) => ({ venueId: eventBySlug(layout.eventSlug).venueId!, slug: zone.id })),
    );
    expect(expected.length).toBeGreaterThan(0);
    expect(sectionKeySet(data.venueSections.filter((section) => section.planTransform))).toEqual(
      sectionKeySet(expected),
    );
  });

  it("las secciones numeradas no tienen capacidad y las generales sí", () => {
    for (const section of data.venueSections) {
      if (section.seating === "numbered") expect(section.capacity).toBeNull();
      else expect(section.capacity).toBeGreaterThan(0);
    }
  });

  it("los ticket_types conservan el id, el orden y el precio en céntimos del mock", () => {
    for (const event of EVENTS_MOCK) {
      const rows = data.ticketTypes.filter((row) => row.eventId === eventBySlug(event.slug).id);
      expect(rows.map((row) => row.slug)).toEqual(event.ticketTypes.map((ticketType) => ticketType.id));
      expect(rows.map((row) => row.sortOrder)).toEqual(event.ticketTypes.map((_, index) => index));
      expect(rows.map((row) => row.priceCents)).toEqual(event.ticketTypes.map((ticketType) => ticketType.price * 100));
      expect(rows.every((row) => row.maxPerOrder === 10)).toBe(true);
    }
  });

  it("inventario: asientos en numeradas, capacidad en generales y borrador sin event_seats", () => {
    const sectionById = new Map(data.venueSections.map((section) => [section.id, section]));
    for (const ticketType of data.ticketTypes) {
      const section = sectionById.get(ticketType.sectionId);
      const seats = data.eventSeats.filter((seat) => seat.ticketTypeId === ticketType.id);
      if (ticketType.eventId === eventBySlug("feria-familiar-de-verano").id) {
        expect(seats).toHaveLength(0);
      } else if (section?.seating === "numbered") {
        expect(seats).toHaveLength(data.venueSeats.filter((seat) => seat.sectionId === section.id).length);
        expect(seats.every((seat) => seat.venueSeatId)).toBe(true);
      } else {
        expect(seats).toHaveLength(section?.capacity ?? -1);
        expect(seats.every((seat) => seat.venueSeatId === null)).toBe(true);
      }
    }
  });

  it("los estados calculados coinciden con los del mock para cada evento y tipo de entrada", () => {
    for (const event of EVENTS_MOCK) {
      const eventId = eventBySlug(event.slug).id;
      const eventCounts = countSeats((seat) => seat.eventId === eventId);
      expect(getAvailabilityStatus(eventCounts.available, eventCounts.total), event.slug).toBe(event.status);
      for (const ticketType of event.ticketTypes) {
        const ticketTypeId = seedUuid(`ticket-type:${event.slug}:${ticketType.id}`);
        const counts = countSeats((seat) => seat.ticketTypeId === ticketTypeId);
        expect(getAvailabilityStatus(counts.available, counts.total), `${event.slug}/${ticketType.id}`).toBe(
          ticketType.status,
        );
      }
    }
  });

  it("una orden de demo por evento con vendidos, importes cuadrados y order_id coherente", () => {
    const eventsWithSales = new Set(data.eventSeats.filter((seat) => seat.status === "sold").map((seat) => seat.eventId));
    expect(data.orders.map((order) => order.eventId).sort()).toEqual([...eventsWithSales].sort());
    for (const order of data.orders) {
      expect(order.code).toMatch(/^TK-DEMO-\d{3}$/);
      expect(order).toMatchObject({ status: "paid", userId: null, buyerEmail: "demo@example.com" });
      expect(order.platformFeeCents + order.organizerAmountCents).toBe(order.subtotalCents);
      expect(order.platformFeeCents).toBe(Math.round(order.subtotalCents / 10));
      const priceById = new Map(data.ticketTypes.map((ticketType) => [ticketType.id, ticketType.priceCents]));
      const subtotal = data.eventSeats
        .filter((seat) => seat.orderId === order.id)
        .reduce((sum, seat) => sum + (priceById.get(seat.ticketTypeId) ?? 0), 0);
      expect(subtotal).toBe(order.subtotalCents);
    }
    const orderEvent = new Map(data.orders.map((order) => [order.id, order.eventId]));
    for (const seat of data.eventSeats) {
      if (seat.status === "sold") expect(orderEvent.get(seat.orderId ?? "")).toBe(seat.eventId);
      else expect(seat.orderId).toBeNull();
    }
  });

  it("organizadores únicos por nombre, RUC ficticio de 11 dígitos y usuarios sin clerk_id", () => {
    const names = new Set(EVENTS_MOCK.map((event) => event.organizer));
    expect(data.organizers.map((organizer) => organizer.legalName)).toEqual([...names]);
    const taxIds = data.organizers.map((organizer) => organizer.taxId);
    expect(new Set(taxIds).size).toBe(taxIds.length);
    expect(taxIds.every((taxId) => /^20\d{9}$/.test(taxId))).toBe(true);
    expect(taxIds[0]).toBe("20000000001");
    for (const user of data.users) {
      expect(user).toMatchObject({ role: "organizer", clerkId: null, lastName: "" });
      expect(user.email).toMatch(/^[a-z0-9-]+@example\.com$/);
    }
    expect(data.users.find((user) => user.firstName === "Compañía Teatral Espejo")?.email).toBe(
      "compania-teatral-espejo@example.com",
    );
  });

  it("el borrador pertenece a Pulso Producciones, en Parque Selva Alegre y con un tipo general", () => {
    const draft = eventBySlug("feria-familiar-de-verano");
    const pulso = data.organizers.find((organizer) => organizer.legalName === "Pulso Producciones");
    expect(draft).toMatchObject({
      organizerId: pulso?.userId,
      description: "Borrador sin descripción.",
      minAge: 0,
      doorsOpenAt: draft.startsAt,
    });
    expect(data.venues.find((venue) => venue.id === draft.venueId)).toMatchObject({
      name: "Parque Selva Alegre",
      city: "Arequipa",
      address: "Por confirmar",
      mapViewBox: null,
    });
    const ticketTypes = data.ticketTypes.filter((ticketType) => ticketType.eventId === draft.id);
    expect(ticketTypes).toEqual([expect.objectContaining({ slug: "general", priceCents: 4000 })]);
    expect(data.venueSections.find((section) => section.id === ticketTypes[0].sectionId)).toMatchObject({
      seating: "general",
      capacity: 1500,
    });
  });

  it("siembra una versión published de cada kind legal, con ids deterministas y fecha de publicación", () => {
    expect(data.legalDocuments.map((document) => document.kind).sort()).toEqual([...LEGAL_DOCUMENT_KINDS].sort());
    for (const document of data.legalDocuments) {
      expect(document).toMatchObject({ status: "published", version: "1", publishedBy: SUPER_ADMIN_ID });
      expect(document.id).toBe(seedUuid(`legal-document:${document.kind}:1`));
      expect(document.publishedAt).toBeInstanceOf(Date);
      expect(document.content).toMatch(/\S/);
    }
  });

  it("search_text normalizado y created_at creciente en el orden del mock", () => {
    expect(eventBySlug("noche-de-sintetizadores-lima").searchText).toBe(
      "noche de sintetizadores: gira neon 2026 estadio nacional lima",
    );
    const times = EVENTS_MOCK.map((event) => eventBySlug(event.slug).createdAt?.getTime() ?? 0);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
  });

  it("lanza si no puede reproducir el estado del evento", () => {
    const festival = EVENTS_MOCK.find((event) => event.slug === "festival-vive-latino-lima");
    if (!festival) throw new Error("falta festival-vive-latino-lima");
    festival.status = "sold-out";
    expect(() => buildSeedData({ superAdminId: SUPER_ADMIN_ID })).toThrow(/sold-out.*festival-vive-latino-lima/);
  });

  it("lanza si una zona apunta a un tipo de entrada inexistente", () => {
    VENUE_LAYOUTS_MOCK[0].zones[0].ticketTypeId = "no-existe";
    expect(() => buildSeedData({ superAdminId: SUPER_ADMIN_ID })).toThrow(/tipo de entrada inexistente: no-existe/);
  });

  it("lanza si dos layouts del mismo recinto difieren", () => {
    const base = VENUE_LAYOUTS_MOCK[0];
    VENUE_LAYOUTS_MOCK.push({ ...structuredClone(base), eventSlug: "clasico-del-pacifico", viewBox: "0 0 700 560" });
    const clasico = EVENTS_MOCK.find((event) => event.slug === "clasico-del-pacifico");
    if (!clasico) throw new Error("falta clasico-del-pacifico");
    clasico.ticketTypes = structuredClone(EVENTS_MOCK[0].ticketTypes);
    expect(() => buildSeedData({ superAdminId: SUPER_ADMIN_ID })).toThrow(/Dos layouts distintos/);
  });

  it("lanza si dos secciones del mismo recinto comparten slug con distinto nombre", () => {
    const clasico = EVENTS_MOCK.find((event) => event.slug === "clasico-del-pacifico");
    if (!clasico) throw new Error("falta clasico-del-pacifico");
    clasico.ticketTypes[0] = { ...clasico.ticketTypes[0], id: "vip", name: "Otro VIP" };
    expect(() => buildSeedData({ superAdminId: SUPER_ADMIN_ID })).toThrow(/repetida con nombres distintos/);
  });
});
