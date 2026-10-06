import { formatShortDayMonth, getDateChipParts } from "@/modules/events/format";
import { coverImageUrlSchema } from "../schemas/organizer.schema";
import type { EventDraftFormValues, EventPreview, VenueOption } from "../types/organizer.types";
import { buildStartsAt, getMinTicketPrice } from "./organizerEventForm";

/**
 * Datos de la tarjeta de vista previa a partir del formulario, del recinto (el de la lista o el ingresado a mano) y del
 * nombre de la categoría elegidos; `null` donde falta información.
 */
export function buildEventPreview(
  values: EventDraftFormValues,
  venue: Pick<VenueOption, "name" | "city"> | undefined,
  categoryName: string | undefined,
): EventPreview {
  const startsAt = buildStartsAt(values.date, values.time);
  const imageUrl = values.imageUrl.trim();

  return {
    title: values.title.trim() || null,
    categoryLabel: categoryName ?? null,
    dateLabel: startsAt ? formatShortDayMonth(startsAt) : null,
    dateChip: startsAt ? getDateChipParts(startsAt) : null,
    // El recinto manual puede estar a medio escribir: solo lo que haya.
    place: [venue?.name.trim(), venue?.city].filter(Boolean).join(" · ") || null,
    priceFrom: getMinTicketPrice(values.ticketTypes),
    // Solo una URL https válida: la misma regla que al guardar.
    imageUrl: coverImageUrlSchema.safeParse(imageUrl).success ? imageUrl : null,
  };
}
