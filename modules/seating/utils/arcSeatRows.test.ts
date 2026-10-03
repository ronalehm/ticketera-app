import { describe, expect, it } from "vitest";
import { hashString, mixHash } from "@/lib/hash";
import { seatRowSchema } from "../schemas/seating.schema";
import type { SeatRow } from "../types/seating.types";
import { type AnnularSector, isPointInAnnularSector } from "./annularSector";
import { ARC_EDGE_PADDING, ARC_PLAN_MARGIN, generateArcSeatRows, getRowEdgeLabelPoints } from "./arcSeatRows";
import { formatSeatId } from "./seatIds";
import { getGeneratedSeatStatus, SEAT_PITCH } from "./seatRows";

const ROWS_A_TO_J = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const SEAT_RADIUS = 12;

/** Sector de referencia de "Tribuna Oriente" (requisito 7). */
const ORIENTE: AnnularSector = { cx: 300, cy: 54, innerRadius: 102, outerRadius: 268, startAngle: -10, endAngle: 30 };
const OCCIDENTE: AnnularSector = { ...ORIENTE, startAngle: 150, endAngle: 190 };

const ORIENTE_SPEC = {
  zoneId: "oriente",
  sector: ORIENTE,
  scale: 1.95,
  rowLabels: ROWS_A_TO_J,
  occupiedRatio: 0.45,
  accessibleSeats: ["oriente-J-1", "oriente-J-10"],
};

function allSeats(result: { rows: SeatRow[] }) {
  return result.rows.flatMap((row) => row.seats);
}

function viewBoxSize(seatViewBox: string) {
  const [, , width, height] = seatViewBox.split(" ").map(Number);
  return { width, height };
}

/** Sector en coordenadas del plano: centro y radios × `scale` + (`x`, `y`). */
function planSector(sector: AnnularSector, transform: { scale: number; x: number; y: number }): AnnularSector {
  return {
    ...sector,
    cx: sector.cx * transform.scale + transform.x,
    cy: sector.cy * transform.scale + transform.y,
    innerRadius: sector.innerRadius * transform.scale,
    outerRadius: sector.outerRadius * transform.scale,
  };
}

/** Ángulo en grados del punto respecto al centro, normalizado a [inicio, inicio + 360). */
function angleOf(point: { x: number; y: number }, sector: AnnularSector): number {
  const angle = (Math.atan2(point.y - sector.cy, point.x - sector.cx) * 180) / Math.PI;
  return sector.startAngle + ((((angle - sector.startAngle) % 360) + 360) % 360);
}

