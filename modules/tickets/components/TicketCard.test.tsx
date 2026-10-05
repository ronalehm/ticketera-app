import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildIcsEvent, downloadIcs } from "@/lib/calendar";
import { downloadTicketsPdf } from "@/lib/ticketPdf";
import type { Order } from "@/modules/checkout/orders";
import { DEMO_ORDERS } from "../data/demoOrders";
import type { OrderTimeframe } from "../types/tickets.types";
import { TicketCard } from "./TicketCard";

vi.mock("@/lib/calendar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/calendar")>();
  return { ...actual, buildIcsEvent: vi.fn(actual.buildIcsEvent), downloadIcs: vi.fn() };
});

vi.mock("@/lib/ticketPdf", () => ({ downloadTicketsPdf: vi.fn().mockResolvedValue(undefined) }));

const findDemoOrder = (code: string): Order => {
  const order = DEMO_ORDERS.find((demoOrder) => demoOrder.code === code);
  if (!order) throw new Error(`No existe el pedido demo ${code}`);
  return order;
};

// 2 entradas sin asiento (Noche de Sintetizadores) y 1 entrada con asiento (Clásico del Pacífico).
const TWO_TICKETS = findDemoOrder("MT-7Q4K2P");
const SEATED = findDemoOrder("MT-3HX9RB");

function renderCard(order: Order = TWO_TICKETS, timeframe: OrderTimeframe = "upcoming") {
  render(<TicketCard order={order} timeframe={timeframe} />);
  return within(screen.getByRole("article"));
}

const detail = (card: ReturnType<typeof renderCard>, label: string) =>
  card.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(buildIcsEvent).mockClear();
  vi.mocked(downloadIcs).mockReset();
  vi.mocked(downloadTicketsPdf).mockClear();
});

