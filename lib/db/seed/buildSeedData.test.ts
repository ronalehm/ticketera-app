import { isDeepStrictEqual } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { EVENTS_MOCK } from "@/modules/events/data/events.mock";
import { LEGAL_DOCUMENT_KINDS } from "@/modules/legal/schemas/legal.schema";
import { ORGANIZER_DRAFTS_MOCK } from "@/modules/organizer/data/organizerEvents.mock";
import { PITCH_STAGE, STADIUM_CENTER } from "@/modules/seating/data/stadium.mock";
import { VENUE_LAYOUTS_MOCK, VENUE_SECTORS_MOCK } from "@/modules/seating/data/venueMaps.mock";
import { getAnnularSectorPath } from "@/modules/seating/utils/annularSector";
import {
  DEMO_GENERAL_CAPACITY,
  SEED_LEAD_DAYS,
  buildSeedData,
  demoTaxId,
  organizerIndexForSlug,
  seedUuid,
  type BuildSeedDataInput,
} from "./buildSeedData";

const SUPER_ADMIN_ID = seedUuid("test:super-admin");
const ORGANIZERS = ["organizer.one@ticketera.test", "organizer.two@ticketera.test"].map((email) => ({
  id: seedUuid(`user:${email}`),
  email,
}));
/** 5 de octubre de 2026, 12:00 en Lima. */
const NOW = new Date("2026-10-05T17:00:00Z");
const INPUT: BuildSeedDataInput = { superAdminId: SUPER_ADMIN_ID, organizers: ORGANIZERS, now: NOW };
const data = buildSeedData(INPUT);
const DAY_MS = 86_400_000;

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

/** Evento que nunca tendrá layout: los tests de layouts sintéticos lo mueven al Estadio Nacional. */
const AVENTURA = "aventura-en-el-bosque-magico";
const ARENA = "noche-de-sintetizadores-lima";
/** Un sector cualquiera para las zonas sintéticas (distinto de los de la arena). */
const SYNTHETIC_PATH = getAnnularSectorPath({
  ...STADIUM_CENTER,
  innerRadius: 102,
  outerRadius: 200,
  startAngle: 60,
  endAngle: 120,
});

type MockLayout = (typeof VENUE_LAYOUTS_MOCK)[number];
type MockZone = MockLayout["zones"][number];

const mockEvent = (slug: string) => {
  const event = EVENTS_MOCK.find((candidate) => candidate.slug === slug);
  if (!event) throw new Error(`falta ${slug}`);
  return event;
};

/** Muta `EVENTS_MOCK`: aventura pasa al recinto de la arena (Estadio Nacional de Lima). */
function moveAventuraToStadium() {
  const arena = mockEvent(ARENA);
  const aventura = mockEvent(AVENTURA);
  Object.assign(aventura, { venue: arena.venue, city: arena.city, address: arena.address });
  return aventura;
}

/** Muta `VENUE_LAYOUTS_MOCK`: un layout de fútbol para aventura (otro viewBox, la cancha) con una sola zona. */
function addAventuraLayout(zone: MockZone) {
  VENUE_LAYOUTS_MOCK.push({ eventSlug: AVENTURA, viewBox: "0 0 600 300", stage: PITCH_STAGE, zones: [zone] });
}

/** Fecha y hora locales de Lima (UTC−5) de un instante, como `AAAA-MM-DDTHH:MM`. */
const limaLocal = (date: Date | string) =>
  new Date(new Date(date).getTime() - 5 * 3_600_000).toISOString().slice(0, 16);

