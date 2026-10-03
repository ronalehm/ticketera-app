import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { seatIdsParamSchema, venueLayoutSchema } from "./seating.schema";

type LayoutInput = z.input<typeof venueLayoutSchema>;

function seat(zoneId: string, row: string, number: number) {
  return { id: `${zoneId}-${row}-${number}`, row, number, x: number * 32, y: 88, status: "available" as const };
}

// Layout mínimo válido: una zona de pie y una numerada con 2 filas.
function validLayout(): LayoutInput {
  return {
    eventSlug: "evento-prueba",
    viewBox: "0 0 600 400",
    stage: { label: "ESCENARIO", path: "M200 16 H400 V60 H200 Z", labelPos: { x: 300, y: 46 } },
    zones: [
      {
        kind: "general",
        id: "general",
        ticketTypeId: "general",
        path: "M20 80 H580 V200 H20 Z",
        labelPos: { x: 300, y: 140 },
        capacity: 500,
      },
      {
        kind: "numbered",
        id: "platea-baja",
        ticketTypeId: "platea",
        path: "M20 220 H580 V380 H20 Z",
        labelPos: { x: 300, y: 300 },
        seatViewBox: "0 0 144 160",
        rows: [
          { label: "A", seats: [seat("platea-baja", "A", 1), seat("platea-baja", "A", 2)] },
          { label: "AA", seats: [seat("platea-baja", "AA", 1)] },
        ],
      },
    ],
  };
}

type NumberedInput = Extract<LayoutInput["zones"][number], { kind: "numbered" }>;

function withNumbered(change: (zone: NumberedInput) => void): LayoutInput {
  const layout = validLayout();
  change(layout.zones[1] as NumberedInput);
  return layout;
}

// Layout con una propiedad quitada de una zona (para probar campos obligatorios).
function withoutZoneKey(zoneIndex: number, key: string): unknown {
  const layout = validLayout();
  const zone: Record<string, unknown> = { ...layout.zones[zoneIndex] };
  delete zone[key];
  return { ...layout, zones: layout.zones.map((current, index) => (index === zoneIndex ? zone : current)) };
}

describe("venueLayoutSchema", () => {
  it("acepta un layout mínimo válido", () => {
    expect(venueLayoutSchema.safeParse(validLayout()).success).toBe(true);
  });

  // Reglas del superRefine: cada caso rompe solo su regla, así que se comprueba el mensaje exacto.
  it.each<[string, () => LayoutInput, string]>([
    [
      "zona duplicada",
      () => {
        const layout = validLayout();
        layout.zones[0].id = "platea-baja";
        return layout;
      },
      "Zona duplicada: platea-baja",
    ],
    [
      "ticketTypeId duplicado",
      () => {
        const layout = validLayout();
        layout.zones[1].ticketTypeId = "general";
        return layout;
      },
      "ticketTypeId duplicado: general",
    ],
    [
      "seat.id que no coincide con formatSeatId",
      () =>
        withNumbered((zone) => {
          zone.rows[0].seats[0].id = "platea-A-1";
        }),
      "Id de asiento inválido: platea-A-1",
    ],
    [
      "seat.row distinto de row.label",
      () =>
        withNumbered((zone) => {
          zone.rows[0].seats[1] = { ...seat("platea-baja", "AA", 2), id: "platea-baja-A-2" };
        }),
      "El asiento platea-baja-A-2 no es de la fila A",
    ],
    [
      "fila repetida",
      () =>
        withNumbered((zone) => {
          zone.rows[1] = { label: "A", seats: [seat("platea-baja", "A", 3)] };
        }),
      "Fila duplicada en platea-baja: A",
    ],
    [
      "número repetido en una fila",
      () =>
        withNumbered((zone) => {
          zone.rows[0].seats[1] = seat("platea-baja", "A", 1);
        }),
      "Asiento duplicado en la fila A: 1",
    ],
  ])("rechaza %s", (_, build, message) => {
    const result = venueLayoutSchema.safeParse(build());
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([message]);
  });

  it.each<[string, () => unknown]>([
    ["viewBox inválido", () => ({ ...validLayout(), viewBox: "0 0 600" })],
    [
      "zona numerada con rows vacío",
      () =>
        withNumbered((zone) => {
          zone.rows = [];
        }),
    ],
    ["zona numerada sin rows", () => withoutZoneKey(1, "rows")],
    ["zona general sin capacity", () => withoutZoneKey(0, "capacity")],
    ["sin zonas", () => ({ ...validLayout(), zones: [] })],
  ])("rechaza %s", (_, build) => {
    expect(venueLayoutSchema.safeParse(build()).success).toBe(false);
  });
});

describe("seatIdsParamSchema", () => {
  const ids = (count: number) => Array.from({ length: count }, (_, index) => `norte-A-${index + 1}`);

  it("acepta 1 y 10 ids", () => {
    expect(seatIdsParamSchema.parse("norte-A-1")).toEqual(["norte-A-1"]);
    expect(seatIdsParamSchema.parse(ids(10).join(","))).toEqual(ids(10));
  });

  it("acepta zonas con guiones y filas de 2 letras", () => {
    expect(seatIdsParamSchema.parse("platea-baja-AA-101")).toEqual(["platea-baja-AA-101"]);
  });

  it.each([
    ["11 ids", ids(11).join(",")],
    ["vacío", ""],
    ["duplicados", "norte-A-1,norte-A-1"],
    ["coma final", "norte-A-1,"],
    ["fila en minúsculas", "norte-a-1"],
    ["fila de 3 letras", "norte-ABC-1"],
    ["número de 4 dígitos", "norte-A-1000"],
    ["sin zona", "A-1"],
    ["con espacios", "norte-A-1, norte-A-2"],
  ])("rechaza %s", (_, value) => {
    expect(seatIdsParamSchema.safeParse(value).success).toBe(false);
  });
});
