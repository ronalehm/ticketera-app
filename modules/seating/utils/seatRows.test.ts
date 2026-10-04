import { describe, expect, it } from "vitest";
import { hashString, mixHash } from "@/lib/hash";
import { seatRowSchema } from "../schemas/seating.schema";
import { generateSeatRows, SEAT_PITCH, SEAT_PLAN_MARGIN } from "./seatRows";

const ROWS_A_TO_H = ["A", "B", "C", "D", "E", "F", "G", "H"];

function allSeats(result: ReturnType<typeof generateSeatRows>) {
  return result.rows.flatMap((row) => row.seats);
}

describe("generateSeatRows", () => {
  it("genera una fila por etiqueta, en orden, con el número de asientos pedido", () => {
    const result = generateSeatRows({ zoneId: "norte", rowLabels: ROWS_A_TO_H, seatsPerRow: 10, occupiedRatio: 0 });

    expect(result.rows.map((row) => row.label)).toEqual(ROWS_A_TO_H);
    expect(result.rows.every((row) => row.seats.length === 10)).toBe(true);
    expect(allSeats(result)).toHaveLength(80);
  });

  it("acepta un número de asientos por fila", () => {
    const result = generateSeatRows({ zoneId: "platea", rowLabels: ["A", "B", "C"], seatsPerRow: [8, 9, 10], occupiedRatio: 0 });

    expect(result.rows.map((row) => row.seats.length)).toEqual([8, 9, 10]);
  });

  it("lanza un error si seatsPerRow no tiene un valor por fila", () => {
    expect(() =>
      generateSeatRows({ zoneId: "platea", rowLabels: ["A", "B"], seatsPerRow: [8], occupiedRatio: 0 }),
    ).toThrow(Error);
  });

  it("numera de 1 a n de izquierda a derecha con ids <zona>-<fila>-<número>", () => {
    const result = generateSeatRows({ zoneId: "platea-baja", rowLabels: ["A", "AA"], seatsPerRow: 4, occupiedRatio: 0 });

    for (const row of result.rows) {
      expect(row.seats.map((seat) => seat.number)).toEqual([1, 2, 3, 4]);
      expect(row.seats.map((seat) => seat.id)).toEqual([1, 2, 3, 4].map((n) => `platea-baja-${row.label}-${n}`));
      expect(row.seats.every((seat) => seat.row === row.label)).toBe(true);
      const xs = row.seats.map((seat) => seat.x);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
      expect(seatRowSchema.safeParse(row).success).toBe(true);
    }
  });

  it("coloca los centros según la geometría y centra las filas cortas", () => {
    const result = generateSeatRows({ zoneId: "platea", rowLabels: ["A", "B"], seatsPerRow: [8, 10], occupiedRatio: 0 });
    const [short, full] = result.rows;

    expect(full.seats.map((seat) => seat.x)).toEqual([56, 88, 120, 152, 184, 216, 248, 280, 312, 344]);
    // 40 + (10 − 8)·16 + i·32 + 16
    expect(short.seats.map((seat) => seat.x)).toEqual([88, 120, 152, 184, 216, 248, 280, 312]);
    expect(short.seats.every((seat) => seat.y === 88)).toBe(true);
    expect(full.seats.every((seat) => seat.y === 120)).toBe(true);

    const center = (row: typeof short) => (row.seats[0].x + row.seats[row.seats.length - 1].x) / 2;
    expect(center(short)).toBe(center(full));
  });

  it("calcula el seatViewBox con la fórmula de márgenes y pitch", () => {
    const result = generateSeatRows({ zoneId: "norte", rowLabels: ROWS_A_TO_H, seatsPerRow: [6, 10, 8, 8, 8, 8, 8, 8], occupiedRatio: 0 });

    expect(SEAT_PITCH).toBe(32);
    expect(SEAT_PLAN_MARGIN).toEqual({ x: 40, top: 72, bottom: 24 });
    // (2·40 + 10·32) × (72 + 8·32 + 24)
    expect(result.seatViewBox).toBe("0 0 400 352");
  });

  it("es determinista: las mismas entradas dan el mismo resultado", () => {
    const spec = { zoneId: "norte", rowLabels: ROWS_A_TO_H, seatsPerRow: 10, occupiedRatio: 0.3, accessibleSeats: ["norte-H-1"] };

    expect(generateSeatRows(spec)).toEqual(generateSeatRows(spec));
  });

  it("con occupiedRatio 0 no hay ocupados y con 1 están todos ocupados", () => {
    const none = generateSeatRows({ zoneId: "norte", rowLabels: ROWS_A_TO_H, seatsPerRow: 10, occupiedRatio: 0 });
    const all = generateSeatRows({ zoneId: "norte", rowLabels: ROWS_A_TO_H, seatsPerRow: 10, occupiedRatio: 1 });

    expect(allSeats(none).every((seat) => seat.status === "available")).toBe(true);
    expect(allSeats(all).every((seat) => seat.status === "occupied")).toBe(true);
  });

  it("con 0.3 sobre 100 asientos deja entre 15 y 45 ocupados", () => {
    const rowLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const result = generateSeatRows({ zoneId: "norte", rowLabels, seatsPerRow: 10, occupiedRatio: 0.3 });
    const occupied = allSeats(result).filter((seat) => seat.status === "occupied").length;

    expect(allSeats(result)).toHaveLength(100);
    expect(occupied).toBeGreaterThanOrEqual(15);
    expect(occupied).toBeLessThanOrEqual(45);
  });

  it("ocupa un asiento si y solo si mixHash(hashString(id)) / 2³² < occupiedRatio", () => {
    const result = generateSeatRows({ zoneId: "norte", rowLabels: ROWS_A_TO_H, seatsPerRow: 10, occupiedRatio: 0.3 });

    for (const seat of allSeats(result)) {
      const occupied = mixHash(hashString(seat.id)) / 2 ** 32 < 0.3;
      expect(seat.status === "occupied", seat.id).toBe(occupied);
    }
  });

  it("marca como accesibles los asientos indicados solo si no están ocupados", () => {
    const accessibleSeats = ["norte-H-1", "norte-H-10"];
    const free = generateSeatRows({ zoneId: "norte", rowLabels: ROWS_A_TO_H, seatsPerRow: 10, occupiedRatio: 0, accessibleSeats });
    const full = generateSeatRows({ zoneId: "norte", rowLabels: ROWS_A_TO_H, seatsPerRow: 10, occupiedRatio: 1, accessibleSeats });

    const statusOf = (result: typeof free, id: string) => allSeats(result).find((seat) => seat.id === id)?.status;
    expect(accessibleSeats.map((id) => statusOf(free, id))).toEqual(["accessible", "accessible"]);
    expect(allSeats(free).filter((seat) => seat.status === "accessible")).toHaveLength(2);
    expect(accessibleSeats.map((id) => statusOf(full, id))).toEqual(["occupied", "occupied"]);
  });

  it("lanza un error si un asiento accesible no existe", () => {
    expect(() =>
      generateSeatRows({ zoneId: "norte", rowLabels: ["A"], seatsPerRow: 10, occupiedRatio: 0, accessibleSeats: ["norte-A-11"] }),
    ).toThrow(Error);
    expect(() =>
      generateSeatRows({ zoneId: "norte", rowLabels: ["A"], seatsPerRow: 10, occupiedRatio: 0, accessibleSeats: ["sur-A-1"] }),
    ).toThrow(Error);
  });
});
