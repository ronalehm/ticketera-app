// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { sellTestSeats } from "@/lib/db/testFixtures";
import { inRolledBackTransaction } from "@/lib/db/testTransaction";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { getVenueMapBySlug } from "../services/seating.service";
import type { VenueMap } from "../types/seating.types";
import { getAnnularSectorPath } from "../utils/annularSector";
import { resolveSeats } from "../utils/seatIds";
import { ESPEJOS_SECTORS, ESPEJOS_VENUE } from "./laCasaDeLosEspejos.mock";
import { toSeededLayout } from "./seededLayout";
import { STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

const SLUG = "la-casa-de-los-espejos";
const layout = venueLayoutSchema.parse(ESPEJOS_VENUE.layout);

function getNumberedZone(zoneId: string) {
  const zone = layout.zones.find((candidate) => candidate.id === zoneId);
  if (zone?.kind !== "numbered") throw new Error(`Sin zona numerada ${zoneId}`);
  return zone;
}

function findSeat(zoneId: string, seatId: string) {
  return getNumberedZone(zoneId)
    .rows.flatMap((row) => row.seats)
    .find((seat) => seat.id === seatId);
}

function accessibleIds(zoneId: string): string[] {
  return getNumberedZone(zoneId)
    .rows.flatMap((row) => row.seats)
    .filter((seat) => seat.status === "accessible")
    .map((seat) => seat.id);
}

describe("teatro curvo la-casa-de-los-espejos (mock)", () => {
  it("tiene viewBox 0 0 600 484 y el escenario compartido del estadio", () => {
    expect(layout.viewBox).toBe("0 0 600 484");
    expect(layout.stage).toEqual(STADIUM_STAGE);
  });

  it("conserva las zonas, su orden, sus ticketTypeId y su tipo", () => {
    expect(layout.zones.map((zone) => [zone.id, zone.ticketTypeId, zone.kind])).toEqual([
      ["platea", "platea", "numbered"],
      ["mezanine", "mezanine", "numbered"],
    ]);
  });

  it("Platea y Mezanine son sectores en abanico de 48° a 132°, con su path y su labelPos en el eje", () => {
    expect(ESPEJOS_VENUE.sectors).toBe(ESPEJOS_SECTORS);
    expect(ESPEJOS_SECTORS).toEqual({
      stage: STAGE_SECTOR,
      platea: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 281, startAngle: 48, endAngle: 132 },
      mezanine: { ...STADIUM_CENTER, innerRadius: 289, outerRadius: 422, startAngle: 48, endAngle: 132 },
    });
    expect(layout.zones.map((zone) => [zone.id, zone.labelPos])).toEqual([
      ["platea", { x: 300, y: 245 }],
      ["mezanine", { x: 300, y: 409 }],
    ]);
    expect(getNumberedZone("platea").path).toBe(getAnnularSectorPath(ESPEJOS_SECTORS.platea));
    expect(getNumberedZone("mezanine").path).toBe(getAnnularSectorPath(ESPEJOS_SECTORS.mezanine));
  });

  it("Platea tiene las filas A–H con 7, 8, 10, 11, 12, 14, 15 y 17 butacas (94), seatViewBox 0 0 596 347 y escala 1.455", () => {
    const platea = getNumberedZone("platea");
    expect(platea.rows.map((row) => row.label).join("")).toBe("ABCDEFGH");
    expect(platea.rows.map((row) => row.seats.length)).toEqual([7, 8, 10, 11, 12, 14, 15, 17]);
    expect(platea.rows.flatMap((row) => row.seats)).toHaveLength(94);
    expect(platea.seatViewBox).toBe("0 0 596 347");
    expect(platea.planTransform?.scale).toBe(1.455);
    expect(platea.planTransform?.x).toBeCloseTo(-138.92, 2);
    expect(platea.planTransform?.y).toBeCloseTo(-164.86, 2);
  });

  it("Mezanine tiene las filas A–D con 13, 14, 16 y 17 butacas (60), seatViewBox 0 0 610 255 y escala 0.995", () => {
    const mezanine = getNumberedZone("mezanine");
    expect(mezanine.rows.map((row) => row.label).join("")).toBe("ABCD");
    expect(mezanine.rows.map((row) => row.seats.length)).toEqual([13, 14, 16, 17]);
    expect(mezanine.rows.flatMap((row) => row.seats)).toHaveLength(60);
    expect(mezanine.seatViewBox).toBe("0 0 610 255");
    expect(mezanine.planTransform?.scale).toBe(0.995);
    expect(mezanine.planTransform?.x).toBeCloseTo(6.46, 2);
    expect(mezanine.planTransform?.y).toBeCloseTo(-243.43, 2);
  });

  it("las accesibles son exactamente platea-H-1, platea-H-15 y mezanine-D-16", () => {
    expect(accessibleIds("platea")).toEqual(["platea-H-1", "platea-H-15"]);
    expect(accessibleIds("mezanine")).toEqual(["mezanine-D-16"]);
  });

  it("conserva el estado de las butacas de la orden demo: platea-F-7 ocupada y platea-F-8 disponible", () => {
    expect(findSeat("platea", "platea-F-7")?.status).toBe("occupied");
    expect(findSeat("platea", "platea-F-8")?.status).toBe("available");
  });

  it("ninguna fila de Platea supera el 50 % de ocupadas", () => {
    for (const row of getNumberedZone("platea").rows) {
      const occupied = row.seats.filter((seat) => seat.status === "occupied").length;
      expect(occupied / row.seats.length, row.label).toBeLessThanOrEqual(0.5);
    }
  });

  it("Mezanine queda con 9 disponibles, entre ellas mezanine-A-3", () => {
    const seats = getNumberedZone("mezanine").rows.flatMap((row) => row.seats);
    expect(seats.filter((seat) => seat.status === "available")).toHaveLength(9);
    expect(findSeat("mezanine", "mezanine-A-3")?.status).toBe("available");
  });
});

describeWithDb("teatro curvo la-casa-de-los-espejos (BD)", () => {
  async function getMap(): Promise<VenueMap> {
    const map = await getVenueMapBySlug(SLUG);
    if (!map) throw new Error(`Sin mapa: ${SLUG}`);
    return map;
  }

  it("el mapa de la BD coincide con el layout del mock", async () => {
    const map = await getMap();
    expect(map).toMatchObject({ viewBox: layout.viewBox, stage: layout.stage, zones: toSeededLayout(layout).zones });
  });

  it("platea-F-8 resuelve con su etiqueta y mezanine-A-3 resuelve", async () => {
    const map = await getMap();
    expect(resolveSeats(map, ["platea-F-8"])?.map((seat) => seat.label)).toEqual(["Platea · Fila F · Asiento 8"]);
    expect(resolveSeats(map, ["mezanine-A-3"])).toEqual([
      { id: "mezanine-A-3", label: "Mezanine · Fila A · Asiento 3", zoneId: "mezanine", ticketTypeId: "mezanine" },
    ]);
  });

  it("platea-F-7 vendida existe pero está ocupada, así que no resuelve", async () => {
    await inRolledBackTransaction(async () => {
      // El seed no siembra ventas: la venta la crea el test.
      await sellTestSeats(SLUG, { seatIds: ["platea-F-7"] });
      const map = await getMap();
      const platea = map.zones.find((zone) => zone.id === "platea");
      const seats = platea?.kind === "numbered" ? platea.rows.flatMap((row) => row.seats) : [];
      expect(seats.find((seat) => seat.id === "platea-F-7")?.status).toBe("occupied");
      expect(resolveSeats(map, ["platea-F-7"])).toBeNull();
    });
  });
});
