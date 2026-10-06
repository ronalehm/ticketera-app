import { ExternalLink } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildDirectionsUrl, buildMapEmbedUrl, VenueMap } from "@/modules/events/map";

import { FORM_CONTROL_SCROLL } from "./formStyles";

type VenueLocationPreviewProps = {
  venue: string;
  address: string;
  city: string;
  /** `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`; sin ella, solo la dirección y «Abrir en Google Maps». */
  embedKey?: string;
};

/**
 * Dirección del recinto con la vista previa del mapa (spec organizer-manual-venue, Decisiones 2 y 3b): la misma consulta
 * que el detalle del evento (`buildMapEmbedUrl`), click-to-load (`VenueMap`), y el enlace «Abrir en Google Maps».
 */
export function VenueLocationPreview({ venue, address, city, embedKey }: VenueLocationPreviewProps) {
  const location = { venue, address, city };
  const embedUrl = buildMapEmbedUrl(location, embedKey);
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-border">
      {/* Otra dirección, otro mapa: vuelve a «Ver mapa» en vez de recargar Google con cada tecla. */}
      <VenueMap key={embedUrl} venue={venue} embedUrl={embedUrl} />
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <address className="flex min-w-0 flex-col gap-0.5 text-sm not-italic">
          <span className="font-semibold">{venue}</span>
          <span className="text-muted-foreground">
            {address}, {city}
          </span>
        </address>
        <a
          href={buildDirectionsUrl(location)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 cursor-pointer gap-1.5 px-4 font-semibold duration-200",
            FORM_CONTROL_SCROLL,
          )}
        >
          Abrir en Google Maps
          <ExternalLink aria-hidden />
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
      </div>
    </div>
  );
}
