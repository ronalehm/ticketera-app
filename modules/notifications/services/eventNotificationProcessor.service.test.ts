// @vitest-environment node
import { randomUUID } from "node:crypto";
import { DrizzleQueryError, eq, sql } from "drizzle-orm";
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
    [409, "invalid_idempotent_request", false],
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

type Lot = { id: string; email: string }[];

/** Tramos de 100 de todas las entregas, ordenadas por id en SQL (el mismo orden que el procesador). */
async function tranchesOf(notificationId: string): Promise<Lot[]> {
  const rows = await db
    .select({ id: eventNotificationDeliveries.id, email: eventNotificationDeliveries.email })
    .from(eventNotificationDeliveries)
    .where(eq(eventNotificationDeliveries.notificationId, notificationId))
    .orderBy(eventNotificationDeliveries.id);
  return Array.from({ length: Math.ceil(rows.length / 100) }, (_, index) => rows.slice(index * 100, (index + 1) * 100));
}

const emailsOf = (lot: Lot) => lot.map((delivery) => delivery.email);

const batchCalls = () =>
  (batchSend.mock.calls as [Payload[], { idempotencyKey: string }][]).map(([payload, { idempotencyKey }]) => ({
    to: payload.map((email) => email.to),
    key: idempotencyKey,
  }));

type Outcome = "accept" | "lost" | 422 | 429 | 503;
const REJECTED = { 422: "validation_error", 429: "rate_limit_exceeded", 503: "application_error" } as const;

/**
 * Resend simulado que deduplica por clave (solo de test): con una clave ya aceptada y el mismo payload devuelve la
 * respuesta guardada sin entregar, y con otro payload (destinatarios o contenido) responde, como Resend, 409
 * `invalid_idempotent_request`; si no, sigue el guion (`accept` entrega y responde, `lost` entrega pero responde 503,
 * un código rechaza sin entregar ni guardar). Devuelve las direcciones entregadas.
 */
function idempotentResend(script: { batch: Outcome[]; single: Outcome[] }) {
  const accepted = new Map<string, { payload: string; response: unknown }>();
  const delivered: string[] = [];
  const handle = (outcomes: Outcome[], payload: Payload[], response: unknown, key: string) => {
    const previous = accepted.get(key);
    if (previous) {
      return previous.payload === JSON.stringify(payload)
        ? previous.response
        : failure(409, "invalid_idempotent_request", "misma clave con otro contenido");
    }
    const outcome = outcomes.shift() ?? "accept";
    if (outcome !== "accept" && outcome !== "lost") return failure(outcome, REJECTED[outcome]);
    delivered.push(...payload.map((email) => email.to));
    accepted.set(key, { payload: JSON.stringify(payload), response });
    return outcome === "accept" ? response : failure(503);
  };
  batchSend.mockImplementation((async (payload: Payload[], { idempotencyKey }: { idempotencyKey: string }) =>
    handle(script.batch, payload, ok(payload), idempotencyKey)) as never);
  emailSend.mockImplementation((async (payload: Payload, { idempotencyKey }: { idempotencyKey: string }) =>
    handle(script.single, [payload], { data: { id: `msg-${payload.to}` }, error: null, headers: null }, idempotencyKey)) as never);
  return delivered;
}

