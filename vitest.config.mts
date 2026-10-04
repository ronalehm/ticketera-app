import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

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

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    env: testDatabaseUrl
      ? { DATABASE_URL: testDatabaseUrl, DATABASE_URL_TEST: testDatabaseUrl }
      : { DATABASE_URL: INERT_DATABASE_URL },
    globalSetup: testDatabaseUrl ? ["./lib/db/testGlobalSetup.ts"] : [],
  },
});
