import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "../stores/auth.store";
import { UserProfile } from "./UserProfile";

const SIGNED_OUT_TITLE = "Inicia sesión para ver tu perfil";

const legacyUser = { id: "usr-002", firstName: "Ana", lastName: "Pérez", email: "ana@correo.pe" };

const demo = {
  id: "usr-001",
  firstName: "Ana",
  lastName: "Quispe",
  email: "demo@mentectickets.pe",
  phone: "987654321",
  documentType: "dni",
  documentNumber: "45781236",
  createdAt: "2025-03-14T15:00:00.000Z",
};

// Siembra localStorage con la forma que guarda `persist`, como en una recarga real.
function seedStorage(user: object | null) {
  localStorage.setItem("mentec-auth", JSON.stringify({ state: { user }, version: 0 }));
}

beforeEach(() => {
  useAuthStore.setState({ user: null });
  localStorage.clear(); // setState también persiste
});

afterEach(cleanup);

describe("UserProfile", () => {
  it("muestra el h1 y el estado cargando antes de rehidratar", async () => {
    seedStorage(demo);
    render(<UserProfile />);

    expect(screen.getByRole("heading", { level: 1, name: "Mi perfil" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Cargando tu perfil…");
    await screen.findByRole("heading", { level: 2, name: "Ana Quispe" });
  });

  it("sin sesión muestra Inicia sesión para ver tu perfil con enlace a /login", async () => {
    seedStorage(null);
    render(<UserProfile />);

    expect(await screen.findByRole("heading", { level: 2, name: SIGNED_OUT_TITLE })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("con la sesión demo muestra la tarjeta con todos los datos y nunca el estado sin sesión", async () => {
    seedStorage(demo);
    // Registra cada cambio del DOM para comprobar que el estado sin sesión no aparece ni un instante.
    let sawSignedOut = false;
    const observer = new MutationObserver(() => {
      sawSignedOut ||= document.body.textContent?.includes(SIGNED_OUT_TITLE) ?? false;
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    render(<UserProfile />);

    expect(await screen.findByRole("heading", { level: 2, name: "Ana Quispe" })).toBeTruthy();
    observer.disconnect();
    expect(sawSignedOut).toBe(false);
    expect(screen.getByRole("region", { name: "Ana Quispe" })).toBeTruthy();
    expect(screen.getByText("AQ")).toBeTruthy();
    expect(screen.getByText("987654321")).toBeTruthy();
    expect(screen.getByText("DNI 45781236")).toBeTruthy();
    expect(screen.getByText("marzo de 2025")).toBeTruthy();
    expect(screen.queryByText("No registrado")).toBeNull();
    expect(screen.queryByText(SIGNED_OUT_TITLE)).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("con una sesión antigua de 4 campos muestra No registrado en celular, documento y fecha de alta", async () => {
    seedStorage(legacyUser);
    render(<UserProfile />);

    expect(await screen.findByRole("heading", { level: 2, name: "Ana Pérez" })).toBeTruthy();
    expect(screen.getAllByText("No registrado")).toHaveLength(3);
  });
});
