// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processDueEventNotifications } from "@/modules/notifications/server";
import { GET } from "./route";

const SECRET = "cron-secret-de-prueba-0123456789";
const cronEnv = vi.hoisted(() => ({ CRON_SECRET: undefined as string | undefined }));
vi.mock("@/lib/env", () => ({ env: cronEnv }));
vi.mock("@/modules/notifications/server", () => ({ processDueEventNotifications: vi.fn() }));

const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/event-notifications", {
    headers: authorization ? { authorization } : {},
  });

const info = () => vi.mocked(console.info);

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  cronEnv.CRON_SECRET = undefined;
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("GET /api/cron/event-notifications", () => {
  it.each([
    ["sin CRON_SECRET configurado", undefined, `Bearer ${SECRET}`],
    ["sin cabecera", SECRET, undefined],
    ["con otro secreto", SECRET, "Bearer otro-secreto-0123456789"],
    ["sin el prefijo Bearer", SECRET, SECRET],
  ])("%s → 401 sin procesar nada", async (_label, secret, authorization) => {
    cronEnv.CRON_SECRET = secret;
    const response = await GET(request(authorization));
    expect(response.status).toBe(401);
    expect(processDueEventNotifications).not.toHaveBeenCalled();
    expect(info()).not.toHaveBeenCalled();
  });

  it("con el secreto procesa en lotes de 50 hasta que un lote no se llena", async () => {
    cronEnv.CRON_SECRET = SECRET;
    vi.mocked(processDueEventNotifications).mockResolvedValueOnce(50).mockResolvedValueOnce(7);
    const response = await GET(request(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 57 });
    expect(processDueEventNotifications).toHaveBeenCalledTimes(2);
    expect(processDueEventNotifications).toHaveBeenCalledWith({ limit: 50 });
    expect(info()).toHaveBeenCalledTimes(1);
    expect(info()).toHaveBeenCalledWith("event-notifications cron completed", { processed: 57 });
  });

  it("corta a los 10 lotes aunque sigan llenos (lo demás, en la siguiente ejecución)", async () => {
    cronEnv.CRON_SECRET = SECRET;
    vi.mocked(processDueEventNotifications).mockResolvedValue(50);
    const response = await GET(request(`Bearer ${SECRET}`));
    expect(await response.json()).toEqual({ processed: 500 });
    expect(processDueEventNotifications).toHaveBeenCalledTimes(10);
  });
});
