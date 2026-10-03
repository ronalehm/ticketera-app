import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/modules/auth/session";
import { PaymentError, processMockPayment } from "../services/payment.service";
import { useOrdersStore } from "../stores/orders.store";
import type { CheckoutOrder, Order } from "../types/checkout.types";
import { CheckoutForm } from "./CheckoutForm";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../services/payment.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/payment.service")>()),
  processMockPayment: vi.fn(),
}));

const ORDER: CheckoutOrder = {
  event: {
    slug: "noche-de-sintetizadores-lima",
    title: "Noche de Sintetizadores",
    category: "conciertos",
    startsAt: "2026-11-14T21:00:00-05:00",
    venue: "Estadio",
    city: "Lima",
    imageUrl: "/images/evento.jpg",
  },
  items: [
    { ticketTypeId: "general", name: "General", unitPrice: 250, quantity: 2 },
    { ticketTypeId: "vip", name: "VIP", unitPrice: 410, quantity: 1 },
  ],
  quantities: { general: 2, vip: 1 },
  ticketCount: 3,
  total: 910,
};

const BUYER = {
  firstName: "Luis",
  lastName: "Pérez",
  email: "luis@correo.pe",
  phone: "912345678",
  documentType: "dni",
  documentNumber: "12345678",
} as const;

const PAID_ORDER: Order = {
  code: "MT-AB12CD",
  createdAt: "2026-10-03T15:00:00.000Z",
  ownerEmail: BUYER.email,
  event: ORDER.event,
  items: ORDER.items,
  ticketCount: 3,
  total: 910,
  paymentMethod: "card",
  buyer: BUYER,
  tickets: [
    { code: "MT-AB12CD-01", ticketTypeName: "General", holderName: "Luis Pérez" },
    { code: "MT-AB12CD-02", ticketTypeName: "General", holderName: "Luis Pérez" },
    { code: "MT-AB12CD-03", ticketTypeName: "VIP", holderName: "Luis Pérez" },
  ],
};

const SESSION_USER = { id: "usr-001", firstName: "Ana", lastName: "Quispe", email: "ana@correo.pe" };

const DECLINED_MESSAGE = "Tu tarjeta fue rechazada. Prueba con otra tarjeta o elige otro método de pago.";

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => fireEvent.change(input(label), { target: { value } });
// Dos botones "Pagar" en el DOM: el del panel (lg) y el de la barra inferior (móvil).
const payButtons = () =>
  screen.getAllByRole("button", { name: /Pagar S\/|Procesando pago…/ }) as HTMLButtonElement[];
const pay = () => fireEvent.click(payButtons()[0]);

function renderForm() {
  return render(<CheckoutForm order={ORDER} changeHref="/eventos/noche-de-sintetizadores-lima" summary={<p>Resumen</p>} />);
}

function fillBuyer() {
  type("Nombres", BUYER.firstName);
  type("Apellidos", BUYER.lastName);
  type("Correo electrónico", BUYER.email);
  type("Celular", BUYER.phone);
  type("Número de documento", BUYER.documentNumber);
  fireEvent.click(screen.getByText(/^Acepto los/));
}

function fillCard(number = "4242424242424242") {
  type("Número de tarjeta", number);
  type("Vencimiento", "1230");
  type("CVV", "739");
  type("Nombre en la tarjeta", "Luis Pérez");
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  useAuthStore.setState({ user: null });
  useOrdersStore.setState({ orders: [] });
  localStorage.clear();
});

