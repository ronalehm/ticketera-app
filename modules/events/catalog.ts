// Entrada pública de servidor para otros módulos: a diferencia del barrel, no arrastra componentes cliente.
export { listEventCategories } from "./services/categories.service";
export { getEventBySlug } from "./services/events.service";
export type { EventCategory } from "./types/events.types";
