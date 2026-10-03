import { describe, expect, it } from "vitest";

import type { Event } from "../types/events.types";
import { buildEventsHref, filterEvents, parseEventFilters } from "./eventFilters";

function makeEvent(overrides: Partial<Event> & Pick<Event, "id">): Event {
  return {
    slug: overrides.id,
    title: "Evento",
    category: "conciertos",
    startsAt: "2026-11-15T20:00:00-05:00",
    venue: "Recinto",
    city: "Lima",
    imageUrl: "https://example.com/img.jpg",
    priceFrom: 80,
    status: "available",
    featured: false,
    ...overrides,
  };
}

const ids = (events: Event[]) => events.map((event) => event.id);

describe("parseEventFilters", () => {
  it("acepta valores válidos", () => {
    expect(
      parseEventFilters({ q: " rock ", ciudad: "Cusco", fecha: "2027-01-01", precio: "0-50", categoria: "teatro" }),
    ).toEqual({ q: "rock", ciudad: "Cusco", fecha: "2027-01-01", precio: "0-50", categoria: "teatro" });
  });

  it("convierte cada valor inválido en undefined e ignora params desconocidos", () => {
    const filters = parseEventFilters({
      q: "ok",
      ciudad: "Tokio",
      fecha: "2027-13-45",
      precio: "xyz",
      categoria: "opera",
      orden: "desc",
    });
    expect(filters).toEqual({ q: "ok" });
    expect(filters).not.toHaveProperty("orden");
  });

  it("toma el primer valor cuando un param llega como array", () => {
    expect(parseEventFilters({ ciudad: ["Arequipa", "Lima"], precio: ["xyz", "gratis"] })).toEqual({
      ciudad: "Arequipa",
      precio: undefined,
    });
  });

  it("trata valores vacíos como undefined", () => {
    const filters = parseEventFilters({ q: "   ", ciudad: "", fecha: "", precio: "", categoria: "" });
    expect(Object.values(filters).every((value) => value === undefined)).toBe(true);
  });
});

