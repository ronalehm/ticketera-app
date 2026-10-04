import { afterAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const DB_URL = "postgres://user:pass@127.0.0.1:5432/app";
const SERVER_BASE = { DATABASE_URL: DB_URL, CLERK_SECRET_KEY: "sk_test_abc" };
const PUBLIC_BASE = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc",
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/login",
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/registro",
};

// lib/env.ts valida process.env al importarse.
vi.stubEnv("DATABASE_URL", DB_URL);
const { env, publicEnvSchema, serverEnvSchema } = await import("./env");

/** Copia de `input` sin la variable `name`. */
function omit(input: Record<string, string>, name: string) {
  return Object.fromEntries(Object.entries(input).filter(([key]) => key !== name));
}

function errorOf(input: Record<string, string>, schema: z.ZodType = serverEnvSchema) {
  const result = schema.safeParse(input);
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
    expect(errorOf({ ...SERVER_BASE, DATABASE_URL_TEST: "not a url" })).toContain(
      "DATABASE_URL_TEST",
    );
  });

  it("convierte las opcionales vacías en undefined", () => {
    expect(
      serverEnvSchema.parse({
        ...SERVER_BASE,
        DATABASE_URL_UNPOOLED: "",
        DATABASE_URL_MIGRATOR: "",
        DATABASE_URL_TEST: "",
        SUPER_ADMIN_EMAIL: "",
      }),
    ).toEqual({
      ...SERVER_BASE,
      DATABASE_URL_UNPOOLED: undefined,
      DATABASE_URL_MIGRATOR: undefined,
      DATABASE_URL_TEST: undefined,
      SUPER_ADMIN_EMAIL: undefined,
    });
  });

  it("normaliza SUPER_ADMIN_EMAIL a minúsculas", () => {
    const parsed = serverEnvSchema.parse({
      ...SERVER_BASE,
      SUPER_ADMIN_EMAIL: "Ronalehm@Gmail.com",
    });
    expect(parsed.SUPER_ADMIN_EMAIL).toBe("ronalehm@gmail.com");
  });

  it("falla si falta CLERK_SECRET_KEY o no empieza por sk_ y la nombra", () => {
    expect(errorOf(omit(SERVER_BASE, "CLERK_SECRET_KEY"))).toContain("CLERK_SECRET_KEY");
    expect(errorOf({ ...SERVER_BASE, CLERK_SECRET_KEY: "pk_test_abc" })).toContain("CLERK_SECRET_KEY");
  });

  it("falla con un correo inválido", () => {
    expect(errorOf({ ...SERVER_BASE, SUPER_ADMIN_EMAIL: "no-es-correo" })).toContain(
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

describe("publicEnvSchema", () => {
  it("deja la clave undefined si la variable no existe", () => {
    expect(
      publicEnvSchema.parse(PUBLIC_BASE).NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,
    ).toBeUndefined();
  });

  it("trata una cadena vacía como ausente", () => {
    expect(
      publicEnvSchema.parse({ ...PUBLIC_BASE, NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: "" })
        .NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,
    ).toBeUndefined();
  });

  it("trata una cadena con solo espacios como ausente", () => {
    expect(
      publicEnvSchema.parse({ ...PUBLIC_BASE, NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: "   " })
        .NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,
    ).toBeUndefined();
  });

  it("recorta los espacios de una clave con valor", () => {
    expect(
      publicEnvSchema.parse({ ...PUBLIC_BASE, NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: " abc " })
        .NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,
    ).toBe("abc");
  });

  it("acepta las variables de Clerk válidas", () => {
    expect(publicEnvSchema.parse(PUBLIC_BASE)).toEqual({ ...PUBLIC_BASE, NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: undefined });
  });

  it("falla si falta NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY o no empieza por pk_ y la nombra", () => {
    expect(errorOf(omit(PUBLIC_BASE, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"), publicEnvSchema)).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(
      errorOf({ ...PUBLIC_BASE, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "sk_test_abc" }, publicEnvSchema),
    ).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  });

  it.each(["NEXT_PUBLIC_CLERK_SIGN_IN_URL", "NEXT_PUBLIC_CLERK_SIGN_UP_URL"])(
    "falla si %s falta o no empieza por / y la nombra",
    (name) => {
      expect(errorOf(omit(PUBLIC_BASE, name), publicEnvSchema)).toContain(name);
      expect(errorOf({ ...PUBLIC_BASE, [name]: "login" }, publicEnvSchema)).toContain(name);
    },
  );
});
