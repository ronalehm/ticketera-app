import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit carga esta config fuera de Next: no importa lib/env.ts (db:generate no necesita BD).
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema",
  out: "./drizzle",
  dbCredentials: {
    // `||`: una variable vacía (`VAR=`) cuenta como ausente, como en lib/env.ts.
    url:
      process.env.DATABASE_URL_MIGRATOR ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL ||
      "",
  },
});
