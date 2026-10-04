import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { type MockVenue, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

/** Media luna de 98° (41°…139°) frente al escenario: las tres zonas comparten el barrido (decisión 2 de `seating-curved-venues`). */
const SWEEP = { startAngle: 41, endAngle: 139 };

/** Sectores de "Risas sin filtro" (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario). */
const RISAS_SECTORS: Record<"stage" | "mesa" | "preferencial" | "general", AnnularSector> = {
  stage: STAGE_SECTOR,
  mesa: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 186, ...SWEEP },
  preferencial: { ...STADIUM_CENTER, innerRadius: 194, outerRadius: 304, ...SWEEP },
  general: { ...STADIUM_CENTER, innerRadius: 312, outerRadius: 390, ...SWEEP },
};

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const RISAS_VENUE: MockVenue = {
  sectors: RISAS_SECTORS,
  layout: {
    eventSlug: "risas-sin-filtro",
    viewBox: "0 0 600 450",
    stage: STADIUM_STAGE,
    zones: [
      {
        id: "mesa",
        ticketTypeId: "mesa",
        kind: "numbered",
        path: getAnnularSectorPath(RISAS_SECTORS.mesa),
        labelPos: { x: 300, y: 198 },
        ...generateArcSeatRows({
          zoneId: "mesa",
          sector: RISAS_SECTORS.mesa,
          scale: 1.195,
          rowLabels: ["A", "B", "C"],
          occupiedRatio: 1,
        }),
      },
      {
        id: "preferencial",
        ticketTypeId: "preferencial",
        kind: "numbered",
        path: getAnnularSectorPath(RISAS_SECTORS.preferencial),
        labelPos: { x: 300, y: 303 },
        ...generateArcSeatRows({
          zoneId: "preferencial",
          sector: RISAS_SECTORS.preferencial,
          scale: 1.205,
          rowLabels: ["A", "B", "C", "D"],
          occupiedRatio: 0.8,
          accessibleSeats: ["preferencial-D-3", "preferencial-D-12"],
        }),
      },
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 600,
        path: getAnnularSectorPath(RISAS_SECTORS.general),
        labelPos: { x: 300, y: 405 },
      },
    ],
  },
};
