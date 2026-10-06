import { describe, expect, it } from "vitest";

import type { Event, EventCategory } from "../types/events.types";
import {
  buildEventsHref,
  filterEvents,
  formatMonthLabel,
  getActiveFilterChips,
  getEventMonths,
  getFacetCounts,
  parseEventFilters,
  toggleFilterValue,
  toSearchParamEntries,
} from "./eventFilters";

function makeEvent(overrides: Partial<Event> & Pick<Event, "id">): Event {
  return {
    slug: overrides.id,
    title: "Evento",
    category: "conciertos",
    categoryName: "Conciertos",
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

// Categorías de la BD (no las del código): incluye una que no está en el seed.
const CATEGORIES: EventCategory[] = [
  ["conciertos", "Conciertos"],
  ["teatro", "Teatro"],
  ["deportes", "Deportes"],
  ["stand-up", "Stand-up"],
  ["tecnologia", "Tecnología"],
].map(([slug, name], index) => ({ id: `00000000-0000-4000-8000-00000000000${index}`, slug, name }));

describe("parseEventFilters", () => {
  it("acepta valores válidos", () => {
    expect(
      parseEventFilters({ q: " rock ", ciudad: "Cusco", fecha: "2027-01-01", precio: "0-50", categoria: "teatro" }),
    ).toEqual({ q: "rock", ciudad: ["Cusco"], fecha: "2027-01-01", precio: "0-50", categoria: ["teatro"] });
  });

  it("convierte cada valor inválido en undefined e ignora params desconocidos", () => {
    const filters = parseEventFilters({
      q: "ok",
      ciudad: "Tokio",
      fecha: "2027-13-45",
      precio: "xyz",
      categoria: "Ópera Rock",
      pagina: "2",
    });
    expect(filters).toEqual({ q: "ok" });
    expect(filters).not.toHaveProperty("pagina");
  });

  it("conserva todos los valores multivalor y el primero en los de valor único", () => {
    expect(parseEventFilters({ ciudad: ["Arequipa", "Lima"], precio: ["xyz", "gratis"] })).toEqual({
      ciudad: ["Arequipa", "Lima"],
      precio: undefined,
    });
  });

  it("trata valores vacíos como undefined", () => {
    const filters = parseEventFilters({ q: "   ", ciudad: "", fecha: "", precio: "", categoria: "" });
    expect(Object.values(filters).every((value) => value === undefined)).toBe(true);
  });

  it("un string en un parámetro multivalor pasa a array", () => {
    expect(parseEventFilters({ categoria: "teatro", ciudad: "Lima" })).toEqual({
      categoria: ["teatro"],
      ciudad: ["Lima"],
    });
  });

  it("acepta un slug bien formado aunque no exista en la BD", () => {
    expect(parseEventFilters({ categoria: ["cafe-shop", "inexistente"] })).toEqual({
      categoria: ["cafe-shop", "inexistente"],
    });
  });

  it.each(["Teatro", "cafe_shop", "-teatro", "teatro-", "a".repeat(61)])("descarta el slug mal formado %s", (slug) => {
    expect(parseEventFilters({ categoria: slug }).categoria).toBeUndefined();
  });

  it("descarta los valores inválidos de un array y conserva los válidos en orden de llegada", () => {
    expect(
      parseEventFilters({ categoria: ["Opera", "teatro", "conciertos"], ciudad: ["Tokio", "Cusco", ""] }),
    ).toEqual({ categoria: ["teatro", "conciertos"], ciudad: ["Cusco"] });
  });

  it("elimina los valores duplicados", () => {
    expect(parseEventFilters({ ciudad: ["Lima", "Cusco", "Lima"] })).toEqual({ ciudad: ["Lima", "Cusco"] });
  });

  it("un multivalor con todos los valores inválidos queda undefined", () => {
    const filters = parseEventFilters({ categoria: ["cine!", "-cine"], ciudad: ["Tokio"] });
    expect(filters.categoria).toBeUndefined();
    expect(filters.ciudad).toBeUndefined();
  });

  it.each([
    ["2027-01", "2027-01"],
    ["2026-12", "2026-12"],
    ["2027-13", undefined],
    ["2027-1", undefined],
    ["2027-00", undefined],
    ["enero", undefined],
  ])("mes %s → %s", (mes, expected) => {
    expect(parseEventFilters({ mes }).mes).toBe(expected);
  });

  it.each([
    ["fecha", "fecha"],
    ["precio", "precio"],
    ["xyz", undefined],
    ["", undefined],
  ])("orden %s → %s", (orden, expected) => {
    expect(parseEventFilters({ orden }).orden).toBe(expected);
  });

  it("en q, mes y precio toma el primer valor si llegan como array", () => {
    expect(
      parseEventFilters({ q: ["rock", "jazz"], mes: ["2027-01", "2027-02"], precio: ["gratis", "0-50"] }),
    ).toEqual({ q: "rock", mes: "2027-01", precio: "gratis" });
  });

  it("aplica solo los valores válidos de una URL con varios inválidos", () => {
    expect(
      parseEventFilters({
        categoria: ["teatro--rock", "teatro"],
        ciudad: "Tokio",
        mes: "2027-13",
        orden: "xyz",
      }),
    ).toEqual({ categoria: ["teatro"] });
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
    expect(ids(filterEvents(events, { ciudad: ["Cusco"] }))).toEqual(["cusco"]);
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
    expect(ids(filterEvents(events, { categoria: ["teatro"] }))).toEqual(["obra"]);
  });

  it("una categoría inexistente devuelve 0 resultados", () => {
    expect(filterEvents([makeEvent({ id: "rock" })], parseEventFilters({ categoria: "inexistente" }))).toEqual([]);
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
          ciudad: ["Cusco"],
          fecha: "2027-01-01",
          precio: "0-50",
          categoria: ["festivales"],
        }),
      ),
    ).toEqual(["match-2", "match"]);
  });

  describe("multivalor", () => {
    const events = [
      makeEvent({ id: "rock-lima", category: "conciertos", city: "Lima" }),
      makeEvent({ id: "obra-lima", category: "teatro", city: "Lima" }),
      makeEvent({ id: "obra-cusco", category: "teatro", city: "Cusco" }),
      makeEvent({ id: "gol-cusco", category: "deportes", city: "Cusco" }),
      makeEvent({ id: "rock-piura", category: "conciertos", city: "Piura" }),
    ];

    it("OR dentro de categoria", () => {
      expect(ids(filterEvents(events, { categoria: ["teatro", "deportes"] }))).toEqual([
        "obra-lima",
        "obra-cusco",
        "gol-cusco",
      ]);
    });

    it("OR dentro de ciudad", () => {
      expect(ids(filterEvents(events, { ciudad: ["Lima", "Piura"] }))).toEqual([
        "rock-lima",
        "obra-lima",
        "rock-piura",
      ]);
    });

    it("AND entre categoria y ciudad", () => {
      expect(ids(filterEvents(events, { categoria: ["teatro", "conciertos"], ciudad: ["Cusco", "Piura"] }))).toEqual([
        "obra-cusco",
        "rock-piura",
      ]);
    });
  });

  describe("mes (zona America/Lima)", () => {
    const events = [
      // 22:00 del 30/11 en Lima = 03:00 del 01/12 en UTC: cuenta en noviembre.
      makeEvent({ id: "late-nov", startsAt: "2026-12-01T03:00:00Z" }),
      makeEvent({ id: "nov", startsAt: "2026-11-15T20:00:00-05:00" }),
      makeEvent({ id: "dec", startsAt: "2026-12-01T10:00:00-05:00" }),
      makeEvent({ id: "jan", startsAt: "2027-01-10T11:00:00-05:00" }),
    ];

    it("un evento a las 22:00 del 30/11 en Lima cuenta en 2026-11", () => {
      expect(ids(filterEvents(events, { mes: "2026-11" }))).toEqual(["nov", "late-nov"]);
    });

    it("filtra por el mes indicado", () => {
      expect(ids(filterEvents(events, { mes: "2026-12" }))).toEqual(["dec"]);
      expect(ids(filterEvents(events, { mes: "2027-02" }))).toEqual([]);
    });

    it("se combina con fecha (AND)", () => {
      expect(ids(filterEvents(events, { mes: "2026-11", fecha: "2026-11-20" }))).toEqual(["late-nov"]);
    });
  });

  describe("orden", () => {
    const events = [
      makeEvent({ id: "cara", priceFrom: 200, startsAt: "2026-11-01T20:00:00-05:00" }),
      makeEvent({ id: "empate-tarde", priceFrom: 50, startsAt: "2027-01-01T20:00:00-05:00" }),
      makeEvent({ id: "gratis", priceFrom: 0, startsAt: "2027-03-01T20:00:00-05:00" }),
      makeEvent({ id: "empate-pronto", priceFrom: 50, startsAt: "2026-12-01T20:00:00-05:00" }),
    ];

    it("precio: priceFrom ascendente con empate por fecha", () => {
      expect(ids(filterEvents(events, { orden: "precio" }))).toEqual([
        "gratis",
        "empate-pronto",
        "empate-tarde",
        "cara",
      ]);
    });

    it("sin orden o con orden fecha: por fecha ascendente", () => {
      const byDate = ["cara", "empate-pronto", "empate-tarde", "gratis"];
      expect(ids(filterEvents(events, {}))).toEqual(byDate);
      expect(ids(filterEvents(events, { orden: "fecha" }))).toEqual(byDate);
    });

    it("ordenar por precio no muta el array original", () => {
      filterEvents(events, { orden: "precio" });
      expect(ids(events)).toEqual(["cara", "empate-tarde", "gratis", "empate-pronto"]);
    });
  });
});

