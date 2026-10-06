// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { PgInsertValue } from "drizzle-orm/pg-core";
import { Resend } from "resend";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@/lib/db/schema/identity";
import { eventNotificationDeliveries, eventNotifications } from "@/lib/db/schema/notifications";
import { orders } from "@/lib/db/schema/sales";
import { describeWithDb } from "@/lib/db/testDb";
import { createTestEvent, sellTestSeats } from "@/lib/db/testFixtures";
import { db, inRolledBackTransaction } from "@/lib/db/testTransaction";
import type { EventChange } from "../types/notifications.types";
import {
  batchIdempotencyKey,
  deliveryIdempotencyKey,
  isRetryableSendError,
  processDueEventNotifications,
  processEventNotification,
} from "./eventNotificationProcessor.service";

vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

// Emisor y allowlist controlados por cada test; el SDK real con una clave ficticia y sus métodos espiados (nunca
// llama a Resend).
const mocks = vi.hoisted(() => ({
  sender: null as { resend: import("resend").Resend; from: string } | null,
  allowed: null as Set<string> | null,
}));
vi.mock("./resendClient", () => ({
  get emailSender() {
    return mocks.sender;
  },
  isAllowedRecipient: (email: string) => !mocks.allowed || mocks.allowed.has(email),
}));

const FAKE_KEY = "re_test_fake_key_for_unit_tests";
const FROM = "Mentec Tickets <notificaciones@ticketera.mentec.dev>";
const SCHEDULE_CHANGE: EventChange = {
  field: "startsAt",
  before: "2099-12-31T01:00:00.000Z",
  after: "2099-12-31T03:00:00.000Z",
};

type Payload = { to: string; subject: string; from: string; html: string; text: string };

let batchSend: ReturnType<typeof vi.fn>;
let emailSend: ReturnType<typeof vi.fn>;

const ok = (payload: Payload[]) => ({
  data: { data: payload.map((email) => ({ id: `msg-${email.to}` })) },
  error: null,
  headers: null,
});
const failure = (statusCode: number | null, name = "application_error", message = "fallo de prueba") => ({
  data: null,
  error: { name, message, statusCode },
  headers: null,
});

