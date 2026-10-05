import { describe, expect, it } from "vitest";
import type { Order } from "@/modules/checkout/orders";
import { DEMO_ACCOUNT_EMAIL, DEMO_ORDERS } from "../data/demoOrders";
import { formatOrderZones, formatTicketCount, getDateChipParts, getUserOrders, splitOrdersByDate } from "./myOrders";

function makeOrder(overrides: { code: string; ownerEmail?: string; startsAt?: string; createdAt?: string }): Order {
  const { code, ownerEmail = "ana@correo.pe", startsAt = "2026-11-14T21:00:00-05:00", createdAt = "2026-09-01T10:00:00-05:00" } =
    overrides;
  return {
    code,
    createdAt,
    ownerEmail,
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
    paymentMethod: "card",
    buyer: { name: "Ana Pérez", email: ownerEmail },
    tickets: [{ code: `${code}-01`, ticketTypeName: "General", holderName: "Ana Pérez" }],
  };
}

const codes = (orders: readonly Order[]) => orders.map((order) => order.code);

describe("getUserOrders", () => {
  const own = makeOrder({ code: "MT-AAAAAA", ownerEmail: "ana@correo.pe" });
  const other = makeOrder({ code: "MT-BBBBBB", ownerEmail: "otro@correo.pe" });

  it("filtra por ownerEmail aceptando mayúsculas y espacios en el correo", () => {
    expect(codes(getUserOrders([own, other], "  Ana@Correo.PE "))).toEqual(["MT-AAAAAA"]);
  });

  it("excluye las órdenes de otros correos", () => {
    expect(getUserOrders([other], "ana@correo.pe")).toEqual([]);
  });

  it("con el correo demo añade DEMO_ORDERS después de las del store", () => {
    const demoOwn = makeOrder({ code: "MT-CCCCCC", ownerEmail: DEMO_ACCOUNT_EMAIL });
    expect(codes(getUserOrders([demoOwn, other], "DEMO@mentectickets.pe"))).toEqual([
      "MT-CCCCCC",
      ...codes(DEMO_ORDERS),
    ]);
  });

  it("con otro correo no añade DEMO_ORDERS", () => {
    expect(codes(getUserOrders([own], "ana@correo.pe"))).toEqual(["MT-AAAAAA"]);
  });

  it("si el store tiene una orden con el code de una demo, aparece una sola vez y es la del store", () => {
    const stored = makeOrder({ code: DEMO_ORDERS[0].code, ownerEmail: DEMO_ACCOUNT_EMAIL });
    const result = getUserOrders([stored], DEMO_ACCOUNT_EMAIL);
    const matches = result.filter((order) => order.code === stored.code);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toBe(stored);
    expect(result).toHaveLength(DEMO_ORDERS.length);
  });

  it("store vacío y correo no demo → []", () => {
    expect(getUserOrders([], "ana@correo.pe")).toEqual([]);
  });
});

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
