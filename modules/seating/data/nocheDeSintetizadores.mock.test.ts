// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { getVenueMapBySlug } from "../services/seating.service";
import type { VenueZoneLayout } from "../types/seating.types";
import { getAnnularSectorPath } from "../utils/annularSector";
import { resolveSeats } from "../utils/seatIds";
import { SINTETIZADORES_VENUE } from "./nocheDeSintetizadores.mock";
import { STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

const SLUG = "noche-de-sintetizadores-lima";
const layout = venueLayoutSchema.parse(SINTETIZADORES_VENUE.layout);

function getNorte(): Extract<VenueZoneLayout, { kind: "numbered" }> | undefined {
  const zone = layout.zones.find((candidate) => candidate.id === "norte");
  return zone?.kind === "numbered" ? zone : undefined;
}

describe("SINTETIZADORES_VENUE (arena curva)", () => {
  it("usa el viewBox 0 0 600 580 y el escenario compartido", () => {
    expect(layout.eventSlug).toBe(SLUG);
    expect(layout.viewBox).toBe("0 0 600 580");
    expect(layout.stage).toEqual(STADIUM_STAGE);
  });

  it("tiene los sectores exactos de la arena: 3 anillos de pie de 112° y Tribuna Norte de 66°", () => {
    const ring = (innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => ({
      ...STADIUM_CENTER,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
    });
    expect(SINTETIZADORES_VENUE.sectors).toEqual({
      stage: STAGE_SECTOR,
      vip: ring(102, 166, 34, 146),
      preferencial: ring(174, 236, 34, 146),
      general: ring(244, 306, 34, 146),
      norte: ring(314, 518, 57, 123),
    });
  });

  it("conserva ids, ticketTypeId, tipo y capacidades, con el path de su sector y su labelPos", () => {
    const sectors = SINTETIZADORES_VENUE.sectors ?? {};
    expect(
      layout.zones.map((zone) => [
        zone.id,
        zone.ticketTypeId,
        zone.kind,
        zone.kind === "general" ? zone.capacity : null,
        zone.labelPos,
      ]),
    ).toEqual([
      ["vip", "vip", "general", 1500, { x: 300, y: 188 }],
      ["preferencial", "preferencial", "general", 4000, { x: 300, y: 259 }],
      ["general", "general", "general", 12000, { x: 300, y: 329 }],
      ["norte", "norte", "numbered", null, { x: 300, y: 470 }],
    ]);
    for (const zone of layout.zones) expect(zone.path, zone.id).toBe(getAnnularSectorPath(sectors[zone.id]));
  });

  it("Tribuna Norte: filas A–F con 10, 12, 13, 14, 15 y 16 butacas (80), seatViewBox 0 0 590 293 y escala 0.96", () => {
    const norte = getNorte();
    expect(norte?.rows.map((row) => row.label).join("")).toBe("ABCDEF");
    expect(norte?.rows.map((row) => row.seats.length)).toEqual([10, 12, 13, 14, 15, 16]);
    expect(norte?.rows.flatMap((row) => row.seats)).toHaveLength(80);
    expect(norte?.seatViewBox).toBe("0 0 590 293");
    expect(norte?.planTransform?.scale).toBe(0.96);
  });

  it("Tribuna Norte: accesibles exactamente norte-F-1 y norte-F-15, con 53 disponibles y 25 ocupadas", () => {
    const seats = getNorte()?.rows.flatMap((row) => row.seats) ?? [];
    const idsWith = (status: string) => seats.filter((seat) => seat.status === status).map((seat) => seat.id);
    expect(idsWith("accessible")).toEqual(["norte-F-1", "norte-F-15"]);
    expect(idsWith("available")).toHaveLength(53);
    expect(idsWith("occupied")).toHaveLength(25);
    expect(seats.find((seat) => seat.id === "norte-A-1")?.status).toBe("available");
  });
});

describeWithDb("getVenueMapBySlug (arena curva)", () => {
  it("devuelve el layout del mock", async () => {
    const map = await getVenueMapBySlug(SLUG);
    expect(map?.viewBox).toBe(layout.viewBox);
    expect(map?.stage).toEqual(layout.stage);
    expect(map?.zones).toEqual(layout.zones.map((zone) => expect.objectContaining(zone)));
  });

  it("resuelve norte-A-1 como Tribuna Norte · Fila A · Asiento 1", async () => {
    const map = await getVenueMapBySlug(SLUG);
    if (!map) throw new Error(`Sin mapa: ${SLUG}`);
    expect(resolveSeats(map, ["norte-A-1"])).toEqual([
      { id: "norte-A-1", label: "Tribuna Norte · Fila A · Asiento 1", zoneId: "norte", ticketTypeId: "norte" },
    ]);
  });
});
