import { describe, expect, it } from "vitest";
import { EVENT_CATEGORIES } from "@/modules/events";
import { EVENT_CATEGORY_OPTIONS, organizerEventSchema } from "./organizer.schema";

const draft = {
  id: "org-draft-001",
  title: "Feria Familiar de Verano",
  category: "familia",
  startsAt: "2026-12-01T11:00:00-05:00",
  venue: "Parque Selva Alegre",
  city: "Arequipa",
  imageUrl: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1600&q=80",
  priceFrom: 40,
  sold: 0,
  capacity: 1500,
  status: "draft",
};

describe("EVENT_CATEGORY_OPTIONS", () => {
  it("coincide con las categorías del proyecto y en el mismo orden", () => {
    expect(EVENT_CATEGORY_OPTIONS).toEqual(EVENT_CATEGORIES);
  });
});

describe("organizerEventSchema", () => {
  it("acepta el borrador mock", () => {
    expect(organizerEventSchema.parse(draft)).toEqual(draft);
  });

  it("acepta un evento creado sin fecha, imagen ni precio", () => {
    const created = { ...draft, startsAt: null, imageUrl: null, priceFrom: null, capacity: 0 };
    expect(organizerEventSchema.safeParse(created).success).toBe(true);
  });

  it("rechaza una categoría inexistente", () => {
    const result = organizerEventSchema.safeParse({ ...draft, category: "cine" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["category"]);
  });

  it("rechaza un estado desconocido", () => {
    expect(organizerEventSchema.safeParse({ ...draft, status: "archived" }).success).toBe(false);
  });
});
