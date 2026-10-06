"use client";

import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import type { PanelNavSection } from "../types/panel.types";
import { findNavItem } from "../utils/panelNav";

type PanelBreadcrumbProps = {
  sections: PanelNavSection[];
  className?: string;
};

// "Sección / Título" sobre el contenido, con la misma configuración que el menú. Fuera del menú no se muestra.
export function PanelBreadcrumb({ sections, className }: PanelBreadcrumbProps) {
  const current = findNavItem(usePathname(), sections);
  if (!current) return null;

  return (
    <Breadcrumb aria-label="Ruta de navegación" className={cn("mb-4", className)}>
      <BreadcrumbList>
        {/* Las secciones no tienen página propia: texto, no enlace. */}
        <BreadcrumbItem>{current.section}</BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="font-medium">{current.title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
