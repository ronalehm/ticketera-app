// @vitest-environment node
import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { eventSeats, events } from "@/lib/db/schema/events";
import { venueSeats, venueSections } from "@/lib/db/schema/venues";
import { describeWithDb } from "@/lib/db/testDb";
import { inRolledBackTransaction } from "@/lib/db/testTransaction";
import { getEventBySlug } from "@/modules/events";
import { VIVE_LATINO_SECTORS } from "../data/festivalViveLatino.mock";
import { PITCH_STAGE, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "../data/stadium.mock";
import { VENUE_LAYOUTS_MOCK, VENUE_SECTORS_MOCK } from "../data/venueMaps.mock";
import { venueLayoutSchema } from "../schemas/seating.schema";
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

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

const STADIUM_SLUG = "festival-vive-latino-lima";
/** Eventos con mapa: uno por layout mock. */
const MAP_SLUGS = VENUE_LAYOUTS_MOCK.map((layout) => layout.eventSlug);
/**
 * Todos los mapas: ≤ 12 filas y plano de ≤ 622 de ancho, para que tras un "Acercar" (×1.5) a 375 px
 * el área de toque mida ≥ 24 px (decisión 3 de `seating-curved-venues`, ampliada por
 * `seating-all-venue-maps`). El festival mantiene además ≤ 10 butacas por fila y ≤ 400 de ancho.
 */
const STRICT_PLAN_SLUGS = [STADIUM_SLUG];
/** Eventos publicados que no llevan mapa (decisión 1 de `seating-all-venue-maps`). */
const NO_MAP_SLUGS = ["el-circo-de-las-estrellas", "aventura-en-el-bosque-magico"];
/** Mapas con geometría curva: todos los mock (cada recinto exporta sus `sectors`). */
const CURVED_SLUGS = Object.keys(VENUE_SECTORS_MOCK);

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

const MAX_SEATS_PER_ROW = 10;
const MAX_ROWS = 12;
const MAX_PLAN_WIDTH = 622;
const MAX_STRICT_PLAN_WIDTH = 400;
const SEAT_RADIUS = 12;
const ZONE_VIEWBOX_MARGIN = 4;
const ROW_LABEL_MARGIN = 12;

async function getNumberedZone(slug: string, zoneId: string): Promise<NumberedVenueZone> {
  const zone = (await getMap(slug)).zones.find((candidate) => candidate.id === zoneId);
  if (zone?.kind !== "numbered") throw new Error(`Sin zona numerada ${zoneId} en ${slug}`);
  return zone;
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
      expect(await getVenueMapBySlug("el-circo-de-las-estrellas")).toBeNull();
      expect(await getVenueMapBySlug("no-existe")).toBeNull();
      expect(await getVenueMapBySlug("feria-familiar-de-verano")).toBeNull();
    });
  });

  describeWithDb("getVenueMapBySlug con butacas retiradas", () => {
    const slug = "copa-del-norte-trujillo";
    const seatIds = async () =>
      (await getNumberedZone(slug, "occidente")).rows.flatMap((row) => row.seats.map((seat) => seat.id));

    it("no pinta las butacas retiradas", async () => {
      await inRolledBackTransaction(async (tx) => {
        expect(await seatIds()).toHaveLength(39);
        expect(await seatIds()).toContain("occidente-A-2");

        const seatA2 = tx
          .select({ id: venueSeats.id })
          .from(venueSeats)
          .innerJoin(venueSections, eq(venueSections.id, venueSeats.sectionId))
          .where(and(eq(venueSections.slug, "occidente"), eq(venueSeats.rowLabel, "A"), eq(venueSeats.number, 2)));
        const copa = tx.select({ id: events.id }).from(events).where(eq(events.slug, slug));
        const retired = await tx
          .update(eventSeats)
          .set({ retiredAt: new Date() })
          .where(and(inArray(eventSeats.eventId, copa), inArray(eventSeats.venueSeatId, seatA2)))
          .returning({ id: eventSeats.id });

        expect(retired).toHaveLength(1);
        const ids = await seatIds();
        expect(ids).toHaveLength(38);
        expect(ids).not.toContain("occidente-A-2");
      });
    });
  });

  describeWithDb("getVenueMapForEvent", () => {
    async function getEvent(slug: string) {
      const event = await getEventBySlug(slug);
      if (!event) throw new Error(`Sin evento: ${slug}`);
      return event;
    }

    it.each(MAP_SLUGS)("%s: da lo mismo que getVenueMapBySlug", async (slug) => {
      expect(await getVenueMapForEvent(await getEvent(slug))).toEqual(await getVenueMapBySlug(slug));
    });

    it("devuelve null para un evento sin mapa", async () => {
      expect(await getVenueMapForEvent(await getEvent("el-circo-de-las-estrellas"))).toBeNull();
    });
  });

  describe("hasVenueMap", () => {
    it("es true para cada evento con layout y false para los que no lo tienen", () => {
      for (const slug of MAP_SLUGS) expect(hasVenueMap(slug), slug).toBe(true);
      for (const slug of NO_MAP_SLUGS) expect(hasVenueMap(slug), slug).toBe(false);
      expect(hasVenueMap("no-existe")).toBe(false);
    });

    it("cada layout es de un evento distinto", () => {
      expect(new Set(MAP_SLUGS).size).toBe(MAP_SLUGS.length);
    });
  });

  describeWithDb("getVenueMapBySlug del festival", () => {
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

    it("tiene ≤ 12 filas por zona y anchos de viewBox dentro del límite de su mapa", async () => {
      const map = await getMap(slug);
      const strictPlan = STRICT_PLAN_SLUGS.includes(slug);
      expect(viewBoxWidth(map.viewBox)).toBeLessThanOrEqual(600);
      for (const zone of map.zones) {
        if (zone.kind !== "numbered") continue;
        expect(zone.rows.length, zone.id).toBeLessThanOrEqual(MAX_ROWS);
        expect(viewBoxWidth(zone.seatViewBox), zone.id).toBeLessThanOrEqual(MAX_PLAN_WIDTH);
        if (!strictPlan) continue;
        for (const row of zone.rows) {
          expect(row.seats.length, `${zone.id}-${row.label}`).toBeLessThanOrEqual(MAX_SEATS_PER_ROW);
        }
        expect(viewBoxWidth(zone.seatViewBox), zone.id).toBeLessThanOrEqual(MAX_STRICT_PLAN_WIDTH);
      }
    });
  });

  describe("VENUE_SECTORS_MOCK", () => {
    it("tiene un sector por cada mapa mock, incluido el festival", () => {
      expect([...CURVED_SLUGS].sort()).toEqual([...MAP_SLUGS].sort());
      expect(VENUE_SECTORS_MOCK[STADIUM_SLUG]).toBe(VIVE_LATINO_SECTORS);
    });
  });

  describe.each(CURVED_SLUGS)("geometría de los sectores de %s", (slug) => {
    const stageAndZones = Object.entries(VENUE_SECTORS_MOCK[slug]);

    it("todos los sectores son concéntricos con el escenario", () => {
      for (const [id, sector] of stageAndZones) {
        expect({ cx: sector.cx, cy: sector.cy }, id).toEqual(STADIUM_CENTER);
      }
    });

    it("el sector del escenario es el compartido", () => {
      expect(VENUE_SECTORS_MOCK[slug].stage).toEqual(STAGE_SECTOR);
    });

    it("ningún par de sectores (escenario incluido) se solapa", () => {
      stageAndZones.forEach(([idA, a], index) => {
        for (const [idB, b] of stageAndZones.slice(index + 1)) {
          expect(doAnnularSectorsOverlap(a, b), `${idA} / ${idB}`).toBe(false);
        }
      });
    });
  });

  describeWithDb.each(CURVED_SLUGS)("invariantes del mapa curvo %s", (slug) => {
    const sectors = VENUE_SECTORS_MOCK[slug];
    const stageAndZones = Object.entries(sectors);
    const zoneIds = stageAndZones.map(([id]) => id).filter((id) => id !== "stage");

    /** Zonas numeradas del mapa con su sector en coordenadas del plano. */
    async function getArcZones() {
      const zones = (await getMap(slug)).zones.filter((zone) => zone.kind === "numbered");
      return zones.map((zone) => {
        if (!zone.planTransform) throw new Error(`Sin planTransform: ${zone.id}`);
        return { zone, planSector: toPlanSector(sectors[zone.id], zone.planTransform) };
      });
    }

    it("el escenario es el compartido, con sus 7 luces dentro de su sector", async () => {
      const { stage } = await getMap(slug);
      const event = await getEventBySlug(slug);
      expect(stage).toEqual(event?.category === "deportes" ? PITCH_STAGE : STADIUM_STAGE);
      expect(stage.lights).toHaveLength(7);
      for (const light of stage.lights ?? []) expect(isPointInAnnularSector(light, sectors.stage)).toBe(true);
    });

    it("cada path es exactamente el de su sector", async () => {
      const map = await getMap(slug);
      expect(map.stage.path).toBe(getAnnularSectorPath(sectors.stage));
      expect(map.zones.map((zone) => zone.id)).toEqual(zoneIds);
      for (const zone of map.zones) expect(zone.path, zone.id).toBe(getAnnularSectorPath(sectors[zone.id]));
    });

    it("el escenario y cada zona quedan dentro del viewBox con ≥ 4 unidades de margen", async () => {
      const { width, height } = viewBoxSize((await getMap(slug)).viewBox);
      for (const [id, sector] of stageAndZones) {
        const bounds = getAnnularSectorBounds(sector);
        expect(bounds.minX, id).toBeGreaterThanOrEqual(ZONE_VIEWBOX_MARGIN);
        expect(bounds.minY, id).toBeGreaterThanOrEqual(ZONE_VIEWBOX_MARGIN);
        expect(bounds.maxX, id).toBeLessThanOrEqual(width - ZONE_VIEWBOX_MARGIN);
        expect(bounds.maxY, id).toBeLessThanOrEqual(height - ZONE_VIEWBOX_MARGIN);
      }
    });

    it("el labelPos del escenario y de cada zona está dentro de su sector", async () => {
      const map = await getMap(slug);
      expect(isPointInAnnularSector(map.stage.labelPos, sectors.stage), "stage").toBe(true);
      for (const zone of map.zones) {
        expect(isPointInAnnularSector(zone.labelPos, sectors[zone.id]), zone.id).toBe(true);
      }
    });

    it("toda zona numerada tiene planTransform", async () => {
      for (const zone of (await getMap(slug)).zones) {
        if (zone.kind === "numbered") expect(zone.planTransform, zone.id).toBeDefined();
      }
    });

    it("todas las butacas están dentro del sector del plano, con su radio de 12 dentro de la banda", async () => {
      for (const { zone, planSector } of await getArcZones()) {
        for (const seat of zone.rows.flatMap((row) => row.seats)) {
          const radius = Math.hypot(seat.x - planSector.cx, seat.y - planSector.cy);
          expect(isPointInAnnularSector(seat, planSector), seat.id).toBe(true);
          expect(radius - SEAT_RADIUS, seat.id).toBeGreaterThanOrEqual(planSector.innerRadius);
          expect(radius + SEAT_RADIUS, seat.id).toBeLessThanOrEqual(planSector.outerRadius);
        }
      }
    });

    it("las letras de fila quedan dentro del seatViewBox con ≥ 12 unidades de margen", async () => {
      for (const { zone } of await getArcZones()) {
        const { width, height } = viewBoxSize(zone.seatViewBox);
        for (const row of zone.rows) {
          const { start, end } = getRowEdgeLabelPoints(row);
          const label = `${zone.id}-${row.label}`;
          for (const point of [start, end]) {
            expect(point.x, label).toBeGreaterThanOrEqual(ROW_LABEL_MARGIN);
            expect(point.y, label).toBeGreaterThanOrEqual(ROW_LABEL_MARGIN);
            expect(point.x, label).toBeLessThanOrEqual(width - ROW_LABEL_MARGIN);
            expect(point.y, label).toBeLessThanOrEqual(height - ROW_LABEL_MARGIN);
          }
        }
      }
    });

    it("cada zona numerada no agotada tiene al menos 1 butaca disponible y 1 accesible", async () => {
      for (const { zone } of await getArcZones()) {
        if (zone.status === "sold-out") continue;
        const statuses = zone.rows.flatMap((row) => row.seats.map((seat) => seat.status));
        expect(statuses, zone.id).toContain("available");
        expect(statuses, zone.id).toContain("accessible");
      }
    });
  });

  describeWithDb("reparto de la ocupación", () => {
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