beforeEach(() => {
  const resend = new Resend(FAKE_KEY);
  batchSend = vi.spyOn(resend.batch, "send").mockImplementation((async (payload: Payload[]) => ok(payload)) as never) as never;
  emailSend = vi
    .spyOn(resend.emails, "send")
    .mockImplementation((async (payload: Payload) => ({ data: { id: `msg-${payload.to}` }, error: null, headers: null })) as never) as never;
  mocks.sender = { resend, from: FROM };
  mocks.allowed = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("isRetryableSendError", () => {
  it.each([
    [null, "application_error", true],
    [429, "rate_limit_exceeded", true],
    [500, "internal_server_error", true],
    [503, "application_error", true],
    [403, "invalid_api_key", true],
    [409, "concurrent_idempotent_requests", true],
    [400, "validation_error", false],
    [422, "invalid_parameter", false],
    [403, "validation_error", false],
  ])("status %s (%s) → reintentable: %s", (statusCode, name, expected) => {
    expect(isRetryableSendError({ statusCode, name, message: "" })).toBe(expected);
  });

  it("la clave de un lote es estable y depende solo de sus entregas", () => {
    const lot = [
      { id: "a", email: "x@example.com" },
      { id: "b", email: "y@example.com" },
    ];
    expect(batchIdempotencyKey("n1", lot)).toBe(batchIdempotencyKey("n1", structuredClone(lot)));
    expect(batchIdempotencyKey("n1", lot)).toMatch(/^event-notification\/n1\/batch-[0-9a-f]{32}$/);
    expect(batchIdempotencyKey("n1", lot.slice(1))).not.toBe(batchIdempotencyKey("n1", lot));
    expect(deliveryIdempotencyKey("n1", "d1")).toBe("event-notification/n1/d1");
  });
});

/** Evento publicado con una orden `paid` por correo (invitados: sin `user_id`). */
async function eventWithBuyers(emails: string[]) {
  const { eventId, slug } = await createTestEvent({ general: emails.length + 2, status: "published" });
  const orderIds: string[] = [];
  for (const email of emails) {
    const { orderId } = await sellTestSeats(slug, { count: 1 });
    await db.update(orders).set({ buyerEmail: email }).where(eq(orders.id, orderId));
    orderIds.push(orderId);
  }
  return { eventId, slug, orderIds };
}

async function insertNotification(eventId: string, values: Partial<PgInsertValue<typeof eventNotifications>> = {}) {
  const [{ id }] = await db
    .insert(eventNotifications)
    .values({ eventId, kind: "schedule", changes: [SCHEDULE_CHANGE], sendAfter: sql`now()`, ...values })
    .returning({ id: eventNotifications.id });
  return id;
}

const notificationRow = async (id: string) =>
  (
    await db
      .select({
        status: eventNotifications.status,
        attempts: eventNotifications.attempts,
        lastError: eventNotifications.lastError,
        sentAt: eventNotifications.sentAt,
        lockedAt: eventNotifications.lockedAt,
        // Segundos hasta el siguiente intento (en la transacción de test, `now()` no avanza).
        retryInSeconds: sql<number | null>`extract(epoch from ${eventNotifications.nextAttemptAt} - now())`.mapWith(Number),
      })
      .from(eventNotifications)
      .where(eq(eventNotifications.id, id))
  )[0];

const deliveriesOf = (notificationId: string) =>
  db
    .select({
      id: eventNotificationDeliveries.id,
      email: eventNotificationDeliveries.email,
      status: eventNotificationDeliveries.status,
      providerMessageId: eventNotificationDeliveries.providerMessageId,
      attempts: eventNotificationDeliveries.attempts,
      lastError: eventNotificationDeliveries.lastError,
    })
    .from(eventNotificationDeliveries)
    .where(eq(eventNotificationDeliveries.notificationId, notificationId))
    .orderBy(eventNotificationDeliveries.email);

/** Hace vencer el backoff (en la transacción de test el reloj no avanza). */
const expireBackoff = (id: string) =>
  db
    .update(eventNotifications)
    .set({ nextAttemptAt: sql`now() - interval '1 second'` })
    .where(eq(eventNotifications.id, id));

/** Inserta `count` entregas pendientes (sin pasar por pedidos) para probar lotes grandes. */
async function insertDeliveries(notificationId: string, count: number) {
  await db.insert(eventNotificationDeliveries).values(
    Array.from({ length: count }, (_, index) => ({ notificationId, email: `lote${String(index).padStart(3, "0")}@example.com` })),
  );
}

describeWithDb("processEventNotification", () => {
  it("envía un correo por dirección distinta (registrados e invitados, solo pedidos pagados) y la deja `sent`", () =>
    inRolledBackTransaction(async () => {
      const { eventId, orderIds } = await eventWithBuyers(["Ana@Example.com", "ana@example.com", "luis@example.com"]);
      const [registered] = await db.select({ id: users.id }).from(users).limit(1);
      await db.update(orders).set({ userId: registered.id }).where(eq(orders.id, orderIds[2]));
      // Una reserva `pending` no recibe correo.
      await db.insert(orders).values({
        code: `TK-TEST-${randomUUID().slice(0, 8)}`,
        eventId,
        status: "pending",
        buyerEmail: "reserva@example.com",
        expiresAt: new Date(Date.now() + 60_000),
        ticketCount: 1,
        subtotalCents: 0,
        platformFeeCents: 0,
        organizerAmountCents: 0,
      });
      const id = await insertNotification(eventId);

      expect(await processEventNotification(id)).toBe(true);

      expect(batchSend).toHaveBeenCalledTimes(1);
      const [payload, options] = batchSend.mock.calls[0] as [Payload[], { idempotencyKey: string }];
      expect(payload.map((email) => email.to)).toEqual(expect.arrayContaining(["ana@example.com", "luis@example.com"]));
      expect(payload).toHaveLength(2);
      expect(payload[0]).toMatchObject({ from: FROM, subject: expect.stringMatching(/^Nueva fecha para Evento de prueba/) });
      const deliveries = await deliveriesOf(id);
      expect(options.idempotencyKey).toBe(batchIdempotencyKey(id, [...deliveries].sort((a, b) => a.id.localeCompare(b.id))));
      expect(deliveries).toMatchObject([
        { email: "ana@example.com", status: "sent", providerMessageId: "msg-ana@example.com", attempts: 1 },
        { email: "luis@example.com", status: "sent", providerMessageId: "msg-luis@example.com", attempts: 1 },
      ]);
      expect(await notificationRow(id)).toMatchObject({ status: "sent", attempts: 1, sentAt: expect.any(Date), lockedAt: null });

      // Procesarla otra vez (cron tras `after()`) no reenvía nada.
      expect(await processEventNotification(id)).toBe(false);
      expect(batchSend).toHaveBeenCalledTimes(1);
    }));

  it("no reclama una notificación no vencida (`send_after` o `next_attempt_at` futuros) ni una reclamada hace poco", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const later = await insertNotification(eventId, { kind: "update", sendAfter: sql`now() + interval '10 minutes'` });
      const backingOff = await insertNotification(eventId, { nextAttemptAt: sql`now() + interval '1 minute'` });
      const claimed = await insertNotification(eventId, {
        kind: "cancelled",
        status: "sending",
        lockedAt: sql`now() - interval '5 minutes'`,
      });
      for (const id of [later, backingOff, claimed]) expect(await processEventNotification(id)).toBe(false);
      expect(batchSend).not.toHaveBeenCalled();
    }));

  it("libera y procesa una notificación `sending` con el reclamo vencido (> 10 min)", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId, {
        status: "sending",
        attempts: 1,
        lockedAt: sql`now() - interval '11 minutes'`,
      });
      expect(await processEventNotification(id)).toBe(true);
      expect(await notificationRow(id)).toMatchObject({ status: "sent", attempts: 2 });
    }));

  it("congela los destinatarios: un reintento no añade compradores nuevos ni duplica entregas, con la misma clave", () =>
    inRolledBackTransaction(async () => {
      const { eventId, slug } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId);
      batchSend.mockResolvedValueOnce(failure(500, "internal_server_error"));

      expect(await processEventNotification(id)).toBe(true);
      expect(await deliveriesOf(id)).toMatchObject([
        { email: "ana@example.com", status: "pending", attempts: 1, lastError: "internal_server_error: fallo de prueba" },
      ]);
      expect(await notificationRow(id)).toMatchObject({
        status: "pending",
        attempts: 1,
        lockedAt: null,
        retryInSeconds: 60,
        lastError: "internal_server_error: fallo de prueba",
      });

      const { orderId } = await sellTestSeats(slug, { count: 1 });
      await db.update(orders).set({ buyerEmail: "nuevo@example.com" }).where(eq(orders.id, orderId));
      await expireBackoff(id);
      expect(await processEventNotification(id)).toBe(true);

      expect(batchSend).toHaveBeenCalledTimes(2);
      expect(batchSend.mock.calls[1][1]).toEqual(batchSend.mock.calls[0][1]);
      expect(await deliveriesOf(id)).toMatchObject([{ email: "ana@example.com", status: "sent", attempts: 2 }]);
      expect(await notificationRow(id)).toMatchObject({ status: "sent", attempts: 2 });
    }));

  it("en allowlist no envía a direcciones fuera de la lista: su entrega queda `failed` sin llamar a Resend", () =>
    inRolledBackTransaction(async () => {
      mocks.allowed = new Set(["qa@example.com"]);
      const { eventId } = await eventWithBuyers(["qa@example.com", "cliente@example.com"]);
      const id = await insertNotification(eventId);

      await processEventNotification(id);

      const [payload] = batchSend.mock.calls[0] as [Payload[]];
      expect(payload.map((email) => email.to)).toEqual(["qa@example.com"]);
      expect(await deliveriesOf(id)).toMatchObject([
        { email: "cliente@example.com", status: "failed", lastError: "omitido por allowlist", attempts: 0 },
        { email: "qa@example.com", status: "sent" },
      ]);
      expect(await notificationRow(id)).toMatchObject({ status: "sent" });
    }));

  it("sin emisor (sin clave o sin remitente) no envía ni consume intento, y avisa sin datos sensibles", () =>
    inRolledBackTransaction(async () => {
      mocks.sender = null;
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId);

      expect(await processEventNotification(id)).toBe(false);
      expect(await processDueEventNotifications({ limit: 5 })).toBe(0);

      expect(await notificationRow(id)).toMatchObject({ status: "pending", attempts: 0 });
      expect(await deliveriesOf(id)).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("envío omitido"));
      expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/re_|@/);
    }));

  it("un 429 corta el envío: el resto de lotes ni se intenta y todo queda `pending`", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId);
      await insertDeliveries(id, 150);
      batchSend.mockResolvedValueOnce(failure(429, "rate_limit_exceeded"));

      await processEventNotification(id);

      expect(batchSend).toHaveBeenCalledTimes(1);
      expect((batchSend.mock.calls[0][0] as Payload[]).length).toBe(100);
      const deliveries = await deliveriesOf(id);
      expect(deliveries.every((delivery) => delivery.status === "pending")).toBe(true);
      expect(deliveries.filter((delivery) => delivery.attempts === 1)).toHaveLength(100);
      expect(await notificationRow(id)).toMatchObject({ status: "pending", lastError: "rate_limit_exceeded: fallo de prueba" });
    }));

  it.each([
    ["5xx", () => failure(503)],
    ["error de red", () => Promise.reject(new TypeError("fetch failed"))],
  ])("un %s deja ese lote `pending` y sigue con el siguiente", (_, firstLot) =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId);
      await insertDeliveries(id, 150);
      batchSend.mockImplementationOnce(firstLot as never);

      await processEventNotification(id);

      expect(batchSend).toHaveBeenCalledTimes(2);
      const statuses = (await deliveriesOf(id)).map((delivery) => delivery.status);
      expect(statuses.filter((status) => status === "pending")).toHaveLength(100);
      expect(statuses.filter((status) => status === "sent")).toHaveLength(50);
      expect(await notificationRow(id)).toMatchObject({ status: "pending", retryInSeconds: 60 });
    }));

  it("un 4xx de validación marca `failed` solo la entrega inválida (reenvío uno a uno con clave por entrega)", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com", "rechazado@example.com", "luis@example.com"]);
      const id = await insertNotification(eventId);
      batchSend.mockResolvedValueOnce(failure(422, "validation_error", "Invalid `to` field: rechazado@example.com"));
      emailSend.mockImplementation((async (payload: Payload) =>
        payload.to === "rechazado@example.com"
          ? failure(422, "validation_error", "Invalid `to` field: rechazado@example.com")
          : { data: { id: `single-${payload.to}` }, error: null, headers: null }) as never);

      await processEventNotification(id);

      const deliveries = await deliveriesOf(id);
      expect(deliveries).toMatchObject([
        { email: "ana@example.com", status: "sent", providerMessageId: "single-ana@example.com" },
        { email: "luis@example.com", status: "sent", providerMessageId: "single-luis@example.com" },
        { email: "rechazado@example.com", status: "failed", lastError: expect.stringMatching(/^validation_error/) },
      ]);
      for (const delivery of deliveries) {
        expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: delivery.email }), {
          idempotencyKey: deliveryIdempotencyKey(id, delivery.id),
        });
      }
      expect(await notificationRow(id)).toMatchObject({ status: "sent" });
      // El log no incluye la dirección completa.
      const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
      expect(logged).toContain(id);
      expect(logged).not.toContain("rechazado@");
    }));

  it("reintenta con backoff 1, 2, 4 y 8 min y al 5.º intento deja la notificación y sus entregas `failed`", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId);
      batchSend.mockResolvedValue(failure(500, "internal_server_error"));

      for (const [attempt, minutes] of [[1, 1], [2, 2], [3, 4], [4, 8]]) {
        expect(await processEventNotification(id)).toBe(true);
        expect(await notificationRow(id)).toMatchObject({ status: "pending", attempts: attempt, retryInSeconds: minutes * 60 });
        await expireBackoff(id);
      }
      expect(await processEventNotification(id)).toBe(true);

      expect(await notificationRow(id)).toMatchObject({
        status: "failed",
        attempts: 5,
        lastError: "internal_server_error: fallo de prueba",
      });
      expect(await deliveriesOf(id)).toMatchObject([{ status: "failed", attempts: 5 }]);
      expect(await processEventNotification(id)).toBe(false);
    }));

  it("si todos los cambios se revirtieron, la marca `sent` sin enviar", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId, {
        kind: "update",
        changes: [
          { field: "title", before: "A", after: "A" },
          { field: "minAge", before: 18, after: 18 },
        ],
      });
      expect(await processEventNotification(id)).toBe(true);
      expect(batchSend).not.toHaveBeenCalled();
      expect(await deliveriesOf(id)).toEqual([]);
      expect(await notificationRow(id)).toMatchObject({ status: "sent", sentAt: expect.any(Date) });
    }));

  it("el correo solo lista los campos que cambiaron de verdad", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId, {
        kind: "update",
        changes: [
          { field: "title", before: "A", after: "A" },
          { field: "minAge", before: 0, after: 18 },
        ],
      });
      await processEventNotification(id);
      const [[email]] = batchSend.mock.calls[0] as [Payload[]];
      expect(email.text).toContain("Edad mínima: 0 → 18");
      expect(email.text).not.toContain("Nombre del evento");
    }));
});

