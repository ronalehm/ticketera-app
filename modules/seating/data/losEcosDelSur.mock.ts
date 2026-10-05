import { type AnnularSector, getAnnularSectorPath } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { type MockVenue, STADIUM_CENTER, STADIUM_STAGE, STAGE_SECTOR } from "./stadium.mock";

/** Abanico de 90° (45°…135°) frente al escenario: Platea delante y la Galería detrás comparten el barrido. */
const SWEEP = { startAngle: 45, endAngle: 135 };

/** Sectores del Teatro Municipal de Arequipa (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario). */
const ECOS_DEL_SUR_SECTORS: Record<"stage" | "general" | "platea", AnnularSector> = {
  stage: STAGE_SECTOR,
  general: { ...STADIUM_CENTER, innerRadius: 258, outerRadius: 352, ...SWEEP },
  platea: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 250, ...SWEEP },
};

// Evento agotado: las dos zonas se ven grises y no se abren. Nombre, precio y estado salen del `ticketType` (service).
export const ECOS_DEL_SUR_VENUE: MockVenue = {
  sectors: ECOS_DEL_SUR_SECTORS,
  layout: {
    eventSlug: "los-ecos-del-sur-arequipa",
    viewBox: "0 0 600 414",
    stage: STADIUM_STAGE,
    zones: [
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 300,
        path: getAnnularSectorPath(ECOS_DEL_SUR_SECTORS.general),
        labelPos: { x: 300, y: 357 },
      },
      {
        id: "platea",
        ticketTypeId: "platea",
        kind: "numbered",
        path: getAnnularSectorPath(ECOS_DEL_SUR_SECTORS.platea),
        labelPos: { x: 300, y: 226 },
        ...generateArcSeatRows({
          zoneId: "platea",
          sector: ECOS_DEL_SUR_SECTORS.platea,
          scale: 1.3,
          rowLabels: ["A", "B", "C", "D", "E", "F"],
          occupiedRatio: 1,
        }),
      },
    ],
  },
};
