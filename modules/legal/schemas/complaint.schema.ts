import { z } from "zod";
import {
  DOCUMENT_TYPES,
  emailField,
  getDocumentNumberError,
  nameField,
  phoneField,
  requiredText,
} from "@/lib/formFields";
import type { ComplaintItemType, ComplaintType } from "../types/legal.types";

// Hoja de reclamación según el reglamento del Libro de Reclamaciones (Indecopi).

export const COMPLAINT_ITEM_TYPES = ["product", "service"] as const;

export const COMPLAINT_ITEM_TYPE_LABELS = {
  product: "Producto",
  service: "Servicio",
} satisfies Record<ComplaintItemType, string>;

export const COMPLAINT_TYPES = ["claim", "complaint"] as const;

export const COMPLAINT_TYPE_LABELS = {
  claim: "Reclamo",
  complaint: "Queja",
} satisfies Record<ComplaintType, string>;

export const COMPLAINT_TYPE_DEFINITIONS = {
  claim: "Disconformidad relacionada a los productos o servicios.",
  complaint:
    "Disconformidad no relacionada a los productos o servicios; o malestar o descontento respecto a la atención al público.",
} satisfies Record<ComplaintType, string>;

const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

// Texto obligatorio con longitud máxima (un mensaje por campo: vacío → demasiado largo).
const limitedText = (emptyMessage: string, max: number, maxMessage: string) =>
  requiredText(emptyMessage).pipe(z.string().max(max, maxMessage));

// RadioGroup sin opción elegida (`""`) al inicio: sin elegir no vale y la salida es una de las opciones.
const requiredChoice = <const T extends readonly [string, ...string[]]>(options: T, message: string) =>
  z.enum(["", ...options]).transform((value, ctx) => {
    // Descartado `""`, el valor es una de `options` (TS no estrecha el tipo genérico).
    if (value !== "") return value as T[number];
    ctx.addIssue({ code: "custom", message });
    return z.NEVER;
  });

// Datos del padre, madre o apoderado: solo se validan si el consumidor es menor de edad.
const guardianSchema = z
  .object({
    guardianFirstName: nameField("Ingresa los nombres del padre, madre o apoderado", "Ingresa un nombre válido"),
    guardianLastName: nameField("Ingresa los apellidos del padre, madre o apoderado", "Ingresa un apellido válido"),
    guardianDocumentType: z.enum(DOCUMENT_TYPES),
    guardianDocumentNumber: requiredText("Ingresa su número de documento"),
  })
  .superRefine((data, ctx) => {
    const documentNumberError = getDocumentNumberError(data.guardianDocumentType, data.guardianDocumentNumber);
    if (documentNumberError) {
      ctx.addIssue({ code: "custom", path: ["guardianDocumentNumber"], message: documentNumberError });
    }
  });

export const complaintFormSchema = z
  .object({
    firstName: nameField("Ingresa tus nombres", "Ingresa un nombre válido"),
    lastName: nameField("Ingresa tus apellidos", "Ingresa un apellido válido"),
    documentType: z.enum(DOCUMENT_TYPES),
    documentNumber: requiredText("Ingresa tu número de documento"),
    address: limitedText("Ingresa tu domicilio", 150, "El domicilio no puede superar los 150 caracteres"),
    phone: phoneField,
    email: emailField,
    isMinor: z.boolean(),
    guardianFirstName: z.string(),
    guardianLastName: z.string(),
    guardianDocumentType: z.enum(DOCUMENT_TYPES),
    guardianDocumentNumber: z.string(),
    itemType: requiredChoice(COMPLAINT_ITEM_TYPES, "Indica si es un producto o un servicio"),
    // Opcional: vacío → `null`; si no, soles con hasta 2 decimales y punto decimal.
    amount: z
      .string()
      .trim()
      .refine((value) => value === "" || AMOUNT_PATTERN.test(value), "Ingresa un monto válido, por ejemplo 120.50")
      .transform((value) => (value === "" ? null : Number(value))),
    itemDescription: limitedText(
      "Describe el producto o servicio",
      200,
      "La descripción no puede superar los 200 caracteres",
    ),
    complaintType: requiredChoice(COMPLAINT_TYPES, "Elige si es un reclamo o una queja"),
    detail: limitedText("Describe lo ocurrido", 2000, "El detalle no puede superar los 2000 caracteres"),
    request: limitedText("Indica qué solicitas", 1000, "El pedido no puede superar los 1000 caracteres"),
  })
  .superRefine((data, ctx) => {
    const documentNumberError = getDocumentNumberError(data.documentType, data.documentNumber);
    if (documentNumberError) {
      ctx.addIssue({ code: "custom", path: ["documentNumber"], message: documentNumberError });
    }
    if (!data.isMinor) return;
    const guardian = guardianSchema.safeParse(data);
    for (const issue of guardian.error?.issues ?? []) {
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
  });

export const complaintReceiptSchema = z.object({
  code: z.string().regex(/^LR-\d{4}-\d{6}$/),
  submittedAt: z.iso.datetime({ offset: true }),
});
