import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { type MockVenue, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

const STADIUM_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

/** Sectores del estadio de "Festival Vive Latino Lima" (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario). */
export const VIVE_LATINO_SECTORS: Record<
  "stage" | "campo-vip" | "campo-general" | "occidente" | "oriente" | "norte",
  AnnularSector
> = {
  stage: STAGE_SECTOR,
  "campo-vip": { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 172, startAngle: 34, endAngle: 146 },
  "campo-general": { ...STADIUM_CENTER, innerRadius: 180, outerRadius: 278, startAngle: 34, endAngle: 146 },
  occidente: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 268, startAngle: 150, endAngle: 190 },
  oriente: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 268, startAngle: -10, endAngle: 30 },
  norte: { ...STADIUM_CENTER, innerRadius: 286, outerRadius: 350, startAngle: 33, endAngle: 147 },
};

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const VIVE_LATINO_VENUE: MockVenue = {
  sectors: VIVE_LATINO_SECTORS,
  layout: {
    eventSlug: "festival-vive-latino-lima",
    viewBox: "0 0 600 412",
    stage: STADIUM_STAGE,
    zones: [
      {
        id: "campo-vip",
        ticketTypeId: "campo-vip",
        kind: "general",
        capacity: 2000,
        path: getAnnularSectorPath(VIVE_LATINO_SECTORS["campo-vip"]),
        labelPos: { x: 300, y: 182 },
      },
      {
        id: "campo-general",
        ticketTypeId: "campo-general",
        kind: "general",
        capacity: 8000,
        path: getAnnularSectorPath(VIVE_LATINO_SECTORS["campo-general"]),
        labelPos: { x: 300, y: 287 },
      },
      {
        id: "occidente",
        ticketTypeId: "occidente",
        kind: "numbered",
        path: getAnnularSectorPath(VIVE_LATINO_SECTORS.occidente),
        labelPos: { x: 116, y: 84 },
        wrapLabel: true,
        ...generateArcSeatRows({
          zoneId: "occidente",
          sector: VIVE_LATINO_SECTORS.occidente,
          scale: 1.95,
          rowLabels: STADIUM_ROWS,
          occupiedRatio: 0.35,
          accessibleSeats: ["occidente-J-1", "occidente-J-10"],
        }),
      },
      {
        id: "oriente",
        ticketTypeId: "oriente",
        kind: "numbered",
        path: getAnnularSectorPath(VIVE_LATINO_SECTORS.oriente),
        labelPos: { x: 484, y: 84 },
        wrapLabel: true,
        ...generateArcSeatRows({
          zoneId: "oriente",
          sector: VIVE_LATINO_SECTORS.oriente,
          scale: 1.95,
          rowLabels: STADIUM_ROWS,
          occupiedRatio: 0.45,
          accessibleSeats: ["oriente-J-1", "oriente-J-10"],
        }),
      },
      {
        id: "norte",
        ticketTypeId: "norte",
        kind: "general",
        capacity: 6000,
        path: getAnnularSectorPath(VIVE_LATINO_SECTORS.norte),
        labelPos: { x: 300, y: 372 },
      },
    ],
  },
};
