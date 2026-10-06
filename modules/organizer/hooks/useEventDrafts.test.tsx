import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEventAction, deleteEventAction, updateEventAction } from "../actions/eventDrafts.actions";
import { makeManagedEvent } from "../data/managedEvents.mock";
import { EMPTY_EVENT_DRAFT } from "../utils/organizerEventForm";
import { useDeleteEventDraft, useSaveEventDraft } from "./useEventDrafts";
import { DEFAULT_MANAGED_EVENTS_FILTERS, managedEventsQueryKey } from "./useManagedEvents";

vi.mock("../actions/eventDrafts.actions", () => ({
  createEventAction: vi.fn(),
  updateEventAction: vi.fn(),
  deleteEventAction: vi.fn(),
}));

const USER = "user-organizer";
const OTHER_USER = "user-other";
const EVENT_ID = "e0000000-0000-4000-8000-000000000001";
const VALUES = { ...EMPTY_EVENT_DRAFT, title: "Festival" };
const ALL_KEY = managedEventsQueryKey(USER, DEFAULT_MANAGED_EVENTS_FILTERS);
const DRAFTS_KEY = managedEventsQueryKey(USER, { ...DEFAULT_MANAGED_EVENTS_FILTERS, status: "draft" });
const OTHER_KEY = managedEventsQueryKey(OTHER_USER, DEFAULT_MANAGED_EVENTS_FILTERS);

/** QueryClient con listados en caché del usuario (dos filtros) y de otro usuario. */
function setup<T>(useHook: () => T) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
  for (const key of [ALL_KEY, DRAFTS_KEY, OTHER_KEY]) queryClient.setQueryData(key, [makeManagedEvent("a")]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(useHook, { wrapper }), queryClient };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("useSaveEventDraft", () => {
  it("sin eventId crea; si va bien, descarta los listados del usuario (y solo los suyos)", async () => {
    vi.mocked(createEventAction).mockResolvedValue({ ok: true, id: EVENT_ID });
    const { result, queryClient } = setup(() => useSaveEventDraft(USER));

    await act(async () => {
      expect(await result.current.mutateAsync({ values: VALUES })).toEqual({ ok: true, id: EVENT_ID });
    });
    expect(createEventAction).toHaveBeenCalledWith(VALUES);
    expect(updateEventAction).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(ALL_KEY)).toBeUndefined();
    expect(queryClient.getQueryData(DRAFTS_KEY)).toBeUndefined();
    expect(queryClient.getQueryData(OTHER_KEY)).toBeDefined();
  });

  it("con eventId edita ese borrador", async () => {
    vi.mocked(updateEventAction).mockResolvedValue({ ok: true });
    const { result } = setup(() => useSaveEventDraft(USER));

    await act(async () => {
      await result.current.mutateAsync({ eventId: EVENT_ID, values: VALUES });
    });
    expect(updateEventAction).toHaveBeenCalledWith(EVENT_ID, VALUES);
    expect(createEventAction).not.toHaveBeenCalled();
  });

  it("un fallo se devuelve tal cual y conserva la caché", async () => {
    const failure = { ok: false as const, error: "Tu cuenta de organizador no está aprobada." };
    vi.mocked(createEventAction).mockResolvedValue(failure);
    const { result, queryClient } = setup(() => useSaveEventDraft(USER));

    await act(async () => {
      expect(await result.current.mutateAsync({ values: VALUES })).toEqual(failure);
    });
    expect(queryClient.getQueryData(ALL_KEY)).toBeDefined();
  });
});

describe("useDeleteEventDraft", () => {
  it("si va bien, invalida los listados del usuario (y solo los suyos)", async () => {
    vi.mocked(deleteEventAction).mockResolvedValue({ ok: true });
    const { result, queryClient } = setup(() => useDeleteEventDraft(USER));

    await act(async () => {
      expect(await result.current.mutateAsync(EVENT_ID)).toEqual({ ok: true });
    });
    expect(deleteEventAction).toHaveBeenCalledWith(EVENT_ID);
    expect(queryClient.getQueryState(ALL_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(DRAFTS_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(OTHER_KEY)?.isInvalidated).toBe(false);
  });

  it.each(["not_found", "delete_not_draft", "has_activity"] as const)(
    "un fallo por listado desactualizado (%s) también invalida",
    async (code) => {
      vi.mocked(deleteEventAction).mockResolvedValue({ ok: false, error: "x", code });
      const { result, queryClient } = setup(() => useDeleteEventDraft(USER));

      await act(async () => {
        await result.current.mutateAsync(EVENT_ID);
      });
      expect(queryClient.getQueryState(ALL_KEY)?.isInvalidated).toBe(true);
    },
  );

  it("otro fallo no invalida", async () => {
    vi.mocked(deleteEventAction).mockResolvedValue({ ok: false, error: "No pudimos completar la solicitud." });
    const { result, queryClient } = setup(() => useDeleteEventDraft(USER));

    await act(async () => {
      await result.current.mutateAsync(EVENT_ID);
    });
    expect(queryClient.getQueryState(ALL_KEY)?.isInvalidated).toBe(false);
  });
});
