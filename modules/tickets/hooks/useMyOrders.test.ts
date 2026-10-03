import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/modules/auth/session";
import { type Order, useOrdersStore } from "@/modules/checkout/orders";
import { DEMO_ACCOUNT_EMAIL, DEMO_ORDERS } from "../data/demoOrders";
import type { MyOrdersState } from "../types/tickets.types";
import { useMyOrders } from "./useMyOrders";

const NOW = new Date("2026-10-03T12:00:00-05:00");

const ana = { id: "usr-002", firstName: "Ana", lastName: "Pérez", email: "ana@correo.pe" };
const demo = { id: "usr-001", firstName: "Ana", lastName: "Quispe", email: DEMO_ACCOUNT_EMAIL };

function makeOrder(code: string, ownerEmail: string, startsAt: string): Order {
  return {
    code,
    createdAt: "2026-09-01T10:00:00-05:00",
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
    buyer: {
      firstName: "Ana",
      lastName: "Pérez",
      email: ownerEmail,
      phone: "987654321",
      documentType: "dni",
      documentNumber: "12345678",
    },
    tickets: [{ code: `${code}-01`, ticketTypeName: "General", holderName: "Ana Pérez" }],
  };
}

const ownUpcomingLate = makeOrder("MT-AAAAA1", ana.email, "2026-12-20T20:00:00-05:00");
const ownUpcomingSoon = makeOrder("MT-AAAAA2", ana.email, "2026-10-10T20:00:00-05:00");
const ownPast = makeOrder("MT-AAAAA3", ana.email, "2026-09-10T20:00:00-05:00");
const foreign = makeOrder("MT-BBBBB1", "otro@correo.pe", "2026-11-01T20:00:00-05:00");

// Siembra localStorage con la forma que guarda `persist`, como en una recarga real.
function seedStorage({ user, orders = [] }: { user: typeof ana | null; orders?: Order[] }) {
  localStorage.setItem("mentec-auth", JSON.stringify({ state: { user }, version: 0 }));
  localStorage.setItem("mentec-orders", JSON.stringify({ state: { orders }, version: 0 }));
}

// Registra cada render para comprobar el primero y que no hay estados intermedios.
function renderMyOrders() {
  const states: MyOrdersState[] = [];
  const hook = renderHook(() => {
    const state = useMyOrders();
    states.push(state);
    return state;
  });
  return { ...hook, states };
}

const codes = (orders: Order[]) => orders.map((order) => order.code);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  useAuthStore.setState({ user: null });
  useOrdersStore.setState({ orders: [] });
  localStorage.clear(); // setState también persiste
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useMyOrders", () => {
  it("el primer render es loading", async () => {
    seedStorage({ user: ana });

    const { result, states } = renderMyOrders();

    expect(states[0]).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current.status).not.toBe("loading"));
  });

  it("sin sesión pasa a signed-out tras rehidratar", async () => {
    seedStorage({ user: null, orders: [ownUpcomingSoon] });

    const { result } = renderMyOrders();

    await waitFor(() => expect(result.current).toEqual({ status: "signed-out" }));
  });

  it("con sesión guardada pasa de loading a ready sin pasar por signed-out", async () => {
    seedStorage({ user: ana, orders: [ownUpcomingSoon] });

    const { result, states } = renderMyOrders();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(states.some((state) => state.status === "signed-out")).toBe(false);
  });

  it("con sesión no demo devuelve solo sus órdenes, separadas y ordenadas por fecha", async () => {
    seedStorage({ user: ana, orders: [ownUpcomingLate, foreign, ownPast, ownUpcomingSoon] });

    const { result } = renderMyOrders();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("se esperaba ready");
    expect(codes(result.current.upcoming)).toEqual([ownUpcomingSoon.code, ownUpcomingLate.code]);
    expect(codes(result.current.past)).toEqual([ownPast.code]);
  });

  it("con la sesión demo incluye los 3 pedidos demo (2 próximos y 1 pasado)", async () => {
    seedStorage({ user: demo });

    const { result } = renderMyOrders();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("se esperaba ready");
    const { upcoming, past } = result.current;
    expect(upcoming).toHaveLength(2);
    expect(past).toHaveLength(1);
    expect([...codes(upcoming), ...codes(past)].sort()).toEqual(codes(DEMO_ORDERS).sort());
  });

  it("signOut tras ready pasa a signed-out", async () => {
    seedStorage({ user: ana, orders: [ownUpcomingSoon] });
    const { result } = renderMyOrders();
    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => useAuthStore.getState().signOut());

    expect(result.current).toEqual({ status: "signed-out" });
  });
});
