import { describe, expect, it } from "vitest";
import { getEventBySlug } from "@/modules/events";
import { STADIUM_CENTER, VENUE_LAYOUTS_MOCK, VIVE_LATINO_SECTORS } from "../data/venueMaps.mock";
import type { NumberedVenueZone, PlanTransform, VenueMap } from "../types/seating.types";
import {
  type AnnularSector,
  doAnnularSectorsOverlap,
  getAnnularSectorBounds,
  getAnnularSectorPath,
  isPointInAnnularSector,
} from "../utils/annularSector";
import { getRowEdgeLabelPoints } from "../utils/arcSeatRows";
import { findBestAvailableSeats } from "../utils/bestSeats";
import { getZoneTones } from "../utils/zoneTone";
import { getVenueMapBySlug, getVenueMapForEvent, hasVenueMap } from "./seating.service";

/** Mapas con formas rectangulares (spec base). */
const RECT_MAP_SLUGS = ["noche-de-sintetizadores-lima", "la-casa-de-los-espejos", "risas-sin-filtro"];
const STADIUM_SLUG = "festival-vive-latino-lima";
const MAP_SLUGS = [...RECT_MAP_SLUGS, STADIUM_SLUG];

async function getMap(slug: string): Promise<VenueMap> {
  const map = await getVenueMapBySlug(slug);
  if (!map) throw new Error(`Sin mapa: ${slug}`);
  return map;
}

function viewBoxWidth(viewBox: string): number {
  return Number(viewBox.split(" ")[2]);
}

function viewBoxSize(viewBox: string): { width: number; height: number } {
  const [, , width, height] = viewBox.split(" ").map(Number);
  return { width, height };
}

/** Sector en coordenadas del plano: centro y radios × `scale` + (`x`, `y`). */
function toPlanSector(sector: AnnularSector, { scale, x, y }: PlanTransform): AnnularSector {
  return {
    ...sector,
    cx: sector.cx * scale + x,
    cy: sector.cy * scale + y,
    innerRadius: sector.innerRadius * scale,
    outerRadius: sector.outerRadius * scale,
  };
}

const SEAT_RADIUS = 12;
const ZONE_VIEWBOX_MARGIN = 4;
const ROW_LABEL_MARGIN = 12;

const RECT_PATH = /^M(\d+) (\d+) H(\d+) V(\d+) H\d+ Z$/;

