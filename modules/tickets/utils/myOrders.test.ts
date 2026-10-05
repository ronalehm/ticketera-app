import { describe, expect, it } from "vitest";
import type { Order } from "@/modules/checkout/orders";
import { formatOrderZones, formatTicketCount, getDateChipParts, splitOrdersByDate } from "./myOrders";

function makeOrder(overrides: { code: string; ownerEmail?: string; startsAt?: string; createdAt?: string }): Order {
  const { code, ownerEmail = "ana@correo.pe", startsAt = "2026-11-14T21:00:00-05:00", createdAt = "2026-09-01T10:00:00-05:00" } =
    overrides;
  return {
    code,
    createdAt,
    event: {
      slug: "evento",
      title: "Evento",
      category: "conciertos",
      startsAt,
      venue: "Estadio Nacional",
      city: "Lima",
      imageUrl: "https://images.unsplash.com/photo-1?auto=format&fit=crop&w=1600&q=80",
    },
    items: [{ ticketTypeId: "general", name: "General", unitPrice: 100, quantity: 1 }],
    ticketCount: 1,
    total: 100,
    buyer: { name: "Ana Pérez", email: ownerEmail },
    tickets: [{ code: `${code}-01`, qrToken: `qTok${code}`, ticketTypeName: "General", holderName: "Ana Pérez" }],
  };
}

const codes = (orders: readonly Order[]) => orders.map((order) => order.code);

describe("splitOrdersByDate", () => {
  const now = new Date("2026-10-03T12:00:00-05:00");

  it("pone las futuras en upcoming (ascendente) y las pasadas en past (descendente)", () => {
    const orders = [
      makeOrder({ code: "MT-FUT002", startsAt: "2026-12-01T20:00:00-05:00" }),
      makeOrder({ code: "MT-PAS001", startsAt: "2026-06-01T20:00:00-05:00" }),
      makeOrder({ code: "MT-FUT001", startsAt: "2026-11-01T20:00:00-05:00" }),
      makeOrder({ code: "MT-PAS002", startsAt: "2026-09-01T20:00:00-05:00" }),
    ];
    const result = splitOrdersByDate(orders, now);
    expect(codes(result.upcoming)).toEqual(["MT-FUT001", "MT-FUT002"]);
    expect(codes(result.past)).toEqual(["MT-PAS002", "MT-PAS001"]);
  });

  it("startsAt igual a now cuenta como próxima", () => {
    const result = splitOrdersByDate([makeOrder({ code: "MT-AHORA1", startsAt: "2026-10-03T17:00:00Z" })], now);
    expect(codes(result.upcoming)).toEqual(["MT-AHORA1"]);
    expect(result.past).toEqual([]);
  });

  it("con el mismo startsAt ordena por createdAt descendente", () => {
    const startsAt = "2026-11-01T20:00:00-05:00";
    const past = "2026-05-01T20:00:00-05:00";
    const orders = [
      makeOrder({ code: "MT-VIEJA1", startsAt, createdAt: "2026-08-01T10:00:00-05:00" }),
      makeOrder({ code: "MT-NUEVA1", startsAt, createdAt: "2026-09-01T10:00:00-05:00" }),
      makeOrder({ code: "MT-VIEJA2", startsAt: past, createdAt: "2026-04-01T10:00:00-05:00" }),
      makeOrder({ code: "MT-NUEVA2", startsAt: past, createdAt: "2026-04-20T10:00:00-05:00" }),
    ];
    const result = splitOrdersByDate(orders, now);
    expect(codes(result.upcoming)).toEqual(["MT-NUEVA1", "MT-VIEJA1"]);
    expect(codes(result.past)).toEqual(["MT-NUEVA2", "MT-VIEJA2"]);
  });

  it("no muta el array recibido", () => {
    const orders = [
      makeOrder({ code: "MT-FUT002", startsAt: "2026-12-01T20:00:00-05:00" }),
      makeOrder({ code: "MT-FUT001", startsAt: "2026-11-01T20:00:00-05:00" }),
    ];
    const snapshot = [...orders];
    splitOrdersByDate(orders, now);
    expect(orders).toEqual(snapshot);
    expect(codes(orders)).toEqual(["MT-FUT002", "MT-FUT001"]);
  });
});

describe("formatTicketCount", () => {
  it.each([
    [1, "1 entrada"],
    [2, "2 entradas"],
  ])("%i → %s", (count, expected) => {
    expect(formatTicketCount(count)).toBe(expected);
  });
});

describe("formatOrderZones", () => {
  const item = (name: string) => ({ ticketTypeId: name.toLowerCase(), name, unitPrice: 100, quantity: 1 });

  it("con una zona devuelve su nombre", () => {
    expect(formatOrderZones([item("General")])).toBe("General");
  });

  it("con dos zonas las une por coma", () => {
    expect(formatOrderZones([item("General"), item("VIP")])).toBe("General, VIP");
  });

  it("no repite nombres", () => {
    expect(formatOrderZones([item("General"), item("VIP"), item("General")])).toBe("General, VIP");
  });
});

describe("getDateChipParts", () => {
  it.each([
    ["2026-11-14T21:00:00-05:00", { month: "NOV", day: "14" }],
    ["2026-11-02T20:00:00-05:00", { month: "NOV", day: "02" }],
    ["2026-11-15T03:00:00Z", { month: "NOV", day: "14" }],
    ["2027-01-16T20:00:00-05:00", { month: "ENE", day: "16" }],
  ])("%s → %o (America/Lima)", (iso, expected) => {
    expect(getDateChipParts(iso)).toEqual(expected);
  });
});
