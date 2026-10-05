import type { Order } from "@/modules/checkout/orders";

export type OrderTimeframe = "upcoming" | "past";

export type OrdersByTimeframe = Record<OrderTimeframe, Order[]>;
