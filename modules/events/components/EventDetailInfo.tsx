import { ExternalLink } from "lucide-react";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { buttonVariants } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

import type { EventDetail } from "../types/events.types";
import { buildDirectionsUrl, buildMapEmbedUrl } from "../utils/venueMap";
import { VenueMap } from "./VenueMap";

export function EventDetailInfo({ event }: { event: EventDetail }) {
  const location = { venue: event.venue, address: event.address, city: event.city };

  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <section>
        <SectionHeader title="Acerca del evento" />
        <div className="space-y-4 text-base leading-relaxed">
          {event.description.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="text-muted-foreground">Organiza: {event.organizer}</p>
        </div>
      </section>

      <section>
        <SectionHeader title="Lugar" />
        <div className="overflow-hidden rounded-2xl ring-1 ring-border">
          <VenueMap
            venue={event.venue}
            embedUrl={buildMapEmbedUrl(location, publicEnv.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY)}
          />
          <div className="flex items-center justify-between gap-4 p-4 md:px-6 md:py-5">
            <address className="flex min-w-0 flex-col gap-0.5 not-italic">
              <span className="font-bold">{event.venue}</span>
              <span className="text-muted-foreground">
                {event.address}, {event.city}
              </span>
            </address>
            <a
              href={buildDirectionsUrl(location)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 cursor-pointer gap-1.5 px-4 font-semibold duration-200",
              )}
            >
              Cómo llegar
              <ExternalLink aria-hidden />
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
