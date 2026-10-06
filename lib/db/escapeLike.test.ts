import { describe, expect, it } from "vitest";

import { escapeLike } from "./escapeLike";

describe("escapeLike", () => {
  it.each([
    ["50%off", "50\\%off"],
    ["a_b", "a\\_b"],
    ["c\\d", "c\\\\d"],
    ["%_\\", "\\%\\_\\\\"],
    ["ana pérez", "ana pérez"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(escapeLike(input)).toBe(expected);
  });
});