/** Conjunto ordenado de pares (id del recinto, slug) de secciones. */
const sectionKeySet = (sections: { venueId: string; slug: string }[]) =>
  [...new Set(sections.map((section) => `${section.venueId}/${section.slug}`))].sort();

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
    expect(buildSeedData(INPUT)).toEqual(data);
  });

  it("lanza sin organizadores", () => {
    expect(() => buildSeedData({ ...INPUT, organizers: [] })).toThrow(/al menos un organizador/);
  });

  it("siembra 9 categorías, 13 eventos publicados, 1 borrador y un asiento de recinto por butaca de los layouts", () => {
    expect(data.categories).toHaveLength(9);
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
      const ids = rows.map((row) => ("commissionBps" in row ? row.userId : row.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("un solo Estadio Nacional con el mapa de la arena, 8 secciones con geometría y el Clásico con mapa propio", () => {
    const stadiums = data.venues.filter((venue) => venue.name === "Estadio Nacional");
    expect(stadiums).toHaveLength(1);
    const arena = layoutBySlug(ARENA);
    expect(stadiums[0]).toMatchObject({ city: "Lima", mapViewBox: arena.viewBox, createdBy: SUPER_ADMIN_ID });
    expect(stadiums[0].stage).toEqual(arena.stage);
    // Primero las de la arena y después las del Clásico, cada grupo en su orden.
    const arenaZoneIds = arena.zones.map((zone) => zone.id);
    const sections = data.venueSections
      .filter((section) => section.venueId === stadiums[0].id)
      .sort(
        (a, b) =>
          Number(!arenaZoneIds.includes(a.slug)) - Number(!arenaZoneIds.includes(b.slug)) || a.sortOrder - b.sortOrder,
      );
    expect(sections.map((section) => [section.slug, section.sortOrder, section.seating])).toEqual([
      ["vip", 0, "general"],
      ["preferencial", 1, "general"],
      ["general", 2, "general"],
      ["norte", 3, "numbered"],
      ["popular", 0, "general"],
      ["oriente", 1, "numbered"],
      ["occidente", 2, "numbered"],
      ["palco", 3, "general"],
    ]);
    expect(sections.every((section) => section.mapPath)).toBe(true);
    expect(sections.some((section) => section.capacity === DEMO_GENERAL_CAPACITY)).toBe(false);
    expect(eventBySlug("clasico-del-pacifico")).toMatchObject({ mapViewBox: "0 0 600 392", mapStage: PITCH_STAGE });
  });

  it("cada evento con layout tiene el viewBox y el escenario de su layout, propios o de su recinto", () => {
    for (const layout of VENUE_LAYOUTS_MOCK) {
      const event = eventBySlug(layout.eventSlug);
      const venue = data.venues.find((candidate) => candidate.id === event.venueId);
      expect(event.mapViewBox ?? venue?.mapViewBox, layout.eventSlug).toBe(layout.viewBox);
      expect(event.mapStage ?? venue?.stage, layout.eventSlug).toEqual(layout.stage);
    }
  });

  it("ningún evento del mock tiene mapa propio salvo los que comparten recinto con otro layout", () => {
    // El recinto se queda con el mapa del primer evento con layout (orden del mock); los demás que difieren, propio.
    const venueLayouts = new Map<string, MockLayout>();
    const expected: string[] = [];
    for (const event of EVENTS_MOCK) {
      const layout = VENUE_LAYOUTS_MOCK.find((candidate) => candidate.eventSlug === event.slug);
      if (!layout) continue;
      const venueKey = `${event.venue}:${event.city}`;
      const first = venueLayouts.get(venueKey) ?? layout;
      venueLayouts.set(venueKey, first);
      if (first.viewBox !== layout.viewBox || !isDeepStrictEqual(first.stage, layout.stage)) expected.push(event.slug);
    }
    const withOwnMap = data.events.filter((event) => event.mapViewBox != null || event.mapStage != null);
    expect(withOwnMap.map((event) => event.slug)).toEqual(expected);
    for (const event of withOwnMap) {
      expect(event.mapViewBox, event.slug).toBe(layoutBySlug(event.slug).viewBox);
      expect(event.mapStage, event.slug).toEqual(layoutBySlug(event.slug).stage);
    }
    // events_map_override_check: las dos columnas van juntas.
    for (const event of data.events) expect(event.mapViewBox == null, event.slug).toBe(event.mapStage == null);
  });

  it("un evento cuyo layout difiere del de su recinto guarda su viewBox y su escenario; el recinto conserva los del primero", () => {
    moveAventuraToStadium();
    addAventuraLayout({
      id: "entrada-libre",
      ticketTypeId: "entrada-libre",
      kind: "general",
      capacity: 50,
      path: SYNTHETIC_PATH,
      labelPos: { x: 300, y: 200 },
    });
    const seeded = buildSeedData(INPUT);
    const seededEvent = (slug: string) => seeded.events.find((event) => event.slug === slug);
    const arena = layoutBySlug(ARENA);

    const stadium = seeded.venues.find((venue) => venue.id === seededEvent(AVENTURA)?.venueId);
    expect(stadium).toMatchObject({ name: "Estadio Nacional", city: "Lima", mapViewBox: arena.viewBox });
    expect(stadium?.stage).toEqual(arena.stage);
    expect(seededEvent(ARENA)?.venueId).toBe(stadium?.id);
    expect(seededEvent(AVENTURA)?.mapViewBox).toBe("0 0 600 300");
    expect(seededEvent(AVENTURA)?.mapStage).toEqual(PITCH_STAGE);
    expect(seededEvent(ARENA)).toMatchObject({ mapViewBox: null, mapStage: null });
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

  it("todo el inventario está disponible y sin pedido; no hay órdenes", () => {
    expect(data.eventSeats.length).toBeGreaterThan(0);
    expect(data.eventSeats.every((seat) => seat.status === "available" && seat.orderId === null)).toBe(true);
    expect("orders" in data).toBe(false);
  });

  it("organizadores: los de la entrada, approved, con datos fiscales completos y RUC demo único", () => {
    expect(data.users).toEqual([
      { id: ORGANIZERS[0].id, email: ORGANIZERS[0].email, firstName: "Organizador", lastName: "Demo 1", role: "organizer", clerkId: null },
      { id: ORGANIZERS[1].id, email: ORGANIZERS[1].email, firstName: "Organizador", lastName: "Demo 2", role: "organizer", clerkId: null },
    ]);
    expect(data.organizers).toEqual(
      ORGANIZERS.map(({ id, email }, index) => ({
        userId: id,
        status: "approved",
        legalName: `Productora Demo ${index + 1} S.A.C.`,
        taxIdType: "ruc",
        taxId: demoTaxId(email),
        commissionBps: 1000,
        payoutsEnabled: false,
      })),
    );
    const taxIds = data.organizers.map((organizer) => organizer.taxId ?? "");
    expect(new Set(taxIds).size).toBe(taxIds.length);
    expect(taxIds.every((taxId) => /^20\d{9}$/.test(taxId))).toBe(true);
  });

  it("reparte cada evento (borrador incluido) por sha256(slug) mod n, y los dos organizadores reciben eventos", () => {
    for (const event of data.events) {
      expect(event.organizerId, event.slug).toBe(ORGANIZERS[organizerIndexForSlug(event.slug, ORGANIZERS.length)].id);
    }
    const owners = new Set(data.events.map((event) => event.organizerId));
    expect(owners).toEqual(new Set(ORGANIZERS.map((organizer) => organizer.id)));
    expect(organizerIndexForSlug("cualquier-slug", 1)).toBe(0);
    const single = buildSeedData({ ...INPUT, organizers: [ORGANIZERS[1]] });
    expect(single.events.every((event) => event.organizerId === ORGANIZERS[1].id)).toBe(true);
  });

  it("fechas: todas posteriores a now, la primera now + 7 días, con la hora local y la apertura de puertas del mock", () => {
    const starts = data.events.map((event) => event.startsAt?.getTime() ?? 0);
    expect(starts.every((time) => time > NOW.getTime())).toBe(true);
    expect(data.events.every((event) => (event.doorsOpenAt?.getTime() ?? 0) > NOW.getTime())).toBe(true);
    // El evento más temprano del mock (y de los borradores) cae 7 días después del día de `now` en Lima.
    const earliest = data.events.reduce((first, event) => (event.startsAt! < first.startsAt! ? event : first));
    expect(limaLocal(earliest.startsAt!).slice(0, 10)).toBe("2026-10-12");
    expect(SEED_LEAD_DAYS).toBe(7);

    const shift = eventBySlug(EVENTS_MOCK[0].slug).startsAt!.getTime() - Date.parse(EVENTS_MOCK[0].startsAt);
    expect(shift % DAY_MS).toBe(0);
    for (const mock of EVENTS_MOCK) {
      const event = eventBySlug(mock.slug);
      // Mismo desplazamiento en días enteros para todos: conserva la hora local y la distancia entre eventos.
      expect(event.startsAt!.getTime() - Date.parse(mock.startsAt), mock.slug).toBe(shift);
      expect(limaLocal(event.startsAt!).slice(11), mock.slug).toBe(limaLocal(mock.startsAt).slice(11));
      expect(event.startsAt!.getTime() - event.doorsOpenAt!.getTime(), mock.slug).toBe(
        Date.parse(mock.startsAt) - Date.parse(mock.doorsOpenAt),
      );
    }
    const draft = eventBySlug("feria-familiar-de-verano");
    expect(draft.startsAt!.getTime() - Date.parse(ORGANIZER_DRAFTS_MOCK[0].startsAt ?? "")).toBe(shift);
    expect(draft.doorsOpenAt).toEqual(draft.startsAt);
  });

  it("con el mismo now da las mismas fechas; con un now posterior las desplaza en días enteros", () => {
    const sameDay = buildSeedData({ ...INPUT, now: new Date("2026-10-06T04:59:59Z") }); // 23:59 del 5 en Lima
    expect(sameDay.events).toEqual(data.events);

    const later = buildSeedData({ ...INPUT, now: new Date(NOW.getTime() + 10 * DAY_MS) });
    later.events.forEach((event, index) => {
      expect(event.startsAt!.getTime() - data.events[index].startsAt!.getTime(), event.slug).toBe(10 * DAY_MS);
      expect(event.doorsOpenAt!.getTime() - data.events[index].doorsOpenAt!.getTime(), event.slug).toBe(10 * DAY_MS);
    });
    // Lo demás no depende de `now`.
    expect({ ...later, events: [] }).toEqual({ ...data, events: [] });
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

  it("lanza si una zona apunta a un tipo de entrada inexistente", () => {
    VENUE_LAYOUTS_MOCK[0].zones[0].ticketTypeId = "no-existe";
    expect(() => buildSeedData(INPUT)).toThrow(/tipo de entrada inexistente: no-existe/);
  });

  it("lanza si una sección del mismo recinto tiene geometría distinta en dos layouts", () => {
    const aventura = moveAventuraToStadium();
    aventura.ticketTypes[0] = { ...aventura.ticketTypes[0], name: "VIP" };
    const arenaVip = layoutBySlug(ARENA).zones.find((zone) => zone.id === "vip");
    if (!arenaVip) throw new Error("falta la zona vip de la arena");
    // Misma geometría de la sección: se comparte aunque el viewBox y el escenario del evento sean otros.
    addAventuraLayout({ ...structuredClone(arenaVip), ticketTypeId: "entrada-libre" });
    expect(() => buildSeedData(INPUT)).not.toThrow();

    expect(arenaVip.path).not.toBe(SYNTHETIC_PATH);
    VENUE_LAYOUTS_MOCK.at(-1)!.zones[0].path = SYNTHETIC_PATH;
    expect(() => buildSeedData(INPUT)).toThrow(/geometría distinta/);
  });

  it("lanza si dos secciones del mismo recinto comparten slug con distinto nombre", () => {
    const aventura = moveAventuraToStadium();
    aventura.ticketTypes[0] = { ...aventura.ticketTypes[0], id: "vip", name: "Otro VIP" };
    expect(() => buildSeedData(INPUT)).toThrow(/repetida con nombres distintos/);
  });
});
