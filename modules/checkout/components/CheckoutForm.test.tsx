import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

// Por rol y nombre accesible: el `*` (aria-hidden) queda dentro del <label> pero fuera del nombre.
const input = (label: string) => screen.getByRole("textbox", { name: label }) as HTMLInputElement;
const type = (label: string, value: string) => fireEvent.change(input(label), { target: { value } });
// Dos botones "Pagar" en el DOM: el del panel (lg) y el de la barra inferior (móvil).
const payButtons = () =>
  screen.getAllByRole("button", { name: /Pagar S\/|Procesando pago…/ }) as HTMLButtonElement[];
const pay = () => fireEvent.click(payButtons()[0]);
const termsCheckbox = () => screen.getByRole("checkbox", { name: /Acepto los/ });
const toggleTerms = () => fireEvent.click(screen.getByText(/^Acepto los/));
const TERMS_HINT = "Acepta los términos para continuar.";
const summaryPanel = () => screen.getByRole("complementary", { name: "Resumen de la compra" });

function renderForm(order: CheckoutOrder = ORDER) {
  return render(<CheckoutForm order={order} changeHref="/eventos/noche-de-sintetizadores-lima" />);
}

function fillBuyer() {
  type("Nombres", BUYER.firstName);
  type("Apellidos", BUYER.lastName);
  type("Correo electrónico", BUYER.email);
  type("Celular", BUYER.phone);
  type("Número de documento", BUYER.documentNumber);
  toggleTerms();
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
  it("muestra los botones 'Pagar' con el total del pedido, bloqueados con aria-disabled hasta aceptar los Términos", () => {
    renderForm();
    const buttons = payButtons();
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.textContent).toBe("Pagar S/ 910.00");
      expect(button.type).toBe("submit");
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(button.hasAttribute("disabled")).toBe(false);
      const hintId = button.getAttribute("aria-describedby");
      expect(hintId).toBeTruthy();
      expect(document.getElementById(hintId!)?.textContent).toBe(TERMS_HINT);
    }
  });

  it("con Términos marcados, el envío vacío muestra los errores del comprador y de la tarjeta, enfoca 'Nombres' y no llama al service", () => {
    renderForm();
    toggleTerms();
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
    ]) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    expect(screen.queryByText("Debes aceptar los Términos y condiciones y la Política de privacidad")).toBeNull();
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
    expect(screen.queryByRole("textbox", { name: "Número de tarjeta" })).toBeNull();
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

  it("tras un pago aprobado 'Pagar' sigue deshabilitado mientras navega y un segundo envío no vuelve a pagar", async () => {
    vi.mocked(processMockPayment).mockResolvedValue(PAID_ORDER);
    const { container } = renderForm();

    fillBuyer();
    fillCard();
    pay();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout/confirmacion?orden=MT-AB12CD"));
    // Deja terminar el `finally` de useZodForm (isSubmitting vuelve a false).
    await act(async () => {});

    for (const button of payButtons()) {
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe("Procesando pago…");
    }

    fireEvent.submit(container.querySelector("form")!);
    await act(async () => {});
    expect(processMockPayment).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("dos envíos seguidos sin esperar (mismo tick, sin re-render) solo pagan una vez", async () => {
    vi.mocked(processMockPayment).mockResolvedValue(PAID_ORDER);
    const { container } = renderForm();
    const form = container.querySelector("form")!;

    fillBuyer();
    fillCard();
    // Un único act: React no re-renderiza entre los dos envíos, como un doble requestSubmit() en el mismo tick.
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout/confirmacion?orden=MT-AB12CD"));
    await act(async () => {});
    expect(processMockPayment).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("tras un pago rechazado se puede volver a pagar", async () => {
    vi.mocked(processMockPayment).mockRejectedValueOnce(new PaymentError()).mockResolvedValueOnce(PAID_ORDER);
    renderForm();

    fillBuyer();
    fillCard();
    pay();
    await screen.findByRole("alert");

    pay();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout/confirmacion?orden=MT-AB12CD"));
    expect(processMockPayment).toHaveBeenCalledTimes(2);
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
  it("marca los campos obligatorios con required y un * oculto a la tecnología de apoyo", () => {
    const { container } = renderForm();
    for (const label of [
      "Nombres",
      "Apellidos",
      "Correo electrónico",
      "Celular",
      "Número de documento",
      "Número de tarjeta",
      "Vencimiento",
      "CVV",
      "Nombre en la tarjeta",
    ]) {
      expect(input(label).required).toBe(true);
    }
    const terms = termsCheckbox();
    expect(terms.getAttribute("aria-required") === "true" || terms.hasAttribute("required")).toBe(true);

    expect(screen.queryByRole("textbox", { name: /\*/ })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /\*/ })).toBeNull();
    expect(screen.queryByRole("group", { name: /\*/ })).toBeNull();
    const marks = [...container.querySelectorAll("span")].filter((span) => span.textContent === "*");
    expect(marks.length).toBeGreaterThanOrEqual(10);
    for (const mark of marks) expect(mark.getAttribute("aria-hidden")).toBe("true");
  });

  it("agrupa tipo y número en el grupo 'Documento de identidad' y el selector muestra la abreviatura", () => {
    renderForm();
    const group = screen.getByRole("group", { name: "Documento de identidad" });
    const typeSelect = within(group).getByRole("combobox", { name: "Tipo de documento" });
    expect(typeSelect.querySelector("[data-slot=select-value]")?.textContent).toBe("DNI");
    expect(within(group).getByRole("textbox", { name: "Número de documento" })).toBeTruthy();
  });

  it("muestra la nota de demo y las tarjetas de prueba solo con Tarjeta", () => {
    renderForm();
    expect(screen.getByText(/Demo: no se realiza ningún cobro real\./)).toBeTruthy();
    expect(screen.getByText(/4242 4242 4242 4242/)).toBeTruthy();
    expect(screen.queryByText(/Pago simulado:/)).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Yape" }));
    expect(screen.getByText(/Demo: no se realiza ningún cobro real\./)).toBeTruthy();
    expect(screen.queryByText(/4242 4242 4242 4242/)).toBeNull();
  });

  it("el resumen compacto lleva líneas, fecha corta, total y el 'Pagar' de la tarjeta con su aviso", () => {
    renderForm();
    const panel = summaryPanel();
    const panelPay = within(panel).getByRole("button", { name: "Pagar S/ 910.00" });
    const totalRow = within(panel).getByText("Total", { exact: false, selector: "span" });
    expect(totalRow.textContent).toBe("Total (3 entradas)");
    expect(panelPay.closest("[data-slot=card-content]")).toBe(totalRow.closest("[data-slot=card-content]"));
    expect(totalRow.closest("[data-slot=card-content]")?.textContent).toContain("S/ 910.00");
    expect(within(panel).getByText("2 × General")).toBeTruthy();
    expect(within(panel).getByText("1 × VIP")).toBeTruthy();
    expect(within(panel).getByText(/sáb 14 nov/).closest("p")?.textContent).toBe("sáb 14 nov · Estadio, Lima");
    expect(within(panel).getByText(TERMS_HINT)).toBeTruthy();
  });

  it("los campos del comprador muestran sus placeholders", () => {
    renderForm();
    const placeholders = {
      "checkout-firstName": "Como figura en tu documento",
      "checkout-lastName": "Como figura en tu documento",
      "checkout-email": "tu@email.com",
      "checkout-phone": "Número de celular",
      "checkout-documentNumber": "Número",
    };
    for (const [id, placeholder] of Object.entries(placeholders)) {
      expect(document.getElementById(id)?.getAttribute("placeholder")).toBe(placeholder);
    }
  });

  it("el método Tarjeta añade ' de crédito o débito' solo por debajo de sm", () => {
    renderForm();
    // dom-accessibility-api recorta el texto de cada elemento hijo y pierde el espacio inicial del sufijo
    // ("Tarjetade…"); el navegador sí lo conserva. Por eso el nombre se comprueba en la etiqueta que lo da.
    const card = screen.getByRole("radio", { name: /^Tarjeta/ });
    const label = document.getElementById(card.getAttribute("aria-labelledby")!);
    expect(label?.textContent).toBe("Tarjeta de crédito o débito");
    const suffix = screen.getByText((_, element) => element?.textContent === " de crédito o débito");
    expect(suffix.tagName).toBe("SPAN");
    expect(suffix.className).toContain("sm:hidden");
    expect(screen.getByRole("radio", { name: "Yape" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "PagoEfectivo" })).toBeTruthy();
  });

  it("el subtítulo del comprador cambia por ancho y conserva la leyenda de los *", () => {
    renderForm();
    const short = screen.getByText("Enviaremos tus entradas a este correo.");
    const long = screen.getByText("Enviaremos tus entradas al correo que indiques.");
    expect(short.tagName).toBe("SPAN");
    expect(short.className.split(" ")).toContain("sm:hidden");
    expect(long.tagName).toBe("SPAN");
    expect(long.className.split(" ")).toContain("max-sm:hidden");
    const description = short.parentElement!;
    expect(description).toBe(long.parentElement);
    expect(description.textContent).toContain("Los campos con * son obligatorios.");
  });

  it("la casilla de Términos es blanca (bg-background) sobre el fondo gris", () => {
    renderForm();
    expect(termsCheckbox().className.split(" ")).toContain("bg-background");
  });

  it("en la tarjeta del resumen, la miniatura y el título se ocultan por debajo de lg y la fecha corta no", () => {
    const { container } = renderForm();
    const card = screen.getByRole("heading", { name: "Resumen del pedido", hidden: true }).closest("[data-slot=card]")!;
    expect(card).toBeTruthy();
    const image = card.querySelector("img")!;
    expect(image.className.split(" ")).toContain("max-lg:hidden");
    const title = within(card as HTMLElement).getByText(ORDER.event.title);
    expect(title.className.split(" ")).toContain("max-lg:hidden");
    const date = within(card as HTMLElement).getByText(/sáb 14 nov/).closest("p")!;
    expect(date.className).not.toContain("hidden");
    // El botón plegable sigue mostrando la miniatura y el título en móvil.
    const toggle = screen.getByRole("button", { name: /Resumen del pedido:/ });
    expect(toggle.textContent).toContain(ORDER.event.title);
    expect(toggle.querySelector("img")).toBeTruthy();
    expect(container.querySelectorAll("[data-slot=card] img")).toHaveLength(1);
  });

  it("con 1 entrada con asientos el resumen dice 'Total (1 entrada)' y muestra los asientos compactos", () => {
    renderForm({
      ...ORDER,
      items: [
        {
          ticketTypeId: "tribuna-oriente",
          name: "Tribuna Oriente",
          unitPrice: 155,
          quantity: 1,
          seats: [{ id: "tribuna-oriente-L-9", label: "Tribuna Oriente · Fila L · Asiento 9" }],
        },
      ],
      quantities: { "tribuna-oriente": 1 },
      ticketCount: 1,
      total: 155,
    });
    const panel = summaryPanel();
    expect(within(panel).getByText("Total", { exact: false, selector: "span" }).textContent).toBe("Total (1 entrada)");
    expect(screen.getByRole("button", { name: /Resumen del pedido:/ }).textContent).toContain("1 entrada · S/ 155.00");
    expect(within(panel).getByText("Fila L · 9")).toBeTruthy();
  });

  it("con dos asientos de filas distintas muestra 'Fila L · 9 · Fila M · 8'", () => {
    renderForm({
      ...ORDER,
      items: [
        {
          ticketTypeId: "tribuna-oriente",
          name: "Tribuna Oriente",
          unitPrice: 155,
          quantity: 2,
          seats: [
            { id: "tribuna-oriente-L-9", label: "Tribuna Oriente · Fila L · Asiento 9" },
            { id: "tribuna-oriente-M-8", label: "Tribuna Oriente · Fila M · Asiento 8" },
          ],
        },
      ],
      quantities: { "tribuna-oriente": 2 },
      ticketCount: 2,
      total: 310,
    });
    expect(within(summaryPanel()).getByText("Fila L · 9 · Fila M · 8")).toBeTruthy();
  });

  it("con Términos sin marcar, pagar (clic o Enter) no valida ni llama al service y enfoca la casilla de Términos", () => {
    const { container } = renderForm();
    type("Nombres", BUYER.firstName);
    type("Apellidos", BUYER.lastName);
    type("Correo electrónico", BUYER.email);
    type("Celular", BUYER.phone);
    type("Número de documento", BUYER.documentNumber);
    fillCard();

    pay();
    expect(processMockPayment).not.toHaveBeenCalled();
    expect(screen.queryByText("Debes aceptar los Términos y condiciones y la Política de privacidad")).toBeNull();
    expect(screen.queryByText("Procesando pago…")).toBeNull();
    expect(document.activeElement).toBe(termsCheckbox());

    (document.activeElement as HTMLElement).blur();
    fireEvent.submit(container.querySelector("form")!);
    expect(processMockPayment).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(termsCheckbox());
  });

  it("con el formulario vacío y Términos sin marcar no muestra ningún error", () => {
    renderForm();
    pay();
    expect(screen.queryByText("Ingresa tus nombres")).toBeNull();
    expect(document.activeElement).toBe(termsCheckbox());
  });

  it("al marcar los Términos desaparece el aviso y 'Pagar' pierde aria-disabled; al desmarcarlos, vuelven", () => {
    renderForm();
    toggleTerms();
    expect(screen.queryAllByText(TERMS_HINT)).toHaveLength(0);
    for (const button of payButtons()) {
      expect(button.hasAttribute("aria-disabled")).toBe(false);
      expect(button.hasAttribute("aria-describedby")).toBe(false);
    }

    toggleTerms();
    expect(screen.getAllByText(TERMS_HINT)).toHaveLength(2);
    for (const button of payButtons()) expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  it("con la reserva expirada y Términos sin marcar, 'Pagar' queda disabled y sin aviso de términos", () => {
    vi.useFakeTimers();
    renderForm();
    act(() => vi.advanceTimersByTime(600_000));

    for (const button of payButtons()) expect(button.disabled).toBe(true);
    expect(screen.queryAllByText(TERMS_HINT)).toHaveLength(0);
  });
});
