"use client";

import Link from "next/link";
import {
  CalendarPlus,
  Ellipsis,
  MapPin,
  ShoppingCart,
  Ticket,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildIcsEvent, downloadIcs } from "@/lib/calendar";
import { cn } from "@/lib/utils";

import type { EventDetail } from "../types/events.types";
import { buildDirectionsUrl } from "../utils/venueMap";

const ACTION = cn(
  buttonVariants({ variant: "outline" }),
  "h-11 flex-1 cursor-pointer gap-2 px-4 font-semibold duration-200 sm:flex-none sm:px-6",
);

type EventActionBarProps = {
  event: Pick<
    EventDetail,
    "slug" | "title" | "startsAt" | "venue" | "address" | "city" | "status"
  >;
  /** Con mapa del recinto, la página de entradas; sin mapa, el selector de la misma página (`#entradas`). */
  purchaseHref: string;
};

// Encima de «Acerca del evento» (Ronald, 2026-10-08): Mi entrada · Comprar · Más.
// «Mi entrada» pide iniciar sesión (proxy de /mis-entradas); comprar sigue abierto a invitados.
export function EventActionBar({ event, purchaseHref }: EventActionBarProps) {
  const soldOut = event.status === "sold-out";

  function handleAddToCalendar() {
    downloadIcs(
      `${event.slug}.ics`,
      buildIcsEvent({
        title: event.title,
        startsAt: event.startsAt,
        location: `${event.venue}, ${event.city}`,
        description: "Mentec Tickets",
      }),
    );
  }

  return (
    <nav aria-label="Acciones del evento" className="flex gap-2 sm:gap-3">
      <Link href="/mis-entradas" className={ACTION}>
        <Ticket aria-hidden className="size-4" />
        Mi entrada
      </Link>
      {soldOut ? (
        <span
          aria-disabled
          className={cn(ACTION, "pointer-events-none opacity-60")}
        >
          Agotado
        </span>
      ) : (
        <Link
          href={purchaseHref}
          className={cn(
            ACTION,
            "border-transparent bg-primary text-primary-foreground hover:bg-primary-strong hover:text-primary-foreground",
          )}
        >
          <ShoppingCart aria-hidden className="size-4" />
          Comprar
        </Link>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className={ACTION}>
          <Ellipsis aria-hidden className="size-4" />
          Más
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-52 p-1.5">
          <DropdownMenuItem
            className="min-h-11 gap-2"
            onClick={handleAddToCalendar}
          >
            <CalendarPlus aria-hidden />
            Agregar al calendario
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11 gap-2"
            render={
              <a
                href={buildDirectionsUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <MapPin aria-hidden />
            Cómo llegar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
