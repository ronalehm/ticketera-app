"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";

import { EmptyState, type EmptyStateProps } from "@/components/shared/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Order } from "@/modules/checkout/orders";
import type { OrdersByTimeframe, OrderTimeframe } from "../types/tickets.types";
import { OrderList } from "./OrderList";
import { TicketCard } from "./TicketCard";

const EXPLORE_ACTION = { actionLabel: "Explorar eventos", actionHref: "/eventos" };

const TIMEFRAMES = [
  {
    value: "upcoming",
    label: "Próximas",
    empty: {
      title: "Aún no tienes eventos próximos",
      description: "Cuando compres entradas, las verás aquí.",
      ...EXPLORE_ACTION,
    },
  },
  {
    value: "past",
    label: "Pasadas",
    empty: {
      title: "Aún no tienes eventos pasados",
      description: "Cuando vayas a tu primer evento, lo verás aquí.",
      ...EXPLORE_ACTION,
    },
  },
] as const satisfies { value: OrderTimeframe; label: string; empty: Omit<EmptyStateProps, "icon"> }[];

/** Página "Mis entradas": límite cliente por las pestañas y la selección; las órdenes llegan del servidor. */
export function MyTickets(orders: OrdersByTimeframe) {
  return (
    <section className="bg-muted print:bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:px-8 print:p-0">
        <Tabs defaultValue="upcoming" className="gap-6 md:gap-8">
          {/* Al imprimir ("Descargar PDF") solo queda la tarjeta de la entrada: se ocultan h1, pestañas y lista. */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between print:hidden">
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Mis entradas</h1>
            <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl bg-background p-1 ring-1 ring-border group-data-horizontal/tabs:h-auto md:w-auto">
              {TIMEFRAMES.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold text-muted-foreground duration-200 hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:hover:text-primary-foreground"
                >
                  {`${label} (${orders[value].length})`}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {TIMEFRAMES.map(({ value, empty }) => (
            <TabsContent
              key={value}
              value={value}
              className="rounded-2xl text-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              {orders[value].length > 0 ? (
                <OrdersPanel orders={orders[value]} timeframe={value} />
              ) : (
                <EmptyState icon={Ticket} {...empty} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

type OrdersPanelProps = {
  orders: Order[];
  timeframe: OrderTimeframe;
};

function OrdersPanel({ orders, timeframe }: OrdersPanelProps) {
  const [selectedCode, setSelectedCode] = useState(orders[0].code);
  const selected = orders.find((order) => order.code === selectedCode) ?? orders[0];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[400px_minmax(0,1fr)] print:block">
      <div className="min-w-0 print:hidden">
        <OrderList orders={orders} selectedCode={selected.code} onSelect={setSelectedCode} />
      </div>
      <TicketCard key={selected.code} order={selected} timeframe={timeframe} />
    </div>
  );
}
