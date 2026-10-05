import { useEffect } from "react";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { payOrder } from "../actions/checkout.actions";
import type { CheckoutOrder } from "../types/checkout.types";
import { CheckoutForm } from "./CheckoutForm";

const session = vi.hoisted(() => ({
  user: null as { firstName: string; lastName: string; email: string } | null,
}));

// Stripe falso: nunca se carga Stripe.js real. `paymentElement` decide qué avisa el Payment Element al montar.
const stripeMock = vi.hoisted(() => ({
  paymentElement: "ready" as "ready" | "loading" | "error",
  elementsOptions: undefined as unknown,
  paymentElementOptions: undefined as unknown,
  submit: vi.fn(),
  confirmPayment: vi.fn(),
}));

vi.mock("@/modules/auth/session", () => ({
  useSessionUser: () => ({ isLoaded: true, user: session.user && { ...session.user }, signOut: vi.fn() }),
}));

vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(() => Promise.resolve({})) }));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ options, children }: { options: unknown; children: ReactNode }) => {
    stripeMock.elementsOptions = options;
    return children;
  },
  PaymentElement: function PaymentElement({
    options,
    onReady,
    onLoadError,
  }: {
    options: unknown;
    onReady?: () => void;
    onLoadError?: () => void;
  }) {
    stripeMock.paymentElementOptions = options;
    useEffect(() => {
      if (stripeMock.paymentElement === "ready") onReady?.();
      if (stripeMock.paymentElement === "error") onLoadError?.();
    }, [onReady, onLoadError]);
    return <div data-testid="payment-element" />;
  },
  useStripe: () => ({ confirmPayment: stripeMock.confirmPayment }),
  useElements: () => ({ submit: stripeMock.submit }),
}));

vi.mock("../actions/checkout.actions", () => ({ payOrder: vi.fn() }));

const ORDER_ID = "0b8f2f6e-3c1a-4d2b-9e7f-5a6b7c8d9e0f";
const CLIENT_SECRET = "pi_123_secret_456";

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
  acceptTerms: true,
} as const;

const SESSION_USER = { firstName: "Ana", lastName: "Quispe", email: "ana@correo.pe" };

const DECLINED_MESSAGE = "Tu tarjeta fue rechazada.";
const UNEXPECTED_ERROR = "Ocurrió un error inesperado al procesar el pago. Inténtalo de nuevo.";

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

// Tiempo restante de la reserva que da la BD (p. ej. al recargar a los 7 minutos).
const REMAINING_MS = 180_000;

function formElement(order: CheckoutOrder = ORDER) {
  return (
    <CheckoutForm
      order={order}
      orderId={ORDER_ID}
      amountCents={Math.round(order.total * 100)}
      remainingMs={REMAINING_MS}
      changeHref="/eventos/noche-de-sintetizadores-lima"
      publishableKey="pk_test_unused"
    />
  );
}

const renderForm = (order?: CheckoutOrder) => render(formElement(order));

function fillBuyer() {
  type("Nombres", BUYER.firstName);
  type("Apellidos", BUYER.lastName);
  type("Correo electrónico", BUYER.email);
  type("Celular", BUYER.phone);
  type("Número de documento", BUYER.documentNumber);
  toggleTerms();
}

/** Stripe y la acción responden bien: `confirmPayment` sin error = Stripe redirige. */
function mockSuccessfulPayment() {
  stripeMock.submit.mockResolvedValue({});
  vi.mocked(payOrder).mockResolvedValue({ ok: true, clientSecret: CLIENT_SECRET });
  stripeMock.confirmPayment.mockResolvedValue({});
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  session.user = null;
  stripeMock.paymentElement = "ready";
});

