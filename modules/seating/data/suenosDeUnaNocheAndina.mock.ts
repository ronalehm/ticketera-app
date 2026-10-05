import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { type MockVenue, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

/** Abanico de 90° (45°…135°) frente al escenario: Preferencial delante y General detrás comparten el barrido. */
const SWEEP = { startAngle: 45, endAngle: 135 };

/** Sectores del Teatro Municipal de Cusco (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario). */
const NOCHE_ANDINA_SECTORS: Record<"stage" | "general" | "preferencial", AnnularSector> = {
  stage: STAGE_SECTOR,
  general: { ...STADIUM_CENTER, innerRadius: 240, outerRadius: 340, ...SWEEP },
  preferencial: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 232, ...SWEEP },
};

// General, sin numerar, es la galería del fondo; Preferencial son las "primeras cinco filas" (A–E), numeradas.
// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const NOCHE_ANDINA_VENUE: MockVenue = {
  sectors: NOCHE_ANDINA_SECTORS,
  layout: {
    eventSlug: "suenos-de-una-noche-andina",
    viewBox: "0 0 600 402",
    stage: STADIUM_STAGE,
    zones: [
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 250,
        path: getAnnularSectorPath(NOCHE_ANDINA_SECTORS.general),
        labelPos: { x: 300, y: 338 },
      },
      {
        id: "preferencial",
        ticketTypeId: "preferencial",
        kind: "numbered",
        path: getAnnularSectorPath(NOCHE_ANDINA_SECTORS.preferencial),
        labelPos: { x: 300, y: 211 },
        ...generateArcSeatRows({
          zoneId: "preferencial",
          sector: NOCHE_ANDINA_SECTORS.preferencial,
          scale: 1.285,
          rowLabels: ["A", "B", "C", "D", "E"],
          occupiedRatio: 0.3,
          accessibleSeats: ["preferencial-E-1", "preferencial-E-13"],
        }),
      },
    ],
  },
};
