import "server-only";

import { createHash } from "node:crypto";
import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import type { ErrorResponse } from "resend";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { events } from "@/lib/db/schema/events";
import { eventNotificationDeliveries, eventNotifications } from "@/lib/db/schema/notifications";
import { renderEventNotificationEmail } from "../components/EventNotificationEmail";
import { emailSender, isAllowedRecipient } from "./resendClient";

// Procesador del outbox (spec event-change-notifications, Decisiones 4–8). Lo llaman `after()` (una notificación) y
// el cron (las vencidas); el reclamo atómico impide que dos procesos envíen la misma notificación a la vez.

const MAX_ATTEMPTS = 5;
/** Máximo de correos por llamada a `resend.batch.send`. */
const BATCH_SIZE = 100;
const ALLOWLIST_SKIPPED = "omitido por allowlist";

type Sender = NonNullable<typeof emailSender>;
type Delivery = { id: string; email: string };
type SendError = Pick<ErrorResponse, "message" | "statusCode"> & { name: string };
type SendResult<T> = { data: T; error: null } | { data: null; error: SendError };

const n = eventNotifications;
const d = eventNotificationDeliveries;

/** Pendiente y vencida (`send_after` y `next_attempt_at`), o `sending` con el reclamo vencido (proceso caído). */
const claimable = or(
  and(eq(n.status, "pending"), lte(n.sendAfter, sql`now()`), or(isNull(n.nextAttemptAt), lte(n.nextAttemptAt, sql`now()`))),
  and(eq(n.status, "sending"), lt(n.lockedAt, sql`now() - interval '10 minutes'`)),
);

// No son culpa del destinatario: una clave mal configurada o una petición idempotente aún en curso se reintentan.
const RETRYABLE_ERROR_NAMES = new Set([
  "missing_api_key",
  "invalid_api_key",
  "restricted_api_key",
  "concurrent_idempotent_requests",
]);

/** Red/timeout (sin status), 429 y 5xx se reintentan; el resto de 4xx (validación) es permanente. */
export function isRetryableSendError(error: SendError): boolean {
  const { statusCode } = error;
  return statusCode === null || statusCode === 429 || statusCode >= 500 || RETRYABLE_ERROR_NAMES.has(error.name);
}

/** Clave de idempotencia de un envío individual (Decisión 5). */
export const deliveryIdempotencyKey = (notificationId: string, deliveryId: string) =>
  `event-notification/${notificationId}/${deliveryId}`;

/**
 * `batch.send` admite una sola clave por petición: se deriva de los ids del lote (ordenados por id), así un reintento
 * del mismo lote tras una caída repite la clave y Resend no vuelve a enviarlo.
 */
export const batchIdempotencyKey = (notificationId: string, lot: Delivery[]) =>
  `event-notification/${notificationId}/batch-${createHash("sha256")
    .update(lot.map((delivery) => delivery.id).join(","))
    .digest("hex")
    .slice(0, 32)}`;

/** Solo `name`, `message` (sin direcciones) y el id de la notificación: nunca la clave ni correos completos. */
function logError(notificationId: string, error: { name: string; message: string }) {
  console.error("[notifications] error al enviar", {
    notificationId,
    name: error.name,
    message: error.message.replace(/[^\s<>()@]+@/g, "***@"),
  });
}

function warnNoSender() {
  console.warn("[notifications] envío omitido: falta RESEND_API_KEY o EMAIL_FROM; las notificaciones siguen pendientes");
}

/** El SDK devuelve los errores HTTP y de red en `error`; si aun así lanza, cuenta como fallo de red (reintentable). */
async function safeSend<T>(send: () => Promise<SendResult<T>>): Promise<SendResult<T>> {
  try {
    return await send();
  } catch (error) {
    const { name, message } = error instanceof Error ? error : { name: "Error", message: String(error) };
    return { data: null, error: { name, message, statusCode: null } };
  }
}

