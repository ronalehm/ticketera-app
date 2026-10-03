import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuthStore } from "../stores/auth.store";
import { AuthHeaderActions } from "./AuthHeaderActions";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

const user = { id: "usr-001", firstName: "Ana", lastName: "Quispe", email: "demo@mentectickets.pe" };

beforeEach(() => {
  navigation.pathname = "/";
  useAuthStore.setState({ user: null });
  localStorage.clear();
});

afterEach(cleanup);

describe("AuthHeaderActions", () => {
  it("sin usuario muestra Iniciar sesión y Crear cuenta", () => {
    render(<AuthHeaderActions variant="bar" />);
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Crear cuenta" }).getAttribute("href")).toBe("/registro");
  });

  it("con usuario guardado muestra el saludo y Cerrar sesión", async () => {
    localStorage.setItem("mentec-auth", JSON.stringify({ state: { user }, version: 0 }));
    render(<AuthHeaderActions variant="bar" />);
    expect(await screen.findByText("Hola, Ana")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
  });

  it("Cerrar sesión borra la sesión y vuelve a los enlaces", async () => {
    useAuthStore.getState().signIn(user);
    render(<AuthHeaderActions variant="bar" />);
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("mentec-auth") ?? "null").state.user).toBeNull();
  });

  it("con usuario muestra el enlace Mis entradas hacia /mis-entradas sin aria-current fuera de esa ruta", async () => {
    useAuthStore.getState().signIn(user);
    render(<AuthHeaderActions variant="bar" />);
    const link = await screen.findByRole("link", { name: "Mis entradas" });
    expect(link.getAttribute("href")).toBe("/mis-entradas");
    expect(link.getAttribute("aria-current")).toBeNull();
  });

  it("sin usuario no muestra Mis entradas", () => {
    render(<AuthHeaderActions variant="bar" />);
    expect(screen.queryByRole("link", { name: "Mis entradas" })).toBeNull();
  });

  it("en /mis-entradas el enlace tiene aria-current=page", async () => {
    navigation.pathname = "/mis-entradas";
    useAuthStore.getState().signIn(user);
    render(<AuthHeaderActions variant="bar" />);
    expect((await screen.findByRole("link", { name: "Mis entradas" })).getAttribute("aria-current")).toBe("page");
  });

  it("variante sheet con usuario muestra Mis entradas y Cerrar sesión", async () => {
    navigation.pathname = "/mis-entradas";
    useAuthStore.getState().signIn(user);
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <AuthHeaderActions variant="sheet" />
        </SheetContent>
      </Sheet>,
    );
    // SheetClose con nativeButton={false} renderiza un <a> con role="button" (Base UI).
    const link = await screen.findByRole("button", { name: "Mis entradas" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/mis-entradas");
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  });

  it("variante sheet sin usuario no muestra Mis entradas", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <AuthHeaderActions variant="sheet" />
        </SheetContent>
      </Sheet>,
    );
    expect(await screen.findByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.queryByText("Mis entradas")).toBeNull();
  });
});
