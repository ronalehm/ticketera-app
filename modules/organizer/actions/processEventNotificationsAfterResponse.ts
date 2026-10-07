import "server-only";

import { after } from "next/server";
import { processDueEventNotifications, processEventNotification } from "@/modules/notifications/server";
import type { EnqueuedNotification } from "../services/eventDrafts.service";

/** Notificaciones vencidas que procesa de paso cada acción (drenado oportunista, spec event-change-notifications, Decisión 7). */
const OPPORTUNISTIC_DRAIN_LIMIT = 5;

/** Sin `message`: un error de la BD puede llevar la consulta con correos de compradores. */
function logError(step: string, notificationId: string | undefined, error: unknown) {
  console.error(`[notifications] ${step} falló tras responder`, {
    notificationId,
    name: error instanceof Error ? error.name : "Error",
  });
}

/**
 * Tras responder (`after()`), envía ya la notificación encolada si es inmediata (`schedule`/`cancelled`; una `update`
 * espera su agrupación) y procesa hasta 5 vencidas de cualquier evento. Sin notificación no hace nada. Un fallo solo se
 * registra: la notificación sigue persistida para el siguiente worker y la acción ya respondió.
 */
export function processEventNotificationsAfterResponse(notification: EnqueuedNotification): void {
  if (!notification) return;
  after(async () => {
    if (notification.kind !== "update") {
      try {
        await processEventNotification(notification.id);
      } catch (error) {
        logError("el envío inmediato", notification.id, error);
      }
    }
    try {
      await processDueEventNotifications({ limit: OPPORTUNISTIC_DRAIN_LIMIT });
    } catch (error) {
      logError("el drenado", undefined, error);
    }
  });
}
