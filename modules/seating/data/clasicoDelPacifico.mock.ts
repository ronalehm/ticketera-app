import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { type MockVenue, PITCH_STAGE, STADIUM_CENTER, STAGE_SECTOR } from "./stadium.mock";

/** Banda de las tribunas laterales de la herradura, como en Copa del Norte (decisión 5 de `seating-all-venue-maps`). */
const SIDE_BAND = { innerRadius: 102, outerRadius: 296 };

/**
 * Sectores de "Clásico del Pacífico" en el Estadio Nacional (coordenadas del mapa, ángulos en grados con 0° = +x y
 * sentido horario): la cancha arriba, Oriente a la derecha, Occidente a la izquierda y el fondo partido en Palco,
 * junto a la cancha, y Popular ("Tribuna norte y sur") detrás.
 */
const CLASICO_SECTORS: Record<"stage" | "popular" | "oriente" | "occidente" | "palco", AnnularSector> = {
  stage: STAGE_SECTOR,
  popular: { ...STADIUM_CENTER, innerRadius: 228, outerRadius: 330, startAngle: 57, endAngle: 123 },
  oriente: { ...STADIUM_CENTER, ...SIDE_BAND, startAngle: 6, endAngle: 53 },
  occidente: { ...STADIUM_CENTER, ...SIDE_BAND, startAngle: 127, endAngle: 174 },
  palco: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 220, startAngle: 57, endAngle: 123 },
};

const ROW_LABELS = ["A", "B", "C", "D", "E", "F"];

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const CLASICO_VENUE: MockVenue = {
  sectors: CLASICO_SECTORS,
  layout: {
    eventSlug: "clasico-del-pacifico",
    viewBox: "0 0 600 392",
    stage: PITCH_STAGE,
    zones: [
      {
        id: "popular",
        ticketTypeId: "popular",
        kind: "general",
        capacity: 3000,
        path: getAnnularSectorPath(CLASICO_SECTORS.popular),
        labelPos: { x: 300, y: 327 },
      },
      {
        id: "oriente",
        ticketTypeId: "oriente",
        kind: "numbered",
        path: getAnnularSectorPath(CLASICO_SECTORS.oriente),
        labelPos: { x: 478, y: 122 },
        ...generateArcSeatRows({
          zoneId: "oriente",
          sector: CLASICO_SECTORS.oriente,
          scale: 1.3,
          rowLabels: ROW_LABELS,
          occupiedRatio: 0.4,
          accessibleSeats: ["oriente-F-1", "oriente-F-8"],
        }),
      },
      {
        id: "occidente",
        ticketTypeId: "occidente",
        kind: "numbered",
        path: getAnnularSectorPath(CLASICO_SECTORS.occidente),
        labelPos: { x: 122, y: 122 },
        ...generateArcSeatRows({
          zoneId: "occidente",
          sector: CLASICO_SECTORS.occidente,
          scale: 1.3,
          rowLabels: ROW_LABELS,
          occupiedRatio: 0.86,
          accessibleSeats: ["occidente-F-5"],
        }),
      },
      {
        id: "palco",
        ticketTypeId: "palco",
        kind: "general",
        capacity: 120,
        path: getAnnularSectorPath(CLASICO_SECTORS.palco),
        labelPos: { x: 300, y: 211 },
      },
    ],
  },
};
