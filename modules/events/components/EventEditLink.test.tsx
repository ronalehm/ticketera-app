import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getEventEditHref } from "@/modules/organizer/editLink";
import { EventEditLink } from "./EventEditLink";

vi.mock("@/modules/organizer/editLink", () => ({ getEventEditHref: vi.fn() }));

const EVENT_ID = "8f1c2a4e-0000-8000-8000-000000000001";
const HREF = `/organizador/eventos/${EVENT_ID}/editar`;

afterEach(() => {
  cleanup();
  vi.mocked(getEventEditHref).mockReset();
});

describe("EventEditLink", () => {
  it("con href (dueño o admin): enlace «Editar evento» a la edición, tras pedirlo con el id del evento", async () => {
    vi.mocked(getEventEditHref).mockResolvedValue(HREF);
    render(<EventEditLink eventId={EVENT_ID} />);

    const link = await screen.findByRole("link", { name: "Editar evento" });
    expect(link.getAttribute("href")).toBe(HREF);
    expect(link.className).toContain("h-11");
    expect(getEventEditHref).toHaveBeenCalledWith(EVENT_ID);
  });

  it("sin href (otro organizador, customer o visitante): no renderiza nada", async () => {
    vi.mocked(getEventEditHref).mockResolvedValue(null);
    const { container } = render(<EventEditLink eventId={EVENT_ID} />);

    await waitFor(() => expect(getEventEditHref).toHaveBeenCalledTimes(1));
    expect(container.innerHTML).toBe("");
  });

  it("si la acción falla, no hay botón", async () => {
    vi.mocked(getEventEditHref).mockRejectedValue(new Error("network"));
    const { container } = render(<EventEditLink eventId={EVENT_ID} />);

    await waitFor(() => expect(getEventEditHref).toHaveBeenCalledTimes(1));
    expect(container.innerHTML).toBe("");
  });
});
