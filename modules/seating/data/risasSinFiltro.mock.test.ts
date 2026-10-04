// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { getEventBySlug } from "@/modules/events";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { getVenueMapBySlug } from "../services/seating.service";
import type { VenueZoneLayout } from "../types/seating.types";
import { resolveSeats } from "../utils/seatIds";
import { RISAS_VENUE } from "./risasSinFiltro.mock";
import { STADIUM_CENTER, STAGE_SECTOR } from "./stadium.mock";

const SLUG = "risas-sin-filtro";
const SWEEP = { startAngle: 41, endAngle: 139 };

const layout = venueLayoutSchema.parse(RISAS_VENUE.layout);

function getZone(zoneId: string): VenueZoneLayout {
  const zone = layout.zones.find((candidate) => candidate.id === zoneId);
  if (!zone) throw new Error(`Sin zona ${zoneId}`);
  return zone;
}

function getNumberedZone(zoneId: string): Extract<VenueZoneLayout, { kind: "numbered" }> {
  const zone = getZone(zoneId);
  if (zone.kind !== "numbered") throw new Error(`La zona ${zoneId} no es numerada`);
  return zone;
}

function seatsPerRow(zoneId: string): [string, number][] {
  return getNumberedZone(zoneId).rows.map((row) => [row.label, row.seats.length]);
}

function seatsOf(zoneId: string) {
  return getNumberedZone(zoneId).rows.flatMap((row) => row.seats);
}

describe("risasSinFiltro.mock (comedia curva)", () => {
  it("tiene viewBox 0 0 600 450 y las zonas mesa, preferencial y general en su orden", () => {
    expect(layout.eventSlug).toBe(SLUG);
    expect(layout.viewBox).toBe("0 0 600 450");
    expect(layout.zones.map((zone) => [zone.id, zone.ticketTypeId, zone.kind])).toEqual([
      ["mesa", "mesa", "numbered"],
      ["preferencial", "preferencial", "numbered"],
      ["general", "general", "general"],
    ]);
  });

  it("tiene los sectores del requisito 5, en media luna de 98° (41°…139°)", () => {
    expect(RISAS_VENUE.sectors).toEqual({
      stage: STAGE_SECTOR,
      mesa: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 186, ...SWEEP },
      preferencial: { ...STADIUM_CENTER, innerRadius: 194, outerRadius: 304, ...SWEEP },
      general: { ...STADIUM_CENTER, innerRadius: 312, outerRadius: 390, ...SWEEP },
    });
  });

  it("pone cada labelPos en el eje, a mitad de su banda", () => {
    expect(layout.zones.map((zone) => [zone.id, zone.labelPos])).toEqual([
      ["mesa", { x: 300, y: 198 }],
      ["preferencial", { x: 300, y: 303 }],
      ["general", { x: 300, y: 405 }],
    ]);
  });

  it("Mesa: filas A–C con 6, 8 y 10 butacas (24), todas ocupadas y sin accesibles", () => {
    const mesa = getNumberedZone("mesa");

    expect(seatsPerRow("mesa")).toEqual([
      ["A", 6],
      ["B", 8],
      ["C", 10],
    ]);
    expect(seatsOf("mesa")).toHaveLength(24);
    expect(seatsOf("mesa").every((seat) => seat.status === "occupied")).toBe(true);
    expect(mesa.seatViewBox).toBe("0 0 384 191");
    expect(mesa.planTransform?.scale).toBe(1.195);
  });

  it("Preferencial: filas A–D con 12, 14, 16 y 18 butacas (60), plano 601 × 261 y escala 1.205", () => {
    const preferencial = getNumberedZone("preferencial");

    expect(seatsPerRow("preferencial")).toEqual([
      ["A", 12],
      ["B", 14],
      ["C", 16],
      ["D", 18],
    ]);
    expect(seatsOf("preferencial")).toHaveLength(60);
    expect(preferencial.seatViewBox).toBe("0 0 601 261");
    expect(preferencial.planTransform?.scale).toBe(1.205);
  });

  it("Preferencial: accesibles exactas D-3 y D-12, 14 disponibles y preferencial-A-5 disponible", () => {
    const seats = seatsOf("preferencial");

    expect(seats.filter((seat) => seat.status === "accessible").map((seat) => seat.id)).toEqual([
      "preferencial-D-3",
      "preferencial-D-12",
    ]);
    expect(seats.filter((seat) => seat.status === "available")).toHaveLength(14);
    expect(seats.find((seat) => seat.id === "preferencial-A-5")?.status).toBe("available");
  });

  it("General es de pie con capacidad 600", () => {
    expect(getZone("general")).toMatchObject({ kind: "general", capacity: 600 });
  });
});

describeWithDb("risasSinFiltro.mock en la BD", () => {
  it("getVenueMapBySlug devuelve el layout del mock con los datos del evento", async () => {
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

  it("resolveSeats resuelve preferencial-A-5 con su etiqueta", async () => {
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