const errorText = (error: SendError) => `${error.name}: ${error.message}`;

/** Marca `sent` cada entrega con su id de Resend (`messageIds[i]` corresponde a `lot[i]`), en una sola sentencia. */
async function markSent(lot: Delivery[], messageIds: string[]) {
  const values = sql.join(
    lot.map((delivery, index) => sql`(${delivery.id}::uuid, ${messageIds[index]})`),
    sql`, `,
  );
  await db.execute(sql`
    UPDATE event_notification_deliveries AS d
    SET status = 'sent', provider_message_id = v.message_id, sent_at = now(), attempts = d.attempts + 1,
      last_error = NULL, updated_at = now()
    FROM (VALUES ${values}) AS v(id, message_id)
    WHERE d.id = v.id`);
}

async function markFailedAttempt(lot: Delivery[], error: SendError, status: "pending" | "failed") {
  await db
    .update(d)
    .set({ status, lastError: errorText(error), attempts: sql`${d.attempts} + 1` })
    .where(inArray(d.id, lot.map((delivery) => delivery.id)));
}

/** Reclama la notificación (Decisión 5): devuelve la fila o `undefined` si no está vencida u otro proceso la tiene. */
async function claim(id: string) {
  const [row] = await db
    .update(n)
    .set({ status: "sending", lockedAt: sql`now()`, attempts: sql`${n.attempts} + 1` })
    .where(and(eq(n.id, id), claimable))
    .returning();
  return row;
}

/** Destinatarios congelados en el primer reclamo: un correo por dirección de los pedidos pagados (registrados e invitados). */
async function freezeRecipients(notificationId: string, eventId: string) {
  await db.execute(sql`
    INSERT INTO event_notification_deliveries (notification_id, email)
    SELECT DISTINCT ${notificationId}::uuid, lower(buyer_email)
    FROM orders
    WHERE event_id = ${eventId} AND status IN ('paid', 'partially_refunded') AND buyer_email IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM event_notification_deliveries WHERE notification_id = ${notificationId}::uuid)
    ON CONFLICT (notification_id, email) DO NOTHING`);
}

/**
 * Envía las entregas `allowed` en lotes; devuelve el último error reintentable, si hubo. Un 429 corta el envío. Un
 * error de validación rechaza el lote entero: se reenvía correo a correo (clave por entrega) para aislar el inválido.
 */
async function sendLots(
  sender: Sender,
  notificationId: string,
  allowed: Delivery[],
  email: { subject: string; html: string; text: string },
): Promise<SendError | null> {
  const toEmail = (delivery: Delivery) => ({ from: sender.from, to: delivery.email, ...email });
  let retryable: SendError | null = null;

  for (let start = 0; start < allowed.length; start += BATCH_SIZE) {
    const lot = allowed.slice(start, start + BATCH_SIZE);
    const batch = await safeSend(() =>
      sender.resend.batch.send(lot.map(toEmail), { idempotencyKey: batchIdempotencyKey(notificationId, lot) }),
    );
    if (!batch.error) {
      await markSent(lot, batch.data.data.map((email) => email.id));
      continue;
    }
    logError(notificationId, batch.error);
    if (isRetryableSendError(batch.error)) {
      retryable = batch.error;
      await markFailedAttempt(lot, batch.error, "pending");
      if (batch.error.statusCode === 429) return retryable;
      continue;
    }
    for (const delivery of lot) {
      const single = await safeSend(() =>
        sender.resend.emails.send(toEmail(delivery), {
          idempotencyKey: deliveryIdempotencyKey(notificationId, delivery.id),
        }),
      );
      if (!single.error) {
        await markSent([delivery], [single.data.id]);
        continue;
      }
      const isRetryable = isRetryableSendError(single.error);
      await markFailedAttempt([delivery], single.error, isRetryable ? "pending" : "failed");
      if (isRetryable) {
        logError(notificationId, single.error);
        retryable = single.error;
        if (single.error.statusCode === 429) return retryable;
      }
    }
  }
  return retryable;
}

