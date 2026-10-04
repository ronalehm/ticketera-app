import { z } from "zod";
import type { LegalDocumentKind } from "../types/legal.types";
import { getLegalSections } from "../utils/legalSections";

export const LEGAL_DOCUMENT_KINDS = [
  "terms",
  "privacy",
  "cookies",
  "refunds",
  "marketing",
  "international_transfer",
] as const;

export const legalDocumentKindSchema = z.enum(LEGAL_DOCUMENT_KINDS);

/** Etiquetas de UI: el título no se guarda en BD. */
export const LEGAL_DOCUMENT_TITLES = {
  terms: "Términos y condiciones",
  privacy: "Política de privacidad",
  cookies: "Política de cookies",
  refunds: "Política de garantía y devoluciones",
  marketing: "Uso de datos con fines publicitarios",
  international_transfer: "Transferencia internacional de datos personales",
} satisfies Record<LegalDocumentKind, string>;

// Mismo criterio de sangría que `getLegalSections`.
const LEVEL_ONE_HEADING = /^ {0,3}# /;

/** Markdown del documento: sin títulos `#` (el h1 lo pone la página) y con secciones `##` de id único. */
export const legalContentSchema = z
  .string()
  .trim()
  .min(1, "El contenido no puede estar vacío")
  .superRefine((content, ctx) => {
    if (content.split(/\r?\n/).some((line) => LEVEL_ONE_HEADING.test(line))) {
      ctx.addIssue({ code: "custom", message: "No uses títulos de nivel 1 (#): el título lo pone la página" });
    }

    const seenIds = new Set<string>();
    for (const { id, title } of getLegalSections(content)) {
      if (seenIds.has(id)) {
        ctx.addIssue({ code: "custom", message: `Hay dos secciones con el mismo título: «${title}»` });
        return;
      }
      seenIds.add(id);
    }
  });

export const legalDocumentSchema = z.object({
  id: z.string().min(1),
  kind: legalDocumentKindSchema,
  version: z.number().int().positive(),
  publishedAt: z.iso.datetime({ offset: true }),
  content: legalContentSchema,
});
