"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionUser } from "@/modules/auth/session";
import { useOrdersStore } from "@/modules/checkout/orders";
import type { MyOrdersState, OrdersByTimeframe } from "../types/tickets.types";
import { getUserOrders, splitOrdersByDate } from "../utils/myOrders";

export function useMyOrders(): MyOrdersState {
  // `now` es null hasta rehidratar las órdenes: el primer render (servidor y cliente) es "loading",
  // sin desajuste de hidratación por la fecha. Mientras Clerk carga también es "loading", no un "sin sesión" fugaz.
  const [now, setNow] = useState<Date | null>(null);
  const { isLoaded, user } = useSessionUser();
  const orders = useOrdersStore((state) => state.orders);

  useEffect(() => {
    let active = true;
    Promise.resolve(useOrdersStore.persist.rehydrate()).then(() => {
      if (active) setNow(new Date());
    });
    return () => {
      active = false;
    };
  }, []);

  const email = user?.email;
  const split = useMemo<OrdersByTimeframe | null>(
    () => (now && email ? splitOrdersByDate(getUserOrders(orders, email), now) : null),
    [orders, email, now],
  );

  if (!now || !isLoaded) return { status: "loading" };
  if (!split) return { status: "signed-out" };
  return { status: "ready", ...split };
}
