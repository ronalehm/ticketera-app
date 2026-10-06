import { describe, expect, it } from "vitest";
import { createEventDraftSchema, MIN_AGE_LABELS } from "../schemas/organizer.schema";
import type { EditableEvent, EventDraftFormValues, TicketTypeRow, VenueOption } from "../types/organizer.types";
import {
  buildStartsAt,
  createTicketTypeRows,
  EMPTY_EVENT_DRAFT,
  formatPriceInput,
  formatTicketCount,
  getEventFormLock,
  getMinAgeLabels,
  getMinTicketPrice,
  getSelectedCapacity,
  getTicketTypeErrors,
  hasScheduleChanged,
  toCents,
  toEventDraftFormValues,
  toEventDraftInput,
} from "./organizerEventForm";

const SECTION_A = "11111111-1111-4111-8111-111111111111";
const SECTION_B = "22222222-2222-4222-8222-222222222222";
const VENUE: VenueOption = {
  id: "5b0a3c1e-2f4d-4a6b-8c9d-0e1f2a3b4c5d",
  name: "Estadio Nacional",
  address: "Av. Prueba 123, Cercado",
  lat: null,
  lng: null,
  placeId: null,
  status: "approved",
  organizerId: null,
  city: "Lima",
  sections: [
    { id: SECTION_A, name: "Campo", seating: "general", capacity: 1000 },
    { id: SECTION_B, name: "Occidente", seating: "numbered", capacity: 240 },
  ],
};

const row = (sectionId: string, overrides: Partial<TicketTypeRow> = {}): TicketTypeRow => ({
  sectionId,
  selected: true,
  name: "General",
  price: "50",
  ...overrides,
});

describe("buildStartsAt", () => {
  it("une fecha y hora con el offset de Lima", () => {
    expect(buildStartsAt("2026-12-05", "20:00")).toBe("2026-12-05T20:00:00-05:00");
  });

  it.each([
    ["", "20:00"],
    ["2026-12-05", ""],
    ["2026-13-45", "20:00"],
    ["2026-12-05", "25:00"],
  ])("%j + %j → null", (date, time) => {
    expect(buildStartsAt(date, time)).toBeNull();
  });
});

describe("precios", () => {
  it.each([
    ["50", 5000],
    ["49.9", 4990],
    ["0.07", 7],
    ["0", 0],
    ["19.99", 1999],
  ])("toCents(%j) → %d", (price, cents) => {
    expect(toCents(price)).toBe(cents);
  });

  it("formatPriceInput da dos decimales", () => {
    expect(formatPriceInput(4990)).toBe("49.90");
    expect(formatPriceInput(0)).toBe("0.00");
  });
});

describe("createTicketTypeRows", () => {
  it("una fila sin marcar por sección, con su nombre como nombre por defecto", () => {
    expect(createTicketTypeRows(VENUE.sections)).toEqual([
      { sectionId: SECTION_A, selected: false, name: "Campo", price: "" },
      { sectionId: SECTION_B, selected: false, name: "Occidente", price: "" },
    ]);
  });

  it("marca las secciones con tipo de entrada guardado, con su nombre y precio", () => {
    const rows = createTicketTypeRows(VENUE.sections, [{ sectionId: SECTION_B, name: "Platea", priceCents: 12050 }]);
    expect(rows).toEqual([
      { sectionId: SECTION_A, selected: false, name: "Campo", price: "" },
      { sectionId: SECTION_B, selected: true, name: "Platea", price: "120.50" },
    ]);
  });
});

describe("getMinAgeLabels", () => {
  it("con una edad de la lista, solo la lista; con una mayor conservada, también esa", () => {
    expect(getMinAgeLabels("18")).toBe(MIN_AGE_LABELS);
    expect(getMinAgeLabels("21")).toEqual({ ...MIN_AGE_LABELS, "21": "+21" });
    expect(Object.keys(getMinAgeLabels("21"))).toEqual(["0", "12", "14", "16", "18", "21"]);
  });
});

