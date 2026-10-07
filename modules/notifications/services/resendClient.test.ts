// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const { Resend } = vi.hoisted(() => ({ Resend: vi.fn() }));
vi.mock("resend", () => ({ Resend }));

// Clave ficticia: el SDK está mockeado y nunca se llama a Resend.
const FAKE_KEY = "re_test_fake_key_for_unit_tests";
const FROM = "Mentec Tickets <notificaciones@ticketera.mentec.dev>";

/** Importa el módulo de nuevo con estas variables (lib/env.ts y el cliente se evalúan al importarse). */
async function load(vars: Record<string, string>) {
  vi.resetModules();
  for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value);
  return import("./resendClient");
}

describe("resendClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    Resend.mockClear();
  });

  it("sin RESEND_API_KEY no crea cliente (el envío se omite)", async () => {
    const { emailSender } = await load({ RESEND_API_KEY: "", EMAIL_FROM: FROM });
    expect(emailSender).toBeNull();
    expect(Resend).not.toHaveBeenCalled();
  });

  it("sin EMAIL_FROM no crea cliente", async () => {
    const { emailSender } = await load({ RESEND_API_KEY: FAKE_KEY, EMAIL_FROM: "", EMAIL_ALLOWED_RECIPIENTS: "a@example.com" });
    expect(emailSender).toBeNull();
  });

  it("con clave y remitente crea el cliente con esa clave", async () => {
    const { emailSender } = await load({
      RESEND_API_KEY: FAKE_KEY,
      EMAIL_FROM: FROM,
      EMAIL_ALLOWED_RECIPIENTS: "a@example.com",
    });
    expect(Resend).toHaveBeenCalledWith(FAKE_KEY);
    expect(emailSender?.from).toBe(FROM);
  });

  it.each(["preview", "development", ""])("fuerza allowlist con EMAIL_DELIVERY_MODE=live fuera de Production (VERCEL_ENV=%s)", async (vercelEnv) => {
    const { emailDeliveryMode, isAllowedRecipient } = await load({
      RESEND_API_KEY: FAKE_KEY,
      EMAIL_FROM: FROM,
      EMAIL_DELIVERY_MODE: "live",
      VERCEL_ENV: vercelEnv,
      EMAIL_ALLOWED_RECIPIENTS: " Ana@Example.com , qa@example.com",
    });
    expect(emailDeliveryMode).toBe("allowlist");
    expect(isAllowedRecipient("ana@example.com")).toBe(true);
    expect(isAllowedRecipient(" ANA@example.com ")).toBe(true);
    expect(isAllowedRecipient("otro@example.com")).toBe(false);
  });

  it("en allowlist sin lista no permite a nadie", async () => {
    const { isAllowedRecipient } = await load({ RESEND_API_KEY: "", EMAIL_ALLOWED_RECIPIENTS: "" });
    expect(isAllowedRecipient("ana@example.com")).toBe(false);
  });

  it("en Production con EMAIL_DELIVERY_MODE=live envía a todos", async () => {
    const { emailDeliveryMode, isAllowedRecipient } = await load({
      RESEND_API_KEY: FAKE_KEY,
      EMAIL_FROM: FROM,
      EMAIL_DELIVERY_MODE: "live",
      VERCEL_ENV: "production",
    });
    expect(emailDeliveryMode).toBe("live");
    expect(isAllowedRecipient("cualquiera@example.com")).toBe(true);
  });
});
