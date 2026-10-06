// @vitest-environment node
import { expect, it, vi } from "vitest";
import { categories } from "@/lib/db/schema/events";
import { seedUuid } from "@/lib/db/seed/buildSeedData";
import { describeWithDb } from "@/lib/db/testDb";
import { inRolledBackTransaction } from "@/lib/db/testTransaction";
import { listEventCategories } from "./categories.service";

vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

describeWithDb("listEventCategories (BD)", () => {
  it("devuelve las 9 categorías con id, slug y nombre, en orden alfabético español", async () => {
    const list = await listEventCategories();
    expect(list.map(({ name }) => name)).toEqual([
      "Bares",
      "Café",
      "Conciertos",
      "Deportes",
      "Drinks",
      "Familia",
      "Festivales",
      "Stand-up",
      "Teatro",
    ]);
    expect(list.find(({ slug }) => slug === "cafe-shop")).toEqual({
      id: seedUuid("category:cafe-shop"),
      slug: "cafe-shop",
      name: "Café",
    });
  });

  it("ordena las tildes como en español («Ópera» antes que «Zarzuela»), no por el collation de la BD", async () => {
    const names = await inRolledBackTransaction(async (tx) => {
      await tx.insert(categories).values([
        { slug: "zarzuela-test", name: "Zarzuela" },
        { slug: "opera-test", name: "Ópera" },
      ]);
      return (await listEventCategories(tx)).map(({ name }) => name);
    });
    expect(names.indexOf("Ópera")).toBeGreaterThan(names.indexOf("Festivales"));
    expect(names.indexOf("Ópera")).toBeLessThan(names.indexOf("Stand-up"));
    expect(names.at(-1)).toBe("Zarzuela");
  });
});
