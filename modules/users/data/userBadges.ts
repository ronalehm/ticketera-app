import type { UserOrganizerStatus, UserRole } from "../types/users.types";

// Badges de `/admin/usuarios`: siempre con texto, nunca solo color (MASTER §2). Mismos tokens que los estados de evento:
// texto navy sobre warning y destructive (blanco no llega a 4.5:1).

/** Orden de los roles en el filtro (de más a menos privilegios). */
export const USER_ROLE_ORDER = ["super_admin", "admin", "organizer", "customer"] as const satisfies readonly UserRole[];

export const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  super_admin: "bg-brand-navy text-primary-foreground",
  admin: "bg-highlight text-highlight-foreground",
  organizer: "bg-secondary text-secondary-foreground",
  customer: "border-border bg-background text-muted-foreground",
};

export const ORGANIZER_STATUS_BADGE: Record<UserOrganizerStatus, { label: string; className: string }> = {
  approved: { label: "Aprobado", className: "bg-accent text-accent-foreground" },
  pending: { label: "Pendiente", className: "bg-warning text-warning-foreground" },
  suspended: { label: "Suspendido", className: "bg-destructive text-foreground" },
};
