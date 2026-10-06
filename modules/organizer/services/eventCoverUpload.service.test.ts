// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { events } from "@/lib/db/schema/events";
import { describeWithDb } from "@/lib/db/testDb";
import { inRolledBackTransaction, type Tx } from "@/lib/db/testTransaction";
import { buildCoverPathname, COVER_MAX_BYTES, type CoverMime } from "../utils/coverPathname";
import { COVER_UPLOAD_ERRORS, getCoverSignedToken } from "./eventCoverUpload.service";
import { type Actor, createUser, setupDraft } from "./eventTestHelpers";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

const { issueSignedToken } = vi.hoisted(() => ({ issueSignedToken: vi.fn() }));
vi.mock("@vercel/blob", () => ({ issueSignedToken }));

const TOKEN = { delegationToken: "d", clientSigningToken: "c", validUntil: 1 };

/** Usuario de la sesión a partir de un actor de prueba. */
const session = (actor: Actor) => ({ ...actor, mfaVerified: true });
const payload = (eventId: string | null) => JSON.stringify({ eventId });
const rejection = (status: number, message: string) => expect.objectContaining({ name: "CoverUploadError", status, message });

async function setStatus(tx: Tx, eventId: string, status: "pending_review" | "published" | "cancelled" | "finished") {
  await tx.update(events).set({ status }).where(eq(events.id, eventId));
}

beforeEach(() => {
  issueSignedToken.mockReset().mockResolvedValue(TOKEN);
});

