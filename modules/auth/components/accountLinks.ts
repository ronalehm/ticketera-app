import { LayoutDashboard, Ticket, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AccountLink = { href: string; label: string; icon: LucideIcon };

/** Enlaces de la cuenta, compartidos por el menú de usuario y el bloque de cuenta del `Sheet`. */
export const ACCOUNT_LINKS = [
  { href: "/perfil", label: "Mi perfil", icon: UserRound },
  { href: "/mis-entradas", label: "Mis entradas", icon: Ticket },
  { href: "/organizador", label: "Panel de organizador", icon: LayoutDashboard },
] as const satisfies readonly AccountLink[];
