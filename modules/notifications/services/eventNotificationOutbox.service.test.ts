// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { events } from "@/lib/db/schema/events";
import { users } from "@/lib/db/schema/identity";
import { eventNotifications } from "@/lib/db/schema/notifications";
import { orders } from "@/lib/db/schema/sales";
import { describeWithDb } from "@/lib/db/testDb";
import { createTestEvent, sellTestSeats } from "@/lib/db/testFixtures";
import { db, inRolledBackTransaction, type Tx } from "@/lib/db/testTransaction";
import { enqueueEventNotification } from "./eventNotificationOutbox.service";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte): los fixtures
// (`createTestEvent`, `sellTestSeats`) escriben en ella.
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

const TITLE_CHANGE = { field: "title", before: "Antes", after: "Después" };

/** Evento publicado con una venta `paid` (un comprador). */
async function eventWithBuyer() {
  const { eventId, slug } = await createTestEvent({ general: 3, status: "published" });
  await sellTestSeats(slug, { count: 1 });
  return eventId;
}

async function notificationsOf(database: Pick<Tx, "select">, eventId: string) {
  return database
    .select({
      id: eventNotifications.id,
      kind: eventNotifications.kind,
      status: eventNotifications.status,
      changes: eventNotifications.changes,
      createdBy: eventNotifications.createdBy,
      // Segundos entre `send_after` y la creación (ambos `now()` de la misma transacción).
      delaySeconds: sql<number>`extract(epoch from ${eventNotifications.sendAfter} - ${eventNotifications.createdAt})`.mapWith(
        Number,
      ),
    })
    .from(eventNotifications)
    .where(eq(eventNotifications.eventId, eventId))
    .orderBy(eventNotifications.createdAt);
}

