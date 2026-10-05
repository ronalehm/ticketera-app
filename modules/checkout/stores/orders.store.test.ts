import { beforeEach, describe, expect, it } from "vitest";
import type { Order } from "../types/checkout.types";
import { persistOrder, useOrdersStore } from "./orders.store";

const makeOrder = (code: string, overrides: Partial<Order> = {}): Order => ({
  code,
  createdAt: "2026-10-03T15:00:00.000Z",
  ownerEmail: "ana@example.com",
  event: {
    slug: "concierto-demo",
    title: "Concierto demo",
    category: "conciertos",
    startsAt: "2026-11-14T21:00:00-05:00",
    venue: "Arena Lima",
    city: "Lima",
    imageUrl: "/images/demo.jpg",
  },
  items: [{ ticketTypeId: "general", name: "General", unitPrice: 80, quantity: 1 }],
  ticketCount: 1,
  total: 80,
  paymentMethod: "yape",
  buyer: { name: "Ana Quispe", email: "ana@example.com" },
  tickets: [{ code: `${code}-01`, ticketTypeName: "General", holderName: "Ana Quispe" }],
  ...overrides,
});

const stored = () => JSON.parse(localStorage.getItem("mentec-orders") ?? "null");

beforeEach(() => {
  useOrdersStore.setState({ orders: [] });
  localStorage.clear(); // setState también persiste
});

describe("useOrdersStore", () => {
  it("addOrder guarda y persiste en mentec-orders, la más reciente primero", () => {
    const first = makeOrder("MT-AAAAAA");
    const second = makeOrder("MT-BBBBBB");
    useOrdersStore.getState().addOrder(first);
    useOrdersStore.getState().addOrder(second);

    expect(useOrdersStore.getState().orders).toEqual([second, first]);
    expect(stored().state).toEqual({ orders: [second, first] });
  });

  it("addOrder con el mismo código reemplaza la orden existente", () => {
    const other = makeOrder("MT-AAAAAA");
    useOrdersStore.getState().addOrder(makeOrder("MT-BBBBBB"));
    useOrdersStore.getState().addOrder(other);
    const updated = makeOrder("MT-BBBBBB", { total: 160, ticketCount: 2 });
    useOrdersStore.getState().addOrder(updated);

    expect(useOrdersStore.getState().orders).toEqual([updated, other]);
  });

  it("getOrder encuentra la orden por código o devuelve undefined", () => {
    const order = makeOrder("MT-AAAAAA");
    useOrdersStore.getState().addOrder(order);

    expect(useOrdersStore.getState().getOrder("MT-AAAAAA")).toEqual(order);
    expect(useOrdersStore.getState().getOrder("MT-ZZZZZZ")).toBeUndefined();
  });

  it("persist.rehydrate restaura las órdenes guardadas", async () => {
    const order = makeOrder("MT-AAAAAA");
    localStorage.setItem("mentec-orders", JSON.stringify({ state: { orders: [order] }, version: 0 }));
    expect(useOrdersStore.getState().orders).toEqual([]);

    await useOrdersStore.persist.rehydrate();
    expect(useOrdersStore.getState().orders).toEqual([order]);
  });
});

describe("persistOrder", () => {
  it("con órdenes previas en localStorage y el store sin hidratar conserva ambas, la nueva primero", async () => {
    const previous = makeOrder("MT-AAAAAA");
    const next = makeOrder("MT-BBBBBB");
    localStorage.setItem("mentec-orders", JSON.stringify({ state: { orders: [previous] }, version: 0 }));
    expect(useOrdersStore.getState().orders).toEqual([]);

    await persistOrder(next);

    expect(useOrdersStore.getState().orders).toEqual([next, previous]);
    expect(stored().state.orders).toEqual([next, previous]);
  });
});
