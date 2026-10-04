import { describe, expect, it } from "vitest";
import type { NumberedVenueZone, SeatRow } from "../types/seating.types";
import { generateArcSeatRows } from "./arcSeatRows";
import { getAdjacentSeatId } from "./seatNavigation";
import { generateSeatRows } from "./seatRows";

/**
 * Filas de distinta longitud, centradas con la geometría real (máximo 6 asientos):
 * - A (4): x = 88, 120, 152, 184
 * - B (6): x = 56, 88, 120, 152, 184, 216 (B-2 ocupado)
 * - C (5): x = 72, 104, 136, 168, 200
 */
function buildZone(): NumberedVenueZone {
  const { seatViewBox, rows } = generateSeatRows({
    zoneId: "norte",
    rowLabels: ["A", "B", "C"],
    seatsPerRow: [4, 6, 5],
    occupiedRatio: 0,
  });

  return {
    kind: "numbered",
    id: "norte",
    ticketTypeId: "norte",
    path: "M20 460 H580 V544 H20 Z",
    labelPos: { x: 300, y: 502 },
    seatViewBox,
    rows: rows.map((row) => ({
      ...row,
      seats: row.seats.map((seat) => (seat.id === "norte-B-2" ? { ...seat, status: "occupied" as const } : seat)),
    })),
    name: "Tribuna Norte",
    price: 220,
    status: "available",
  };
}

const zone = buildZone();

describe("getAdjacentSeatId", () => {
  it("ArrowLeft y ArrowRight van al asiento anterior y al siguiente de la fila", () => {
    expect(getAdjacentSeatId(zone, "norte-B-3", "ArrowLeft")).toBe("norte-B-2");
    expect(getAdjacentSeatId(zone, "norte-B-3", "ArrowRight")).toBe("norte-B-4");
  });

  it("ArrowLeft y ArrowRight se quedan en el mismo asiento en los extremos de la fila", () => {
    expect(getAdjacentSeatId(zone, "norte-A-1", "ArrowLeft")).toBe("norte-A-1");
    expect(getAdjacentSeatId(zone, "norte-A-4", "ArrowRight")).toBe("norte-A-4");
  });

  it("Home y End van al primer y al último asiento de la fila", () => {
    expect(getAdjacentSeatId(zone, "norte-B-4", "Home")).toBe("norte-B-1");
    expect(getAdjacentSeatId(zone, "norte-B-4", "End")).toBe("norte-B-6");
    expect(getAdjacentSeatId(zone, "norte-C-1", "Home")).toBe("norte-C-1");
    expect(getAdjacentSeatId(zone, "norte-C-5", "End")).toBe("norte-C-5");
  });

  it("ArrowUp y ArrowDown van al asiento con la x más cercana de la fila anterior o siguiente", () => {
    // B (6) → A (4): los extremos de B caen sobre los extremos de A.
    expect(getAdjacentSeatId(zone, "norte-B-1", "ArrowUp")).toBe("norte-A-1");
    expect(getAdjacentSeatId(zone, "norte-B-6", "ArrowUp")).toBe("norte-A-4");
    expect(getAdjacentSeatId(zone, "norte-B-4", "ArrowUp")).toBe("norte-A-3");
    // A (4) → B (6): misma x.
    expect(getAdjacentSeatId(zone, "norte-A-4", "ArrowDown")).toBe("norte-B-5");
    // B (6) → C (5): x 56 → 72.
    expect(getAdjacentSeatId(zone, "norte-B-1", "ArrowDown")).toBe("norte-C-1");
    expect(getAdjacentSeatId(zone, "norte-B-6", "ArrowDown")).toBe("norte-C-5");
  });

  it("en empate de distancia vertical, elige el asiento de número menor", () => {
    // B-3 (x 120) está a 16 de C-2 (104) y de C-3 (136).
    expect(getAdjacentSeatId(zone, "norte-B-3", "ArrowDown")).toBe("norte-C-2");
    // C-3 (x 136) está a 16 de B-3 (120) y de B-4 (152).
    expect(getAdjacentSeatId(zone, "norte-C-3", "ArrowUp")).toBe("norte-B-3");
  });

  it("incluye los asientos ocupados en la navegación", () => {
    expect(getAdjacentSeatId(zone, "norte-B-1", "ArrowRight")).toBe("norte-B-2");
    expect(getAdjacentSeatId(zone, "norte-A-1", "ArrowDown")).toBe("norte-B-2");
  });

  it("ArrowUp en la primera fila y ArrowDown en la última se quedan en el mismo asiento", () => {
    expect(getAdjacentSeatId(zone, "norte-A-2", "ArrowUp")).toBe("norte-A-2");
    expect(getAdjacentSeatId(zone, "norte-C-4", "ArrowDown")).toBe("norte-C-4");
  });

  it("devuelve el mismo id si el asiento no pertenece a la zona", () => {
    expect(getAdjacentSeatId(zone, "platea-A-1", "ArrowRight")).toBe("platea-A-1");
  });
});

