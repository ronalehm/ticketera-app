import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { VENUE_LAYOUTS_MOCK } from "../data/venueMaps.mock";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { toVenueLayout, type SeatRecord, type VenueRecord, type ZoneRecord } from "./venueLayoutRecords";

const STAGE = { label: "ESCENARIO", path: "M0 0 H10 V10 H0 Z", labelPos: { x: 5, y: 5 } };
const VENUE: VenueRecord = { eventSlug: "evento", mapViewBox: "0 0 600 520", stage: STAGE };

const GENERAL_ZONE: ZoneRecord = {
  sectionSlug: "general",
  ticketTypeSlug: "general-tt",
  seating: "general",
  capacity: 600,
  mapPath: "M20 342 H580 V500 H20 Z",
  labelX: 300,
  labelY: 421,
  seatViewBox: null,
};

const NUMBERED_ZONE: ZoneRecord = {
  sectionSlug: "platea-baja",
  ticketTypeSlug: "platea",
  seating: "numbered",
  capacity: null,
  mapPath: "M60 90 H540 V300 H60 Z",
  labelX: 300,
  labelY: 195,
  seatViewBox: "0 0 400 200",
};

function seat(rowLabel: string, number: number, flags: Partial<SeatRecord> = {}): SeatRecord {
  return { sectionSlug: "platea-baja", rowLabel, number, x: number * 10, y: 50, accessible: false, available: true, ...flags };
}

/** Inversa del mapper (lo mismo que hace el seed): layout del mock → filas de la BD. */
function toRecords(layout: z.infer<typeof venueLayoutSchema>) {
  const venue: VenueRecord = { eventSlug: layout.eventSlug, mapViewBox: layout.viewBox, stage: layout.stage };
  const zones: ZoneRecord[] = layout.zones.map((zone) => ({
    sectionSlug: zone.id,
    ticketTypeSlug: zone.ticketTypeId,
    seating: zone.kind,
    capacity: zone.kind === "general" ? zone.capacity : null,
    mapPath: zone.path,
    labelX: zone.labelPos.x,
    labelY: zone.labelPos.y,
    seatViewBox: zone.kind === "numbered" ? zone.seatViewBox : null,
  }));
  const seats: SeatRecord[] = layout.zones.flatMap((zone) =>
    zone.kind === "numbered"
      ? zone.rows.flatMap((row) =>
          row.seats.map((s) => ({
            sectionSlug: zone.id,
            rowLabel: s.row,
            number: s.number,
            x: s.x,
            y: s.y,
            accessible: s.status === "accessible",
            available: s.status !== "occupied",
          })),
        )
      : [],
  );
  return { venue, zones, seats };
}

describe("toVenueLayout", () => {
  it("devuelve null si el recinto no tiene mapViewBox o stage", () => {
    expect(toVenueLayout({ ...VENUE, mapViewBox: null }, [GENERAL_ZONE], [])).toBeNull();
    expect(toVenueLayout({ ...VENUE, stage: null }, [GENERAL_ZONE], [])).toBeNull();
  });

  it("devuelve null si alguna zona no tiene mapPath", () => {
    expect(toVenueLayout(VENUE, [GENERAL_ZONE, { ...NUMBERED_ZONE, mapPath: null }], [seat("A", 1)])).toBeNull();
  });

  it("mapea una zona general con su capacity, path y labelPos", () => {
    const layout = toVenueLayout(VENUE, [GENERAL_ZONE], []);

    expect(layout).toEqual({
      eventSlug: "evento",
      viewBox: "0 0 600 520",
      stage: STAGE,
      zones: [
        {
          id: "general",
          ticketTypeId: "general-tt",
          kind: "general",
          capacity: 600,
          path: "M20 342 H580 V500 H20 Z",
          labelPos: { x: 300, y: 421 },
        },
      ],
    });
  });

  it("agrupa los asientos numerados por fila, en orden, con su estado", () => {
    const seats = [
      seat("A", 1, { available: false }),
      seat("A", 2, { accessible: true }),
      seat("A", 3, { accessible: true, available: false }),
      seat("B", 1),
      { ...seat("X", 1), sectionSlug: "otra" },
    ];
    const layout = venueLayoutSchema.parse(toVenueLayout(VENUE, [NUMBERED_ZONE], seats));
    const [zone] = layout.zones;

    expect(zone.kind).toBe("numbered");
    if (zone.kind !== "numbered") return;
    expect(zone.seatViewBox).toBe("0 0 400 200");
    expect(zone.rows.map((row) => row.label)).toEqual(["A", "B"]);
    expect(zone.rows[0].seats.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: "platea-baja-A-1", status: "occupied" },
      { id: "platea-baja-A-2", status: "accessible" },
      { id: "platea-baja-A-3", status: "occupied" },
    ]);
    expect(zone.rows[1].seats[0]).toEqual({ id: "platea-baja-B-1", row: "B", number: 1, x: 10, y: 50, status: "available" });
  });

  it("lanza un error si los datos de la sección son incoherentes", () => {
    expect(() => toVenueLayout(VENUE, [{ ...GENERAL_ZONE, capacity: null }], [])).toThrow(/capacity/);
    expect(() => toVenueLayout(VENUE, [{ ...NUMBERED_ZONE, seatViewBox: null }], [seat("A", 1)])).toThrow(/seat_view_box/);
    expect(() => toVenueLayout(VENUE, [{ ...GENERAL_ZONE, labelX: null }], [])).toThrow(/label_x/);
  });

  it("un seatViewBox inválido hace fallar venueLayoutSchema.parse", () => {
    const layout = toVenueLayout(VENUE, [{ ...NUMBERED_ZONE, seatViewBox: "0 0 -1 x" }], [seat("A", 1)]);

    expect(() => venueLayoutSchema.parse(layout)).toThrow();
  });

  it.each(VENUE_LAYOUTS_MOCK.map((layout) => [layout.eventSlug, layout] as const))(
    "reproduce el layout del mock de %s desde sus filas",
    (_slug, mock) => {
      const expected = venueLayoutSchema.parse(mock);
      const { venue, zones, seats } = toRecords(expected);

      expect(venueLayoutSchema.parse(toVenueLayout(venue, zones, seats))).toEqual(expected);
    },
  );
});
