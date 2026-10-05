import { describe, expect, it } from "vitest";
import { getAccountLinks } from "./accountLinks";

const BASE = [
  { href: "/perfil", label: "Mi perfil" },
  { href: "/mis-entradas", label: "Mis entradas" },
];

function links(role: Parameters<typeof getAccountLinks>[0]) {
  return getAccountLinks(role).map(({ href, label }) => ({ href, label }));
}

describe("getAccountLinks", () => {
  it("customer → Mi perfil y Mis entradas, sin panel", () => {
    expect(links("customer")).toEqual(BASE);
  });

  it("organizer → además Panel de organizador → /organizador", () => {
    expect(links("organizer")).toEqual([...BASE, { href: "/organizador", label: "Panel de organizador" }]);
  });

  it.each(["admin", "super_admin"] as const)("%s → además Panel → /admin/usuarios", (role) => {
    expect(links(role)).toEqual([...BASE, { href: "/admin/usuarios", label: "Panel" }]);
  });
});
