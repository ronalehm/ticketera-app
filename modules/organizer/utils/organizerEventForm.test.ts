import { afterEach, describe, expect, it, vi } from "vitest";
import { organizerEventSchema } from "../schemas/organizer.schema";
import type { OrganizerEventFormValues, TicketTypeRow } from "../types/organizer.types";
import {
  applySeatingMode,
  buildStartsAt,
  createTicketTypeRow,
  formatSeatGridSummary,
  formatTicketCount,
  getCoverImageError,
  getMinTicketPrice,
  getNewRowKind,
  getRowCapacity,
  getSeatGridSize,
  getTicketCapacity,
  getTicketTypeErrors,
  toOrganizerEvent,
} from "./organizerEventForm";

const ROW_DEFAULTS = { description: "", maxPerOrder: "10" };

function row(price: string, quantity: string, name = "General"): TicketTypeRow {
  return { ...ROW_DEFAULTS, id: `row-${price}-${quantity}`, name, price, kind: "general", quantity, rows: "", seatsPerRow: "" };
}

function numbered(rows: string, seatsPerRow: string, price = "120", name = "Platea"): TicketTypeRow {
  return { ...ROW_DEFAULTS, id: `row-${rows}-${seatsPerRow}`, name, price, kind: "numbered", quantity: "", rows, seatsPerRow };
}

describe("createTicketTypeRow", () => {
  it("crea una fila general vacía con un id único, sin descripción y con máximo por compra 10", () => {
    const first = createTicketTypeRow();
    const second = createTicketTypeRow();
    expect(first).toEqual({
      id: expect.any(String),
      name: "",
      price: "",
      description: "",
      maxPerOrder: "10",
      kind: "general",
      quantity: "",
      rows: "",
      seatsPerRow: "",
    });
    expect(first.id).not.toBe(second.id);
  });

  it("crea una fila del tipo indicado", () => {
    expect(createTicketTypeRow("numbered").kind).toBe("numbered");
    expect(createTicketTypeRow("general").kind).toBe("general");
  });
});

describe("getNewRowKind", () => {
  it.each([
    ["numbered", "numbered"],
    ["general", "general"],
    ["mixed", "general"],
    ["", "general"],
  ] as const)("%j → %s", (mode, expected) => {
    expect(getNewRowKind(mode)).toBe(expected);
  });
});

describe("applySeatingMode", () => {
  const general = { ...row("50", "100"), rows: "5", seatsPerRow: "8" };
  const seated = { ...numbered("10", "20"), quantity: "30" };

  it.each(["general", "numbered"] as const)("%s fuerza el tipo y conserva cantidad, filas y asientos", (mode) => {
    expect(applySeatingMode([general, seated], mode)).toEqual([
      { ...general, kind: mode },
      { ...seated, kind: mode },
    ]);
  });

  it("mixed no cambia nada", () => {
    expect(applySeatingMode([general, seated], "mixed")).toEqual([general, seated]);
  });

  it.each(["general", "numbered", "mixed"] as const)("%s devuelve objetos nuevos sin mutar los originales", (mode) => {
    const rows = [general, seated];
    const result = applySeatingMode(rows, mode);
    expect(result).not.toBe(rows);
    result.forEach((value, index) => expect(value).not.toBe(rows[index]));
    expect(rows).toEqual([general, { ...numbered("10", "20"), quantity: "30" }]);
  });

  it("ir y volver de modo no pierde la cantidad", () => {
    const back = applySeatingMode(applySeatingMode([general], "numbered"), "general");
    expect(back).toEqual([general]);
  });
});

