import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, Clock, ExternalLink, QrCode, Users } from "lucide-react";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { buttonVariants } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

import type { EventDetail } from "../types/events.types";
import { formatTime } from "../utils/formatEvent";
import { buildDirectionsUrl, buildMapEmbedUrl } from "../utils/venueMap";
import { VenueMap } from "./VenueMap";

// El icono va dentro del `dt` para que el `dl` sea válido (un `div` de `dl` solo admite `dt`/`dd`).
// En móvil queda encima del texto; desde `md` se posiciona a la izquierda de la tarjeta.
function InfoItem({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="relative flex flex-col gap-0.5 rounded-2xl p-4 ring-1 ring-border md:min-h-19 md:justify-center md:pl-19">
      <dt className="text-sm text-muted-foreground">
        <span
          aria-hidden
          className="mb-3 flex size-11 items-center justify-center rounded-xl bg-accent text-primary-strong md:absolute md:top-1/2 md:left-4 md:mb-0 md:-translate-y-1/2"
        >
          <Icon className="size-5" />
        </span>
        {label}
      </dt>
      <dd className="font-bold">{children}</dd>
    </div>
  );
}

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
        <SectionHeader title="Información importante" />
        <dl className="grid grid-cols-2 gap-3 md:gap-4">
          <InfoItem icon={Clock} label="Apertura de puertas">
            <time dateTime={event.doorsOpenAt}>{formatTime(event.doorsOpenAt)}</time>
          </InfoItem>
          <InfoItem icon={CalendarClock} label="Inicio">
            <time dateTime={event.startsAt}>{formatTime(event.startsAt)}</time>
          </InfoItem>
          <InfoItem icon={Users} label="Edad mínima">
            {event.minAge === 0 ? "Todo público" : `+${event.minAge}`}
          </InfoItem>
          <InfoItem icon={QrCode} label="Ingreso">
            Entrada digital con QR
          </InfoItem>
        </dl>
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
