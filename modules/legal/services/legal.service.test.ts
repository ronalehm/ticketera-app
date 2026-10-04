import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { LEGAL_PROVIDER } from "../data/legalProvider";
import { LEGAL_DOCUMENT_KINDS } from "../schemas/legal.schema";
import { getCurrentLegalDocument, getLegalVersions } from "./legal.service";

// El service lee este array: cada test lo rellena con datos de prueba o con los datos reales.
const mockData = vi.hoisted(() => ({ documents: [] as unknown[] }));
vi.mock("../data/legalDocuments.mock", () => ({ LEGAL_DOCUMENTS_MOCK: mockData.documents }));

const { LEGAL_DOCUMENTS_MOCK: REAL_DOCUMENTS } = await vi.importActual<
  typeof import("../data/legalDocuments.mock")
>("../data/legalDocuments.mock");

const NOW = new Date("2026-10-01T12:00:00-05:00");

function useDocuments(documents: unknown[]) {
  mockData.documents.splice(0, mockData.documents.length, ...documents);
}

function doc(kind: string, version: number, publishedAt: string) {
  return { id: `${kind}-v${version}`, kind, version, publishedAt, content: `## Sección\n\nTexto v${version}.` };
}

describe("legal.service", () => {
  beforeEach(() => useDocuments([]));

  describe("con datos de prueba", () => {
    it("devuelve la mayor versión ya publicada e ignora las futuras", async () => {
      useDocuments([
        doc("terms", 1, "2026-01-01T00:00:00-05:00"),
        doc("terms", 3, "2026-12-01T00:00:00-05:00"),
        doc("terms", 2, "2026-06-01T00:00:00-05:00"),
        doc("privacy", 5, "2026-06-01T00:00:00-05:00"),
      ]);

      const document = await getCurrentLegalDocument("terms", NOW);

      expect(document?.id).toBe("terms-v2");
      expect(document?.version).toBe(2);
    });

    it("considera vigente una versión publicada justo en `now`", async () => {
      useDocuments([doc("terms", 1, "2026-10-01T12:00:00-05:00")]);

      expect((await getCurrentLegalDocument("terms", NOW))?.version).toBe(1);
    });

    it("devuelve null si solo hay una versión futura", async () => {
      useDocuments([doc("terms", 1, "2026-12-01T00:00:00-05:00")]);

      expect(await getCurrentLegalDocument("terms", NOW)).toBeNull();
    });

    it("devuelve null si el kind no tiene versiones", async () => {
      useDocuments([doc("privacy", 1, "2026-01-01T00:00:00-05:00")]);

      expect(await getCurrentLegalDocument("terms", NOW)).toBeNull();
    });

    it("getLegalVersions devuelve la versión vigente de cada kind pedido", async () => {
      useDocuments([
        doc("terms", 1, "2026-01-01T00:00:00-05:00"),
        doc("terms", 2, "2026-06-01T00:00:00-05:00"),
        doc("privacy", 1, "2026-01-01T00:00:00-05:00"),
        doc("privacy", 2, "2026-12-01T00:00:00-05:00"),
        doc("cookies", 4, "2026-01-01T00:00:00-05:00"),
      ]);

      expect(await getLegalVersions(["terms", "privacy"], NOW)).toEqual({ terms: 2, privacy: 1 });
    });

    it("getLegalVersions lanza un error si falta la versión vigente de un kind", async () => {
      useDocuments([
        doc("terms", 1, "2026-01-01T00:00:00-05:00"),
        doc("privacy", 1, "2026-12-01T00:00:00-05:00"),
      ]);

      await expect(getLegalVersions(["terms", "privacy"], NOW)).rejects.toThrow(
        "No hay versión vigente de privacy",
      );
    });

    it("lanza un error de zod si los datos no son válidos", async () => {
      useDocuments([{ ...doc("terms", 1, "2026-01-01T00:00:00-05:00"), content: "# Título\n\nTexto." }]);

      await expect(getCurrentLegalDocument("terms", NOW)).rejects.toBeInstanceOf(ZodError);
    });
  });

  describe("con los datos reales", () => {
    beforeEach(() => useDocuments(REAL_DOCUMENTS));

    it("cada uno de los 6 kind tiene exactamente una versión vigente", async () => {
      const documents = await Promise.all(LEGAL_DOCUMENT_KINDS.map((kind) => getCurrentLegalDocument(kind, NOW)));

      expect(documents.map((document) => document?.kind)).toEqual([...LEGAL_DOCUMENT_KINDS]);
      expect(REAL_DOCUMENTS).toHaveLength(LEGAL_DOCUMENT_KINDS.length);
      expect(await getLegalVersions(LEGAL_DOCUMENT_KINDS, NOW)).toEqual({
        terms: 1,
        privacy: 1,
        cookies: 1,
        refunds: 1,
        marketing: 1,
        international_transfer: 1,
      });
    });

    it("todos empiezan con el aviso de borrador legal", async () => {
      for (const kind of LEGAL_DOCUMENT_KINDS) {
        const document = await getCurrentLegalDocument(kind, NOW);
        expect(document?.content.startsWith("> **Borrador legal:**"), kind).toBe(true);
      }
    });

    it("ningún dato del proveedor aparece sin el prefijo [EJEMPLO]", async () => {
      const contents = await Promise.all(
        LEGAL_DOCUMENT_KINDS.map(async (kind) => (await getCurrentLegalDocument(kind, NOW))?.content ?? ""),
      );
      const allContent = contents.join("\n");

      for (const value of Object.values(LEGAL_PROVIDER)) {
        const raw = value.replace("[EJEMPLO] ", "");
        const occurrences = allContent.split(raw).length - 1;
        const prefixed = allContent.split(value).length - 1;
        expect(occurrences, raw).toBeGreaterThan(0);
        expect(prefixed, raw).toBe(occurrences);
      }
    });

    it("la política de devoluciones contiene las tres reglas del sistema", async () => {
      const content = (await getCurrentLegalDocument("refunds", NOW))?.content;

      expect(content).toContain(
        "Si el evento se cancela, te devolvemos el 100 % del precio pagado de forma automática, al mismo medio de pago, sin que tengas que solicitarlo.",
      );
      expect(content).toContain("Plazo de devolución: [POR DEFINIR] días hábiles");
      expect(content).toContain(
        "Puedes solicitar la devolución de tu entrada; un administrador de Mentec Tickets evaluará tu solicitud y te responderá por correo.",
      );
      expect(content).toContain("Cómo solicitarla: [POR DEFINIR]");
      expect(content).toContain(
        "No se reembolsan entradas ya usadas (validadas en el acceso al evento) ni entradas de eventos ya liquidados (cuando lo recaudado ya se pagó al organizador).",
      );
    });

    it("términos tiene 13 secciones y cookies incluye la tabla GFM", async () => {
      const terms = (await getCurrentLegalDocument("terms", NOW))?.content ?? "";
      const cookies = (await getCurrentLegalDocument("cookies", NOW))?.content ?? "";

      expect(terms.match(/^## /gm)).toHaveLength(13);
      expect(cookies).toContain("| Nombre | Finalidad | Tipo | Duración |");
    });
  });
});
