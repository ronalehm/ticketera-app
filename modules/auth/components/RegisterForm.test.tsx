import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthError, register } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";
import type { AuthUser } from "../types/auth.types";
import { RegisterForm } from "./RegisterForm";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../services/auth.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/auth.service")>()),
  register: vi.fn(),
}));

const USER: AuthUser = { id: "usr-002", firstName: "Luis", lastName: "Pérez", email: "luis@correo.pe" };

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const submitButton = () => screen.getByRole("button", { name: /Crear cuenta|Creando cuenta…/ }) as HTMLButtonElement;
const type = (label: string, value: string) => fireEvent.change(input(label), { target: { value } });

function fillValid(email = "luis@correo.pe") {
  type("Nombres", "Luis");
  type("Apellidos", "Pérez");
  type("Correo electrónico", email);
  type("Celular", "912345678");
  type("Número de documento", "12345678");
  type("Contraseña", "Clave2026");
  type("Confirmar contraseña", "Clave2026");
  fireEvent.click(screen.getByText(/^Acepto los/));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useAuthStore.setState({ user: null });
  localStorage.clear();
});

describe("RegisterForm", () => {
  it("envío vacío muestra los errores (incluido Términos), enfoca 'Nombres' y no llama al service", () => {
    render(<RegisterForm />);
    fireEvent.click(submitButton());

    for (const message of [
      "Ingresa tus nombres",
      "Ingresa tus apellidos",
      "Ingresa tu correo electrónico",
      "Ingresa tu número de celular",
      "Ingresa tu número de documento",
      "Ingresa una contraseña",
      "Confirma tu contraseña",
      "Debes aceptar los Términos y condiciones y la Política de privacidad",
    ]) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    expect(input("Nombres").getAttribute("aria-invalid")).toBe("true");
    expect(input("Nombres").getAttribute("aria-describedby")).toBe("register-firstName-error");
    expect(document.activeElement).toBe(input("Nombres"));
    expect(register).not.toHaveBeenCalled();
  });

  it("tras el primer envío, contraseñas distintas muestran el error al salir de 'Confirmar contraseña'", () => {
    render(<RegisterForm />);
    fireEvent.click(submitButton());

    type("Contraseña", "Clave2026");
    type("Confirmar contraseña", "Otra2026");
    expect(screen.queryByText("Las contraseñas no coinciden")).toBeNull();

    fireEvent.blur(input("Confirmar contraseña"));
    expect(screen.getByText("Las contraseñas no coinciden")).toBeTruthy();
  });

  it("envío válido muestra 'Creando cuenta…', guarda el usuario y navega a /", async () => {
    let resolveRegister!: (user: AuthUser) => void;
    vi.mocked(register).mockReturnValue(new Promise((resolve) => (resolveRegister = resolve)));
    render(<RegisterForm />);

    fillValid();
    fireEvent.click(submitButton());

    expect(submitButton().textContent).toContain("Creando cuenta…");
    expect(submitButton().disabled).toBe(true);
    expect(register).toHaveBeenCalledWith({
      firstName: "Luis",
      lastName: "Pérez",
      email: "luis@correo.pe",
      phone: "912345678",
      documentType: "dni",
      documentNumber: "12345678",
      password: "Clave2026",
      confirmPassword: "Clave2026",
      acceptTerms: true,
      marketingOptIn: false,
    });

    await act(async () => resolveRegister(USER));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(useAuthStore.getState().user).toEqual(USER);
  });

  it("email-taken muestra el Alert y no navega", async () => {
    vi.mocked(register).mockRejectedValue(new AuthError("email-taken", "Ya existe una cuenta con este correo"));
    render(<RegisterForm />);

    fillValid("demo@mentectickets.pe");
    fireEvent.click(submitButton());

    expect((await screen.findByRole("alert")).textContent).toBe("Ya existe una cuenta con este correo");
    expect(replace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("muestra el título, DNI por defecto y los enlaces", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("heading", { level: 1, name: "Crear cuenta" })).toBeTruthy();
    expect(screen.getByLabelText("Tipo de documento").textContent).toContain("DNI");
    expect(input("Número de documento").maxLength).toBe(8);
    expect(screen.getByRole("link", { name: "Términos y condiciones" }).getAttribute("href")).toBe("/terminos");
    expect(screen.getByRole("link", { name: "Política de privacidad" }).getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
  });
});
