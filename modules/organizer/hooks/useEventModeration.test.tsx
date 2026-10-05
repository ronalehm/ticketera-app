import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  approveEventAction,
  cancelEventAction,
  rejectEventAction,
  submitForReviewAction,
} from "../actions/eventModeration.actions";
import { makeManagedEvent } from "../data/managedEvents.mock";
import { useModerateEvent } from "./useEventModeration";
import { DEFAULT_MANAGED_EVENTS_FILTERS, managedEventsQueryKey } from "./useManagedEvents";

vi.mock("../actions/eventModeration.actions", () => ({
  submitForReviewAction: vi.fn(),
  approveEventAction: vi.fn(),
  rejectEventAction: vi.fn(),
  cancelEventAction: vi.fn(),
}));

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
  return { ...renderHook(() => useModerateEvent(USER), { wrapper }), queryClient };
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("useModerateEvent", () => {
  it.each([
    ["submit", submitForReviewAction, [EVENT_ID]],
    ["approve", approveEventAction, [EVENT_ID]],
    ["cancel", cancelEventAction, [EVENT_ID]],
  ] as const)("%s llama a su acción; si va bien, invalida los listados del usuario (y solo los suyos)", async (
    transition,
    action,
    args,
  ) => {
    vi.mocked(action).mockResolvedValue({ ok: true });
    const { result, queryClient } = setup();

    await act(async () => {
      expect(await result.current.mutateAsync({ transition, eventId: EVENT_ID })).toEqual({ ok: true });
    });
    expect(action).toHaveBeenCalledWith(...args);
    expect(queryClient.getQueryState(OWN_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(OTHER_KEY)?.isInvalidated).toBe(false);
  });

  it("reject envía la nota", async () => {
    vi.mocked(rejectEventAction).mockResolvedValue({ ok: true });
    const { result } = setup();
    await act(async () => {
      await result.current.mutateAsync({ transition: "reject", eventId: EVENT_ID, note: "Falta la portada" });
    });
    expect(rejectEventAction).toHaveBeenCalledWith(EVENT_ID, "Falta la portada");
  });

  it.each(["not_pending_review", "submit_not_draft", "cancel_not_published", "has_sales", "not_found"] as const)(
    "un fallo por listado desactualizado (%s) también invalida",
    async (code) => {
      vi.mocked(approveEventAction).mockResolvedValue({ ok: false, error: "x", code });
      const { result, queryClient } = setup();
      await act(async () => {
        await result.current.mutateAsync({ transition: "approve", eventId: EVENT_ID });
      });
      expect(queryClient.getQueryState(OWN_KEY)?.isInvalidated).toBe(true);
    },
  );

  it("otro fallo (datos incompletos) no invalida y se devuelve tal cual", async () => {
    const failure = { ok: false as const, error: "Faltan datos para publicar el evento: la portada.", code: "incomplete" as const };
    vi.mocked(submitForReviewAction).mockResolvedValue(failure);
    const { result, queryClient } = setup();
    await act(async () => {
      expect(await result.current.mutateAsync({ transition: "submit", eventId: EVENT_ID })).toEqual(failure);
    });
    expect(queryClient.getQueryState(OWN_KEY)?.isInvalidated).toBe(false);
  });
});
