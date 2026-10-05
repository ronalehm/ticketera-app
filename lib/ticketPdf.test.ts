// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { getQrModules } from "@/components/shared/TicketQr";
import { downloadBlob } from "./download";
import {
  buildTicketsPdf,
  downloadTicketsPdf,
  getQrRuns,
  getTicketsPdfFileName,
  toPdfText,
  type TicketPdfInput,
} from "./ticketPdf";

vi.mock("./download", () => ({ downloadBlob: vi.fn() }));
vi.mock("@/components/shared/TicketQr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/shared/TicketQr")>();
  return { getQrModules: vi.fn(actual.getQrModules) };
});

const input: TicketPdfInput = {
  orderCode: "MT-7Q4K2P",
  event: {
    title: "Noche de Sintetizadores: Gira Neón 2026",
    dateLabel: "Sábado, 14 de noviembre de 2026",
    timeLabel: "21:00 h",
    venueLabel: "Estadio Nacional, Lima",
  },
  tickets: [
    {
      code: "MT-7Q4K2P-01",
      locationLabel: "Tribuna Norte · Fila B · Asiento 4",
      holderName: "Ana Quispe",
      qrToken: "q3Zk9x_Lr8Tn2Yb-Pw4MvA",
    },
    { code: "MT-7Q4K2P-02", locationLabel: "General", holderName: "Nguyễn Văn An", qrToken: "Hc7uJ0aQe5WmX2pR-sN9tg" },
    { code: "MT-7Q4K2P-03", locationLabel: "General", holderName: "Łukasz O’Brien", qrToken: "Zr2bN8vK_x4QwT1yLm0eUA" },
  ],
};

const readPdf = async (blob: Blob) => Buffer.from(await blob.arrayBuffer()).toString("latin1");

describe("toPdfText", () => {
  it.each(["Ana Quispe", "Tribuna Norte · Fila B · Asiento 4", "¡Música en Ñaña!"])(
    "deja igual el texto Latin-1 %j",
    (value) => {
      expect(toPdfText(value)).toBe(value);
    },
  );

  it.each([
    ["Nguyễn", "Nguyen"],
    ["O’Brien", "O'Brien"],
    ["“Hola” ‘ok’", "\"Hola\" 'ok'"],
    ["Rock – Pop — Jazz", "Rock - Pop - Jazz"],
    ["Gira…", "Gira..."],
  ])("adapta %j a %j", (value, expected) => {
    expect(toPdfText(value)).toBe(expected);
  });

  it("cambia por ? lo que sigue fuera de Latin-1", () => {
    expect(toPdfText("Łukasz")).toBe("?ukasz");
  });

  it("recompone una cadena descompuesta", () => {
    expect(toPdfText("á")).toBe("á");
  });
});

describe("getQrRuns", () => {
  it("devuelve los tramos exactos de una matriz conocida", () => {
    const modules = [
      [true, true, false, true],
      [false, true, true, true],
      [true, false, true, false],
    ];
    expect(getQrRuns(modules)).toEqual([
      { row: 0, col: 0, length: 2 },
      { row: 0, col: 3, length: 1 },
      { row: 1, col: 1, length: 3 },
      { row: 2, col: 0, length: 1 },
      { row: 2, col: 2, length: 1 },
    ]);
  });

  it("no devuelve tramos para una fila vacía", () => {
    expect(getQrRuns([[false, false, false]])).toEqual([]);
  });

  it("devuelve un solo tramo para una fila llena", () => {
    expect(getQrRuns([[true, true, true]])).toEqual([{ row: 0, col: 0, length: 3 }]);
  });

  it("cubre exactamente los módulos oscuros de un QR sin solaparse", () => {
    const modules = getQrModules("q3Zk9x_Lr8Tn2Yb-Pw4MvA");
    const runs = getQrRuns(modules);
    const darkCount = modules.flat().filter(Boolean).length;
    const covered = new Set<string>();

    for (const { row, col, length } of runs) {
      for (let offset = 0; offset < length; offset++) {
        const key = `${row}:${col + offset}`;
        expect(covered.has(key)).toBe(false);
        expect(modules[row][col + offset]).toBe(true);
        covered.add(key);
      }
    }
    expect(runs.reduce((sum, run) => sum + run.length, 0)).toBe(darkCount);
    expect(covered.size).toBe(darkCount);
  });
});

