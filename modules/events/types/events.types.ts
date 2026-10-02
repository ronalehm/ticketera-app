import type { z } from "zod";
import type { eventCategorySchema, eventSchema, eventStatusSchema } from "../schemas/events.schema";

export type Event = z.infer<typeof eventSchema>;
export type EventCategory = z.infer<typeof eventCategorySchema>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
