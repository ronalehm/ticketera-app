import { describe, expect, it } from "vitest";
import { getPlanFit, getSeatDetailLevel, getVisiblePlanRect, toVenueRect } from "./planViewport";

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

describe("getVisiblePlanRect", () => {
  // Plano 400×200 en un viewport 800×400: unit 2, sin márgenes.
  const plan = { planWidth: 400, planHeight: 200, viewportWidth: 800, viewportHeight: 400 };

  it("con escala 1 y sin desplazamiento devuelve el plano entero", () => {
    expect(getVisiblePlanRect({ ...plan, scale: 1, positionX: 0, positionY: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    });
  });

  it("con escala 2 y position (−w/2, −h/2) devuelve el cuarto central", () => {
    expect(getVisiblePlanRect({ ...plan, scale: 2, positionX: -400, positionY: -200 })).toEqual({
      x: 100,
      y: 50,
      width: 200,
      height: 100,
    });
  });

  it("con un viewport más alto descuenta el margen vertical (offsetY)", () => {
    // Plano 400×400 en 400×600: unit 1, offsetY 100. Con escala 2, el contenido visible empieza en (100, 200) px.
    expect(
      getVisiblePlanRect({
        planWidth: 400,
        planHeight: 400,
        viewportWidth: 400,
        viewportHeight: 600,
        scale: 2,
        positionX: -200,
        positionY: -400,
      }),
    ).toEqual({ x: 100, y: 100, width: 200, height: 300 });
  });

  it("con un viewport más ancho descuenta el margen horizontal y recorta el que sobra (escala 1)", () => {
    // Plano 400×400 en 1000×800: unit 2, offsetX 100. Sin zoom se ve el plano entero, no los márgenes.
    expect(
      getVisiblePlanRect({
        planWidth: 400,
        planHeight: 400,
        viewportWidth: 1000,
        viewportHeight: 800,
        scale: 1,
        positionX: 0,
        positionY: 0,
      }),
    ).toEqual({ x: 0, y: 0, width: 400, height: 400 });
  });

  it("con insetBottom el plano encaja sobre la franja reservada y se ve entero sin zoom", () => {
    // Plano 400×400 en 1000×800 con 64 px abajo: encaja en 1000×736 (unit 1.84, offsetX 132).
    expect(
      getVisiblePlanRect({
        planWidth: 400,
        planHeight: 400,
        viewportWidth: 1000,
        viewportHeight: 800,
        scale: 1,
        positionX: 0,
        positionY: 0,
        insetBottom: 64,
      }),
    ).toEqual({ x: 0, y: 0, width: 400, height: 400 });
  });

  it("con insetBottom y zoom descuenta la franja en la escala y el margen", () => {
    // Plano 400×200 en 800×464 con 64 px abajo: encaja en 800×400 (unit 2, sin márgenes). La vista mide 800×464 px.
    expect(
      getVisiblePlanRect({ ...plan, viewportHeight: 464, insetBottom: 64, scale: 2, positionX: -400, positionY: -200 }),
    ).toEqual({ x: 100, y: 50, width: 200, height: 116 });
  });

  it("recorta al borde superior izquierdo al panear más allá del origen", () => {
    // Sin recorte sería (−25, −12.5, 200, 100).
    expect(getVisiblePlanRect({ ...plan, scale: 2, positionX: 100, positionY: 50 })).toEqual({
      x: 0,
      y: 0,
      width: 175,
      height: 87.5,
    });
  });

  it("recorta al borde inferior derecho al panear más allá del final", () => {
    // Sin recorte sería (250, 125, 200, 100).
    expect(getVisiblePlanRect({ ...plan, scale: 2, positionX: -1000, positionY: -500 })).toEqual({
      x: 250,
      y: 125,
      width: 150,
      height: 75,
    });
  });

  it("con la vista fuera del plano devuelve un recuadro vacío pegado al borde", () => {
    expect(getVisiblePlanRect({ ...plan, scale: 2, positionX: -3000, positionY: -2000 })).toEqual({
      x: 400,
      y: 200,
      width: 0,
      height: 0,
    });
  });

  it.each([
    { viewportWidth: 0, viewportHeight: 0, scale: 1 },
    { viewportWidth: 800, viewportHeight: 400, scale: 0 },
  ])("sin medidas o con escala ≤ 0 devuelve el plano entero (%o)", (input) => {
    expect(getVisiblePlanRect({ ...plan, ...input, positionX: 10, positionY: 10 })).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    });
  });
});

describe("toVenueRect", () => {
  it("deshace planTransform (plano = estadio · s + t)", () => {
    expect(toVenueRect({ x: 30, y: 20, width: 100, height: 50 }, { scale: 2, x: 10, y: -20 })).toEqual({
      x: 10,
      y: 20,
      width: 50,
      height: 25,
    });
  });

  it("es la inversa de aplicar planTransform a un rectángulo del estadio", () => {
    const transform = { scale: 1.95, x: -12.5, y: 40 };
    const venue = { x: 400, y: 60, width: 120, height: 200 };
    const plan = {
      x: venue.x * transform.scale + transform.x,
      y: venue.y * transform.scale + transform.y,
      width: venue.width * transform.scale,
      height: venue.height * transform.scale,
    };
    const result = toVenueRect(plan, transform);
    expect(result.x).toBeCloseTo(venue.x);
    expect(result.y).toBeCloseTo(venue.y);
    expect(result.width).toBeCloseTo(venue.width);
    expect(result.height).toBeCloseTo(venue.height);
  });
});
