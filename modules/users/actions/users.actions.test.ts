// @vitest-environment node
import { randomUUID } from "node:crypto";
import { DrizzleQueryError } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/modules/auth/server";
import { requirePermission } from "@/modules/auth/server";
import { deleteUser, inviteUser, listUsers, setOrganizerStatus, updateUser } from "../services/users.service";
import type { UsersPage } from "../types/users.types";
import { UserManagementError } from "../utils/userManagementError";
import {
  deleteUserAction,
  inviteUserAction,
  listUsersAction,
  setOrganizerStatusAction,
  updateUserAction,
} from "./users.actions";

vi.mock("@/modules/auth/server", () => ({ requirePermission: vi.fn() }));
vi.mock("../services/users.service", () => ({
  listUsers: vi.fn(),
  inviteUser: vi.fn(),
  updateUser: vi.fn(),
  setOrganizerStatus: vi.fn(),
  deleteUser: vi.fn(),
}));

const ADMIN: SessionUser = {
  id: "00000000-0000-8000-8000-000000000001",
  email: "admin@example.com",
  firstName: "Ada",
  lastName: "Admin",
  phone: "912345678",
  documentType: "dni",
  documentNumber: "87654321",
  role: "admin",
  createdAt: new Date("2026-10-01T00:00:00Z"),
  mfaVerified: false,
};

const TARGET_ID = randomUUID();
const PAGE: UsersPage = { items: [], total: 0, page: 1, pageSize: 8 };
const GENERIC = { ok: false, error: "No pudimos completar la solicitud. Inténtalo de nuevo." };
const VALID_UPDATE = { firstName: "Ana", lastName: "Pérez", role: "organizer" };

