// Simulación: no envía datos a ningún servicio. Sin React ni red; el número de tarjeta solo se compara en memoria.
import type { CheckoutOrder, Order, OrderBuyer } from "../types/checkout.types";
import { buildOrder, createOrderCode } from "../utils/order";

export const MOCK_PAYMENT_LATENCY_MS = 1200;
export const DECLINED_TEST_CARD = "4000000000000002";

const CARD_DECLINED_MESSAGE = "Tu tarjeta fue rechazada. Prueba con otra tarjeta o elige otro método de pago.";

export class PaymentError extends Error {
  readonly code = "card-declined";

  constructor() {
    super(CARD_DECLINED_MESSAGE);
    this.name = "PaymentError";
  }
}

export type MockPaymentInput = {
  order: CheckoutOrder; // validado en servidor (getCheckoutOrder)
  buyer: OrderBuyer;
  payment: { method: "card"; cardNumber: string } | { method: "yape" } | { method: "pagoefectivo" };
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Aprueba el pago tras la latencia simulada y devuelve la orden; la tarjeta de prueba rechazada lanza `PaymentError`. */
export async function processMockPayment({ order, buyer, payment }: MockPaymentInput): Promise<Order> {
  await wait(MOCK_PAYMENT_LATENCY_MS);
  if (payment.method === "card" && payment.cardNumber.replace(/\s/g, "") === DECLINED_TEST_CARD) {
    throw new PaymentError();
  }
  return buildOrder({
    code: createOrderCode(),
    createdAt: new Date().toISOString(),
    checkout: order,
    buyer,
    paymentMethod: payment.method,
  });
}
