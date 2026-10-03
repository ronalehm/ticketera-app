import { describe, expect, it } from "vitest";
import { formatCardExpiry, formatCardNumber, isCardExpired, isLuhnValid } from "./card";

describe("formatCardNumber", () => {
  it("agrupa 16 dígitos de 4 en 4", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("42424")).toBe("4242 4");
    expect(formatCardNumber("4242")).toBe("4242");
  });

  it("ignora guiones, espacios y letras", () => {
    expect(formatCardNumber("4242-42a42 4242b4242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("4242 4242 4242 4242")).toBe("4242 4242 4242 4242");
  });

  it("recorta a 16 dígitos", () => {
    expect(formatCardNumber("42424242424242421234")).toBe("4242 4242 4242 4242");
  });

  it("vacío o sin dígitos → vacío", () => {
    expect(formatCardNumber("")).toBe("");
    expect(formatCardNumber("abc")).toBe("");
  });
});

describe("formatCardExpiry", () => {
  it.each([
    ["1", "1"],
    ["12", "12"],
    ["122", "12/2"],
    ["1228", "12/28"],
    ["12/28", "12/28"],
    ["12/2", "12/2"],
    ["1a2b2c8", "12/28"],
    ["122899", "12/28"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(formatCardExpiry(input)).toBe(expected);
  });
});

describe("isLuhnValid", () => {
  it("acepta números que cumplen Luhn", () => {
    expect(isLuhnValid("4242424242424242")).toBe(true);
    expect(isLuhnValid("4000000000000002")).toBe(true);
  });

  it("rechaza números que no cumplen Luhn o no son dígitos", () => {
    expect(isLuhnValid("4242424242424241")).toBe(false);
    expect(isLuhnValid("")).toBe(false);
    expect(isLuhnValid("4242 4242 4242 4242")).toBe(false);
  });
});

describe("isCardExpired", () => {
  const now = new Date(2026, 9, 3); // 3 de octubre de 2026, hora local

  it("mes anterior → vencida", () => {
    expect(isCardExpired("09/26", now)).toBe(true);
  });

  it("mes actual y siguiente → vigente", () => {
    expect(isCardExpired("10/26", now)).toBe(false);
    expect(isCardExpired("11/26", now)).toBe(false);
  });

  it("vigente hasta el último día del mes", () => {
    expect(isCardExpired("10/26", new Date(2026, 9, 31, 23, 59))).toBe(false);
    expect(isCardExpired("10/26", new Date(2026, 10, 1))).toBe(true);
  });

  it("cambio de año", () => {
    const january = new Date(2027, 0, 15);
    expect(isCardExpired("12/26", january)).toBe(true);
    expect(isCardExpired("01/27", january)).toBe(false);
    expect(isCardExpired("12/27", now)).toBe(false);
    expect(isCardExpired("01/25", now)).toBe(true);
  });

  it("usa la fecha actual por defecto", () => {
    expect(isCardExpired("01/00")).toBe(true);
    expect(isCardExpired("12/99")).toBe(false);
  });
});
