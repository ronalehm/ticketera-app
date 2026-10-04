import type { Order } from "@/modules/checkout/orders";

export type OrderTimeframe = "upcoming" | "past";

export type OrdersByTimeframe = Record<OrderTimeframe, Order[]>;

export type MyOrdersState =
  | { status: "loading" }
  | { status: "signed-out" }
  | ({ status: "ready" } & OrdersByTimeframe);
