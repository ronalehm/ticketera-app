import type { TicketPdfInput } from "@/lib/ticketPdf";
import { formatLongDate, formatTime } from "@/modules/events/format";
import type { Order } from "../types/checkout.types";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Convierte una orden guardada (contrato E) en los datos planos que necesita el PDF de entradas. */
export function buildTicketPdfInput(order: Order): TicketPdfInput {
  const { event } = order;

  return {
    orderCode: order.code,
    event: {
      title: event.title,
      dateLabel: capitalize(formatLongDate(event.startsAt)),
      timeLabel: `${formatTime(event.startsAt)} h`,
      venueLabel: `${event.venue}, ${event.city}`,
    },
    tickets: order.tickets.map(({ code, seatLabel, ticketTypeName, holderName }) => ({
      code,
      locationLabel: seatLabel ?? ticketTypeName,
      holderName,
    })),
  };
}
