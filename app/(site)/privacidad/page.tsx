import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentLegalDocument, LegalDocumentView } from "@/modules/legal";

export const metadata: Metadata = { title: "Política de privacidad | Mentec Tickets" };

export default async function PrivacyPage() {
  const [document, internationalTransfer, marketing] = await Promise.all([
    getCurrentLegalDocument("privacy"),
    getCurrentLegalDocument("international_transfer"),
    getCurrentLegalDocument("marketing"),
  ]);
  if (!document || !internationalTransfer || !marketing) notFound();

  return (
    <LegalDocumentView
      document={document}
      annexes={[
        { id: "transferencia-internacional", document: internationalTransfer },
        { id: "publicidad", document: marketing },
      ]}
    />
  );
}
