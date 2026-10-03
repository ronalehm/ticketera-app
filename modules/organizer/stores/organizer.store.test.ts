import { beforeEach, describe, expect, it } from "vitest";
import type { OrganizerEvent } from "../types/organizer.types";
import { useOrganizerStore } from "./organizer.store";

const makeEvent = (id: string, overrides: Partial<OrganizerEvent> = {}): OrganizerEvent => ({
  id,
  title: `Evento ${id}`,
  category: "conciertos",
  startsAt: "2026-12-05T20:00:00-05:00",
  venue: "Arena Lima",
  city: "Lima",
  imageUrl: null,
  priceFrom: 80,
  sold: 0,
  capacity: 500,
  status: "published",
  ...overrides,
});

const stored = () => JSON.parse(localStorage.getItem("mentec-organizer-events") ?? "null");

beforeEach(() => {
  useOrganizerStore.setState({ events: [] });
  localStorage.clear(); // setState también persiste
});

describe("useOrganizerStore", () => {
  it("el estado inicial no tiene eventos", () => {
    expect(useOrganizerStore.getInitialState().events).toEqual([]);
  });

  it("addEvent antepone el evento y persiste en mentec-organizer-events", () => {
    const first = makeEvent("a");
    const second = makeEvent("b", { status: "draft", startsAt: null, priceFrom: null, capacity: 0 });
    useOrganizerStore.getState().addEvent(first);
    useOrganizerStore.getState().addEvent(second);

    expect(useOrganizerStore.getState().events).toEqual([second, first]);
    expect(stored()).toEqual({ state: { events: [second, first] }, version: 0 });
  });

  it("persist.rehydrate restaura los eventos guardados", async () => {
    const event = makeEvent("a");
    localStorage.setItem(
      "mentec-organizer-events",
      JSON.stringify({ state: { events: [event] }, version: 0 }),
    );
    expect(useOrganizerStore.getState().events).toEqual([]);

    await useOrganizerStore.persist.rehydrate();
    expect(useOrganizerStore.getState().events).toEqual([event]);
  });
});