describe("getCoverImageError", () => {
  const close = vi.fn();

  function mockBitmap(width: number, height: number) {
    const createImageBitmap = vi.fn().mockResolvedValue({ width, height, close });
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    return createImageBitmap;
  }

  /** Archivo del tipo y peso indicados (el contenido no importa: el tamaño en píxeles lo da el mock). */
  function image(type: string, bytes = 1024) {
    return new File([new Uint8Array(bytes)], "portada", { type });
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    close.mockClear();
  });

  it.each(["image/png", "image/jpeg"])("%s de 1920 × 1080 → null y cierra el bitmap", async (type) => {
    const createImageBitmap = mockBitmap(1920, 1080);
    const file = image(type);
    await expect(getCoverImageError(file)).resolves.toBeNull();
    expect(createImageBitmap).toHaveBeenCalledWith(file);
    expect(close).toHaveBeenCalledOnce();
  });

  it("acepta exactamente 1200 × 675 y 5 MB", async () => {
    mockBitmap(1200, 675);
    await expect(getCoverImageError(image("image/jpeg", 5 * 1024 * 1024))).resolves.toBeNull();
  });

  it.each(["image/gif", "image/webp", "application/pdf"])("%s → error de formato sin leer la imagen", async (type) => {
    const createImageBitmap = mockBitmap(1920, 1080);
    await expect(getCoverImageError(image(type))).resolves.toBe("Sube una imagen en formato JPG o PNG.");
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("el formato tiene prioridad sobre el peso", async () => {
    mockBitmap(1920, 1080);
    await expect(getCoverImageError(image("image/gif", 6 * 1024 * 1024))).resolves.toBe(
      "Sube una imagen en formato JPG o PNG.",
    );
  });

  it("un JPG de 6 MB → error de peso sin leer la imagen", async () => {
    const createImageBitmap = mockBitmap(1920, 1080);
    await expect(getCoverImageError(image("image/jpeg", 6 * 1024 * 1024))).resolves.toBe(
      "La imagen pesa más de 5 MB. Sube una más liviana.",
    );
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it("una imagen que no se puede leer → error de lectura", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new DOMException("bad", "InvalidStateError")));
    await expect(getCoverImageError(image("image/png"))).resolves.toBe(
      "No se pudo leer la imagen. Prueba con otro archivo.",
    );
  });

  it.each([
    [800, 600],
    [1199, 1080],
    [1920, 674],
    [675, 1200],
  ])("%i × %i → error de tamaño y cierra el bitmap", async (width, height) => {
    mockBitmap(width, height);
    await expect(getCoverImageError(image("image/png"))).resolves.toBe("La imagen debe medir al menos 1200 × 675 px.");
    expect(close).toHaveBeenCalledOnce();
  });
});

describe("getSeatGridSize", () => {
  it("devuelve filas y asientos de una zona numerada válida", () => {
    expect(getSeatGridSize(numbered("10", "20"))).toEqual({ rows: 10, seatsPerRow: 20 });
  });

  it("acepta los límites 30 × 60 y recorta espacios", () => {
    expect(getSeatGridSize(numbered("30", "60"))).toEqual({ rows: 30, seatsPerRow: 60 });
    expect(getSeatGridSize(numbered(" 1 ", "1"))).toEqual({ rows: 1, seatsPerRow: 1 });
  });

  it.each([
    ["31", "20"],
    ["10", "61"],
    ["", "20"],
    ["2.5", "20"],
    ["0", "20"],
    ["10", "abc"],
  ])("(%j, %j) → null", (rows, seatsPerRow) => {
    expect(getSeatGridSize(numbered(rows, seatsPerRow))).toBeNull();
  });

  it("una fila general → null aunque tenga filas y asientos", () => {
    expect(getSeatGridSize({ ...row("50", "100"), rows: "10", seatsPerRow: "20" })).toBeNull();
  });
});

