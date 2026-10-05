import type { ReactNode } from "react";
import Link from "next/link";

import { EventCoverImage } from "@/components/shared/EventCoverImage";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TEXT_LINK } from "@/lib/linkStyles";
import { cn } from "@/lib/utils";
import { formatEventPrice, formatShortDayMonth } from "@/modules/events/format";
import type { CheckoutOrder } from "../types/checkout.types";
import { formatCompactSeats, formatTicketCount } from "../utils/summaryFormat";

type OrderSummaryProps = {
  order: CheckoutOrder;
  changeHref?: string;
  footer?: ReactNode;
};

export function OrderSummary({ order, changeHref, footer }: OrderSummaryProps) {
  const { event, items, ticketCount, total } = order;

  return (
    <Card className="rounded-2xl ring-border">
      <CardContent className="flex flex-col gap-5">
        <h2 className="sr-only">Resumen del pedido</h2>

        <div className="flex items-center gap-3">
          <EventCoverImage
            src={event.imageUrl}
            alt=""
            width={64}
            height={64}
            sizes="64px"
            className="size-16 shrink-0 rounded-xl object-cover max-lg:hidden"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="line-clamp-2 leading-snug font-bold max-lg:hidden">{event.title}</p>
            <p className="text-sm text-muted-foreground">
              <time dateTime={event.startsAt}>{formatShortDayMonth(event.startsAt)}</time> · {event.venue}, {event.city}
            </p>
          </div>
        </div>

        <Separator />

        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.ticketTypeId} className="flex flex-col gap-0.5 text-base">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-medium">
                  {item.quantity} × {item.name}
                </span>
                <span className="font-semibold tabular-nums">{formatEventPrice(item.unitPrice * item.quantity)}</span>
              </div>
              {item.seats && (
                <p className="text-sm text-muted-foreground">
                  <span className="sr-only">Asientos: </span>
                  {formatCompactSeats(item.seats)}
                </p>
              )}
            </li>
          ))}
        </ul>

        {changeHref && (
          <Link href={changeHref} className={cn(TEXT_LINK, "w-fit font-semibold")}>
            Cambiar entradas
          </Link>
        )}

        <Separator className="h-0 border-t border-dashed border-border bg-transparent data-horizontal:h-0" />

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-base font-bold">
              Total <span className="font-normal text-muted-foreground">({formatTicketCount(ticketCount)})</span>
            </span>
            <span className="text-xl font-bold tabular-nums">{formatEventPrice(total)}</span>
          </div>
          <p className="text-sm text-muted-foreground">Precio final, sin cargos ocultos</p>
        </div>

        {footer}
      </CardContent>
    </Card>
  );
}
