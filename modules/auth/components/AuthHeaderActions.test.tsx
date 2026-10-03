import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuthStore } from "../stores/auth.store";
import { AuthHeaderActions } from "./AuthHeaderActions";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

const user = { id: "usr-001", firstName: "Ana", lastName: "Quispe", email: "demo@mentectickets.pe" };

const ACCOUNT_BUTTON = "Cuenta de Ana Quispe";

function renderSheet() {
  render(
    <Sheet defaultOpen>
      <SheetContent>
        <AuthHeaderActions variant="sheet" />
      </SheetContent>
    </Sheet>,
  );
}

function storedUser() {
  return JSON.parse(localStorage.getItem("mentec-auth") ?? "null").state.user;
}

beforeEach(() => {
  navigation.pathname = "/";
  useAuthStore.setState({ user: null });
  localStorage.clear();
});

afterEach(cleanup);

describe("AuthHeaderActions (bar)", () => {
  it("sin usuario muestra Iniciar sesión y Crear cuenta, sin botón de cuenta ni Mis entradas", () => {
    render(<AuthHeaderActions variant="bar" />);
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Crear cuenta" }).getAttribute("href")).toBe("/registro");
    expect(screen.queryByRole("button", { name: /^Cuenta de/ })).toBeNull();
    expect(screen.queryByText("Mis entradas")).toBeNull();
  });

  it("con usuario guardado muestra el botón de cuenta tras rehidratar, sin saludo ni enlaces sueltos", async () => {
    localStorage.setItem("mentec-auth", JSON.stringify({ state: { user }, version: 0 }));
    render(<AuthHeaderActions variant="bar" />);

    expect(await screen.findByRole("button", { name: ACCOUNT_BUTTON })).toBeTruthy();
    expect(screen.queryByText(/Hola, Ana/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Mis entradas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });

  it("Cerrar sesión desde el menú borra la sesión y vuelve a los enlaces", async () => {
    useAuthStore.getState().signIn(user);
    render(<AuthHeaderActions variant="bar" />);
    fireEvent.click(await screen.findByRole("button", { name: ACCOUNT_BUTTON }));

    const signOutItem = await screen.findByRole("menuitem", { name: "Cerrar sesión" });
    await act(async () => {
      fireEvent.click(signOutItem);
    });

    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toBeTruthy();
    expect(storedUser()).toBeNull();
  });

  it("en /mis-entradas el item Mis entradas del menú tiene aria-current=page", async () => {
    navigation.pathname = "/mis-entradas";
    useAuthStore.getState().signIn(user);
    render(<AuthHeaderActions variant="bar" />);
    fireEvent.click(await screen.findByRole("button", { name: ACCOUNT_BUTTON }));

    const item = await screen.findByRole("menuitem", { name: "Mis entradas" });
    expect(item.getAttribute("href")).toBe("/mis-entradas");
    expect(item.getAttribute("aria-current")).toBe("page");
  });
});

describe("AuthHeaderActions (sheet)", () => {
  it("con usuario muestra la tarjeta, la navegación Tu cuenta y Cerrar sesión borra la sesión", async () => {
    navigation.pathname = "/mis-entradas";
    useAuthStore.getState().signIn(user);
    renderSheet();

    expect(await screen.findByText("Ana Quispe")).toBeTruthy();
    expect(screen.getByText("demo@mentectickets.pe")).toBeTruthy();

    const nav = screen.getByRole("navigation", { name: "Tu cuenta" });
    // SheetClose con nativeButton={false} renderiza un <a> con role="button" (Base UI).
    const myTickets = within(nav).getByRole("button", { name: "Mis entradas" });
    expect(myTickets.tagName).toBe("A");
    expect(myTickets.getAttribute("href")).toBe("/mis-entradas");
    expect(myTickets.getAttribute("aria-current")).toBe("page");

    const organizer = within(nav).getByRole("button", { name: "Panel de organizador" });
    expect(organizer.tagName).toBe("A");
    expect(organizer.getAttribute("href")).toBe("/organizador");
    expect(organizer.getAttribute("aria-current")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    });
    expect(useAuthStore.getState().user).toBeNull();
    expect(storedUser()).toBeNull();
  });

  it("sin usuario muestra Iniciar sesión y Crear cuenta, sin Tu cuenta ni Mis entradas", async () => {
    renderSheet();
    expect(await screen.findByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Tu cuenta" })).toBeNull();
    expect(screen.queryByText("Mis entradas")).toBeNull();
  });
});
