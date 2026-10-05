import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { type MockVenue, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

/** Abanico de 100° (40°…140°) frente al escenario: VIP delante y General detrás comparten el barrido. */
const SWEEP = { startAngle: 40, endAngle: 140 };

/**
 * Sectores de "Arena y Mar Fest" en Playa Colán (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario):
 * el VIP ("zona techada frente al escenario") es la banda delantera y General la de detrás.
 */
const ARENA_Y_MAR_SECTORS: Record<"stage" | "general" | "vip", AnnularSector> = {
  stage: STAGE_SECTOR,
  general: { ...STADIUM_CENTER, innerRadius: 226, outerRadius: 336, ...SWEEP },
  vip: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 218, ...SWEEP },
};

// Festival de playa: las dos zonas son de pie. Nombre, precio y estado salen del `ticketType` del evento (service).
export const ARENA_Y_MAR_VENUE: MockVenue = {
  sectors: ARENA_Y_MAR_SECTORS,
  layout: {
    eventSlug: "festival-arena-y-mar-piura",
    viewBox: "0 0 600 398",
    stage: STADIUM_STAGE,
    zones: [
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 2000,
        path: getAnnularSectorPath(ARENA_Y_MAR_SECTORS.general),
        labelPos: { x: 300, y: 329 },
      },
      {
        id: "vip",
        ticketTypeId: "vip",
        kind: "general",
        capacity: 400,
        path: getAnnularSectorPath(ARENA_Y_MAR_SECTORS.vip),
        labelPos: { x: 300, y: 203 },
      },
    ],
  },
};
