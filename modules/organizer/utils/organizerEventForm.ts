import { formDateSchema, formTimeSchema, ticketTypeFormSchema } from "../schemas/organizer.schema";
import type {
  OrganizerEvent,
  OrganizerEventFormValues,
  TicketTypeRow,
  TicketTypeRowErrors,
} from "../types/organizer.types";
import { formatCount } from "./organizerStats";

// Perú no tiene horario de verano: el offset de America/Lima es siempre -05:00.
const LIMA_OFFSET = "-05:00";

const { price: priceSchema, quantity: quantitySchema } = ticketTypeFormSchema.shape;

export function createTicketTypeRow(): TicketTypeRow {
  return { id: crypto.randomUUID(), name: "", price: "", quantity: "" };
}

/** Suma de las cantidades válidas (enteros ≥ 1); las filas vacías o inválidas no cuentan. */
export function getTicketCapacity(rows: TicketTypeRow[]): number {
  return rows.reduce((total, row) => {
    const result = quantitySchema.safeParse(row.quantity);
    return result.success ? total + Number(result.data) : total;
  }, 0);
}

/** Menor precio válido (≥ 0) o `null` si ninguna fila tiene un precio válido. */
export function getMinTicketPrice(rows: TicketTypeRow[]): number | null {
  const prices = rows.flatMap((row) => {
    const result = priceSchema.safeParse(row.price);
    return result.success ? [Number(result.data)] : [];
  });
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** 1 → "1 entrada"; 1500 → "1,500 entradas". */
export function formatTicketCount(n: number): string {
  return n === 1 ? "1 entrada" : `${formatCount(n)} entradas`;
}

/** "2026-12-05" + "20:00" → "2026-12-05T20:00:00-05:00"; `null` si falta o no es válida la fecha o la hora. */
export function buildStartsAt(date: string, time: string): string | null {
  if (!formDateSchema.safeParse(date).success || !formTimeSchema.safeParse(time).success) return null;
  return `${date}T${time}:00${LIMA_OFFSET}`;
}

/** Primer mensaje por campo de cada fila, con las mismas reglas que el formulario al publicar. */
export function getTicketTypeErrors(rows: TicketTypeRow[]): TicketTypeRowErrors[] {
  return rows.map((row) => {
    const result = ticketTypeFormSchema.safeParse(row);
    const errors: TicketTypeRowErrors = {};
    if (result.success) return errors;
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof TicketTypeRowErrors;
      errors[field] ??= issue.message;
    }
    return errors;
  });
}

/** Evento del panel a partir del formulario. Un borrador guarda solo lo interpretable. La portada no se persiste. */
export function toOrganizerEvent(values: OrganizerEventFormValues, id: string): OrganizerEvent {
  return {
    id,
    title: values.name.trim(),
    category: values.category,
    startsAt: buildStartsAt(values.date, values.time),
    venue: values.venue.trim(),
    city: values.city.trim(),
    imageUrl: null,
    priceFrom: getMinTicketPrice(values.ticketTypes),
    sold: 0,
    capacity: getTicketCapacity(values.ticketTypes),
    status: values.intent === "publish" ? "published" : "draft",
  };
}
