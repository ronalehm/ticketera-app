"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarDays, Gauge, type LucideIcon, ScanLine, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PanelNavIcon, PanelNavItem, PanelNavSection } from "../types/panel.types";
import { isPanelNavItemActive } from "../utils/panelNav";

// Las secciones llegan serializadas desde el servidor; los iconos se resuelven aquí.
const ICONS: Record<PanelNavIcon, LucideIcon> = {
  dashboard: Gauge,
  users: Users,
  organizers: Building2,
  events: CalendarDays,
  checkIn: ScanLine,
  payouts: Wallet,
};

const DISABLED_BADGES = {
  "coming-soon": { label: "Próximamente", variant: "secondary" },
} as const;

const ITEM = "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium";

type PanelNavProps = {
  sections: PanelNavSection[];
  /** Rail: etiquetas, encabezados y badges solo para lectores de pantalla (siguen dando nombre accesible). */
  collapsed?: boolean;
  // La barra móvil lo usa para cerrar el Sheet al elegir un enlace.
  onNavigate?: () => void;
  id?: string;
};

// Lista vertical por secciones: la usan el sidebar (lg) y el Sheet de la barra móvil.
export function PanelNav({ sections, collapsed = false, onNavigate, id }: PanelNavProps) {
  const pathname = usePathname();
  const headingPrefix = useId();

  return (
    <nav id={id} aria-label="Panel" className="flex flex-col gap-4">
      {sections.map((section, index) => {
        const headingId = `${headingPrefix}-${section.key}`;
        return (
          <div key={section.key} className="flex flex-col gap-1">
            {collapsed && index > 0 && <Separator className="mb-3" />}
            <p
              id={headingId}
              className={cn(
                "px-3 pb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase",
                collapsed && "sr-only",
              )}
            >
              {section.title}
            </p>
            <ul aria-labelledby={headingId} className="flex flex-col gap-1">
              {section.items.map((item) => (
                <li key={item.key}>
                  <PanelNavEntry item={item} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

type PanelNavEntryProps = {
  item: PanelNavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
};

function PanelNavEntry({ item, pathname, collapsed, onNavigate }: PanelNavEntryProps) {
  const Icon = ICONS[item.icon];
  const badge = item.state === "link" ? null : DISABLED_BADGES[item.state];
  // En el rail el texto queda en sr-only (nombre accesible) y `title` muestra la etiqueta al pasar el ratón.
  const title = collapsed ? [item.label, badge?.label].filter(Boolean).join(" · ") : undefined;
  const content = (
    <>
      {/* Icono atenuado en los deshabilitados: en el rail es la única pista visual (el badge va en sr-only). */}
      <Icon className={cn("size-5 shrink-0", badge && "opacity-50")} aria-hidden />
      <span className={cn("min-w-0 flex-1", collapsed && "sr-only")}>{item.label}</span>
      {badge && (
        <Badge variant={badge.variant} className={cn(collapsed && "sr-only")}>
          {badge.label}
        </Badge>
      )}
    </>
  );

  if (item.state !== "link") {
    // Sin destino: no es un enlace ni recibe foco. `aria-disabled` no aplica a un span genérico: el estado se anuncia
    // con el badge y el texto sr-only.
    return (
      <span
        title={title}
        className={cn(ITEM, "cursor-not-allowed text-muted-foreground", collapsed && "justify-center px-0")}
      >
        {content}
        <span className="sr-only">(no disponible)</span>
      </span>
    );
  }

  const active = isPanelNavItemActive(pathname, item);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={title}
      className={cn(
        ITEM,
        "cursor-pointer transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {content}
    </Link>
  );
}
