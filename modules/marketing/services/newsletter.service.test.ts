import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_LATENCY_MS, subscribeToNewsletter } from "./newsletter.service";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("subscribeToNewsletter", () => {
  it("sigue pendiente antes de MOCK_LATENCY_MS y se resuelve con undefined al cumplirse", async () => {
    const resolved = vi.fn();
    subscribeToNewsletter("ana@correo.pe").then(resolved);
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS - 1);
    expect(resolved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalledWith(undefined);
  });

  it("no hace peticiones de red", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const promise = subscribeToNewsletter("ana@correo.pe");
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS);
    await promise;
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
