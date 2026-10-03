import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentLegalDocument, LegalDocumentView } from "@/modules/legal";

export const metadata: Metadata = { title: "Términos y condiciones | Mentec Tickets" };

export default async function TermsPage() {
  const document = await getCurrentLegalDocument("terms");
  if (!document) notFound();

  return <LegalDocumentView document={document} />;
}
