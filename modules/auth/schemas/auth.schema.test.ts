import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { loginSchema, registerSchema } from "./auth.schema";

// Primer mensaje de error de un campo (lo que muestra el formulario).
function firstError(schema: z.ZodType, input: unknown, field: string) {
  const result = schema.safeParse(input);
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("loginSchema", () => {
  it("acepta credenciales válidas", () => {
    expect(loginSchema.safeParse({ email: "a@b.pe", password: "x" }).success).toBe(true);
  });

  it("valida correo vacío y mal formado", () => {
    expect(firstError(loginSchema, { email: "   ", password: "x" }, "email")).toBe(
      "Ingresa tu correo electrónico",
    );
    expect(firstError(loginSchema, { email: "ana@", password: "x" }, "email")).toBe(
      "Ingresa un correo electrónico válido",
    );
  });

  it("valida contraseña vacía", () => {
    expect(firstError(loginSchema, { email: "a@b.pe", password: "" }, "password")).toBe(
      "Ingresa tu contraseña",
    );
  });
});

describe("registerSchema", () => {
  const valid = {
    firstName: "Ana",
    lastName: "Quispe",
    email: "ana@correo.pe",
    phone: "912345678",
    documentType: "dni",
    documentNumber: "12345678",
    password: "Clave2026",
    confirmPassword: "Clave2026",
    acceptTerms: true,
    marketingOptIn: false,
  };
  const err = (patch: Record<string, unknown>, field: string) =>
    firstError(registerSchema, { ...valid, ...patch }, field);

  it("acepta un registro completo válido", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("recorta los espacios del correo", () => {
    expect(registerSchema.parse({ ...valid, email: "  ana@correo.pe  " }).email).toBe(
      "ana@correo.pe",
    );
  });

  it("valida nombres y apellidos", () => {
    expect(err({ firstName: "José Ñuñez", lastName: "O'Higgins-Peña" }, "firstName")).toBeUndefined();
    expect(err({ firstName: "José Ñuñez", lastName: "O'Higgins-Peña" }, "lastName")).toBeUndefined();
    expect(err({ firstName: "Ana2" }, "firstName")).toBe("Ingresa un nombre válido");
    expect(err({ lastName: "Quispe1" }, "lastName")).toBe("Ingresa un apellido válido");
    expect(err({ firstName: "" }, "firstName")).toBe("Ingresa tus nombres");
    expect(err({ lastName: " " }, "lastName")).toBe("Ingresa tus apellidos");
  });

  it("valida el celular", () => {
    const message = "Ingresa un celular válido de 9 dígitos que empiece con 9";
    expect(err({ phone: "912345678" }, "phone")).toBeUndefined();
    expect(err({ phone: "812345678" }, "phone")).toBe(message);
    expect(err({ phone: "91234567" }, "phone")).toBe(message);
    expect(err({ phone: "91234567a" }, "phone")).toBe(message);
    expect(err({ phone: "" }, "phone")).toBe("Ingresa tu número de celular");
  });

  it("valida el documento según su tipo", () => {
    expect(err({ documentNumber: "12345678" }, "documentNumber")).toBeUndefined();
    expect(err({ documentNumber: "1234567" }, "documentNumber")).toBe("El DNI debe tener 8 dígitos");
    expect(err({ documentNumber: "1234567a" }, "documentNumber")).toBe("El DNI debe tener 8 dígitos");
    expect(err({ documentNumber: "" }, "documentNumber")).toBe("Ingresa tu número de documento");

    const ceMessage = "El carné de extranjería debe tener entre 9 y 12 caracteres (letras o números)";
    expect(err({ documentType: "ce", documentNumber: "001234567" }, "documentNumber")).toBeUndefined();
    expect(err({ documentType: "ce", documentNumber: "AB1234567890" }, "documentNumber")).toBeUndefined();
    expect(err({ documentType: "ce", documentNumber: "12345678" }, "documentNumber")).toBe(ceMessage);

    expect(err({ documentType: "passport", documentNumber: "AB1234" }, "documentNumber")).toBeUndefined();
    expect(err({ documentType: "passport", documentNumber: "AB123" }, "documentNumber")).toBe(
      "El pasaporte debe tener entre 6 y 12 caracteres (letras o números)",
    );
  });

  it("valida la contraseña", () => {
    const charset = "La contraseña debe incluir al menos una letra y un número";
    expect(err({ password: "", confirmPassword: "" }, "password")).toBe("Ingresa una contraseña");
    expect(err({ password: "Clave1" }, "password")).toBe(
      "La contraseña debe tener al menos 8 caracteres",
    );
    expect(err({ password: "ClaveSegura" }, "password")).toBe(charset);
    expect(err({ password: "12345678" }, "password")).toBe(charset);
  });

  it("valida la confirmación de contraseña", () => {
    expect(err({ confirmPassword: "" }, "confirmPassword")).toBe("Confirma tu contraseña");
    expect(err({ confirmPassword: "Otra2026" }, "confirmPassword")).toBe(
      "Las contraseñas no coinciden",
    );
    // Se reporta aunque otros campos sean inválidos (el formulario revalida con el schema completo).
    expect(err({ email: "", confirmPassword: "Otra2026" }, "confirmPassword")).toBe(
      "Las contraseñas no coinciden",
    );
  });

  it("exige aceptar los términos", () => {
    expect(err({ acceptTerms: false }, "acceptTerms")).toBe(
      "Debes aceptar los Términos y condiciones y la Política de privacidad",
    );
  });
});