describe("generateArcSeatRows", () => {
  it("con el sector de Oriente genera las filas A–J con 4, 4, 5, 6, 6, 7, 8, 9, 9 y 10 butacas", () => {
    const result = generateArcSeatRows(ORIENTE_SPEC);

    expect(result.rows.map((row) => row.label)).toEqual(ROWS_A_TO_J);
    expect(result.rows.map((row) => row.seats.length)).toEqual([4, 4, 5, 6, 6, 7, 8, 9, 9, 10]);
  });

  it("las filas exteriores tienen al menos tantas butacas como las interiores", () => {
    const counts = generateArcSeatRows(ORIENTE_SPEC).rows.map((row) => row.seats.length);

    counts.slice(1).forEach((count, index) => expect(count).toBeGreaterThanOrEqual(counts[index]));
  });

  it("numera de 1 a n por ángulo creciente, con ids de formatSeatId y filas válidas para el schema", () => {
    for (const sector of [ORIENTE, OCCIDENTE]) {
      const zoneId = sector === ORIENTE ? "oriente" : "occidente";
      const result = generateArcSeatRows({ ...ORIENTE_SPEC, zoneId, sector, accessibleSeats: [] });
      const plan = planSector(sector, result.planTransform);

      for (const row of result.rows) {
        expect(row.seats.map((seat) => seat.number)).toEqual(row.seats.map((_, index) => index + 1));
        expect(row.seats.map((seat) => seat.id)).toEqual(row.seats.map((seat) => formatSeatId(zoneId, row.label, seat.number)));
        expect(row.seats.every((seat) => seat.row === row.label)).toBe(true);
        const angles = row.seats.map((seat) => angleOf(seat, plan));
        angles.slice(1).forEach((angle, index) => expect(angle).toBeGreaterThan(angles[index]));
        expect(seatRowSchema.safeParse(row).success).toBe(true);
      }
    }
  });

  it("en Oriente la butaca 1 queda arriba y en Occidente abajo", () => {
    const oriente = generateArcSeatRows(ORIENTE_SPEC).rows[0].seats;
    const occidente = generateArcSeatRows({ ...ORIENTE_SPEC, zoneId: "occidente", sector: OCCIDENTE, accessibleSeats: [] })
      .rows[0].seats;

    expect(oriente[0].y).toBeLessThan(oriente[oriente.length - 1].y);
    expect(occidente[0].y).toBeGreaterThan(occidente[occidente.length - 1].y);
  });

  it("el seatViewBox mide ≤ 400 de ancho y encierra la caja del sector escalado con 24 de margen", () => {
    const result = generateArcSeatRows(ORIENTE_SPEC);
    const { width, height } = viewBoxSize(result.seatViewBox);

    expect(ARC_PLAN_MARGIN).toBe(24);
    expect(width).toBeLessThanOrEqual(400);
    expect(result.seatViewBox).toBe("0 0 399 401");
    // Caja del sector escalado: x desde el radio interior en 30° hasta el exterior en 0°; y entre −10° y 30°.
    const minX = 300 * 1.95 + 102 * 1.95 * Math.cos(Math.PI / 6);
    expect(result.planTransform.x).toBeCloseTo(ARC_PLAN_MARGIN - minX, 9);
    expect(width).toBe(Math.ceil(300 * 1.95 + 268 * 1.95 - minX + 2 * ARC_PLAN_MARGIN));
    expect(height).toBeGreaterThan(0);
  });

  it("devuelve un planTransform coherente: el centro del plano es cx·s + x, cy·s + y", () => {
    const result = generateArcSeatRows(ORIENTE_SPEC);
    const { scale, x, y } = result.planTransform;
    const center = { x: ORIENTE.cx * scale + x, y: ORIENTE.cy * scale + y };

    expect(scale).toBe(1.95);
    // La fila A está a radio s·interior + holgura/2 + 16 del centro del plano.
    const band = 1.95 * (268 - 102);
    const expectedRadius = 1.95 * 102 + (band - 10 * SEAT_PITCH) / 2 + SEAT_PITCH / 2;
    for (const seat of result.rows[0].seats) {
      expect(Math.hypot(seat.x - center.x, seat.y - center.y)).toBeCloseTo(expectedRadius, 1);
    }
  });

  it("separa las filas 1 pitch y las butacas contiguas 1 pitch en arco, centradas en el ángulo medio", () => {
    const result = generateArcSeatRows(ORIENTE_SPEC);
    const plan = planSector(ORIENTE, result.planTransform);
    const center = { x: plan.cx, y: plan.cy };
    const radiusOf = (seat: { x: number; y: number }) => Math.hypot(seat.x - center.x, seat.y - center.y);

    result.rows.slice(1).forEach((row, index) => {
      expect(radiusOf(row.seats[0]) - radiusOf(result.rows[index].seats[0])).toBeCloseTo(SEAT_PITCH, 1);
    });
    for (const row of result.rows) {
      const angles = row.seats.map((seat) => angleOf(seat, plan));
      const meanAngle = (angles[0] + angles[angles.length - 1]) / 2;
      expect(meanAngle).toBeCloseTo((ORIENTE.startAngle + ORIENTE.endAngle) / 2, 1);
      const arcStep = ((angles[1] - angles[0]) * Math.PI * radiusOf(row.seats[0])) / 180;
      expect(arcStep).toBeCloseTo(SEAT_PITCH, 1);
    }
  });

  it("coloca todas las butacas, con su radio de 12, dentro de la banda del sector del plano", () => {
    for (const sector of [ORIENTE, OCCIDENTE]) {
      const result = generateArcSeatRows({ ...ORIENTE_SPEC, zoneId: "zona", sector, accessibleSeats: [] });
      const plan = planSector(sector, result.planTransform);
      const inner = { ...plan, innerRadius: plan.innerRadius + SEAT_RADIUS, outerRadius: plan.outerRadius - SEAT_RADIUS };

      for (const seat of allSeats(result)) {
        expect(isPointInAnnularSector(seat, inner), seat.id).toBe(true);
        const radius = Math.hypot(seat.x - plan.cx, seat.y - plan.cy);
        // Distancia en arco al borde radial más cercano ≥ radio de la butaca + ARC_EDGE_PADDING.
        const angle = angleOf(seat, plan);
        const edgeDistance = (Math.min(angle - plan.startAngle, plan.endAngle - angle) * Math.PI * radius) / 180;
        expect(edgeDistance, seat.id).toBeGreaterThanOrEqual(SEAT_RADIUS + ARC_EDGE_PADDING - 0.01);
      }
    }
  });

  it("redondea x/y a 2 decimales", () => {
    for (const seat of allSeats(generateArcSeatRows(ORIENTE_SPEC))) {
      expect(seat.x).toBe(Number(seat.x.toFixed(2)));
      expect(seat.y).toBe(Number(seat.y.toFixed(2)));
    }
  });

  it("es determinista: las mismas entradas dan el mismo resultado", () => {
    expect(generateArcSeatRows(ORIENTE_SPEC)).toEqual(generateArcSeatRows(ORIENTE_SPEC));
  });

  it("con occupiedRatio 0 no hay ocupadas y con 1 están todas ocupadas", () => {
    const none = generateArcSeatRows({ ...ORIENTE_SPEC, occupiedRatio: 0, accessibleSeats: [] });
    const all = generateArcSeatRows({ ...ORIENTE_SPEC, occupiedRatio: 1 });

    expect(allSeats(none).every((seat) => seat.status === "available")).toBe(true);
    expect(allSeats(all).every((seat) => seat.status === "occupied")).toBe(true);
  });

  it("aplica la regla de getGeneratedSeatStatus: ocupada si y solo si mixHash(hashString(id)) / 2³² < occupiedRatio", () => {
    const result = generateArcSeatRows(ORIENTE_SPEC);
    const accessible = new Set(ORIENTE_SPEC.accessibleSeats);

    for (const seat of allSeats(result)) {
      const occupied = mixHash(hashString(seat.id)) / 2 ** 32 < ORIENTE_SPEC.occupiedRatio;
      expect(seat.status === "occupied", seat.id).toBe(occupied);
      expect(seat.status, seat.id).toBe(getGeneratedSeatStatus(seat.id, ORIENTE_SPEC.occupiedRatio, accessible));
    }
  });

  it("marca como accesibles las butacas indicadas solo si no están ocupadas", () => {
    const accessibleSeats = ["oriente-J-1", "oriente-J-10"];
    const free = generateArcSeatRows({ ...ORIENTE_SPEC, occupiedRatio: 0, accessibleSeats });
    const full = generateArcSeatRows({ ...ORIENTE_SPEC, occupiedRatio: 1, accessibleSeats });
    const statusOf = (result: typeof free, id: string) => allSeats(result).find((seat) => seat.id === id)?.status;

    expect(accessibleSeats.map((id) => statusOf(free, id))).toEqual(["accessible", "accessible"]);
    expect(allSeats(free).filter((seat) => seat.status === "accessible")).toHaveLength(2);
    expect(accessibleSeats.map((id) => statusOf(full, id))).toEqual(["occupied", "occupied"]);
  });

  it("lanza un error si las filas no caben en la banda", () => {
    // Banda de 1.95 × 166 = 323.7: caben 10 filas de 32, no 11.
    expect(() => generateArcSeatRows({ ...ORIENTE_SPEC, rowLabels: [...ROWS_A_TO_J, "K"], accessibleSeats: [] })).toThrow(Error);
  });

  it("lanza un error si una fila queda con menos de 2 butacas", () => {
    const narrow: AnnularSector = { ...ORIENTE, startAngle: 0, endAngle: 10 };

    expect(() => generateArcSeatRows({ ...ORIENTE_SPEC, sector: narrow, accessibleSeats: [] })).toThrow(Error);
  });

  it("lanza un error si una butaca accesible no existe", () => {
    expect(() => generateArcSeatRows({ ...ORIENTE_SPEC, accessibleSeats: ["oriente-A-5"] })).toThrow(Error);
    expect(() => generateArcSeatRows({ ...ORIENTE_SPEC, accessibleSeats: ["occidente-J-1"] })).toThrow(Error);
  });
});

