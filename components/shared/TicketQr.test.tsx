import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getQrModules, TicketQr } from "./TicketQr";

const VALUE = "MT-AB12CD-01";

const renderPath = (value: string) => {
  const { container, unmount } = render(<TicketQr value={value} />);
  const d = container.querySelector("path")?.getAttribute("d");
  unmount();
  return d;
};

/** Patrón de posición esperado en coordenadas locales 0..6: anillo, hueco y núcleo 3×3. */
const expectedFinder = (r: number, c: number) => {
  const ring = Math.min(r, c, 6 - r, 6 - c);
  return ring !== 1;
};

afterEach(cleanup);

describe("TicketQr", () => {
  it("expone un svg accesible con el valor y viewBox 21×21", () => {
    render(<TicketQr value={VALUE} />);
    const svg = screen.getByRole("img", { name: `Código QR de la entrada ${VALUE}` });

    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg.getAttribute("viewBox")).toBe("0 0 21 21");
    expect(svg.querySelectorAll("path")).toHaveLength(1);
    expect(svg.querySelector("path")?.getAttribute("fill")).toBe("currentColor");
  });

  it("une className a las clases base", () => {
    render(<TicketQr value={VALUE} className="size-40" />);
    const classes = screen.getByRole("img").getAttribute("class")?.split(" ");

    expect(classes).toEqual(expect.arrayContaining(["bg-background", "text-foreground", "size-40"]));
  });

  it("el mismo valor produce el mismo dibujo y otro valor uno distinto", () => {
    const first = renderPath(VALUE);

    expect(first).toBeTruthy();
    expect(renderPath(VALUE)).toBe(first);
    expect(renderPath("MT-AB12CD-02")).not.toBe(first);
  });
});

describe("getQrModules", () => {
  it("devuelve una matriz 21×21 determinista", () => {
    const modules = getQrModules(VALUE);

    expect(modules).toHaveLength(21);
    for (const row of modules) expect(row).toHaveLength(21);
    expect(getQrModules(VALUE)).toEqual(modules);
    expect(getQrModules("MT-ZZ99ZZ-01")).not.toEqual(modules);
  });

  it("las tres esquinas tienen el patrón de posición con separador claro", () => {
    const modules = getQrModules(VALUE);
    const corners = [
      [0, 0],
      [0, 14],
      [14, 0],
    ];

    for (const [top, left] of corners) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          expect(modules[top + r][left + c]).toBe(expectedFinder(r, c));
        }
      }
    }

    for (let i = 0; i < 8; i++) {
      // Separador de la esquina superior izquierda: fila 7 y columna 7.
      expect(modules[7][i]).toBe(false);
      expect(modules[i][7]).toBe(false);
      // Superior derecha: fila 7 y columna 13.
      expect(modules[7][20 - i]).toBe(false);
      expect(modules[i][13]).toBe(false);
      // Inferior izquierda: fila 13 y columna 7.
      expect(modules[13][i]).toBe(false);
      expect(modules[20 - i][7]).toBe(false);
    }
  });

  it("los módulos libres son ~50 % oscuros", () => {
    const modules = getQrModules(VALUE);
    const inFinderArea = (r: number, c: number) => (r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8);
    const free = modules.flatMap((row, r) => row.filter((_, c) => !inFinderArea(r, c)));
    const ratio = free.filter(Boolean).length / free.length;

    expect(ratio).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(0.7);
  });
});
