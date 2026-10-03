import type { ReactNode } from "react";
import { Armchair, ChevronLeft, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatEventPrice } from "@/modules/events/purchase";

import type { VenueZone } from "../types/seating.types";

type ZoneStepHeaderProps = {
  zone: Pick<VenueZone, "name" | "price" | "status" | "kind">;
  /** `id` del h3 de la zona: recibe el foco al abrir la zona y al quitar el último asiento. */
  headingId: string;
  /** "Todas las zonas": vuelve al sub-paso 1. */
  onBack: () => void;
  /** Lo que va a la derecha del nombre (p. ej. el contador "n de m butacas"). */
  children?: ReactNode;
};

/** Cabecera del sub-paso 2: migas "‹ Todas las zonas › Zona", nombre con precio y tipo de zona. */
export function ZoneStepHeader({ zone, headingId, onBack, children }: ZoneStepHeaderProps) {
  const KindIcon = zone.kind === "general" ? Users : Armchair;

  return (
    <div className="flex flex-col gap-2">
      <Breadcrumb aria-label="Ruta de selección">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              render={<button type="button" />}
              onClick={onBack}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-md font-semibold text-primary-strong outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ChevronLeft className="size-4" aria-hidden />
              Todas las zonas
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{zone.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <div className="min-w-0">
            <h3 id={headingId} tabIndex={-1} className="inline scroll-mt-24 text-base font-bold outline-none md:text-lg">
              {zone.name}
            </h3>
            <span className="text-base text-muted-foreground tabular-nums">
              {` · ${formatEventPrice(zone.price)} c/u`}
            </span>
          </div>
          {zone.status === "low-stock" && (
            <Badge className="h-6 bg-warning px-2.5 font-bold text-warning-foreground">Últimas entradas</Badge>
          )}
        </div>
        {children}
      </div>

      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <KindIcon className="size-4 shrink-0" aria-hidden />
        {zone.kind === "general" ? "General · sin butaca" : "Numerada · elige tu butaca"}
      </p>
    </div>
  );
}
