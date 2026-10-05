import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { type MockVenue, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

/** Abanico de 100° (40°…140°) frente al escenario: Preferencial delante y General detrás comparten el barrido. */
const SWEEP = { startAngle: 40, endAngle: 140 };

/**
 * Sectores del "Festival Sol de Verano" en la Explanada Costa 21 (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario):
 * Preferencial junto al escenario, General detrás y el lounge VIP, más corto (68°), como plataforma elevada al fondo.
 */
const SOL_DE_VERANO_SECTORS: Record<"stage" | "general" | "preferencial" | "vip", AnnularSector> = {
  stage: STAGE_SECTOR,
  general: { ...STADIUM_CENTER, innerRadius: 226, outerRadius: 336, ...SWEEP },
  preferencial: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 218, ...SWEEP },
  vip: { ...STADIUM_CENTER, innerRadius: 344, outerRadius: 456, startAngle: 56, endAngle: 124 },
};

// Festival al aire libre: las tres zonas son de pie. Nombre, precio y estado salen del `ticketType` del evento (service).
export const SOL_DE_VERANO_VENUE: MockVenue = {
  sectors: SOL_DE_VERANO_SECTORS,
  layout: {
    eventSlug: "festival-sol-de-verano",
    viewBox: "0 0 600 518",
    stage: STADIUM_STAGE,
    zones: [
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 3000,
        path: getAnnularSectorPath(SOL_DE_VERANO_SECTORS.general),
        labelPos: { x: 300, y: 329 },
      },
      {
        id: "preferencial",
        ticketTypeId: "preferencial",
        kind: "general",
        capacity: 1000,
        path: getAnnularSectorPath(SOL_DE_VERANO_SECTORS.preferencial),
        labelPos: { x: 300, y: 204 },
      },
      {
        id: "vip",
        ticketTypeId: "vip",
        kind: "general",
        capacity: 300,
        path: getAnnularSectorPath(SOL_DE_VERANO_SECTORS.vip),
        labelPos: { x: 300, y: 450 },
      },
    ],
  },
};
