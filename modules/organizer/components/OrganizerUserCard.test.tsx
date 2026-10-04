import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizerUserCard } from "./OrganizerUserCard";

const session = vi.hoisted(() => ({
  isLoaded: true,
  user: null as { firstName: string; lastName: string; email: string } | null,
  signOut: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/modules/auth/session", () => ({ useSessionUser: () => session }));

const user = { firstName: "Ana", lastName: "Quispe", email: "demo@mentectickets.pe" };

beforeEach(() => {
  session.isLoaded = true;
  session.user = null;
  session.signOut.mockClear();
});

afterEach(cleanup);

describe("OrganizerUserCard", () => {
  it("con usuario muestra nombre completo, correo e iniciales", () => {
    session.user = user;
    render(<OrganizerUserCard />);

    expect(screen.getByText("Ana Quispe")).toBeTruthy();
    expect(screen.getByText("demo@mentectickets.pe")).toBeTruthy();
    expect(screen.getByText("AQ")).toBeTruthy();
  });

  it("Cerrar sesión llama al signOut de la sesión", () => {
    session.user = user;
    render(<OrganizerUserCard />);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(session.signOut).toHaveBeenCalledTimes(1);
  });

  it("sin usuario muestra el enlace Iniciar sesión y no el botón Cerrar sesión", () => {
    render(<OrganizerUserCard />);

    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });

  it("mientras Clerk carga no muestra ni el usuario ni Iniciar sesión", () => {
    session.isLoaded = false;
    const { container } = render(<OrganizerUserCard />);

    expect(container.textContent).toBe("");
  });
});
