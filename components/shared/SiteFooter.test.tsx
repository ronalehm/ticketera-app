import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteFooter } from "./SiteFooter";

afterEach(cleanup);

describe("SiteFooter", () => {
  it("«Explorar» lista todas las categorías recibidas, cada una enlazada a su filtro", () => {
    render(
      <SiteFooter
        categories={[
          { slug: "bar-shop", name: "Bares" },
          { slug: "cafe-shop", name: "Café" },
          { slug: "tecnologia", name: "Tecnología" },
        ]}
      />,
    );

    const links = within(screen.getByRole("navigation", { name: "Explorar" })).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Bares", "/eventos?categoria=bar-shop"],
      ["Café", "/eventos?categoria=cafe-shop"],
      ["Tecnología", "/eventos?categoria=tecnologia"],
    ]);
  });
});
