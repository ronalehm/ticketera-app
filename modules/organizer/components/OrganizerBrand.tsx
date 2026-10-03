import Link from "next/link";

import { BrandLogo } from "@/components/shared/BrandLogo";

// Marca del panel: logo Mentec enlazado al inicio y "Organizadores" debajo (sidebar y barra móvil).
export function OrganizerBrand() {
  return (
    <div className="flex flex-col gap-0.5">
      <Link
        href="/"
        aria-label="Mentec Tickets: ir al inicio"
        className="inline-flex min-h-11 items-center self-start rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <BrandLogo className="h-7 w-auto" />
      </Link>
      <p className="px-0.5 text-xs font-medium text-muted-foreground">Organizadores</p>
    </div>
  );
}
