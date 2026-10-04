import type { AnnularSector } from "../utils/annularSector";
import { VIVE_LATINO_VENUE } from "./festivalViveLatino.mock";
import { ESPEJOS_VENUE } from "./laCasaDeLosEspejos.mock";
import { SINTETIZADORES_VENUE } from "./nocheDeSintetizadores.mock";
import { RISAS_VENUE } from "./risasSinFiltro.mock";

// Un archivo por recinto; este agregador mantiene el orden de siempre (los tests usan `VENUE_LAYOUTS_MOCK[0]` = arena).
const MOCK_VENUES = [SINTETIZADORES_VENUE, ESPEJOS_VENUE, RISAS_VENUE, VIVE_LATINO_VENUE];

/** Layouts de los recintos. Nombre, precio y estado de cada zona salen del `ticketType` del evento (service). */
export const VENUE_LAYOUTS_MOCK = MOCK_VENUES.map((venue) => venue.layout);

/** Sectores (`stage` + uno por zona) de cada recinto, por `eventSlug`. */
export const VENUE_SECTORS_MOCK: Record<string, Record<string, AnnularSector>> = Object.fromEntries(
  MOCK_VENUES.map(({ layout, sectors }) => [layout.eventSlug, sectors]),
);