describe("CheckoutForm", () => {
  it("muestra los botones 'Pagar' con el total del pedido", () => {
    renderForm();
    const buttons = payButtons();
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.textContent).toBe("Pagar S/ 910.00");
      expect(button.type).toBe("submit");
    }
  });

  it("envío vacío muestra los errores (comprador, tarjeta y Términos), enfoca 'Nombres' y no llama al service", () => {
    renderForm();
    pay();

    for (const message of [
      "Ingresa tus nombres",
      "Ingresa tus apellidos",
      "Ingresa tu correo electrónico",
      "Ingresa tu número de celular",
      "Ingresa tu número de documento",
      "Ingresa el número de tarjeta",
      "Ingresa la fecha de vencimiento",
      "Ingresa el CVV",
      "Ingresa el nombre que figura en la tarjeta",
      "Debes aceptar los Términos y condiciones y la Política de privacidad",
    ]) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    expect(input("Nombres").getAttribute("aria-describedby")).toBe("checkout-firstName-error");
    expect(document.activeElement).toBe(input("Nombres"));
    expect(processMockPayment).not.toHaveBeenCalled();
  });

  it("formatea el número de tarjeta y el vencimiento al escribir", () => {
    renderForm();
    type("Número de tarjeta", "4242424242424242");
    type("Vencimiento", "1230");
    expect(input("Número de tarjeta").value).toBe("4242 4242 4242 4242");
    expect(input("Vencimiento").value).toBe("12/30");
  });

  it("con Yape oculta la tarjeta, muestra su texto y el envío válido paga con { method: 'yape' }", async () => {
    vi.mocked(processMockPayment).mockResolvedValue({ ...PAID_ORDER, paymentMethod: "yape" });
    renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "Yape" }));
    expect(screen.queryByLabelText("Número de tarjeta")).toBeNull();
    expect(screen.getByText(/código QR para pagar desde tu app de Yape/)).toBeTruthy();

    fillBuyer();
    pay();

    expect(processMockPayment).toHaveBeenCalledWith({ order: ORDER, buyer: BUYER, payment: { method: "yape" } });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout/confirmacion?orden=MT-AB12CD"));
  });

  it("envío válido con tarjeta muestra 'Procesando pago…', guarda la orden y navega a la confirmación", async () => {
    let resolvePayment!: (order: Order) => void;
    vi.mocked(processMockPayment).mockReturnValue(new Promise((resolve) => (resolvePayment = resolve)));
    renderForm();

    fillBuyer();
    fillCard();
    pay();

    for (const button of payButtons()) {
      expect(button.textContent).toBe("Procesando pago…");
      expect(button.disabled).toBe(true);
    }
    expect(screen.getByRole("status").textContent).toBe("Procesando pago…");
    expect(processMockPayment).toHaveBeenCalledWith({
      order: ORDER,
      buyer: BUYER,
      payment: { method: "card", cardNumber: "4242424242424242" },
    });

    await act(async () => resolvePayment(PAID_ORDER));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout/confirmacion?orden=MT-AB12CD"));
    expect(useOrdersStore.getState().getOrder("MT-AB12CD")).toEqual(PAID_ORDER);
    const stored = localStorage.getItem("mentec-orders") ?? "";
    expect(stored).toContain("MT-AB12CD");
    expect(stored).not.toContain("4242");
    expect(stored).not.toContain("739");
  });

  it("tarjeta rechazada muestra el Alert con el foco, reactiva los botones y no navega ni guarda", async () => {
    vi.mocked(processMockPayment).mockRejectedValue(new PaymentError());
    renderForm();

    fillBuyer();
    fillCard("4000000000000002");
    pay();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(DECLINED_MESSAGE);
    await waitFor(() => expect(document.activeElement).toBe(alert));
    for (const button of payButtons()) expect(button.disabled).toBe(false);
    expect(input("Número de tarjeta").value).toBe("4000 0000 0000 0002");
    expect(replace).not.toHaveBeenCalled();
    expect(useOrdersStore.getState().orders).toEqual([]);
  });

  it("un error inesperado muestra el mensaje genérico", async () => {
    vi.mocked(processMockPayment).mockRejectedValue(new Error("boom"));
    renderForm();

    fillBuyer();
    fillCard();
    pay();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Ocurrió un error inesperado al procesar el pago. Inténtalo de nuevo.",
    );
  });

  it("con sesión precarga Nombres, Apellidos y Correo", () => {
    useAuthStore.setState({ user: SESSION_USER });
    renderForm();
    expect(input("Nombres").value).toBe("Ana");
    expect(input("Apellidos").value).toBe("Quispe");
    expect(input("Correo electrónico").value).toBe("ana@correo.pe");
  });

  it("sin sesión los campos quedan vacíos y la precarga no sobrescribe lo ya escrito", () => {
    renderForm();
    expect(input("Nombres").value).toBe("");

    type("Nombres", "Luis");
    act(() => useAuthStore.setState({ user: SESSION_USER }));

    expect(input("Nombres").value).toBe("Luis");
    expect(input("Apellidos").value).toBe("Quispe");
    expect(input("Correo electrónico").value).toBe("ana@correo.pe");
  });

  it("el botón del resumen alterna aria-expanded", () => {
    renderForm();
    const toggle = screen.getByRole("button", { name: /Resumen del pedido:/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toContain("3 entradas · S/ 910.00");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("a los 10 minutos la reserva expira, deshabilita 'Pagar' y enviar no llama al service", () => {
    vi.useFakeTimers();
    const { container } = renderForm();
    fillBuyer();
    fillCard();

    act(() => vi.advanceTimersByTime(600_000));

    expect(screen.getByText("Tu reserva expiró")).toBeTruthy();
    for (const button of payButtons()) expect(button.disabled).toBe(true);

    fireEvent.submit(container.querySelector("form")!);
    expect(processMockPayment).not.toHaveBeenCalled();
  });
});
