import { describe, expect, it } from "vitest";
import { getEventBySlug } from "@/modules/events";
import { VENUE_LAYOUTS_MOCK } from "../data/venueMaps.mock";
import type { VenueMap } from "../types/seating.types";
import { getZoneTones } from "../utils/zoneTone";
import { getVenueMapBySlug, getVenueMapForEvent, hasVenueMap } from "./seating.service";

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
  describe("getVenueMapBySlug", () => {
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

    it("devuelve null para un evento sin mapa o un slug inexistente", async () => {
      expect(await getVenueMapBySlug("clasico-del-pacifico")).toBeNull();
      expect(await getVenueMapBySlug("no-existe")).toBeNull();
    });

    it("devuelve null si hay layout pero no existe el evento", async () => {
      VENUE_LAYOUTS_MOCK.push({ ...VENUE_LAYOUTS_MOCK[0], eventSlug: "evento-borrado" });
      try {
        expect(await getVenueMapBySlug("evento-borrado")).toBeNull();
      } finally {
        VENUE_LAYOUTS_MOCK.pop();
      }
    });

    it("lanza un error si una zona apunta a un tipo de entrada inexistente", async () => {
      const original = VENUE_LAYOUTS_MOCK[0];
      VENUE_LAYOUTS_MOCK[0] = {
        ...original,
        zones: original.zones.map((zone) => (zone.id === "vip" ? { ...zone, ticketTypeId: "palco" } : zone)),
      };
      try {
        await expect(getVenueMapBySlug(original.eventSlug)).rejects.toThrow(/palco/);
      } finally {
        VENUE_LAYOUTS_MOCK[0] = original;
      }
    });

    it("lanza un error si el layout no cumple el schema", async () => {
      const original = VENUE_LAYOUTS_MOCK[0];
      VENUE_LAYOUTS_MOCK[0] = { ...original, viewBox: "600 560" };
      try {
        await expect(getVenueMapBySlug(original.eventSlug)).rejects.toThrow();
      } finally {
        VENUE_LAYOUTS_MOCK[0] = original;
      }
    });
  });

  describe("getVenueMapForEvent", () => {
    async function getEvent(slug: string) {
      const event = await getEventBySlug(slug);
      if (!event) throw new Error(`Sin evento: ${slug}`);
      return event;
    }

    it.each(MAP_SLUGS)("%s: da lo mismo que getVenueMapBySlug", async (slug) => {
      expect(await getVenueMapForEvent(await getEvent(slug))).toEqual(await getVenueMapBySlug(slug));
    });

    it("devuelve null para un evento sin mapa", async () => {
      expect(await getVenueMapForEvent(await getEvent("clasico-del-pacifico"))).toBeNull();
    });

    it("lanza un error si una zona apunta a un tipo de entrada inexistente", async () => {
      const original = VENUE_LAYOUTS_MOCK[0];
      const event = await getEvent(original.eventSlug);
      VENUE_LAYOUTS_MOCK[0] = {
        ...original,
        zones: original.zones.map((zone) => (zone.id === "vip" ? { ...zone, ticketTypeId: "palco" } : zone)),
      };
      try {
        await expect(getVenueMapForEvent(event)).rejects.toThrow(Error);
        await expect(getVenueMapForEvent(event)).rejects.toThrow(/palco/);
      } finally {
        VENUE_LAYOUTS_MOCK[0] = original;
      }
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

  describe.each(MAP_SLUGS)("invariantes del mapa %s", (slug) => {
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

  describe("tonos con los mapas reales", () => {
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