describeWithDb("enqueueEventNotification", () => {
  it.each(["schedule", "cancelled"] as const)("encola `%s` para enviar ya, con su autor", (kind) =>
    inRolledBackTransaction(async (tx) => {
      const eventId = await eventWithBuyer();
      const [actor] = await tx.select({ id: users.id }).from(users).limit(1);
      const id = await enqueueEventNotification(tx, { eventId, kind, changes: [TITLE_CHANGE], actorId: actor.id });
      expect(await notificationsOf(tx, eventId)).toEqual([
        { id, kind, status: "pending", changes: [TITLE_CHANGE], createdBy: actor.id, delaySeconds: 0 },
      ]);
    }),
  );

  it("encola `update` para dentro de 10 minutos y fusiona los siguientes (primer before, último after)", () =>
    inRolledBackTransaction(async (tx) => {
      const eventId = await eventWithBuyer();
      const first = await enqueueEventNotification(tx, {
        eventId,
        kind: "update",
        changes: [
          { field: "title", before: "A", after: "B" },
          { field: "description", before: null, after: "Nueva" },
        ],
        actorId: null,
      });
      const second = await enqueueEventNotification(tx, {
        eventId,
        kind: "update",
        changes: [
          { field: "description", before: "Nueva", after: "Otra" },
          { field: "title", before: "B", after: "C" },
          { field: "minAge", before: 0, after: 18 },
        ],
        actorId: null,
      });
      expect(second).toBe(first);
      expect(await notificationsOf(tx, eventId)).toEqual([
        {
          id: first,
          kind: "update",
          status: "pending",
          changes: [
            { field: "title", before: "A", after: "C" },
            { field: "description", before: null, after: "Otra" },
            { field: "minAge", before: 0, after: 18 },
          ],
          createdBy: null,
          delaySeconds: 600,
        },
      ]);
    }));

  it("no fusiona en una `update` ya reclamada (`sending`): crea otra", () =>
    inRolledBackTransaction(async (tx) => {
      const eventId = await eventWithBuyer();
      const first = await enqueueEventNotification(tx, { eventId, kind: "update", changes: [TITLE_CHANGE], actorId: null });
      await tx.update(eventNotifications).set({ status: "sending" }).where(eq(eventNotifications.id, first!));
      const second = await enqueueEventNotification(tx, { eventId, kind: "update", changes: [TITLE_CHANGE], actorId: null });
      expect(second).not.toBe(first);
      const statuses = Object.fromEntries((await notificationsOf(tx, eventId)).map(({ id, status }) => [id, status]));
      expect(statuses).toEqual({ [first!]: "sending", [second!]: "pending" });
    }));

  it("no fusiona en una `update` `pending` en reintento (`attempts > 0`): crea otra y la vieja no cambia", () =>
    inRolledBackTransaction(async (tx) => {
      const eventId = await eventWithBuyer();
      const retrying = await enqueueEventNotification(tx, { eventId, kind: "update", changes: [TITLE_CHANGE], actorId: null });
      await tx.update(eventNotifications).set({ attempts: 1 }).where(eq(eventNotifications.id, retrying!));
      const minAge = { field: "minAge", before: 0, after: 18 };

      const created = await enqueueEventNotification(tx, { eventId, kind: "update", changes: [minAge], actorId: null });

      expect(created).not.toBe(retrying);
      const rows = await tx
        .select({
          id: eventNotifications.id,
          status: eventNotifications.status,
          attempts: eventNotifications.attempts,
          changes: eventNotifications.changes,
          delaySeconds: sql<number>`extract(epoch from ${eventNotifications.sendAfter} - now())`.mapWith(Number),
        })
        .from(eventNotifications)
        .where(eq(eventNotifications.eventId, eventId));
      // Misma transacción: `created_at` coincide, así que se comparan por id y no por orden.
      expect(Object.fromEntries(rows.map(({ id, ...row }) => [id, row]))).toEqual({
        [retrying!]: { status: "pending", attempts: 1, changes: [TITLE_CHANGE], delaySeconds: 600 },
        [created!]: { status: "pending", attempts: 0, changes: [minAge], delaySeconds: 600 },
      });
    }));

  describe("índice `event_notifications_one_pending_update_idx`", () => {
    const update = (eventId: string) => ({ eventId, kind: "update" as const, changes: [TITLE_CHANGE], sendAfter: new Date() });

    it("impide dos `update` fusionables (`pending`, `attempts = 0`) del mismo evento", () =>
      inRolledBackTransaction(async (tx) => {
        const eventId = await eventWithBuyer();
        await tx.insert(eventNotifications).values(update(eventId));
        await expect(
          db.transaction((savepoint) => savepoint.insert(eventNotifications).values(update(eventId))),
        ).rejects.toMatchObject({ cause: { code: "23505", constraint: "event_notifications_one_pending_update_idx" } });
        // Sí admite otra pendiente de otro tipo.
        await tx.insert(eventNotifications).values({ ...update(eventId), kind: "schedule" });
      }));

    it.each([
      ["`pending` con `attempts = 1`", { attempts: 1 }],
      ["`sending`", { status: "sending" as const }],
    ])("admite una `update` fusionable junto a otra %s del mismo evento", (_, other) =>
      inRolledBackTransaction(async (tx) => {
        const eventId = await eventWithBuyer();
        await tx.insert(eventNotifications).values({ ...update(eventId), ...other });
        await tx.insert(eventNotifications).values(update(eventId));
        expect(await notificationsOf(tx, eventId)).toHaveLength(2);
      }));
  });

  it("no encola nada sin cambios", () =>
    inRolledBackTransaction(async (tx) => {
      const eventId = await eventWithBuyer();
      expect(await enqueueEventNotification(tx, { eventId, kind: "schedule", changes: [], actorId: null })).toBeNull();
      expect(await notificationsOf(tx, eventId)).toEqual([]);
    }));

  it("no encola nada sin compradores `paid`/`partially_refunded` (una reserva `pending` no cuenta)", () =>
    inRolledBackTransaction(async (tx) => {
      const { eventId } = await createTestEvent({ general: 3, status: "published" });
      for (const kind of ["schedule", "cancelled", "update"] as const) {
        expect(await enqueueEventNotification(tx, { eventId, kind, changes: [TITLE_CHANGE], actorId: null })).toBeNull();
      }
      await tx.insert(orders).values({
        code: `TK-TEST-${randomUUID().slice(0, 8)}`,
        eventId,
        status: "pending",
        expiresAt: new Date(Date.now() + 60_000),
        ticketCount: 1,
        subtotalCents: 0,
        platformFeeCents: 0,
        organizerAmountCents: 0,
      });
      expect(await enqueueEventNotification(tx, { eventId, kind: "schedule", changes: [TITLE_CHANGE], actorId: null })).toBeNull();
      expect(await notificationsOf(tx, eventId)).toEqual([]);
    }));

  it("cuenta como comprador una orden `partially_refunded`", () =>
    inRolledBackTransaction(async (tx) => {
      const { eventId, slug } = await createTestEvent({ general: 3, status: "published" });
      const { orderId } = await sellTestSeats(slug, { count: 1 });
      await tx.update(orders).set({ status: "partially_refunded" }).where(eq(orders.id, orderId));
      expect(await enqueueEventNotification(tx, { eventId, kind: "schedule", changes: [TITLE_CHANGE], actorId: null })).not.toBeNull();
    }));

  it("si la transacción del cambio falla después de encolar, no queda ni el cambio ni la notificación", () =>
    inRolledBackTransaction(async (tx) => {
      const eventId = await eventWithBuyer();
      const [{ title }] = await tx.select({ title: events.title }).from(events).where(eq(events.id, eventId));
      await expect(
        db.transaction(async (change) => {
          await change.update(events).set({ title: "Nuevo título" }).where(eq(events.id, eventId));
          await enqueueEventNotification(change, { eventId, kind: "update", changes: [TITLE_CHANGE], actorId: null });
          throw new Error("falla al guardar");
        }),
      ).rejects.toThrow("falla al guardar");
      expect(await notificationsOf(tx, eventId)).toEqual([]);
      expect((await tx.select({ title: events.title }).from(events).where(eq(events.id, eventId)))[0].title).toBe(title);
    }));

  it("si falla encolar, el cambio del evento no se guarda", () =>
    inRolledBackTransaction(async (tx) => {
      const eventId = await eventWithBuyer();
      const [{ title }] = await tx.select({ title: events.title }).from(events).where(eq(events.id, eventId));
      await expect(
        db.transaction(async (change) => {
          await change.update(events).set({ title: "Nuevo título" }).where(eq(events.id, eventId));
          // `created_by` inexistente: viola la FK a `users`.
          await enqueueEventNotification(change, { eventId, kind: "schedule", changes: [TITLE_CHANGE], actorId: randomUUID() });
        }),
      ).rejects.toMatchObject({ cause: { code: "23503" } });
      expect(await notificationsOf(tx, eventId)).toEqual([]);
      expect((await tx.select({ title: events.title }).from(events).where(eq(events.id, eventId)))[0].title).toBe(title);
    }));
});
