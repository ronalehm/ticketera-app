const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const priceFormatter = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

/** "2026-11-15T20:00:00-05:00" → "DOM 15 NOV · 20:00" (zona America/Lima). */
export function formatEventDate(iso: string): string {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value.replace(/\./g, "").toUpperCase()]),
  );
  return `${parts.weekday} ${parts.day} ${parts.month} · ${parts.hour}:${parts.minute}`;
}

/** 120 → "S/ 120.00" (espacios no separables normalizados a espacio normal). */
export function formatEventPrice(amount: number): string {
  return priceFormatter.format(amount).replace(/\s/g, " ");
}
