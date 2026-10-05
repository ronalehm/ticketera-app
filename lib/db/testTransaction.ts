import { TransactionRollbackError } from "drizzle-orm";
import { vi } from "vitest";
import type * as DbClient from "@/lib/db/client";

/**
 * Solo para tests con BD. Uso: `vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"))`.
 * Así los services y `seed(db)` leen y escriben dentro de `inRolledBackTransaction`, y el resto de archivos
 * de test, que corren en paralelo, ven la BD intacta.
 */

// `importActual`: con el mock activo, importar "@/lib/db/client" devolvería este mismo módulo.
const { db: realDb } = await vi.importActual<typeof DbClient>("@/lib/db/client");

export type Tx = Parameters<Parameters<typeof realDb.transaction>[0]>[0];

let activeTx: Tx | undefined;

/** El `db` real o, dentro de `inRolledBackTransaction`, la transacción activa. */
export const db: typeof realDb = new Proxy(realDb, {
  get(target, property) {
    const current = activeTx ?? target;
    const value: unknown = Reflect.get(current, property, current);
    return typeof value === "function" ? value.bind(current) : value;
  },
});

/** Ejecuta `run` en una transacción que siempre se revierte; devuelve su resultado o relanza su error. */
export async function inRolledBackTransaction<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
  const outerTx = activeTx;
  let outcome: { ok: true; value: T } | { ok: false; error: unknown } | undefined;
  try {
    // Con una transacción ya activa, el proxy abre un savepoint dentro de ella.
    await db.transaction(async (tx) => {
      activeTx = tx;
      try {
        outcome = { ok: true, value: await run(tx) };
      } catch (error) {
        outcome = { ok: false, error };
      } finally {
        activeTx = outerTx;
      }
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  if (!outcome) throw new Error("inRolledBackTransaction: la transacción no llegó a ejecutar `run`");
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}
