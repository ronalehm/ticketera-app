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
 * Enlaces de la cuenta, compartidos por el menú de usuario y el bloque de cuenta del `Sheet`. Todos los roles ven los
 * básicos; con `users:manage` (admin, super admin) se añade "Panel" → `/admin/usuarios`, y con solo `panel:access`
 * (organizador) "Panel de organizador" → `/organizador`. El acceso real lo decide el servidor (`requirePermission`).
 */
export function getAccountLinks(role: SessionUser["role"]): readonly AccountLink[] {
  const panel = getPanelLink(role);
  return panel ? [...BASE_LINKS, panel] : BASE_LINKS;
}

function getPanelLink(role: SessionUser["role"]): AccountLink | null {
  if (roleCan(role, "users:manage")) return { href: "/admin/usuarios", label: "Panel", icon: LayoutDashboard };
  if (roleCan(role, "panel:access")) {
    return { href: "/organizador", label: "Panel de organizador", icon: LayoutDashboard };
  }
  return null;
}
