import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/modules/auth/server";
import { getPanelContext } from "./panel.service";

const { requirePermission, getOrganizerStatus } = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getOrganizerStatus: vi.fn(),
}));

vi.mock("@/modules/auth/server", () => ({ requirePermission, getOrganizerStatus }));

function sessionUser(role: SessionUser["role"]): SessionUser {
  return {
    id: "user-1",
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Quispe",
    phone: "999999999",
    documentType: "dni",
    documentNumber: "12345678",
    role,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    mfaVerified: true,
  };
}

describe("getPanelContext", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    getOrganizerStatus.mockReset();
  });

  it("exige el permiso con el returnTo recibido", async () => {
    requirePermission.mockResolvedValue(sessionUser("admin"));

    await getPanelContext("panel:access", { returnTo: "/organizador" });

    expect(requirePermission).toHaveBeenCalledWith("panel:access", { returnTo: "/organizador" });
  });

  it.each([
    ["approved", false],
    ["pending", true],
    ["suspended", true],
    [null, true],
  ] as const)("organizador con estado %s → readOnly %s", async (status, readOnly) => {
    const user = sessionUser("organizer");
    requirePermission.mockResolvedValue(user);
    getOrganizerStatus.mockResolvedValue(status);

    await expect(getPanelContext("events:manageOwn", { returnTo: "/organizador" })).resolves.toEqual({
      user,
      organizerStatus: status,
      readOnly,
    });
    expect(getOrganizerStatus).toHaveBeenCalledWith("user-1");
  });

  it.each(["admin", "super_admin"] as const)("%s: sin estado de organizador ni solo lectura", async (role) => {
    const user = sessionUser(role);
    requirePermission.mockResolvedValue(user);

    await expect(getPanelContext("panel:access", { returnTo: "/organizador" })).resolves.toEqual({
      user,
      organizerStatus: null,
      readOnly: false,
    });
    expect(getOrganizerStatus).not.toHaveBeenCalled();
  });

  it("propaga la redirección de requirePermission sin leer el estado", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    requirePermission.mockRejectedValue(redirectError);

    await expect(getPanelContext("users:manage", { returnTo: "/admin/usuarios" })).rejects.toBe(redirectError);
    expect(getOrganizerStatus).not.toHaveBeenCalled();
  });
});
