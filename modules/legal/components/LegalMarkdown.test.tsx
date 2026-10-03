import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LegalMarkdown } from "./LegalMarkdown";

const renderMarkdown = (content: string) => render(<LegalMarkdown content={content} />).container;

describe("LegalMarkdown", () => {
  afterEach(cleanup);

  it("da a cada `##` un h2 con el id de slugifyHeading, también con formato en línea", () => {
    const container = renderMarkdown("## 1. Información del proveedor\n\n## **2.** Objeto y `aceptación`");

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.id)).toEqual([
      "1-informacion-del-proveedor",
      "2-objeto-y-aceptacion",
    ]);
    expect(container.querySelector("h1")).toBeNull();
  });

  it("renderiza `#` como h2, nunca como h1", () => {
    const container = renderMarkdown("# Título suelto");

    expect(container.querySelector("h1")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Título suelto" }).id).toBe("titulo-suelto");
  });

  it("renderiza `###` como h3 y `####` como h4", () => {
    renderMarkdown("### Subsección\n\n#### Detalle");

    expect(screen.getByRole("heading", { level: 3, name: "Subsección" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: "Detalle" })).toBeTruthy();
  });

  it("renderiza las tablas GFM dentro de un contenedor con scroll", () => {
    const container = renderMarkdown(
      "| Nombre | Finalidad |\n| --- | --- |\n| sesión | Mantener la sesión iniciada |",
    );

    const table = screen.getByRole("table");
    expect(table.parentElement?.className).toContain("overflow-x-auto");
    expect(screen.getByRole("columnheader", { name: "Finalidad" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Mantener la sesión iniciada" })).toBeTruthy();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("enlaza las rutas internas sin `target` y las externas en una pestaña nueva", () => {
    renderMarkdown(
      "Lee la [Política de cookies](/cookies), la [sección](#publicidad), [escríbenos](mailto:legal@example.com) o visita [Indecopi](https://www.indecopi.gob.pe).",
    );

    const internal = screen.getByRole("link", { name: "Política de cookies" });
    expect(internal.getAttribute("href")).toBe("/cookies");
    expect(internal.hasAttribute("target")).toBe(false);

    const anchor = screen.getByRole("link", { name: "sección" });
    expect(anchor.getAttribute("href")).toBe("#publicidad");
    expect(anchor.hasAttribute("target")).toBe(false);

    const mail = screen.getByRole("link", { name: "escríbenos" });
    expect(mail.getAttribute("href")).toBe("mailto:legal@example.com");
    expect(mail.hasAttribute("target")).toBe(false);

    const external = screen.getByRole("link", { name: "Indecopi (se abre en una pestaña nueva)" });
    expect(external.getAttribute("href")).toBe("https://www.indecopi.gob.pe");
    expect(external.getAttribute("target")).toBe("_blank");
    expect(external.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("no interpreta el HTML crudo", () => {
    const container = renderMarkdown('Texto <b>negrita</b>\n\n<script>alert("x")</script>');

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
  });

  it("bloquea los enlaces `javascript:`", () => {
    const container = renderMarkdown("[clic](javascript:alert(1))");

    expect(container.innerHTML).not.toContain("javascript:");
  });

  it("descarta las imágenes", () => {
    const container = renderMarkdown("Antes ![x](y.png) después");

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Antes");
    expect(container.textContent).toContain("después");
  });

  it("renderiza el aviso de borrador como blockquote con su negrita", () => {
    const container = renderMarkdown(
      "> **Borrador legal:** texto base pendiente de revisión por un abogado. No constituye asesoría legal.",
    );

    const blockquote = container.querySelector("blockquote");
    expect(blockquote).not.toBeNull();
    expect(blockquote?.querySelector("strong")?.textContent).toBe("Borrador legal:");
  });

  it("aplica el className a la raíz junto con text-foreground", () => {
    const container = render(<LegalMarkdown content="Hola" className="mt-4" />).container;

    const root = container.firstElementChild;
    expect(root?.className).toContain("text-foreground");
    expect(root?.className).toContain("mt-4");
  });
});
