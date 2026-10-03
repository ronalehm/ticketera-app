import { describe, expect, it } from "vitest";
import type { OrganizerEvent } from "../types/organizer.types";
import {
  filterOrganizerEvents,
  formatCount,
  getDashboardKpis,
  getEventRevenue,
  getSoldPercentage,
} from "./organizerStats";

const base: Omit<OrganizerEvent, "id" | "title" | "priceFrom" | "sold" | "capacity" | "status"> = {
  category: "conciertos",
  startsAt: "2026-11-14T21:00:00-05:00",
  venue: "Estadio Nacional",
  city: "Lima",
  imageUrl: "https://example.com/img.jpg",
};

// Los 4 eventos del mock del panel (Requisito 11).
const synth: OrganizerEvent = { ...base, id: "evt-001", title: "Noche de Sintetizadores: Gira Neón 2026", priceFrom: 180, sold: 7420, capacity: 8000, status: "published" };
const theatre: OrganizerEvent = { ...base, id: "evt-003", title: "La casa de los espejos", priceFrom: 120, sold: 312, capacity: 420, status: "published" };
const circus: OrganizerEvent = { ...base, id: "evt-011", title: "El circo de las estrellas", priceFrom: 35, sold: 414, capacity: 1200, status: "published" };
const draft: OrganizerEvent = { ...base, id: "org-draft-001", title: "Feria Familiar de Verano", priceFrom: 40, sold: 0, capacity: 1500, status: "draft" };
const events = [synth, theatre, circus, draft];

describe("getEventRevenue", () => {
  it("multiplica vendidas por el precio desde en un evento publicado", () => {
    expect(getEventRevenue(synth)).toBe(1_335_600);
  });

  it("da 0 en un borrador", () => {
    expect(getEventRevenue({ ...draft, sold: 10 })).toBe(0);
  });

  it("da 0 si no hay precio", () => {
    expect(getEventRevenue({ ...synth, priceFrom: null })).toBe(0);
  });
});

describe("getDashboardKpis", () => {
  it("suma ingresos, vendidas y publicados del mock", () => {
    expect(getDashboardKpis(events)).toEqual({ revenue: 1_387_530, ticketsSold: 8146, publishedCount: 3 });
  });

  it("da ceros con una lista vacía", () => {
    expect(getDashboardKpis([])).toEqual({ revenue: 0, ticketsSold: 0, publishedCount: 0 });
  });
});

describe("getSoldPercentage", () => {
  it.each([
    [7420, 8000, 93],
    [0, 1500, 0],
    [5, 0, 0],
    [10, 5, 100],
  ])("(%i, %i) → %i", (sold, capacity, expected) => {
    expect(getSoldPercentage(sold, capacity)).toBe(expected);
  });
});

describe("filterOrganizerEvents", () => {
  it("devuelve todos con all", () => {
    expect(filterOrganizerEvents(events, "all")).toEqual(events);
  });

  it("devuelve solo los publicados", () => {
    expect(filterOrganizerEvents(events, "published")).toEqual([synth, theatre, circus]);
  });

  it("devuelve solo los borradores", () => {
    expect(filterOrganizerEvents(events, "draft")).toEqual([draft]);
  });
});

describe("formatCount", () => {
  it("usa el separador de miles de es-PE", () => {
    expect(formatCount(8146)).toBe("8,146");
  });
});
