import { afterAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const DB_URL = "postgres://user:pass@127.0.0.1:5432/app";

// lib/env.ts valida process.env al importarse.
vi.stubEnv("DATABASE_URL", DB_URL);
const { env, serverEnvSchema } = await import("./env");

function errorOf(input: Record<string, string>) {
  const result = serverEnvSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.success ? "" : z.prettifyError(result.error);
}

describe("serverEnvSchema", () => {
  it("falla si falta DATABASE_URL y la nombra", () => {
    expect(errorOf({})).toContain("DATABASE_URL");
  });

  it("trata DATABASE_URL vacía como inválida y la nombra", () => {
    expect(errorOf({ DATABASE_URL: "" })).toContain("DATABASE_URL");
  });

  it("falla con una URL inválida", () => {
    expect(errorOf({ DATABASE_URL: "not a url" })).toContain("DATABASE_URL");
    expect(errorOf({ DATABASE_URL: DB_URL, DATABASE_URL_TEST: "not a url" })).toContain(
      "DATABASE_URL_TEST",
    );
  });

  it("convierte las opcionales vacías en undefined", () => {
    expect(
      serverEnvSchema.parse({
        DATABASE_URL: DB_URL,
        DATABASE_URL_UNPOOLED: "",
        DATABASE_URL_MIGRATOR: "",
        DATABASE_URL_TEST: "",
        SUPER_ADMIN_EMAIL: "",
      }),
    ).toEqual({
      DATABASE_URL: DB_URL,
      DATABASE_URL_UNPOOLED: undefined,
      DATABASE_URL_MIGRATOR: undefined,
      DATABASE_URL_TEST: undefined,
      SUPER_ADMIN_EMAIL: undefined,
    });
  });

  it("normaliza SUPER_ADMIN_EMAIL a minúsculas", () => {
    const parsed = serverEnvSchema.parse({
      DATABASE_URL: DB_URL,
      SUPER_ADMIN_EMAIL: "Ronalehm@Gmail.com",
    });
    expect(parsed.SUPER_ADMIN_EMAIL).toBe("ronalehm@gmail.com");
  });

  it("falla con un correo inválido", () => {
    expect(errorOf({ DATABASE_URL: DB_URL, SUPER_ADMIN_EMAIL: "no-es-correo" })).toContain(
      "SUPER_ADMIN_EMAIL",
    );
  });
});

describe("env", () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("se parsea de process.env al importar", () => {
    expect(env.DATABASE_URL).toBe(DB_URL);
  });

  it("lanza un Error que nombra la variable inválida", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "");
    await expect(import("./env")).rejects.toThrow(/DATABASE_URL/);
  });
});
