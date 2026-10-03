import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { subscribeToNewsletter } from "../services/newsletter.service";
import { NewsletterForm } from "./NewsletterForm";

vi.mock("../services/newsletter.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/newsletter.service")>()),
  subscribeToNewsletter: vi.fn(),
}));

const SUCCESS_MESSAGE = "¡Listo! Te enviaremos las novedades a ana@correo.pe.";

const emailInput = () => screen.getByLabelText("Correo electrónico") as HTMLInputElement;
const submitButton = () => screen.getByRole("button", { name: /Suscribirme|Suscribiendo…/ }) as HTMLButtonElement;
const statusRegion = () => screen.getByRole("status");

function typeAndSubmit(email: string) {
  fireEvent.change(emailInput(), { target: { value: email } });
  fireEvent.click(submitButton());
}

async function subscribeSuccessfully() {
  let resolveSubscribe!: () => void;
  vi.mocked(subscribeToNewsletter).mockReturnValue(new Promise<void>((resolve) => (resolveSubscribe = resolve)));
  render(<NewsletterForm />);

  typeAndSubmit("  ana@correo.pe ");
  await act(async () => resolveSubscribe());
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NewsletterForm", () => {
  it("renderiza el campo de correo accesible, el botón y una región de estado vacía", () => {
    render(<NewsletterForm />);

    expect(emailInput().type).toBe("email");
    expect(emailInput().placeholder).toBe("tu@email.com");
    expect(submitButton().textContent).toBe("Suscribirme");
    expect(statusRegion().textContent).toBe("");
  });

  it("envío vacío muestra el error, enfoca el input y no llama al service", () => {
    render(<NewsletterForm />);
    fireEvent.click(submitButton());

    expect(screen.getByText("Ingresa tu correo electrónico")).toBeTruthy();
    expect(emailInput().getAttribute("aria-invalid")).toBe("true");
    expect(emailInput().getAttribute("aria-describedby")).toBe("newsletter-email-error");
    expect(document.activeElement).toBe(emailInput());
    expect(subscribeToNewsletter).not.toHaveBeenCalled();
  });

  it("correo inválido muestra el error y desaparece al corregirlo y salir del campo", () => {
    render(<NewsletterForm />);
    typeAndSubmit("ana@correo");

    expect(screen.getByText("Ingresa un correo electrónico válido")).toBeTruthy();
    expect(subscribeToNewsletter).not.toHaveBeenCalled();

    fireEvent.change(emailInput(), { target: { value: "ana@correo.pe" } });
    fireEvent.blur(emailInput());

    expect(screen.queryByText("Ingresa un correo electrónico válido")).toBeNull();
    expect(emailInput().getAttribute("aria-invalid")).toBeNull();
    expect(emailInput().getAttribute("aria-describedby")).toBeNull();
  });

  it("envío válido muestra 'Suscribiendo…', llama al service con el correo recortado y anuncia el éxito", async () => {
    let resolveSubscribe!: () => void;
    vi.mocked(subscribeToNewsletter).mockReturnValue(new Promise<void>((resolve) => (resolveSubscribe = resolve)));
    render(<NewsletterForm />);

    typeAndSubmit("  ana@correo.pe ");

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain("Suscribiendo…");
    expect(subscribeToNewsletter).toHaveBeenCalledWith("ana@correo.pe");
    expect(statusRegion().textContent).toBe("");

    await act(async () => resolveSubscribe());

    expect(statusRegion().textContent).toBe(SUCCESS_MESSAGE);
    expect(submitButton().textContent).toBe("Suscribirme");
    expect(submitButton().disabled).toBe(false);
  });

  it("tras el éxito, editar el campo vacía la región de estado", async () => {
    await subscribeSuccessfully();
    expect(statusRegion().textContent).toBe(SUCCESS_MESSAGE);

    fireEvent.change(emailInput(), { target: { value: "ana@correo.p" } });

    expect(statusRegion().textContent).toBe("");
  });
});
