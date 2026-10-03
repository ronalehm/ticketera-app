import Image from "next/image";
import Link from "next/link";
import { cva } from "class-variance-authority";
import { CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { EVENT_CATEGORY_LABELS } from "../data/categories";
import { EVENT_STATUS_BADGE } from "../data/eventStatus";
import type { Event, EventStatus } from "../types/events.types";
import { formatEventPrice, formatShortDayMonth, getDateChipParts } from "../utils/formatEvent";

type EventCardLayout = "grid" | "ticket";
type EventCardSurface = "background" | "muted";

type EventCardProps = {
  event: Event;
  /** `ticket`: tarjeta horizontal tipo entrada por debajo de `sm`; desde `sm` es igual a `grid`. */
  layout?: EventCardLayout;
  /** Fondo sobre el que va la tarjeta: las muescas del talón usan ese color. */
  surface?: EventCardSurface;
  className?: string;
};

// `ticket` solo añade clases `max-sm:`; desde `sm` ambas variantes son idénticas.
const cardVariants = cva(
  "group h-full gap-0 rounded-2xl py-0 ring-1 ring-border transition-shadow duration-200 ease-out hover:shadow-lg hover:shadow-foreground/5",
  {
    variants: { layout: { grid: "", ticket: "max-sm:relative max-sm:min-h-32 max-sm:flex-row" } },
    defaultVariants: { layout: "grid" },
  },
);

const mediaVariants = cva("relative h-44 shrink-0", {
  variants: { layout: { grid: "", ticket: "max-sm:h-auto max-sm:w-27" } },
  defaultVariants: { layout: "grid" },
});

const dateChipVariants = cva(
  "absolute top-3 left-3 rounded-xl bg-background px-2.5 py-1.5 text-center leading-none ring-1 ring-border/60",
  {
    variants: { layout: { grid: "", ticket: "max-sm:top-2 max-sm:left-2" } },
    defaultVariants: { layout: "grid" },
  },
);

// En `ticket` (< sm) el estado se muestra en el pie: aquí se oculta para que se anuncie una sola vez.
const imageStatusVariants = cva("absolute top-3 right-3", {
  variants: { layout: { grid: "", ticket: "max-sm:hidden" } },
  defaultVariants: { layout: "grid" },
});

const mainVariants = cva("flex min-w-0 flex-1 flex-col", {
  variants: {
    layout: { grid: "", ticket: "max-sm:border-l max-sm:border-dashed max-sm:border-border" },
  },
  defaultVariants: { layout: "grid" },
});

const contentVariants = cva("flex flex-1 flex-col gap-1.5 p-4", {
  variants: { layout: { grid: "", ticket: "max-sm:gap-1 max-sm:px-3.5 max-sm:pt-3 max-sm:pb-2" } },
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

const stubVariants = cva("relative mt-auto border-t border-dashed border-border", {
  variants: { layout: { grid: "", ticket: "max-sm:hidden" } },
  defaultVariants: { layout: "grid" },
});

const footerVariants = cva("flex flex-wrap items-end justify-between gap-3 p-4", {
  variants: {
    layout: {
      grid: "",
      ticket: "max-sm:flex-nowrap max-sm:items-center max-sm:px-3.5 max-sm:pt-0 max-sm:pb-3",
    },
  },
  defaultVariants: { layout: "grid" },
});

const priceTextVariants = cva("text-xl font-extrabold", {
  variants: { layout: { grid: "", ticket: "max-sm:text-base" } },
  defaultVariants: { layout: "grid" },
});

const ctaVariants = cva(
  cn(
    buttonVariants({ variant: "outline" }),
    "h-11 cursor-pointer rounded-xl px-4 font-semibold text-primary-strong duration-200 hover:bg-accent hover:text-primary-strong focus-visible:ring-ring",
  ),
  {
    variants: { layout: { grid: "", ticket: "max-sm:hidden" } },
    defaultVariants: { layout: "grid" },
  },
);

const soldOutCtaVariants = cva(
  "inline-flex h-11 items-center justify-center rounded-xl bg-muted px-4 text-sm font-semibold text-muted-foreground",
  {
    variants: { layout: { grid: "", ticket: "max-sm:hidden" } },
    defaultVariants: { layout: "grid" },
  },
);

const notchVariants = cva("absolute size-5 rounded-full ring-1 ring-border", {
  variants: { surface: { background: "bg-background", muted: "bg-muted" } },
  defaultVariants: { surface: "background" },
});

const IMAGE_SIZES: Record<EventCardLayout, string> = {
  grid: "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  ticket: "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 108px",
};

// Solo los estados que informan; "Disponible" es el caso normal y no se muestra en la tarjeta.
const CARD_STATUS_BADGE: Partial<Record<EventStatus, string>> = {
  "low-stock": "bg-warning text-warning-foreground",
  "sold-out": "bg-brand-navy text-primary-foreground",
};

const STATUS_BADGE_CLASS = "h-6 rounded-full px-2.5 font-bold";

function DateChip({ iso, layout }: { iso: string; layout: EventCardLayout }) {
  const { month, day } = getDateChipParts(iso);
  return (
    <span aria-hidden className={dateChipVariants({ layout })}>
      <span className="block text-xs font-bold tracking-wider text-primary-strong">{month}</span>
      <span className="mt-0.5 block text-2xl font-extrabold text-foreground tabular-nums">{day}</span>
    </span>
  );
}

function CardPrice({ priceFrom, soldOut, layout }: { priceFrom: number; soldOut: boolean; layout: EventCardLayout }) {
  if (priceFrom === 0) return <p className={priceTextVariants({ layout })}>Entrada libre</p>;
  return (
    <p>
      <span className="block text-xs font-medium text-muted-foreground">Desde</span>{" "}
      <span
        className={cn(
          priceTextVariants({ layout }),
          "block tracking-tight tabular-nums",
          soldOut && "text-muted-foreground line-through",
        )}
      >
        {formatEventPrice(priceFrom)}
      </span>
    </p>
  );
}

function Notch({ surface, className }: { surface: EventCardSurface; className: string }) {
  return <span aria-hidden className={cn(notchVariants({ surface }), className)} />;
}

export function EventCard({ event, layout = "grid", surface = "background", className }: EventCardProps) {
  const href = `/eventos/${event.slug}`;
  const soldOut = event.status === "sold-out";
  const statusClass = CARD_STATUS_BADGE[event.status];
  const statusLabel = EVENT_STATUS_BADGE[event.status].label;

  return (
    <Card className={cn(cardVariants({ layout }), className)}>
      <div className={mediaVariants({ layout })}>
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 block overflow-hidden">
          <Image
            src={event.imageUrl}
            alt={`${event.title} en ${event.venue}, ${event.city}`}
            fill
            sizes={IMAGE_SIZES[layout]}
            className="object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-105"
          />
        </Link>
        <DateChip iso={event.startsAt} layout={layout} />
        {statusClass && (
          <Badge className={cn(STATUS_BADGE_CLASS, statusClass, imageStatusVariants({ layout }))}>{statusLabel}</Badge>
        )}
        {layout === "ticket" && (
          <>
            <Notch surface={surface} className="-top-2.5 -right-2.5 sm:hidden" />
            <Notch surface={surface} className="-right-2.5 -bottom-2.5 sm:hidden" />
          </>
        )}
      </div>

      <div className={mainVariants({ layout })}>
        <CardContent className={contentVariants({ layout })}>
          <p className="text-xs font-bold tracking-wider text-primary-strong uppercase">
            {EVENT_CATEGORY_LABELS[event.category]}
          </p>
          <h3 className="line-clamp-2 text-base leading-snug font-bold md:text-lg">
            <Link href={href} className={titleLinkVariants({ layout })}>
              {event.title}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {event.venue} · {event.city}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            <time dateTime={event.startsAt}>{formatShortDayMonth(event.startsAt)}</time>
          </p>
        </CardContent>

        <div aria-hidden className={stubVariants({ layout })}>
          <Notch surface={surface} className="top-0 -left-2.5 -translate-y-1/2" />
          <Notch surface={surface} className="top-0 -right-2.5 -translate-y-1/2" />
        </div>

        <div className={footerVariants({ layout })}>
          <CardPrice priceFrom={event.priceFrom} soldOut={soldOut} layout={layout} />
          {soldOut ? (
            <button type="button" disabled className={soldOutCtaVariants({ layout })}>
              Agotado<span className="sr-only">: {event.title}</span>
            </button>
          ) : (
            <Link href={href} className={ctaVariants({ layout })}>
              Ver entradas <span className="sr-only">de {event.title}</span>
            </Link>
          )}
          {layout === "ticket" && statusClass && (
            <Badge className={cn(STATUS_BADGE_CLASS, statusClass, "hidden max-sm:inline-flex")}>{statusLabel}</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
