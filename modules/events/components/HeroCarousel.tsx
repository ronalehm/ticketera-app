"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import { CalendarDays, MapPin } from "lucide-react";

import { EventCoverImage } from "@/components/shared/EventCoverImage";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

import type { Event } from "../types/events.types";
import { formatEventDate } from "../utils/formatEvent";

const navButtonClassName =
  "size-11 cursor-pointer border-0 bg-background/80 backdrop-blur hover:bg-background max-sm:top-4 max-sm:bottom-auto [&_svg:not([class*='size-'])]:size-5";

export function HeroCarousel({ events }: { events: Event[] }) {
  const [api, setApi] = useState<CarouselApi>();
  // playOnInit false: solo arranca en cliente si el usuario no pide movimiento reducido.
  const [autoplay] = useState(() =>
    Autoplay({ delay: 6000, playOnInit: false, stopOnMouseEnter: true, stopOnInteraction: true }),
  );

  useEffect(() => {
    if (api && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) autoplay.play();
  }, [api, autoplay]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!api) return () => {};
      api.on("select", onChange).on("reInit", onChange);
      return () => {
        api.off("select", onChange).off("reInit", onChange);
      };
    },
    [api],
  );
  const selected = useSyncExternalStore(
    subscribe,
    () => api?.selectedScrollSnap() ?? 0,
    () => 0,
  );

  return (
    <section aria-labelledby="home-title" className="mx-auto max-w-7xl px-4 pt-8 md:px-6 md:pt-12 lg:px-8">
      <div className="mb-6 md:mb-8">
        <h1 id="home-title" className="text-3xl leading-[1.05] font-extrabold tracking-tight text-foreground md:text-5xl">
          Encuentra tu próximo plan <span className="text-primary">en vivo</span>
        </h1>
        <p className="mt-2 text-base text-muted-foreground md:mt-3 md:text-lg">
          Conciertos, teatro, deportes y más en todo el Perú.
        </p>
      </div>
      <Carousel
        opts={{ loop: true }}
        plugins={[autoplay]}
        setApi={setApi}
        onFocusCapture={() => autoplay.stop()}
        aria-label="Eventos en portada"
      >
        <CarouselContent>
          {events.map((event, index) => (
            <CarouselItem key={event.id} aria-label={`${index + 1} de ${events.length}`}>
              <div className="relative isolate flex aspect-[4/5] min-h-[26rem] items-end overflow-hidden rounded-2xl sm:aspect-[16/9] lg:aspect-[21/8]">
                <EventCoverImage
                  src={event.imageUrl}
                  alt={`${event.title} en ${event.venue}, ${event.city}`}
                  fill
                  preload={index === 0}
                  sizes="(min-width: 1280px) 1216px, 100vw"
                  className="-z-10 object-cover"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-navy/90 via-brand-navy/40 to-transparent" />
                <div className="flex max-w-2xl flex-col items-start gap-3 p-6 pb-16 text-white md:gap-4 md:p-10 md:pb-16">
                  <Badge className="h-6 bg-highlight px-2.5 font-bold text-highlight-foreground">
                    {event.categoryName}
                  </Badge>
                  <h2 className="line-clamp-3 text-3xl leading-[1.05] font-extrabold tracking-tight md:text-5xl lg:text-6xl">
                    {event.title}
                  </h2>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium md:text-base">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-4" aria-hidden />
                      <time dateTime={event.startsAt}>{formatEventDate(event.startsAt)}</time>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" aria-hidden />
                      {event.venue}, {event.city}
                    </span>
                  </p>
                  <Link
                    href={`/eventos/${event.slug}`}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "mt-1 h-11 cursor-pointer px-6 font-semibold hover:bg-primary-strong",
                    )}
                  >
                    Comprar entradas
                  </Link>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label="Slide anterior" className={cn(navButtonClassName, "left-4")} />
        <CarouselNext aria-label="Slide siguiente" className={cn(navButtonClassName, "right-4")} />
        {/* El texto deja pb-16 para no pisar los puntos (size-11 en bottom-4). */}
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          {events.map((event, index) => (
            <button
              key={event.id}
              type="button"
              aria-label={`Ir al slide ${index + 1}`}
              aria-current={index === selected ? "true" : undefined}
              onClick={() => api?.scrollTo(index)}
              className="group grid size-11 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span className="h-2 w-2 rounded-full bg-white/60 transition-all duration-200 ease-out group-hover:bg-white group-aria-[current=true]:w-6 group-aria-[current=true]:bg-white" />
            </button>
          ))}
        </div>
      </Carousel>
    </section>
  );
}