describe("toEventDraftFormValues", () => {
  const event: EditableEvent = {
    id: "e0000000-0000-4000-8000-000000000001",
    status: "draft",
    organizerId: "00000000-0000-8000-8000-000000000001",
    title: "Festival",
    category: "festivales",
    description: null,
    startsAt: "2026-12-06T01:00:00.000Z", // 5 dic, 20:00 en Lima
    doorsOpenAt: "2026-12-05T23:30:00.000Z", // 18:30 en Lima
    minAge: 18,
    venueId: VENUE.id,
    imageUrl: null,
    ticketTypes: [{ sectionId: SECTION_A, name: "General", priceCents: 5000 }],
    reviewNote: null,
    featured: false,
    hasSales: false,
    sold: 0,
  };

  it("pasa fechas a Lima, nulos a vacíos y precios a soles", () => {
    expect(toEventDraftFormValues(event, [VENUE])).toEqual({
      title: "Festival",
      category: "festivales",
      minAge: "18",
      description: "",
      date: "2026-12-05",
      time: "20:00",
      doorsOpen: "18:30",
      venueId: VENUE.id,
      organizerId: event.organizerId,
      imageUrl: "",
      ticketTypes: [
        { sectionId: SECTION_A, selected: true, name: "General", price: "50.00" },
        { sectionId: SECTION_B, selected: false, name: "Occidente", price: "" },
      ],
    });
  });

  it("sin fecha deja los campos vacíos", () => {
    const values = toEventDraftFormValues({ ...event, startsAt: null, doorsOpenAt: null }, [VENUE]);
    expect([values.date, values.time, values.doorsOpen]).toEqual(["", "", ""]);
  });

  it("una edad fuera de la lista pasa a la siguiente (nunca rebaja la restricción)", () => {
    expect(toEventDraftFormValues({ ...event, minAge: 15 }, [VENUE]).minAge).toBe("16");
    expect(toEventDraftFormValues({ ...event, minAge: 0 }, [VENUE]).minAge).toBe("0");
  });

  it("una edad mayor que todas las de la lista se conserva (nunca pasa a +18) y es válida para el schema", () => {
    const values = toEventDraftFormValues({ ...event, minAge: 21 }, [VENUE]);
    expect(values.minAge).toBe("21");
    expect(createEventDraftSchema({ requireOrganizer: true }).safeParse(values).success).toBe(true);
  });

  it("con organizadores (admin), si el dueño ya no está aprobado el organizador queda vacío", () => {
    const approved = [{ id: event.organizerId, name: "Pulso Producciones S.A.C." }];
    expect(toEventDraftFormValues(event, [VENUE], approved).organizerId).toBe(event.organizerId);
    expect(toEventDraftFormValues(event, [VENUE], []).organizerId).toBe("");
    // Sin lista (organizador): se conserva; el servicio usa al propio organizador.
    expect(toEventDraftFormValues(event, [VENUE]).organizerId).toBe(event.organizerId);
  });

  it("con un recinto que ya no está en la lista no hay filas", () => {
    expect(toEventDraftFormValues(event, []).ticketTypes).toEqual([]);
  });

  it("el resultado es válido para el schema", () => {
    const values = toEventDraftFormValues(event, [VENUE]);
    expect(createEventDraftSchema({ requireOrganizer: true }).safeParse(values).success).toBe(true);
  });
});

