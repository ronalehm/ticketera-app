import Image from "next/image";
import { useId, useState } from "react";

import { TicketPager } from "@/components/shared/TicketPager";
import { TicketQr } from "@/components/shared/TicketQr";
import { cn } from "@/lib/utils";
import { EVENT_CATEGORY_LABELS, formatEventPrice, formatLongDayMonth } from "@/modules/events/format";
import type { Order } from "../types/checkout.types";
import { formatCompactSeats } from "../utils/summaryFormat";

type ConfirmationTicketCardProps = {
  order: Order;
};

const NOTCH_CLASS = "absolute size-6 rounded-full bg-background ring-1 ring-border";

/**
 * Tarjeta-entrada de la confirmación: vertical en móvil y horizontal con el talón a la derecha desde `md`.
 * El talón recorre las entradas del pedido (QR, código y titular de la actual).
 */
export function ConfirmationTicketCard({ order }: ConfirmationTicketCardProps) {
  const { event, items, ticketCount, total, tickets } = order;
  const titleId = useId();
  const zones = items.map((item) => item.name).join(", ");
  const itemsWithSeats = items.filter((item) => item.seats && item.seats.length > 0);
  const [ticketIndex, setTicketIndex] = useState(0);
  const ticket = tickets[ticketIndex];

  return (
    <article
      aria-labelledby={titleId}
      className="flex w-full flex-col overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-border md:flex-row"
    >
      <div className="relative h-32 w-full shrink-0 bg-muted md:h-auto md:w-48">
        <Image src={event.imageUrl} alt="" fill sizes="(min-width: 768px) 192px, 100vw" className="object-cover" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5 md:p-6">
        <p className="text-xs font-bold tracking-wider text-primary-strong uppercase">
          {EVENT_CATEGORY_LABELS[event.category]}
        </p>
        <h2 id={titleId} className="text-xl leading-tight font-bold tracking-tight md:text-2xl">
          {event.title}
        </h2>
        <p className="text-muted-foreground">
          <time dateTime={event.startsAt}>{formatLongDayMonth(event.startsAt)}</time> · {event.venue}, {event.city}
        </p>
        {itemsWithSeats.map((item) => (
          <p key={item.ticketTypeId} className="text-sm text-muted-foreground">
            {item.name}: {formatCompactSeats(item.seats ?? [])}
          </p>
        ))}

        <dl className="mt-auto grid grid-cols-3 gap-x-4 gap-y-3 pt-3">
          <div className="flex min-w-0 flex-col">
            <dt className="text-xs text-muted-foreground">Zona</dt>
            <dd className="font-semibold break-words">{zones}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Entradas</dt>
            <dd className="font-semibold tabular-nums">{ticketCount}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Total pagado</dt>
            <dd className="font-semibold tabular-nums">{formatEventPrice(total)}</dd>
          </div>
        </dl>
      </div>

      {ticket && (
        <div className="relative flex shrink-0 flex-col items-center justify-center gap-3 border-t-2 border-dashed border-input p-6 md:w-56 md:border-t-0 md:border-l-2">
          <span aria-hidden className={cn(NOTCH_CLASS, "-top-3 -left-3")} />
          <span
            aria-hidden
            className={cn(NOTCH_CLASS, "-top-3 -right-3 md:top-auto md:right-auto md:-bottom-3 md:-left-3")}
          />
          <TicketQr value={ticket.code} className="size-40 md:size-32" />
          <div className="flex w-full min-w-0 flex-col items-center gap-0.5 text-center">
            <p className="text-sm font-semibold tabular-nums">
              <span className="sr-only">Código de entrada: </span>
              {ticket.code}
            </p>
            {ticket.holderName.trim() && (
              <p className="text-sm break-words text-muted-foreground">Titular: {ticket.holderName}</p>
            )}
          </div>
          <TicketPager
            index={ticketIndex}
            count={tickets.length}
            onIndexChange={setTicketIndex}
            className="print:hidden"
          />
        </div>
      )}
    </article>
  );
}