/** Centro de un rectángulo `M x1 y1 H x2 V y2 H x1 Z`. */
function rectCenter(path: string): { x: number; y: number } {
  const match = RECT_PATH.exec(path);
  if (!match) throw new Error(`La forma no es un rectángulo: ${path}`);
  const [x1, y1, x2, y2] = match.slice(1).map(Number);
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

async function getNumberedZone(slug: string, zoneId: string): Promise<NumberedVenueZone> {
  const zone = (await getMap(slug)).zones.find((candidate) => candidate.id === zoneId);
  if (zone?.kind !== "numbered") throw new Error(`Sin zona numerada ${zoneId} en ${slug}`);
  return zone;
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
        await expect(getVenueMapForEvent(event)).rejects.toThrow(/palco/);
      } finally {
        VENUE_LAYOUTS_MOCK[0] = original;
      }
    });
  });

  describe("hasVenueMap", () => {
    it("es true solo para los 4 eventos con mapa", () => {
      for (const slug of MAP_SLUGS) expect(hasVenueMap(slug)).toBe(true);
      expect(hasVenueMap("clasico-del-pacifico")).toBe(false);
      expect(hasVenueMap("los-ecos-del-sur-arequipa")).toBe(false);
      expect(hasVenueMap("no-existe")).toBe(false);
    });

    it("coincide con los layouts mock", () => {
      expect(VENUE_LAYOUTS_MOCK.map((layout) => layout.eventSlug).sort()).toEqual([...MAP_SLUGS].sort());
    });
  });

  describe("getVenueMapBySlug del festival", () => {
    it("devuelve el estadio de la Costa Verde con 5 zonas en el orden de los tipos y sus datos del evento", async () => {
      const map = await getMap(STADIUM_SLUG);
      const event = await getEventBySlug(STADIUM_SLUG);

      expect(map.venue).toBe("Costa Verde");
      expect(map.zones.map((zone) => zone.ticketTypeId)).toEqual(event?.ticketTypes.map((type) => type.id));
      expect(map.zones.map((zone) => [zone.id, zone.name, zone.price, zone.status])).toEqual([
        ["campo-vip", "Campo VIP", 330, "available"],
        ["campo-general", "Campo General", 215, "low-stock"],
        ["occidente", "Tribuna Occidente", 180, "available"],
        ["oriente", "Tribuna Oriente", 155, "available"],
        ["norte", "Tribuna Norte", 120, "available"],
      ]);
    });

    it("Occidente y Oriente son numeradas con planTransform; Campo VIP, Campo General y Norte son de pie", async () => {
      const map = await getMap(STADIUM_SLUG);
      expect(map.zones.map((zone) => [zone.id, zone.kind])).toEqual([
        ["campo-vip", "general"],
        ["campo-general", "general"],
        ["occidente", "numbered"],
        ["oriente", "numbered"],
        ["norte", "general"],
      ]);
      for (const zone of map.zones) {
        if (zone.kind === "numbered") expect(zone.planTransform, zone.id).toBeDefined();
      }
    });

    it("las tribunas laterales tienen filas A–J con 4, 4, 5, 6, 7, 7, 8, 9, 9 y 10 butacas y seatViewBox 0 0 399 401", async () => {
      for (const zoneId of ["occidente", "oriente"]) {
        const zone = await getNumberedZone(STADIUM_SLUG, zoneId);
        expect(zone.rows.map((row) => row.label).join(""), zoneId).toBe("ABCDEFGHIJ");
        expect(zone.rows.map((row) => row.seats.length), zoneId).toEqual([4, 4, 5, 6, 7, 7, 8, 9, 9, 10]);
        expect(zone.seatViewBox, zoneId).toBe("0 0 399 401");
      }
    });

    it("el escenario lleva 7 luces y las tribunas laterales parten su nombre en 2 líneas", async () => {
      const map = await getMap(STADIUM_SLUG);
      expect(map.stage.lights).toHaveLength(7);
      expect(map.zones.filter((zone) => zone.wrapLabel).map((zone) => zone.id)).toEqual(["occidente", "oriente"]);
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

  describe.each(RECT_MAP_SLUGS)("invariantes del mapa rectangular %s", (slug) => {
    it("el labelPos del escenario y de cada zona es el centro de su forma", async () => {
      const map = await getMap(slug);
      expect(map.stage.labelPos, "stage").toEqual(rectCenter(map.stage.path));
      for (const zone of map.zones) expect(zone.labelPos, zone.id).toEqual(rectCenter(zone.path));
    });

    it("no usa los campos del mapa curvo (luces, etiquetas en 2 líneas ni planTransform)", async () => {
      const map = await getMap(slug);
      expect(map.stage.lights).toBeUndefined();
      for (const zone of map.zones) {
        expect(zone.wrapLabel, zone.id).toBeUndefined();
        if (zone.kind === "numbered") expect(zone.planTransform, zone.id).toBeUndefined();
      }
    });
  });

  describe("invariantes del mapa curvo festival-vive-latino-lima", () => {
    const stageAndZones = Object.entries(VIVE_LATINO_SECTORS);
    const zoneSectors = stageAndZones.filter(([id]) => id !== "stage");

    it("todos los sectores son concéntricos con el escenario", () => {
      for (const [id, sector] of stageAndZones) {
        expect({ cx: sector.cx, cy: sector.cy }, id).toEqual(STADIUM_CENTER);
      }
    });

    it("cada path es exactamente el de su sector", async () => {
      const map = await getMap(STADIUM_SLUG);
      expect(map.stage.path).toBe(getAnnularSectorPath(VIVE_LATINO_SECTORS.stage));
      expect(map.zones.map((zone) => zone.id)).toEqual(zoneSectors.map(([id]) => id));
      for (const zone of map.zones) {
        expect(zone.path, zone.id).toBe(getAnnularSectorPath(VIVE_LATINO_SECTORS[zone.id as keyof typeof VIVE_LATINO_SECTORS]));
      }
    });

    it("el escenario y cada zona quedan dentro del viewBox con ≥ 4 unidades de margen", async () => {
      const { width, height } = viewBoxSize((await getMap(STADIUM_SLUG)).viewBox);
      for (const [id, sector] of stageAndZones) {
        const bounds = getAnnularSectorBounds(sector);
        expect(bounds.minX, id).toBeGreaterThanOrEqual(ZONE_VIEWBOX_MARGIN);
        expect(bounds.minY, id).toBeGreaterThanOrEqual(ZONE_VIEWBOX_MARGIN);
        expect(bounds.maxX, id).toBeLessThanOrEqual(width - ZONE_VIEWBOX_MARGIN);
        expect(bounds.maxY, id).toBeLessThanOrEqual(height - ZONE_VIEWBOX_MARGIN);
      }
    });

    it("ningún par de sectores (escenario incluido) se solapa", () => {
      stageAndZones.forEach(([idA, a], index) => {
        for (const [idB, b] of stageAndZones.slice(index + 1)) {
          expect(doAnnularSectorsOverlap(a, b), `${idA} / ${idB}`).toBe(false);
        }
      });
    });

    it("el labelPos del escenario y de cada zona está dentro de su sector", async () => {
      const map = await getMap(STADIUM_SLUG);
      expect(isPointInAnnularSector(map.stage.labelPos, VIVE_LATINO_SECTORS.stage), "stage").toBe(true);
      for (const zone of map.zones) {
        const sector = VIVE_LATINO_SECTORS[zone.id as keyof typeof VIVE_LATINO_SECTORS];
        expect(isPointInAnnularSector(zone.labelPos, sector), zone.id).toBe(true);
      }
    });

    describe.each(["occidente", "oriente"] as const)("zona numerada en arco %s", (zoneId) => {
      async function getArcZone() {
        const zone = await getNumberedZone(STADIUM_SLUG, zoneId);
        if (!zone.planTransform) throw new Error(`Sin planTransform: ${zoneId}`);
        return { zone, planSector: toPlanSector(VIVE_LATINO_SECTORS[zoneId], zone.planTransform) };
      }

      it("todas las butacas están dentro del sector del plano, con su radio de 12 dentro de la banda", async () => {
        const { zone, planSector } = await getArcZone();
        for (const seat of zone.rows.flatMap((row) => row.seats)) {
          const radius = Math.hypot(seat.x - planSector.cx, seat.y - planSector.cy);
          expect(isPointInAnnularSector(seat, planSector), seat.id).toBe(true);
          expect(radius - SEAT_RADIUS, seat.id).toBeGreaterThanOrEqual(planSector.innerRadius);
          expect(radius + SEAT_RADIUS, seat.id).toBeLessThanOrEqual(planSector.outerRadius);
        }
      });

      it("las letras de fila quedan dentro del seatViewBox con ≥ 12 unidades de margen", async () => {
        const { zone } = await getArcZone();
        const { width, height } = viewBoxSize(zone.seatViewBox);
        for (const row of zone.rows) {
          const { start, end } = getRowEdgeLabelPoints(row);
          for (const point of [start, end]) {
            expect(point.x, row.label).toBeGreaterThanOrEqual(ROW_LABEL_MARGIN);
            expect(point.y, row.label).toBeGreaterThanOrEqual(ROW_LABEL_MARGIN);
            expect(point.x, row.label).toBeLessThanOrEqual(width - ROW_LABEL_MARGIN);
            expect(point.y, row.label).toBeLessThanOrEqual(height - ROW_LABEL_MARGIN);
          }
        }
      });

      it("tiene al menos 1 butaca disponible y 1 accesible", async () => {
        const { zone } = await getArcZone();
        const statuses = zone.rows.flatMap((row) => row.seats.map((seat) => seat.status));
        expect(statuses).toContain("available");
        expect(statuses).toContain("accessible");
      });
    });
  });

  describe("escenario y reparto de la ocupación", () => {
    it.each([
      ["noche-de-sintetizadores-lima", { x: 300, y: 38 }],
      ["la-casa-de-los-espejos", { x: 300, y: 40 }],
      ["risas-sin-filtro", { x: 300, y: 40 }],
    ])("%s: el texto del escenario está centrado en su forma", async (slug, labelPos) => {
      expect((await getMap(slug)).stage.labelPos).toEqual(labelPos);
    });

    it.each([
      ["noche-de-sintetizadores-lima", "norte"],
      ["la-casa-de-los-espejos", "platea"],
    ])("%s: ninguna fila de %s supera el 70 %% de asientos ocupados", async (slug, zoneId) => {
      const zone = await getNumberedZone(slug, zoneId);
      for (const row of zone.rows) {
        const occupied = row.seats.filter((seat) => seat.status === "occupied").length;
        expect(occupied / row.seats.length, `${zoneId}-${row.label}`).toBeLessThanOrEqual(0.7);
      }
    });

    it.each([
      ["noche-de-sintetizadores-lima", "norte"],
      ["la-casa-de-los-espejos", "platea"],
      ["risas-sin-filtro", "preferencial"],
    ])("%s: %s conserva al menos 1 asiento accesible", async (slug, zoneId) => {
      const zone = await getNumberedZone(slug, zoneId);
      const accessible = zone.rows.flatMap((row) => row.seats).filter((seat) => seat.status === "accessible");
      expect(accessible.length).toBeGreaterThanOrEqual(1);
    });

    it("Tribuna Norte: el mejor asiento disponible está en la fila A y no en un extremo", async () => {
      const zone = await getNumberedZone("noche-de-sintetizadores-lima", "norte");
      const [seatId] = findBestAvailableSeats(zone, 1) ?? [];
      const rowA = zone.rows[0];
      const seat = rowA.seats.find((candidate) => candidate.id === seatId);

      expect(rowA.label).toBe("A");
      expect(seat).toBeDefined();
      expect(seat?.number).not.toBe(1);
      expect(seat?.number).not.toBe(rowA.seats.length);
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

    it("festival-vive-latino-lima: Campo VIP tier-1, Campo General tier-2, Occidente tier-3, Oriente tier-4 y Norte tier-5", async () => {
      const map = await getMap(STADIUM_SLUG);
      expect(getZoneTones(map.zones)).toEqual({
        "campo-vip": "tier-1",
        "campo-general": "tier-2",
        occidente: "tier-3",
        oriente: "tier-4",
        norte: "tier-5",
      });
    });

    it("risas-sin-filtro: Mesa sold-out", async () => {
      const map = await getMap("risas-sin-filtro");
      expect(getZoneTones(map.zones).mesa).toBe("sold-out");
    });
  });
});
