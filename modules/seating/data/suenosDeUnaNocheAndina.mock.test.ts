// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { getEventBySlug } from "@/modules/events";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { getVenueMapBySlug } from "../services/seating.service";
import type { VenueZoneLayout } from "../types/seating.types";
import { getAnnularSectorPath } from "../utils/annularSector";
import { resolveSeats } from "../utils/seatIds";
import { STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";
import { NOCHE_ANDINA_VENUE } from "./suenosDeUnaNocheAndina.mock";

const SLUG = "suenos-de-una-noche-andina";
const SWEEP = { startAngle: 45, endAngle: 135 };

const layout = venueLayoutSchema.parse(NOCHE_ANDINA_VENUE.layout);

function getPreferencial(): Extract<VenueZoneLayout, { kind: "numbered" }> {
  const zone = layout.zones.find((candidate) => candidate.id === "preferencial");
  if (zone?.kind !== "numbered") throw new Error("Preferencial no es una zona numerada");
  return zone;
}

describe("NOCHE_ANDINA_VENUE (teatro con Preferencial numerada A–E)", () => {
  it("tiene viewBox 0 0 600 402 y el escenario compartido del estadio", () => {
    expect(layout.eventSlug).toBe(SLUG);
    expect(layout.viewBox).toBe("0 0 600 402");
    expect(layout.stage).toEqual(STADIUM_STAGE);
  });

  it("tiene los sectores del requisito 10, en abanico de 90° (45°…135°)", () => {
    expect(NOCHE_ANDINA_VENUE.sectors).toEqual({
      stage: STAGE_SECTOR,
      general: { ...STADIUM_CENTER, innerRadius: 240, outerRadius: 340, ...SWEEP },
      preferencial: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 232, ...SWEEP },
    });
    expect(Object.keys(NOCHE_ANDINA_VENUE.sectors)).toEqual(["stage", "general", "preferencial"]);
  });

  it("conserva el orden de los tipos, ids, ticketTypeId, tipo y capacidades, con el path de su sector y su labelPos", () => {
    expect(
      layout.zones.map((zone) => [
        zone.id,
        zone.ticketTypeId,
        zone.kind,
        zone.kind === "general" ? zone.capacity : null,
        zone.labelPos,
      ]),
    ).toEqual([
      ["general", "general", "general", 250, { x: 300, y: 338 }],
      ["preferencial", "preferencial", "numbered", null, { x: 300, y: 211 }],
    ]);
    for (const zone of layout.zones) {
      expect(zone.path, zone.id).toBe(getAnnularSectorPath(NOCHE_ANDINA_VENUE.sectors[zone.id]));
    }
  });

  it("Preferencial: filas A–E con 6, 8, 10, 11 y 13 butacas (48), seatViewBox 0 0 470 254 y escala 1.285", () => {
    const preferencial = getPreferencial();
    expect(preferencial.rows.map((row) => row.label).join("")).toBe("ABCDE");
    expect(preferencial.rows.map((row) => row.seats.length)).toEqual([6, 8, 10, 11, 13]);
    expect(preferencial.rows.flatMap((row) => row.seats)).toHaveLength(48);
    expect(preferencial.seatViewBox).toBe("0 0 470 254");
    expect(preferencial.planTransform?.scale).toBe(1.285);
    expect(preferencial.planTransform?.x).toBeCloseTo(-150.7, 2);
    expect(preferencial.planTransform?.y).toBeCloseTo(-138.07, 2);
  });

  it("Preferencial: accesibles exactamente preferencial-E-1 y preferencial-E-13, con 30 disponibles, 16 ocupadas y preferencial-A-5 disponible", () => {
    const seats = getPreferencial().rows.flatMap((row) => row.seats);
    const idsWith = (status: string) => seats.filter((seat) => seat.status === status).map((seat) => seat.id);
    expect(idsWith("accessible")).toEqual(["preferencial-E-1", "preferencial-E-13"]);
    expect(idsWith("available")).toHaveLength(30);
    expect(idsWith("occupied")).toHaveLength(16);
    expect(seats.find((seat) => seat.id === "preferencial-A-5")?.status).toBe("available");
  });

  it("ninguna fila de Preferencial supera el 50 % de ocupadas", () => {
    for (const row of getPreferencial().rows) {
      const occupied = row.seats.filter((seat) => seat.status === "occupied").length;
      expect(occupied / row.seats.length, row.label).toBeLessThanOrEqual(0.5);
    }
  });
});

describeWithDb("getVenueMapBySlug (teatro con Preferencial numerada A–E)", () => {
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

  it("resuelve preferencial-A-5 como Preferencial · Fila A · Asiento 5", async () => {
    const map = await getVenueMapBySlug(SLUG);
    if (!map) throw new Error(`Sin mapa: ${SLUG}`);
    expect(resolveSeats(map, ["preferencial-A-5"])).toEqual([
      {
        id: "preferencial-A-5",
        label: "Preferencial · Fila A · Asiento 5",
        zoneId: "preferencial",
        ticketTypeId: "preferencial",
      },
    ]);
  });
});
