import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentLegalDocument, LegalDocumentView } from "@/modules/legal";

export const metadata: Metadata = { title: "Política de cookies | Mentec Tickets" };

export default async function CookiesPage() {
  const document = await getCurrentLegalDocument("cookies");
  if (!document) notFound();

  return <LegalDocumentView document={document} />;
}
