import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckoutFormValues } from "../types/checkout.types";
import { cardDetailsSchema, checkoutFormSchema, orderCodeSchema, PAYMENT_METHOD_LABELS } from "./payment.schema";

// Fecha fijada: 15 de octubre de 2026 (hora local) → "10/26" vigente, "09/26" vencida.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 15, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

const valid: CheckoutFormValues = {
  firstName: "Ana",
  lastName: "Quispe",
  email: "ana@correo.pe",
  phone: "912345678",
  documentType: "dni",
  documentNumber: "12345678",
  paymentMethod: "card",
  cardNumber: "4242 4242 4242 4242",
  cardExpiry: "12/28",
  cardCvv: "123",
  cardName: "Ana Quispe",
  acceptTerms: true,
};

// Primer mensaje de error de un campo (lo que muestra el formulario).
function err(patch: Partial<CheckoutFormValues>, field: keyof CheckoutFormValues) {
  const result = checkoutFormSchema.safeParse({ ...valid, ...patch });
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("checkoutFormSchema", () => {
  it("acepta un formulario válido con tarjeta: número sin espacios y textos recortados", () => {
    const result = checkoutFormSchema.safeParse({
      ...valid,
      firstName: "  Ana ",
      lastName: " Quispe  ",
      email: "  ana@correo.pe ",
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      firstName: "Ana",
      lastName: "Quispe",
      email: "ana@correo.pe",
      cardNumber: "4242424242424242",
      paymentMethod: "card",
    });
  });

  it.each(["yape", "pagoefectivo"] as const)("con %s no valida los campos de tarjeta vacíos", (paymentMethod) => {
    const result = checkoutFormSchema.safeParse({
      ...valid,
      paymentMethod,
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
      cardName: "",
    });
    expect(result.success).toBe(true);
  });

  it("con todo vacío y tarjeta hay un mensaje en cada campo a la vez", () => {
    const result = checkoutFormSchema.safeParse({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      documentType: "dni",
      documentNumber: "",
      paymentMethod: "card",
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
      cardName: "",
      acceptTerms: false,
    });
    const issues = result.error?.issues ?? [];
    const messages = Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message]));
    expect(issues).toHaveLength(10); // un solo mensaje por campo
    expect(messages).toEqual({
      firstName: "Ingresa tus nombres",
      lastName: "Ingresa tus apellidos",
      email: "Ingresa tu correo electrónico",
      phone: "Ingresa tu número de celular",
      documentNumber: "Ingresa tu número de documento",
      cardNumber: "Ingresa el número de tarjeta",
      cardExpiry: "Ingresa la fecha de vencimiento",
      cardCvv: "Ingresa el CVV",
      cardName: "Ingresa el nombre que figura en la tarjeta",
      acceptTerms: "Debes aceptar los Términos y condiciones y la Política de privacidad",
    });
  });

  it("valida el número de tarjeta (16 dígitos y Luhn)", () => {
    const message = "Ingresa un número de tarjeta válido";
    expect(err({ cardNumber: "4242 4242 4242 4241" }, "cardNumber")).toBe(message);
    expect(err({ cardNumber: "4242 4242 4242 424" }, "cardNumber")).toBe(message);
    expect(err({ cardNumber: "4242 4242 4242 42424" }, "cardNumber")).toBe(message);
    expect(err({ cardNumber: "4242-4242-4242-4242" }, "cardNumber")).toBe(message);
    expect(err({ cardNumber: "4000 0000 0000 0002" }, "cardNumber")).toBeUndefined();
    expect(err({ cardNumber: "   " }, "cardNumber")).toBe("Ingresa el número de tarjeta");
  });

  it("valida el vencimiento: formato, vencida y mes actual vigente", () => {
    expect(err({ cardExpiry: "13/30" }, "cardExpiry")).toBe("Ingresa una fecha válida (MM/AA)");
    expect(err({ cardExpiry: "00/30" }, "cardExpiry")).toBe("Ingresa una fecha válida (MM/AA)");
    expect(err({ cardExpiry: "1230" }, "cardExpiry")).toBe("Ingresa una fecha válida (MM/AA)");
    expect(err({ cardExpiry: "09/26" }, "cardExpiry")).toBe("La tarjeta está vencida");
    expect(err({ cardExpiry: "10/26" }, "cardExpiry")).toBeUndefined();
  });

  it("valida el CVV", () => {
    const message = "El CVV debe tener 3 o 4 dígitos";
    expect(err({ cardCvv: "12" }, "cardCvv")).toBe(message);
    expect(err({ cardCvv: "12345" }, "cardCvv")).toBe(message);
    expect(err({ cardCvv: "abc" }, "cardCvv")).toBe(message);
    expect(err({ cardCvv: "123" }, "cardCvv")).toBeUndefined();
    expect(err({ cardCvv: "1234" }, "cardCvv")).toBeUndefined();
  });

  it("valida el nombre en la tarjeta", () => {
    expect(err({ cardName: "A" }, "cardName")).toBe("Ingresa un nombre válido");
    expect(err({ cardName: "Ana2" }, "cardName")).toBe("Ingresa un nombre válido");
    expect(err({ cardName: "José Ñuñez" }, "cardName")).toBeUndefined();
  });

  it("valida comprador con los mensajes del registro", () => {
    expect(err({ documentNumber: "1234567" }, "documentNumber")).toBe("El DNI debe tener 8 dígitos");
    expect(err({ phone: "812345678" }, "phone")).toBe("Ingresa un celular válido de 9 dígitos que empiece con 9");
    expect(err({ firstName: "Ana2" }, "firstName")).toBe("Ingresa un nombre válido");
    expect(err({ lastName: "Quispe1" }, "lastName")).toBe("Ingresa un apellido válido");
    expect(err({ email: "ana@" }, "email")).toBe("Ingresa un correo electrónico válido");
    expect(err({ acceptTerms: false }, "acceptTerms")).toBe(
      "Debes aceptar los Términos y condiciones y la Política de privacidad",
    );
  });
});

describe("cardDetailsSchema", () => {
  it("transforma el número a solo dígitos", () => {
    const result = cardDetailsSchema.parse({
      cardNumber: "4242 4242 4242 4242",
      cardExpiry: "10/26",
      cardCvv: "123",
      cardName: "Ana Quispe",
    });
    expect(result.cardNumber).toBe("4242424242424242");
  });
});

describe("PAYMENT_METHOD_LABELS", () => {
  it("etiqueta los tres métodos", () => {
    expect(PAYMENT_METHOD_LABELS).toEqual({ card: "Tarjeta", yape: "Yape", pagoefectivo: "PagoEfectivo" });
  });
});

describe("orderCodeSchema", () => {
  it("acepta MT- seguido de 6 caracteres A-Z0-9", () => {
    expect(orderCodeSchema.safeParse("MT-AB12CD").success).toBe(true);
  });

  it.each(["mt-ab12cd", "MT-AB12C", "MT-AB12CD1", ""])("rechaza %j", (value) => {
    expect(orderCodeSchema.safeParse(value).success).toBe(false);
  });
});
