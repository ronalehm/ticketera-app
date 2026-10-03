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

// Lista vertical en lg; por debajo, chips horizontales con scroll propio (patrón de CategoryFilter).
export function OrganizerNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Panel de organizador">
      {/* Repite el nombre de la nav: oculto para lectores de pantalla. */}
      <p aria-hidden className="mb-3 hidden px-3 text-xs font-bold tracking-wider text-muted-foreground uppercase lg:block">
        Panel de organizador
      </p>
      <div className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:mx-0 md:px-0 lg:overflow-visible lg:py-0 [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-2 lg:w-full lg:flex-col lg:gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:flex lg:rounded-lg lg:px-3",
                    active
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "bg-muted hover:bg-secondary lg:bg-transparent lg:hover:bg-muted",
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
