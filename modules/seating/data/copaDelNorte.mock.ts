import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { type MockVenue, PITCH_STAGE, STADIUM_CENTER, STAGE_SECTOR } from "./stadium.mock";

/** Radios comunes de la herradura: el fondo y las dos tribunas laterales comparten banda (decisión 5 de `seating-all-venue-maps`). */
const HORSESHOE_BAND = { innerRadius: 102, outerRadius: 296 };

/**
 * Sectores de "Copa del Norte" en el Estadio Mansiche (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario):
 * la cancha arriba, Oriente a la derecha, Popular al fondo y Occidente a la izquierda.
 */
const COPA_DEL_NORTE_SECTORS: Record<"stage" | "popular" | "oriente" | "occidente", AnnularSector> = {
  stage: STAGE_SECTOR,
  popular: { ...STADIUM_CENTER, ...HORSESHOE_BAND, startAngle: 64, endAngle: 116 },
  oriente: { ...STADIUM_CENTER, ...HORSESHOE_BAND, startAngle: 6, endAngle: 60 },
  occidente: { ...STADIUM_CENTER, ...HORSESHOE_BAND, startAngle: 120, endAngle: 174 },
};

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const COPA_DEL_NORTE_VENUE: MockVenue = {
  sectors: COPA_DEL_NORTE_SECTORS,
  layout: {
    eventSlug: "copa-del-norte-trujillo",
    viewBox: "0 0 600 358",
    stage: PITCH_STAGE,
    zones: [
      {
        id: "popular",
        ticketTypeId: "popular",
        kind: "general",
        capacity: 2000,
        path: getAnnularSectorPath(COPA_DEL_NORTE_SECTORS.popular),
        labelPos: { x: 300, y: 283 },
      },
      {
        id: "oriente",
        ticketTypeId: "oriente",
        kind: "general",
        capacity: 800,
        path: getAnnularSectorPath(COPA_DEL_NORTE_SECTORS.oriente),
        labelPos: { x: 470, y: 135 },
      },
      {
        id: "occidente",
        ticketTypeId: "occidente",
        kind: "numbered",
        path: getAnnularSectorPath(COPA_DEL_NORTE_SECTORS.occidente),
        labelPos: { x: 130, y: 135 },
        ...generateArcSeatRows({
          zoneId: "occidente",
          sector: COPA_DEL_NORTE_SECTORS.occidente,
          scale: 1.3,
          rowLabels: ["A", "B", "C", "D", "E", "F"],
          occupiedRatio: 0.4,
          accessibleSeats: ["occidente-F-3", "occidente-F-5"],
        }),
      },
    ],
  },
};
