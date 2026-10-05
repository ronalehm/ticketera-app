import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckoutOrder, OrderBuyer } from "../types/checkout.types";
import {
  DECLINED_TEST_CARD,
  MOCK_PAYMENT_LATENCY_MS,
  type MockPaymentInput,
  PaymentError,
  processMockPayment,
} from "./payment.service";

const order: CheckoutOrder = {
  event: {
    slug: "noche-de-sintetizadores-lima",
    title: "Noche de sintetizadores",
    category: "conciertos",
    startsAt: "2026-11-14T21:00:00-05:00",
    venue: "Estadio",
    city: "Lima",
    imageUrl: "https://example.com/img.jpg",
  },
  items: [
    { ticketTypeId: "general", name: "General", unitPrice: 250, quantity: 2 },
    { ticketTypeId: "vip", name: "VIP", unitPrice: 410, quantity: 1 },
  ],
  quantities: { general: 2, vip: 1 },
  ticketCount: 3,
  total: 910,
};

const buyer: OrderBuyer = {
  firstName: "Ana",
  lastName: "Quispe",
  email: "ana@example.com",
  phone: "912345678",
  documentType: "dni",
  documentNumber: "12345678",
};

const NOW = new Date("2026-10-03T15:00:00.000Z");

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  fetchSpy = vi.spyOn(globalThis, "fetch");
});

afterEach(() => {
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
  vi.useRealTimers();
});

/** Lanza el pago y avanza el reloj simulado la latencia completa. */
async function pay(payment: MockPaymentInput["payment"]) {
  const result = processMockPayment({ order, buyer, payment });
  // Se adjunta el manejo antes de avanzar el reloj para no dejar rechazos sin capturar.
  const settled = result.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await vi.advanceTimersByTimeAsync(MOCK_PAYMENT_LATENCY_MS);
  return settled;
}

describe("processMockPayment", () => {
  it("no resuelve antes de 1200 ms y sí al cumplirse la latencia", async () => {
    let done = false;
    void processMockPayment({ order, buyer, payment: { method: "yape" } }).then(() => {
      done = true;
    });

    await vi.advanceTimersByTimeAsync(MOCK_PAYMENT_LATENCY_MS - 1);
    expect(done).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it("rechaza la tarjeta de prueba 4000 0000 0000 0002 (con espacios) con PaymentError card-declined", async () => {
    expect(DECLINED_TEST_CARD).toBe("4000000000000002");
    const result = await pay({ method: "card", cardNumber: "4000 0000 0000 0002" });

    expect(result.ok).toBe(false);
    const error = !result.ok ? result.error : undefined;
    expect(error).toBeInstanceOf(PaymentError);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      code: "card-declined",
      message: "Tu tarjeta fue rechazada. Prueba con otra tarjeta o elige otro método de pago.",
    });
  });

  it("rechaza también la tarjeta de prueba sin espacios", async () => {
    const result = await pay({ method: "card", cardNumber: DECLINED_TEST_CARD });
    expect(!result.ok && result.error).toBeInstanceOf(PaymentError);
  });

  it("aprueba la tarjeta 4242 4242 4242 4242 y devuelve una Order con la forma del contrato E", async () => {
    const result = await pay({ method: "card", cardNumber: "4242424242424242" });
    if (!result.ok) throw result.error;
    const created = result.value;

    expect(Object.keys(created).sort()).toEqual(
      [
        "buyer",
        "code",
        "createdAt",
        "event",
        "items",
        "ownerEmail",
        "paymentMethod",
        "ticketCount",
        "tickets",
        "total",
      ].sort(),
    );
    expect(created.code).toMatch(/^MT-[A-Z0-9]{6}$/);
    expect(created.createdAt).toBe("2026-10-03T15:00:01.200Z");
    expect(created).toMatchObject({
      ownerEmail: "ana@example.com",
      event: order.event,
      items: order.items,
      ticketCount: 3,
      total: 910,
      paymentMethod: "card",
      buyer: { name: "Ana Quispe", email: "ana@example.com" },
    });
    expect(created.tickets.map((ticket) => ticket.code)).toEqual([
      `${created.code}-01`,
      `${created.code}-02`,
      `${created.code}-03`,
    ]);
  });

  it("la orden no contiene el número de tarjeta", async () => {
    const result = await pay({ method: "card", cardNumber: "4242 4242 4242 4242" });
    if (!result.ok) throw result.error;
    const serialized = JSON.stringify(result.value);
    expect(serialized).not.toContain("4242424242424242");
    expect(serialized).not.toContain("4242 4242 4242 4242");
    expect(serialized).not.toContain("4242");
  });

  it.each(["yape", "pagoefectivo"] as const)("aprueba %s", async (method) => {
    const result = await pay({ method });
    if (!result.ok) throw result.error;
    expect(result.value.paymentMethod).toBe(method);
    expect(result.value.tickets).toHaveLength(3);
  });
});
