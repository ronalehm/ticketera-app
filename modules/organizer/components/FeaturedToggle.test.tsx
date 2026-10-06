import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setEventFeaturedAction } from "../actions/eventFeatured.actions";
import { EventFeaturedControl } from "./EventFeaturedControl";
import { FeaturedToggle } from "./FeaturedToggle";

vi.mock("../actions/eventFeatured.actions", () => ({ setEventFeaturedAction: vi.fn() }));

const EVENT_ID = "e0000000-0000-4000-8000-000000000001";

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("FeaturedToggle", () => {
  it.each([
    [false, "Destacar", "false", false],
    [true, "Quitar destacado", "true", true],
  ])("featured=%s → «%s», aria-pressed=%s y estrella rellena=%s, 44 px", (featured, label, pressed, filled) => {
    const onClick = vi.fn();
    render(<FeaturedToggle featured={featured} onClick={onClick} />);
    const button = screen.getByRole("button", { name: label });
    expect(button.getAttribute("aria-pressed")).toBe(pressed);
    expect(button.className).toContain("h-11");
    expect(button.querySelector("svg")?.getAttribute("class")?.includes("fill-current")).toBe(filled);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("EventFeaturedControl (Editar)", () => {
  function renderControl(featured: boolean) {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <EventFeaturedControl userId="user-admin" eventId={EVENT_ID} featured={featured} />
      </QueryClientProvider>,
    );
  }

  it("destaca, cambia el botón y lo anuncia en la región viva", async () => {
    vi.mocked(setEventFeaturedAction).mockResolvedValue({ ok: true, featured: true });
    renderControl(false);

    fireEvent.click(screen.getByRole("button", { name: "Destacar" }));
    expect(await screen.findByText("Evento destacado.")).toBeTruthy();
    expect(setEventFeaturedAction).toHaveBeenCalledWith(EVENT_ID, true);
    expect(screen.getByRole("button", { name: "Quitar destacado" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Evento destacado.").getAttribute("aria-live")).toBe("polite");
  });

  it("quita el destacado", async () => {
    vi.mocked(setEventFeaturedAction).mockResolvedValue({ ok: true, featured: false });
    renderControl(true);
    fireEvent.click(screen.getByRole("button", { name: "Quitar destacado" }));
    expect(await screen.findByText("Evento retirado de destacados.")).toBeTruthy();
    expect(setEventFeaturedAction).toHaveBeenCalledWith(EVENT_ID, false);
  });

  it("si falla, muestra el error y no cambia el estado", async () => {
    vi.mocked(setEventFeaturedAction).mockResolvedValue({ ok: false, error: "El evento no existe o no tienes acceso a él." });
    renderControl(false);
    fireEvent.click(screen.getByRole("button", { name: "Destacar" }));
    await waitFor(() => expect(screen.getByText("El evento no existe o no tienes acceso a él.")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Destacar" }).getAttribute("aria-pressed")).toBe("false");
  });
});
