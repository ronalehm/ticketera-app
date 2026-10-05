import { describe, expect, it } from "vitest";
import { checkoutBuyerSchema, PAYMENT_METHOD_LABELS, payOrderInputSchema } from "./payment.schema";

describe("PAYMENT_METHOD_LABELS", () => {
  it("etiqueta los tres métodos", () => {
    expect(PAYMENT_METHOD_LABELS).toEqual({ card: "Tarjeta", yape: "Yape", pagoefectivo: "PagoEfectivo" });
  });
});

const buyer = {
  firstName: "Ana",
  lastName: "Quispe",
  email: "ana@correo.pe",
  phone: "912345678",
  documentType: "dni",
  documentNumber: "12345678",
  acceptTerms: true,
} as const;

function buyerError(patch: Record<string, unknown>, field: string) {
  const result = checkoutBuyerSchema.safeParse({ ...buyer, ...patch });
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("checkoutBuyerSchema", () => {
  it("acepta un comprador válido con los textos recortados y sin claves extra", () => {
    const result = checkoutBuyerSchema.parse({
      ...buyer,
      firstName: "  Ana ",
      lastName: " Quispe  ",
      email: "  ana@correo.pe ",
      paymentMethod: "card",
    });
    expect(result).toEqual(buyer);
  });

  it("con todo vacío hay un mensaje en cada campo a la vez", () => {
    const result = checkoutBuyerSchema.safeParse({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      documentType: "dni",
      documentNumber: "",
      acceptTerms: false,
    });
    const issues = result.error?.issues ?? [];
    expect(issues).toHaveLength(6);
    expect(Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message]))).toEqual({
      firstName: "Ingresa tus nombres",
      lastName: "Ingresa tus apellidos",
      email: "Ingresa tu correo electrónico",
      phone: "Ingresa tu número de celular",
      documentNumber: "Ingresa tu número de documento",
      acceptTerms: "Debes aceptar los Términos y condiciones y la Política de privacidad",
    });
  });

  it("valida cada campo con los mensajes actuales", () => {
    expect(buyerError({ firstName: "Ana2" }, "firstName")).toBe("Ingresa un nombre válido");
    expect(buyerError({ lastName: "Quispe1" }, "lastName")).toBe("Ingresa un apellido válido");
    expect(buyerError({ email: "ana@" }, "email")).toBe("Ingresa un correo electrónico válido");
    expect(buyerError({ phone: "812345678" }, "phone")).toBe("Ingresa un celular válido de 9 dígitos que empiece con 9");
    expect(buyerError({ documentNumber: "1234567" }, "documentNumber")).toBe("El DNI debe tener 8 dígitos");
    expect(buyerError({ documentType: "ce", documentNumber: "12345678" }, "documentNumber")).toBe(
      "El carné de extranjería debe tener entre 9 y 12 caracteres (letras o números)",
    );
    expect(buyerError({ documentType: "passport", documentNumber: "AB1234" }, "documentNumber")).toBeUndefined();
  });
});

describe("payOrderInputSchema", () => {
  const orderId = "0b8f2f6e-3c1a-4d2b-9e7f-5a6b7c8d9e0f";

  it("exige un UUID en orderId", () => {
    expect(payOrderInputSchema.safeParse({ orderId: "TK-1001", buyer }).success).toBe(false);
    expect(payOrderInputSchema.safeParse({ buyer }).success).toBe(false);
  });

  it("descarta amount/total y claves extra del comprador", () => {
    const result = payOrderInputSchema.parse({ orderId, buyer: { ...buyer, amount: 1 }, amount: 1, total: 1 });
    expect(result).toEqual({ orderId, buyer });
  });

  it("rechaza un comprador inválido", () => {
    expect(payOrderInputSchema.safeParse({ orderId, buyer: { ...buyer, acceptTerms: false } }).success).toBe(false);
  });
});
