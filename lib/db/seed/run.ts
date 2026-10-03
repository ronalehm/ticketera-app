// CLI de `npm run db:seed` (tsx carga `.env` con --env-file-if-exists).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import { seed } from "./seed";

async function main() {
  const superAdminEmail = env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) throw new Error("Falta SUPER_ADMIN_EMAIL en .env");

  // Conexión directa: el seed es una transacción larga, mejor sin el pooler.
  const pool = new Pool({ connectionString: env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL });
  try {
    await seed(drizzle({ client: pool }), { superAdminEmail });
  } finally {
    await pool.end();
  }
  console.log("Seed completado");
}

main().catch((error: unknown) => {
  // Un error de Drizzle lleva en `message` la consulta con todos sus parámetros; la causa (pg) es lo útil.
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
