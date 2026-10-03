import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_CATEGORIES } from "@/modules/events";
import type { OrganizerEventFormValues } from "../types/organizer.types";
import {
  EVENT_CATEGORY_OPTIONS,
  organizerEventFormSchema,
  organizerEventSchema,
  SEAT_GRID_LIMITS,
  savedStatusSchema,
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

const emptyRow = { id: "row-1", name: "", price: "", kind: "general" as const, quantity: "", rows: "", seatsPerRow: "" };

const emptyForm: OrganizerEventFormValues = {
  intent: "publish",
  name: "",
  category: "conciertos",
  description: "",
  date: "",
  time: "",
  venue: "",
  city: "",
  ticketTypes: [emptyRow],
};

const completeForm: OrganizerEventFormValues = {
  intent: "publish",
  name: "Festival de verano 2026",
  category: "festivales",
  description: "Tres escenarios y comida local.",
  date: "2026-12-05",
  time: "20:00",
  venue: "Estadio Nacional",
  city: "Lima",
  ticketTypes: [
    { id: "row-1", name: "General", price: "50", kind: "general", quantity: "100", rows: "", seatsPerRow: "" },
    { id: "row-2", name: "VIP", price: "80", kind: "general", quantity: "50", rows: "", seatsPerRow: "" },
  ],
};

const numberedRow = { id: "row-3", name: "Platea", price: "120", kind: "numbered" as const, quantity: "", rows: "10", seatsPerRow: "20" };

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

    it("guarda campos inválidos sin errores", () => {
      const values = { ...emptyForm, intent: "draft" as const, name: "Mi borrador", date: "2020-01-01", time: "25:00" };
      expect(organizerEventFormSchema.safeParse(values).success).toBe(true);
    });
  });

  describe("publicar", () => {
    it("con todo vacío da todos los errores a la vez", () => {
      expect(getMessages(emptyForm)).toEqual({
        name: "Ingresa el nombre del evento",
        description: "Agrega una descripción del evento",
        date: "Elige la fecha del evento",
        time: "Indica la hora de inicio",
        venue: "Indica el lugar del evento",
        city: "Indica la ciudad",
        "ticketTypes.0.name": "Ingresa el nombre del tipo de entrada",
        "ticketTypes.0.price": "Ingresa el precio",
        "ticketTypes.0.quantity": "Ingresa la cantidad",
      });
    });

    it("trata los textos con solo espacios como vacíos", () => {
      const messages = getMessages({ ...completeForm, description: "  ", venue: " ", city: "\t" });
      expect(messages).toEqual({
        description: "Agrega una descripción del evento",
        venue: "Indica el lugar del evento",
        city: "Indica la ciudad",
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
      expect(organizerEventFormSchema.safeParse({ ...completeForm, ticketTypes }).success).toBe(true);
    });

    it("asigna el error de una zona numerada a su índice y campo", () => {
      const ticketTypes = [completeForm.ticketTypes[0], { ...numberedRow, rows: "31", seatsPerRow: "" }];
      expect(getMessages({ ...completeForm, ticketTypes })).toEqual({
        "ticketTypes.1.rows": "Las filas deben ser un número entero entre 1 y 30",
        "ticketTypes.1.seatsPerRow": "Ingresa los asientos por fila",
      });
    });
  });

  describe("borrador con zona numerada", () => {
    it("con filas fuera de rango no da errores", () => {
      const values = { ...emptyForm, intent: "draft" as const, name: "Mi borrador", ticketTypes: [{ ...numberedRow, rows: "500" }] };
      expect(organizerEventFormSchema.safeParse(values).success).toBe(true);
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
      expect(organizerEventFormSchema.safeParse({ ...completeForm, time: "00:00" }).success).toBe(true);
      expect(organizerEventFormSchema.safeParse({ ...completeForm, time: "23:59" }).success).toBe(true);
    });
  });
});

describe("ticketTypeFormSchema", () => {
  const row = { id: "row-1", name: "General", price: "50", kind: "general", quantity: "100", rows: "", seatsPerRow: "" };

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
