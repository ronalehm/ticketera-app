import { describe, expect, it } from "vitest";
import type { SessionUser } from "../types/auth.types";
import { type Action, can, canAssignRole, canManageUser, isMfaPending, MFA_ENFORCED, roleCan } from "./can";

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

/** Matriz de la spec admin-panel ("Autorización"): acciones permitidas por rol. */
const ALLOWED: Record<SessionUser["role"], Action[]> = {
  customer: ["profile:update"],
  organizer: ["profile:update", "panel:access", "events:manageOwn"],
  admin: ["profile:update", "panel:access", "events:manageOwn", "events:manageAny", "events:moderate", "users:manage"],
  super_admin: [
    "profile:update",
    "panel:access",
    "events:manageOwn",
    "events:manageAny",
    "events:moderate",
    "users:manage",
    "users:assignAdmin",
  ],
};

const ACTIONS: Action[] = [
  "profile:update",
  "panel:access",
  "events:manageOwn",
  "events:manageAny",
  "events:moderate",
  "users:manage",
  "users:assignAdmin",
];

describe("can: matriz rol × acción", () => {
  it.each(ACTIONS)("sin sesión, %s → false", (action) => {
    expect(can(null, action)).toBe(false);
  });

  it.each(ROLES.flatMap((role) => ACTIONS.map((action) => [role, action, ALLOWED[role].includes(action)] as const)))(
    "%s · %s → %s",
    (role, action, allowed) => {
      expect(can(user(role, false), action)).toBe(allowed);
    },
  );

  it.each(ACTIONS)("con la exigencia activada, un admin sin segundo factor no puede %s", (action) => {
    expect(can(user("admin", false), action, true)).toBe(false);
    expect(can(user("super_admin", false), action, true)).toBe(false);
  });
});

describe("roleCan: matriz rol × acción, sin sesión ni MFA", () => {
  it.each(ROLES.flatMap((role) => ACTIONS.map((action) => [role, action, ALLOWED[role].includes(action)] as const)))(
    "%s · %s → %s",
    (role, action, allowed) => {
      expect(roleCan(role, action)).toBe(allowed);
    },
  );
});

const SELF_ID = "00000000-0000-8000-8000-000000000001";
const OTHER_ID = "00000000-0000-8000-8000-000000000002";
const person = (id: string, role: SessionUser["role"]) => ({ id, role });

describe("canManageUser: actor × objetivo", () => {
  /** Roles objetivo que gestiona cada rol (a otro usuario, nunca a sí mismo). */
  const MANAGES: Record<SessionUser["role"], SessionUser["role"][]> = {
    customer: [],
    organizer: [],
    admin: ["customer", "organizer"],
    super_admin: ["customer", "organizer", "admin"],
  };

  it.each(ROLES.flatMap((actor) => ROLES.map((target) => [actor, target, MANAGES[actor].includes(target)] as const)))(
    "%s → %s (otro usuario) → %s",
    (actor, target, allowed) => {
      expect(canManageUser(person(SELF_ID, actor), person(OTHER_ID, target))).toBe(allowed);
    },
  );

  it.each(ROLES)("un %s no se gestiona a sí mismo", (role) => {
    expect(canManageUser(person(SELF_ID, role), person(SELF_ID, role))).toBe(false);
  });

  it("super_admin no gestiona a otro super_admin; admin no gestiona a otro admin", () => {
    expect(canManageUser(person(SELF_ID, "super_admin"), person(OTHER_ID, "super_admin"))).toBe(false);
    expect(canManageUser(person(SELF_ID, "admin"), person(OTHER_ID, "admin"))).toBe(false);
  });
});

describe("canAssignRole", () => {
  const ASSIGNS: Record<SessionUser["role"], SessionUser["role"][]> = {
    customer: [],
    organizer: [],
    admin: ["customer", "organizer"],
    super_admin: ["customer", "organizer", "admin"],
  };

  it.each(ROLES.flatMap((actor) => ROLES.map((role) => [actor, role, ASSIGNS[actor].includes(role)] as const)))(
    "%s asigna %s → %s",
    (actor, role, allowed) => {
      expect(canAssignRole(person(SELF_ID, actor), role)).toBe(allowed);
    },
  );
});
