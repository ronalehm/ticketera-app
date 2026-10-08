import { describe, expect, it } from "vitest";
import type { EventDetail } from "@/modules/events";
import type { VenueMap } from "@/modules/seating";
import { buildChangeTicketsHref, buildCheckoutOrder, parseTicketQuantities } from "./checkoutOrder";

const event: EventDetail = {
  id: "evt-test",
  slug: "evento-prueba",
  title: "Evento de prueba",
  category: "conciertos",
  categoryName: "Conciertos",
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
          category: "conciertos",
          categoryName: "Conciertos",
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

  it("el pedido ok incluye la categoría del evento", () => {
    const result = buildCheckoutOrder(event, { general: 1 });
    expect(result.status === "ok" && result.order.event.category).toBe("conciertos");
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

describe("buildCheckoutOrder con asientos", () => {
  // Una zona de pie (general) y una numerada (vip): A-1 y A-2 disponibles, A-3 ocupado, A-4 accesible.
  const map: VenueMap = {
    eventSlug: "evento-prueba",
    venue: "Estadio",
    viewBox: "0 0 600 400",
    stage: { label: "ESCENARIO", path: "M200 16 H400 V60 H200 Z", labelPos: { x: 300, y: 46 } },
    zones: [
      {
        id: "general",
        ticketTypeId: "general",
        kind: "general",
        capacity: 500,
        path: "M20 80 H580 V200 H20 Z",
        labelPos: { x: 300, y: 140 },
        name: "General",
        price: 50,
        status: "available",
      },
      {
        id: "vip",
        ticketTypeId: "vip",
        kind: "numbered",
        path: "M20 220 H580 V380 H20 Z",
        labelPos: { x: 300, y: 300 },
        seatViewBox: "0 0 208 128",
        rows: [
          {
            label: "A",
            seats: [
              { id: "vip-A-1", row: "A", number: 1, x: 56, y: 88, status: "available" },
              { id: "vip-A-2", row: "A", number: 2, x: 88, y: 88, status: "available" },
              { id: "vip-A-3", row: "A", number: 3, x: 120, y: 88, status: "occupied" },
              { id: "vip-A-4", row: "A", number: 4, x: 152, y: 88, status: "accessible" },
            ],
          },
        ],
        name: "VIP",
        price: 120.5,
        status: "low-stock",
      },
    ],
  };

  it("pedido válido → seats con etiquetas en la línea numerada, en el orden recibido, y sin seats en la de pie", () => {
    const result = buildCheckoutOrder(event, { general: 1, vip: 2 }, { map, seatIds: ["vip-A-2", "vip-A-1"] });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.order.items).toEqual([
      { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 1 },
      {
        ticketTypeId: "vip",
        name: "VIP",
        unitPrice: 120.5,
        quantity: 2,
        seats: [
          { id: "vip-A-2", label: "VIP · Fila A · Asiento 2" },
          { id: "vip-A-1", label: "VIP · Fila A · Asiento 1" },
        ],
      },
    ]);
    expect(result.order.items[0]).not.toHaveProperty("seats");
    expect(result.order.ticketCount).toBe(3);
    expect(result.order.total).toBe(291);
  });

  it("acepta asientos accesibles", () => {
    const result = buildCheckoutOrder(event, { vip: 1 }, { map, seatIds: ["vip-A-4"] });
    expect(result.status === "ok" && result.order.items[0].seats).toEqual([
      { id: "vip-A-4", label: "VIP · Fila A · Asiento 4" },
    ]);
  });

  it("con mapa y solo entradas de pie sigue siendo válido sin asientos", () => {
    const result = buildCheckoutOrder(event, { general: 2 }, { map, seatIds: [] });
    expect(result.status === "ok" && result.order.items).toEqual([
      { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 2 },
    ]);
  });

  it.each([
    ["zona numerada sin asientos", { vip: 1 }, map, []],
    ["menos asientos que la cantidad", { vip: 2 }, map, ["vip-A-1"]],
    ["más asientos que la cantidad", { vip: 1 }, map, ["vip-A-1", "vip-A-2"]],
    ["asientos sin cantidad de su tipo", { general: 1 }, map, ["vip-A-1"]],
    ["asiento ocupado", { vip: 1 }, map, ["vip-A-3"]],
    ["asiento de una zona de pie", { vip: 1 }, map, ["general-A-1"]],
    ["asiento inexistente", { vip: 1 }, map, ["vip-B-1"]],
    ["asientos repetidos", { vip: 2 }, map, ["vip-A-1", "vip-A-1"]],
    ["seatIds null", { general: 1 }, map, null],
    ["asientos sin mapa", { vip: 1 }, null, ["vip-A-1"]],
    ["seatIds null sin mapa", { general: 1 }, null, null],
  ])("%s → invalid-tickets", (_, quantities, seatingMap, seatIds) => {
    expect(buildCheckoutOrder(event, quantities, { map: seatingMap, seatIds })).toEqual({
      status: "invalid-tickets",
      eventSlug: "evento-prueba",
    });
  });

  it("la regla de evento sold-out sigue yendo primero", () => {
    expect(buildCheckoutOrder({ ...event, status: "sold-out" }, { vip: 1 }, { map, seatIds: null })).toEqual({
      status: "sold-out",
      eventSlug: "evento-prueba",
    });
  });
});

describe("buildChangeTicketsHref", () => {
  const items = [
    { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 2 },
    { ticketTypeId: "vip", name: "VIP", unitPrice: 120.5, quantity: 1 },
  ];

  it("sin asientos → pantalla de entradas con las cantidades (con o sin mapa)", () => {
    expect(buildChangeTicketsHref({ event, items })).toBe(
      "/eventos/evento-prueba/entradas?general=2&vip=1",
    );
  });

  it("con asientos en dos items → asientos al final, en orden de items y de seats, unidos por %2C", () => {
    const seatedItems = [
      {
        ticketTypeId: "platea",
        name: "Platea",
        unitPrice: 80,
        quantity: 2,
        seats: [
          { id: "platea-B-3", label: "Platea · Fila B · Asiento 3" },
          { id: "platea-B-1", label: "Platea · Fila B · Asiento 1" },
        ],
      },
      { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 1 },
      {
        ticketTypeId: "vip",
        name: "VIP",
        unitPrice: 120.5,
        quantity: 1,
        seats: [{ id: "vip-A-2", label: "VIP · Fila A · Asiento 2" }],
      },
    ];
    expect(buildChangeTicketsHref({ event, items: seatedItems })).toBe(
      "/eventos/evento-prueba/entradas?platea=2&general=1&vip=1&asientos=platea-B-3%2Cplatea-B-1%2Cvip-A-2",
    );
  });

  it("ida y vuelta: los parámetros (sin asientos) pasados por parseTicketQuantities dan las cantidades del pedido", () => {
    const result = buildCheckoutOrder(event, { general: 2, vip: 1 });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const href = buildChangeTicketsHref(result.order);
    const params = new URLSearchParams(href.split("?")[1]);
    params.delete("asientos");
    expect(parseTicketQuantities(Object.fromEntries(params))).toEqual(result.order.quantities);
  });
});
