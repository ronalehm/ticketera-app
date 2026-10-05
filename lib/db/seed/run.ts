// CLI de `npm run db:seed` (tsx carga `.env` con --env-file-if-exists).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import { parseSeedEnv } from "./env";
import { seed, type SeedReport } from "./seed";

async function main() {
  // Antes de conectar: sin SUPER_ADMIN_EMAIL y SEED_ORGANIZER_EMAILS válidas no se escribe nada.
  const roles = parseSeedEnv();

  // Conexión directa: el seed es una transacción larga, mejor sin el pooler.
  const pool = new Pool({ connectionString: env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL });
  let report: SeedReport;
  try {
    report = await seed(drizzle({ client: pool }), { ...roles, now: new Date() });
  } finally {
    await pool.end();
  }
  console.log("Seed completado");
  for (const [table, written] of Object.entries(report.written)) console.log(`  ${table}: ${written} escritas`);
  console.log(`  eventSeats retirados: ${report.retiredEventSeats}`);
  console.log(`  eventSeats obsoletos con venta real: ${report.obsoleteWithSales}`);
  if (report.obsoleteWithSales > 0) {
    console.warn(
      `Aviso: ${report.obsoleteWithSales} lugares obsoletos tienen una venta o retención real; no se retiran ni se tocan.`,
    );
  }
  if (report.eventsWithKeptDates.length > 0) {
    console.log(
      `  eventos que conservaron su fecha (ventas activas: pagadas, parcialmente reembolsadas o pendientes vigentes): ${report.eventsWithKeptDates.join(", ")}`,
    );
  }
  for (const { email, status } of report.nonApprovedOrganizers) {
    console.warn(
      `Aviso: el organizador ${email} está ${status}; el seed respeta el estado que puso un admin y no lo aprueba, pero le reparte eventos.`,
    );
  }
}

main().catch((error: unknown) => {
  // Un error de Drizzle lleva en `message` la consulta con todos sus parámetros; la causa (pg) es lo útil.
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  console.error(cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
