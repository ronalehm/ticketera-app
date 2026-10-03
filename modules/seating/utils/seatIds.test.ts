import { describe, expect, it } from "vitest";
import type { Seat, VenueMap } from "../types/seating.types";
import {
  formatSeatId,
  formatSeatLabel,
  formatSeatShortLabel,
  getSeatAriaLabel,
  parseSeatId,
  parseSeatIds,
  resolveSeats,
} from "./seatIds";

function seat(zoneId: string, row: string, number: number, status: Seat["status"] = "available"): Seat {
  return { id: formatSeatId(zoneId, row, number), row, number, x: number * 32, y: 88, status };
}

const map: VenueMap = {
  eventSlug: "evento-prueba",
  venue: "Recinto de prueba",
  viewBox: "0 0 600 400",
  stage: { label: "ESCENARIO", path: "M200 16 H400 V60 H200 Z", labelPos: { x: 300, y: 46 } },
  zones: [
    {
      kind: "general",
      id: "general",
      ticketTypeId: "general",
      path: "M20 80 H580 V160 H20 Z",
      labelPos: { x: 300, y: 120 },
      capacity: 500,
      name: "General",
      price: 100,
      status: "available",
    },
    {
      kind: "numbered",
      id: "norte",
      ticketTypeId: "tribuna-norte",
      path: "M20 180 H580 V260 H20 Z",
      labelPos: { x: 300, y: 220 },
      seatViewBox: "0 0 176 160",
      rows: [
        { label: "A", seats: [seat("norte", "A", 1), seat("norte", "A", 2, "occupied"), seat("norte", "A", 3, "accessible")] },
        { label: "B", seats: [seat("norte", "B", 1)] },
      ],
      name: "Tribuna Norte",
      price: 220,
      status: "available",
    },
    {
      kind: "numbered",
      id: "mesa",
      ticketTypeId: "mesa",
      path: "M20 280 H580 V380 H20 Z",
      labelPos: { x: 300, y: 330 },
      seatViewBox: "0 0 112 128",
      rows: [{ label: "A", seats: [seat("mesa", "A", 1)] }],
      name: "Mesa",
      price: 160,
      status: "sold-out",
    },
  ],
};

describe("formatSeatId / parseSeatId", () => {
  it("formatea el id", () => {
    expect(formatSeatId("norte", "F", 12)).toBe("norte-F-12");
  });

  it.each([
    ["norte", "F", 12],
    ["platea-baja", "AA", 101],
    ["mesa", "A", 1],
  ] as const)("ida y vuelta para %s-%s-%i", (zoneId, row, number) => {
    expect(parseSeatId(formatSeatId(zoneId, row, number))).toEqual({ zoneId, row, number });
  });

  it("parsea desde la derecha una zona con guiones y fila de 2 letras", () => {
    expect(parseSeatId("platea-baja-AA-101")).toEqual({ zoneId: "platea-baja", row: "AA", number: 101 });
  });

  it.each(["", "norte", "norte-F", "norte-f-12", "norte-ABC-1", "norte-F-1000", "Norte-F-12", "-F-12", "norte-F-12-"])(
    "%j → null",
    (id) => {
      expect(parseSeatId(id)).toBeNull();
    },
  );
});

describe("etiquetas", () => {
  it("etiqueta completa y corta", () => {
    expect(formatSeatLabel("Tribuna Norte", "F", 12)).toBe("Tribuna Norte · Fila F · Asiento 12");
    expect(formatSeatShortLabel("F", 12)).toBe("Fila F · Asiento 12");
  });

  it("getSeatAriaLabel para los 3 estados", () => {
    const base = { row: "F", number: 12 };
    expect(getSeatAriaLabel({ ...base, status: "available" }, "S/ 150.00")).toBe("Fila F, asiento 12, disponible, S/ 150.00");
    expect(getSeatAriaLabel({ ...base, status: "accessible" }, "S/ 150.00")).toBe(
      "Fila F, asiento 12, accesible para silla de ruedas, S/ 150.00",
    );
    expect(getSeatAriaLabel({ ...base, status: "occupied" }, "S/ 150.00")).toBe("Fila F, asiento 12, ocupado");
  });
});

describe("parseSeatIds", () => {
  it("undefined → []", () => {
    expect(parseSeatIds(undefined)).toEqual([]);
  });

  it("lista separada por comas → ids", () => {
    expect(parseSeatIds("norte-A-1,norte-A-2")).toEqual(["norte-A-1", "norte-A-2"]);
  });

  it.each([
    ["vacío", ""],
    ["ids repetidos", "norte-A-1,norte-A-1"],
    ["formato inválido", "norte-A-1,norte_A_2"],
    ["más de 10 ids", Array.from({ length: 11 }, (_, index) => `norte-A-${index + 1}`).join(",")],
    ["array (parámetro repetido)", ["norte-A-1", "norte-A-2"]],
  ])("%s → null", (_, raw) => {
    expect(parseSeatIds(raw)).toBeNull();
  });
});

describe("resolveSeats", () => {
  it("devuelve los asientos disponibles y accesibles con su etiqueta, en el orden recibido", () => {
    expect(resolveSeats(map, ["norte-B-1", "norte-A-3", "norte-A-1"])).toEqual([
      { id: "norte-B-1", label: "Tribuna Norte · Fila B · Asiento 1", zoneId: "norte", ticketTypeId: "tribuna-norte" },
      { id: "norte-A-3", label: "Tribuna Norte · Fila A · Asiento 3", zoneId: "norte", ticketTypeId: "tribuna-norte" },
      { id: "norte-A-1", label: "Tribuna Norte · Fila A · Asiento 1", zoneId: "norte", ticketTypeId: "tribuna-norte" },
    ]);
  });

  it("[] → []", () => {
    expect(resolveSeats(map, [])).toEqual([]);
  });

  it.each([
    ["inexistente", ["norte-A-1", "norte-C-1"]],
    ["número inexistente en una fila existente", ["norte-A-9"]],
    ["zona inexistente", ["sur-A-1"]],
    ["ocupado", ["norte-A-2"]],
    ["de una zona agotada", ["mesa-A-1"]],
    ["de una zona general", ["general-A-1"]],
    ["repetido", ["norte-A-1", "norte-A-1"]],
    ["mal formado", ["norte-a-1"]],
  ])("asiento %s → null", (_, seatIds) => {
    expect(resolveSeats(map, seatIds)).toBeNull();
  });
});
