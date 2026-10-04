import { describe, expect, it } from "vitest";

import { hashString, mixHash } from "./hash";

const UINT32_RANGE = 2 ** 32;
const SAMPLES = ["", "a", "foobar", "norte-A-1", "MT-AB12CD-01", "Noche de sintetizadores|2026-11-14T21:00:00-05:00", "ñandú"];

const isUint32 = (value: number) => Number.isInteger(value) && value >= 0 && value < UINT32_RANGE;

describe("hashString", () => {
  it("da los valores de prueba oficiales de FNV-1a de 32 bits", () => {
    expect(hashString("")).toBe(0x811c9dc5);
    expect(hashString("")).toBe(2166136261);
    expect(hashString("a")).toBe(0xe40c292c);
    expect(hashString("foobar")).toBe(0xbf9cf968);
  });

  it("devuelve enteros sin signo en [0, 2³²) y es determinista", () => {
    for (const value of SAMPLES) {
      expect(isUint32(hashString(value))).toBe(true);
      expect(hashString(value)).toBe(hashString(value));
    }
  });
});

describe("mixHash", () => {
  it("da los valores conocidos del finalizador fmix32", () => {
    expect(mixHash(0)).toBe(0);
    expect(mixHash(1)).toBe(0x514e28b7);
  });

  it("devuelve enteros sin signo en [0, 2³²) y es determinista", () => {
    const inputs = [0, 1, 0x7fffffff, 0x80000000, 0xffffffff, ...SAMPLES.map(hashString)];

    for (const value of inputs) {
      expect(isUint32(mixHash(value))).toBe(true);
      expect(mixHash(value)).toBe(mixHash(value));
    }
  });

  it("reparte ids consecutivos que FNV-1a deja agrupados", () => {
    const ids = Array.from({ length: 10 }, (_, index) => `norte-A-${index + 1}`);
    const raw = ids.map((id) => hashString(id) / UINT32_RANGE);
    const mixed = ids.map((id) => mixHash(hashString(id)) / UINT32_RANGE);

    expect(raw.filter((value) => value >= 0.17 && value <= 0.23)).toHaveLength(9);
    expect(mixed.some((value) => value < 0.25)).toBe(true);
    expect(mixed.some((value) => value > 0.75)).toBe(true);
  });
});
