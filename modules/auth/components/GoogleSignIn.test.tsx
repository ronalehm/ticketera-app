import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GOOGLE_DEMO_ACCOUNT } from "../data/googleAccount.mock";
import { signInWithGoogle } from "../services/googleAuth.service";
import { useAuthStore } from "../stores/auth.store";
import type { AuthUser } from "../types/auth.types";
import { GENERIC_ERROR } from "./formShared";
import { GoogleSignIn } from "./GoogleSignIn";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../services/googleAuth.service", () => ({ signInWithGoogle: vi.fn() }));

const CANCELLED = "Cancelaste el inicio de sesión con Google. Puedes intentarlo de nuevo.";
const ACCOUNT_NAME = "Continuar como Lucía Fernández Rojas, lucia.fernandez@gmail.com";

const googleButton = () => screen.getByRole("button", { name: /Continuar con Google|Conectando con Google…/ });

async function openChooser() {
  fireEvent.click(googleButton());
  return screen.findByRole("dialog", { name: "Elige una cuenta" });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useAuthStore.setState({ user: null });
  localStorage.clear();
});

describe("GoogleSignIn", () => {
  it("renderiza el botón con el logo oculto y el aviso con los tres enlaces en pestaña nueva", () => {
    render(<GoogleSignIn />);

    const button = googleButton();
    expect(button.textContent).toBe("Continuar con Google");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");

    const links = [
      ["Términos y condiciones", "/terminos"],
      ["Política de privacidad", "/privacidad"],
      ["transferencia internacional de tus datos", "/privacidad#transferencia-internacional"],
    ];
    for (const [name, href] of links) {
      const link = screen.getByRole("link", { name });
      expect(link.getAttribute("href")).toBe(href);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("al pulsar el botón abre el selector con la cuenta de ejemplo y 'Cancelar'", async () => {
    render(<GoogleSignIn />);
    const dialog = await openChooser();

    expect(dialog.textContent).toContain("Modo demostración: no se conecta con Google.");
    expect(screen.getByRole("button", { name: ACCOUNT_NAME })).toBeTruthy();
    expect(screen.getByText("Lucía Fernández Rojas")).toBeTruthy();
    expect(screen.getByText("lucia.fernandez@gmail.com")).toBeTruthy();
    expect(screen.getByText("LF")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("al elegir la cuenta muestra 'Conectando con Google…', inicia sesión y navega a /", async () => {
    let resolveSignIn!: (user: AuthUser) => void;
    vi.mocked(signInWithGoogle).mockReturnValue(new Promise((resolve) => (resolveSignIn = resolve)));
    render(<GoogleSignIn />);
    await openChooser();

    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_NAME }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const button = googleButton();
    expect(button.textContent).toBe("Conectando con Google…");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Conectando con Google…");
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);

    await act(async () => resolveSignIn({ ...GOOGLE_DEMO_ACCOUNT }));

    expect(useAuthStore.getState().user?.email).toBe("lucia.fernandez@gmail.com");
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("'Cancelar' muestra la alerta de cancelación, no llama al service ni navega", async () => {
    render(<GoogleSignIn />);
    await openChooser();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect((await screen.findByRole("alert")).textContent).toBe(CANCELLED);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(signInWithGoogle).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    const button = googleButton();
    expect(button.textContent).toBe("Continuar con Google");
    expect(button.getAttribute("aria-busy")).toBeNull();
  });

  it("volver a pulsar el botón quita la alerta y reabre el selector", async () => {
    render(<GoogleSignIn />);
    await openChooser();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await screen.findByRole("alert");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await openChooser();

    expect(screen.queryByText(CANCELLED)).toBeNull();
  });

  it("si el service rechaza, muestra el error genérico y no navega", async () => {
    vi.mocked(signInWithGoogle).mockRejectedValue(new Error("boom"));
    render(<GoogleSignIn />);
    await openChooser();

    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_NAME }));

    expect((await screen.findByRole("alert")).textContent).toBe(GENERIC_ERROR);
    expect(replace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(googleButton().textContent).toBe("Continuar con Google");
  });
});
