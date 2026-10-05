import type { z } from "zod";
import type {
  eventCategorySchema,
  eventDetailSchema,
  eventSchema,
  eventStatusSchema,
  ticketTypeSchema,
} from "../schemas/events.schema";
import type {
  managedEventSchema,
  managedEventsFiltersSchema,
  managedEventStatusSchema,
} from "../schemas/managedEvents.schema";

export type Event = z.infer<typeof eventSchema>;
export type EventCategory = z.infer<typeof eventCategorySchema>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type EventDetail = z.infer<typeof eventDetailSchema>;
export type TicketType = z.infer<typeof ticketTypeSchema>;

export type ManagedEvent = z.infer<typeof managedEventSchema>;
export type ManagedEventStatus = z.infer<typeof managedEventStatusSchema>;
/** Filtros ya normalizados (`status` y `q` presentes): forman la query key del panel. */
export type ManagedEventsFilters = z.infer<typeof managedEventsFiltersSchema>;