describeWithDb("eventCoverUpload.service", () => {
  describe("getCoverSignedToken: token emitido", () => {
    it.each<CoverMime>(["image/jpeg", "image/png", "image/webp"])(
      "%s: solo put, ese pathname, ese MIME, 5 MB y 10 minutos; sin sufijo ni sobrescritura",
      (mime) =>
        inRolledBackTransaction(async (tx) => {
          const { owner, eventId } = await setupDraft(tx);
          const pathname = buildCoverPathname(eventId, mime);
          const before = Date.now();

          const result = await getCoverSignedToken(session(owner), pathname, payload(eventId));

          expect(result).toEqual({ token: TOKEN, urlOptions: { addRandomSuffix: false, allowOverwrite: false } });
          expect(issueSignedToken).toHaveBeenCalledWith({
            pathname,
            operations: ["put"],
            allowedContentTypes: [mime],
            maximumSizeInBytes: COVER_MAX_BYTES,
            validUntil: expect.any(Number),
          });
          expect(COVER_MAX_BYTES).toBe(5 * 1024 * 1024);
          const { validUntil } = issueSignedToken.mock.calls[0][0] as { validUntil: number };
          expect(validUntil - before).toBeGreaterThanOrEqual(10 * 60 * 1000);
          expect(validUntil - Date.now()).toBeLessThanOrEqual(10 * 60 * 1000);
        }),
    );

    it("un organizador aprobado sube a `draft` sin evento (Crear)", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        await getCoverSignedToken(session(owner), buildCoverPathname("draft", "image/png"), payload(null));
        expect(issueSignedToken).toHaveBeenCalledOnce();
      }));

    it("el dueño puede en un evento publicado", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx);
        await setStatus(tx, eventId, "published");
        await getCoverSignedToken(session(owner), buildCoverPathname(eventId, "image/jpeg"), payload(eventId));
        expect(issueSignedToken).toHaveBeenCalledOnce();
      }));

    it.each(["admin", "super_admin"] as const)("un %s puede para el evento de cualquier organizador", (role) =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupDraft(tx);
        const admin = session({ id: randomUUID(), role });
        await getCoverSignedToken(admin, buildCoverPathname(eventId, "image/webp"), payload(eventId));
        expect(issueSignedToken).toHaveBeenCalledOnce();
      }));
  });

  describe("getCoverSignedToken: rechazos (sin emitir token)", () => {
    it("sin sesión → 401", async () => {
      await expect(
        getCoverSignedToken(null, buildCoverPathname("draft", "image/png"), payload(null)),
      ).rejects.toEqual(rejection(401, COVER_UPLOAD_ERRORS.unauthenticated));
      expect(issueSignedToken).not.toHaveBeenCalled();
    });

    it.each([
      ["un customer", undefined],
      ["un organizador pendiente", "pending"],
      ["un organizador suspendido", "suspended"],
    ] as const)("%s → 403", (_, status) =>
      inRolledBackTransaction(async (tx) => {
        const user = await createUser(tx, status);
        await expect(
          getCoverSignedToken(session(user), buildCoverPathname("draft", "image/png"), payload(null)),
        ).rejects.toEqual(rejection(403, COVER_UPLOAD_ERRORS.forbidden));
        expect(issueSignedToken).not.toHaveBeenCalled();
      }));

    it("un organizador con el rol pero sin fila de organizador → 403", () =>
      inRolledBackTransaction(async (tx) => {
        const user = await createUser(tx, undefined, { role: "organizer" });
        await expect(
          getCoverSignedToken(session(user), buildCoverPathname("draft", "image/png"), payload(null)),
        ).rejects.toEqual(rejection(403, COVER_UPLOAD_ERRORS.forbidden));
      }));

    it("el evento de otro organizador → 403", () =>
      inRolledBackTransaction(async (tx) => {
        const { eventId } = await setupDraft(tx);
        const other = await createUser(tx, "approved");
        await expect(
          getCoverSignedToken(session(other), buildCoverPathname(eventId, "image/png"), payload(eventId)),
        ).rejects.toEqual(rejection(403, COVER_UPLOAD_ERRORS.event));
        expect(issueSignedToken).not.toHaveBeenCalled();
      }));

    it("un evento inexistente → 403 (también para un admin)", () =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        const eventId = randomUUID();
        for (const user of [owner, { id: randomUUID(), role: "admin" } as const]) {
          await expect(
            getCoverSignedToken(session(user), buildCoverPathname(eventId, "image/png"), payload(eventId)),
          ).rejects.toEqual(rejection(403, COVER_UPLOAD_ERRORS.event));
        }
      }));

    it.each(["pending_review", "cancelled", "finished"] as const)("un evento en estado %s → 403", (status) =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx);
        await setStatus(tx, eventId, status);
        await expect(
          getCoverSignedToken(session(owner), buildCoverPathname(eventId, "image/png"), payload(eventId)),
        ).rejects.toEqual(rejection(403, COVER_UPLOAD_ERRORS.event));
        expect(issueSignedToken).not.toHaveBeenCalled();
      }));

    it.each([
      ["un pathname fuera del patrón", () => "events/draft/../otro.png", () => payload(null)],
      ["un clientPayload que no es JSON", () => buildCoverPathname("draft", "image/png"), () => "no-json"],
      ["un clientPayload sin eventId", () => buildCoverPathname("draft", "image/png"), () => "{}"],
      ["un clientPayload nulo", () => buildCoverPathname("draft", "image/png"), () => null],
      ["un eventId que no es uuid", () => buildCoverPathname("draft", "image/png"), () => payload("123")],
      ["draft con eventId", () => buildCoverPathname("draft", "image/png"), () => payload(randomUUID())],
    ])("%s → 400", (_, pathname, clientPayload) =>
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx, "approved");
        await expect(getCoverSignedToken(session(owner), pathname(), clientPayload())).rejects.toEqual(
          rejection(400, COVER_UPLOAD_ERRORS.invalid),
        );
        expect(issueSignedToken).not.toHaveBeenCalled();
      }));

    it("un clientPayload de otro evento que el del pathname → 400", () =>
      inRolledBackTransaction(async (tx) => {
        const { owner, eventId } = await setupDraft(tx);
        const { eventId: otherEventId } = await setupDraft(tx);
        await expect(
          getCoverSignedToken(session(owner), buildCoverPathname(eventId, "image/png"), payload(otherEventId)),
        ).rejects.toEqual(rejection(400, COVER_UPLOAD_ERRORS.invalid));
        await expect(
          getCoverSignedToken(session(owner), buildCoverPathname("draft", "image/png"), payload(eventId)),
        ).rejects.toEqual(rejection(400, COVER_UPLOAD_ERRORS.invalid));
      }));
  });
});
