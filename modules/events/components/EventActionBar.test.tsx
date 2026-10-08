import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { hasTicketsForEvent } from "@/modules/checkout/eventTickets";

import { EventActionBar } from "./EventActionBar";

vi.mock("@/modules/checkout/eventTickets", () => ({
  hasTicketsForEvent: vi.fn(),
}));
const hasTickets = vi.mocked(hasTicketsForEvent);
const isPrimary = (element: HTMLElement) =>
  element.className.includes("bg-primary ");

const event = {
  slug: "noche-de-sintetizadores-lima",
  title: "Noche de Sintetizadores",
  startsAt: "2026-11-22T00:00:00.000Z",
  venue: "Estadio Nacional",
  address: "Av. José Díaz s/n",
  city: "Lima",
  status: "available" as const,
};

afterEach(() => {
  cleanup();
  hasTickets.mockReset();
});

describe("EventActionBar", () => {
  it("muestra Mi entrada, Comprar y Más en ese orden, con sus destinos", () => {
    hasTickets.mockResolvedValue(false);
    const { getByRole } = render(
      <EventActionBar event={event} purchaseHref="#entradas" />,
    );
    const nav = getByRole("navigation", { name: "Acciones del evento" });
    expect(nav.textContent).toBe("Mi entradaComprarMás");
    expect(getByRole("link", { name: "Mi entrada" }).getAttribute("href")).toBe(
      "/mis-entradas",
    );
    expect(getByRole("link", { name: "Comprar" }).getAttribute("href")).toBe(
      "#entradas",
    );
    expect(getByRole("button", { name: "Más" })).toBeTruthy();
  });

  it("agotado: sin enlace de compra", () => {
    hasTickets.mockResolvedValue(false);
    const { queryByRole, getByText } = render(
      <EventActionBar
        event={{ ...event, status: "sold-out" }}
        purchaseHref="#entradas"
      />,
    );
    expect(queryByRole("link", { name: "Comprar" })).toBeNull();
    expect(getByText("Agotado").getAttribute("aria-disabled")).toBe("true");
  });

  it("sin entradas del evento, el principal es «Comprar»", async () => {
    hasTickets.mockResolvedValue(false);
    const { getByRole } = render(
      <EventActionBar event={event} purchaseHref="#entradas" />,
    );
    await waitFor(() => expect(hasTickets).toHaveBeenCalledWith(event.slug));
    expect(isPrimary(getByRole("link", { name: "Comprar" }))).toBe(true);
    expect(isPrimary(getByRole("link", { name: "Mi entrada" }))).toBe(false);
  });

  it("con entradas del evento, el principal pasa a ser «Mi entrada»", async () => {
    hasTickets.mockResolvedValue(true);
    const { getByRole } = render(
      <EventActionBar event={event} purchaseHref="#entradas" />,
    );
    await waitFor(() =>
      expect(isPrimary(getByRole("link", { name: "Mi entrada" }))).toBe(true),
    );
    expect(isPrimary(getByRole("link", { name: "Comprar" }))).toBe(false);
  });

  it("si la consulta falla, se queda «Comprar» como principal", async () => {
    hasTickets.mockRejectedValue(new Error("red"));
    const { getByRole } = render(
      <EventActionBar event={event} purchaseHref="#entradas" />,
    );
    await waitFor(() => expect(hasTickets).toHaveBeenCalled());
    expect(isPrimary(getByRole("link", { name: "Comprar" }))).toBe(true);
  });
});
