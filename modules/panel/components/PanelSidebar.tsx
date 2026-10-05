"use client";

import { useId, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PanelNavSection } from "../types/panel.types";
import { PanelBrand } from "./PanelBrand";
import { PanelNav } from "./PanelNav";
import { PanelUserCard } from "./PanelUserCard";

type PanelSidebarProps = {
  sections: PanelNavSection[];
  roleLabel: string;
};

// Sidebar del panel en lg: 264 px, contraíble a un rail de 76 px; fijo a toda la altura de la ventana.
// El ancho lo pone el propio sidebar: el layout usa una columna `auto`.
export function PanelSidebar({ sections, roleLabel }: PanelSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navId = useId();
  const toggleLabel = collapsed ? "Expandir menú" : "Contraer menú";

  return (
    <header
      className={cn(
        "hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col lg:gap-8 lg:overflow-x-hidden lg:overflow-y-auto lg:border-r lg:bg-background lg:px-4 lg:py-6 lg:transition-[width] lg:duration-200 lg:ease-out motion-reduce:lg:transition-none",
        // 76 px = rail (44 px de contenido con px-4) · 264 px expandido
        collapsed ? "lg:w-19" : "lg:w-66",
      )}
    >
      <div className={cn("flex gap-2", collapsed ? "flex-col items-center" : "items-start justify-between px-2")}>
        <PanelBrand collapsed={collapsed} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-expanded={!collapsed}
          aria-controls={navId}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="size-11 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <PanelLeftOpen className="size-5" aria-hidden /> : <PanelLeftClose className="size-5" aria-hidden />}
        </Button>
      </div>
      <PanelNav id={navId} sections={sections} collapsed={collapsed} />
      <div className="mt-auto border-t pt-4">
        <PanelUserCard roleLabel={roleLabel} collapsed={collapsed} />
      </div>
    </header>
  );
}
