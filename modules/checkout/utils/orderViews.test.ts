import { describe, expect, it } from "vitest";
import type { CheckoutOrder } from "../types/checkout.types";
import { buildPendingCheckoutOrder, type PendingSeatRow } from "./orderViews";

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
