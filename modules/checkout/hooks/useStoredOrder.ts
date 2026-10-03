"use client";

import { useEffect, useState } from "react";
import { useOrdersStore } from "../stores/orders.store";
import type { Order } from "../types/checkout.types";

export type StoredOrderState = { status: "loading" } | { status: "not-found" } | { status: "found"; order: Order };

export function useStoredOrder(code: string): StoredOrderState {
  // El primer render (servidor y cliente) es "loading": sin desajuste de hidratación ni "no encontrada" antes de leer localStorage.
  const [hydrated, setHydrated] = useState(false);
  const order = useOrdersStore((state) => state.getOrder(code));

  useEffect(() => {
    let active = true;
    Promise.resolve(useOrdersStore.persist.rehydrate()).then(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!hydrated) return { status: "loading" };
  return order ? { status: "found", order } : { status: "not-found" };
}
