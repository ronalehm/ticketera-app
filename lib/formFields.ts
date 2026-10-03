import { z } from "zod";

// Reglas de campos de persona compartidas por los formularios (registro, checkout…).

export const DOCUMENT_TYPES = ["dni", "ce", "passport"] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS = {
  dni: "DNI",
  ce: "Carné de extranjería",
  passport: "Pasaporte",
} satisfies Record<DocumentType, string>;

const DOCUMENT_RULES = {
  dni: { pattern: /^\d{8}$/, message: "El DNI debe tener 8 dígitos" },
  ce: {
    pattern: /^[A-Za-z0-9]{9,12}$/,
    message: "El carné de extranjería debe tener entre 9 y 12 caracteres (letras o números)",
  },
  passport: {
    pattern: /^[A-Za-z0-9]{6,12}$/,
    message: "El pasaporte debe tener entre 6 y 12 caracteres (letras o números)",
  },
} satisfies Record<DocumentType, { pattern: RegExp; message: string }>;

const NAME_PATTERN = /^[\p{L}' -]+$/u;

// Vacío → `emptyMessage`; el resto de reglas solo se evalúan si hay texto (un mensaje por campo).
export const requiredText = (emptyMessage: string) => z.string().trim().min(1, emptyMessage);

export const nameField = (emptyMessage: string, invalidMessage: string) =>
  requiredText(emptyMessage).pipe(
    z.string().min(2, invalidMessage).max(50, invalidMessage).regex(NAME_PATTERN, invalidMessage),
  );

export const emailField = requiredText("Ingresa tu correo electrónico").pipe(
  z.email("Ingresa un correo electrónico válido"),
);

export const phoneField = requiredText("Ingresa tu número de celular").pipe(
  z.string().regex(/^9\d{8}$/, "Ingresa un celular válido de 9 dígitos que empiece con 9"),
);

export const acceptTermsField = z
  .boolean()
  .refine((value) => value, "Debes aceptar los Términos y condiciones y la Política de privacidad");

/** Mensaje si el número no cumple la regla de su tipo de documento; `undefined` si está vacío o es válido. */
export function getDocumentNumberError(documentType: DocumentType, documentNumber: string): string | undefined {
  const rule = DOCUMENT_RULES[documentType];
  if (documentNumber && !rule.pattern.test(documentNumber)) return rule.message;
  return undefined;
}
