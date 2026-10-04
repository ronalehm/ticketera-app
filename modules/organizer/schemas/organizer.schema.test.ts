import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_CATEGORIES } from "@/modules/events";
import { CITIES } from "@/modules/events/format";
import type { OrganizerEventFormValues } from "../types/organizer.types";
import {
  COVER_IMAGE_RULES,
  EVENT_CATEGORY_OPTIONS,
  MIN_AGE_LABELS,
  MIN_AGE_OPTIONS,
  organizerEventFormSchema,
  organizerEventSchema,
  SEAT_GRID_LIMITS,
  savedStatusSchema,
  seatingModeSchema,
  TICKET_DESCRIPTION_MAX_LENGTH,
  ticketTypeFormSchema,
} from "./organizer.schema";

const draft = {
  id: "org-draft-001",
  title: "Feria Familiar de Verano",
  category: "familia",
  startsAt: "2026-12-01T11:00:00-05:00",
  venue: "Parque Selva Alegre",
  city: "Arequipa",
  imageUrl: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1600&q=80",
  priceFrom: 40,
  sold: 0,
  capacity: 1500,
  status: "draft",
};

describe("EVENT_CATEGORY_OPTIONS", () => {
  it("coincide con las categorías del proyecto y en el mismo orden", () => {
    expect(EVENT_CATEGORY_OPTIONS).toEqual(EVENT_CATEGORIES);
  });
});

