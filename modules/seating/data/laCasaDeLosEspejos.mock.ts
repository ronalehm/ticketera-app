import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { type MockVenue, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

/** Sectores del teatro de "La casa de los espejos": abanico de 84° frente al escenario (decisión 2 de `seating-curved-venues`). */
export const ESPEJOS_SECTORS: Record<"stage" | "platea" | "mezanine", AnnularSector> = {
  stage: STAGE_SECTOR,
  platea: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 281, startAngle: 48, endAngle: 132 },
  mezanine: { ...STADIUM_CENTER, innerRadius: 289, outerRadius: 422, startAngle: 48, endAngle: 132 },
};

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const ESPEJOS_VENUE: MockVenue = {
  sectors: ESPEJOS_SECTORS,
  layout: {
    eventSlug: "la-casa-de-los-espejos",
    viewBox: "0 0 600 484",
    stage: STADIUM_STAGE,
    zones: [
      {
        id: "platea",
        ticketTypeId: "platea",
        kind: "numbered",
        path: getAnnularSectorPath(ESPEJOS_SECTORS.platea),
        labelPos: { x: 300, y: 245 },
        ...generateArcSeatRows({
          zoneId: "platea",
          sector: ESPEJOS_SECTORS.platea,
          scale: 1.455,
          rowLabels: ["A", "B", "C", "D", "E", "F", "G", "H"],
          occupiedRatio: 0.4,
          accessibleSeats: ["platea-H-1", "platea-H-15"],
        }),
      },
      {
        id: "mezanine",
        ticketTypeId: "mezanine",
        kind: "numbered",
        path: getAnnularSectorPath(ESPEJOS_SECTORS.mezanine),
        labelPos: { x: 300, y: 409 },
        ...generateArcSeatRows({
          zoneId: "mezanine",
          sector: ESPEJOS_SECTORS.mezanine,
          scale: 0.995,
          rowLabels: ["A", "B", "C", "D"],
          occupiedRatio: 0.85,
          accessibleSeats: ["mezanine-D-16"],
        }),
      },
    ],
  },
};
