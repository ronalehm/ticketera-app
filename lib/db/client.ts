import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";

// ponytail: sin singleton en globalThis; con el HMR de `next dev` cada recarga crea un Pool
// y los anteriores cierran sus conexiones ociosas a los 10 s. Añadirlo si Neon las rechaza.
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 5 });

export const db = drizzle({ client: pool });
