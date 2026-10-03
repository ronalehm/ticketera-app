import { describe, expect, it } from "vitest";
import type { EventDetail } from "@/modules/events";
import { buildCheckoutOrder, parseTicketQuantities } from "./checkoutOrder";

const event: EventDetail = {
  id: "evt-test",
  slug: "evento-prueba",
  title: "Evento de prueba",
  category: "conciertos",
  startsAt: "2026-11-14T21:00:00-05:00",
  venue: "Estadio",
  city: "Lima",
  imageUrl: "https://example.com/img.jpg",
  priceFrom: 50,
  status: "available",
  featured: false,
  description: "Descripción",
  address: "Av. Siempre Viva 123",
  doorsOpenAt: "2026-11-14T19:00:00-05:00",
  minAge: 18,
  organizer: "Organizador",
  ticketTypes: [
    { id: "general", name: "General", price: 50, status: "available" },
    { id: "vip", name: "VIP", price: 120.5, status: "low-stock" },
    { id: "mesa", name: "Mesa", price: 200, status: "sold-out" },
  ],
};

describe("parseTicketQuantities", () => {
  it("acepta cantidades enteras en texto", () => {
    expect(parseTicketQuantities({ general: "2" })).toEqual({ general: 2 });
    expect(parseTicketQuantities({ general: "1", vip: "10" })).toEqual({ general: 1, vip: 10 });
  });

  it.each(["0", "1.5", "-1", "abc", "", "11"])("rechaza el valor %j", (value) => {
    expect(parseTicketQuantities({ general: value })).toBeNull();
  });

  it("rechaza parámetros repetidos (arrays), undefined y objeto vacío", () => {
    expect(parseTicketQuantities({ general: ["1", "2"] })).toBeNull();
    expect(parseTicketQuantities({ general: undefined })).toBeNull();
    expect(parseTicketQuantities({})).toBeNull();
  });
});

describe("buildCheckoutOrder", () => {
  it("devuelve ok con líneas en el orden de ticketTypes, ticketCount y total", () => {
    const result = buildCheckoutOrder(event, { vip: 2, general: 3 });
    expect(result).toEqual({
      status: "ok",
      order: {
        event: {
          slug: "evento-prueba",
          title: "Evento de prueba",
          startsAt: "2026-11-14T21:00:00-05:00",
          venue: "Estadio",
          city: "Lima",
          imageUrl: "https://example.com/img.jpg",
        },
        items: [
          { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 3 },
          { ticketTypeId: "vip", name: "VIP", unitPrice: 120.5, quantity: 2 },
        ],
        quantities: { vip: 2, general: 3 },
        ticketCount: 5,
        total: 391,
      },
    });
  });

  it("acepta exactamente el máximo de 10 entradas", () => {
    const result = buildCheckoutOrder(event, { general: 6, vip: 4 });
    expect(result.status).toBe("ok");
  });

  it("evento agotado → sold-out", () => {
    expect(buildCheckoutOrder({ ...event, status: "sold-out" }, { general: 1 })).toEqual({
      status: "sold-out",
      eventSlug: "evento-prueba",
    });
  });

  it.each([
    ["null", null],
    ["id desconocido", { general: 1, foo: 1 }],
    ["tipo agotado", { mesa: 1 }],
    ["11 entradas", { general: 6, vip: 5 }],
    ["sin entradas", {}],
    ["cantidad 0", { general: 0 }],
  ])("%s → invalid-tickets con eventSlug", (_, quantities) => {
    expect(buildCheckoutOrder(event, quantities)).toEqual({ status: "invalid-tickets", eventSlug: "evento-prueba" });
  });

  it("total 0 → free", () => {
    const freeEvent: EventDetail = {
      ...event,
      ticketTypes: [{ id: "entrada-libre", name: "Entrada libre", price: 0, status: "available" }],
    };
    expect(buildCheckoutOrder(freeEvent, { "entrada-libre": 2 })).toEqual({ status: "free", eventSlug: "evento-prueba" });
  });
});
