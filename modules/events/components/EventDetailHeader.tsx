import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, MapPin, Users } from "lucide-react";

import { EventCoverImage } from "@/components/shared/EventCoverImage";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { EventDetail } from "../types/events.types";
import { getCoverAlt } from "../utils/eventMetadata";
import { formatLongDayMonth, formatTime } from "../utils/formatEvent";
import { EventEditLink } from "./EventEditLink";
import { SaveEventButton } from "./SaveEventButton";
import { ShareEventButton } from "./ShareEventButton";

// Link directo en vez de BreadcrumbLink: su useRender usa useRef, no disponible en Server Components.
const CRUMB_LINK =
  "rounded-sm transition-colors duration-200 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type EventDetailHeaderProps = {
  event: EventDetail;
};

// Sin CTA de compra en el hero: la tarjeta de entradas (justo debajo en móvil, a la derecha en lg) y la barra móvil
// ya la ofrecen. Debajo de la portada: título con Guardar y Compartir a la derecha, y luego fecha, hora y recinto.
export function EventDetailHeader({ event }: EventDetailHeaderProps) {
  const soldOut = event.status === "sold-out";

  return (
    <header className="flex flex-col gap-4 md:gap-6">
      <div className="-mx-2 flex items-center lg:hidden">
        <Link
          href="/eventos"
          aria-label="Volver a eventos"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11 cursor-pointer duration-200")}
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
      </div>

      <Breadcrumb className="hidden lg:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link href="/" className={CRUMB_LINK}>
              Inicio
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Link href={`/eventos?categoria=${event.category}`} className={CRUMB_LINK}>
              {event.categoryName}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{event.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Portada limpia (Ronald, 2026-10-08): sin texto, botones ni bloque de color encima. */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl md:aspect-[21/8]">
        <EventCoverImage
          src={event.imageUrl}
          alt={getCoverAlt(event)}
          fill
          preload
          sizes="(min-width: 1280px) 1216px, 100vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance wrap-break-word md:text-4xl lg:text-5xl">
            {event.title}
          </h1>
          <div className="flex shrink-0 items-center gap-1">
            {/* Solo para el organizador dueño y admins; se resuelve en el cliente para no romper la página estática. */}
            <EventEditLink eventId={event.id} />
            <SaveEventButton slug={event.slug} />
            <ShareEventButton title={event.title} />
          </div>
        </div>
        <ul className="flex flex-col gap-1 text-base font-medium text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
          <li className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            <time dateTime={event.startsAt}>{formatLongDayMonth(event.startsAt)}</time>
          </li>
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" aria-hidden />
            <span>{`${formatTime(event.startsAt)} h`}</span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span>
              {event.venue}, {event.city}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Users className="size-4 shrink-0" aria-hidden />
            <span>{event.minAge === 0 ? "Todo público" : `Edad mínima: +${event.minAge}`}</span>
          </li>
        </ul>
        {soldOut && <p className="font-bold">Entradas agotadas</p>}
      </div>
    </header>
  );
}
