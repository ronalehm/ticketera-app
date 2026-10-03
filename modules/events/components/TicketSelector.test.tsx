import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { TicketType } from "../types/events.types";
import { TicketSelector } from "./TicketSelector";

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
    expect(remove("General").disabled).toBe(true);

    fireEvent.click(add("General"));
    fireEvent.click(remove("General"));
    fireEvent.click(remove("General"));

    expect(remove("General").disabled).toBe(true);
    expect(screen.getByText("S/ 0.00")).toBeTruthy();
  });

  it("con 10 entradas deshabilita todos los '+' y muestra el límite", () => {
    renderSelector();
    for (let i = 0; i < 10; i++) fireEvent.click(add("General"));

    expect(add("General").disabled).toBe(true);
    expect(add("VIP").disabled).toBe(true);
    expect(screen.getByText("Máximo 10 entradas por compra")).toBeTruthy();
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
