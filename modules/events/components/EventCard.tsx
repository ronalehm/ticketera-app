import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { EVENT_CATEGORY_LABELS } from "../data/categories";
import type { Event } from "../types/events.types";
import { formatEventDate, formatEventPrice } from "../utils/formatEvent";

type EventCardProps = {
  event: Event;
  className?: string;
};

// Texto navy sobre warning/destructive: blanco no llega a 4.5:1 (MASTER §2, §11).
function EventBadge({ event }: { event: Event }) {
  const className = "absolute top-3 left-3 h-6 px-2.5 font-bold";
  if (event.status === "sold-out") {
    return <Badge className={cn(className, "bg-destructive text-foreground")}>Agotado</Badge>;
  }
  if (event.status === "low-stock") {
    return <Badge className={cn(className, "bg-warning text-warning-foreground")}>Últimas entradas</Badge>;
  }
  return (
    <Badge variant="secondary" className={className}>
      {EVENT_CATEGORY_LABELS[event.category]}
    </Badge>
  );
}

function EventPrice({ status, priceFrom }: Pick<Event, "status" | "priceFrom">) {
  if (status === "sold-out") return <span className="text-muted-foreground">Agotado</span>;
  if (priceFrom === 0) return <span className="font-bold">Entrada libre</span>;
  return (
    <>
      Desde <span className="font-bold">{formatEventPrice(priceFrom)}</span>
    </>
  );
}

export function EventCard({ event, className }: EventCardProps) {
  return (
    <Link
      href={`/eventos/${event.slug}`}
      className={cn(
        "group block h-full cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <Card className="h-full gap-0 rounded-2xl py-0 ring-border transition-shadow duration-200 ease-out group-hover:shadow-lg group-hover:shadow-foreground/5">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={event.imageUrl}
            alt={`${event.title} en ${event.venue}, ${event.city}`}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-105"
          />
          <EventBadge event={event} />
        </div>
        <CardContent className="flex flex-1 flex-col gap-1.5 p-4">
          <time dateTime={event.startsAt} className="text-xs font-bold tracking-wider text-primary-strong uppercase">
            {formatEventDate(event.startsAt)}
          </time>
          <h3 className="line-clamp-2 text-base leading-snug font-bold md:text-lg">{event.title}</h3>
          <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {event.venue}, {event.city}
            </span>
          </p>
          <p className="mt-auto pt-2 text-sm font-medium">
            <EventPrice status={event.status} priceFrom={event.priceFrom} />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