describe("getTicketsPdfFileName", () => {
  it("usa el código del pedido", () => {
    expect(getTicketsPdfFileName("MT-7Q4K2P")).toBe("mentec-MT-7Q4K2P.pdf");
  });
});

describe("buildTicketsPdf", () => {
  it("genera un PDF con una página por entrada y su contenido como texto", async () => {
    const blob = await buildTicketsPdf(input);
    const pdf = await readPdf(blob);

    expect(blob.type).toBe("application/pdf");
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf.match(/\/Type \/Page(?!s)/g)).toHaveLength(3);

    for (const text of [
      "Mentec Tickets",
      "Entrada 1 de 3",
      "Entrada 2 de 3",
      "Entrada 3 de 3",
      input.event.title,
      "Sábado, 14 de noviembre de 2026 · 21:00 h",
      "Estadio Nacional, Lima",
      "ZONA / ASIENTO",
      "TITULAR",
      "CÓDIGO DE ENTRADA",
      "PEDIDO",
      // Con el QR real (~87 mm de marco) la columna de datos mide ~59 mm y la ubicación se envuelve.
      "(Tribuna Norte · Fila B ·) Tj",
      "(Asiento 4) Tj",
      "Ana Quispe",
      "Nguyen Van An",
      "?ukasz O'Brien",
      "MT-7Q4K2P-01",
      "MT-7Q4K2P-02",
      "MT-7Q4K2P-03",
      "Presenta este código en la entrada",
      "Entradas MT-7Q4K2P · Noche de Sintetizadores: Gira Neón 2026",
    ]) {
      expect(pdf).toContain(text);
    }
    expect(pdf).not.toContain("Nguyễn");
  });

  it("dibuja al menos un rectángulo por tramo del QR de cada entrada", async () => {
    const pdf = await readPdf(await buildTicketsPdf(input));
    const qrRuns = input.tickets.reduce(
      (sum, { qrToken }) => sum + getQrRuns(getQrModules(qrToken)).length,
      0,
    );

    expect(pdf.match(/ re\n/g)?.length ?? 0).toBeGreaterThanOrEqual(qrRuns);
  });

  it("deja una zona tranquila blanca de 2 módulos (6 mm) entre el marco y el QR", async () => {
    const pdf = await readPdf(await buildTicketsPdf({ ...input, tickets: [input.tickets[0]] }));
    const num = String.raw`(-?[\d.]+)`;
    // Marco: el único `re` relleno y trazado (B); luego, el primer tramo del QR (esquina del patrón de posición).
    const match = pdf.match(
      new RegExp(String.raw`${num} ${num} ${num} ${num} re\nB\n[^\n]+ rg\n${num} ${num} [\d.]+ -[\d.]+ re\nf`),
    );
    expect(match).not.toBeNull();
    const [frameX, frameY, frameSize, , qrX, qrY] = match!.slice(1).map((value) => Number(value) / 72 * 25.4);
    const modules = getQrModules(input.tickets[0].qrToken).length;

    expect(qrX - frameX).toBeCloseTo(6);
    expect(frameY - qrY).toBeCloseTo(6);
    expect(frameSize).toBeCloseTo(modules * 3 + 2 * 6);
  });

  it("el QR de cada entrada sale de su qrToken y no de otros datos", async () => {
    vi.mocked(getQrModules).mockClear();
    await buildTicketsPdf(input);

    expect(vi.mocked(getQrModules).mock.calls).toEqual(input.tickets.map(({ qrToken }) => [qrToken]));
    const [first, second] = input.tickets.map(({ qrToken }) => getQrModules(qrToken));
    expect(second).not.toEqual(first);
  });

  it("rechaza con RangeError si no hay entradas", async () => {
    await expect(buildTicketsPdf({ ...input, tickets: [] })).rejects.toThrow(RangeError);
  });
});

describe("downloadTicketsPdf", () => {
  afterEach(() => {
    vi.mocked(downloadBlob).mockClear();
  });

  it("descarga el PDF con el nombre del pedido", async () => {
    await downloadTicketsPdf(input);

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [fileName, blob] = vi.mocked(downloadBlob).mock.calls[0];
    expect(fileName).toBe("mentec-MT-7Q4K2P.pdf");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
  });

  it("propaga el error y no descarga si la generación falla", async () => {
    await expect(downloadTicketsPdf({ ...input, tickets: [] })).rejects.toThrow(RangeError);
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
