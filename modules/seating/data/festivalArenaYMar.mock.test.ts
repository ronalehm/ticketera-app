// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { getEventBySlug } from "@/modules/events";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { getVenueMapBySlug } from "../services/seating.service";
import { getAnnularSectorPath } from "../utils/annularSector";
import { ARENA_Y_MAR_VENUE } from "./festivalArenaYMar.mock";
import { STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

const SLUG = "festival-arena-y-mar-piura";
const SWEEP = { startAngle: 40, endAngle: 140 };

const layout = venueLayoutSchema.parse(ARENA_Y_MAR_VENUE.layout);

describe("ARENA_Y_MAR_VENUE (festival de playa)", () => {
  it("usa el viewBox 0 0 600 398 y el escenario compartido del estadio", () => {
    expect(layout.eventSlug).toBe(SLUG);
    expect(layout.viewBox).toBe("0 0 600 398");
    expect(layout.stage).toEqual(STADIUM_STAGE);
  });

  it("tiene los sectores del requisito 8: VIP delante y General detrás, en abanico de 100° (40°…140°)", () => {
    expect(ARENA_Y_MAR_VENUE.sectors).toEqual({
      stage: STAGE_SECTOR,
      general: { ...STADIUM_CENTER, innerRadius: 226, outerRadius: 336, ...SWEEP },
      vip: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 218, ...SWEEP },
    });
    expect(Object.keys(ARENA_Y_MAR_VENUE.sectors)).toEqual(["stage", "general", "vip"]);
  });

  it("conserva el orden de los tipos, ids, ticketTypeId, tipo y capacidades de pie, con el path de su sector y su labelPos", () => {
    expect(
      layout.zones.map((zone) => [
        zone.id,
        zone.ticketTypeId,
        zone.kind,
        zone.kind === "general" ? zone.capacity : null,
        zone.labelPos,
      ]),
    ).toEqual([
      ["general", "general", "general", 2000, { x: 300, y: 329 }],
      ["vip", "vip", "general", 400, { x: 300, y: 203 }],
    ]);
    for (const zone of layout.zones) {
      expect(zone.path, zone.id).toBe(getAnnularSectorPath(ARENA_Y_MAR_VENUE.sectors[zone.id]));
    }
  });
});

describeWithDb("getVenueMapBySlug (festival de playa)", () => {
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
});
