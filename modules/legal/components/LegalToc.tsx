import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LegalSection } from "../types/legal.types";

const NAV_LABEL = "Contenido del documento";

// En lg el enlace mide 36 px: el ::after suma 4 px arriba y abajo (44 px) y el `space-y-2` evita que se solapen.
const TOC_LINK =
  "relative flex min-h-11 cursor-pointer items-center rounded-sm text-sm text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:min-h-9 lg:after:absolute lg:after:inset-x-0 lg:after:-inset-y-1 lg:after:content-['']";

function TocList({ sections, className }: { sections: LegalSection[]; className?: string }) {
  return (
    <ul className={className}>
      {sections.map((section) => (
        <li key={section.id}>
          <a href={`#${section.id}`} className={TOC_LINK}>
            {section.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

type LegalTocProps = {
  sections: LegalSection[];
};

/** Índice del documento: desplegable `details` por debajo de lg y lista fija en lg (solo una de las dos se muestra). */
export function LegalToc({ sections }: LegalTocProps) {
  return (
    <>
      <details className="group mb-8 rounded-2xl bg-muted p-4 lg:hidden">
        <summary
          className={cn(
            "flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg font-semibold outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden",
          )}
        >
          Contenido
          <ChevronDown
            className="size-5 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <nav aria-label={NAV_LABEL} className="mt-2">
          <TocList sections={sections} />
        </nav>
      </details>

      <nav aria-label={NAV_LABEL} className="hidden lg:block">
        <p className="mb-3 text-xs font-bold tracking-wider uppercase">Contenido</p>
        <TocList sections={sections} className="lg:space-y-2" />
      </nav>
    </>
  );
}
