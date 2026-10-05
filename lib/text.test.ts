import { describe, expect, it } from "vitest";
import { normalizeText, slugify } from "./text";

describe("normalizeText", () => {
  it("quita tildes y diéresis y pasa a minúsculas", () => {
    expect(normalizeText("Perú Ñandú PINGÜINO")).toBe("peru nandu pinguino");
  });

  it("conserva espacios y signos", () => {
    expect(normalizeText("Hola, ¿qué tal?")).toBe("hola, ¿que tal?");
  });
});

describe("slugify", () => {
  it.each([
    ["Festival de Verano 2026", "festival-de-verano-2026"],
    ["¡Concierto  Único!", "concierto-unico"],
    ["  Teatro: Hamlet & Ofelia  ", "teatro-hamlet-ofelia"],
    ["Año Nuevo en Cusco", "ano-nuevo-en-cusco"],
    ["---", ""],
    ["!!!", ""],
  ])("%j → %j", (text, slug) => {
    expect(slugify(text)).toBe(slug);
  });
});
