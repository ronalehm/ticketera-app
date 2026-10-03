import { describe, expect, it } from "vitest";
import {
  type AnnularSector,
  doAnnularSectorsOverlap,
  getAnnularSectorBounds,
  getAnnularSectorPath,
  getArcPoints,
  isPointInAnnularSector,
  polarToCartesian,
} from "./annularSector";

function sector(overrides: Partial<AnnularSector> = {}): AnnularSector {
  return { cx: 0, cy: 0, innerRadius: 10, outerRadius: 20, startAngle: 0, endAngle: 90, ...overrides };
}

describe("polarToCartesian", () => {
  it("usa 0° = +x y ángulos crecientes hacia abajo (sentido horario en pantalla)", () => {
    expect(polarToCartesian(5, 5, 10, 0)).toEqual({ x: 15, y: 5 });
    const down = polarToCartesian(5, 5, 10, 90);
    expect(down.x).toBeCloseTo(5);
    expect(down.y).toBeCloseTo(15);
    const up = polarToCartesian(5, 5, 10, -90);
    expect(up.x).toBeCloseTo(5);
    expect(up.y).toBeCloseTo(-5);
  });
});

describe("getAnnularSectorPath", () => {
  it("dibuja exactamente un sector de 90°", () => {
    expect(getAnnularSectorPath(sector())).toBe("M20 0 A20 20 0 0 1 0 20 L0 10 A10 10 0 0 0 10 0 Z");
  });

  it("con radio interior 0 dibuja la porción de disco desde el centro", () => {
    expect(getAnnularSectorPath(sector({ innerRadius: 0 }))).toBe("M0 0 L20 0 A20 20 0 0 1 0 20 Z");
  });

  it("usa large = 1 solo con un barrido de más de 180°", () => {
    expect(getAnnularSectorPath(sector({ endAngle: 180 }))).toBe(
      "M20 0 A20 20 0 0 1 -20 0 L-10 0 A10 10 0 0 0 10 0 Z",
    );
    expect(getAnnularSectorPath(sector({ startAngle: -10, endAngle: 190 }))).toMatch(
      /^M\S+ \S+ A20 20 0 1 1 \S+ \S+ L\S+ \S+ A10 10 0 1 0 \S+ \S+ Z$/,
    );
  });

  it("redondea a 2 decimales sin ceros sobrantes", () => {
    const path = getAnnularSectorPath(sector({ cx: 300, cy: 54, innerRadius: 102, outerRadius: 268, startAngle: -10, endAngle: 30 }));
    expect(path).toBe(
      "M563.93 7.46 A268 268 0 0 1 532.09 188 L388.33 105 A102 102 0 0 0 400.45 36.29 Z",
    );
    for (const value of path.match(/-?\d+(\.\d+)?/g) ?? []) {
      expect(value).toMatch(/^-?\d+(\.\d?[1-9])?$/);
    }
  });
});

