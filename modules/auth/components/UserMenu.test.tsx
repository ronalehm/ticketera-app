import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UserMenu } from "./UserMenu";

const TRIGGER_NAME = "Cuenta de Ronald Eleazar Mendoza Huamán";
const EMAIL = "ronald.eleazar.mendoza.huaman@correo-ejemplo.pe";

function renderMenu({
  pathname = "/",
  onSignOut = vi.fn(),
  role = "organizer",
}: { pathname?: string; onSignOut?: () => void; role?: "customer" | "organizer" | "admin" | "super_admin" } = {}) {
  render(
    <UserMenu
      firstName="Ronald Eleazar"
      lastName="Mendoza Huamán"
      email={EMAIL}
      role={role}
      pathname={pathname}
      onSignOut={onSignOut}
    />,
  );
  return { trigger: screen.getByRole("button", { name: TRIGGER_NAME }), onSignOut };
}

async function openMenu(trigger: HTMLElement) {
  fireEvent.click(trigger);
  return screen.findByRole("menu");
}

afterEach(cleanup);

describe("UserMenu", () => {
  it("el disparador tiene nombre accesible, aria-haspopup y aria-expanded=false, con el primer nombre y las iniciales", () => {
    const { trigger } = renderMenu();
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.textContent).toContain("Ronald");
    expect(trigger.textContent).toContain("RM");
  });

  it("al hacer clic abre el menú con la tarjeta y los items en orden", async () => {
    const { trigger } = renderMenu();
    await openMenu(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const group = screen.getByRole("group", { name: /Ronald Eleazar Mendoza Huamán/ });
    expect(group.getAttribute("aria-labelledby")).toBeTruthy();
    expect(screen.getByRole("group", { name: new RegExp(EMAIL.replaceAll(".", "\\.")) })).toBe(group);

    const items = screen.getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Mi perfil",
      "Mis entradas",
      "Panel de organizador",
      "Cerrar sesión",
    ]);
    expect(items[0].tagName).toBe("A");
    expect(items[0].getAttribute("href")).toBe("/perfil");
    expect(items[1].tagName).toBe("A");
    expect(items[1].getAttribute("href")).toBe("/mis-entradas");
    expect(items[2].tagName).toBe("A");
    expect(items[2].getAttribute("href")).toBe("/organizador");
  });

  it("un cliente no ve el enlace al panel", async () => {
    const { trigger } = renderMenu({ role: "customer" });
    await openMenu(trigger);

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Mi perfil",
      "Mis entradas",
      "Cerrar sesión",
    ]);
  });

  it.each(["admin", "super_admin"] as const)("%s ve el enlace como Panel", async (role) => {
    const { trigger } = renderMenu({ role });
    await openMenu(trigger);

    const panel = screen.getByRole("menuitem", { name: "Panel" });
    expect(panel.getAttribute("href")).toBe("/organizador");
    expect(screen.queryByRole("menuitem", { name: "Panel de organizador" })).toBeNull();
  });

  it("marca con aria-current=page el enlace de la ruta actual", async () => {
    const { trigger } = renderMenu({ pathname: "/mis-entradas" });
    await openMenu(trigger);

    expect(screen.getByRole("menuitem", { name: "Mis entradas" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("menuitem", { name: "Mi perfil" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Panel de organizador" }).getAttribute("aria-current")).toBeNull();
  });

  it("en /perfil marca Mi perfil con aria-current=page", async () => {
    const { trigger } = renderMenu({ pathname: "/perfil" });
    await openMenu(trigger);

    expect(screen.getByRole("menuitem", { name: "Mi perfil" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("menuitem", { name: "Mis entradas" }).getAttribute("aria-current")).toBeNull();
  });

  it("se maneja con teclado: foco en el primer item, flecha abajo avanza y Escape cierra devolviendo el foco", async () => {
    const { trigger } = renderMenu();
    const menu = await openMenu(trigger);

    const first = screen.getByRole("menuitem", { name: "Mi perfil" });
    await waitFor(() => expect(document.activeElement).toBe(first));

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Mis entradas" })));

    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("Cerrar sesión llama a onSignOut una vez y cierra el menú", async () => {
    const { trigger, onSignOut } = renderMenu();
    await openMenu(trigger);

    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));
    });

    expect(onSignOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
