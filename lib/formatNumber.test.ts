import { describe, expect, it } from "vitest";

import { formatCount } from "./formatNumber";

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [8146, "8,146"],
    [1234567, "1,234,567"],
  ])("%d → %s (es-PE)", (value, expected) => {
    expect(formatCount(value)).toBe(expected);
  });
});
