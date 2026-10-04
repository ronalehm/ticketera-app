import type { LegalSection } from "../types/legal.types";

// Título `## ` de markdown (CommonMark permite hasta 3 espacios de sangría). No coincide con `#` ni con `###`.
const SECTION_HEADING = /^ {0,3}## +(.+)$/;
const INLINE_FORMAT = /\*\*|[*_`]/g;

/** "1. Información del proveedor" → "1-informacion-del-proveedor" (sin tildes, minúsculas, `-` como separador). */
export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Secciones `## ` del markdown, en orden, con el formato en línea quitado del título. */
export function getLegalSections(content: string): LegalSection[] {
  return content.split(/\r?\n/).flatMap((line) => {
    const match = SECTION_HEADING.exec(line);
    if (!match) return [];
    const title = match[1].replace(INLINE_FORMAT, "").trim();
    return [{ id: slugifyHeading(title), title }];
  });
}