describe("buildEventsHref", () => {
  it("sin filtros devuelve /eventos", () => {
    expect(buildEventsHref({})).toBe("/eventos");
    expect(buildEventsHref({ q: undefined, ciudad: undefined })).toBe("/eventos");
  });

  it("omite los valores vacíos", () => {
    expect(buildEventsHref({ ciudad: ["Lima"], precio: undefined, categoria: ["conciertos"] })).toBe(
      "/eventos?ciudad=Lima&categoria=conciertos",
    );
  });

  it("codifica los valores", () => {
    expect(buildEventsHref({ q: "rock & perú" })).toBe("/eventos?q=rock+%26+per%C3%BA");
  });

  it("repite las claves multivalor", () => {
    expect(buildEventsHref({ categoria: ["teatro", "conciertos"] })).toBe(
      "/eventos?categoria=teatro&categoria=conciertos",
    );
  });

  it("omite orden=fecha e incluye orden=precio", () => {
    expect(buildEventsHref({ q: "estadio", orden: "fecha" })).toBe("/eventos?q=estadio");
    expect(buildEventsHref({ q: "estadio", orden: "precio" })).toBe("/eventos?q=estadio&orden=precio");
  });
});

describe("toSearchParamEntries", () => {
  it("respeta el orden de las claves y repite las multivalor", () => {
    expect(
      toSearchParamEntries({
        q: "rock",
        ciudad: ["Lima", "Arequipa"],
        mes: "2027-01",
        categoria: ["teatro"],
        orden: "precio",
      }),
    ).toEqual([
      ["q", "rock"],
      ["ciudad", "Lima"],
      ["ciudad", "Arequipa"],
      ["mes", "2027-01"],
      ["categoria", "teatro"],
      ["orden", "precio"],
    ]);
  });

  it("omite undefined, vacíos, arrays vacíos y orden=fecha", () => {
    expect(
      toSearchParamEntries({ q: "", categoria: [], ciudad: undefined, fecha: undefined, orden: "fecha" }),
    ).toEqual([]);
  });
});

