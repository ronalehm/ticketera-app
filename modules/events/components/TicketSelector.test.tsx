import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TicketType } from "../types/events.types";
import { PreselectedTicketSelector } from "./PreselectedTicketSelector";
import { TicketSelector } from "./TicketSelector";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams("general=2&vip=1"),
}));

const TYPES: TicketType[] = [
  { id: "general", name: "General", price: 180, status: "available" },
  { id: "vip", name: "VIP", price: 550, status: "low-stock" },
  { id: "palco", name: "Palco", price: 900, status: "sold-out" },
];

const renderSelector = (status: TicketType["status"] = "available", ticketTypes = TYPES) =>
  render(<TicketSelector slug="mi-evento" status={status} priceFrom={180} ticketTypes={ticketTypes} />);

const add = (name: string) => screen.getByRole("button", { name: `Añadir una entrada ${name}` }) as HTMLButtonElement;
const remove = (name: string) => screen.getByRole("button", { name: `Quitar una entrada ${name}` }) as HTMLButtonElement;
const cta = () => screen.getByText("Continuar con la compra");
const total = () => screen.getByText("Total").nextElementSibling?.textContent;

afterEach(cleanup);

describe("TicketSelector", () => {
  it("'+' incrementa la cantidad y actualiza el total", () => {
    renderSelector();
    fireEvent.click(add("General"));
    fireEvent.click(add("General"));
    fireEvent.click(add("VIP"));

    expect(add("General").parentElement?.textContent).toContain("2");
    expect(screen.getByText("S/ 910.00")).toBeTruthy();
  });

  it("'−' no baja de 0", () => {
    renderSelector();
    expect(remove("General").getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(add("General"));
    fireEvent.click(remove("General"));
    fireEvent.click(remove("General"));

    expect(remove("General").getAttribute("aria-disabled")).toBe("true");
    expect(remove("General").parentElement?.textContent).toContain("0");
    expect(screen.getByText("S/ 0.00")).toBeTruthy();
  });

  it("con 10 entradas deshabilita todos los '+' (sin cambiar cantidades) y muestra el límite", () => {
    renderSelector();
    for (let i = 0; i < 10; i++) fireEvent.click(add("General"));

    expect(add("General").getAttribute("aria-disabled")).toBe("true");
    expect(add("VIP").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Máximo 10 entradas por compra")).toBeTruthy();

    fireEvent.click(add("VIP"));
    expect(add("VIP").parentElement?.textContent).toContain("0");
    expect(add("General").parentElement?.textContent).toContain("10");
  });

  it("'+' conserva el foco al llegar al límite", () => {
    renderSelector();
    const plus = add("General");
    plus.focus();
    for (let i = 0; i < 10; i++) fireEvent.click(plus);

    expect(plus.getAttribute("aria-disabled")).toBe("true");
    expect(plus.disabled).toBe(false);
    expect(document.activeElement).toBe(plus);
  });

  it("un tipo agotado muestra 'Agotado' y sus controles están deshabilitados; low-stock muestra 'Últimas entradas'", () => {
    renderSelector();
    expect(screen.getByText("Agotado")).toBeTruthy();
    expect(screen.getByText("Últimas entradas")).toBeTruthy();
    expect(add("Palco").disabled).toBe(true);
    expect(remove("Palco").disabled).toBe(true);
  });

  it("CTA deshabilitado con 0 entradas y enlace al checkout con cantidades", () => {
    renderSelector();
    expect(cta().tagName).toBe("BUTTON");
    expect((cta() as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(add("General"));
    fireEvent.click(add("General"));

    expect(cta().closest("a")?.getAttribute("href")).toBe("/checkout?evento=mi-evento&general=2");
  });

  it("evento agotado muestra 'Entradas agotadas' sin controles ni CTA", () => {
    renderSelector(
      "sold-out",
      TYPES.map((type) => ({ ...type, status: "sold-out" })),
    );
    expect(screen.getByText("Entradas agotadas")).toBeTruthy();
    expect(screen.queryByText("Continuar con la compra")).toBeNull();
    expect(screen.queryByRole("button", { name: /Añadir una entrada/ })).toBeNull();
  });
});

describe("TicketSelector con initialQuantities", () => {
  it("precarga cantidades, total y enlace desde el primer render, y '−' las cambia", () => {
    render(
      <TicketSelector
        slug="mi-evento"
        status="available"
        priceFrom={180}
        ticketTypes={TYPES}
        initialQuantities={{ general: 2 }}
      />,
    );

    expect(add("General").parentElement?.textContent).toContain("2");
    expect(total()).toBe("S/ 360.00");
    expect(cta().closest("a")?.getAttribute("href")).toBe("/checkout?evento=mi-evento&general=2");

    fireEvent.click(remove("General"));

    expect(add("General").parentElement?.textContent).toContain("1");
    expect(total()).toBe("S/ 180.00");
    expect(cta().closest("a")?.getAttribute("href")).toBe("/checkout?evento=mi-evento&general=1");
  });

  it("en un evento agotado ignora initialQuantities y muestra 'Entradas agotadas' sin controles", () => {
    render(
      <TicketSelector
        slug="mi-evento"
        status="sold-out"
        priceFrom={180}
        ticketTypes={TYPES}
        initialQuantities={{ general: 2 }}
      />,
    );

    expect(screen.getByText("Entradas agotadas")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Añadir una entrada/ })).toBeNull();
    expect(screen.queryByText("Continuar con la compra")).toBeNull();
  });
});

describe("PreselectedTicketSelector", () => {
  it("precarga las cantidades de la URL", () => {
    render(<PreselectedTicketSelector slug="mi-evento" status="available" priceFrom={180} ticketTypes={TYPES} />);

    expect(add("General").parentElement?.textContent).toContain("2");
    expect(add("VIP").parentElement?.textContent).toContain("1");
    expect(total()).toBe("S/ 910.00");
    expect(cta().closest("a")?.getAttribute("href")).toBe("/checkout?evento=mi-evento&general=2&vip=1");
  });
});
