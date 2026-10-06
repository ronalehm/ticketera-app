import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setEventFeaturedAction } from "../actions/eventFeatured.actions";
import { makeManagedEvent } from "../data/managedEvents.mock";
import { DEFAULT_MANAGED_EVENTS_FILTERS, managedEventsQueryKey } from "./useManagedEvents";
import { useSetEventFeatured } from "./useSetEventFeatured";

vi.mock("../actions/eventFeatured.actions", () => ({ setEventFeaturedAction: vi.fn() }));

const USER = "user-admin";
const EVENT_ID = "e0000000-0000-4000-8000-000000000001";
const OWN_KEY = managedEventsQueryKey(USER, DEFAULT_MANAGED_EVENTS_FILTERS);
const OTHER_KEY = managedEventsQueryKey("user-other", DEFAULT_MANAGED_EVENTS_FILTERS);

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
  for (const key of [OWN_KEY, OTHER_KEY]) queryClient.setQueryData(key, [makeManagedEvent("a")]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useSetEventFeatured(USER), { wrapper }), queryClient };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("useSetEventFeatured", () => {
  it("llama a la acción y, si va bien, invalida los listados del usuario (y solo los suyos)", async () => {
    vi.mocked(setEventFeaturedAction).mockResolvedValue({ ok: true, featured: true });
    const { result, queryClient } = setup();

    await act(async () => {
      expect(await result.current.mutateAsync({ id: EVENT_ID, featured: true })).toEqual({ ok: true, featured: true });
    });
    expect(setEventFeaturedAction).toHaveBeenCalledWith(EVENT_ID, true);
    expect(queryClient.getQueryState(OWN_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(OTHER_KEY)?.isInvalidated).toBe(false);
  });

  it("not_found (listado desactualizado) también invalida; otro fallo no", async () => {
    vi.mocked(setEventFeaturedAction).mockResolvedValue({ ok: false, error: "x", code: "not_found" });
    const { result, queryClient } = setup();
    await act(async () => {
      await result.current.mutateAsync({ id: EVENT_ID, featured: true });
    });
    expect(queryClient.getQueryState(OWN_KEY)?.isInvalidated).toBe(true);

    const other = setup();
    vi.mocked(setEventFeaturedAction).mockResolvedValue({ ok: false, error: "x" });
    await act(async () => {
      await other.result.current.mutateAsync({ id: EVENT_ID, featured: false });
    });
    expect(other.queryClient.getQueryState(OWN_KEY)?.isInvalidated).toBe(false);
  });
});
