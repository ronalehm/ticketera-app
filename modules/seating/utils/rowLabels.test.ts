import { describe, expect, it } from "vitest";
import { seatRowLabelSchema } from "../schemas/seating.schema";
import { getSeatRowLabels } from "./rowLabels";

describe("getSeatRowLabels", () => {
  it("devuelve una lista vacía con 0", () => {
    expect(getSeatRowLabels(0)).toEqual([]);
  });

  it("empieza por A, B, C", () => {
    expect(getSeatRowLabels(3)).toEqual(["A", "B", "C"]);
  });

  it.each([
    [26, "Z"],
    [27, "AA"],
    [30, "AD"],
    [52, "AZ"],
    [53, "BA"],
    [702, "ZZ"],
  ])("con %i la última etiqueta es %s", (count, last) => {
    const labels = getSeatRowLabels(count);
    expect(labels).toHaveLength(count);
    expect(labels.at(-1)).toBe(last);
  });

  it("genera 702 etiquetas distintas que cumplen seatRowLabelSchema", () => {
    const labels = getSeatRowLabels(702);
    expect(new Set(labels).size).toBe(702);
    for (const label of labels) {
      expect(seatRowLabelSchema.safeParse(label).success).toBe(true);
    }
  });

  it.each([703, -1, 1.5])("lanza RangeError con %s", (count) => {
    expect(() => getSeatRowLabels(count)).toThrow(RangeError);
  });
});
