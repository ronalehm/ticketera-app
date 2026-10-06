import { afterAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const DB_URL = "postgres://user:pass@127.0.0.1:5432/app";
const SERVER_BASE = {
  APP_URL: "http://localhost:3000",
  DATABASE_URL: DB_URL,
  CLERK_SECRET_KEY: "sk_test_abc",
  STRIPE_SECRET_KEY: "sk_test_abc",
  STRIPE_WEBHOOK_SECRET: "whsec_abc",
};
const PUBLIC_BASE = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc",
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/login",
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/registro",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
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
      }),
    ).toEqual({
      ...SERVER_BASE,
      DATABASE_URL_UNPOOLED: undefined,
      DATABASE_URL_MIGRATOR: undefined,
      DATABASE_URL_TEST: undefined,
    });
  });

  it("falla si falta CLERK_SECRET_KEY o no empieza por sk_ y la nombra", () => {
    expect(errorOf(omit(SERVER_BASE, "CLERK_SECRET_KEY"))).toContain("CLERK_SECRET_KEY");
    expect(errorOf({ ...SERVER_BASE, CLERK_SECRET_KEY: "pk_test_abc" })).toContain("CLERK_SECRET_KEY");
  });

  it.each([
    ["STRIPE_SECRET_KEY", "sk_live_abc"],
    ["STRIPE_WEBHOOK_SECRET", "abc"],
  ])("falla si falta %s o tiene el prefijo inválido (%s) y la nombra", (name, invalid) => {
    expect(errorOf(omit(SERVER_BASE, name))).toContain(name);
    expect(errorOf({ ...SERVER_BASE, [name]: invalid })).toContain(name);
  });

  it("acepta las claves de test de Stripe", () => {
    expect(serverEnvSchema.parse(SERVER_BASE)).toMatchObject({
      STRIPE_SECRET_KEY: "sk_test_abc",
      STRIPE_WEBHOOK_SECRET: "whsec_abc",
    });
  });

  it("falla si falta APP_URL y la nombra", () => {
    expect(errorOf(omit(SERVER_BASE, "APP_URL"))).toContain("APP_URL");
    expect(errorOf({ ...SERVER_BASE, APP_URL: "" })).toContain("APP_URL");
  });

  it.each(["localhost:3000", "ftp://ticketera.dev", "javascript:alert(1)", "https://", "https://ticketera.dev?x=1", "https://ticketera.dev/#a"])(
    "rechaza APP_URL que no es una URL http(s) base (%s) y la nombra",
    (invalid) => {
      expect(errorOf({ ...SERVER_BASE, APP_URL: invalid })).toContain("APP_URL");
    },
  );

  it.each([
    ["http://localhost:3000", "http://localhost:3000"],
    ["http://localhost:3000/", "http://localhost:3000"],
    ["https://ticketera-app-x6xq.vercel.app//", "https://ticketera-app-x6xq.vercel.app"],
    ["https://preview.example.dev/base/", "https://preview.example.dev/base"],
  ])("acepta APP_URL %s y la normaliza sin barra final (%s)", (input, expected) => {
    expect(serverEnvSchema.parse({ ...SERVER_BASE, APP_URL: input }).APP_URL).toBe(expected);
  });

  it("no exige ni valida las variables del seed (lib/db/seed/env.ts)", () => {
    const parsed = serverEnvSchema.parse({
      ...SERVER_BASE,
      SUPER_ADMIN_EMAIL: "no-es-correo",
      SEED_ORGANIZER_EMAILS: "tampoco",
    });
    expect(parsed).toEqual(SERVER_BASE);
  });
});

describe("env", () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("se parsea de process.env al importar", () => {
    expect(env.DATABASE_URL).toBe(DB_URL);
    // vitest.config.mts (INERT_KEYS_ENV).
    expect(env.APP_URL).toBe("http://localhost:3000");
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

  it("acepta las variables de Clerk y Stripe válidas", () => {
    expect(publicEnvSchema.parse(PUBLIC_BASE)).toEqual({ ...PUBLIC_BASE, NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: undefined });
  });

  it("falla si falta NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY o no empieza por pk_ y la nombra", () => {
    expect(errorOf(omit(PUBLIC_BASE, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"), publicEnvSchema)).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(
      errorOf({ ...PUBLIC_BASE, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "sk_test_abc" }, publicEnvSchema),
    ).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  });

  it("falla si falta NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY o es pk_live_ y la nombra", () => {
    const name = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY";
    expect(errorOf(omit(PUBLIC_BASE, name), publicEnvSchema)).toContain(name);
    expect(errorOf({ ...PUBLIC_BASE, [name]: "pk_live_abc" }, publicEnvSchema)).toContain(name);
  });

  it.each(["NEXT_PUBLIC_CLERK_SIGN_IN_URL", "NEXT_PUBLIC_CLERK_SIGN_UP_URL"])(
    "falla si %s falta o no empieza por / y la nombra",
    (name) => {
      expect(errorOf(omit(PUBLIC_BASE, name), publicEnvSchema)).toContain(name);
      expect(errorOf({ ...PUBLIC_BASE, [name]: "login" }, publicEnvSchema)).toContain(name);
    },
  );
});
