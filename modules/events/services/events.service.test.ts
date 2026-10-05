// @vitest-environment node
import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { describeWithDb } from "@/lib/db/testDb";
import { inRolledBackTransaction } from "@/lib/db/testTransaction";
import { EVENTS_MOCK } from "../data/events.mock";
import { eventDetailSchema, eventSchema } from "../schemas/events.schema";
import type { Event } from "../types/events.types";
import { getEventBySlug, getEvents, getFeaturedEvents, getRelatedEvents } from "./events.service";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Igual al mock salvo `id` (UUID de la fila) y las fechas, que deben ser el mismo instante (Decisión 13). */
function expectSameAsMock<T extends Event & { doorsOpenAt?: string }>(actual: T, expected: T) {
  expect(actual.id).toMatch(UUID);
  expect(Date.parse(actual.startsAt)).toBe(Date.parse(expected.startsAt));
  expect(Date.parse(actual.doorsOpenAt ?? "")).toEqual(Date.parse(expected.doorsOpenAt ?? ""));
  expect(actual).toEqual({ ...expected, id: actual.id, startsAt: actual.startsAt, doorsOpenAt: actual.doorsOpenAt });
}

describeWithDb("events.service (BD)", () => {
  it("getEvents devuelve los eventos publicados del mock, en su orden", async () => {
    const events = await getEvents();
    expect(events.map((event) => event.slug)).toEqual(EVENTS_MOCK.map((event) => event.slug));
    events.forEach((event, index) => expectSameAsMock(event, eventSchema.parse(EVENTS_MOCK[index])));
  });

  it("getFeaturedEvents devuelve solo los destacados", async () => {
    const featured = await getFeaturedEvents();
    expect(featured).toHaveLength(EVENTS_MOCK.filter((event) => event.featured).length);
    expect(featured.every((event) => event.featured)).toBe(true);
  });

  describe("getEventBySlug", () => {
    it.each(EVENTS_MOCK.map((event) => [event.slug, event] as const))(
      "%s es igual al detalle del mock",
      async (slug, mock) => {
        const event = await getEventBySlug(slug);
        expect(event).not.toBeNull();
        expectSameAsMock(event!, eventDetailSchema.parse(mock));
      },
    );

    it.each(["feria-familiar-de-verano", "no-existe"])("devuelve null para %s (borrador o inexistente)", async (slug) => {
      expect(await getEventBySlug(slug)).toBeNull();
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
      const [related] = await getRelatedEvents("festival-vive-latino-lima", 1);
      expect(related.slug).toBe("festival-sol-de-verano");
    });
  });
});

describeWithDb("events.service con lugares retirados (BD)", () => {
  const slug = "copa-del-norte-trujillo";

  async function getOccidenteStatus() {
    const event = await getEventBySlug(slug);
    return event?.ticketTypes.find((type) => type.id === "occidente")?.status;
  }

  it("no cuenta los lugares retirados", async () => {
    await inRolledBackTransaction(async (tx) => {
      expect(await getOccidenteStatus()).toBe("available"); // 22 libres de 39

      const occidente = tx
        .select({ id: ticketTypes.id })
        .from(ticketTypes)
        .innerJoin(events, eq(events.id, ticketTypes.eventId))
        .where(and(eq(events.slug, slug), eq(ticketTypes.slug, "occidente")));
      const retired = await tx
        .update(eventSeats)
        .set({ retiredAt: new Date() })
        .where(and(inArray(eventSeats.ticketTypeId, occidente), eq(eventSeats.status, "available")))
        .returning({ id: eventSeats.id });

      expect(retired).toHaveLength(22);
      expect(await getOccidenteStatus()).toBe("sold-out"); // sin el filtro seguiría `available`
    });
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
      expect(event.ticketTypes.length).toBeLessThanOrEqual(5);
    }
    event.ticketTypes.forEach((type) => expect(type.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
    expect(Date.parse(event.doorsOpenAt)).toBeLessThan(Date.parse(event.startsAt));
    expect(event.description.split("\n\n").length).toBeGreaterThanOrEqual(2);
  });
});
