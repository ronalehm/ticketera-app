import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EVENTS_MOCK } from "../data/events.mock";
import { eventDetailSchema } from "../schemas/events.schema";
import { EventDetailHeader } from "./EventDetailHeader";

const COVER = "https://cdn.example.org/x.jpg";
const event = eventDetailSchema.parse({ ...EVENTS_MOCK[0], imageUrl: COVER });

afterEach(cleanup);

describe("EventDetailHeader", () => {
  it("portada de otro dominio: la img usa la URL tal cual, sin pasar por /_next/image", () => {
    const { container } = render(<EventDetailHeader event={event} purchaseHref={`/eventos/${event.slug}/entradas`} />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("alt")).toBe(`${event.title} en ${event.venue}, ${event.city}`);
    expect(img.getAttribute("src")).toBe(COVER);
    expect(img.getAttribute("srcset")).toBeNull();
  });

  it("muestra el nombre de la categoría en la miga y la badge, y enlaza al filtro por slug", () => {
    const { getAllByText } = render(
      <EventDetailHeader event={{ ...event, category: "bar-shop", categoryName: "Bares" }} purchaseHref="#entradas" />,
    );
    const labels = getAllByText("Bares");
    expect(labels).toHaveLength(2);
    expect(labels[0].closest("a")?.getAttribute("href")).toBe("/eventos?categoria=bar-shop");
  });
});