/**
 * Zona en arco con el sector y las filas A–J de referencia de `oriente` (casi vertical en
 * pantalla). Filas A y B de 4 butacas y C de 5; dentro de cada fila la `x` apenas cambia y la `y`
 * crece con el número.
 */
function buildArcZone(): NumberedVenueZone {
  const { seatViewBox, rows, planTransform } = generateArcSeatRows({
    zoneId: "oriente",
    sector: { cx: 300, cy: 54, innerRadius: 102, outerRadius: 268, startAngle: -10, endAngle: 30 },
    scale: 1.95,
    rowLabels: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    occupiedRatio: 0,
  });

  return {
    kind: "numbered",
    id: "oriente",
    ticketTypeId: "oriente",
    path: "M0 0 H10 V10 H0 Z",
    labelPos: { x: 5, y: 5 },
    seatViewBox,
    rows,
    planTransform,
    name: "Tribuna Oriente",
    price: 155,
    status: "available",
  };
}

describe("getAdjacentSeatId en una zona en arco", () => {
  const arcZone = buildArcZone();
  const [rowA, rowB] = arcZone.rows;

  /** Id de la butaca de `row` con la `x` más cercana a la de `seatId` (el criterio anterior). */
  function closestIdByX(row: SeatRow, seatId: string): string {
    const { x } = [...rowA.seats, ...rowB.seats].find((seat) => seat.id === seatId) ?? { x: Number.NaN };
    return row.seats.reduce((closest, seat) => (Math.abs(seat.x - x) < Math.abs(closest.x - x) ? seat : closest)).id;
  }

  it("ArrowDown desde la butaca central de la fila A va a la butaca central de la fila B", () => {
    expect(getAdjacentSeatId(arcZone, "oriente-A-2", "ArrowDown")).toBe("oriente-B-2");
    expect(getAdjacentSeatId(arcZone, "oriente-A-3", "ArrowDown")).toBe("oriente-B-3");
  });

  it("ArrowUp y ArrowDown eligen la butaca más cercana en distancia, no por x", () => {
    // Con filas casi verticales, por x A-2 bajaría a B-4 y B-2 subiría a A-1.
    expect(closestIdByX(rowB, "oriente-A-2")).toBe("oriente-B-4");
    expect(closestIdByX(rowA, "oriente-B-2")).toBe("oriente-A-1");

    expect(getAdjacentSeatId(arcZone, "oriente-A-2", "ArrowDown")).toBe("oriente-B-2");
    expect(getAdjacentSeatId(arcZone, "oriente-B-2", "ArrowUp")).toBe("oriente-A-2");
    expect(getAdjacentSeatId(arcZone, "oriente-B-2", "ArrowDown")).toBe("oriente-C-2");
  });

  it("ArrowLeft y ArrowRight siguen el número de butaca de la fila", () => {
    expect(getAdjacentSeatId(arcZone, "oriente-C-3", "ArrowLeft")).toBe("oriente-C-2");
    expect(getAdjacentSeatId(arcZone, "oriente-C-3", "ArrowRight")).toBe("oriente-C-4");
  });
});
