import { describe, expect, it } from "vitest";
import type { NumberedVenueZone, SeatStatus } from "../types/seating.types";
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

  it("devuelve null con count menor que 1", () => {
    expect(findBestAvailableSeats(zoneFrom({ A: "....." }), 0)).toBeNull();
  });
});
