import { describe, expect, it } from "vitest";
import type { OrganizerEventFormValues } from "../types/organizer.types";
import { buildEventPreview } from "./eventPreview";

const empty: OrganizerEventFormValues = {
  intent: "publish",
  name: "",
  category: "conciertos",
  description: "",
  date: "",
  time: "",
  venue: "",
  city: "",
  ticketTypes: [{ id: "row-1", name: "", price: "", quantity: "" }],
};

describe("buildEventPreview", () => {
  it("con el formulario vacío deja los marcadores en null", () => {
    expect(buildEventPreview(empty, null)).toEqual({
      title: null,
      categoryLabel: "Conciertos",
      dateLabel: null,
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
        { id: "row-1", name: "Platea", price: "120", quantity: "100" },
        { id: "row-2", name: "Mezanine", price: "80", quantity: "50" },
      ],
    };
    expect(buildEventPreview(values, "blob:http://localhost/abc")).toEqual({
      title: "Hamlet",
      categoryLabel: "Teatro",
      dateLabel: "SÁB 5 DIC · 20:00",
      place: "Teatro Municipal, Lima",
      priceFrom: 80,
      imageUrl: "blob:http://localhost/abc",
    });
  });

  it("con solo la ciudad, el lugar es la ciudad", () => {
    expect(buildEventPreview({ ...empty, venue: "  ", city: "Lima" }, null).place).toBe("Lima");
  });

  it("sin hora no hay fecha", () => {
    expect(buildEventPreview({ ...empty, date: "2026-12-05" }, null).dateLabel).toBeNull();
  });
});
