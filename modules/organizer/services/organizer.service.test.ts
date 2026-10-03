import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEvents } from "@/modules/events";
import { getDashboardKpis } from "../utils/organizerStats";
import { getOrganizerEvents } from "./organizer.service";

vi.mock("@/modules/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/events")>();
  return { ...actual, getEvents: vi.fn(actual.getEvents) };
});

describe("getOrganizerEvents", () => {
  beforeEach(() => {
    vi.mocked(getEvents).mockClear();
  });

  it("devuelve los 3 publicados en el orden de las ventas y después el borrador", async () => {
    const events = await getOrganizerEvents();
    expect(events.map((event) => [event.id, event.status])).toEqual([
      ["evt-001", "published"],
      ["evt-003", "published"],
      ["evt-011", "published"],
      ["org-draft-001", "draft"],
    ]);
  });

  it("el primero toma los datos del evento y las ventas mock", async () => {
    const [first] = await getOrganizerEvents();
    expect(first).toEqual({
      id: "evt-001",
      title: "Noche de Sintetizadores: Gira Neón 2026",
      category: "conciertos",
      startsAt: "2026-11-14T21:00:00-05:00",
      venue: "Estadio Nacional",
      city: "Lima",
      imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80",
      priceFrom: 180,
      sold: 7420,
      capacity: 8000,
      status: "published",
    });
  });

  it("el último es el borrador mock", async () => {
    const events = await getOrganizerEvents();
    expect(events.at(-1)).toMatchObject({
      id: "org-draft-001",
      title: "Feria Familiar de Verano",
      status: "draft",
      sold: 0,
      capacity: 1500,
    });
  });

  it("produce los KPIs del mock", async () => {
    expect(getDashboardKpis(await getOrganizerEvents())).toEqual({
      revenue: 1387530,
      ticketsSold: 8146,
      publishedCount: 3,
    });
  });

  it("omite las ventas cuyo slug no existe entre los eventos", async () => {
    const all = await getEvents();
    vi.mocked(getEvents).mockResolvedValueOnce(all.filter((event) => event.slug !== "la-casa-de-los-espejos"));

    const events = await getOrganizerEvents();
    expect(events.map((event) => event.id)).toEqual(["evt-001", "evt-011", "org-draft-001"]);
  });
});