describe("organizerEventSchema", () => {
  it("acepta el borrador mock", () => {
    expect(organizerEventSchema.parse(draft)).toEqual(draft);
  });

  it("acepta un evento creado sin fecha, imagen ni precio", () => {
    const created = { ...draft, startsAt: null, imageUrl: null, priceFrom: null, capacity: 0 };
    expect(organizerEventSchema.safeParse(created).success).toBe(true);
  });

  it("rechaza una categoría inexistente", () => {
    const result = organizerEventSchema.safeParse({ ...draft, category: "cine" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["category"]);
  });

  it("rechaza un estado desconocido", () => {
    expect(organizerEventSchema.safeParse({ ...draft, status: "archived" }).success).toBe(false);
  });
});

// Como la fila que crea el formulario: descripción vacía y máximo por compra 10.
const emptyRow = {
  id: "row-1",
  name: "",
  price: "",
  description: "",
  maxPerOrder: "10",
  kind: "general" as const,
  quantity: "",
  rows: "",
  seatsPerRow: "",
};

const emptyForm: OrganizerEventFormValues = {
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
  seatingMode: "",
  hasCoverImage: false,
  ticketTypes: [emptyRow],
};

const completeForm: OrganizerEventFormValues = {
  intent: "publish",
  name: "Festival de verano 2026",
  category: "festivales",
  minAge: "18",
  description: "Tres escenarios y comida local.",
  organizer: "Pulso Producciones",
  date: "2026-12-05",
  time: "20:00",
  doorsOpen: "18:00",
  venue: "Estadio Nacional",
  city: "Lima",
  address: "Av. José Díaz s/n, Cercado de Lima",
  seatingMode: "general",
  hasCoverImage: true,
  ticketTypes: [
    { ...emptyRow, id: "row-1", name: "General", price: "50", quantity: "100" },
    { ...emptyRow, id: "row-2", name: "VIP", price: "80", description: "Zona preferente.", maxPerOrder: "4", quantity: "50" },
  ],
};

const numberedRow = { ...emptyRow, id: "row-3", name: "Platea", price: "120", kind: "numbered" as const, rows: "10", seatsPerRow: "20" };

/** Mensajes agrupados por ruta ("ticketTypes.0.name"). */
function getMessages(values: OrganizerEventFormValues): Record<string, string> {
  const result = organizerEventFormSchema.safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

describe("organizerEventFormSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T12:00:00-05:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("borrador", () => {
    it("es válido solo con el nombre", () => {
      expect(organizerEventFormSchema.safeParse({ ...emptyForm, intent: "draft", name: "Mi borrador" }).success).toBe(true);
    });

    it("con el nombre en blanco solo da el error de nombre", () => {
      expect(getMessages({ ...emptyForm, intent: "draft", name: "  " })).toEqual({
        name: "Ingresa el nombre del evento",
      });
    });

    it("no da errores de organizador, apertura de puertas ni dirección", () => {
      const values = { ...emptyForm, intent: "draft" as const, name: "Mi borrador", time: "20:00", doorsOpen: "21:00" };
      expect(organizerEventFormSchema.safeParse(values).success).toBe(true);
      expect(organizerEventFormSchema.safeParse({ ...values, doorsOpen: "25:00" }).success).toBe(true);
    });

    it("guarda campos inválidos sin errores", () => {
      const values = { ...emptyForm, intent: "draft" as const, name: "Mi borrador", date: "2020-01-01", time: "25:00" };
      expect(organizerEventFormSchema.safeParse(values).success).toBe(true);
    });

    it("no da errores de modo, ciudad, portada, máximo por compra ni descripción", () => {
      const values: OrganizerEventFormValues = {
        ...emptyForm,
        intent: "draft",
        name: "Mi borrador",
        city: "Chiclayo",
        hasCoverImage: false,
        ticketTypes: [{ ...emptyRow, maxPerOrder: "0", description: "x".repeat(151) }, { ...emptyRow, id: "row-2", maxPerOrder: "" }],
      };
      expect(organizerEventFormSchema.safeParse(values).success).toBe(true);
      expect(organizerEventFormSchema.safeParse({ ...values, seatingMode: "mixed" }).success).toBe(true);
    });
  });

  describe("publicar", () => {
    it("con todo vacío da todos los errores a la vez", () => {
      expect(getMessages(emptyForm)).toEqual({
        name: "Ingresa el nombre del evento",
        description: "Agrega una descripción del evento",
        organizer: "Indica el nombre del organizador",
        date: "Elige la fecha del evento",
        time: "Indica la hora de inicio",
        doorsOpen: "Indica la hora de apertura de puertas",
        venue: "Indica el lugar del evento",
        city: "Elige la ciudad",
        address: "Indica la dirección del lugar",
        hasCoverImage: "Sube la imagen de portada",
        seatingMode: "Elige cómo se ubica el público",
        "ticketTypes.0.name": "Ingresa el nombre del tipo de entrada",
        "ticketTypes.0.price": "Ingresa el precio",
        "ticketTypes.0.quantity": "Ingresa la cantidad",
      });
    });

    it("trata los textos con solo espacios como vacíos", () => {
      const messages = getMessages({
        ...completeForm,
        description: "  ",
        organizer: " ",
        venue: " ",
        city: "\t",
        address: "   ",
      });
      expect(messages).toEqual({
        description: "Agrega una descripción del evento",
        organizer: "Indica el nombre del organizador",
        venue: "Indica el lugar del evento",
        city: "Elige la ciudad",
        address: "Indica la dirección del lugar",
      });
    });

    it("un formulario completo es válido y recorta el nombre", () => {
      const result = organizerEventFormSchema.safeParse({ ...completeForm, name: "  Festival  " });
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Festival");
    });

    it("exige al menos un tipo de entrada", () => {
      expect(getMessages({ ...completeForm, ticketTypes: [] })).toHaveProperty("ticketTypes");
    });

    it("asigna el error de una fila a su índice y campo", () => {
      const ticketTypes = [completeForm.ticketTypes[0], { ...emptyRow, id: "row-2", name: "VIP", price: "-5", quantity: "0" }];
      expect(getMessages({ ...completeForm, ticketTypes })).toEqual({
        "ticketTypes.1.price": "El precio debe ser 0 o mayor",
        "ticketTypes.1.quantity": "La cantidad debe ser un número entero mayor o igual a 1",
      });
    });

    it("acepta zonas generales y numeradas mezcladas", () => {
      const ticketTypes = [...completeForm.ticketTypes, numberedRow];
      expect(organizerEventFormSchema.safeParse({ ...completeForm, seatingMode: "mixed", ticketTypes }).success).toBe(true);
    });

    it("asigna el error de una zona numerada a su índice y campo", () => {
      const ticketTypes = [completeForm.ticketTypes[0], { ...numberedRow, rows: "31", seatsPerRow: "" }];
      expect(getMessages({ ...completeForm, ticketTypes })).toEqual({
        "ticketTypes.1.rows": "Las filas deben ser un número entero entre 1 y 30",
        "ticketTypes.1.seatsPerRow": "Ingresa los asientos por fila",
      });
    });

    it("el error de filas tiene el path [\"ticketTypes\", i, \"rows\"]", () => {
      const ticketTypes = [completeForm.ticketTypes[0], { ...numberedRow, rows: "0" }];
      const result = organizerEventFormSchema.safeParse({ ...completeForm, ticketTypes });
      expect(result.error?.issues.map((issue) => issue.path)).toEqual([["ticketTypes", 1, "rows"]]);
    });
  });

  describe("modo de ubicación", () => {
    const mixedError = "Un evento mixto necesita al menos una zona general (de pie) y una numerada";

    it("sin elegir da \"Elige cómo se ubica el público\"", () => {
      expect(getMessages({ ...completeForm, seatingMode: "" })).toEqual({ seatingMode: "Elige cómo se ubica el público" });
    });

    it("mixto con solo zonas generales da el error de mixto en seatingMode", () => {
      expect(getMessages({ ...completeForm, seatingMode: "mixed" })).toEqual({ seatingMode: mixedError });
    });

    it("mixto con solo zonas numeradas da el error de mixto", () => {
      const ticketTypes = [numberedRow, { ...numberedRow, id: "row-4" }];
      expect(getMessages({ ...completeForm, seatingMode: "mixed", ticketTypes })).toEqual({ seatingMode: mixedError });
    });

    it("mixto con una zona general y una numerada válidas es válido", () => {
      const ticketTypes = [completeForm.ticketTypes[0], numberedRow];
      expect(organizerEventFormSchema.safeParse({ ...completeForm, seatingMode: "mixed", ticketTypes }).success).toBe(true);
    });

    it("\"general\" solo con zonas generales y \"numbered\" solo con numeradas son válidos", () => {
      expect(organizerEventFormSchema.safeParse({ ...completeForm, seatingMode: "general" }).success).toBe(true);
      const values = { ...completeForm, seatingMode: "numbered" as const, ticketTypes: [numberedRow] };
      expect(organizerEventFormSchema.safeParse(values).success).toBe(true);
    });

    it("rechaza un modo desconocido, también en borrador", () => {
      const values = { ...completeForm, seatingMode: "vip" } as unknown as OrganizerEventFormValues;
      expect(Object.keys(getMessages(values))).toEqual(["seatingMode"]);
      expect(Object.keys(getMessages({ ...values, intent: "draft" }))).toEqual(["seatingMode"]);
    });
  });

  describe("ciudad", () => {
    it("una ciudad fuera de la lista da \"Elige la ciudad\"", () => {
      expect(getMessages({ ...completeForm, city: "Chiclayo" })).toEqual({ city: "Elige la ciudad" });
    });

    it.each(CITIES)("%s es válida", (city) => {
      expect(organizerEventFormSchema.safeParse({ ...completeForm, city }).success).toBe(true);
    });
  });

  describe("portada", () => {
    it("sin portada da \"Sube la imagen de portada\" con path [\"hasCoverImage\"]", () => {
      const result = organizerEventFormSchema.safeParse({ ...completeForm, hasCoverImage: false });
      expect(result.error?.issues.map((issue) => [issue.path, issue.message])).toEqual([
        [["hasCoverImage"], "Sube la imagen de portada"],
      ]);
    });
  });

  describe("máximo por compra y descripción de las filas", () => {
    it.each([
      ["", "Ingresa el máximo por compra"],
      ["0", "El máximo por compra debe ser un número entero entre 1 y 10"],
      ["11", "El máximo por compra debe ser un número entero entre 1 y 10"],
      ["2.5", "El máximo por compra debe ser un número entero entre 1 y 10"],
    ])("máximo %j da un solo mensaje con path [\"ticketTypes\", i, \"maxPerOrder\"]", (maxPerOrder, message) => {
      const ticketTypes = [completeForm.ticketTypes[0], { ...completeForm.ticketTypes[1], maxPerOrder }];
      const result = organizerEventFormSchema.safeParse({ ...completeForm, ticketTypes });
      expect(result.error?.issues.map((issue) => [issue.path, issue.message])).toEqual([
        [["ticketTypes", 1, "maxPerOrder"], message],
      ]);
    });

    it.each(["1", "10", " 5 "])("máximo %j es válido", (maxPerOrder) => {
      const ticketTypes = [{ ...completeForm.ticketTypes[0], maxPerOrder }];
      expect(organizerEventFormSchema.safeParse({ ...completeForm, ticketTypes }).success).toBe(true);
    });

    it("una descripción de 151 caracteres da error y una de 150 no", () => {
      const withDescription = (description: string) => ({
        ...completeForm,
        ticketTypes: [{ ...completeForm.ticketTypes[0], description }],
      });
      expect(getMessages(withDescription("x".repeat(151)))).toEqual({
        "ticketTypes.0.description": "La descripción debe tener como máximo 150 caracteres",
      });
      expect(organizerEventFormSchema.safeParse(withDescription("x".repeat(150))).success).toBe(true);
    });

    it("la longitud de la descripción se mide sin espacios al inicio ni al final", () => {
      const ticketTypes = [{ ...completeForm.ticketTypes[0], description: `  ${"x".repeat(150)}  ` }];
      expect(organizerEventFormSchema.safeParse({ ...completeForm, ticketTypes }).success).toBe(true);
    });
  });

  describe("borrador con zona numerada", () => {
    it("con filas fuera de rango no da errores", () => {
      const values = { ...emptyForm, intent: "draft" as const, name: "Mi borrador", ticketTypes: [{ ...numberedRow, rows: "500" }] };
      expect(organizerEventFormSchema.safeParse(values).success).toBe(true);
    });
  });

  describe("apertura de puertas", () => {
    it("posterior a la hora de inicio da el error de orden", () => {
      expect(getMessages({ ...completeForm, time: "20:00", doorsOpen: "21:00" })).toEqual({
        doorsOpen: "La apertura de puertas debe ser a la hora de inicio o antes",
      });
    });

    it.each(["20:00", "18:00", "00:00"])("%s con inicio a las 20:00 es válida", (doorsOpen) => {
      expect(organizerEventFormSchema.safeParse({ ...completeForm, time: "20:00", doorsOpen }).success).toBe(true);
    });

    it.each(["", "25:00", "20:60", "8:00"])("%j da \"Indica la hora de apertura de puertas\"", (doorsOpen) => {
      expect(getMessages({ ...completeForm, doorsOpen })).toEqual({ doorsOpen: "Indica la hora de apertura de puertas" });
    });

    it("con la hora de inicio no válida no compara el orden", () => {
      expect(getMessages({ ...completeForm, time: "", doorsOpen: "21:00" })).toEqual({ time: "Indica la hora de inicio" });
    });
  });

  describe("edad mínima", () => {
    it.each(MIN_AGE_OPTIONS)("acepta %j", (minAge) => {
      expect(organizerEventFormSchema.safeParse({ ...completeForm, minAge }).success).toBe(true);
    });

    it("rechaza una edad fuera de la lista, también en borrador", () => {
      const values = { ...completeForm, minAge: "21" } as unknown as OrganizerEventFormValues;
      expect(Object.keys(getMessages(values))).toEqual(["minAge"]);
      expect(Object.keys(getMessages({ ...values, intent: "draft" }))).toEqual(["minAge"]);
    });
  });

  describe("fecha", () => {
    it("ayer da error", () => {
      expect(getMessages({ ...completeForm, date: "2026-10-02" }).date).toBe("La fecha no puede ser anterior a hoy");
    });

    it("hoy en Lima es válido", () => {
      expect(organizerEventFormSchema.safeParse({ ...completeForm, date: "2026-10-03" }).success).toBe(true);
    });

    it("hoy en Lima es válido aunque en UTC ya sea mañana", () => {
      vi.setSystemTime(new Date("2026-10-03T03:00:00Z")); // 2 oct, 22:00 en Lima
      expect(organizerEventFormSchema.safeParse({ ...completeForm, date: "2026-10-02" }).success).toBe(true);
    });

    it.each(["2026-13-45", "2026-02-30", "05/12/2026"])("%s da fecha no válida", (date) => {
      expect(getMessages({ ...completeForm, date }).date).toBe("Elige una fecha válida");
    });
  });

  describe("hora", () => {
    it.each(["25:00", "20:60", "8:00"])("%s da error", (time) => {
      expect(getMessages({ ...completeForm, time }).time).toBe("Indica la hora de inicio");
    });

    it("acepta 00:00 y 23:59", () => {
      expect(organizerEventFormSchema.safeParse({ ...completeForm, time: "00:00", doorsOpen: "00:00" }).success).toBe(true);
      expect(organizerEventFormSchema.safeParse({ ...completeForm, time: "23:59" }).success).toBe(true);
    });
  });
});

