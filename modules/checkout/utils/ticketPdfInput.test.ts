import { describe, expect, it } from "vitest";
import type { Order } from "../types/checkout.types";
import { buildTicketPdfInput } from "./ticketPdfInput";

const order: Order = {
  code: "TK-1042",
  createdAt: "2026-10-03T15:00:00.000Z",
  event: {
    slug: "noche-de-sintetizadores-lima",
    title: "Noche de Sintetizadores: Gira Neón 2026",
    category: "conciertos",
    categoryName: "Conciertos",
    startsAt: "2026-11-14T21:00:00-05:00",
    venue: "Estadio Nacional",
    city: "Lima",
    imageUrl: "https://example.com/img.jpg",
  },
  items: [
    { ticketTypeId: "tribuna-norte", name: "Tribuna Norte", unitPrice: 250, quantity: 1, seats: [{ id: "b-4", label: "Tribuna Norte · Fila B · Asiento 4" }] },
    { ticketTypeId: "general", name: "General", unitPrice: 120, quantity: 1 },
  ],
  ticketCount: 2,
  total: 370,
  buyer: { name: "Ana Quispe", email: "ana.quispe@example.com" },
  tickets: [
    {
      code: "TK-1042-01",
      ticketTypeName: "Tribuna Norte",
      seatLabel: "Tribuna Norte · Fila B · Asiento 4",
      holderName: "Ana Quispe",
      qrToken: "q7Vx0bR3mN2pL8sK4tY6wA",
    },
    { code: "TK-1042-02", ticketTypeName: "General", holderName: "Carlos Quispe", qrToken: "Zf1Hc9Jd5Gk3Ue7Iy0Ob2Q" },
  ],
};

describe("buildTicketPdfInput", () => {
  it("toma el código del pedido y formatea los datos del evento", () => {
    const input = buildTicketPdfInput(order);

    expect(input.orderCode).toBe("TK-1042");
    expect(input.event).toEqual({
      title: "Noche de Sintetizadores: Gira Neón 2026",
      dateLabel: "Sábado, 14 de noviembre de 2026",
      timeLabel: "21:00 h",
      venueLabel: "Estadio Nacional, Lima",
    });
  });

  it("usa el asiento como ubicación y, sin asiento, el nombre de la zona", () => {
    const [seated, general] = buildTicketPdfInput(order).tickets;

    expect(seated.locationLabel).toBe("Tribuna Norte · Fila B · Asiento 4");
    expect(general.locationLabel).toBe("General");
  });

  it("mantiene el código, el titular y el qrToken de cada entrada en el mismo orden", () => {
    const { tickets } = buildTicketPdfInput(order);

    expect(tickets.map(({ code, holderName, qrToken }) => ({ code, holderName, qrToken }))).toEqual([
      { code: "TK-1042-01", holderName: "Ana Quispe", qrToken: "q7Vx0bR3mN2pL8sK4tY6wA" },
      { code: "TK-1042-02", holderName: "Carlos Quispe", qrToken: "Zf1Hc9Jd5Gk3Ue7Iy0Ob2Q" },
    ]);
  });
});
