import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "../stores/auth.store";
import { AuthHeaderActions } from "./AuthHeaderActions";

const user = { id: "usr-001", firstName: "Ana", lastName: "Quispe", email: "demo@mentectickets.pe" };

beforeEach(() => {
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
});
