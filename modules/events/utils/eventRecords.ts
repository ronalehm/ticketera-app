import type { z } from "zod";
import type { eventDetailSchema, eventSchema } from "../schemas/events.schema";
import { getAvailabilityStatus } from "./availability";

/** Fila de evento publicada tal como la devuelve la consulta (conteos sobre sus `event_seats`). */
export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  category: string;
  startsAt: Date | null;
  venue: string;
  city: string;
  imageUrl: string | null;
  featured: boolean;
  priceFromCents: number;
  totalSeats: number;
  availableSeats: number;
};

export type EventDetailRecord = EventRecord & {
  description: string | null;
  address: string;
  doorsOpenAt: Date | null;
  minAge: number;
  organizer: string;
};

export type TicketTypeRecord = {
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  totalSeats: number;
  availableSeats: number;
};

const toSoles = (cents: number) => cents / 100;

/** Columnas nullable solo en `draft` (CHECK `events_draft_complete_check`): en un publicado nunca llegan `null`. */
function required<T>(value: T | null, slug: string): T {
  if (value === null) throw new Error(`Evento publicado incompleto: ${slug}`);
  return value;
}

/** Sin validar: el service pasa la salida por `eventSchema`. */
export function toEvent(record: EventRecord): z.input<typeof eventSchema> {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    category: record.category as z.input<typeof eventSchema>["category"],
    startsAt: required(record.startsAt, record.slug).toISOString(),
    venue: record.venue,
    city: record.city,
    imageUrl: required(record.imageUrl, record.slug),
    priceFrom: toSoles(record.priceFromCents),
    status: getAvailabilityStatus(record.availableSeats, record.totalSeats),
    featured: record.featured,
  };
}

/** Sin validar: el service pasa la salida por `eventDetailSchema`. `ticketTypes` llega ya ordenado por `sort_order`. */
export function toEventDetail(
  record: EventDetailRecord,
  ticketTypes: TicketTypeRecord[],
): z.input<typeof eventDetailSchema> {
  return {
    ...toEvent(record),
    description: required(record.description, record.slug),
    address: record.address,
    doorsOpenAt: required(record.doorsOpenAt, record.slug).toISOString(),
    minAge: record.minAge,
    organizer: record.organizer,
    ticketTypes: ticketTypes.map((ticketType) => ({
      id: ticketType.slug,
      name: ticketType.name,
      ...(ticketType.description === null ? {} : { description: ticketType.description }),
      price: toSoles(ticketType.priceCents),
      status: getAvailabilityStatus(ticketType.availableSeats, ticketType.totalSeats),
    })),
  };
}
