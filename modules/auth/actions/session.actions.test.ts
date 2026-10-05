// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { syncClerkRole } from "../services/session.service";
import { syncSessionRoleAction } from "./session.actions";

vi.mock("../services/session.service", () => ({ syncClerkRole: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("syncSessionRoleAction", () => {
  it("no recibe parámetros", () => {
    expect(syncSessionRoleAction).toHaveLength(0);
  });

  it.each([true, false])("devuelve el resultado de syncClerkRole (changed %s)", async (changed) => {
    vi.mocked(syncClerkRole).mockResolvedValue({ changed });
    expect(await syncSessionRoleAction()).toEqual({ changed });
    expect(syncClerkRole).toHaveBeenCalledTimes(1);
  });

  it("ante un error lo registra (solo el nombre, nunca el mensaje) y devuelve changed false", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(syncClerkRole).mockRejectedValue(new Error("Clerk caído: ana@example.com"));

    expect(await syncSessionRoleAction()).toEqual({ changed: false });
    expect(consoleError).toHaveBeenCalledWith("syncSessionRoleAction", { name: "Error" });
  });
});