describe("filterEvents", () => {
  it("sin filtros devuelve todos ordenados por fecha ascendente", () => {
    const events = [
      makeEvent({ id: "c", startsAt: "2027-03-01T20:00:00-05:00" }),
      makeEvent({ id: "a", startsAt: "2026-10-10T20:00:00-05:00" }),
      makeEvent({ id: "b", startsAt: "2026-12-01T03:00:00Z" }),
    ];
    expect(ids(filterEvents(events, {}))).toEqual(["a", "b", "c"]);
  });

  it("no muta el array original", () => {
    const events = [makeEvent({ id: "b", startsAt: "2027-01-01T00:00:00Z" }), makeEvent({ id: "a" })];
    filterEvents(events, {});
    expect(ids(events)).toEqual(["b", "a"]);
  });

  describe("q", () => {
    const events = [
      makeEvent({ id: "title", title: "Gira Perú Rock" }),
      makeEvent({ id: "venue", venue: "Estadio Nacional" }),
      makeEvent({ id: "city", city: "Ñuñoa Árbol" }),
      makeEvent({ id: "none", title: "Otro", venue: "Teatro", city: "Lima" }),
    ];

    it("busca en el título sin distinguir tildes ni mayúsculas", () => {
      expect(ids(filterEvents(events, { q: "PERU" }))).toEqual(["title"]);
    });

    it("busca en el lugar", () => {
      expect(ids(filterEvents(events, { q: "estadio" }))).toEqual(["venue"]);
    });

    it("busca en la ciudad", () => {
      expect(ids(filterEvents(events, { q: "arbol" }))).toEqual(["city"]);
    });

    it("la tilde en la búsqueda también se ignora", () => {
      expect(ids(filterEvents(events, { q: "Éstadio" }))).toEqual(["venue"]);
    });
  });

  it("filtra por ciudad exacta", () => {
    const events = [makeEvent({ id: "lima" }), makeEvent({ id: "cusco", city: "Cusco" })];
    expect(ids(filterEvents(events, { ciudad: "Cusco" }))).toEqual(["cusco"]);
  });

  describe("fecha (zona America/Lima, ese día o después)", () => {
    const events = [
      makeEvent({ id: "before", startsAt: "2026-12-30T20:00:00-05:00" }),
      // 22:00 del 31/12 en Lima = 03:00 del 01/01 en UTC: sigue siendo 31/12 en Lima.
      makeEvent({ id: "late-lima", startsAt: "2027-01-01T03:00:00Z" }),
      makeEvent({ id: "same-day", startsAt: "2027-01-01T10:00:00-05:00" }),
      makeEvent({ id: "after", startsAt: "2027-02-01T20:00:00-05:00" }),
    ];

    it("incluye eventos de ese día y posteriores", () => {
      expect(ids(filterEvents(events, { fecha: "2027-01-01" }))).toEqual(["same-day", "after"]);
    });

    it("un evento a las 22:00 Lima cuenta en su día de Lima aunque en UTC sea el siguiente", () => {
      expect(ids(filterEvents(events, { fecha: "2026-12-31" }))).toEqual(["late-lima", "same-day", "after"]);
    });
  });

  describe("precio sobre priceFrom", () => {
    const events = [0, 30, 50, 51, 100, 101, 200, 201].map((price) =>
      makeEvent({ id: String(price), priceFrom: price }),
    );

    it.each([
      ["gratis", ["0"]],
      ["0-50", ["0", "30", "50"]],
      ["50-100", ["51", "100"]],
      ["100-200", ["101", "200"]],
      ["200-mas", ["201"]],
    ] as const)("%s", (precio, expected) => {
      expect(ids(filterEvents(events, { precio }))).toEqual(expected);
    });
  });

  it("filtra por categoría", () => {
    const events = [makeEvent({ id: "rock" }), makeEvent({ id: "obra", category: "teatro" })];
    expect(ids(filterEvents(events, { categoria: "teatro" }))).toEqual(["obra"]);
  });

  it("combina todos los filtros con AND", () => {
    const base = {
      title: "Festival Andino",
      city: "Cusco",
      category: "festivales",
      priceFrom: 40,
      startsAt: "2027-02-01T20:00:00-05:00",
    } as const;
    const events = [
      makeEvent({ id: "match", ...base }),
      makeEvent({ id: "other-city", ...base, city: "Lima" }),
      makeEvent({ id: "expensive", ...base, priceFrom: 60 }),
      makeEvent({ id: "other-cat", ...base, category: "teatro" }),
      makeEvent({ id: "earlier", ...base, startsAt: "2026-12-01T20:00:00-05:00" }),
      makeEvent({ id: "no-text", ...base, title: "Otro" }),
      makeEvent({ id: "match-2", ...base, startsAt: "2027-01-15T20:00:00-05:00" }),
    ];
    expect(
      ids(
        filterEvents(events, {
          q: "andino",
          ciudad: "Cusco",
          fecha: "2027-01-01",
          precio: "0-50",
          categoria: "festivales",
        }),
      ),
    ).toEqual(["match-2", "match"]);
  });
});

describe("buildEventsHref", () => {
  it("sin filtros devuelve /eventos", () => {
    expect(buildEventsHref({})).toBe("/eventos");
    expect(buildEventsHref({ q: undefined, ciudad: undefined })).toBe("/eventos");
  });

  it("omite los valores vacíos", () => {
    expect(buildEventsHref({ ciudad: "Lima", precio: undefined, categoria: "conciertos" })).toBe(
      "/eventos?ciudad=Lima&categoria=conciertos",
    );
  });

  it("codifica los valores", () => {
    expect(buildEventsHref({ q: "rock & perú" })).toBe("/eventos?q=rock+%26+per%C3%BA");
  });
});
