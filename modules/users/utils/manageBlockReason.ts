import { canAssignRole, canManageUser } from "@/modules/auth/permissions";
import type { ManageBlockReason, UserRole } from "../types/users.types";

type Person = { id: string; role: UserRole };

/** Texto corto del motivo, para la columna de acciones de la tabla. */
export const MANAGE_BLOCK_REASON_LABELS = {
  self: "Tu cuenta",
  protected: "Cuenta protegida",
  super_admin_only: "Solo el super admin",
} satisfies Record<ManageBlockReason, string>;

/**
 * Por qué `actor` no puede editar ni eliminar a `target` (`canManageUser`), o `null` si puede: a sí mismo (`self`), un
 * super_admin (`protected`) o, siendo admin, otro admin (`super_admin_only`).
 */
export function getManageBlockReason(actor: Person, target: Person): ManageBlockReason | null {
  if (actor.id === target.id) return "self";
  if (canManageUser(actor, target)) return null;
  return target.role === "admin" ? "super_admin_only" : "protected";
}

/** Por qué `actor` no puede asignar `role` (`canAssignRole`), o `null` si puede. `super_admin` no se asigna desde el panel. */
export function getAssignRoleBlockReason(
  actor: Pick<Person, "role">,
  role: UserRole,
): "super_admin_only" | "role_not_assignable" | null {
  if (canAssignRole(actor, role)) return null;
  return role === "admin" ? "super_admin_only" : "role_not_assignable";
}
