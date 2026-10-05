import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ManagedEvent, ManagedEventsFilters } from "@/modules/events";
import { listManagedEventsAction } from "../actions/managedEvents.actions";
import { makeManagedEvent as makeEvent } from "../data/managedEvents.mock";
import { DEFAULT_MANAGED_EVENTS_FILTERS as ALL, managedEventsQueryKey, useManagedEvents } from "./useManagedEvents";

vi.mock("../actions/managedEvents.actions", () => ({ listManagedEventsAction: vi.fn() }));

const USER = "user-organizer";

function setup(initialFilters: ManagedEventsFilters, initialData?: ManagedEvent[], initialUserId = USER) {
  // Mismas opciones que app/providers.tsx, sin reintentos para que el error llegue enseguida.
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(({ userId, filters, data }) => useManagedEvents(userId, filters, data), {
    wrapper,
    initialProps: { userId: initialUserId, filters: initialFilters, data: initialData },
  });
  return { ...hook, queryClient };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useManagedEvents", () => {
  it("con datos iniciales los devuelve sin llamar a la acción", () => {
    const initial = [makeEvent("a")];
    const { result, queryClient } = setup(ALL, initial);

    expect(result.current.data).toEqual(initial);
    expect(listManagedEventsAction).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(managedEventsQueryKey(USER, ALL))).toEqual(initial);
  });

  it("sin datos iniciales pide los eventos a la acción con los filtros", async () => {
    const events = [makeEvent("b", { status: "draft" })];
    vi.mocked(listManagedEventsAction).mockResolvedValue(events);
    const filters: ManagedEventsFilters = { status: "draft", q: "feria" };
    const { result } = setup(filters);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(events);
    expect(listManagedEventsAction).toHaveBeenCalledWith(filters);
  });

  it("al cambiar de filtros pide la nueva lista y mantiene la anterior mientras llega", async () => {
    const initial = [makeEvent("a"), makeEvent("b", { status: "draft" })];
    const drafts = [makeEvent("b", { status: "draft" })];
    let resolve: (events: ManagedEvent[]) => void = () => {};
    vi.mocked(listManagedEventsAction).mockReturnValue(new Promise((done) => (resolve = done)));
    const { result, rerender } = setup(ALL, initial);

    const draftFilters: ManagedEventsFilters = { status: "draft", q: "" };
    rerender({ userId: USER, filters: draftFilters, data: undefined });
    expect(result.current.data).toEqual(initial);
    expect(result.current.isPlaceholderData).toBe(true);
    expect(listManagedEventsAction).toHaveBeenCalledWith(draftFilters);

    resolve(drafts);
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data).toEqual(drafts);
  });

  it("si la acción falla, la query queda en error", async () => {
    vi.mocked(listManagedEventsAction).mockRejectedValue(new Error("fallo"));
    const { result } = setup(ALL);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error("fallo"));
  });

  it("usa una key por usuario: otro usuario no recibe la caché del anterior", async () => {
    const adminEvents = [makeEvent("admin", { revenueCents: 999_000 })];
    const organizerEvents = [makeEvent("propio")];
    let resolve: (events: ManagedEvent[]) => void = () => {};
    vi.mocked(listManagedEventsAction).mockReturnValue(new Promise((done) => (resolve = done)));
    const { result, rerender, queryClient } = setup(ALL, adminEvents, "user-admin");

    expect(managedEventsQueryKey("user-admin", ALL)).not.toEqual(managedEventsQueryKey(USER, ALL));
    rerender({ userId: USER, filters: ALL, data: undefined });
    // Ni caché ni placeholder del usuario anterior mientras llega su lista.
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPlaceholderData).toBe(false);
    expect(listManagedEventsAction).toHaveBeenCalledWith(ALL);

    resolve(organizerEvents);
    await waitFor(() => expect(result.current.data).toEqual(organizerEvents));
    expect(queryClient.getQueryData(managedEventsQueryKey("user-admin", ALL))).toEqual(adminEvents);
    expect(queryClient.getQueryData(managedEventsQueryKey(USER, ALL))).toEqual(organizerEvents);
  });
});
