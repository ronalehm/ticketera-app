// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { organizers, users } from "@/lib/db/schema/identity";
import { describeWithDb } from "@/lib/db/testDb";
import { inRolledBackTransaction, type Tx } from "@/lib/db/testTransaction";
import type { OrganizerStatus } from "../types/auth.types";
import { getOrganizerStatus, OrganizerNotApprovedError, requireApprovedOrganizer } from "./organizers.service";

/** Usuario nuevo y, si se pasa `status`, su fila de `organizers` (con datos fiscales solo si es `approved`). */
async function createUser(tx: Tx, status?: OrganizerStatus): Promise<string> {
  const suffix = randomUUID();
  const [{ id }] = await tx
    .insert(users)
    .values({ email: `organizer.${suffix}@example.com`, firstName: "Prueba", lastName: "Organizador", role: "organizer" })
    .returning({ id: users.id });
  if (status) {
    const fiscal = status === "approved" ? { legalName: "Prueba SAC", taxIdType: "ruc" as const, taxId: suffix } : {};
    await tx.insert(organizers).values({ userId: id, status, commissionBps: 1000, ...fiscal });
  }
  return id;
}

describeWithDb("organizers.service (Postgres)", () => {
  describe("getOrganizerStatus", () => {
    it.each(["approved", "pending", "suspended"] as const)("devuelve %s", async (status) => {
      expect(await inRolledBackTransaction(async (tx) => getOrganizerStatus(await createUser(tx, status), tx))).toBe(
        status,
      );
    });

    it("devuelve null sin fila de organizador", async () => {
      expect(await inRolledBackTransaction(async (tx) => getOrganizerStatus(await createUser(tx), tx))).toBeNull();
    });
  });

  describe("requireApprovedOrganizer", () => {
    it("no lanza para un organizador approved", async () => {
      await expect(
        inRolledBackTransaction(async (tx) => requireApprovedOrganizer(await createUser(tx, "approved"), tx)),
      ).resolves.toBeUndefined();
    });

    it.each([
      ["pending", "pending"],
      ["suspended", "suspended"],
      ["sin fila de organizador", undefined],
    ] as const)("lanza OrganizerNotApprovedError (%s)", async (_case, status) => {
      const error = await inRolledBackTransaction(async (tx) =>
        requireApprovedOrganizer(await createUser(tx, status), tx).catch((caught: unknown) => caught),
      );
      expect(error).toBeInstanceOf(OrganizerNotApprovedError);
      expect(error).toMatchObject({ status: status ?? null });
    });
  });
});
