import { describe, expect, it } from "vitest";
import { EVENTS_MOCK } from "../data/events.mock";
import { eventSchema } from "../schemas/events.schema";
import { getEvents, getFeaturedEvents } from "./events.service";

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
});
