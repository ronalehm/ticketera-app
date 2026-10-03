"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { EVENT_STATUS_BADGE } from "../data/eventStatus";
import type { EventStatus, TicketType } from "../types/events.types";
import { formatEventPrice } from "../utils/formatEvent";
import { MAX_TICKETS_PER_ORDER, buildCheckoutHref, getOrderTotal, getTicketCount } from "../utils/ticketOrder";

export type TicketSelectorProps = {
  slug: string;
  status: EventStatus;
  priceFrom: number;
  ticketTypes: TicketType[];
  initialQuantities?: Record<string, number>;
};

const CTA_CLASS = cn(
  buttonVariants(),
  "h-11 w-full cursor-pointer font-semibold duration-200 hover:bg-primary-strong focus-visible:ring-ring",
);

// focusableWhenDisabled no pone `disabled`: se neutralizan a mano el hover y el desplazamiento al pulsar del Button.
const STEPPER_CLASS =
  "size-11 cursor-pointer aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-background aria-disabled:dark:hover:bg-input/30 aria-disabled:active:not-aria-[haspopup]:translate-y-0";

export function TicketSelector({ slug, status, priceFrom, ticketTypes, initialQuantities }: TicketSelectorProps) {
  const soldOut = status === "sold-out";
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    soldOut ? {} : (initialQuantities ?? {}),
  );
  const count = getTicketCount(quantities);
  const atLimit = count >= MAX_TICKETS_PER_ORDER;

  const change = (id: string, delta: number) =>
    setQuantities((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) }));

  return (
    <Card className="gap-5 rounded-2xl ring-border lg:sticky lg:top-24">
      <CardHeader className="gap-1">
        <h2 className="text-xl font-bold tracking-tight">Entradas</h2>
        <p className="text-sm font-medium text-muted-foreground">
          {priceFrom === 0 ? (
            <span className="font-bold text-foreground">Entrada libre</span>
          ) : (
            <>
              Desde <span className="font-bold text-foreground">{formatEventPrice(priceFrom)}</span>
            </>
          )}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <ul className="flex flex-col divide-y divide-border">
          {ticketTypes.map((type) => {
            const quantity = quantities[type.id] ?? 0;
            const typeSoldOut = type.status === "sold-out";
            const badge = EVENT_STATUS_BADGE[type.status];
            return (
              <li key={type.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-bold">{type.name}</p>
                  <Badge className={cn("h-6 shrink-0 px-2.5 font-bold", badge.className)}>{badge.label}</Badge>
                </div>
                {type.description && <p className="text-sm text-muted-foreground">{type.description}</p>}
                <div className="flex items-center justify-between gap-3">
                  <p className={cn("text-base font-bold", typeSoldOut && "text-muted-foreground line-through")}>
                    {formatEventPrice(type.price)}
                  </p>
                  {!soldOut && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className={STEPPER_CLASS}
                        aria-label={`Quitar una entrada ${type.name}`}
                        disabled={typeSoldOut || quantity === 0}
                        focusableWhenDisabled={!typeSoldOut}
                        onClick={() => change(type.id, -1)}
                      >
                        <Minus className="size-5" aria-hidden />
                      </Button>
                      <span aria-live="polite" className="w-6 text-center text-base font-bold tabular-nums">
                        {quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className={STEPPER_CLASS}
                        aria-label={`Añadir una entrada ${type.name}`}
                        disabled={typeSoldOut || atLimit}
                        focusableWhenDisabled={!typeSoldOut}
                        onClick={() => change(type.id, 1)}
                      >
                        <Plus className="size-5" aria-hidden />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {soldOut ? (
          <p className="rounded-lg bg-muted p-3 text-center text-base font-bold">Entradas agotadas</p>
        ) : (
          <>
            <p role="status" className="text-sm font-medium text-muted-foreground empty:hidden">
              {atLimit && `Máximo ${MAX_TICKETS_PER_ORDER} entradas por compra`}
            </p>
            <Separator />
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base font-bold">Total</span>
                <span aria-live="polite" className="text-xl font-bold tabular-nums">
                  {formatEventPrice(getOrderTotal(ticketTypes, quantities))}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Precio final, sin cargos ocultos</p>
            </div>
            {count === 0 ? (
              <button type="button" disabled className={CTA_CLASS}>
                Continuar con la compra
              </button>
            ) : (
              <Link href={buildCheckoutHref(slug, quantities)} className={CTA_CLASS}>
                Continuar con la compra
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
