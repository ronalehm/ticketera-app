import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { completeProfileAction } from "../actions/profile.actions";
import { CompleteProfileForm } from "./CompleteProfileForm";

vi.mock("../actions/profile.actions", () => ({ completeProfileAction: vi.fn() }));

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const submitButton = () =>
  screen.getByRole("button", { name: /Guardar y continuar|Guardando…/ }) as HTMLButtonElement;
const type = (label: string, value: string) => fireEvent.change(input(label), { target: { value } });

function fillValid() {
  type("Celular", "912345678");
  type("Número de documento", "12345678");
  fireEvent.click(screen.getByText(/^Acepto los/));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CompleteProfileForm", () => {
  it("muestra el título, el subtítulo, DNI por defecto y los enlaces legales en otra pestaña", () => {
    render(<CompleteProfileForm redirectUrl={null} />);
    expect(screen.getByRole("heading", { level: 1, name: "Completa tu perfil" })).toBeTruthy();
    expect(screen.getByText("Lo usamos para emitir tus entradas a tu nombre.")).toBeTruthy();
    expect(screen.getByLabelText("Tipo de documento").textContent).toContain("DNI");
    for (const [name, href] of [
      ["Términos y condiciones", "/terminos"],
      ["Política de privacidad", "/privacidad"],
    ]) {
      const link = screen.getByRole("link", { name });
      expect(link.getAttribute("href")).toBe(href);
      expect(link.getAttribute("target")).toBe("_blank");
    }
  });

  it("envío vacío muestra los errores por campo, enfoca 'Celular' y no llama a la acción", () => {
    render(<CompleteProfileForm redirectUrl={null} />);
    fireEvent.click(submitButton());

    for (const message of [
      "Ingresa tu número de celular",
      "Ingresa tu número de documento",
      "Debes aceptar los Términos y condiciones y la Política de privacidad",
    ]) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    expect(input("Celular").getAttribute("aria-invalid")).toBe("true");
    expect(input("Celular").getAttribute("aria-describedby")).toBe("profile-phone-error");
    expect(document.activeElement).toBe(input("Celular"));
    expect(completeProfileAction).not.toHaveBeenCalled();
  });

  it("envío válido muestra 'Guardando…' y llama a la acción con los valores y redirectUrl", async () => {
    let resolveAction!: (value: { error: string }) => void;
    vi.mocked(completeProfileAction).mockReturnValue(new Promise((resolve) => (resolveAction = resolve)));
    render(<CompleteProfileForm redirectUrl="/mis-entradas" />);

    fillValid();
    fireEvent.click(screen.getByText("Quiero recibir novedades y promociones por correo"));
    fireEvent.click(submitButton());

    expect(submitButton().textContent).toContain("Guardando…");
    expect(submitButton().disabled).toBe(true);
    expect(completeProfileAction).toHaveBeenCalledWith(
      {
        phone: "912345678",
        documentType: "dni",
        documentNumber: "12345678",
        acceptTerms: true,
        marketingOptIn: true,
      },
      "/mis-entradas",
    );

    // Tras una redirección la acción no devuelve error: no se muestra ningún Alert.
    await act(async () => resolveAction(undefined as unknown as { error: string }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("muestra el error que devuelve la acción", async () => {
    vi.mocked(completeProfileAction).mockResolvedValue({ error: "Inicia sesión para continuar" });
    render(<CompleteProfileForm redirectUrl={null} />);

    fillValid();
    fireEvent.click(submitButton());

    expect((await screen.findByRole("alert")).textContent).toBe("Inicia sesión para continuar");
    expect(submitButton().disabled).toBe(false);
  });

  it("si la acción falla muestra el error genérico", async () => {
    vi.mocked(completeProfileAction).mockRejectedValue(new Error("network"));
    render(<CompleteProfileForm redirectUrl={null} />);

    fillValid();
    fireEvent.click(submitButton());

    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos completar la solicitud. Inténtalo de nuevo.",
    );
  });
});
