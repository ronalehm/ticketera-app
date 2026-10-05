// CLI de `npm run db:reset-demo` (tsx carga `.env` con --env-file-if-exists). DESTRUCTIVO: borra todas las ventas.
// Uso: ALLOW_DEMO_RESET=true npm run db:reset-demo -- --confirm=<host de la BD>   (README, "Reset de datos demo").
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import { parseSeedEnv } from "./env";
import { assertDemoResetAllowed, parseConfirmArg, resetDemo, type ResetDemoReport } from "./resetDemo";

async function main() {
  const databaseUrl = env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL;
  const guard = {
    allowDemoReset: process.env.ALLOW_DEMO_RESET,
    confirmHost: parseConfirmArg(process.argv.slice(2)),
    databaseUrl,
  };
  // Antes de conectar: sin la protección y las variables del seed válidas no se abre ninguna conexión.
  assertDemoResetAllowed(guard);
  const roles = parseSeedEnv();

  // Conexión directa: una sola transacción larga, mejor sin el pooler.
  const pool = new Pool({ connectionString: databaseUrl });
  let report: ResetDemoReport;
  try {
    report = await resetDemo(drizzle({ client: pool }), { ...roles, now: new Date(), guard });
  } finally {
    await pool.end();
  }
  console.log("Reset de datos demo completado");
  console.log("Filas borradas:");
  for (const [table, deleted] of Object.entries(report.deleted)) console.log(`  ${table}: ${deleted}`);
  console.log("  order_code_seq reiniciada");
  console.log("Seed:");
  for (const [table, written] of Object.entries(report.seed.written)) console.log(`  ${table}: ${written} escritas`);
  console.log(`Organizadores sintéticos borrados: ${report.removedOrganizers.length}`);
  for (const email of report.removedOrganizers) console.log(`  ${email}`);
  if (report.keptOrganizers.length > 0) {
    console.log(`Organizadores sintéticos conservados (otras filas los referencian): ${report.keptOrganizers.length}`);
    for (const email of report.keptOrganizers) console.log(`  ${email}`);
  }
}

main().catch((error: unknown) => {
  // Un error de Drizzle lleva en `message` la consulta con todos sus parámetros; la causa (pg) es lo útil.
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
