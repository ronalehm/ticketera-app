import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { EventCategory } from "../types/events.types";
import { CategoryFilter } from "./CategoryFilter";

const CATEGORIES: EventCategory[] = [
  { id: "00000000-0000-4000-8000-000000000001", slug: "cafe-shop", name: "Café" },
  { id: "00000000-0000-4000-8000-000000000002", slug: "tecnologia", name: "Tecnología" },
];

const link = (name: string) => screen.getByRole("link", { name });

afterEach(cleanup);

describe("CategoryFilter", () => {
  it("muestra «Todas» y una pill por categoría de la BD, que enlaza a su slug conservando los demás filtros", () => {
    render(<CategoryFilter filters={{ q: "rock" }} categories={CATEGORIES} />);

    expect(screen.getAllByRole("link").map((item) => item.textContent)).toEqual(["Todas", "Café", "Tecnología"]);
    expect(link("Café").getAttribute("href")).toBe("/eventos?q=rock&categoria=cafe-shop");
    expect(link("Todas").getAttribute("aria-current")).toBe("page");
  });

  it("marca la pill de la única categoría seleccionada", () => {
    render(<CategoryFilter filters={{ categoria: ["tecnologia"] }} categories={CATEGORIES} />);

    expect(link("Tecnología").getAttribute("aria-current")).toBe("page");
    expect(link("Todas").getAttribute("aria-current")).toBeNull();
  });
});
