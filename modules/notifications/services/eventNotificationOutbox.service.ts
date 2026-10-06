import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { db } from "@/lib/db/client";
import { eventNotifications } from "@/lib/db/schema/notifications";
import { orders } from "@/lib/db/schema/sales";
import type { EnqueueEventNotificationInput, EventChange } from "../types/notifications.types";

// Outbox de correos a compradores (spec event-change-notifications, Decisión 3). Se llama dentro de la transacción que
// cambia el evento (con su fila ya bloqueada por `lockManagedEvent`): si algo falla, se revierten ambos. Nunca envía.

type Tx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

/** Espera de los cambios no críticos (`update`) para agruparlos en un solo correo. */
const UPDATE_GROUPING_DELAY = sql`now() + interval '10 minutes'`;

/** Por campo: el primer `before` y el último `after`, en el orden en que cambió cada campo por primera vez. */
function mergeChanges(previous: EventChange[], next: EventChange[]): EventChange[] {
  const merged = new Map(previous.map((change) => [change.field, change]));
  for (const change of next) {
    const first = merged.get(change.field);
    merged.set(change.field, first ? { ...change, before: first.before } : change);
  }
  return [...merged.values()];
}

/**
 * Encola la notificación del cambio y devuelve su id, o `null` si no hay nada que avisar (sin cambios o sin compradores
 * `paid`/`partially_refunded`). `schedule` y `cancelled` salen ya (`send_after = now()`); `update` se fusiona con la
 * notificación `update` pendiente del evento o crea una que sale en 10 minutos.
 */
export async function enqueueEventNotification(
  tx: Tx,
  { eventId, kind, changes, actorId }: EnqueueEventNotificationInput,
): Promise<string | null> {
  if (changes.length === 0) return null;

  const [buyer] = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.eventId, eventId), inArray(orders.status, ["paid", "partially_refunded"])))
    .limit(1);
  if (!buyer) return null;

  if (kind === "update") {
    // Deja de aceptar fusiones en cuanto el procesador la reclama (`sending`): entonces se crea otra. Dos inserciones a
    // la vez chocan con `event_notifications_one_pending_update_idx` y la segunda transacción se revierte entera.
    const [pending] = await tx
      .select({ id: eventNotifications.id, changes: eventNotifications.changes })
      .from(eventNotifications)
      .where(
        and(
          eq(eventNotifications.eventId, eventId),
          eq(eventNotifications.kind, "update"),
          eq(eventNotifications.status, "pending"),
        ),
      )
      .for("update");
    if (pending) {
      await tx
        .update(eventNotifications)
        .set({ changes: mergeChanges(pending.changes, changes) })
        .where(eq(eventNotifications.id, pending.id));
      return pending.id;
    }
  }

  const [{ id }] = await tx
    .insert(eventNotifications)
    .values({
      eventId,
      kind,
      changes,
      createdBy: actorId,
      sendAfter: kind === "update" ? UPDATE_GROUPING_DELAY : sql`now()`,
    })
    .returning({ id: eventNotifications.id });
  return id;
}
