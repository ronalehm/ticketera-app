import { describe, expect, it } from "vitest";
import type { NumberedVenueZone, SeatStatus } from "../types/seating.types";
import { generateArcSeatRows } from "./arcSeatRows";
import { findBestAvailableSeats } from "./bestSeats";
import { generateSeatRows } from "./seatRows";

const STATUS_BY_CHAR: Record<string, SeatStatus> = { ".": "available", o: "occupied", w: "accessible" };

/**
 * Zona numerada de prueba con la geometría real de `generateSeatRows`. Cada fila se describe con
 * un carácter por asiento: "." disponible, "o" ocupado, "w" accesible.
 */
function zoneFrom(rows: Record<string, string>): NumberedVenueZone {
  const labels = Object.keys(rows);
  const { seatViewBox, rows: generated } = generateSeatRows({
    zoneId: "platea",
    rowLabels: labels,
    seatsPerRow: labels.map((label) => rows[label].length),
    occupiedRatio: 0,
  });

  return {
    kind: "numbered",
    id: "platea",
    ticketTypeId: "platea",
    path: "M60 90 H540 V300 H60 Z",
    labelPos: { x: 300, y: 195 },
    seatViewBox,
    rows: generated.map((row) => ({
      ...row,
      seats: row.seats.map((seat, index) => ({ ...seat, status: STATUS_BY_CHAR[rows[row.label][index]] })),
    })),
    name: "Platea",
    price: 180,
    status: "available",
  };
}

describe("findBestAvailableSeats", () => {
  it("prefiere la fila más cercana al escenario aunque otra tenga un bloque más centrado", () => {
    const zone = zoneFrom({ A: ".ooooooooo", B: ".........." });

    expect(findBestAvailableSeats(zone, 1)).toEqual(["platea-A-1"]);
  });

  it("pasa a la fila siguiente si la más cercana no tiene un bloque del tamaño pedido", () => {
    const zone = zoneFrom({ A: "..o..o..o.", B: "o...o....o" });

    // B: bloques de 3 en 2–4, 6–8 y 7–9; el más centrado es 6–8.
    expect(findBestAvailableSeats(zone, 3)).toEqual(["platea-B-6", "platea-B-7", "platea-B-8"]);
  });

  it("elige el bloque cuyo centro está más cerca del centro de la fila", () => {
    const zone = zoneFrom({ A: ".........." });

    expect(findBestAvailableSeats(zone, 2)).toEqual(["platea-A-5", "platea-A-6"]);
    expect(findBestAvailableSeats(zone, 4)).toEqual(["platea-A-4", "platea-A-5", "platea-A-6", "platea-A-7"]);
  });

  it("en empate de distancia al centro, se queda con el número menor", () => {
    const full = zoneFrom({ A: ".........." });
    expect(findBestAvailableSeats(full, 1)).toEqual(["platea-A-5"]);
    expect(findBestAvailableSeats(full, 3)).toEqual(["platea-A-4", "platea-A-5", "platea-A-6"]);

    const edges = zoneFrom({ A: "..oooooo.." });
    expect(findBestAvailableSeats(edges, 1)).toEqual(["platea-A-2"]);
  });

  it("centra respecto a la propia fila en filas cortas", () => {
    const zone = zoneFrom({ A: "oooooooooo", B: "......" });

    expect(findBestAvailableSeats(zone, 2)).toEqual(["platea-B-3", "platea-B-4"]);
  });

  it("ignora los asientos accesibles y los ocupados", () => {
    const zone = zoneFrom({ A: "....w.o...", B: "wwww" });

    // Bloques de 3 disponibles en A: 1–3, 2–4 y 8–10; el más centrado es 2–4.
    expect(findBestAvailableSeats(zone, 3)).toEqual(["platea-A-2", "platea-A-3", "platea-A-4"]);
    // A: el 5 (accesible) y el 7 (ocupado) cortan el bloque central.
    expect(findBestAvailableSeats(zone, 5)).toBeNull();
    expect(findBestAvailableSeats(zoneFrom({ A: "wwoo", B: "o.o" }), 1)).toEqual(["platea-B-2"]);
  });

  it("devuelve null si count es mayor que cualquier bloque disponible", () => {
    const zone = zoneFrom({ A: "..o..", B: "o..o.." });

    expect(findBestAvailableSeats(zone, 3)).toBeNull();
    expect(findBestAvailableSeats(zone, 7)).toBeNull();
  });

  it("devuelve null si la zona no tiene asientos disponibles", () => {
    const zone = zoneFrom({ A: "oowoo", B: "wooow" });

    expect(findBestAvailableSeats(zone, 1)).toBeNull();
  });

  it("el mejor asiento suelto de una fila libre de 5 es el número 3", () => {
    expect(findBestAvailableSeats(zoneFrom({ A: "....." }), 1)).toEqual(["platea-A-3"]);
  });

  it("devuelve null con count menor que 1", () => {
    expect(findBestAvailableSeats(zoneFrom({ A: "....." }), 0)).toBeNull();
  });
});

/**
 * Zona en arco con el sector y las filas A–J de referencia de `oriente`: A y B (4 butacas) ocupadas
 * y el resto libres (C tiene 5). En el arco las butacas no están equiespaciadas en `x`, así que centrar por `x` y por
 * índice dan resultados distintos.
 */
function arcZone(): NumberedVenueZone {
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
    rows: rows.map((row) =>
      row.label === "A" || row.label === "B"
        ? { ...row, seats: row.seats.map((seat) => ({ ...seat, status: "occupied" as const })) }
        : row,
    ),
    planTransform,
    name: "Tribuna Oriente",
    price: 155,
    status: "available",
  };
}

describe("findBestAvailableSeats en una zona en arco", () => {
  it("centra el bloque por posición en la fila, no por x", () => {
    const zone = arcZone();
    const rowC = zone.rows[2].seats;
    expect(rowC).toHaveLength(5);

    // Por x (criterio anterior), la butaca más cercana al centro de la fila sería C-4.
    const centerX = (rowC[0].x + rowC[4].x) / 2;
    const closestByX = rowC.reduce((closest, seat) =>
      Math.abs(seat.x - centerX) < Math.abs(closest.x - centerX) ? seat : closest,
    );
    expect(closestByX.id).toBe("oriente-C-4");

    expect(findBestAvailableSeats(zone, 1)).toEqual(["oriente-C-3"]);
    expect(findBestAvailableSeats(zone, 2)).toEqual(["oriente-C-2", "oriente-C-3"]);
    expect(findBestAvailableSeats(zone, 3)).toEqual(["oriente-C-2", "oriente-C-3", "oriente-C-4"]);
  });

  it("en la fila A libre de 4 elige el centro por índice con el número menor en empate", () => {
    const zone = arcZone();
    const [rowA] = zone.rows;
    const freeA: NumberedVenueZone = {
      ...zone,
      rows: [{ ...rowA, seats: rowA.seats.map((seat) => ({ ...seat, status: "available" as const })) }],
    };
    expect(rowA.seats).toHaveLength(4);

    expect(findBestAvailableSeats(freeA, 1)).toEqual(["oriente-A-2"]);
    expect(findBestAvailableSeats(freeA, 2)).toEqual(["oriente-A-2", "oriente-A-3"]);
  });
});
