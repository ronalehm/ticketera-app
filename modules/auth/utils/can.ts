import type { SessionUser } from "../types/auth.types";

/** Roles que necesitan el segundo factor en la sesión (Decisión 11). */
export const MFA_ROLES: ReadonlySet<SessionUser["role"]> = new Set(["admin", "super_admin"]);

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

export type Action = "profile:update";

/** ¿Puede el usuario de la sesión hacer `action`? Sin sesión, o con MFA pendiente (si se exige), nunca. */
export function can(user: SessionUser | null, action: Action, enforced: boolean = MFA_ENFORCED): boolean {
  if (!user || isMfaPending(user, enforced)) return false;
  return action === "profile:update";
}
