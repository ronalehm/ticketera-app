import type { z } from "zod";
import type { EventCategory, EventDetail } from "@/modules/events";
import type { checkoutBuyerSchema, checkoutFormSchema, PAYMENT_METHODS } from "../schemas/payment.schema";

export type CheckoutOrderItem = {
  ticketTypeId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Solo en tipos de zonas numeradas, en el orden de `asientos`. */
  seats?: { id: string; label: string }[];
};

export type CheckoutOrder = {
  event: Pick<EventDetail, "slug" | "title" | "category" | "startsAt" | "venue" | "city" | "imageUrl">;
  items: CheckoutOrderItem[];
  quantities: Record<string, number>;
  ticketCount: number;
  total: number; // PEN
};

export type CheckoutOrderResult =
  | { status: "ok"; order: CheckoutOrder }
  | { status: "not-found" }
  | { status: "sold-out" | "invalid-tickets" | "free"; eventSlug: string };

export type ReservationResult = { status: "reserved"; orderId: string } | { status: "invalid" | "unavailable" };

export type PendingCheckoutResult =
  | { status: "not-found" }
  | { status: "expired"; eventSlug: string }
  | { status: "closed"; orderId: string } // paid | refunded (desde F4)
  | { status: "ok"; orderId: string; amountCents: number; remainingMs: number; order: CheckoutOrder };

/** Estado de `useActionState` del botón "Continuar": `null` al inicio; si la reserva falla, el mensaje. */
export type StartCheckoutState = { error: string } | null;

export type CheckoutBuyer = z.output<typeof checkoutBuyerSchema>;

export type PayOrderResult =
  | { ok: true; clientSecret: string }
  | { ok: false; error: "invalid-input" | "order-expired" | "order-unavailable" | "payment-error" };

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type CheckoutFormValues = z.input<typeof checkoutFormSchema>;
export type CheckoutFormData = z.output<typeof checkoutFormSchema>;

// Contrato E: vista de una orden pagada (la leen la confirmación, "Mis entradas" y el PDF).
export type OrderTicket = { code: string /* MT-AB12CD-01 */; ticketTypeName: string; seatLabel?: string; holderName: string };

export type Order = {
  code: string; // "MT-" + 6 chars A-Z0-9
  createdAt: string; // ISO
  ownerEmail: string; // correo del comprador (en minúsculas)
  event: { slug: string; title: string; category: EventCategory; startsAt: string; venue: string; city: string; imageUrl: string };
  items: { ticketTypeId: string; name: string; unitPrice: number; quantity: number; seats?: { id: string; label: string }[] }[];
  ticketCount: number;
  total: number; // PEN
  paymentMethod: "card" | "yape" | "pagoefectivo";
  buyer: { name: string; email: string };
  tickets: OrderTicket[];
};

/** Datos del comprador que recibe el pago simulado (`buildOrder`); desaparece con él en F5. */
export type OrderBuyer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: "dni" | "ce" | "passport";
  documentNumber: string;
};

export type ConfirmationState = "paid" | "refunded" | "processing" | "payment-failed" | "expired" | "not-found";

export type OrderConfirmationResult =
  | { status: "not-found" | "processing" }
  | { status: "paid"; order: Order }
  | { status: "payment-failed"; orderId: string }
  | { status: "expired" | "refunded"; eventSlug: string };
