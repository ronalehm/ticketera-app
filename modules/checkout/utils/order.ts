// Utilidades puras de la orden del pago simulado (sin React, sin red y sin el barrel de `events`).
import { orderCodeSchema } from "../schemas/payment.schema";
import type { CheckoutOrder, Order, OrderBuyer, OrderTicket, PaymentMethod } from "../types/checkout.types";

const ORDER_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ORDER_CODE_LENGTH = 6;

/** `MT-` + 6 caracteres aleatorios de `A-Z0-9`. */
export function createOrderCode(random: () => number = Math.random): string {
  let suffix = "";
  for (let index = 0; index < ORDER_CODE_LENGTH; index++) {
    suffix += ORDER_CODE_ALPHABET[Math.floor(random() * ORDER_CODE_ALPHABET.length)];
  }
  return `MT-${suffix}`;
}

/** Código de orden válido (`MT-AB12CD`) o `null` (vacío, array o formato inválido). */
export function parseOrderCode(value: unknown): string | null {
  const parsed = orderCodeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

type BuildOrderInput = {
  code: string;
  createdAt: string;
  checkout: CheckoutOrder;
  buyer: OrderBuyer;
  paymentMethod: PaymentMethod;
};

/** Una entrada por unidad, en el orden de `items` (y de `seats`), con código correlativo `<code>-01`, `-02`… */
function buildTickets(code: string, items: Order["items"], holderName: string): OrderTicket[] {
  const tickets: OrderTicket[] = [];
  for (const item of items) {
    for (let index = 0; index < item.quantity; index++) {
      const ticketCode = `${code}-${String(tickets.length + 1).padStart(2, "0")}`;
      const seatLabel = item.seats?.[index]?.label;
      tickets.push({
        code: ticketCode,
        ticketTypeName: item.name,
        ...(seatLabel !== undefined && { seatLabel }),
        holderName,
      });
    }
  }
  return tickets;
}

/**
 * Orden a guardar tras el pago. `ticketCount` y `total` se recalculan desde `items` (se ignora `checkout.total`)
 * y del comprador solo se copian los campos de `OrderBuyer` (nunca Términos ni datos de tarjeta).
 */
export function buildOrder({ code, createdAt, checkout, buyer, paymentMethod }: BuildOrderInput): Order {
  const items: Order["items"] = checkout.items.map(({ ticketTypeId, name, unitPrice, quantity, seats }) => ({
    ticketTypeId,
    name,
    unitPrice,
    quantity,
    ...(seats && { seats: seats.map(({ id, label }) => ({ id, label })) }),
  }));
  const { firstName, lastName, email, phone, documentType, documentNumber } = buyer;

  return {
    code,
    createdAt,
    ownerEmail: email.trim().toLowerCase(),
    event: { ...checkout.event },
    items,
    ticketCount: items.reduce((count, item) => count + item.quantity, 0),
    total: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    paymentMethod,
    buyer: { firstName, lastName, email, phone, documentType, documentNumber },
    tickets: buildTickets(code, items, `${firstName} ${lastName}`),
  };
}
