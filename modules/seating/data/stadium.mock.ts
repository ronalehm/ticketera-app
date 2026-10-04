import type { z } from "zod";
import type { venueLayoutSchema } from "../schemas/seating.schema";
import { type AnnularSector, getAnnularSectorPath, getArcPoints } from "../utils/annularSector";

/** Centro común de los recintos en estadio: todos sus sectores son concéntricos. */
export const STADIUM_CENTER = { cx: 300, cy: 54 };

/** Escenario semicircular (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario). */
export const STAGE_SECTOR: AnnularSector = {
  ...STADIUM_CENTER,
  innerRadius: 0,
  outerRadius: 90,
  startAngle: -10,
  endAngle: 190,
};

/** `stage` del layout compartido por los recintos en estadio. */
export const STADIUM_STAGE: z.input<typeof venueLayoutSchema>["stage"] = {
  label: "ESCENARIO",
  path: getAnnularSectorPath(STAGE_SECTOR),
  labelPos: { x: 300, y: 70 },
  lights: getArcPoints(STADIUM_CENTER.cx, STADIUM_CENTER.cy, 76, 40, 140, 7),
};

export type MockVenue = {
  layout: z.input<typeof venueLayoutSchema>;
  /** `stage` + un sector por id de zona, en coordenadas del mapa. */
  sectors: Record<string, AnnularSector>;
};
