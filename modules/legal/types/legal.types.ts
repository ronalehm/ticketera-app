import type { z } from "zod";
import type { legalDocumentKindSchema, legalDocumentSchema } from "../schemas/legal.schema";

export type LegalDocumentKind = z.infer<typeof legalDocumentKindSchema>;
export type LegalDocument = z.infer<typeof legalDocumentSchema>;

export type LegalSection = { id: string; title: string };
