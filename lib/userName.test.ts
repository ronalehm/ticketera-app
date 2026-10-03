import { describe, expect, it } from "vitest";

import { getFirstName, getFullName, getInitials } from "./userName";

describe("getInitials", () => {
  it.each([
    ["Ana", "Quispe", "AQ"],
    ["Ronald Eleazar", "Mendoza Huamán", "RM"],
    ["  luis ", "pérez", "LP"],
    ["María José", "De la Cruz", "MD"],
    ["Ángel", "Ñahui", "ÁÑ"],
    ["Ana", "", "A"],
    ["", "", ""],
  ])("(%j, %j) → %j", (firstName, lastName, expected) => {
    expect(getInitials(firstName, lastName)).toBe(expected);
  });
});

describe("getFirstName", () => {
  it.each([
    ["Ronald Eleazar", "Ronald"],
    ["  Ana  ", "Ana"],
    ["", ""],
  ])("%j → %j", (firstName, expected) => {
    expect(getFirstName(firstName)).toBe(expected);
  });
});

describe("getFullName", () => {
  it.each([
    ["Ronald Eleazar", "Mendoza Huamán", "Ronald Eleazar Mendoza Huamán"],
    [" Ana ", "", "Ana"],
  ])("(%j, %j) → %j", (firstName, lastName, expected) => {
    expect(getFullName(firstName, lastName)).toBe(expected);
  });
});
