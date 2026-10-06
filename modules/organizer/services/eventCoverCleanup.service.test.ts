// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { inRolledBackTransaction } from "@/lib/db/testTransaction";
import { deleteOwnCoverBestEffort } from "./eventCoverCleanup.service";
import { setupDraft } from "./eventTestHelpers";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

const mocks = vi.hoisted(() => ({ del: vi.fn(), env: {} as { BLOB_STORE_ID?: string } }));
vi.mock("@vercel/blob", () => ({ del: mocks.del }));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, env: Object.assign(mocks.env, actual.env) };
});

const HOST = "https://abc123.public.blob.vercel-storage.com";
const ownCover = (scope = "draft") => `${HOST}/events/${scope}/${randomUUID()}.webp`;

beforeEach(() => {
  mocks.env.BLOB_STORE_ID = "store_AbC123";
  mocks.del.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("deleteOwnCoverBestEffort: URLs que nunca se borran", () => {
  it.each([
    ["vacía", ""],
    ["externa", "https://images.unsplash.com/photo-1.jpg"],
    ["de otro store de Blob", `https://otrostore.public.blob.vercel-storage.com/events/draft/${randomUUID()}.jpg`],
    ["privada de nuestro store", `https://abc123.private.blob.vercel-storage.com/events/draft/${randomUUID()}.jpg`],
    ["http", `http://abc123.public.blob.vercel-storage.com/events/draft/${randomUUID()}.jpg`],
    ["fuera de events/", `${HOST}/avatars/${randomUUID()}.jpg`],
    ["con pathname que no es de portada", `${HOST}/events/draft/../../secreto.jpg`],
    ["no es una URL", "no-es-una-url"],
  ])("%s", async (_name, url) => {
    await deleteOwnCoverBestEffort(url);
    expect(mocks.del).not.toHaveBeenCalled();
  });

  it("sin BLOB_STORE_ID no hace nada", async () => {
    mocks.env.BLOB_STORE_ID = undefined;
    await deleteOwnCoverBestEffort(ownCover());
    expect(mocks.del).not.toHaveBeenCalled();
  });
});

describeWithDb("deleteOwnCoverBestEffort: portadas propias", () => {
  it("borra una portada propia bajo events/ que ningún evento usa", () =>
    inRolledBackTransaction(async () => {
      const url = ownCover(randomUUID());
      await deleteOwnCoverBestEffort(url);
      expect(mocks.del).toHaveBeenCalledExactlyOnceWith(url);
    }));

  it("no borra una portada que otro evento sigue usando", () =>
    inRolledBackTransaction(async (tx) => {
      const url = ownCover();
      await setupDraft(tx, { imageUrl: url });
      await deleteOwnCoverBestEffort(url);
      expect(mocks.del).not.toHaveBeenCalled();
    }));

  it("si `del` falla, registra el error con contexto y no lanza", () =>
    inRolledBackTransaction(async () => {
      const url = ownCover();
      mocks.del.mockRejectedValue(new Error("blob caído"));
      await expect(deleteOwnCoverBestEffort(url)).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith("deleteOwnCoverBestEffort", { url, error: "blob caído" });
    }));
});