describe("toEventDraftInput", () => {
  const values: EventDraftFormValues = {
    ...EMPTY_EVENT_DRAFT,
    title: "Festival",
    category: "festivales",
    minAge: "16",
    description: "Tres escenarios.",
    date: "2026-12-05",
    time: "20:00",
    doorsOpen: "18:00",
    venueId: VENUE.id,
    organizerId: "00000000-0000-8000-8000-000000000001",
    imageUrl: "https://images.unsplash.com/a.jpg",
    ticketTypes: [row(SECTION_A, { selected: false }), row(SECTION_B, { name: "Platea", price: "120.5" })],
  };

  it("convierte fechas, edad y precios, y solo pasa las filas marcadas con su posición como orden", () => {
    expect(toEventDraftInput(values, { requireOrganizer: true })).toEqual({
      title: "Festival",
      category: "festivales",
      description: "Tres escenarios.",
      startsAt: new Date("2026-12-06T01:00:00Z"),
      doorsOpenAt: new Date("2026-12-05T23:00:00Z"),
      minAge: 16,
      venue: { kind: "existing", id: VENUE.id },
      imageUrl: "https://images.unsplash.com/a.jpg",
      organizerId: "00000000-0000-8000-8000-000000000001",
      ticketTypes: [{ sectionId: SECTION_B, name: "Platea", priceCents: 12050, sortOrder: 0 }],
    });
  });

  it("los vacíos pasan a null", () => {
    const input = toEventDraftInput({ ...EMPTY_EVENT_DRAFT, title: "Borrador" }, { requireOrganizer: true });
    expect(input).toMatchObject({
      description: null,
      startsAt: null,
      doorsOpenAt: null,
      venue: null,
      imageUrl: null,
      organizerId: null,
      ticketTypes: [],
    });
  });

  it("para un organizador ignora el organizador indicado", () => {
    expect(toEventDraftInput(values, { requireOrganizer: false }).organizerId).toBeNull();
  });

  it("con el recinto a mano marcado lo pasa (aforos como números) en lugar del de la lista; desmarcado, se ignora", () => {
    const manualVenue = {
      enabled: true,
      name: "Café La Esquina",
      address: "Av. Larco 1150, Miraflores",
      city: "Cusco",
      sections: [{ id: SECTION_A, name: "General", capacity: "200" }],
    };
    expect(toEventDraftInput({ ...values, manualVenue }, { requireOrganizer: false }).venue).toEqual({
      kind: "manual",
      name: "Café La Esquina",
      address: "Av. Larco 1150, Miraflores",
      city: "Cusco",
      sections: [{ id: SECTION_A, name: "General", capacity: 200 }],
    });
    const unchecked = { ...values, manualVenue: { ...manualVenue, enabled: false } };
    expect(toEventDraftInput(unchecked, { requireOrganizer: false }).venue).toEqual({ kind: "existing", id: VENUE.id });
  });
});

describe("filas de tipos de entrada", () => {
  it("getTicketTypeErrors da los errores de cada fila marcada", () => {
    expect(getTicketTypeErrors([row(SECTION_A), row(SECTION_B, { price: "" })])).toEqual([
      {},
      { price: "Ingresa el precio" },
    ]);
  });

  it("getMinTicketPrice ignora las filas sin marcar y los precios no válidos", () => {
    const rows = [row(SECTION_A, { price: "80" }), row(SECTION_B, { selected: false, price: "10" })];
    expect(getMinTicketPrice(rows)).toBe(80);
    expect(getMinTicketPrice([row(SECTION_A, { price: "abc" })])).toBeNull();
    expect(getMinTicketPrice([row(SECTION_A, { price: "0" }), row(SECTION_B, { price: "15" })])).toBe(0);
  });

  it("getSelectedCapacity suma la capacidad de las secciones marcadas", () => {
    expect(getSelectedCapacity([row(SECTION_A), row(SECTION_B)], VENUE.sections)).toBe(1240);
    expect(getSelectedCapacity([row(SECTION_A, { selected: false }), row(SECTION_B)], VENUE.sections)).toBe(240);
  });

  it("formatTicketCount usa singular y separador de miles", () => {
    expect(formatTicketCount(1)).toBe("1 entrada");
    expect(formatTicketCount(1500)).toBe("1,500 entradas");
  });
});

describe("getEventFormLock", () => {
  // Con ventas solo sigue bloqueada la estructura (spec event-editing, Decisión 1).
  it.each([
    [undefined, null],
    [{ status: "draft" }, null],
    [{ status: "pending_review" }, null],
    [{ status: "published" }, "structure"],
  ] as const)("%j → %s", (event, expected) => {
    expect(getEventFormLock(event)).toBe(expected);
  });
});

describe("hasScheduleChanged", () => {
  const saved = { date: "2030-01-01", time: "20:00", doorsOpen: "18:00" };

  it("sin cambios de fecha, hora ni apertura → false", () => {
    expect(hasScheduleChanged(saved, { ...saved })).toBe(false);
  });

  it.each([{ date: "2030-01-02" }, { time: "21:00" }, { doorsOpen: "19:00" }])("%j → true", (change) => {
    expect(hasScheduleChanged(saved, { ...saved, ...change })).toBe(true);
  });
});
