import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteUserAction,
  inviteUserAction,
  listUsersAction,
  setOrganizerStatusAction,
  updateUserAction,
} from "../actions/users.actions";
import { DEFAULT_USERS_FILTERS as DEFAULTS } from "../schemas/users.schema";
import type { UserListItem, UsersActionFailure, UsersActionResult, UsersFilters, UsersPage } from "../types/users.types";
import {
  useDeleteUser,
  useInviteUser,
  useSetOrganizerStatus,
  useUpdateUser,
  useUsers,
  usersQueryKey,
} from "./useUsers";

vi.mock("../actions/users.actions", () => ({
  listUsersAction: vi.fn(),
  inviteUserAction: vi.fn(),
  updateUserAction: vi.fn(),
  setOrganizerStatusAction: vi.fn(),
  deleteUserAction: vi.fn(),
}));

const ADMIN = "actor-admin";

function makeUser(id: string): UserListItem {
  return {
    id,
    firstName: "Ana",
    lastName: id,
    email: `${id}@example.com`,
    role: "customer",
    organizerStatus: null,
    legalName: null,
    taxIdType: null,
    taxId: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    hasClerkAccount: true,
  };
}

const pageOf = (ids: string[], overrides: Partial<UsersPage> = {}): UsersPage => ({
  items: ids.map(makeUser),
  total: ids.length,
  page: 1,
  pageSize: 8,
  ...overrides,
});

