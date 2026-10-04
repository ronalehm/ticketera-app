import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENT_KINDS, LEGAL_DOCUMENT_TITLES, legalContentSchema, legalDocumentSchema } from "./legal.schema";

const valid = {
  id: "terms-v1",
  kind: "terms",
  version: 1,
  publishedAt: "2026-10-01T00:00:00-05:00",
  content: "> **Borrador legal:** texto base.\n\n## 1. Objeto\nTexto.\n\n## 2. Aceptación\nTexto.",
};

// Mensajes de error del documento (lo que verá el editor).
function errors(input: unknown) {
  return legalDocumentSchema.safeParse(input).error?.issues.map((issue) => issue.message) ?? [];
}

describe("legalDocumentSchema", () => {
  it("acepta un documento válido", () => {
    expect(legalDocumentSchema.safeParse(valid).success).toBe(true);
  });

  it.each(LEGAL_DOCUMENT_KINDS)("acepta el kind %s", (kind) => {
    expect(legalDocumentSchema.safeParse({ ...valid, kind }).success).toBe(true);
  });

  it("rechaza un kind desconocido", () => {
    expect(legalDocumentSchema.safeParse({ ...valid, kind: "faq" }).success).toBe(false);
  });

  it.each([0, 1.5, -1])("rechaza la versión %s", (version) => {
    expect(legalDocumentSchema.safeParse({ ...valid, version }).success).toBe(false);
  });

  it("rechaza publishedAt sin zona horaria", () => {
    expect(legalDocumentSchema.safeParse({ ...valid, publishedAt: "2026-10-01T00:00:00" }).success).toBe(false);
  });

  it("acepta publishedAt en UTC (Z)", () => {
    expect(legalDocumentSchema.safeParse({ ...valid, publishedAt: "2026-10-01T05:00:00Z" }).success).toBe(true);
  });

  it("rechaza un id vacío", () => {
    expect(legalDocumentSchema.safeParse({ ...valid, id: "" }).success).toBe(false);
  });

  it("rechaza un contenido vacío o solo con espacios", () => {
    expect(errors({ ...valid, content: "" })).toEqual(["El contenido no puede estar vacío"]);
    expect(errors({ ...valid, content: "  \n\t " })).toEqual(["El contenido no puede estar vacío"]);
  });

  it("rechaza títulos de nivel 1", () => {
    expect(errors({ ...valid, content: "Intro.\n\n# Título\n\n## Sección" })).toEqual([
      "No uses títulos de nivel 1 (#): el título lo pone la página",
    ]);
  });

  it("no confunde ## ni ### con un título de nivel 1", () => {
    expect(legalContentSchema.safeParse("## Sección\n### Subsección\n#hashtag").success).toBe(true);
  });

  it("rechaza dos secciones ## con el mismo id e indica el título", () => {
    expect(errors({ ...valid, content: "## Datos personales\nA.\n\n## **Datos** personales\nB." })).toEqual([
      "Hay dos secciones con el mismo título: «Datos personales»",
    ]);
  });

  it("detecta duplicados que solo difieren en tildes y mayúsculas", () => {
    expect(errors({ ...valid, content: "## Información\n\n## INFORMACION" })).toEqual([
      "Hay dos secciones con el mismo título: «INFORMACION»",
    ]);
  });

  it("permite ### repetidos en secciones distintas", () => {
    expect(legalContentSchema.safeParse("## A\n### Plazo\n## B\n### Plazo").success).toBe(true);
  });
});

describe("LEGAL_DOCUMENT_TITLES", () => {
  it("tiene un título por cada kind", () => {
    expect(Object.keys(LEGAL_DOCUMENT_TITLES).sort()).toEqual([...LEGAL_DOCUMENT_KINDS].sort());
    expect(LEGAL_DOCUMENT_TITLES.refunds).toBe("Política de garantía y devoluciones");
  });
});
