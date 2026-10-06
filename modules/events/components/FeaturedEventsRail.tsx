import Link from "next/link";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { buttonVariants } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

import type { Event } from "../types/events.types";
import { EventCard } from "./EventCard";

// Server Component: Carousel ya es cliente (shadcn) y las tarjetas se renderizan en el servidor.
const navButtonClassName = "static hidden size-11 cursor-pointer sm:inline-flex";

export function FeaturedEventsRail({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
      <Carousel opts={{ align: "start" }} aria-label="Eventos destacados">
        <SectionHeader
          title="Destacados"
          action={
            <div className="flex items-center gap-2">
              <Link
                href="/eventos"
                className={cn(
                  buttonVariants({ variant: "link" }),
                  "h-11 cursor-pointer px-2 font-semibold text-primary-strong",
                )}
              >
                Ver todos
              </Link>
              <CarouselPrevious aria-label="Anteriores destacados" className={navButtonClassName} />
              <CarouselNext aria-label="Siguientes destacados" className={navButtonClassName} />
            </div>
          }
        />
        <CarouselContent className="-ml-4 py-2 md:-ml-6">
          {events.map((event) => (
            <CarouselItem key={event.id} className="basis-[80%] pl-4 sm:basis-1/2 md:pl-6 lg:basis-1/3 xl:basis-1/4">
              <EventCard event={event} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
