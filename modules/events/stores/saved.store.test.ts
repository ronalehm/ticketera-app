import { beforeEach, describe, expect, it } from "vitest";
import { useSavedEventsStore } from "./saved.store";

const stored = () => JSON.parse(localStorage.getItem("mentec-saved") ?? "null");

beforeEach(() => {
  useSavedEventsStore.setState({ slugs: [] });
  localStorage.clear(); // setState también persiste
});

describe("useSavedEventsStore", () => {
  it("toggle añade un slug y lo persiste en mentec-saved", () => {
    useSavedEventsStore.getState().toggle("concierto-demo");
    useSavedEventsStore.getState().toggle("teatro-demo");

    expect(useSavedEventsStore.getState().slugs).toEqual(["concierto-demo", "teatro-demo"]);
    expect(stored()).toEqual({ state: { slugs: ["concierto-demo", "teatro-demo"] }, version: 0 });
  });

  it("toggle sobre un slug guardado lo quita y actualiza localStorage", () => {
    useSavedEventsStore.getState().toggle("concierto-demo");
    useSavedEventsStore.getState().toggle("teatro-demo");
    useSavedEventsStore.getState().toggle("concierto-demo");

    expect(useSavedEventsStore.getState().slugs).toEqual(["teatro-demo"]);
    expect(stored().state).toEqual({ slugs: ["teatro-demo"] });
  });

  it("persist.rehydrate restaura los slugs guardados", async () => {
    localStorage.setItem("mentec-saved", JSON.stringify({ state: { slugs: ["concierto-demo"] }, version: 0 }));
    expect(useSavedEventsStore.getState().slugs).toEqual([]);

    await useSavedEventsStore.persist.rehydrate();
    expect(useSavedEventsStore.getState().slugs).toEqual(["concierto-demo"]);
  });
});
