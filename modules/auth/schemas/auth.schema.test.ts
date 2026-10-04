import { describe, expect, it } from "vitest";
import { completeProfileSchema } from "./auth.schema";

const valid = {
  phone: "912345678",
  documentType: "dni",
  documentNumber: "12345678",
  acceptTerms: true,
  marketingOptIn: false,
};

// Primer mensaje de error de un campo (lo que muestra el formulario).
function err(patch: Record<string, unknown>, field: string) {
  const result = completeProfileSchema.safeParse({ ...valid, ...patch });
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("completeProfileSchema", () => {
  it("acepta un perfil válido, con y sin publicidad", () => {
    expect(completeProfileSchema.safeParse(valid).success).toBe(true);
    expect(completeProfileSchema.safeParse({ ...valid, marketingOptIn: true }).success).toBe(true);
  });

  it("valida el celular", () => {
    const message = "Ingresa un celular válido de 9 dígitos que empiece con 9";
    expect(err({ phone: "812345678" }, "phone")).toBe(message);
    expect(err({ phone: "91234567" }, "phone")).toBe(message);
    expect(err({ phone: "91234567a" }, "phone")).toBe(message);
    expect(err({ phone: "" }, "phone")).toBe("Ingresa tu número de celular");
  });

  it("valida el documento según su tipo", () => {
    expect(err({ documentNumber: "" }, "documentNumber")).toBe("Ingresa tu número de documento");
    expect(err({ documentNumber: "1234567" }, "documentNumber")).toBe("El DNI debe tener 8 dígitos");

    expect(err({ documentType: "ce", documentNumber: "001234567" }, "documentNumber")).toBeUndefined();
    expect(err({ documentType: "ce", documentNumber: "12345678" }, "documentNumber")).toBe(
      "El carné de extranjería debe tener entre 9 y 12 caracteres (letras o números)",
    );

    expect(err({ documentType: "passport", documentNumber: "AB1234" }, "documentNumber")).toBeUndefined();
    expect(err({ documentType: "passport", documentNumber: "AB123" }, "documentNumber")).toBe(
      "El pasaporte debe tener entre 6 y 12 caracteres (letras o números)",
    );
  });

  it("reporta el documento aunque otro campo sea inválido", () => {
    expect(err({ phone: "", acceptTerms: false, documentNumber: "1234567" }, "documentNumber")).toBe(
      "El DNI debe tener 8 dígitos",
    );
  });

  it("exige el consentimiento obligatorio", () => {
    expect(err({ acceptTerms: false }, "acceptTerms")).toBe(
      "Debes aceptar los Términos y condiciones y la Política de privacidad",
    );
  });
});
