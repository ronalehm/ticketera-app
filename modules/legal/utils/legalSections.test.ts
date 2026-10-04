import { describe, expect, it } from "vitest";
import { getLegalSections, slugifyHeading } from "./legalSections";

describe("slugifyHeading", () => {
  it("quita tildes, pasa a minúsculas y separa con guiones", () => {
    expect(slugifyHeading("1. Información del proveedor")).toBe("1-informacion-del-proveedor");
  });

  it("descarta signos de interrogación", () => {
    expect(slugifyHeading("¿Qué datos recopilamos?")).toBe("que-datos-recopilamos");
  });

  it("convierte ñ y diéresis/tildes en letras simples", () => {
    expect(slugifyHeading("Año y Ñandú")).toBe("ano-y-nandu");
  });

  it("no deja guiones en los extremos ni repetidos", () => {
    expect(slugifyHeading("  ¡¡Hola --  mundo!!  ")).toBe("hola-mundo");
  });
});

describe("getLegalSections", () => {
  it("devuelve solo las secciones ## en orden e ignora ### y ####", () => {
    const content = [
      "> **Borrador legal:** texto base.",
      "",
      "## 1. Información del proveedor",
      "Texto.",
      "### Subsección",
      "#### Detalle",
      "## 2. Objeto y aceptación",
      "Más texto con ## en medio.",
    ].join("\n");

    expect(getLegalSections(content)).toEqual([
      { id: "1-informacion-del-proveedor", title: "1. Información del proveedor" },
      { id: "2-objeto-y-aceptacion", title: "2. Objeto y aceptación" },
    ]);
  });

  it("quita el formato en línea del título", () => {
    expect(getLegalSections("## **Cookies** que usamos\n## Uso de `localStorage`")).toEqual([
      { id: "cookies-que-usamos", title: "Cookies que usamos" },
      { id: "uso-de-localstorage", title: "Uso de localStorage" },
    ]);
  });

  it("devuelve una lista vacía si no hay secciones", () => {
    expect(getLegalSections("Solo un párrafo.\n\n- y una lista")).toEqual([]);
  });
});
