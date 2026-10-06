import { formatShortDayMonth, getDateChipParts } from "@/modules/events/format";
import { coverImageUrlSchema } from "../schemas/organizer.schema";
import type { EventDraftFormValues, EventPreview, VenueOption } from "../types/organizer.types";
import { buildStartsAt, getMinTicketPrice } from "./organizerEventForm";

/**
 * Datos de la tarjeta de vista previa a partir del formulario, del recinto y del nombre de la categoría elegidos; `null`
 * donde falta información.
 */
export function buildEventPreview(
  values: EventDraftFormValues,
  venue: VenueOption | undefined,
  categoryName: string | undefined,
): EventPreview {
  const startsAt = buildStartsAt(values.date, values.time);
  const imageUrl = values.imageUrl.trim();

  return {
    title: values.title.trim() || null,
    categoryLabel: categoryName ?? null,
    dateLabel: startsAt ? formatShortDayMonth(startsAt) : null,
    dateChip: startsAt ? getDateChipParts(startsAt) : null,
    place: venue ? `${venue.name} · ${venue.city}` : null,
    priceFrom: getMinTicketPrice(values.ticketTypes),
    // Solo una URL https válida: la misma regla que al guardar.
    imageUrl: coverImageUrlSchema.safeParse(imageUrl).success ? imageUrl : null,
  };
}
