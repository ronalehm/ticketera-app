import { describe, expect, it } from "vitest";
import { EVENTS_MOCK } from "../data/events.mock";
import { eventDetailSchema, eventSchema } from "../schemas/events.schema";
import { getEventBySlug, getEvents, getFeaturedEvents, getRelatedEvents } from "./events.service";

describe("events.service", () => {
  it("getEvents devuelve todos los eventos válidos según el schema", async () => {
    const events = await getEvents();
    expect(events).toHaveLength(EVENTS_MOCK.length);
    events.forEach((event) => expect(eventSchema.safeParse(event).success).toBe(true));
  });

  it("getFeaturedEvents devuelve solo los destacados", async () => {
    const featured = await getFeaturedEvents();
    expect(featured).toHaveLength(EVENTS_MOCK.filter((event) => event.featured).length);
    expect(featured.every((event) => event.featured)).toBe(true);
  });

  it("falla si el mock tiene un evento inválido", async () => {
    const original = EVENTS_MOCK[0];
    EVENTS_MOCK[0] = { ...original, startsAt: "15/11/2026" };
    try {
      await expect(getEvents()).rejects.toThrow();
    } finally {
      EVENTS_MOCK[0] = original;
    }
  });

  describe("getEventBySlug", () => {
    it("devuelve el detalle válido de un slug existente", async () => {
      const event = await getEventBySlug("noche-de-sintetizadores-lima");
      expect(event?.title).toBe("Noche de Sintetizadores: Gira Neón 2026");
      expect(eventDetailSchema.safeParse(event).success).toBe(true);
    });

    it("devuelve null para un slug inexistente", async () => {
      expect(await getEventBySlug("no-existe")).toBeNull();
    });
  });

  describe("getRelatedEvents", () => {
    const slug = "risas-sin-filtro"; // stand-up: hay otro stand-up en el mock

    it("excluye el evento actual y respeta el límite", async () => {
      const related = await getRelatedEvents(slug);
      expect(related).toHaveLength(4);
      expect(related.some((event) => event.slug === slug)).toBe(false);
      expect(await getRelatedEvents(slug, 2)).toHaveLength(2);
    });

    it("prioriza la misma categoría y ordena el resto por fecha", async () => {
      const [first, ...rest] = await getRelatedEvents(slug);
      expect(first.slug).toBe("micro-abierto-arequipa");
      const dates = rest.map((event) => Date.parse(event.startsAt));
      expect(dates).toEqual([...dates].sort((a, b) => a - b));
      expect(rest.every((event) => event.category !== "stand-up")).toBe(true);
    });

    it("con limit 1 devuelve el de la misma categoría aunque haya otros antes en fecha", async () => {
      const [related] = await getRelatedEvents("festival-arena-y-mar-piura", 1);
      expect(related.slug).toBe("festival-sol-de-verano");
    });
  });

  describe("invariantes del mock", () => {
    const details = EVENTS_MOCK.map((event) => eventDetailSchema.parse(event));

    it.each(details.map((event) => [event.slug, event] as const))("%s cumple las invariantes", (_, event) => {
      const prices = event.ticketTypes.map((type) => type.price);
      expect(event.priceFrom).toBe(Math.min(...prices));
      if (event.status === "sold-out") {
        expect(event.ticketTypes.every((type) => type.status === "sold-out")).toBe(true);
      }
      if (event.status === "low-stock") {
        expect(event.ticketTypes.some((type) => type.status === "low-stock")).toBe(true);
      }
      if (event.priceFrom === 0) {
        expect(event.ticketTypes).toEqual([{ id: "entrada-libre", name: "Entrada libre", price: 0, status: "available" }]);
      } else {
        expect(event.ticketTypes.length).toBeGreaterThanOrEqual(2);
        expect(event.ticketTypes.length).toBeLessThanOrEqual(4);
      }
      event.ticketTypes.forEach((type) => expect(type.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
      expect(Date.parse(event.doorsOpenAt)).toBeLessThan(Date.parse(event.startsAt));
      expect(event.description.split("\n\n").length).toBeGreaterThanOrEqual(2);
    });
  });
});
