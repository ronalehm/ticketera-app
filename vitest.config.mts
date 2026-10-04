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

// Valores inertes de Clerk: importar lib/env en los tests no necesita claves reales.
const INERT_CLERK_ENV = {
  CLERK_SECRET_KEY: "sk_test_unused",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_unused",
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/login",
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/registro",
};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    // Los worktrees de agentes (`.claude/worktrees/`) son copias del repo: no se ejecutan sus tests.
    exclude: [...configDefaults.exclude, ".claude/worktrees/**"],
    env: testDatabaseUrl
      ? { ...INERT_CLERK_ENV, DATABASE_URL: testDatabaseUrl, DATABASE_URL_TEST: testDatabaseUrl }
      : { ...INERT_CLERK_ENV, DATABASE_URL: INERT_DATABASE_URL },
    globalSetup: testDatabaseUrl ? ["./lib/db/testGlobalSetup.ts"] : [],
  },
});
