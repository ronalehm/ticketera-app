import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EVENTS_MOCK } from "../data/events.mock";
import { eventSchema } from "../schemas/events.schema";
import { EventCard } from "./EventCard";

const getEvent = (slug: string) => eventSchema.parse(EVENTS_MOCK.find((event) => event.slug === slug));

afterEach(cleanup);

describe("EventCard", () => {
  describe("evento disponible", () => {
    const event = getEvent("noche-de-sintetizadores-lima");

    it("no muestra el estado 'Disponible'", () => {
      render(<EventCard event={event} />);
      expect(screen.queryByText("Disponible")).toBeNull();
    });

    it("muestra la categoría, el lugar y la fecha corta con su <time>", () => {
      render(<EventCard event={event} />);
      expect(screen.getByText("Conciertos")).toBeTruthy();
      expect(screen.getByText("Estadio Nacional · Lima")).toBeTruthy();
      const time = screen.getByText("sáb 14 nov");
      expect(time.tagName).toBe("TIME");
      expect(time.getAttribute("datetime")).toBe("2026-11-14T21:00:00-05:00");
    });

    it("muestra el chip de fecha decorativo con mes y día", () => {
      render(<EventCard event={event} />);
      const chip = screen.getByText("NOV").parentElement as HTMLElement;
      expect(chip.getAttribute("aria-hidden")).toBe("true");
      expect(within(chip).getByText("14")).toBeTruthy();
    });

    it("muestra 'Desde' y el precio", () => {
      render(<EventCard event={event} />);
      expect(screen.getByText("Desde")).toBeTruthy();
      expect(screen.getByText("S/ 180.00")).toBeTruthy();
    });

    it("tiene solo dos enlaces accesibles: el título y el CTA; la imagen queda oculta", () => {
      render(<EventCard event={event} />);
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(2);
      expect(screen.getByRole("link", { name: event.title }).getAttribute("href")).toBe(
        "/eventos/noche-de-sintetizadores-lima",
      );
      const cta = screen.getByRole("link", { name: "Ver entradas de Noche de Sintetizadores: Gira Neón 2026" });
      expect(cta.getAttribute("href")).toBe("/eventos/noche-de-sintetizadores-lima");
    });
  });

  it("muestra 'Últimas entradas' cuando quedan pocas", () => {
    render(<EventCard event={getEvent("risas-sin-filtro")} />);
    expect(screen.getByText("Últimas entradas")).toBeTruthy();
  });

  it("agotado: badge 'Agotado', botón deshabilitado y sin enlace 'Ver entradas'", () => {
    render(<EventCard event={getEvent("los-ecos-del-sur-arequipa")} />);
    expect(screen.getAllByText("Agotado", { selector: "span" })).toHaveLength(1);
    const button = screen.getByRole("button", { name: "Agotado: Los Ecos del Sur en vivo" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.queryByRole("link", { name: /^Ver entradas/ })).toBeNull();
  });

  it("portada de otro dominio: la img usa la URL tal cual, sin pasar por /_next/image", () => {
    const cover = "https://cdn.example.org/x.jpg";
    const { container } = render(<EventCard event={{ ...getEvent("risas-sin-filtro"), imageUrl: cover }} />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(cover);
    expect(img.getAttribute("srcset")).toBeNull();
  });

  it("gratis: muestra 'Entrada libre' sin 'Desde'", () => {
    render(<EventCard event={getEvent("aventura-en-el-bosque-magico")} />);
    expect(screen.getByText("Entrada libre")).toBeTruthy();
    expect(screen.queryByText("Desde")).toBeNull();
  });
});