describe("getRowEdgeLabelPoints", () => {
  it("devuelve puntos a 0.8 pitch por fuera de la 1.ª y de la última butaca, en la dirección de la cuerda", () => {
    for (const row of generateArcSeatRows(ORIENTE_SPEC).rows) {
      const { seats } = row;
      const [first, second] = seats;
      const [penultimate, last] = seats.slice(-2);
      const { start, end } = getRowEdgeLabelPoints(row);

      expect(Math.hypot(start.x - first.x, start.y - first.y)).toBeCloseTo(0.8 * SEAT_PITCH, 9);
      expect(Math.hypot(end.x - last.x, end.y - last.y)).toBeCloseTo(0.8 * SEAT_PITCH, 9);
      // Colineales con la cuerda y por fuera: start − 1.ª tiene el sentido de 1.ª − 2.ª.
      const startScale = 0.8 * SEAT_PITCH / Math.hypot(first.x - second.x, first.y - second.y);
      expect(start.x).toBeCloseTo(first.x + (first.x - second.x) * startScale, 9);
      expect(start.y).toBeCloseTo(first.y + (first.y - second.y) * startScale, 9);
      const endScale = 0.8 * SEAT_PITCH / Math.hypot(last.x - penultimate.x, last.y - penultimate.y);
      expect(end.x).toBeCloseTo(last.x + (last.x - penultimate.x) * endScale, 9);
      expect(end.y).toBeCloseTo(last.y + (last.y - penultimate.y) * endScale, 9);
    }
  });

  it("funciona con filas rectas", () => {
    const row: SeatRow = {
      label: "A",
      seats: [
        { id: "z-A-1", row: "A", number: 1, x: 100, y: 50, status: "available" },
        { id: "z-A-2", row: "A", number: 2, x: 132, y: 50, status: "available" },
        { id: "z-A-3", row: "A", number: 3, x: 164, y: 50, status: "available" },
      ],
    };

    const { start, end } = getRowEdgeLabelPoints(row);
    expect(start.x).toBeCloseTo(74.4, 9);
    expect(start.y).toBeCloseTo(50, 9);
    expect(end.x).toBeCloseTo(189.6, 9);
    expect(end.y).toBeCloseTo(50, 9);
  });

  it("lanza un error con menos de 2 butacas", () => {
    const row: SeatRow = { label: "A", seats: [{ id: "z-A-1", row: "A", number: 1, x: 0, y: 0, status: "available" }] };

    expect(() => getRowEdgeLabelPoints(row)).toThrow(Error);
  });
});
