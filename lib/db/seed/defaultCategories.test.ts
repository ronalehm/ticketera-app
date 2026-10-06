// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inArray, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema/events";
import { describeWithDb } from "@/lib/db/testDb";
import { inRolledBackTransaction } from "@/lib/db/testTransaction";
import { EVENTS_MOCK } from "@/modules/events/data/events.mock";
import { categorySlugSchema } from "@/modules/events/schemas/events.schema";
import { seedUuid } from "./buildSeedData";
import { DEFAULT_EVENT_CATEGORIES } from "./defaultCategories";

vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

const MIGRATION_SQL = readFileSync(join(process.cwd(), "drizzle", "0009_new_event_categories.sql"), "utf8");

/** Las 3 categorías que añade la migración `0009`, con el id determinista del seed. */
const NEW_CATEGORIES = DEFAULT_EVENT_CATEGORIES.filter(({ slug }) => ["cafe-shop", "drink", "bar-shop"].includes(slug)).map(
  ({ slug, name }) => ({ id: seedUuid(`category:${slug}`), slug, name }),
);
const NEW_SLUGS = NEW_CATEGORIES.map(({ slug }) => slug);

describe("DEFAULT_EVENT_CATEGORIES", () => {
  it("tiene 9 categorías con slugs válidos y únicos", () => {
    const slugs = DEFAULT_EVENT_CATEGORIES.map(({ slug }) => slug);
    expect(slugs).toHaveLength(9);
    expect(new Set(slugs).size).toBe(9);
    slugs.forEach((slug) => expect(categorySlugSchema.safeParse(slug).success).toBe(true));
  });

  it.each(EVENTS_MOCK.map((event) => [event.slug, event] as const))(
    "la categoría del mock %s existe con el mismo nombre",
    (_, event) => {
      expect(DEFAULT_EVENT_CATEGORIES).toContainEqual({ slug: event.category, name: event.categoryName });
    },
  );
});

describe("migración 0009_new_event_categories", () => {
  it("inserta Café, Drinks y Bares con los ids del seed, escritos literal", () => {
    expect(NEW_CATEGORIES).toHaveLength(3);
    for (const { id, slug, name } of NEW_CATEGORIES) {
      expect(MIGRATION_SQL).toContain(`('${id}', '${slug}', '${name}')`);
    }
    expect(MIGRATION_SQL).toMatch(/ON CONFLICT \("slug"\) DO NOTHING;/);
  });
});

describeWithDb("migración 0009_new_event_categories (BD)", () => {
  const selectNew = (database: Pick<typeof db, "select">) =>
    database
      .select({ id: categories.id, slug: categories.slug, name: categories.name })
      .from(categories)
      .where(inArray(categories.slug, NEW_SLUGS));
  const bySlug = (rows: { slug: string }[]) => [...rows].sort((a, b) => a.slug.localeCompare(b.slug));

  it("las 3 filas existen en la BD de test con esos ids", async () => {
    expect(bySlug(await selectNew(db))).toEqual(bySlug(NEW_CATEGORIES));
  });

  it("sobre una BD sin ellas, las inserta; repetirla no hace nada", async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.delete(categories).where(inArray(categories.slug, NEW_SLUGS));
      expect((await tx.execute(sql.raw(MIGRATION_SQL))).rowCount).toBe(3);
      expect(bySlug(await selectNew(tx))).toEqual(bySlug(NEW_CATEGORIES));
      expect((await tx.execute(sql.raw(MIGRATION_SQL))).rowCount).toBe(0);
    });
  });
});
