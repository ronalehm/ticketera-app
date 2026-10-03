"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/modules/auth/session";
import { useOrdersStore } from "@/modules/checkout/orders";
import type { MyOrdersState, OrdersByTimeframe } from "../types/tickets.types";
import { getUserOrders, splitOrdersByDate } from "../utils/myOrders";

export function useMyOrders(): MyOrdersState {
  // `now` es null hasta rehidratar ambos stores: el primer render (servidor y cliente) es "loading",
  // sin desajuste de hidratación por la fecha ni un "sin sesión" fugaz antes de leer localStorage.
  const [now, setNow] = useState<Date | null>(null);
  const user = useAuthStore((state) => state.user);
  const orders = useOrdersStore((state) => state.orders);

  useEffect(() => {
    let active = true;
    Promise.all([useAuthStore.persist.rehydrate(), useOrdersStore.persist.rehydrate()]).then(() => {
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

  if (!now) return { status: "loading" };
  if (!split) return { status: "signed-out" };
  return { status: "ready", ...split };
}
