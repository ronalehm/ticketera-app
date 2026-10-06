import { describe, expect, it } from "vitest";
import { getPageWindow } from "./pageWindow";

describe("getPageWindow", () => {
  it.each([
    [1, 9, [1, 2, 3, 4, 5]],
    [2, 9, [1, 2, 3, 4, 5]],
    [3, 9, [1, 2, 3, 4, 5]],
    [5, 9, [3, 4, 5, 6, 7]],
    [8, 9, [5, 6, 7, 8, 9]],
    [9, 9, [5, 6, 7, 8, 9]],
    [1, 3, [1, 2, 3]],
    [2, 2, [1, 2]],
    [1, 1, [1]],
    [1, 0, [1]],
  ])("página %i de %i → %j", (page, pageCount, expected) => {
    expect(getPageWindow(page, pageCount)).toEqual(expected);
  });

  it("acota una página fuera de rango", () => {
    expect(getPageWindow(12, 9)).toEqual([5, 6, 7, 8, 9]);
    expect(getPageWindow(0, 9)).toEqual([1, 2, 3, 4, 5]);
  });
});
