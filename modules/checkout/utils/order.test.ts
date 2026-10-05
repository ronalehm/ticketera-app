import { describe, expect, it } from "vitest";
import type { CheckoutOrder, OrderBuyer } from "../types/checkout.types";
import { buildOrder, createOrderCode, parseOrderCode } from "./order";

const checkout: CheckoutOrder = {
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
  total: 1, // manipulado: debe ignorarse
};

const buyer: OrderBuyer = {
  firstName: "Ana",
  lastName: "Quispe",
  email: "  Ana.Quispe@Example.COM ",
  phone: "912345678",
  documentType: "dni",
  documentNumber: "12345678",
};

const build = (overrides: Partial<Parameters<typeof buildOrder>[0]> = {}) =>
  buildOrder({
    code: "MT-AB12CD",
    createdAt: "2026-10-03T15:00:00.000Z",
    checkout,
    buyer,
    paymentMethod: "card",
    ...overrides,
  });

describe("createOrderCode", () => {
  it("usa `random` para elegir cada carácter de A-Z0-9", () => {
    // Índices 0, 35, 18, 26, 1, 35 de "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".
    const values = [0, 0.99, 18.5 / 36, 26.5 / 36, 1.5 / 36, 35.5 / 36];
    let call = 0;
    const code = createOrderCode(() => values[call++]);
    expect(code).toBe("MT-A9S0B9");
  });

  it("cumple el formato MT- + 6 caracteres A-Z0-9", () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      expect(createOrderCode()).toMatch(/^MT-[A-Z0-9]{6}$/);
    }
  });
});

describe("parseOrderCode", () => {
  it("devuelve el código si es válido", () => {
    expect(parseOrderCode("MT-AB12CD")).toBe("MT-AB12CD");
  });

  it.each([
    ["minúsculas", "mt-ab12cd"],
    ["corto", "MT-AB12C"],
    ["largo", "MT-AB12CD1"],
    ["vacío", ""],
    ["array", ["MT-AB12CD", "MT-ZZ99ZZ"]],
    ["undefined", undefined],
  ])("%s → null", (_, value) => {
    expect(parseOrderCode(value)).toBeNull();
  });
});

describe("buildOrder", () => {
  it("copia código, fecha, evento con categoría, items y método de pago", () => {
    const order = build({ paymentMethod: "yape" });
    expect(order.code).toBe("MT-AB12CD");
    expect(order.createdAt).toBe("2026-10-03T15:00:00.000Z");
    expect(order.event).toEqual(checkout.event);
    expect(order.event.category).toBe("conciertos");
    expect(order.items).toEqual(checkout.items);
    expect(order.paymentMethod).toBe("yape");
  });

  it("guarda ownerEmail recortado y en minúsculas", () => {
    expect(build().ownerEmail).toBe("ana.quispe@example.com");
  });

  it("guarda del comprador solo nombre completo y correo normalizado (sin Términos ni datos de tarjeta)", () => {
    const formData = {
      ...buyer,
      paymentMethod: "card",
      cardNumber: "4242424242424242",
      cardExpiry: "12/30",
      cardCvv: "123",
      cardName: "Ana Quispe",
      acceptTerms: true,
    };
    const order = build({ buyer: formData });
    expect(order.buyer).toEqual({ name: "Ana Quispe", email: "ana.quispe@example.com" });
    const serialized = JSON.stringify(order);
    for (const secret of ["4242424242424242", "4242", "12/30", "acceptTerms", "cardCvv", "cardName"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("recalcula total y ticketCount desde items, ignorando un total manipulado", () => {
    const order = build();
    expect(order.total).toBe(910);
    expect(order.ticketCount).toBe(3);
  });

  it("crea una entrada por unidad con código correlativo en el orden de items y el titular del comprador", () => {
    expect(build().tickets).toEqual([
      { code: "MT-AB12CD-01", ticketTypeName: "General", holderName: "Ana Quispe" },
      { code: "MT-AB12CD-02", ticketTypeName: "General", holderName: "Ana Quispe" },
      { code: "MT-AB12CD-03", ticketTypeName: "VIP", holderName: "Ana Quispe" },
    ]);
  });

  it("numera con dos dígitos más allá de 9 entradas", () => {
    const order = build({
      checkout: { ...checkout, items: [{ ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 10 }] },
    });
    expect(order.tickets.map((ticket) => ticket.code).slice(-2)).toEqual(["MT-AB12CD-09", "MT-AB12CD-10"]);
  });

  it("con asientos copia los seats y asigna seatLabel en su orden", () => {
    const seatedCheckout: CheckoutOrder = {
      ...checkout,
      items: [
        { ticketTypeId: "general", name: "General", unitPrice: 250, quantity: 1 },
        {
          ticketTypeId: "vip",
          name: "VIP",
          unitPrice: 410,
          quantity: 2,
          seats: [
            { id: "vip-B-3", label: "Fila B · Asiento 3" },
            { id: "vip-A-1", label: "Fila A · Asiento 1" },
          ],
        },
      ],
    };
    const order = build({ checkout: seatedCheckout });

    expect(order.items[1].seats).toEqual(seatedCheckout.items[1].seats);
    expect(order.items[0]).not.toHaveProperty("seats");
    expect(order.tickets).toEqual([
      { code: "MT-AB12CD-01", ticketTypeName: "General", holderName: "Ana Quispe" },
      { code: "MT-AB12CD-02", ticketTypeName: "VIP", seatLabel: "Fila B · Asiento 3", holderName: "Ana Quispe" },
      { code: "MT-AB12CD-03", ticketTypeName: "VIP", seatLabel: "Fila A · Asiento 1", holderName: "Ana Quispe" },
    ]);
    expect(order.total).toBe(1070);
  });

  it("no comparte referencias con el pedido de entrada", () => {
    const order = build();
    expect(order.items).not.toBe(checkout.items);
    expect(order.event).not.toBe(checkout.event);
  });
});
