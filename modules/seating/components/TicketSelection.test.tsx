import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { formatEventPrice } from "@/modules/events/purchase";

import type { GeneralVenueZone, NumberedVenueZone, VenueMap } from "../types/seating.types";
import { TicketSelection } from "./TicketSelection";

function generalZone(id: string, name: string, price: number, status: GeneralVenueZone["status"]): GeneralVenueZone {
  return {
    kind: "general",
    id,
    ticketTypeId: id,
    path: "M20 80 H580 V180 H20 Z",
    labelPos: { x: 300, y: 130 },
    capacity: 500,
    name,
    price,
    status,
  };
}

function numberedZone(id: string, name: string, price: number, status: NumberedVenueZone["status"]): NumberedVenueZone {
  return {
    kind: "numbered",
    id,
    ticketTypeId: id,
    path: "M20 200 H580 V300 H20 Z",
    labelPos: { x: 300, y: 250 },
    seatViewBox: "0 0 112 120",
    rows: [
      {
        label: "A",
        seats: [{ id: `${id}-A-1`, row: "A", number: 1, x: 56, y: 88, status: status === "sold-out" ? "occupied" : "available" }],
      },
    ],
    name,
    price,
    status,
  };
}

const MAP: VenueMap = {
  eventSlug: "evento-prueba",
  venue: "Recinto de prueba",
  viewBox: "0 0 600 520",
  stage: { label: "ESCENARIO", path: "M200 16 H400 V60 H200 Z", labelPos: { x: 300, y: 38 } },
  zones: [
    generalZone("vip", "VIP", 550, "low-stock"),
    generalZone("general", "General", 180, "available"),
    numberedZone("norte", "Tribuna Norte", 220, "available"),
    numberedZone("mesa", "Mesa", 300, "sold-out"),
  ],
};

const renderSelection = () => render(<TicketSelection map={MAP} />);

const mapZone = (name: RegExp) => screen.getByRole("button", { name });
const zoneList = () => screen.getByRole("heading", { name: "Entradas" }).closest<HTMLElement>('[data-slot="card"]')!;
const zoneRow = (name: string) => within(zoneList()).getByText(name).closest("li")!;
const add = (name: string) => screen.getByRole("button", { name: `Agregar una entrada de ${name}` });
const remove = (name: string) => screen.getByRole("button", { name: `Quitar una entrada de ${name}` });
const summary = () => screen.getByRole("complementary", { name: "Resumen de la compra" });
const continueLinks = () => screen.queryAllByRole("link", { name: "Continuar" });
const continueButtons = () => screen.queryAllByRole("button", { name: "Continuar" });

afterEach(cleanup);

