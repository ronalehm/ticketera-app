// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { getEvents } from "@/modules/events";
import { getDashboardKpis } from "../utils/organizerStats";
import { getOrganizerEvents } from "./organizer.service";

vi.mock("@/modules/events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/events")>();
  return { ...actual, getEvents: vi.fn(actual.getEvents) };
});

/** id (UUID de la BD) del evento con ese slug. */
async function eventId(slug: string) {
  return (await getEvents()).find((event) => event.slug === slug)?.id;
}

describeWithDb("getOrganizerEvents", () => {
  beforeEach(() => {
    vi.mocked(getEvents).mockClear();
  });

  it("devuelve los 3 publicados en el orden de las ventas y después el borrador", async () => {
    const events = await getOrganizerEvents();
    expect(events.map((event) => [event.id, event.status])).toEqual([
      [await eventId("noche-de-sintetizadores-lima"), "published"],
      [await eventId("la-casa-de-los-espejos"), "published"],
      [await eventId("el-circo-de-las-estrellas"), "published"],
      ["org-draft-001", "draft"],
    ]);
  });

  it("el primero toma los datos del evento y las ventas mock", async () => {
    const [first] = await getOrganizerEvents();
    // La fecha es la que siembra el seed (relativa a su `now`), no la del mock.
    const event = (await getEvents()).find(({ slug }) => slug === "noche-de-sintetizadores-lima");
    expect(first).toEqual({
      id: event?.id,
      title: "Noche de Sintetizadores: Gira Neón 2026",
      category: "conciertos",
      startsAt: event?.startsAt,
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
    expect(events.map((event) => event.id)).toEqual([
      await eventId("noche-de-sintetizadores-lima"),
      await eventId("el-circo-de-las-estrellas"),
      "org-draft-001",
    ]);
  });
});
