import { describe, expect, it } from "vitest";
import { categorySlugSchema, eventCategorySchema } from "./events.schema";

describe("categorySlugSchema", () => {
  it.each(["conciertos", "stand-up", "cafe-shop", "drink", "f1", "a-b-c"])("acepta %s", (slug) => {
    expect(categorySlugSchema.safeParse(slug).success).toBe(true);
  });

  it.each(["", "Teatro", "ópera", "stand up", "-teatro", "teatro-", "stand--up", "a_b", "a".repeat(61)])(
    "rechaza %j",
    (slug) => {
      expect(categorySlugSchema.safeParse(slug).success).toBe(false);
    },
  );

  it("acepta un slug de 60 caracteres", () => {
    expect(categorySlugSchema.safeParse("a".repeat(60)).success).toBe(true);
  });
});

describe("eventCategorySchema", () => {
  const category = { id: "6d25931b-cdf8-839c-8cbc-59f2c33f2d87", slug: "cafe-shop", name: "Café" };

  it("acepta una fila de categories", () => {
    expect(eventCategorySchema.parse(category)).toEqual(category);
  });

  it.each([
    ["id no uuid", { ...category, id: "cafe" }],
    ["slug mal formado", { ...category, slug: "Café" }],
    ["nombre vacío", { ...category, name: "" }],
  ])("rechaza %s", (_, value) => {
    expect(eventCategorySchema.safeParse(value).success).toBe(false);
  });
});
