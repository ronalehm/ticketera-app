import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/modules/auth/session";
import { OrganizerUserCard } from "./OrganizerUserCard";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const user = { id: "usr-001", firstName: "Ana", lastName: "Quispe", email: "demo@mentectickets.pe" };

beforeEach(() => {
  router.push.mockClear();
  useAuthStore.setState({ user: null });
  localStorage.clear();
});

afterEach(cleanup);

describe("OrganizerUserCard", () => {
  it("con usuario muestra nombre completo, correo e iniciales", () => {
    useAuthStore.setState({ user });
    render(<OrganizerUserCard />);

    expect(screen.getByText("Ana Quispe")).toBeTruthy();
    expect(screen.getByText("demo@mentectickets.pe")).toBeTruthy();
    expect(screen.getByText("AQ")).toBeTruthy();
  });

  it("Cerrar sesión borra la sesión y navega al inicio", () => {
    useAuthStore.setState({ user });
    render(<OrganizerUserCard />);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(useAuthStore.getState().user).toBeNull();
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/");
  });

  it("sin usuario muestra el enlace Iniciar sesión y no el botón Cerrar sesión", () => {
    render(<OrganizerUserCard />);

    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });

  it("con la sesión guardada muestra el usuario tras rehidratar al montar", async () => {
    localStorage.setItem("mentec-auth", JSON.stringify({ state: { user }, version: 0 }));
    render(<OrganizerUserCard />);

    expect(await screen.findByText("Ana Quispe")).toBeTruthy();
  });
});
