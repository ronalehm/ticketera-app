import type Stripe from "stripe";
import type { ConfirmationState } from "../types/checkout.types";

/** Minutos que una orden `pending` retiene sus asientos (`expires_at = now() + 10 min`). */
export const RESERVATION_MINUTES = 10;

/**
 * Importes congelados en la orden, en céntimos. La comisión usa el mismo redondeo que el seed
 * (`Math.round(subtotal × bps / 10000)`); el neto es el resto, así que `fee + neto = subtotal`.
 */
export function computeOrderAmounts(
  lines: { priceCents: number; quantity: number }[],
  commissionBps: number,
): { ticketCount: number; subtotalCents: number; platformFeeCents: number; organizerAmountCents: number } {
  let ticketCount = 0;
  let subtotalCents = 0;
  for (const { priceCents, quantity } of lines) {
    ticketCount += quantity;
    subtotalCents += priceCents * quantity;
  }
  const platformFeeCents = Math.round((subtotalCents * commissionBps) / 10000);
  return { ticketCount, subtotalCents, platformFeeCents, organizerAmountCents: subtotalCents - platformFeeCents };
}

/**
 * Estado de la confirmación. Una orden `pending` cuyo PaymentIntent ya se cobró (o se está cobrando) espera al
 * webhook aunque haya vencido; si no, vencida → `expired` y vigente → `payment-failed` (puede reintentar).
 */
export function getConfirmationState(
  order: { status: "pending" | "paid" | "expired" | "refunded" | "partially_refunded"; isExpired: boolean },
  paymentIntentStatus: Stripe.PaymentIntent.Status | null,
): ConfirmationState {
  switch (order.status) {
    case "paid":
    case "partially_refunded":
      return "paid";
    case "refunded":
      return "refunded";
    case "expired":
      return "expired";
  }
  if (paymentIntentStatus === "succeeded" || paymentIntentStatus === "processing") return "processing";
  return order.isExpired ? "expired" : "payment-failed";
}