describe("getAnnularSectorBounds", () => {
  it("incluye el extremo de 0° en un sector que cruza 0° (−10°…30°)", () => {
    const bounds = getAnnularSectorBounds(sector({ cx: 300, cy: 54, innerRadius: 102, outerRadius: 268, startAngle: -10, endAngle: 30 }));
    expect(bounds.maxX).toBe(300 + 268);
    expect(bounds.minX).toBeCloseTo(300 + 102 * Math.cos(Math.PI / 6));
    expect(bounds.minY).toBeCloseTo(54 - 268 * Math.sin(Math.PI / 18));
    expect(bounds.maxY).toBeCloseTo(54 + 268 * Math.sin(Math.PI / 6));
  });

  it("incluye el extremo de 90° en un sector que lo contiene", () => {
    const bounds = getAnnularSectorBounds(sector({ cx: 300, cy: 54, innerRadius: 102, outerRadius: 172, startAngle: 34, endAngle: 146 }));
    expect(bounds.maxY).toBe(54 + 172);
    expect(bounds.minY).toBeCloseTo(54 + 102 * Math.sin((34 * Math.PI) / 180));
    expect(bounds.minX).toBeCloseTo(300 - 172 * Math.cos((34 * Math.PI) / 180));
    expect(bounds.maxX).toBeCloseTo(300 + 172 * Math.cos((34 * Math.PI) / 180));
  });

  it("incluye el centro en una porción de disco", () => {
    const bounds = getAnnularSectorBounds(sector({ cx: 300, cy: 54, innerRadius: 0, outerRadius: 90, startAngle: -10, endAngle: 190 }));
    expect(bounds).toEqual({
      minX: 210,
      maxX: 390,
      minY: expect.closeTo(54 - 90 * Math.sin(Math.PI / 18)) as number,
      maxY: 144,
    });

    const quarter = getAnnularSectorBounds(sector({ cx: 5, cy: 5, innerRadius: 0, outerRadius: 10, startAngle: 10, endAngle: 80 }));
    expect(quarter.minX).toBe(5);
    expect(quarter.minY).toBe(5);
  });

  it("encuentra los extremos cardinales ± 360k (350°…460° contiene 360° y 450°)", () => {
    const bounds = getAnnularSectorBounds(sector({ startAngle: 350, endAngle: 460 }));
    expect(bounds.maxX).toBe(20);
    expect(bounds.maxY).toBe(20);
  });
});

describe("isPointInAnnularSector", () => {
  const base = sector({ cx: 100, cy: 100 });

  it("acepta un punto dentro y los bordes", () => {
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 15, 45), base)).toBe(true);
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 20, 90), base)).toBe(true);
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 10, 0), base)).toBe(true);
  });

  it("rechaza un punto fuera por radio", () => {
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 9, 45), base)).toBe(false);
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 21, 45), base)).toBe(false);
  });

  it("rechaza un punto fuera por ángulo", () => {
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 15, 100), base)).toBe(false);
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 15, -5), base)).toBe(false);
  });

  it("acepta un punto dentro cruzando 0° (−10°…30°)", () => {
    const crossing = sector({ cx: 100, cy: 100, startAngle: -10, endAngle: 30 });
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 15, -5), crossing)).toBe(true);
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 15, 355), crossing)).toBe(true);
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 15, 20), crossing)).toBe(true);
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 15, 40), crossing)).toBe(false);
    expect(isPointInAnnularSector(polarToCartesian(100, 100, 15, 340), crossing)).toBe(false);
  });

  it("en una porción de disco acepta el centro", () => {
    expect(isPointInAnnularSector({ x: 100, y: 100 }, sector({ cx: 100, cy: 100, innerRadius: 0 }))).toBe(true);
  });
});

describe("doAnnularSectorsOverlap", () => {
  it("con radios que se cruzan y ángulos que se cruzan → true", () => {
    expect(doAnnularSectorsOverlap(sector(), sector({ innerRadius: 15, outerRadius: 30, startAngle: 45, endAngle: 135 }))).toBe(true);
    expect(doAnnularSectorsOverlap(sector(), sector({ startAngle: 30, endAngle: 60 }))).toBe(true);
  });

  it("con radios disjuntos o que solo se tocan → false", () => {
    expect(doAnnularSectorsOverlap(sector(), sector({ innerRadius: 25, outerRadius: 30 }))).toBe(false);
    expect(doAnnularSectorsOverlap(sector(), sector({ innerRadius: 20, outerRadius: 30 }))).toBe(false);
  });

  it("con ángulos que solo se tocan → false", () => {
    expect(doAnnularSectorsOverlap(sector(), sector({ startAngle: 90, endAngle: 180 }))).toBe(false);
    expect(doAnnularSectorsOverlap(sector(), sector({ startAngle: -90, endAngle: 0 }))).toBe(false);
    expect(doAnnularSectorsOverlap(sector({ startAngle: -10, endAngle: 30 }), sector({ startAngle: 30, endAngle: 350 }))).toBe(false);
  });

  it("detecta el solape cruzando 0° (módulo 360)", () => {
    const crossing = sector({ startAngle: -10, endAngle: 30 });
    expect(doAnnularSectorsOverlap(crossing, sector({ startAngle: 340, endAngle: 355 }))).toBe(true);
    expect(doAnnularSectorsOverlap(sector({ startAngle: 340, endAngle: 355 }), crossing)).toBe(true);
    expect(doAnnularSectorsOverlap(crossing, sector({ startAngle: 370, endAngle: 380 }))).toBe(true);
    expect(doAnnularSectorsOverlap(crossing, sector({ startAngle: 200, endAngle: 340 }))).toBe(false);
  });

  it("lanza error con sectores no concéntricos", () => {
    expect(() => doAnnularSectorsOverlap(sector(), sector({ cx: 1 }))).toThrow(Error);
    expect(() => doAnnularSectorsOverlap(sector(), sector({ cy: 1, innerRadius: 50, outerRadius: 60 }))).toThrow(Error);
  });
});