describe("toggleFilterValue", () => {
  it("añade el valor al final", () => {
    expect(toggleFilterValue({ categoria: ["teatro"] }, "categoria", "conciertos")).toEqual({
      categoria: ["teatro", "conciertos"],
    });
    expect(toggleFilterValue({ q: "rock" }, "ciudad", "Lima")).toEqual({ q: "rock", ciudad: ["Lima"] });
  });

  it("quita el valor si ya estaba", () => {
    expect(toggleFilterValue({ ciudad: ["Lima", "Cusco"] }, "ciudad", "Lima")).toEqual({ ciudad: ["Cusco"] });
  });

  it("al quitar el último valor la faceta queda undefined", () => {
    const next = toggleFilterValue({ q: "rock", categoria: ["teatro"] }, "categoria", "teatro");
    expect(next.categoria).toBeUndefined();
    expect(next.q).toBe("rock");
  });

  it("no muta la entrada", () => {
    const filters = { ciudad: ["Lima" as const] };
    toggleFilterValue(filters, "ciudad", "Cusco");
    toggleFilterValue(filters, "ciudad", "Lima");
    expect(filters).toEqual({ ciudad: ["Lima"] });
  });
});

describe("getFacetCounts", () => {
  const events = [
    makeEvent({ id: "1", category: "conciertos", city: "Lima" }),
    makeEvent({ id: "2", category: "teatro", city: "Lima" }),
    makeEvent({ id: "3", category: "teatro", city: "Cusco" }),
    makeEvent({ id: "4", category: "deportes", city: "Arequipa" }),
    makeEvent({ id: "5", category: "conciertos", city: "Lima", priceFrom: 300 }),
  ];

  it("sin filtros devuelve los totales por valor, incluidos los ceros", () => {
    expect(getFacetCounts(events, {}, CATEGORIES)).toEqual({
      categoria: { conciertos: 2, teatro: 2, deportes: 1, "stand-up": 0, tecnologia: 0 },
      ciudad: { Lima: 3, Arequipa: 1, Cusco: 1, Trujillo: 0, Piura: 0 },
    });
  });

  it("con categoria, las ciudades solo cuentan esa categoría y las categorías no cambian por su propia selección", () => {
    expect(getFacetCounts(events, { categoria: ["teatro"] }, CATEGORIES)).toEqual({
      categoria: { conciertos: 2, teatro: 2, deportes: 1, "stand-up": 0, tecnologia: 0 },
      ciudad: { Lima: 1, Arequipa: 0, Cusco: 1, Trujillo: 0, Piura: 0 },
    });
  });

  it("con ciudad, las categorías solo cuentan esa ciudad", () => {
    expect(getFacetCounts(events, { ciudad: ["Lima"] }, CATEGORIES)).toEqual({
      categoria: { conciertos: 2, teatro: 1, deportes: 0, "stand-up": 0, tecnologia: 0 },
      ciudad: { Lima: 3, Arequipa: 1, Cusco: 1, Trujillo: 0, Piura: 0 },
    });
  });

  it("cuenta solo las categorías de la BD: las que no tienen eventos quedan en 0", () => {
    const counts = getFacetCounts([...events, makeEvent({ id: "6", category: "festivales" })], {}, CATEGORIES);
    expect(Object.keys(counts.categoria)).toEqual(CATEGORIES.map(({ slug }) => slug));
    expect(counts.categoria.tecnologia).toBe(0);
  });

  it("aplica los demás filtros activos a ambas facetas", () => {
    const counts = getFacetCounts(events, { precio: "0-50" }, CATEGORIES);
    expect(counts.categoria.conciertos).toBe(0);
    expect(counts.ciudad.Lima).toBe(0);
    expect(counts.categoria.teatro).toBe(0);
    expect(getFacetCounts(events, { precio: "200-mas" }, CATEGORIES).ciudad.Lima).toBe(1);
  });
});

