const memberSinceFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  month: "long",
  year: "numeric",
});

/** "2025-03-14T15:00:00.000Z" → "marzo de 2025" (zona America/Lima). */
export const formatMemberSince = (iso: string): string => memberSinceFormatter.format(new Date(iso));
