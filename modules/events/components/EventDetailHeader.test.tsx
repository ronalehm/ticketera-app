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

  it("no muestra el aviso «Fecha actualizada» aunque el evento haya cambiado de horario (Ronald, 2026-10-08)", () => {
    const { queryByText } = render(
      <EventDetailHeader event={{ ...event, scheduleChangedAt: "2026-10-06T03:30:00.000Z" }} />,
    );
    expect(queryByText(/Fecha actualizada/)).toBeNull();
  });
});
