import { describe, expect, it } from "vitest";
import { managedEventsFiltersSchema } from "./managedEvents.schema";

describe("managedEventsFiltersSchema", () => {
  it("rellena los valores por defecto", () => {
    expect(managedEventsFiltersSchema.parse({})).toEqual({ status: "all", q: "", from: "", to: "" });
  });

  it.each([
    [{ from: "2026-10-05", to: "" }],
    [{ from: "", to: "2026-10-05" }],
    [{ from: "2026-10-05", to: "2026-10-06" }],
    [{ from: "2026-10-05", to: "2026-10-05" }],
  ])("acepta el rango %o", (range) => {
    expect(managedEventsFiltersSchema.parse({ status: "draft", q: "feria", ...range })).toEqual({
      status: "draft",
      q: "feria",
      ...range,
    });
  });

  it.each(["05/10/2026", "2026-13-01", "2026-10-05T00:00:00Z", "hoy"])("rechaza el formato %s", (value) => {
    expect(managedEventsFiltersSchema.safeParse({ from: value }).success).toBe(false);
    expect(managedEventsFiltersSchema.safeParse({ to: value }).success).toBe(false);
  });

  it("rechaza from > to en el campo to", () => {
    const result = managedEventsFiltersSchema.safeParse({ from: "2026-10-06", to: "2026-10-05" });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["to"], message: "La fecha Hasta no puede ser anterior a Desde" }),
    ]);
  });
});
