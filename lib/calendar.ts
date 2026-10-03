// Generación de eventos iCalendar (RFC 5545) y su descarga como archivo .ics, sin librerías.

import { downloadBlob } from "@/lib/download";
import { hashString } from "@/lib/hash";

type IcsEventInput = {
  title: string;
  /** Fecha ISO 8601 con zona horaria (p. ej. "2026-11-14T21:00:00-05:00"). */
  startsAt: string;
  location: string;
  description?: string;
};

const CRLF = "\r\n";
const MAX_LINE_OCTETS = 75;
const UID_DOMAIN = "mentectickets.pe";

const encoder = new TextEncoder();

/** Escapa un valor TEXT: `\`, `;`, `,` y saltos de línea (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Fecha en UTC con formato `YYYYMMDDTHHMMSSZ`. */
function formatUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "");
}

/**
 * Pliega una línea de más de 75 octetos UTF-8 en varias (CRLF + espacio) sin partir caracteres
 * multibyte. El espacio inicial de cada continuación cuenta dentro de los 75 octetos.
 */
function foldLine(line: string): string {
  const lines: string[] = [];
  let current = "";
  let currentOctets = 0;

  for (const char of line) {
    const charOctets = encoder.encode(char).length;
    if (currentOctets + charOctets > MAX_LINE_OCTETS) {
      lines.push(current);
      current = " ";
      currentOctets = 1;
    }
    current += char;
    currentOctets += charOctets;
  }
  lines.push(current);

  return lines.join(CRLF);
}

/** FNV-1a de 32 bits en hexadecimal (8 caracteres). */
function hashHex(value: string): string {
  return hashString(value).toString(16).padStart(8, "0");
}

/** Contenido `.ics` con un único `VEVENT`. Sin `DTEND`: los eventos no tienen hora de fin. */
export function buildIcsEvent({ title, startsAt, location, description }: IcsEventInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mentec Tickets//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${hashHex(`${title}|${startsAt}`)}@${UID_DOMAIN}`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(new Date(startsAt))}`,
    `SUMMARY:${escapeText(title)}`,
    `LOCATION:${escapeText(location)}`,
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Descarga `content` como archivo `.ics` mediante un enlace temporal. */
export function downloadIcs(fileName: string, content: string): void {
  downloadBlob(fileName, new Blob([content], { type: "text/calendar;charset=utf-8" }));
}
