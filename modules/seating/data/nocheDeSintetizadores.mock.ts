import { generateSeatRows } from "../utils/seatRows";
import type { MockVenue } from "./stadium.mock";

// Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const SINTETIZADORES_VENUE: MockVenue = {
  layout: {
    eventSlug: "noche-de-sintetizadores-lima",
    viewBox: "0 0 600 560",
    stage: { label: "ESCENARIO", path: "M200 16 H400 V60 H200 Z", labelPos: { x: 300, y: 38 } },
    zones: [
      {
        id: "vip",
        ticketTypeId: "vip",
        kind: "general",
        capacity: 1500,
        path: "M150 76 H450 V180 H150 Z",
        labelPos: { x: 300, y: 128 },
      },
      {
        id: "preferencial",
        ticketTypeId: "preferencial",
        kind: "general",
        capacity: 4000,
        path: "M90 196 H510 V296 H90 Z",
        labelPos: { x: 300, y: 246 },
      },
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 12000,
        path: "M20 312 H580 V444 H20 Z",
        labelPos: { x: 300, y: 378 },
      },
      {
        id: "norte",
        ticketTypeId: "norte",
        kind: "numbered",
        path: "M20 460 H580 V544 H20 Z",
        labelPos: { x: 300, y: 502 },
        ...generateSeatRows({
          zoneId: "norte",
          rowLabels: ["A", "B", "C", "D", "E", "F", "G", "H"],
          seatsPerRow: 10,
          occupiedRatio: 0.3,
          accessibleSeats: ["norte-H-1", "norte-H-10"],
        }),
      },
    ],
  },
};
