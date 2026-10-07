// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processDueEventNotifications, processEventNotification } from "@/modules/notifications/server";
import { processEventNotificationsAfterResponse } from "./processEventNotificationsAfterResponse";

// `after` guarda las tareas para ejecutarlas a mano "después de responder".
const scheduled = vi.hoisted(() => [] as (() => Promise<void>)[]);
vi.mock("next/server", () => ({ after: vi.fn((task: () => Promise<void>) => scheduled.push(task)) }));
vi.mock("@/modules/notifications/server", () => ({
  processEventNotification: vi.fn(),
  processDueEventNotifications: vi.fn(),
}));

const ID = "a0000000-0000-4000-8000-000000000001";
const runAfterTasks = () => Promise.all(scheduled.splice(0).map((task) => task()));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  scheduled.length = 0;
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("processEventNotificationsAfterResponse", () => {
  it.each(["schedule", "cancelled"] as const)("`%s`: la envía ya y drena hasta 5 vencidas, después de responder", async (kind) => {
    processEventNotificationsAfterResponse({ id: ID, kind });
    expect(processEventNotification).not.toHaveBeenCalled();
    await runAfterTasks();
    expect(processEventNotification).toHaveBeenCalledWith(ID);
    expect(processDueEventNotifications).toHaveBeenCalledWith({ limit: 5 });
  });

  it("`update`: no la envía (espera su agrupación) pero drena igual", async () => {
    processEventNotificationsAfterResponse({ id: ID, kind: "update" });
    await runAfterTasks();
    expect(processEventNotification).not.toHaveBeenCalled();
    expect(processDueEventNotifications).toHaveBeenCalledWith({ limit: 5 });
  });

  it("sin notificación no programa nada", () => {
    processEventNotificationsAfterResponse(null);
    expect(scheduled).toHaveLength(0);
  });

  it("un fallo se registra sin datos sensibles y no rompe; el drenado corre igual", async () => {
    vi.mocked(processEventNotification).mockRejectedValue(new Error("fallo con cliente@example.com"));
    vi.mocked(processDueEventNotifications).mockRejectedValue(new TypeError("otro fallo"));
    processEventNotificationsAfterResponse({ id: ID, kind: "schedule" });
    await expect(runAfterTasks()).resolves.toBeDefined();
    expect(processDueEventNotifications).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.any(String), { notificationId: ID, name: "Error" });
    expect(console.error).toHaveBeenCalledWith(expect.any(String), { notificationId: undefined, name: "TypeError" });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("example.com");
  });
});
