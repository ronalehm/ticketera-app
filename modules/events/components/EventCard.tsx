import Image from "next/image";
import Link from "next/link";
import { cva } from "class-variance-authority";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { EVENT_CATEGORY_LABELS } from "../data/categories";
import { EVENT_STATUS_BADGE } from "../data/eventStatus";
import type { Event } from "../types/events.types";
import { formatEventDate, formatEventPrice } from "../utils/formatEvent";

type EventCardLayout = "grid" | "ticket";

type EventCardProps = {
  event: Event;
  /** `ticket`: tarjeta horizontal tipo entrada por debajo de `sm`; desde `sm` es igual a `grid`. */
  layout?: EventCardLayout;
  className?: string;
};

// `ticket` solo añade clases `max-sm:`; desde `sm` ambas variantes son idénticas.
const cardVariants = cva(
  "group h-full gap-0 rounded-2xl py-0 ring-border transition-shadow duration-200 ease-out hover:shadow-lg hover:shadow-foreground/5",
  {
    variants: { layout: { grid: "", ticket: "max-sm:relative max-sm:min-h-32 max-sm:flex-row" } },
    defaultVariants: { layout: "grid" },
  },
);

const mediaVariants = cva("relative", {
  variants: { layout: { grid: "", ticket: "max-sm:w-27 max-sm:shrink-0" } },
  defaultVariants: { layout: "grid" },
});

const imageLinkVariants = cva("relative block aspect-[4/3] overflow-hidden", {
  variants: { layout: { grid: "", ticket: "max-sm:absolute max-sm:inset-0 max-sm:aspect-auto" } },
  defaultVariants: { layout: "grid" },
});

const categoryBadgeVariants = cva("absolute top-3 left-3 h-6 px-2.5 font-bold", {
  variants: { layout: { grid: "", ticket: "max-sm:top-2 max-sm:left-2" } },
  defaultVariants: { layout: "grid" },
});

const contentVariants = cva("flex flex-1 flex-col gap-1.5 p-4", {
  variants: {
    layout: {
      grid: "",
      ticket: "max-sm:min-w-0 max-sm:gap-1 max-sm:border-l max-sm:border-dashed max-sm:border-border max-sm:px-3.5 max-sm:py-3",
    },
  },
  defaultVariants: { layout: "grid" },
});

// En `ticket` el enlace del título se estira sobre toda la tarjeta (sin CTA en móvil).
const titleLinkVariants = cva(
  "rounded-sm outline-none hover:text-primary-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: { layout: { grid: "", ticket: "max-sm:after:absolute max-sm:after:inset-0" } },
    defaultVariants: { layout: "grid" },
  },
);

const footerVariants = cva("mt-auto flex flex-col gap-3 pt-3", {
  variants: { layout: { grid: "", ticket: "max-sm:pt-1.5" } },
  defaultVariants: { layout: "grid" },
});

const ctaVariants = cva(
  cn(
    buttonVariants({ variant: "outline" }),
    "h-11 w-full cursor-pointer font-semibold text-primary-strong duration-200 hover:bg-accent hover:text-primary-strong focus-visible:ring-ring",
  ),
  {
    variants: { layout: { grid: "", ticket: "max-sm:hidden" } },
    defaultVariants: { layout: "grid" },
  },
);

const IMAGE_SIZES: Record<EventCardLayout, string> = {
  grid: "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  ticket: "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 108px",
};

const NOTCH_CLASS = "absolute -right-2.5 size-5 rounded-full bg-background ring-1 ring-border sm:hidden";

function EventPrice({ priceFrom }: Pick<Event, "priceFrom">) {
  if (priceFrom === 0) return <span className="font-bold">Entrada libre</span>;
  return (
    <>
      Desde <span className="font-bold">{formatEventPrice(priceFrom)}</span>
    </>
  );
}

export function EventCard({ event, layout = "grid", className }: EventCardProps) {
  const href = `/eventos/${event.slug}`;
  const soldOut = event.status === "sold-out";
  const status = EVENT_STATUS_BADGE[event.status];
  const ctaClass = ctaVariants({ layout });

  return (
    <Card className={cn(cardVariants({ layout }), className)}>
      <div className={mediaVariants({ layout })}>
        <Link href={href} tabIndex={-1} aria-hidden className={imageLinkVariants({ layout })}>
          <Image
            src={event.imageUrl}
            alt={`${event.title} en ${event.venue}, ${event.city}`}
            fill
            sizes={IMAGE_SIZES[layout]}
            className="object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-105"
          />
        </Link>
        <Badge variant="secondary" className={categoryBadgeVariants({ layout })}>
          {EVENT_CATEGORY_LABELS[event.category]}
        </Badge>
        {layout === "ticket" && (
          <>
            <span aria-hidden className={cn(NOTCH_CLASS, "-top-2.5")} />
            <span aria-hidden className={cn(NOTCH_CLASS, "-bottom-2.5")} />
          </>
        )}
      </div>
      <CardContent className={contentVariants({ layout })}>
        <time dateTime={event.startsAt} className="text-xs font-bold tracking-wider text-primary-strong uppercase">
          {formatEventDate(event.startsAt)}
        </time>
        <h3 className="line-clamp-2 text-base leading-snug font-bold md:text-lg">
          <Link href={href} className={titleLinkVariants({ layout })}>
            {event.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {event.venue}, {event.city}
          </span>
        </p>
        <div className={footerVariants({ layout })}>
          <div className="flex items-center justify-between gap-2">
            <p className={cn("text-sm font-medium", soldOut && "text-muted-foreground line-through")}>
              <EventPrice priceFrom={event.priceFrom} />
            </p>
            <Badge className={cn("h-6 px-2.5 font-bold", status.className)}>{status.label}</Badge>
          </div>
          {soldOut ? (
            <button type="button" disabled className={ctaClass}>
              Ver entradas<span className="sr-only"> de {event.title}</span>
            </button>
          ) : (
            <Link href={href} className={ctaClass}>
              Ver entradas<span className="sr-only"> de {event.title}</span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
