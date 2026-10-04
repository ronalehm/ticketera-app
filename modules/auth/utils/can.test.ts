import { describe, expect, it } from "vitest";
import type { SessionUser } from "../types/auth.types";
import { can, isMfaPending, MFA_ENFORCED } from "./can";

function user(role: SessionUser["role"], mfaVerified: boolean): SessionUser {
  return {
    id: "00000000-0000-8000-8000-000000000001",
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Pérez",
    phone: null,
    documentType: null,
    documentNumber: null,
    role,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    mfaVerified,
  };
}

const ROLES = ["customer", "organizer", "admin", "super_admin"] as const;

it("el MFA está diferido (MFA_ENFORCED = false)", () => {
  expect(MFA_ENFORCED).toBe(false);
});

describe("can('profile:update') con el MFA diferido", () => {
  it("sin sesión → false", () => {
    expect(can(null, "profile:update")).toBe(false);
  });

  it.each(ROLES)("%s → true, con o sin segundo factor", (role) => {
    expect(can(user(role, false), "profile:update")).toBe(true);
    expect(can(user(role, true), "profile:update")).toBe(true);
  });
});

describe("can('profile:update') con la exigencia activada", () => {
  it("sin sesión → false", () => {
    expect(can(null, "profile:update", true)).toBe(false);
  });

  it.each(["customer", "organizer"] as const)("%s → true, con o sin segundo factor", (role) => {
    expect(can(user(role, false), "profile:update", true)).toBe(true);
    expect(can(user(role, true), "profile:update", true)).toBe(true);
  });

  it.each(["admin", "super_admin"] as const)("%s → true con segundo factor y false sin él", (role) => {
    expect(can(user(role, true), "profile:update", true)).toBe(true);
    expect(can(user(role, false), "profile:update", true)).toBe(false);
  });
});

describe("isMfaPending", () => {
  it("con el MFA diferido nunca está pendiente", () => {
    for (const role of ROLES) expect(isMfaPending(user(role, false))).toBe(false);
  });

  it("con la exigencia activada, solo para admin/super_admin sin segundo factor", () => {
    expect(isMfaPending(user("super_admin", false), true)).toBe(true);
    expect(isMfaPending(user("admin", false), true)).toBe(true);
    expect(isMfaPending(user("admin", true), true)).toBe(false);
    expect(isMfaPending(user("customer", false), true)).toBe(false);
  });
});
