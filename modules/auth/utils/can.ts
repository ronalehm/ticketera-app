import type { SessionUser } from "../types/auth.types";

type Role = SessionUser["role"];

/** Roles que necesitan el segundo factor en la sesión (Decisión 11). */
export const MFA_ROLES: ReadonlySet<Role> = new Set(["admin", "super_admin"]);

// ponytail: MFA diferido (Decisión 11): el plan de Clerk no incluye TOTP ni códigos de respaldo (Clerk Pro). Para
// activarlo: habilitar TOTP en el dashboard de Clerk, aprobar el cambio en la spec y poner `true`.
export const MFA_ENFORCED = false;

/** El rol exige MFA y la sesión no tiene segundo factor. Siempre `false` mientras `enforced` esté apagado. */
export function isMfaPending(
  user: Pick<SessionUser, "role" | "mfaVerified">,
  enforced: boolean = MFA_ENFORCED,
): boolean {
  return enforced && MFA_ROLES.has(user.role) && !user.mfaVerified;
}

export type Action =
  | "profile:update"
  | "panel:access"
  | "events:manageOwn"
  | "events:manageAny"
  | "events:moderate"
  | "users:manage"
  | "users:assignAdmin";

const ORGANIZER_ACTIONS: Action[] = ["profile:update", "panel:access", "events:manageOwn"];
const ADMIN_ACTIONS: Action[] = [...ORGANIZER_ACTIONS, "events:manageAny", "events:moderate", "users:manage"];

/**
 * Matriz de permisos por rol (spec admin-panel, "Autorización"). Solo mira el rol: el estado del organizador
 * (`approved`/`pending`/`suspended`) se comprueba aparte, en servicios con acceso a la BD.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Action>> = {
  customer: new Set(["profile:update"]),
  organizer: new Set(ORGANIZER_ACTIONS),
  admin: new Set(ADMIN_ACTIONS),
  super_admin: new Set([...ADMIN_ACTIONS, "users:assignAdmin"]),
};

/** ¿Permite el rol `action`? Solo mira la matriz (sin sesión ni MFA): sirve para pintar UI, no para autorizar. */
export function roleCan(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role].has(action);
}

/** ¿Puede el usuario de la sesión hacer `action`? Sin sesión, o con MFA pendiente (si se exige), nunca. */
export function can(
  user: Pick<SessionUser, "role" | "mfaVerified"> | null,
  action: Action,
  enforced: boolean = MFA_ENFORCED,
): boolean {
  if (!user || isMfaPending(user, enforced)) return false;
  return roleCan(user.role, action);
}

/** Permiso que exige otorgar cada rol desde el panel; `super_admin` no se asigna desde el panel (`null`). */
const ASSIGN_ROLE_PERMISSION: Record<Role, Action | null> = {
  customer: "users:manage",
  organizer: "users:manage",
  admin: "users:assignAdmin",
  super_admin: null,
};

/** ¿Puede `actor` asignar `role` a otro usuario? */
export function canAssignRole(actor: Pick<SessionUser, "role">, role: Role): boolean {
  const permission = ASSIGN_ROLE_PERMISSION[role];
  return permission !== null && roleCan(actor.role, permission);
}

/**
 * ¿Puede `actor` editar o eliminar a `target`? Nunca a sí mismo. Gestionar a alguien exige poder otorgar su rol actual:
 * admin gestiona customer y organizer; super_admin además admin; nadie gestiona a un super_admin.
 */
export function canManageUser(actor: Pick<SessionUser, "id" | "role">, target: Pick<SessionUser, "id" | "role">): boolean {
  return actor.id !== target.id && canAssignRole(actor, target.role);
}
