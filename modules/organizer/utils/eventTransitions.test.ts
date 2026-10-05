import { describe, expect, it } from "vitest";
import { canTransition, type EventTransition, getAvailableTransitions } from "./eventTransitions";

const ROLES = ["customer", "organizer", "admin", "super_admin"] as const;
const STATUSES = ["draft", "pending_review", "published", "cancelled", "finished"] as const;
const TRANSITIONS: EventTransition[] = ["submit", "approve", "reject", "cancel"];

/** Las únicas combinaciones rol:estado:transición permitidas (spec admin-panel, F5b, requisito 1). */
const ALLOWED = new Set([
  "organizer:draft:submit",
  "admin:draft:submit",
  "super_admin:draft:submit",
  "admin:pending_review:approve",
  "super_admin:pending_review:approve",
  "admin:pending_review:reject",
  "super_admin:pending_review:reject",
  "admin:published:cancel",
  "super_admin:published:cancel",
]);

const TABLE = ROLES.flatMap((role) =>
  STATUSES.flatMap((status) =>
    TRANSITIONS.map((transition) => [role, status, transition, ALLOWED.has(`${role}:${status}:${transition}`)] as const),
  ),
);

describe("canTransition", () => {
  it("cubre la tabla completa rol × estado × transición", () => {
    expect(TABLE).toHaveLength(ROLES.length * STATUSES.length * TRANSITIONS.length);
  });

  it.each(TABLE)("%s · %s · %s → %s", (role, status, transition, expected) => {
    expect(canTransition(role, status, transition)).toBe(expected);
  });

  it("cancelled es terminal y nadie lleva un evento a finished", () => {
    for (const role of ROLES) {
      expect(getAvailableTransitions(role, "cancelled")).toEqual([]);
      expect(getAvailableTransitions(role, "finished")).toEqual([]);
    }
  });
});

describe("getAvailableTransitions", () => {
  it("da las transiciones de cada rol en cada estado", () => {
    expect(getAvailableTransitions("organizer", "draft")).toEqual(["submit"]);
    expect(getAvailableTransitions("organizer", "pending_review")).toEqual([]);
    expect(getAvailableTransitions("admin", "pending_review")).toEqual(["approve", "reject"]);
    expect(getAvailableTransitions("super_admin", "published")).toEqual(["cancel"]);
    expect(getAvailableTransitions("customer", "draft")).toEqual([]);
  });
});
