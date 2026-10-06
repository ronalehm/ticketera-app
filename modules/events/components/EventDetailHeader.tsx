import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";

import { EventCoverImage } from "@/components/shared/EventCoverImage";
import { Badge } from "@/components/ui/badge";
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
import { formatEventPrice, formatLongDayMonth, formatTime } from "../utils/formatEvent";
import { SaveEventButton } from "./SaveEventButton";
import { ShareEventButton } from "./ShareEventButton";

// Link directo en vez de BreadcrumbLink: su useRender usa useRef, no disponible en Server Components.
const CRUMB_LINK =
  "rounded-sm transition-colors duration-200 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// Anillo de foco claro: el ring-ring/50 por defecto apenas contrasta sobre el bloque navy.
const HERO_FOCUS = "focus-visible:border-primary-foreground focus-visible:ring-primary-foreground";

// Guardar y Compartir en `lg`: outline sobre el bloque navy.
const HERO_ICON_BUTTON = cn(
  "size-12 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
  HERO_FOCUS,
);

type EventDetailHeaderProps = {
  event: EventDetail;
  purchaseHref: string;
};

export function EventDetailHeader({ event, purchaseHref }: EventDetailHeaderProps) {
  const ctaLabel =
    event.priceFrom === 0
      ? "Ver entradas · Entrada libre"
      : `Comprar entradas · desde ${formatEventPrice(event.priceFrom)}`;

  return (
    <header className="flex flex-col gap-4 md:gap-6">
      <div className="-mx-2 flex items-center justify-between lg:hidden">
        <Link
          href="/eventos"
          aria-label="Volver a eventos"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11 cursor-pointer duration-200")}
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div className="flex items-center gap-1">
          <SaveEventButton slug={event.slug} />
          <ShareEventButton title={event.title} />
        </div>
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

      <div className="grid overflow-hidden rounded-3xl bg-brand-navy text-primary-foreground lg:min-h-[28rem] lg:grid-cols-2">
        <div className="relative aspect-[16/9] lg:order-last lg:aspect-auto">
          <EventCoverImage
            src={event.imageUrl}
            alt={`${event.title} en ${event.venue}, ${event.city}`}
            fill
            preload
            sizes="(min-width: 1280px) 608px, (min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-6 p-6 md:p-8 lg:p-10 xl:p-12">
          <div className="flex flex-col gap-4">
            <Badge variant="outline" className="h-7 border-primary-foreground/30 px-3 text-primary-foreground">
              {event.categoryName}
            </Badge>
            <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance wrap-break-word md:text-5xl lg:text-4xl xl:text-5xl">
              {event.title}
            </h1>
            <ul className="flex flex-col gap-2 text-base font-medium text-primary-foreground/80">
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
            </ul>
          </div>

          <div className="mt-auto flex items-center gap-3">
            {event.status === "sold-out" ? (
              <p className="flex h-12 flex-1 items-center font-bold">Entradas agotadas</p>
            ) : (
              <Link
                href={purchaseHref}
                className={cn(
                  buttonVariants(),
                  "h-auto min-h-12 flex-1 cursor-pointer px-6 py-2 text-center text-base font-semibold whitespace-normal duration-200 hover:bg-primary-strong",
                  HERO_FOCUS,
                )}
              >
                {ctaLabel}
              </Link>
            )}
            <div className="hidden items-center gap-3 lg:flex">
              <SaveEventButton slug={event.slug} className={HERO_ICON_BUTTON} />
              <ShareEventButton title={event.title} className={HERO_ICON_BUTTON} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
