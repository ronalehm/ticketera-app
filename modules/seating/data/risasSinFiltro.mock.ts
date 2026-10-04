import { generateSeatRows } from "../utils/seatRows";
import type { MockVenue } from "./stadium.mock";

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const RISAS_VENUE: MockVenue = {
  layout: {
    eventSlug: "risas-sin-filtro",
    viewBox: "0 0 600 520",
    stage: { label: "ESCENARIO", path: "M200 16 H400 V64 H200 Z", labelPos: { x: 300, y: 40 } },
    zones: [
      {
        id: "mesa",
        ticketTypeId: "mesa",
        kind: "numbered",
        path: "M120 84 H480 V170 H120 Z",
        labelPos: { x: 300, y: 127 },
        ...generateSeatRows({ zoneId: "mesa", rowLabels: ["A", "B", "C"], seatsPerRow: 8, occupiedRatio: 1 }),
      },
      {
        id: "preferencial",
        ticketTypeId: "preferencial",
        kind: "numbered",
        path: "M60 186 H540 V326 H60 Z",
        labelPos: { x: 300, y: 256 },
        ...generateSeatRows({
          zoneId: "preferencial",
          rowLabels: ["A", "B", "C", "D", "E", "F"],
          seatsPerRow: 10,
          occupiedRatio: 0.8,
          accessibleSeats: ["preferencial-F-1", "preferencial-F-10"],
        }),
      },
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 600,
        path: "M20 342 H580 V500 H20 Z",
        labelPos: { x: 300, y: 421 },
      },
    ],
  },
};
