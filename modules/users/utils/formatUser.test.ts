import { describe, expect, it } from "vitest";
import { formatRegisteredUsers, formatUserDate, getUserDisplayName } from "./formatUser";

describe("getUserDisplayName", () => {
  it("usa el nombre completo o, sin nombres, el correo", () => {
    expect(getUserDisplayName({ firstName: " Ana ", lastName: "Quispe", email: "ana@example.com" })).toBe("Ana Quispe");
    expect(getUserDisplayName({ firstName: "", lastName: "", email: "nuevo@example.com" })).toBe("nuevo@example.com");
  });
});

describe("formatUserDate", () => {
  it("formatea la fecha corta en hora de Lima, sin punto en el mes", () => {
    expect(formatUserDate("2026-10-01T15:00:00Z")).toBe("1 oct 2026");
    // 02:00 UTC del 1 de septiembre = 31 de agosto en Lima.
    expect(formatUserDate("2026-09-01T02:00:00Z")).toBe("31 ago 2026");
  });
});

describe("formatRegisteredUsers", () => {
  it("singular, plural y separador de miles", () => {
    expect(formatRegisteredUsers(1)).toBe("1 usuario registrado");
    expect(formatRegisteredUsers(0)).toBe("0 usuarios registrados");
    expect(formatRegisteredUsers(1234)).toBe("1,234 usuarios registrados");
  });
});