beforeEach(() => {
  vi.mocked(requirePermission).mockResolvedValue(ADMIN);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("todas las acciones", () => {
  const calls = [
    ["listUsersAction", () => listUsersAction({}), listUsers],
    ["inviteUserAction", () => inviteUserAction({ email: "a@b.pe", role: "organizer" }), inviteUser],
    ["updateUserAction", () => updateUserAction(TARGET_ID, VALID_UPDATE), updateUser],
    ["setOrganizerStatusAction", () => setOrganizerStatusAction(TARGET_ID, "approved"), setOrganizerStatus],
    ["deleteUserAction", () => deleteUserAction(TARGET_ID), deleteUser],
  ] as const;

  it.each(calls)("%s exige users:manage y la redirección corta antes del servicio", async (_name, run, service) => {
    vi.mocked(requirePermission).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(run()).rejects.toThrow("NEXT_REDIRECT");
    expect(requirePermission).toHaveBeenCalledWith("users:manage");
    expect(service).not.toHaveBeenCalled();
  });

  it.each(calls)("%s: un error inesperado → mensaje genérico; el log lleva solo el SQLSTATE", async (name, run, service) => {
    const cause = Object.assign(new Error("duplicate key (email)=(ana@example.com)"), { code: "23505" });
    vi.mocked(service).mockRejectedValue(new DrizzleQueryError("insert into users", ["ana@example.com"], cause));

    expect(await run()).toEqual(GENERIC);
    expect(console.error).toHaveBeenCalledWith(name, { name: "DrizzleQueryError", code: "23505" });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("ana@example.com");
  });
});

describe("listUsersAction", () => {
  it("normaliza los filtros y devuelve la página", async () => {
    vi.mocked(listUsers).mockResolvedValue(PAGE);
    expect(await listUsersAction({ q: "  ana ", pageSize: 16 })).toEqual({ ok: true, data: PAGE });
    expect(listUsers).toHaveBeenCalledWith({ q: "ana", role: "all", organizerStatus: "all", page: 1, pageSize: 16 });
  });

  it("rechaza filtros no válidos sin consultar", async () => {
    expect(await listUsersAction({ pageSize: 10 })).toMatchObject({ ok: false, fieldErrors: { pageSize: expect.any(Array) } });
    expect(await listUsersAction("todo")).toMatchObject({ ok: false });
    expect(listUsers).not.toHaveBeenCalled();
  });
});

describe("inviteUserAction", () => {
  it("invita con el actor de la sesión y el correo normalizado", async () => {
    vi.mocked(inviteUser).mockResolvedValue({ userId: TARGET_ID, outcome: "invited" });
    expect(await inviteUserAction({ email: " Ana@Example.com ", role: "organizer" })).toEqual({ ok: true, outcome: "invited" });
    expect(inviteUser).toHaveBeenCalledWith(ADMIN, { email: "ana@example.com", role: "organizer" });
  });

  it("entrada no válida → mensaje y errores por campo", async () => {
    expect(await inviteUserAction({ email: "no", role: "customer" })).toEqual({
      ok: false,
      error: "Ingresa un correo electrónico válido",
      fieldErrors: { email: ["Ingresa un correo electrónico válido"], role: ["Elige el rol: organizador o administrador"] },
    });
    expect(inviteUser).not.toHaveBeenCalled();
  });

  it("objetivo protegido → mensaje de dominio", async () => {
    vi.mocked(inviteUser).mockRejectedValue(new UserManagementError("protected"));
    expect(await inviteUserAction({ email: "root@example.com", role: "organizer" })).toEqual({
      ok: false,
      error: "Esta cuenta está protegida: no se puede modificar ni eliminar.",
      code: "protected",
    });
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("updateUserAction", () => {
  it("edita con el actor, el id y la entrada normalizada", async () => {
    vi.mocked(updateUser).mockResolvedValue();
    expect(
      await updateUserAction(TARGET_ID, { ...VALID_UPDATE, organizer: { legalName: " Pulso ", taxIdType: "ruc", taxId: "" } }),
    ).toEqual({ ok: true });
    expect(updateUser).toHaveBeenCalledWith(ADMIN, TARGET_ID, {
      ...VALID_UPDATE,
      organizer: { legalName: "Pulso", taxIdType: "ruc", taxId: null },
    });
  });

  it("id no válido → error sin consultar", async () => {
    expect(await updateUserAction("1", VALID_UPDATE)).toEqual({ ok: false, error: "Usuario no válido" });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("aprobar sin datos fiscales → errores por campo anidado", async () => {
    const result = await updateUserAction(TARGET_ID, { ...VALID_UPDATE, organizer: { status: "approved" } });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        "organizer.legalName": ["Ingresa la razón social para aprobar"],
        "organizer.taxIdType": ["Elige el tipo de documento fiscal para aprobar"],
        "organizer.taxId": ["Ingresa el RUC o DNI para aprobar"],
      },
    });
  });

  it.each([
    [
      "missing_tax_data",
      { ok: false, error: "Faltan datos fiscales: razón social, tipo de documento fiscal y RUC/DNI.", code: "missing_tax_data" },
    ],
    [
      "tax_id_taken",
      {
        ok: false,
        error: "Ese RUC/DNI ya está registrado.",
        code: "tax_id_taken",
        fieldErrors: { "organizer.taxId": ["Ese RUC/DNI ya está registrado."] },
      },
    ],
    [
      "conflict",
      { ok: false, error: "El usuario cambió mientras procesábamos la solicitud. Inténtalo de nuevo.", code: "conflict" },
    ],
  ] as const)("%s → mensaje claro", async (code, expected) => {
    vi.mocked(updateUser).mockRejectedValue(new UserManagementError(code));
    expect(await updateUserAction(TARGET_ID, VALID_UPDATE)).toEqual(expected);
  });

  it("quitar el rol organizer con actividad → qué resolver", async () => {
    vi.mocked(updateUser).mockRejectedValue(
      new UserManagementError("organizer_has_activity", { activeEvents: 1, pendingPayouts: 2 }),
    );
    const result = await updateUserAction(TARGET_ID, { ...VALID_UPDATE, role: "customer" });
    expect(result).toMatchObject({
      ok: false,
      code: "organizer_has_activity",
      error: expect.stringContaining("1 evento publicado o en revisión y 2 pagos pendientes"),
    });
  });
});

describe("setOrganizerStatusAction", () => {
  it("cambia el estado", async () => {
    vi.mocked(setOrganizerStatus).mockResolvedValue();
    expect(await setOrganizerStatusAction(TARGET_ID, "suspended")).toEqual({ ok: true });
    expect(setOrganizerStatus).toHaveBeenCalledWith(ADMIN, TARGET_ID, "suspended");
  });

  it("estado desconocido → error sin consultar", async () => {
    expect(await setOrganizerStatusAction(TARGET_ID, "rejected")).toMatchObject({ ok: false });
    expect(setOrganizerStatus).not.toHaveBeenCalled();
  });
});

describe("deleteUserAction", () => {
  it("elimina", async () => {
    vi.mocked(deleteUser).mockResolvedValue();
    expect(await deleteUserAction(TARGET_ID)).toEqual({ ok: true });
    expect(deleteUser).toHaveBeenCalledWith(ADMIN, TARGET_ID);
  });

  it("si Clerk falla → mensaje para reintentar", async () => {
    vi.mocked(deleteUser).mockRejectedValue(new UserManagementError("clerk_unavailable"));
    expect(await deleteUserAction(TARGET_ID)).toEqual({
      ok: false,
      error: "No pudimos conectar con el servicio de cuentas. Inténtalo de nuevo.",
      code: "clerk_unavailable",
    });
  });

  it("usuario ya eliminado por otro admin → not_found (el cliente recarga el listado)", async () => {
    vi.mocked(deleteUser).mockRejectedValue(new UserManagementError("not_found"));
    expect(await deleteUserAction(TARGET_ID)).toEqual({
      ok: false,
      error: "El usuario no existe o ya fue eliminado.",
      code: "not_found",
    });
  });
});
