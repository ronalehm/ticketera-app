import { describe, expect, it } from "vitest";
import { LOW_STOCK_RATIO, getAvailabilityStatus } from "./availability";

describe("getAvailabilityStatus", () => {
  it("el umbral de últimas entradas es el 10 %", () => {
    expect(LOW_STOCK_RATIO).toBe(0.1);
  });

  it.each([
    [10, 100, "low-stock"],
    [11, 100, "available"],
    [0, 100, "sold-out"],
    [1, 10, "low-stock"],
    [2, 10, "available"],
    [7, 70, "low-stock"],
    [0, 0, "sold-out"],
  ] as const)("(%i, %i) → %s", (available, total, expected) => {
    expect(getAvailabilityStatus(available, total)).toBe(expected);
  });
});
