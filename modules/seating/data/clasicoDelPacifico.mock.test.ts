// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { getEventBySlug } from "@/modules/events";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { getVenueMapBySlug } from "../services/seating.service";
import type { VenueZoneLayout } from "../types/seating.types";
import { getAnnularSectorPath } from "../utils/annularSector";
import { resolveSeats } from "../utils/seatIds";
import { CLASICO_VENUE } from "./clasicoDelPacifico.mock";
import { PITCH_STAGE, STADIUM_CENTER, STAGE_SECTOR } from "./stadium.mock";

const SLUG = "clasico-del-pacifico";
const layout = venueLayoutSchema.parse(CLASICO_VENUE.layout);

function getNumbered(id: "oriente" | "occidente"): Extract<VenueZoneLayout, { kind: "numbered" }> {
  const zone = layout.zones.find((candidate) => candidate.id === id);
  if (zone?.kind !== "numbered") throw new Error(`${id} no es una zona numerada`);
  return zone;
}

function getSeats(id: "oriente" | "occidente") {
  const seats = getNumbered(id).rows.flatMap((row) => row.seats);
  const idsWith = (status: string) => seats.filter((seat) => seat.status === status).map((seat) => seat.id);
  const statusOf = (seatId: string) => seats.find((seat) => seat.id === seatId)?.status;
  return { seats, idsWith, statusOf };
}

describe("CLASICO_VENUE (herradura con Palco y Popular al fondo)", () => {
  it("usa el viewBox 0 0 600 392 y la cancha (PITCH_STAGE, \"CANCHA\")", () => {
    expect(layout.eventSlug).toBe(SLUG);
    expect(layout.viewBox).toBe("0 0 600 392");
    expect(layout.stage).toEqual(PITCH_STAGE);
    expect(layout.stage.label).toBe("CANCHA");
  });

  it("tiene los sectores exactos: laterales en 102–296, Palco (102–220) y Popular (228–330) al fondo", () => {
    const sector = (innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => ({
      ...STADIUM_CENTER,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
    });
    expect(CLASICO_VENUE.sectors).toEqual({
      stage: STAGE_SECTOR,
      popular: sector(228, 330, 57, 123),
      oriente: sector(102, 296, 6, 53),
      occidente: sector(102, 296, 127, 174),
      palco: sector(102, 220, 57, 123),
    });
    expect(Object.keys(CLASICO_VENUE.sectors)).toEqual(["stage", "popular", "oriente", "occidente", "palco"]);
  });

  it("conserva el orden de los tipos, ids, ticketTypeId, tipo y capacidades, con el path de su sector y su labelPos", () => {
    const sectors = CLASICO_VENUE.sectors;
    expect(
      layout.zones.map((zone) => [
        zone.id,
        zone.ticketTypeId,
        zone.kind,
        zone.kind === "general" ? zone.capacity : null,
        zone.labelPos,
      ]),
    ).toEqual([
      ["popular", "popular", "general", 3000, { x: 300, y: 327 }],
      ["oriente", "oriente", "numbered", null, { x: 478, y: 122 }],
      ["occidente", "occidente", "numbered", null, { x: 122, y: 122 }],
      ["palco", "palco", "general", 120, { x: 300, y: 211 }],
    ]);
    for (const zone of layout.zones) expect(zone.path, zone.id).toBe(getAnnularSectorPath(sectors[zone.id]));
  });

  it.each(["oriente", "occidente"] as const)(
    "%s: filas A–F con 4, 4, 5, 6, 7 y 8 butacas (34), seatViewBox 0 0 351 342 y escala 1.3",
    (id) => {
      const zone = getNumbered(id);
      expect(zone.rows.map((row) => row.label).join("")).toBe("ABCDEF");
      expect(zone.rows.map((row) => row.seats.length)).toEqual([4, 4, 5, 6, 7, 8]);
      expect(zone.rows.flatMap((row) => row.seats)).toHaveLength(34);
      expect(zone.seatViewBox).toBe("0 0 351 342");
      expect(zone.planTransform?.scale).toBe(1.3);
    },
  );

  it("Oriente: accesibles exactamente oriente-F-1 y oriente-F-8, con 23 disponibles, 9 ocupadas y oriente-A-1 disponible", () => {
    const { idsWith, statusOf } = getSeats("oriente");
    expect(idsWith("accessible")).toEqual(["oriente-F-1", "oriente-F-8"]);
    expect(idsWith("available")).toHaveLength(23);
    expect(idsWith("occupied")).toHaveLength(9);
    expect(statusOf("oriente-A-1")).toBe("available");
  });

  it("Occidente: accesible solo occidente-F-5, 5 disponibles (A-3, B-4, C-1, D-5, E-5) y 28 ocupadas, con occidente-F-4 ocupada", () => {
    const { idsWith, statusOf } = getSeats("occidente");
    expect(idsWith("accessible")).toEqual(["occidente-F-5"]);
    expect(idsWith("available")).toEqual([
      "occidente-A-3",
      "occidente-B-4",
      "occidente-C-1",
      "occidente-D-5",
      "occidente-E-5",
    ]);
    expect(idsWith("occupied")).toHaveLength(28);
    expect(statusOf("occidente-A-3")).toBe("available");
    // Butaca de la orden demo MT-3HX9RB (decisión 6 de `seating-all-venue-maps`).
    expect(statusOf("occidente-F-4")).toBe("occupied");
  });
});

describeWithDb("getVenueMapBySlug (Clásico del Pacífico, mapa propio en el Estadio Nacional)", () => {
  it("usa el viewBox y la cancha del evento en el Estadio Nacional", async () => {
    const map = await getVenueMapBySlug(SLUG);
    expect(map?.venue).toBe("Estadio Nacional");
    expect(map?.viewBox).toBe("0 0 600 392");
    expect(map?.stage.label).toBe("CANCHA");
  });

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

  it("resuelve oriente-A-1 como Oriente · Fila A · Asiento 1 y rechaza occidente-F-4 (ocupada)", async () => {
    const map = await getVenueMapBySlug(SLUG);
    if (!map) throw new Error(`Sin mapa: ${SLUG}`);
    expect(resolveSeats(map, ["oriente-A-1"])).toEqual([
      { id: "oriente-A-1", label: "Oriente · Fila A · Asiento 1", zoneId: "oriente", ticketTypeId: "oriente" },
    ]);
    expect(resolveSeats(map, ["occidente-F-4"])).toBeNull();
  });
});
