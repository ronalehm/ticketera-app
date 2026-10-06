import { describe, expect, it } from "vitest";
import { getUserManagementErrorMessage, UserManagementError } from "./userManagementError";

describe("getUserManagementErrorMessage", () => {
  it.each([
    ["missing_tax_data", "Faltan datos fiscales: razón social, tipo de documento fiscal y RUC/DNI."],
    ["tax_id_taken", "Ese RUC/DNI ya está registrado."],
    ["super_admin_only", "Solo el super admin puede gestionar administradores."],
    ["self", "No puedes modificar ni eliminar tu propia cuenta."],
  ] as const)("%s → %s", (code, message) => {
    expect(getUserManagementErrorMessage(new UserManagementError(code))).toBe(message);
  });

  it("organizer_has_activity detalla eventos y pagos pendientes (singular y plural)", () => {
    expect(
      getUserManagementErrorMessage(
        new UserManagementError("organizer_has_activity", { activeEvents: 2, pendingPayouts: 1 }),
      ),
    ).toBe(
      "No se puede quitar el rol de organizador ni eliminar la cuenta: tiene 2 eventos publicados o en revisión y 1 pago pendiente. Primero devuelve a borrador o cancela esos eventos y liquida los pagos pendientes.",
    );
    expect(
      getUserManagementErrorMessage(
        new UserManagementError("organizer_has_activity", { activeEvents: 1, pendingPayouts: 0 }),
      ),
    ).toContain("tiene 1 evento publicado o en revisión. ");
  });

  it("es un Error con nombre y código", () => {
    const error = new UserManagementError("not_found");
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ name: "UserManagementError", code: "not_found" });
  });
});