describe("ticketTypeFormSchema", () => {
  const row = {
    id: "row-1",
    name: "General",
    price: "50",
    description: "",
    maxPerOrder: "10",
    kind: "general",
    quantity: "100",
    rows: "",
    seatsPerRow: "",
  };

  function getRowMessages(values: Partial<Record<keyof typeof row, string>>): string[] {
    const result = ticketTypeFormSchema.safeParse({ ...row, ...values });
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  }

  /** Mensajes por campo (`issue.path`), para comprobar que cada campo da uno solo. */
  function getRowMessagesByField(values: Partial<Record<keyof typeof row, string>>): Record<string, string[]> {
    const result = ticketTypeFormSchema.safeParse({ ...row, ...values });
    if (result.success) return {};
    const byField: Record<string, string[]> = {};
    for (const issue of result.error.issues) (byField[issue.path.join(".")] ??= []).push(issue.message);
    return byField;
  }

  it("define los límites de la zona numerada", () => {
    expect(SEAT_GRID_LIMITS).toEqual({ maxRows: 30, maxSeatsPerRow: 60 });
  });

  it("aplica el máximo por compra y la descripción también a las zonas numeradas", () => {
    expect(
      getRowMessagesByField({ kind: "numbered", rows: "10", seatsPerRow: "20", maxPerOrder: "11", description: "x".repeat(151) }),
    ).toEqual({
      maxPerOrder: ["El máximo por compra debe ser un número entero entre 1 y 10"],
      description: ["La descripción debe tener como máximo 150 caracteres"],
    });
  });

  it("una fila general válida pasa aunque filas y asientos sean basura", () => {
    expect(getRowMessages({ rows: "abc", seatsPerRow: "-1" })).toEqual([]);
  });

  it("una fila numerada válida pasa aunque la cantidad esté vacía", () => {
    expect(getRowMessages({ kind: "numbered", quantity: "", rows: "10", seatsPerRow: "20" })).toEqual([]);
  });

  it("acepta los límites de la zona numerada (1 × 1 y 30 × 60)", () => {
    expect(getRowMessages({ kind: "numbered", rows: "1", seatsPerRow: "1" })).toEqual([]);
    expect(getRowMessages({ kind: "numbered", rows: "30", seatsPerRow: "60" })).toEqual([]);
  });

  it.each([
    ["", "Ingresa el número de filas"],
    ["  ", "Ingresa el número de filas"],
    ["0", "Las filas deben ser un número entero entre 1 y 30"],
    ["31", "Las filas deben ser un número entero entre 1 y 30"],
    ["2.5", "Las filas deben ser un número entero entre 1 y 30"],
    ["abc", "Las filas deben ser un número entero entre 1 y 30"],
  ])("numerada con filas %j → %s", (rows, message) => {
    expect(getRowMessagesByField({ kind: "numbered", rows, seatsPerRow: "20" })).toEqual({ rows: [message] });
  });

  it.each([
    ["", "Ingresa los asientos por fila"],
    ["0", "Los asientos por fila deben ser un número entero entre 1 y 60"],
    ["61", "Los asientos por fila deben ser un número entero entre 1 y 60"],
    ["1.5", "Los asientos por fila deben ser un número entero entre 1 y 60"],
  ])("numerada con asientos por fila %j → %s", (seatsPerRow, message) => {
    expect(getRowMessagesByField({ kind: "numbered", rows: "10", seatsPerRow })).toEqual({ seatsPerRow: [message] });
  });

  it("numerada con filas y asientos vacíos da un mensaje por campo", () => {
    expect(getRowMessagesByField({ kind: "numbered", rows: "", seatsPerRow: "" })).toEqual({
      rows: ["Ingresa el número de filas"],
      seatsPerRow: ["Ingresa los asientos por fila"],
    });
  });

  it("rechaza un tipo de ubicación desconocido", () => {
    expect(ticketTypeFormSchema.safeParse({ ...row, kind: "vip" }).success).toBe(false);
  });

  it("acepta una fila completa y el precio 0", () => {
    expect(getRowMessages({})).toEqual([]);
    expect(getRowMessages({ price: "0" })).toEqual([]);
  });

  it.each([
    ["-5", "El precio debe ser 0 o mayor"],
    ["abc", "El precio debe ser 0 o mayor"],
    ["", "Ingresa el precio"],
    ["  ", "Ingresa el precio"],
  ])("precio %j → %s", (price, message) => {
    expect(getRowMessages({ price })).toEqual([message]);
  });

  it.each([
    ["0", "La cantidad debe ser un número entero mayor o igual a 1"],
    ["1.5", "La cantidad debe ser un número entero mayor o igual a 1"],
    ["", "Ingresa la cantidad"],
  ])("cantidad %j → %s", (quantity, message) => {
    expect(getRowMessages({ quantity })).toEqual([message]);
  });

  it("exige el nombre", () => {
    expect(getRowMessages({ name: " " })).toEqual(["Ingresa el nombre del tipo de entrada"]);
  });
});