/** Cierra el ciclo: `sent` si no quedan entregas pendientes; si quedan, reintento con backoff o `failed` al 5.º intento. */
async function settle(notificationId: string, attempts: number, lastError: string | null) {
  const pending = await db
    .select({ id: d.id })
    .from(d)
    .where(and(eq(d.notificationId, notificationId), eq(d.status, "pending")));

  if (pending.length === 0) {
    await db.update(n).set({ status: "sent", sentAt: sql`now()`, lockedAt: null }).where(eq(n.id, notificationId));
    return;
  }
  const error = lastError ?? "entregas pendientes";
  if (attempts >= MAX_ATTEMPTS) {
    await db
      .update(d)
      .set({ status: "failed", lastError: error })
      .where(and(eq(d.notificationId, notificationId), eq(d.status, "pending")));
    await db.update(n).set({ status: "failed", lastError: error, lockedAt: null }).where(eq(n.id, notificationId));
    return;
  }
  // 1, 2, 4 y 8 minutos tras los intentos 1 a 4.
  await db
    .update(n)
    .set({
      status: "pending",
      lastError: error,
      lockedAt: null,
      nextAttemptAt: sql`now() + ${2 ** (attempts - 1)} * interval '1 minute'`,
    })
    .where(eq(n.id, notificationId));
}

/**
 * Reclama y envía una notificación. Devuelve `false` si no se reclamó (no vencida, ya reclamada o sin emisor
 * configurado: entonces sigue `pending` sin consumir intento).
 */
export async function processEventNotification(id: string): Promise<boolean> {
  if (!emailSender) {
    warnNoSender();
    return false;
  }
  const notification = await claim(id);
  if (!notification) return false;

  // Cambios que se revirtieron (A → B → A) no se avisan.
  const changes = notification.changes.filter((change) => change.before !== change.after);
  if (changes.length === 0) {
    await settle(id, notification.attempts, null);
    return true;
  }

  await freezeRecipients(id, notification.eventId);
  const [event] = await db.select({ title: events.title, slug: events.slug }).from(events).where(eq(events.id, notification.eventId));
  const email = await renderEventNotificationEmail({
    kind: notification.kind,
    title: event.title,
    changes,
    eventUrl: `${env.APP_URL}/eventos/${event.slug}`,
    ticketsUrl: `${env.APP_URL}/mis-entradas`,
    from: emailSender.from,
  });

  const deliveries = await db
    .select({ id: d.id, email: d.email })
    .from(d)
    .where(and(eq(d.notificationId, id), eq(d.status, "pending")))
    .orderBy(asc(d.id));
  const allowed = deliveries.filter((delivery) => isAllowedRecipient(delivery.email));
  const skipped = deliveries.filter((delivery) => !isAllowedRecipient(delivery.email)).map((delivery) => delivery.id);
  if (skipped.length > 0) {
    await db.update(d).set({ status: "failed", lastError: ALLOWLIST_SKIPPED }).where(inArray(d.id, skipped));
  }

  const retryable = await sendLots(emailSender, id, allowed, email);
  await settle(id, notification.attempts, retryable && errorText(retryable));
  return true;
}

/** Procesa hasta `limit` notificaciones reclamables (vencidas, reintentables o con reclamo vencido); devuelve cuántas. */
export async function processDueEventNotifications({ limit }: { limit: number }): Promise<number> {
  if (!emailSender) {
    warnNoSender();
    return 0;
  }
  const due = await db.select({ id: n.id }).from(n).where(claimable).orderBy(asc(n.sendAfter)).limit(limit);
  let processed = 0;
  for (const { id } of due) {
    try {
      if (await processEventNotification(id)) processed++;
    } catch (error) {
      // Queda `sending`: se libera sola a los 10 minutos.
      logError(id, error instanceof Error ? error : { name: "Error", message: String(error) });
    }
  }
  return processed;
}
