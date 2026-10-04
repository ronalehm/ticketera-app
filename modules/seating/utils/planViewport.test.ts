import { describe, expect, it } from "vitest";
import { getPlanFit, getSeatDetailLevel } from "./planViewport";

describe("getPlanFit", () => {
  it("con la misma proporción escala sin márgenes", () => {
    expect(getPlanFit({ planWidth: 400, planHeight: 200, viewportWidth: 800, viewportHeight: 400 })).toEqual({
      unit: 2,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("con un viewport más ancho centra en horizontal (offsetX > 0)", () => {
    expect(getPlanFit({ planWidth: 400, planHeight: 400, viewportWidth: 1000, viewportHeight: 800 })).toEqual({
      unit: 2,
      offsetX: 100,
      offsetY: 0,
    });
  });

  it("con un viewport más alto centra en vertical (offsetY > 0)", () => {
    expect(getPlanFit({ planWidth: 399, planHeight: 401, viewportWidth: 399, viewportHeight: 601 })).toEqual({
      unit: 1,
      offsetX: 0,
      offsetY: 100,
    });
  });

  it.each([
    { planWidth: 0, planHeight: 400, viewportWidth: 800, viewportHeight: 400 },
    { planWidth: 400, planHeight: -1, viewportWidth: 800, viewportHeight: 400 },
    { planWidth: 400, planHeight: 400, viewportWidth: 0, viewportHeight: 400 },
    { planWidth: 400, planHeight: 400, viewportWidth: 800, viewportHeight: 0 },
  ])("con alguna medida ≤ 0 devuelve todo 0 (%o)", (input) => {
    expect(getPlanFit(input)).toEqual({ unit: 0, offsetX: 0, offsetY: 0 });
  });
});

describe("getSeatDetailLevel", () => {
  it("sin acercar (escala 1) es \"overview\" aunque el número mida ≥ 12 px", () => {
    expect(getSeatDetailLevel(2, 1)).toBe("overview");
  });

  it("acercado y con el número ≥ 12 px (0.8 · 1.5 = 1.2) es \"numbers\"", () => {
    expect(getSeatDetailLevel(0.8, 1.5)).toBe("numbers");
  });

  it("acercado pero con el número < 12 px (0.8 · 1.2 = 0.96) es \"overview\"", () => {
    expect(getSeatDetailLevel(0.8, 1.2)).toBe("overview");
  });

  it("en el límite exacto (0.5 · 2 = 1) es \"numbers\"", () => {
    expect(getSeatDetailLevel(0.5, 2)).toBe("numbers");
  });
});
