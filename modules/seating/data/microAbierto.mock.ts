import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { type MockVenue, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

/** Media luna de 100° (40°…140°) frente al escenario: las dos zonas comparten el barrido (requisito 9 de `seating-all-venue-maps`). */
const SWEEP = { startAngle: 40, endAngle: 140 };

/**
 * Sectores de "Micro abierto" en el Centro Cultural Peruano Norteamericano (coordenadas del mapa, ángulos en grados
 * con 0° = +x y sentido horario): las mesas junto al escenario y General detrás.
 */
const MICRO_ABIERTO_SECTORS: Record<"stage" | "general" | "mesa", AnnularSector> = {
  stage: STAGE_SECTOR,
  general: { ...STADIUM_CENTER, innerRadius: 222, outerRadius: 328, ...SWEEP },
  mesa: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 214, ...SWEEP },
};

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const MICRO_ABIERTO_VENUE: MockVenue = {
  sectors: MICRO_ABIERTO_SECTORS,
  layout: {
    eventSlug: "micro-abierto-arequipa",
    viewBox: "0 0 600 390",
    stage: STADIUM_STAGE,
    zones: [
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 300,
        path: getAnnularSectorPath(MICRO_ABIERTO_SECTORS.general),
        labelPos: { x: 300, y: 323 },
      },
      {
        id: "mesa",
        ticketTypeId: "mesa",
        kind: "numbered",
        path: getAnnularSectorPath(MICRO_ABIERTO_SECTORS.mesa),
        labelPos: { x: 300, y: 201 },
        ...generateArcSeatRows({
          zoneId: "mesa",
          sector: MICRO_ABIERTO_SECTORS.mesa,
          scale: 1.04,
          rowLabels: ["A", "B", "C"],
          occupiedRatio: 0.5,
          accessibleSeats: ["mesa-C-2", "mesa-C-9"],
        }),
      },
    ],
  },
};
