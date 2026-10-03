import { z } from "zod";

export const DOCUMENT_TYPES = ["dni", "ce", "passport"] as const;

export const DOCUMENT_TYPE_LABELS = {
  dni: "DNI",
  ce: "Carné de extranjería",
  passport: "Pasaporte",
} satisfies Record<(typeof DOCUMENT_TYPES)[number], string>;

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
} satisfies Record<(typeof DOCUMENT_TYPES)[number], { pattern: RegExp; message: string }>;

const NAME_PATTERN = /^[\p{L}' -]+$/u;

// Vacío → `emptyMessage`; el resto de reglas solo se evalúan si hay texto (un mensaje por campo).
const requiredText = (emptyMessage: string) => z.string().trim().min(1, emptyMessage);

const nameField = (emptyMessage: string, invalidMessage: string) =>
  requiredText(emptyMessage).pipe(
    z.string().min(2, invalidMessage).max(50, invalidMessage).regex(NAME_PATTERN, invalidMessage),
  );

const emailField = requiredText("Ingresa tu correo electrónico").pipe(
  z.email("Ingresa un correo electrónico válido"),
);

const PASSWORD_CHARSET_MESSAGE = "La contraseña debe incluir al menos una letra y un número";

export const authUserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const registerSchema = z
  .object({
    firstName: nameField("Ingresa tus nombres", "Ingresa un nombre válido"),
    lastName: nameField("Ingresa tus apellidos", "Ingresa un apellido válido"),
    email: emailField,
    phone: requiredText("Ingresa tu número de celular").pipe(
      z.string().regex(/^9\d{8}$/, "Ingresa un celular válido de 9 dígitos que empiece con 9"),
    ),
    documentType: z.enum(DOCUMENT_TYPES),
    documentNumber: requiredText("Ingresa tu número de documento"),
    password: z
      .string()
      .min(1, "Ingresa una contraseña")
      .pipe(
        z
          .string()
          .min(8, "La contraseña debe tener al menos 8 caracteres")
          .regex(/[A-Za-z]/, PASSWORD_CHARSET_MESSAGE)
          .regex(/\d/, PASSWORD_CHARSET_MESSAGE),
      ),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    acceptTerms: z
      .boolean()
      .refine((value) => value, "Debes aceptar los Términos y condiciones y la Política de privacidad"),
    marketingOptIn: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const rule = DOCUMENT_RULES[data.documentType];
    if (data.documentNumber && !rule.pattern.test(data.documentNumber)) {
      ctx.addIssue({ code: "custom", path: ["documentNumber"], message: rule.message });
    }
    if (data.confirmPassword && data.confirmPassword !== data.password) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden",
      });
    }
  });
