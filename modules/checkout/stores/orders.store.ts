import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order } from "../types/checkout.types";

type OrdersState = {
  orders: Order[];
  addOrder: (order: Order) => void;
  getOrder: (code: string) => Order | undefined;
};

// skipHydration: la rehidratación la dispara el cliente al montar, para no romper la hidratación SSR.
export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (order) =>
        set((state) => ({ orders: [order, ...state.orders.filter((o) => o.code !== order.code)] })),
      getOrder: (code) => get().orders.find((o) => o.code === code),
    }),
    { name: "mentec-orders", partialize: (state) => ({ orders: state.orders }), skipHydration: true },
  ),
);

// Rehidrata antes de añadir para no sobrescribir las órdenes guardadas con un store aún sin hidratar.
export async function persistOrder(order: Order): Promise<void> {
  await useOrdersStore.persist.rehydrate();
  useOrdersStore.getState().addOrder(order);
}