function createWrapper() {
  // Mismas opciones que app/providers.tsx, sin reintentos para que el error llegue enseguida.
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

function setup(initialFilters: UsersFilters, initialData?: UsersPage, initialActor = ADMIN) {
  const { queryClient, wrapper } = createWrapper();
  const hook = renderHook(({ actorId, filters, data }) => useUsers(actorId, filters, data), {
    wrapper,
    initialProps: { actorId: initialActor, filters: initialFilters, data: initialData },
  });
  return { ...hook, queryClient };
}

/** Promesa que el test resuelve cuando quiere. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useUsers", () => {
  it("con los filtros por defecto usa la precarga sin llamar a la acción", () => {
    const initial = pageOf(["a"]);
    const { result, queryClient } = setup(DEFAULTS, initial);

    expect(result.current.data).toEqual(initial);
    expect(listUsersAction).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(usersQueryKey(ADMIN, DEFAULTS))).toEqual(initial);
  });

  it("con otros filtros ignora la precarga y pide la página a la acción", async () => {
    const page = pageOf(["b"]);
    vi.mocked(listUsersAction).mockResolvedValue({ ok: true, data: page });
    const filters: UsersFilters = { ...DEFAULTS, role: "organizer", q: "ana" };
    const { result } = setup(filters, pageOf(["precarga"]));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(page);
    expect(listUsersAction).toHaveBeenCalledWith(filters);
  });

  it("al cambiar de página mantiene la anterior mientras llega la nueva", async () => {
    const initial = pageOf(["a"], { total: 9 });
    const second = pageOf(["b"], { total: 9, page: 2 });
    const pending = deferred<UsersActionResult<{ data: UsersPage }>>();
    vi.mocked(listUsersAction).mockReturnValue(pending.promise);
    const { result, rerender } = setup(DEFAULTS, initial);

    rerender({ actorId: ADMIN, filters: { ...DEFAULTS, page: 2 }, data: initial });
    expect(result.current.data).toEqual(initial);
    expect(result.current.isPlaceholderData).toBe(true);

    pending.resolve({ ok: true, data: second });
    await waitFor(() => expect(result.current.data).toEqual(second));
  });

  it("un { ok: false } deja la query en error con el mensaje", async () => {
    vi.mocked(listUsersAction).mockResolvedValue({ ok: false, error: "No pudimos completar la solicitud." });
    const { result } = setup({ ...DEFAULTS, q: "x" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error("No pudimos completar la solicitud."));
  });

  it("usa una key por actor: otro actor no recibe la caché ni el placeholder del anterior", async () => {
    const adminPage = pageOf(["del-admin"]);
    const pending = deferred<UsersActionResult<{ data: UsersPage }>>();
    vi.mocked(listUsersAction).mockReturnValue(pending.promise);
    const { result, rerender } = setup(DEFAULTS, adminPage);

    rerender({ actorId: "actor-otro", filters: DEFAULTS, data: undefined });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPlaceholderData).toBe(false);

    const own = pageOf(["propio"]);
    pending.resolve({ ok: true, data: own });
    await waitFor(() => expect(result.current.data).toEqual(own));
  });
});

describe("mutaciones", () => {
  const cases = [
    ["useInviteUser", useInviteUser, inviteUserAction, { email: "a@b.pe", role: "organizer" }, [{ email: "a@b.pe", role: "organizer" }]],
    [
      "useUpdateUser",
      useUpdateUser,
      updateUserAction,
      { id: "u1", values: { firstName: "A", lastName: "B", role: "customer" } },
      ["u1", { firstName: "A", lastName: "B", role: "customer" }],
    ],
    ["useSetOrganizerStatus", useSetOrganizerStatus, setOrganizerStatusAction, { id: "u1", status: "approved" }, ["u1", "approved"]],
    ["useDeleteUser", useDeleteUser, deleteUserAction, "u1", ["u1"]],
  ] as const;

  it.each(cases)("%s llama a la acción y, si va bien, invalida el listado del actor", async (_name, useHook, action, variables, args) => {
    vi.mocked(action).mockResolvedValue({ ok: true, outcome: "invited" });
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(usersQueryKey(ADMIN, DEFAULTS), pageOf(["a"]));
    queryClient.setQueryData(usersQueryKey("otro", DEFAULTS), pageOf(["b"]));
    const { result } = renderHook(() => useHook(ADMIN), { wrapper });

    let returned: unknown;
    await act(async () => {
      returned = await (result.current.mutateAsync as (value: unknown) => Promise<unknown>)(variables);
    });

    expect(action).toHaveBeenCalledWith(...args);
    expect(returned).toMatchObject({ ok: true });
    expect(queryClient.getQueryState(usersQueryKey(ADMIN, DEFAULTS))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(usersQueryKey("otro", DEFAULTS))?.isInvalidated).toBe(false);
  });

  it.each(cases)("%s devuelve el fallo (sin lanzar) y, con otro código, no invalida", async (_name, useHook, action, variables) => {
    const failure: UsersActionFailure = {
      ok: false,
      error: "Ese RUC/DNI ya está registrado.",
      code: "tax_id_taken",
      fieldErrors: { "organizer.taxId": ["Ese RUC/DNI ya está registrado."] },
    };
    vi.mocked(action).mockResolvedValue(failure);
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(usersQueryKey(ADMIN, DEFAULTS), pageOf(["a"]));
    const { result } = renderHook(() => useHook(ADMIN), { wrapper });

    let returned: unknown;
    await act(async () => {
      returned = await (result.current.mutateAsync as (value: unknown) => Promise<unknown>)(variables);
    });

    expect(returned).toEqual(failure);
    expect(queryClient.getQueryState(usersQueryKey(ADMIN, DEFAULTS))?.isInvalidated).toBe(false);
  });

  it.each(
    cases.flatMap(([name, useHook, action, variables]) =>
      (["not_found", "conflict"] as const).map((code) => [name, code, useHook, action, variables] as const),
    ),
  )("%s con fallo %s (listado desactualizado) devuelve el fallo e invalida el listado", async (_name, code, useHook, action, variables) => {
    const failure: UsersActionFailure = { ok: false, error: "El usuario no existe o ya fue eliminado.", code };
    vi.mocked(action).mockResolvedValue(failure);
    const { queryClient, wrapper } = createWrapper();
    queryClient.setQueryData(usersQueryKey(ADMIN, DEFAULTS), pageOf(["a"]));
    queryClient.setQueryData(usersQueryKey("otro", DEFAULTS), pageOf(["b"]));
    const { result } = renderHook(() => useHook(ADMIN), { wrapper });

    let returned: unknown;
    await act(async () => {
      returned = await (result.current.mutateAsync as (value: unknown) => Promise<unknown>)(variables);
    });

    expect(returned).toEqual(failure);
    expect(queryClient.getQueryState(usersQueryKey(ADMIN, DEFAULTS))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(usersQueryKey("otro", DEFAULTS))?.isInvalidated).toBe(false);
  });
});
