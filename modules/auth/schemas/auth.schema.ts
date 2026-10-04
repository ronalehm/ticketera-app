import { z } from "zod";

import {
  acceptTermsField,
  DOCUMENT_TYPES,
  getDocumentNumberError,
  phoneField,
  requiredText,
} from "@/lib/formFields";

/** "Completa tu perfil": `acceptTerms` cubre terms + privacy + international_transfer (Decisión 12). */
export const completeProfileSchema = z
  .object({
    phone: phoneField,
    documentType: z.enum(DOCUMENT_TYPES),
    documentNumber: requiredText("Ingresa tu número de documento"),
    acceptTerms: acceptTermsField,
    marketingOptIn: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const error = getDocumentNumberError(data.documentType, data.documentNumber);
    if (error) ctx.addIssue({ code: "custom", path: ["documentNumber"], message: error });
  });
