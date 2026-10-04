"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

// Solo destinos que existen (Decisión 2): sin "Mis eventos", "Ventas" ni "Configuración".
const NAV_ITEMS = [
  { href: "/organizador", label: "Resumen", icon: LayoutDashboard },
  { href: "/organizador/eventos/nuevo", label: "Crear evento", icon: Plus },
] as const;

type OrganizerNavProps = {
  // La barra móvil lo usa para cerrar el Sheet al elegir un enlace.
  onNavigate?: () => void;
};

// Lista vertical en todos los anchos: la usan el sidebar (lg) y el Sheet de la barra móvil.
export function OrganizerNav({ onNavigate }: OrganizerNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Panel de organizador">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