describe("getRowCapacity", () => {
  it("general: la cantidad", () => {
    expect(getRowCapacity(row("50", "100"))).toBe(100);
  });

  it("numerada: filas × asientos por fila", () => {
    expect(getRowCapacity(numbered("10", "20"))).toBe(200);
  });

  it.each([row("50", ""), row("50", "0"), row("50", "1.5"), numbered("31", "20"), numbered("", "")])(
    "inválida → null (%#)",
    (value) => {
      expect(getRowCapacity(value)).toBeNull();
    },
  );

  it("numerada: ignora la cantidad", () => {
    expect(getRowCapacity({ ...numbered("", ""), quantity: "999" })).toBeNull();
  });
});

describe("formatSeatGridSummary", () => {
  it.each<[{ rows: number; seatsPerRow: number }, number | null, string]>([
    [{ rows: 10, seatsPerRow: 20 }, 120, "Filas A–J · 20 asientos por fila · S/ 120.00 c/u"],
    [{ rows: 1, seatsPerRow: 1 }, null, "Fila A · 1 asiento por fila"],
    [{ rows: 10, seatsPerRow: 20 }, 0, "Filas A–J · 20 asientos por fila · Entrada libre"],
    [{ rows: 30, seatsPerRow: 60 }, null, "Filas A–AD · 60 asientos por fila"],
  ])("%j con precio %j → %s", (size, price, expected) => {
    expect(formatSeatGridSummary(size, price)).toBe(expected);
  });
});

describe("getTicketCapacity", () => {
  it("suma las cantidades válidas", () => {
    expect(getTicketCapacity([row("50", "100"), row("80", "50")])).toBe(150);
  });

  it("ignora filas vacías o inválidas", () => {
    expect(getTicketCapacity([row("50", "100"), row("", ""), row("1", "0"), row("1", "1.5"), row("1", "abc"), row("80", " 50 ")])).toBe(150);
  });

  it("da 0 sin cantidades válidas", () => {
    expect(getTicketCapacity([row("", "")])).toBe(0);
  });

  it("suma generales y numeradas; las numeradas inválidas no cuentan", () => {
    expect(getTicketCapacity([row("50", "100"), numbered("10", "20"), numbered("31", "20")])).toBe(300);
  });

  it("una numerada no suma su cantidad", () => {
    expect(getTicketCapacity([{ ...numbered("", ""), quantity: "999" }])).toBe(0);
  });
});

describe("getMinTicketPrice", () => {
  it.each<[string[], number | null]>([
    [["80", "120"], 80],
    [["0", "50"], 0],
    [["", ""], null],
    [["-5", "30"], 30],
    [["-5"], null],
    [["12.50", "abc"], 12.5],
  ])("%j → %j", (prices, expected) => {
    expect(getMinTicketPrice(prices.map((price) => row(price, "1")))).toBe(expected);
  });
});

describe("formatTicketCount", () => {
  it.each([
    [0, "0 entradas"],
    [1, "1 entrada"],
    [150, "150 entradas"],
    [1500, "1,500 entradas"],
  ])("%i → %s", (n, expected) => {
    expect(formatTicketCount(n)).toBe(expected);
  });
});

describe("buildStartsAt", () => {
  it("une fecha y hora con el offset de Lima", () => {
    expect(buildStartsAt("2026-12-05", "20:00")).toBe("2026-12-05T20:00:00-05:00");
  });

  it.each([
    ["2026-12-05", ""],
    ["", "20:00"],
    ["2026-13-45", "20:00"],
    ["2026-12-05", "25:00"],
  ])("(%j, %j) → null", (date, time) => {
    expect(buildStartsAt(date, time)).toBeNull();
  });
});

