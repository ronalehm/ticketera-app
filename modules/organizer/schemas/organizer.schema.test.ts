import { describe, expect, it } from "vitest";
import { EVENT_CATEGORIES } from "@/modules/events/format";
import type { EventDraftFormValues, TicketTypeRow } from "../types/organizer.types";
import {
  coverImageUrlSchema,
  createEventDraftSchema,
  EVENT_CATEGORY_OPTIONS,
  getTicketTypeRowErrors,
  MIN_AGE_LABELS,
  MIN_AGE_OPTIONS,
  organizerEventSchema,
  REVIEW_NOTE_MAX_LENGTH,
  reviewNoteSchema,
  savedStatusSchema,
} from "./organizer.schema";

const VENUE_ID = "5b0a3c1e-2f4d-4a6b-8c9d-0e1f2a3b4c5d";
const ORGANIZER_ID = "00000000-0000-8000-8000-000000000001";
const SECTION_A = "11111111-1111-4111-8111-111111111111";
const SECTION_B = "22222222-2222-4222-8222-222222222222";

const organizerSchema = createEventDraftSchema({ requireOrganizer: false });
const adminSchema = createEventDraftSchema({ requireOrganizer: true });

const row = (sectionId: string, overrides: Partial<TicketTypeRow> = {}): TicketTypeRow => ({
  sectionId,
  selected: true,
  name: "General",
  price: "50",
  ...overrides,
});

const empty: EventDraftFormValues = {
  title: "",
  category: "conciertos",
  minAge: "0",
  description: "",
  date: "",
  time: "",
  doorsOpen: "",
  venueId: "",
  organizerId: "",
  imageUrl: "",
  ticketTypes: [],
};

const complete: EventDraftFormValues = {
  title: "Festival de verano 2026",
  category: "festivales",
  minAge: "18",
  description: "Tres escenarios y comida local.",
  date: "2026-12-05",
  time: "20:00",
  doorsOpen: "18:00",
  venueId: VENUE_ID,
  organizerId: "",
  imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
  ticketTypes: [row(SECTION_A), row(SECTION_B, { selected: false, name: "VIP", price: "" })],
};

