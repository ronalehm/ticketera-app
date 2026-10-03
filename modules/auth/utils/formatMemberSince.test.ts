import { describe, expect, it } from "vitest";
import { formatMemberSince } from "./formatMemberSince";

describe("formatMemberSince", () => {
  it("devuelve el mes largo y el año", () => {
    expect(formatMemberSince("2025-03-14T15:00:00.000Z")).toBe("marzo de 2025");
  });

  it("usa la zona America/Lima", () => {
    expect(formatMemberSince("2026-01-01T03:00:00.000Z")).toBe("diciembre de 2025");
  });

  it('usa "setiembre" (es-PE)', () => {
    expect(formatMemberSince("2025-09-10T15:00:00.000Z")).toBe("setiembre de 2025");
  });
});