describe("constantes del formulario", () => {
  it("define los modos de ubicación", () => {
    expect(seatingModeSchema.options).toEqual(["general", "numbered", "mixed"]);
  });

  it("define el largo de la descripción y las reglas de la portada", () => {
    expect(TICKET_DESCRIPTION_MAX_LENGTH).toBe(150);
    expect(COVER_IMAGE_RULES).toEqual({ maxBytes: 5 * 1024 * 1024, minWidth: 1200, minHeight: 675 });
  });
});

describe("MIN_AGE_OPTIONS", () => {
  it("lista las edades en orden, con \"0\" (Todo público) primero", () => {
    expect(MIN_AGE_OPTIONS).toEqual(["0", "12", "14", "16", "18"]);
  });

  it("usa el formato del detalle del evento", () => {
    expect(MIN_AGE_OPTIONS.map((age) => MIN_AGE_LABELS[age])).toEqual(["Todo público", "+12", "+14", "+16", "+18"]);
  });
});

describe("savedStatusSchema", () => {
  it.each([
    ["publicado", "publicado"],
    ["borrador", "borrador"],
    ["x", undefined],
    [undefined, undefined],
    [["publicado", "borrador"], undefined],
  ])("%j → %j", (input, expected) => {
    expect(savedStatusSchema.parse(input)).toBe(expected);
  });
});