describe("TicketSelection", () => {
  it("anuncia cada zona del mapa con nombre, precio y estado", () => {
    renderSelection();

    expect(mapZone(/^VIP,/).getAttribute("aria-label")).toBe(`VIP, ${formatEventPrice(550)}, últimas entradas`);
    expect(mapZone(/^Tribuna Norte,/).getAttribute("aria-label")).toBe(
      `Tribuna Norte, ${formatEventPrice(220)}, asientos numerados`,
    );
    expect(mapZone(/^Mesa,/).getAttribute("aria-label")).toBe("Mesa, agotado, asientos numerados");
  });

  it("clic en una zona del mapa la marca como pulsada y resalta su fila de la lista", () => {
    renderSelection();
    fireEvent.click(mapZone(/^General,/));

    expect(mapZone(/^General,/).getAttribute("aria-pressed")).toBe("true");
    for (const other of [/^VIP,/, /^Tribuna Norte,/, /^Mesa,/]) {
      expect(mapZone(other).getAttribute("aria-pressed")).toBe("false");
    }
    expect(zoneRow("General").className).toContain("bg-accent");
    expect(zoneRow("VIP").className).not.toContain("bg-accent");
  });

  it("Enter o Espacio activan una zona sin desplazar la página", () => {
    renderSelection();

    fireEvent.keyDown(mapZone(/^VIP,/), { key: "Enter" });
    expect(mapZone(/^VIP,/).getAttribute("aria-pressed")).toBe("true");

    // fireEvent devuelve false cuando el handler llamó a preventDefault.
    expect(fireEvent.keyDown(mapZone(/^Tribuna Norte,/), { key: " " })).toBe(false);
    expect(mapZone(/^Tribuna Norte,/).getAttribute("aria-pressed")).toBe("true");
    expect(mapZone(/^VIP,/).getAttribute("aria-pressed")).toBe("false");
  });

  it("sin entradas muestra el resumen vacío y los 'Continuar' deshabilitados", () => {
    renderSelection();

    expect(
      within(summary()).getByText("Todavía no elegiste entradas. Toca una zona o usa los botones +."),
    ).toBeTruthy();
    expect(continueLinks()).toHaveLength(0);
    expect(continueButtons()).toHaveLength(2);
    for (const button of continueButtons()) expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(remove("General").getAttribute("aria-disabled")).toBe("true");
  });

  it("'Agregar una entrada' actualiza la cantidad, activa la zona, el total y el enlace de 'Continuar'", () => {
    renderSelection();
    fireEvent.click(add("General"));
    fireEvent.click(add("General"));

    expect(within(zoneRow("General")).getByText("2")).toBeTruthy();
    expect(mapZone(/^General,/).getAttribute("aria-pressed")).toBe("true");

    const aside = within(summary());
    expect(aside.getByText("2 × General")).toBeTruthy();
    expect(aside.getByText("(2 entradas)")).toBeTruthy();
    expect(aside.getAllByText(formatEventPrice(360))).toHaveLength(2); // línea y total
    expect(aside.getByText("Precio final, sin cargos ocultos")).toBeTruthy();
    expect(screen.getByText("Total · 2 entradas")).toBeTruthy();

    expect(continueButtons()).toHaveLength(0);
    expect(continueLinks()).toHaveLength(2);
    for (const link of continueLinks()) {
      expect(link.getAttribute("href")).toBe("/checkout?evento=evento-prueba&general=2");
    }

    fireEvent.click(remove("General"));
    expect(within(zoneRow("General")).getByText("1")).toBeTruthy();
    expect(screen.getByText("Total · 1 entrada")).toBeTruthy();
  });

  it("al llegar a 10 entradas en total deshabilita todos los '+' y avisa en el pie", () => {
    renderSelection();
    expect(within(zoneList()).getByRole("status").textContent).toBe("Máximo 10 entradas por compra.");

    for (let i = 0; i < 6; i++) fireEvent.click(add("General"));
    for (let i = 0; i < 4; i++) fireEvent.click(add("VIP"));

    expect(add("General").getAttribute("aria-disabled")).toBe("true");
    expect(add("VIP").getAttribute("aria-disabled")).toBe("true");
    expect(within(zoneList()).getByRole("status").textContent).toBe(
      "Llegaste al máximo de 10 entradas por compra.",
    );

    fireEvent.click(add("VIP"));
    expect(within(zoneRow("VIP")).getByText("4")).toBeTruthy();
    expect(within(summary()).getByText("(10 entradas)")).toBeTruthy();
  });

  it("una zona agotada muestra 'Agotado' sin stepper", () => {
    renderSelection();
    const row = within(zoneRow("Mesa"));

    expect(row.getByText("Agotado")).toBeTruthy();
    expect(row.queryAllByRole("button")).toHaveLength(0);
  });

  it("una zona numerada muestra su precio y 'Elección de asientos próximamente', sin stepper", () => {
    renderSelection();
    fireEvent.click(mapZone(/^Tribuna Norte,/));
    const row = within(zoneRow("Tribuna Norte"));

    expect(row.getByText(`${formatEventPrice(220)} c/u`)).toBeTruthy();
    expect(row.getByText("Elección de asientos próximamente")).toBeTruthy();
    expect(row.queryAllByRole("button")).toHaveLength(0);
    expect(zoneRow("Tribuna Norte").className).toContain("bg-accent");
  });
});
