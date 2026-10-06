// Requisitos para enviar a revisión, aprobar y mantener publicado un evento (spec admin-panel, F5b, requisito 4): los
// campos que exige `events_draft_complete_check` (recinto, descripción, portada, inicio y apertura de puertas), al menos
// un tipo de entrada, que cada tipo tenga algún lugar que vender y una fecha de inicio futura. Pura: el servicio le pasa
// el evento leído de la BD y `now`.

export type PublishIssue =
  | "venue"
  | "description"
  | "image"
  | "startsAt"
  | "doorsOpenAt"
  | "ticketTypes"
  | "emptyTicketTypes"
  | "startsAtPast";

export type PublishCandidate = {
  venueId: string | null;
  description: string | null;
  imageUrl: string | null;
  startsAt: Date | null;
  doorsOpenAt: Date | null;
  ticketTypeCount: number;
  /**
   * Tipos de entrada sin ningún lugar: de una sección numerada sin butacas (`venue_seats`). Una general siempre tiene
   * `capacity > 0` (CHECK de `venue_sections`). Al editar un publicado no se pasa: sus secciones ya no cambian.
   */
  emptyTicketTypeCount?: number;
};

/**
 * Lo que le falta al evento para publicarse, en orden de formulario; vacío si cumple. `checkFutureDate: false` omite que
 * la fecha sea futura (editar un evento publicado sin tocar su fecha, que puede haber empezado ya).
 */
export function getPublishIssues(
  event: PublishCandidate,
  now: Date,
  { checkFutureDate = true }: { checkFutureDate?: boolean } = {},
): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!event.venueId) issues.push("venue");
  if (!event.description?.trim()) issues.push("description");
  if (!event.imageUrl) issues.push("image");
  if (!event.startsAt) issues.push("startsAt");
  if (!event.doorsOpenAt) issues.push("doorsOpenAt");
  if (event.ticketTypeCount < 1) issues.push("ticketTypes");
  if ((event.emptyTicketTypeCount ?? 0) > 0) issues.push("emptyTicketTypes");
  if (checkFutureDate && event.startsAt && event.startsAt.getTime() <= now.getTime()) issues.push("startsAtPast");
  return issues;
}

/** Problemas que no son un dato que falta: cada uno tiene su propia frase. */
type SentenceIssue = "emptyTicketTypes" | "startsAtPast";

const MISSING_LABELS: Record<Exclude<PublishIssue, SentenceIssue>, string> = {
  venue: "el recinto",
  description: "la descripción",
  image: "la portada",
  startsAt: "la fecha y la hora de inicio",
  doorsOpenAt: "la apertura de puertas",
  ticketTypes: "al menos un tipo de entrada",
};

const listFormat = new Intl.ListFormat("es", { type: "conjunction" });

/** Mensaje que dice qué falta: "Faltan datos para publicar el evento: el recinto y la portada." */
export function formatPublishIssues(issues: PublishIssue[]): string {
  const missing = issues.flatMap((issue) =>
    issue === "emptyTicketTypes" || issue === "startsAtPast" ? [] : [MISSING_LABELS[issue]],
  );
  const sentences: string[] = [];
  if (missing.length > 0) sentences.push(`Faltan datos para publicar el evento: ${listFormat.format(missing)}.`);
  if (issues.includes("emptyTicketTypes")) {
    sentences.push("Algún tipo de entrada es de una sección sin lugares: quítalo para publicar el evento.");
  }
  if (issues.includes("startsAtPast")) sentences.push("La fecha de inicio ya pasó: elige una fecha futura.");
  return sentences.join(" ");
}
