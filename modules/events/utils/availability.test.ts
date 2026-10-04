import { describe, expect, it } from "vitest";
import { LOW_STOCK_RATIO, getAvailabilityStatus } from "./availability";

describe("getAvailabilityStatus", () => {
  it("el umbral de últimas entradas es el 20 %", () => {
    expect(LOW_STOCK_RATIO).toBe(0.2);
  });

  it.each([
    [0, 10, "sold-out"],
    [2, 10, "low-stock"],
    [3, 10, "available"],
    [0, 0, "sold-out"],
  ] as const)("(%i, %i) → %s", (available, total, expected) => {
    expect(getAvailabilityStatus(available, total)).toBe(expected);
  });
});
