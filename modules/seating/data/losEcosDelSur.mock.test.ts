// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { sellTestSeats } from "@/lib/db/testFixtures";
import { inRolledBackTransaction } from "@/lib/db/testTransaction";
import { getEventBySlug } from "@/modules/events";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { getVenueMapBySlug } from "../services/seating.service";
import type { VenueZoneLayout } from "../types/seating.types";
import { getAnnularSectorPath } from "../utils/annularSector";
import { ECOS_DEL_SUR_VENUE } from "./losEcosDelSur.mock";
import { toSeededLayout } from "./seededLayout";
import { STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

const SLUG = "los-ecos-del-sur-arequipa";
const SWEEP = { startAngle: 45, endAngle: 135 };

const layout = venueLayoutSchema.parse(ECOS_DEL_SUR_VENUE.layout);

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

describe("losEcosDelSur.mock (concierto agotado en teatro)", () => {
  it("tiene viewBox 0 0 600 414 y el escenario compartido del estadio", () => {
    expect(layout.eventSlug).toBe(SLUG);
    expect(layout.viewBox).toBe("0 0 600 414");
    expect(layout.stage).toEqual(STADIUM_STAGE);
  });

  it("tiene las zonas general y platea en el orden de los ticketTypes", () => {
    expect(layout.zones.map((zone) => [zone.id, zone.ticketTypeId, zone.kind])).toEqual([
      ["general", "general", "general"],
      ["platea", "platea", "numbered"],
    ]);
  });

  it("tiene los sectores del requisito 6, en abanico de 90° (45°…135°), con su path", () => {
    expect(ECOS_DEL_SUR_VENUE.sectors).toEqual({
      stage: STAGE_SECTOR,
      general: { ...STADIUM_CENTER, innerRadius: 258, outerRadius: 352, ...SWEEP },
      platea: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 250, ...SWEEP },
    });
    expect(Object.keys(ECOS_DEL_SUR_VENUE.sectors)).toEqual(["stage", "general", "platea"]);
    for (const zone of layout.zones) {
      expect(zone.path, zone.id).toBe(getAnnularSectorPath(ECOS_DEL_SUR_VENUE.sectors[zone.id]));
    }
  });

  it("pone cada labelPos en el eje de su banda", () => {
    expect(layout.zones.map((zone) => [zone.id, zone.labelPos])).toEqual([
      ["general", { x: 300, y: 357 }],
      ["platea", { x: 300, y: 226 }],
    ]);
  });

  it("General (Galería) es de pie con capacidad 300", () => {
    expect(getZone("general")).toMatchObject({ kind: "general", capacity: 300 });
  });

  it("Platea: filas A–F con 6, 8, 9, 11, 13 y 14 butacas (61), seatViewBox 0 0 508 280 y escala 1.3", () => {
    const platea = getNumberedZone("platea");

    expect(platea.rows.map((row) => [row.label, row.seats.length])).toEqual([
      ["A", 6],
      ["B", 8],
      ["C", 9],
      ["D", 11],
      ["E", 13],
      ["F", 14],
    ]);
    expect(platea.rows.flatMap((row) => row.seats)).toHaveLength(61);
    expect(platea.seatViewBox).toBe("0 0 508 280");
    expect(platea.planTransform?.scale).toBe(1.3);
    expect(platea.planTransform?.x).toBeCloseTo(-136.19, 2);
    expect(platea.planTransform?.y).toBeCloseTo(-139.96, 2);
  });

  it("Platea está agotada: todas sus butacas están ocupadas y no tiene accesibles", () => {
    const seats = getNumberedZone("platea").rows.flatMap((row) => row.seats);

    expect(seats.every((seat) => seat.status === "occupied")).toBe(true);
    expect(seats.filter((seat) => seat.status === "accessible")).toEqual([]);
  });
});

describeWithDb("losEcosDelSur.mock en la BD", () => {
  it("getVenueMapBySlug devuelve el layout del mock con los datos del evento", async () => {
    const map = await getVenueMapBySlug(SLUG);
    const event = await getEventBySlug(SLUG);
    const { zones, ...rest } = toSeededLayout(layout);

    expect(map).toEqual({
      ...rest,
      venue: event?.venue,
      zones: zones.map((zone) => {
        const ticketType = event?.ticketTypes.find((type) => type.id === zone.ticketTypeId);
        return { ...zone, name: ticketType?.name, price: ticketType?.price, status: ticketType?.status };
      }),
    });
  });

  it("sembradas, las dos zonas están disponibles; vendido todo, las dos quedan agotadas", async () => {
    const statuses = async () => {
      const map = await getVenueMapBySlug(SLUG);
      if (!map) throw new Error(`Sin mapa: ${SLUG}`);
      return map.zones.map((zone) => [zone.id, zone.status]);
    };

    expect(await statuses()).toEqual([
      ["general", "available"],
      ["platea", "available"],
    ]);
    await inRolledBackTransaction(async () => {
      await sellTestSeats(SLUG);
      expect(await statuses()).toEqual([
        ["general", "sold-out"],
        ["platea", "sold-out"],
      ]);
    });
  });
});
