import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { GeneralVenueZone, NumberedVenueZone, VenueZone } from "../types/seating.types";
import { ZonePricesCard } from "./ZonePricesCard";

const SLUG = "noche-de-sintetizadores-lima";
const SHAPE = { path: "M0 0 H10 V10 H0 Z", labelPos: { x: 5, y: 5 } };

function generalZone(id: string, name: string, price: number, status: GeneralVenueZone["status"]): GeneralVenueZone {
  return { kind: "general", id, ticketTypeId: id, ...SHAPE, capacity: 500, name, price, status };
}

function numberedZone(id: string, name: string, price: number, status: NumberedVenueZone["status"]): NumberedVenueZone {
  return {
    kind: "numbered",
    id,
    ticketTypeId: id,
    ...SHAPE,
    seatViewBox: "0 0 100 100",
    rows: [{ label: "A", seats: [{ id: `${id}-A-1`, row: "A", number: 1, x: 10, y: 10, status: "available" }] }],
    name,
    price,
    status,
  };
}

// En el orden del mapa: de pie con pocas entradas, de pie disponible, numerada y agotada.
const ZONES: VenueZone[] = [
  generalZone("vip", "VIP", 550, "low-stock"),
  generalZone("general", "General", 180, "available"),
  numberedZone("norte", "Tribuna Norte", 220, "available"),
  generalZone("mesa", "Mesa", 400, "sold-out"),
];

function renderCard(status: "available" | "sold-out" = "available") {
  render(<ZonePricesCard slug={SLUG} status={status} priceFrom={180} zones={ZONES} />);
  return screen.getByRole("list", { name: "Zonas" });
}

afterEach(cleanup);

describe("ZonePricesCard", () => {
  it("enlaza cada zona comprable a su sub-paso 2, en el orden de las zonas", () => {
    const list = renderCard();

    const links = within(list).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/eventos/${SLUG}/entradas?zona=vip`,
      `/eventos/${SLUG}/entradas?zona=general`,
      `/eventos/${SLUG}/entradas?zona=norte`,
    ]);
  });

  it("da a cada fila enlace un nombre accesible con la zona, el precio y, si quedan pocas, 'últimas entradas'", () => {
    const list = renderCard();

    expect(
      within(list).getByRole("link", { name: "Elegir entradas de VIP, S/ 550.00, últimas entradas" }),
    ).toBeTruthy();
    expect(within(list).getByRole("link", { name: "Elegir entradas de General, S/ 180.00" })).toBeTruthy();
    expect(within(list).getByRole("link", { name: "Elegir entradas de Tribuna Norte, S/ 220.00" })).toBeTruthy();
  });

  it("deja la zona agotada como texto, sin enlace, con 'Agotado'", () => {
    const list = renderCard();

    const soldOutRow = within(list).getByText("Mesa").closest("li");
    expect(soldOutRow).not.toBeNull();
    expect(within(soldOutRow as HTMLElement).queryByRole("link")).toBeNull();
    expect(within(soldOutRow as HTMLElement).getByText("Agotado")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Mesa/ })).toBeNull();
  });

  it("enlaza 'Ver mapa de zonas' al sub-paso 1 y ningún enlace se llama solo 'Elegir entradas'", () => {
    renderCard();

    const mapLink = screen.getByRole("link", { name: "Ver mapa de zonas" });
    expect(mapLink.getAttribute("href")).toBe(`/eventos/${SLUG}/entradas`);
    expect(screen.queryByRole("link", { name: "Elegir entradas" })).toBeNull();
  });

  it("con el evento agotado, no enlaza ninguna zona ni el mapa y muestra 'Entradas agotadas'", () => {
    const list = renderCard("sold-out");

    expect(within(list).queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("Ver mapa de zonas")).toBeNull();
    expect(screen.getByText("Entradas agotadas")).toBeTruthy();
    expect(within(list).getByText("S/ 550.00")).toBeTruthy();
  });
});
