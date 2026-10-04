import { describe, expect, it } from "vitest";
import { formatCompactSeats, formatTicketCount, parseSeatPosition } from "./summaryFormat";

const seat = (row: string, number: number, zoneId = "tribuna-oriente") => ({
  id: `${zoneId}-${row}-${number}`,
  label: `Tribuna Oriente · Fila ${row} · Asiento ${number}`,
});

describe("formatTicketCount", () => {
  it.each([
    [1, "1 entrada"],
    [3, "3 entradas"],
    [0, "0 entradas"],
  ])("%i → %s", (count, expected) => {
    expect(formatTicketCount(count)).toBe(expected);
  });
});

describe("parseSeatPosition", () => {
  it("lee fila y número desde la derecha", () => {
    expect(parseSeatPosition("tribuna-oriente-L-9")).toEqual({ row: "L", number: 9 });
  });

  it("admite zonas con guiones y filas de 2 letras", () => {
    expect(parseSeatPosition("platea-baja-AA-101")).toEqual({ row: "AA", number: 101 });
  });

  it.each(["general", "norte-f-12", "norte-F-0", "norte-F-1000"])("devuelve null con %s", (id) => {
    expect(parseSeatPosition(id)).toBeNull();
  });
});

describe("formatCompactSeats", () => {
  it("agrupa por fila", () => {
    expect(formatCompactSeats([seat("L", 9), seat("M", 8)])).toBe("Fila L · 9 · Fila M · 8");
  });

  it("ordena filas y números", () => {
    expect(formatCompactSeats([seat("M", 8), seat("L", 10), seat("L", 9)])).toBe("Fila L · 9, 10 · Fila M · 8");
  });

  it("ordena las filas por longitud antes que alfabéticamente", () => {
    expect(formatCompactSeats([seat("AA", 1), seat("Z", 1)])).toBe("Fila Z · 1 · Fila AA · 1");
    expect(formatCompactSeats([seat("Z", 1), seat("AA", 1)])).toBe("Fila Z · 1 · Fila AA · 1");
  });

  it("añade al final la etiqueta de un id ilegible", () => {
    expect(formatCompactSeats([{ id: "general", label: "General · Sin numerar" }, seat("L", 9)])).toBe(
      "Fila L · 9 · General · Sin numerar",
    );
  });

  it("devuelve una cadena vacía sin asientos", () => {
    expect(formatCompactSeats([])).toBe("");
  });
});
