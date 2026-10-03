const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const longDateFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const shortDayMonthFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const longDayMonthFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const priceFormatter =new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

/** "2026-11-15T20:00:00-05:00" → "DOM 15 NOV · 20:00" (zona America/Lima). */
export function formatEventDate(iso: string): string {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value.replace(/\./g, "").toUpperCase()]),
  );
  return `${parts.weekday} ${parts.day} ${parts.month} · ${parts.hour}:${parts.minute}`;
}

/** "2026-11-14T20:00:00-05:00" → "sábado, 14 de noviembre de 2026" (zona America/Lima). */
export const formatLongDate = (iso: string): string => longDateFormatter.format(new Date(iso));

/** "2026-11-15T03:00:00Z" → "22:00" (zona America/Lima, 24h). */
export const formatTime = (iso: string): string => timeFormatter.format(new Date(iso));

/** Partes `weekday`, `day` y `month` en minúsculas y sin puntos. */
function getDayMonthParts(formatter: Intl.DateTimeFormat, iso: string): Record<string, string> {
  return Object.fromEntries(
    formatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value.replace(/\./g, "").toLowerCase()]),
  );
}

/** "2026-10-05T14:00:00-05:00" → "lun 5 oct" (zona America/Lima, sin año ni hora). */
export function formatShortDayMonth(iso: string): string {
  const { weekday, day, month } = getDayMonthParts(shortDayMonthFormatter, iso);
  return `${weekday} ${day} ${month}`;
}

/** "2026-10-05T14:00:00-05:00" → "lunes 5 de octubre" (zona America/Lima, sin año ni hora). */
export function formatLongDayMonth(iso: string): string {
  const { weekday, day, month } = getDayMonthParts(longDayMonthFormatter, iso);
  return `${weekday} ${day} de ${month}`;
}

/** 120 →"S/ 120.00" (espacios no separables normalizados a espacio normal). */
export function formatEventPrice(amount: number): string {
  return priceFormatter.format(amount).replace(/\s/g, " ");
}
