import { describe, expect, it } from "vitest";
import { formatEventDate, formatEventPrice, formatLongDate, formatTime } from "./formatEvent";

describe("formatTime", () => {
  it("devuelve HH:mm en zona America/Lima aunque el ISO UTC sea del día siguiente", () => {
    expect(formatTime("2026-11-15T03:00:00Z")).toBe("22:00");
  });

  it("usa dos dígitos y 24h", () => {
    expect(formatTime("2026-11-14T08:05:00-05:00")).toBe("08:05");
  });
});

describe("formatLongDate", () => {
  it("formatea la fecha larga en español", () => {
    expect(formatLongDate("2026-11-14T20:00:00-05:00")).toBe("sábado, 14 de noviembre de 2026");
  });

  it("usa el día de Lima con un ISO UTC que cambia de día", () => {
    expect(formatLongDate("2026-11-15T03:00:00Z")).toBe("sábado, 14 de noviembre de 2026");
  });
});

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
