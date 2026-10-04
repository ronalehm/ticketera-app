import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { type MockVenue, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

/** Sectores de la arena de "Noche de sintetizadores" (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario). */
const SINTETIZADORES_SECTORS: Record<"stage" | "vip" | "preferencial" | "general" | "norte", AnnularSector> = {
  stage: STAGE_SECTOR,
  vip: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 214, startAngle: 46, endAngle: 134 },
  preferencial: { ...STADIUM_CENTER, innerRadius: 222, outerRadius: 320, startAngle: 46, endAngle: 134 },
  general: { ...STADIUM_CENTER, innerRadius: 328, outerRadius: 422, startAngle: 46, endAngle: 134 },
  norte: { ...STADIUM_CENTER, innerRadius: 430, outerRadius: 578, startAngle: 70, endAngle: 110 },
};

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const SINTETIZADORES_VENUE: MockVenue = {
  sectors: SINTETIZADORES_SECTORS,
  layout: {
    eventSlug: "noche-de-sintetizadores-lima",
    viewBox: "0 0 600 640",
    stage: STADIUM_STAGE,
    zones: [
      {
        id: "vip",
        ticketTypeId: "vip",
        kind: "general",
        capacity: 1500,
        path: getAnnularSectorPath(SINTETIZADORES_SECTORS.vip),
        labelPos: { x: 300, y: 204 },
      },
      {
        id: "preferencial",
        ticketTypeId: "preferencial",
        kind: "general",
        capacity: 4000,
        path: getAnnularSectorPath(SINTETIZADORES_SECTORS.preferencial),
        labelPos: { x: 300, y: 318 },
      },
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 12000,
        path: getAnnularSectorPath(SINTETIZADORES_SECTORS.general),
        labelPos: { x: 300, y: 424 },
      },
      {
        id: "norte",
        ticketTypeId: "norte",
        kind: "numbered",
        path: getAnnularSectorPath(SINTETIZADORES_SECTORS.norte),
        labelPos: { x: 300, y: 558 },
        ...generateArcSeatRows({
          zoneId: "norte",
          sector: SINTETIZADORES_SECTORS.norte,
          scale: 1.305,
          rowLabels: ["A", "B", "C", "D", "E", "F"],
          occupiedRatio: 0.3,
          accessibleSeats: ["norte-F-1", "norte-F-15"],
        }),
      },
    ],
  },
};
