"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";

import { EmptyState, type EmptyStateProps } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Order } from "@/modules/checkout/orders";
import { useMyOrders } from "../hooks/useMyOrders";
import type { OrderTimeframe } from "../types/tickets.types";
import { OrderList } from "./OrderList";
import { TicketCard } from "./TicketCard";

const PAGE_TITLE = <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Mis entradas</h1>;

const PANEL_GRID = "grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[400px_minmax(0,1fr)]";

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

/** Página "Mis entradas": límite cliente; el contenido depende de la sesión y las órdenes guardadas en el navegador. */
export function MyTickets() {
  const state = useMyOrders();

  return (
    <section className="bg-muted print:bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:px-8 print:p-0">
        {state.status === "ready" ? (
          <Tabs defaultValue="upcoming" className="gap-6 md:gap-8">
            {/* Al imprimir ("Descargar PDF") solo queda la tarjeta de la entrada: se ocultan h1, pestañas y lista. */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between print:hidden">
              {PAGE_TITLE}
              <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl bg-background p-1 ring-1 ring-border group-data-horizontal/tabs:h-auto md:w-auto">
                {TIMEFRAMES.map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold text-muted-foreground duration-200 hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:hover:text-primary-foreground"
                  >
                    {`${label} (${state[value].length})`}
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
                {state[value].length > 0 ? (
                  <OrdersPanel orders={state[value]} timeframe={value} />
                ) : (
                  <EmptyState icon={Ticket} {...empty} />
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex flex-col gap-6 md:gap-8">
            {PAGE_TITLE}
            {state.status === "loading" ? (
              <LoadingState />
            ) : (
              <EmptyState
                icon={Ticket}
                title="Inicia sesión para ver tus entradas"
                description="Ingresa con tu cuenta para ver y descargar tus entradas cuando quieras."
                actionLabel="Iniciar sesión"
                actionHref="/login"
              />
            )}
          </div>
        )}
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
    <div className={cn(PANEL_GRID, "print:block")}>
      <div className="min-w-0 print:hidden">
        <OrderList orders={orders} selectedCode={selected.code} onSelect={setSelectedCode} />
      </div>
      <TicketCard key={selected.code} order={selected} timeframe={timeframe} />
    </div>
  );
}

const SKELETON = "bg-background motion-reduce:animate-none";

function LoadingState() {
  return (
    <div role="status">
      <span className="sr-only">Cargando tus entradas…</span>
      <div aria-hidden className="flex flex-col gap-6 md:gap-8">
        <Skeleton className={cn(SKELETON, "h-13 w-full rounded-xl md:w-72")} />
        <div className={PANEL_GRID}>
          <div className="flex gap-3 overflow-hidden py-1.5 lg:flex-col lg:py-0">
            {[0, 1].map((index) => (
              <Skeleton key={index} className={cn(SKELETON, "h-19 w-[270px] shrink-0 rounded-2xl lg:h-25 lg:w-full")} />
            ))}
          </div>
          <Skeleton className={cn(SKELETON, "h-[640px] rounded-2xl sm:h-[520px] md:h-[600px]")} />
        </div>
      </div>
    </div>
  );
}
