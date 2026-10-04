import { expect, it } from "vitest";
import { getSafeRedirect } from "./getSafeRedirect";

it.each(["/mis-entradas", "/organizador/eventos?page=2#top", "/"])("devuelve la ruta interna %s igual", (url) => {
  expect(getSafeRedirect(url)).toBe(url);
});

it.each([null, undefined, "", "https://x.com", "//x.com", "/\\x.com", "/\t/x.com", "//[", "javascript:alert(1)", "mis-entradas"])(
  "%j → /perfil",
  (url) => {
    expect(getSafeRedirect(url)).toBe("/perfil");
  },
);

it("usa el fallback indicado", () => {
  expect(getSafeRedirect("//x.com", "/")).toBe("/");
});

it("devuelve la URL normalizada, no la cadena original", () => {
  expect(getSafeRedirect("/a/../mis-entradas?x=1")).toBe("/mis-entradas?x=1");
  expect(getSafeRedirect("/mis\r\n-entradas")).toBe("/mis-entradas");
});

it("mantiene escapado %0D%0A (no lo convierte en un salto de línea)", () => {
  const result = getSafeRedirect("/mis-entradas%0D%0ASet-Cookie:x=1");
  expect(result).toBe("/mis-entradas%0D%0ASet-Cookie:x=1");
  expect(result).not.toMatch(/[\r\n]/);
});
