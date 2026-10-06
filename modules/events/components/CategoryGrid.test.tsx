import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { CategoryGrid } from "./CategoryGrid";

afterEach(cleanup);

const categories = [
  { id: "00000000-0000-4000-8000-000000000001", slug: "cafe-shop", name: "Café" },
  { id: "00000000-0000-4000-8000-000000000002", slug: "tecnologia", name: "Tecnología" },
];

it("CategoryGrid lista las categorías de la BD con enlace a /eventos y Tag como icono de respaldo", () => {
  render(<CategoryGrid categories={categories} />);
  const links = screen.getAllByRole("link");
  expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
    ["Café", "/eventos?categoria=cafe-shop"],
    ["Tecnología", "/eventos?categoria=tecnologia"],
  ]);
  expect(links[0].querySelector("svg")?.getAttribute("class")).toContain("lucide-coffee");
  expect(links[1].querySelector("svg")?.getAttribute("class")).toContain("lucide-tag");
});
