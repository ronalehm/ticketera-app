import { EVENT_CATEGORY_LABELS, formatEventDate } from "@/modules/events/format";
import type { EventPreview, OrganizerEventFormValues } from "../types/organizer.types";
import { buildStartsAt, getMinTicketPrice } from "./organizerEventForm";

/** Datos de la tarjeta de vista previa a partir del formulario; `null` donde falta información. */
export function buildEventPreview(values: OrganizerEventFormValues, imageUrl: string | null): EventPreview {
  const startsAt = buildStartsAt(values.date, values.time);
  const place = [values.venue, values.city]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  return {
    title: values.name.trim() || null,
    categoryLabel: EVENT_CATEGORY_LABELS[values.category],
    dateLabel: startsAt ? formatEventDate(startsAt) : null,
    place: place || null,
    priceFrom: getMinTicketPrice(values.ticketTypes),
    imageUrl,
  };
}
