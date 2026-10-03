"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import { CalendarDays, CalendarPlus, Clock, MapPin } from "lucide-react";

import { DateChip } from "@/components/shared/DateChip";
import { TicketPager } from "@/components/shared/TicketPager";
import { TicketQr } from "@/components/shared/TicketQr";
import { TicketsPdfButton } from "@/components/shared/TicketsPdfButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildIcsEvent, downloadIcs } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { buildTicketPdfInput, type Order } from "@/modules/checkout/orders";
import { formatLongDate, formatTime } from "@/modules/events/format";
import type { OrderTimeframe } from "../types/tickets.types";
import { formatTicketCount, getDateChipParts } from "../utils/myOrders";

type TicketCardProps = {
  order: Order;
  timeframe: OrderTimeframe;
};

const NOTCH_CLASS = "absolute -top-3 size-6 rounded-full bg-muted ring-1 ring-border";

const ACTION_CLASS =
  "h-11 w-full cursor-pointer gap-2 px-4 font-semibold text-primary-strong duration-200 hover:bg-accent hover:text-primary-strong sm:w-auto [&_svg:not([class*='size-'])]:size-5";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Entrada seleccionada como boleto: imagen con chip de fecha, datos del evento, talón, QR con navegación entre entradas
 * y acciones (PDF con todas las entradas del pedido / calendario).
 */
export function TicketCard({ order, timeframe }: TicketCardProps) {
  const [ticketIndex, setTicketIndex] = useState(0);
  const { event, tickets } = order;
  const ticket = tickets[ticketIndex];
  const chip = getDateChipParts(event.startsAt);

  function handleAddToCalendar() {
    downloadIcs(
      `${event.slug}.ics`,
      buildIcsEvent({
        title: event.title,
        startsAt: event.startsAt,
        location: `${event.venue}, ${event.city}`,
        description: `Pedido ${order.code} · ${formatTicketCount(order.ticketCount)}`,
      }),
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-border print:break-inside-avoid print:ring-0">
      <div className="relative h-36 bg-muted md:h-48">
        <Image
          src={event.imageUrl}
          alt={`${event.title} en ${event.venue}, ${event.city}`}
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />
        <DateChip month={chip.month} day={chip.day} className="absolute top-3 left-3" />
      </div>

      <div className="flex flex-col gap-3 p-5 md:px-8 md:py-6">
        <h2 className="text-xl leading-tight font-bold tracking-tight md:text-2xl">{event.title}</h2>
        <ul className="flex flex-col gap-1.5 text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
          <li className="flex items-center gap-2">
            <CalendarDays aria-hidden className="size-4 shrink-0" />
            <span>
              <time dateTime={event.startsAt}>{capitalize(formatLongDate(event.startsAt))}</time>
              <span className="sm:hidden"> · {formatTime(event.startsAt)}</span>
            </span>
          </li>
          <li className="hidden items-center gap-2 sm:flex">
            <Clock aria-hidden className="size-4 shrink-0" />
            {formatTime(event.startsAt)}
          </li>
          <li className="flex items-center gap-2">
            <MapPin aria-hidden className="size-4 shrink-0" />
            {event.venue}, {event.city}
          </li>
        </ul>
      </div>

      <div aria-hidden className="relative border-t-2 border-dashed border-border">
        <span className={cn(NOTCH_CLASS, "-left-3")} />
        <span className={cn(NOTCH_CLASS, "-right-3")} />
      </div>

      <div className="flex flex-col items-center gap-6 p-5 sm:flex-row sm:items-center sm:gap-8 md:p-8">
        <div className="size-52 shrink-0 rounded-2xl bg-background p-3 ring-1 ring-border">
          <TicketQr value={ticket.code} className="size-full" />
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <TicketPager
            index={ticketIndex}
            count={tickets.length}
            onIndexChange={setTicketIndex}
            className="print:hidden"
          />

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <TicketDetail label="Zona">{ticket.ticketTypeName}</TicketDetail>
            <TicketDetail label="Titular">{ticket.holderName}</TicketDetail>
            {ticket.seatLabel && (
              <TicketDetail label="Asiento" className="col-span-2">
                {ticket.seatLabel}
              </TicketDetail>
            )}
            <TicketDetail label="Código" className="tabular-nums">
              {ticket.code}
            </TicketDetail>
            <TicketDetail label="Estado">
              {timeframe === "upcoming" ? (
                <Badge className="h-6 bg-accent px-2.5 font-semibold text-accent-foreground">Válida</Badge>
              ) : (
                <Badge variant="secondary" className="h-6 px-2.5 font-semibold">
                  Usada
                </Badge>
              )}
            </TicketDetail>
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap print:hidden">
            <TicketsPdfButton
              variant="outline"
              input={buildTicketPdfInput(order)}
              className={ACTION_CLASS}
              errorClassName="sm:basis-full"
            />
            {timeframe === "upcoming" && (
              <Button type="button" variant="outline" onClick={handleAddToCalendar} className={ACTION_CLASS}>
                <CalendarPlus aria-hidden />
                Agregar al calendario
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function TicketDetail({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold break-words">{children}</dd>
    </div>
  );
}
