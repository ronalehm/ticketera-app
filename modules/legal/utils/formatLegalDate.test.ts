import { describe, expect, it } from "vitest";
import { formatLegalDate } from "./formatLegalDate";

describe("formatLegalDate", () => {
  it("formatea la fecha larga sin día de la semana", () => {
    expect(formatLegalDate("2026-10-01T00:00:00-05:00")).toBe("1 de octubre de 2026");
  });

  it("usa la zona America/Lima", () => {
    // 03:00 UTC del 1 de octubre son las 22:00 del 30 de septiembre en Lima.
    // Con la configuración regional es-PE, ICU escribe el mes como "setiembre".
    expect(formatLegalDate("2026-10-01T03:00:00Z")).toBe("30 de setiembre de 2026");
  });
});
