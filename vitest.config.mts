import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { configDefaults, defineConfig } from "vitest/config";

// Lee `.env` sin mutar process.env. Los tests de integración usan la rama `test` como DATABASE_URL.
const fileEnv = loadEnv("test", process.cwd(), "");
const testDatabaseUrl = fileEnv.DATABASE_URL_TEST || undefined;

if (testDatabaseUrl && [fileEnv.DATABASE_URL, fileEnv.DATABASE_URL_UNPOOLED].includes(testDatabaseUrl)) {
  throw new Error(
    "DATABASE_URL_TEST no puede ser la base de datos de desarrollo (DATABASE_URL / DATABASE_URL_UNPOOLED): los tests de integración la truncan.",
  );
}

// Sin BD de test: URL inerte para que importar los services no falle al validar el entorno; esos tests se saltan.
const INERT_DATABASE_URL = "postgres://unused@127.0.0.1:1/unused";

// Valores inertes de Clerk y Stripe: importar lib/env en los tests no necesita claves reales.
const INERT_KEYS_ENV = {
  CLERK_SECRET_KEY: "sk_test_unused",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_unused",
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/login",
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/registro",
  STRIPE_SECRET_KEY: "sk_test_unused",
  STRIPE_WEBHOOK_SECRET: "whsec_test_unused",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_unused",
};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    // ponytail: timeout global holgado porque los tests de integración van contra Neon remoto y algunos esperan
    // bloqueos de fila mientras `lib/db/seed/seed.test.ts` reescribe filas del seed (18–35 s). Arreglo de fondo:
    // que los tests de "retirados" de `events.service.test.ts` y `seating.service.test.ts` usen un evento propio.
    testTimeout: 60_000,
    // Los worktrees de agentes (`.claude/worktrees/`) son copias del repo: no se ejecutan sus tests.
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
    env: testDatabaseUrl
      ? { ...INERT_KEYS_ENV, DATABASE_URL: testDatabaseUrl, DATABASE_URL_TEST: testDatabaseUrl }
      : { ...INERT_KEYS_ENV, DATABASE_URL: INERT_DATABASE_URL },
    globalSetup: testDatabaseUrl ? ["./lib/db/testGlobalSetup.ts"] : [],
  },
});
