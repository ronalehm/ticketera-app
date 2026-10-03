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
import { isCardExpired, isLuhnValid } from "../utils/card";

export const PAYMENT_METHODS = ["card", "yape", "pagoefectivo"] as const;

export const PAYMENT_METHOD_LABELS = {
  card: "Tarjeta",
  yape: "Yape",
  pagoefectivo: "PagoEfectivo",
} satisfies Record<(typeof PAYMENT_METHODS)[number], string>;

const removeSpaces = (value: string) => value.replace(/\s/g, "");

// Cada campo da un solo mensaje: vacío → regla de formato → regla de negocio (encadenadas con `pipe`).
export const cardDetailsSchema = z.object({
  cardNumber: requiredText("Ingresa el número de tarjeta")
    .transform(removeSpaces)
    .pipe(
      z
        .string()
        .refine((digits) => /^\d{16}$/.test(digits) && isLuhnValid(digits), "Ingresa un número de tarjeta válido"),
    ),
  cardExpiry: requiredText("Ingresa la fecha de vencimiento")
    .pipe(z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Ingresa una fecha válida (MM/AA)"))
    .pipe(z.string().refine((expiry) => !isCardExpired(expiry), "La tarjeta está vencida")),
  cardCvv: requiredText("Ingresa el CVV").pipe(z.string().regex(/^\d{3,4}$/, "El CVV debe tener 3 o 4 dígitos")),
  cardName: nameField("Ingresa el nombre que figura en la tarjeta", "Ingresa un nombre válido"),
});

export const checkoutFormSchema = z
  .object({
    firstName: nameField("Ingresa tus nombres", "Ingresa un nombre válido"),
    lastName: nameField("Ingresa tus apellidos", "Ingresa un apellido válido"),
    email: emailField,
    phone: phoneField,
    documentType: z.enum(DOCUMENT_TYPES),
    documentNumber: requiredText("Ingresa tu número de documento"),
    paymentMethod: z.enum(PAYMENT_METHODS),
    // Solo dígitos en la salida (el campo se muestra en grupos de 4); se valida en `superRefine`.
    cardNumber: z.string().transform(removeSpaces),
    cardExpiry: z.string(),
    cardCvv: z.string(),
    cardName: z.string(),
    acceptTerms: acceptTermsField,
  })
  .superRefine((data, ctx) => {
    const documentNumberError = getDocumentNumberError(data.documentType, data.documentNumber);
    if (documentNumberError) {
      ctx.addIssue({ code: "custom", path: ["documentNumber"], message: documentNumberError });
    }
    if (data.paymentMethod !== "card") return;
    const card = cardDetailsSchema.safeParse(data);
    for (const issue of card.error?.issues ?? []) {
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
  });

export const orderCodeSchema = z.string().regex(/^MT-[A-Z0-9]{6}$/);
