import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EVENTS_MOCK } from "../data/events.mock";
import { eventDetailSchema } from "../schemas/events.schema";
import { EventDetailHeader } from "./EventDetailHeader";

// La server action no se ejecuta en jsdom: `EventEditLink` tiene su propio test.
vi.mock("@/modules/organizer/editLink", () => ({ getEventEditHref: vi.fn().mockResolvedValue(null) }));

const COVER = "https://cdn.example.org/x.jpg";
const event = eventDetailSchema.parse({ ...EVENTS_MOCK[0], imageUrl: COVER });

afterEach(cleanup);

describe("EventDetailHeader", () => {
  it("portada de otro dominio: la img usa la URL tal cual, sin pasar por /_next/image", () => {
    const { container } = render(<EventDetailHeader event={event} />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("alt")).toBe(`${event.title} en ${event.venue}, ${event.city}`);
    expect(img.getAttribute("src")).toBe(COVER);
    expect(img.getAttribute("srcset")).toBeNull();
  });

  it("muestra el nombre de la categoría en la miga y enlaza al filtro por slug", () => {
    const { getAllByText } = render(<EventDetailHeader event={{ ...event, category: "bar-shop", categoryName: "Bares" }} />);
    const labels = getAllByText("Bares");
    expect(labels).toHaveLength(1);
    expect(labels[0].closest("a")?.getAttribute("href")).toBe("/eventos?categoria=bar-shop");
  });

  it("portada limpia: el título, la fecha y Guardar/Compartir quedan fuera del contenedor de la imagen", () => {
    const { container, getByRole } = render(<EventDetailHeader event={event} />);
    const cover = (container.querySelector("img") as HTMLImageElement).parentElement as HTMLElement;
    expect(cover.querySelector("h1, time, button")).toBeNull();
    const title = getByRole("heading", { level: 1, name: event.title });
    const row = title.parentElement as HTMLElement;
    expect(row.querySelector('[aria-label="Guardar evento"]')).not.toBeNull();
  });

  it("no repite el CTA de compra en el hero: la tarjeta de entradas ya lo ofrece", () => {
    const { queryByRole } = render(<EventDetailHeader event={event} />);
    expect(queryByRole("link", { name: /Comprar entradas|Ver entradas/ })).toBeNull();
  });

  it("agotado: muestra «Entradas agotadas»", () => {
    const { getByText } = render(<EventDetailHeader event={{ ...event, status: "sold-out" }} />);
    expect(getByText("Entradas agotadas")).toBeTruthy();
  });

  it("sin cambio de fecha no hay aviso", () => {
    const { queryByText } = render(<EventDetailHeader event={event} />);
    expect(queryByText(/Fecha actualizada/)).toBeNull();
  });

  it("con schedule_changed_at muestra «Fecha actualizada el …» en hora de Lima", () => {
    // 03:30 UTC del 6 de octubre = 22:30 del lunes 5 de octubre en Lima.
    const scheduleChangedAt = "2026-10-06T03:30:00.000Z";
    const { getByText } = render(
      <EventDetailHeader event={{ ...event, scheduleChangedAt }} />,
    );
    const notice = getByText(/Fecha actualizada el/);
    expect(notice.textContent).toBe("Fecha actualizada el lunes 5 de octubre");
    expect(notice.querySelector("time")?.getAttribute("dateTime")).toBe(scheduleChangedAt);
  });
});
