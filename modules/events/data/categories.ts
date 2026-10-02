import { eventCategorySchema } from "../schemas/events.schema";
import type { EventCategory } from "../types/events.types";

export const EVENT_CATEGORIES = eventCategorySchema.options;

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  conciertos: "Conciertos",
  teatro: "Teatro",
  deportes: "Deportes",
  festivales: "Festivales",
  "stand-up": "Stand-up",
  familia: "Familia",
};
