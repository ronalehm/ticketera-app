// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { expect, it, vi } from "vitest";
import { events } from "@/lib/db/schema/events";
import { describeWithDb } from "@/lib/db/testDb";
import { inRolledBackTransaction, type Tx } from "@/lib/db/testTransaction";
import { setEventFeatured } from "./eventFeatured.service";
import { createUser, domainError, setupDraft } from "./eventTestHelpers";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

async function getFeatured(tx: Tx, id: string) {
  const [event] = await tx.select({ featured: events.featured }).from(events).where(eq(events.id, id));
  return event.featured;
}

describeWithDb("eventFeatured.service", () => {
  it.each(["admin", "super_admin"] as const)("%s destaca y quita destacado; un borrador puede quedar destacado", (role) =>
    inRolledBackTransaction(async (tx) => {
      const { eventId } = await setupDraft(tx);
      const actor = await createUser(tx, undefined, { role });

      expect(await setEventFeatured(actor, eventId, true)).toEqual({ slug: expect.any(String), status: "draft" });
      expect(await getFeatured(tx, eventId)).toBe(true);
      await setEventFeatured(actor, eventId, false);
      expect(await getFeatured(tx, eventId)).toBe(false);
    }),
  );

  it("un organizador (aunque sea el dueño) no puede", () =>
    inRolledBackTransaction(async (tx) => {
      const { owner, eventId } = await setupDraft(tx);
      await expect(setEventFeatured(owner, eventId, true)).rejects.toEqual(domainError("feature_not_allowed"));
      expect(await getFeatured(tx, eventId)).toBe(false);
    }));

  it("un evento que no existe → not_found", () =>
    inRolledBackTransaction(async (tx) => {
      const admin = await createUser(tx, undefined, { role: "admin" });
      await expect(setEventFeatured(admin, randomUUID(), true)).rejects.toEqual(domainError("not_found"));
    }));
});
