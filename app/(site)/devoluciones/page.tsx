import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentLegalDocument, LegalDocumentView } from "@/modules/legal";

export const metadata: Metadata = { title: "Política de garantía y devoluciones | Mentec Tickets" };

export default async function RefundsPage() {
  const document = await getCurrentLegalDocument("refunds");
  if (!document) notFound();

  return <LegalDocumentView document={document} />;
}
