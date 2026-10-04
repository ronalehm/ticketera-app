import type { z } from "zod";
import type { venueLayoutSchema } from "../schemas/seating.schema";
import { type AnnularSector, getAnnularSectorPath, getArcPoints } from "../utils/annularSector";
import { generateArcSeatRows } from "../utils/arcSeatRows";
import { generateSeatRows } from "../utils/seatRows";

/** Centro común del estadio de "Festival Vive Latino Lima": todos sus sectores son concéntricos. */
export const STADIUM_CENTER = { cx: 300, cy: 54 };

const STADIUM_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

/** Sectores del estadio (coordenadas del mapa, ángulos en grados con 0° = +x y sentido horario). */
export const VIVE_LATINO_SECTORS: Record<
  "stage" | "campo-vip" | "campo-general" | "occidente" | "oriente" | "norte",
  AnnularSector
> = {
  stage: { ...STADIUM_CENTER, innerRadius: 0, outerRadius: 90, startAngle: -10, endAngle: 190 },
  "campo-vip": { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 172, startAngle: 34, endAngle: 146 },
  "campo-general": { ...STADIUM_CENTER, innerRadius: 180, outerRadius: 278, startAngle: 34, endAngle: 146 },
  occidente: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 268, startAngle: 150, endAngle: 190 },
  oriente: { ...STADIUM_CENTER, innerRadius: 102, outerRadius: 268, startAngle: -10, endAngle: 30 },
  norte: { ...STADIUM_CENTER, innerRadius: 286, outerRadius: 350, startAngle: 33, endAngle: 147 },
};

// Layouts de los recintos. Nombre, precio y estado de cada zona salen del `ticketType` del evento (service).
export const VENUE_LAYOUTS_MOCK: z.input<typeof venueLayoutSchema>[] = [
  {
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
  {
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
  {
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
  {
    eventSlug: "festival-vive-latino-lima",
    viewBox: "0 0 600 412",
    stage: {
      label: "ESCENARIO",
      path: getAnnularSectorPath(VIVE_LATINO_SECTORS.stage),
      labelPos: { x: 300, y: 70 },
      lights: getArcPoints(STADIUM_CENTER.cx, STADIUM_CENTER.cy, 76, 40, 140, 7),
    },
    zones: [
      {
        id: "campo-vip",
        ticketTypeId: "campo-vip",
        kind: "general",
        capacity: 2000,
        path: getAnnularSectorPath(VIVE_LATINO_SECTORS["campo-vip"]),
        labelPos: { x: 300, y: 182 },
      },
      {
        id: "campo-general",
        ticketTypeId: "campo-general",
        kind: "general",
        capacity: 8000,
        path: getAnnularSectorPath(VIVE_LATINO_SECTORS["campo-general"]),
        labelPos: { x: 300, y: 287 },
      },
      {
        id: "occidente",
        ticketTypeId: "occidente",
        kind: "numbered",
        path: getAnnularSectorPath(VIVE_LATINO_SECTORS.occidente),
        labelPos: { x: 116, y: 84 },
        wrapLabel: true,
        ...generateArcSeatRows({
          zoneId: "occidente",
          sector: VIVE_LATINO_SECTORS.occidente,
          scale: 1.95,
          rowLabels: STADIUM_ROWS,
          occupiedRatio: 0.35,
          accessibleSeats: ["occidente-J-1", "occidente-J-10"],
        }),
      },
      {
        id: "oriente",
        ticketTypeId: "oriente",
        kind: "numbered",
        path: getAnnularSectorPath(VIVE_LATINO_SECTORS.oriente),
        labelPos: { x: 484, y: 84 },
        wrapLabel: true,
        ...generateArcSeatRows({
          zoneId: "oriente",
          sector: VIVE_LATINO_SECTORS.oriente,
          scale: 1.95,
          rowLabels: STADIUM_ROWS,
          occupiedRatio: 0.45,
          accessibleSeats: ["oriente-J-1", "oriente-J-10"],
        }),
      },
      {
        id: "norte",
        ticketTypeId: "norte",
        kind: "general",
        capacity: 6000,
        path: getAnnularSectorPath(VIVE_LATINO_SECTORS.norte),
        labelPos: { x: 300, y: 372 },
      },
    ],
  },
];