describe("getArcPoints", () => {
  it("incluye los dos extremos", () => {
    const points = getArcPoints(300, 54, 76, 40, 140, 7);
    expect(points).toHaveLength(7);
    const first = polarToCartesian(300, 54, 76, 40);
    const last = polarToCartesian(300, 54, 76, 140);
    expect(points[0].x).toBeCloseTo(first.x);
    expect(points[0].y).toBeCloseTo(first.y);
    expect(points[6].x).toBeCloseTo(last.x);
    expect(points[6].y).toBeCloseTo(last.y);
  });

  it("reparte los puntos equiespaciados sobre el arco", () => {
    const points = getArcPoints(0, 0, 10, 0, 90, 4);
    const angles = points.map((point) => (Math.atan2(point.y, point.x) * 180) / Math.PI);
    angles.forEach((angle, index) => expect(angle).toBeCloseTo(index * 30));
    points.forEach((point) => expect(Math.hypot(point.x, point.y)).toBeCloseTo(10));
    const gaps = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
    gaps.forEach((gap) => expect(gap).toBeCloseTo(gaps[0]));
  });

  it.each([1, 0, 2.5])("lanza error con count %s", (count) => {
    expect(() => getArcPoints(0, 0, 10, 0, 90, count)).toThrow(Error);
  });
});

describe("sectores inválidos", () => {
  const functions: [string, (invalid: AnnularSector) => unknown][] = [
    ["getAnnularSectorPath", (invalid) => getAnnularSectorPath(invalid)],
    ["getAnnularSectorBounds", (invalid) => getAnnularSectorBounds(invalid)],
    ["isPointInAnnularSector", (invalid) => isPointInAnnularSector({ x: 0, y: 0 }, invalid)],
    ["doAnnularSectorsOverlap (a)", (invalid) => doAnnularSectorsOverlap(invalid, sector())],
    ["doAnnularSectorsOverlap (b)", (invalid) => doAnnularSectorsOverlap(sector(), invalid)],
  ];
  const invalidSectors: [string, AnnularSector][] = [
    ["radio interior negativo", sector({ innerRadius: -1 })],
    ["radio interior igual al exterior", sector({ innerRadius: 20 })],
    ["radio interior mayor que el exterior", sector({ innerRadius: 30 })],
    ["barrido 0", sector({ endAngle: 0 })],
    ["barrido negativo", sector({ startAngle: 90, endAngle: 0 })],
    ["barrido de 360°", sector({ endAngle: 360 })],
    ["barrido de más de 360°", sector({ startAngle: -10, endAngle: 400 })],
  ];

  describe.each(functions)("%s", (_, call) => {
    it.each(invalidSectors)("lanza error con %s", (__, invalid) => {
      expect(() => call(invalid)).toThrow(Error);
    });
  });
});
