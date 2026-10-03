import Image from "next/image";
import { CalendarDays, MapPin } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatEventDate, formatEventPrice } from "@/modules/events";
import type { CheckoutOrder } from "../types/checkout.types";

export function OrderSummary({ order }: { order: CheckoutOrder }) {
  const { event, items, total } = order;

  return (
    <Card className="gap-5 rounded-2xl ring-border">
      <CardHeader>
        <h2 className="text-xl font-bold tracking-tight">Resumen del pedido</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex gap-4">
          <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image src={event.imageUrl} alt={event.title} fill sizes="96px" className="object-cover" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="line-clamp-2 text-base leading-snug font-bold">{event.title}</p>
            <p className="flex items-center gap-2 text-sm font-medium text-primary-strong">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              <time dateTime={event.startsAt} className="font-bold tracking-wider uppercase">
                {formatEventDate(event.startsAt)}
              </time>
            </p>
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden />
              <span>
                {event.venue}, {event.city}
              </span>
            </p>
          </div>
        </div>

        <Separator />

        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.ticketTypeId} className="flex items-baseline justify-between gap-3 text-base">
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">{item.name}</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {item.quantity} × {formatEventPrice(item.unitPrice)}
                </span>
                {item.seats && (
                  <ul aria-label={`Asientos de ${item.name}`} className="text-sm text-muted-foreground">
                    {item.seats.map((seat) => (
                      <li key={seat.id}>{seat.label}</li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="font-bold tabular-nums">{formatEventPrice(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <Separator />

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-base font-bold">Total</span>
            <span className="text-xl font-bold tabular-nums">{formatEventPrice(total)}</span>
          </div>
          <p className="text-sm text-muted-foreground">Precio final, sin cargos ocultos</p>
        </div>
      </CardContent>
    </Card>
  );
}
