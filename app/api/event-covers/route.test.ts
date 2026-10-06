// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COVER_UPLOAD_ERRORS,
  CoverUploadError,
} from "@/modules/organizer/services/eventCoverUpload.service";

const mocks = vi.hoisted(() => ({
  env: { BLOB_STORE_ID: "store_123" as string | undefined, BLOB_WEBHOOK_PUBLIC_KEY: "pem" as string | undefined },
  getSessionUser: vi.fn(),
  getCoverSignedToken: vi.fn(),
  handleUploadPresigned: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("@/modules/auth/server", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/modules/organizer/server", async () => ({
  ...(await vi.importActual<object>("@/modules/organizer/services/eventCoverUpload.service")),
  getCoverSignedToken: mocks.getCoverSignedToken,
}));
vi.mock("@vercel/blob/client", () => ({ handleUploadPresigned: mocks.handleUploadPresigned }));

const { POST } = await import("./route");

const USER = { id: "user-1", role: "organizer" };
const PATHNAME = "events/draft/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d.png";
const BODY = {
  type: "blob.generate-presigned-url",
  payload: { pathname: PATHNAME, clientPayload: '{"eventId":null}', multipart: false },
};
const PRESIGNED = { delegationToken: "d", signature: "s", params: { a: "b" } };

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/event-covers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.BLOB_STORE_ID = "store_123";
  mocks.env.BLOB_WEBHOOK_PUBLIC_KEY = "pem";
  mocks.getSessionUser.mockResolvedValue(USER);
  // Como el SDK: pide el token con el pathname y el clientPayload del cuerpo y devuelve la URL prefirmada.
  mocks.handleUploadPresigned.mockImplementation(
    async ({ body, getSignedToken }: { body: typeof BODY; getSignedToken: (p: string, c: string | null) => unknown }) => {
      await getSignedToken(body.payload.pathname, body.payload.clientPayload);
      return { type: body.type, presignedUrlPayload: PRESIGNED };
    },
  );
  mocks.getCoverSignedToken.mockResolvedValue({ token: {}, urlOptions: {} });
});

describe("POST /api/event-covers", () => {
  it("devuelve la URL prefirmada y pide el token con el usuario, el pathname y el clientPayload", async () => {
    const response = await post(BODY);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ type: "blob.generate-presigned-url", presignedUrlPayload: PRESIGNED });
    expect(mocks.getCoverSignedToken).toHaveBeenCalledWith(USER, PATHNAME, '{"eventId":null}');
    expect(mocks.handleUploadPresigned).toHaveBeenCalledWith(expect.objectContaining({ webhookPublicKey: "pem" }));
  });

  it.each([
    [401, COVER_UPLOAD_ERRORS.unauthenticated],
    [403, COVER_UPLOAD_ERRORS.forbidden],
    [403, COVER_UPLOAD_ERRORS.event],
    [400, COVER_UPLOAD_ERRORS.invalid],
  ] as const)("traduce un rechazo del servicio a %i con { error }", async (status, message) => {
    mocks.getCoverSignedToken.mockRejectedValue(new CoverUploadError(status, message));

    const response = await post(BODY);

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: message });
  });

  it.each(["BLOB_STORE_ID", "BLOB_WEBHOOK_PUBLIC_KEY"] as const)("sin %s responde 503 sin llamar a Blob", async (name) => {
    mocks.env[name] = undefined;

    const response = await post(BODY);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: COVER_UPLOAD_ERRORS.notConfigured });
    expect(mocks.handleUploadPresigned).not.toHaveBeenCalled();
  });

  it.each([
    ["un cuerpo que no es JSON", "no-json"],
    ["el callback de subida completada", { type: "blob.upload-completed", payload: { blob: {} } }],
    ["un payload sin pathname", { type: "blob.generate-presigned-url", payload: { clientPayload: null, multipart: false } }],
  ])("rechaza %s con 400", async (_, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: COVER_UPLOAD_ERRORS.invalid });
    expect(mocks.handleUploadPresigned).not.toHaveBeenCalled();
  });

  it("un fallo inesperado de Blob responde 500 genérico y se registra", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getCoverSignedToken.mockRejectedValue(new Error("OIDC caducado"));

    const response = await post(BODY);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: COVER_UPLOAD_ERRORS.invalid });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
