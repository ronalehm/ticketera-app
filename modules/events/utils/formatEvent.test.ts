import { describe, expect, it } from "vitest";
import { formatEventDate, formatEventPrice } from "./formatEvent";

describe("formatEventDate", () => {
  it("formatea en mayúsculas, sin puntos y con hora 24h", () => {
    expect(formatEventDate("2026-11-14T20:00:00-05:00")).toBe("SÁB 14 NOV · 20:00");
  });

  it("convierte un ISO en UTC a la zona America/Lima, aunque cambie de día", () => {
    expect(formatEventDate("2026-11-15T03:00:00Z")).toBe("SÁB 14 NOV · 22:00");
  });

  it("usa hora 24h por la tarde", () => {
    expect(formatEventDate("2027-01-10T15:30:00-05:00")).toBe("DOM 10 ENE · 15:30");
  });
});

describe("formatEventPrice", () => {
  it("usa prefijo S/ y 2 decimales con espacio normal", () => {
    expect(formatEventPrice(120)).toBe("S/ 120.00");
    expect(formatEventPrice(85.5)).toBe("S/ 85.50");
  });

  it("formatea precio 0", () => {
    expect(formatEventPrice(0)).toBe("S/ 0.00");
  });
});
