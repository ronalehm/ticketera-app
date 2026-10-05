import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useOrdersStore } from "../stores/orders.store";
import type { Order } from "../types/checkout.types";
import { type StoredOrderState, useStoredOrder } from "./useStoredOrder";

const CODE = "MT-AB12CD";

const order: Order = {
  code: CODE,
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
  tickets: [{ code: `${CODE}-01`, ticketTypeName: "General", holderName: "Ana Quispe" }],
};

// Registra cada render para comprobar el primero y que no hay estados intermedios.
function renderStoredOrder(code: string) {
  const states: StoredOrderState[] = [];
  const hook = renderHook(() => {
    const state = useStoredOrder(code);
    states.push(state);
    return state;
  });
  return { ...hook, states };
}

beforeEach(() => {
  useOrdersStore.setState({ orders: [] });
  localStorage.clear(); // setState también persiste
});

describe("useStoredOrder", () => {
  it("el primer render es loading", async () => {
    const { result, states } = renderStoredOrder(CODE);

    expect(states[0]).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.status).not.toBe("loading"));
  });

  it("con la orden en localStorage pasa a found tras rehidratar, sin pasar por not-found", async () => {
    localStorage.setItem("mentec-orders", JSON.stringify({ state: { orders: [order] }, version: 0 }));

    const { result, states } = renderStoredOrder(CODE);

    await waitFor(() => expect(result.current).toEqual({ status: "found", order }));
    expect(states.some((state) => state.status === "not-found")).toBe(false);
  });

  it("sin la orden pasa a not-found", async () => {
    localStorage.setItem("mentec-orders", JSON.stringify({ state: { orders: [order] }, version: 0 }));

    const { result } = renderStoredOrder("MT-ZZZZZZ");

    await waitFor(() => expect(result.current).toEqual({ status: "not-found" }));
  });

  it("pasa a found si se añade la orden después", async () => {
    const { result } = renderStoredOrder(CODE);
    await waitFor(() => expect(result.current).toEqual({ status: "not-found" }));

    act(() => useOrdersStore.getState().addOrder(order));

    expect(result.current).toEqual({ status: "found", order });
  });
});
