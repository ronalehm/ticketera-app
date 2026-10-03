// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { getEventBySlug } from "@/modules/events";
import { VENUE_LAYOUTS_MOCK } from "../data/venueMaps.mock";
import { venueLayoutSchema } from "../schemas/seating.schema";
import type { VenueMap } from "../types/seating.types";
import { getZoneTones } from "../utils/zoneTone";
import { getVenueMapBySlug, hasVenueMap } from "./seating.service";

const MAP_SLUGS = ["noche-de-sintetizadores-lima", "la-casa-de-los-espejos", "risas-sin-filtro"];

async function getMap(slug: string): Promise<VenueMap> {
  const map = await getVenueMapBySlug(slug);
  if (!map) throw new Error(`Sin mapa: ${slug}`);
  return map;
}

function viewBoxWidth(viewBox: string): number {
  return Number(viewBox.split(" ")[2]);
}

describe("seating.service", () => {
  describeWithDb("getVenueMapBySlug", () => {
    it.each(MAP_SLUGS)("%s: devuelve el mismo mapa que construía el mock", async (slug) => {
      const map = await getMap(slug);
      const event = await getEventBySlug(slug);
      const mockLayout = VENUE_LAYOUTS_MOCK.find((layout) => layout.eventSlug === slug);
      const { zones, ...layout } = venueLayoutSchema.parse(mockLayout);

      expect(map).toEqual({
        ...layout,
        venue: event?.venue,
        zones: zones.map((zone) => {
          const ticketType = event?.ticketTypes.find((type) => type.id === zone.ticketTypeId);
          return { ...zone, name: ticketType?.name, price: ticketType?.price, status: ticketType?.status };
        }),
      });
    });

    it("devuelve el mapa del Estadio Nacional con sus 4 zonas completadas desde el evento", async () => {
      const map = await getMap("noche-de-sintetizadores-lima");
      const event = await getEventBySlug("noche-de-sintetizadores-lima");

      expect(map.eventSlug).toBe("noche-de-sintetizadores-lima");
      expect(map.venue).toBe("Estadio Nacional");
      expect(map.stage.label).toBe("ESCENARIO");
      expect(map.zones.map((zone) => [zone.id, zone.kind])).toEqual([
        ["vip", "general"],
        ["preferencial", "general"],
        ["general", "general"],
        ["norte", "numbered"],
      ]);
      for (const zone of map.zones) {
        const ticketType = event?.ticketTypes.find((type) => type.id === zone.ticketTypeId);
        expect({ name: zone.name, price: zone.price, status: zone.status }).toEqual({
          name: ticketType?.name,
          price: ticketType?.price,
          status: ticketType?.status,
        });
      }
    });

    it("devuelve los mapas del teatro y del stand-up con sus zonas numeradas", async () => {
      const theater = await getMap("la-casa-de-los-espejos");
      const standUp = await getMap("risas-sin-filtro");

      const numberedIds = (map: VenueMap) => map.zones.filter((zone) => zone.kind === "numbered").map((zone) => zone.id);
      expect(theater.venue).toBe("Gran Teatro Nacional");
      expect(numberedIds(theater)).toEqual(["platea", "mezanine"]);
      expect(standUp.venue).toBe("Arena 1");
      expect(numberedIds(standUp)).toEqual(["mesa", "preferencial"]);
    });

    it("devuelve null para un evento sin mapa, un slug inexistente o un borrador", async () => {
      expect(await getVenueMapBySlug("clasico-del-pacifico")).toBeNull();
      expect(await getVenueMapBySlug("no-existe")).toBeNull();
      expect(await getVenueMapBySlug("feria-familiar-de-verano")).toBeNull();
    });
  });

  describe("hasVenueMap", () => {
    it("es true solo para los 3 eventos con mapa", () => {
      for (const slug of MAP_SLUGS) expect(hasVenueMap(slug)).toBe(true);
      expect(hasVenueMap("clasico-del-pacifico")).toBe(false);
      expect(hasVenueMap("los-ecos-del-sur-arequipa")).toBe(false);
      expect(hasVenueMap("no-existe")).toBe(false);
    });

    it("coincide con los layouts mock", () => {
      expect(VENUE_LAYOUTS_MOCK.map((layout) => layout.eventSlug).sort()).toEqual([...MAP_SLUGS].sort());
    });
  });

  describeWithDb.each(MAP_SLUGS)("invariantes del mapa %s", (slug) => {
    it("sus zonas corresponden 1:1 a los ticketTypes del evento", async () => {
      const map = await getMap(slug);
      const event = await getEventBySlug(slug);
      const zoneTypeIds = map.zones.map((zone) => zone.ticketTypeId).sort();
      expect(zoneTypeIds).toEqual(event?.ticketTypes.map((type) => type.id).sort());
    });

    it("las zonas numeradas agotadas no tienen asientos elegibles y las demás tienen al menos 1 disponible", async () => {
      const map = await getMap(slug);
      for (const zone of map.zones) {
        if (zone.kind !== "numbered") continue;
        const statuses = zone.rows.flatMap((row) => row.seats.map((seat) => seat.status));
        if (zone.status === "sold-out") {
          expect(statuses.filter((status) => status !== "occupied"), zone.id).toEqual([]);
        } else {
          expect(statuses.filter((status) => status === "available").length, zone.id).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it("tiene ≤ 10 asientos por fila, ≤ 12 filas y anchos de viewBox dentro del límite", async () => {
      const map = await getMap(slug);
      expect(viewBoxWidth(map.viewBox)).toBeLessThanOrEqual(600);
      for (const zone of map.zones) {
        if (zone.kind !== "numbered") continue;
        expect(zone.rows.length, zone.id).toBeLessThanOrEqual(12);
        for (const row of zone.rows) expect(row.seats.length, `${zone.id}-${row.label}`).toBeLessThanOrEqual(10);
        expect(viewBoxWidth(zone.seatViewBox), zone.id).toBeLessThanOrEqual(400);
      }
    });
  });

  describeWithDb("tonos con los mapas reales", () => {
    it("noche-de-sintetizadores-lima: VIP tier-1, Preferencial tier-2, Tribuna Norte tier-3 y General tier-4", async () => {
      const map = await getMap("noche-de-sintetizadores-lima");
      expect(getZoneTones(map.zones)).toEqual({
        vip: "tier-1",
        preferencial: "tier-2",
        norte: "tier-3",
        general: "tier-4",
      });
    });

    it("risas-sin-filtro: Mesa sold-out", async () => {
      const map = await getMap("risas-sin-filtro");
      expect(getZoneTones(map.zones).mesa).toBe("sold-out");
    });
  });
});
