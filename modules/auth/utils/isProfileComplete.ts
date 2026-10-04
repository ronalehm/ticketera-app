import type { SessionUser } from "../types/auth.types";

/** El perfil está completo cuando tiene celular, tipo y número de documento ("Completa tu perfil"). */
export function isProfileComplete(user: Pick<SessionUser, "phone" | "documentType" | "documentNumber">): boolean {
  return Boolean(user.phone && user.documentType && user.documentNumber);
}