describe("CheckoutForm", () => {
  it("monta Elements en modo diferido (solo tarjeta, PEN, es-419, tema Mentec) y el Payment Element sin billeteras ni datos de contacto", () => {
    renderForm();
    expect(stripeMock.elementsOptions).toMatchObject({
      mode: "payment",
      amount: 91000,
      currency: "pen",
      allowedPaymentMethodTypes: ["card"],
      locale: "es-419",
      appearance: { theme: "stripe", variables: { colorPrimary: "#0072F6", colorDanger: "#E5484D" } },
    });
    expect(stripeMock.paymentElementOptions).toEqual({
      fields: { billingDetails: { name: "never", email: "never", phone: "never" } },
      wallets: { applePay: "never", googlePay: "never" },
    });
    expect(screen.getByTestId("payment-element")).toBeTruthy();
  });

  it("'Método de pago' tiene Tarjeta seleccionada y Yape y PagoEfectivo deshabilitados con 'Próximamente'", () => {
    renderForm();
    const group = screen.getByRole("radiogroup", { name: "Método de pago" });
    const card = within(group).getByRole("radio", { name: /^Tarjeta/ });
    expect(card.getAttribute("aria-checked")).toBe("true");
    for (const name of ["Yape", "PagoEfectivo"]) {
      const radio = within(group).getByRole("radio", { name: new RegExp(`^${name}`) });
      expect(radio.getAttribute("aria-disabled")).toBe("true");
      expect(radio.getAttribute("aria-checked")).toBe("false");
      expect(document.getElementById(radio.getAttribute("aria-labelledby")!)?.textContent).toBe(`${name}Próximamente`);
    }
    expect(within(group).getAllByText("Próximamente")).toHaveLength(2);
    expect(screen.queryByRole("textbox", { name: /tarjeta|CVV|Vencimiento/i })).toBeNull();
  });

  it("muestra las notas de pago seguro y de modo de prueba", () => {
    renderForm();
    expect(screen.getByText("Pago seguro procesado por Stripe. No almacenamos los datos de tu tarjeta.")).toBeTruthy();
    expect(
      screen.getByText(
        "Modo de prueba: no se realiza ningún cobro real. Tarjeta de prueba 4242 4242 4242 4242, cualquier fecha futura y CVC.",
      ),
    ).toBeTruthy();
  });

  it("mientras carga el Payment Element muestra el estado de carga y 'Pagar' queda deshabilitado", () => {
    stripeMock.paymentElement = "loading";
    renderForm();
    expect(screen.getAllByRole("status").map((status) => status.textContent)).toContain("Cargando formulario de pago…");
    for (const button of payButtons()) expect(button.disabled).toBe(true);
  });

  it("si el Payment Element no carga, muestra el Alert y 'Pagar' queda deshabilitado", () => {
    stripeMock.paymentElement = "error";
    renderForm();
    expect(screen.getByRole("alert").textContent).toBe("No pudimos cargar el formulario de pago. Recarga la página.");
    expect(screen.queryByTestId("payment-element")).toBeNull();
    for (const button of payButtons()) expect(button.disabled).toBe(true);
  });

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

  it("con Términos marcados, el envío vacío muestra los errores del comprador, enfoca 'Nombres' y no llama a Stripe ni a la acción", () => {
    renderForm();
    toggleTerms();
    pay();

    for (const message of [
      "Ingresa tus nombres",
      "Ingresa tus apellidos",
      "Ingresa tu correo electrónico",
      "Ingresa tu número de celular",
      "Ingresa tu número de documento",
    ]) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    expect(input("Nombres").getAttribute("aria-describedby")).toBe("checkout-firstName-error");
    expect(document.activeElement).toBe(input("Nombres"));
    expect(stripeMock.submit).not.toHaveBeenCalled();
    expect(payOrder).not.toHaveBeenCalled();
  });

  it("envío válido: 'Procesando pago…', elements.submit, payOrder sin importes y confirmPayment con return_url y billing_details", async () => {
    let resolveConfirm!: (value: object) => void;
    stripeMock.submit.mockResolvedValue({});
    vi.mocked(payOrder).mockResolvedValue({ ok: true, clientSecret: CLIENT_SECRET });
    stripeMock.confirmPayment.mockReturnValue(new Promise((resolve) => (resolveConfirm = resolve)));
    renderForm();

    fillBuyer();
    pay();

    for (const button of payButtons()) {
      expect(button.textContent).toBe("Procesando pago…");
      expect(button.disabled).toBe(true);
    }
    expect(screen.getByRole("status").textContent).toBe("Procesando pago…");

    await waitFor(() => expect(stripeMock.confirmPayment).toHaveBeenCalledTimes(1));
    expect(stripeMock.submit).toHaveBeenCalledTimes(1);
    expect(payOrder).toHaveBeenCalledWith({ orderId: ORDER_ID, buyer: BUYER });
    const [{ elements, clientSecret, confirmParams }] = stripeMock.confirmPayment.mock.calls[0];
    expect(elements).toEqual({ submit: stripeMock.submit });
    expect(clientSecret).toBe(CLIENT_SECRET);
    expect(confirmParams.return_url).toBe(`${window.location.origin}/checkout/confirmacion?orden=${ORDER_ID}`);
    expect(confirmParams.payment_method_data).toEqual({
      billing_details: { name: "Luis Pérez", email: "luis@correo.pe", phone: "+51912345678" },
    });

    await act(async () => resolveConfirm({}));
    for (const button of payButtons()) expect(button.disabled).toBe(true);
  });

  it("tras confirmar (Stripe redirigiendo) 'Pagar' sigue deshabilitado y un segundo envío no vuelve a pagar", async () => {
    mockSuccessfulPayment();
    const { container } = renderForm();

    fillBuyer();
    pay();

    await waitFor(() => expect(stripeMock.confirmPayment).toHaveBeenCalledTimes(1));
    // Deja terminar el `finally` de useZodForm (isSubmitting vuelve a false).
    await act(async () => {});

    for (const button of payButtons()) {
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe("Procesando pago…");
    }

    fireEvent.submit(container.querySelector("form")!);
    await act(async () => {});
    expect(payOrder).toHaveBeenCalledTimes(1);
    expect(stripeMock.confirmPayment).toHaveBeenCalledTimes(1);
  });

  it("dos envíos seguidos sin esperar (mismo tick, sin re-render) solo pagan una vez", async () => {
    mockSuccessfulPayment();
    const { container } = renderForm();
    const form = container.querySelector("form")!;

    fillBuyer();
    // Un único act: React no re-renderiza entre los dos envíos, como un doble requestSubmit() en el mismo tick.
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    await waitFor(() => expect(stripeMock.confirmPayment).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(stripeMock.submit).toHaveBeenCalledTimes(1);
    expect(payOrder).toHaveBeenCalledTimes(1);
  });

  it("card_error muestra el mensaje de Stripe en el Alert con el foco, reactiva 'Pagar' y se puede reintentar", async () => {
    mockSuccessfulPayment();
    stripeMock.confirmPayment.mockResolvedValueOnce({ error: { type: "card_error", message: DECLINED_MESSAGE } });
    renderForm();

    fillBuyer();
    pay();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(DECLINED_MESSAGE);
    await waitFor(() => expect(document.activeElement).toBe(alert));
    for (const button of payButtons()) expect(button.disabled).toBe(false);

    pay();
    await waitFor(() => expect(stripeMock.confirmPayment).toHaveBeenCalledTimes(2));
    expect(payOrder).toHaveBeenCalledTimes(2);
  });

  it("un error de Stripe que no es de tarjeta muestra el mensaje genérico (no el de Stripe)", async () => {
    mockSuccessfulPayment();
    stripeMock.confirmPayment.mockResolvedValue({ error: { type: "api_error", message: "Internal: pi_123" } });
    renderForm();

    fillBuyer();
    pay();

    expect((await screen.findByRole("alert")).textContent).toBe(UNEXPECTED_ERROR);
  });

  it.each([
    ["order-expired", "Tu reserva expiró. Vuelve a elegir tus entradas."],
    ["order-unavailable", "Esta compra ya no está disponible."],
    ["invalid-input", "No pudimos iniciar el pago. Inténtalo de nuevo."],
    ["payment-error", "No pudimos iniciar el pago. Inténtalo de nuevo."],
  ] as const)("payOrder con %s muestra su mensaje y no llama a confirmPayment", async (error, message) => {
    stripeMock.submit.mockResolvedValue({});
    vi.mocked(payOrder).mockResolvedValue({ ok: false, error });
    renderForm();

    fillBuyer();
    pay();

    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(stripeMock.confirmPayment).not.toHaveBeenCalled();
    for (const button of payButtons()) expect(button.disabled).toBe(false);
  });

  it("si payOrder lanza, muestra el mensaje genérico", async () => {
    stripeMock.submit.mockResolvedValue({});
    vi.mocked(payOrder).mockRejectedValue(new Error("network"));
    renderForm();

    fillBuyer();
    pay();

    expect((await screen.findByRole("alert")).textContent).toBe(UNEXPECTED_ERROR);
  });

  it("si elements.submit devuelve error, no llama a la acción ni muestra el Alert (Stripe lo muestra) y reactiva 'Pagar'", async () => {
    stripeMock.submit.mockResolvedValue({ error: { type: "validation_error", message: "Número incompleto" } });
    renderForm();

    fillBuyer();
    pay();

    await waitFor(() => expect(stripeMock.submit).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(payOrder).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    for (const button of payButtons()) expect(button.disabled).toBe(false);
  });

  it("con sesión precarga Nombres, Apellidos y Correo", () => {
    session.user = SESSION_USER;
    renderForm();
    expect(input("Nombres").value).toBe("Ana");
    expect(input("Apellidos").value).toBe("Quispe");
    expect(input("Correo electrónico").value).toBe("ana@correo.pe");
  });

  it("sin sesión los campos quedan vacíos y la precarga no sobrescribe lo ya escrito", () => {
    const { rerender } = renderForm();
    expect(input("Nombres").value).toBe("");

    type("Nombres", "Luis");
    session.user = SESSION_USER;
    rerender(formElement());

    expect(input("Nombres").value).toBe("Luis");
    expect(input("Apellidos").value).toBe("Quispe");
    expect(input("Correo electrónico").value).toBe("ana@correo.pe");
  });

  it("con sesión, vaciar un campo precargado no lo vuelve a rellenar en el siguiente render", () => {
    session.user = SESSION_USER;
    renderForm();

    type("Nombres", "");
    type("Apellidos", "Ramos");

    expect(input("Nombres").value).toBe("");
  });

  it("el botón del resumen alterna aria-expanded", () => {
    renderForm();
    const toggle = screen.getByRole("button", { name: /Resumen del pedido:/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toContain("3 entradas · S/ 910.00");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("el temporizador arranca en el tiempo restante de la BD, no en 10 minutos", () => {
    renderForm();
    expect(screen.getByText("03:00")).toBeTruthy();
  });

  it("la reserva expira a los remainingMs (no a los 10 minutos), deshabilita 'Pagar' y enviar no llama a Stripe ni a la acción", () => {
    vi.useFakeTimers();
    const { container } = renderForm();
    fillBuyer();

    act(() => vi.advanceTimersByTime(REMAINING_MS - 1000));
    expect(screen.queryByText("Tu reserva expiró")).toBeNull();
    for (const button of payButtons()) expect(button.disabled).toBe(false);

    act(() => vi.advanceTimersByTime(1000));

    expect(screen.getByText("Tu reserva expiró")).toBeTruthy();
    for (const button of payButtons()) expect(button.disabled).toBe(true);

    fireEvent.submit(container.querySelector("form")!);
    expect(stripeMock.submit).not.toHaveBeenCalled();
    expect(payOrder).not.toHaveBeenCalled();
  });

  it("marca los campos obligatorios con required y un * oculto a la tecnología de apoyo", () => {
    const { container } = renderForm();
    for (const label of ["Nombres", "Apellidos", "Correo electrónico", "Celular", "Número de documento"]) {
      expect(input(label).required).toBe(true);
    }
    const terms = termsCheckbox();
    expect(terms.getAttribute("aria-required") === "true" || terms.hasAttribute("required")).toBe(true);

    expect(screen.queryByRole("textbox", { name: /\*/ })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /\*/ })).toBeNull();
    expect(screen.queryByRole("group", { name: /\*/ })).toBeNull();
    const marks = [...container.querySelectorAll("span")].filter((span) => span.textContent === "*");
    expect(marks.length).toBeGreaterThanOrEqual(6);
    for (const mark of marks) expect(mark.getAttribute("aria-hidden")).toBe("true");
  });

  it("agrupa tipo y número en el grupo 'Documento de identidad' y el selector muestra la abreviatura", () => {
    renderForm();
    const group = screen.getByRole("group", { name: "Documento de identidad" });
    const typeSelect = within(group).getByRole("combobox", { name: "Tipo de documento" });
    expect(typeSelect.querySelector("[data-slot=select-value]")?.textContent).toBe("DNI");
    expect(within(group).getByRole("textbox", { name: "Número de documento" })).toBeTruthy();
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
  });

  it("el subtítulo del comprador cambia por ancho y conserva la leyenda de los *", () => {
    renderForm();
    const short = screen.getByText("Asociaremos tus entradas a este correo.");
    const long = screen.getByText("Asociaremos tus entradas al correo que indiques.");
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

  it("con Términos sin marcar, pagar (clic o Enter) no valida ni llama a Stripe y enfoca la casilla de Términos", () => {
    const { container } = renderForm();
    type("Nombres", BUYER.firstName);
    type("Apellidos", BUYER.lastName);
    type("Correo electrónico", BUYER.email);
    type("Celular", BUYER.phone);
    type("Número de documento", BUYER.documentNumber);

    pay();
    expect(stripeMock.submit).not.toHaveBeenCalled();
    expect(payOrder).not.toHaveBeenCalled();
    expect(screen.queryByText("Debes aceptar los Términos y condiciones y la Política de privacidad")).toBeNull();
    expect(screen.queryByText("Procesando pago…")).toBeNull();
    expect(document.activeElement).toBe(termsCheckbox());

    (document.activeElement as HTMLElement).blur();
    fireEvent.submit(container.querySelector("form")!);
    expect(stripeMock.submit).not.toHaveBeenCalled();
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
    act(() => vi.advanceTimersByTime(REMAINING_MS));

    for (const button of payButtons()) expect(button.disabled).toBe(true);
    expect(screen.queryAllByText(TERMS_HINT)).toHaveLength(0);
  });
});
