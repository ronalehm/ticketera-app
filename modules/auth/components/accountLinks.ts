import { LayoutDashboard, Ticket, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SessionUser } from "../types/auth.types";
import { roleCan } from "../utils/can";

export type AccountLink = { href: string; label: string; icon: LucideIcon };

const BASE_LINKS: readonly AccountLink[] = [
  { href: "/perfil", label: "Mi perfil", icon: UserRound },
  { href: "/mis-entradas", label: "Mis entradas", icon: Ticket },
];

/**
 * Enlaces de la cuenta, compartidos por el menú de usuario y el bloque de cuenta del `Sheet`. El panel solo aparece con
 * `panel:access` (organizador, admin, super admin): "Panel" para quien además gestiona usuarios. El acceso real lo
 * decide el servidor (`requirePermission`).
 */
export function getAccountLinks(role: SessionUser["role"]): readonly AccountLink[] {
  if (!roleCan(role, "panel:access")) return BASE_LINKS;
  const label = roleCan(role, "users:manage") ? "Panel" : "Panel de organizador";
  return [...BASE_LINKS, { href: "/organizador", label, icon: LayoutDashboard }];
}
