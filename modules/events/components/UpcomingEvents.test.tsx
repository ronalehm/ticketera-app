import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EVENTS_MOCK } from "../data/events.mock";
import { eventSchema } from "../schemas/events.schema";
import { UpcomingEvents } from "./UpcomingEvents";

afterEach(cleanup);

const events = EVENTS_MOCK.map((event) => eventSchema.parse(event));
const categories = [
  { id: "00000000-0000-4000-8000-000000000001", slug: "teatro", name: "Teatro" },
  { id: "00000000-0000-4000-8000-000000000002", slug: "tecnologia", name: "Tecnología" },
];

const chips = () => within(screen.getByRole("group", { name: "Filtrar por categoría" })).getAllByRole("button");
const cards = () => screen.queryAllByRole("listitem");

describe("UpcomingEvents", () => {
  it("muestra «Todos» y un chip por categoría de la BD, con «Todos» activo", () => {
    render(<UpcomingEvents events={events} categories={categories} />);
    expect(chips().map((chip) => chip.textContent)).toEqual(["Todos", "Teatro", "Tecnología"]);
    expect(chips()[0].getAttribute("aria-pressed")).toBe("true");
    expect(cards()).toHaveLength(events.length);
  });

  it("filtra por la categoría elegida y vuelve a «Todos» al deseleccionarla", () => {
    render(<UpcomingEvents events={events} categories={categories} />);
    fireEvent.click(screen.getByRole("button", { name: "Teatro" }));
    expect(cards()).toHaveLength(events.filter((event) => event.category === "teatro").length);

    fireEvent.click(screen.getByRole("button", { name: "Teatro" }));
    expect(screen.getByRole("button", { name: "Todos" }).getAttribute("aria-pressed")).toBe("true");
    expect(cards()).toHaveLength(events.length);
  });

  it("una categoría sin eventos muestra el aviso vacío", () => {
    render(<UpcomingEvents events={events} categories={categories} />);
    fireEvent.click(screen.getByRole("button", { name: "Tecnología" }));
    expect(screen.getByText("No hay eventos en esta categoría por ahora.")).toBeTruthy();
  });
});
