import { cn } from "@/lib/utils";
import { LEGAL_DOCUMENT_TITLES } from "../schemas/legal.schema";
import type { LegalDocument } from "../types/legal.types";
import { formatLegalDate } from "../utils/formatLegalDate";
import { getLegalSections } from "../utils/legalSections";
import { LegalMarkdown } from "./LegalMarkdown";
import { LegalToc } from "./LegalToc";

// Con menos entradas el índice no aporta navegación.
const MIN_TOC_ENTRIES = 3;

type LegalAnnex = { id: string; document: LegalDocument };

function VersionLine({ document, className }: { document: LegalDocument; className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      Versión {document.version} · Vigente desde{" "}
      <time dateTime={document.publishedAt}>{formatLegalDate(document.publishedAt)}</time>
    </p>
  );
}

type LegalDocumentViewProps = {
  document: LegalDocument;
  annexes?: LegalAnnex[];
};

/** Documento legal: título, versión vigente, índice de secciones, contenido y anexos (cada uno con su versión). */
export function LegalDocumentView({ document, annexes = [] }: LegalDocumentViewProps) {
  const sections = [
    ...getLegalSections(document.content),
    ...annexes.map((annex) => ({ id: annex.id, title: LEGAL_DOCUMENT_TITLES[annex.document.kind] })),
  ];
  const hasToc = sections.length >= MIN_TOC_ENTRIES;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
      <header className="mb-8 max-w-3xl md:mb-10">
        <p className="text-xs font-bold tracking-wider text-primary-strong uppercase">Legal</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-5xl">
          {LEGAL_DOCUMENT_TITLES[document.kind]}
        </h1>
        <VersionLine document={document} className="mt-3" />
      </header>

      <div className={cn(hasToc && "lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12")}>
        {hasToc && (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <LegalToc sections={sections} />
          </aside>
        )}

        <article className="max-w-3xl min-w-0">
          <LegalMarkdown content={document.content} />

          {annexes.map((annex) => {
            const titleId = `${annex.id}-title`;
            return (
              <section
                key={annex.id}
                id={annex.id}
                aria-labelledby={titleId}
                className="mt-12 scroll-mt-24 border-t pt-10"
              >
                <h2 id={titleId} className="text-2xl font-bold tracking-tight">
                  {LEGAL_DOCUMENT_TITLES[annex.document.kind]}
                </h2>
                <VersionLine document={annex.document} className="mt-2 mb-6" />
                <LegalMarkdown content={annex.document.content} />
              </section>
            );
          })}
        </article>
      </div>
    </div>
  );
}
