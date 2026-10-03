import type { z } from "zod";
import type {
  COMPLAINT_ITEM_TYPES,
  COMPLAINT_TYPES,
  complaintFormSchema,
  complaintReceiptSchema,
} from "../schemas/complaint.schema";
import type { legalDocumentKindSchema, legalDocumentSchema } from "../schemas/legal.schema";

export type LegalDocumentKind = z.infer<typeof legalDocumentKindSchema>;
export type LegalDocument = z.infer<typeof legalDocumentSchema>;

export type LegalSection = { id: string; title: string };

export type ComplaintItemType = (typeof COMPLAINT_ITEM_TYPES)[number];
export type ComplaintType = (typeof COMPLAINT_TYPES)[number];
export type ComplaintFormValues = z.input<typeof complaintFormSchema>;
export type ComplaintFormData = z.output<typeof complaintFormSchema>;
export type ComplaintReceipt = z.infer<typeof complaintReceiptSchema>;
