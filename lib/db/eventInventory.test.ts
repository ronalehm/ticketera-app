import { describe, expect, it } from "vitest";
import { buildEventSeatRows, generalSeatPlan } from "./eventInventory";

describe("generalSeatPlan", () => {
  it("da `capacity` lugares sin butaca con claves estables", () => {
    expect(generalSeatPlan("campo", 3)).toEqual([
      { venueSeatId: null, key: "campo:0" },
      { venueSeatId: null, key: "campo:1" },
      { venueSeatId: null, key: "campo:2" },
    ]);
    expect(generalSeatPlan("campo", 0)).toEqual([]);
  });
});

describe("buildEventSeatRows", () => {
  const plan = [
    { venueSeatId: "seat-1", key: "platea-A-1" },
    { venueSeatId: null, key: "campo:0" },
  ];

  it("crea una fila disponible y sin orden por lugar, sin id (lo pone la BD)", () => {
    expect(buildEventSeatRows("event-1", "type-1", plan)).toEqual([
      { eventId: "event-1", ticketTypeId: "type-1", venueSeatId: "seat-1", status: "available", orderId: null },
      { eventId: "event-1", ticketTypeId: "type-1", venueSeatId: null, status: "available", orderId: null },
    ]);
  });

  it("con `idFor` da a cada fila el id de su clave (seed determinista)", () => {
    const rows = buildEventSeatRows("event-1", "type-1", plan, (key) => `id:${key}`);
    expect(rows.map((row) => row.id)).toEqual(["id:platea-A-1", "id:campo:0"]);
  });
});
