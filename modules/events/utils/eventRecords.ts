import type { z } from "zod";
import type { eventDetailSchema, eventSchema } from "../schemas/events.schema";
import { getAvailabilityStatus } from "./availability";

/** Fila de evento publicada tal como la devuelve la consulta (conteos sobre sus `event_seats`). */
export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  category: string;
  startsAt: Date;
  venue: string;
  city: string;
  imageUrl: string;
  featured: boolean;
  priceFromCents: number;
  totalSeats: number;
  availableSeats: number;
};

export type EventDetailRecord = EventRecord & {
  description: string;
  address: string;
  doorsOpenAt: Date;
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

/** Sin validar: el service pasa la salida por `eventSchema`. */
export function toEvent(record: EventRecord): z.input<typeof eventSchema> {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    category: record.category as z.input<typeof eventSchema>["category"],
    startsAt: record.startsAt.toISOString(),
    venue: record.venue,
    city: record.city,
    imageUrl: record.imageUrl,
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
    description: record.description,
    address: record.address,
    doorsOpenAt: record.doorsOpenAt.toISOString(),
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
