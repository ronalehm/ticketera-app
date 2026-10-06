import { describe, expect, it } from "vitest";
import type { EventDraftFormValues, VenueOption } from "../types/organizer.types";
import { buildEventPreview } from "./eventPreview";
import { EMPTY_EVENT_DRAFT } from "./organizerEventForm";

const SECTION_A = "11111111-1111-4111-8111-111111111111";
const SECTION_B = "22222222-2222-4222-8222-222222222222";
const VENUE: VenueOption = {
  id: "5b0a3c1e-2f4d-4a6b-8c9d-0e1f2a3b4c5d",
  name: "Teatro Municipal",
  city: "Lima",
  sections: [],
};

describe("buildEventPreview", () => {
  it("con el formulario vacío deja los marcadores en null", () => {
    expect(buildEventPreview(EMPTY_EVENT_DRAFT, undefined)).toEqual({
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
    const values: EventDraftFormValues = {
      ...EMPTY_EVENT_DRAFT,
      title: "  Hamlet ",
      category: "teatro",
      date: "2026-12-05",
      time: "20:00",
      venueId: VENUE.id,
      imageUrl: " https://images.unsplash.com/hamlet.jpg ",
      ticketTypes: [
        { sectionId: SECTION_A, selected: true, name: "Platea", price: "120" },
        { sectionId: SECTION_B, selected: true, name: "Mezanine", price: "80" },
      ],
    };
    expect(buildEventPreview(values, VENUE)).toEqual({
      title: "Hamlet",
      categoryLabel: "Teatro",
      dateLabel: "sáb 5 dic",
      dateChip: { month: "DIC", day: "05" },
      place: "Teatro Municipal · Lima",
      priceFrom: 80,
      imageUrl: "https://images.unsplash.com/hamlet.jpg",
    });
  });

  it("sin hora no hay fecha ni chip", () => {
    const preview = buildEventPreview({ ...EMPTY_EVENT_DRAFT, date: "2026-12-05" }, undefined);
    expect(preview.dateLabel).toBeNull();
    expect(preview.dateChip).toBeNull();
  });

  it.each(["http://images.unsplash.com/a.jpg", "https://", "portada"])("una portada no válida (%s) no se muestra", (imageUrl) => {
    expect(buildEventPreview({ ...EMPTY_EVENT_DRAFT, imageUrl }, undefined).imageUrl).toBeNull();
  });
});
