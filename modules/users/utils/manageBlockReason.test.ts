import { describe, expect, it } from "vitest";
import type { UserRole } from "../types/users.types";
import { getAssignRoleBlockReason, getManageBlockReason } from "./manageBlockReason";

const person = (role: UserRole, id: string = role) => ({ id, role });

describe("getManageBlockReason", () => {
  it.each([
    ["admin", "customer", null],
    ["admin", "organizer", null],
    ["admin", "admin", "super_admin_only"],
    ["admin", "super_admin", "protected"],
    ["super_admin", "customer", null],
    ["super_admin", "organizer", null],
    ["super_admin", "admin", null],
    ["super_admin", "super_admin", "protected"],
  ] as const)("%s → %s: %s", (actorRole, targetRole, reason) => {
    expect(getManageBlockReason(person(actorRole, "actor"), person(targetRole, "target"))).toBe(reason);
  });

  it.each(["admin", "super_admin"] as const)("%s sobre sí mismo → self", (role) => {
    expect(getManageBlockReason(person(role, "same"), person(role, "same"))).toBe("self");
  });
});

describe("getAssignRoleBlockReason", () => {
  it.each([
    ["admin", "customer", null],
    ["admin", "organizer", null],
    ["admin", "admin", "super_admin_only"],
    ["admin", "super_admin", "role_not_assignable"],
    ["super_admin", "admin", null],
    ["super_admin", "super_admin", "role_not_assignable"],
  ] as const)("%s asigna %s: %s", (actorRole, role, reason) => {
    expect(getAssignRoleBlockReason({ role: actorRole }, role)).toBe(reason);
  });
});
