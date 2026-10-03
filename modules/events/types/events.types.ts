import type { z } from "zod";
import type {
  eventCategorySchema,
  eventDetailSchema,
  eventSchema,
  eventStatusSchema,
  ticketTypeSchema,
} from "../schemas/events.schema";

export type Event = z.infer<typeof eventSchema>;
export type EventCategory = z.infer<typeof eventCategorySchema>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type EventDetail = z.infer<typeof eventDetailSchema>;
export type TicketType = z.infer<typeof ticketTypeSchema>;
