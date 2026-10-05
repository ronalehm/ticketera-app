import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { startCheckout } from "../actions/checkout.actions";
import { StartCheckoutButton } from "./StartCheckoutButton";

vi.mock("../actions/checkout.actions", () => ({ startCheckout: vi.fn() }));

const HREF = "/checkout?evento=noche&platea=2&asientos=platea-A-1,platea-A-2";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StartCheckoutButton", () => {
  it("sin selección → botón deshabilitado y sin formulario", () => {
    const { container } = render(<StartCheckoutButton checkoutHref={null}>Continuar</StartCheckoutButton>);
    const button = screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.querySelector("form")).toBeNull();
  });

  it("con selección → input oculto `selection` con el href y la clase en el botón", () => {
    const { container } = render(
      <StartCheckoutButton checkoutHref={HREF} className="cta">
        Continuar
      </StartCheckoutButton>,
    );
    const input = container.querySelector('input[name="selection"]') as HTMLInputElement;
    expect(input.type).toBe("hidden");
    expect(input.value).toBe(HREF);
    expect(screen.getByRole("button", { name: "Continuar" }).className).toBe("cta");
  });

  it("al enviar llama a la acción con la selección; mientras espera, «Reservando…» y deshabilitado", async () => {
    let finish: (value: { error: string } | null) => void = () => {};
    vi.mocked(startCheckout).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    render(<StartCheckoutButton checkoutHref={HREF}>Continuar</StartCheckoutButton>);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continuar" })));

    expect(startCheckout).toHaveBeenCalledTimes(1);
    const formData = vi.mocked(startCheckout).mock.calls[0][1];
    expect(formData.get("selection")).toBe(HREF);

    const button = screen.getByRole("button", { name: "Reservando…" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");

    await act(async () => finish(null));
    expect((screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("con error → lo muestra con role=alert bajo el botón", async () => {
    const error = "Esos asientos ya no están disponibles. Elige otros para continuar.";
    vi.mocked(startCheckout).mockResolvedValue({ error });
    render(<StartCheckoutButton checkoutHref={HREF}>Continuar</StartCheckoutButton>);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continuar" })));

    expect(screen.getByRole("alert").textContent).toBe(error);
    expect((screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
