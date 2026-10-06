import { describe, expect, it } from "vitest";
import type { VenueLayout } from "../types/seating.types";
import { toSeededLayout } from "./seededLayout";

const seat = (id: string, status: "available" | "occupied" | "accessible") => ({
  id,
  row: "A",
  number: Number(id.at(-1)),
  x: 0,
  y: 0,
  status,
});

const layout = {
  eventSlug: "evento",
  viewBox: "0 0 600 400",
  stage: { label: "ESCENARIO", path: "M 0 0 Z", labelPos: { x: 0, y: 0 } },
  zones: [
    { id: "general", ticketTypeId: "general", kind: "general", capacity: 10, path: "M 0 0 Z", labelPos: { x: 0, y: 0 } },
    {
      id: "platea",
      ticketTypeId: "platea",
      kind: "numbered",
      path: "M 0 0 Z",
      labelPos: { x: 0, y: 0 },
      seatViewBox: "0 0 100 100",
      rows: [{ label: "A", seats: [seat("platea-A-1", "occupied"), seat("platea-A-2", "accessible"), seat("platea-A-3", "available")] }],
    },
  ],
} as unknown as VenueLayout;

describe("toSeededLayout", () => {
  it("deja disponibles las butacas ocupadas y no cambia nada más", () => {
    const seeded = toSeededLayout(layout);
    const platea = seeded.zones[1];
    if (platea.kind !== "numbered") throw new Error("platea debería ser numerada");

    expect(platea.rows[0].seats.map((candidate) => candidate.status)).toEqual(["available", "accessible", "available"]);
    expect({ ...seeded, zones: [] }).toEqual({ ...layout, zones: [] });
    expect(seeded.zones[0]).toBe(layout.zones[0]);
  });

  it("no muta el layout original", () => {
    const before = structuredClone(layout);
    toSeededLayout(layout);
    expect(layout).toEqual(before);
  });
});