/** Mensajes agrupados por ruta ("ticketTypes.0.name"). */
function messages(values: EventDraftFormValues, schema = organizerSchema): Record<string, string> {
  const result = schema.safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

describe("EVENT_CATEGORY_OPTIONS", () => {
  it("coincide con las categorías del proyecto y en el mismo orden", () => {
    expect(EVENT_CATEGORY_OPTIONS).toEqual(EVENT_CATEGORIES);
  });
});

describe("organizerEventSchema (borradores de ejemplo del seed)", () => {
  it("acepta un borrador sin fecha, imagen ni precio", () => {
    const draft = {
      id: "org-draft-001",
      title: "Feria",
      category: "familia",
      startsAt: null,
      venue: "Parque",
      city: "Arequipa",
      imageUrl: null,
      priceFrom: null,
      sold: 0,
      capacity: 0,
      status: "draft",
    };
    expect(organizerEventSchema.safeParse(draft).success).toBe(true);
  });
});

describe("createEventDraftSchema", () => {
  describe("borrador mínimo", () => {
    it("solo exige el nombre", () => {
      expect(organizerSchema.safeParse({ ...empty, title: "Mi borrador" }).success).toBe(true);
      expect(messages(empty)).toEqual({ title: "Ingresa el nombre del evento" });
    });

    it("trata un nombre con solo espacios como vacío y recorta los textos", () => {
      expect(messages({ ...empty, title: "   " })).toEqual({ title: "Ingresa el nombre del evento" });
      const result = organizerSchema.safeParse({ ...complete, title: "  Festival  ", imageUrl: ` ${complete.imageUrl} ` });
      expect(result.data?.title).toBe("Festival");
      expect(result.data?.imageUrl).toBe(complete.imageUrl);
    });

    it("un formulario completo es válido", () => {
      expect(organizerSchema.safeParse(complete).success).toBe(true);
    });

    it("rechaza un nombre de más de 100 caracteres", () => {
      expect(messages({ ...empty, title: "x".repeat(101) })).toEqual({
        title: "El nombre admite hasta 100 caracteres",
      });
    });

    it("rechaza una categoría o una edad fuera de la lista", () => {
      const values = { ...complete, category: "cine", minAge: "15" } as unknown as EventDraftFormValues;
      expect(Object.keys(messages(values)).sort()).toEqual(["category", "minAge"]);
    });

    it("acepta una edad de dos cifras mayor que +18 (la que conserva un borrador guardado), y nada más fuera de la lista", () => {
      expect(organizerSchema.safeParse({ ...complete, minAge: "21" }).success).toBe(true);
      for (const minAge of ["13", "9", "18.5", "100", "-1", "", "abc"]) {
        expect(organizerSchema.safeParse({ ...complete, minAge }).success, minAge).toBe(false);
      }
    });
  });

  describe("fecha, hora y apertura de puertas", () => {
    it("sin fecha ni hora es válido", () => {
      expect(organizerSchema.safeParse({ ...complete, date: "", time: "", doorsOpen: "" }).success).toBe(true);
    });

    it("una fecha sin hora pide la hora y una hora sin fecha pide la fecha", () => {
      expect(messages({ ...complete, time: "", doorsOpen: "" })).toEqual({ time: "Indica la hora de inicio" });
      expect(messages({ ...complete, date: "", doorsOpen: "" })).toEqual({ date: "Elige la fecha del evento" });
    });

    it.each(["2026-13-45", "2026-02-30", "05/12/2026"])("%s da fecha no válida", (date) => {
      expect(messages({ ...complete, date, doorsOpen: "" })).toEqual({ date: "Elige una fecha válida" });
    });

    it.each(["25:00", "20:60", "8:00"])("hora %s no válida", (time) => {
      expect(messages({ ...complete, time, doorsOpen: "" })).toEqual({ time: "Indica la hora de inicio" });
    });

    it("la apertura de puertas debe ser a la hora de inicio o antes", () => {
      expect(messages({ ...complete, doorsOpen: "21:00" })).toEqual({
        doorsOpen: "La apertura de puertas debe ser a la hora de inicio o antes",
      });
      expect(organizerSchema.safeParse({ ...complete, doorsOpen: "20:00" }).success).toBe(true);
    });

    it("la apertura de puertas sin fecha y hora de inicio da error", () => {
      expect(messages({ ...complete, date: "", time: "" })).toEqual({
        doorsOpen: "Indica primero la fecha y la hora de inicio",
      });
    });

    it("una apertura de puertas mal escrita da error", () => {
      expect(messages({ ...complete, doorsOpen: "7pm" })).toEqual({ doorsOpen: "Indica una hora de apertura válida" });
    });
  });

  describe("portada", () => {
    it.each([
      "http://images.unsplash.com/a.jpg",
      "ftp://example.com/a.jpg",
      "https://localhost/a.jpg",
      "javascript:alert(1)",
      "imagen.jpg",
    ])("rechaza %s", (imageUrl) => {
      expect(messages({ ...complete, imageUrl })).toEqual({
        imageUrl: "Ingresa una URL válida que empiece por https://",
      });
    });

    it("acepta una URL https y la portada vacía", () => {
      expect(coverImageUrlSchema.safeParse("https://cdn.example.com/portada.png").success).toBe(true);
      expect(organizerSchema.safeParse({ ...complete, imageUrl: "" }).success).toBe(true);
    });
  });

  describe("recinto y tipos de entrada", () => {
    it("vender entradas exige recinto", () => {
      expect(messages({ ...complete, venueId: "" })).toEqual({ venueId: "Elige el recinto para vender entradas" });
    });

    it("sin secciones marcadas se guarda sin recinto", () => {
      const ticketTypes = complete.ticketTypes.map((ticketType) => ({ ...ticketType, selected: false }));
      expect(organizerSchema.safeParse({ ...complete, venueId: "", ticketTypes }).success).toBe(true);
    });

    it("rechaza un recinto que no es un uuid", () => {
      expect(messages({ ...complete, venueId: "estadio" })).toEqual({ venueId: "Elige un recinto de la lista" });
    });

    it("rechaza secciones repetidas", () => {
      const ticketTypes = [row(SECTION_A), row(SECTION_A, { name: "Otra" })];
      expect(messages({ ...complete, ticketTypes })).toEqual({
        ticketTypes: "Cada sección del recinto solo puede tener un tipo de entrada",
      });
    });

    it("una fila marcada exige nombre y precio y lo asigna a su índice", () => {
      const ticketTypes = [row(SECTION_A), row(SECTION_B, { name: " ", price: "" })];
      expect(messages({ ...complete, ticketTypes })).toEqual({
        "ticketTypes.1.name": "Ingresa el nombre del tipo de entrada",
        "ticketTypes.1.price": "Ingresa el precio",
      });
    });

    it("una fila sin marcar no se valida", () => {
      const ticketTypes = [row(SECTION_A), row(SECTION_B, { selected: false, name: "", price: "-5" })];
      expect(organizerSchema.safeParse({ ...complete, ticketTypes }).success).toBe(true);
    });
  });

  describe("organizador", () => {
    it("para admin es obligatorio", () => {
      expect(messages(complete, adminSchema)).toEqual({ organizerId: "Elige el organizador del evento" });
      expect(adminSchema.safeParse({ ...complete, organizerId: ORGANIZER_ID }).success).toBe(true);
    });

    it("para admin tiene que ser un uuid", () => {
      expect(messages({ ...complete, organizerId: "ana" }, adminSchema)).toEqual({
        organizerId: "Elige un organizador de la lista",
      });
    });

    it("para un organizador se ignora", () => {
      expect(organizerSchema.safeParse({ ...complete, organizerId: "cualquier-cosa" }).success).toBe(true);
    });
  });
});

describe("getTicketTypeRowErrors", () => {
  it.each([
    ["0", undefined],
    ["50", undefined],
    ["49.9", undefined],
    ["120.00", undefined],
    ["100000", undefined],
    ["", "Ingresa el precio"],
    ["  ", "Ingresa el precio"],
    ["-5", "El precio debe ser un número de 0 o más, con hasta 2 decimales"],
    ["abc", "El precio debe ser un número de 0 o más, con hasta 2 decimales"],
    ["1.234", "El precio debe ser un número de 0 o más, con hasta 2 decimales"],
    ["1e3", "El precio debe ser un número de 0 o más, con hasta 2 decimales"],
    ["100000.01", "El precio no puede superar S/ 100,000"],
  ])("precio %j → %j", (price, message) => {
    expect(getTicketTypeRowErrors(row(SECTION_A, { price })).price).toBe(message);
  });

  it("nombre vacío o de más de 100 caracteres", () => {
    expect(getTicketTypeRowErrors(row(SECTION_A, { name: "" })).name).toBe("Ingresa el nombre del tipo de entrada");
    expect(getTicketTypeRowErrors(row(SECTION_A, { name: "x".repeat(101) })).name).toBe(
      "El nombre admite hasta 100 caracteres",
    );
  });

  it("una fila sin marcar no tiene errores", () => {
    expect(getTicketTypeRowErrors(row(SECTION_A, { selected: false, name: "", price: "" }))).toEqual({});
  });
});

describe("MIN_AGE_OPTIONS", () => {
  it("lista las edades en orden, con \"0\" (Todo público) primero, en el formato del detalle", () => {
    expect(MIN_AGE_OPTIONS).toEqual(["0", "12", "14", "16", "18"]);
    expect(MIN_AGE_OPTIONS.map((age) => MIN_AGE_LABELS[age])).toEqual(["Todo público", "+12", "+14", "+16", "+18"]);
  });
});

describe("savedStatusSchema", () => {
  it.each([
    ["borrador", "borrador"],
    ["cambios", "cambios"],
    ["publicado", undefined],
    ["x", undefined],
    [undefined, undefined],
    [["borrador", "borrador"], undefined],
  ])("%j → %j", (input, expected) => {
    expect(savedStatusSchema.parse(input)).toBe(expected);
  });
});

describe("reviewNoteSchema", () => {
  it("exige un motivo, sin espacios sobrantes", () => {
    expect(reviewNoteSchema.parse("  Falta la portada  ")).toBe("Falta la portada");
    for (const input of ["", "   ", undefined, 3]) {
      expect(reviewNoteSchema.safeParse(input).error?.issues[0]?.message).toBe("Escribe el motivo del rechazo");
    }
  });

  it(`admite hasta ${REVIEW_NOTE_MAX_LENGTH} caracteres`, () => {
    expect(reviewNoteSchema.safeParse("a".repeat(REVIEW_NOTE_MAX_LENGTH)).success).toBe(true);
    expect(reviewNoteSchema.safeParse("a".repeat(REVIEW_NOTE_MAX_LENGTH + 1)).error?.issues[0]?.message).toBe(
      `El motivo admite hasta ${REVIEW_NOTE_MAX_LENGTH} caracteres`,
    );
  });
});