describe("formatMonthLabel", () => {
  it.each([
    ["2026-11", "Noviembre 2026"],
    ["2027-01", "Enero 2027"],
    ["2027-03", "Marzo 2027"],
  ])("%s → %s", (month, label) => {
    expect(formatMonthLabel(month)).toBe(label);
  });
});

describe("getEventMonths", () => {
  it("devuelve meses únicos ascendentes con su label, en zona Lima", () => {
    const events = [
      makeEvent({ id: "jan", startsAt: "2027-01-10T11:00:00-05:00" }),
      makeEvent({ id: "nov-1", startsAt: "2026-11-15T20:00:00-05:00" }),
      // 22:00 del 30/11 en Lima = 01/12 en UTC: cuenta en noviembre.
      makeEvent({ id: "nov-2", startsAt: "2026-12-01T03:00:00Z" }),
      makeEvent({ id: "jan-2", startsAt: "2027-01-23T20:30:00-05:00" }),
    ];
    expect(getEventMonths(events)).toEqual([
      { value: "2026-11", label: "Noviembre 2026" },
      { value: "2027-01", label: "Enero 2027" },
    ]);
  });

  it("sin eventos devuelve una lista vacía", () => {
    expect(getEventMonths([])).toEqual([]);
  });
});

describe("getActiveFilterChips", () => {
  it("sin filtros de faceta no hay chips (ni para q ni para orden)", () => {
    expect(getActiveFilterChips({ q: "rock", orden: "precio" }, CATEGORIES)).toEqual([]);
  });

  it("ordena y etiqueta los chips: categorías, ciudades, mes, fecha y precio", () => {
    const chips = getActiveFilterChips(
      {
        precio: "100-200",
        fecha: "2027-01-01",
        mes: "2026-11",
        ciudad: ["Lima", "Cusco"],
        categoria: ["teatro", "stand-up"],
      },
      CATEGORIES,
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      "Teatro",
      "Stand-up",
      "Lima",
      "Cusco",
      "Noviembre 2026",
      "Desde el 1 de enero de 2027",
      "S/ 100 – S/ 200",
    ]);
    expect(new Set(chips.map((chip) => chip.id)).size).toBe(chips.length);
  });

  it("usa el nombre de la BD y, si la categoría no existe, el slug", () => {
    const chips = getActiveFilterChips({ categoria: ["tecnologia", "inexistente"] }, CATEGORIES);
    expect(chips.map((chip) => chip.label)).toEqual(["Tecnología", "inexistente"]);
  });

  it("el href de cada chip quita solo ese valor y conserva el resto", () => {
    const chips = getActiveFilterChips(
      {
        q: "rock",
        categoria: ["teatro"],
        ciudad: ["Lima", "Cusco"],
        precio: "100-200",
        orden: "precio",
      },
      CATEGORIES,
    );
    expect(chips.map(({ label, href }) => [label, href])).toEqual([
      ["Teatro", "/eventos?q=rock&ciudad=Lima&ciudad=Cusco&precio=100-200&orden=precio"],
      ["Lima", "/eventos?q=rock&categoria=teatro&ciudad=Cusco&precio=100-200&orden=precio"],
      ["Cusco", "/eventos?q=rock&categoria=teatro&ciudad=Lima&precio=100-200&orden=precio"],
      ["S/ 100 – S/ 200", "/eventos?q=rock&categoria=teatro&ciudad=Lima&ciudad=Cusco&orden=precio"],
    ]);
  });

  it("los chips de mes y fecha enlazan a la URL sin ese parámetro", () => {
    const chips = getActiveFilterChips({ mes: "2027-01", fecha: "2027-01-01" }, CATEGORIES);
    expect(chips).toEqual([
      { id: "mes", label: "Enero 2027", href: "/eventos?fecha=2027-01-01" },
      { id: "fecha", label: "Desde el 1 de enero de 2027", href: "/eventos?mes=2027-01" },
    ]);
  });
});
