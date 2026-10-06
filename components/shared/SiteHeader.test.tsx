import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./SiteHeader";

vi.mock("@/modules/auth/header", () => ({ AuthHeaderActions: () => null }));

afterEach(cleanup);

describe("SiteHeader", () => {
  it("el nav de escritorio tiene un único enlace «Eventos» a /eventos, sin categorías", () => {
    render(<SiteHeader />);

    const links = within(screen.getByRole("navigation", { name: "Principal" })).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([["Eventos", "/eventos"]]);
    expect(screen.queryByRole("link", { name: "Conciertos" })).toBeNull();
  });
});
