import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PurchaseShell } from "./PurchaseShell";

afterEach(cleanup);

const getSteps = () => screen.getByRole("list", { name: "Pasos de la compra" });
const getStepItems = () => within(getSteps()).getAllByRole("listitem");
const getLogoLink = () => screen.getByRole("link", { name: "Mentec Tickets" });

describe("PurchaseShell", () => {
  describe("paso 2 con flecha de vuelta", () => {
    const renderStep2 = () =>
      render(
        <PurchaseShell currentStep={2} back={{ href: "/x", label: "Volver a entradas" }}>
          <p>Contenido del paso</p>
        </PurchaseShell>,
      );

    it("tiene un único banner y un main con los children", () => {
      renderStep2();

      expect(screen.getAllByRole("banner")).toHaveLength(1);
      expect(screen.getAllByRole("main")).toHaveLength(1);
      within(screen.getByRole("main")).getByText("Contenido del paso");
    });

    it("muestra la flecha de vuelta solo por debajo de lg y, ahí, oculta el logo", () => {
      renderStep2();

      const back = screen.getByRole("link", { name: "Volver a entradas" });
      expect(back.getAttribute("href")).toBe("/x");
      expect(back.classList.contains("lg:hidden")).toBe(true);

      const logo = getLogoLink();
      expect(logo.getAttribute("href")).toBe("/");
      expect(logo.classList.contains("max-lg:hidden")).toBe(true);
    });

    it("marca 'Datos y pago' como paso actual y 'Entradas' como completado", () => {
      renderStep2();

      const items = getStepItems();
      expect(items).toHaveLength(3);
      expect(items[0].textContent).toContain("Entradas");
      expect(items[0].textContent).toContain("(completado)");
      expect(items[0].getAttribute("aria-current")).toBeNull();
      expect(items[1].textContent).toContain("Datos y pago");
      expect(items[1].getAttribute("aria-current")).toBe("step");
      expect(items[2].getAttribute("aria-current")).toBeNull();
    });

    it("muestra 'Compra segura' y 'Paso 2 de 3'", () => {
      renderStep2();

      screen.getByText("Compra segura");
      screen.getByText("Paso 2 de 3");
    });
  });

  it("en el paso 3 sin flecha: solo el logo como enlace, visible en todos los anchos, y sin 'Compra segura'", () => {
    render(
      <PurchaseShell currentStep={3}>
        <p>Pedido confirmado</p>
      </PurchaseShell>,
    );

    expect(screen.getAllByRole("link")).toEqual([getLogoLink()]);
    expect(getLogoLink().classList.contains("max-lg:hidden")).toBe(false);
    expect(screen.queryByText("Compra segura")).toBeNull();
    screen.getByText("Paso 3 de 3");

    const items = getStepItems();
    expect(items[2].textContent).toContain("Confirmación");
    expect(items[2].getAttribute("aria-current")).toBe("step");
    expect(items[0].textContent).toContain("(completado)");
    expect(items[1].textContent).toContain("(completado)");
  });

  it("en el paso 1 muestra 'Paso 1 de 3', 'Elige tus entradas' y 'Compra segura'", () => {
    render(
      <PurchaseShell currentStep={1} back={{ href: "/eventos/demo", label: "Volver al evento" }}>
        <p>Selección</p>
      </PurchaseShell>,
    );

    screen.getByText("Paso 1 de 3");
    screen.getByText("Elige tus entradas");
    screen.getByText("Compra segura");
    expect(getStepItems()[0].getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("link", { name: "Volver al evento" }).getAttribute("href")).toBe(
      "/eventos/demo",
    );
  });

  it("sin paso, la cabecera solo tiene el logo: ni pasos, ni 'Paso', ni 'Compra segura'", () => {
    render(
      <PurchaseShell>
        <p>Cargando</p>
      </PurchaseShell>,
    );

    expect(screen.getAllByRole("link")).toEqual([getLogoLink()]);
    expect(screen.queryByRole("list", { name: "Pasos de la compra" })).toBeNull();
    expect(screen.queryByText(/Paso/)).toBeNull();
    expect(screen.queryByText("Compra segura")).toBeNull();
    expect(screen.getByRole("banner").textContent).toBe("");
    within(screen.getByRole("main")).getByText("Cargando");
  });
});
