// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { getEventBySlug } from "@/modules/events";
import { venueLayoutSchema } from "../schemas/seating.schema";
import { getVenueMapBySlug } from "../services/seating.service";
import { getAnnularSectorPath } from "../utils/annularSector";
import { SOL_DE_VERANO_VENUE } from "./festivalSolDeVerano.mock";
import { STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

const SLUG = "festival-sol-de-verano";
const SWEEP = { startAngle: 40, endAngle: 140 };

const layout = venueLayoutSchema.parse(SOL_DE_VERANO_VENUE.layout);

describe("festivalSolDeVerano.mock (festival con tres zonas de pie)", () => {
  it("tiene viewBox 0 0 600 518 y el escenario compartido del estadio", () => {
    expect(layout.eventSlug).toBe(SLUG);
    expect(layout.viewBox).toBe("0 0 600 518");
    expect(layout.stage).toEqual(STADIUM_STAGE);
  });

  it("tiene las zonas general, preferencial y vip en el orden de los ticketTypes, todas de pie con su capacidad", () => {
    expect(
      layout.zones.map((zone) => [zone.id, zone.ticketTypeId, zone.kind, zone.kind === "general" ? zone.capacity : null]),
    ).toEqual([
      ["general", "general", "general", 3000],
      ["preferencial", "preferencial", "general", 1000],
      ["vip", "vip", "general", 300],
    ]);
  });

  it("tiene los sectores del requisito 7: Preferencial junto al escenario, General detrás y VIP al fondo (56°…124°), con su path", () => {
    expect(SOL_DE_VERANO_VENUE.sectors).toEqual({
      stage: STAGE_SECTOR,
      general: { ...STADIUM_CENTER, innerRadius: 226, outerRadius: 336, ...SWEEP },
      preferencial: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 218, ...SWEEP },
      vip: { ...STADIUM_CENTER, innerRadius: 344, outerRadius: 456, startAngle: 56, endAngle: 124 },
    });
    expect(Object.keys(SOL_DE_VERANO_VENUE.sectors)).toEqual(["stage", "general", "preferencial", "vip"]);
    for (const zone of layout.zones) {
      expect(zone.path, zone.id).toBe(getAnnularSectorPath(SOL_DE_VERANO_VENUE.sectors[zone.id]));
    }
  });

  it("pone cada labelPos en el eje de su banda", () => {
    expect(layout.zones.map((zone) => [zone.id, zone.labelPos])).toEqual([
      ["general", { x: 300, y: 329 }],
      ["preferencial", { x: 300, y: 204 }],
      ["vip", { x: 300, y: 450 }],
    ]);
  });
});

describeWithDb("festivalSolDeVerano.mock en la BD", () => {
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
});
