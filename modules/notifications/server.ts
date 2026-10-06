import "server-only";

// Entrada pública solo de servidor del módulo de notificaciones (spec event-change-notifications).
export { enqueueEventNotification } from "./services/eventNotificationOutbox.service";
export {
  processDueEventNotifications,
  processEventNotification,
} from "./services/eventNotificationProcessor.service";
export type { EnqueueEventNotificationInput, EventChange, EventNotificationKind } from "./types/notifications.types";
