import "server-only";

// Entrada pública solo de servidor para el panel: el barrel arrastra componentes de cliente.
export { managedEventsFiltersSchema } from "./schemas/managedEvents.schema";
export { listManagedEvents } from "./services/managedEvents.service";
