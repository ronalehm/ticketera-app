import { EventCoverImage } from "@/components/shared/EventCoverImage";
import { cn } from "@/lib/utils";
import type { Order } from "@/modules/checkout/orders";
import { formatEventDate } from "@/modules/events/format";
import { formatOrderZones, formatTicketCount } from "../utils/myOrders";

type OrderListProps = {
  orders: Order[];
  selectedCode: string;
  onSelect: (code: string) => void;
};

/** Pedidos del comprador: fila con scroll horizontal bajo `lg` y columna vertical desde `lg`. */
export function OrderList({ orders, selectedCode, onSelect }: OrderListProps) {
  return (
    <ul
      aria-label="Pedidos"
      className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 py-1.5 md:-mx-6 md:scroll-px-6 md:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:py-0"
    >
      {orders.map((order) => {
        const selected = order.code === selectedCode;
        return (
          <li key={order.code} className="shrink-0 snap-start">
            <button
              type="button"
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(order.code)}
              className={cn(
                "flex w-[270px] cursor-pointer items-center gap-3 rounded-2xl bg-background p-2.5 text-left transition-shadow duration-200 outline-none hover:shadow-lg hover:shadow-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none lg:w-full lg:gap-4 lg:p-3.5",
                selected ? "ring-2 ring-primary" : "ring-1 ring-border",
              )}
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted lg:size-18">
                <EventCoverImage src={order.event.imageUrl} alt="" fill sizes="72px" className="object-cover" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-base font-bold">{order.event.title}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {formatEventDate(order.event.startsAt)} · {order.event.city}
                </span>
                <span className="truncate text-sm font-medium text-primary-strong">
                  {formatTicketCount(order.ticketCount)} · {formatOrderZones(order.items)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
