// Generación de las entradas de un pedido como PDF (A4, una página por entrada) y su descarga.
// jsPDF se carga con `import()` dinámico solo al generar, para no entrar en la carga inicial.

import type { jsPDF } from "jspdf";
import { getQrModules } from "@/components/shared/TicketQr";
import { downloadBlob } from "@/lib/download";

export type TicketPdfTicket = {
  /** "MT-7Q4K2P-01" */
  code: string;
  /** "Tribuna Norte · Fila B · Asiento 4" o "General" */
  locationLabel: string;
  /** "Ana Quispe" */
  holderName: string;
};

export type TicketPdfInput = {
  /** "MT-7Q4K2P" */
  orderCode: string;
  event: {
    /** "Noche de Sintetizadores: Gira Neón 2026" */
    title: string;
    /** "Sábado, 14 de noviembre de 2026" */
    dateLabel: string;
    /** "21:00 h" */
    timeLabel: string;
    /** "Estadio Nacional, Lima" */
    venueLabel: string;
  };
  /** Al menos una; una página por entrada, en este orden. */
  tickets: TicketPdfTicket[];
};

export type QrRun = { row: number; col: number; length: number };

type Rgb = readonly [number, number, number];

/**
 * Colores RGB derivados de los tokens de `design-system/ticketera/MASTER.md` §2 (jsPDF no lee CSS).
 * Única excepción a la regla "sin hex en componentes", limitada a este generador.
 */
const COLORS = {
  /** `--primary` #0072F6 */
  primary: [0, 114, 246],
  /** `--primary-foreground` #FFFFFF */
  primaryForeground: [255, 255, 255],
  /** `--foreground` (navy) #010817 */
  foreground: [1, 8, 23],
  /** `--muted-foreground` #5A6070 */
  mutedForeground: [90, 96, 112],
  /** `--border` #E4E4E7 */
  border: [228, 228, 231],
} as const satisfies Record<string, Rgb>;

/** Helvetica: fuente estándar de PDF (no se incrusta). Excepción a Creato Display documentada en el MASTER. */
const FONT_FAMILY = "helvetica";

// Medidas en mm sobre A4 vertical (210 × 297).
const MARGIN = 20;
const FRAME_WIDTH = 170;
const FRAME_LINE_WIDTH = 0.3;
const BAND_HEIGHT = 18;
const PADDING = 8;
const CONTENT_X = MARGIN + PADDING;
const CONTENT_WIDTH = FRAME_WIDTH - PADDING * 2;
const CONTENT_RIGHT = CONTENT_X + CONTENT_WIDTH;
const QR_MODULE_SIZE = 3;
const QR_FRAME_GAP = 3;
const COLUMN_GAP = 8;
const FIELD_GAP = 4;

const PT_TO_MM = 25.4 / 72;
const LINE_HEIGHT_FACTOR = 1.2;

const ALLOWED_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x20, 0x7e],
  [0xa0, 0xff],
];

const PUNCTUATION_REPLACEMENTS: Readonly<Record<string, string>> = {
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "–": "-",
  "—": "-",
};

const COMBINING_MARKS = /[̀-ͯ]/g;

function isWinAnsiSafe(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return ALLOWED_RANGES.some(([from, to]) => code >= from && code <= to);
}

/** Adapta un texto a Helvetica estándar (Latin-1): ver decisión 7 de `docs/specs/tickets-pdf-download.md`. */
export function toPdfText(value: string): string {
  return Array.from(value.normalize("NFC"), (char) => {
    if (isWinAnsiSafe(char)) return char;
    const replacement = PUNCTUATION_REPLACEMENTS[char];
    if (replacement !== undefined) return replacement;
    return Array.from(char.normalize("NFKD").replace(COMBINING_MARKS, ""), (part) =>
      isWinAnsiSafe(part) ? part : "?",
    ).join("");
  }).join("");
}

/** Tramos horizontales máximos de módulos oscuros, en orden de fila y columna. */
export function getQrRuns(modules: boolean[][]): QrRun[] {
  const runs: QrRun[] = [];
  modules.forEach((cells, row) => {
    let start = -1;
    cells.forEach((dark, col) => {
      if (dark && start === -1) start = col;
      if (!dark && start !== -1) {
        runs.push({ row, col: start, length: col - start });
        start = -1;
      }
    });
    if (start !== -1) runs.push({ row, col: start, length: cells.length - start });
  });
  return runs;
}

export function getTicketsPdfFileName(orderCode: string): string {
  return `mentec-${orderCode}.pdf`;
}

type TextStyle = {
  size: number;
  bold?: boolean;
  color: Rgb;
};

function lineHeight(size: number): number {
  return size * PT_TO_MM * LINE_HEIGHT_FACTOR;
}

function applyTextStyle(doc: jsPDF, { size, bold, color }: TextStyle): void {
  doc.setFont(FONT_FAMILY, bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

/** Escribe `text` envuelto a `width` desde `y` (borde superior) y devuelve el borde inferior. */
function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  style: TextStyle,
): number {
  applyTextStyle(doc, style);
  const lines: string[] = doc.splitTextToSize(toPdfText(text), width);
  doc.text(lines, x, y, { baseline: "top", lineHeightFactor: LINE_HEIGHT_FACTOR });
  return y + lines.length * lineHeight(style.size);
}

function drawBand(doc: jsPDF, index: number, total: number): void {
  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGIN, MARGIN, FRAME_WIDTH, BAND_HEIGHT, "F");

  const centerY = MARGIN + BAND_HEIGHT / 2;
  applyTextStyle(doc, { size: 16, bold: true, color: COLORS.primaryForeground });
  doc.text(toPdfText("Mentec Tickets"), CONTENT_X, centerY, { baseline: "middle" });
  applyTextStyle(doc, { size: 11, bold: true, color: COLORS.primaryForeground });
  doc.text(toPdfText(`Entrada ${index + 1} de ${total}`), CONTENT_RIGHT, centerY, {
    baseline: "middle",
    align: "right",
  });
}

