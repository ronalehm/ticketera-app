import { z } from "zod";

import {
  acceptTermsField,
  DOCUMENT_TYPES,
  emailField,
  getDocumentNumberError,
  nameField,
  phoneField,
  requiredText,
} from "@/lib/formFields";

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
    phone: phoneField,
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
    acceptTerms: acceptTermsField,
    marketingOptIn: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const documentNumberError = getDocumentNumberError(data.documentType, data.documentNumber);
    if (documentNumberError) {
      ctx.addIssue({ code: "custom", path: ["documentNumber"], message: documentNumberError });
    }
    if (data.confirmPassword && data.confirmPassword !== data.password) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden",
      });
    }
  });
