// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Regla de migraciones aditivas (spec seating-all-venue-maps, decisión 7 y requisito 20). Sin BD: lee `drizzle/`. */

const MIGRATIONS_DIR = join(process.cwd(), "drizzle");

type JournalEntry = { idx: number; when: number; tag: string };

const journal = JSON.parse(readFileSync(join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8")) as {
  entries: JournalEntry[];
};
const sqlFiles = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort();

/** Sentencias que pueden destruir o reescribir datos: prohibidas en cualquier migración. */
const DESTRUCTIVE_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "DROP TABLE/COLUMN/TYPE/SCHEMA/EXTENSION/SEQUENCE/VIEW", pattern: /\bDROP\s+(TABLE|COLUMN|TYPE|SCHEMA|EXTENSION|SEQUENCE|VIEW)\b/i },
  { name: "TRUNCATE", pattern: /\bTRUNCATE\b/i },
  { name: "DELETE FROM", pattern: /\bDELETE\s+FROM\b/i },
  // La sentencia UPDATE, no la acción `ON UPDATE` de las FKs.
  { name: "UPDATE", pattern: /(?<!\bON\s+)\bUPDATE\b/i },
  { name: "RENAME", pattern: /\bRENAME\b/i },
  { name: "ALTER COLUMN … TYPE", pattern: /\bALTER\s+(COLUMN\s+)?"[^"]+"\s+(SET\s+DATA\s+)?TYPE\b/i },
];

/** Devuelve las infracciones de la regla aditiva que contiene el SQL de una migración. */
function findViolations(sql: string): string[] {
  const violations = DESTRUCTIVE_PATTERNS.filter(({ pattern }) => pattern.test(sql)).map(({ name }) => name);
  // DROP CONSTRAINT "x" solo vale si la misma migración vuelve a crear "x" (redefinir un CHECK).
  for (const [, name] of sql.matchAll(/\bDROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?"([^"]+)"/gi)) {
    const recreated = new RegExp(`\\bADD\\s+CONSTRAINT\\s+"${name}"`, "i").test(sql);
    if (!recreated) violations.push(`DROP CONSTRAINT "${name}" sin ADD CONSTRAINT`);
  }
  return violations;
}

/**
 * Excepciones revisadas a mano. 0006 rellena con `UPDATE` solo la columna `orders.ticket_count`, que crea
 * en la misma migración, antes de `SET NOT NULL` (spec checkout-stripe): no reescribe datos existentes.
 */
const ALLOWED_VIOLATIONS: Record<string, string[]> = { "0006_orders_reservation.sql": ["UPDATE"] };

describe("migraciones de drizzle/", () => {
  it("cada .sql está en _journal.json, en el mismo orden, con idx consecutivos y when creciente", () => {
    expect(sqlFiles.length).toBeGreaterThan(0);
    expect(journal.entries.map(({ tag }) => `${tag}.sql`)).toEqual(sqlFiles);
    journal.entries.forEach((entry, index) => {
      expect(entry.idx).toBe(index);
      if (index > 0) expect(entry.when).toBeGreaterThan(journal.entries[index - 1].when);
    });
  });

  it.each(sqlFiles)("%s es aditiva", (file) => {
    expect(findViolations(readFileSync(join(MIGRATIONS_DIR, file), "utf8"))).toEqual(ALLOWED_VIOLATIONS[file] ?? []);
  });
});

describe("findViolations (regla aditiva)", () => {
  it.each([
    ['DROP TABLE "orders";', "DROP TABLE/COLUMN/TYPE/SCHEMA/EXTENSION/SEQUENCE/VIEW"],
    ['ALTER TABLE "orders" DROP COLUMN "code";', "DROP TABLE/COLUMN/TYPE/SCHEMA/EXTENSION/SEQUENCE/VIEW"],
    ['drop type "public"."seat_status";', "DROP TABLE/COLUMN/TYPE/SCHEMA/EXTENSION/SEQUENCE/VIEW"],
    ["DROP EXTENSION pg_trgm;", "DROP TABLE/COLUMN/TYPE/SCHEMA/EXTENSION/SEQUENCE/VIEW"],
    ['TRUNCATE "event_seats";', "TRUNCATE"],
    ['DELETE FROM "event_seats";', "DELETE FROM"],
    ['UPDATE "event_seats" SET "status" = \'available\';', "UPDATE"],
    ['ALTER TABLE "venues" RENAME COLUMN "name" TO "title";', "RENAME"],
    ['ALTER TABLE "orders" ALTER COLUMN "code" SET DATA TYPE integer;', "ALTER COLUMN … TYPE"],
    ['ALTER TABLE "orders" ALTER COLUMN "code" TYPE integer;', "ALTER COLUMN … TYPE"],
    ['ALTER TABLE "venues" DROP CONSTRAINT "venues_check";', 'DROP CONSTRAINT "venues_check" sin ADD CONSTRAINT'],
  ])("rechaza %s", (sql, violation) => {
    expect(findViolations(sql)).toContain(violation);
  });

  it.each([
    'ALTER TABLE "event_seats" ADD COLUMN "retired_at" timestamp with time zone;',
    'ALTER TABLE "x" ADD CONSTRAINT "x_fk" FOREIGN KEY ("a") REFERENCES "public"."y"("id") ON DELETE no action ON UPDATE no action;',
    'ALTER TABLE "events" ALTER COLUMN "venue_id" DROP NOT NULL;',
    'ALTER TABLE "v" DROP CONSTRAINT "v_check";--> statement-breakpoint\nALTER TABLE "v" ADD CONSTRAINT "v_check" CHECK (true);',
    'CREATE TYPE "public"."venue_status" AS ENUM(\'pending_review\', \'approved\');',
  ])("acepta %s", (sql) => {
    expect(findViolations(sql)).toEqual([]);
  });
});