describe("getTicketTypeErrors", () => {
  it("devuelve los mensajes de cada fila por campo", () => {
    const rows = [row("50", "100"), row("", "", ""), row("-5", "0"), row("abc", "1.5")];
    expect(getTicketTypeErrors(rows)).toEqual([
      {},
      { name: "Ingresa el nombre del tipo de entrada", price: "Ingresa el precio", quantity: "Ingresa la cantidad" },
      { price: "El precio debe ser 0 o mayor", quantity: "La cantidad debe ser un número entero mayor o igual a 1" },
      { price: "El precio debe ser 0 o mayor", quantity: "La cantidad debe ser un número entero mayor o igual a 1" },
    ]);
  });

  it("devuelve los mensajes por campo de una zona numerada", () => {
    const rows = [numbered("10", "20"), numbered("", ""), numbered("31", "61"), numbered("2.5", "0")];
    expect(getTicketTypeErrors(rows)).toEqual([
      {},
      { rows: "Ingresa el número de filas", seatsPerRow: "Ingresa los asientos por fila" },
      {
        rows: "Las filas deben ser un número entero entre 1 y 30",
        seatsPerRow: "Los asientos por fila deben ser un número entero entre 1 y 60",
      },
      {
        rows: "Las filas deben ser un número entero entre 1 y 30",
        seatsPerRow: "Los asientos por fila deben ser un número entero entre 1 y 60",
      },
    ]);
  });

  it("devuelve los mensajes de máximo por compra y descripción", () => {
    const rows = [
      { ...row("50", "100"), maxPerOrder: "" },
      { ...numbered("10", "20"), maxPerOrder: "11", description: "x".repeat(151) },
      { ...row("50", "100"), maxPerOrder: "1", description: "Campo de pie, sin ubicación asignada." },
    ];
    expect(getTicketTypeErrors(rows)).toEqual([
      { maxPerOrder: "Ingresa el máximo por compra" },
      {
        description: "La descripción debe tener como máximo 150 caracteres",
        maxPerOrder: "El máximo por compra debe ser un número entero entre 1 y 10",
      },
      {},
    ]);
  });
});

describe("toOrganizerEvent", () => {
  const published: OrganizerEventFormValues = {
    intent: "publish",
    name: "  Festival de verano 2026 ",
    category: "festivales",
    minAge: "0",
    description: "Tres escenarios.",
    organizer: "",
    date: "2026-12-05",
    time: "20:00",
    doorsOpen: "",
    venue: " Estadio Nacional ",
    city: " Lima ",
    address: "",
    seatingMode: "general",
    hasCoverImage: true,
    ticketTypes: [row("50", "100"), row("80", "50", "VIP")],
  };

  it("convierte un formulario publicado", () => {
    const event = toOrganizerEvent(published, "org-123");
    expect(event).toEqual({
      id: "org-123",
      title: "Festival de verano 2026",
      category: "festivales",
      startsAt: "2026-12-05T20:00:00-05:00",
      venue: "Estadio Nacional",
      city: "Lima",
      imageUrl: null,
      priceFrom: 50,
      sold: 0,
      capacity: 150,
      status: "published",
    });
    expect(organizerEventSchema.safeParse(event).success).toBe(true);
  });

  it("con zonas mixtas suma los asientos de las numeradas", () => {
    const values: OrganizerEventFormValues = {
      ...published,
      ticketTypes: [row("50", "100"), numbered("10", "20"), numbered("31", "20", "80", "Galería")],
    };
    const event = toOrganizerEvent(values, "org-789");
    expect(event).toMatchObject({ capacity: 300, priceFrom: 50 });
    expect(organizerEventSchema.safeParse(event).success).toBe(true);
  });

  it("convierte un borrador con solo el nombre", () => {
    const draft: OrganizerEventFormValues = {
      ...published,
      intent: "draft",
      name: "Mi borrador",
      date: "",
      time: "",
      venue: "",
      city: "",
      ticketTypes: [row("", "", "")],
    };
    const event = toOrganizerEvent(draft, "org-456");
    expect(event).toMatchObject({
      id: "org-456",
      title: "Mi borrador",
      startsAt: null,
      venue: "",
      city: "",
      imageUrl: null,
      priceFrom: null,
      sold: 0,
      capacity: 0,
      status: "draft",
    });
    expect(organizerEventSchema.safeParse(event).success).toBe(true);
  });
});
