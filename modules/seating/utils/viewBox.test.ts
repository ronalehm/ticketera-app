import { describe, expect, it } from "vitest";
import { parseViewBox } from "./viewBox";

describe("parseViewBox", () => {
  it("devuelve el ancho y el alto de un viewBox \"0 0 W H\"", () => {
    expect(parseViewBox("0 0 600 412")).toEqual({ width: 600, height: 412 });
  });

  it.each(["0 0 600", "10 0 600 412", "mapa", ""])("lanza Error con el formato inválido %j", (viewBox) => {
    expect(() => parseViewBox(viewBox)).toThrow(Error);
  });
});
