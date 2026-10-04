export type AccountLinkAction = "create" | "link" | "reject-unverified" | "reject-conflict";

/**
 * Qué hacer con un usuario de Clerk sin fila propia, según la fila que ya tiene su correo (si existe).
 * Solo se vincula una fila sin `clerk_id` (p. ej. el super admin del seed) y con el correo verificado en Clerk.
 */
export function getAccountLinkAction(
  existing: { clerkId: string | null } | undefined,
  emailVerified: boolean,
): AccountLinkAction {
  if (!existing) return "create";
  if (existing.clerkId !== null) return "reject-conflict";
  return emailVerified ? "link" : "reject-unverified";
}