/** Dibuja el QR con su marco desde (`x`, `y`) y devuelve el borde inferior del marco. */
function drawQr(doc: jsPDF, code: string, x: number, y: number): number {
  const modules = getQrModules(code);
  const frameSize = modules.length * QR_MODULE_SIZE + QR_FRAME_GAP * 2;

  doc.setFillColor(...COLORS.primaryForeground);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(FRAME_LINE_WIDTH);
  doc.rect(x, y, frameSize, frameSize, "FD");

  doc.setFillColor(...COLORS.foreground);
  const originX = x + QR_FRAME_GAP;
  const originY = y + QR_FRAME_GAP;
  for (const run of getQrRuns(modules)) {
    doc.rect(
      originX + run.col * QR_MODULE_SIZE,
      originY + run.row * QR_MODULE_SIZE,
      run.length * QR_MODULE_SIZE,
      QR_MODULE_SIZE,
      "F",
    );
  }
  return y + frameSize;
}

/** Etiqueta en mayúsculas + valor; devuelve el borde inferior del valor. */
function writeField(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  valueStyle: TextStyle,
): number {
  const labelBottom = writeWrapped(doc, label, x, y, width, {
    size: 9,
    bold: true,
    color: COLORS.mutedForeground,
  });
  return writeWrapped(doc, value, x, labelBottom + 1, width, valueStyle);
}

function drawTicketPage(
  doc: jsPDF,
  input: TicketPdfInput,
  ticket: TicketPdfTicket,
  index: number,
): void {
  const { event, orderCode, tickets } = input;
  drawBand(doc, index, tickets.length);

  let y = MARGIN + BAND_HEIGHT + PADDING;
  y = writeWrapped(doc, event.title, CONTENT_X, y, CONTENT_WIDTH, {
    size: 20,
    bold: true,
    color: COLORS.foreground,
  });
  y = writeWrapped(doc, `${event.dateLabel} · ${event.timeLabel}`, CONTENT_X, y + 3, CONTENT_WIDTH, {
    size: 12,
    color: COLORS.foreground,
  });
  y = writeWrapped(doc, event.venueLabel, CONTENT_X, y + 1, CONTENT_WIDTH, {
    size: 12,
    color: COLORS.mutedForeground,
  });

  y += 6;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(FRAME_LINE_WIDTH);
  doc.setLineDashPattern([2, 1.5], 0);
  doc.line(CONTENT_X, y, CONTENT_RIGHT, y);
  doc.setLineDashPattern([], 0);
  y += 8;

  const qrBottom = drawQr(doc, ticket.code, CONTENT_X, y);
  const qrFrameSize = qrBottom - y;
  const fieldsX = CONTENT_X + qrFrameSize + COLUMN_GAP;
  const fieldsWidth = CONTENT_RIGHT - fieldsX;
  const valueStyle: TextStyle = { size: 12, bold: true, color: COLORS.foreground };

  let fieldsY = writeField(doc, "ZONA / ASIENTO", ticket.locationLabel, fieldsX, y, fieldsWidth, valueStyle);
  fieldsY = writeField(doc, "TITULAR", ticket.holderName, fieldsX, fieldsY + FIELD_GAP, fieldsWidth, valueStyle);
  fieldsY = writeField(doc, "CÓDIGO DE ENTRADA", ticket.code, fieldsX, fieldsY + FIELD_GAP, fieldsWidth, {
    size: 14,
    bold: true,
    color: COLORS.foreground,
  });
  fieldsY = writeField(doc, "PEDIDO", orderCode, fieldsX, fieldsY + FIELD_GAP, fieldsWidth, {
    size: 12,
    color: COLORS.foreground,
  });

  y = Math.max(qrBottom, fieldsY) + 8;
  applyTextStyle(doc, { size: 10, color: COLORS.mutedForeground });
  doc.text(toPdfText("Presenta este código en la entrada"), MARGIN + FRAME_WIDTH / 2, y, {
    baseline: "top",
    align: "center",
  });
  y += lineHeight(10) + PADDING;

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(FRAME_LINE_WIDTH);
  doc.rect(MARGIN, MARGIN, FRAME_WIDTH, y - MARGIN, "S");
}

/** Genera el PDF (A4 vertical, una página por entrada). Rechaza con `RangeError` si no hay entradas. */
export async function buildTicketsPdf(input: TicketPdfInput): Promise<Blob> {
  if (input.tickets.length === 0) {
    throw new RangeError("No hay entradas para generar el PDF");
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: false });
  doc.setProperties({
    title: toPdfText(`Entradas ${input.orderCode} · ${input.event.title}`),
    author: "Mentec Tickets",
    creator: "Mentec Tickets",
  });

  input.tickets.forEach((ticket, index) => {
    if (index > 0) doc.addPage();
    drawTicketPage(doc, input, ticket, index);
  });

  return doc.output("blob");
}

/** Genera el PDF del pedido y lo descarga como `mentec-<pedido>.pdf`. Propaga los errores. */
export async function downloadTicketsPdf(input: TicketPdfInput): Promise<void> {
  downloadBlob(getTicketsPdfFileName(input.orderCode), await buildTicketsPdf(input));
}
