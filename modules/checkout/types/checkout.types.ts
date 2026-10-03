import type { EventDetail } from "@/modules/events";

export type CheckoutOrderItem = { ticketTypeId: string; name: string; unitPrice: number; quantity: number };

export type CheckoutOrder = {
  event: Pick<EventDetail, "slug" | "title" | "startsAt" | "venue" | "city" | "imageUrl">;
  items: CheckoutOrderItem[];
  quantities: Record<string, number>;
  ticketCount: number;
  total: number; // PEN
};

export type CheckoutOrderResult =
  | { status: "ok"; order: CheckoutOrder }
  | { status: "not-found" }
  | { status: "sold-out" | "invalid-tickets" | "free"; eventSlug: string };
