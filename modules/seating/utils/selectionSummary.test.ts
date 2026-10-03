import { describe, expect, it } from "vitest";
import type { NumberedVenueZone, SeatSelection, VenueMap } from "../types/seating.types";
import { formatSeatId } from "./seatIds";
import {
  buildSeatingCheckoutHref,
  formatTicketCount,
  getSelectionLines,
  getSelectionTicketCount,
  getSelectionTotal,
  toCheckoutQuantities,
} from "./selectionSummary";

function numberedZone(id: string, ticketTypeId: string, name: string, price: number): NumberedVenueZone {
  return {
    kind: "numbered",
    id,
    ticketTypeId,
    path: "M20 180 H580 V260 H20 Z",
    labelPos: { x: 300, y: 220 },
    seatViewBox: "0 0 112 96",
    rows: [{ label: "A", seats: [{ id: formatSeatId(id, "A", 1), row: "A", number: 1, x: 56, y: 48, status: "available" }] }],
    name,
    price,
    status: "available",
  };
}

const map: VenueMap = {
  eventSlug: "evento-prueba",
  venue: "Recinto de prueba",
  viewBox: "0 0 600 520",
  stage: { label: "ESCENARIO", path: "M200 16 H400 V60 H200 Z", labelPos: { x: 300, y: 46 } },
  zones: [
    {
      kind: "general",
      id: "vip",
      ticketTypeId: "vip-pass",
      path: "M150 76 H450 V160 H150 Z",
      labelPos: { x: 300, y: 118 },
      capacity: 100,
      name: "VIP",
      price: 550,
      status: "available",
    },
    numberedZone("norte", "tribuna-norte", "Tribuna Norte", 220),
    numberedZone("platea-baja", "platea-baja", "Platea Baja", 150),
    {
      kind: "general",
      id: "general",
      ticketTypeId: "general",
      path: "M20 400 H580 V500 H20 Z",
      labelPos: { x: 300, y: 450 },
      capacity: 1000,
      name: "General",
      price: 180,
      status: "available",
    },
  ],
};

function selection(quantities: Record<string, number>, seatIds: string[] = []): SeatSelection {
  return { quantities, seatIds };
}

describe("getSelectionLines", () => {
  it("devuelve una línea por zona con entradas, en el orden de map.zones", () => {
    const lines = getSelectionLines(map, selection({ general: 2, vip: 1 }, ["norte-F-12"]));
    expect(lines).toEqual([
      { zoneId: "vip", name: "VIP", quantity: 1, amount: 550, seatLabels: [] },
      { zoneId: "norte", name: "Tribuna Norte", quantity: 1, amount: 220, seatLabels: ["Fila F · Asiento 12"] },
      { zoneId: "general", name: "General", quantity: 2, amount: 360, seatLabels: [] },
    ]);
  });

  it("agrupa los asientos por zona (tomada del id) con etiqueta corta en el orden de selección", () => {
    const lines = getSelectionLines(map, selection({}, ["platea-baja-AA-101", "norte-F-12", "platea-baja-B-2"]));
    expect(lines).toEqual([
      { zoneId: "norte", name: "Tribuna Norte", quantity: 1, amount: 220, seatLabels: ["Fila F · Asiento 12"] },
      {
        zoneId: "platea-baja",
        name: "Platea Baja",
        quantity: 2,
        amount: 300,
        seatLabels: ["Fila AA · Asiento 101", "Fila B · Asiento 2"],
      },
    ]);
  });

  it("omite las zonas con cantidad 0", () => {
    expect(getSelectionLines(map, selection({ vip: 0, general: 1 }))).toEqual([
      { zoneId: "general", name: "General", quantity: 1, amount: 180, seatLabels: [] },
    ]);
  });

  it("sin entradas no devuelve líneas", () => {
    expect(getSelectionLines(map, selection({}))).toEqual([]);
  });
});

describe("getSelectionTicketCount", () => {
  it("suma entradas de pie y asientos", () => {
    expect(getSelectionTicketCount(selection({ vip: 1, general: 2 }, ["norte-F-12", "norte-F-13"]))).toBe(5);
  });

  it("es 0 sin entradas o con cantidades en 0", () => {
    expect(getSelectionTicketCount(selection({}))).toBe(0);
    expect(getSelectionTicketCount(selection({ vip: 0 }))).toBe(0);
  });
});

describe("getSelectionTotal", () => {
  it("suma los importes de todas las zonas", () => {
    expect(getSelectionTotal(map, selection({ vip: 1, general: 2 }, ["norte-F-12", "platea-baja-A-1"]))).toBe(
      550 + 360 + 220 + 150,
    );
  });

  it("es 0 sin entradas", () => {
    expect(getSelectionTotal(map, selection({}))).toBe(0);
  });
});

describe("toCheckoutQuantities", () => {
  it("convierte zonas en ticketTypeId, en el orden de map.zones y sin cantidades 0", () => {
    const quantities = toCheckoutQuantities(
      map,
      selection({ general: 2, vip: 1, other: 0 }, ["platea-baja-A-1", "norte-F-12", "norte-F-13"]),
    );
    expect(quantities).toEqual({ "vip-pass": 1, "tribuna-norte": 2, "platea-baja": 1, general: 2 });
    expect(Object.keys(quantities)).toEqual(["vip-pass", "tribuna-norte", "platea-baja", "general"]);
  });

  it("omite las zonas con cantidad 0", () => {
    expect(toCheckoutQuantities(map, selection({ vip: 0, general: 3 }))).toEqual({ general: 3 });
  });
});

describe("buildSeatingCheckoutHref", () => {
  it("sin asientos, solo lleva las cantidades por tipo de entrada", () => {
    expect(buildSeatingCheckoutHref("evento-prueba", map, selection({ general: 2, vip: 1 }))).toBe(
      "/checkout?evento=evento-prueba&vip-pass=1&general=2",
    );
  });

  it("con asientos, añade asientos con la coma codificada y en el orden de selección", () => {
    expect(buildSeatingCheckoutHref("evento-prueba", map, selection({ general: 1 }, ["norte-F-12", "norte-A-3"]))).toBe(
      "/checkout?evento=evento-prueba&tribuna-norte=2&general=1&asientos=norte-F-12%2Cnorte-A-3",
    );
  });

  it("devuelve null con 0 entradas", () => {
    expect(buildSeatingCheckoutHref("evento-prueba", map, selection({}))).toBeNull();
    expect(buildSeatingCheckoutHref("evento-prueba", map, selection({ general: 0 }))).toBeNull();
  });
});

describe("formatTicketCount", () => {
  it.each([
    [0, "0 entradas"],
    [1, "1 entrada"],
    [3, "3 entradas"],
  ])("%i → %s", (count, label) => {
    expect(formatTicketCount(count)).toBe(label);
  });
});
