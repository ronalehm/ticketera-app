import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EventActionBar } from "./EventActionBar";

const event = {
  slug: "noche-de-sintetizadores-lima",
  title: "Noche de Sintetizadores",
  startsAt: "2026-11-22T00:00:00.000Z",
  venue: "Estadio Nacional",
  address: "Av. José Díaz s/n",
  city: "Lima",
  status: "available" as const,
};

afterEach(cleanup);

describe("EventActionBar", () => {
  it("muestra Mi entrada, Comprar y Más en ese orden, con sus destinos", () => {
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
    const { queryByRole, getByText } = render(
      <EventActionBar
        event={{ ...event, status: "sold-out" }}
        purchaseHref="#entradas"
      />,
    );
    expect(queryByRole("link", { name: "Comprar" })).toBeNull();
    expect(getByText("Agotado").getAttribute("aria-disabled")).toBe("true");
  });
});