describe("idempotentResend (simulador)", () => {
  it("repite la respuesta con el mismo payload y responde 409 `invalid_idempotent_request` con otro", async () => {
    const delivered = idempotentResend({ batch: [], single: [] });
    const send = (payload: Payload[]) => mocks.sender?.resend.batch.send(payload, { idempotencyKey: "k" });
    const ana = [{ to: "ana@example.com", subject: "s", from: FROM, html: "h", text: "t" }];

    const first = await send(ana);
    expect(await send(structuredClone(ana))).toBe(first);
    expect(await send([{ ...ana[0], to: "luis@example.com" }])).toEqual(
      failure(409, "invalid_idempotent_request", "misma clave con otro contenido"),
    );
    expect(await send([{ ...ana[0], text: "otro" }])).toMatchObject({ error: { statusCode: 409 } });
    expect(delivered).toEqual(["ana@example.com"]);
  });
});

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

  it("congela los destinatarios: tras un 5xx del lote, el reintento repite el lote con la misma clave y sin compradores nuevos", () =>
    inRolledBackTransaction(async () => {
      const { eventId, slug } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId);
      batchSend.mockResolvedValueOnce(failure(500, "internal_server_error"));

      expect(await processEventNotification(id)).toBe(true);
      expect(await deliveriesOf(id)).toMatchObject([
        { email: "ana@example.com", status: "pending", attempts: 0, lastError: "internal_server_error: fallo de prueba" },
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

      // El error del lote no subió `attempts`: el mismo lote sale otra vez con la misma clave, sin envíos sueltos.
      expect(batchSend).toHaveBeenCalledTimes(2);
      const [, retry] = batchSend.mock.calls as [Payload[], { idempotencyKey: string }][];
      expect(retry[0].map((email) => email.to)).toEqual(["ana@example.com"]);
      expect(retry[1]).toEqual(batchSend.mock.calls[0][1]);
      expect(emailSend).not.toHaveBeenCalled();
      expect(await deliveriesOf(id)).toMatchObject([{ email: "ana@example.com", status: "sent", attempts: 1 }]);
      // Al quedar `sent` se limpia el error del intento anterior.
      expect(await notificationRow(id)).toMatchObject({ status: "sent", attempts: 2, lastError: null });
    }));

  it("si falla tras enviar un lote sin registrarlo, el reintento repite el lote con la misma clave", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com", "luis@example.com"]);
      const id = await insertNotification(eventId);
      // Respuesta sin datos: `markSent` no llega a ejecutarse (simula una caída tras aceptar Resend el lote).
      batchSend.mockResolvedValueOnce({ data: null, error: null, headers: null });

      expect(await processEventNotification(id)).toBe(true);
      expect(await notificationRow(id)).toMatchObject({ status: "pending", attempts: 1, lockedAt: null, retryInSeconds: 60 });
      expect((await deliveriesOf(id)).map((delivery) => delivery.attempts)).toEqual([0, 0]);

      await expireBackoff(id);
      expect(await processEventNotification(id)).toBe(true);

      expect(batchSend).toHaveBeenCalledTimes(2);
      expect(batchSend.mock.calls[1][1]).toEqual(batchSend.mock.calls[0][1]);
      expect(emailSend).not.toHaveBeenCalled();
      expect(await notificationRow(id)).toMatchObject({ status: "sent", attempts: 2, lastError: null });
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

  it("un 429 en el primero de dos lotes corta el envío; el reintento sale en 2 lotes, el primero con la clave anterior", () =>
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
      expect(deliveries.every((delivery) => delivery.attempts === 0)).toBe(true);
      expect(await notificationRow(id)).toMatchObject({ status: "pending", lastError: "rate_limit_exceeded: fallo de prueba" });

      await expireBackoff(id);
      await processEventNotification(id);

      expect(batchSend).toHaveBeenCalledTimes(3);
      expect(batchSend.mock.calls[1][1]).toEqual(batchSend.mock.calls[0][1]);
      expect((batchSend.mock.calls[1][0] as Payload[]).length).toBe(100);
      expect((batchSend.mock.calls[2][0] as Payload[]).length).toBe(50);
      expect(emailSend).not.toHaveBeenCalled();
      expect((await deliveriesOf(id)).every((delivery) => delivery.status === "sent")).toBe(true);
    }));

  it.each([
    ["timeout/red", () => Promise.reject(new TypeError("fetch failed"))],
    ["503", () => failure(503)],
    ["429", () => failure(429, "rate_limit_exceeded")],
  ])("un %s en el lote: el reintento repite el mismo lote con la misma clave, sin `emails.send`", (_, firstTry) =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com", "luis@example.com"]);
      const id = await insertNotification(eventId);
      batchSend.mockImplementationOnce(firstTry as never);

      await processEventNotification(id);
      expect(await deliveriesOf(id)).toMatchObject([
        { status: "pending", attempts: 0 },
        { status: "pending", attempts: 0 },
      ]);
      await expireBackoff(id);
      await processEventNotification(id);

      expect(batchSend).toHaveBeenCalledTimes(2);
      const [first, retry] = batchSend.mock.calls as [Payload[], { idempotencyKey: string }][];
      expect(retry[0].map((email) => email.to)).toEqual(first[0].map((email) => email.to));
      expect(retry[1]).toEqual(first[1]);
      expect(emailSend).not.toHaveBeenCalled();
      expect(await deliveriesOf(id)).toMatchObject([
        { status: "sent", attempts: 1 },
        { status: "sent", attempts: 1 },
      ]);
      expect(await notificationRow(id)).toMatchObject({ status: "sent", attempts: 2 });
    }));

  it("un 422 en el lote y luego un 500 en un envío individual: el reintento envía solo esa entrega con su clave", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com", "luis@example.com"]);
      const id = await insertNotification(eventId);
      batchSend.mockResolvedValueOnce(failure(422, "validation_error"));
      emailSend.mockImplementation((async (payload: Payload) =>
        payload.to === "luis@example.com"
          ? failure(500, "internal_server_error")
          : { data: { id: `single-${payload.to}` }, error: null, headers: null }) as never);

      await processEventNotification(id);
      expect(await deliveriesOf(id)).toMatchObject([
        { email: "ana@example.com", status: "sent", attempts: 1 },
        { email: "luis@example.com", status: "pending", attempts: 1 },
      ]);

      emailSend.mockClear();
      emailSend.mockImplementation((async (payload: Payload) => ({ data: { id: `single-${payload.to}` }, error: null, headers: null })) as never);
      await expireBackoff(id);
      await processEventNotification(id);

      expect(batchSend).toHaveBeenCalledTimes(1);
      const [, luis] = await deliveriesOf(id);
      expect(emailSend).toHaveBeenCalledTimes(1);
      expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: "luis@example.com" }), {
        idempotencyKey: deliveryIdempotencyKey(id, luis.id),
      });
      expect(luis).toMatchObject({ status: "sent", attempts: 2 });
      expect(await notificationRow(id)).toMatchObject({ status: "sent" });
    }));

  it("un 409 `invalid_idempotent_request` en el lote deja sus entregas `failed` sin reenviarlas", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com", "luis@example.com"]);
      const id = await insertNotification(eventId);
      batchSend.mockResolvedValueOnce(failure(409, "invalid_idempotent_request", "otro contenido"));

      expect(await processEventNotification(id)).toBe(true);

      expect(emailSend).not.toHaveBeenCalled();
      const failed = { status: "failed", attempts: 0, lastError: "invalid_idempotent_request: otro contenido" };
      expect(await deliveriesOf(id)).toMatchObject([failed, failed]);
      expect(await notificationRow(id)).toMatchObject({ status: "sent" });
      expect(await processEventNotification(id)).toBe(false);
      expect(batchSend).toHaveBeenCalledTimes(1);
    }));

  it("un 422 en el tramo 0 cortado por un 429 en su 2.ª entrega: el reintento no desplaza los tramos 1 y 2", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId);
      await insertDeliveries(id, 250);
      const tranches = await tranchesOf(id);
      const [first, second] = tranches[0];
      batchSend.mockResolvedValueOnce(failure(422, "validation_error"));
      emailSend
        .mockImplementationOnce((async (payload: Payload) => ({ data: { id: `msg-${payload.to}` }, error: null, headers: null })) as never)
        .mockResolvedValueOnce(failure(429, "rate_limit_exceeded"));

      await processEventNotification(id);

      expect(batchSend).toHaveBeenCalledTimes(1);
      expect(emailSend).toHaveBeenCalledTimes(2);
      const byId = new Map((await deliveriesOf(id)).map((delivery) => [delivery.id, delivery]));
      expect(byId.get(first.id)).toMatchObject({ status: "sent", attempts: 1 });
      expect(byId.get(second.id)).toMatchObject({ status: "pending", attempts: 1 });
      const untouched = [...tranches[0].slice(2), ...tranches[1], ...tranches[2]];
      expect(untouched).toHaveLength(248);
      for (const { id: deliveryId } of untouched) expect(byId.get(deliveryId)).toMatchObject({ status: "pending", attempts: 0 });

      batchSend.mockClear();
      emailSend.mockClear();
      await expireBackoff(id);
      await processEventNotification(id);

      const rest = tranches[0].slice(2);
      expect(batchCalls()).toEqual([
        { to: emailsOf(rest), key: batchIdempotencyKey(id, rest) },
        { to: emailsOf(tranches[1]), key: batchIdempotencyKey(id, tranches[1]) },
        { to: emailsOf(tranches[2]), key: batchIdempotencyKey(id, tranches[2]) },
      ]);
      expect(emailSend).toHaveBeenCalledTimes(1);
      expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: second.email }), {
        idempotencyKey: deliveryIdempotencyKey(id, second.id),
      });
      const deliveries = await deliveriesOf(id);
      expect(deliveries).toHaveLength(250);
      expect(deliveries.every((delivery) => delivery.status === "sent")).toBe(true);
    }));

  it("un lote aceptado sin respuesta sale con la misma clave aunque un 4xx + 429 previo deje entregas sueltas: nadie recibe dos correos", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId);
      await insertDeliveries(id, 200);
      const tranches = await tranchesOf(id);
      // Intento 1: tramo 0 → 503 sin aceptar, tramo 1 → aceptado con la respuesta perdida. Intento 2: tramo 0 → 422 y
      // el reenvío uno a uno se corta con un 429 en la 2.ª entrega. Intento 3: sin errores.
      const delivered = idempotentResend({ batch: [503, "lost", 422], single: ["accept", 429] });

      for (let attempt = 1; attempt <= 3; attempt++) {
        await processEventNotification(id);
        await expireBackoff(id);
      }

      const tranche1 = batchCalls().filter((call) => call.to.some((to) => emailsOf(tranches[1]).includes(to)));
      expect(tranche1).toEqual([
        { to: emailsOf(tranches[1]), key: batchIdempotencyKey(id, tranches[1]) },
        { to: emailsOf(tranches[1]), key: batchIdempotencyKey(id, tranches[1]) },
      ]);
      expect([...delivered].sort()).toEqual(emailsOf(tranches.flat()).sort());
      const deliveries = await deliveriesOf(id);
      expect(deliveries).toHaveLength(200);
      expect(deliveries.every((delivery) => delivery.status === "sent")).toBe(true);
      expect(await notificationRow(id)).toMatchObject({ status: "sent", attempts: 3 });
    }));

  // [secuencia en el tramo 0, entregas del tramo 0 ya intentadas solas, entregas `sent` al final, primer intento]
  it.each([
    ["503", 0, 250, () => batchSend.mockResolvedValueOnce(failure(503))],
    ["429", 0, 250, () => batchSend.mockResolvedValueOnce(failure(429, "rate_limit_exceeded"))],
    // El tramo 0 queda resuelto como `failed`, sin reenviarse.
    ["409 invalid_idempotent_request", 0, 150, () => batchSend.mockResolvedValueOnce(failure(409, "invalid_idempotent_request"))],
    ["una caída a mitad del reenvío uno a uno", 1, 250, null],
  ] as const)("con %s en el tramo 0, los tramos 1 y 2 salen siempre con su clave y sus entregas", (_, skipped, sent, failFirstLot) =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId);
      await insertDeliveries(id, 250);
      const tranches = await tranchesOf(id);

      if (failFirstLot) {
        failFirstLot();
        await processEventNotification(id);
      } else {
        // Caída tras enviar sola la 1.ª entrega del tramo 0 (su lote recibió un 4xx): reclamo vencido.
        await db
          .update(eventNotificationDeliveries)
          .set({ status: "sent", attempts: 1 })
          .where(eq(eventNotificationDeliveries.id, tranches[0][0].id));
        await db
          .update(eventNotifications)
          .set({ status: "sending", attempts: 1, lockedAt: sql`now() - interval '11 minutes'` })
          .where(eq(eventNotifications.id, id));
      }
      await expireBackoff(id);
      await processEventNotification(id);

      const expected = [tranches[0].slice(skipped), tranches[1], tranches[2]].map((lot) => ({
        to: emailsOf(lot),
        key: batchIdempotencyKey(id, lot),
      }));
      const calls = batchCalls();
      for (const call of calls) {
        const lot = expected.find(({ to }) => call.to.some((email) => to.includes(email)));
        expect(call).toEqual(lot);
      }
      expect(calls.filter((call) => call.key === expected[1].key)).toHaveLength(1);
      expect(calls.filter((call) => call.key === expected[2].key)).toHaveLength(1);
      // Tras la caída, el resto del tramo 0 sale una sola vez (con la clave de sus 99 restantes).
      if (skipped) expect(calls.filter((call) => call.key === expected[0].key)).toHaveLength(1);
      const statuses = (await deliveriesOf(id)).map((delivery) => delivery.status);
      expect(statuses.filter((status) => status === "sent")).toHaveLength(sent);
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
      // 5 veces el mismo lote con la misma clave; la entrega nunca se intentó sola.
      expect(batchSend).toHaveBeenCalledTimes(5);
      expect(new Set(batchSend.mock.calls.map(([, options]) => (options as { idempotencyKey: string }).idempotencyKey)).size).toBe(1);
      expect(emailSend).not.toHaveBeenCalled();
      expect(await deliveriesOf(id)).toMatchObject([
        { status: "failed", attempts: 0, lastError: "internal_server_error: fallo de prueba" },
      ]);
      expect(await processEventNotification(id)).toBe(false);
    }));

  it("un fallo tras el reclamo (render, BD) cuenta como intento: en el 5.º queda `failed` con `last_error`", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId, { attempts: 4 });
      batchSend.mockResolvedValueOnce({ data: null, error: null, headers: null });

      expect(await processEventNotification(id)).toBe(true);

      expect(await notificationRow(id)).toMatchObject({
        status: "failed",
        attempts: 5,
        lockedAt: null,
        lastError: "TypeError",
      });
      expect(await deliveriesOf(id)).toMatchObject([{ status: "failed" }]);
    }));

  it("un `DrizzleQueryError` tras el reclamo guarda solo nombre y SQLSTATE: ni SQL, ni params, ni correos", () =>
    inRolledBackTransaction(async (tx) => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId);
      // Falla `freezeRecipients`, la primera sentencia `execute` tras el reclamo.
      vi.spyOn(tx, "execute").mockRejectedValueOnce(
        new DrizzleQueryError(
          "INSERT INTO event_notification_deliveries … ana@example.com",
          ["ana@example.com"],
          Object.assign(new Error("duplicate key ana@example.com"), { code: "23505" }),
        ),
      );

      expect(await processEventNotification(id)).toBe(true);

      const row = await notificationRow(id);
      expect(row).toMatchObject({ status: "pending", attempts: 1, lastError: "DrizzleQueryError (23505)" });
      expect(console.error).toHaveBeenCalledWith(expect.any(String), {
        notificationId: id,
        name: "DrizzleQueryError",
        code: "23505",
      });
      expect(JSON.stringify([row, vi.mocked(console.error).mock.calls])).not.toMatch(/INSERT|ana@example\.com/);
      expect(batchSend).not.toHaveBeenCalled();
    }));

  it("una `sending` abandonada tras su 5.º intento queda `failed` con `attempts = 6` al reclamarla, sin enviar", () =>
    inRolledBackTransaction(async () => {
      const { eventId } = await eventWithBuyers(["ana@example.com"]);
      const id = await insertNotification(eventId, {
        status: "sending",
        attempts: 5,
        lockedAt: sql`now() - interval '11 minutes'`,
        lastError: "internal_server_error: fallo de prueba",
      });

      expect(await processEventNotification(id)).toBe(true);

      expect(batchSend).not.toHaveBeenCalled();
      expect(await notificationRow(id)).toMatchObject({
        status: "failed",
        attempts: 6,
        lockedAt: null,
        lastError: "internal_server_error: fallo de prueba",
      });
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
