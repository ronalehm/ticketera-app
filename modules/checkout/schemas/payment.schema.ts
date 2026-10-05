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

export const PAYMENT_METHODS = ["card", "yape", "pagoefectivo"] as const;

export const PAYMENT_METHOD_LABELS = {
  card: "Tarjeta",
  yape: "Yape",
  pagoefectivo: "PagoEfectivo",
} satisfies Record<(typeof PAYMENT_METHODS)[number], string>;

// Datos del comprador: los comparten el formulario y la acción de pago (`payOrder`).
export const checkoutBuyerSchema = z
  .object({
    firstName: nameField("Ingresa tus nombres", "Ingresa un nombre válido"),
    lastName: nameField("Ingresa tus apellidos", "Ingresa un apellido válido"),
    email: emailField,
    phone: phoneField,
    documentType: z.enum(DOCUMENT_TYPES),
    documentNumber: requiredText("Ingresa tu número de documento"),
    acceptTerms: acceptTermsField,
  })
  .superRefine((data, ctx) => {
    const message = getDocumentNumberError(data.documentType, data.documentNumber);
    if (message) ctx.addIssue({ code: "custom", path: ["documentNumber"], message });
  });

// `z.object` descarta las claves extra (`amount`, `total`…): el importe sale siempre de la BD.
export const payOrderInputSchema = z.object({ orderId: z.uuid(), buyer: checkoutBuyerSchema });
