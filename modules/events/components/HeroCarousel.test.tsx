import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EVENTS_MOCK } from "../data/events.mock";
import { eventSchema } from "../schemas/events.schema";
import { HeroCarousel } from "./HeroCarousel";

const autoplay = vi.hoisted(() => ({ name: "autoplay", options: {}, init: vi.fn(), destroy: vi.fn(), play: vi.fn(), stop: vi.fn() }));
vi.mock("embla-carousel-autoplay", () => ({ default: () => autoplay }));

const events = EVENTS_MOCK.filter((event) => event.featured).map((event) => eventSchema.parse(event));

// jsdom no trae los observers que usa Embla.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query === "(prefers-reduced-motion: reduce)",
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", NoopObserver);
  vi.stubGlobal("IntersectionObserver", NoopObserver);
  stubReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function expectTitle() {
  expect(screen.getByRole("heading", { level: 1, name: "Encuentra tu próximo plan en vivo" })).toBeTruthy();
  expect(screen.getByText("Conciertos, teatro, deportes y más en todo el Perú.")).toBeTruthy();
}

describe("HeroCarousel", () => {
  it("sin destacados muestra solo el título y el subtítulo, sin carrusel", () => {
    render(<HeroCarousel events={[]} />);
    expectTitle();
    expect(screen.queryByRole("region", { name: "Eventos en portada" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Comprar entradas" })).toBeNull();
  });

  it("con un destacado muestra su portada sin flechas, puntos ni autoplay", () => {
    render(<HeroCarousel events={[events[0]]} />);
    expectTitle();
    expect(screen.getByRole("heading", { level: 2, name: events[0].title })).toBeTruthy();
    expect(screen.getByText(events[0].categoryName)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Comprar entradas" }).getAttribute("href")).toBe(`/eventos/${events[0].slug}`);
    expect(screen.queryByRole("region", { name: "Eventos en portada" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Slide anterior" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Ir al slide/ })).toBeNull();
    expect(autoplay.play).not.toHaveBeenCalled();
  });

  it("con varios destacados muestra el carrusel con flechas, un punto por evento y autoplay", async () => {
    render(<HeroCarousel events={events} />);
    expectTitle();
    expect(screen.getByRole("region", { name: "Eventos en portada" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slide anterior" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slide siguiente" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Ir al slide/ })).toHaveLength(events.length);
    await vi.waitFor(() => expect(autoplay.play).toHaveBeenCalled());
  });

  it("con movimiento reducido el carrusel no arranca el autoplay", async () => {
    stubReducedMotion(true);
    render(<HeroCarousel events={events} />);
    // El efecto que decide el autoplay corre en cuanto Embla entrega la API (tras su `init`).
    await vi.waitFor(() => expect(autoplay.init).toHaveBeenCalled());
    expect(autoplay.play).not.toHaveBeenCalled();
  });
});
