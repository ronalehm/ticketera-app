import { LEGAL_DOCUMENTS_MOCK } from "../data/legalDocuments.mock";
import { legalDocumentSchema } from "../schemas/legal.schema";
import type { LegalDocument, LegalDocumentKind } from "../types/legal.types";

// Mock por ahora: se reemplazará por la API sin cambiar la firma.

/** Versión vigente: la de mayor `version` entre las ya publicadas (`publishedAt <= now`). Las futuras se ignoran. */
export async function getCurrentLegalDocument(
  kind: LegalDocumentKind,
  now = new Date(),
): Promise<LegalDocument | null> {
  return legalDocumentSchema
    .array()
    .parse(LEGAL_DOCUMENTS_MOCK)
    .filter((document) => document.kind === kind && Date.parse(document.publishedAt) <= now.getTime())
    .reduce<LegalDocument | null>(
      (current, document) => (current && current.version >= document.version ? current : document),
      null,
    );
}

/** Versión vigente de cada `kind`. Que falte alguna es un error de configuración. */
export async function getLegalVersions<K extends LegalDocumentKind>(
  kinds: readonly K[],
  now = new Date(),
): Promise<Record<K, number>> {
  const entries = await Promise.all(
    kinds.map(async (kind) => {
      const document = await getCurrentLegalDocument(kind, now);
      if (!document) throw new Error(`No hay versión vigente de ${kind}`);
      return [kind, document.version] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<K, number>;
}