describe("TicketCard", () => {
  it("empieza en la entrada 1 de 2 con Entrada anterior deshabilitada", () => {
    const card = renderCard();

    expect(card.getByRole("heading", { level: 2, name: TWO_TICKETS.event.title })).toBeTruthy();
    expect(card.getByText("Entrada 1 de 2")).toBeTruthy();
    expect(card.getByRole("button", { name: "Entrada anterior" }).getAttribute("aria-disabled")).toBe("true");
    expect(card.getByRole("button", { name: "Entrada siguiente" }).getAttribute("aria-disabled")).not.toBe("true");
    expect(detail(card, "Código")).toBe("MT-7Q4K2P-01");
    expect(card.getByRole("img", { name: "Código QR de la entrada MT-7Q4K2P-01" })).toBeTruthy();
  });

  it("Entrada siguiente avanza código, titular y QR, y queda deshabilitada (con foco) en la última", () => {
    const card = renderCard();
    const next = card.getByRole("button", { name: "Entrada siguiente" });
    next.focus();

    fireEvent.click(next);

    expect(card.getByText("Entrada 2 de 2").getAttribute("aria-live")).toBe("polite");
    expect(detail(card, "Código")).toBe("MT-7Q4K2P-02");
    expect(detail(card, "Titular")).toBe("Carlos Quispe");
    expect(card.getByRole("img", { name: "Código QR de la entrada MT-7Q4K2P-02" })).toBeTruthy();
    expect(next.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(next);
    expect(card.getByRole("button", { name: "Entrada anterior" }).getAttribute("aria-disabled")).not.toBe("true");
  });

  it("usa el paginador compartido: ArrowRight con el foco en Entrada siguiente avanza a la entrada 2", () => {
    const card = renderCard();
    const next = card.getByRole("button", { name: "Entrada siguiente" });
    next.focus();

    fireEvent.keyDown(next, { key: "ArrowRight" });

    expect(card.getByRole("group", { name: "Entradas del pedido" })).toBeTruthy();
    expect(card.getByText("Entrada 2 de 2")).toBeTruthy();
    expect(detail(card, "Código")).toBe("MT-7Q4K2P-02");
    expect(document.activeElement).toBe(next);
  });

  it("muestra Asiento solo si la entrada tiene seatLabel", () => {
    const seated = renderCard(SEATED);
    expect(detail(seated, "Zona")).toBe("Occidente");
    expect(detail(seated, "Asiento")).toBe("Occidente · Fila F · Asiento 4");
    cleanup();

    const unseated = renderCard(TWO_TICKETS);
    expect(detail(unseated, "Zona")).toBe("General");
    expect(unseated.queryByText("Asiento", { selector: "dt" })).toBeNull();
  });

  it("el Estado es Válida en Próximas y Usada en Pasadas", () => {
    expect(detail(renderCard(TWO_TICKETS, "upcoming"), "Estado")).toBe("Válida");
    cleanup();

    expect(detail(renderCard(TWO_TICKETS, "past"), "Estado")).toBe("Usada");
  });

  it("Descargar PDF descarga todas las entradas del pedido aunque se muestre la 2 y no abre el diálogo de impresión", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const card = renderCard();
    fireEvent.click(card.getByRole("button", { name: "Entrada siguiente" }));
    expect(card.getByText("Entrada 2 de 2")).toBeTruthy();

    fireEvent.click(card.getByRole("button", { name: "Descargar PDF" }));

    expect(downloadTicketsPdf).toHaveBeenCalledTimes(1);
    const input = vi.mocked(downloadTicketsPdf).mock.calls[0][0];
    expect(input.orderCode).toBe("MT-7Q4K2P");
    expect(input.tickets.map(({ code }) => code)).toEqual(["MT-7Q4K2P-01", "MT-7Q4K2P-02"]);
    expect(input.tickets.map(({ holderName }) => holderName)).toEqual(["Ana Quispe", "Carlos Quispe"]);
    expect(print).not.toHaveBeenCalled();
    await waitFor(() => expect(card.getByRole("button", { name: "Descargar PDF" }).getAttribute("aria-busy")).toBeNull());
  });

  it("en el PDF de un pedido con asiento, Zona / asiento es la etiqueta completa del asiento", async () => {
    const card = renderCard(SEATED);

    fireEvent.click(card.getByRole("button", { name: "Descargar PDF" }));

    const input = vi.mocked(downloadTicketsPdf).mock.calls[0][0];
    expect(input.orderCode).toBe("MT-3HX9RB");
    expect(input.tickets.map(({ locationLabel }) => locationLabel)).toEqual(["Occidente · Fila F · Asiento 4"]);
    await waitFor(() => expect(card.getByRole("button", { name: "Descargar PDF" }).getAttribute("aria-busy")).toBeNull());
  });

  it("Agregar al calendario descarga <slug>.ics con título, fecha, lugar y descripción del pedido", () => {
    const card = renderCard();

    fireEvent.click(card.getByRole("button", { name: "Agregar al calendario" }));

    expect(buildIcsEvent).toHaveBeenCalledTimes(1);
    expect(buildIcsEvent).toHaveBeenCalledWith({
      title: "Noche de Sintetizadores: Gira Neón 2026",
      startsAt: "2026-11-14T21:00:00-05:00",
      location: "Estadio Nacional, Lima",
      description: "Pedido MT-7Q4K2P · 2 entradas",
    });
    const content = vi.mocked(buildIcsEvent).mock.results[0].value;
    expect(downloadIcs).toHaveBeenCalledTimes(1);
    expect(downloadIcs).toHaveBeenCalledWith("noche-de-sintetizadores-lima.ics", content);
    expect(content).toContain("SUMMARY:Noche de Sintetizadores: Gira Neón 2026");
    expect(content).toContain("LOCATION:Estadio Nacional\\, Lima");
  });

  it("con 1 entrada la descripción del calendario dice 1 entrada", () => {
    const card = renderCard(SEATED);

    fireEvent.click(card.getByRole("button", { name: "Agregar al calendario" }));

    expect(vi.mocked(buildIcsEvent).mock.calls[0][0].description).toBe("Pedido MT-3HX9RB · 1 entrada");
    expect(vi.mocked(downloadIcs).mock.calls[0][0]).toBe("clasico-del-pacifico.ics");
  });

  it("en Pasadas no hay Agregar al calendario pero sí Descargar PDF", () => {
    const card = renderCard(TWO_TICKETS, "past");

    expect(card.queryByRole("button", { name: "Agregar al calendario" })).toBeNull();
    expect(card.getByRole("button", { name: "Descargar PDF" })).toBeTruthy();
  });
});
