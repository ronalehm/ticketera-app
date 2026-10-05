// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { getEventBySlug } from "@/modules/events";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { getVenueMapBySlug } from "../services/seating.service";
import type { VenueZoneLayout } from "../types/seating.types";
import { getAnnularSectorPath } from "../utils/annularSector";
import { resolveSeats } from "../utils/seatIds";
import { MICRO_ABIERTO_VENUE } from "./microAbierto.mock";
import { STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

const SLUG = "micro-abierto-arequipa";
const SWEEP = { startAngle: 40, endAngle: 140 };
const layout = venueLayoutSchema.parse(MICRO_ABIERTO_VENUE.layout);

function getMesa(): Extract<VenueZoneLayout, { kind: "numbered" }> {
  const zone = layout.zones.find((candidate) => candidate.id === "mesa");
  if (zone?.kind !== "numbered") throw new Error("Mesa no es una zona numerada");
  return zone;
}

describe("MICRO_ABIERTO_VENUE (stand-up curvo)", () => {
  it("usa el viewBox 0 0 600 390 y el escenario compartido (STADIUM_STAGE, \"ESCENARIO\")", () => {
    expect(layout.eventSlug).toBe(SLUG);
    expect(layout.viewBox).toBe("0 0 600 390");
    expect(layout.stage).toEqual(STADIUM_STAGE);
    expect(layout.stage.label).toBe("ESCENARIO");
  });

  it("tiene los sectores exactos del requisito 9, en media luna de 100° (40°…140°)", () => {
    expect(MICRO_ABIERTO_VENUE.sectors).toEqual({
      stage: STAGE_SECTOR,
      general: { ...STADIUM_CENTER, innerRadius: 222, outerRadius: 328, ...SWEEP },
      mesa: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 214, ...SWEEP },
    });
    expect(Object.keys(MICRO_ABIERTO_VENUE.sectors)).toEqual(["stage", "general", "mesa"]);
  });

  it("conserva el orden de los tipos, ids, ticketTypeId, tipo y capacidades, con el path de su sector y su labelPos", () => {
    const sectors = MICRO_ABIERTO_VENUE.sectors;
    expect(
      layout.zones.map((zone) => [
        zone.id,
        zone.ticketTypeId,
        zone.kind,
        zone.kind === "general" ? zone.capacity : null,
        zone.labelPos,
      ]),
    ).toEqual([
      ["general", "general", "general", 300, { x: 300, y: 323 }],
      ["mesa", "mesa", "numbered", null, { x: 300, y: 201 }],
    ]);
    for (const zone of layout.zones) expect(zone.path, zone.id).toBe(getAnnularSectorPath(sectors[zone.id]));
  });

  it("Mesa: filas A–C con 6, 8 y 10 butacas (24, pares), seatViewBox 0 0 389 203 y escala 1.04", () => {
    const mesa = getMesa();
    expect(mesa.rows.map((row) => row.label).join("")).toBe("ABC");
    expect(mesa.rows.map((row) => row.seats.length)).toEqual([6, 8, 10]);
    expect(mesa.rows.every((row) => row.seats.length % 2 === 0)).toBe(true);
    expect(mesa.rows.flatMap((row) => row.seats)).toHaveLength(24);
    expect(mesa.seatViewBox).toBe("0 0 389 203");
    expect(mesa.planTransform?.scale).toBe(1.04);
  });

  it("Mesa: accesibles exactamente mesa-C-2 y mesa-C-9, con 7 disponibles, 15 ocupadas y mesa-A-2 disponible", () => {
    const seats = getMesa().rows.flatMap((row) => row.seats);
    const idsWith = (status: string) => seats.filter((seat) => seat.status === status).map((seat) => seat.id);
    expect(idsWith("accessible")).toEqual(["mesa-C-2", "mesa-C-9"]);
    expect(idsWith("available")).toHaveLength(7);
    expect(idsWith("occupied")).toHaveLength(15);
    expect(seats.find((seat) => seat.id === "mesa-A-2")?.status).toBe("available");
  });
});

describeWithDb("getVenueMapBySlug (stand-up curvo)", () => {
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

  it("resuelve mesa-A-2 como Mesa · Fila A · Asiento 2", async () => {
    const map = await getVenueMapBySlug(SLUG);
    if (!map) throw new Error(`Sin mapa: ${SLUG}`);
    expect(resolveSeats(map, ["mesa-A-2"])).toEqual([
      { id: "mesa-A-2", label: "Mesa · Fila A · Asiento 2", zoneId: "mesa", ticketTypeId: "mesa" },
    ]);
  });
});
