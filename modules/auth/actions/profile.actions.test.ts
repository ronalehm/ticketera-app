// @vitest-environment node
import { DrizzleQueryError } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionUser } from "../services/session.service";
import { completeProfile } from "../services/users.service";
import type { SessionUser } from "../types/auth.types";
import { can } from "../utils/can";
import { completeProfileAction } from "./profile.actions";

vi.mock("../services/session.service", () => ({ getSessionUser: vi.fn() }));
vi.mock("../services/users.service", () => ({ completeProfile: vi.fn() }));
vi.mock("../utils/can", () => ({ can: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const USER: SessionUser = {
  id: "00000000-0000-8000-8000-000000000001",
  email: "ana@example.com",
  firstName: "Ana",
  lastName: "Pérez",
  phone: null,
  documentType: null,
  documentNumber: null,
  role: "customer",
  createdAt: new Date("2026-10-01T00:00:00Z"),
  mfaVerified: false,
};

const INPUT = {
  phone: "912345678",
  documentType: "dni",
  documentNumber: "87654321",
  acceptTerms: true,
  marketingOptIn: false,
};

const GENERIC_ERROR = { error: "No pudimos completar la solicitud. Inténtalo de nuevo." };

function mockHeaders(values: Record<string, string>) {
  vi.mocked(headers).mockResolvedValue(new Headers(values) as Awaited<ReturnType<typeof headers>>);
}

beforeEach(() => {
  vi.mocked(getSessionUser).mockResolvedValue(USER);
  vi.mocked(can).mockReturnValue(true);
  vi.mocked(completeProfile).mockResolvedValue();
  mockHeaders({ "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "Vitest" });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("completeProfileAction", () => {
  it("sin sesión → error y no guarda nada", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect(await completeProfileAction(INPUT, "/mis-entradas")).toEqual({ error: "Inicia sesión para continuar" });
    expect(completeProfile).not.toHaveBeenCalled();
  });

  it("sin permiso (can → false) → error y no guarda nada", async () => {
    vi.mocked(can).mockReturnValue(false);
    expect(await completeProfileAction(INPUT, "/mis-entradas")).toEqual({ error: "No tienes permiso para esta acción" });
    expect(can).toHaveBeenCalledWith(USER, "profile:update");
    expect(completeProfile).not.toHaveBeenCalled();
  });

  it("input inválido → mensaje del primer issue", async () => {
    const result = await completeProfileAction({ ...INPUT, phone: "812345678" }, null);
    expect(result).toEqual({ error: "Ingresa un celular válido de 9 dígitos que empiece con 9" });
    expect(completeProfile).not.toHaveBeenCalled();
  });

  it("guarda con la primera IP de x-forwarded-for y el user-agent", async () => {
    await completeProfileAction(INPUT, null);
    expect(completeProfile).toHaveBeenCalledWith(USER.id, INPUT, { ip: "203.0.113.7", userAgent: "Vitest" });
  });

  it.each(["no-es-una-ip", ""])("x-forwarded-for inválido (%j) → ip null", async (forwardedFor) => {
    mockHeaders({ "x-forwarded-for": forwardedFor });
    await completeProfileAction(INPUT, null);
    expect(completeProfile).toHaveBeenCalledWith(USER.id, INPUT, { ip: null, userAgent: null });
  });

  it("fallo de BD → mensaje genérico; el log lleva el SQLSTATE y nunca el input, la query ni los params", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = Object.assign(new Error(`duplicate key: Key (document_number)=(${INPUT.documentNumber})`), {
      code: "23505",
    });
    vi.mocked(completeProfile).mockRejectedValue(
      new DrizzleQueryError("update users set phone = $1, document_number = $2", [INPUT.phone, INPUT.documentNumber], cause),
    );

    expect(await completeProfileAction(INPUT, "/mis-entradas")).toEqual(GENERIC_ERROR);
    expect(consoleError).toHaveBeenCalledWith("completeProfileAction", { name: "DrizzleQueryError", code: "23505" });
    const logged = JSON.stringify(consoleError.mock.calls);
    for (const value of [INPUT.phone, INPUT.documentNumber, "update users"]) expect(logged).not.toContain(value);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("error propio de la app → mensaje genérico y el log lleva su mensaje", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(completeProfile).mockRejectedValue(new Error('No hay una versión publicada de "terms"'));

    expect(await completeProfileAction(INPUT, null)).toEqual(GENERIC_ERROR);
    expect(consoleError).toHaveBeenCalledWith("completeProfileAction", {
      name: "Error",
      message: 'No hay una versión publicada de "terms"',
    });
  });

  it.each([
    ["/mis-entradas?page=2", "/mis-entradas?page=2"],
    ["//evil.com", "/perfil"],
    [null, "/perfil"],
    [["/mis-entradas"], "/perfil"],
  ])("éxito → redirect(getSafeRedirect(%j))", async (redirectUrl, expected) => {
    await completeProfileAction(INPUT, redirectUrl);
    expect(redirect).toHaveBeenCalledWith(expected);
  });
});
