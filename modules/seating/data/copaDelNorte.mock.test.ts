// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { getEventBySlug } from "@/modules/events";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { getVenueMapBySlug } from "../services/seating.service";
import type { VenueZoneLayout } from "../types/seating.types";
import { getAnnularSectorPath } from "../utils/annularSector";
import { resolveSeats } from "../utils/seatIds";
import { COPA_DEL_NORTE_VENUE } from "./copaDelNorte.mock";
import { PITCH_STAGE, STADIUM_CENTER, STAGE_SECTOR } from "./stadium.mock";

const SLUG = "copa-del-norte-trujillo";
const layout = venueLayoutSchema.parse(COPA_DEL_NORTE_VENUE.layout);

function getOccidente(): Extract<VenueZoneLayout, { kind: "numbered" }> {
  const zone = layout.zones.find((candidate) => candidate.id === "occidente");
  if (zone?.kind !== "numbered") throw new Error("Occidente no es una zona numerada");
  return zone;
}

describe("COPA_DEL_NORTE_VENUE (herradura de fútbol)", () => {
  it("usa el viewBox 0 0 600 358 y la cancha (PITCH_STAGE, \"CANCHA\")", () => {
    expect(layout.eventSlug).toBe(SLUG);
    expect(layout.viewBox).toBe("0 0 600 358");
    expect(layout.stage).toEqual(PITCH_STAGE);
    expect(layout.stage.label).toBe("CANCHA");
  });

  it("tiene los sectores exactos: Popular al fondo y las tribunas laterales, todos en la banda 102–296", () => {
    const band = (startAngle: number, endAngle: number) => ({
      ...STADIUM_CENTER,
      innerRadius: 102,
      outerRadius: 296,
      startAngle,
      endAngle,
    });
    expect(COPA_DEL_NORTE_VENUE.sectors).toEqual({
      stage: STAGE_SECTOR,
      popular: band(64, 116),
      oriente: band(6, 60),
      occidente: band(120, 174),
    });
    expect(Object.keys(COPA_DEL_NORTE_VENUE.sectors)).toEqual(["stage", "popular", "oriente", "occidente"]);
  });

  it("conserva el orden de los tipos, ids, ticketTypeId, tipo y capacidades, con el path de su sector y su labelPos", () => {
    const sectors = COPA_DEL_NORTE_VENUE.sectors;
    expect(
      layout.zones.map((zone) => [
        zone.id,
        zone.ticketTypeId,
        zone.kind,
        zone.kind === "general" ? zone.capacity : null,
        zone.labelPos,
      ]),
    ).toEqual([
      ["popular", "popular", "general", 2000, { x: 300, y: 283 }],
      ["oriente", "oriente", "general", 800, { x: 470, y: 135 }],
      ["occidente", "occidente", "numbered", null, { x: 130, y: 135 }],
    ]);
    for (const zone of layout.zones) expect(zone.path, zone.id).toBe(getAnnularSectorPath(sectors[zone.id]));
  });

  it("Occidente: filas A–F con 4, 5, 6, 7, 8 y 9 butacas (39), seatViewBox 0 0 365 368 y escala 1.3", () => {
    const occidente = getOccidente();
    expect(occidente.rows.map((row) => row.label).join("")).toBe("ABCDEF");
    expect(occidente.rows.map((row) => row.seats.length)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(occidente.rows.flatMap((row) => row.seats)).toHaveLength(39);
    expect(occidente.seatViewBox).toBe("0 0 365 368");
    expect(occidente.planTransform?.scale).toBe(1.3);
  });

  it("Occidente: accesibles exactamente occidente-F-3 y occidente-F-5, con 20 disponibles, 17 ocupadas y occidente-A-2 disponible", () => {
    const seats = getOccidente().rows.flatMap((row) => row.seats);
    const idsWith = (status: string) => seats.filter((seat) => seat.status === status).map((seat) => seat.id);
    expect(idsWith("accessible")).toEqual(["occidente-F-3", "occidente-F-5"]);
    expect(idsWith("available")).toHaveLength(20);
    expect(idsWith("occupied")).toHaveLength(17);
    expect(seats.find((seat) => seat.id === "occidente-A-2")?.status).toBe("available");
  });
});

describeWithDb("getVenueMapBySlug (herradura de fútbol)", () => {
  it("devuelve el layout del mock con los datos del evento", async () => {
    const map = await getVenueMapBySlug(SLUG);
    const event = await getEventBySlug(SLUG);
    const { zones, ...rest } = layout;

    expect(map).toEqual({
      ...rest,
      venue: event?.venue,
      zones: zones.map((zone) => {
        const ticketType = event?.ticketTypes.find((type) => type.id === zone.ticketTypeId);
        return { ...zone, name: ticketType?.name, price: ticketType?.price, status: ticketType?.status };
      }),
    });
  });

  it("resuelve occidente-A-2 como Occidente · Fila A · Asiento 2", async () => {
    const map = await getVenueMapBySlug(SLUG);
    if (!map) throw new Error(`Sin mapa: ${SLUG}`);
    expect(resolveSeats(map, ["occidente-A-2"])).toEqual([
      { id: "occidente-A-2", label: "Occidente · Fila A · Asiento 2", zoneId: "occidente", ticketTypeId: "occidente" },
    ]);
  });
});
