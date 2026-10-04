import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { type MockVenue, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

/** Sectores de la arena de "Noche de sintetizadores" (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario). */
const SINTETIZADORES_SECTORS: Record<"stage" | "vip" | "preferencial" | "general" | "norte", AnnularSector> = {
  stage: STAGE_SECTOR,
  vip: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 166, startAngle: 34, endAngle: 146 },
  preferencial: { ...STADIUM_CENTER, innerRadius: 174, outerRadius: 236, startAngle: 34, endAngle: 146 },
  general: { ...STADIUM_CENTER, innerRadius: 244, outerRadius: 306, startAngle: 34, endAngle: 146 },
  norte: { ...STADIUM_CENTER, innerRadius: 314, outerRadius: 518, startAngle: 57, endAngle: 123 },
};

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const SINTETIZADORES_VENUE: MockVenue = {
  sectors: SINTETIZADORES_SECTORS,
  layout: {
    eventSlug: "noche-de-sintetizadores-lima",
    viewBox: "0 0 600 580",
    stage: STADIUM_STAGE,
    zones: [
      {
        id: "vip",
        ticketTypeId: "vip",
        kind: "general",
        capacity: 1500,
        path: getAnnularSectorPath(SINTETIZADORES_SECTORS.vip),
        labelPos: { x: 300, y: 188 },
      },
      {
        id: "preferencial",
        ticketTypeId: "preferencial",
        kind: "general",
        capacity: 4000,
        path: getAnnularSectorPath(SINTETIZADORES_SECTORS.preferencial),
        labelPos: { x: 300, y: 259 },
      },
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 12000,
        path: getAnnularSectorPath(SINTETIZADORES_SECTORS.general),
        labelPos: { x: 300, y: 329 },
      },
      {
        id: "norte",
        ticketTypeId: "norte",
        kind: "numbered",
        path: getAnnularSectorPath(SINTETIZADORES_SECTORS.norte),
        labelPos: { x: 300, y: 470 },
        ...generateArcSeatRows({
          zoneId: "norte",
          sector: SINTETIZADORES_SECTORS.norte,
          scale: 0.96,
          rowLabels: ["A", "B", "C", "D", "E", "F"],
          occupiedRatio: 0.3,
          accessibleSeats: ["norte-F-1", "norte-F-15"],
        }),
      },
    ],
  },
};
