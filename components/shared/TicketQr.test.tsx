import { cleanup, render, screen } from "@testing-library/react";
import { create } from "qrcode";
import { afterEach, describe, expect, it } from "vitest";

import { getQrModules, TicketQr } from "./TicketQr";

/** `qr_token` de ejemplo: 22 caracteres base64url. */
const TOKEN = "q3Zk9x_Lr8Tn2Yb-Pw4MvA";
const OTHER_TOKEN = "Hc7uJ0aQe5WmX2pR-sN9tg";
const CODE = "TK-1042-01";

const renderQr = (value = TOKEN) => render(<TicketQr value={value} ticketCode={CODE} />);

/** Celdas `fila:columna` pintadas por el `d` del path (`M<col> <fila>h1v1h-1z` por módulo). */
const paintedCells = (d: string) =>
  new Set(Array.from(d.matchAll(/M(\d+) (\d+)h1v1h-1z/g), ([, col, row]) => `${row}:${col}`));

const darkCells = (modules: boolean[][]) =>
  new Set(modules.flatMap((cells, row) => cells.flatMap((dark, col) => (dark ? [`${row}:${col}`] : []))));

/** Patrón de posición esperado en coordenadas locales 0..6: anillo, hueco y núcleo 3×3. */
const expectedFinder = (r: number, c: number) => Math.min(r, c, 6 - r, 6 - c) !== 1;

afterEach(cleanup);

describe("getQrModules", () => {
  it("es la matriz de QRCode.create con corrección M", () => {
    const { modules } = create(TOKEN, { errorCorrectionLevel: "M" });
    const expected = Array.from({ length: modules.size }, (_, row) =>
      Array.from({ length: modules.size }, (_, col) => modules.get(row, col) === 1),
    );

    expect(modules.size).toBeGreaterThanOrEqual(21);
    expect(getQrModules(TOKEN)).toEqual(expected);
  });

  it("es determinista y distinta para otro token", () => {
    expect(getQrModules(TOKEN)).toEqual(getQrModules(TOKEN));
    expect(getQrModules(OTHER_TOKEN)).not.toEqual(getQrModules(TOKEN));
  });

  it("tiene los tres patrones de posición en sus esquinas", () => {
    const modules = getQrModules(TOKEN);
    const size = modules.length;

    for (const [top, left] of [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ]) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          expect(modules[top + r][left + c]).toBe(expectedFinder(r, c));
        }
      }
    }
  });
});

describe("TicketQr", () => {
  it("se anuncia con el código de la entrada y sin el token", () => {
    renderQr();
    const svg = screen.getByRole("img", { name: `Código QR de la entrada ${CODE}` });

    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg.getAttribute("aria-label")).not.toContain(TOKEN);
    expect(svg.outerHTML).not.toContain(TOKEN);
  });

  it("deja un margen de 2 módulos dentro del viewBox", () => {
    renderQr();
    const size = getQrModules(TOKEN).length;

    expect(screen.getByRole("img").getAttribute("viewBox")).toBe(`-2 -2 ${size + 4} ${size + 4}`);
  });

  it("pinta exactamente los módulos oscuros del QR del token", () => {
    const { container } = renderQr();
    const paths = container.querySelectorAll("path");

    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute("fill")).toBe("currentColor");
    expect(paintedCells(paths[0].getAttribute("d") ?? "")).toEqual(darkCells(getQrModules(TOKEN)));
  });

  it("dos tokens distintos producen dibujos distintos", () => {
    const first = renderQr().container.querySelector("path")?.getAttribute("d");
    cleanup();
    const second = renderQr(OTHER_TOKEN).container.querySelector("path")?.getAttribute("d");

    expect(first).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it("une className a las clases base", () => {
    render(<TicketQr value={TOKEN} ticketCode={CODE} className="size-40" />);
    const classes = screen.getByRole("img").getAttribute("class")?.split(" ");

    expect(classes).toEqual(expect.arrayContaining(["bg-background", "text-foreground", "size-40"]));
  });
});
