import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Building2, CalendarDays, Clock, DoorOpen, ExternalLink, MapPin, Users } from "lucide-react";

import { SectionHeader } from "@/components/shared/SectionHeader";

import type { EventDetail } from "../types/events.types";
import { formatLongDate, formatTime } from "../utils/formatEvent";

function DetailItem({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className="pl-6 text-base">{children}</dd>
    </div>
  );
}

export function EventDetailInfo({ event }: { event: EventDetail }) {
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${event.venue}, ${event.address}, ${event.city}`,
  )}`;

  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <section>
        <SectionHeader title="Acerca del evento" />
        <div className="space-y-4 text-base leading-relaxed">
          {event.description.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Detalles" />
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <DetailItem icon={CalendarDays} label="Fecha">
            <time dateTime={event.startsAt} className="inline-block first-letter:uppercase">
              {formatLongDate(event.startsAt)}
            </time>
          </DetailItem>
          <DetailItem icon={Clock} label="Hora">
            <time dateTime={event.startsAt}>{formatTime(event.startsAt)}</time>
          </DetailItem>
          <DetailItem icon={DoorOpen} label="Apertura de puertas">
            <time dateTime={event.doorsOpenAt}>{formatTime(event.doorsOpenAt)}</time>
          </DetailItem>
          <DetailItem icon={MapPin} label="Lugar">
            <span className="block font-medium">{event.venue}</span>
            <span className="block text-muted-foreground">
              {event.address}, {event.city}
            </span>
          </DetailItem>
          <DetailItem icon={Users} label="Edad mínima">
            {event.minAge === 0 ? "Todo público" : `+${event.minAge}`}
          </DetailItem>
          <DetailItem icon={Building2} label="Organizador">
            {event.organizer}
          </DetailItem>
        </dl>
      </section>

      <section>
        <SectionHeader title="Ubicación" />
        <address className="flex flex-col gap-1 text-base not-italic">
          <span className="font-medium">{event.venue}</span>
          <span className="text-muted-foreground">
            {event.address}, {event.city}
          </span>
        </address>
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-sm font-semibold text-primary-strong underline-offset-4 transition-colors duration-200 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Ver en Google Maps
          <ExternalLink className="size-4" aria-hidden />
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
      </section>
    </div>
  );
}
