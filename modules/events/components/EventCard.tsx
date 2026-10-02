import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { EVENT_CATEGORY_LABELS } from "../data/categories";
import type { Event, EventStatus } from "../types/events.types";
import { formatEventDate, formatEventPrice } from "../utils/formatEvent";

type EventCardProps = {
  event: Event;
  className?: string;
};

// Texto navy sobre warning/destructive: blanco no llega a 4.5:1 (MASTER §2, §11).
const STATUS_BADGE: Record<EventStatus, { label: string; className: string }> = {
  available: { label: "Disponible", className: "bg-accent text-accent-foreground" },
  "low-stock": { label: "Últimas entradas", className: "bg-warning text-warning-foreground" },
  "sold-out": { label: "Agotado", className: "bg-destructive text-foreground" },
};

const CTA_CLASS = cn(
  buttonVariants({ variant: "outline" }),
  "h-11 w-full cursor-pointer font-semibold text-primary-strong duration-200 hover:bg-accent hover:text-primary-strong focus-visible:ring-ring",
);

function EventPrice({ priceFrom }: Pick<Event, "priceFrom">) {
  if (priceFrom === 0) return <span className="font-bold">Entrada libre</span>;
  return (
    <>
      Desde <span className="font-bold">{formatEventPrice(priceFrom)}</span>
    </>
  );
}

export function EventCard({ event, className }: EventCardProps) {
  const href = `/eventos/${event.slug}`;
  const soldOut = event.status === "sold-out";
  const status = STATUS_BADGE[event.status];

  return (
    <Card
      className={cn(
        "group h-full gap-0 rounded-2xl py-0 ring-border transition-shadow duration-200 ease-out hover:shadow-lg hover:shadow-foreground/5",
        className,
      )}
    >
      <div className="relative">
        <Link href={href} tabIndex={-1} aria-hidden className="relative block aspect-[4/3] overflow-hidden">
          <Image
            src={event.imageUrl}
            alt={`${event.title} en ${event.venue}, ${event.city}`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-105"
          />
        </Link>
        <Badge variant="secondary" className="absolute top-3 left-3 h-6 px-2.5 font-bold">
          {EVENT_CATEGORY_LABELS[event.category]}
        </Badge>
      </div>
      <CardContent className="flex flex-1 flex-col gap-1.5 p-4">
        <time dateTime={event.startsAt} className="text-xs font-bold tracking-wider text-primary-strong uppercase">
          {formatEventDate(event.startsAt)}
        </time>
        <h3 className="line-clamp-2 text-base leading-snug font-bold md:text-lg">
          <Link
            href={href}
            className="rounded-sm outline-none hover:text-primary-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {event.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {event.venue}, {event.city}
          </span>
        </p>
        <div className="mt-auto flex flex-col gap-3 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className={cn("text-sm font-medium", soldOut && "text-muted-foreground line-through")}>
              <EventPrice priceFrom={event.priceFrom} />
            </p>
            <Badge className={cn("h-6 px-2.5 font-bold", status.className)}>{status.label}</Badge>
          </div>
          {soldOut ? (
            <button type="button" disabled className={CTA_CLASS}>
              Ver entradas<span className="sr-only"> de {event.title}</span>
            </button>
          ) : (
            <Link href={href} className={CTA_CLASS}>
              Ver entradas<span className="sr-only"> de {event.title}</span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