describeWithDb("processDueEventNotifications", () => {
  it("procesa las vencidas (nuevas, reintentables y con reclamo vencido) y deja las futuras", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const due = await insertNotification(eventId);
      const retry = await insertNotification(eventId, { kind: "cancelled", attempts: 1, nextAttemptAt: sql`now()` });
      const stale = await insertNotification(eventId, {
        status: "sending",
        attempts: 1,
        lockedAt: sql`now() - interval '11 minutes'`,
      });
      const future = await insertNotification(eventId, { kind: "update", sendAfter: sql`now() + interval '10 minutes'` });

      expect(await processDueEventNotifications({ limit: 50 })).toBeGreaterThanOrEqual(3);

      for (const id of [due, retry, stale]) expect(await notificationRow(id)).toMatchObject({ status: "sent" });
      expect(await notificationRow(future)).toMatchObject({ status: "pending", attempts: 0 });
    }));
});

describeWithDb("reclamo concurrente", () => {
  it("dos procesos a la vez sobre la misma notificación: uno gana y se envía una sola vez", async () => {
    // Datos confirmados: cada `processEventNotification` usa su propia conexión del pool.
    const event = await createTestEvent({ general: 2, status: "published" });
    try {
      await sellTestSeats(event.slug, { count: 1 });
      const id = await insertNotification(event.eventId);

      const results = await Promise.all([processEventNotification(id), processEventNotification(id)]);

      expect(results.sort()).toEqual([false, true]);
      expect(batchSend).toHaveBeenCalledTimes(1);
      const deliveries = await db
        .select({ status: eventNotificationDeliveries.status })
        .from(eventNotificationDeliveries)
        .where(eq(eventNotificationDeliveries.notificationId, id));
      expect(deliveries).toEqual([{ status: "sent" }]);
    } finally {
      await event.cleanup();
    }
  });
});
