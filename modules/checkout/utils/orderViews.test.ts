import { describe, expect, it } from "vitest";
import type { CheckoutOrder } from "../types/checkout.types";
import { buildOrderView, buildPendingCheckoutOrder, type OrderTicketRow, type PendingSeatRow } from "./orderViews";

const event: CheckoutOrder["event"] = {
  slug: "evento-prueba",
  title: "Evento de prueba",
  category: "conciertos",
  startsAt: "2026-11-15T02:00:00.000Z",
  venue: "Estadio",
  city: "Lima",
  imageUrl: "https://example.com/img.jpg",
};

const generalSeat: PendingSeatRow = {
  sectionSlug: null,
  rowLabel: null,
  number: null,
  ticketTypeSlug: "general",
  ticketTypeName: "General",
  priceCents: 5000,
};

const plateaSeat = (rowLabel: string, number: number): PendingSeatRow => ({
  sectionSlug: "platea",
  rowLabel,
  number,
  ticketTypeSlug: "platea",
  ticketTypeName: "Platea",
  priceCents: 12050,
});

describe("buildPendingCheckoutOrder", () => {
  it("agrupa por tipo en el orden recibido, con asientos numerados y líneas generales sin seats", () => {
    const order = buildPendingCheckoutOrder(
      event,
      [generalSeat, generalSeat, plateaSeat("A", 10), plateaSeat("B", 4)],
      34100,
    );

    expect(order).toEqual({
      event,
      items: [
        { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 2 },
        {
          ticketTypeId: "platea",
          name: "Platea",
          unitPrice: 120.5,
          quantity: 2,
          seats: [
            { id: "platea-A-10", label: "Platea · Fila A · Asiento 10" },
            { id: "platea-B-4", label: "Platea · Fila B · Asiento 4" },
          ],
        },
      ],
      quantities: { general: 2, platea: 2 },
      ticketCount: 4,
      total: 341,
    });
  });

  it("respeta el orden recibido de los tipos", () => {
    const order = buildPendingCheckoutOrder(event, [plateaSeat("B", 4), generalSeat], 17050);
    expect(order.items.map((item) => item.ticketTypeId)).toEqual(["platea", "general"]);
  });

  it("total = subtotal / 100", () => {
    expect(buildPendingCheckoutOrder(event, [generalSeat], 4999).total).toBe(49.99);
  });
});

describe("buildOrderView", () => {
  const paidOrder = {
    code: "TK-1042",
    paidAt: new Date("2026-10-03T15:00:00.000Z"),
    buyerName: "Ana Quispe",
    buyerEmail: "ana@example.com",
    subtotalCents: 34100,
  };

  const ticket = (code: string, place: Partial<OrderTicketRow> = {}): OrderTicketRow => ({
    sectionSlug: null,
    rowLabel: null,
    number: null,
    code,
    ticketTypeSlug: "general",
    ticketTypeName: "General",
    unitPriceCents: 5000,
    holderName: "Ana Quispe",
    ...place,
  });

  const platea = (code: string, rowLabel: string, number: number) =>
    ticket(code, { sectionSlug: "platea", rowLabel, number, ticketTypeSlug: "platea", ticketTypeName: "Platea", unitPriceCents: 12050 });

  const view = buildOrderView(paidOrder, event, [
    ticket("TK-1042-01"),
    ticket("TK-1042-02"),
    platea("TK-1042-03", "A", 10),
    platea("TK-1042-04", "B", 4),
  ]);

  it("copia código, comprador, evento y usa paidAt como createdAt", () => {
    expect(view.code).toBe("TK-1042");
    expect(view.createdAt).toBe("2026-10-03T15:00:00.000Z");
    expect(view.buyer).toEqual({ name: "Ana Quispe", email: "ana@example.com" });
    expect(view.event).toEqual(event);
  });

  it("agrupa las líneas por tipo con precio unitario y asientos numerados", () => {
    expect(view.items).toEqual([
      { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 2 },
      {
        ticketTypeId: "platea",
        name: "Platea",
        unitPrice: 120.5,
        quantity: 2,
        seats: [
          { id: "platea-A-10", label: "Platea · Fila A · Asiento 10" },
          { id: "platea-B-4", label: "Platea · Fila B · Asiento 4" },
        ],
      },
    ]);
    expect(view.ticketCount).toBe(4);
  });

  it("devuelve las entradas en el orden recibido, con seatLabel solo en las numeradas", () => {
    expect(view.tickets).toEqual([
      { code: "TK-1042-01", ticketTypeName: "General", holderName: "Ana Quispe" },
      { code: "TK-1042-02", ticketTypeName: "General", holderName: "Ana Quispe" },
      { code: "TK-1042-03", ticketTypeName: "Platea", seatLabel: "Platea · Fila A · Asiento 10", holderName: "Ana Quispe" },
      { code: "TK-1042-04", ticketTypeName: "Platea", seatLabel: "Platea · Fila B · Asiento 4", holderName: "Ana Quispe" },
    ]);
    expect(view.tickets[0]).not.toHaveProperty("seatLabel");
  });

  it("total = subtotalCents / 100", () => {
    expect(view.total).toBe(341);
  });
});
