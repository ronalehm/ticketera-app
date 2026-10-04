import { generateSeatRows } from "../utils/seatRows";
import type { MockVenue } from "./stadium.mock";

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const ESPEJOS_VENUE: MockVenue = {
  layout: {
    eventSlug: "la-casa-de-los-espejos",
    viewBox: "0 0 600 520",
    stage: { label: "ESCENARIO", path: "M150 16 H450 V64 H150 Z", labelPos: { x: 300, y: 40 } },
    zones: [
      {
        id: "platea",
        ticketTypeId: "platea",
        kind: "numbered",
        path: "M60 90 H540 V300 H60 Z",
        labelPos: { x: 300, y: 195 },
        ...generateSeatRows({
          zoneId: "platea",
          rowLabels: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
          seatsPerRow: [8, 8, 9, 9, 10, 10, 10, 10, 10, 10],
          occupiedRatio: 0.4,
          accessibleSeats: ["platea-J-1", "platea-J-10"],
        }),
      },
      {
        id: "mezanine",
        ticketTypeId: "mezanine",
        kind: "numbered",
        path: "M40 330 H560 V490 H40 Z",
        labelPos: { x: 300, y: 410 },
        ...generateSeatRows({
          zoneId: "mezanine",
          rowLabels: ["A", "B", "C", "D", "E", "F"],
          seatsPerRow: 10,
          occupiedRatio: 0.85,
        }),
      },
    ],
  },
};
