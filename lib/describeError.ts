import { DrizzleQueryError } from "drizzle-orm";

/** SQLSTATE de Postgres: 5 caracteres alfanuméricos en mayúsculas (`23505`, `40001`, `P0001`). */
const SQLSTATE = /^[0-9A-Z]{5}$/;

function sqlState(value: unknown): string | undefined {
  const code = (value as { code?: unknown } | null | undefined)?.code;
  return typeof code === "string" && SQLSTATE.test(code) ? code : undefined;
}

/**
 * Datos de un error para `console.error` sin información personal: solo el nombre y, si lo hay, el SQLSTATE (del
 * propio error o de su `cause`, donde lo deja `DrizzleQueryError`). Nunca `message`, `query` ni `params`, que pueden
 * llevar correos, nombres o documentos.
 */
export function describeError(error: unknown): { name: string; code?: string } {
  // `DrizzleQueryError` no fija `name` (queda "Error"), por eso va literal.
  const name =
    error instanceof DrizzleQueryError ? "DrizzleQueryError" : error instanceof Error ? error.name : typeof error;
  const code = sqlState(error) ?? (error instanceof Error ? sqlState(error.cause) : undefined);
  return code ? { name, code } : { name };
}
