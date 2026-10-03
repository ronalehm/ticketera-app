const legalDateFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "2026-10-01T00:00:00-05:00" → "1 de octubre de 2026" (zona America/Lima, sin día de la semana). */
export const formatLegalDate = (iso: string): string => legalDateFormatter.format(new Date(iso));
