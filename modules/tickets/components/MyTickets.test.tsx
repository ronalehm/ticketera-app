import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Order } from "@/modules/checkout/orders";
import { MyTickets } from "./MyTickets";

function makeOrder(code: string, title: string, startsAt: string, ticketCount: number): Order {
  return {
    code,
    createdAt: "2026-09-20T18:42:00-05:00",
    event: {
      slug: code.toLowerCase(),
      title,
      category: "conciertos",
      categoryName: "Conciertos",
      startsAt,
      venue: "Estadio Nacional",
      city: "Lima",
      imageUrl: "https://images.unsplash.com/photo-1?auto=format&fit=crop&w=1600&q=80",
    },
    items: [{ ticketTypeId: "general", name: "General", unitPrice: 180, quantity: ticketCount }],
    ticketCount,
    total: 180 * ticketCount,
    buyer: { name: "Ana Quispe", email: "ana@correo.pe" },
    tickets: Array.from({ length: ticketCount }, (_, i) => ({
      code: `${code}-0${i + 1}`,
      qrToken: `qTok${code}x${i + 1}`,
      ticketTypeName: "General",
      holderName: "Ana Quispe",
    })),
  };
}

const UPCOMING = [
  makeOrder("TK-1001", "Noche de Sintetizadores", "2026-11-14T21:00:00-05:00", 2),
  makeOrder("TK-1002", "Clásico del Pacífico", "2026-11-29T15:30:00-05:00", 1),
];
const PAST = [makeOrder("TK-1000", "La casa de los espejos", "2026-08-01T20:00:00-05:00", 1)];

const tab = (name: RegExp) => screen.getByRole("tab", { name });
const orderButtons = () => within(screen.getByRole("list", { name: "Pedidos" })).getAllByRole("button");
const cardTitle = () => within(screen.getByRole("article")).getByRole("heading", { level: 2 }).textContent;

afterEach(cleanup);

describe("MyTickets", () => {
  it("muestra el h1, Próximas (2) y Pasadas (1) con el primer pedido seleccionado, sin estado de carga", () => {
    render(<MyTickets upcoming={UPCOMING} past={PAST} />);

    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Mis entradas"]);
    expect(screen.queryByText("Cargando tus entradas…")).toBeNull();
    expect(tab(/^Próximas/).textContent).toBe("Próximas (2)");
    expect(tab(/^Próximas/).getAttribute("aria-selected")).toBe("true");
    expect(tab(/^Pasadas/).textContent).toBe("Pasadas (1)");

    const [first, second] = orderButtons();
    expect(first.getAttribute("aria-current")).toBe("true");
    expect(second.getAttribute("aria-current")).toBeNull();
    expect(cardTitle()).toBe("Noche de Sintetizadores");
    expect(screen.getByText("Entrada 1 de 2")).toBeTruthy();
  });

  it("al pulsar el segundo pedido mueve aria-current y cambia la tarjeta", () => {
    render(<MyTickets upcoming={UPCOMING} past={PAST} />);

    fireEvent.click(orderButtons()[1]);

    const [first, second] = orderButtons();
    expect(second.getAttribute("aria-current")).toBe("true");
    expect(first.getAttribute("aria-current")).toBeNull();
    expect(cardTitle()).toBe("Clásico del Pacífico");
    expect(screen.getByText("Entrada 1 de 1")).toBeTruthy();
  });

  it("al activar Pasadas muestra el pedido pasado con Estado Usada y sin Agregar al calendario", () => {
    render(<MyTickets upcoming={UPCOMING} past={PAST} />);

    fireEvent.click(tab(/^Pasadas/));

    expect(tab(/^Pasadas/).getAttribute("aria-selected")).toBe("true");
    expect(cardTitle()).toBe("La casa de los espejos");
    expect(screen.getByText("Usada")).toBeTruthy();
    expect(screen.queryByText("Válida")).toBeNull();
    expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Agregar al calendario" })).toBeNull();
  });

  it("sin órdenes muestra los vacíos de cada pestaña con Explorar eventos → /eventos", () => {
    render(<MyTickets upcoming={[]} past={[]} />);

    expect(tab(/^Próximas/).textContent).toBe("Próximas (0)");
    expect(screen.getByRole("heading", { level: 2, name: "Aún no tienes eventos próximos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Explorar eventos" }).getAttribute("href")).toBe("/eventos");
    expect(screen.queryByRole("list", { name: "Pedidos" })).toBeNull();
    expect(screen.queryByText("Inicia sesión para ver tus entradas")).toBeNull();

    fireEvent.click(tab(/^Pasadas/));
    expect(screen.getByRole("heading", { level: 2, name: "Aún no tienes eventos pasados" })).toBeTruthy();
  });
});
