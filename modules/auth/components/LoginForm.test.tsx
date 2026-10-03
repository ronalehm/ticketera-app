import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthError, login } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import type { AuthUser } from "../types/auth.types";
import { LoginForm } from "./LoginForm";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../services/auth.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/auth.service")>()),
  login: vi.fn(),
}));

const USER: AuthUser = { id: "usr-001", firstName: "Ana", lastName: "Quispe", email: "demo@mentectickets.pe" };

const emailInput = () => screen.getByLabelText("Correo electrónico") as HTMLInputElement;
const passwordInput = () => screen.getByLabelText("Contraseña") as HTMLInputElement;
const submitButton = () => screen.getByRole("button", { name: /Iniciar sesión|Ingresando…/ }) as HTMLButtonElement;

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(emailInput(), { target: { value: email } });
  fireEvent.change(passwordInput(), { target: { value: password } });
  fireEvent.click(submitButton());
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useAuthStore.setState({ user: null });
  localStorage.clear();
});

describe("LoginForm", () => {
  it("envío vacío muestra los errores, enfoca el correo y no llama al service", () => {
    render(<LoginForm />);
    fireEvent.click(submitButton());

    expect(screen.getByText("Ingresa tu correo electrónico")).toBeTruthy();
    expect(screen.getByText("Ingresa tu contraseña")).toBeTruthy();
    expect(emailInput().getAttribute("aria-invalid")).toBe("true");
    expect(emailInput().getAttribute("aria-describedby")).toBe("login-email-error");
    expect(document.activeElement).toBe(emailInput());
    expect(login).not.toHaveBeenCalled();
  });

  it("envío válido muestra 'Ingresando…', guarda el usuario y navega a /", async () => {
    let resolveLogin!: (user: AuthUser) => void;
    vi.mocked(login).mockReturnValue(new Promise((resolve) => (resolveLogin = resolve)));
    render(<LoginForm />);

    fillAndSubmit("  demo@mentectickets.pe ", "Mentec2026");

    expect(submitButton().textContent).toContain("Ingresando…");
    expect(submitButton().disabled).toBe(true);
    expect(login).toHaveBeenCalledWith({ email: "demo@mentectickets.pe", password: "Mentec2026" });

    await act(async () => resolveLogin(USER));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(useAuthStore.getState().user).toEqual(USER);
  });

  it("AuthError muestra el Alert y no navega", async () => {
    vi.mocked(login).mockRejectedValue(new AuthError("invalid-credentials", "Correo o contraseña incorrectos"));
    render(<LoginForm />);

    fillAndSubmit("demo@mentectickets.pe", "incorrecta");

    expect((await screen.findByRole("alert")).textContent).toBe("Correo o contraseña incorrectos");
    expect(replace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("un error desconocido muestra el mensaje genérico", async () => {
    vi.mocked(login).mockRejectedValue(new Error("network"));
    render(<LoginForm />);

    fillAndSubmit("demo@mentectickets.pe", "Mentec2026");

    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos completar la solicitud. Inténtalo de nuevo.",
    );
  });

  it("el botón de mostrar contraseña alterna type, aria-label y aria-pressed", () => {
    render(<LoginForm />);
    expect(passwordInput().type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(passwordInput().type).toBe("text");
    const hide = screen.getByRole("button", { name: "Ocultar contraseña" });
    expect(hide.getAttribute("aria-pressed")).toBe("true");
    expect(hide.getAttribute("type")).toBe("button");

    fireEvent.click(hide);
    expect(passwordInput().type).toBe("password");
    expect(screen.getByRole("button", { name: "Mostrar contraseña" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("muestra el título, el subtítulo y los enlaces de recuperar contraseña y crear cuenta", () => {
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).getAttribute("href")).toBe(
      "/recuperar-contrasena",
    );
    expect(screen.getByRole("link", { name: "Crea una gratis" }).getAttribute("href")).toBe("/registro");
    expect(screen.getByRole("heading", { level: 1, name: "Hola de nuevo" })).toBeTruthy();
    expect(screen.getByText("Ingresa para ver tus entradas y comprar más rápido.")).toBeTruthy();
  });
});
