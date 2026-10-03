import { describe, expect, it } from "vitest";
import type { OrganizerEventFormValues } from "../types/organizer.types";
import { buildEventPreview } from "./eventPreview";

const empty: OrganizerEventFormValues = {
  intent: "publish",
  name: "",
  category: "conciertos",
  minAge: "0",
  description: "",
  organizer: "",
  date: "",
  time: "",
  doorsOpen: "",
  venue: "",
  city: "",
  address: "",
  ticketTypes: [{ id: "row-1", name: "", price: "", kind: "general", quantity: "", rows: "", seatsPerRow: "" }],
};

describe("buildEventPreview", () => {
  it("con el formulario vacío deja los marcadores en null", () => {
    expect(buildEventPreview(empty, null)).toEqual({
      title: null,
      categoryLabel: "Conciertos",
      dateLabel: null,
      dateChip: null,
      place: null,
      priceFrom: null,
      imageUrl: null,
    });
  });

  it("con el formulario completo da los textos de la tarjeta", () => {
    const values: OrganizerEventFormValues = {
      ...empty,
      name: "  Hamlet ",
      category: "teatro",
      date: "2026-12-05",
      time: "20:00",
      venue: " Teatro Municipal ",
      city: " Lima ",
      ticketTypes: [
        { id: "row-1", name: "Platea", price: "120", kind: "general", quantity: "100", rows: "", seatsPerRow: "" },
        { id: "row-2", name: "Mezanine", price: "80", kind: "general", quantity: "50", rows: "", seatsPerRow: "" },
      ],
    };
    expect(buildEventPreview(values, "blob:http://localhost/abc")).toEqual({
      title: "Hamlet",
      categoryLabel: "Teatro",
      dateLabel: "sáb 5 dic",
      dateChip: { month: "DIC", day: "05" },
      place: "Teatro Municipal · Lima",
      priceFrom: 80,
      imageUrl: "blob:http://localhost/abc",
    });
  });

  it("une lugar y ciudad con un punto medio", () => {
    expect(buildEventPreview({ ...empty, venue: "Estadio Nacional", city: "Lima" }, null).place).toBe(
      "Estadio Nacional · Lima",
    );
  });

  it("con solo la ciudad, el lugar es la ciudad", () => {
    expect(buildEventPreview({ ...empty, venue: "  ", city: "Lima" }, null).place).toBe("Lima");
  });

  it("sin hora no hay fecha ni chip", () => {
    const preview = buildEventPreview({ ...empty, date: "2026-12-05" }, null);
    expect(preview.dateLabel).toBeNull();
    expect(preview.dateChip).toBeNull();
  });

  it("con una fecha inválida no hay fecha ni chip", () => {
    const preview = buildEventPreview({ ...empty, date: "2026-13-45", time: "20:00" }, null);
    expect(preview.dateLabel).toBeNull();
    expect(preview.dateChip).toBeNull();
  });
});
