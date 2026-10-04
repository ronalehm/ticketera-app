import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOrdersStore } from "@/modules/checkout/orders";
import { DEMO_ACCOUNT_EMAIL } from "../data/demoOrders";
import { MyTickets } from "./MyTickets";

type SessionIdentity = { firstName: string; lastName: string; email: string };

const session = vi.hoisted(() => ({ user: null as SessionIdentity | null }));

vi.mock("@/modules/auth/session", () => ({
  useSessionUser: () => ({ isLoaded: true, user: session.user, signOut: vi.fn() }),
}));

const NOW = new Date("2026-10-03T12:00:00-05:00");

const demo = { firstName: "Ana", lastName: "Quispe", email: DEMO_ACCOUNT_EMAIL };
const ana = { firstName: "Ana", lastName: "Pérez", email: "ana@correo.pe" };

// Fija la sesión de Clerk y siembra las órdenes con la forma que guarda `persist`, como en una recarga real.
function seedStorage(user: SessionIdentity | null) {
  session.user = user;
  localStorage.setItem("mentec-orders", JSON.stringify({ state: { orders: [] }, version: 0 }));
}

const findTab = (name: RegExp) => screen.findByRole("tab", { name });
const orderButtons = () => within(screen.getByRole("list", { name: "Pedidos" })).getAllByRole("button");
const cardTitle = () => within(screen.getByRole("article")).getByRole("heading", { level: 2 }).textContent;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  session.user = null;
  useOrdersStore.setState({ orders: [] });
  localStorage.clear(); // setState también persiste
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MyTickets", () => {
  it("muestra el h1 y el estado cargando antes de rehidratar", async () => {
    seedStorage(demo);
    render(<MyTickets />);

    expect(screen.getByRole("heading", { level: 1, name: "Mis entradas" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Cargando tus entradas…");
    await findTab(/^Próximas/);
  });

  it("sin sesión muestra Inicia sesión para ver tus entradas con enlace a /login y sin pestañas", async () => {
    seedStorage(null);
    render(<MyTickets />);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Inicia sesión para ver tus entradas" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("con la sesión demo muestra Próximas (2) y Pasadas (1) con el primer pedido seleccionado", async () => {
    seedStorage(demo);
    render(<MyTickets />);

    const upcoming = await findTab(/^Próximas/);
    expect(upcoming.textContent).toBe("Próximas (2)");
    expect(upcoming.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /^Pasadas/ }).textContent).toBe("Pasadas (1)");

    const [first, second] = orderButtons();
    expect(first.getAttribute("aria-current")).toBe("true");
    expect(first.textContent).toContain("Noche de Sintetizadores: Gira Neón 2026");
    expect(second.getAttribute("aria-current")).toBeNull();
    expect(cardTitle()).toBe("Noche de Sintetizadores: Gira Neón 2026");
    expect(screen.getByText("Entrada 1 de 2")).toBeTruthy();
  });

  it("al pulsar el segundo pedido mueve aria-current y cambia la tarjeta", async () => {
    seedStorage(demo);
    render(<MyTickets />);
    await findTab(/^Próximas/);

    fireEvent.click(orderButtons()[1]);

    const [first, second] = orderButtons();
    expect(second.getAttribute("aria-current")).toBe("true");
    expect(first.getAttribute("aria-current")).toBeNull();
    expect(cardTitle()).toBe("Clásico del Pacífico: final de temporada");
    expect(screen.getByText("Entrada 1 de 1")).toBeTruthy();
  });

  it("al activar Pasadas muestra el pedido pasado con Estado Usada y sin Agregar al calendario", async () => {
    seedStorage(demo);
    render(<MyTickets />);
    await findTab(/^Próximas/);

    const past = screen.getByRole("tab", { name: /^Pasadas/ });
    fireEvent.click(past);

    expect(past.getAttribute("aria-selected")).toBe("true");
    expect(cardTitle()).toBe("La casa de los espejos");
    expect(screen.getByText("Usada")).toBeTruthy();
    expect(screen.queryByText("Válida")).toBeNull();
    expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Agregar al calendario" })).toBeNull();
  });

  it("sin órdenes muestra Aún no tienes eventos próximos con Explorar eventos → /eventos", async () => {
    seedStorage(ana);
    render(<MyTickets />);

    expect(await screen.findByRole("heading", { level: 2, name: "Aún no tienes eventos próximos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorar eventos" }).getAttribute("href")).toBe("/eventos");
    expect(screen.queryByRole("list", { name: "Pedidos" })).toBeNull();
    expect((await findTab(/^Próximas/)).textContent).toBe("Próximas (0)");
  });
});
