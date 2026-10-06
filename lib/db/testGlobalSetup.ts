import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import type { TestProject } from "vitest/node";
import { seed } from "./seed/seed";
import { TEST_SEED_OPTIONS } from "./testSeedOptions";

/** Solo con DATABASE_URL_TEST (vitest.config.mts): migra, vacía `public` y siembra la BD de test una vez. */
export default async function setup(project: TestProject) {
  const connectionString = project.config.env.DATABASE_URL_TEST;
  if (!connectionString) throw new Error("testGlobalSetup necesita DATABASE_URL_TEST");

  const pool = new Pool({ connectionString });
  try {
    const db = drizzle({ client: pool });
    await migrate(db, { migrationsFolder: "drizzle" });
    const { rows } = await pool.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    );
    if (rows.length > 0) {
      await pool.query(`TRUNCATE ${rows.map(({ tablename }) => `"public"."${tablename}"`).join(", ")} CASCADE`);
    }
    await seed(db, TEST_SEED_OPTIONS);
  } finally {
    await pool.end();
  }
}
