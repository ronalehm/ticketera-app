import Link from "next/link";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { cn } from "@/lib/utils";

type PanelBrandProps = {
  /** Rail: solo el logo, recortado a la "m" inicial para caber en 76 px. */
  collapsed?: boolean;
};

// Marca del panel: logo Mentec enlazado al inicio y "Panel" debajo (sidebar y barra móvil).
export function PanelBrand({ collapsed = false }: PanelBrandProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <Link
        href="/"
        aria-label="Mentec Tickets: ir al inicio"
        className={cn(
          "inline-flex min-h-11 items-center self-start rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          collapsed && "min-w-11 justify-center",
        )}
      >
        <BrandLogo className={cn("h-7", collapsed ? "w-6.5 object-cover object-left" : "w-auto")} />
      </Link>
      {!collapsed && <p className="px-0.5 text-xs font-medium text-muted-foreground">Panel</p>}
    </div>
  );
}
